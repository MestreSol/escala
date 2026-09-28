"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso, erroDoBanco } from "@/lib/db";
import { servidorSchema } from "@/lib/validations";
import type { ServidorFormState } from "@/lib/types";

export async function createServidor(_prevState: ServidorFormState, formData: FormData): Promise<ServidorFormState> {
  // Campo-armadilha invisível (ver ServidorForm): gente não preenche, robô de
  // spam preenche tudo. Finge que deu certo e não grava nada.
  if (String(formData.get("site") ?? "").trim() !== "") redirect("/inscricao/sucesso");

  const parsed = servidorSchema.safeParse({
    nome: formData.get("nome"),
    dataNascimento: formData.get("dataNascimento"),
    comunidade: formData.get("comunidade"),
    categoria: formData.get("categoria"),
    missaIds: formData.getAll("missaIds"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { missaIds: missaIdsEnviados, ...servidorData } = parsed.data;

  // Só aceita missas que a própria tela oferece (semanais, ativas, por
  // preferência) — os ids vêm do navegador e podem ser qualquer coisa.
  const { data: missasPermitidas, error: missasError } = await supabase
    .from("Missa")
    .select("id")
    .eq("ativo", true)
    .eq("escalarTodosAtivos", false)
    .is("dataUnica", null)
    .in("id", missaIdsEnviados)
    .returns<{ id: string }[]>();
  if (missasError) return erroDoBanco(missasError, "inscrição");
  const missaIds = (missasPermitidas ?? []).map((m) => m.id);
  if (missaIds.length === 0) return { error: "Selecione pelo menos uma missa" };
  const servidorId = generateId();

  const { error: servidorError } = await supabase
    .from("Servidor")
    .insert({ id: servidorId, ...servidorData, updatedAt: nowIso() });
  if (servidorError) return erroDoBanco(servidorError, "inscrição");

  if (missaIds.length > 0) {
    const { error: preferenciasError } = await supabase
      .from("ServidorMissaPreferencia")
      .insert(missaIds.map((missaId) => ({ id: generateId(), servidorId, missaId })));
    if (preferenciasError) return erroDoBanco(preferenciasError, "inscrição");
  }

  redirect("/inscricao/sucesso");
}
