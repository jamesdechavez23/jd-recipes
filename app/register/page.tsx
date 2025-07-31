import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/shadcn/card"
import RegisterForm from "./RegisterForm"
import OrSeparator from "@/components/ui/OrSeperator"
import SignInWithGoogleButton from "@/components/ui/SignInWithGoogleButton"
import registerUser from "./(api)/registerUser"

export default async function RegisterPage() {
   return (
      <div className="p-4">
         <Card className="w-full h-[calc(100dvh-6rem)] text-center flex flex-col justify-center" style={{ background: "var(--card-gradient)" }}>
            <CardHeader>
               <CardTitle>Create Account</CardTitle>
               <CardDescription>Create an account to start saving your favorite recipes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center w-full max-w-sm mx-auto">
               <RegisterForm registerUser={registerUser} />
               <p className="text-sm text-muted-foreground mt-4">
                  Already have an account?{" "}
                  <a href="/login" className="text-primary hover:underline">
                     Log in
                  </a>
               </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 items-center w-full max-w-sm mx-auto">
               <OrSeparator />
               <SignInWithGoogleButton text="Sign up with Google" />
            </CardFooter>
         </Card>
      </div>
   )
}
