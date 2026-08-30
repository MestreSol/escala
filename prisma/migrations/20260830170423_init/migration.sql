-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "Grau" AS ENUM ('COROINHA', 'ACOLITO', 'CERIMONIARIO');

-- CreateTable
CREATE TABLE "Funcao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "prioridade" "Prioridade" NOT NULL,
    "grauMinimo" "Grau" NOT NULL,
    "quantidadePadrao" INTEGER NOT NULL DEFAULT 1,
    "exigeGrupoCompleto" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funcao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Missa" (
    "id" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horario" TEXT NOT NULL,
    "comunidade" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Missa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissaFuncaoRequisito" (
    "id" TEXT NOT NULL,
    "missaId" TEXT NOT NULL,
    "funcaoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MissaFuncaoRequisito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servidor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "idade" INTEGER NOT NULL,
    "comunidade" TEXT NOT NULL,
    "categoria" "Grau" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servidor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServidorMissaPreferencia" (
    "id" TEXT NOT NULL,
    "servidorId" TEXT NOT NULL,
    "missaId" TEXT NOT NULL,

    CONSTRAINT "ServidorMissaPreferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissaOcorrencia" (
    "id" TEXT NOT NULL,
    "missaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissaOcorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escala" (
    "id" TEXT NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFim" TIMESTAMP(3) NOT NULL,
    "geradaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Escala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalaAtribuicao" (
    "id" TEXT NOT NULL,
    "escalaId" TEXT,
    "ocorrenciaId" TEXT NOT NULL,
    "funcaoId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL DEFAULT 1,
    "servidorId" TEXT,
    "servidorNomeSnapshot" TEXT,
    "geradoAutomaticamente" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalaAtribuicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FuncaoAcumulacao" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FuncaoAcumulacao_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "MissaFuncaoRequisito_missaId_funcaoId_key" ON "MissaFuncaoRequisito"("missaId", "funcaoId");

-- CreateIndex
CREATE UNIQUE INDEX "ServidorMissaPreferencia_servidorId_missaId_key" ON "ServidorMissaPreferencia"("servidorId", "missaId");

-- CreateIndex
CREATE UNIQUE INDEX "MissaOcorrencia_missaId_data_key" ON "MissaOcorrencia"("missaId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "EscalaAtribuicao_ocorrenciaId_funcaoId_slotIndex_key" ON "EscalaAtribuicao"("ocorrenciaId", "funcaoId", "slotIndex");

-- CreateIndex
CREATE INDEX "_FuncaoAcumulacao_B_index" ON "_FuncaoAcumulacao"("B");

-- AddForeignKey
ALTER TABLE "MissaFuncaoRequisito" ADD CONSTRAINT "MissaFuncaoRequisito_missaId_fkey" FOREIGN KEY ("missaId") REFERENCES "Missa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissaFuncaoRequisito" ADD CONSTRAINT "MissaFuncaoRequisito_funcaoId_fkey" FOREIGN KEY ("funcaoId") REFERENCES "Funcao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServidorMissaPreferencia" ADD CONSTRAINT "ServidorMissaPreferencia_servidorId_fkey" FOREIGN KEY ("servidorId") REFERENCES "Servidor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServidorMissaPreferencia" ADD CONSTRAINT "ServidorMissaPreferencia_missaId_fkey" FOREIGN KEY ("missaId") REFERENCES "Missa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissaOcorrencia" ADD CONSTRAINT "MissaOcorrencia_missaId_fkey" FOREIGN KEY ("missaId") REFERENCES "Missa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalaAtribuicao" ADD CONSTRAINT "EscalaAtribuicao_escalaId_fkey" FOREIGN KEY ("escalaId") REFERENCES "Escala"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalaAtribuicao" ADD CONSTRAINT "EscalaAtribuicao_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "MissaOcorrencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalaAtribuicao" ADD CONSTRAINT "EscalaAtribuicao_funcaoId_fkey" FOREIGN KEY ("funcaoId") REFERENCES "Funcao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalaAtribuicao" ADD CONSTRAINT "EscalaAtribuicao_servidorId_fkey" FOREIGN KEY ("servidorId") REFERENCES "Servidor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FuncaoAcumulacao" ADD CONSTRAINT "_FuncaoAcumulacao_A_fkey" FOREIGN KEY ("A") REFERENCES "Funcao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FuncaoAcumulacao" ADD CONSTRAINT "_FuncaoAcumulacao_B_fkey" FOREIGN KEY ("B") REFERENCES "Funcao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
