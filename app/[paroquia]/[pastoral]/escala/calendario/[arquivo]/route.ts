import { responderAgendaDoServidor } from "@/lib/calendarioIcs";

// Sempre a escala atual do banco — quem assina a agenda recebe as mudanças.
export const dynamic = "force-dynamic";

/**
 * Agenda .ics de um servidor: /<paroquia>/<pastoral>/escala/calendario/<servidorId>.ics
 * Pública (como a própria página da escala), mas só com as missas daquela
 * pessoa e só de meses publicados. `?download=1` baixa como arquivo.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ paroquia: string; pastoral: string; arquivo: string }> }
) {
  const { paroquia, pastoral, arquivo } = await params;
  return responderAgendaDoServidor(request, arquivo, { paroquia, pastoral });
}
