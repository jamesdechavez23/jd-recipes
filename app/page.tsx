import { Button } from "@/components/ui/shadcn/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/shadcn/card"

export default function Home() {
   return (
      <div className="p-4">
         <Card className="w-full h-[calc(100dvh-6rem)] text-center flex flex-col justify-center" style={{ background: "var(--card-gradient)" }}>
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
            <CardFooter className="flex justify-center w-full">
               <Button>Get Started</Button>
               <Button variant="secondary" className="ml-2">
                  Learn More
               </Button>
            </CardFooter>
         </Card>
      </div>
   )
}
