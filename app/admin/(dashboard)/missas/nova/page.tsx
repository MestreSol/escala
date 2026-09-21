import { MissaForm } from "@/components/admin/MissaForm";
import { createMissa } from "../actions";

export default async function NovaMissaPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const grande = tipo === "DATA_UNICA";

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">{grande ? "Nova missa grande" : "Nova missa"}</h1>
      <p className="mb-6 text-sm text-gray-500">
        Depois de criar, você poderá escolher quais funções essa missa exige.
      </p>
      <MissaForm
        action={createMissa}
        submitLabel={grande ? "Criar missa grande" : "Criar missa"}
        tipoInicial={grande ? "DATA_UNICA" : "RECORRENTE"}
      />
    </div>
  );
}
