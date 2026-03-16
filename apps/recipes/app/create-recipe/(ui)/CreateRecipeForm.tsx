"use client"

import { useActionState } from "react"
import { Button } from "@repo/ui/shadcn/button"
import type { CreateRecipeActionState } from "../(actions)/createRecipeAction"

interface CreateRecipeFormProps {
  createRecipeAction: (
    prevState: CreateRecipeActionState,
    formData: FormData
  ) => Promise<CreateRecipeActionState>
}

export default function CreateRecipeForm({
  createRecipeAction
}: CreateRecipeFormProps) {
  const [state, formAction, isPending] = useActionState<
    CreateRecipeActionState,
    FormData
  >(createRecipeAction, { status: "idle" })

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-xl">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Name</span>
        <input
          name="name"
          required
          className="border rounded px-3 py-2"
          placeholder="Beef and Broccoli"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Description</span>
        <textarea
          name="description"
          className="border rounded px-3 py-2"
          placeholder="Optional"
          rows={3}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Instructions</span>
        <textarea
          name="instructions"
          className="border rounded px-3 py-2"
          placeholder={
            "One step per line\nExample:\nBoil water\nSalt water\nCook pasta"
          }
          rows={8}
        />
        <span className="text-xs text-muted-foreground">
          One step per line. Blank lines are ignored.
        </span>
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create"}
        </Button>
      </div>

      {state.status === "error" ? (
        <p className="text-sm text-red-600">{state.message}</p>
      ) : null}

      {state.status === "success" ? (
        <pre className="text-sm border rounded p-3 whitespace-pre-wrap wrap-break-word">
          {JSON.stringify(state.recipe, null, 2)}
        </pre>
      ) : null}
    </form>
  )
}
