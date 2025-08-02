import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Recipe } from "./types"

export function cn(...inputs: ClassValue[]) {
   return twMerge(clsx(inputs))
}

export function checkPublicPage(pathname: string): boolean {
   const PUBLIC_PAGES_EXACT = ["/", "/login", "/forgot-password"]
   const PUBLIC_PAGES_DYNAMIC = ["/demo/", "/register"]

   return PUBLIC_PAGES_EXACT.includes(pathname) || PUBLIC_PAGES_DYNAMIC.some(page => pathname.startsWith(page))
}

export function filterRecipes(
   recipes: Recipe[],
   ingredientFilter: string | undefined,
   cuisineFilter: string | undefined,
   mealTypeFilter: string | undefined,
   macroFilter: string | undefined,
   operatorFilter: string | undefined,
   amountFilter: string | undefined
): Recipe[] {
   return recipes.filter(recipe => {
      const matchesIngredient = ingredientFilter ? recipe.ingredients.some(ing => ing === ingredientFilter) : true
      const matchesCuisine = cuisineFilter ? recipe.cuisine === cuisineFilter : true
      const matchesMealType = mealTypeFilter ? recipe.mealType === mealTypeFilter : true
      const matchesMacro =
         macroFilter === "Protein" && operatorFilter === ">="
            ? recipe.macros.protein >= Number(amountFilter)
            : macroFilter === "Protein" && operatorFilter === "<="
            ? recipe.macros.protein <= Number(amountFilter)
            : macroFilter === "Carbs" && operatorFilter === ">="
            ? recipe.macros.carbohydrates >= Number(amountFilter)
            : macroFilter === "Carbs" && operatorFilter === "<="
            ? recipe.macros.carbohydrates <= Number(amountFilter)
            : macroFilter === "Fat" && operatorFilter === ">="
            ? recipe.macros.fat >= Number(amountFilter)
            : macroFilter === "Fat" && operatorFilter === "<="
            ? recipe.macros.fat <= Number(amountFilter)
            : macroFilter === "Calories" && operatorFilter === ">="
            ? recipe.macros.calories >= Number(amountFilter)
            : macroFilter === "Calories" && operatorFilter === "<="
            ? recipe.macros.calories <= Number(amountFilter)
            : true
      return matchesIngredient && matchesCuisine && matchesMealType && matchesMacro
   })
}
