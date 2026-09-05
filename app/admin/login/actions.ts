"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { criarSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import type { UsuarioRow } from "@/lib/types";

export type LoginState = { error?: string };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/admin");

  if (!username || !password) {
    return { error: "Informe usuário e senha." };
  }

  const { data: usuario, error } = await supabase
    .from("Usuario")
    .select("id, username, passwordHash, papel")
    .eq("username", username)
    .returns<Pick<UsuarioRow, "id" | "username" | "passwordHash" | "papel">[]>()
    .maybeSingle();
  if (error) throw error;

  const senhaOk = usuario ? await bcrypt.compare(password, usuario.passwordHash) : false;
  if (!usuario || !senhaOk) {
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

  redirect(redirectTo.startsWith("/") ? redirectTo : "/admin");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/admin/login");
}
