const fs = require("fs")
const path = require("path")
const { spawn } = require("child_process")

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readDotEnv(filePath) {
  const env = {}
  let text

  try {
    text = fs.readFileSync(filePath, "utf8")
  } catch {
    return env
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const eq = trimmed.indexOf("=")
    if (eq === -1) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    env[key] = value
  }

  return env
}

function pickEnvValue(keys, sources) {
  for (const source of sources) {
    if (!source) continue
    for (const key of keys) {
      const value = source[key]
      if (value !== undefined && String(value).trim() !== "") {
        return String(value).trim()
      }
    }
  }
  return undefined
}

function parseDbUrl(dbUrl) {
  // Do not log dbUrl; it may contain credentials.
  const url = new URL(dbUrl)
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432
  }
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath)
    return true
  } catch {
    return false
  }
}

function getAwsExecutable() {
  // Prefer explicit override.
  if (process.env.AWS_CLI_PATH && String(process.env.AWS_CLI_PATH).trim()) {
    return String(process.env.AWS_CLI_PATH).trim()
  }

  // On Windows, AWS CLI v2 commonly installs here. In Git Bash/MSYS, it maps to:
  // /c/Program Files/Amazon/AWSCLIV2/aws.exe
  if (process.platform === "win32") {
    const defaultPath = "C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe"
    if (fileExists(defaultPath)) return defaultPath
  }

  // Fall back to PATH resolution.
  return "aws"
}

function main() {
  const repoRoot = path.resolve(__dirname, "..")
  const appEnvPath = path.join(repoRoot, "apps", "recipes", ".env")
  const appEnv = readDotEnv(appEnvPath)

  const region = pickEnvValue(
    [
      "SSM_TUNNEL_REGION",
      "AWS_REGION",
      "AWS_DEFAULT_REGION",
      "NEXT_PUBLIC_COGNITO_REGION"
    ],
    [process.env, appEnv]
  )

  const target = pickEnvValue(
    ["SSM_TUNNEL_TARGET", "SSM_TUNNEL_INSTANCE_ID"],
    [process.env, appEnv]
  )

  const localPort = Number(
    pickEnvValue(["SSM_TUNNEL_LOCAL_PORT"], [process.env, appEnv]) ?? "15432"
  )

  const remotePort = Number(
    pickEnvValue(["SSM_TUNNEL_REMOTE_PORT"], [process.env, appEnv]) ?? "5432"
  )

  const dbUrl = pickEnvValue(["DB_URL"], [process.env, appEnv])
  const explicitHost = pickEnvValue(["SSM_TUNNEL_HOST"], [process.env, appEnv])

  if (!target) {
    console.error(
      "Missing EC2 instance id. Set env var SSM_TUNNEL_TARGET to something like i-1234567890abcdef0."
    )
    process.exit(1)
  }

  if (!region) {
    console.error(
      "Missing AWS region. Set env var SSM_TUNNEL_REGION (or AWS_REGION / AWS_DEFAULT_REGION)."
    )
    process.exit(1)
  }

  let host
  if (explicitHost) {
    host = explicitHost
  } else if (dbUrl) {
    host = parseDbUrl(dbUrl).host
  }

  if (!host) {
    console.error(
      "Missing DB host. Set SSM_TUNNEL_HOST or provide DB_URL (e.g. in apps/recipes/.env)."
    )
    process.exit(1)
  }

  const args = [
    "ssm",
    "start-session",
    "--region",
    region,
    "--target",
    target,
    "--document-name",
    "AWS-StartPortForwardingSessionToRemoteHost",
    "--parameters",
    `host=${host},portNumber=${remotePort},localPortNumber=${localPort}`
  ]

  let activeChild = null
  let stopping = false

  const stop = () => {
    if (stopping) return
    stopping = true
    if (activeChild) {
      try {
        activeChild.kill("SIGTERM")
      } catch {
        // Ignore.
      }
    }
  }

  process.once("SIGINT", stop)
  process.once("SIGTERM", stop)

  const startSessionOnce = () =>
    new Promise((resolve, reject) => {
      console.log(
        `Starting SSM tunnel: localhost:${localPort} -> ${host}:${remotePort} (instance ${target}, region ${region})`
      )
      console.log("Leave this process running while you develop.")

      activeChild = spawn(getAwsExecutable(), args, {
        stdio: "inherit",
        env: process.env
      })

      activeChild.on("exit", (code, signal) => {
        activeChild = null
        resolve({ code, signal })
      })

      activeChild.on("error", (err) => {
        activeChild = null
        reject(err)
      })
    })

  ;(async () => {
    let backoffMs = 1000
    const maxBackoffMs = 30000

    while (!stopping) {
      const startedAt = Date.now()
      try {
        const { code, signal } = await startSessionOnce()

        if (stopping) break

        const durationMs = Date.now() - startedAt
        if (durationMs > 30000) {
          backoffMs = 1000
        }

        const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`
        console.log(
          `SSM session ended (${reason}). Reconnecting in ${Math.ceil(backoffMs / 1000)}s...`
        )
        await sleep(backoffMs)
        backoffMs = Math.min(backoffMs * 2, maxBackoffMs)
      } catch (err) {
        const message = err?.message ?? String(err)
        console.error("Failed to start AWS CLI:", message)

        if (String(message).includes("ENOENT")) {
          console.error(
            "AWS CLI was not found. Install AWS CLI v2, then reopen your terminal so PATH updates."
          )
          console.error(
            "Windows default install path is usually: C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe"
          )
          console.error(
            "If it is installed but not on PATH, set AWS_CLI_PATH to that full path."
          )
        }

        console.error(
          "Also ensure the Session Manager Plugin is installed (required for `aws ssm start-session`)."
        )
        process.exit(1)
      }
    }

    process.exit(0)
  })()
}

main()
