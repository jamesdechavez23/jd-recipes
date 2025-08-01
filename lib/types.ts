export type Recipe = {
   id: number
   title: string
   video?: {
      channel: string
   }
   macros: {
      calories: number
      protein: number
      carbohydrates: number
      fat: number
   }
   time: string
   servings: number
   ingredients: string[]
}
