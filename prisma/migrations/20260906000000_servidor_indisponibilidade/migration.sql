-- CreateTable
CREATE TABLE "ServidorIndisponibilidade" (
    "id" TEXT NOT NULL,
    "servidorId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServidorIndisponibilidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServidorIndisponibilidade_servidorId_data_key" ON "ServidorIndisponibilidade"("servidorId", "data");

-- AddForeignKey
ALTER TABLE "ServidorIndisponibilidade" ADD CONSTRAINT "ServidorIndisponibilidade_servidorId_fkey" FOREIGN KEY ("servidorId") REFERENCES "Servidor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
