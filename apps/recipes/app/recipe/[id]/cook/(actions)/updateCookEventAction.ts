"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  CurrentUserError,
  requireCurrentUser
} from "@recipes/server/auth/requireCurrentUser"
import { CookEventOwnershipError } from "@recipes/server/cook-events/ensureCookEventOwnership"
import {
  updateCookEvent,
  UpdateCookEventError
} from "@recipes/server/cook-events/updateCookEvent"

import type { RecordCookEventActionState } from "../(ui)/actionTypes"

function asTrimmedString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return ""
  return value.trim()
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function parseBoolean(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return false

  const normalized = value.trim().toLowerCase()
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  )
}

export default async function updateCookEventAction(
  recipeId: number,
  cookEventId: number,
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
  const removeImage = parseBoolean(formData.get("removeImage"))
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

  try {
    await updateCookEvent({
      cookEventId,
      recipeId,
      ownerSub: currentUser.sub,
      cookedAt,
      note: note || null,
      image: hasImageMetadata
        ? {
            s3Key: imageKey,
            mimeType: imageContentType,
            sizeBytes: parsePositiveNumber(imageSizeRaw),
            originalFilename: imageOriginalFilename || null
          }
        : null,
      removeExistingImage: removeImage
    })
  } catch (error) {
    if (
      error instanceof CurrentUserError ||
      error instanceof CookEventOwnershipError ||
      error instanceof UpdateCookEventError
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

  revalidatePath(`/recipe/${recipeId}`)
  revalidatePath(`/recipe/${recipeId}/cook`)
  revalidatePath(`/recipe/${recipeId}/cook/${cookEventId}/edit`)
  redirect(`/recipe/${recipeId}`)
}
