import "server-only"

import { DeleteObjectCommand } from "@aws-sdk/client-s3"

import { getCookEventBucketName, getS3Client } from "./client"

export async function deleteCookEventObjects(keys: string[]) {
  const uniqueKeys = [...new Set(keys.map((key) => key.trim()).filter(Boolean))]
  if (uniqueKeys.length === 0) {
    return
  }

  const client = getS3Client()
  const bucket = getCookEventBucketName()
  const results = await Promise.allSettled(
    uniqueKeys.map((key) =>
      client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key
        })
      )
    )
  )

  const failedKeys = results.flatMap((result, index) =>
    result.status === "rejected" ? [uniqueKeys[index]] : []
  )

  if (failedKeys.length > 0) {
    console.error("Failed to delete cook event image objects from S3", {
      failedKeys
    })
  }
}
