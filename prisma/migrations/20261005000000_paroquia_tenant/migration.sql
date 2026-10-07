-- Multi-tenant por paróquia. Tudo que já existe vai para uma paróquia
-- padrão (renomeie nome/slug depois, pelo painel de SUPERADMIN em
-- /admin/paroquias); as colunas entram nulas, são preenchidas e só então
-- viram NOT NULL, então nenhum dado é perdido.

-- AlterEnum
ALTER TYPE "PapelUsuario" ADD VALUE 'SUPERADMIN';

-- CreateTable
CREATE TABLE "Paroquia" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paroquia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Paroquia_slug_key" ON "Paroquia"("slug");

-- Mesma política das outras tabelas (ver 20260929000000_habilitar_rls).
ALTER TABLE "Paroquia" ENABLE ROW LEVEL SECURITY;

INSERT INTO "Paroquia" ("id", "nome", "slug", "updatedAt")
VALUES ('paroquia-padrao', 'Paróquia', 'paroquia', CURRENT_TIMESTAMP);

-- AlterTable (nulas por enquanto, preenchidas logo abaixo)
ALTER TABLE "Usuario" ADD COLUMN "paroquiaId" TEXT;
ALTER TABLE "Funcao" ADD COLUMN "paroquiaId" TEXT;
ALTER TABLE "Missa" ADD COLUMN "paroquiaId" TEXT;
ALTER TABLE "Servidor" ADD COLUMN "paroquiaId" TEXT;
ALTER TABLE "MissaOcorrencia" ADD COLUMN "paroquiaId" TEXT;
ALTER TABLE "EscalaPublicada" ADD COLUMN "paroquiaId" TEXT;
ALTER TABLE "Escala" ADD COLUMN "paroquiaId" TEXT;

-- Backfill
UPDATE "Usuario" SET "paroquiaId" = 'paroquia-padrao';
UPDATE "Funcao" SET "paroquiaId" = 'paroquia-padrao';
UPDATE "Missa" SET "paroquiaId" = 'paroquia-padrao';
UPDATE "Servidor" SET "paroquiaId" = 'paroquia-padrao';
UPDATE "MissaOcorrencia" SET "paroquiaId" = 'paroquia-padrao';
UPDATE "EscalaPublicada" SET "paroquiaId" = 'paroquia-padrao';
UPDATE "Escala" SET "paroquiaId" = 'paroquia-padrao';

-- Usuario.paroquiaId continua nulo-ável (SUPERADMIN não tem paróquia).
ALTER TABLE "Funcao" ALTER COLUMN "paroquiaId" SET NOT NULL;
ALTER TABLE "Missa" ALTER COLUMN "paroquiaId" SET NOT NULL;
ALTER TABLE "Servidor" ALTER COLUMN "paroquiaId" SET NOT NULL;
ALTER TABLE "MissaOcorrencia" ALTER COLUMN "paroquiaId" SET NOT NULL;
ALTER TABLE "EscalaPublicada" ALTER COLUMN "paroquiaId" SET NOT NULL;
ALTER TABLE "Escala" ALTER COLUMN "paroquiaId" SET NOT NULL;

-- O mesmo mês agora pode ser publicado por paróquias diferentes.
DROP INDEX "EscalaPublicada_mes_key";
CREATE UNIQUE INDEX "EscalaPublicada_paroquiaId_mes_key" ON "EscalaPublicada"("paroquiaId", "mes");

-- CreateIndex
CREATE INDEX "Usuario_paroquiaId_idx" ON "Usuario"("paroquiaId");
CREATE INDEX "Funcao_paroquiaId_idx" ON "Funcao"("paroquiaId");
CREATE INDEX "Missa_paroquiaId_idx" ON "Missa"("paroquiaId");
CREATE INDEX "Servidor_paroquiaId_idx" ON "Servidor"("paroquiaId");
CREATE INDEX "MissaOcorrencia_paroquiaId_data_idx" ON "MissaOcorrencia"("paroquiaId", "data");
CREATE INDEX "Escala_paroquiaId_idx" ON "Escala"("paroquiaId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_paroquiaId_fkey" FOREIGN KEY ("paroquiaId") REFERENCES "Paroquia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Funcao" ADD CONSTRAINT "Funcao_paroquiaId_fkey" FOREIGN KEY ("paroquiaId") REFERENCES "Paroquia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Missa" ADD CONSTRAINT "Missa_paroquiaId_fkey" FOREIGN KEY ("paroquiaId") REFERENCES "Paroquia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Servidor" ADD CONSTRAINT "Servidor_paroquiaId_fkey" FOREIGN KEY ("paroquiaId") REFERENCES "Paroquia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissaOcorrencia" ADD CONSTRAINT "MissaOcorrencia_paroquiaId_fkey" FOREIGN KEY ("paroquiaId") REFERENCES "Paroquia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EscalaPublicada" ADD CONSTRAINT "EscalaPublicada_paroquiaId_fkey" FOREIGN KEY ("paroquiaId") REFERENCES "Paroquia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_paroquiaId_fkey" FOREIGN KEY ("paroquiaId") REFERENCES "Paroquia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
