import "server-only"

import { getDbPool } from "@recipes/server/db/pool"

type RecipeOwnershipRow = {
  created_by_sub: string
}

export class RecipeOwnershipError extends Error {
  httpStatus: number

  constructor(httpStatus: number, message: string) {
    super(message)
    this.name = "RecipeOwnershipError"
    this.httpStatus = httpStatus
  }
}

export async function ensureRecipeOwnership(
  recipeId: number,
  userSub: string
): Promise<void> {
  const pool = await getDbPool()
  const result = await pool.query<RecipeOwnershipRow>(
    "select created_by_sub from recipes where id = $1",
    [recipeId]
  )

  const recipe = result.rows[0] ?? null
  if (!recipe) {
    throw new RecipeOwnershipError(404, "Recipe not found")
  }

  if (recipe.created_by_sub !== userSub) {
    throw new RecipeOwnershipError(
      403,
      "You do not have permission to modify this recipe"
    )
  }
}
