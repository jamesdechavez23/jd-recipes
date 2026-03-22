"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { MoreHorizontal } from "lucide-react"

import { Alert, AlertDescription } from "@repo/ui/shadcn/alert"
import { Button } from "@repo/ui/shadcn/button"

import type { RecipeDeleteActionState } from "../../new/(ui)/create-recipe-form/actionTypes"
import type { AddRecipeIngredientsToShoppingListActionState } from "../../shopping-list/(ui)/actionTypes"
import AddRecipeIngredientsDialog from "./AddRecipeIngredientsDialog"
import type { RecipeIngredient } from "@recipes/server/recipes/getRecipeById"

type RecipeDetailActionsProps = {
  editHref: string
  cookHref: string
  recipeName: string
  recipeIngredients: RecipeIngredient[]
  shoppingListHref: string
  addToShoppingListAction: (
    prevState: AddRecipeIngredientsToShoppingListActionState,
    formData: FormData
  ) => Promise<AddRecipeIngredientsToShoppingListActionState>
  deleteRecipeAction: (
    prevState: RecipeDeleteActionState,
    formData: FormData
  ) => Promise<RecipeDeleteActionState>
}

export default function RecipeDetailActions({
  editHref,
  cookHref,
  recipeName,
  recipeIngredients,
  shoppingListHref,
  addToShoppingListAction,
  deleteRecipeAction
}: RecipeDetailActionsProps) {
  const [shoppingListState, setShoppingListState] =
    useState<AddRecipeIngredientsToShoppingListActionState>({ status: "idle" })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [deleteState, formAction, isPending] = useActionState(
    deleteRecipeAction,
    { status: "idle" }
  )

  return (
    <div className="flex flex-col gap-3">
      {deleteState.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{deleteState.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="hidden flex-wrap gap-2 md:flex">
        <Button asChild>
          <Link href={editHref}>Edit recipe</Link>
        </Button>

        <Button asChild variant="outline">
          <Link href={cookHref}>I cooked this</Link>
        </Button>

        <AddRecipeIngredientsDialog
          recipeName={recipeName}
          ingredients={recipeIngredients}
          onActionStateChange={setShoppingListState}
          addToShoppingListAction={addToShoppingListAction}
        />

        <form
          action={formAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                "Delete this recipe? This also removes all linked steps and ingredients."
              )
            ) {
              event.preventDefault()
            }
          }}
        >
          <Button type="submit" variant="destructive" disabled={isPending}>
            {isPending ? "Deleting…" : "Delete recipe"}
          </Button>
        </form>
      </div>

      <div className="md:hidden">
        <div className="w-full">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            aria-haspopup="menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span className="flex items-center gap-2">
              <MoreHorizontal className="h-4 w-4" />
              Actions
            </span>
          </Button>

          {mobileMenuOpen ? (
            <div className="mt-2 flex w-full flex-col rounded-lg border border-border bg-background p-2 shadow-lg">
              <Button
                asChild
                variant="ghost"
                className="justify-start"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href={editHref}>Edit recipe</Link>
              </Button>

              <Button
                asChild
                variant="ghost"
                className="justify-start"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href={cookHref}>I cooked this</Link>
              </Button>

              <AddRecipeIngredientsDialog
                recipeName={recipeName}
                ingredients={recipeIngredients}
                onActionStateChange={setShoppingListState}
                addToShoppingListAction={addToShoppingListAction}
              />

              <form
                action={formAction}
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      "Delete this recipe? This also removes all linked steps and ingredients."
                    )
                  ) {
                    event.preventDefault()
                    return
                  }

                  setMobileMenuOpen(false)
                }}
              >
                <Button
                  type="submit"
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  disabled={isPending}
                >
                  {isPending ? "Deleting…" : "Delete recipe"}
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </div>

      {shoppingListState.status === "success" ? (
        <Alert variant="success">
          <AlertDescription>
            {shoppingListState.addedCount > 0
              ? `Added ${shoppingListState.addedCount} ingredient${shoppingListState.addedCount === 1 ? "" : "s"} to your shopping list.`
              : "All selected ingredients are already on your shopping list."}{" "}
            {shoppingListState.skippedCount > 0
              ? `Skipped ${shoppingListState.skippedCount} duplicate${shoppingListState.skippedCount === 1 ? "" : "s"}. `
              : ""}
            <Link
              href={shoppingListHref}
              className="underline underline-offset-4"
            >
              View shopping list
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      {shoppingListState.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{shoppingListState.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
