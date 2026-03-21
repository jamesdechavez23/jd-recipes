import "server-only"

import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { getCookEventBucketName, getS3Client } from "@recipes/server/s3/client"

const PRESIGNED_READ_TTL_SECONDS = 60 * 60

export async function presignCookEventReadUrl(key: string) {
  const bucket = getCookEventBucketName()

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key
    }),
    {
      expiresIn: PRESIGNED_READ_TTL_SECONDS
    }
  )
}
