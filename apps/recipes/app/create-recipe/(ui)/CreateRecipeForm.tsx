"use client"

import { useActionState } from "react"
import { useMemo, useState } from "react"
import { Button } from "@repo/ui/shadcn/button"
import type { CreateRecipeActionState } from "../(actions)/createRecipeAction"
import type { IngredientListItem } from "../(actions)/getIngredients"

type SelectedIngredient = {
  ingredientId: number
  quantity: string
  unit: string
}

interface CreateRecipeFormProps {
  createRecipeAction: (
    prevState: CreateRecipeActionState,
    formData: FormData
  ) => Promise<CreateRecipeActionState>

  ingredients: IngredientListItem[]
  ingredientsError: string | null
}

export default function CreateRecipeForm({
  createRecipeAction,
  ingredients,
  ingredientsError
}: CreateRecipeFormProps) {
  const [state, formAction, isPending] = useActionState<
    CreateRecipeActionState,
    FormData
  >(createRecipeAction, { status: "idle" })

  const [ingredientIdToAdd, setIngredientIdToAdd] = useState<string>(
    ingredients[0]?.id ? String(ingredients[0].id) : ""
  )
  const [selectedIngredients, setSelectedIngredients] = useState<
    SelectedIngredient[]
  >([])

  const ingredientById = useMemo(() => {
    const byId = new Map<number, IngredientListItem>()
    for (const ing of ingredients) byId.set(ing.id, ing)
    return byId
  }, [ingredients])

  const selectedIdsSet = useMemo(() => {
    return new Set(selectedIngredients.map((x) => x.ingredientId))
  }, [selectedIngredients])

  const ingredientsJson = useMemo(() => {
    return JSON.stringify(
      selectedIngredients.map((x) => ({
        ingredientId: x.ingredientId,
        quantity: x.quantity,
        unit: x.unit
      }))
    )
  }, [selectedIngredients])

  function addSelectedIngredient() {
    const parsed = Number.parseInt(ingredientIdToAdd, 10)
    if (!Number.isInteger(parsed)) return
    if (selectedIdsSet.has(parsed)) return

    const ing = ingredientById.get(parsed)

    setSelectedIngredients((prev) => [
      ...prev,
      {
        ingredientId: parsed,
        quantity: "",
        unit: ing?.unit ? String(ing.unit) : ""
      }
    ])
  }

  function removeSelectedIngredient(ingredientId: number) {
    setSelectedIngredients((prev) =>
      prev.filter((x) => x.ingredientId !== ingredientId)
    )
  }

  function updateSelectedIngredient(
    ingredientId: number,
    patch: Partial<Pick<SelectedIngredient, "quantity" | "unit">>
  ) {
    setSelectedIngredients((prev) =>
      prev.map((x) =>
        x.ingredientId === ingredientId
          ? {
              ...x,
              ...patch
            }
          : x
      )
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-xl">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Name</span>
        <input
          name="name"
          required
          className="border rounded px-3 py-2"
          placeholder="Beef and Broccoli"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Description</span>
        <textarea
          name="description"
          className="border rounded px-3 py-2"
          placeholder="Optional"
          rows={3}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Instructions</span>
        <textarea
          name="instructions"
          className="border rounded px-3 py-2"
          placeholder={
            "One step per line\nExample:\nBoil water\nSalt water\nCook pasta"
          }
          rows={8}
        />
        <span className="text-xs text-muted-foreground">
          One step per line. Blank lines are ignored.
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Ingredients</span>

        {ingredientsError ? (
          <p className="text-sm text-red-600">{ingredientsError}</p>
        ) : null}

        <div className="flex items-center gap-2">
          <select
            className="border rounded px-3 py-2 flex-1 bg-background text-foreground"
            value={ingredientIdToAdd}
            onChange={(e) => setIngredientIdToAdd(e.target.value)}
            disabled={ingredients.length === 0}
          >
            {ingredients.length === 0 ? (
              <option className="bg-background text-foreground" value="">
                No ingredients available
              </option>
            ) : (
              ingredients.map((ing) => (
                <option
                  key={ing.id}
                  className="bg-background text-foreground"
                  value={String(ing.id)}
                >
                  {ing.name}
                </option>
              ))
            )}
          </select>

          <Button
            type="button"
            onClick={addSelectedIngredient}
            disabled={ingredients.length === 0}
          >
            Add
          </Button>
        </div>

        {selectedIngredients.length > 0 ? (
          <div className="flex flex-col gap-2">
            {selectedIngredients.map((ing) => (
              <div
                key={ing.ingredientId}
                className="flex flex-col gap-2 border rounded px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">
                    {ingredientById.get(ing.ingredientId)?.name ??
                      `Ingredient #${ing.ingredientId}`}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => removeSelectedIngredient(ing.ingredientId)}
                  >
                    Remove
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    className="border rounded px-3 py-2 w-28"
                    placeholder="Qty"
                    value={ing.quantity}
                    onChange={(e) =>
                      updateSelectedIngredient(ing.ingredientId, {
                        quantity: e.target.value
                      })
                    }
                  />
                  <input
                    className="border rounded px-3 py-2 flex-1"
                    placeholder="Unit (e.g. tbsp)"
                    value={ing.unit}
                    onChange={(e) =>
                      updateSelectedIngredient(ing.ingredientId, {
                        unit: e.target.value
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No ingredients added yet.
          </p>
        )}

        <input type="hidden" name="ingredientsJson" value={ingredientsJson} />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create"}
        </Button>
      </div>

      {state.status === "error" ? (
        <p className="text-sm text-red-600">{state.message}</p>
      ) : null}

      {state.status === "success" ? (
        <pre className="text-sm border rounded p-3 whitespace-pre-wrap wrap-break-word">
          {JSON.stringify(state.recipe, null, 2)}
        </pre>
      ) : null}
    </form>
  )
}
