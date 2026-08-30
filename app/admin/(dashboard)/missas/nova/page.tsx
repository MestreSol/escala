import { MissaForm } from "@/components/admin/MissaForm";
import { createMissa } from "../actions";

export default function NovaMissaPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Nova missa</h1>
      <p className="mb-6 text-sm text-gray-500">
        Depois de criar, você poderá escolher quais funções essa missa exige.
      </p>
      <MissaForm action={createMissa} submitLabel="Criar missa" />
    </div>
  );
}
