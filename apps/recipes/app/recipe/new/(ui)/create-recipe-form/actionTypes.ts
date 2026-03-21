export type RecipeEditorActionState =
  | { status: "idle" }
  | { status: "success"; recipe: unknown }
  | { status: "error"; message: string; httpStatus?: number }

export type CreateIngredientActionState =
  | { status: "idle" }
  | {
      status: "success"
      ingredient: {
        id: number
        name: string
        category?: string | null
        unit?: string | null
      }
    }
  | { status: "error"; message: string; httpStatus?: number }

export type RecipeDeleteActionState =
  | { status: "idle" }
  | { status: "error"; message: string; httpStatus?: number }
