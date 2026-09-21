-- Troca idade (que precisava de atualização manual todo ano) por data de
-- nascimento, e adiciona a foto do servidor. Linhas existentes ficam com
-- "dataNascimento" nula até o admin preencher (não dá pra derivar a data
-- de nascimento a partir só da idade).
ALTER TABLE "Servidor" ADD COLUMN "dataNascimento" TIMESTAMP(3);
ALTER TABLE "Servidor" ADD COLUMN "fotoUrl" TEXT;
ALTER TABLE "Servidor" DROP COLUMN "idade";
