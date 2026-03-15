const {
  SecretsManagerClient,
  GetSecretValueCommand,
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
    new GetSecretValueCommand({ SecretId: secretId }),
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
    max: 2,
  })

  return cachedPool
}

exports.handler = async (event, context) => {
  // Allow the function to return without waiting for the pg pool to fully close.
  context.callbackWaitsForEmptyEventLoop = false

  try {
    const pool = await getPool()
    const result = await pool.query(
      "select now() as now, current_database() as db, current_user as user",
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
        user: row.user,
      }),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: message }),
    }
  }
}
