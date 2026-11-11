# syntax=docker/dockerfile:1

ARG NODE_VERSION=24-bookworm-slim

FROM node:${NODE_VERSION} AS deps
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN --mount=type=cache,id=dukka-npm,target=/root/.npm \
  npm ci --prefer-offline --no-audit --no-fund

# --- build all Nest apps ---
FROM deps AS build
WORKDIR /app

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY apps ./apps
COPY libs ./libs

RUN cd libs/common \
  && npx prisma generate --config prisma7.config.ts

RUN npx nest build dukka \
  && npx nest build mail_worker \
  && npx nest build general_worker

FROM build AS production-deps
WORKDIR /app
RUN --mount=type=cache,id=dukka-npm,target=/root/.npm \
  npm prune --omit=dev \
  && npm install prisma@7.10.0 dotenv@18.0.7 tsx@4.23.15 --no-save --prefer-offline --no-audit --no-fund


FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
  DUKKA_PORT=8000

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    tini \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 dukka \
  && useradd --system --uid 1001 --gid dukka --create-home dukka

COPY package.json package-lock.json ./
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/libs/common/prisma ./libs/common/prisma
COPY --from=build /app/libs/common/prisma7.config.ts ./libs/common/prisma7.config.ts
COPY --from=build /app/libs/common/generated ./libs/common/generated
COPY docker/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
  && chown -R dukka:dukka /app

USER dukka

EXPOSE 8000

ENTRYPOINT ["tini", "--", "/entrypoint.sh"]
CMD ["node", "dist/apps/dukka/main.js"]
