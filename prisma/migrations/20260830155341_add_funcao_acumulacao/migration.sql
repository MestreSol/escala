-- CreateTable
CREATE TABLE "_FuncaoAcumulacao" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_FuncaoAcumulacao_A_fkey" FOREIGN KEY ("A") REFERENCES "Funcao" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_FuncaoAcumulacao_B_fkey" FOREIGN KEY ("B") REFERENCES "Funcao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_FuncaoAcumulacao_AB_unique" ON "_FuncaoAcumulacao"("A", "B");

-- CreateIndex
CREATE INDEX "_FuncaoAcumulacao_B_index" ON "_FuncaoAcumulacao"("B");
