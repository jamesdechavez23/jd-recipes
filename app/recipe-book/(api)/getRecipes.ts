"use server"
import { createClient } from "@/lib/supabase/server"
import { Recipe } from "@/lib/types"

const MOCK_DATA: Recipe[] = [
   {
      id: 1,
      title: "Pork Sinigang",
      video: {
         channel: "Taste to Share PH"
      },
      macros: {
         calories: 500,
         protein: 20,
         carbohydrates: 20,
         fat: 15
      },
      time: "3h",
      servings: 5,
      ingredients: ["Pork", "Tamarind", "Tomatoes", "Radish", "Eggplant", "Water", "Fish Sauce", "Salt", "Pepper"],
      cuisine: "Filipino",
      mealType: "Main Course"
   },
   {
      id: 2,
      title: "Chicken Adobo",
      video: {
         channel: "Pinoy Food Channel"
      },
      macros: {
         calories: 600,
         protein: 30,
         carbohydrates: 25,
         fat: 20
      },
      time: "1h",
      servings: 4,
      ingredients: ["Chicken", "Soy Sauce", "Vinegar", "Garlic", "Bay Leaves", "Peppercorns"],
      cuisine: "Filipino",
      mealType: "Main Course"
   },
   {
      id: 3,
      title: "Beef Kare-Kare",
      video: {
         channel: "Filipino Kitchen"
      },
      macros: {
         calories: 700,
         protein: 40,
         carbohydrates: 30,
         fat: 25
      },
      time: "2h",
      servings: 6,
      ingredients: ["Beef", "Peanut Butter", "Eggplant", "String Beans", "Bok Choy", "Oxtail"],
      cuisine: "Filipino",
      mealType: "Main Course"
   },
   {
      id: 4,
      title: "Lumpiang Shanghai",
      video: {
         channel: "Crispy Rolls PH"
      },
      macros: {
         calories: 400,
         protein: 25,
         carbohydrates: 30,
         fat: 15
      },
      time: "1h",
      servings: 8,
      ingredients: ["Ground Pork", "Carrots", "Onions", "Garlic", "Spring Roll Wrappers", "Oil for Frying"],
      cuisine: "Filipino",
      mealType: "Appetizer"
   },
   {
      id: 5,
      title: "Sinigang na Baboy",
      video: {
         channel: "Sinigang Lovers"
      },
      macros: {
         calories: 550,
         protein: 25,
         carbohydrates: 22,
         fat: 18
      },
      time: "2h",
      servings: 5,
      ingredients: ["Pork Belly", "Tamarind", "Radish", "Water Spinach", "Green Chili", "Fish Sauce"],
      cuisine: "Filipino",
      mealType: "Main Course"
   },
   {
      id: 6,
      title: "Bicol Express",
      video: {
         channel: "Spicy Filipino"
      },
      macros: {
         calories: 650,
         protein: 35,
         carbohydrates: 28,
         fat: 30
      },
      time: "1.5h",
      servings: 4,
      ingredients: ["Pork", "Coconut Milk", "Shrimp Paste", "Chili Peppers", "Garlic", "Onions"],
      cuisine: "Filipino",
      mealType: "Main Course"
   },
   {
      id: 7,
      title: "Pancit Canton",
      video: {
         channel: "Noodle Lovers"
      },
      macros: {
         calories: 550,
         protein: 25,
         carbohydrates: 70,
         fat: 15
      },
      time: "1h",
      servings: 4,
      ingredients: ["Egg Noodles", "Chicken", "Shrimp", "Carrots", "Cabbage", "Soy Sauce"],
      cuisine: "Filipino",
      mealType: "Main Course"
   },
   {
      id: 8,
      title: "Halo-Halo",
      video: {
         channel: "Dessert Paradise"
      },
      macros: {
         calories: 300,
         protein: 5,
         carbohydrates: 60,
         fat: 10
      },
      time: "30m",
      servings: 2,
      ingredients: ["Shaved Ice", "Evaporated Milk", "Sweetened Beans", "Fruits", "Leche Flan", "Ube"],
      cuisine: "Filipino",
      mealType: "Dessert"
   }
]

export default async function getRecipes() {
   const recipes = MOCK_DATA // Replace with actual data fetching logic
   const cuisines = Array.from(new Set(recipes.map(recipe => recipe.cuisine)))
   const mealTypes = Array.from(new Set(recipes.map(recipe => recipe.mealType)))
   const ingredients = Array.from(new Set(recipes.flatMap(recipe => recipe.ingredients))).sort((a, b) => a.localeCompare(b))
   return { recipes, cuisines, mealTypes, ingredients, error: null }
}
