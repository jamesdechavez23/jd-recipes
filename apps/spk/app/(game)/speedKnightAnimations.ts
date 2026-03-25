import {
  getCaptureAttacker,
  isSamePosition,
  resolveEnemyPiecesAfterMove,
  type EnemyPieces,
  type Position
} from "./gameState"
import type { CaptureAnimationState } from "./speedKnightShared"

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

export function createCaptureAnimation(
  enemies: EnemyPieces,
  destination: Position
): CaptureAnimationState | null {
  const remaining = resolveEnemyPiecesAfterMove(enemies, destination)
  const attacker = getCaptureAttacker(remaining, destination)

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
