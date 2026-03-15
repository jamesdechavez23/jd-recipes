import RegisterForm from "./(ui)/RegisterForm"

export default function RegisterPage() {
  return (
    <div className="max-w-md mx-auto py-10 flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Register</h1>
      <RegisterForm />
    </div>
  )
}
