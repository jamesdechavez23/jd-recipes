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

function parseSteps(value) {
  if (value === undefined || value === null) return { ok: true, value: [] }
  if (!Array.isArray(value)) {
    return { ok: false, error: "Field 'instructions' must be an array" }
  }

  const steps = []

  for (let i = 0; i < value.length; i++) {
    const raw = value[i]

    // Allow string steps for convenience
    if (typeof raw === "string") {
      const text = raw.trim()
      if (!text) continue
      steps.push({
        step: steps.length + 1,
        short_desc: text,
        long_desc: null,
        heat: null,
        time_minutes: null,
        step_instructions: []
      })
      continue
    }

    if (!raw || typeof raw !== "object") {
      return {
        ok: false,
        error: "Each instruction must be an object or string"
      }
    }

    const step = Number(raw.step)
    const stepNumber =
      Number.isInteger(step) && step > 0 ? step : steps.length + 1

    const short =
      raw.short_desc === undefined || raw.short_desc === null
        ? ""
        : String(raw.short_desc).trim()
    const long =
      raw.long_desc === undefined || raw.long_desc === null
        ? ""
        : String(raw.long_desc).trim()

    const heat =
      raw.heat === undefined || raw.heat === null
        ? null
        : String(raw.heat).trim() || null

    const timeRaw = raw.time_minutes
    let timeMinutes = null
    if (timeRaw !== undefined && timeRaw !== null && timeRaw !== "") {
      const parsed = Number(timeRaw)
      if (!Number.isFinite(parsed) || parsed < 0) {
        return {
          ok: false,
          error: "Instruction time_minutes must be a non-negative number"
        }
      }
      timeMinutes = Math.trunc(parsed)
    }

    const stepIngredientsRaw = raw.step_instructions
    const stepIngredients = []
    if (stepIngredientsRaw !== undefined && stepIngredientsRaw !== null) {
      if (!Array.isArray(stepIngredientsRaw)) {
        return {
          ok: false,
          error: "Field 'step_instructions' must be an array"
        }
      }

      for (const si of stepIngredientsRaw) {
        if (!si || typeof si !== "object") {
          return {
            ok: false,
            error: "step_instructions contains an invalid item"
          }
        }

        const ingredientId = Number(si.ingredientId)
        if (!Number.isInteger(ingredientId) || ingredientId <= 0) {
          return {
            ok: false,
            error: "Each step ingredient must have a valid ingredientId"
          }
        }

        let quantity = null
        if (
          si.quantity !== undefined &&
          si.quantity !== null &&
          si.quantity !== ""
        ) {
          const q = Number(si.quantity)
          if (!Number.isFinite(q)) {
            return {
              ok: false,
              error: "Step ingredient quantity must be a number"
            }
          }
          quantity = q
        }

        const unit =
          si.unit === undefined || si.unit === null
            ? null
            : String(si.unit).trim() || null

        if (quantity !== null && !unit) {
          return {
            ok: false,
            error: "Unit is required when step ingredient quantity is provided"
          }
        }

        stepIngredients.push({ ingredientId, quantity, unit })
      }
    }

    steps.push({
      step: stepNumber,
      short_desc: short || `Step ${stepNumber}`,
      long_desc: long || null,
      heat,
      time_minutes: timeMinutes,
      step_instructions: stepIngredients
    })
  }

  // Sort by step (stable enough for typical inputs)
  steps.sort((a, b) => a.step - b.step)

  return { ok: true, value: steps }
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

  const createdBySub = getUserSub(event)
  if (!createdBySub) {
    return jsonResponse(401, {
      ok: false,
      error: "Unauthorized (missing user identity)"
    })
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

  const videoRaw = parsed.value?.videoUrl ?? parsed.value?.video
  const videoUrl =
    videoRaw === undefined || videoRaw === null
      ? null
      : String(videoRaw).trim() || null

  const stepsParsed = parseSteps(parsed.value?.instructions)
  if (!stepsParsed.ok) {
    return jsonResponse(400, { ok: false, error: stepsParsed.error })
  }
  const steps = stepsParsed.value

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
  // recipes(created_by_sub uuid not null, name varchar not null, description text, video_url text)
  const sql =
    "insert into recipes (created_by_sub, name, description, video_url) values ($1, $2, $3, $4) returning *"

  try {
    const pool = await getPool()
    const client = await pool.connect()
    try {
      await client.query("begin")

      const result = await client.query(sql, [
        createdBySub,
        name,
        description,
        videoUrl
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

      if (steps.length > 0) {
        for (const s of steps) {
          const stepRes = await client.query(
            "insert into recipe_steps (recipe_id, step_number, short_desc, long_desc, heat, time_minutes) values ($1, $2, $3, $4, $5, $6) returning id",
            [
              recipe.id,
              s.step,
              s.short_desc,
              s.long_desc,
              s.heat,
              s.time_minutes
            ]
          )
          const recipeStepId = stepRes.rows[0]?.id
          if (!recipeStepId)
            throw new Error("Insert step succeeded but returned no id")

          if (
            Array.isArray(s.step_instructions) &&
            s.step_instructions.length > 0
          ) {
            for (const si of s.step_instructions) {
              await client.query(
                "insert into recipe_step_ingredients (recipe_step_id, ingredient_id, quantity, unit) values ($1, $2, $3, $4) on conflict (recipe_step_id, ingredient_id) do update set quantity = excluded.quantity, unit = excluded.unit",
                [recipeStepId, si.ingredientId, si.quantity, si.unit]
              )
            }
          }
        }
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
