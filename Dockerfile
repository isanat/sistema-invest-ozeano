# ============================================================================
# Mining Protocol - Production Dockerfile
# ============================================================================
# Multi-stage build for Next.js standalone output with PostgreSQL support
# ============================================================================

FROM node:20-alpine AS base

# Install bun
RUN npm install -g bun

# ============================================================================
# Stage 1: Dependencies (development mode to include devDependencies)
# ============================================================================
FROM base AS deps

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install ALL dependencies (including devDependencies needed for build)
RUN bun install --frozen-lockfile

# ============================================================================
# Stage 2: Build
# ============================================================================
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . .

# Build the Next.js application
# output: "standalone" is already configured in next.config.ts
RUN npm run build

# ============================================================================
# Stage 3: Production
# ============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install Prisma CLI for runtime migrations
RUN npm install -g prisma

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema and generated client (needed at runtime for migrations)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy startup script
COPY --from=builder /app/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Change ownership
RUN chown -R nextjs:nodejs /app

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start with migration script
CMD ["/app/start.sh"]
