# ─── Stage 1: Production Dependencies ─────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --omit=dev

# ─── Stage 2: All Dependencies (includes prisma CLI, tsx, etc.) ────
FROM node:20-alpine AS dev-deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci

# ─── Stage 3: Build ────────────────────────────────────────────────
FROM dev-deps AS builder
WORKDIR /app
COPY . .
# Dummy URL so prisma.config.ts can resolve DATABASE_URL at generate time
# (generate only reads the schema, it does not connect to a database)
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate && \
    npm run build

# ─── Stage 4: Production Image ─────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl dumb-init && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

# Production node_modules
COPY --from=deps /app/node_modules ./node_modules
# Prisma CLI from dev-deps (needed to run db push in entrypoint)
COPY --from=dev-deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=dev-deps /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Schema and config (needed by prisma CLI at runtime)
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Compiled app
COPY --from=builder /app/dist ./dist
COPY package*.json ./

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

USER appuser
ENTRYPOINT ["dumb-init", "--", "./entrypoint.sh"]
