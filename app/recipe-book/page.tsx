import { filterRecipes } from "@/lib/utils"
import getRecipes from "./(api)/getRecipes"
import RecipeListItem from "./(ui)/RecipeListItem"
import FilterSection from "./FilterSection"

interface RecipeBookPageProps {
   searchParams: Promise<{ [key: string]: string }>
}

export default async function RecipeBookPage({ searchParams }: RecipeBookPageProps) {
   const params = await searchParams
   const {
      ingredient: ingredientFilter,
      cuisine: cuisineFilter,
      meal_type: mealTypeFilter,
      macro: macroFilter,
      operator: operatorFilter,
      amount: amountFilter
   } = params || {}

   const { recipes, cuisines, mealTypes, ingredients, error } = await getRecipes()

   const filteredRecipes = filterRecipes(recipes, ingredientFilter, cuisineFilter, mealTypeFilter, macroFilter, operatorFilter, amountFilter)

   return (
      <div className="p-4">
         <h1 className="text-2xl font-bold mb-4">Your Recipe Book</h1>
         <FilterSection
            cuisines={cuisines}
            mealTypes={mealTypes}
            ingredients={ingredients}
            ingredientFilter={ingredientFilter}
            cuisineFilter={cuisineFilter}
            mealTypeFilter={mealTypeFilter}
            macroFilter={macroFilter}
            operatorFilter={operatorFilter}
            amountFilter={amountFilter}
         />
         {error && <p className="text-destructive">Error fetching recipes</p>}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map(recipe => (
               <RecipeListItem key={recipe.id} recipe={recipe} />
            ))}
         </div>
      </div>
   )
}
