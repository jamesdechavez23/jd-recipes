import "server-only"

import { getDbPool } from "@recipes/server/db/pool"
import type { IngredientListItem } from "@recipes/server/ingredients/getIngredients"

export type CreateIngredientInput = {
  name: string
  category?: string | null
  unit?: string | null
}

export async function createIngredient(input: CreateIngredientInput) {
  const pool = await getDbPool()
  const result = await pool.query<IngredientListItem>(
    'insert into ingredients (name, category, default_unit) values ($1, $2, $3) returning id, name, category, default_unit as "unit"',
    [input.name, input.category ?? null, input.unit ?? null]
  )

  const ingredient = result.rows[0] ?? null
  if (!ingredient) {
    throw new Error("Insert succeeded but returned no ingredient")
  }

  return ingredient
}
