import LoginForm from "./(ui)/LoginForm"

export default async function CognitoLoginPage({
  searchParams
}: {
  searchParams: Promise<{ redirect?: string; registered?: string }>
}) {
  const { redirect, registered } = await searchParams

  return (
    <div className="max-w-md mx-auto py-10 flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Login</h1>
      {registered && (
        <p className="text-green-500">
          Registration successful! Please log in.
        </p>
      )}
      <LoginForm redirectTo={redirect ?? "/recipe"} />
    </div>
  )
}
