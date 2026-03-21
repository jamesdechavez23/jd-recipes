import "server-only"

import { S3Client } from "@aws-sdk/client-s3"

declare global {
  var __jdRecipesS3Client: S3Client | undefined
}

function getEnv(name: string) {
  const value = process.env[name]
  return typeof value === "string" ? value.trim() : ""
}

function getRequiredEnv(name: string) {
  const value = getEnv(name)
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getAwsRegion() {
  return getRequiredEnv("AWS_REGION")
}

export function getCookEventBucketName() {
  return getRequiredEnv("S3_COOK_EVENT_BUCKET")
}

export function getS3Client() {
  if (globalThis.__jdRecipesS3Client) {
    return globalThis.__jdRecipesS3Client
  }

  globalThis.__jdRecipesS3Client = new S3Client({
    region: getAwsRegion()
  })

  return globalThis.__jdRecipesS3Client
}
