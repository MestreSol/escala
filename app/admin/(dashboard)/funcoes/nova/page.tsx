import { FuncaoForm } from "@/components/admin/FuncaoForm";
import { pastoralDoPainel } from "@/lib/sessao";
import { usaGraus } from "@/lib/constants";
import { createFuncao } from "../actions";

export default async function NovaFuncaoPage() {
  const { pastoral } = await pastoralDoPainel();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-fg">Nova função · {pastoral.nome}</h1>
      <FuncaoForm action={createFuncao} submitLabel="Criar função" usaGraus={usaGraus(pastoral.tipo)} />
    </div>
  );
}
