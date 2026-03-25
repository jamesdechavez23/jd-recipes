import type { DifficultyMode, GameState, Position } from "./gameState"

export type CaptureSegment = {
  difficulty: DifficultyMode
  pawnNumber: number
  knightStart: Position
  pawnTarget: Position
  bishopStart: Position | null
  rookStart: Position | null
  actualMoves: number
  actualPath: Position[]
}

export function createCaptureSegment(
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

export function getHighScoreStorageKey(difficulty: DifficultyMode) {
  return `spk-high-score-${difficulty}`
}

export function parseSquareId(squareId: string): Position | null {
  const match = /^square-(\d+)-(\d+)$/.exec(squareId)

  if (!match) return null

  return {
    row: Number(match[1]),
    col: Number(match[2])
  }
}
