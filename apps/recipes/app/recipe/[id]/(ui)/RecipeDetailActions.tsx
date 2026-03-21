"use client"

import Link from "next/link"
import { useActionState, useState } from "react"

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

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={editHref}>Edit recipe</Link>
        </Button>

        <Button asChild variant="outline">
          <Link href={cookHref}>I cooked this</Link>
        </Button>

        <AddRecipeIngredientsDialog
          recipeName={recipeName}
          shoppingListHref={shoppingListHref}
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
