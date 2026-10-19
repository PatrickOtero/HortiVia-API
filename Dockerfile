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

# This target keeps the Prisma CLI available to Northflank's one-off migration job.
FROM builder AS migration
ENV NODE_ENV=production
USER node
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM base AS production-dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
# npm installs Prisma's optional peer with @prisma/client; only the migration target needs its CLI.
RUN rm -rf node_modules/prisma

FROM base AS runtime
ENV NODE_ENV=production
COPY --chown=node:node --from=production-dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
