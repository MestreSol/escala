import { FuncaoForm } from "@/components/admin/FuncaoForm";
import { createFuncao } from "../actions";

export default function NovaFuncaoPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Nova função</h1>
      <FuncaoForm action={createFuncao} submitLabel="Criar função" />
    </div>
  );
}
