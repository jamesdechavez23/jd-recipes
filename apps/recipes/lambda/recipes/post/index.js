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

function parseIngredientIds(value) {
  if (value === undefined || value === null) return { ok: true, value: [] }
  if (!Array.isArray(value)) {
    return { ok: false, error: "Field 'ingredientIds' must be an array" }
  }

  const ids = []
  for (const entry of value) {
    const parsed = Number(entry)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return {
        ok: false,
        error: "Field 'ingredientIds' must contain positive integers"
      }
    }
    ids.push(parsed)
  }

  // de-dupe while preserving order
  const seen = new Set()
  const unique = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }

  return { ok: true, value: unique }
}

function parseIngredients(value) {
  if (value === undefined || value === null) return { ok: true, value: [] }
  if (!Array.isArray(value)) {
    return { ok: false, error: "Field 'ingredients' must be an array" }
  }

  const out = []

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return {
        ok: false,
        error: "Field 'ingredients' contains an invalid item"
      }
    }

    const ingredientId = Number(item.ingredientId)
    if (!Number.isInteger(ingredientId) || ingredientId <= 0) {
      return {
        ok: false,
        error: "Each ingredient must have a valid ingredientId"
      }
    }

    let quantity = null
    if (
      item.quantity !== undefined &&
      item.quantity !== null &&
      item.quantity !== ""
    ) {
      const q = Number(item.quantity)
      if (!Number.isFinite(q)) {
        return { ok: false, error: "Ingredient quantity must be a number" }
      }
      quantity = q
    }

    const unit =
      item.unit === undefined || item.unit === null
        ? null
        : String(item.unit).trim() || null

    if (quantity !== null && !unit) {
      return {
        ok: false,
        error: "Unit is required when quantity is provided"
      }
    }

    out.push({ ingredientId, quantity, unit })
  }

  // de-dupe by ingredientId (first wins) while preserving order
  const seen = new Set()
  const unique = []
  for (const x of out) {
    if (seen.has(x.ingredientId)) continue
    seen.add(x.ingredientId)
    unique.push(x)
  }

  return { ok: true, value: unique }
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

  const ingredientsParsed = parseIngredients(parsed.value?.ingredients)
  if (!ingredientsParsed.ok) {
    return jsonResponse(400, { ok: false, error: ingredientsParsed.error })
  }

  const ingredients = ingredientsParsed.value

  const ingredientIdsParsed = parseIngredientIds(parsed.value?.ingredientIds)
  if (!ingredientIdsParsed.ok) {
    return jsonResponse(400, { ok: false, error: ingredientIdsParsed.error })
  }

  const ingredientIds = ingredientIdsParsed.value

  // Matches db/tables/recipes.sql:
  // recipes(name varchar not null, description text, instructions jsonb not null default '[]')
  const sql =
    "insert into recipes (name, description, instructions) values ($1, $2, $3::jsonb) returning *"

  try {
    const pool = await getPool()
    const client = await pool.connect()
    try {
      await client.query("begin")

      const result = await client.query(sql, [
        name,
        description,
        JSON.stringify(instructions)
      ])
      const recipe = result.rows[0] ?? null

      if (!recipe) {
        throw new Error("Insert succeeded but returned no recipe")
      }

      if (ingredients.length > 0) {
        for (const ing of ingredients) {
          await client.query(
            "insert into recipe_ingredients (recipe_id, ingredient_id, quantity, unit) values ($1, $2, $3, $4) on conflict (recipe_id, ingredient_id) do update set quantity = excluded.quantity, unit = excluded.unit",
            [recipe.id, ing.ingredientId, ing.quantity, ing.unit]
          )
        }
      } else if (ingredientIds.length > 0) {
        await client.query(
          "insert into recipe_ingredients (recipe_id, ingredient_id) select $1, unnest($2::int[]) on conflict do nothing",
          [recipe.id, ingredientIds]
        )
      }

      await client.query("commit")

      return jsonResponse(201, {
        ok: true,
        recipe
      })
    } catch (err) {
      await client.query("rollback").catch(() => {})
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    const anyErr = err
    if (anyErr && typeof anyErr === "object" && anyErr.code === "23503") {
      return jsonResponse(400, {
        ok: false,
        error: "One or more ingredientIds do not exist"
      })
    }

    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse(500, { ok: false, error: message })
  }
}
