# ─── Stage 1: Dependencies ─────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ─── Stage 2: Generate Prisma Client ──────────────────
FROM node:22-alpine AS prisma
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npx prisma generate

# ─── Stage 3: Build ───────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=prisma /app/node_modules ./node_modules
COPY --from=prisma /app/src/generated ./src/generated
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ENV DATABASE_URL=$DATABASE_URL

RUN npm run build

# ─── Stage 4: Production ─────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nextjs && \
    mkdir -p /app/uploads/projects /app/uploads/posts && \
    chown -R nextjs:nodejs /app/uploads

# Copy built assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Include Prisma tooling so the same immutable image can run migrate deploy.
COPY --from=prisma --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=prisma /app/src/generated ./src/generated
COPY prisma ./prisma
COPY prisma.config.ts ./

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV PROJECT_IMAGE_UPLOAD_DIR=/app/uploads/projects
ENV POST_IMAGE_UPLOAD_DIR=/app/uploads/posts

USER nextjs
ENTRYPOINT []
CMD ["node", "server.js"]
