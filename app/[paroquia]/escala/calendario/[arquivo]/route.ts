import { responderAgendaDoServidor } from "@/lib/calendarioIcs";

export const dynamic = "force-dynamic";

/**
 * Endereço da agenda de antes das pastorais (/<paroquia>/escala/calendario/<id>.ics).
 * Responde direto em vez de redirecionar: apps de agenda que já assinaram este
 * link nem sempre seguem redirecionamento.
 */
export async function GET(request: Request, { params }: { params: Promise<{ paroquia: string; arquivo: string }> }) {
  const { paroquia, arquivo } = await params;
  return responderAgendaDoServidor(request, arquivo, { paroquia });
}
