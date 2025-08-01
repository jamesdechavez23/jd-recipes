"use client"

import { Separator } from "@/components/ui/shadcn/separator"
import { Drumstick, Croissant, Nut, Zap, Clock, Utensils, ChevronDown } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/shadcn/tooltip"
import { Button } from "@/components/ui/shadcn/button"
import Link from "next/link"
import { useState } from "react"
import { Badge } from "@/components/ui/shadcn/badge"
import { Recipe } from "@/lib/types"

interface RecipeListItemProps {
   recipe: Recipe
}

export default function RecipeListItem({ recipe }: RecipeListItemProps) {
   const { title, video, macros, time, servings, ingredients } = recipe
   const videoChannel = video?.channel || "Unknown Channel"
   const { calories, protein, carbohydrates, fat } = macros
   const [ingredientsVisible, setIngredientsVisible] = useState(false)
   const handleShowIngredients = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIngredientsVisible(!ingredientsVisible)
   }
   return (
      <Link href={`/recipe/${recipe.id}`} className="block">
         <div className="border border-b-foreground bg-card text-card-foreground pt-4 px-2 max-w-lg hover:border-accent">
            <div className="flex items-center gap-2 mb-2">
               <h2 className="text-lg font-semibold text-nowrap">{title}</h2>
               <p className="text-nowrap overflow-hidden text-ellipsis">by {videoChannel}</p>
            </div>
            <Separator className="mb-2" />
            <div className="flex gap-4 justify-between mb-2">
               <TooltipProvider>
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <div className="flex gap-2 items-center">
                           <Zap className="w-4 h-4" />
                           <span>{calories}</span>
                        </div>
                     </TooltipTrigger>
                     <TooltipContent>
                        <span>Calories</span>
                     </TooltipContent>
                  </Tooltip>
               </TooltipProvider>
               <TooltipProvider>
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <div className="flex gap-2 items-center">
                           <Drumstick className="w-4 h-4" />
                           <span>{protein}</span>
                        </div>
                     </TooltipTrigger>
                     <TooltipContent>
                        <span>Protein</span>
                     </TooltipContent>
                  </Tooltip>
               </TooltipProvider>
               <TooltipProvider>
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <div className="flex gap-2 items-center">
                           <Croissant className="w-4 h-4" />
                           <span>{carbohydrates}</span>
                        </div>
                     </TooltipTrigger>
                     <TooltipContent>
                        <span>Carbohydrates</span>
                     </TooltipContent>
                  </Tooltip>
               </TooltipProvider>
               <TooltipProvider>
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <div className="flex gap-2 items-center">
                           <Nut className="w-4 h-4" />
                           <span>{fat}</span>
                        </div>
                     </TooltipTrigger>
                     <TooltipContent>
                        <span>Fat</span>
                     </TooltipContent>
                  </Tooltip>
               </TooltipProvider>
            </div>
            <div className="flex gap-4 justify-between">
               <TooltipProvider>
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <div className="flex gap-2 items-center">
                           <Utensils className="w-4 h-4" />
                           <span>{servings}</span>
                        </div>
                     </TooltipTrigger>
                     <TooltipContent>
                        <span>Recipe ID</span>
                     </TooltipContent>
                  </Tooltip>
               </TooltipProvider>
               <TooltipProvider>
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <div className="flex gap-2 items-center">
                           <Clock className="w-4 h-4" />
                           <span>{time}</span>
                        </div>
                     </TooltipTrigger>
                     <TooltipContent>
                        <span>Time</span>
                     </TooltipContent>
                  </Tooltip>
               </TooltipProvider>
            </div>
            <Separator className="mt-2" />

            <div className="flex justify-center">
               <Button variant={"link"} onClick={handleShowIngredients}>
                  {ingredientsVisible ? "Hide Ingredients" : "Show Ingredients"} <ChevronDown className="w-4 h-4" />
               </Button>
            </div>
            {ingredientsVisible && (
               <ul className="px-4 pb-4 flex gap-4 flex-wrap justify-around">
                  {ingredients.map((ingredient, index) => (
                     <li key={index}>
                        <Badge variant={"outline"}>{ingredient}</Badge>
                     </li>
                  ))}
               </ul>
            )}
         </div>
      </Link>
   )
}
