import getRecipe from "./(api)/getRecipe"
import ViewRecipe from "./(ui)/ViewRecipe"

export default async function ViewRecipePage({ params }: { params: { id: string } }) {
   const recipeId = parseInt(params.id, 10)
   const { recipe, error } = await getRecipe(recipeId.toString())
   if (error) {
      return <div>Error loading recipe: {error}</div>
   }
   if (!recipe) {
      return <div>Recipe not found</div>
   }

   return (
      <div className="p-4">
         <h1 className="text-2xl font-bold mb-4">{recipe.title}</h1>
         <ViewRecipe recipe={recipe} />
      </div>
   )
}
