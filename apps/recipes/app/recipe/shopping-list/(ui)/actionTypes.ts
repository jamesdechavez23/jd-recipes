export type AddRecipeIngredientsToShoppingListActionState =
  | { status: "idle" }
  | { status: "success"; addedCount: number; skippedCount: number }
  | { status: "error"; message: string; httpStatus?: number }

export type RemoveShoppingListItemActionState =
  | { status: "idle" }
  | { status: "error"; message: string; httpStatus?: number }
