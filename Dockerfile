# ---------- BASE IMAGE ----------
FROM node:22.12-alpine AS base
WORKDIR /app

# ---------- DEPENDENCIES ----------
FROM base AS deps
COPY package*.json ./
RUN npm ci --include=dev

# ---------- BUILD ----------
FROM deps AS build
COPY . .
# Set dummy DATABASE_URL for Prisma generation (not used at build runtime)
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ENV DATABASE_URL=$DATABASE_URL
RUN npm run prisma:generate
RUN npm run build

# ---------- DEVELOPMENT ----------
FROM deps AS development
WORKDIR /app
COPY . .
ENV NODE_ENV=development
# Ensure Prisma Client is generated for development image
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ENV DATABASE_URL=$DATABASE_URL
RUN npm run prisma:generate
EXPOSE 3000
# Run dev without `watch` for Docker stability; pass --host for hot reload externally
CMD ["npm", "run", "dev"]

# ---------- PRODUCTION ----------
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

# Install prod dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts and prisma schema
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3000
CMD ["sh", "-c", "npx prisma generate && node dist/src/server.js"]
