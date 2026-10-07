import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { obterParoquiaAtual, obterUsuarioAtual } from "@/lib/sessao";
import type { ParoquiaRow } from "@/lib/types";
import { entrarNaParoquia } from "./actions";

export const dynamic = "force-dynamic";

export default async function ParoquiasPage() {
  const usuarioLogado = await obterUsuarioAtual();
  if (usuarioLogado?.papel !== "SUPERADMIN") redirect("/admin");

  const [{ data, error }, paroquiaAtual] = await Promise.all([
    supabase.from("Paroquia").select("*").order("nome", { ascending: true }).returns<ParoquiaRow[]>(),
    obterParoquiaAtual(),
  ]);
  if (error) throw error;
  const paroquias = data ?? [];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Paróquias</h1>
        <Link href="/admin/paroquias/nova" className={buttonClasses()}>
          Nova paróquia
        </Link>
      </div>
      <p className="mb-6 text-sm text-muted">
        {paroquiaAtual
          ? `Você está trabalhando em ${paroquiaAtual.nome}.`
          : "Escolha em qual paróquia você quer trabalhar no painel."}
      </p>

      <DataTable
        vazio="Nenhuma paróquia cadastrada."
        ordemPadrao={{ chave: "nome", direcao: "asc" }}
        colunas={[
          { chave: "nome", titulo: "Nome", ordenavel: true },
          { chave: "endereco", titulo: "Endereço", ordenavel: true },
          { chave: "situacao", titulo: "Situação", ordenavel: true },
          { chave: "acoes", titulo: "", alinhar: "right" },
        ]}
        linhas={paroquias.map((paroquia) => ({
          id: paroquia.id,
          valores: { nome: paroquia.nome, endereco: paroquia.slug, situacao: paroquia.ativo ? 0 : 1 },
          celulas: {
            nome: (
              <span className="font-medium text-fg">
                {paroquia.nome}
                {paroquia.id === paroquiaAtual?.id ? (
                  <span className="ml-2 text-xs font-normal text-subtle">(atual)</span>
                ) : null}
              </span>
            ),
            endereco: (
              <Link href={`/${paroquia.slug}`} className="text-muted hover:text-fg">
                /{paroquia.slug}
              </Link>
            ),
            situacao: <Badge color={paroquia.ativo ? "green" : "gray"}>{paroquia.ativo ? "Ativa" : "Desativada"}</Badge>,
            acoes: (
              <div className="flex items-center justify-end gap-4">
                <Link href={`/admin/paroquias/${paroquia.id}`} className="font-medium text-accent hover:text-accent-hover">
                  Editar
                </Link>
                {paroquia.id === paroquiaAtual?.id ? null : (
                  <ActionForm action={entrarNaParoquia.bind(null, paroquia.id)} successMessage="Paróquia escolhida.">
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
