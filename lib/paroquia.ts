import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { ParoquiaRow, PastoralRow } from "@/lib/types";

/**
 * Slugs que não podem ser de paróquia: a URL pública é /<slug>/escala, e
 * estes nomes já são rotas fixas do app (ou foram, e ainda redirecionam).
 */
export const SLUGS_RESERVADOS = new Set([
  "admin",
  "api",
  "escala",
  "inscricao",
  "indisponibilidade",
  "_next",
  "favicon.ico",
]);

/**
 * Slugs que não podem ser de pastoral: a URL pública é /<paroquia>/<slug>/escala,
 * e /<paroquia>/escala etc. são os endereços de antes das pastorais (redirecionam).
 */
export const SLUGS_RESERVADOS_PASTORAL = new Set(["escala", "inscricao", "indisponibilidade"]);

/** Paróquia ATIVA pelo slug da URL das páginas públicas, ou null. */
export const buscarParoquiaPorSlug = cache(async (slug: string): Promise<ParoquiaRow | null> => {
  const { data, error } = await supabase
    .from("Paroquia")
    .select("*")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle<ParoquiaRow>();
  if (error) throw error;
  return data;
});

/** Para as páginas/actions públicas em app/[paroquia]: 404 se o slug não existe ou está inativo. */
export async function paroquiaPublica(slug: string): Promise<ParoquiaRow> {
  const paroquia = await buscarParoquiaPorSlug(slug);
  if (!paroquia) notFound();
  return paroquia;
}

export async function listarParoquiasAtivas(): Promise<Pick<ParoquiaRow, "id" | "nome" | "slug">[]> {
  const { data, error } = await supabase
    .from("Paroquia")
    .select("id, nome, slug")
    .eq("ativo", true)
    .order("nome", { ascending: true })
    .returns<Pick<ParoquiaRow, "id" | "nome" | "slug">[]>();
  if (error) throw error;
  return data ?? [];
}

export type PastoralPublicaInfo = Pick<PastoralRow, "id" | "nome" | "slug" | "tipo">;

/** Pastorais ATIVAS da paróquia, pra escolha na página pública dela. */
export const listarPastoraisAtivas = cache(async (paroquiaId: string): Promise<PastoralPublicaInfo[]> => {
  const { data, error } = await supabase
    .from("Pastoral")
    .select("id, nome, slug, tipo")
    .eq("paroquiaId", paroquiaId)
    .eq("ativo", true)
    .order("nome", { ascending: true })
    .returns<PastoralPublicaInfo[]>();
  if (error) throw error;
  return data ?? [];
});

/** Para as páginas/actions públicas em app/[paroquia]/[pastoral]: 404 se paróquia ou pastoral não existe ou está inativa. */
export async function pastoralPublica(
  slugParoquia: string,
  slugPastoral: string
): Promise<{ paroquia: ParoquiaRow; pastoral: PastoralPublicaInfo }> {
  const paroquia = await paroquiaPublica(slugParoquia);
  const pastoral = (await listarPastoraisAtivas(paroquia.id)).find((p) => p.slug === slugPastoral);
  if (!pastoral) notFound();
  return { paroquia, pastoral };
}

/**
 * Endereços de antes das pastorais (/<paroquia>/escala etc.): com uma pastoral
 * só, vai direto pra ela; com várias, pra escolha na página da paróquia.
 */
export async function redirecionarParaPastoral(
  slugParoquia: string,
  caminho: string,
  query: Record<string, string | string[] | undefined>
): Promise<never> {
  const paroquia = await paroquiaPublica(slugParoquia);
  const pastorais = await listarPastoraisAtivas(paroquia.id);
  if (pastorais.length !== 1) redirect(`/${paroquia.slug}`);
  redirect(`/${paroquia.slug}/${pastorais[0].slug}${caminho}${montarBusca(query)}`);
}

function montarBusca(query: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(query)) {
    for (const v of Array.isArray(valor) ? valor : valor === undefined ? [] : [valor]) params.append(chave, v);
  }
  const busca = params.toString();
  return busca ? `?${busca}` : "";
}

type TabelaComParoquia = "Funcao" | "Missa" | "Servidor" | "MissaOcorrencia";
type TabelaComPastoral = "Funcao" | "Servidor";

/**
 * Lança se algum dos ids não for da paróquia — toda action que recebe id do
 * navegador (formulário, `bind`) passa por aqui antes de gravar, senão daria
 * pra mexer em dado de outra paróquia trocando o id no POST.
 */
export async function garantirDaParoquia(tabela: TabelaComParoquia, ids: string | string[], paroquiaId: string) {
  const lista = [...new Set(Array.isArray(ids) ? ids : [ids])];
  if (lista.length === 0) return;

  const { data, error } = await supabase
    .from(tabela)
    .select("id")
    .in("id", lista)
    .eq("paroquiaId", paroquiaId)
    .returns<{ id: string }[]>();
  if (error) throw error;
  if ((data ?? []).length !== lista.length) {
    throw new Error("Registro não encontrado.");
  }
}

/** Como garantirDaParoquia, para o que é de uma pastoral só (funções e servidores). */
export async function garantirDaPastoral(tabela: TabelaComPastoral, ids: string | string[], pastoralId: string) {
  const lista = [...new Set(Array.isArray(ids) ? ids : [ids])];
  if (lista.length === 0) return;

  const { data, error } = await supabase
    .from(tabela)
    .select("id")
    .in("id", lista)
    .eq("pastoralId", pastoralId)
    .returns<{ id: string }[]>();
  if (error) throw error;
  if ((data ?? []).length !== lista.length) {
    throw new Error("Registro não encontrado.");
  }
}

/**
 * Rotas antigas (/escala, /inscricao, /indisponibilidade), de antes do
 * multi-paróquia — links já compartilhados continuam funcionando: com uma
 * paróquia só, vai direto pra ela; com várias, pra escolha na página inicial.
 */
export async function redirecionarRotaAntiga(
  caminho: string,
  query: Record<string, string | string[] | undefined>
): Promise<never> {
  const paroquias = await listarParoquiasAtivas();
  if (paroquias.length !== 1) redirect("/");
  redirect(`/${paroquias[0].slug}${caminho}${montarBusca(query)}`);
}
