import { MissaForm } from "@/components/admin/MissaForm";
import { pastoralDoPainel } from "@/lib/sessao";
import { rotuloTodos } from "@/lib/constants";
import { createMissa } from "../actions";

export default async function NovaMissaPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const grande = tipo === "DATA_UNICA";
  const { pastoral } = await pastoralDoPainel();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-fg">{grande ? "Nova missa grande" : "Nova missa"}</h1>
      <p className="mb-6 text-sm text-muted">
        Depois de criar, você poderá escolher quais funções essa missa exige.
      </p>
      <MissaForm
        action={createMissa}
        submitLabel={grande ? "Criar missa grande" : "Criar missa"}
        tipoInicial={grande ? "DATA_UNICA" : "RECORRENTE"}
        pastoral={{ nome: pastoral.nome, rotuloTodos: rotuloTodos(pastoral.tipo) }}
      />
    </div>
  );
}
