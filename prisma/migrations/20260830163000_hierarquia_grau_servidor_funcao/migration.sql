-- Refatora categorias em hierarquia de grau (COROINHA < ACOLITO < CERIMONIARIO).
-- Funcao.categoriaFuncao -> Funcao.grauMinimo (AMBOS vira COROINHA, já que
-- agora qualquer grau cobre as funções do grau mais baixo).
-- Servidor.isAcolito/isCoroinha/isCerimoniario -> Servidor.categoria (grau
-- único, usando o maior grau marcado como valor de migração).
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Funcao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL,
    "grauMinimo" TEXT NOT NULL,
    "quantidadePadrao" INTEGER NOT NULL DEFAULT 1,
    "exigeGrupoCompleto" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Funcao" ("id", "nome", "prioridade", "grauMinimo", "quantidadePadrao", "exigeGrupoCompleto", "ativo", "createdAt", "updatedAt")
SELECT
  "id", "nome", "prioridade",
  CASE "categoriaFuncao" WHEN 'AMBOS' THEN 'COROINHA' ELSE "categoriaFuncao" END,
  "quantidadePadrao", "exigeGrupoCompleto", "ativo", "createdAt", "updatedAt"
FROM "Funcao";

DROP TABLE "Funcao";
ALTER TABLE "new_Funcao" RENAME TO "Funcao";

CREATE TABLE "new_Servidor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "idade" INTEGER NOT NULL,
    "comunidade" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Servidor" ("id", "nome", "idade", "comunidade", "categoria", "ativo", "createdAt", "updatedAt")
SELECT
  "id", "nome", "idade", "comunidade",
  CASE
    WHEN "isCerimoniario" = 1 THEN 'CERIMONIARIO'
    WHEN "isAcolito" = 1 THEN 'ACOLITO'
    ELSE 'COROINHA'
  END,
  "ativo", "createdAt", "updatedAt"
FROM "Servidor";

DROP TABLE "Servidor";
ALTER TABLE "new_Servidor" RENAME TO "Servidor";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
