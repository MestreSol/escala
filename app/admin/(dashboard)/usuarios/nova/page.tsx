import { redirect } from "next/navigation";
import { UsuarioForm } from "@/components/admin/UsuarioForm";
import { listarPastoraisDaParoquia, obterUsuarioAtual, paroquiaDoPainel, podeGerenciarUsuarios } from "@/lib/sessao";
import { createUsuario } from "../actions";

export default async function NovoUsuarioPage() {
  const usuarioLogado = await obterUsuarioAtual();
  if (!usuarioLogado || !podeGerenciarUsuarios(usuarioLogado)) {
    redirect("/admin/usuarios");
  }
  const paroquia = await paroquiaDoPainel();
  // Admin de uma pastoral só cria usuários dela — aí o campo nem aparece.
  const pastorais = usuarioLogado.pastoralId ? null : await listarPastoraisDaParoquia(paroquia.id);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-fg">Novo usuário</h1>
      <UsuarioForm action={createUsuario} pastorais={pastorais} />
    </div>
  );
}
