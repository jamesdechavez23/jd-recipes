import "server-only"

import { type DatabaseError } from "pg"

import { withDbTransaction } from "@recipes/server/db/pool"

export type RecipeStepIngredientInput = {
  ingredientId: number
  quantity?: number | null
  quantity_display?: string | null
  unit?: string | null
}

export type RecipeStepInput = {
  step: number
  short_desc?: string
  long_desc?: string
  heat?: string
  time_minutes?: number | null
  step_instructions?: RecipeStepIngredientInput[]
}

export type RecipeIngredientInput = {
  ingredientId: number
  quantity?: number | null
  quantity_display?: string | null
  unit?: string | null
}

export type CreateRecipeInput = {
  createdBySub: string
  name: string
  description?: string | null
  videoUrl?: string | null
  instructions: RecipeStepInput[]
  ingredients?: RecipeIngredientInput[]
}

export type CreatedRecipe = {
  id: number
  created_by_sub: string
  name: string
  description: string | null
  video_url: string | null
  created_at: string
  updated_at: string
}

export class CreateRecipeError extends Error {
  httpStatus: number

  constructor(httpStatus: number, message: string) {
    super(message)
    this.name = "CreateRecipeError"
    this.httpStatus = httpStatus
  }
}

function isForeignKeyError(error: unknown): error is DatabaseError {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23503"
  )
}

export async function createRecipe(input: CreateRecipeInput) {
  try {
    return await withDbTransaction(async (client) => {
      const recipeResult = await client.query<CreatedRecipe>(
        "insert into recipes (created_by_sub, name, description, video_url) values ($1, $2, $3, $4) returning *",
        [
          input.createdBySub,
          input.name,
          input.description ?? null,
          input.videoUrl ?? null
        ]
      )

      const recipe = recipeResult.rows[0] ?? null
      if (!recipe) {
        throw new Error("Insert succeeded but returned no recipe")
      }

      for (const ingredient of input.ingredients ?? []) {
        await client.query(
          "insert into recipe_ingredients (recipe_id, ingredient_id, quantity, quantity_display, unit) values ($1, $2, $3, $4, $5) on conflict (recipe_id, ingredient_id) do update set quantity = excluded.quantity, quantity_display = excluded.quantity_display, unit = excluded.unit",
          [
            recipe.id,
            ingredient.ingredientId,
            ingredient.quantity ?? null,
            ingredient.quantity_display ?? null,
            ingredient.unit ?? null
          ]
        )
      }

      for (const step of input.instructions) {
        const stepResult = await client.query<{ id: number }>(
          "insert into recipe_steps (recipe_id, step_number, short_desc, long_desc, heat, time_minutes) values ($1, $2, $3, $4, $5, $6) returning id",
          [
            recipe.id,
            step.step,
            step.short_desc ?? `Step ${step.step}`,
            step.long_desc ?? null,
            step.heat ?? null,
            step.time_minutes ?? null
          ]
        )

        const recipeStepId = stepResult.rows[0]?.id
        if (!recipeStepId) {
          throw new Error("Insert step succeeded but returned no id")
        }

        for (const stepIngredient of step.step_instructions ?? []) {
          await client.query(
            "insert into recipe_step_ingredients (recipe_step_id, ingredient_id, quantity, quantity_display, unit) values ($1, $2, $3, $4, $5) on conflict (recipe_step_id, ingredient_id) do update set quantity = excluded.quantity, quantity_display = excluded.quantity_display, unit = excluded.unit",
            [
              recipeStepId,
              stepIngredient.ingredientId,
              stepIngredient.quantity ?? null,
              stepIngredient.quantity_display ?? null,
              stepIngredient.unit ?? null
            ]
          )
        }
      }

      return recipe
    })
  } catch (error) {
    if (isForeignKeyError(error)) {
      throw new CreateRecipeError(
        400,
        "One or more ingredient references do not exist"
      )
    }

    throw error
  }
}
