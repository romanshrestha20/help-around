# ---------- BASE IMAGE ----------
FROM node:22-alpine AS base
WORKDIR /app

# ---------- DEPENDENCIES ----------
FROM base AS deps
COPY package*.json ./
RUN npm ci --include=dev

# ---------- BUILD ----------
FROM deps AS build
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
COPY . .
RUN rm -rf prisma/generated && npx prisma generate && npm run build

# ---------- PRODUCTION RUNTIME ----------
FROM base AS production
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts and prisma schema
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./dist/prisma 

# Port the app listens on (see server.ts)
EXPOSE 3000

# Start the server
CMD ["node", "dist/src/server.js"]
