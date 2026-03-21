import "server-only"

import { withDbTransaction } from "@recipes/server/db/pool"
import { ensureRecipeOwnership } from "@recipes/server/recipes/ensureRecipeOwnership"

export async function deleteRecipe(input: {
  recipeId: number
  deletedBySub: string
}): Promise<void> {
  await ensureRecipeOwnership(input.recipeId, input.deletedBySub)

  await withDbTransaction(async (client) => {
    await client.query("delete from recipes where id = $1", [input.recipeId])
  })
}
