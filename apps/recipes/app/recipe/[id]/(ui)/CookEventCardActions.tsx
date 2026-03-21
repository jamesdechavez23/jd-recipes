"use client"

import Link from "next/link"
import { useActionState } from "react"

import { Alert, AlertDescription } from "@repo/ui/shadcn/alert"
import { Button } from "@repo/ui/shadcn/button"

import type { DeleteCookEventActionState } from "../cook/(ui)/actionTypes"

type CookEventCardActionsProps = {
  editHref: string
  deleteCookEventAction: (
    prevState: DeleteCookEventActionState,
    formData: FormData
  ) => Promise<DeleteCookEventActionState>
}

export default function CookEventCardActions({
  editHref,
  deleteCookEventAction
}: CookEventCardActionsProps) {
  const [deleteState, formAction, isPending] = useActionState(
    deleteCookEventAction,
    { status: "idle" }
  )

  return (
    <div className="flex flex-col gap-3">
      {deleteState.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{deleteState.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={editHref}>Edit event</Link>
        </Button>

        <form
          action={formAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                "Delete this cook event? Any saved photo for it will also be removed."
              )
            ) {
              event.preventDefault()
            }
          }}
        >
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            disabled={isPending}
          >
            {isPending ? "Deleting…" : "Delete event"}
          </Button>
        </form>
      </div>
    </div>
  )
}
