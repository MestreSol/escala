import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ServidorForm } from "@/components/ServidorForm";
import type { MissaOption, ServidorMissaPreferenciaRow, ServidorRow } from "@/lib/types";
import { updateServidor } from "../actions";

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function EditarServidorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [servidorResult, missasResult] = await Promise.all([
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
  ]);

  if (servidorResult.error) throw servidorResult.error;
  if (missasResult.error) throw missasResult.error;

  const servidor = servidorResult.data;
  const missas = missasResult.data ?? [];

  if (!servidor) notFound();

  return (
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
  );
}
