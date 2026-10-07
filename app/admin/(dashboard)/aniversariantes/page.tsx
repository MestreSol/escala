import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { pastoralDoPainel } from "@/lib/sessao";
import { Badge } from "@/components/ui/Badge";
import { GRAU_LABEL, usaGraus } from "@/lib/constants";
import { lerDataArmazenada, paraExibicao } from "@/lib/occurrences";
import { calcularIdade } from "@/lib/idade";
import type { Grau } from "@/lib/types";

const GRAU_COLOR: Record<string, "green" | "blue" | "yellow"> = {
  COROINHA: "green",
  ACOLITO: "blue",
  CERIMONIARIO: "yellow",
};

export const dynamic = "force-dynamic";

type ServidorComNascimento = {
  id: string;
  nome: string;
  comunidade: string;
  categoria: Grau;
  fotoUrl: string | null;
  dataNascimento: string;
};

export default async function AniversariantesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const { pastoral } = await pastoralDoPainel();
  const hoje = new Date();

  const mesParam = Number(mes);
  const mesSelecionado = Number.isInteger(mesParam) && mesParam >= 1 && mesParam <= 12 ? mesParam : hoje.getMonth() + 1;
  const indiceMesSelecionado = mesSelecionado - 1;

  const { data, error } = await supabase
    .from("Servidor")
    .select("id, nome, comunidade, categoria, fotoUrl, dataNascimento")
    .eq("pastoralId", pastoral.id)
    .eq("ativo", true)
    .not("dataNascimento", "is", null)
    .returns<ServidorComNascimento[]>();
  if (error) throw error;

  const aniversariantes = (data ?? [])
    .map((s) => ({ ...s, nascimento: lerDataArmazenada(s.dataNascimento) }))
    .filter((s) => s.nascimento.getUTCMonth() === indiceMesSelecionado)
    .sort((a, b) => a.nascimento.getUTCDate() - b.nascimento.getUTCDate() || a.nome.localeCompare(b.nome, "pt-BR"));

  const nomeMes = format(paraExibicao(new Date(Date.UTC(2000, indiceMesSelecionado, 1))), "MMMM", { locale: ptBR });
  const nomeMesCapitalizado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
  const mesAnterior = mesSelecionado === 1 ? 12 : mesSelecionado - 1;
  const proximoMes = mesSelecionado === 12 ? 1 : mesSelecionado + 1;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Aniversariantes de {nomeMesCapitalizado}</h1>
          <p className="text-sm text-muted">{aniversariantes.length} aniversariante(s) neste mês</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href={`/admin/aniversariantes?mes=${mesAnterior}`} className="text-accent hover:text-accent-hover">
            ← Mês anterior
          </Link>
          <Link href={`/admin/aniversariantes?mes=${proximoMes}`} className="text-accent hover:text-accent-hover">
            Próximo mês →
          </Link>
        </div>
      </div>

      {aniversariantes.length === 0 ? (
        <p className="text-sm text-muted">Nenhum servidor com aniversário neste mês.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="min-w-full divide-y divide-line">
            <thead>
              <tr>
                <th className="px-4 py-3" />
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-subtle">Dia</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-subtle">Nome</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-subtle">Categoria</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-subtle">Comunidade</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-subtle">Vai completar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {aniversariantes.map((servidor) => (
                <tr key={servidor.id} className="transition-colors hover:bg-surface-2/60">
                  <td className="px-4 py-3">
                    {servidor.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL externa (Supabase Storage), não dá pra usar next/image sem configurar o domínio.
                      <img
                        src={servidor.fotoUrl}
                        alt={servidor.nome}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-[10px] text-subtle">
                        Sem foto
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-fg">{servidor.nascimento.getUTCDate()}</td>
                  <td className="px-4 py-3 text-sm font-medium text-fg">{servidor.nome}</td>
                  <td className="px-4 py-3 text-sm">
                    {usaGraus(pastoral.tipo) ? (
                      <Badge color={GRAU_COLOR[servidor.categoria]}>{GRAU_LABEL[servidor.categoria]}</Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{servidor.comunidade}</td>
                  <td className="px-4 py-3 text-right text-sm text-muted">
                    {hoje.getFullYear() - servidor.nascimento.getUTCFullYear()} anos
                    <span className="ml-1 text-xs text-subtle">
                      ({calcularIdade(servidor.nascimento)} hoje)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
