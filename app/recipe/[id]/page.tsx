import getRecipe from "./(api)/getRecipe"
import BottomToggleBar from "./(ui)/BottomToggleBar"
import ViewRecipe from "./(ui)/ViewRecipe"

interface ViewRecipePageProps {
   params: Promise<{ id: string }>
   searchParams?: Promise<{ toggle: string }>
}

export default async function ViewRecipePage({ params, searchParams }: ViewRecipePageProps) {
   const resolvedParams = await params
   const resolvedSearchParams = await searchParams

   const recipeId = parseInt(resolvedParams.id, 10)
   const toggle = resolvedSearchParams?.toggle || "default"

   const { recipe, error } = await getRecipe(recipeId.toString())
   if (error) {
      return <div>Error loading recipe: {error}</div>
   }
   if (!recipe) {
      return <div>Recipe not found</div>
   }

   return (
      <div className="flex flex-col">
         <h1 className="text-2xl font-bold mb-4 ml-2">{recipe.title}</h1>
         <ViewRecipe recipe={recipe} toggle={toggle} />
         <BottomToggleBar />
      </div>
   )
}
