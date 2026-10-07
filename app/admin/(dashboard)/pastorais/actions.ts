"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso, erroDoBanco } from "@/lib/db";
import { pastoralSchema } from "@/lib/validations";
import { exigirAdminDaParoquia } from "@/lib/sessao";
import { SLUGS_RESERVADOS_PASTORAL } from "@/lib/paroquia";
import { PASTORAL_COOKIE_NAME } from "@/lib/auth";
import { GRAU_UNICO, usaGraus } from "@/lib/constants";

export type PastoralFormState = { error?: string };

function parsePastoralForm(formData: FormData) {
  const parsed = pastoralSchema.safeParse({
    nome: formData.get("nome"),
    slug: formData.get("slug"),
    tipo: formData.get("tipo"),
    ativo: formData.get("ativo") === "on",
  });
  if (parsed.success && SLUGS_RESERVADOS_PASTORAL.has(parsed.data.slug)) {
    return { success: false as const, error: `O endereço "${parsed.data.slug}" é reservado. Escolha outro.` };
  }
  return parsed.success
    ? { success: true as const, data: parsed.data }
    : { success: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
}

function erroAoSalvar(error: { message: string; code?: string }): PastoralFormState {
  if (error.code === "23505") return { error: "Já existe uma pastoral com esse endereço nesta paróquia." };
  return erroDoBanco(error, "pastoral");
}

export async function createPastoral(_prevState: PastoralFormState, formData: FormData): Promise<PastoralFormState> {
  const { paroquiaId } = await exigirAdminDaParoquia();
  const parsed = parsePastoralForm(formData);
  if (!parsed.success) return { error: parsed.error };

  const { error } = await supabase
    .from("Pastoral")
    .insert({ id: generateId(), paroquiaId, ...parsed.data, updatedAt: nowIso() });
  if (error) return erroAoSalvar(error);

  revalidatePath("/admin/pastorais");
  redirect("/admin/pastorais");
}

export async function updatePastoral(
  id: string,
  _prevState: PastoralFormState,
  formData: FormData
): Promise<PastoralFormState> {
  const { paroquiaId } = await exigirAdminDaParoquia();
  const parsed = parsePastoralForm(formData);
  if (!parsed.success) return { error: parsed.error };

  const { error } = await supabase
    .from("Pastoral")
    .update({ ...parsed.data, updatedAt: nowIso() })
    .eq("id", id)
    .eq("paroquiaId", paroquiaId);
  if (error) return erroAoSalvar(error);

  // Sem graus, o campo some das telas: uma função que ainda exigisse grau
  // maior deixaria parte dos servidores de fora do sorteio sem ninguém ver.
  if (!usaGraus(parsed.data.tipo)) {
    const { error: grauError } = await supabase
      .from("Funcao")
      .update({ grauMinimo: GRAU_UNICO, updatedAt: nowIso() })
      .eq("pastoralId", id)
      .eq("paroquiaId", paroquiaId)
      .neq("grauMinimo", GRAU_UNICO);
    if (grauError) return erroAoSalvar(grauError);
  }

  revalidatePath("/admin", "layout");
  return {};
}

/** Escolhe a pastoral em que o administrador da paróquia vai trabalhar no painel (ver obterPastoralAtual). */
export async function entrarNaPastoral(id: string) {
  const { paroquiaId } = await exigirAdminDaParoquia();
  const { data, error } = await supabase
    .from("Pastoral")
    .select("id")
    .eq("id", id)
    .eq("paroquiaId", paroquiaId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Pastoral não encontrada.");

  const cookieStore = await cookies();
  cookieStore.set(PASTORAL_COOKIE_NAME, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  redirect("/admin");
}
