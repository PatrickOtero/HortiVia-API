FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS builder
COPY package.json package-lock.json ./
COPY nest-cli.json tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npm ci
RUN npm run prisma:generate
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/package-lock.json ./package-lock.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node --from=builder /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
