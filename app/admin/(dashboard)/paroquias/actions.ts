"use server";

import { AvisoAoUsuario, comAvisos, comAvisosNoFormulario } from "@/lib/avisos";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso, erroDoBanco } from "@/lib/db";
import { paroquiaSchema } from "@/lib/validations";
import { exigirSuperadmin } from "@/lib/sessao";
import { SLUGS_RESERVADOS } from "@/lib/paroquia";
import { PAROQUIA_COOKIE_NAME, PASTORAL_COOKIE_NAME } from "@/lib/auth";

export type ParoquiaFormState = { error?: string };

function parseParoquiaForm(formData: FormData) {
  const parsed = paroquiaSchema.safeParse({
    nome: formData.get("nome"),
    slug: formData.get("slug"),
    ativo: formData.get("ativo") === "on",
  });
  if (parsed.success && SLUGS_RESERVADOS.has(parsed.data.slug)) {
    return { success: false as const, error: `O endereço "${parsed.data.slug}" é reservado. Escolha outro.` };
  }
  return parsed.success
    ? { success: true as const, data: parsed.data }
    : { success: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
}

function erroAoSalvar(error: { message: string; code?: string }): ParoquiaFormState {
  if (error.code === "23505") return { error: "Já existe uma paróquia com esse endereço." };
  return erroDoBanco(error, "paróquia");
}

async function createParoquiaInterno(_prevState: ParoquiaFormState, formData: FormData): Promise<ParoquiaFormState> {
  await exigirSuperadmin();
  const parsed = parseParoquiaForm(formData);
  if (!parsed.success) return { error: parsed.error };

  const { error } = await supabase
    .from("Paroquia")
    .insert({ id: generateId(), ...parsed.data, updatedAt: nowIso() });
  if (error) return erroAoSalvar(error);

  revalidatePath("/admin/paroquias");
  redirect("/admin/paroquias");
}


export async function createParoquia(...args: Parameters<typeof createParoquiaInterno>) {
  return comAvisosNoFormulario(() => createParoquiaInterno(...args));
}
async function updateParoquiaInterno(
  id: string,
  _prevState: ParoquiaFormState,
  formData: FormData
): Promise<ParoquiaFormState> {
  await exigirSuperadmin();
  const parsed = parseParoquiaForm(formData);
  if (!parsed.success) return { error: parsed.error };

  const { error } = await supabase
    .from("Paroquia")
    .update({ ...parsed.data, updatedAt: nowIso() })
    .eq("id", id);
  if (error) return erroAoSalvar(error);

  revalidatePath("/admin/paroquias");
  revalidatePath(`/admin/paroquias/${id}`);
  return {};
}


export async function updateParoquia(...args: Parameters<typeof updateParoquiaInterno>) {
  return comAvisosNoFormulario(() => updateParoquiaInterno(...args));
}
/** Escolhe a paróquia em que o SUPERADMIN vai trabalhar no painel (ver obterParoquiaAtual). */
async function entrarNaParoquiaInterno(id: string) {
  await exigirSuperadmin();
  const { data, error } = await supabase.from("Paroquia").select("id").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new AvisoAoUsuario("Paróquia não encontrada.");

  const cookieStore = await cookies();
  cookieStore.set(PAROQUIA_COOKIE_NAME, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  // A pastoral escolhida era da paróquia anterior.
  cookieStore.delete(PASTORAL_COOKIE_NAME);

  redirect("/admin");
}


export async function entrarNaParoquia(...args: Parameters<typeof entrarNaParoquiaInterno>) {
  return comAvisos(() => entrarNaParoquiaInterno(...args));
}