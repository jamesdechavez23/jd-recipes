import ExpandableVideoFrame from "../../(ui)/ExpandableVideoFrame"
import addRecipeIngredientsToShoppingListAction from "./(actions)/addRecipeIngredientsToShoppingListAction"
import deleteRecipeAction from "./(actions)/deleteRecipeAction"
import { requireCurrentUser } from "@recipes/server/auth/requireCurrentUser"
import { getCookEventsByRecipe } from "@recipes/server/cook-events/getCookEventsByRecipe"
import CookEventTimeline from "./(ui)/CookEventTimeline"
import getRecipeById from "./(actions)/getRecipeById"
import RecipeDetailActions from "./(ui)/RecipeDetailActions"
import RecipeSectionsToggle from "./(ui)/RecipeSectionsToggle"
import { toYoutubeEmbedUrl } from "../new/(ui)/create-recipe-form/utils"

type RecipePageProps = {
  params: { id?: string | string[] } | Promise<{ id?: string | string[] }>
}

export default async function RecipePage({ params }: RecipePageProps) {
  const resolvedParams = await Promise.resolve(params)
  const rawId = Array.isArray(resolvedParams.id)
    ? resolvedParams.id[0]
    : resolvedParams.id

  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
        <h1 className="text-2xl font-bold">Invalid Recipe ID</h1>
        <p className="text-muted-foreground">
          The recipe ID must be a positive integer.
        </p>
      </main>
    )
  }

  const currentUser = await requireCurrentUser()
  const recipe = await getRecipeById({ id })
  const cookEvents = await getCookEventsByRecipe({
    recipeId: id,
    ownerSub: currentUser.sub
  })
  const boundAddToShoppingListAction =
    addRecipeIngredientsToShoppingListAction.bind(null, id)
  const boundDeleteRecipeAction = deleteRecipeAction.bind(null, id)

  const videoUrl = typeof recipe.video === "string" ? recipe.video : null
  const videoEmbedUrl = videoUrl ? toYoutubeEmbedUrl(videoUrl) : null

  const instructions = Array.isArray(recipe.instructions)
    ? (recipe.instructions as unknown[])
    : []

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      {videoEmbedUrl ? (
        <ExpandableVideoFrame
          reserveViewportHeight="18rem"
          expandLabel="Expand section"
          collapseLabel="Reset section size"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold">{recipe.name}</h1>
              {recipe.description ? (
                <p className="text-muted-foreground">{recipe.description}</p>
              ) : null}
            </div>

            <RecipeDetailActions
              editHref={`/recipe/${id}/edit`}
              cookHref={`/recipe/${id}/cook`}
              recipeName={recipe.name}
              recipeIngredients={recipe.ingredients}
              shoppingListHref="/recipe/shopping-list"
              addToShoppingListAction={boundAddToShoppingListAction}
              deleteRecipeAction={boundDeleteRecipeAction}
            />

            <div className="w-full overflow-hidden rounded">
              <iframe
                className="aspect-video w-full rounded"
                src={videoEmbedUrl}
                title={recipe.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>

            <RecipeSectionsToggle
              ingredients={recipe.ingredients}
              instructions={instructions}
            />

            <CookEventTimeline events={cookEvents} />
          </div>
        </ExpandableVideoFrame>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">{recipe.name}</h1>
            {recipe.description ? (
              <p className="text-muted-foreground">{recipe.description}</p>
            ) : null}
          </div>

          <RecipeDetailActions
            editHref={`/recipe/${id}/edit`}
            cookHref={`/recipe/${id}/cook`}
            recipeName={recipe.name}
            recipeIngredients={recipe.ingredients}
            shoppingListHref="/recipe/shopping-list"
            addToShoppingListAction={boundAddToShoppingListAction}
            deleteRecipeAction={boundDeleteRecipeAction}
          />

          {videoUrl ? (
            <a
              className="underline"
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
            >
              Watch video
            </a>
          ) : null}

          <RecipeSectionsToggle
            ingredients={recipe.ingredients}
            instructions={instructions}
          />

          <CookEventTimeline events={cookEvents} />
        </>
      )}
    </main>
  )
}
