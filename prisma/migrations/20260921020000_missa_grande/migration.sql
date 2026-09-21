-- "Missas grandes": eventos de data única (ex: Natal) escalados por "todos
-- os servidores ativos" ou por "responsabilidade de uma comunidade", em vez
-- do ciclo semanal + preferência normal.
--
-- Usa IF NOT EXISTS: "dataUnica" e "escalarTodosAtivos" já existiam nesta
-- base (adicionadas fora do fluxo de migration antes desta) — só
-- "comunidadeResponsavel" é de fato nova aqui.
ALTER TABLE "Missa" ADD COLUMN IF NOT EXISTS "dataUnica" TIMESTAMP(3);
ALTER TABLE "Missa" ADD COLUMN IF NOT EXISTS "escalarTodosAtivos" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Missa" ADD COLUMN IF NOT EXISTS "comunidadeResponsavel" TEXT;
