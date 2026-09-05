import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "escala_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 dias

export type PapelUsuario = "ADMIN" | "OPERADOR";

export type SessaoPayload = {
  id: string;
  username: string;
  papel: PapelUsuario;
};

// Este módulo é importado pelo middleware (roda no Edge), então só pode usar
// APIs compatíveis com Edge — nada de bcrypt/supabase aqui. Consultas ao
// Usuario (login, gestão) ficam em lib/sessao.ts e nas actions.
function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET não configurado");
  }
  return new TextEncoder().encode(secret);
}

export async function criarSessionToken(usuario: SessaoPayload): Promise<string> {
  return new SignJWT({ id: usuario.id, username: usuario.username, papel: usuario.papel })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS)
    .sign(getSecretKey());
}

export async function verificarSessionToken(token: string): Promise<SessaoPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.id !== "string" ||
      typeof payload.username !== "string" ||
      (payload.papel !== "ADMIN" && payload.papel !== "OPERADOR")
    ) {
      return null;
    }
    return { id: payload.id, username: payload.username, papel: payload.papel };
  } catch {
    return null;
  }
}
