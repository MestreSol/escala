import { redirect } from "next/navigation";
import { PastoralForm } from "@/components/admin/PastoralForm";
import { cuidaDaParoquiaToda, obterUsuarioAtual, paroquiaDoPainel } from "@/lib/sessao";
import { createPastoral } from "../actions";

export default async function NovaPastoralPage() {
  const paroquia = await paroquiaDoPainel();
  if (!cuidaDaParoquiaToda(await obterUsuarioAtual())) redirect("/admin");

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-fg">Nova pastoral</h1>
      <p className="mb-6 max-w-md text-sm text-muted">
        Depois de criar, entre na pastoral e cadastre as funções dela. Os usuários que vão cuidar dela
        você cadastra em Usuários.
      </p>
      <PastoralForm action={createPastoral} slugParoquia={paroquia.slug} submitLabel="Criar pastoral" />
    </div>
  );
}
