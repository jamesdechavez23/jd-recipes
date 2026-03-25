export const BOARD_SIZE = 8

const KNIGHT_OFFSETS = [
  { row: 2, col: 1 },
  { row: 2, col: -1 },
  { row: -2, col: 1 },
  { row: -2, col: -1 },
  { row: 1, col: 2 },
  { row: 1, col: -2 },
  { row: -1, col: 2 },
  { row: -1, col: -2 }
]

export type Position = {
  row: number
  col: number
}

export type DifficultyMode = "easy" | "medium" | "hard"

export type GameState = {
  difficulty: DifficultyMode
  knight: Position
  pawn: Position
  bishop: Position | null
  rook: Position | null
  captures: number
  moves: number
}

export type EnemyPieces = {
  pawn: Position | null
  bishop: Position | null
  rook: Position | null
}

export type ResolvedEnemyPieces = EnemyPieces & {
  capturedPawn: boolean
  capturedBishop: boolean
  capturedRook: boolean
}

export type CaptureAttackerKind = "pawn" | "bishop" | "rook"

export type CaptureAttacker = {
  kind: CaptureAttackerKind
  position: Position
}

export type GameAction =
  | {
      type: "move-knight"
      destination: Position
    }
  | {
      type: "set-state"
      nextState: GameState
    }
  | {
      type: "reset"
    }

function isWithinBoard(position: Position) {
  return (
    position.row >= 0 &&
    position.row < BOARD_SIZE &&
    position.col >= 0 &&
    position.col < BOARD_SIZE
  )
}

export function isSamePosition(left: Position, right: Position) {
  return left.row === right.row && left.col === right.col
}

export function getLegalKnightMoves(position: Position) {
  return KNIGHT_OFFSETS.map((offset) => ({
    row: position.row + offset.row,
    col: position.col + offset.col
  })).filter(isWithinBoard)
}

export function getEnemyPieces(source: EnemyPieces): EnemyPieces {
  return {
    pawn: source.pawn,
    bishop: source.bishop,
    rook: source.rook
  }
}

function isSquareUnderBlackPawnAttack(
  position: Position,
  pawn: Position | null
) {
  if (!pawn) return false

  return (
    position.row === pawn.row + 1 &&
    (position.col === pawn.col - 1 || position.col === pawn.col + 1)
  )
}

function isSquareUnderBishopAttack(
  position: Position,
  bishop: Position | null,
  blockers: Position[]
) {
  if (!bishop) return false

  const rowDelta = position.row - bishop.row
  const colDelta = position.col - bishop.col

  if (Math.abs(rowDelta) !== Math.abs(colDelta) || rowDelta === 0) {
    return false
  }

  const rowStep = Math.sign(rowDelta)
  const colStep = Math.sign(colDelta)
  let next = {
    row: bishop.row + rowStep,
    col: bishop.col + colStep
  }

  while (isWithinBoard(next)) {
    if (isSamePosition(next, position)) {
      return true
    }

    if (blockers.some((blocker) => isSamePosition(blocker, next))) {
      return false
    }

    next = {
      row: next.row + rowStep,
      col: next.col + colStep
    }
  }

  return false
}

function isSquareUnderRookAttack(
  position: Position,
  rook: Position | null,
  blockers: Position[]
) {
  if (!rook) return false

  const sameRow = position.row === rook.row
  const sameCol = position.col === rook.col

  if ((!sameRow && !sameCol) || isSamePosition(position, rook)) {
    return false
  }

  const rowStep = sameCol ? Math.sign(position.row - rook.row) : 0
  const colStep = sameRow ? Math.sign(position.col - rook.col) : 0
  let next = {
    row: rook.row + rowStep,
    col: rook.col + colStep
  }

  while (isWithinBoard(next)) {
    if (isSamePosition(next, position)) {
      return true
    }

    if (blockers.some((blocker) => isSamePosition(blocker, next))) {
      return false
    }

    next = {
      row: next.row + rowStep,
      col: next.col + colStep
    }
  }

  return false
}

export function isSquareUnderEnemyAttack(
  position: Position,
  enemies: EnemyPieces
) {
  const { bishopBlockers, rookBlockers } = getSlidingAttackBlockers(enemies)

  return (
    isSquareUnderBlackPawnAttack(position, enemies.pawn) ||
    isSquareUnderBishopAttack(position, enemies.bishop, bishopBlockers) ||
    isSquareUnderRookAttack(position, enemies.rook, rookBlockers)
  )
}

export function resolveEnemyPiecesAfterMove(
  enemies: EnemyPieces,
  destination: Position
): ResolvedEnemyPieces {
  const capturedPawn = enemies.pawn
    ? isSamePosition(destination, enemies.pawn)
    : false
  const capturedBishop = enemies.bishop
    ? isSamePosition(destination, enemies.bishop)
    : false
  const capturedRook = enemies.rook
    ? isSamePosition(destination, enemies.rook)
    : false

  return {
    pawn: capturedPawn ? null : enemies.pawn,
    bishop: capturedBishop ? null : enemies.bishop,
    rook: capturedRook ? null : enemies.rook,
    capturedPawn,
    capturedBishop,
    capturedRook
  }
}

export function getCaptureAttacker(
  enemies: EnemyPieces,
  position: Position
): CaptureAttacker | null {
  const { bishopBlockers, rookBlockers } = getSlidingAttackBlockers(enemies)

  if (
    enemies.bishop &&
    isSquareUnderBishopAttack(position, enemies.bishop, bishopBlockers)
  ) {
    return { kind: "bishop", position: enemies.bishop }
  }

  if (
    enemies.rook &&
    isSquareUnderRookAttack(position, enemies.rook, rookBlockers)
  ) {
    return { kind: "rook", position: enemies.rook }
  }

  if (enemies.pawn && isSquareUnderBlackPawnAttack(position, enemies.pawn)) {
    return { kind: "pawn", position: enemies.pawn }
  }

  return null
}

export function isUnsafeKnightDestination(
  enemies: EnemyPieces,
  destination: Position
) {
  const remainingEnemies = resolveEnemyPiecesAfterMove(enemies, destination)

  return isSquareUnderEnemyAttack(destination, remainingEnemies)
}

export function previewKnightMove(state: GameState, destination: Position) {
  const isLegalMove = getLegalKnightMoves(state.knight).some((move) =>
    isSamePosition(move, destination)
  )

  if (!isLegalMove) {
    return null
  }

  const remainingEnemies = resolveEnemyPiecesAfterMove(
    getEnemyPieces(state),
    destination
  )

  return {
    remainingEnemies,
    nextState: {
      ...state,
      knight: destination,
      bishop: remainingEnemies.bishop,
      rook: remainingEnemies.rook,
      moves: state.moves + 1
    }
  }
}

export function getShortestKnightPath(start: Position, enemies: EnemyPieces) {
  if (enemies.pawn && isSamePosition(start, enemies.pawn)) {
    return [start]
  }

  const visited = new Set<string>([
    `${start.row},${start.col}|${encodePieceState(enemies.bishop)}|${encodePieceState(enemies.rook)}`
  ])
  const queue: Array<{
    knight: Position
    bishop: Position | null
    rook: Position | null
    path: Position[]
  }> = [
    {
      knight: start,
      bishop: enemies.bishop,
      rook: enemies.rook,
      path: [start]
    }
  ]

  while (queue.length > 0) {
    const current = queue.shift()

    if (!current) break

    for (const next of getLegalKnightMoves(current.knight)) {
      const remainingEnemies = resolveEnemyPiecesAfterMove(
        {
          pawn: enemies.pawn,
          bishop: current.bishop,
          rook: current.rook
        },
        next
      )
      const key = `${next.row},${next.col}|${encodePieceState(remainingEnemies.bishop)}|${encodePieceState(remainingEnemies.rook)}`
      const isUnsafeSquare = isSquareUnderEnemyAttack(next, remainingEnemies)

      if (isUnsafeSquare) continue

      if (visited.has(key)) continue

      visited.add(key)

      const path = [...current.path, next]

      if (remainingEnemies.capturedPawn) {
        return path
      }

      queue.push({
        knight: next,
        bishop: remainingEnemies.bishop,
        rook: remainingEnemies.rook,
        path
      })
    }
  }

  return [start]
}

export function getMinimumKnightMoves(start: Position, enemies: EnemyPieces) {
  return Math.max(getShortestKnightPath(start, enemies).length - 1, 0)
}

function randomInt(maxExclusive: number) {
  return Math.floor(Math.random() * maxExclusive)
}

function getRandomUnoccupiedSquare(occupied: Position[]) {
  let next = {
    row: randomInt(BOARD_SIZE),
    col: randomInt(BOARD_SIZE)
  }

  while (occupied.some((position) => isSamePosition(position, next))) {
    next = {
      row: randomInt(BOARD_SIZE),
      col: randomInt(BOARD_SIZE)
    }
  }

  return next
}

function createRoundSetup(knight: Position, difficulty: DifficultyMode) {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const bishop =
      difficulty === "medium" || difficulty === "hard"
        ? getRandomUnoccupiedSquare([knight])
        : null
    const rook =
      difficulty === "hard"
        ? getRandomUnoccupiedSquare(
            [knight, bishop].filter(
              (piece): piece is Position => piece !== null
            )
          )
        : null
    const pawn = getRandomUnoccupiedSquare(
      [knight, bishop, rook].filter(
        (piece): piece is Position => piece !== null
      )
    )

    if (isSquareUnderEnemyAttack(knight, { pawn, bishop, rook })) {
      continue
    }

    if (
      getShortestKnightPath(knight, {
        pawn,
        bishop,
        rook
      }).length <= 1
    ) {
      continue
    }

    return {
      pawn,
      bishop,
      rook
    }
  }

  throw new Error(`Unable to generate a solvable ${difficulty} board state`)
}

export function createInitialGameState(
  difficulty: DifficultyMode = "easy"
): GameState {
  const knight = { row: 7, col: 1 }
  const roundSetup = createRoundSetup(knight, difficulty)

  return {
    difficulty,
    knight,
    pawn: roundSetup.pawn,
    bishop: roundSetup.bishop,
    rook: roundSetup.rook,
    captures: 0,
    moves: 0
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "set-state") {
    return action.nextState
  }

  if (action.type === "reset") {
    return createInitialGameState()
  }

  const movePreview = previewKnightMove(state, action.destination)

  if (!movePreview) {
    return state
  }

  if (movePreview.remainingEnemies.capturedPawn) {
    const nextRoundSetup = createRoundSetup(
      action.destination,
      state.difficulty
    )

    return {
      difficulty: state.difficulty,
      knight: action.destination,
      pawn: nextRoundSetup.pawn,
      bishop: nextRoundSetup.bishop,
      rook: nextRoundSetup.rook,
      captures: state.captures + 1,
      moves: state.moves + 1
    }
  }

  return movePreview.nextState
}

function getSlidingAttackBlockers(enemies: EnemyPieces) {
  const slidingPieces = [enemies.pawn, enemies.bishop, enemies.rook].filter(
    (piece): piece is Position => piece !== null
  )

  return {
    bishopBlockers: slidingPieces.filter(
      (piece) => !enemies.bishop || !isSamePosition(piece, enemies.bishop)
    ),
    rookBlockers: slidingPieces.filter(
      (piece) => !enemies.rook || !isSamePosition(piece, enemies.rook)
    )
  }
}

function encodePieceState(piece: Position | null) {
  return piece ? `${piece.row},${piece.col}` : "x"
}
