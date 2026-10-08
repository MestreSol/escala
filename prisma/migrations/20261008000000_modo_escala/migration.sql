-- Modo de escala por pastoral: MENSAL (como sempre foi) ou SEMANAL. Só
-- acrescenta: todas as pastorais existentes ficam MENSAL, nada muda pra elas.

-- CreateEnum
CREATE TYPE "ModoEscala" AS ENUM ('MENSAL', 'SEMANAL');

-- AlterTable
ALTER TABLE "Pastoral" ADD COLUMN "modoEscala" "ModoEscala" NOT NULL DEFAULT 'MENSAL';
