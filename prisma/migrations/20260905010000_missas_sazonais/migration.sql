-- AlterTable
ALTER TABLE "Missa" ALTER COLUMN "diaSemana" DROP NOT NULL;
ALTER TABLE "Missa" ADD COLUMN "dataUnica" TIMESTAMP(3);
ALTER TABLE "Missa" ADD COLUMN "escalarTodosAtivos" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EscalaAtribuicao" ALTER COLUMN "funcaoId" DROP NOT NULL;
