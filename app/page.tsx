import Image from "next/image"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
   return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
         <Card className="max-w-sm w-full">
            <CardHeader>
               <CardTitle>JD-Recipes</CardTitle>
               <CardDescription>Online Recipe Book application from JD</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
               <div>
                  Ut labore officia officia duis ullamco eu do magna cillum culpa incididunt consequat non. Aute Lorem ad in minim aliqua cupidatat.
                  Incididunt ipsum adipisicing et do occaecat est sint consectetur magna officia labore labore.
               </div>
            </CardContent>
            <CardFooter>This is the footer</CardFooter>
         </Card>
      </div>
   )
}
