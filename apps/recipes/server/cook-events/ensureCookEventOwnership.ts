import "server-only"

import { getDbPool } from "@recipes/server/db/pool"

export type OwnedCookEventRow = {
  id: number
  recipeId: number
  ownerSub: string
  cookedAt: string
  note: string | null
  createdAt: string
  updatedAt: string
}

export class CookEventOwnershipError extends Error {
  httpStatus: number

  constructor(httpStatus: number, message: string) {
    super(message)
    this.name = "CookEventOwnershipError"
    this.httpStatus = httpStatus
  }
}

export async function ensureCookEventOwnership(input: {
  cookEventId: number
  recipeId: number
  userSub: string
}): Promise<OwnedCookEventRow> {
  const pool = await getDbPool()
  const result = await pool.query<OwnedCookEventRow>(
    'select id, recipe_id as "recipeId", owner_sub as "ownerSub", cooked_at as "cookedAt", note, created_at as "createdAt", updated_at as "updatedAt" from cook_events where id = $1',
    [input.cookEventId]
  )

  const cookEvent = result.rows[0] ?? null
  if (!cookEvent) {
    throw new CookEventOwnershipError(404, "Cook event not found")
  }

  if (cookEvent.recipeId !== input.recipeId) {
    throw new CookEventOwnershipError(404, "Cook event not found")
  }

  if (cookEvent.ownerSub !== input.userSub) {
    throw new CookEventOwnershipError(
      403,
      "You do not have permission to modify this cook event"
    )
  }

  return cookEvent
}
