# syntax=docker/dockerfile:1

# ---- deps: install dependencies only, cached separately from source changes ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: build the standalone Next.js server ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Dummy values so build-time env validation (src/lib/env.ts) passes; the
# real secret is injected at deploy time (see scripts/deploy.sh).
ENV GEMINI_API_KEY=build-time-placeholder
ENV GEMINI_MODEL=gemini-2.5-flash
RUN npm run build

# ---- runner: minimal, non-root runtime image ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# output: "standalone" traces the minimal server + node_modules it needs;
# public/ and .next/static are not included and must be copied explicitly.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080

CMD ["node", "server.js"]
