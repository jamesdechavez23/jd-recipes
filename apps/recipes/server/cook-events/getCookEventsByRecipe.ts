import "server-only"

import { getDbPool } from "@recipes/server/db/pool"
import { ensureRecipeOwnership } from "@recipes/server/recipes/ensureRecipeOwnership"
import { presignCookEventReadUrl } from "@recipes/server/s3/presignCookEventRead"

export type CookEventImage = {
  id: number
  s3Key: string
  mimeType: string
  sizeBytes: number | null
  originalFilename: string | null
  displayOrder: number
  imageUrl: string
}

export type CookEventListItem = {
  id: number
  recipeId: number
  ownerSub: string
  cookedAt: string
  note: string | null
  createdAt: string
  updatedAt: string
  images: CookEventImage[]
}

type CookEventRow = {
  id: number
  recipeId: number
  ownerSub: string
  cookedAt: string
  note: string | null
  createdAt: string
  updatedAt: string
}

type CookEventImageRow = {
  id: number
  cookEventId: number
  s3Key: string
  mimeType: string
  sizeBytes: number | null
  originalFilename: string | null
  displayOrder: number
}

export async function getCookEventsByRecipe(input: {
  recipeId: number
  ownerSub: string
}): Promise<CookEventListItem[]> {
  await ensureRecipeOwnership(input.recipeId, input.ownerSub)

  const pool = await getDbPool()

  const eventsResult = await pool.query<CookEventRow>(
    'select id, recipe_id as "recipeId", owner_sub as "ownerSub", cooked_at as "cookedAt", note, created_at as "createdAt", updated_at as "updatedAt" from cook_events where recipe_id = $1 and owner_sub = $2 order by cooked_at desc, created_at desc',
    [input.recipeId, input.ownerSub]
  )

  if (eventsResult.rows.length === 0) {
    return []
  }

  const imagesResult = await pool.query<CookEventImageRow>(
    'select id, cook_event_id as "cookEventId", s3_key as "s3Key", mime_type as "mimeType", size_bytes as "sizeBytes", original_filename as "originalFilename", display_order as "displayOrder" from cook_event_images where cook_event_id = any($1::int[]) order by cook_event_id asc, display_order asc',
    [eventsResult.rows.map((event) => event.id)]
  )

  const imageUrlEntries = await Promise.all(
    imagesResult.rows.map(async (image) => {
      const imageUrl = await presignCookEventReadUrl(image.s3Key)
      return [
        image.id,
        {
          id: image.id,
          s3Key: image.s3Key,
          mimeType: image.mimeType,
          sizeBytes: image.sizeBytes,
          originalFilename: image.originalFilename,
          displayOrder: image.displayOrder,
          imageUrl
        } satisfies CookEventImage
      ] as const
    })
  )

  const imagesById = new Map(imageUrlEntries)
  const imagesByEventId = new Map<number, CookEventImage[]>()

  for (const image of imagesResult.rows) {
    const resolvedImage = imagesById.get(image.id)
    if (!resolvedImage) continue

    const list = imagesByEventId.get(image.cookEventId)
    if (list) {
      list.push(resolvedImage)
    } else {
      imagesByEventId.set(image.cookEventId, [resolvedImage])
    }
  }

  return eventsResult.rows.map((event) => ({
    ...event,
    images: imagesByEventId.get(event.id) ?? []
  }))
}
