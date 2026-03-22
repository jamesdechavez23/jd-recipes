"use client"

import Link from "next/link"
import * as React from "react"
import { Menu, X } from "lucide-react"

import { Button } from "@repo/ui/shadcn/button"
import { Input } from "@repo/ui/shadcn/input"

// Expandable frame events removed; no-op
import type { MyRecipeListItem } from "@recipes/server/recipes/getMyRecipes"

export default function RecipeSidenavLayout({
  recipes,
  children
}: {
  recipes: MyRecipeListItem[]
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const handleNav = React.useCallback(() => {
    setCollapsed(true)
    setMobileMenuOpen(false)
  }, [])

  React.useEffect(() => {
    if (!mobileMenuOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false)
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [mobileMenuOpen])

  // Previously listened for expandable-frame expansion to collapse the sidenav.
  // Expand/collapse functionality removed, so no listener is needed.

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(min-width: 768px)")

    const syncMobileNav = (event?: MediaQueryListEvent) => {
      const matches = event?.matches ?? mediaQuery.matches
      if (matches) setMobileMenuOpen(false)
    }

    syncMobileNav()
    mediaQuery.addEventListener("change", syncMobileNav)

    return () => mediaQuery.removeEventListener("change", syncMobileNav)
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

  const sidebarContent = (
    <>
      <div className="flex flex-col gap-2">
        <Button asChild>
          <Link href="/recipe/new" onClick={handleNav}>
            New Recipe
          </Link>
        </Button>

        <Button asChild variant="outline">
          <Link href="/recipe/shopping-list" onClick={handleNav}>
            Shopping List
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">My Recipes</h2>
        <div className="flex items-center gap-2">
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
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
    </>
  )

  return (
    <div className="min-h-[calc(100vh-64px)] flex">
      <aside
        className={
          collapsed
            ? "hidden w-14 shrink-0 border-r border-border/40 bg-background/50 p-2 md:flex md:flex-col md:gap-2"
            : "hidden w-72 shrink-0 border-r border-border/40 bg-background/50 p-4 md:flex md:flex-col md:gap-4"
        }
      >
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size={collapsed ? "icon" : "sm"}
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidenav" : "Collapse sidenav"}
          >
            {collapsed ? ">" : "<"}
          </Button>
        </div>

        {collapsed ? null : sidebarContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 backdrop-blur md:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open recipes menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="recipe-mobile-drawer"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        <main className="min-w-0 flex-1 p-4">{children}</main>
      </div>

      <div
        className={
          "fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden " +
          (mobileMenuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0")
        }
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden={!mobileMenuOpen}
      />

      <aside
        id="recipe-mobile-drawer"
        aria-hidden={!mobileMenuOpen}
        className={
          "fixed inset-y-0 left-0 z-50 flex w-[min(22rem,88vw)] flex-col gap-4 border-r border-border/40 bg-background/95 p-4 shadow-xl transition-transform md:hidden " +
          (mobileMenuOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Recipes</h2>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close recipes menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
          {sidebarContent}
        </div>
      </aside>
    </div>
  )
}
