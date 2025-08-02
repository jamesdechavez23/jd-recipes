"use server"
import { createClient } from "@/lib/supabase/server"
import { Recipe } from "@/lib/types"

const MOCK_DATA: Recipe = {
   id: 1,
   title: "Pork Sinigang",
   video: {
      channel: "Taste to Share PH",
      videoId: "MpWXFqHvjbY"
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
}

export default async function getRecipe(id: string) {
   const recipe = MOCK_DATA
   return { recipe, error: null }
}
