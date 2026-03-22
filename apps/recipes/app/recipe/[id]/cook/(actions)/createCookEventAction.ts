"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  CurrentUserError,
  requireCurrentUser
} from "@recipes/server/auth/requireCurrentUser"
import {
  createCookEvent,
  CreateCookEventError
} from "@recipes/server/cook-events/createCookEvent"
import { RecipeOwnershipError } from "@recipes/server/recipes/ensureRecipeOwnership"
import { getDbPool } from "@recipes/server/db/pool"
import { isCognitoAdmin } from "@recipes/utils/cognitoJwt"

import type { RecordCookEventActionState } from "../(ui)/actionTypes"

function asTrimmedString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return ""
  return value.trim()
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export default async function createCookEventAction(
  recipeId: number,
  _prevState: RecordCookEventActionState,
  formData: FormData
): Promise<RecordCookEventActionState> {
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

  const cookedAtRaw = asTrimmedString(formData.get("cookedAt"))
  const note = asTrimmedString(formData.get("note"))
  const imageKey = asTrimmedString(formData.get("imageKey"))
  const imageContentType = asTrimmedString(formData.get("imageContentType"))
  const imageSizeRaw = asTrimmedString(formData.get("imageSize"))
  const imageOriginalFilename = asTrimmedString(
    formData.get("imageOriginalFilename")
  )

  const cookedAt = cookedAtRaw ? new Date(cookedAtRaw) : new Date(NaN)
  if (Number.isNaN(cookedAt.getTime())) {
    return {
      status: "error",
      message: "Please provide a valid cook date and time."
    }
  }

  const hasImageMetadata = Boolean(imageKey || imageContentType || imageSizeRaw)
  if (hasImageMetadata && (!imageKey || !imageContentType)) {
    return {
      status: "error",
      message: "Uploaded image metadata is incomplete. Please try again."
    }
  }

  let cookEventId: number | null = null

  try {
    if (!isCognitoAdmin(currentUser.payload)) {
      const pool = await getDbPool()
      const countResult = await pool.query<{ cnt: number }>(
        "select count(*)::int as cnt from cook_events where recipe_id = $1 and owner_sub = $2",
        [recipeId, currentUser.sub]
      )
      const existing = Number(countResult.rows[0]?.cnt ?? 0)
      if (existing >= 1) {
        return {
          status: "error",
          httpStatus: 400,
          message:
            "Only one cook event allowed per recipe. Upgrade to create more."
        }
      }
    }

    const cookEvent = await createCookEvent({
      recipeId,
      ownerSub: currentUser.sub,
      cookedAt,
      note: note || null,
      images: hasImageMetadata
        ? [
            {
              s3Key: imageKey,
              mimeType: imageContentType,
              sizeBytes: parsePositiveNumber(imageSizeRaw),
              originalFilename: imageOriginalFilename || null
            }
          ]
        : undefined
    })

    cookEventId = cookEvent.id
  } catch (error) {
    if (
      error instanceof CurrentUserError ||
      error instanceof RecipeOwnershipError ||
      error instanceof CreateCookEventError
    ) {
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

  if (!cookEventId) {
    return {
      status: "error",
      message: "Cook event was created, but no id was returned."
    }
  }

  revalidatePath(`/recipe/${recipeId}`)
  revalidatePath(`/recipe/${recipeId}/cook`)
  redirect(`/recipe/${recipeId}`)
}
