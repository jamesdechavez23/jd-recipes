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

  const handleNav = React.useCallback(() => {
    setCollapsed(true)
  }, [])

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
            <div className="flex flex-col gap-1">
              {recipes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recipes yet.</p>
              ) : (
                recipes.map((r) => (
                  <Button
                    key={r.id}
                    asChild
                    variant="ghost"
                    className="justify-start"
                  >
                    <Link href={`/recipe/${r.id}`} onClick={handleNav}>
                      {r.name}
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
