import SmoketestCaller from "./(ui)/SmoketestCaller"

export default function ApiSmoketestPage() {
  return (
    <main className="flex flex-col items-center min-h-screen gap-6 p-8">
      <h1 className="text-2xl font-bold">API Smoketest</h1>
      <p className="text-sm text-muted-foreground max-w-xl">
        This page calls your deployed Lambda smoketest over HTTP. Set
        NEXT_PUBLIC_API_SMOKETEST_URL to your API Gateway endpoint (recommended)
        or Lambda Function URL.
      </p>
      <SmoketestCaller />
    </main>
  )
}
