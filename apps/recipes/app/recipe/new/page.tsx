import CreateRecipeForm from "./(ui)/CreateRecipeForm"
import createRecipeAction from "./(actions)/createRecipeAction"
import createIngredientAction from "./(actions)/createIngredientAction"
import {
  AdminAccessError,
  requireAdminAccessToken
} from "@recipes/utils/requireAdmin"
import { getIngredients } from "./(actions)/getIngredients"
import type { IngredientListItem } from "@recipes/server/ingredients/getIngredients"

export default async function CreateRecipePage() {
  let ingredients: IngredientListItem[] = []
  let ingredientsError: string | null = null
  let canCreateIngredients = false

  try {
    await requireAdminAccessToken()
    canCreateIngredients = true
  } catch (error) {
    if (!(error instanceof AdminAccessError)) {
      throw error
    }
  }

  try {
    ingredients = await getIngredients()
  } catch (err) {
    ingredientsError = err instanceof Error ? err.message : String(err)
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <CreateRecipeForm
        createRecipeAction={createRecipeAction}
        createIngredientAction={createIngredientAction}
        canCreateIngredients={canCreateIngredients}
        ingredients={ingredients}
        ingredientsError={ingredientsError}
      />
    </main>
  )
}
