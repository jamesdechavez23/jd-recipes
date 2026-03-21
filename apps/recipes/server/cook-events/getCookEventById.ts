import "server-only"

import {
  ensureCookEventOwnership,
  type OwnedCookEventRow
} from "@recipes/server/cook-events/ensureCookEventOwnership"
import { getDbPool } from "@recipes/server/db/pool"
import { presignCookEventReadUrl } from "@recipes/server/s3/presignCookEventRead"

export type CookEventDetailImage = {
  id: number
  s3Key: string
  mimeType: string
  sizeBytes: number | null
  originalFilename: string | null
  displayOrder: number
  imageUrl: string
}

export type CookEventById = OwnedCookEventRow & {
  images: CookEventDetailImage[]
}

type CookEventImageRow = {
  id: number
  s3Key: string
  mimeType: string
  sizeBytes: number | null
  originalFilename: string | null
  displayOrder: number
}

export async function getCookEventById(input: {
  cookEventId: number
  recipeId: number
  ownerSub: string
}): Promise<CookEventById> {
  const cookEvent = await ensureCookEventOwnership({
    cookEventId: input.cookEventId,
    recipeId: input.recipeId,
    userSub: input.ownerSub
  })

  const pool = await getDbPool()
  const imagesResult = await pool.query<CookEventImageRow>(
    'select id, s3_key as "s3Key", mime_type as "mimeType", size_bytes as "sizeBytes", original_filename as "originalFilename", display_order as "displayOrder" from cook_event_images where cook_event_id = $1 order by display_order asc',
    [input.cookEventId]
  )

  const images = await Promise.all(
    imagesResult.rows.map(async (image) => ({
      id: image.id,
      s3Key: image.s3Key,
      mimeType: image.mimeType,
      sizeBytes: image.sizeBytes,
      originalFilename: image.originalFilename,
      displayOrder: image.displayOrder,
      imageUrl: await presignCookEventReadUrl(image.s3Key)
    }))
  )

  return {
    ...cookEvent,
    images
  }
}
