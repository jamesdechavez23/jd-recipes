import { NextResponse } from "next/server"

import {
  CurrentUserError,
  requireCurrentUser
} from "@recipes/server/auth/requireCurrentUser"
import {
  presignCookEventUpload,
  PresignCookEventUploadError
} from "@recipes/server/s3/presignCookEventUpload"

type PresignUploadBody = {
  filename?: unknown
  contentType?: unknown
  recipeId?: unknown
}

function coerceOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function coerceOptionalRecipeId(value: unknown) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function GET() {
  let currentUser
  try {
    currentUser = await requireCurrentUser()
  } catch (error) {
    if (error instanceof CurrentUserError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.httpStatus }
      )
    }

    return NextResponse.json(
      { error: "Missing auth token. Please log in again." },
      { status: 401 }
    )
  }

  const presignedUpload = await presignCookEventUpload({
    userSub: currentUser.sub,
    filename: "sanity-check.jpg",
    contentType: "image/jpeg"
  })

  return NextResponse.json({
    ok: true,
    message: "S3 upload presign succeeded.",
    ...presignedUpload
  })
}

export async function POST(request: Request) {
  let currentUser
  try {
    currentUser = await requireCurrentUser()
  } catch (error) {
    if (error instanceof CurrentUserError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.httpStatus }
      )
    }

    return NextResponse.json(
      { error: "Missing auth token. Please log in again." },
      { status: 401 }
    )
  }

  let body: PresignUploadBody
  try {
    body = (await request.json()) as PresignUploadBody
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    )
  }

  const contentType = coerceOptionalString(body.contentType)
  if (!contentType) {
    return NextResponse.json(
      { error: "contentType is required." },
      { status: 400 }
    )
  }

  try {
    const presignedUpload = await presignCookEventUpload({
      userSub: currentUser.sub,
      filename: coerceOptionalString(body.filename) || undefined,
      contentType,
      recipeId: coerceOptionalRecipeId(body.recipeId)
    })

    return NextResponse.json(presignedUpload)
  } catch (error) {
    if (error instanceof PresignCookEventUploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.httpStatus }
      )
    }

    throw error
  }
}
