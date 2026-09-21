-- Dias em que o próprio servidor registrou que não pode servir no mês.
CREATE TABLE "ServidorIndisponibilidade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "servidorId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServidorIndisponibilidade_servidorId_fkey" FOREIGN KEY ("servidorId") REFERENCES "Servidor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ServidorIndisponibilidade_servidorId_data_key" ON "ServidorIndisponibilidade"("servidorId", "data");
