import { Button } from "@repo/ui/shadcn/button"
import Link from "next/link"

export default function Page() {
  return (
    <main>
      <div className="flex flex-col items-center justify-center gap-4 p-16">
        <h1>Welcome to JD-Recipes</h1>
        <div className="flex gap-4 p-8">
          <Button asChild>
            <Link href="/register">Register</Link>
          </Button>
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
