import CreateRecipeForm from "./(ui)/CreateRecipeForm"
import createRecipeAction from "./(actions)/createRecipeAction"
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
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">Create Recipe</h1>
      <CreateRecipeForm
        createRecipeAction={createRecipeAction}
        ingredients={ingredients}
        ingredientsError={ingredientsError}
      />
    </main>
  )
}
