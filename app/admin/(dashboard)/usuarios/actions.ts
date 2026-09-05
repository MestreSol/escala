"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso } from "@/lib/db";
import { usuarioSchema } from "@/lib/validations";
import { exigirAdmin } from "@/lib/sessao";
import type { UsuarioFormState } from "@/lib/types";

export async function createUsuario(_prevState: UsuarioFormState, formData: FormData): Promise<UsuarioFormState> {
  await exigirAdmin();

  const parsed = usuarioSchema.safeParse({
    username: formData.get("username"),
    senha: formData.get("senha"),
    papel: formData.get("papel"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.senha, 10);
  const { error } = await supabase.from("Usuario").insert({
    id: generateId(),
    username: parsed.data.username,
    passwordHash,
    papel: parsed.data.papel,
    updatedAt: nowIso(),
  });
  if (error) {
    if (error.code === "23505") return { error: "Já existe um usuário com esse nome." };
    return { error: error.message };
  }

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

export async function deleteUsuario(id: string) {
  const usuarioLogado = await exigirAdmin();
  if (usuarioLogado.id === id) {
    throw new Error("Você não pode excluir seu próprio usuário.");
  }

  const { error } = await supabase.from("Usuario").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/usuarios");
}
