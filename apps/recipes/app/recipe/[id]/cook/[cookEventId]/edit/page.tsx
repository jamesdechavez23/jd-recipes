import { notFound } from "next/navigation"

import getRecipeById from "../../../(actions)/getRecipeById"
import RecordCookEventForm from "../../(ui)/RecordCookEventForm"
import updateCookEventAction from "../../(actions)/updateCookEventAction"
import {
  CurrentUserError,
  requireCurrentUser
} from "@recipes/server/auth/requireCurrentUser"
import { getCookEventById } from "@recipes/server/cook-events/getCookEventById"
import { CookEventOwnershipError } from "@recipes/server/cook-events/ensureCookEventOwnership"

type EditCookEventPageProps = {
  params:
    | { id?: string | string[]; cookEventId?: string | string[] }
    | Promise<{ id?: string | string[]; cookEventId?: string | string[] }>
}

export default async function EditCookEventPage({
  params
}: EditCookEventPageProps) {
  const resolvedParams = await Promise.resolve(params)
  const rawRecipeId = Array.isArray(resolvedParams.id)
    ? resolvedParams.id[0]
    : resolvedParams.id
  const rawCookEventId = Array.isArray(resolvedParams.cookEventId)
    ? resolvedParams.cookEventId[0]
    : resolvedParams.cookEventId

  const recipeId = Number(rawRecipeId)
  const cookEventId = Number(rawCookEventId)

  if (
    !Number.isInteger(recipeId) ||
    recipeId <= 0 ||
    !Number.isInteger(cookEventId) ||
    cookEventId <= 0
  ) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
        <h1 className="text-2xl font-bold">Invalid Cook Event</h1>
        <p className="text-muted-foreground">
          The recipe ID and cook event ID must be positive integers.
        </p>
      </main>
    )
  }

  const recipe = await getRecipeById({ id: recipeId })

  try {
    const currentUser = await requireCurrentUser()
    const cookEvent = await getCookEventById({
      cookEventId,
      recipeId,
      ownerSub: currentUser.sub
    })

    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Edit cook event</h1>
          <p className="text-muted-foreground">{recipe.name}</p>
        </div>

        <RecordCookEventForm
          mode="edit"
          recipeId={recipeId}
          recipeName={recipe.name}
          saveCookEventAction={updateCookEventAction.bind(
            null,
            recipeId,
            cookEventId
          )}
          initialCookEvent={{
            cookedAt: cookEvent.cookedAt,
            note: cookEvent.note ?? "",
            image: cookEvent.images[0]
              ? {
                  imageUrl: cookEvent.images[0].imageUrl,
                  originalFilename: cookEvent.images[0].originalFilename
                }
              : null
          }}
          cancelHref={`/recipe/${recipeId}`}
        />
      </main>
    )
  } catch (error) {
    if (error instanceof CookEventOwnershipError) {
      notFound()
    }

    if (error instanceof CurrentUserError) {
      throw new Error(error.message)
    }

    throw error
  }
}
