# Recipes App

This app is the main Next.js frontend and backend for JD Recipes.

The current architecture uses:

- Next.js App Router
- Server Actions for authenticated mutations and reads
- Direct PostgreSQL access through `pg`
- AWS Cognito for authentication
- AWS Secrets Manager for database credentials in deployed environments
- An SSM tunnel for local development against the remote database

The old API Gateway and Lambda flow has been removed from the main app.

## Development

From the repository root:

```bash
npm install
```

To run the app only:

```bash
npm run dev
```

To run the app with the SSM tunnel in parallel:

```bash
npm run dev:tunnel
```

The app runs on:

```text
http://localhost:3000
```

## Useful Commands

From the repository root:

```bash
npm run dev
npm run dev:tunnel
npm run tunnel
npm run lint
npm run check-types
```

From `apps/recipes` directly:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run check-types
```

## App Runner Deployment

The recipes app can now be built as a container image for App Runner using
the Dockerfile at `apps/recipes/Dockerfile`.

Build from the repository root:

```bash
docker build -f apps/recipes/Dockerfile -t jd-recipes-recipes .
```

Run locally:

```bash
docker run --rm -p 3000:3000 --env-file apps/recipes/.env jd-recipes-recipes
```

For App Runner, the basic deployment flow is:

1. Build the image from the repo root
2. Push the image to ECR
3. Create or update an App Runner service that points at that ECR image
4. Configure runtime environment variables in App Runner
5. Attach an instance role that allows the app to reach the AWS services it uses

The app expects these runtime values in App Runner:

```dotenv
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_REDIRECT_ORIGIN=...

NEXT_PUBLIC_COGNITO_REGION=...
NEXT_PUBLIC_COGNITO_USER_POOL_ID=...
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=...
COGNITO_USER_POOL_CLIENT_SECRET=...

NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY=...
CF_TURNSTILE_SECRET=...

AWS_REGION=...
S3_COOK_EVENT_BUCKET=...

DB_SECRET_ARN=...
DB_HOST=...
DB_PORT=5432
DB_NAME=...
DB_SSL=true
```

The App Runner instance role should allow at least:

- `secretsmanager:GetSecretValue` for `DB_SECRET_ARN`
- S3 access for the configured cook event bucket
- KMS access if the secret or bucket encryption policy requires it

Notes:

- The image build should run on Linux in CI/CD or Docker, even though local standalone copy warnings can appear on Windows.
- `PORT=3000` should stay aligned with the container port configured in App Runner.

## Environment

The app currently expects values similar to the following in `apps/recipes/.env`:

```dotenv
NEXT_PUBLIC_COGNITO_REGION=...
NEXT_PUBLIC_COGNITO_USER_POOL_ID=...
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=...
NEXT_PUBLIC_REDIRECT_ORIGIN=http://localhost:3000
COGNITO_USER_POOL_CLIENT_SECRET=...

# Cloudflare Turnstile (client + server keys)
# - `NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY` is the public site key used in the browser
# - `CF_TURNSTILE_SECRET` is the server-side secret used to verify tokens
NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY=...
CF_TURNSTILE_SECRET=...

DB_URL=...
DB_SSL=true
DB_SECRET_ARN=...
DB_NAME=...
DB_HOST=127.0.0.1
DB_PORT=15432

SSM_TUNNEL_TARGET=...
```

Important database config behavior:

- If field-based DB settings are present, the app uses them instead of plain `DB_URL`
- Field-based mode means any of these values can activate it: `DB_SECRET_ARN`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_DATABASE`
- For local tunnel-based development, `DB_HOST=127.0.0.1` and `DB_PORT=15432` should point at the active SSM tunnel
- In field-based mode, the app resolves missing credentials from Secrets Manager when `DB_SECRET_ARN` is set

In practice, local development usually works best with:

- the SSM tunnel running
- `DB_HOST` and `DB_PORT` pointing to the tunnel
- `DB_SECRET_ARN` available so username/password/database can be resolved from Secrets Manager

## Auth Notes

- Access tokens are used by the proxy for route protection and refresh decisions
- ID tokens are used by server-side authenticated flows that need the current user identity
- Admin-only actions rely on Cognito group checks from verified tokens

If auth starts failing unexpectedly, confirm the Cognito app client values in `.env` match the tokens being issued.

## Server Structure

The app now keeps backend logic inside the Next.js workspace instead of a separate Lambda directory.

Main areas:

- `app/**/(actions)` for thin Server Actions
- `server/db` for connection pooling and transaction helpers
- `server/auth` for current-user helpers
- `server/recipes` for recipe queries and mutations
- `server/ingredients` for ingredient queries and mutations
- `utils/cognitoJwt.ts` for Cognito token verification

The intended pattern is:

1. UI submits to a Server Action
2. The Server Action handles validation and auth boundaries
3. The action calls a server-only module under `server/**`
4. The server module talks directly to PostgreSQL

## Current Coverage

The direct database path is in place for the main recipe flows, including:

- creating recipes
- listing the current user's recipes
- loading ingredients for recipe creation
- creating ingredients
- loading a recipe by id

## Troubleshooting

### `ECONNREFUSED 127.0.0.1:15432`

The SSM tunnel is not running or is not listening on the expected port.

Start it with:

```bash
npm run tunnel
```

Or run both together:

```bash
npm run dev:tunnel
```

### Database config is incomplete

This usually means field-based DB config is active but one or more required values are missing.

Check:

- `DB_SECRET_ARN`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- optional direct overrides such as `DB_USER` and `DB_PASSWORD`

### Redirect loops or unexpected logouts

Check:

- Cognito env values
- access token expiry
- refresh token cookie presence
- `NEXT_PUBLIC_REDIRECT_ORIGIN`

## Notes For Future Changes

- Keep reusable types out of `"use server"` action files when those types are imported by UI code
- Prefer putting shared types in `server/**` or other non-action modules to avoid Next bundling issues
- Keep `redirect()` calls outside `try/catch` blocks in Server Actions unless redirect errors are explicitly rethrown
