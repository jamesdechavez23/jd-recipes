"use client"

import { Recipe } from "@/lib/types"
import YouTube from "react-youtube"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/shadcn/accordion"
import { Clock, Flame, Carrot } from "lucide-react"
import { Badge } from "@/components/ui/shadcn/badge"
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
      <div className="flex flex-col pb-20">
         <div className="aspect-video w-full mb-4 max-w-6xl">
            <YouTube videoId={videoId} className="w-full h-full" opts={{ width: "100%", height: "100%" }} />
         </div>
         {toggle === "ingredients" && (
            <div className="px-2 flex flex-col gap-4">
               {Object.entries(
                  ingredients.reduce((acc, ingredient) => {
                     acc[ingredient.category!] = acc[ingredient.category!] || []
                     acc[ingredient.category!].push(ingredient)
                     return acc
                  }, {} as Record<string, typeof ingredients>)
               ).map(([category, items]) => (
                  <div key={category}>
                     <div className="font-bold text-base mb-2 text-muted-foreground uppercase tracking-wide">{category}</div>
                     <ul className="flex flex-col gap-2">
                        {items.map((ingredient, index) => (
                           <li key={ingredient.name + index} className="border p-2 bg-card text-card-foreground flex justify-between">
                              <span className="font-bold">{ingredient.name}</span>
                              <span>
                                 {ingredient.amount.value} {ingredient.amount.unit}
                              </span>
                           </li>
                        ))}
                     </ul>
                  </div>
               ))}
            </div>
         )}
         {toggle === "instructions" && (
            <Accordion type="single" collapsible className="px-2">
               {recipe.instructions.map((instruction, index) => {
                  const { description, time, heat_level, ingredients: instrIngredients } = instruction
                  return (
                     <AccordionItem
                        key={index}
                        value={`instruction-${index}`}
                        className="border px-2 mb-2 bg-card text-card-foreground last:border-b"
                     >
                        <AccordionTrigger>
                           <div className="flex flex-col gap-4 w-full">
                              <span className="font-bold text-lg">{description.short}</span>
                              <div className="flex justify-between">
                                 <div className="flex items-center">
                                    <Clock className="mr-2" size={16} />
                                    <span>{time.displayValue}</span>
                                 </div>
                                 <div className="flex items-center">
                                    <Flame className="mr-2" size={16} />
                                    <span>{heat_level}</span>
                                 </div>
                              </div>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="flex flex-col gap-4 mt-2">
                           <p>{description.long}</p>
                           <ul className="flex flex-wrap gap-2">
                              {instrIngredients.map((ing, idx) => (
                                 <li key={idx}>
                                    <Badge>
                                       {ing.name} - {ing.amount.value} {ing.amount.unit}
                                    </Badge>
                                 </li>
                              ))}
                           </ul>
                        </AccordionContent>
                     </AccordionItem>
                  )
               })}
            </Accordion>
         )}
      </div>
   )
}
