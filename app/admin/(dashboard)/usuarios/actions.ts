"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso, erroDoBanco } from "@/lib/db";
import { usuarioSchema } from "@/lib/validations";
import { exigirAdmin } from "@/lib/sessao";
import type { UsuarioFormState } from "@/lib/types";

export async function createUsuario(_prevState: UsuarioFormState, formData: FormData): Promise<UsuarioFormState> {
  const { usuario: usuarioLogado, paroquiaId } = await exigirAdmin();

  const parsed = usuarioSchema.safeParse({
    username: formData.get("username"),
    senha: formData.get("senha"),
    papel: formData.get("papel"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Admin de uma pastoral só cria usuários dela; o da paróquia toda escolhe
  // (vazio = paróquia toda, só para administrador — operador e presença não
  // têm como trocar de pastoral no painel).
  const pastoralId = usuarioLogado.pastoralId ?? (String(formData.get("pastoralId") ?? "").trim() || null);
  if (!pastoralId && parsed.data.papel !== "ADMIN") {
    return { error: "Escolha a pastoral do usuário." };
  }
  if (pastoralId) {
    const { data: pastoral, error } = await supabase
      .from("Pastoral")
      .select("id")
      .eq("id", pastoralId)
      .eq("paroquiaId", paroquiaId)
      .maybeSingle();
    if (error) return erroDoBanco(error, "usuário");
    if (!pastoral) return { error: "Pastoral não encontrada." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.senha, 10);
  const { error } = await supabase.from("Usuario").insert({
    id: generateId(),
    paroquiaId,
    pastoralId,
    username: parsed.data.username,
    passwordHash,
    papel: parsed.data.papel,
    updatedAt: nowIso(),
  });
  if (error) {
    if (error.code === "23505") return { error: "Já existe um usuário com esse nome." };
    return erroDoBanco(error, "usuário");
  }

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

export async function deleteUsuario(id: string) {
  const { usuario: usuarioLogado, paroquiaId } = await exigirAdmin();
  if (usuarioLogado.id === id) {
    throw new Error("Você não pode excluir seu próprio usuário.");
  }

  let consulta = supabase.from("Usuario").delete().eq("id", id).eq("paroquiaId", paroquiaId);
  // Admin de uma pastoral só mexe nos usuários dela.
  if (usuarioLogado.pastoralId) consulta = consulta.eq("pastoralId", usuarioLogado.pastoralId);
  const { error } = await consulta;
  if (error) throw error;

  revalidatePath("/admin/usuarios");
}
