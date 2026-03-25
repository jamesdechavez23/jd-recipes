"use client"

import { Button } from "@repo/ui/shadcn/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@repo/ui/shadcn/card"

import type { DifficultyMode } from "../(game)/gameState"
import {
  formatTime,
  type CaptureAnalysisRow,
  type GameOverState
} from "../(game)/speedKnightShared"

export function SpeedKnightHud({
  selectedDifficulty,
  isGameActive,
  isSandboxMode,
  sandboxScenario,
  timeRemaining,
  score,
  moves,
  highScore,
  sandboxRunScore,
  showBestLine,
  showYourLine,
  showHints,
  gameOverState,
  onSelectDifficulty,
  onToggleBestLine,
  onToggleYourLine,
  onResetSandboxPosition,
  onReopenGameOverDialog,
  onToggleHints,
  onStartGame,
  onEndGame,
  onExitSandbox
}: {
  selectedDifficulty: DifficultyMode
  isGameActive: boolean
  isSandboxMode: boolean
  sandboxScenario: CaptureAnalysisRow | null
  timeRemaining: number
  score: number
  moves: number
  highScore: number
  sandboxRunScore: number
  showBestLine: boolean
  showYourLine: boolean
  showHints: boolean
  gameOverState: GameOverState | null
  onSelectDifficulty: (difficulty: DifficultyMode) => void
  onToggleBestLine: () => void
  onToggleYourLine: () => void
  onResetSandboxPosition: () => void
  onReopenGameOverDialog: () => void
  onToggleHints: () => void
  onStartGame: () => void
  onEndGame: () => void
  onExitSandbox: () => void
}) {
  const primaryAction = isGameActive
    ? onEndGame
    : isSandboxMode
      ? onExitSandbox
      : onStartGame
  const primaryLabel = isGameActive
    ? "End Game"
    : isSandboxMode
      ? "Exit Sandbox"
      : "Start Game"

  return (
    <Card className="hidden h-full border-border/60 bg-card/80 shadow-xl backdrop-blur-sm lg:flex lg:flex-col">
      <CardHeader>
        <CardTitle className="text-3xl">Speed Knight Challenge</CardTitle>
        <CardDescription>
          {isSandboxMode && sandboxScenario
            ? `Sandbox mode: replay pawn ${sandboxScenario.pawnNumber} from ${formatSquare(sandboxScenario.knightStart)} to ${formatSquare(sandboxScenario.pawnTarget)}. Capture the pawn, then use reset to try again.`
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
                      selectedDifficulty === difficulty ? "default" : "outline"
                    }
                    className="w-full capitalize"
                    onClick={() => onSelectDifficulty(difficulty)}
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
              isSandboxMode && sandboxScenario
                ? `Sandbox (${sandboxScenario.difficulty})`
                : formatTime(timeRemaining)
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {isSandboxMode && sandboxScenario ? (
              <StatCard label="Run Score" value={sandboxRunScore} />
            ) : (
              <StatCard label="Score" value={score} />
            )}
            {isSandboxMode && sandboxScenario ? (
              <StatCard
                label="Moves vs Ideal"
                value={`${moves} / ${sandboxScenario.optimalMoves}`}
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
                  onClick={onToggleBestLine}
                >
                  {showBestLine ? "Hide Best Moves" : "Show Best Moves"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onToggleYourLine}
                >
                  {showYourLine ? "Hide Your Moves" : "Show Your Moves"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onResetSandboxPosition}
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
                onClick={onReopenGameOverDialog}
              >
                Reopen Results
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onToggleHints}
            >
              {showHints ? "Hide Hints" : "Show Hints"}
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-auto w-full"
          onClick={primaryAction}
        >
          {primaryLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

export function SpeedKnightMobileHud({
  selectedDifficulty,
  isGameActive,
  isSandboxMode,
  sandboxScenario,
  timeRemaining,
  score,
  moves,
  highScore,
  sandboxRunScore,
  showBestLine,
  showYourLine,
  showHints,
  gameOverState,
  onSelectDifficulty,
  onToggleBestLine,
  onToggleYourLine,
  onResetSandboxPosition,
  onReopenGameOverDialog,
  onToggleHints,
  onStartGame,
  onEndGame,
  onExitSandbox
}: {
  selectedDifficulty: DifficultyMode
  isGameActive: boolean
  isSandboxMode: boolean
  sandboxScenario: CaptureAnalysisRow | null
  timeRemaining: number
  score: number
  moves: number
  highScore: number
  sandboxRunScore: number
  showBestLine: boolean
  showYourLine: boolean
  showHints: boolean
  gameOverState: GameOverState | null
  onSelectDifficulty: (difficulty: DifficultyMode) => void
  onToggleBestLine: () => void
  onToggleYourLine: () => void
  onResetSandboxPosition: () => void
  onReopenGameOverDialog: () => void
  onToggleHints: () => void
  onStartGame: () => void
  onEndGame: () => void
  onExitSandbox: () => void
}) {
  const primaryAction = isGameActive
    ? onEndGame
    : isSandboxMode
      ? onExitSandbox
      : onStartGame
  const primaryLabel = isGameActive
    ? "End Game"
    : isSandboxMode
      ? "Exit Sandbox"
      : "Start Game"

  return (
    <div className="mb-3 space-y-2 lg:hidden">
      {!isGameActive && !isSandboxMode ? (
        <div className="space-y-2 rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm backdrop-blur-sm">
          <div className="space-y-2">
            <div className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Difficulty
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["easy", "medium", "hard"] as const).map((difficulty) => (
                <Button
                  key={difficulty}
                  type="button"
                  variant={
                    selectedDifficulty === difficulty ? "default" : "outline"
                  }
                  className="w-full px-2 capitalize"
                  onClick={() => onSelectDifficulty(difficulty)}
                >
                  {difficulty}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CompactStatCard label="Timer" value={formatTime(timeRemaining)} />
            <CompactStatCard label="High Score" value={highScore} />
          </div>
        </div>
      ) : null}
      {isGameActive ? (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
          <CompactStatCard label="Timer" value={formatTime(timeRemaining)} />
          <CompactStatCard label="Score" value={score} />
          <Button
            type="button"
            variant="outline"
            className="h-full min-h-16 px-3"
            onClick={primaryAction}
          >
            {primaryLabel}
          </Button>
        </div>
      ) : null}
      {isSandboxMode && sandboxScenario ? (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
            <CompactStatCard label="Run Score" value={sandboxRunScore} />
            <CompactStatCard
              label="Moves / Ideal"
              value={`${moves} / ${sandboxScenario.optimalMoves}`}
            />
            <Button
              type="button"
              variant="outline"
              className="h-full min-h-16 px-3"
              onClick={primaryAction}
            >
              {primaryLabel}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full px-2 text-xs"
              onClick={onToggleBestLine}
            >
              {showBestLine ? "Hide Best" : "Best Moves"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full px-2 text-xs"
              onClick={onToggleYourLine}
            >
              {showYourLine ? "Hide Yours" : "Your Moves"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full px-2 text-xs"
              onClick={onResetSandboxPosition}
            >
              Reset
            </Button>
          </div>
        </>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {gameOverState && !isGameActive ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onReopenGameOverDialog}
          >
            Results
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onToggleHints}
        >
          {showHints ? "Hide Hints" : "Show Hints"}
        </Button>
      </div>
      {!isGameActive && !isSandboxMode ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={primaryAction}
        >
          {primaryLabel}
        </Button>
      ) : null}
    </div>
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

function formatSquare(position: { row: number; col: number }) {
  return `${String.fromCharCode(65 + position.col)}${8 - position.row}`
}
