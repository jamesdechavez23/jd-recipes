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

function getUserSub(event) {
  const claims =
    event?.requestContext?.authorizer?.jwt?.claims ||
    event?.requestContext?.authorizer?.claims ||
    null

  const sub = claims?.sub
  if (sub) return String(sub)

  return null
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const method = getHttpMethod(event)
  if (method !== "GET") {
    return jsonResponse(405, {
      ok: false,
      error: `Method not allowed: ${method || "(missing)"}`
    })
  }

  const sub = getUserSub(event)
  if (!sub) {
    return jsonResponse(401, {
      ok: false,
      error: "Unauthorized (missing user identity)"
    })
  }

  try {
    const pool = await getPool()

    const result = await pool.query(
      `
        select
          r.id,
          r.name,
          r.created_at,
          r.updated_at,
          coalesce(
            array_agg(distinct i.name) filter (where i.name is not null),
            '{}'
          ) as ingredient_names
        from recipes r
        left join recipe_ingredients ri on ri.recipe_id = r.id
        left join ingredients i on i.id = ri.ingredient_id
        where r.created_by_sub = $1
        group by r.id, r.name, r.created_at, r.updated_at
        order by r.created_at desc
      `,
      [sub]
    )

    return jsonResponse(200, { ok: true, recipes: result.rows })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse(500, { ok: false, error: message })
  }
}
