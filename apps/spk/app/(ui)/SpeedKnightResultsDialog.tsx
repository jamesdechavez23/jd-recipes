"use client"

import { Button } from "@repo/ui/shadcn/button"
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
  toBoardLabel,
  type CaptureAnalysisRow,
  type GameOverState
} from "../(game)/speedKnightShared"

export function SpeedKnightResultsDialog({
  gameOverState,
  isOpen,
  onOpenChange,
  onSelectAnalysisRow,
  onPlayAgain
}: {
  gameOverState: GameOverState | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSelectAnalysisRow: (row: CaptureAnalysisRow) => void
  onPlayAgain: () => void
}) {
  return (
    <Dialog open={isOpen && gameOverState !== null} onOpenChange={onOpenChange}>
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
                  onClick={() => onSelectAnalysisRow(row)}
                  className="w-full rounded-xl border border-border/60 bg-background/90 p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Pawn {row.pawnNumber}
                      </div>
                      <div className="mt-1 text-sm font-medium text-foreground">
                        {toBoardLabel(row.knightStart.row, row.knightStart.col)}
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
                      aria-label={`Load pawn ${row.pawnNumber} sandbox from ${toBoardLabel(row.knightStart.row, row.knightStart.col)} to ${toBoardLabel(row.pawnTarget.row, row.pawnTarget.col)}`}
                      onClick={() => onSelectAnalysisRow(row)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") {
                          return
                        }

                        event.preventDefault()
                        onSelectAnalysisRow(row)
                      }}
                      className="cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {row.pawnNumber}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {toBoardLabel(row.knightStart.row, row.knightStart.col)}
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
                            onSelectAnalysisRow(row)
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
            onClick={onPlayAgain}
          >
            Play Again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
