-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Funcao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL,
    "categoriaFuncao" TEXT NOT NULL,
    "quantidadePadrao" INTEGER NOT NULL DEFAULT 1,
    "exigeGrupoCompleto" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Funcao" ("ativo", "categoriaFuncao", "createdAt", "id", "nome", "prioridade", "quantidadePadrao", "updatedAt") SELECT "ativo", "categoriaFuncao", "createdAt", "id", "nome", "prioridade", "quantidadePadrao", "updatedAt" FROM "Funcao";
DROP TABLE "Funcao";
ALTER TABLE "new_Funcao" RENAME TO "Funcao";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
