import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { pastoralDoPainel } from "@/lib/sessao";
import { usaGraus } from "@/lib/constants";
import { agoraNaParoquia, lerDataArmazenada } from "@/lib/occurrences";
import { calcularIdade } from "@/lib/idade";
import { DataTable } from "@/components/ui/DataTable";
import { TelefoneLink } from "@/components/admin/TelefoneLink";

export const dynamic = "force-dynamic";

/** Idade em que o coroinha passa a acólito. */
const IDADE_ACOLITO = 12;

type Coroinha = {
  id: string;
  nome: string;
  dataNascimento: string | null;
  celular: string | null;
  celularResponsavel: string | null;
};

const p2 = (n: number) => String(n).padStart(2, "0");

export default async function ProximosAcolitosPage({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const { ano: anoParam } = await searchParams;
  const { pastoral } = await pastoralDoPainel();
  const anoAtual = Number(agoraNaParoquia().slice(0, 4));
  const anoEscolhido = Number(anoParam);
  const ano = Number.isInteger(anoEscolhido) && anoEscolhido >= anoAtual - 5 && anoEscolhido <= anoAtual + 10 ? anoEscolhido : anoAtual + 1;
  const anoNascimento = ano - IDADE_ACOLITO;

  if (!usaGraus(pastoral.tipo)) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Próximos acólitos</h1>
        <p className="mt-2 text-sm text-muted">{pastoral.nome} não usa graus (coroinha, acólito, cerimoniário).</p>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("Servidor")
    .select("id, nome, dataNascimento, celular, celularResponsavel")
    .eq("pastoralId", pastoral.id)
    .eq("ativo", true)
    .eq("categoria", "COROINHA")
    .returns<Coroinha[]>();
  if (error) throw error;

  const coroinhas = data ?? [];
  const semNascimento = coroinhas.filter((c) => !c.dataNascimento).length;
  const proximos = coroinhas
    .filter((c) => c.dataNascimento && lerDataArmazenada(c.dataNascimento).getUTCFullYear() === anoNascimento)
    .map((c) => ({ ...c, nascimento: lerDataArmazenada(c.dataNascimento!) }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Próximos acólitos</h1>
          <p className="text-sm text-muted">
            Coroinhas que fazem {IDADE_ACOLITO} anos em {ano} (nascidos em {anoNascimento}) · {proximos.length}{" "}
            {proximos.length === 1 ? "coroinha" : "coroinhas"}
          </p>
        </div>
        <div className="flex gap-1 text-sm">
          <Link
            href={`/admin/proximos-acolitos?ano=${ano - 1}`}
            className="rounded-md px-2 py-1 text-muted transition-colors hover:bg-surface hover:text-fg"
          >
            ← {ano - 1}
          </Link>
          <Link
            href={`/admin/proximos-acolitos?ano=${ano + 1}`}
            className="rounded-md px-2 py-1 text-muted transition-colors hover:bg-surface hover:text-fg"
          >
            {ano + 1} →
          </Link>
        </div>
      </div>

      <DataTable
        vazio={`Nenhum coroinha ativo nasceu em ${anoNascimento}.`}
        ordemPadrao={{ chave: "aniversario", direcao: "asc" }}
        colunas={[
          { chave: "nome", titulo: "Nome", ordenavel: true },
          { chave: "aniversario", titulo: `Faz ${IDADE_ACOLITO} anos em`, ordenavel: true },
          { chave: "idade", titulo: "Idade hoje", ordenavel: true, alinhar: "right" },
          { chave: "celular", titulo: "Celular" },
          { chave: "responsavel", titulo: "Responsável" },
          { chave: "acoes", titulo: "", alinhar: "right" },
        ]}
        linhas={proximos.map((c) => {
          const aniversario = `${p2(c.nascimento.getUTCDate())}/${p2(c.nascimento.getUTCMonth() + 1)}/${ano}`;
          const idade = calcularIdade(c.nascimento);
          return {
            id: c.id,
            valores: {
              nome: c.nome,
              aniversario: (c.nascimento.getUTCMonth() + 1) * 100 + c.nascimento.getUTCDate(),
              idade,
            },
            celulas: {
              nome: <span className="font-medium text-fg">{c.nome}</span>,
              aniversario: <span className="tabular-nums text-muted">{aniversario}</span>,
              idade: <span className="tabular-nums text-muted">{idade}</span>,
              celular: <TelefoneLink digitos={c.celular} />,
              responsavel: <TelefoneLink digitos={c.celularResponsavel} />,
              acoes: (
                <Link href={`/admin/servidores/${c.id}`} className="font-medium text-accent hover:text-accent-hover">
                  Editar
                </Link>
              ),
            },
          };
        })}
      />

      {semNascimento > 0 ? (
        <p className="mt-4 text-xs text-muted">
          {semNascimento} {semNascimento === 1 ? "coroinha ativo está" : "coroinhas ativos estão"} sem data de nascimento
          e não {semNascimento === 1 ? "aparece" : "aparecem"} aqui — preencha em{" "}
          <Link href="/admin/servidores" className="text-accent hover:text-accent-hover">
            Servidores
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
