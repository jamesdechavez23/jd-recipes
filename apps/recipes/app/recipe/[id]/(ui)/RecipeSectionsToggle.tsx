"use client"

import React from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { type CSSProperties, useEffect, useMemo, useState } from "react"
import { Button } from "@repo/ui/shadcn/button"
import { ChevronDown, ChevronUp, GripVertical, Tag } from "lucide-react"

export type TabKey = "ingredients" | "instructions"

export type DisplayIngredient = {
  ingredientId: number
  name: string
  category?: string | null
  quantity?: number | null
  quantityDisplay?: string | null
  unit?: string | null
}

type StepIngredient = {
  ingredientId: number
  quantity: number | null
  quantityDisplay?: string | null
  unit: string | null
}

export interface RecipeSectionsToggleProps {
  ingredients: DisplayIngredient[]
  instructions: unknown[]
  initialTab?: TabKey
  activeTab?: TabKey
  onTabChange?: (tab: TabKey) => void
  footerExtra?: React.ReactNode
  ingredientsTabLabel?: React.ReactNode
  instructionsTabLabel?: React.ReactNode
  ingredientsHeaderExtra?: React.ReactNode
  instructionsHeaderExtra?: React.ReactNode
  onEditIngredient?: (ingredientId: number) => void
  onEditInstruction?: (instructionIdx: number) => void
  onDeleteIngredient?: (ingredientId: number) => void
  onDeleteInstruction?: (instructionIdx: number) => void
  onReorderInstruction?: (fromIndex: number, toIndex: number) => void
}

function normalizeCategory(category: string | null | undefined): string {
  const c = typeof category === "string" ? category.trim() : ""
  return c ? c : "Other"
}

function categoryBadgeClasses(_category: string): string {
  return "bg-primary text-primary-foreground"
}

type NormalizedInstruction = {
  id: string
  short: string
  long: string | null
  heat: string | null
  timeMinutes: number | null
  stepIngredients: StepIngredient[]
}

function getInstructionSortableId(step: unknown, idx: number): string {
  if (step && typeof step === "object") {
    const anyStep = step as Record<string, unknown>
    const rawId = anyStep.id

    if (typeof rawId === "number" && Number.isFinite(rawId)) {
      return `instruction-${rawId}`
    }

    if (typeof rawId === "string" && rawId.trim()) {
      return `instruction-${rawId.trim()}`
    }
  }

  return `instruction-index-${idx}`
}

function normalizeInstruction(
  step: unknown,
  idx: number
): NormalizedInstruction {
  if (typeof step === "string") {
    return {
      id: getInstructionSortableId(step, idx),
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
            const quantityDisplayRaw = r.quantity_display ?? r.quantityDisplay
            const quantityDisplay =
              typeof quantityDisplayRaw === "string"
                ? quantityDisplayRaw.trim()
                : ""

            return {
              ingredientId,
              quantity: Number.isFinite(quantity) ? quantity : null,
              quantityDisplay: quantityDisplay || null,
              unit: unit ? unit : null
            }
          })
          .filter((x): x is StepIngredient => Boolean(x))
      : []

    if (short || long || heat || hasTime || stepIngredients.length) {
      return {
        id: getInstructionSortableId(step, idx),
        short: short || `Step ${idx + 1}`,
        long: long || null,
        heat: heat || null,
        timeMinutes: hasTime ? timeMinutes : null,
        stepIngredients
      }
    }
  }

  return {
    id: getInstructionSortableId(step, idx),
    short: `Step ${idx + 1}`,
    long: JSON.stringify(step),
    heat: null,
    timeMinutes: null,
    stepIngredients: []
  }
}

type InstructionRowProps = {
  instructionId: string
  idx: number
  step: NormalizedInstruction
  isExpanded: boolean
  isExpandable: boolean
  onToggle: () => void
  ingredientNameById: Map<number, string>
  onEditInstruction?: (instructionIdx: number) => void
  onDeleteInstruction?: (instructionIdx: number) => void
  isSortable: boolean
  isDropTarget: boolean
  isAnotherRowDragging: boolean
}

function InstructionRow({
  instructionId,
  idx,
  step,
  isExpanded,
  isExpandable,
  onToggle,
  ingredientNameById,
  onEditInstruction,
  onDeleteInstruction,
  isSortable,
  isDropTarget,
  isAnotherRowDragging
}: InstructionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: instructionId, disabled: !isSortable })

  const style: CSSProperties | undefined = isSortable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 10 : undefined,
        position: isDragging ? "relative" : undefined,
        touchAction: isSortable ? "none" : undefined
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        "w-full rounded-lg border border-border bg-card p-3 text-left text-card-foreground transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out" +
        (isExpandable ? " hover:bg-accent/30" : "") +
        (isDragging
          ? " scale-[1.01] border-primary/40 bg-accent/20 shadow-xl"
          : "") +
        (isAnotherRowDragging ? " scale-[0.992] opacity-95" : "") +
        (isDropTarget && !isDragging
          ? " border-dashed border-primary/50 bg-accent/10"
          : "")
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 items-start gap-3">
          {isSortable ? (
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={`Reorder step ${idx + 1}`}
              className="mt-0.5 inline-flex h-10 w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-background active:cursor-grabbing md:h-8 md:w-8"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : null}

          {isExpandable ? (
            <button
              type="button"
              onClick={onToggle}
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
        </div>

        {onEditInstruction || onDeleteInstruction ? (
          <div className="flex items-center gap-2">
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
            {onDeleteInstruction ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onDeleteInstruction(idx)}
              >
                Delete
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isExpandable && isExpanded ? (
        <div className="mt-3 flex flex-col gap-3">
          <div className="text-sm leading-relaxed">{step.long}</div>

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
                          {si.quantityDisplay || si.quantity} {si.unit}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">&nbsp;</p>
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
}

export default function RecipeSectionsToggle({
  ingredients,
  instructions,
  initialTab = "instructions",
  activeTab,
  onTabChange,
  footerExtra,
  ingredientsTabLabel,
  instructionsTabLabel,
  ingredientsHeaderExtra,
  instructionsHeaderExtra,
  onEditIngredient,
  onEditInstruction,
  onDeleteIngredient,
  onDeleteInstruction,
  onReorderInstruction
}: RecipeSectionsToggleProps) {
  const [tab, setTab] = useState<TabKey>(initialTab)
  const [expandedInstructionIdx, setExpandedInstructionIdx] = useState<
    number | null
  >(null)
  const [activeInstructionId, setActiveInstructionId] = useState<string | null>(
    null
  )
  const [overInstructionId, setOverInstructionId] = useState<string | null>(
    null
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const setTabAndNotify = (nextTab: TabKey) => {
    setTab(nextTab)
    onTabChange?.(nextTab)
  }

  useEffect(() => {
    if (activeTab) setTab(activeTab)
  }, [activeTab])

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

  const instructionIds = useMemo(
    () => normalizedInstructions.map((step) => step.id),
    [normalizedInstructions]
  )

  const ingredientNameById = useMemo(() => {
    const m = new Map<number, string>()
    for (const ing of ingredients) m.set(ing.ingredientId, ing.name)
    return m
  }, [ingredients])

  const handleInstructionDragEnd = (event: DragEndEvent) => {
    if (!onReorderInstruction) return

    const { active, over } = event
    setActiveInstructionId(null)
    setOverInstructionId(null)
    if (!over || active.id === over.id) return

    const fromIndex = instructionIds.findIndex((id) => id === active.id)
    const toIndex = instructionIds.findIndex((id) => id === over.id)

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return

    setExpandedInstructionIdx(null)
    onReorderInstruction(fromIndex, toIndex)
  }

  const handleInstructionDragStart = (event: DragStartEvent) => {
    if (!onReorderInstruction) return
    setActiveInstructionId(String(event.active.id))
    setOverInstructionId(String(event.active.id))
  }

  const handleInstructionDragOver = (event: DragOverEvent) => {
    if (!onReorderInstruction) return
    setOverInstructionId(event.over ? String(event.over.id) : null)
  }

  const handleInstructionDragCancel = () => {
    setActiveInstructionId(null)
    setOverInstructionId(null)
  }

  const isDraggingInstruction = Boolean(activeInstructionId)

  return (
    <>
      <div className="flex flex-col gap-6">
        {tab === "ingredients" ? (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Ingredients</h2>
              {ingredientsHeaderExtra ? (
                <div className="flex items-center gap-2">
                  {ingredientsHeaderExtra}
                </div>
              ) : null}
            </div>
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
                                  {ing.quantityDisplay || ing.quantity}{" "}
                                  {ing.unit}
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

                              {onDeleteIngredient ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    onDeleteIngredient(ing.ingredientId)
                                  }
                                >
                                  Delete
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
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Instructions</h2>
              {instructionsHeaderExtra ? (
                <div className="flex items-center gap-2">
                  {instructionsHeaderExtra}
                </div>
              ) : null}
            </div>
            {onReorderInstruction ? (
              <p className="text-sm text-muted-foreground">
                Drag to reorder steps.
              </p>
            ) : null}
            {normalizedInstructions.length ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleInstructionDragStart}
                onDragOver={handleInstructionDragOver}
                onDragCancel={handleInstructionDragCancel}
                onDragEnd={handleInstructionDragEnd}
              >
                <SortableContext
                  items={instructionIds}
                  strategy={verticalListSortingStrategy}
                >
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
                        <InstructionRow
                          key={step.id}
                          instructionId={step.id}
                          idx={idx}
                          step={step}
                          isExpanded={isExpanded}
                          isExpandable={isExpandable}
                          onToggle={toggle}
                          ingredientNameById={ingredientNameById}
                          onEditInstruction={onEditInstruction}
                          onDeleteInstruction={onDeleteInstruction}
                          isSortable={Boolean(onReorderInstruction)}
                          isDropTarget={
                            Boolean(onReorderInstruction) &&
                            overInstructionId === step.id &&
                            activeInstructionId !== step.id
                          }
                          isAnotherRowDragging={
                            isDraggingInstruction &&
                            activeInstructionId !== step.id
                          }
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-muted-foreground">No instructions.</p>
            )}
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border/45 bg-background/92 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-3 p-4 md:flex-nowrap">
          <Button
            type="button"
            className="min-w-0 flex-1 basis-[calc(50%-0.375rem)] md:basis-0"
            variant={tab === "instructions" ? "default" : "secondary"}
            onClick={() => setTabAndNotify("instructions")}
          >
            {instructionsTabLabel ?? "Instructions"}
          </Button>
          <Button
            type="button"
            className="min-w-0 flex-1 basis-[calc(50%-0.375rem)] md:basis-0"
            variant={tab === "ingredients" ? "default" : "secondary"}
            onClick={() => setTabAndNotify("ingredients")}
          >
            {ingredientsTabLabel ?? "Ingredients"}
          </Button>
          {footerExtra ? <>{footerExtra}</> : null}
        </div>
      </div>
    </>
  )
}
