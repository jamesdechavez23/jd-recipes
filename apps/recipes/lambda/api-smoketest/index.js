const {
  SecretsManagerClient,
  GetSecretValueCommand
} = require("@aws-sdk/client-secrets-manager")
const { Pool } = require("pg")

let cachedPool

function getCognitoGroupsFromClaims(claims) {
  const rawGroups = claims?.["cognito:groups"]

  if (Array.isArray(rawGroups)) {
    return rawGroups
      .filter((group) => typeof group === "string")
      .map((group) => group.trim())
      .filter(Boolean)
  }

  if (typeof rawGroups === "string") {
    const trimmed = rawGroups.trim()

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed
            .filter((group) => typeof group === "string")
            .map((group) => group.trim())
            .filter(Boolean)
        }
      } catch {
        const inner = trimmed.slice(1, -1).trim()
        if (!inner) return []

        return inner
          .split(",")
          .map((group) => group.trim().replace(/^['\"]|['\"]$/g, ""))
          .filter(Boolean)
      }
    }

    return trimmed
      .split(",")
      .map((group) => group.trim())
      .filter(Boolean)
  }

  return []
}

function boolFromEnv(value) {
  if (!value) return false
  const normalized = String(value).trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes"
}

async function getDbSecret() {
  const secretId = process.env.DB_SECRET_ARN
  if (!secretId) throw new Error("Missing env var: DB_SECRET_ARN")

  const client = new SecretsManagerClient({})
  const resp = await client.send(
    new GetSecretValueCommand({ SecretId: secretId })
  )

  if (!resp.SecretString) {
    throw new Error("SecretString missing (binary secrets not supported)")
  }

  return JSON.parse(resp.SecretString)
}

async function getPool() {
  if (cachedPool) return cachedPool

  const secret = await getDbSecret()

  const sslEnabled = boolFromEnv(process.env.DB_SSL)
  cachedPool = new Pool({
    host: secret.host,
    port: Number(secret.port ?? 5432),
    user: secret.username,
    password: secret.password,
    database: secret.dbname,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    max: 2
  })

  return cachedPool
}

exports.handler = async (event, context) => {
  // Allow the function to return without waiting for the pg pool to fully close.
  context.callbackWaitsForEmptyEventLoop = false

  const claims = event?.requestContext?.authorizer?.jwt?.claims
  if (!claims) {
    console.error("api-smoketest: missing JWT claims", {
      requestContextKeys: Object.keys(event?.requestContext ?? {}),
      authorizer: event?.requestContext?.authorizer ?? null
    })

    return {
      statusCode: 401,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Missing JWT claims" })
    }
  }

  const groups = getCognitoGroupsFromClaims(claims)
  if (!groups.includes("admin")) {
    console.warn("api-smoketest: admin group missing", {
      sub: claims.sub ?? null,
      username: claims.username ?? claims["cognito:username"] ?? null,
      tokenUse: claims.token_use ?? null,
      rawGroups: claims["cognito:groups"] ?? null,
      parsedGroups: groups,
      claimKeys: Object.keys(claims)
    })

    return {
      statusCode: 403,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Admin access required" })
    }
  }

  try {
    const pool = await getPool()
    const result = await pool.query(
      "select now() as now, current_database() as db, current_user as user"
    )
    const row = result.rows[0]

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: true,
        message: "Connected to RDS successfully",
        now: row.now,
        db: row.db,
        user: row.user
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: message })
    }
  }
}
