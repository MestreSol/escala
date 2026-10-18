import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { pastoralDoPainel } from "@/lib/sessao";
import { ActionForm } from "@/components/ui/ActionForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { lerDataArmazenada, paraExibicao } from "@/lib/occurrences";
import { corrigirFalta, removerTodasAsFaltas } from "../actions";

export const dynamic = "force-dynamic";

type Falta = {
  id: string;
  funcao: { nome: string } | null;
  ocorrencia: { data: string; missa: { comunidade: string } | null };
};

export default async function FaltasDoServidorPage({ params }: { params: Promise<{ servidorId: string }> }) {
  const { servidorId } = await params;
  const { pastoral } = await pastoralDoPainel();

  const [servidorResult, faltasResult] = await Promise.all([
    supabase
      .from("Servidor")
      .select("id, nome")
      .eq("id", servidorId)
      .eq("pastoralId", pastoral.id)
      .maybeSingle<{ id: string; nome: string }>(),
    supabase
      .from("EscalaAtribuicao")
      .select("id, funcao:Funcao(nome), ocorrencia:MissaOcorrencia!inner(data, missa:Missa(comunidade))")
      .eq("servidorId", servidorId)
      .eq("pastoralId", pastoral.id)
      .eq("presente", false)
      .returns<Falta[]>(),
  ]);
  if (servidorResult.error) throw servidorResult.error;
  if (faltasResult.error) throw faltasResult.error;
  const servidor = servidorResult.data;
  if (!servidor) notFound();

  const faltas = (faltasResult.data ?? [])
    .map((f) => ({ ...f, data: lerDataArmazenada(f.ocorrencia.data) }))
    .sort((a, b) => b.data.getTime() - a.data.getTime());

  return (
    <div className="max-w-2xl">
      <Link href="/admin/absenteismo" className="text-sm text-muted transition-colors hover:text-fg">
        ← Absenteísmo
      </Link>
      <div className="mt-2 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Faltas de {servidor.nome}</h1>
          <p className="text-sm text-muted">
            {faltas.length === 0 ? "Nenhuma falta registrada." : `${faltas.length} ${faltas.length === 1 ? "falta" : "faltas"} registradas`}
          </p>
        </div>
        {faltas.length > 0 ? (
          <DeleteButton
            action={removerTodasAsFaltas.bind(null, servidor.id)}
            confirmMessage={`Remover as ${faltas.length} faltas de ${servidor.nome}? Elas voltam pra "não registrada" e deixam de contar no absenteísmo e no sorteio da escala.`}
            label="Remover todas as faltas"
            successMessage="Faltas removidas."
          />
        ) : null}
      </div>

      {faltas.length > 0 ? (
        <ul className="divide-y divide-line/60 rounded-xl border border-line bg-surface">
          {faltas.map((falta) => (
            <li key={falta.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium capitalize text-fg">
                  {format(paraExibicao(falta.data), "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <p className="text-xs text-muted">
                  {falta.ocorrencia.missa?.comunidade ?? "—"} · {falta.funcao?.nome ?? "Todos"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <ActionForm action={corrigirFalta.bind(null, servidor.id, falta.id, "presente")} successMessage="Marcado como presente.">
                  <button type="submit" className="text-sm font-medium text-ok/90 transition-colors hover:text-ok">
                    Estava presente
                  </button>
                </ActionForm>
                <ActionForm action={corrigirFalta.bind(null, servidor.id, falta.id, "remover")} successMessage="Falta removida.">
                  <button type="submit" className="text-sm font-medium text-muted transition-colors hover:text-fg">
                    Remover falta
                  </button>
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-6 text-xs leading-relaxed text-subtle">
        &quot;Estava presente&quot; troca a falta por presença. &quot;Remover falta&quot; deixa a missa como não
        registrada: não conta nem como falta nem como presença.
      </p>
    </div>
  );
}
