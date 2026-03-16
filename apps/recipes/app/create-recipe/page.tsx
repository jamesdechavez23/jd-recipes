import CreateRecipeForm from "./(ui)/CreateRecipeForm"
import createRecipeAction from "./(actions)/createRecipeAction"

export default function CreateRecipePage() {
  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">Create Recipe</h1>
      <CreateRecipeForm createRecipeAction={createRecipeAction} />
    </main>
  )
}
