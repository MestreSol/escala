import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ServidorForm } from "@/components/ServidorForm";
import { Button } from "@/components/ui/Button";
import { getVinculosDoServidor } from "@/lib/servidorVinculo";
import type { MissaOption, ServidorMissaPreferenciaRow, ServidorRow } from "@/lib/types";
import { updateServidor, saveServidorVinculos } from "../actions";

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function EditarServidorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [servidorResult, missasResult, outrosServidoresResult, vinculadosIdsLista] = await Promise.all([
    supabase
      .from("Servidor")
      .select("*, preferenciasMissas:ServidorMissaPreferencia(*)")
      .eq("id", id)
      .returns<(ServidorRow & { preferenciasMissas: ServidorMissaPreferenciaRow[] })[]>()
      .maybeSingle(),
    supabase
      .from("Missa")
      .select("*")
      .eq("ativo", true)
      .order("diaSemana", { ascending: true })
      .order("horario", { ascending: true })
      .returns<MissaOption[]>(),
    supabase
      .from("Servidor")
      .select("id, nome")
      .eq("ativo", true)
      .neq("id", id)
      .order("nome", { ascending: true })
      .returns<{ id: string; nome: string }[]>(),
    getVinculosDoServidor(id),
  ]);

  if (servidorResult.error) throw servidorResult.error;
  if (missasResult.error) throw missasResult.error;
  if (outrosServidoresResult.error) throw outrosServidoresResult.error;

  const servidor = servidorResult.data;
  const missas = missasResult.data ?? [];
  const outrosServidores = outrosServidoresResult.data ?? [];

  if (!servidor) notFound();

  const salvarVinculos = saveServidorVinculos.bind(null, servidor.id);
  const vinculadosIds = new Set(vinculadosIdsLista);

  return (
    <div className="max-w-lg space-y-10">
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">Editar servidor</h1>
        <ServidorForm
          action={updateServidor.bind(null, servidor.id)}
          missas={missas}
          defaultValues={{
            ...servidor,
            missaIds: servidor.preferenciasMissas.map((p) => p.missaId),
          }}
          submitLabel="Salvar alterações"
        />
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Vínculo entre servidores</h2>
        <p className="mb-4 text-sm text-gray-500">
          Marque quem <strong>{servidor.nome}</strong> só serve junto (ex: irmãos). Na escala,
          esses servidores só são escalados numa missa se todos os vinculados também puderem
          servir nela — senão, nenhum deles entra naquela missa.
        </p>

        {outrosServidores.length === 0 ? (
          <p className="text-sm text-gray-500">Cadastre outros servidores para configurar vínculos.</p>
        ) : (
          <form action={salvarVinculos} className="space-y-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {outrosServidores.map((outro) => (
                <label
                  key={outro.id}
                  className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3"
                >
                  <input
                    type="checkbox"
                    name={`vinculo_${outro.id}`}
                    defaultChecked={vinculadosIds.has(outro.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-900">{outro.nome}</span>
                </label>
              ))}
            </div>
            <Button type="submit">Salvar vínculos</Button>
          </form>
        )}
      </div>
    </div>
  );
}
