import "server-only"

import { getDbPool } from "@recipes/server/db/pool"

export type IngredientListItem = {
  id: number
  name: string
  category?: string | null
  unit?: string | null
}

export async function getIngredientsList() {
  const pool = await getDbPool()
  const result = await pool.query<IngredientListItem>(
    'select id, name, category, default_unit as "unit" from ingredients order by name asc'
  )

  return result.rows
}
