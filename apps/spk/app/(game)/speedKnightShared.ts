import {
  BOARD_SIZE,
  type CaptureAttackerKind,
  type DifficultyMode,
  type Position
} from "./gameState"

export const KNIGHT_DRAG_ID = "knight"

export type CaptureAnalysisRow = {
  difficulty: DifficultyMode
  pawnNumber: number
  knightStart: Position
  pawnTarget: Position
  bishopStart: Position | null
  rookStart: Position | null
  actualMoves: number
  optimalMoves: number
  wastedMoves: number
  actualPath: Position[]
}

export type GameOverState = {
  title: string
  message: string
  score: number
  analysisRows: CaptureAnalysisRow[]
}

export type KnightMoveAnimation = {
  from: Position
  to: Position
  key: number
}

export type CaptureAnimationState = {
  key: number
  attackerKind: CaptureAttackerKind
  attackerPosition: Position
  targetPosition: Position
  melee: boolean
  beamSquares: Position[]
  deathDelayMs: number
  totalDurationMs: number
}

export type SquareStepLookup = Map<string, number[]>

export function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function toBoardLabel(row: number, col: number) {
  return `${String.fromCharCode(65 + col)}${BOARD_SIZE - row}`
}

export function getSquareId(position: Position) {
  return `square-${position.row}-${position.col}`
}

export function buildSquareStepLookup(path: Position[]): SquareStepLookup {
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
