import getMyRecipes from "./(actions)/getMyRecipes"
import RecipeSidenavLayout from "./(ui)/RecipeSidenavLayout"

export default async function RecipeLayout({
  children
}: {
  children: React.ReactNode
}) {
  const recipes = await getMyRecipes().catch(() => [])

  return <RecipeSidenavLayout recipes={recipes}>{children}</RecipeSidenavLayout>
}
