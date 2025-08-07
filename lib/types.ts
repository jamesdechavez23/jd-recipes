export type Recipe = {
   id: number
   title: string
   video?: {
      channel: string
      videoId: string
   }
   macros: {
      calories: number
      protein: number
      carbohydrates: number
      fat: number
   }
   time: string
   servings: number
   ingredients: RecipeIngredient[]
   instructions: RecipeInstruction[]
   cuisine: string
   mealType: string
}

export type RecipeIngredient = {
   name: string
   amount: {
      value: number | null
      unit: string
   }
   category?: string
}

export type RecipeInstruction = {
   action: string
   description: {
      short: string // 35 char limit
      long: string
   }
   time: {
      minutes: number
      displayValue: string
   }
   heat_level: string | null
   ingredients: RecipeIngredient[]
}
