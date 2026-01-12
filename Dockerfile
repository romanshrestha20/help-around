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
# Set a dummy DATABASE_URL for Prisma generation (not used at runtime)
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ENV DATABASE_URL=$DATABASE_URL
# Generate Prisma client before building TypeScript
RUN npm run prisma:generate
# Build TypeScript
RUN npm run build

# ---------- PRODUCTION RUNTIME ----------
FROM base AS production
ENV NODE_ENV=production

# Install only prod dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy schema for runtime Prisma generation
COPY --from=build /app/prisma ./prisma

# Copy built artifacts
COPY --from=build /app/dist ./dist

# Expose app port
EXPOSE 3000

# Generate Prisma client at runtime and start the server
CMD npx prisma generate && node dist/src/server.js
