import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verificarSessionToken } from "@/lib/auth";

/**
 * Protege as PÁGINAS do painel (/admin/*): sem sessão válida, manda pro login;
 * o PRESENCA só entra em /admin/presenca e em /admin/contatos (foto e telefones).
 * Não protege Server Actions — cada action confere o usuário de novo (ver
 * exigirUsuario em lib/sessao.ts).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verificarSessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const liberadoParaPresenca =
    pathname === "/admin/presenca" || pathname === "/admin/contatos" || pathname.startsWith("/admin/contatos/");
  if (session.papel === "PRESENCA" && !liberadoParaPresenca) {
    return NextResponse.redirect(new URL("/admin/presenca", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
