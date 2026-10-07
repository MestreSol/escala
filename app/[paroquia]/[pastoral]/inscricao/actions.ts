"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso, erroDoBanco } from "@/lib/db";
import { servidorSchema } from "@/lib/validations";
import { pastoralPublica } from "@/lib/paroquia";
import { listarMissasDePreferencia } from "@/lib/missaPastoral";
import { GRAU_UNICO, usaGraus } from "@/lib/constants";
import type { ServidorFormState } from "@/lib/types";

export async function createServidor(
  slugParoquia: string,
  slugPastoral: string,
  _prevState: ServidorFormState,
  formData: FormData
): Promise<ServidorFormState> {
  // Página pública: os slugs vêm do navegador — só vale paróquia e pastoral ativas de verdade.
  const { paroquia, pastoral } = await pastoralPublica(slugParoquia, slugPastoral);
  const sucesso = `/${paroquia.slug}/${pastoral.slug}/inscricao/sucesso`;

  // Campo-armadilha invisível (ver ServidorForm): gente não preenche, robô de
  // spam preenche tudo. Finge que deu certo e não grava nada.
  if (String(formData.get("site") ?? "").trim() !== "") redirect(sucesso);

  const parsed = servidorSchema.safeParse({
    nome: formData.get("nome"),
    dataNascimento: formData.get("dataNascimento"),
    comunidade: formData.get("comunidade"),
    // Pastoral sem graus (ex: ministros): todo mundo no mesmo nível.
    categoria: usaGraus(pastoral.tipo) ? formData.get("categoria") : GRAU_UNICO,
    missaIds: formData.getAll("missaIds"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { missaIds: missaIdsEnviados, ...servidorData } = parsed.data;

  // Só aceita missas que a própria tela oferece — os ids vêm do navegador e
  // podem ser qualquer coisa.
  let missasPermitidas: Set<string>;
  try {
    missasPermitidas = new Set((await listarMissasDePreferencia(paroquia.id, pastoral.id)).map((m) => m.id));
  } catch (error) {
    return erroDoBanco(error as { message: string }, "inscrição");
  }
  const missaIds = missaIdsEnviados.filter((id) => missasPermitidas.has(id));
  if (missaIds.length === 0) return { error: "Selecione pelo menos uma missa" };
  const servidorId = generateId();

  const { error: servidorError } = await supabase.from("Servidor").insert({
    id: servidorId,
    paroquiaId: paroquia.id,
    pastoralId: pastoral.id,
    ...servidorData,
    updatedAt: nowIso(),
  });
  if (servidorError) return erroDoBanco(servidorError, "inscrição");

  const { error: preferenciasError } = await supabase
    .from("ServidorMissaPreferencia")
    .insert(missaIds.map((missaId) => ({ id: generateId(), servidorId, missaId })));
  if (preferenciasError) return erroDoBanco(preferenciasError, "inscrição");

  redirect(sucesso);
}
