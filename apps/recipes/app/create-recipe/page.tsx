import { redirect } from "next/navigation"

export default function CreateRecipeRedirectPage() {
  redirect("/recipe/new")
}
