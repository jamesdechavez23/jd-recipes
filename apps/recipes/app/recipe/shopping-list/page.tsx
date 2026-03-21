import ShoppingListItems from "./(ui)/ShoppingListItems"
import { requireCurrentUser } from "@recipes/server/auth/requireCurrentUser"
import { getShoppingListByOwner } from "@recipes/server/shopping-list/getShoppingListByOwner"

export default async function ShoppingListPage() {
  const currentUser = await requireCurrentUser()
  const shoppingList = await getShoppingListByOwner(currentUser.sub)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Shopping list</h1>
        <p className="text-muted-foreground">
          Ingredients you still need to buy for upcoming recipes.
        </p>
      </div>

      <ShoppingListItems items={shoppingList.items} />
    </main>
  )
}
