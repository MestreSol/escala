-- Liga Row Level Security em todas as tabelas, SEM nenhuma policy: as chaves
-- públicas do Supabase (anon/authenticated) passam a não ler nem gravar nada,
-- mesmo que algum grant volte a existir ou a chave anon vaze.
--
-- O site não muda: ele usa a chave service_role (lib/supabase.ts) e o Prisma
-- usa o usuário postgres — os dois têm BYPASSRLS no Supabase.
ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Funcao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_FuncaoAcumulacao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Missa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MissaFuncaoRequisito" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MissaOcorrencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Servidor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServidorMissaPreferencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServidorVinculo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServidorIndisponibilidade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Escala" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EscalaAtribuicao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EscalaPublicada" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
