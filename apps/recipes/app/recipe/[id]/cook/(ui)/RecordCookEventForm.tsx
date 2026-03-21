"use client"

import Link from "next/link"
import {
  startTransition,
  useActionState,
  useMemo,
  useRef,
  useState
} from "react"

import { Alert, AlertDescription } from "@repo/ui/shadcn/alert"
import { Button } from "@repo/ui/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/shadcn/card"
import { Input } from "@repo/ui/shadcn/input"
import { Label } from "@repo/ui/shadcn/label"
import { Textarea } from "@repo/ui/shadcn/textarea"

import type { RecordCookEventActionState } from "./actionTypes"

type ExistingCookEventImage = {
  imageUrl: string
  originalFilename: string | null
}

type CookEventFormInitialData = {
  cookedAt: string
  note: string
  image?: ExistingCookEventImage | null
}

type RecordCookEventFormProps = {
  recipeId: number
  recipeName: string
  saveCookEventAction: (
    prevState: RecordCookEventActionState,
    formData: FormData
  ) => Promise<RecordCookEventActionState>
  mode?: "create" | "edit"
  initialCookEvent?: CookEventFormInitialData
  cancelHref?: string
}

type PresignedUploadPayload = {
  bucket: string
  key: string
  method: "PUT"
  uploadUrl: string
  contentType: string
  expiresInSeconds: number
}

function toDatetimeLocalValue(date: Date) {
  const copy = new Date(date)
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset())
  return copy.toISOString().slice(0, 16)
}

export default function RecordCookEventForm({
  recipeId,
  recipeName,
  saveCookEventAction,
  mode = "create",
  initialCookEvent,
  cancelHref
}: RecordCookEventFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [state, formAction, pending] = useActionState(saveCookEventAction, {
    status: "idle"
  })
  const [clientError, setClientError] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [removeExistingImage, setRemoveExistingImage] = useState(false)
  const existingImage = initialCookEvent?.image ?? null
  const defaultCookedAtValue = useMemo(() => {
    if (initialCookEvent?.cookedAt) {
      return toDatetimeLocalValue(new Date(initialCookEvent.cookedAt))
    }

    return toDatetimeLocalValue(new Date())
  }, [initialCookEvent?.cookedAt])
  const title = mode === "edit" ? "Edit cook event" : "Record cook event"
  const description =
    mode === "edit"
      ? `Update when you cooked ${recipeName}, and adjust the photo or notes.`
      : `Save when you cooked ${recipeName}, with an optional photo and notes.`
  const submitLabel = mode === "edit" ? "Save changes" : "Save cook event"
  const pendingLabel = mode === "edit" ? "Saving changes…" : "Saving…"
  const cancelTarget = cancelHref ?? `/recipe/${recipeId}`

  async function uploadSelectedImage(file: File) {
    const presignResponse = await fetch("/api/cook-events/presign-upload", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        recipeId,
        filename: file.name,
        contentType: file.type
      })
    })

    const presignPayload = (await presignResponse.json()) as
      | PresignedUploadPayload
      | { error?: string }

    if (!presignResponse.ok || !("uploadUrl" in presignPayload)) {
      throw new Error(
        ("error" in presignPayload && presignPayload.error) ||
          "Failed to prepare image upload."
      )
    }

    const uploadResponse = await fetch(presignPayload.uploadUrl, {
      method: presignPayload.method,
      headers: {
        "Content-Type": presignPayload.contentType
      },
      body: file
    })

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload image to S3.")
    }

    return presignPayload
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {state.status === "error" ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        {clientError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{clientError}</AlertDescription>
          </Alert>
        ) : null}

        <form
          ref={formRef}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            setClientError(null)

            const form = formRef.current
            if (!form) return

            const nextFormData = new FormData(form)
            const selectedFile = nextFormData.get("photo")
            const file =
              selectedFile instanceof File && selectedFile.size > 0
                ? selectedFile
                : null

            const submit = async () => {
              if (file) {
                setIsUploadingImage(true)
                try {
                  const uploadedImage = await uploadSelectedImage(file)
                  nextFormData.set("imageKey", uploadedImage.key)
                  nextFormData.set(
                    "imageContentType",
                    uploadedImage.contentType
                  )
                  nextFormData.set("imageSize", String(file.size))
                  nextFormData.set("imageOriginalFilename", file.name)
                } finally {
                  setIsUploadingImage(false)
                }
              }

              startTransition(() => {
                formAction(nextFormData)
              })
            }

            submit().catch((error) => {
              setClientError(
                error instanceof Error ? error.message : String(error)
              )
            })
          }}
        >
          <input type="hidden" name="recipeId" value={String(recipeId)} />

          <div className="space-y-1">
            <Label htmlFor="cookedAt">Cooked at</Label>
            <Input
              id="cookedAt"
              name="cookedAt"
              type="datetime-local"
              required
              defaultValue={defaultCookedAtValue}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="note">Notes</Label>
            <Textarea
              id="note"
              name="note"
              placeholder="Used too much salt, needed 5 more minutes, turned out great with extra lemon..."
              rows={5}
              defaultValue={initialCookEvent?.note ?? ""}
            />
          </div>

          {existingImage ? (
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Current photo</p>
                {selectedFileName ? (
                  <p className="text-xs text-muted-foreground">
                    Saving this form will replace the current photo with the new
                    file.
                  </p>
                ) : removeExistingImage ? (
                  <p className="text-xs text-muted-foreground">
                    Saving this form will remove the current photo.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {existingImage.originalFilename || "Current uploaded photo"}
                  </p>
                )}
              </div>

              {!selectedFileName && !removeExistingImage ? (
                <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
                  <img
                    src={existingImage.imageUrl}
                    alt={existingImage.originalFilename || "Cook event photo"}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
              ) : null}

              <label className="flex items-center gap-2 text-sm text-foreground/90">
                <input
                  type="checkbox"
                  name="removeImage"
                  value="true"
                  checked={removeExistingImage}
                  onChange={(event) => {
                    setRemoveExistingImage(event.target.checked)
                  }}
                />
                Remove current photo
              </label>
            </div>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="photo">Photo</Label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none file:mr-3 file:rounded file:border-0 file:bg-transparent file:text-sm file:font-medium"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                setSelectedFileName(file?.name ?? null)
                if (file) {
                  setRemoveExistingImage(false)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              On a phone, this can open the camera or photo library. On desktop,
              it opens the file chooser.
            </p>
            {selectedFileName ? (
              <p className="text-xs text-muted-foreground">
                Selected file: {selectedFileName}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || isUploadingImage}>
              {isUploadingImage
                ? "Uploading image…"
                : pending
                  ? pendingLabel
                  : submitLabel}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={cancelTarget}>Cancel</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
