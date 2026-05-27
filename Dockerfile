FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set DATABASE_URL for Prisma generate (use external URL during build)
ENV DATABASE_URL="postgres://actioncash:Rlb8TaB3hI6yz4s7egXqgBg5ieDO4jkzHmy209wzMGBGlccD2B3kABy9jtaH4Uen@164.68.126.14:5436/actioncash"

# Switch provider to postgresql and generate Prisma client
RUN node scripts/prisma-provider.js && npx prisma generate

# Build Next.js (skip prisma db push since DB is already set up)
RUN npx next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/

# Production image
FROM base AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

# Database URL for runtime (internal Docker network)
ENV DATABASE_URL="postgres://actioncash:Rlb8TaB3hI6yz4s7egXqgBg5ieDO4jkzHmy209wzMGBGlccD2B3kABy9jtaH4Uen@im5bgzdog99g2xbxnl7rx2x5:5432/actioncash"
ENV JWT_SECRET="a7f3e9b1c4d6f8a2e5b7c9d1f3a5e7b9c2d4f6a8e1b3c5d7f9a2e4b6c8d1f3a5"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
