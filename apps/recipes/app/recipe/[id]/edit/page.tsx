import createIngredientAction from "../../new/(actions)/createIngredientAction"
import { getIngredients } from "../../new/(actions)/getIngredients"
import CreateRecipeForm from "../../new/(ui)/CreateRecipeForm"
import type { RecipeEditorInitialData } from "../../new/(ui)/create-recipe-form/types"
import getRecipeById from "../(actions)/getRecipeById"
import updateRecipeAction from "../(actions)/updateRecipeAction"
import type { IngredientListItem } from "@recipes/server/ingredients/getIngredients"
import {
  AdminAccessError,
  requireAdminAccessToken
} from "@recipes/utils/requireAdmin"

type EditRecipePageProps = {
  params: { id?: string | string[] } | Promise<{ id?: string | string[] }>
}

function toInitialRecipeData(
  recipe: Awaited<ReturnType<typeof getRecipeById>>
): RecipeEditorInitialData {
  return {
    name: recipe.name,
    description: recipe.description ?? "",
    videoUrl: recipe.video ?? "",
    ingredients: recipe.ingredients.map((ingredient) => ({
      ingredientId: ingredient.ingredientId,
      name: ingredient.name,
      category: ingredient.category ?? null,
      quantity: ingredient.quantity ?? null,
      quantityDisplay: ingredient.quantityDisplay ?? null,
      unit: ingredient.unit ?? null
    })),
    instructions: recipe.instructions.map((instruction, index) => ({
      id: index + 1,
      step: instruction.step,
      short_desc: instruction.short_desc,
      long_desc: instruction.long_desc ?? "",
      heat: instruction.heat ?? null,
      time_minutes: instruction.time_minutes ?? null,
      step_instructions: (instruction.step_instructions ?? []).map(
        (stepIngredient) => ({
          ingredientId: stepIngredient.ingredientId,
          quantity: stepIngredient.quantity ?? null,
          quantity_display: stepIngredient.quantity_display ?? null,
          unit: stepIngredient.unit ?? null
        })
      )
    }))
  }
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
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

  let ingredients: IngredientListItem[] = []
  let ingredientsError: string | null = null
  let canCreateIngredients = false

  try {
    await requireAdminAccessToken()
    canCreateIngredients = true
  } catch (error) {
    if (!(error instanceof AdminAccessError)) {
      throw error
    }
  }

  try {
    ingredients = await getIngredients()
  } catch (error) {
    ingredientsError = error instanceof Error ? error.message : String(error)
  }

  const recipe = await getRecipeById({ id: recipeId })

  return (
    <main className="mx-auto flex max-w-3xl xl:max-w-350 flex-col gap-6 px-4 md:p-8 pb-20">
      <CreateRecipeForm
        mode="edit"
        initialRecipe={toInitialRecipeData(recipe)}
        recipeAction={updateRecipeAction.bind(null, recipeId)}
        createIngredientAction={createIngredientAction}
        canCreateIngredients={canCreateIngredients}
        ingredients={ingredients}
        ingredientsError={ingredientsError}
        draftStorageKey={null}
      />
    </main>
  )
}
