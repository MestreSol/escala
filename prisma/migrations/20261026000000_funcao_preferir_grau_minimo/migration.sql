-- Preferir o grau mínimo da função (ex: só coroinhas no Ceroferário Pequeno).
-- Só acrescenta: coluna nova com default false (nenhuma função existente muda).

-- AlterTable
ALTER TABLE "Funcao" ADD COLUMN "preferirGrauMinimo" BOOLEAN NOT NULL DEFAULT false;
