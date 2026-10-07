import { responderAgendaDoServidor } from "@/lib/calendarioIcs";

export const dynamic = "force-dynamic";

/**
 * Endereço antigo da agenda (/escala/calendario/<servidorId>.ics), de antes
 * do multi-paróquia. Responde direto em vez de redirecionar: apps de agenda
 * que já assinaram este link nem sempre seguem redirecionamento.
 */
export async function GET(request: Request, { params }: { params: Promise<{ arquivo: string }> }) {
  const { arquivo } = await params;
  return responderAgendaDoServidor(request, arquivo);
}
