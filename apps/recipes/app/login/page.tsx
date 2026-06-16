import LoginForm from "./(ui)/LoginForm"
import { Alert, AlertDescription } from "@repo/ui/shadcn/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@repo/ui/shadcn/card"

export default async function CognitoLoginPage({
  searchParams
}: {
  searchParams: Promise<{ redirect?: string; registered?: string }>
}) {
  const { redirect, registered } = await searchParams

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-10">
      {registered ? (
        <Alert variant="success">
          <AlertDescription>
            Registration successful. Please log in.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Sign in to access your recipes and continue cooking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm redirectTo={redirect ?? "/recipe"} />
        </CardContent>
      </Card>
    </div>
  )
}
