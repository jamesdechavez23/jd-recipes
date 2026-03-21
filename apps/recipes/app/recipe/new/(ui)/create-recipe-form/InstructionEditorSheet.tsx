import { Button } from "@repo/ui/shadcn/button"
import { Input } from "@repo/ui/shadcn/input"
import { Label } from "@repo/ui/shadcn/label"
import { Textarea } from "@repo/ui/shadcn/textarea"
import type { BuilderIngredient, InstructionDraftStepIngredient } from "./types"
import BottomDockedSheet from "./BottomDockedSheet"

interface InstructionEditorSheetProps {
  open: boolean
  editingInstructionIdx: number | null
  instructionShortInputRef: React.RefObject<HTMLInputElement | null>
  instructionDraftShort: string
  instructionDraftLong: string
  instructionDraftHeat: string
  instructionDraftTimeMinutes: string
  instructionDraftIngredientIdToAdd: string
  instructionDraftStepIngredients: InstructionDraftStepIngredient[]
  builderIngredients: BuilderIngredient[]
  onShortChange: (value: string) => void
  onLongChange: (value: string) => void
  onHeatChange: (value: string) => void
  onTimeMinutesChange: (value: string) => void
  onIngredientToAddChange: (value: string) => void
  onAddStepIngredient: () => void
  onRemoveStepIngredient: (ingredientId: number) => void
  onUpdateStepIngredient: (
    ingredientId: number,
    patch: Partial<{ quantity: string; unit: string }>
  ) => void
  onSubmit: () => void
  onClose: () => void
}

export default function InstructionEditorSheet({
  open,
  editingInstructionIdx,
  instructionShortInputRef,
  instructionDraftShort,
  instructionDraftLong,
  instructionDraftHeat,
  instructionDraftTimeMinutes,
  instructionDraftIngredientIdToAdd,
  instructionDraftStepIngredients,
  builderIngredients,
  onShortChange,
  onLongChange,
  onHeatChange,
  onTimeMinutesChange,
  onIngredientToAddChange,
  onAddStepIngredient,
  onRemoveStepIngredient,
  onUpdateStepIngredient,
  onSubmit,
  onClose
}: InstructionEditorSheetProps) {
  if (!open) return null

  return (
    <BottomDockedSheet onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">
          {editingInstructionIdx !== null
            ? "Edit instruction"
            : "New instruction"}
        </p>
        <div className="flex flex-col gap-1">
          <Label htmlFor="instruction-short">Short step</Label>
          <Input
            id="instruction-short"
            ref={instructionShortInputRef}
            value={instructionDraftShort}
            onChange={(e) => onShortChange(e.target.value)}
            placeholder="Short step (e.g. Cook salmon)"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="instruction-details">Details</Label>
          <Textarea
            id="instruction-details"
            value={instructionDraftLong}
            onChange={(e) => onLongChange(e.target.value)}
            placeholder="Details (optional)"
            rows={4}
          />
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={instructionDraftHeat}
            onChange={(e) => onHeatChange(e.target.value)}
            className="flex-1"
            placeholder="Heat (optional) e.g. medium"
            autoComplete="off"
          />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={instructionDraftTimeMinutes}
            onChange={(e) => onTimeMinutesChange(e.target.value)}
            className="w-28"
            placeholder="Min"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Step ingredients
          </p>

          {builderIngredients.length ? (
            <div className="flex items-center gap-2">
              <select
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-foreground"
                value={instructionDraftIngredientIdToAdd}
                onChange={(e) => onIngredientToAddChange(e.target.value)}
              >
                <option value="">Select ingredient…</option>
                {builderIngredients.map((ing) => (
                  <option
                    key={ing.ingredientId}
                    value={String(ing.ingredientId)}
                  >
                    {ing.name}
                    {ing.quantity !== null && ing.quantity !== undefined
                      ? ing.unit
                        ? ` — ${ing.quantityDisplay ?? ing.quantity} ${ing.unit} available`
                        : ` — ${ing.quantityDisplay ?? ing.quantity} available`
                      : ing.unit
                        ? ` — ${ing.unit} available`
                        : ""}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="secondary"
                onClick={onAddStepIngredient}
                disabled={!instructionDraftIngredientIdToAdd}
              >
                Add
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add ingredients to the recipe first to attach them to a step.
            </p>
          )}

          {instructionDraftStepIngredients.length ? (
            <div className="flex flex-col gap-2">
              {instructionDraftStepIngredients.map((si) => {
                const baseIngredient = builderIngredients.find(
                  (x) => x.ingredientId === si.ingredientId
                )
                const ingName =
                  baseIngredient?.name ?? `Ingredient ${si.ingredientId}`

                const availableText =
                  baseIngredient &&
                  (baseIngredient.quantity !== null &&
                  baseIngredient.quantity !== undefined
                    ? baseIngredient.unit
                      ? `${baseIngredient.quantityDisplay ?? baseIngredient.quantity} ${baseIngredient.unit}`
                      : String(
                          baseIngredient.quantityDisplay ??
                            baseIngredient.quantity
                        )
                    : baseIngredient.unit
                      ? String(baseIngredient.unit)
                      : "")

                return (
                  <div
                    key={si.ingredientId}
                    className="flex flex-col gap-2 rounded-md border border-border bg-background/50 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium leading-tight">
                          {ingName}
                        </p>
                        {availableText ? (
                          <p className="text-xs text-muted-foreground">
                            Available: {availableText}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => onRemoveStepIngredient(si.ingredientId)}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={si.quantity}
                        onChange={(e) =>
                          onUpdateStepIngredient(si.ingredientId, {
                            quantity: e.target.value
                          })
                        }
                        className="w-28"
                        placeholder="Qty or 1/2"
                      />
                      <Input
                        value={si.unit}
                        onChange={(e) =>
                          onUpdateStepIngredient(si.ingredientId, {
                            unit: e.target.value
                          })
                        }
                        className="flex-1"
                        placeholder="Unit"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" onClick={onSubmit}>
            {editingInstructionIdx !== null ? "Save" : "Add"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </BottomDockedSheet>
  )
}
