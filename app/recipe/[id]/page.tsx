export default async function ViewRecipePage({ params }: { params: { id: string } }) {
   const recipeId = parseInt(params.id, 10)
   return (
      <div className="p-4">
         <h1 className="text-2xl font-bold mb-4">Recipe Details</h1>
         {/* Here you would fetch and display the recipe details based on recipeId */}
         <p>Recipe ID: {recipeId}</p>
         {/* Add more details as needed */}
      </div>
   )
}
