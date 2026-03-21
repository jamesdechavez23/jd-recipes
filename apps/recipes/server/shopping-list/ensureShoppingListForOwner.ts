import "server-only"

import { getDbPool } from "@recipes/server/db/pool"

export type ShoppingListRow = {
  id: number
  ownerSub: string
  title: string
  createdAt: string
  updatedAt: string
}

export async function ensureShoppingListForOwner(ownerSub: string) {
  const pool = await getDbPool()
  const result = await pool.query<ShoppingListRow>(
    'insert into shopping_lists (owner_sub) values ($1) on conflict (owner_sub) do update set owner_sub = excluded.owner_sub returning id, owner_sub as "ownerSub", title, created_at as "createdAt", updated_at as "updatedAt"',
    [ownerSub]
  )

  const shoppingList = result.rows[0] ?? null
  if (!shoppingList) {
    throw new Error("Shopping list upsert succeeded but returned no row")
  }

  return shoppingList
}
