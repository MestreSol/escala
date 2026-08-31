-- Vínculo entre servidores (ex: irmãos que só servem juntos).
CREATE TABLE "ServidorVinculo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "servidorAId" TEXT NOT NULL,
    "servidorBId" TEXT NOT NULL,
    CONSTRAINT "ServidorVinculo_servidorAId_fkey" FOREIGN KEY ("servidorAId") REFERENCES "Servidor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServidorVinculo_servidorBId_fkey" FOREIGN KEY ("servidorBId") REFERENCES "Servidor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ServidorVinculo_servidorAId_servidorBId_key" ON "ServidorVinculo"("servidorAId", "servidorBId");
