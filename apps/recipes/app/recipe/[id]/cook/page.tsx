import createCookEventAction from "./(actions)/createCookEventAction"
import RecordCookEventForm from "./(ui)/RecordCookEventForm"
import getRecipeById from "../(actions)/getRecipeById"

type RecordCookEventPageProps = {
  params: { id?: string | string[] } | Promise<{ id?: string | string[] }>
}

export default async function RecordCookEventPage({
  params
}: RecordCookEventPageProps) {
  const resolvedParams = await Promise.resolve(params)
  const rawId = Array.isArray(resolvedParams.id)
    ? resolvedParams.id[0]
    : resolvedParams.id

  const recipeId = Number(rawId)
  if (!Number.isInteger(recipeId) || recipeId <= 0) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
        <h1 className="text-2xl font-bold">Invalid Recipe ID</h1>
        <p className="text-muted-foreground">
          The recipe ID must be a positive integer.
        </p>
      </main>
    )
  }

  const recipe = await getRecipeById({ id: recipeId })

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">I cooked this</h1>
        <p className="text-muted-foreground">{recipe.name}</p>
      </div>

      <RecordCookEventForm
        recipeId={recipeId}
        recipeName={recipe.name}
        saveCookEventAction={createCookEventAction.bind(null, recipeId)}
        cancelHref={`/recipe/${recipeId}`}
      />
    </main>
  )
}
