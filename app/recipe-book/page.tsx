import RecipeListItem from "./(ui)/RecipeListItem"

export default async function RecipeBookPage() {
   return (
      <div className="p-4">
         <h1 className="text-2xl font-bold mb-4">Recipe Book</h1>
         <RecipeListItem />
      </div>
   )
}
