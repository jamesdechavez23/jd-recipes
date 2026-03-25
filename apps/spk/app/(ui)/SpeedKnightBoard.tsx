"use client"

import { CSS } from "@dnd-kit/utilities"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import Image from "next/image"
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject
} from "react"

import { Card, CardContent } from "@repo/ui/shadcn/card"
import { cn } from "@repo/ui/shadcn/lib/utils"

import {
  BOARD_SIZE,
  isSamePosition,
  isUnsafeKnightDestination,
  type Position
} from "../(game)/gameState"
import {
  getSquareId,
  KNIGHT_DRAG_ID,
  toBoardLabel,
  type CaptureAnimationState,
  type KnightMoveAnimation,
  type SquareStepLookup
} from "../(game)/speedKnightShared"

const boardIndexes = Array.from({ length: BOARD_SIZE }, (_, index) => index)

function getSquareColor(row: number, col: number) {
  return (row + col) % 2 === 0 ? "light" : "dark"
}

export function SpeedKnightBoard({
  boardContainerRef,
  topContent,
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
  boardContainerRef: RefObject<HTMLDivElement | null>
  topContent?: ReactNode
  knight: Position
  pawn: Position
  bishop: Position | null
  rook: Position | null
  legalMoves: Position[]
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
    <Card className="border-border/60 bg-card/70 shadow-2xl backdrop-blur-sm">
      <CardContent className="p-2 sm:p-6">
        {topContent}
        <div
          ref={boardContainerRef}
          className="mx-auto w-full max-w-none sm:max-w-3xl"
        >
          <div className="mb-2 grid grid-cols-8 gap-0 text-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:mb-4 sm:grid-cols-[auto_repeat(8,minmax(0,1fr))] sm:text-xs">
            {boardIndexes.map((rowIndex) => (
              <Row
                key={`row-${rowIndex}`}
                rowIndex={rowIndex}
                knight={knight}
                pawn={pawn}
                bishop={bishop}
                rook={rook}
                legalMoves={legalMoves}
                bestLineStepLookup={bestLineStepLookup}
                yourLineStepLookup={yourLineStepLookup}
                captureAnimation={captureAnimation}
                captureBeamStepLookup={captureBeamStepLookup}
                isBoardInteractive={isBoardInteractive}
                showHints={showHints}
                isClient={isClient}
                isDraggingKnight={isDraggingKnight}
                knightMoveAnimation={knightMoveAnimation}
                onMove={onMove}
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
        </div>
      </CardContent>
    </Card>
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
  knight: Position
  pawn: Position
  bishop: Position | null
  rook: Position | null
  legalMoves: Position[]
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

        return (
          <Square
            key={getSquareId(position)}
            position={position}
            squareColor={getSquareColor(rowIndex, columnIndex)}
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
  position: Position
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

  function handleClick(event: ReactMouseEvent<HTMLButtonElement>) {
    if (event.detail !== 0) {
      return
    }

    handleTapMove()
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      onMouseDown={handleMouseDown}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
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
            className="pointer-events-none absolute right-0.5 top-0.5 z-20 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[hsl(var(--board-best))] px-1 text-[0.6rem] font-bold text-primary-foreground shadow-sm shadow-[hsl(var(--board-best)/0.35)] sm:right-1 sm:top-1 sm:h-6 sm:min-w-6 sm:px-1.5 sm:text-xs dark:shadow-[hsl(var(--board-best)/0.5)]"
          >
            {bestLineBadge.label}
          </span>
        ) : null}
        {yourLineBadge ? (
          <span
            title={yourLineBadge.title}
            className="pointer-events-none absolute bottom-0.5 left-0.5 z-20 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[hsl(var(--board-your))] px-1 text-[0.6rem] font-bold text-[hsl(var(--board-your-foreground))] shadow-sm shadow-[hsl(var(--board-your)/0.32)] sm:bottom-1 sm:left-1 sm:h-6 sm:min-w-6 sm:px-1.5 sm:text-xs dark:shadow-[hsl(var(--board-your)/0.45)]"
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
