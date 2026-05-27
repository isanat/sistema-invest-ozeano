# ============================================================================
# ActionCash - PLATAFORMA ROI - Production Dockerfile for Coolify
# ============================================================================

# Force cache invalidation
ARG CACHEBUST=1

FROM node:20-alpine AS builder

WORKDIR /app

# Increase Node memory for large builds
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Override NODE_ENV to ensure devDependencies are installed
# Coolify sets NODE_ENV=production as build arg which skips devDeps
ARG NODE_ENV=development
ENV NODE_ENV=development

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm install

# Copy prisma schema and generate client
COPY prisma ./prisma/
COPY scripts/prisma-provider.js ./scripts/prisma-provider.js

# Set build-time DATABASE_URL for Prisma generate only
# The actual database URL will be provided at runtime via Coolify environment variables
# prisma generate does NOT connect to the database - it only needs the schema
# prisma db push (in build script) is conditional: skipped if DATABASE_URL is empty
ARG DATABASE_URL=""
ENV DATABASE_URL=${DATABASE_URL}

# Set JWT_SECRET for build (prevents middleware warning)
ARG JWT_SECRET="build-time-placeholder"
ENV JWT_SECRET=${JWT_SECRET}

# Switch provider to PostgreSQL and generate Prisma client
RUN node scripts/prisma-provider.js && npx prisma generate

# Copy source code
COPY . .

# Clean any stale .next cache
RUN rm -rf .next

# Build the Next.js application
# The package.json build script uses --webpack --experimental-build-mode compile
# which avoids Turbopack prerendering bugs
RUN npm run build

# Verify build output exists
RUN ls -la .next/ && echo "Build output verified"

# ============================================================================
# Production stage
# ============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set NODE_ENV to production for runtime
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Install curl for health checks
RUN apk add --no-cache curl

# Copy only necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/public ./public
COPY --from=builder /app/start.sh ./start.sh
COPY --from=builder /app/next.config.ts ./next.config.ts

# Make start.sh executable
RUN chmod +x /app/start.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/start.sh"]
