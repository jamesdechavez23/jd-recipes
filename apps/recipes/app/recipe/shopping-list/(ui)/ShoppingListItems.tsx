"use client"

import Link from "next/link"
import { useActionState } from "react"
import { Check } from "lucide-react"

import { Alert, AlertDescription } from "@repo/ui/shadcn/alert"
import { Button } from "@repo/ui/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/shadcn/card"

import removeShoppingListItemAction from "../(actions)/removeShoppingListItemAction"
import type { RemoveShoppingListItemActionState } from "./actionTypes"
import type { ShoppingListItem } from "@recipes/server/shopping-list/getShoppingListByOwner"

function formatIngredientAmount(item: ShoppingListItem) {
  if (item.quantityDisplay) {
    return item.unit
      ? `${item.quantityDisplay} ${item.unit}`
      : item.quantityDisplay
  }

  if (item.quantity !== null && item.quantity !== undefined) {
    return item.unit ? `${item.quantity} ${item.unit}` : String(item.quantity)
  }

  return null
}

type ShoppingListGroup = {
  key: string
  recipeId: number | null
  recipeName: string | null
  items: ShoppingListItem[]
}

function ShoppingListItemRow({ item }: { item: ShoppingListItem }) {
  const [removeState, formAction, isPending] = useActionState<
    RemoveShoppingListItemActionState,
    FormData
  >(removeShoppingListItemAction, { status: "idle" })

  const amount = formatIngredientAmount(item)

  return (
    <li>
      <form action={formAction}>
        <input
          type="hidden"
          name="shoppingListItemId"
          value={String(item.id)}
        />
        <Button
          type="submit"
          variant="outline"
          disabled={isPending}
          className="h-auto w-full justify-between rounded-lg border-border/60 px-4 py-4 text-left"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-medium">{item.ingredientName}</span>
              {item.itemNote ? (
                <span className="text-xs text-muted-foreground">
                  {item.itemNote}
                </span>
              ) : null}
            </span>
          </span>

          <span className="ml-4 flex items-center gap-3 text-sm text-muted-foreground">
            {amount ? <span>{amount}</span> : null}
            <Check className="h-4 w-4" />
          </span>
        </Button>
      </form>

      {removeState.status === "error" ? (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{removeState.message}</AlertDescription>
        </Alert>
      ) : null}
    </li>
  )
}

export default function ShoppingListItems({
  items
}: {
  items: ShoppingListItem[]
}) {
  const groups = items.reduce<ShoppingListGroup[]>((acc, item) => {
    const key = item.addedFromRecipeId
      ? `recipe-${item.addedFromRecipeId}`
      : "recipe-none"
    const existingGroup = acc.find((group) => group.key === key)

    if (existingGroup) {
      existingGroup.items.push(item)
      return acc
    }

    acc.push({
      key,
      recipeId: item.addedFromRecipeId,
      recipeName: item.addedFromRecipeName,
      items: [item]
    })
    return acc
  }, [])

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your shopping list is empty</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Open a recipe and add its ingredients to start building your list.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Items to buy</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
              {group.recipeId ? (
                <Link
                  href={`/recipe/${group.recipeId}`}
                  className="text-lg font-semibold underline-offset-4 hover:underline"
                >
                  {group.recipeName || "Recipe"}
                </Link>
              ) : (
                <h2 className="text-lg font-semibold">Other items</h2>
              )}
              <p className="text-sm text-muted-foreground">
                {group.items.length} item{group.items.length === 1 ? "" : "s"}
              </p>
            </div>

            <ul className="flex flex-col gap-3">
              {group.items.map((item) => (
                <ShoppingListItemRow key={item.id} item={item} />
              ))}
            </ul>
          </section>
        ))}
      </CardContent>
    </Card>
  )
}
