import RecipeSectionsToggle from "./(ui)/RecipeSectionsToggle"
import getRecipeById from "./(actions)/getRecipeById"
import ExpandableVideoFrame from "../../(ui)/ExpandableVideoFrame"
import { toYoutubeEmbedUrl } from "../new/(ui)/create-recipe-form/utils"
export const MOCK_DATA = {
  ingredientCategories: [
    "Proteins",
    "Dairy & Eggs",
    "Grains and Carbs",
    "Starches",
    "Vegetables",
    "Fruits",
    "Herbs & Spices",
    "Oils and Fats",
    "Pantry Staples",
    "Sweeteners",
    "Condiments & Sauces",
    "Baking Ingredients",
    "Nuts and Seeds",
    "Beverages"
  ],
  ingredients: [
    { id: 1, name: "Oyster Sauce", category: "Condiments & Sauces" },
    { id: 2, name: "Cooking Wine", category: "Condiments & Sauces" },
    { id: 3, name: "Water", category: "Beverages" },
    { id: 4, name: "Dark Soy Sauce", category: "Condiments & Sauces" },
    { id: 5, name: "Sesame Oil", category: "Oils and Fats" },
    { id: 6, name: "Sugar", category: "Sweeteners" },
    { id: 7, name: "Cornstarch", category: "Baking Ingredients" },
    { id: 8, name: "Garlic", category: "Vegetables" },
    { id: 9, name: "Ginger", category: "Vegetables" },
    { id: 10, name: "Salmon", category: "Proteins" },
    { id: 11, name: "Green Onions", category: "Vegetables" },
    { id: 12, name: "Butter", category: "Dairy & Eggs" },
    { id: 13, name: "Parsley", category: "Herbs & Spices" },
    { id: 14, name: "Lemon", category: "Fruits" },
    { id: 15, name: "Ginger", category: "Vegetables" },
    { id: 16, name: "Cornstarch", category: "Baking Ingredients" },
    { id: 17, name: "Beef Broth", category: "Beverages" },
    { id: 18, name: "Sugar", category: "Sweeteners" }
  ],
  recipe: {
    id: 4,
    name: "Chinese Soy-Glazed Ginger Garlic Salmon",
    video: "https://www.youtube.com/watch?v=vAgxAKYHGgI",
    instructions: [
      {
        step: 1,
        short_desc: "Cook Ginger",
        long_desc:
          "Julien ginger then fry in oil until fragrant and brown. Remove and set aside for garnishing.",
        heat: "medium",
        time_minutes: 1,
        step_instructions: [{ ingredientId: 9, quantity: 1, unit: "tbsp" }]
      },
      {
        step: 2,
        short_desc: "Cook Salmon",
        long_desc:
          "Season salmon with salt and pepper and score the skin. Fry for 2 minutes on each side, skin side down first. Remove salmon and set aside.",
        heat: "medium-high",
        time_minutes: 4,
        step_instructions: [{ ingredientId: 10, quantity: 8, unit: "oz" }]
      },
      {
        step: 3,
        short_desc: "Make Sauce",
        long_desc:
          "Fry garlic until fragrant, then add oyster sauce, cooking wine, water, dark soy sauce, sesame oil, and ginger then bring to boil. Then add sugar and cornstarch slurry and stir until thickened.",
        heat: "medium",
        time_minutes: 3,
        step_instructions: [
          { ingredientId: 1, quantity: 1, unit: "tbsp" },
          { ingredientId: 2, quantity: 1, unit: "tbsp" },
          { ingredientId: 3, quantity: 0.5, unit: "cup" },
          { ingredientId: 4, quantity: 1, unit: "tbsp" },
          { ingredientId: 5, quantity: 1, unit: "tbsp" },
          { ingredientId: 6, quantity: 0.5, unit: "tsp" },
          { ingredientId: 7, quantity: 1, unit: "tsp" },
          { ingredientId: 8, quantity: 3, unit: "cloves" }
        ]
      },
      {
        step: 4,
        short_desc: "Combine",
        long_desc:
          "Add salmon back to pan and spoon sauce over it. Cook for another minute until salmon is cooked through and glazed with sauce. Garnish with fried ginger and sliced green onions.",
        heat: "low",
        time_minutes: 1,
        step_instructions: null
      }
    ]
  },
  recipeIngredients: [
    { ingredientId: 1, recipeId: 4, quantity: 1, unit: "tbsp" },
    { ingredientId: 2, recipeId: 4, quantity: 1, unit: "tbsp" },
    { ingredientId: 3, recipeId: 4, quantity: 0.5, unit: "cup" },
    { ingredientId: 4, recipeId: 4, quantity: 1, unit: "tbsp" },
    { ingredientId: 5, recipeId: 4, quantity: 1, unit: "tbsp" },
    { ingredientId: 6, recipeId: 4, quantity: 0.5, unit: "tsp" },
    { ingredientId: 7, recipeId: 4, quantity: 1, unit: "tsp" },
    { ingredientId: 8, recipeId: 4, quantity: 3, unit: "cloves" },
    { ingredientId: 9, recipeId: 4, quantity: 1, unit: "tbsp" },
    { ingredientId: 10, recipeId: 4, quantity: 8, unit: "oz" },
    { ingredientId: 11, recipeId: 4, quantity: 2, unit: "stalks" }
  ]
}

type RecipePageProps = {
  params: { id?: string | string[] } | Promise<{ id?: string | string[] }>
}

export default async function RecipePage({ params }: RecipePageProps) {
  void MOCK_DATA

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

  const recipe = await getRecipeById({ id })

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
        </>
      )}
    </main>
  )
}
