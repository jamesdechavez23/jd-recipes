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

export function isSquareUnderBlackPawnAttack(
  position: Position,
  pawn: Position | null
) {
  if (!pawn) return false

  return (
    position.row === pawn.row + 1 &&
    (position.col === pawn.col - 1 || position.col === pawn.col + 1)
  )
}

export function isSquareUnderBishopAttack(
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

export function isSquareUnderRookAttack(
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
  enemies: {
    pawn: Position | null
    bishop: Position | null
    rook: Position | null
  }
) {
  const slidingBlockers = [enemies.pawn, enemies.bishop, enemies.rook].filter(
    (piece): piece is Position => piece !== null
  )
  const bishopBlockers = slidingBlockers.filter(
    (piece) => !enemies.bishop || !isSamePosition(piece, enemies.bishop)
  )
  const rookBlockers = slidingBlockers.filter(
    (piece) => !enemies.rook || !isSamePosition(piece, enemies.rook)
  )

  return (
    isSquareUnderBlackPawnAttack(position, enemies.pawn) ||
    isSquareUnderBishopAttack(position, enemies.bishop, bishopBlockers) ||
    isSquareUnderRookAttack(position, enemies.rook, rookBlockers)
  )
}

export function resolveEnemyPiecesAfterMove(
  enemies: {
    pawn: Position | null
    bishop: Position | null
    rook: Position | null
  },
  destination: Position
) {
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

export function isUnsafeKnightDestination(
  enemies: {
    pawn: Position | null
    bishop: Position | null
    rook: Position | null
  },
  destination: Position
) {
  const remainingEnemies = resolveEnemyPiecesAfterMove(enemies, destination)

  return isSquareUnderEnemyAttack(destination, remainingEnemies)
}

export function getShortestKnightPath(
  start: Position,
  end: Position,
  enemies: {
    pawn: Position | null
    bishop: Position | null
    rook: Position | null
  }
) {
  if (isSamePosition(start, end)) {
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

export function getMinimumKnightMoves(
  start: Position,
  end: Position,
  enemies: {
    pawn: Position | null
    bishop: Position | null
    rook: Position | null
  }
) {
  return Math.max(getShortestKnightPath(start, end, enemies).length - 1, 0)
}

export function getSquareColor(row: number, col: number) {
  return (row + col) % 2 === 0 ? "light" : "dark"
}

function randomInt(maxExclusive: number) {
  return Math.floor(Math.random() * maxExclusive)
}

export function getRandomUnoccupiedSquare(occupied: Position[]) {
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
      getShortestKnightPath(knight, pawn, {
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

  const legalMoves = getLegalKnightMoves(state.knight)
  const isLegalMove = legalMoves.some((move) =>
    isSamePosition(move, action.destination)
  )

  if (!isLegalMove) {
    return state
  }

  const capturedPawn = isSamePosition(action.destination, state.pawn)
  const capturedBishop = state.bishop
    ? isSamePosition(action.destination, state.bishop)
    : false
  const capturedRook = state.rook
    ? isSamePosition(action.destination, state.rook)
    : false

  if (capturedPawn) {
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

  return {
    difficulty: state.difficulty,
    knight: action.destination,
    pawn: state.pawn,
    bishop: capturedBishop ? null : state.bishop,
    rook: capturedRook ? null : state.rook,
    captures: state.captures,
    moves: state.moves + 1
  }
}

function encodePieceState(piece: Position | null) {
  return piece ? `${piece.row},${piece.col}` : "x"
}
