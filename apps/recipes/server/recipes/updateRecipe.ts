import "server-only"

import { type DatabaseError, type PoolClient } from "pg"

import {
  type CreateRecipeInput,
  CreateRecipeError,
  type CreatedRecipe,
  type RecipeIngredientInput,
  type RecipeStepInput
} from "@recipes/server/recipes/createRecipe"
import { withDbTransaction } from "@recipes/server/db/pool"
import { ensureRecipeOwnership } from "@recipes/server/recipes/ensureRecipeOwnership"

export type UpdateRecipeInput = Omit<CreateRecipeInput, "createdBySub"> & {
  recipeId: number
  updatedBySub: string
}

function isForeignKeyError(error: unknown): error is DatabaseError {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23503"
  )
}

async function replaceRecipeIngredients(
  client: PoolClient,
  recipeId: number,
  ingredients: RecipeIngredientInput[] | undefined
) {
  await client.query("delete from recipe_ingredients where recipe_id = $1", [
    recipeId
  ])

  for (const ingredient of ingredients ?? []) {
    await client.query(
      "insert into recipe_ingredients (recipe_id, ingredient_id, quantity, quantity_display, unit) values ($1, $2, $3, $4, $5)",
      [
        recipeId,
        ingredient.ingredientId,
        ingredient.quantity ?? null,
        ingredient.quantity_display ?? null,
        ingredient.unit ?? null
      ]
    )
  }
}

async function replaceRecipeSteps(
  client: PoolClient,
  recipeId: number,
  instructions: RecipeStepInput[]
) {
  await client.query("delete from recipe_steps where recipe_id = $1", [
    recipeId
  ])

  for (const step of instructions) {
    const stepResult = await client.query<{ id: number }>(
      "insert into recipe_steps (recipe_id, step_number, short_desc, long_desc, heat, time_minutes) values ($1, $2, $3, $4, $5, $6) returning id",
      [
        recipeId,
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
        "insert into recipe_step_ingredients (recipe_step_id, ingredient_id, quantity, quantity_display, unit) values ($1, $2, $3, $4, $5)",
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
}

export async function updateRecipe(
  input: UpdateRecipeInput
): Promise<CreatedRecipe> {
  await ensureRecipeOwnership(input.recipeId, input.updatedBySub)

  try {
    return await withDbTransaction(async (client) => {
      const recipeResult = await client.query<CreatedRecipe>(
        "update recipes set name = $2, description = $3, video_url = $4 where id = $1 returning *",
        [
          input.recipeId,
          input.name,
          input.description ?? null,
          input.videoUrl ?? null
        ]
      )

      const recipe = recipeResult.rows[0] ?? null
      if (!recipe) {
        throw new Error("Update succeeded but returned no recipe")
      }

      await replaceRecipeIngredients(client, recipe.id, input.ingredients)
      await replaceRecipeSteps(client, recipe.id, input.instructions)

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
