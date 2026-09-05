import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verificarSessionToken, type SessaoPayload } from "@/lib/auth";

/**
 * Lê e valida a sessão do usuário logado a partir do cookie. Só usável em
 * Server Components/Actions (usa `next/headers`) — o middleware lê o cookie
 * direto de `request.cookies` e chama `verificarSessionToken` de lib/auth.ts.
 */
export async function obterUsuarioAtual(): Promise<SessaoPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarSessionToken(token);
}

/** Lança se o usuário logado não for ADMIN — usado nas actions de gestão de usuários. */
export async function exigirAdmin(): Promise<SessaoPayload> {
  const usuario = await obterUsuarioAtual();
  if (!usuario || usuario.papel !== "ADMIN") {
    throw new Error("Apenas administradores podem fazer isso.");
  }
  return usuario;
}
