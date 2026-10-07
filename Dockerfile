# Imagem de produção do app (Next.js standalone) + um estágio separado só pra
# aplicar migrations. Ver docker-compose.yml.
#
# O app em runtime usa @supabase/supabase-js (não o Prisma Client); o Prisma
# só entra no estágio `migrator`, que roda `prisma migrate deploy` — esse
# comando só aplica migrations pendentes, nunca apaga nem reseta o banco.

FROM node:24-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
# openssl: exigido pelos engines do Prisma (estágio migrator).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------------------------------------------------------------------------
# Dependências (package-lock.json é o lockfile versionado)
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# As variáveis do Supabase/sessão não são necessárias no build (lib/supabase.ts
# usa placeholder e as páginas são dinâmicas) — chegam só em runtime.
RUN npm run build

# ---------------------------------------------------------------------------
# Migrations: docker compose run --rm migrate
# ---------------------------------------------------------------------------
FROM base AS migrator
COPY --from=deps /app/node_modules ./node_modules
COPY package.json prisma.config.ts ./
COPY prisma ./prisma
CMD ["npx", "prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Fontes lidas via fs pela imagem da escala (app/admin/(dashboard)/calendario/imagem).
COPY --from=builder --chown=nextjs:nodejs /app/assets ./assets

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
