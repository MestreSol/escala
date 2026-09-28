import { supabase } from "@/lib/supabase";
import { ServidorForm } from "@/components/ServidorForm";
import { Marca } from "@/components/ui/Marca";
import type { MissaOption } from "@/lib/types";
import { createServidor } from "./actions";

// Lista de missas vem do banco e muda com o tempo — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function InscricaoPage() {
  const { data, error } = await supabase
    .from("Missa")
    .select("*")
    .eq("ativo", true)
    .eq("escalarTodosAtivos", false)
    .order("diaSemana", { ascending: true })
    .order("horario", { ascending: true })
    .returns<MissaOption[]>();
  if (error) throw error;
  const missas = data ?? [];

  return (
    <div className="min-h-screen bg-bg px-4 py-12 sm:py-20">
      <div className="mx-auto max-w-lg animate-fade-in">
        <Marca className="mb-6" />
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-fg">Inscrição de servidor do altar</h1>
        <p className="mb-10 text-sm text-muted">
          Preencha seus dados para participar da escala de acólitos, coroinhas e cerimoniários.
        </p>
        <ServidorForm action={createServidor} missas={missas} submitLabel="Enviar inscrição" />
      </div>
    </div>
  );
}
