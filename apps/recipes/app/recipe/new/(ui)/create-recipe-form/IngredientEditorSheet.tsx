import { Alert, AlertDescription } from "@repo/ui/shadcn/alert"
import { Button } from "@repo/ui/shadcn/button"
import { Input } from "@repo/ui/shadcn/input"
import { Label } from "@repo/ui/shadcn/label"
import type { IngredientListItem } from "@recipes/server/ingredients/getIngredients"
import BottomDockedSheet from "./BottomDockedSheet"

interface IngredientGroup {
  category: string
  items: IngredientListItem[]
}

interface IngredientEditorSheetProps {
  open: boolean
  canCreateIngredients: boolean
  editingIngredientId: number | null
  ingredientsError: string | null
  availableIngredients: IngredientListItem[]
  groupedIngredientMatches: IngredientGroup[]
  ingredientPickerInputRef: React.RefObject<HTMLInputElement | null>
  ingredientPickerQuery: string
  ingredientDraftSourceId: string
  ingredientDraftError: string
  ingredientDraftQuantity: string
  ingredientDraftUnit: string
  highlightedIngredientId: number | null
  isIngredientPickerOpen: boolean
  onIngredientQueryChange: (value: string) => void
  onIngredientPickerKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => void
  onIngredientPickerFocus: () => void
  onIngredientPickerBlur: () => void
  onSelectDraftIngredientSource: (sourceId: string) => void
  onHighlightIngredient: (ingredientId: number) => void
  onSetIngredientPickerOpen: (open: boolean) => void
  onQuantityChange: (value: string) => void
  onUnitChange: (value: string) => void
  onSubmit: () => void
  onOpenCreateIngredient: () => void
  onClose: () => void
}

export default function IngredientEditorSheet({
  open,
  canCreateIngredients,
  editingIngredientId,
  ingredientsError,
  availableIngredients,
  groupedIngredientMatches,
  ingredientPickerInputRef,
  ingredientPickerQuery,
  ingredientDraftSourceId,
  ingredientDraftError,
  ingredientDraftQuantity,
  ingredientDraftUnit,
  highlightedIngredientId,
  isIngredientPickerOpen,
  onIngredientQueryChange,
  onIngredientPickerKeyDown,
  onIngredientPickerFocus,
  onIngredientPickerBlur,
  onSelectDraftIngredientSource,
  onHighlightIngredient,
  onSetIngredientPickerOpen,
  onQuantityChange,
  onUnitChange,
  onSubmit,
  onOpenCreateIngredient,
  onClose
}: IngredientEditorSheetProps) {
  if (!open) return null

  return (
    <BottomDockedSheet onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">
          {editingIngredientId !== null ? "Edit ingredient" : "Add ingredient"}
        </p>

        {ingredientsError ? (
          <Alert variant="destructive">
            <AlertDescription>{ingredientsError}</AlertDescription>
          </Alert>
        ) : null}

        {availableIngredients.length ? (
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="ingredient-picker"
              className="text-xs text-muted-foreground"
            >
              Ingredient
            </Label>
            <Input
              id="ingredient-picker"
              ref={ingredientPickerInputRef}
              value={ingredientPickerQuery}
              onChange={(e) => onIngredientQueryChange(e.target.value)}
              onKeyDown={onIngredientPickerKeyDown}
              onFocus={onIngredientPickerFocus}
              onBlur={onIngredientPickerBlur}
              placeholder="Search ingredients…"
              autoComplete="off"
            />

            {isIngredientPickerOpen ? (
              <div className="max-h-56 overflow-auto rounded-md border border-border bg-background">
                {groupedIngredientMatches.length ? (
                  <div className="p-2">
                    {groupedIngredientMatches.map((group) => (
                      <div key={group.category} className="mb-2">
                        <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                          {group.category}
                        </p>
                        <div className="flex flex-col">
                          {group.items.map((ing) => (
                            <button
                              key={ing.id}
                              type="button"
                              className={
                                "rounded-md px-2 py-2 text-left text-sm hover:bg-muted " +
                                (highlightedIngredientId === ing.id
                                  ? "bg-muted"
                                  : "")
                              }
                              onMouseEnter={() => onHighlightIngredient(ing.id)}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                onSelectDraftIngredientSource(String(ing.id))
                                onSetIngredientPickerOpen(false)
                              }}
                            >
                              {ing.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-3 text-sm text-muted-foreground">
                    No matches.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {ingredientPickerQuery.trim() && !ingredientDraftSourceId ? (
          <p className="text-xs text-muted-foreground">
            Select an ingredient from the list before adding it.
          </p>
        ) : null}

        {ingredientDraftError ? (
          <Alert variant="destructive">
            <AlertDescription>{ingredientDraftError}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            inputMode="decimal"
            value={ingredientDraftQuantity}
            onChange={(e) => onQuantityChange(e.target.value)}
            className="w-28"
            placeholder="Qty or 1/2"
          />
          <Input
            value={ingredientDraftUnit}
            onChange={(e) => onUnitChange(e.target.value)}
            className="flex-1"
            placeholder="Unit (e.g. tbsp)"
            autoComplete="off"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!availableIngredients.length && !ingredientDraftSourceId}
          >
            {editingIngredientId !== null ? "Save" : "Add"}
          </Button>
          {canCreateIngredients ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onOpenCreateIngredient}
            >
              Create new ingredient
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </BottomDockedSheet>
  )
}
