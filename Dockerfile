# ============================================================================
# Mining Protocol - Production Dockerfile
# ============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install bun and dependencies
RUN npm install -g bun && bun install

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# ============================================================================
# Production stage
# ============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install Prisma CLI v6 (matches the project's @prisma/client version)
RUN npm install -g prisma@6

# Create user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files for runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy and set up startup script
COPY --from=builder /app/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Fix ownership
RUN chown -R nextjs:nodejs /app

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/start.sh"]
