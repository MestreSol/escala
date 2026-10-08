"use server";

import { AvisoAoUsuario, comAvisos, comAvisosNoFormulario } from "@/lib/avisos";
import { cuidaDaParoquiaToda, exigirPastoral } from "@/lib/sessao";
import { garantirDaParoquia } from "@/lib/paroquia";
import { missaUsadaPorOutraPastoral, setConfigMissa, type ConfigMissaPastoral } from "@/lib/missaPastoral";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso, erroDoBanco } from "@/lib/db";
import { missaSchema } from "@/lib/validations";
import type { MissaInput } from "@/lib/validations";
import { parseDataUnica } from "@/lib/occurrences";

export type MissaFormState = { error?: string };

function campo(formData: FormData, nome: string) {
  return formData.get(nome) ?? undefined;
}

function parseMissaForm(formData: FormData) {
  const tipoEnviado = formData.get("tipo");
  const tipo = tipoEnviado === "DATA_UNICA" || tipoEnviado === "MENSAL" ? tipoEnviado : "RECORRENTE";

  if (tipo === "DATA_UNICA") {
    return missaSchema.safeParse({
      tipo,
      dataUnica: campo(formData, "dataUnica"),
      modoEscalacao: campo(formData, "modoEscalacao"),
      comunidadeResponsavel: campo(formData, "comunidadeResponsavel"),
      horario: campo(formData, "horario"),
      comunidade: campo(formData, "comunidade"),
    });
  }

  return missaSchema.safeParse({
    tipo,
    diaSemana: campo(formData, "diaSemana"),
    semanaDoMes: tipo === "MENSAL" ? campo(formData, "semanaDoMes") : undefined,
    modoEscalacao: campo(formData, "modoEscalacao"),
    horario: campo(formData, "horario"),
    comunidade: campo(formData, "comunidade"),
  });
}

/** Campos da missa em si — compartilhados por todas as pastorais da paróquia. */
function paraLinhaDb(dados: MissaInput) {
  if (dados.tipo === "DATA_UNICA") {
    return {
      diaSemana: null,
      semanaDoMes: null,
      dataUnica: parseDataUnica(dados.dataUnica).toISOString(),
      horario: dados.horario,
      comunidade: dados.comunidade,
    };
  }

  return {
    diaSemana: dados.diaSemana,
    semanaDoMes: dados.tipo === "MENSAL" ? dados.semanaDoMes : null,
    dataUnica: null,
    horario: dados.horario,
    comunidade: dados.comunidade,
  };
}

/** "Quem serve" — vale só para a pastoral de quem está salvando (ver MissaPastoral). */
function paraConfigDaPastoral(dados: MissaInput): ConfigMissaPastoral {
  return {
    escalarTodosAtivos: dados.modoEscalacao === "LISTA_TODOS",
    comunidadeResponsavel:
      dados.tipo === "DATA_UNICA" && dados.modoEscalacao === "COMUNIDADE" ? (dados.comunidadeResponsavel ?? null) : null,
  };
}

async function createMissaInterno(_prevState: MissaFormState, formData: FormData): Promise<MissaFormState> {
  const { paroquiaId, pastoralId } = await exigirPastoral();
  const parsed = parseMissaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const id = generateId();
  const { error } = await supabase
    .from("Missa")
    .insert({ id, paroquiaId, ...paraLinhaDb(parsed.data), updatedAt: nowIso() });
  if (error) return erroDoBanco(error, "missa");
  await setConfigMissa(id, pastoralId, paraConfigDaPastoral(parsed.data));

  revalidatePath("/admin/missas");
  redirect(`/admin/missas/${id}`);
}


export async function createMissa(...args: Parameters<typeof createMissaInterno>) {
  return comAvisosNoFormulario(() => createMissaInterno(...args));
}
async function updateMissaInterno(
  id: string,
  _prevState: MissaFormState,
  formData: FormData
): Promise<MissaFormState> {
  const { paroquiaId, pastoralId } = await exigirPastoral();
  await garantirDaParoquia("Missa", id, paroquiaId);
  const parsed = parseMissaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { error } = await supabase
    .from("Missa")
    .update({ ...paraLinhaDb(parsed.data), updatedAt: nowIso() })
    .eq("id", id)
    .eq("paroquiaId", paroquiaId);
  if (error) return erroDoBanco(error, "missa");
  await setConfigMissa(id, pastoralId, paraConfigDaPastoral(parsed.data));

  revalidatePath("/admin/missas");
  revalidatePath(`/admin/missas/${id}`);
  return {};
}


export async function updateMissa(...args: Parameters<typeof updateMissaInterno>) {
  return comAvisosNoFormulario(() => updateMissaInterno(...args));
}
async function deleteMissaInterno(id: string) {
  const { usuario, paroquiaId, pastoralId } = await exigirPastoral();
  await garantirDaParoquia("Missa", id, paroquiaId);
  // A missa é da paróquia: excluir apaga também a escala das outras pastorais.
  if (!cuidaDaParoquiaToda(usuario) && (await missaUsadaPorOutraPastoral(id, pastoralId))) {
    throw new AvisoAoUsuario("Outra pastoral também serve nesta missa. Só o administrador da paróquia pode excluí-la.");
  }
  const { error } = await supabase.from("Missa").delete().eq("id", id).eq("paroquiaId", paroquiaId);
  if (error) throw error;

  revalidatePath("/admin/missas");
  redirect("/admin/missas");
}


export async function deleteMissa(...args: Parameters<typeof deleteMissaInterno>) {
  return comAvisos(() => deleteMissaInterno(...args));
}
async function saveMissaRequisitosInterno(missaId: string, formData: FormData) {
  const { paroquiaId, pastoralId } = await exigirPastoral();
  await garantirDaParoquia("Missa", missaId, paroquiaId);
  // Só as funções desta pastoral: as exigências das outras pastorais na
  // mesma missa ficam intocadas.
  const { data: funcoes, error: funcoesError } = await supabase
    .from("Funcao")
    .select("id")
    .eq("pastoralId", pastoralId)
    .eq("ativo", true)
    .returns<{ id: string }[]>();
  if (funcoesError) throw funcoesError;

  const { data: existentes, error: existentesError } = await supabase
    .from("MissaFuncaoRequisito")
    .select("id, funcaoId")
    .eq("missaId", missaId)
    .in("funcaoId", (funcoes ?? []).map((f) => f.id))
    .returns<{ id: string; funcaoId: string }[]>();
  if (existentesError) throw existentesError;

  const idExistentePorFuncao = new Map((existentes ?? []).map((r) => [r.funcaoId, r.id]));

  const paraSalvar: Array<{
    id: string;
    missaId: string;
    funcaoId: string;
    quantidade: number;
    ativo: boolean;
  }> = [];
  const funcaoIdsParaRemover: string[] = [];

  for (const funcao of funcoes ?? []) {
    const ativo = formData.get(`req_${funcao.id}_ativo`) === "on";
    const quantidadeRaw = Number(formData.get(`req_${funcao.id}_quantidade`) ?? 1);
    const quantidade = Number.isFinite(quantidadeRaw) && quantidadeRaw >= 1 ? Math.floor(quantidadeRaw) : 1;

    if (ativo) {
      paraSalvar.push({
        id: idExistentePorFuncao.get(funcao.id) ?? generateId(),
        missaId,
        funcaoId: funcao.id,
        quantidade,
        ativo: true,
      });
    } else if (idExistentePorFuncao.has(funcao.id)) {
      funcaoIdsParaRemover.push(funcao.id);
    }
  }

  if (paraSalvar.length > 0) {
    const { error } = await supabase
      .from("MissaFuncaoRequisito")
      .upsert(paraSalvar, { onConflict: "missaId,funcaoId" });
    if (error) throw error;
  }

  if (funcaoIdsParaRemover.length > 0) {
    const { error } = await supabase
      .from("MissaFuncaoRequisito")
      .delete()
      .eq("missaId", missaId)
      .in("funcaoId", funcaoIdsParaRemover);
    if (error) throw error;
  }

  revalidatePath(`/admin/missas/${missaId}`);
}


export async function saveMissaRequisitos(...args: Parameters<typeof saveMissaRequisitosInterno>) {
  return comAvisos(() => saveMissaRequisitosInterno(...args));
}