import Link from "next/link";
import { addMonths, eachDayOfInterval, endOfWeek, format, isSameMonth, startOfWeek, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Field";
import { ActionForm } from "@/components/ui/ActionForm";
import { periodoDoMes, paraExibicao, lerDataArmazenada } from "@/lib/occurrences";
import { getIndisponibilidadesDoServidor } from "@/lib/indisponibilidade";
import { calcularIdade } from "@/lib/idade";
import { GRAU_LABEL } from "@/lib/constants";
import type { Grau } from "@/lib/types";
import { salvarIndisponibilidades } from "./actions";

// Lista de servidores e indisponibilidades vêm do banco e mudam com o tempo — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

/** Chave "ano-mês-dia" a partir dos getters *locais* de um Date já convertido para exibição (ver paraExibicao). */
function chaveDiaLocal(data: Date): string {
  return `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
}

export default async function IndisponibilidadePage({
  searchParams,
}: {
  searchParams: Promise<{ servidorId?: string; mes?: string }>;
}) {
  const { servidorId, mes } = await searchParams;
  const { periodoInicio, periodoFim } = periodoDoMes(mes);

  const { data: servidoresData, error } = await supabase
    .from("Servidor")
    .select("id, nome, dataNascimento, categoria")
    .eq("ativo", true)
    .order("nome", { ascending: true })
    .returns<{ id: string; nome: string; dataNascimento: string | null; categoria: Grau }[]>();
  if (error) throw error;
  const servidores = servidoresData ?? [];

  // Alinha nome/idade/grau em colunas no seletor (option não aceita CSS de
  // tabela, então usa espaço fixo — precisa de NBSP pra não ser colapsado).
  const maxNomeLen = servidores.reduce((max, s) => Math.max(max, s.nome.length), 0);
  const opcaoServidor = (s: (typeof servidores)[number]) => {
    const nome = s.nome.padEnd(maxNomeLen + 2, " ");
    const idadeLabel = s.dataNascimento ? `${calcularIdade(lerDataArmazenada(s.dataNascimento))}a` : "—";
    const idade = idadeLabel.padStart(4, " ");
    return `${nome}${idade}  ${GRAU_LABEL[s.categoria]}`;
  };

  const servidorSelecionado = servidorId && servidores.some((s) => s.id === servidorId) ? servidorId : "";

  const diasIndisponiveisRaw = servidorSelecionado
    ? await getIndisponibilidadesDoServidor(servidorSelecionado, periodoInicio, periodoFim)
    : [];
  const diasIndisponiveis = new Set(diasIndisponiveisRaw.map((d) => chaveDiaLocal(paraExibicao(d))));

  const mesReferencia = paraExibicao(periodoInicio);
  const periodoFimExibicao = paraExibicao(periodoFim);
  const gridInicio = startOfWeek(mesReferencia, { weekStartsOn: 0 });
  const gridFim = endOfWeek(periodoFimExibicao, { weekStartsOn: 0 });
  const dias = eachDayOfInterval({ start: gridInicio, end: gridFim });

  const mesAtualParam = format(mesReferencia, "yyyy-MM");
  const mesAnterior = format(subMonths(mesReferencia, 1), "yyyy-MM");
  const proximoMes = format(addMonths(mesReferencia, 1), "yyyy-MM");
  const mesAtualLabel = format(mesReferencia, "MMMM 'de' yyyy", { locale: ptBR });

  const periodoInicioISO = periodoInicio.toISOString();
  const periodoFimISO = periodoFim.toISOString();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-gray-900">Meus dias indisponíveis</h1>
          <p className="text-sm text-gray-500">
            Marque os dias do mês em que você não vai poder servir. A escala não te coloca em nenhuma
            missa nesses dias.
          </p>
        </div>

        <form
          method="get"
          className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="min-w-[220px] flex-1">
            <Label htmlFor="servidorId">Servidor</Label>
            <Select
              id="servidorId"
              name="servidorId"
              defaultValue={servidorSelecionado}
              required
              className="font-mono"
            >
              <option value="" disabled>
                Selecione seu nome...
              </option>
              {servidores.map((s) => (
                <option key={s.id} value={s.id}>
                  {opcaoServidor(s)}
                </option>
              ))}
            </Select>
          </div>
          <input type="hidden" name="mes" value={mesAtualParam} />
          <Button type="submit" variant="secondary">
            Ver
          </Button>
        </form>

        {servidores.length === 0 && <p className="text-sm text-gray-500">Nenhum servidor cadastrado ainda.</p>}

        {servidorSelecionado && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold capitalize text-gray-900">{mesAtualLabel}</h2>
              <div className="flex gap-3 text-sm">
                <Link
                  href={`/indisponibilidade?servidorId=${servidorSelecionado}&mes=${mesAnterior}`}
                  className="text-blue-700 hover:text-blue-900"
                >
                  ← Mês anterior
                </Link>
                <Link
                  href={`/indisponibilidade?servidorId=${servidorSelecionado}&mes=${proximoMes}`}
                  className="text-blue-700 hover:text-blue-900"
                >
                  Próximo mês →
                </Link>
              </div>
            </div>

            <ActionForm
              action={salvarIndisponibilidades.bind(null, servidorSelecionado, periodoInicioISO, periodoFimISO)}
              successMessage="Indisponibilidades salvas."
              className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 text-xs">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dia) => (
                  <div key={dia} className="bg-gray-50 px-2 py-2 text-center font-medium text-gray-500">
                    {dia}
                  </div>
                ))}

                {dias.map((dia) => {
                  const foraDoMes = !isSameMonth(dia, mesReferencia);
                  const valor = format(dia, "yyyy-MM-dd");

                  return (
                    <label
                      key={valor}
                      className={`flex min-h-[64px] flex-col items-center justify-center gap-1 bg-white p-2 text-sm ${
                        foraDoMes
                          ? "pointer-events-none bg-gray-50 text-gray-300"
                          : "cursor-pointer hover:bg-red-50 has-[:checked]:bg-red-100"
                      }`}
                    >
                      <span>{format(dia, "d")}</span>
                      {!foraDoMes && (
                        <input
                          type="checkbox"
                          name="dias"
                          value={valor}
                          defaultChecked={diasIndisponiveis.has(chaveDiaLocal(dia))}
                          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600"
                        />
                      )}
                    </label>
                  );
                })}
              </div>

              <Button type="submit" className="w-full">
                Salvar indisponibilidades
              </Button>
            </ActionForm>
          </div>
        )}
      </div>
    </div>
  );
}
