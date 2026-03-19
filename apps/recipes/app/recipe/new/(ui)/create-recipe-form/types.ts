import type { DisplayIngredient } from "../../../[id]/(ui)/RecipeSectionsToggle"

export type BuilderInstruction = {
  id: number
  step: number
  short_desc: string
  long_desc: string
  heat: string | null
  time_minutes: number | null
  step_instructions: Array<{
    ingredientId: number
    quantity: number | null
    quantity_display?: string | null
    unit: string | null
  }>
}

export type BuilderIngredient = DisplayIngredient & {
  quantityDisplay?: string | null
}

export type InstructionDraftStepIngredient = {
  ingredientId: number
  quantity: string
  unit: string
}
