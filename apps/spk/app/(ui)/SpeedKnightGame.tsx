"use client"

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core"
import { useEffect, useMemo, useReducer, useRef, useState } from "react"

import {
  createInitialGameState,
  type DifficultyMode,
  type GameState,
  type Position,
  gameReducer,
  getEnemyPieces,
  getLegalKnightMoves,
  getMinimumKnightMoves,
  getShortestKnightPath,
  isSamePosition,
  isUnsafeKnightDestination,
  previewKnightMove
} from "../(game)/gameState"
import { createCaptureAnimation } from "../(game)/speedKnightAnimations"
import { SpeedKnightBoard } from "./SpeedKnightBoard"
import { SpeedKnightHud, SpeedKnightMobileHud } from "./SpeedKnightHud"
import { SpeedKnightResultsDialog } from "./SpeedKnightResultsDialog"
import {
  createCaptureSegment,
  getHighScoreStorageKey,
  parseSquareId,
  type CaptureSegment
} from "../(game)/speedKnightGameUtils"
import {
  buildSquareStepLookup,
  getSquareId,
  KNIGHT_DRAG_ID,
  type CaptureAnalysisRow,
  type CaptureAnimationState,
  type GameOverState,
  type KnightMoveAnimation
} from "../(game)/speedKnightShared"

const GAME_DURATION_SECONDS = 60
const HINTS_STORAGE_KEY = "spk-show-hints"
const LEGACY_HIGH_SCORE_STORAGE_KEY = "spk-high-score"
const KNIGHT_MOVE_SOUND_PATH = "/sounds/knight-move.mp3"
const PAWN_CAPTURE_SOUND_PATH = "/sounds/pawn-capture.mp3"

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
  const legalMoves = getLegalKnightMoves(state.knight)
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

    return getShortestKnightPath(sandboxScenario.knightStart, {
      pawn: sandboxScenario.pawnTarget,
      bishop: sandboxScenario.bishopStart,
      rook: sandboxScenario.rookStart
    })
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

    clearPendingGameOverDialogTimeout()

    dispatch({ type: "set-state", nextState })
    resetBoardPresentationState()
    clearCaptureAnimation()
    setTimeRemaining(GAME_DURATION_SECONDS)
    setSandboxScenario(null)
    setIsSandboxCaptured(false)
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
    clearPendingGameOverDialogTimeout()

    resetBoardPresentationState()
    clearCaptureAnimation()
    setSandboxScenario(null)
    setIsSandboxCaptured(false)
  }

  function loadSandboxScenario(row: CaptureAnalysisRow) {
    clearPendingGameOverDialogTimeout()

    setSelectedDifficulty(row.difficulty)
    dispatch({
      type: "set-state",
      nextState: buildSandboxState(row)
    })
    resetBoardPresentationState()
    clearCaptureAnimation()
    setIsGameActive(false)
    setTimeRemaining(GAME_DURATION_SECONDS)
    setCurrentCaptureSegment(null)
    setCaptureAnalysisRows([])
    setIsGameOverDialogOpen(false)
    setSandboxScenario(row)
    setIsSandboxCaptured(false)
  }

  function handleResetSandboxPosition() {
    if (!sandboxScenario) return

    clearPendingGameOverDialogTimeout()

    dispatch({
      type: "set-state",
      nextState: buildSandboxState(sandboxScenario)
    })
    resetBoardPresentationState()
    clearCaptureAnimation()
    setIsSandboxCaptured(false)
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
    resetBoardPresentationState()
    clearCaptureAnimation()
    setIsGameActive(false)
    setSandboxScenario(null)
    setIsSandboxCaptured(false)
    setGameOverState(nextGameOverState)

    clearPendingGameOverDialogTimeout()

    setIsGameOverDialogOpen(true)
  }

  function concludeGameAfterDelay(
    nextGameOverState: GameOverState,
    delayMs: number
  ) {
    resetBoardPresentationState()
    setIsGameActive(false)
    setSandboxScenario(null)
    setIsSandboxCaptured(false)
    setGameOverState(nextGameOverState)
    setIsGameOverDialogOpen(false)

    clearPendingGameOverDialogTimeout()

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

  function clearPendingGameOverDialogTimeout() {
    if (gameOverOpenTimeoutRef.current === null) {
      return
    }

    window.clearTimeout(gameOverOpenTimeoutRef.current)
    gameOverOpenTimeoutRef.current = null
  }

  function resetBoardPresentationState() {
    setKnightMoveAnimation(null)
    setIsDraggingKnight(false)
    setShowBestLine(false)
    setShowYourLine(false)
  }

  function clearCaptureAnimation() {
    setCaptureAnimation(null)
  }

  function buildSandboxState(row: CaptureAnalysisRow): GameState {
    return {
      difficulty: row.difficulty,
      knight: row.knightStart,
      pawn: row.pawnTarget,
      bishop: row.bishopStart,
      rook: row.rookStart,
      captures: gameOverState?.score ?? 0,
      moves: 0
    }
  }

  function handleMove(destination: Position, inputMethod: "tap" | "drag") {
    if (!isBoardInteractive) return

    const movePreview = previewKnightMove(state, destination)

    if (!movePreview) return

    if (inputMethod === "tap") {
      setKnightMoveAnimation({
        from: state.knight,
        to: destination,
        key: Date.now()
      })
    } else {
      setKnightMoveAnimation(null)
    }

    const { capturedPawn, capturedBishop, capturedRook } =
      movePreview.remainingEnemies
    const enemies = getEnemyPieces(state)

    if (isSandboxMode) {
      const isUnsafeMove = isUnsafeKnightDestination(enemies, destination)

      dispatch({
        type: "set-state",
        nextState: movePreview.nextState
      })

      if (isUnsafeMove) {
        const animation = createCaptureAnimation(enemies, destination)

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
    const isUnsafeMove = isUnsafeKnightDestination(enemies, destination)

    if (isUnsafeMove) {
      playSound(pawnCaptureAudioRef.current)
      dispatch({
        type: "set-state",
        nextState: movePreview.nextState
      })

      const animation = createCaptureAnimation(enemies, destination)

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
    destination: Position,
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

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-6xl items-start px-3 py-4 sm:px-6 sm:py-10 lg:px-8">
      <div className="grid w-full gap-4 sm:gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <SpeedKnightHud
          selectedDifficulty={selectedDifficulty}
          isGameActive={isGameActive}
          isSandboxMode={isSandboxMode}
          sandboxScenario={sandboxScenario}
          timeRemaining={timeRemaining}
          score={state.captures}
          moves={state.moves}
          highScore={highScore}
          sandboxRunScore={sandboxRunScore}
          showBestLine={showBestLine}
          showYourLine={showYourLine}
          showHints={showHints}
          gameOverState={gameOverState}
          onSelectDifficulty={setSelectedDifficulty}
          onToggleBestLine={toggleBestLine}
          onToggleYourLine={toggleYourLine}
          onResetSandboxPosition={handleResetSandboxPosition}
          onReopenGameOverDialog={reopenGameOverDialog}
          onToggleHints={toggleHints}
          onStartGame={handleStartGame}
          onEndGame={handleEndGame}
          onExitSandbox={handleExitSandbox}
        />

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setIsDraggingKnight(false)}
        >
          <SpeedKnightBoard
            boardContainerRef={boardContainerRef}
            topContent={
              <SpeedKnightMobileHud
                isGameActive={isGameActive}
                isSandboxMode={isSandboxMode}
                sandboxScenario={sandboxScenario}
                timeRemaining={timeRemaining}
                score={state.captures}
                moves={state.moves}
                sandboxRunScore={sandboxRunScore}
                showBestLine={showBestLine}
                showYourLine={showYourLine}
                onToggleBestLine={toggleBestLine}
                onToggleYourLine={toggleYourLine}
                onResetSandboxPosition={handleResetSandboxPosition}
                onEndGame={handleEndGame}
                onExitSandbox={handleExitSandbox}
              />
            }
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
        </DndContext>
      </div>
      <SpeedKnightResultsDialog
        gameOverState={gameOverState}
        isOpen={isGameOverDialogOpen}
        onOpenChange={setIsGameOverDialogOpen}
        onSelectAnalysisRow={handleAnalysisRowSelect}
        onPlayAgain={handleStartGame}
      />
    </main>
  )
}
