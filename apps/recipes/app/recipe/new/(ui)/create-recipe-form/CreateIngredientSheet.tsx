import { Button } from "@repo/ui/shadcn/button"
import type { CreateIngredientActionState } from "../../(actions)/createIngredientAction"

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
    <>
      <div className="fixed inset-0 z-50 bg-background/80" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-24 z-50">
        <div className="mx-auto w-full max-w-3xl px-4">
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Create ingredient</p>

              {createIngredientState.status === "error" ? (
                <p className="text-sm text-red-600">
                  {createIngredientState.message}
                </p>
              ) : null}

              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Name</span>
                <input
                  ref={createIngredientNameInputRef}
                  value={newIngredientName}
                  onChange={(e) => onNameChange(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="e.g. Salmon"
                  autoComplete="off"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Category (optional)
                </span>
                <input
                  value={newIngredientCategory}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  onKeyDown={onCategoryKeyDown}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
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
                            (highlightedCategoryOption === category
                              ? "bg-muted"
                              : "")
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
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Default unit (optional)
                </span>
                <input
                  value={newIngredientUnit}
                  onChange={(e) => onUnitChange(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="e.g. tbsp"
                  autoComplete="off"
                />
              </label>

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
          </div>
        </div>
      </div>
    </>
  )
}
