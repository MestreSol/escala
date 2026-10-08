import { AvisoAoUsuario } from "@/lib/avisos";
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  PAROQUIA_COOKIE_NAME,
  PASTORAL_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  verificarSessionToken,
  type SessaoPayload,
} from "@/lib/auth";
import type { TipoPastoral } from "@/lib/types";

export type UsuarioAtual = SessaoPayload & {
  /** Nulo só para SUPERADMIN — a paróquia dele vem do cookie (ver obterParoquiaAtual). */
  paroquiaId: string | null;
  /** Nulo = paróquia toda — a pastoral vem do cookie (ver obterPastoralAtual). */
  pastoralId: string | null;
};

export type ParoquiaAtual = { id: string; nome: string; slug: string };

export type PastoralAtual = { id: string; paroquiaId: string; nome: string; slug: string; tipo: TipoPastoral };

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
export const obterUsuarioAtual = cache(async (): Promise<UsuarioAtual | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const sessao = await verificarSessionToken(token);
  if (!sessao) return null;

  const { data: usuario, error } = await supabase
    .from("Usuario")
    .select("id, username, papel, paroquiaId, pastoralId")
    .eq("id", sessao.id)
    .maybeSingle<UsuarioAtual>();
  if (error || !usuario) return null;
  return {
    id: usuario.id,
    username: usuario.username,
    papel: usuario.papel,
    paroquiaId: usuario.paroquiaId,
    pastoralId: usuario.pastoralId,
  };
});

/**
 * Paróquia (tenant) em que o usuário logado está trabalhando: a dele, ou —
 * para o SUPERADMIN, que não pertence a nenhuma — a escolhida em
 * /admin/paroquias (cookie). TODA consulta do painel filtra por esse id: o
 * app usa a chave service_role, então o banco não isola nada sozinho.
 */
export const obterParoquiaAtual = cache(async (): Promise<ParoquiaAtual | null> => {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return null;

  const paroquiaId =
    usuario.papel === "SUPERADMIN" ? ((await cookies()).get(PAROQUIA_COOKIE_NAME)?.value ?? null) : usuario.paroquiaId;
  if (!paroquiaId) return null;

  const { data, error } = await supabase
    .from("Paroquia")
    .select("id, nome, slug")
    .eq("id", paroquiaId)
    .maybeSingle<ParoquiaAtual>();
  if (error) throw error;
  return data;
});

/** Pastorais da paróquia, ativas ou não (o painel também cuida das desativadas). */
export const listarPastoraisDaParoquia = cache(async (paroquiaId: string): Promise<PastoralAtual[]> => {
  const { data, error } = await supabase
    .from("Pastoral")
    .select("id, paroquiaId, nome, slug, tipo")
    .eq("paroquiaId", paroquiaId)
    .order("nome", { ascending: true })
    .returns<PastoralAtual[]>();
  if (error) throw error;
  return data ?? [];
});

/**
 * Pastoral em que o usuário logado está trabalhando: a dele, ou — para quem
 * cuida da paróquia toda — a escolhida em /admin/pastorais (cookie), ou a
 * única da paróquia. Funções, servidores e escala do painel filtram por esse
 * id; missas e ocorrências são da paróquia (compartilhadas).
 */
export const obterPastoralAtual = cache(async (): Promise<PastoralAtual | null> => {
  const usuario = await obterUsuarioAtual();
  const paroquia = await obterParoquiaAtual();
  if (!usuario || !paroquia) return null;

  const pastorais = await listarPastoraisDaParoquia(paroquia.id);
  if (usuario.pastoralId) return pastorais.find((p) => p.id === usuario.pastoralId) ?? null;

  const escolhida = (await cookies()).get(PASTORAL_COOKIE_NAME)?.value;
  const pastoral = pastorais.find((p) => p.id === escolhida);
  if (pastoral) return pastoral;
  return pastorais.length === 1 ? pastorais[0] : null;
});

/**
 * Lança se não houver usuário logado. Toda Server Action do painel chama
 * isto (ou exigirParoquia) na primeira linha: actions são alcançáveis por
 * POST direto, e o bloqueio de página do proxy NÃO vale pra elas (ver docs
 * de data-security do Next).
 */
export async function exigirUsuario(): Promise<UsuarioAtual> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) {
    throw new AvisoAoUsuario("Sua sessão expirou. Entre de novo.");
  }
  return usuario;
}

async function contextoDaParoquia(usuario: UsuarioAtual): Promise<{ usuario: UsuarioAtual; paroquiaId: string }> {
  const paroquia = await obterParoquiaAtual();
  if (!paroquia) {
    throw new AvisoAoUsuario("Escolha uma paróquia antes de continuar.");
  }
  return { usuario, paroquiaId: paroquia.id };
}

async function contextoDaPastoral(usuario: UsuarioAtual) {
  const contexto = await contextoDaParoquia(usuario);
  const pastoral = await obterPastoralAtual();
  if (!pastoral) {
    throw new AvisoAoUsuario("Escolha uma pastoral antes de continuar.");
  }
  return { ...contexto, pastoral, pastoralId: pastoral.id };
}

/**
 * Usuário logado + paróquia em que ele trabalha — para as Server Actions do
 * painel. Barra o PRESENCA: as únicas actions dele usam exigirPastoralParaPresenca.
 */
export async function exigirParoquia(): Promise<{ usuario: UsuarioAtual; paroquiaId: string }> {
  const usuario = await exigirUsuario();
  if (usuario.papel === "PRESENCA") {
    throw new AvisoAoUsuario("Seu usuário só pode registrar presença.");
  }
  return contextoDaParoquia(usuario);
}

/** Usuário logado + paróquia + pastoral em que ele trabalha — para as Server Actions do painel. */
export async function exigirPastoral(): Promise<{
  usuario: UsuarioAtual;
  paroquiaId: string;
  pastoral: PastoralAtual;
  pastoralId: string;
}> {
  const usuario = await exigirUsuario();
  if (usuario.papel === "PRESENCA") {
    throw new AvisoAoUsuario("Seu usuário só pode registrar presença.");
  }
  return contextoDaPastoral(usuario);
}

/**
 * Como exigirPastoral, mas também aceita o PRESENCA — só para as actions de
 * registrar presença. Elas conferem por conta própria que o PRESENCA só mexe
 * nas missas de hoje (ver ehOcorrenciaDeHoje).
 */
export async function exigirPastoralParaPresenca(): Promise<{
  usuario: UsuarioAtual;
  paroquiaId: string;
  pastoral: PastoralAtual;
  pastoralId: string;
}> {
  return contextoDaPastoral(await exigirUsuario());
}

/**
 * Versão para páginas do painel: em vez de lançar, manda pro login (sem
 * sessão) ou pra escolha de paróquia (SUPERADMIN sem paróquia escolhida).
 * Layout e página renderizam em paralelo, então cada página chama isto por
 * conta própria em vez de confiar no layout.
 */
export async function paroquiaDoPainel(): Promise<ParoquiaAtual> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/admin/login");
  if (usuario.papel === "PRESENCA") redirect("/admin/presenca");
  const paroquia = await obterParoquiaAtual();
  if (!paroquia) {
    if (usuario.papel === "SUPERADMIN") redirect("/admin/paroquias");
    throw new AvisoAoUsuario("Seu usuário não está ligado a nenhuma paróquia.");
  }
  return paroquia;
}

/** Como paroquiaDoPainel, mas também exige a pastoral — sem ela, manda pra escolha em /admin/pastorais. */
export async function pastoralDoPainel(): Promise<{ paroquia: ParoquiaAtual; pastoral: PastoralAtual }> {
  const paroquia = await paroquiaDoPainel();
  const pastoral = await obterPastoralAtual();
  if (!pastoral) {
    const usuario = await obterUsuarioAtual();
    if (usuario?.pastoralId) throw new AvisoAoUsuario("A pastoral do seu usuário não existe mais.");
    redirect("/admin/pastorais");
  }
  return { paroquia, pastoral };
}

/**
 * Para a página /admin/presenca: qualquer usuário da pastoral pode usá-la
 * (é a única que o PRESENCA vê). Não passa por paroquiaDoPainel, que manda o
 * PRESENCA de volta pra cá.
 */
export async function pastoralDaPresenca(): Promise<{ paroquia: ParoquiaAtual; pastoral: PastoralAtual }> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/admin/login");
  const [paroquia, pastoral] = await Promise.all([obterParoquiaAtual(), obterPastoralAtual()]);
  if (!paroquia) {
    if (usuario.papel === "SUPERADMIN") redirect("/admin/paroquias");
    throw new AvisoAoUsuario("Seu usuário não está ligado a nenhuma paróquia.");
  }
  if (!pastoral) {
    if (usuario.pastoralId) throw new AvisoAoUsuario("A pastoral do seu usuário não existe mais.");
    redirect("/admin/pastorais");
  }
  return { paroquia, pastoral };
}

export function podeGerenciarUsuarios(usuario: Pick<UsuarioAtual, "papel"> | null): boolean {
  return usuario?.papel === "ADMIN" || usuario?.papel === "SUPERADMIN";
}

/** Administrador da paróquia toda (não preso a uma pastoral): cadastra pastorais e troca entre elas. */
export function cuidaDaParoquiaToda(usuario: Pick<UsuarioAtual, "papel" | "pastoralId"> | null): boolean {
  return podeGerenciarUsuarios(usuario) && !usuario?.pastoralId;
}

/** Lança se o usuário logado não for ADMIN (ou SUPERADMIN) — usado nas actions de gestão de usuários. */
export async function exigirAdmin(): Promise<{ usuario: UsuarioAtual; paroquiaId: string }> {
  const contexto = await exigirParoquia();
  if (!podeGerenciarUsuarios(contexto.usuario)) {
    throw new AvisoAoUsuario("Apenas administradores podem fazer isso.");
  }
  return contexto;
}

/** Lança se o usuário logado não cuidar da paróquia toda — usado nas actions de gestão de pastorais. */
export async function exigirAdminDaParoquia(): Promise<{ usuario: UsuarioAtual; paroquiaId: string }> {
  const contexto = await exigirParoquia();
  if (!cuidaDaParoquiaToda(contexto.usuario)) {
    throw new AvisoAoUsuario("Apenas o administrador da paróquia pode fazer isso.");
  }
  return contexto;
}

/** Lança se o usuário logado não for SUPERADMIN — usado nas actions de gestão de paróquias. */
export async function exigirSuperadmin(): Promise<UsuarioAtual> {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "SUPERADMIN") {
    throw new AvisoAoUsuario("Apenas o administrador geral pode fazer isso.");
  }
  return usuario;
}
