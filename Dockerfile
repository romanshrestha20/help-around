# ---------- BASE IMAGE ----------
FROM node:22-alpine AS base
WORKDIR /app

# ---------- DEPENDENCIES ----------
FROM base AS deps
COPY package*.json ./
RUN npm ci --include=dev

# ---------- BUILD ----------
FROM deps AS build
COPY . .
# Only build TypeScript, do NOT generate Prisma client here (use runtime)
RUN npm run build

# ---------- PRODUCTION RUNTIME ----------
FROM base AS production
ENV NODE_ENV=production

# Install only prod dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./dist/prisma

# Expose app port
EXPOSE 3000

# Start the server
CMD ["node", "dist/src/server.js"]
