import "server-only"

import { withDbTransaction } from "@recipes/server/db/pool"
import { ensureRecipeOwnership } from "@recipes/server/recipes/ensureRecipeOwnership"

export type CookEventImageInput = {
  s3Key: string
  mimeType: string
  sizeBytes?: number | null
  originalFilename?: string | null
}

export type CreateCookEventInput = {
  recipeId: number
  ownerSub: string
  cookedAt: Date
  note?: string | null
  images?: CookEventImageInput[]
}

export type CreatedCookEvent = {
  id: number
  recipe_id: number
  owner_sub: string
  cooked_at: string
  note: string | null
  created_at: string
  updated_at: string
}

export class CreateCookEventError extends Error {
  httpStatus: number

  constructor(httpStatus: number, message: string) {
    super(message)
    this.name = "CreateCookEventError"
    this.httpStatus = httpStatus
  }
}

function sanitizeNote(note: string | null | undefined) {
  const trimmed = typeof note === "string" ? note.trim() : ""
  return trimmed || null
}

export async function createCookEvent(
  input: CreateCookEventInput
): Promise<CreatedCookEvent> {
  await ensureRecipeOwnership(input.recipeId, input.ownerSub)

  const note = sanitizeNote(input.note)
  const images = input.images ?? []

  if (!note && images.length === 0) {
    throw new CreateCookEventError(
      400,
      "Add a note or a photo before saving this cook event."
    )
  }

  return withDbTransaction(async (client) => {
    const eventResult = await client.query<CreatedCookEvent>(
      "insert into cook_events (recipe_id, owner_sub, cooked_at, note) values ($1, $2, $3, $4) returning *",
      [input.recipeId, input.ownerSub, input.cookedAt.toISOString(), note]
    )

    const event = eventResult.rows[0] ?? null
    if (!event) {
      throw new Error("Insert cook event succeeded but returned no row")
    }

    for (const [index, image] of images.entries()) {
      await client.query(
        "insert into cook_event_images (cook_event_id, s3_key, mime_type, size_bytes, original_filename, display_order) values ($1, $2, $3, $4, $5, $6)",
        [
          event.id,
          image.s3Key,
          image.mimeType,
          image.sizeBytes ?? null,
          image.originalFilename ?? null,
          index + 1
        ]
      )
    }

    return event
  })
}
