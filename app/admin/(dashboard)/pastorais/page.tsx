import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { cuidaDaParoquiaToda, obterPastoralAtual, obterUsuarioAtual, paroquiaDoPainel } from "@/lib/sessao";
import { TIPO_PASTORAL_LABEL } from "@/lib/constants";
import type { PastoralRow } from "@/lib/types";
import { entrarNaPastoral } from "./actions";

export const dynamic = "force-dynamic";

export default async function PastoraisPage() {
  const paroquia = await paroquiaDoPainel();
  const usuarioLogado = await obterUsuarioAtual();
  if (!cuidaDaParoquiaToda(usuarioLogado)) redirect("/admin");

  const [{ data, error }, pastoralAtual] = await Promise.all([
    supabase
      .from("Pastoral")
      .select("*")
      .eq("paroquiaId", paroquia.id)
      .order("nome", { ascending: true })
      .returns<PastoralRow[]>(),
    obterPastoralAtual(),
  ]);
  if (error) throw error;
  const pastorais = data ?? [];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Pastorais</h1>
        <Link href="/admin/pastorais/nova" className={buttonClasses()}>
          Nova pastoral
        </Link>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        {pastoralAtual
          ? `Você está trabalhando em ${pastoralAtual.nome}. `
          : "Escolha em qual pastoral você quer trabalhar no painel. "}
        Cada pastoral tem as próprias funções, servidores e escala; as missas são da paróquia toda.
      </p>

      <DataTable
        vazio="Nenhuma pastoral cadastrada."
        ordemPadrao={{ chave: "nome", direcao: "asc" }}
        colunas={[
          { chave: "nome", titulo: "Nome", ordenavel: true },
          { chave: "tipo", titulo: "Tipo", ordenavel: true },
          { chave: "endereco", titulo: "Endereço", ordenavel: true },
          { chave: "situacao", titulo: "Situação", ordenavel: true },
          { chave: "acoes", titulo: "", alinhar: "right" },
        ]}
        linhas={pastorais.map((pastoral) => ({
          id: pastoral.id,
          valores: {
            nome: pastoral.nome,
            tipo: pastoral.tipo,
            endereco: pastoral.slug,
            situacao: pastoral.ativo ? 0 : 1,
          },
          celulas: {
            nome: (
              <span className="font-medium text-fg">
                {pastoral.nome}
                {pastoral.id === pastoralAtual?.id ? (
                  <span className="ml-2 text-xs font-normal text-subtle">(atual)</span>
                ) : null}
              </span>
            ),
            tipo: <span className="text-muted">{TIPO_PASTORAL_LABEL[pastoral.tipo]}</span>,
            endereco: (
              <Link href={`/${paroquia.slug}/${pastoral.slug}`} className="text-muted hover:text-fg">
                /{paroquia.slug}/{pastoral.slug}
              </Link>
            ),
            situacao: (
              <Badge color={pastoral.ativo ? "green" : "gray"}>{pastoral.ativo ? "Ativa" : "Desativada"}</Badge>
            ),
            acoes: (
              <div className="flex items-center justify-end gap-4">
                <Link href={`/admin/pastorais/${pastoral.id}`} className="font-medium text-accent hover:text-accent-hover">
                  Editar
                </Link>
                {pastoral.id === pastoralAtual?.id ? null : (
                  <ActionForm action={entrarNaPastoral.bind(null, pastoral.id)} successMessage="Pastoral escolhida.">
                    <SubmitButton variant="secondary" pendingLabel="Entrando">
                      Entrar
                    </SubmitButton>
                  </ActionForm>
                )}
              </div>
            ),
          },
        }))}
      />
    </div>
  );
}
