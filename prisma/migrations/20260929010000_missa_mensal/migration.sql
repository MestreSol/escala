-- Missas mensais (ex: primeira sexta-feira do mês): diaSemana + semanaDoMes.
-- 1-4 = 1ª..4ª ocorrência do dia no mês, 5 = última. Nulo = semanal.
ALTER TABLE "Missa" ADD COLUMN "semanaDoMes" INTEGER;
ALTER TABLE "Missa" ADD CONSTRAINT "Missa_semanaDoMes_check" CHECK ("semanaDoMes" IS NULL OR ("semanaDoMes" BETWEEN 1 AND 5));
