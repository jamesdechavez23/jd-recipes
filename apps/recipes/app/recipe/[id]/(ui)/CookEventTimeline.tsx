import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/shadcn/card"

import deleteCookEventAction from "../cook/(actions)/deleteCookEventAction"
import type { CookEventListItem } from "@recipes/server/cook-events/getCookEventsByRecipe"

import CookEventCardActions from "./CookEventCardActions"

function formatCookedAt(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date)
}

export default function CookEventTimeline({
  events
}: {
  events: CookEventListItem[]
}) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cook history</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No cook events recorded yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Cook history</h2>
        <p className="text-sm text-muted-foreground">
          Notes and photos from the times you made this recipe.
        </p>
      </div>

      {events.map((event) => {
        const leadImage = event.images[0] ?? null

        return (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                {formatCookedAt(event.cookedAt)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {leadImage ? (
                <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/20">
                  <img
                    src={leadImage.imageUrl}
                    alt={leadImage.originalFilename || "Cook event photo"}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
              ) : null}

              {event.note ? (
                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                  {event.note}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No notes saved.</p>
              )}

              <CookEventCardActions
                editHref={`/recipe/${event.recipeId}/cook/${event.id}/edit`}
                deleteCookEventAction={deleteCookEventAction.bind(
                  null,
                  event.recipeId,
                  event.id
                )}
              />
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
