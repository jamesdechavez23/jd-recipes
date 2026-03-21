"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import type { DeleteCookEventActionState } from "../(ui)/actionTypes"
import {
  CurrentUserError,
  requireCurrentUser
} from "@recipes/server/auth/requireCurrentUser"
import { deleteCookEvent } from "@recipes/server/cook-events/deleteCookEvent"
import { CookEventOwnershipError } from "@recipes/server/cook-events/ensureCookEventOwnership"

export default async function deleteCookEventAction(
  recipeId: number,
  cookEventId: number,
  _prevState: DeleteCookEventActionState,
  _formData: FormData
): Promise<DeleteCookEventActionState> {
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

  try {
    await deleteCookEvent({
      cookEventId,
      recipeId,
      ownerSub: currentUser.sub
    })
  } catch (error) {
    if (error instanceof CookEventOwnershipError) {
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

  revalidatePath(`/recipe/${recipeId}`)
  revalidatePath(`/recipe/${recipeId}/cook`)
  revalidatePath(`/recipe/${recipeId}/cook/${cookEventId}/edit`)
  redirect(`/recipe/${recipeId}`)
}
