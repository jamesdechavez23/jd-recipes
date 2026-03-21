import "server-only"

import { randomUUID } from "node:crypto"

import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { getCookEventBucketName, getS3Client } from "@recipes/server/s3/client"

const PRESIGNED_UPLOAD_TTL_SECONDS = 60 * 5

const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
])

const CONTENT_TYPE_FILE_EXTENSIONS: Record<string, string> = {
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
}

export class PresignCookEventUploadError extends Error {
  httpStatus: number

  constructor(httpStatus: number, message: string) {
    super(message)
    this.name = "PresignCookEventUploadError"
    this.httpStatus = httpStatus
  }
}

function normalizeContentType(value: string | null | undefined) {
  if (!value) return ""
  return value.trim().toLowerCase()
}

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-")
}

function getFileExtension(contentType: string, filename?: string) {
  const normalizedFilename = filename?.trim() ?? ""
  const lastDotIndex = normalizedFilename.lastIndexOf(".")

  if (
    lastDotIndex > -1 &&
    lastDotIndex < normalizedFilename.length - 1 &&
    normalizedFilename.length - lastDotIndex <= 8
  ) {
    return normalizedFilename.slice(lastDotIndex).toLowerCase()
  }

  return CONTENT_TYPE_FILE_EXTENSIONS[contentType] ?? ""
}

export async function presignCookEventUpload(input: {
  userSub: string
  contentType: string
  filename?: string
  recipeId?: number | null
}) {
  const contentType = normalizeContentType(input.contentType)
  if (!ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
    throw new PresignCookEventUploadError(
      400,
      "Only JPEG, PNG, WebP, HEIC, and HEIF images are supported."
    )
  }

  const bucket = getCookEventBucketName()
  const recipeSegment =
    typeof input.recipeId === "number" &&
    Number.isInteger(input.recipeId) &&
    input.recipeId > 0
      ? String(input.recipeId)
      : "unlinked"
  const key = [
    "cook-events",
    sanitizePathSegment(input.userSub),
    recipeSegment,
    `${Date.now()}-${randomUUID()}${getFileExtension(contentType, input.filename)}`
  ].join("/")

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  })

  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: PRESIGNED_UPLOAD_TTL_SECONDS
  })

  return {
    bucket,
    key,
    method: "PUT" as const,
    uploadUrl,
    contentType,
    expiresInSeconds: PRESIGNED_UPLOAD_TTL_SECONDS
  }
}
