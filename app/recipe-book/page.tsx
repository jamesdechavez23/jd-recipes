import getRecipes from "./(api)/getRecipes"
import RecipeListItem from "./(ui)/RecipeListItem"

export default async function RecipeBookPage() {
   const { recipes, error } = await getRecipes()
   return (
      <div className="p-4">
         <h1 className="text-2xl font-bold mb-4">Your Recipe Book</h1>
         {error && <p className="text-destructive">Error fetching recipes</p>}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map(recipe => (
               <RecipeListItem key={recipe.id} recipe={recipe} />
            ))}
         </div>
      </div>
   )
}
