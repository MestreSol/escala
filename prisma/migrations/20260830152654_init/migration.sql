-- CreateTable
CREATE TABLE "Funcao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL,
    "categoriaFuncao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Missa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "diaSemana" INTEGER NOT NULL,
    "horario" TEXT NOT NULL,
    "comunidade" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MissaFuncaoRequisito" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missaId" TEXT NOT NULL,
    "funcaoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MissaFuncaoRequisito_missaId_fkey" FOREIGN KEY ("missaId") REFERENCES "Missa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MissaFuncaoRequisito_funcaoId_fkey" FOREIGN KEY ("funcaoId") REFERENCES "Funcao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Servidor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "idade" INTEGER NOT NULL,
    "comunidade" TEXT NOT NULL,
    "isAcolito" BOOLEAN NOT NULL DEFAULT false,
    "isCoroinha" BOOLEAN NOT NULL DEFAULT false,
    "isCerimoniario" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ServidorMissaPreferencia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "servidorId" TEXT NOT NULL,
    "missaId" TEXT NOT NULL,
    CONSTRAINT "ServidorMissaPreferencia_servidorId_fkey" FOREIGN KEY ("servidorId") REFERENCES "Servidor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServidorMissaPreferencia_missaId_fkey" FOREIGN KEY ("missaId") REFERENCES "Missa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MissaOcorrencia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missaId" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissaOcorrencia_missaId_fkey" FOREIGN KEY ("missaId") REFERENCES "Missa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Escala" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodoInicio" DATETIME NOT NULL,
    "periodoFim" DATETIME NOT NULL,
    "geradaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EscalaAtribuicao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escalaId" TEXT,
    "ocorrenciaId" TEXT NOT NULL,
    "funcaoId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL DEFAULT 1,
    "servidorId" TEXT,
    "servidorNomeSnapshot" TEXT,
    "geradoAutomaticamente" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EscalaAtribuicao_escalaId_fkey" FOREIGN KEY ("escalaId") REFERENCES "Escala" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EscalaAtribuicao_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "MissaOcorrencia" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EscalaAtribuicao_funcaoId_fkey" FOREIGN KEY ("funcaoId") REFERENCES "Funcao" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EscalaAtribuicao_servidorId_fkey" FOREIGN KEY ("servidorId") REFERENCES "Servidor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MissaFuncaoRequisito_missaId_funcaoId_key" ON "MissaFuncaoRequisito"("missaId", "funcaoId");

-- CreateIndex
CREATE UNIQUE INDEX "ServidorMissaPreferencia_servidorId_missaId_key" ON "ServidorMissaPreferencia"("servidorId", "missaId");

-- CreateIndex
CREATE UNIQUE INDEX "MissaOcorrencia_missaId_data_key" ON "MissaOcorrencia"("missaId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "EscalaAtribuicao_ocorrenciaId_funcaoId_slotIndex_key" ON "EscalaAtribuicao"("ocorrenciaId", "funcaoId", "slotIndex");
