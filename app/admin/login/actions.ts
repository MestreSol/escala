"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { criarSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/admin");

  const expectedUsername = process.env.ADMIN_USERNAME?.trim();
  const expectedHash = process.env.ADMIN_PASSWORD_HASH?.trim();

  if (!expectedUsername || !expectedHash) {
    return { error: "Login não configurado no servidor." };
  }

  const usernameOk = username === expectedUsername;
  const passwordOk = usernameOk && (await bcrypt.compare(password, expectedHash));

  // DEBUG temporário — remover depois de diagnosticar o login em produção.
  console.log("DEBUG login", {
    usernameOk,
    passwordOk,
    usernameLen: username.length,
    expectedUsernameLen: expectedUsername.length,
    hashLen: expectedHash.length,
    hashPrefix: expectedHash.slice(0, 7),
    hashSuffix: expectedHash.slice(-6),
  });

  if (!usernameOk || !passwordOk) {
    return { error: "Usuário ou senha inválidos." };
  }

  const token = await criarSessionToken(username);
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
