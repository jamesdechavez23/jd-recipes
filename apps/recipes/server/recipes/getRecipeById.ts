import "server-only"

import { getDbPool } from "@recipes/server/db/pool"

export type RecipeStepIngredient = {
  ingredientId: number
  quantity?: number | null
  quantity_display?: string | null
  unit?: string | null
}

export type RecipeInstruction = {
  step: number
  short_desc: string
  long_desc?: string | null
  heat?: string | null
  time_minutes?: number | null
  step_instructions: RecipeStepIngredient[]
}

export type RecipeIngredient = {
  ingredientId: number
  name: string
  category?: string | null
  quantity?: number | null
  quantityDisplay?: string | null
  unit?: string | null
}

export type RecipeById = {
  id: number
  name: string
  description: string | null
  video?: string | null
  instructions: RecipeInstruction[]
  ingredients: RecipeIngredient[]
}

type RecipeRow = {
  id: number
  name: string
  description: string | null
  video: string | null
}

type RecipeStepRow = {
  id: number
  step: number
  short_desc: string
  long_desc: string | null
  heat: string | null
  time_minutes: number | null
}

type RecipeStepIngredientRow = {
  recipeStepId: number
  ingredientId: number
  quantity: number | null
  quantity_display: string | null
  unit: string | null
}

export async function getRecipeByIdFromDb(
  id: number
): Promise<RecipeById | null> {
  const pool = await getDbPool()

  const recipeResult = await pool.query<RecipeRow>(
    'select id, name, description, video_url as "video" from recipes where id = $1',
    [id]
  )

  const recipe = recipeResult.rows[0] ?? null
  if (!recipe) {
    return null
  }

  const ingredientsResult = await pool.query<RecipeIngredient>(
    'select ri.ingredient_id as "ingredientId", i.name, i.category, ri.quantity, ri.quantity_display as "quantityDisplay", ri.unit from recipe_ingredients ri join ingredients i on i.id = ri.ingredient_id where ri.recipe_id = $1 order by i.name asc',
    [id]
  )

  const stepsResult = await pool.query<RecipeStepRow>(
    'select id, step_number as "step", short_desc, long_desc, heat, time_minutes from recipe_steps where recipe_id = $1 order by step_number asc',
    [id]
  )

  const stepIngredientsResult = await pool.query<RecipeStepIngredientRow>(
    'select rsi.recipe_step_id as "recipeStepId", rsi.ingredient_id as "ingredientId", rsi.quantity, rsi.quantity_display as "quantity_display", rsi.unit from recipe_step_ingredients rsi join recipe_steps rs on rs.id = rsi.recipe_step_id where rs.recipe_id = $1 order by rs.step_number asc, rsi.ingredient_id asc',
    [id]
  )

  const stepIngredientsByStepId = new Map<number, RecipeStepIngredient[]>()
  for (const row of stepIngredientsResult.rows) {
    const stepIngredients = stepIngredientsByStepId.get(row.recipeStepId)
    const item: RecipeStepIngredient = {
      ingredientId: row.ingredientId,
      quantity: row.quantity,
      quantity_display: row.quantity_display,
      unit: row.unit
    }

    if (stepIngredients) {
      stepIngredients.push(item)
    } else {
      stepIngredientsByStepId.set(row.recipeStepId, [item])
    }
  }

  const instructions: RecipeInstruction[] = stepsResult.rows.map((step) => ({
    step: step.step,
    short_desc: step.short_desc,
    long_desc: step.long_desc,
    heat: step.heat,
    time_minutes: step.time_minutes,
    step_instructions: stepIngredientsByStepId.get(step.id) ?? []
  }))

  return {
    ...recipe,
    video: recipe.video ?? undefined,
    ingredients: ingredientsResult.rows,
    instructions
  }
}
