FROM node:20-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/recipes/package.json apps/recipes/package.json
COPY apps/spk/package.json apps/spk/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/tailwind-config/package.json packages/tailwind-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json

RUN npm ci

FROM deps AS builder

COPY . .

RUN npm run build --workspace @repo/ui && npm run build --workspace web

FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

COPY --from=builder /app/apps/recipes/.next/standalone ./
COPY --from=builder /app/apps/recipes/.next/static ./apps/recipes/.next/static
COPY --from=builder /app/apps/recipes/public ./apps/recipes/public

EXPOSE 3000

CMD ["node", "apps/recipes/server.js"]