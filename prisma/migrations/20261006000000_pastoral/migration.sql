-- Pastorais dentro da paróquia (ex: coroinhas, ministros). Cada paróquia
-- existente ganha uma pastoral "Coroinhas" e tudo que já existe vai para ela;
-- as colunas entram nulas, são preenchidas e só então viram NOT NULL, então
-- nenhum dado é perdido. Missas e ocorrências continuam da paróquia
-- (compartilhadas); o modo "quem serve" de cada missa sai de Missa e vai para
-- MissaPastoral, por pastoral.

-- CreateEnum
CREATE TYPE "TipoPastoral" AS ENUM ('COROINHAS', 'MINISTROS');

-- CreateTable
CREATE TABLE "Pastoral" (
    "id" TEXT NOT NULL,
    "paroquiaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tipo" "TipoPastoral" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pastoral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissaPastoral" (
    "id" TEXT NOT NULL,
    "missaId" TEXT NOT NULL,
    "pastoralId" TEXT NOT NULL,
    "escalarTodosAtivos" BOOLEAN NOT NULL DEFAULT false,
    "comunidadeResponsavel" TEXT,

    CONSTRAINT "MissaPastoral_pkey" PRIMARY KEY ("id")
);

-- Mesma política das outras tabelas (ver 20260929000000_habilitar_rls).
ALTER TABLE "Pastoral" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MissaPastoral" ENABLE ROW LEVEL SECURITY;

INSERT INTO "Pastoral" ("id", "paroquiaId", "nome", "slug", "tipo", "updatedAt")
SELECT 'pastoral-' || "id", "id", 'Coroinhas', 'coroinhas', 'COROINHAS', CURRENT_TIMESTAMP
FROM "Paroquia";

-- AlterTable (nulas por enquanto, preenchidas logo abaixo)
ALTER TABLE "Usuario" ADD COLUMN "pastoralId" TEXT;
ALTER TABLE "Funcao" ADD COLUMN "pastoralId" TEXT;
ALTER TABLE "Servidor" ADD COLUMN "pastoralId" TEXT;
ALTER TABLE "Escala" ADD COLUMN "pastoralId" TEXT;
ALTER TABLE "EscalaPublicada" ADD COLUMN "pastoralId" TEXT;
ALTER TABLE "EscalaAtribuicao" ADD COLUMN "pastoralId" TEXT;

-- Backfill
UPDATE "Funcao" SET "pastoralId" = 'pastoral-' || "paroquiaId";
UPDATE "Servidor" SET "pastoralId" = 'pastoral-' || "paroquiaId";
UPDATE "Escala" SET "pastoralId" = 'pastoral-' || "paroquiaId";
UPDATE "EscalaPublicada" SET "pastoralId" = 'pastoral-' || "paroquiaId";
UPDATE "EscalaAtribuicao" AS a
SET "pastoralId" = 'pastoral-' || o."paroquiaId"
FROM "MissaOcorrencia" AS o
WHERE o."id" = a."ocorrenciaId";
-- ADMIN continua cuidando da paróquia toda (pastoralId nulo: escolhe a
-- pastoral no painel); OPERADOR fica preso aos coroinhas.
UPDATE "Usuario" SET "pastoralId" = 'pastoral-' || "paroquiaId"
WHERE "papel" = 'OPERADOR' AND "paroquiaId" IS NOT NULL;

-- Usuario.pastoralId continua nulo-ável (ADMIN da paróquia e SUPERADMIN).
ALTER TABLE "Funcao" ALTER COLUMN "pastoralId" SET NOT NULL;
ALTER TABLE "Servidor" ALTER COLUMN "pastoralId" SET NOT NULL;
ALTER TABLE "Escala" ALTER COLUMN "pastoralId" SET NOT NULL;
ALTER TABLE "EscalaPublicada" ALTER COLUMN "pastoralId" SET NOT NULL;
ALTER TABLE "EscalaAtribuicao" ALTER COLUMN "pastoralId" SET NOT NULL;

-- O modo "quem serve" das missas existentes passa a ser o dos coroinhas.
INSERT INTO "MissaPastoral" ("id", "missaId", "pastoralId", "escalarTodosAtivos", "comunidadeResponsavel")
SELECT 'mp-' || "id", "id", 'pastoral-' || "paroquiaId", "escalarTodosAtivos", "comunidadeResponsavel"
FROM "Missa"
WHERE "escalarTodosAtivos" = true OR "comunidadeResponsavel" IS NOT NULL;

ALTER TABLE "Missa" DROP COLUMN "escalarTodosAtivos";
ALTER TABLE "Missa" DROP COLUMN "comunidadeResponsavel";

-- Cada pastoral publica o próprio mês.
DROP INDEX "EscalaPublicada_paroquiaId_mes_key";
CREATE UNIQUE INDEX "EscalaPublicada_pastoralId_mes_key" ON "EscalaPublicada"("pastoralId", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "Pastoral_paroquiaId_slug_key" ON "Pastoral"("paroquiaId", "slug");
CREATE UNIQUE INDEX "MissaPastoral_missaId_pastoralId_key" ON "MissaPastoral"("missaId", "pastoralId");
CREATE INDEX "MissaPastoral_pastoralId_idx" ON "MissaPastoral"("pastoralId");
CREATE INDEX "Usuario_pastoralId_idx" ON "Usuario"("pastoralId");
CREATE INDEX "Funcao_pastoralId_idx" ON "Funcao"("pastoralId");
CREATE INDEX "Servidor_pastoralId_idx" ON "Servidor"("pastoralId");
CREATE INDEX "Escala_pastoralId_idx" ON "Escala"("pastoralId");
CREATE INDEX "EscalaAtribuicao_pastoralId_idx" ON "EscalaAtribuicao"("pastoralId");

-- AddForeignKey
ALTER TABLE "Pastoral" ADD CONSTRAINT "Pastoral_paroquiaId_fkey" FOREIGN KEY ("paroquiaId") REFERENCES "Paroquia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_pastoralId_fkey" FOREIGN KEY ("pastoralId") REFERENCES "Pastoral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Funcao" ADD CONSTRAINT "Funcao_pastoralId_fkey" FOREIGN KEY ("pastoralId") REFERENCES "Pastoral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissaPastoral" ADD CONSTRAINT "MissaPastoral_missaId_fkey" FOREIGN KEY ("missaId") REFERENCES "Missa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissaPastoral" ADD CONSTRAINT "MissaPastoral_pastoralId_fkey" FOREIGN KEY ("pastoralId") REFERENCES "Pastoral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Servidor" ADD CONSTRAINT "Servidor_pastoralId_fkey" FOREIGN KEY ("pastoralId") REFERENCES "Pastoral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EscalaPublicada" ADD CONSTRAINT "EscalaPublicada_pastoralId_fkey" FOREIGN KEY ("pastoralId") REFERENCES "Pastoral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_pastoralId_fkey" FOREIGN KEY ("pastoralId") REFERENCES "Pastoral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EscalaAtribuicao" ADD CONSTRAINT "EscalaAtribuicao_pastoralId_fkey" FOREIGN KEY ("pastoralId") REFERENCES "Pastoral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
