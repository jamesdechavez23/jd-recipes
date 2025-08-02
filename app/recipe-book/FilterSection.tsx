"use client"
import { Button } from "@/components/ui/shadcn/button"
import { Separator } from "@/components/ui/shadcn/separator"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/shadcn/input"
import { useRouter } from "next/navigation"

const FILTER_BY = ["Cuisine", "Ingredient", "Macros", "Meal Type"]
const MACROS = ["Calories", "Carbs", "Protein", "Fat"]

interface FilterSectionProps {
   cuisines: string[]
   mealTypes: string[]
   ingredients: string[]
   ingredientFilter?: string
   cuisineFilter?: string
   mealTypeFilter?: string
   macroFilter?: string
   operatorFilter?: string
   amountFilter?: string
}

export default function FilterSection({
   cuisines,
   mealTypes,
   ingredients,
   ingredientFilter,
   cuisineFilter,
   mealTypeFilter,
   macroFilter,
   operatorFilter,
   amountFilter
}: FilterSectionProps) {
   const router = useRouter()
   const [filterOneSelected, setFilterOneSelected] = useState(
      cuisineFilter ? "Cuisine" : ingredientFilter ? "Ingredient" : macroFilter ? "Macros" : mealTypeFilter ? "Meal Type" : ""
   )
   const [filterTwoSelected, setFilterTwoSelected] = useState(ingredientFilter || cuisineFilter || mealTypeFilter || macroFilter || "")
   const [operatorSelected, setOperatorSelected] = useState(operatorFilter || "")
   const [macroAmount, setMacroAmount] = useState(amountFilter ?? "")

   useEffect(() => {
      if (filterOneSelected && filterOneSelected !== "Macros" && filterTwoSelected) {
         const params = new URLSearchParams({
            [filterOneSelected.toLowerCase().replace(" ", "_")]: filterTwoSelected
         })
         router.push(`/recipe-book?${params.toString()}`)
      }
   }, [filterOneSelected, filterTwoSelected, operatorSelected, macroAmount, router])

   const handleFilterOneChange = (filter: string) => {
      if (filterOneSelected === filter) {
         setFilterOneSelected("")
         router.push("/recipe-book")
         return
      }
      setFilterOneSelected(filter)
      setFilterTwoSelected("")
      setOperatorSelected("")
      setMacroAmount("")
   }

   const handleFilterTwoChange = (filter: string) => {
      if (filterTwoSelected === filter) {
         setFilterTwoSelected("")
         setOperatorSelected("")
         setMacroAmount("")
         router.push(`/recipe-book`)
         return
      }
      setFilterTwoSelected(filter)
      setOperatorSelected("")
      setMacroAmount("")
   }

   const handleOperatorChange = (operator: string) => {
      if (operatorSelected === operator) {
         setOperatorSelected("")
         setMacroAmount("")
         const params = new URLSearchParams({
            [filterOneSelected.toLowerCase().replace(" ", "_")]: filterOneSelected,
            [filterTwoSelected.toLowerCase().replace(" ", "_")]: filterTwoSelected
         })
         router.push(`/recipe-book?${params.toString()}`)
         return
      }
      setOperatorSelected(operator)
      setMacroAmount("")
   }

   const handleApplyMacroFilter = () => {
      const amountNum = Number(macroAmount)
      if (!filterTwoSelected || !operatorSelected || amountNum <= 0) return
      const params = new URLSearchParams({
         macro: filterTwoSelected,
         operator: operatorSelected,
         amount: macroAmount
      })
      router.push(`/recipe-book?${params.toString()}`)
   }

   return (
      <div className="flex flex-col gap-2 items-start mb-6">
         <h2 className="font-semibold">Filter by:</h2>
         <div className="flex flex-wrap gap-2 items-center">
            {FILTER_BY.map(filter => {
               const disabled = !!filterOneSelected && filterOneSelected !== filter
               return (
                  <Button
                     key={filter}
                     onClick={() => handleFilterOneChange(filter)}
                     variant="outline"
                     className={`text-sm ${filterOneSelected === filter ? "bg-accent text-accent-foreground" : ""} ${disabled ? "hidden" : ""}`}
                     disabled={disabled}
                  >
                     {filter}
                  </Button>
               )
            })}
            {filterOneSelected === "Cuisine" && (
               <>
                  <Separator orientation="vertical" className="!h-6" />
                  {cuisines.map(cuisine => {
                     const disabled = !!filterTwoSelected && filterTwoSelected !== cuisine
                     return (
                        <Button
                           key={cuisine}
                           onClick={() => handleFilterTwoChange(cuisine)}
                           variant={"outline"}
                           className={`text-sm ${filterTwoSelected === cuisine ? "!bg-accent !text-accent-foreground" : ""} ${
                              disabled ? "hidden" : ""
                           }`}
                           disabled={disabled}
                        >
                           {cuisine}
                        </Button>
                     )
                  })}
               </>
            )}
            {filterOneSelected === "Meal Type" && (
               <>
                  <Separator orientation="vertical" className="!h-6" />
                  {mealTypes.map(mealType => {
                     const disabled = !!filterTwoSelected && filterTwoSelected !== mealType
                     return (
                        <Button
                           key={mealType}
                           onClick={() => handleFilterTwoChange(mealType)}
                           variant={"outline"}
                           className={`text-sm ${filterTwoSelected === mealType ? "!bg-accent !text-accent-foreground" : ""} ${
                              disabled ? "hidden" : ""
                           }`}
                           disabled={disabled}
                        >
                           {mealType}
                        </Button>
                     )
                  })}
               </>
            )}
            {filterOneSelected === "Ingredient" && (
               <>
                  <Separator orientation="vertical" className="!h-6" />
                  {ingredients.map(ingredient => {
                     const disabled = !!filterTwoSelected && filterTwoSelected !== ingredient
                     return (
                        <Button
                           key={ingredient}
                           onClick={() => handleFilterTwoChange(ingredient)}
                           variant={"outline"}
                           className={`text-sm ${filterTwoSelected === ingredient ? "!bg-accent !text-accent-foreground" : ""} ${
                              disabled ? "hidden" : ""
                           }`}
                           disabled={disabled}
                        >
                           {ingredient}
                        </Button>
                     )
                  })}
               </>
            )}
            {filterOneSelected === "Macros" && (
               <>
                  <Separator orientation="vertical" className="!h-6" />
                  {MACROS.map(macro => {
                     const disabled = !!filterTwoSelected && filterTwoSelected !== macro
                     return (
                        <Button
                           key={macro}
                           onClick={() => handleFilterTwoChange(macro)}
                           variant={"outline"}
                           className={`text-sm ${filterTwoSelected === macro ? "!bg-accent !text-accent-foreground" : ""} ${
                              disabled ? "hidden" : ""
                           }`}
                           disabled={disabled}
                        >
                           {macro}
                        </Button>
                     )
                  })}
                  {filterTwoSelected &&
                     ["<=", ">="].map(operator => {
                        const disabled = !!operatorSelected && operatorSelected !== operator
                        return (
                           <Button
                              key={operator}
                              onClick={() => handleOperatorChange(operator)}
                              variant={"outline"}
                              className={`text-sm ${operatorSelected === operator ? "!bg-accent !text-accent-foreground" : ""} ${
                                 disabled ? "hidden" : ""
                              }`}
                              disabled={disabled}
                           >
                              {operator}
                           </Button>
                        )
                     })}
                  {operatorSelected && (
                     <>
                        <Input
                           type="number"
                           placeholder="Amount"
                           className="w-24 text-sm"
                           value={macroAmount}
                           onChange={e => setMacroAmount(e.target.value)}
                        />
                        <Button
                           className="ml-2"
                           // variant="secondary"
                           size="sm"
                           disabled={!filterTwoSelected || !operatorSelected || Number(macroAmount) <= 0}
                           onClick={handleApplyMacroFilter}
                        >
                           Apply
                        </Button>
                     </>
                  )}
               </>
            )}
         </div>
      </div>
   )
}
