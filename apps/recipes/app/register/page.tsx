import RegisterForm from "./(ui)/RegisterForm"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@repo/ui/shadcn/card"

export default function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-md py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Register</CardTitle>
          <CardDescription>
            Create an account to save recipes and manage your cooking workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  )
}
