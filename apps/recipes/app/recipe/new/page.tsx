import CreateRecipeForm from "./(ui)/CreateRecipeForm"
import createRecipeAction from "./(actions)/createRecipeAction"
import createIngredientAction from "./(actions)/createIngredientAction"
import {
  getIngredients,
  type IngredientListItem
} from "./(actions)/getIngredients"

export default async function CreateRecipePage() {
  let ingredients: IngredientListItem[] = []
  let ingredientsError: string | null = null

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
        ingredients={ingredients}
        ingredientsError={ingredientsError}
      />
    </main>
  )
}
