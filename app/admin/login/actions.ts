"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { criarSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import type { UsuarioRow } from "@/lib/types";

export type LoginState = { error?: string };

// Hash bcrypt de uma senha aleatória qualquer: quando o usuário não existe,
// comparamos contra ele mesmo assim, pra resposta levar o mesmo tempo — senão
// dava pra descobrir quais usuários existem medindo o tempo de resposta.
const HASH_FALSO = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.qzVbLy9ZxVdTH9d5pXk2g5lQJt1W";

/**
 * Só aceita caminho interno do próprio site ("/admin/..."). "//site.com" e
 * "/\site.com" também começam com "/", mas o navegador trata como outro
 * domínio — era um redirecionamento aberto (phishing com link do próprio site).
 */
function destinoSeguro(redirectTo: string): string {
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//") || redirectTo.startsWith("/\\")) return "/admin";
  return redirectTo;
}

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/admin");

  if (!username || !password) {
    return { error: "Informe usuário e senha." };
  }
  if (username.length > 64 || password.length > 128) {
    return { error: "Usuário ou senha inválidos." };
  }

  const { data: usuario, error } = await supabase
    .from("Usuario")
    .select("id, username, passwordHash, papel")
    .eq("username", username)
    .returns<Pick<UsuarioRow, "id" | "username" | "passwordHash" | "papel">[]>()
    .maybeSingle();
  if (error) {
    console.error("Erro ao buscar usuário no login:", error);
    return { error: "Não foi possível entrar agora. Tente de novo em instantes." };
  }

  const senhaOk = await bcrypt.compare(password, usuario?.passwordHash ?? HASH_FALSO);
  if (!usuario || !senhaOk) {
    // Freia tentativa de adivinhar senha em sequência.
    await esperar(800);
    return { error: "Usuário ou senha inválidos." };
  }

  const token = await criarSessionToken({ id: usuario.id, username: usuario.username, papel: usuario.papel });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(destinoSeguro(redirectTo));
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/admin/login");
}
