import { redirect } from "next/navigation";
import { ParoquiaForm } from "@/components/admin/ParoquiaForm";
import { obterUsuarioAtual } from "@/lib/sessao";
import { createParoquia } from "../actions";

export default async function NovaParoquiaPage() {
  const usuarioLogado = await obterUsuarioAtual();
  if (usuarioLogado?.papel !== "SUPERADMIN") redirect("/admin");

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-fg">Nova paróquia</h1>
      <p className="mb-6 max-w-md text-sm text-muted">
        Depois de criar, entre na paróquia, cadastre as pastorais dela (ex: coroinhas, ministros) em
        Pastorais e o administrador em Usuários.
      </p>
      <ParoquiaForm action={createParoquia} submitLabel="Criar paróquia" />
    </div>
  );
}
