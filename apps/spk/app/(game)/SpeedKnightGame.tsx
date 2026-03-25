"use client"

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import Image from "next/image"
import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react"

import { Button } from "@repo/ui/shadcn/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@repo/ui/shadcn/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@repo/ui/shadcn/dialog"
import { cn } from "@repo/ui/shadcn/lib/utils"

import {
  BOARD_SIZE,
  createInitialGameState,
  type DifficultyMode,
  type GameState,
  type Position,
  gameReducer,
  getLegalKnightMoves,
  getMinimumKnightMoves,
  getShortestKnightPath,
  getSquareColor,
  isSquareUnderBlackPawnAttack,
  isSquareUnderBishopAttack,
  isSquareUnderRookAttack,
  isUnsafeKnightDestination,
  isSamePosition,
  resolveEnemyPiecesAfterMove
} from "./gameState"

const boardIndexes = Array.from({ length: BOARD_SIZE }, (_, index) => index)
const GAME_DURATION_SECONDS = 60
const HINTS_STORAGE_KEY = "spk-show-hints"
const LEGACY_HIGH_SCORE_STORAGE_KEY = "spk-high-score"
const KNIGHT_DRAG_ID = "knight"
const KNIGHT_MOVE_SOUND_PATH = "/sounds/knight-move.mp3"
const PAWN_CAPTURE_SOUND_PATH = "/sounds/pawn-capture.mp3"

type GameOverState = {
  title: string
  message: string
  score: number
  analysisRows: CaptureAnalysisRow[]
}

type CaptureSegment = {
  difficulty: DifficultyMode
  pawnNumber: number
  knightStart: { row: number; col: number }
  pawnTarget: { row: number; col: number }
  bishopStart: { row: number; col: number } | null
  rookStart: { row: number; col: number } | null
  actualMoves: number
  actualPath: Array<{ row: number; col: number }>
}

type CaptureAnalysisRow = {
  difficulty: DifficultyMode
  pawnNumber: number
  knightStart: { row: number; col: number }
  pawnTarget: { row: number; col: number }
  bishopStart: { row: number; col: number } | null
  rookStart: { row: number; col: number } | null
  actualMoves: number
  optimalMoves: number
  wastedMoves: number
  actualPath: Array<{ row: number; col: number }>
}

type KnightMoveAnimation = {
  from: Position
  to: Position
  key: number
}

type CaptureAttackerKind = "pawn" | "bishop" | "rook"

type CaptureAnimationState = {
  key: number
  attackerKind: CaptureAttackerKind
  attackerPosition: Position
  targetPosition: Position
  melee: boolean
  beamSquares: Position[]
  deathDelayMs: number
  totalDurationMs: number
}

type SquareStepLookup = Map<string, number[]>

export default function SpeedKnightGame({
  initialState
}: {
  initialState: GameState
}) {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyMode>(
    initialState.difficulty
  )
  const [isClient, setIsClient] = useState(false)
  const [isGameActive, setIsGameActive] = useState(false)
  const [sandboxScenario, setSandboxScenario] =
    useState<CaptureAnalysisRow | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION_SECONDS)
  const [showHints, setShowHints] = useState(true)
  const [highScore, setHighScore] = useState(0)
  const [isDraggingKnight, setIsDraggingKnight] = useState(false)
  const [gameOverState, setGameOverState] = useState<GameOverState | null>(null)
  const [isGameOverDialogOpen, setIsGameOverDialogOpen] = useState(false)
  const [currentCaptureSegment, setCurrentCaptureSegment] =
    useState<CaptureSegment | null>(null)
  const [captureAnalysisRows, setCaptureAnalysisRows] = useState<
    CaptureAnalysisRow[]
  >([])
  const [showBestLine, setShowBestLine] = useState(false)
  const [showYourLine, setShowYourLine] = useState(false)
  const [knightMoveAnimation, setKnightMoveAnimation] =
    useState<KnightMoveAnimation | null>(null)
  const [captureAnimation, setCaptureAnimation] =
    useState<CaptureAnimationState | null>(null)
  const [isSandboxCaptured, setIsSandboxCaptured] = useState(false)
  const boardContainerRef = useRef<HTMLDivElement | null>(null)
  const knightMoveAudioRef = useRef<HTMLAudioElement | null>(null)
  const pawnCaptureAudioRef = useRef<HTMLAudioElement | null>(null)
  const gameOverOpenTimeoutRef = useRef<number | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )
  const isSandboxMode = sandboxScenario !== null
  const isSandboxComplete =
    isSandboxMode && isSamePosition(state.knight, state.pawn)
  const sandboxCaptured = isSandboxMode && isSandboxCaptured
  const isBoardInteractive =
    isGameActive || (isSandboxMode && !isSandboxComplete && !sandboxCaptured)
  const currentHighScoreStorageKey = getHighScoreStorageKey(selectedDifficulty)
  const captureBeamStepLookup = useMemo(() => {
    if (!captureAnimation?.beamSquares.length) {
      return new Map<string, number>()
    }

    const steps = new Map<string, number>()

    captureAnimation.beamSquares.forEach((position, index) => {
      steps.set(getSquareId(position), index)
    })

    return steps
  }, [captureAnimation])
  const sandboxBestLine = useMemo(() => {
    if (!isSandboxMode || !showBestLine) return []

    return getShortestKnightPath(
      sandboxScenario.knightStart,
      sandboxScenario.pawnTarget,
      {
        pawn: sandboxScenario.pawnTarget,
        bishop: sandboxScenario.bishopStart,
        rook: sandboxScenario.rookStart
      }
    )
  }, [isSandboxMode, sandboxScenario, showBestLine])
  const sandboxBestLineSteps = useMemo(() => {
    return buildSquareStepLookup(sandboxBestLine)
  }, [sandboxBestLine])
  const sandboxYourLineSteps = useMemo(() => {
    if (!isSandboxMode || !showYourLine || !sandboxScenario) {
      return new Map<string, number[]>()
    }

    return buildSquareStepLookup(sandboxScenario.actualPath)
  }, [isSandboxMode, sandboxScenario, showYourLine])
  const sandboxRunScore = gameOverState?.score ?? 0
  const showMobileCompactHud = isGameActive || isSandboxMode

  useEffect(() => {
    setIsClient(true)

    knightMoveAudioRef.current = new Audio(KNIGHT_MOVE_SOUND_PATH)
    pawnCaptureAudioRef.current = new Audio(PAWN_CAPTURE_SOUND_PATH)

    knightMoveAudioRef.current.preload = "auto"
    pawnCaptureAudioRef.current.preload = "auto"

    const storedPreference = window.localStorage.getItem(HINTS_STORAGE_KEY)

    if (storedPreference !== null) {
      setShowHints(storedPreference === "true")
    }

    return () => {
      knightMoveAudioRef.current = null
      pawnCaptureAudioRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isClient) return

    const storedHighScore = window.localStorage.getItem(
      currentHighScoreStorageKey
    )
    const fallbackEasyHighScore =
      selectedDifficulty === "easy"
        ? window.localStorage.getItem(LEGACY_HIGH_SCORE_STORAGE_KEY)
        : null
    const parsedHighScore = Number(
      storedHighScore ?? fallbackEasyHighScore ?? 0
    )

    setHighScore(Number.isNaN(parsedHighScore) ? 0 : parsedHighScore)
  }, [currentHighScoreStorageKey, isClient, selectedDifficulty])

  useEffect(() => {
    if (
      !isClient ||
      isSandboxMode ||
      state.difficulty !== selectedDifficulty ||
      state.captures <= highScore
    ) {
      return
    }

    setHighScore(state.captures)
    window.localStorage.setItem(
      currentHighScoreStorageKey,
      String(state.captures)
    )
  }, [
    currentHighScoreStorageKey,
    highScore,
    isClient,
    isSandboxMode,
    selectedDifficulty,
    state.captures,
    state.difficulty
  ])

  useEffect(() => {
    if (!isGameActive) return

    const intervalId = window.setInterval(() => {
      setTimeRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId)
          concludeGame({
            title: "Time's Up",
            message:
              "Congratulations. You made it to the end of the round. Hit play again to start a new run.",
            score: state.captures,
            analysisRows: captureAnalysisRows
          })
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [captureAnalysisRows, isGameActive, state.captures])

  useEffect(() => {
    if (!knightMoveAnimation) return

    const timeoutId = window.setTimeout(() => {
      setKnightMoveAnimation((current) =>
        current?.key === knightMoveAnimation.key ? null : current
      )
    }, 220)

    return () => window.clearTimeout(timeoutId)
  }, [knightMoveAnimation])

  const legalMoves = getLegalKnightMoves(state.knight)

  function handleDragStart(event: DragStartEvent) {
    if (isBoardInteractive && event.active.id === KNIGHT_DRAG_ID) {
      setIsDraggingKnight(true)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setIsDraggingKnight(false)

    if (!isBoardInteractive) return

    const overId = event.over?.id

    if (typeof overId !== "string") return

    const destination = parseSquareId(overId)

    if (!destination) return

    handleMove(destination, "drag")
  }

  function toggleHints() {
    setShowHints((current) => {
      const next = !current
      window.localStorage.setItem(HINTS_STORAGE_KEY, String(next))
      return next
    })
  }

  function handleStartGame() {
    const nextState = createInitialGameState(selectedDifficulty)

    if (gameOverOpenTimeoutRef.current !== null) {
      window.clearTimeout(gameOverOpenTimeoutRef.current)
      gameOverOpenTimeoutRef.current = null
    }

    dispatch({ type: "set-state", nextState })
    setKnightMoveAnimation(null)
    setTimeRemaining(GAME_DURATION_SECONDS)
    setIsDraggingKnight(false)
    setShowBestLine(false)
    setShowYourLine(false)
    setSandboxScenario(null)
    setIsSandboxCaptured(false)
    setCaptureAnimation(null)
    setGameOverState(null)
    setIsGameOverDialogOpen(false)
    setCaptureAnalysisRows([])
    setCurrentCaptureSegment(createCaptureSegment(nextState, 1))
    setIsGameActive(true)
  }

  function handleEndGame() {
    concludeGame({
      title: "Round Ended",
      message:
        "You ended the round early. Review your score and analysis below, or hit play again to start a new run.",
      score: state.captures,
      analysisRows: captureAnalysisRows
    })
  }

  function handleExitSandbox() {
    if (gameOverOpenTimeoutRef.current !== null) {
      window.clearTimeout(gameOverOpenTimeoutRef.current)
      gameOverOpenTimeoutRef.current = null
    }

    setKnightMoveAnimation(null)
    setIsDraggingKnight(false)
    setSandboxScenario(null)
    setIsSandboxCaptured(false)
    setCaptureAnimation(null)
    setShowBestLine(false)
    setShowYourLine(false)
  }

  function loadSandboxScenario(row: CaptureAnalysisRow) {
    if (gameOverOpenTimeoutRef.current !== null) {
      window.clearTimeout(gameOverOpenTimeoutRef.current)
      gameOverOpenTimeoutRef.current = null
    }

    setSelectedDifficulty(row.difficulty)
    dispatch({
      type: "set-state",
      nextState: {
        difficulty: row.difficulty,
        knight: row.knightStart,
        pawn: row.pawnTarget,
        bishop: row.bishopStart,
        rook: row.rookStart,
        captures: gameOverState?.score ?? 0,
        moves: 0
      }
    })
    setKnightMoveAnimation(null)
    setIsDraggingKnight(false)
    setIsGameActive(false)
    setTimeRemaining(GAME_DURATION_SECONDS)
    setShowBestLine(false)
    setShowYourLine(false)
    setCurrentCaptureSegment(null)
    setCaptureAnalysisRows([])
    setIsGameOverDialogOpen(false)
    setSandboxScenario(row)
    setIsSandboxCaptured(false)
    setCaptureAnimation(null)
  }

  function handleResetSandboxPosition() {
    if (!sandboxScenario) return

    if (gameOverOpenTimeoutRef.current !== null) {
      window.clearTimeout(gameOverOpenTimeoutRef.current)
      gameOverOpenTimeoutRef.current = null
    }

    dispatch({
      type: "set-state",
      nextState: {
        difficulty: sandboxScenario.difficulty,
        knight: sandboxScenario.knightStart,
        pawn: sandboxScenario.pawnTarget,
        bishop: sandboxScenario.bishopStart,
        rook: sandboxScenario.rookStart,
        captures: gameOverState?.score ?? 0,
        moves: 0
      }
    })
    setKnightMoveAnimation(null)
    setIsDraggingKnight(false)
    setIsSandboxCaptured(false)
    setCaptureAnimation(null)
    setShowBestLine(false)
    setShowYourLine(false)
  }

  function toggleBestLine() {
    setShowBestLine((current) => !current)
  }

  function toggleYourLine() {
    setShowYourLine((current) => !current)
  }

  function reopenGameOverDialog() {
    if (!gameOverState) return

    setIsGameOverDialogOpen(true)
  }

  function concludeGame(nextGameOverState: GameOverState) {
    setKnightMoveAnimation(null)
    setIsDraggingKnight(false)
    setIsGameActive(false)
    setShowBestLine(false)
    setShowYourLine(false)
    setSandboxScenario(null)
    setIsSandboxCaptured(false)
    setGameOverState(nextGameOverState)

    if (gameOverOpenTimeoutRef.current !== null) {
      window.clearTimeout(gameOverOpenTimeoutRef.current)
      gameOverOpenTimeoutRef.current = null
    }

    setIsGameOverDialogOpen(true)
  }

  function concludeGameAfterDelay(
    nextGameOverState: GameOverState,
    delayMs: number
  ) {
    setKnightMoveAnimation(null)
    setIsDraggingKnight(false)
    setIsGameActive(false)
    setShowBestLine(false)
    setShowYourLine(false)
    setSandboxScenario(null)
    setIsSandboxCaptured(false)
    setGameOverState(nextGameOverState)
    setIsGameOverDialogOpen(false)

    if (gameOverOpenTimeoutRef.current !== null) {
      window.clearTimeout(gameOverOpenTimeoutRef.current)
    }

    gameOverOpenTimeoutRef.current = window.setTimeout(() => {
      setIsGameOverDialogOpen(true)
      gameOverOpenTimeoutRef.current = null
    }, delayMs)
  }

  function playSound(audio: HTMLAudioElement | null) {
    if (!audio) return

    audio.currentTime = 0
    void audio.play().catch(() => {})
  }

  function keepBoardVisible() {
    const scrollBoardIntoView = () => {
      boardContainerRef.current?.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "auto"
      })
    }

    scrollBoardIntoView()
    window.requestAnimationFrame(scrollBoardIntoView)
    window.setTimeout(scrollBoardIntoView, 160)
  }

  function handleMove(destination: Position, inputMethod: "tap" | "drag") {
    if (!isBoardInteractive) return

    const isLegalMove = legalMoves.some((move) =>
      isSamePosition(move, destination)
    )

    if (!isLegalMove) return

    if (inputMethod === "tap") {
      setKnightMoveAnimation({
        from: state.knight,
        to: destination,
        key: Date.now()
      })
    } else {
      setKnightMoveAnimation(null)
    }

    const capturedPawn = isSamePosition(destination, state.pawn)
    const capturedBishop = state.bishop
      ? isSamePosition(destination, state.bishop)
      : false
    const capturedRook = state.rook
      ? isSamePosition(destination, state.rook)
      : false

    if (isSandboxMode) {
      const isUnsafeMove = isUnsafeKnightDestination(
        {
          pawn: state.pawn,
          bishop: state.bishop,
          rook: state.rook
        },
        destination
      )

      dispatch({
        type: "set-state",
        nextState: {
          ...state,
          knight: destination,
          bishop: capturedBishop ? null : state.bishop,
          rook: capturedRook ? null : state.rook,
          moves: state.moves + 1
        }
      })

      if (isUnsafeMove) {
        const animation = createCaptureAnimation(
          {
            pawn: state.pawn,
            bishop: state.bishop,
            rook: state.rook
          },
          destination
        )

        if (animation) {
          setCaptureAnimation(animation)
        }

        setIsSandboxCaptured(true)
        keepBoardVisible()
        playSound(pawnCaptureAudioRef.current)
        return
      }

      playSound(
        capturedPawn ? pawnCaptureAudioRef.current : knightMoveAudioRef.current
      )

      return
    }

    const nextState = gameReducer(state, {
      type: "move-knight",
      destination
    })
    const isUnsafeMove = isUnsafeKnightDestination(
      {
        pawn: state.pawn,
        bishop: state.bishop,
        rook: state.rook
      },
      destination
    )

    if (isUnsafeMove) {
      playSound(pawnCaptureAudioRef.current)
      dispatch({
        type: "set-state",
        nextState: {
          ...state,
          knight: destination,
          bishop: capturedBishop ? null : state.bishop,
          rook: capturedRook ? null : state.rook,
          moves: state.moves + 1
        }
      })

      const animation = createCaptureAnimation(
        {
          pawn: state.pawn,
          bishop: state.bishop,
          rook: state.rook
        },
        destination
      )

      if (animation) {
        setCaptureAnimation(animation)
      }

      keepBoardVisible()
      concludeGameAfterDelay(
        {
          title: "Knight Captured",
          message:
            (state.bishop && !capturedBishop) || (state.rook && !capturedRook)
              ? "You moved into an enemy attack lane. One of the black pieces took your knight."
              : "You moved into the pawn's capture lane. The black pawn took your knight.",
          score: state.captures,
          analysisRows: captureAnalysisRows
        },
        animation ? animation.totalDurationMs : 0
      )
      return
    }

    updateCaptureAnalysis(destination, capturedPawn, nextState)

    playSound(
      capturedPawn ? pawnCaptureAudioRef.current : knightMoveAudioRef.current
    )
    dispatch({ type: "set-state", nextState })
  }

  function updateCaptureAnalysis(
    destination: { row: number; col: number },
    capturedPawn: boolean,
    nextState: GameState
  ) {
    if (!currentCaptureSegment) return

    const actualMoves = currentCaptureSegment.actualMoves + 1
    const actualPath = [...currentCaptureSegment.actualPath, destination]

    if (!capturedPawn) {
      setCurrentCaptureSegment({
        ...currentCaptureSegment,
        actualMoves,
        actualPath
      })
      return
    }

    const optimalMoves = getMinimumKnightMoves(
      currentCaptureSegment.knightStart,
      currentCaptureSegment.pawnTarget,
      {
        pawn: currentCaptureSegment.pawnTarget,
        bishop: currentCaptureSegment.bishopStart,
        rook: currentCaptureSegment.rookStart
      }
    )

    const nextRow: CaptureAnalysisRow = {
      difficulty: currentCaptureSegment.difficulty,
      pawnNumber: currentCaptureSegment.pawnNumber,
      knightStart: currentCaptureSegment.knightStart,
      pawnTarget: currentCaptureSegment.pawnTarget,
      bishopStart: currentCaptureSegment.bishopStart,
      rookStart: currentCaptureSegment.rookStart,
      actualMoves,
      optimalMoves,
      wastedMoves: Math.max(actualMoves - optimalMoves, 0),
      actualPath
    }

    setCaptureAnalysisRows((current) => [...current, nextRow])
    setCurrentCaptureSegment(
      createCaptureSegment(nextState, currentCaptureSegment.pawnNumber + 1)
    )
  }

  function handleAnalysisRowSelect(row: CaptureAnalysisRow) {
    loadSandboxScenario(row)
  }

  function handleAnalysisRowKeyDown(
    event: React.KeyboardEvent<HTMLTableRowElement>,
    row: CaptureAnalysisRow
  ) {
    if (event.key !== "Enter" && event.key !== " ") return

    event.preventDefault()
    handleAnalysisRowSelect(row)
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-6xl items-start px-3 py-4 sm:px-6 sm:py-10 lg:px-8">
      <div className="grid w-full gap-4 sm:gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card
          className={cn(
            "flex h-full flex-col border-border/60 bg-card/80 shadow-xl backdrop-blur-sm",
            showMobileCompactHud && "hidden lg:flex"
          )}
        >
          <CardHeader>
            <CardTitle className="text-3xl">Speed Knight Challenge</CardTitle>
            <CardDescription>
              {isSandboxMode && sandboxScenario
                ? `Sandbox mode: replay pawn ${sandboxScenario.pawnNumber} from ${toBoardLabel(
                    sandboxScenario.knightStart.row,
                    sandboxScenario.knightStart.col
                  )} to ${toBoardLabel(
                    sandboxScenario.pawnTarget.row,
                    sandboxScenario.pawnTarget.col
                  )}. Capture the pawn, then use reset to try again.`
                : "Capture as many pawns as you can in 60 seconds. Don't get captured by enemy pieces."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-6">
            <div className="space-y-6">
              {!isGameActive && !isSandboxMode ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Difficulty
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["easy", "medium", "hard"] as const).map((difficulty) => (
                      <Button
                        key={difficulty}
                        type="button"
                        variant={
                          selectedDifficulty === difficulty
                            ? "default"
                            : "outline"
                        }
                        className="w-full capitalize"
                        onClick={() => setSelectedDifficulty(difficulty)}
                      >
                        {difficulty}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              <StatCard
                label={isSandboxMode ? "Mode" : "Timer"}
                value={
                  isSandboxMode
                    ? `Sandbox (${sandboxScenario.difficulty})`
                    : formatTime(timeRemaining)
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {isSandboxMode && sandboxScenario ? (
                  <StatCard label="Run Score" value={sandboxRunScore} />
                ) : (
                  <StatCard label="Score" value={state.captures} />
                )}
                {isSandboxMode && sandboxScenario ? (
                  <StatCard
                    label="Moves vs Ideal"
                    value={`${state.moves} / ${sandboxScenario.optimalMoves}`}
                  />
                ) : (
                  <StatCard label="High Score" value={highScore} />
                )}
              </div>
              {isSandboxMode && sandboxScenario ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatCard
                    label="Original Line"
                    value={`${sandboxScenario.actualMoves} / ${sandboxScenario.optimalMoves}`}
                  />
                  <StatCard label="High Score" value={highScore} />
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {isSandboxMode ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={toggleBestLine}
                    >
                      {showBestLine ? "Hide Best Moves" : "Show Best Moves"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={toggleYourLine}
                    >
                      {showYourLine ? "Hide Your Moves" : "Show Your Moves"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleResetSandboxPosition}
                    >
                      Reset Position
                    </Button>
                  </>
                ) : null}

                {gameOverState && !isGameActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={reopenGameOverDialog}
                  >
                    Reopen Results
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={toggleHints}
                >
                  {showHints ? "Hide Hints" : "Show Hints"}
                </Button>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-auto w-full"
              onClick={
                isGameActive
                  ? handleEndGame
                  : isSandboxMode
                    ? handleExitSandbox
                    : handleStartGame
              }
            >
              {isGameActive
                ? "End Game"
                : isSandboxMode
                  ? "Exit Sandbox"
                  : "Start Game"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70 shadow-2xl backdrop-blur-sm">
          <CardContent className="p-2 sm:p-6">
            {showMobileCompactHud ? (
              <div className="mb-3 space-y-2 lg:hidden">
                {isGameActive ? (
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                    <CompactStatCard
                      label="Timer"
                      value={formatTime(timeRemaining)}
                    />
                    <CompactStatCard label="Score" value={state.captures} />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-full min-h-16 px-3"
                      onClick={handleEndGame}
                    >
                      End Game
                    </Button>
                  </div>
                ) : null}
                {isSandboxMode && sandboxScenario ? (
                  <>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                      <CompactStatCard
                        label="Run Score"
                        value={sandboxRunScore}
                      />
                      <CompactStatCard
                        label="Moves / Ideal"
                        value={`${state.moves} / ${sandboxScenario.optimalMoves}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-full min-h-16 px-3"
                        onClick={handleExitSandbox}
                      >
                        Exit
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full px-2 text-xs"
                        onClick={toggleBestLine}
                      >
                        {showBestLine ? "Hide Best" : "Best Moves"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full px-2 text-xs"
                        onClick={toggleYourLine}
                      >
                        {showYourLine ? "Hide Yours" : "Your Moves"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full px-2 text-xs"
                        onClick={handleResetSandboxPosition}
                      >
                        Reset
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
            <div
              ref={boardContainerRef}
              className="mx-auto w-full max-w-none sm:max-w-3xl"
            >
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setIsDraggingKnight(false)}
              >
                <div className="mb-2 grid grid-cols-8 gap-0 text-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:mb-4 sm:grid-cols-[auto_repeat(8,minmax(0,1fr))] sm:text-xs">
                  {boardIndexes.map((rowIndex) => (
                    <Row
                      key={`row-${rowIndex}`}
                      rowIndex={rowIndex}
                      knight={state.knight}
                      pawn={state.pawn}
                      bishop={state.bishop}
                      rook={state.rook}
                      legalMoves={legalMoves}
                      bestLineStepLookup={sandboxBestLineSteps}
                      yourLineStepLookup={sandboxYourLineSteps}
                      captureAnimation={captureAnimation}
                      captureBeamStepLookup={captureBeamStepLookup}
                      isBoardInteractive={isBoardInteractive}
                      showHints={showHints}
                      isClient={isClient}
                      isDraggingKnight={isDraggingKnight}
                      knightMoveAnimation={knightMoveAnimation}
                      onMove={handleMove}
                    />
                  ))}
                  <div className="hidden sm:block" />
                  {boardIndexes.map((columnIndex) => (
                    <div
                      key={`column-${columnIndex}`}
                      className="hidden pt-2 font-semibold sm:block"
                    >
                      {String.fromCharCode(65 + columnIndex)}
                    </div>
                  ))}
                </div>
              </DndContext>
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog
        open={isGameOverDialogOpen && gameOverState !== null}
        onOpenChange={(open) => {
          setIsGameOverDialogOpen(open)
        }}
      >
        <DialogContent
          showCloseButton
          onOpenAutoFocus={(event) => {
            event.preventDefault()
          }}
          className="max-h-[90vh] overflow-y-auto max-w-4xl!"
        >
          <DialogHeader>
            <DialogTitle className="text-xl mb-2">
              Speed Knight Challenge
            </DialogTitle>
            <DialogTitle>{gameOverState?.title}</DialogTitle>
            <DialogDescription>{gameOverState?.message}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Final Score
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              {gameOverState?.score ?? 0}
            </div>
          </div>
          {gameOverState?.analysisRows.length ? (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-background/80">
              <div className="border-b border-border/60 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Efficiency Analysis
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Click any row to load that position onto the board in sandbox
                  mode.
                </div>
              </div>
              <div className="space-y-3 p-3 sm:hidden">
                {gameOverState.analysisRows.map((row) => (
                  <button
                    key={`analysis-card-${row.pawnNumber}`}
                    type="button"
                    onClick={() => handleAnalysisRowSelect(row)}
                    className="w-full rounded-xl border border-border/60 bg-background/90 p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Pawn {row.pawnNumber}
                        </div>
                        <div className="mt-1 text-sm font-medium text-foreground">
                          {toBoardLabel(
                            row.knightStart.row,
                            row.knightStart.col
                          )}
                          {" -> "}
                          {toBoardLabel(row.pawnTarget.row, row.pawnTarget.col)}
                        </div>
                      </div>
                      <span className="rounded-full border border-border/60 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Replay
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <MobileMetric label="Actual" value={row.actualMoves} />
                      <MobileMetric label="Optimal" value={row.optimalMoves} />
                      <MobileMetric
                        label="Waste"
                        value={row.wastedMoves}
                        tone={row.wastedMoves > 0 ? "danger" : "success"}
                      />
                    </div>
                  </button>
                ))}
              </div>
              <div className="hidden max-h-72 overflow-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-background/95 backdrop-blur-sm">
                    <tr className="border-b border-border/60 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">#</th>
                      <th className="px-4 py-3 font-semibold">Start</th>
                      <th className="px-4 py-3 font-semibold">Target</th>
                      <th className="px-4 py-3 font-semibold">Bishop</th>
                      <th className="px-4 py-3 font-semibold">Rook</th>
                      <th className="px-4 py-3 font-semibold">Actual</th>
                      <th className="px-4 py-3 font-semibold">Optimal</th>
                      <th className="px-4 py-3 font-semibold">Waste</th>
                      <th className="px-4 py-3 font-semibold text-right">
                        Replay
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameOverState.analysisRows.map((row) => (
                      <tr
                        key={`analysis-${row.pawnNumber}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Load pawn ${row.pawnNumber} sandbox from ${toBoardLabel(
                          row.knightStart.row,
                          row.knightStart.col
                        )} to ${toBoardLabel(
                          row.pawnTarget.row,
                          row.pawnTarget.col
                        )}`}
                        onClick={() => handleAnalysisRowSelect(row)}
                        onKeyDown={(event) =>
                          handleAnalysisRowKeyDown(event, row)
                        }
                        className="cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 last:border-b-0"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {row.pawnNumber}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {toBoardLabel(
                            row.knightStart.row,
                            row.knightStart.col
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {toBoardLabel(row.pawnTarget.row, row.pawnTarget.col)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.bishopStart
                            ? toBoardLabel(
                                row.bishopStart.row,
                                row.bishopStart.col
                              )
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.rookStart
                            ? toBoardLabel(row.rookStart.row, row.rookStart.col)
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {row.actualMoves}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {row.optimalMoves}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 font-medium",
                            row.wastedMoves > 0
                              ? "text-destructive"
                              : "text-success"
                          )}
                        >
                          {row.wastedMoves}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleAnalysisRowSelect(row)
                            }}
                          >
                            Replay
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          <DialogFooter className="border-none">
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={handleStartGame}
            >
              Play Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function Row({
  rowIndex,
  knight,
  pawn,
  bishop,
  rook,
  legalMoves,
  bestLineStepLookup,
  yourLineStepLookup,
  captureAnimation,
  captureBeamStepLookup,
  isBoardInteractive,
  showHints,
  isClient,
  isDraggingKnight,
  knightMoveAnimation,
  onMove
}: {
  rowIndex: number
  knight: { row: number; col: number }
  pawn: { row: number; col: number }
  bishop: { row: number; col: number } | null
  rook: { row: number; col: number } | null
  legalMoves: Array<{ row: number; col: number }>
  bestLineStepLookup: SquareStepLookup
  yourLineStepLookup: SquareStepLookup
  captureAnimation: CaptureAnimationState | null
  captureBeamStepLookup: Map<string, number>
  isBoardInteractive: boolean
  showHints: boolean
  isClient: boolean
  isDraggingKnight: boolean
  knightMoveAnimation: KnightMoveAnimation | null
  onMove: (destination: Position, inputMethod: "tap" | "drag") => void
}) {
  return (
    <>
      <div className="hidden items-center justify-center pr-2 text-[0.7rem] font-semibold text-muted-foreground sm:flex sm:text-xs">
        {BOARD_SIZE - rowIndex}
      </div>
      {boardIndexes.map((columnIndex) => {
        const position = { row: rowIndex, col: columnIndex }
        const hasKnight = isSamePosition(position, knight)
        const hasPawn = isSamePosition(position, pawn)
        const hasBishop = bishop ? isSamePosition(position, bishop) : false
        const hasRook = rook ? isSamePosition(position, rook) : false
        const isLegalMove = legalMoves.some((move) =>
          isSamePosition(move, position)
        )
        const isEnemyAttackSquare = isUnsafeKnightDestination(
          {
            pawn,
            bishop,
            rook
          },
          position
        )
        const squareColor = getSquareColor(rowIndex, columnIndex)

        return (
          <Square
            key={getSquareId(position)}
            position={position}
            squareColor={squareColor}
            hasKnight={hasKnight}
            hasPawn={hasPawn}
            hasBishop={hasBishop}
            hasRook={hasRook}
            isLegalMove={isLegalMove}
            isEnemyAttackSquare={isEnemyAttackSquare}
            rowLabel={columnIndex === 0 ? BOARD_SIZE - rowIndex : undefined}
            columnLabel={
              rowIndex === BOARD_SIZE - 1
                ? String.fromCharCode(65 + columnIndex)
                : undefined
            }
            bestLineSteps={bestLineStepLookup.get(getSquareId(position))}
            yourLineSteps={yourLineStepLookup.get(getSquareId(position))}
            captureAnimation={captureAnimation}
            captureBeamStepLookup={captureBeamStepLookup}
            isBoardInteractive={isBoardInteractive}
            showHints={showHints}
            isClient={isClient}
            isDraggingKnight={isDraggingKnight}
            knightMoveAnimation={knightMoveAnimation}
            onMove={onMove}
          />
        )
      })}
    </>
  )
}

function Square({
  position,
  squareColor,
  hasKnight,
  hasPawn,
  hasBishop,
  hasRook,
  isLegalMove,
  isEnemyAttackSquare,
  rowLabel,
  columnLabel,
  bestLineSteps,
  yourLineSteps,
  captureAnimation,
  captureBeamStepLookup,
  isBoardInteractive,
  showHints,
  isClient,
  isDraggingKnight,
  knightMoveAnimation,
  onMove
}: {
  position: { row: number; col: number }
  squareColor: "light" | "dark"
  hasKnight: boolean
  hasPawn: boolean
  hasBishop: boolean
  hasRook: boolean
  isLegalMove: boolean
  isEnemyAttackSquare: boolean
  rowLabel?: number
  columnLabel?: string
  bestLineSteps?: number[]
  yourLineSteps?: number[]
  captureAnimation: CaptureAnimationState | null
  captureBeamStepLookup: Map<string, number>
  isBoardInteractive: boolean
  showHints: boolean
  isClient: boolean
  isDraggingKnight: boolean
  knightMoveAnimation: KnightMoveAnimation | null
  onMove: (destination: Position, inputMethod: "tap" | "drag") => void
}) {
  const squareId = getSquareId(position)
  const bestLineBadge = bestLineSteps
    ? formatSquareStepBadge(bestLineSteps, "Best moves on this square")
    : null
  const yourLineBadge = yourLineSteps
    ? formatSquareStepBadge(yourLineSteps, "Your moves on this square")
    : null
  const { isOver, setNodeRef } = useDroppable({
    id: squareId,
    data: {
      position
    }
  })
  const hasEnemyPiece = hasPawn || hasBishop || hasRook
  const isUnsafeEnemyPiece = hasEnemyPiece && isEnemyAttackSquare
  const isSafeEnemyPiece = hasEnemyPiece && !isEnemyAttackSquare
  const shouldAnimateKnight =
    hasKnight &&
    knightMoveAnimation !== null &&
    isSamePosition(knightMoveAnimation.to, position)
  const beamStep = captureBeamStepLookup.get(squareId)
  const isCaptureTargetSquare =
    captureAnimation !== null &&
    isSamePosition(captureAnimation.targetPosition, position)
  const isCaptureAttackerSquare =
    captureAnimation !== null &&
    isSamePosition(captureAnimation.attackerPosition, position)
  const meleeSlashStyle: CSSProperties | undefined =
    captureAnimation && captureAnimation.melee
      ? {
          ["--spk-slash-x" as string]: `${
            Math.sign(
              captureAnimation.targetPosition.col -
                captureAnimation.attackerPosition.col
            ) * 10
          }px`,
          ["--spk-slash-y" as string]: `${
            Math.sign(
              captureAnimation.targetPosition.row -
                captureAnimation.attackerPosition.row
            ) * 10
          }px`
        }
      : undefined
  const knightDeathDelayMs =
    hasKnight && isCaptureTargetSquare
      ? (captureAnimation?.deathDelayMs ?? 0)
      : 0

  function handleTapMove() {
    if (!isBoardInteractive || !isLegalMove) return

    onMove(position, "tap")
  }

  function handleMouseDown(event: ReactMouseEvent<HTMLButtonElement>) {
    if (event.button !== 0) return

    handleTapMove()
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") {
      return
    }

    if (isDraggingKnight) return

    event.preventDefault()
    handleTapMove()
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      onMouseDown={handleMouseDown}
      onPointerUp={handlePointerUp}
      onClick={handleTapMove}
      aria-label={buildSquareLabel({
        row: position.row,
        col: position.col,
        hasKnight,
        hasPawn,
        hasBishop,
        hasRook,
        isLegalMove,
        bestLineSteps,
        yourLineSteps
      })}
      className={cn(
        "group flex aspect-square items-center justify-center border p-0 text-sm font-semibold leading-none align-top shadow-sm transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 sm:text-base",
        squareColor === "light"
          ? "border-border/70 bg-[hsl(var(--board-light))] text-foreground"
          : "border-border/70 bg-[hsl(var(--board-dark))] text-foreground",
        (!isBoardInteractive || !isLegalMove) && "cursor-default",
        showHints &&
          isBoardInteractive &&
          isLegalMove &&
          "cursor-pointer border-[hsl(var(--board-legal)/0.62)] shadow-[0_0_0_1px_hsl(var(--board-legal)/0.22)] hover:border-[hsl(var(--board-legal))] hover:bg-[hsl(var(--board-legal)/0.1)] hover:shadow-[0_8px_20px_hsl(var(--board-legal)/0.18)] dark:shadow-[0_0_0_1px_hsl(var(--board-legal)/0.3)] dark:hover:bg-[hsl(var(--board-legal)/0.16)] dark:hover:shadow-[0_10px_24px_hsl(var(--board-legal)/0.24)]",
        showHints &&
          isBoardInteractive &&
          isEnemyAttackSquare &&
          !hasPawn &&
          !hasBishop &&
          !hasRook &&
          !hasKnight &&
          "border-[hsl(var(--board-danger)/0.58)] bg-[hsl(var(--board-danger)/0.12)] shadow-[0_0_0_1px_hsl(var(--board-danger)/0.18)] dark:bg-[hsl(var(--board-danger)/0.18)] dark:shadow-[0_0_0_1px_hsl(var(--board-danger)/0.26)]",
        showHints &&
          isBoardInteractive &&
          isDraggingKnight &&
          isLegalMove &&
          isOver &&
          "border-[hsl(var(--board-legal))] shadow-[0_0_0_2px_hsl(var(--board-legal)/0.45)] dark:shadow-[0_0_0_2px_hsl(var(--board-legal)/0.55)]",
        showHints &&
          hasKnight &&
          "border-primary bg-primary text-primary-foreground shadow-lg",
        showHints &&
          isUnsafeEnemyPiece &&
          hasPawn &&
          !hasKnight &&
          "border-[hsl(var(--board-danger)/0.5)] bg-[hsl(var(--board-danger)/0.14)] text-foreground dark:bg-[hsl(var(--board-danger)/0.24)]",
        showHints &&
          isUnsafeEnemyPiece &&
          hasBishop &&
          !hasKnight &&
          "border-[hsl(var(--board-danger)/0.42)] bg-[hsl(var(--board-danger)/0.1)] text-foreground dark:bg-[hsl(var(--board-danger)/0.16)]",
        showHints &&
          isUnsafeEnemyPiece &&
          hasRook &&
          !hasKnight &&
          "border-[hsl(var(--board-danger)/0.46)] bg-[hsl(var(--board-danger)/0.12)] text-foreground dark:bg-[hsl(var(--board-danger)/0.18)]",
        showHints &&
          isSafeEnemyPiece &&
          hasPawn &&
          !hasKnight &&
          "border-[hsl(var(--board-capture)/0.52)] bg-[hsl(var(--board-capture)/0.16)] text-foreground shadow-[0_0_0_1px_hsl(var(--board-capture)/0.16)] dark:bg-[hsl(var(--board-capture)/0.24)] dark:shadow-[0_0_0_1px_hsl(var(--board-capture)/0.24)]",
        showHints &&
          isSafeEnemyPiece &&
          hasBishop &&
          !hasKnight &&
          "border-[hsl(var(--board-capture)/0.46)] bg-[hsl(var(--board-capture)/0.12)] text-foreground shadow-[0_0_0_1px_hsl(var(--board-capture)/0.14)] dark:bg-[hsl(var(--board-capture)/0.2)] dark:shadow-[0_0_0_1px_hsl(var(--board-capture)/0.22)]",
        showHints &&
          isSafeEnemyPiece &&
          hasRook &&
          !hasKnight &&
          "border-[hsl(var(--board-capture)/0.5)] bg-[hsl(var(--board-capture)/0.14)] text-foreground shadow-[0_0_0_1px_hsl(var(--board-capture)/0.15)] dark:bg-[hsl(var(--board-capture)/0.22)] dark:shadow-[0_0_0_1px_hsl(var(--board-capture)/0.24)]",
        bestLineBadge &&
          "border-[hsl(var(--board-best)/0.7)] bg-[hsl(var(--board-best)/0.12)] shadow-[0_0_0_1px_hsl(var(--board-best)/0.24)] dark:bg-[hsl(var(--board-best)/0.18)] dark:shadow-[0_0_0_1px_hsl(var(--board-best)/0.32)]",
        isCaptureAttackerSquare &&
          "border-[hsl(var(--board-danger)/0.85)] bg-[hsl(var(--board-danger)/0.2)] shadow-[0_0_0_2px_hsl(var(--board-danger)/0.24),0_0_18px_hsl(var(--board-danger)/0.24)] dark:bg-[hsl(var(--board-danger)/0.28)] dark:shadow-[0_0_0_2px_hsl(var(--board-danger)/0.34),0_0_22px_hsl(var(--board-danger)/0.3)]",
        isCaptureTargetSquare &&
          "border-[hsl(var(--board-danger))] bg-[hsl(var(--board-danger)/0.26)] shadow-[0_0_0_2px_hsl(var(--board-danger)/0.34),0_0_28px_hsl(var(--board-danger)/0.28)] dark:bg-[hsl(var(--board-danger)/0.34)] dark:shadow-[0_0_0_2px_hsl(var(--board-danger)/0.42),0_0_34px_hsl(var(--board-danger)/0.34)]",
        beamStep !== undefined &&
          "border-[hsl(var(--board-danger)/0.65)] shadow-[0_0_0_2px_hsl(var(--board-danger)/0.22)]"
      )}
    >
      <span className="sr-only">
        {toBoardLabel(position.row, position.col)}
      </span>
      <span
        className={cn(
          "relative flex size-full items-center justify-center leading-none",
          showHints &&
            isBoardInteractive &&
            isEnemyAttackSquare &&
            !hasPawn &&
            !hasBishop &&
            !hasRook &&
            !hasKnight &&
            "ring-1 ring-inset ring-[hsl(var(--board-danger)/0.28)] dark:ring-[hsl(var(--board-danger)/0.42)]",
          showHints &&
            isBoardInteractive &&
            isLegalMove &&
            !hasKnight &&
            !hasEnemyPiece &&
            "ring-1 ring-inset ring-[hsl(var(--board-legal)/0.22)] dark:ring-[hsl(var(--board-legal)/0.34)]",
          showHints &&
            isBoardInteractive &&
            isSafeEnemyPiece &&
            !hasKnight &&
            "ring-1 ring-inset ring-[hsl(var(--board-capture)/0.3)] dark:ring-[hsl(var(--board-capture)/0.42)]"
        )}
      >
        {isCaptureAttackerSquare ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[10%] rounded-[0.35rem] bg-[hsl(var(--board-danger)/0.16)] ring-2 ring-[hsl(var(--board-danger)/0.44)] dark:bg-[hsl(var(--board-danger)/0.22)] dark:ring-[hsl(var(--board-danger)/0.52)]"
          />
        ) : null}
        {isCaptureTargetSquare ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[8%] rounded-[0.4rem] bg-[hsl(var(--board-danger)/0.2)] ring-2 ring-[hsl(var(--board-danger)/0.56)] dark:bg-[hsl(var(--board-danger)/0.28)] dark:ring-[hsl(var(--board-danger)/0.64)]"
          />
        ) : null}
        {beamStep !== undefined ||
        (captureAnimation?.melee && isCaptureTargetSquare) ? (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 spk-capture-beam",
              isCaptureTargetSquare && "spk-capture-impact"
            )}
            style={
              {
                ["--spk-beam-delay" as string]: `${
                  beamStep !== undefined
                    ? beamStep * 55
                    : Math.max((captureAnimation?.deathDelayMs ?? 0) - 120, 0)
                }ms`
              } as CSSProperties
            }
          />
        ) : null}
        {hasKnight ? (
          <KnightPiece
            isClient={isClient}
            className="z-10 drop-shadow-sm"
            isBoardInteractive={isBoardInteractive}
            isDraggingKnight={isDraggingKnight}
            moveAnimation={shouldAnimateKnight ? knightMoveAnimation : null}
            isDead={knightDeathDelayMs > 0}
            deathDelayMs={knightDeathDelayMs}
          />
        ) : null}
        {hasPawn ? (
          <Image
            src="/pawn.svg"
            alt="Pawn"
            width={50}
            height={50}
            className={cn(
              "relative z-10 block h-[68%] w-[68%] object-contain drop-shadow-sm sm:size-12",
              hasKnight && "hidden",
              isCaptureAttackerSquare &&
                captureAnimation?.attackerKind === "pawn" &&
                "drop-shadow-[0_0_12px_hsl(var(--board-danger)/0.62)]",
              isCaptureAttackerSquare &&
                captureAnimation?.melee &&
                captureAnimation.attackerKind === "pawn" &&
                "spk-enemy-slash"
            )}
            style={meleeSlashStyle}
          />
        ) : null}
        {hasBishop ? (
          <Image
            src="/bishop.svg"
            alt="Bishop"
            width={50}
            height={50}
            className={cn(
              "relative z-10 block size-[92%] object-contain drop-shadow-sm sm:size-16",
              hasKnight && "hidden",
              isCaptureAttackerSquare &&
                captureAnimation?.attackerKind === "bishop" &&
                "drop-shadow-[0_0_12px_hsl(var(--board-danger)/0.62)]",
              isCaptureAttackerSquare &&
                captureAnimation?.melee &&
                captureAnimation.attackerKind === "bishop" &&
                "spk-enemy-slash"
            )}
            style={meleeSlashStyle}
          />
        ) : null}
        {hasRook ? (
          <Image
            src="/rook.svg"
            alt="Rook"
            width={50}
            height={50}
            className={cn(
              "relative z-10 block size-[84%] object-contain drop-shadow-sm sm:size-14",
              hasKnight && "hidden",
              isCaptureAttackerSquare &&
                captureAnimation?.attackerKind === "rook" &&
                "drop-shadow-[0_0_12px_hsl(var(--board-danger)/0.62)]",
              isCaptureAttackerSquare &&
                captureAnimation?.melee &&
                captureAnimation.attackerKind === "rook" &&
                "spk-enemy-slash"
            )}
            style={meleeSlashStyle}
          />
        ) : null}
        {isBoardInteractive &&
        isLegalMove &&
        !hasKnight &&
        !hasPawn &&
        !hasBishop &&
        !hasRook ? (
          showHints ? (
            <span className="block size-3 rounded-full bg-[hsl(var(--board-legal)/0.68)] transition group-hover:bg-[hsl(var(--board-legal))] dark:bg-[hsl(var(--board-legal)/0.8)]" />
          ) : null
        ) : null}
        {isBoardInteractive &&
        showHints &&
        isEnemyAttackSquare &&
        !hasKnight &&
        !hasBishop &&
        !hasRook &&
        !hasPawn ? (
          <span className="pointer-events-none absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[hsl(var(--board-danger)/0.5)] bg-[hsl(var(--board-danger)/0.18)] dark:bg-[hsl(var(--board-danger)/0.26)]" />
        ) : null}
        {rowLabel !== undefined ? (
          <span className="pointer-events-none absolute left-1 top-1 text-[0.62rem] font-bold text-foreground/72 sm:hidden">
            {rowLabel}
          </span>
        ) : null}
        {columnLabel ? (
          <span className="pointer-events-none absolute bottom-1 right-1 text-[0.62rem] font-bold text-foreground/72 sm:hidden">
            {columnLabel}
          </span>
        ) : null}
        {bestLineBadge ? (
          <span
            title={bestLineBadge.title}
            className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--board-best))] px-1.5 text-[0.65rem] font-bold text-primary-foreground shadow-sm shadow-[hsl(var(--board-best)/0.35)] sm:h-6 sm:min-w-6 sm:text-xs dark:shadow-[hsl(var(--board-best)/0.5)]"
          >
            {bestLineBadge.label}
          </span>
        ) : null}
        {yourLineBadge ? (
          <span
            title={yourLineBadge.title}
            className="absolute bottom-1 left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--board-your))] px-1.5 text-[0.65rem] font-bold text-[hsl(var(--board-your-foreground))] shadow-sm shadow-[hsl(var(--board-your)/0.32)] sm:h-6 sm:min-w-6 sm:text-xs dark:shadow-[hsl(var(--board-your)/0.45)]"
          >
            {yourLineBadge.label}
          </span>
        ) : null}
      </span>
    </button>
  )
}

function KnightPiece({
  isClient,
  className,
  isBoardInteractive,
  isDraggingKnight,
  moveAnimation,
  isDead = false,
  deathDelayMs = 0
}: {
  isClient: boolean
  className?: string
  isBoardInteractive: boolean
  isDraggingKnight: boolean
  moveAnimation: KnightMoveAnimation | null
  isDead?: boolean
  deathDelayMs?: number
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: KNIGHT_DRAG_ID,
      disabled: !isClient || !isBoardInteractive
    })

  const style: CSSProperties | undefined = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 20
      }
    : moveAnimation
      ? {
          zIndex: 10,
          ["--spk-knight-from-x" as string]: `${(moveAnimation.from.col - moveAnimation.to.col) * 100}%`,
          ["--spk-knight-from-y" as string]: `${(moveAnimation.from.row - moveAnimation.to.row) * 100}%`
        }
      : undefined

  if (!isClient) {
    return (
      <span
        className={cn("flex size-full items-center justify-center", className)}
      >
        <Image
          src="/knight.svg"
          alt="Knight"
          width={56}
          height={56}
          draggable={false}
          className="block h-[74%] w-[74%] object-contain drop-shadow-sm sm:size-14"
        />
      </span>
    )
  }

  return (
    <span
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex size-full touch-none items-center justify-center",
        moveAnimation && !transform && "spk-knight-tap-move",
        isDraggingKnight && isDragging && "opacity-70",
        className
      )}
      {...attributes}
      {...listeners}
    >
      <Image
        src="/knight.svg"
        alt="Knight"
        width={56}
        height={56}
        draggable={false}
        className={cn(
          "block h-[74%] w-[74%] object-contain drop-shadow-sm sm:size-14",
          isDead && "spk-knight-death"
        )}
        style={
          {
            ["--spk-knight-death-delay" as string]: `${deathDelayMs}ms`
          } as CSSProperties
        }
      />
    </span>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-4">
      <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
    </div>
  )
}

function CompactStatCard({
  label,
  value
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
      <div className="text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
    </div>
  )
}

function MobileMetric({
  label,
  value,
  tone = "default"
}: {
  label: string
  value: number | string
  tone?: "default" | "success" | "danger"
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/35 px-2 py-2">
      <div className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-base font-semibold tracking-tight text-foreground",
          tone === "success" && "text-success",
          tone === "danger" && "text-destructive"
        )}
      >
        {value}
      </div>
    </div>
  )
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function createCaptureSegment(
  state: GameState,
  pawnNumber: number
): CaptureSegment {
  return {
    difficulty: state.difficulty,
    pawnNumber,
    knightStart: state.knight,
    pawnTarget: state.pawn,
    bishopStart: state.bishop,
    rookStart: state.rook,
    actualMoves: 0,
    actualPath: [state.knight]
  }
}

function getHighScoreStorageKey(difficulty: DifficultyMode) {
  return `spk-high-score-${difficulty}`
}

function toBoardLabel(row: number, col: number) {
  return `${String.fromCharCode(65 + col)}${BOARD_SIZE - row}`
}

function getSquareId(position: { row: number; col: number }) {
  return `square-${position.row}-${position.col}`
}

function buildSquareStepLookup(path: Position[]): SquareStepLookup {
  const steps = new Map<string, number[]>()

  path.slice(1).forEach((position, index) => {
    const squareId = getSquareId(position)
    const stepNumber = index + 1
    const existingSteps = steps.get(squareId)

    if (existingSteps) {
      existingSteps.push(stepNumber)
      return
    }

    steps.set(squareId, [stepNumber])
  })

  return steps
}

function parseSquareId(squareId: string) {
  const match = /^square-(\d+)-(\d+)$/.exec(squareId)

  if (!match) return null

  return {
    row: Number(match[1]),
    col: Number(match[2])
  }
}

function buildSquareLabel({
  row,
  col,
  hasKnight,
  hasPawn,
  hasBishop,
  hasRook,
  isLegalMove,
  bestLineSteps,
  yourLineSteps
}: {
  row: number
  col: number
  hasKnight: boolean
  hasPawn: boolean
  hasBishop: boolean
  hasRook: boolean
  isLegalMove: boolean
  bestLineSteps?: number[]
  yourLineSteps?: number[]
}) {
  const parts = [toBoardLabel(row, col)]

  if (hasKnight) parts.push("knight")
  if (hasPawn) parts.push("pawn")
  if (hasBishop) parts.push("bishop")
  if (hasRook) parts.push("rook")
  if (isLegalMove) parts.push("legal move")
  if (bestLineSteps?.length) {
    parts.push(describeSquareSteps("best moves", bestLineSteps))
  }
  if (yourLineSteps?.length) {
    parts.push(describeSquareSteps("your moves", yourLineSteps))
  }
  if (!hasKnight && !hasPawn && !hasBishop && !hasRook && !isLegalMove) {
    parts.push("empty square")
  }

  return parts.join(", ")
}

function formatSquareStepBadge(steps: number[], prefix: string) {
  const label =
    steps.length === 1
      ? String(steps[0])
      : steps.length === 2
        ? `${steps[0]}/${steps[1]}`
        : `${steps.length}x`

  return {
    label,
    title: `${prefix}: ${steps.join(", ")}`
  }
}

function describeSquareSteps(prefix: string, steps: number[]) {
  return `${prefix} ${steps.join(", ")}`
}

function isAdjacentSquare(from: Position, to: Position) {
  const rowDelta = Math.abs(from.row - to.row)
  const colDelta = Math.abs(from.col - to.col)

  return rowDelta <= 1 && colDelta <= 1 && (rowDelta !== 0 || colDelta !== 0)
}

function buildBeamSquares(from: Position, to: Position) {
  const rowDelta = to.row - from.row
  const colDelta = to.col - from.col
  const rowStep = Math.sign(rowDelta)
  const colStep = Math.sign(colDelta)

  const squares: Position[] = []
  let current = {
    row: from.row + rowStep,
    col: from.col + colStep
  }

  while (!isSamePosition(current, to)) {
    squares.push(current)
    current = {
      row: current.row + rowStep,
      col: current.col + colStep
    }
  }

  squares.push(to)
  return squares
}

function getCaptureAttacker(
  enemies: {
    pawn: Position | null
    bishop: Position | null
    rook: Position | null
  },
  destination: Position
): { kind: CaptureAttackerKind; position: Position } | null {
  const slidingBlockers = [enemies.pawn, enemies.bishop, enemies.rook].filter(
    (piece): piece is Position => piece !== null
  )
  const bishopBlockers = slidingBlockers.filter(
    (piece) => !enemies.bishop || !isSamePosition(piece, enemies.bishop)
  )
  const rookBlockers = slidingBlockers.filter(
    (piece) => !enemies.rook || !isSamePosition(piece, enemies.rook)
  )

  if (
    enemies.bishop &&
    isSquareUnderBishopAttack(destination, enemies.bishop, bishopBlockers)
  ) {
    return { kind: "bishop", position: enemies.bishop }
  }

  if (
    enemies.rook &&
    isSquareUnderRookAttack(destination, enemies.rook, rookBlockers)
  ) {
    return { kind: "rook", position: enemies.rook }
  }

  if (enemies.pawn && isSquareUnderBlackPawnAttack(destination, enemies.pawn)) {
    return { kind: "pawn", position: enemies.pawn }
  }

  return null
}

function createCaptureAnimation(
  enemies: {
    pawn: Position | null
    bishop: Position | null
    rook: Position | null
  },
  destination: Position
): CaptureAnimationState | null {
  const remaining = resolveEnemyPiecesAfterMove(enemies, destination)
  const attacker = getCaptureAttacker(
    {
      pawn: remaining.pawn,
      bishop: remaining.bishop,
      rook: remaining.rook
    },
    destination
  )

  if (!attacker) return null

  const melee =
    attacker.kind === "pawn" || isAdjacentSquare(attacker.position, destination)
  const beamSquares = melee
    ? []
    : buildBeamSquares(attacker.position, destination)

  const beamStepMs = 125
  const meleeImpactDelayMs = 320
  const deathDelayMs = melee
    ? meleeImpactDelayMs + 180
    : Math.max((beamSquares.length - 1) * beamStepMs, 0) + 320
  const totalDurationMs = deathDelayMs + 1100

  return {
    key: Date.now(),
    attackerKind: attacker.kind,
    attackerPosition: attacker.position,
    targetPosition: destination,
    melee,
    beamSquares,
    deathDelayMs,
    totalDurationMs
  }
}
