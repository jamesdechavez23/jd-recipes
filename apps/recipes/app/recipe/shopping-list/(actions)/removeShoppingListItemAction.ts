"use server"

import "server-only"

import { revalidatePath } from "next/cache"

import type { RemoveShoppingListItemActionState } from "../(ui)/actionTypes"
import {
  CurrentUserError,
  requireCurrentUser
} from "@recipes/server/auth/requireCurrentUser"
import {
  removeShoppingListItem,
  ShoppingListItemError
} from "@recipes/server/shopping-list/removeShoppingListItem"

function parsePositiveInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export default async function removeShoppingListItemAction(
  _prevState: RemoveShoppingListItemActionState,
  formData: FormData
): Promise<RemoveShoppingListItemActionState> {
  let currentUser
  try {
    currentUser = await requireCurrentUser()
  } catch (error) {
    if (error instanceof CurrentUserError) {
      return {
        status: "error",
        httpStatus: error.httpStatus,
        message: error.message
      }
    }

    return {
      status: "error",
      httpStatus: 401,
      message: "Missing auth token. Please log in again."
    }
  }

  const shoppingListItemId = parsePositiveInteger(
    formData.get("shoppingListItemId")
  )
  if (!shoppingListItemId) {
    return {
      status: "error",
      message: "Shopping list item id is invalid."
    }
  }

  try {
    await removeShoppingListItem({
      ownerSub: currentUser.sub,
      shoppingListItemId
    })
  } catch (error) {
    if (error instanceof ShoppingListItemError) {
      return {
        status: "error",
        httpStatus: error.httpStatus,
        message: error.message
      }
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : String(error)
    }
  }

  revalidatePath("/recipe/shopping-list")
  return { status: "idle" }
}
