import "server-only"

import { withDbTransaction } from "@recipes/server/db/pool"

export class ShoppingListItemError extends Error {
  httpStatus: number

  constructor(httpStatus: number, message: string) {
    super(message)
    this.name = "ShoppingListItemError"
    this.httpStatus = httpStatus
  }
}

type DeletedItemRow = {
  shoppingListId: number
}

export async function removeShoppingListItem(input: {
  ownerSub: string
  shoppingListItemId: number
}) {
  return withDbTransaction(async (client) => {
    const deleteResult = await client.query<DeletedItemRow>(
      'delete from shopping_list_items sli using shopping_lists sl where sli.id = $1 and sli.shopping_list_id = sl.id and sl.owner_sub = $2 returning sli.shopping_list_id as "shoppingListId"',
      [input.shoppingListItemId, input.ownerSub]
    )

    const deletedItem = deleteResult.rows[0] ?? null
    if (!deletedItem) {
      throw new ShoppingListItemError(404, "Shopping list item not found")
    }

    await client.query(
      "update shopping_lists set updated_at = now() where id = $1",
      [deletedItem.shoppingListId]
    )
  })
}
