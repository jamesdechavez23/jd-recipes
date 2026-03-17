// import getRecipeById from "./(actions)/getRecipeById"

import RecipeSectionsToggle from "./(ui)/RecipeSectionsToggle"

// interface RecipePageProps {
//   params: { id?: string | string[] } | Promise<{ id?: string | string[] }>
// }

// export default async function RecipePage({ params }: RecipePageProps) {
//   const resolvedParams = await Promise.resolve(params)
//   const rawId = Array.isArray(resolvedParams.id)
//     ? resolvedParams.id[0]
//     : resolvedParams.id

//   const id = Number(rawId)
//   if (!Number.isInteger(id) || id <= 0) {
//     return (
//       <main className="flex flex-col gap-6 p-8">
//         <h1 className="text-2xl font-bold">Invalid Recipe ID</h1>
//         <p>The recipe ID must be a positive integer.</p>
//       </main>
//     )
//   }

//   const recipe = await getRecipeById({ id })

//   const instructions = Array.isArray(recipe.instructions)
//     ? (recipe.instructions as unknown[])
//     : []

//   return (
//     <main className="flex flex-col gap-6 p-8">
//       <div className="flex flex-col gap-1">
//         <h1 className="text-2xl font-bold">{recipe.name}</h1>
//         {recipe.description ? (
//           <p className="text-muted-foreground">{recipe.description}</p>
//         ) : null}
//       </div>

//       <section className="flex flex-col gap-2">
//         <h2 className="text-lg font-semibold">Ingredients</h2>
//         {recipe.ingredients?.length ? (
//           <ul className="list-disc pl-6">
//             {recipe.ingredients.map((ing) => (
//               <li key={ing.ingredientId}>
//                 {ing.name}
//                 {ing.quantity !== null && ing.quantity !== undefined && ing.unit
//                   ? ` — ${ing.quantity} ${ing.unit}`
//                   : null}
//               </li>
//             ))}
//           </ul>
//         ) : (
//           <p className="text-muted-foreground">No ingredients.</p>
//         )}
//       </section>

//       <section className="flex flex-col gap-2">
//         <h2 className="text-lg font-semibold">Instructions</h2>
//         {instructions.length ? (
//           <ol className="list-decimal pl-6">
//             {instructions.map((step, idx) => (
//               <li key={idx}>
//                 {typeof step === "string" ? step : JSON.stringify(step)}
//               </li>
//             ))}
//           </ol>
//         ) : (
//           <p className="text-muted-foreground">No instructions.</p>
//         )}
//       </section>
//     </main>
//   )
// }
const INGREDIENT_CATEGORIES = [
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
]

const MOCK_INGREDIENTS = [
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
  { id: 11, name: "Green Onions", category: "Vegetables" }
]

const MOCK_RECIPE = {
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
}

const MOCK_RECIPE_INGREDIENTS = [
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

function toYoutubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)

    const buildEmbed = (id: string) =>
      `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`

    // https://youtu.be/<id>
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace("/", "").trim()
      return id ? buildEmbed(id) : null
    }

    // https://www.youtube.com/watch?v=<id>
    if (
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "m.youtube.com"
    ) {
      const pathParts = parsed.pathname.split("/").filter(Boolean)
      if (pathParts[0] === "embed" && pathParts[1]) {
        return buildEmbed(pathParts[1])
      }
      const id = parsed.searchParams.get("v")
      return id ? buildEmbed(id) : null
    }

    return null
  } catch {
    return null
  }
}

export default function RecipePage() {
  const videoEmbedUrl = MOCK_RECIPE.video
    ? toYoutubeEmbedUrl(MOCK_RECIPE.video)
    : null

  const displayIngredients = MOCK_RECIPE_INGREDIENTS.map((ri) => {
    const ingredient = MOCK_INGREDIENTS.find((i) => i.id === ri.ingredientId)
    return {
      ingredientId: ri.ingredientId,
      name: ingredient?.name || `Ingredient ${ri.ingredientId}`,
      category: ingredient?.category,
      quantity: ri.quantity,
      unit: ri.unit
    }
  })

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">{MOCK_RECIPE.name}</h1>
      {videoEmbedUrl ? (
        <iframe
          className="aspect-video w-full rounded"
          src={videoEmbedUrl}
          title={MOCK_RECIPE.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : MOCK_RECIPE.video ? (
        <a
          className="underline"
          href={MOCK_RECIPE.video}
          target="_blank"
          rel="noreferrer"
        >
          Watch video
        </a>
      ) : null}

      <RecipeSectionsToggle
        ingredients={displayIngredients}
        instructions={MOCK_RECIPE.instructions}
      />
    </main>
  )
}
