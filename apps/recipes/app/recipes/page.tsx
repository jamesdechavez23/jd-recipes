import { Button } from "@repo/ui/shadcn/button"
import Link from "next/link"

export default async function RecipesPage() {
  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Recipes</h1>
      <p>Welcome to the recipes app!</p>
      <div className="flex items-center gap-3 flex-wrap">
        <Button asChild>
          <Link href="/create-recipe">Create a Recipe</Link>
        </Button>
      </div>
    </div>
  )
}
