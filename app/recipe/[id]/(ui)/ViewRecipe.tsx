"use client"

import { Recipe } from "@/lib/types"
import YouTube from "react-youtube"

interface ViewRecipeProps {
   recipe: Recipe
   toggle?: string
}

export default function ViewRecipe({ recipe, toggle }: ViewRecipeProps) {
   if (!recipe) {
      return <div>Recipe not found</div>
   }
   const { video, ingredients, time, servings, cuisine, mealType } = recipe
   const { videoId, channel } = video || {}
   return (
      <div className="flex flex-col">
         <div className="aspect-video w-full mb-4 max-w-6xl">
            <YouTube videoId={videoId} className="w-full h-full" opts={{ width: "100%", height: "100%" }} />
         </div>
         {toggle === "ingredients" && (
            <ul className="px-2 flex flex-col gap-2 mb-20">
               {ingredients.map((ingredient, index) => (
                  <li key={index} className="border p-2 bg-card text-card-foreground">
                     {ingredient}
                  </li>
               ))}
            </ul>
         )}
      </div>
   )
}
