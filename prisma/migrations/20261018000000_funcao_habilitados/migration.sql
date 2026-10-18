-- Função restrita a servidores escolhidos. Só acrescenta: coluna nova com
-- default false (nenhuma função existente muda) e tabela nova vazia.

-- AlterTable
ALTER TABLE "Funcao" ADD COLUMN "somenteHabilitados" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FuncaoHabilitado" (
    "id" TEXT NOT NULL,
    "funcaoId" TEXT NOT NULL,
    "servidorId" TEXT NOT NULL,

    CONSTRAINT "FuncaoHabilitado_pkey" PRIMARY KEY ("id")
);

-- Mesma política das outras tabelas (ver 20260929000000_habilitar_rls).
ALTER TABLE "FuncaoHabilitado" ENABLE ROW LEVEL SECURITY;

-- CreateIndex
CREATE UNIQUE INDEX "FuncaoHabilitado_funcaoId_servidorId_key" ON "FuncaoHabilitado"("funcaoId", "servidorId");
CREATE INDEX "FuncaoHabilitado_servidorId_idx" ON "FuncaoHabilitado"("servidorId");

-- AddForeignKey
ALTER TABLE "FuncaoHabilitado" ADD CONSTRAINT "FuncaoHabilitado_funcaoId_fkey" FOREIGN KEY ("funcaoId") REFERENCES "Funcao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FuncaoHabilitado" ADD CONSTRAINT "FuncaoHabilitado_servidorId_fkey" FOREIGN KEY ("servidorId") REFERENCES "Servidor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
