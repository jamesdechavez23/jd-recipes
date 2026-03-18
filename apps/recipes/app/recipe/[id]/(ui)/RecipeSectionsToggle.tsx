"use client"

import { useMemo, useState } from "react"
import { Button } from "@repo/ui/shadcn/button"
import { ChevronDown, ChevronUp, Tag } from "lucide-react"

export type TabKey = "ingredients" | "instructions"

export type DisplayIngredient = {
  ingredientId: number
  name: string
  category?: string | null
  quantity?: number | null
  unit?: string | null
}

type StepIngredient = {
  ingredientId: number
  quantity: number | null
  unit: string | null
}

export interface RecipeSectionsToggleProps {
  ingredients: DisplayIngredient[]
  instructions: unknown[]
  initialTab?: TabKey
  onTabChange?: (tab: TabKey) => void
  footerExtra?: React.ReactNode
  onEditIngredient?: (ingredientId: number) => void
  onEditInstruction?: (instructionIdx: number) => void
}

function normalizeCategory(category: string | null | undefined): string {
  const c = typeof category === "string" ? category.trim() : ""
  return c ? c : "Other"
}

function categoryBadgeClasses(_category: string): string {
  return "bg-primary text-primary-foreground"
}

type NormalizedInstruction = {
  short: string
  long: string | null
  heat: string | null
  timeMinutes: number | null
  stepIngredients: StepIngredient[]
}

function normalizeInstruction(
  step: unknown,
  idx: number
): NormalizedInstruction {
  if (typeof step === "string") {
    return {
      short: step,
      long: null,
      heat: null,
      timeMinutes: null,
      stepIngredients: []
    }
  }

  if (step && typeof step === "object") {
    const anyStep = step as Record<string, unknown>

    const short =
      typeof anyStep.short_desc === "string" ? anyStep.short_desc.trim() : ""
    const long =
      typeof anyStep.long_desc === "string" ? anyStep.long_desc.trim() : ""
    const heat = typeof anyStep.heat === "string" ? anyStep.heat.trim() : ""

    const timeRaw = anyStep.time_minutes
    const timeMinutes =
      typeof timeRaw === "number"
        ? timeRaw
        : typeof timeRaw === "string"
          ? Number(timeRaw)
          : NaN

    const hasTime = Number.isFinite(timeMinutes) && timeMinutes > 0

    const rawStepIngredients = (anyStep.step_instructions ??
      anyStep.step_ingredients) as unknown
    const stepIngredients: StepIngredient[] = Array.isArray(rawStepIngredients)
      ? rawStepIngredients
          .map((raw): StepIngredient | null => {
            if (!raw || typeof raw !== "object") return null
            const r = raw as Record<string, unknown>

            const ingredientIdRaw = r.ingredientId
            const ingredientId =
              typeof ingredientIdRaw === "number"
                ? ingredientIdRaw
                : typeof ingredientIdRaw === "string"
                  ? Number(ingredientIdRaw)
                  : NaN
            if (!Number.isFinite(ingredientId) || ingredientId <= 0) return null

            const quantityRaw = r.quantity
            const quantity =
              typeof quantityRaw === "number"
                ? quantityRaw
                : typeof quantityRaw === "string"
                  ? Number(quantityRaw)
                  : NaN

            const unit = typeof r.unit === "string" ? r.unit.trim() : ""

            return {
              ingredientId,
              quantity: Number.isFinite(quantity) ? quantity : null,
              unit: unit ? unit : null
            }
          })
          .filter((x): x is StepIngredient => Boolean(x))
      : []

    if (short || long || heat || hasTime || stepIngredients.length) {
      return {
        short: short || `Step ${idx + 1}`,
        long: long || null,
        heat: heat || null,
        timeMinutes: hasTime ? timeMinutes : null,
        stepIngredients
      }
    }
  }

  return {
    short: `Step ${idx + 1}`,
    long: JSON.stringify(step),
    heat: null,
    timeMinutes: null,
    stepIngredients: []
  }
}

export default function RecipeSectionsToggle({
  ingredients,
  instructions,
  initialTab = "instructions",
  onTabChange,
  footerExtra,
  onEditIngredient,
  onEditInstruction
}: RecipeSectionsToggleProps) {
  const [tab, setTab] = useState<TabKey>(initialTab)
  const [expandedInstructionIdx, setExpandedInstructionIdx] = useState<
    number | null
  >(null)

  const setTabAndNotify = (nextTab: TabKey) => {
    setTab(nextTab)
    onTabChange?.(nextTab)
  }

  const ingredientGroups = useMemo(() => {
    const byCategory = new Map<string, DisplayIngredient[]>()

    for (const ing of ingredients) {
      const category = normalizeCategory(ing.category)
      const list = byCategory.get(category)
      if (list) list.push(ing)
      else byCategory.set(category, [ing])
    }

    const categories = Array.from(byCategory.keys()).sort((a, b) => {
      const aNorm = a.trim().toLowerCase()
      const bNorm = b.trim().toLowerCase()

      const weight = (norm: string) => {
        if (norm === "other") return 2
        if (norm === "proteins" || norm.includes("protein")) return 0
        return 1
      }

      const wA = weight(aNorm)
      const wB = weight(bNorm)
      if (wA !== wB) return wA - wB
      return a.localeCompare(b)
    })

    return categories.map((category) => {
      const items = byCategory.get(category) ?? []
      const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))
      return { category, items: sorted }
    })
  }, [ingredients])

  const normalizedInstructions = useMemo(() => {
    return instructions.map((step, idx) => normalizeInstruction(step, idx))
  }, [instructions])

  const ingredientNameById = useMemo(() => {
    const m = new Map<number, string>()
    for (const ing of ingredients) m.set(ing.ingredientId, ing.name)
    return m
  }, [ingredients])

  return (
    <>
      <div className="flex flex-col gap-6 pb-24">
        {tab === "ingredients" ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Ingredients</h2>
            {ingredients.length ? (
              <div className="flex flex-col gap-4">
                {ingredientGroups.map((group) => (
                  <div key={group.category} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${categoryBadgeClasses(
                          group.category
                        )}`}
                      >
                        <Tag className="h-3 w-3 opacity-80" />
                        {group.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {group.items.length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {group.items.map((ing) => (
                        <div
                          key={ing.ingredientId}
                          className="rounded-lg border border-border bg-card p-3 text-card-foreground"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <p className="font-medium leading-tight">
                              {ing.name}
                            </p>

                            <div className="flex items-center gap-3">
                              {ing.quantity !== null &&
                              ing.quantity !== undefined &&
                              ing.unit ? (
                                <p className="tabular-nums font-medium whitespace-nowrap">
                                  {ing.quantity} {ing.unit}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  &nbsp;
                                </p>
                              )}

                              {onEditIngredient ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    onEditIngredient(ing.ingredientId)
                                  }
                                >
                                  Edit
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No ingredients.</p>
            )}
          </section>
        ) : (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Instructions</h2>
            {normalizedInstructions.length ? (
              <div className="flex flex-col gap-2">
                {normalizedInstructions.map((step, idx) => {
                  const isExpandable = Boolean(step.long)
                  const isExpanded = expandedInstructionIdx === idx

                  const toggle = () => {
                    if (!isExpandable) return
                    setExpandedInstructionIdx((prev) =>
                      prev === idx ? null : idx
                    )
                  }

                  return (
                    <div
                      key={idx}
                      className={
                        "w-full rounded-lg border border-border bg-card p-3 text-left text-card-foreground" +
                        (isExpandable
                          ? " cursor-pointer hover:bg-accent/30"
                          : "")
                      }
                    >
                      <div className="flex items-start justify-between gap-4">
                        {isExpandable ? (
                          <button
                            type="button"
                            onClick={toggle}
                            aria-expanded={isExpanded}
                            className="flex flex-1 items-start justify-between gap-4 text-left"
                          >
                            <div className="flex flex-col gap-1">
                              <p className="font-medium leading-tight">
                                {idx + 1}. {step.short}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {step.timeMinutes ? (
                                  <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5">
                                    {step.timeMinutes} min
                                  </span>
                                ) : null}
                                {step.heat ? (
                                  <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5">
                                    {step.heat}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="pt-0.5 text-muted-foreground">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </button>
                        ) : (
                          <div className="flex flex-1 flex-col gap-1">
                            <p className="font-medium leading-tight">
                              {idx + 1}. {step.short}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {step.timeMinutes ? (
                                <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5">
                                  {step.timeMinutes} min
                                </span>
                              ) : null}
                              {step.heat ? (
                                <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5">
                                  {step.heat}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        )}

                        {onEditInstruction ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => onEditInstruction(idx)}
                          >
                            Edit
                          </Button>
                        ) : null}
                      </div>

                      {isExpandable && isExpanded ? (
                        <div className="mt-3 flex flex-col gap-3">
                          <div className="text-sm leading-relaxed">
                            {step.long}
                          </div>

                          {step.stepIngredients.length ? (
                            <div className="flex flex-col gap-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                Step ingredients
                              </p>
                              <div className="flex flex-col gap-2">
                                {step.stepIngredients.map((si) => {
                                  const name =
                                    ingredientNameById.get(si.ingredientId) ??
                                    `Ingredient ${si.ingredientId}`

                                  return (
                                    <div
                                      key={si.ingredientId}
                                      className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/50 px-3 py-2"
                                    >
                                      <p className="text-sm font-medium leading-tight">
                                        {name}
                                      </p>
                                      {si.quantity !== null && si.unit ? (
                                        <p className="text-sm tabular-nums whitespace-nowrap">
                                          {si.quantity} {si.unit}
                                        </p>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">
                                          &nbsp;
                                        </p>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">No instructions.</p>
            )}
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background">
        <div className="mx-auto flex max-w-3xl gap-3 p-4">
          <Button
            type="button"
            className="flex-1"
            variant={tab === "instructions" ? "default" : "secondary"}
            onClick={() => setTabAndNotify("instructions")}
          >
            Instructions
          </Button>
          <Button
            type="button"
            className="flex-1"
            variant={tab === "ingredients" ? "default" : "secondary"}
            onClick={() => setTabAndNotify("ingredients")}
          >
            Ingredients
          </Button>
          {footerExtra ? <div className="shrink-0">{footerExtra}</div> : null}
        </div>
      </div>
    </>
  )
}
