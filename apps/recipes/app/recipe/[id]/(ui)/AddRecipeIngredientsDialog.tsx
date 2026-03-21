"use client"

import Link from "next/link"
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useState
} from "react"

import { Alert, AlertDescription } from "@repo/ui/shadcn/alert"
import { Button } from "@repo/ui/shadcn/button"
import { Input } from "@repo/ui/shadcn/input"
import { Label } from "@repo/ui/shadcn/label"

import type { AddRecipeIngredientsToShoppingListActionState } from "../../shopping-list/(ui)/actionTypes"
import type { RecipeIngredient } from "@recipes/server/recipes/getRecipeById"

type IngredientDraft = {
  ingredientId: number
  name: string
  selected: boolean
  quantityInput: string
  unit: string
}

type AddRecipeIngredientsDialogProps = {
  recipeName: string
  shoppingListHref: string
  ingredients: RecipeIngredient[]
  onActionStateChange?: (
    state: AddRecipeIngredientsToShoppingListActionState
  ) => void
  addToShoppingListAction: (
    prevState: AddRecipeIngredientsToShoppingListActionState,
    formData: FormData
  ) => Promise<AddRecipeIngredientsToShoppingListActionState>
}

function toDefaultQuantityInput(ingredient: RecipeIngredient) {
  if (ingredient.quantityDisplay) return ingredient.quantityDisplay
  if (ingredient.quantity !== null && ingredient.quantity !== undefined) {
    return String(ingredient.quantity)
  }

  return ""
}

function createDefaultDrafts(
  ingredients: RecipeIngredient[]
): IngredientDraft[] {
  return ingredients.map((ingredient) => ({
    ingredientId: ingredient.ingredientId,
    name: ingredient.name,
    selected: true,
    quantityInput: toDefaultQuantityInput(ingredient),
    unit: ingredient.unit ?? ""
  }))
}

export default function AddRecipeIngredientsDialog({
  recipeName,
  shoppingListHref,
  ingredients,
  onActionStateChange,
  addToShoppingListAction
}: AddRecipeIngredientsDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<IngredientDraft[]>(() =>
    createDefaultDrafts(ingredients)
  )
  const [shoppingListState, formAction, isPending] = useActionState(
    addToShoppingListAction,
    { status: "idle" }
  )

  const selectedCount = useMemo(
    () => drafts.filter((ingredient) => ingredient.selected).length,
    [drafts]
  )

  function resetDrafts() {
    setDrafts(createDefaultDrafts(ingredients))
    setClientError(null)
  }

  useEffect(() => {
    setDrafts(createDefaultDrafts(ingredients))
  }, [ingredients])

  useEffect(() => {
    onActionStateChange?.(shoppingListState)
  }, [onActionStateChange, shoppingListState])

  useEffect(() => {
    if (shoppingListState.status !== "success") return

    setIsOpen(false)
    resetDrafts()
  }, [shoppingListState.status])

  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isOpen])

  function updateDraft(
    ingredientId: number,
    updates: Partial<
      Pick<IngredientDraft, "selected" | "quantityInput" | "unit">
    >
  ) {
    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.ingredientId === ingredientId ? { ...draft, ...updates } : draft
      )
    )
  }

  function submitSelectedIngredients() {
    const selectedIngredients = drafts
      .filter((draft) => draft.selected)
      .map((draft) => ({
        ingredientId: draft.ingredientId,
        quantityInput: draft.quantityInput.trim(),
        unit: draft.unit.trim()
      }))

    if (selectedIngredients.length === 0) {
      setClientError(
        "Select at least one ingredient to add to the shopping list."
      )
      return
    }

    const nextFormData = new FormData()
    nextFormData.set("ingredientsJson", JSON.stringify(selectedIngredients))
    setClientError(null)

    startTransition(() => {
      formAction(nextFormData)
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          resetDrafts()
          setIsOpen(true)
        }}
      >
        Add ingredients to shopping list
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-4xl rounded-xl border border-border bg-background shadow-lg">
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">Add ingredients</h2>
                <p className="text-sm text-muted-foreground">
                  Choose which ingredients from {recipeName} to add to your
                  shopping list.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>

            <div className="flex flex-col gap-4 px-6 py-5">
              {clientError ? (
                <Alert variant="destructive">
                  <AlertDescription>{clientError}</AlertDescription>
                </Alert>
              ) : null}

              {shoppingListState.status === "error" ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {shoppingListState.message}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {selectedCount} of {drafts.length} selected
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDrafts((currentDrafts) =>
                        currentDrafts.map((draft) => ({
                          ...draft,
                          selected: true
                        }))
                      )
                    }}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDrafts((currentDrafts) =>
                        currentDrafts.map((draft) => ({
                          ...draft,
                          selected: false
                        }))
                      )
                    }}
                  >
                    Deselect all
                  </Button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto pr-1">
                <div className="flex flex-col gap-3">
                  {drafts.map((draft) => (
                    <div
                      key={draft.ingredientId}
                      className="rounded-lg border border-border/60 bg-background/70 p-4"
                    >
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.7fr)] md:items-end">
                        <div className="flex flex-col gap-3">
                          <Label className="items-start gap-3">
                            <input
                              type="checkbox"
                              checked={draft.selected}
                              onChange={(event) => {
                                updateDraft(draft.ingredientId, {
                                  selected: event.target.checked
                                })
                              }}
                            />
                            <span className="flex flex-col gap-1">
                              <span className="font-medium">{draft.name}</span>
                              <span className="text-xs text-muted-foreground">
                                Add this ingredient with an optional quantity
                                override.
                              </span>
                            </span>
                          </Label>
                        </div>

                        <div className="space-y-1">
                          <Label
                            htmlFor={`shopping-ingredient-quantity-${draft.ingredientId}`}
                          >
                            Quantity
                          </Label>
                          <Input
                            id={`shopping-ingredient-quantity-${draft.ingredientId}`}
                            value={draft.quantityInput}
                            disabled={!draft.selected}
                            onChange={(event) => {
                              updateDraft(draft.ingredientId, {
                                quantityInput: event.target.value
                              })
                            }}
                            placeholder="1, 0.5, 1/2, to taste"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label
                            htmlFor={`shopping-ingredient-unit-${draft.ingredientId}`}
                          >
                            Unit
                          </Label>
                          <Input
                            id={`shopping-ingredient-unit-${draft.ingredientId}`}
                            value={draft.unit}
                            disabled={!draft.selected}
                            onChange={(event) => {
                              updateDraft(draft.ingredientId, {
                                unit: event.target.value
                              })
                            }}
                            placeholder="cups, tbsp, cloves"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitSelectedIngredients}
                disabled={isPending}
              >
                {isPending ? "Adding…" : "Add selected ingredients"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
