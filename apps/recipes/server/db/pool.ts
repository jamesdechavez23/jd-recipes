import "server-only"

import {
  GetSecretValueCommand,
  SecretsManagerClient
} from "@aws-sdk/client-secrets-manager"
import { Pool, type PoolClient, type PoolConfig } from "pg"

type DbSecretShape = {
  host?: string
  port?: number | string
  username?: string
  password?: string
  dbname?: string
}

type ResolvedDbConfig = {
  host: string
  port: number
  user: string
  password: string
  database: string
}

declare global {
  var __jdRecipesDbPool: Pool | undefined
  var __jdRecipesDbSecretPromise: Promise<DbSecretShape | null> | undefined
}

function boolFromEnv(value: string | undefined) {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes"
}

function getEnv(name: string) {
  const value = process.env[name]
  return typeof value === "string" ? value.trim() : ""
}

function getSslConfig(): PoolConfig["ssl"] {
  return boolFromEnv(process.env.DB_SSL)
    ? { rejectUnauthorized: false }
    : undefined
}

async function getDbSecret(): Promise<DbSecretShape | null> {
  if (globalThis.__jdRecipesDbSecretPromise) {
    return globalThis.__jdRecipesDbSecretPromise
  }

  const secretId = getEnv("DB_SECRET_ARN")
  if (!secretId) return null

  globalThis.__jdRecipesDbSecretPromise = (async () => {
    const client = new SecretsManagerClient({})
    const resp = await client.send(
      new GetSecretValueCommand({ SecretId: secretId })
    )

    if (!resp.SecretString) {
      throw new Error("SecretString missing (binary secrets not supported)")
    }

    return JSON.parse(resp.SecretString) as DbSecretShape
  })()

  return globalThis.__jdRecipesDbSecretPromise
}

function hasFieldBasedDbConfig() {
  return Boolean(
    getEnv("DB_SECRET_ARN") ||
    getEnv("DB_HOST") ||
    getEnv("DB_PORT") ||
    getEnv("DB_USER") ||
    getEnv("DB_PASSWORD") ||
    getEnv("DB_NAME") ||
    getEnv("DB_DATABASE")
  )
}

function parsePort(value: string | number | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

async function resolveFieldBasedConfig(): Promise<ResolvedDbConfig> {
  const secret = await getDbSecret()

  const host = getEnv("DB_HOST") || secret?.host || ""
  const port = parsePort(getEnv("DB_PORT") || secret?.port, 5432)
  const user = getEnv("DB_USER") || secret?.username || ""
  const password = getEnv("DB_PASSWORD") || secret?.password || ""
  const database =
    getEnv("DB_NAME") || getEnv("DB_DATABASE") || secret?.dbname || ""

  if (!host || !user || !password || !database) {
    throw new Error(
      "Database config is incomplete. Provide DB_URL, or set DB_SECRET_ARN / DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME."
    )
  }

  return {
    host,
    port,
    user,
    password,
    database
  }
}

function buildPoolFromConnectionString(connectionString: string) {
  return new Pool({
    connectionString,
    ssl: getSslConfig(),
    max: 10
  })
}

async function createPool() {
  const dbUrl = getEnv("DB_URL")

  if (dbUrl && !hasFieldBasedDbConfig()) {
    return buildPoolFromConnectionString(dbUrl)
  }

  const config = await resolveFieldBasedConfig()
  return new Pool({
    ...config,
    ssl: getSslConfig(),
    max: 10
  })
}

export async function getDbPool() {
  if (globalThis.__jdRecipesDbPool) {
    return globalThis.__jdRecipesDbPool
  }

  globalThis.__jdRecipesDbPool = await createPool()
  return globalThis.__jdRecipesDbPool
}

export async function withDbTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
) {
  const pool = await getDbPool()
  const client = await pool.connect()

  try {
    await client.query("begin")
    const result = await callback(client)
    await client.query("commit")
    return result
  } catch (error) {
    await client.query("rollback").catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}
