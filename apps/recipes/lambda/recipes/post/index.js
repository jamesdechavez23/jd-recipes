const {
  SecretsManagerClient,
  GetSecretValueCommand
} = require("@aws-sdk/client-secrets-manager")
const { Pool } = require("pg")

let cachedPool

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

function getHttpMethod(event) {
  return (
    event?.requestContext?.http?.method ||
    event?.httpMethod ||
    ""
  ).toUpperCase()
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }
}

function parseJsonBody(event) {
  if (!event?.body) return { ok: false, error: "Missing request body" }

  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body

    return { ok: true, value: JSON.parse(raw) }
  } catch {
    return { ok: false, error: "Invalid JSON body" }
  }
}

exports.handler = async (event, context) => {
  // Allow the function to return without waiting for the pg pool to fully close.
  context.callbackWaitsForEmptyEventLoop = false

  const method = getHttpMethod(event)
  if (method !== "POST") {
    return jsonResponse(405, {
      ok: false,
      error: `Method not allowed: ${method || "(missing)"}`
    })
  }

  const parsed = parseJsonBody(event)
  if (!parsed.ok) {
    return jsonResponse(400, { ok: false, error: parsed.error })
  }

  const name = String(parsed.value?.name ?? "").trim()
  if (!name) {
    return jsonResponse(400, {
      ok: false,
      error: "Missing required field: name"
    })
  }

  const descriptionRaw = parsed.value?.description
  const description =
    descriptionRaw === undefined || descriptionRaw === null
      ? null
      : String(descriptionRaw).trim()

  const instructionsRaw = parsed.value?.instructions
  const instructions =
    instructionsRaw === undefined || instructionsRaw === null
      ? []
      : instructionsRaw

  if (!Array.isArray(instructions)) {
    return jsonResponse(400, {
      ok: false,
      error: "Field 'instructions' must be an array"
    })
  }

  // Matches db/tables/recipes.sql:
  // recipes(name varchar not null, description text, instructions jsonb not null default '[]')
  const sql =
    "insert into recipes (name, description, instructions) values ($1, $2, $3) returning *"

  try {
    const pool = await getPool()
    const result = await pool.query(sql, [name, description, instructions])

    return jsonResponse(201, {
      ok: true,
      recipe: result.rows[0] ?? null
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse(500, { ok: false, error: message })
  }
}
