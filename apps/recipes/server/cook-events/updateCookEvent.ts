import "server-only"

import type { CookEventImageInput } from "@recipes/server/cook-events/createCookEvent"
import {
  ensureCookEventOwnership,
  type OwnedCookEventRow
} from "@recipes/server/cook-events/ensureCookEventOwnership"
import { withDbTransaction } from "@recipes/server/db/pool"
import { deleteCookEventObjects } from "@recipes/server/s3/deleteCookEventObjects"

export type UpdateCookEventInput = {
  cookEventId: number
  recipeId: number
  ownerSub: string
  cookedAt: Date
  note?: string | null
  image?: CookEventImageInput | null
  removeExistingImage?: boolean
}

export class UpdateCookEventError extends Error {
  httpStatus: number

  constructor(httpStatus: number, message: string) {
    super(message)
    this.name = "UpdateCookEventError"
    this.httpStatus = httpStatus
  }
}

type ExistingImageRow = {
  s3Key: string
}

function sanitizeNote(note: string | null | undefined) {
  const trimmed = typeof note === "string" ? note.trim() : ""
  return trimmed || null
}

export async function updateCookEvent(
  input: UpdateCookEventInput
): Promise<OwnedCookEventRow> {
  await ensureCookEventOwnership({
    cookEventId: input.cookEventId,
    recipeId: input.recipeId,
    userSub: input.ownerSub
  })

  const note = sanitizeNote(input.note)
  const nextImage = input.image ?? null
  let removedImageKeys: string[] = []

  const updatedCookEvent = await withDbTransaction(async (client) => {
    const existingImagesResult = await client.query<ExistingImageRow>(
      'select s3_key as "s3Key" from cook_event_images where cook_event_id = $1 order by display_order asc',
      [input.cookEventId]
    )

    const existingImages = existingImagesResult.rows
    const willHaveImage = nextImage
      ? true
      : input.removeExistingImage
        ? false
        : existingImages.length > 0

    if (!note && !willHaveImage) {
      throw new UpdateCookEventError(
        400,
        "Add a note or a photo before saving this cook event."
      )
    }

    const eventResult = await client.query<OwnedCookEventRow>(
      'update cook_events set cooked_at = $1, note = $2, updated_at = now() where id = $3 and recipe_id = $4 and owner_sub = $5 returning id, recipe_id as "recipeId", owner_sub as "ownerSub", cooked_at as "cookedAt", note, created_at as "createdAt", updated_at as "updatedAt"',
      [
        input.cookedAt.toISOString(),
        note,
        input.cookEventId,
        input.recipeId,
        input.ownerSub
      ]
    )

    const updatedEvent = eventResult.rows[0] ?? null
    if (!updatedEvent) {
      throw new Error("Cook event update succeeded but returned no row")
    }

    const shouldReplaceExistingImages =
      Boolean(nextImage) || Boolean(input.removeExistingImage)

    if (shouldReplaceExistingImages) {
      removedImageKeys = existingImages.map((image) => image.s3Key)

      await client.query(
        "delete from cook_event_images where cook_event_id = $1",
        [input.cookEventId]
      )
    }

    if (nextImage) {
      await client.query(
        "insert into cook_event_images (cook_event_id, s3_key, mime_type, size_bytes, original_filename, display_order) values ($1, $2, $3, $4, $5, $6)",
        [
          input.cookEventId,
          nextImage.s3Key,
          nextImage.mimeType,
          nextImage.sizeBytes ?? null,
          nextImage.originalFilename ?? null,
          1
        ]
      )
    }

    return updatedEvent
  })

  await deleteCookEventObjects(removedImageKeys)

  return updatedCookEvent
}
