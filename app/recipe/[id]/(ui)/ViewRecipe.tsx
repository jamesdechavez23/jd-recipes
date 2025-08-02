"use client"

import { Recipe } from "@/lib/types"
import YouTube from "react-youtube"

interface ViewRecipeProps {
   recipe: Recipe
}

export default function ViewRecipe({ recipe }: ViewRecipeProps) {
   if (!recipe) {
      return <div>Recipe not found</div>
   }
   const { video, ingredients, time, servings, cuisine, mealType } = recipe
   const { videoId, channel } = video || {}
   return (
      <div>
         <YouTube videoId={videoId} />
      </div>
   )
}
