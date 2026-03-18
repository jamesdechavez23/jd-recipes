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

function parseRecipeId(event) {
  const raw =
    event?.pathParameters?.recipeId || event?.pathParameters?.id || null

  if (raw) {
    const id = Number(raw)
    if (Number.isInteger(id) && id > 0) return { ok: true, value: id }
  }

  const rawPath = event?.rawPath || event?.path || ""
  const match =
    /\/recipes\/(\d+)(?:\/|$)/.exec(rawPath) ||
    /\/recipe\/(\d+)(?:\/|$)/.exec(rawPath)
  if (match) {
    const id = Number(match[1])
    if (Number.isInteger(id) && id > 0) return { ok: true, value: id }
  }

  return { ok: false, error: "Missing or invalid recipe id" }
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

  const idParsed = parseRecipeId(event)
  if (!idParsed.ok) {
    return jsonResponse(400, { ok: false, error: idParsed.error })
  }

  const recipeId = idParsed.value

  try {
    const pool = await getPool()

    const recipeResult = await pool.query(
      'select id, name, description, video_url as "video", created_at, updated_at from recipes where id = $1',
      [recipeId]
    )

    const recipe = recipeResult.rows[0] ?? null
    if (!recipe) {
      return jsonResponse(404, { ok: false, error: "Recipe not found" })
    }

    const ingredientsResult = await pool.query(
      'select ri.ingredient_id as "ingredientId", i.name, i.category, ri.quantity, ri.unit from recipe_ingredients ri join ingredients i on i.id = ri.ingredient_id where ri.recipe_id = $1 order by i.name asc',
      [recipeId]
    )

    const stepsResult = await pool.query(
      'select id, step_number as "step", short_desc, long_desc, heat, time_minutes from recipe_steps where recipe_id = $1 order by step_number asc',
      [recipeId]
    )

    const stepIngredientsResult = await pool.query(
      'select rsi.recipe_step_id as "recipeStepId", rsi.ingredient_id as "ingredientId", rsi.quantity, rsi.unit from recipe_step_ingredients rsi join recipe_steps rs on rs.id = rsi.recipe_step_id where rs.recipe_id = $1 order by rs.step_number asc, rsi.ingredient_id asc',
      [recipeId]
    )

    const stepIngredientsByStepId = new Map()
    for (const row of stepIngredientsResult.rows) {
      const key = row.recipeStepId
      const list = stepIngredientsByStepId.get(key)
      if (list)
        list.push({
          ingredientId: row.ingredientId,
          quantity: row.quantity,
          unit: row.unit
        })
      else {
        stepIngredientsByStepId.set(key, [
          {
            ingredientId: row.ingredientId,
            quantity: row.quantity,
            unit: row.unit
          }
        ])
      }
    }

    const instructions = stepsResult.rows.map((s) => ({
      step: s.step,
      short_desc: s.short_desc,
      long_desc: s.long_desc,
      heat: s.heat,
      time_minutes: s.time_minutes,
      step_instructions: stepIngredientsByStepId.get(s.id) || []
    }))

    return jsonResponse(200, {
      ok: true,
      recipe: {
        ...recipe,
        ingredients: ingredientsResult.rows,
        instructions
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse(500, { ok: false, error: message })
  }
}
