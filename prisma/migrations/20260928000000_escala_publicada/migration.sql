-- CreateTable
CREATE TABLE "EscalaPublicada" (
    "id" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "publicadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscalaPublicada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EscalaPublicada_mes_key" ON "EscalaPublicada"("mes");
