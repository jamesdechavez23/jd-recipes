import { Button } from "@/components/ui/shadcn/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/shadcn/card"

import Link from "next/link"

export default function Home() {
   return (
      <div className="p-4">
         <Card className="w-full h-[calc(100dvh-6rem)] text-center flex flex-col justify-center" style={{ background: "var(--card-gradient)" }}>
            <CardHeader>
               <CardTitle>JD-Recipes</CardTitle>
               <CardDescription>Online Recipe Book application from JD</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
               <div className="max-w-lg">
                  Ut labore officia officia duis ullamco eu do magna cillum culpa incididunt consequat non. Aute Lorem ad in minim aliqua cupidatat.
                  Incididunt ipsum adipisicing et do occaecat est sint consectetur magna officia labore labore.
               </div>
            </CardContent>
            <CardFooter className="flex justify-center w-full">
               <Link href="/demo/recipe-book" passHref>
                  <Button asChild>
                     <span>View Demo</span>
                  </Button>
               </Link>
               <Link href="/register" passHref>
                  <Button asChild variant="secondary" className="ml-2">
                     <span>Create Account</span>
                  </Button>
               </Link>
            </CardFooter>
         </Card>
      </div>
   )
}
