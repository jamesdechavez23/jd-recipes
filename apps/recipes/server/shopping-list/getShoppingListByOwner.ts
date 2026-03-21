import "server-only"

import { getDbPool } from "@recipes/server/db/pool"

import {
  ensureShoppingListForOwner,
  type ShoppingListRow
} from "./ensureShoppingListForOwner"

export type ShoppingListItem = {
  id: number
  ingredientId: number | null
  ingredientName: string
  quantity: number | null
  quantityDisplay: string | null
  unit: string | null
  itemNote: string | null
  addedFromRecipeId: number | null
  addedFromRecipeName: string | null
  createdAt: string
}

export type ShoppingListByOwner = ShoppingListRow & {
  items: ShoppingListItem[]
}

type ShoppingListItemRow = {
  id: number
  ingredientId: number | null
  ingredientName: string
  quantity: number | null
  quantityDisplay: string | null
  unit: string | null
  itemNote: string | null
  addedFromRecipeId: number | null
  addedFromRecipeName: string | null
  createdAt: string
}

export async function getShoppingListByOwner(
  ownerSub: string
): Promise<ShoppingListByOwner> {
  const shoppingList = await ensureShoppingListForOwner(ownerSub)
  const pool = await getDbPool()

  const itemsResult = await pool.query<ShoppingListItemRow>(
    'select sli.id, sli.ingredient_id as "ingredientId", sli.ingredient_name_snapshot as "ingredientName", sli.quantity, sli.quantity_display as "quantityDisplay", sli.unit, sli.item_note as "itemNote", sli.added_from_recipe_id as "addedFromRecipeId", r.name as "addedFromRecipeName", sli.created_at as "createdAt" from shopping_list_items sli left join recipes r on r.id = sli.added_from_recipe_id where sli.shopping_list_id = $1 and sli.is_checked = false order by sli.created_at asc, sli.id asc',
    [shoppingList.id]
  )

  return {
    ...shoppingList,
    items: itemsResult.rows
  }
}
