import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { buttonClasses } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { PRIORIDADE_LABEL, PRIORIDADE_ORDEM, GRAU_LABEL, GRAU_ORDEM } from "@/lib/constants";
import { DataTable } from "@/components/ui/DataTable";
import type { FuncaoRow } from "@/lib/types";
import { deleteFuncao } from "./actions";

const PRIORIDADE_COLOR: Record<string, "red" | "yellow" | "gray"> = {
  ALTA: "red",
  MEDIA: "yellow",
  BAIXA: "gray",
};

export const dynamic = "force-dynamic";

export default async function FuncoesPage() {
  const { data, error } = await supabase
    .from("Funcao")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true })
    .returns<FuncaoRow[]>();
  if (error) throw error;
  const funcoes = data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Funções</h1>
        <Link href="/admin/funcoes/nova" className={buttonClasses()}>
          Nova função
        </Link>
      </div>

      <DataTable
        vazio="Nenhuma função cadastrada ainda."
        ordemPadrao={{ chave: "prioridade", direcao: "asc" }}
        colunas={[
          { chave: "nome", titulo: "Nome", ordenavel: true },
          { chave: "prioridade", titulo: "Prioridade", ordenavel: true },
          { chave: "grau", titulo: "Grau mínimo", ordenavel: true },
          { chave: "vagas", titulo: "Vagas padrão", ordenavel: true },
          { chave: "acoes", titulo: "", alinhar: "right" },
        ]}
        linhas={funcoes.map((funcao) => ({
          id: funcao.id,
          valores: {
            nome: funcao.nome,
            prioridade: PRIORIDADE_ORDEM[funcao.prioridade] ?? null,
            grau: GRAU_ORDEM[funcao.grauMinimo] ?? null,
            vagas: funcao.quantidadePadrao,
          },
          celulas: {
            nome: <span className="font-medium text-fg">{funcao.nome}</span>,
            prioridade: (
              <Badge color={PRIORIDADE_COLOR[funcao.prioridade]}>{PRIORIDADE_LABEL[funcao.prioridade]}</Badge>
            ),
            grau: <span className="text-muted">{GRAU_LABEL[funcao.grauMinimo]}</span>,
            vagas: <span className="tabular-nums text-muted">{funcao.quantidadePadrao}</span>,
            acoes: (
              <div className="flex justify-end gap-4">
                <Link href={`/admin/funcoes/${funcao.id}`} className="font-medium text-accent hover:text-accent-hover">
                  Editar
                </Link>
                <DeleteButton
                  action={deleteFuncao.bind(null, funcao.id)}
                  confirmMessage={`Excluir a função "${funcao.nome}"? Isso também remove atribuições de escala vinculadas a ela.`}
                />
              </div>
            ),
          },
        }))}
      />
    </div>
  );
}
