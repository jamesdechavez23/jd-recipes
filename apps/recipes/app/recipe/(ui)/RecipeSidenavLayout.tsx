"use client"

import Link from "next/link"
import * as React from "react"

import { Button } from "@repo/ui/shadcn/button"

import type { MyRecipeListItem } from "../(actions)/getMyRecipes"

export default function RecipeSidenavLayout({
  recipes,
  children
}: {
  recipes: MyRecipeListItem[]
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const handleNav = React.useCallback(() => {
    setCollapsed(true)
  }, [])

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const visibleRecipes = React.useMemo(() => {
    if (!normalizedQuery) {
      return recipes.map((recipe) => ({
        recipe,
        matchedIngredients: [] as string[]
      }))
    }

    const rankedRecipes = recipes
      .map((recipe, index) => {
        const recipeNameMatches = recipe.name
          .trim()
          .toLowerCase()
          .includes(normalizedQuery)
        const matchedIngredients = (recipe.ingredient_names ?? []).filter(
          (ingredientName) =>
            ingredientName.trim().toLowerCase().includes(normalizedQuery)
        )

        if (!recipeNameMatches && matchedIngredients.length === 0) {
          return null
        }

        return {
          recipe,
          matchedIngredients,
          rank: recipeNameMatches ? 0 : 1,
          index
        }
      })
      .filter(
        (
          value
        ): value is {
          recipe: MyRecipeListItem
          matchedIngredients: string[]
          rank: number
          index: number
        } => Boolean(value)
      )

    rankedRecipes.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      return a.index - b.index
    })

    return rankedRecipes
  }, [normalizedQuery, recipes])

  return (
    <div className="min-h-[calc(100vh-64px)] flex">
      <aside
        className={
          collapsed
            ? "w-14 shrink-0 border-r p-2 flex flex-col gap-2"
            : "w-72 shrink-0 border-r p-4 flex flex-col gap-4"
        }
      >
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size={collapsed ? "icon" : "sm"}
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidenav" : "Collapse sidenav"}
          >
            {collapsed ? ">" : "<"}
          </Button>
        </div>

        {collapsed ? null : (
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/recipe/new" onClick={handleNav}>
                New Recipe
              </Link>
            </Button>
          </div>
        )}

        {collapsed ? null : (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">My Recipes</h2>
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Search recipes or ingredients..."
                autoComplete="off"
                aria-label="Search my recipes or ingredients"
              />
              {searchQuery ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                >
                  Clear
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              {recipes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recipes yet.</p>
              ) : visibleRecipes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recipes match your search.
                </p>
              ) : (
                visibleRecipes.map(({ recipe, matchedIngredients }) => (
                  <Button
                    key={recipe.id}
                    asChild
                    variant="ghost"
                    className="h-auto justify-start py-2"
                  >
                    <Link href={`/recipe/${recipe.id}`} onClick={handleNav}>
                      <span className="flex flex-col items-start text-left">
                        <span>{recipe.name}</span>
                        {normalizedQuery && matchedIngredients.length > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            Matched ingredient: {matchedIngredients[0]}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </Button>
                ))
              )}
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}
