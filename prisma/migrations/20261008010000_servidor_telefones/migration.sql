-- Celular do servidor e do responsável (opcionais). Só acrescenta colunas
-- vazias; nenhum dado existente muda.
ALTER TABLE "Servidor" ADD COLUMN "celular" TEXT;
ALTER TABLE "Servidor" ADD COLUMN "celularResponsavel" TEXT;
