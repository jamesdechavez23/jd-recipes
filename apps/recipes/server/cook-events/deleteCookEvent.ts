import "server-only"

import { ensureCookEventOwnership } from "@recipes/server/cook-events/ensureCookEventOwnership"
import { withDbTransaction } from "@recipes/server/db/pool"
import { deleteCookEventObjects } from "@recipes/server/s3/deleteCookEventObjects"

type ExistingImageRow = {
  s3Key: string
}

export async function deleteCookEvent(input: {
  cookEventId: number
  recipeId: number
  ownerSub: string
}): Promise<void> {
  await ensureCookEventOwnership({
    cookEventId: input.cookEventId,
    recipeId: input.recipeId,
    userSub: input.ownerSub
  })

  let removedImageKeys: string[] = []

  await withDbTransaction(async (client) => {
    const existingImagesResult = await client.query<ExistingImageRow>(
      'select s3_key as "s3Key" from cook_event_images where cook_event_id = $1 order by display_order asc',
      [input.cookEventId]
    )

    removedImageKeys = existingImagesResult.rows.map((image) => image.s3Key)

    const deleteResult = await client.query(
      "delete from cook_events where id = $1 and recipe_id = $2 and owner_sub = $3",
      [input.cookEventId, input.recipeId, input.ownerSub]
    )

    if (deleteResult.rowCount !== 1) {
      throw new Error(
        "Cook event delete succeeded but affected an unexpected number of rows"
      )
    }
  })

  await deleteCookEventObjects(removedImageKeys)
}
