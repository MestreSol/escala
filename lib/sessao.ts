import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { SESSION_COOKIE_NAME, verificarSessionToken, type SessaoPayload } from "@/lib/auth";

/**
 * Lê e valida a sessão do usuário logado a partir do cookie. Só usável em
 * Server Components/Actions (usa `next/headers`) — o proxy lê o cookie
 * direto de `request.cookies` e chama `verificarSessionToken` de lib/auth.ts.
 *
 * Além da assinatura do token, confere no banco que o usuário ainda existe e
 * usa o papel ATUAL dele: sem isso, um usuário excluído (ou rebaixado de
 * ADMIN) continuava com acesso até o token de 7 dias expirar. `cache` faz a
 * consulta uma vez só por requisição, mesmo chamada em vários lugares.
 */
export const obterUsuarioAtual = cache(async (): Promise<SessaoPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const sessao = await verificarSessionToken(token);
  if (!sessao) return null;

  const { data: usuario, error } = await supabase
    .from("Usuario")
    .select("id, username, papel")
    .eq("id", sessao.id)
    .maybeSingle<SessaoPayload>();
  if (error || !usuario) return null;
  return { id: usuario.id, username: usuario.username, papel: usuario.papel };
});

/**
 * Lança se não houver usuário logado. Toda Server Action do painel chama
 * isto na primeira linha: actions são alcançáveis por POST direto, e o
 * bloqueio de página do proxy NÃO vale pra elas (ver docs de data-security
 * do Next).
 */
export async function exigirUsuario(): Promise<SessaoPayload> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) {
    throw new Error("Sua sessão expirou. Entre de novo.");
  }
  return usuario;
}

/** Lança se o usuário logado não for ADMIN — usado nas actions de gestão de usuários. */
export async function exigirAdmin(): Promise<SessaoPayload> {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") {
    throw new Error("Apenas administradores podem fazer isso.");
  }
  return usuario;
}
