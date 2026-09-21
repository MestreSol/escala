"use server";

import { revalidatePath } from "next/cache";
import { setIndisponibilidadesDoServidor } from "@/lib/indisponibilidade";

export async function salvarIndisponibilidades(
  servidorId: string,
  periodoInicioISO: string,
  periodoFimISO: string,
  formData: FormData
) {
  const dias = formData.getAll("dias").map(String);

  // Cada valor é "yyyy-MM-dd" (ver checkbox em page.tsx); vira âncora de dia
  // civil (meia-noite UTC), mesma convenção de MissaOcorrencia.data.
  const datas = dias.map((valor) => {
    const [ano, mes, dia] = valor.split("-").map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia));
  });

  await setIndisponibilidadesDoServidor(servidorId, new Date(periodoInicioISO), new Date(periodoFimISO), datas);

  revalidatePath("/indisponibilidade");
}
