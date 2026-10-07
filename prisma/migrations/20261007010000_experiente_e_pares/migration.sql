-- Servidor experiente + pares de funções. Só acrescenta: coluna nova com
-- default false (ninguém começa marcado) e tabela nova vazia.

-- AlterTable
ALTER TABLE "Servidor" ADD COLUMN "experiente" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FuncaoPar" (
    "id" TEXT NOT NULL,
    "pastoralId" TEXT NOT NULL,
    "funcaoAId" TEXT NOT NULL,
    "funcaoBId" TEXT NOT NULL,

    CONSTRAINT "FuncaoPar_pkey" PRIMARY KEY ("id")
);

-- Mesma política das outras tabelas (ver 20260929000000_habilitar_rls).
ALTER TABLE "FuncaoPar" ENABLE ROW LEVEL SECURITY;

-- CreateIndex
CREATE UNIQUE INDEX "FuncaoPar_funcaoAId_funcaoBId_key" ON "FuncaoPar"("funcaoAId", "funcaoBId");
CREATE INDEX "FuncaoPar_pastoralId_idx" ON "FuncaoPar"("pastoralId");

-- AddForeignKey
ALTER TABLE "FuncaoPar" ADD CONSTRAINT "FuncaoPar_funcaoAId_fkey" FOREIGN KEY ("funcaoAId") REFERENCES "Funcao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FuncaoPar" ADD CONSTRAINT "FuncaoPar_funcaoBId_fkey" FOREIGN KEY ("funcaoBId") REFERENCES "Funcao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FuncaoPar" ADD CONSTRAINT "FuncaoPar_pastoralId_fkey" FOREIGN KEY ("pastoralId") REFERENCES "Pastoral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
