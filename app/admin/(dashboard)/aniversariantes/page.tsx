import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { GRAU_LABEL } from "@/lib/constants";
import { lerDataArmazenada, paraExibicao } from "@/lib/occurrences";
import { calcularIdade } from "@/lib/idade";
import type { Grau } from "@/lib/types";

const GRAU_COLOR: Record<string, "green" | "blue" | "yellow"> = {
  COROINHA: "green",
  ACOLITO: "blue",
  CERIMONIARIO: "yellow",
};

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
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
  const hoje = new Date();

  // Aniversário se repete todo ano — a navegação é só pelo mês (1-12), sem
  // amarrar a um ano específico. "Vai completar" abaixo assume o ano civil
  // atual (ver comentário mais abaixo).
  const mesParam = Number(mes);
  const mesSelecionado = Number.isInteger(mesParam) && mesParam >= 1 && mesParam <= 12 ? mesParam : hoje.getMonth() + 1;
  const indiceMesSelecionado = mesSelecionado - 1;

  const { data, error } = await supabase
    .from("Servidor")
    .select("id, nome, comunidade, categoria, fotoUrl, dataNascimento")
    .eq("ativo", true)
    .not("dataNascimento", "is", null)
    .returns<ServidorComNascimento[]>();
  if (error) throw error;

  const aniversariantes = (data ?? [])
    .map((s) => ({ ...s, nascimento: lerDataArmazenada(s.dataNascimento) }))
    .filter((s) => s.nascimento.getUTCMonth() === indiceMesSelecionado)
    .sort((a, b) => a.nascimento.getUTCDate() - b.nascimento.getUTCDate() || a.nome.localeCompare(b.nome, "pt-BR"));

  // paraExibicao converte a âncora UTC pra um Date cujos getters *locais*
  // já são (2000, indiceMesSelecionado, 1) — necessário porque format() do
  // date-fns lê pelo fuso local do processo (ver lib/occurrences.ts).
  const nomeMes = format(paraExibicao(new Date(Date.UTC(2000, indiceMesSelecionado, 1))), "MMMM", { locale: ptBR });
  const nomeMesCapitalizado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
  const mesAnterior = mesSelecionado === 1 ? 12 : mesSelecionado - 1;
  const proximoMes = mesSelecionado === 12 ? 1 : mesSelecionado + 1;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Aniversariantes de {nomeMesCapitalizado}</h1>
          <p className="text-sm text-gray-500">{aniversariantes.length} aniversariante(s) neste mês</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href={`/admin/aniversariantes?mes=${mesAnterior}`} className="text-blue-700 hover:text-blue-900">
            ← Mês anterior
          </Link>
          <Link href={`/admin/aniversariantes?mes=${proximoMes}`} className="text-blue-700 hover:text-blue-900">
            Próximo mês →
          </Link>
        </div>
      </div>

      {aniversariantes.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum servidor com aniversário neste mês.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3" />
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Dia</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Categoria</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Comunidade</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Vai completar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {aniversariantes.map((servidor) => (
                <tr key={servidor.id}>
                  <td className="px-4 py-3">
                    {servidor.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL externa (Supabase Storage), não dá pra usar next/image sem configurar o domínio.
                      <img
                        src={servidor.fotoUrl}
                        alt={servidor.nome}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-[10px] text-gray-400">
                        Sem foto
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{servidor.nascimento.getUTCDate()}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{servidor.nome}</td>
                  <td className="px-4 py-3 text-sm">
                    <Badge color={GRAU_COLOR[servidor.categoria]}>{GRAU_LABEL[servidor.categoria]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{servidor.comunidade}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {hoje.getFullYear() - servidor.nascimento.getUTCFullYear()} anos
                    <span className="ml-1 text-xs text-gray-400">
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
