import { Button } from "@repo/ui/shadcn/button"
import Link from "next/link"

export default function Page() {
  return (
    <main>
      <h1>Welcome to JD-Recipes</h1>
      <Button asChild>
        <Link href="/register">Register</Link>
      </Button>
    </main>
  )
}
