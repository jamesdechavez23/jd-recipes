import { Alert, AlertDescription } from "@repo/ui/shadcn/alert"
import { Button } from "@repo/ui/shadcn/button"
import { Input } from "@repo/ui/shadcn/input"
import { Label } from "@repo/ui/shadcn/label"
import type { CreateIngredientActionState } from "./actionTypes"
import BottomDockedSheet from "./BottomDockedSheet"

interface CreateIngredientSheetProps {
  open: boolean
  createIngredientState: CreateIngredientActionState
  isCreatingIngredient: boolean
  createIngredientNameInputRef: React.RefObject<HTMLInputElement | null>
  newIngredientName: string
  newIngredientCategory: string
  newIngredientUnit: string
  filteredCategoryOptions: string[]
  isCategorySuggestionsOpen: boolean
  highlightedCategoryOption: string | null
  onNameChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onCategoryKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  onCategoryFocus: () => void
  onCategoryBlur: () => void
  onUnitChange: (value: string) => void
  onHighlightCategory: (value: string) => void
  onSelectCategory: (value: string) => void
  onSetCategorySuggestionsOpen: (open: boolean) => void
  onSubmit: () => void
  onClose: () => void
}

export default function CreateIngredientSheet({
  open,
  createIngredientState,
  isCreatingIngredient,
  createIngredientNameInputRef,
  newIngredientName,
  newIngredientCategory,
  newIngredientUnit,
  filteredCategoryOptions,
  isCategorySuggestionsOpen,
  highlightedCategoryOption,
  onNameChange,
  onCategoryChange,
  onCategoryKeyDown,
  onCategoryFocus,
  onCategoryBlur,
  onUnitChange,
  onHighlightCategory,
  onSelectCategory,
  onSetCategorySuggestionsOpen,
  onSubmit,
  onClose
}: CreateIngredientSheetProps) {
  if (!open) return null

  return (
    <BottomDockedSheet
      onClose={onClose}
      overlayZIndexClassName="z-50"
      sheetZIndexClassName="z-50"
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Create ingredient</p>

        {createIngredientState.status === "error" ? (
          <Alert variant="destructive">
            <AlertDescription>{createIngredientState.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-1">
          <Label
            htmlFor="create-ingredient-name"
            className="text-xs text-muted-foreground"
          >
            Name
          </Label>
          <Input
            id="create-ingredient-name"
            ref={createIngredientNameInputRef}
            value={newIngredientName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Salmon"
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label
            htmlFor="create-ingredient-category"
            className="text-xs text-muted-foreground"
          >
            Category (optional)
          </Label>
          <Input
            id="create-ingredient-category"
            value={newIngredientCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            onKeyDown={onCategoryKeyDown}
            placeholder="e.g. Protein"
            autoComplete="off"
            onFocus={onCategoryFocus}
            onBlur={onCategoryBlur}
          />

          {isCategorySuggestionsOpen && filteredCategoryOptions.length ? (
            <div className="max-h-40 overflow-auto rounded-md border border-border bg-background">
              <div className="p-2">
                {filteredCategoryOptions.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={
                      "w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted " +
                      (highlightedCategoryOption === category ? "bg-muted" : "")
                    }
                    onMouseEnter={() => onHighlightCategory(category)}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      onSelectCategory(category)
                      onSetCategorySuggestionsOpen(false)
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <Label
            htmlFor="create-ingredient-unit"
            className="text-xs text-muted-foreground"
          >
            Default unit (optional)
          </Label>
          <Input
            id="create-ingredient-unit"
            value={newIngredientUnit}
            onChange={(e) => onUnitChange(e.target.value)}
            placeholder="e.g. tbsp"
            autoComplete="off"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            disabled={isCreatingIngredient || !newIngredientName.trim()}
            onClick={onSubmit}
          >
            {isCreatingIngredient ? "Creating…" : "Create"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </BottomDockedSheet>
  )
}
