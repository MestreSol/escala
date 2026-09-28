import { supabase } from "@/lib/supabase";
import { buscarMissasDoServidor, gerarIcs } from "@/lib/calendarioIcs";

// Sempre a escala atual do banco — quem assina a agenda recebe as mudanças.
export const dynamic = "force-dynamic";

/**
 * Agenda .ics de um servidor: /escala/calendario/<servidorId>.ics
 * Pública (como a própria página /escala), mas só com as missas daquela
 * pessoa e só de meses publicados. `?download=1` baixa como arquivo.
 */
export async function GET(request: Request, { params }: { params: Promise<{ arquivo: string }> }) {
  const { arquivo } = await params;
  const servidorId = arquivo.replace(/\.ics$/i, "");
  if (!/^[0-9a-z-]{8,64}$/i.test(servidorId)) {
    return new Response("Agenda não encontrada.", { status: 404 });
  }

  const { data: servidor, error } = await supabase
    .from("Servidor")
    .select("id, nome")
    .eq("id", servidorId)
    .eq("ativo", true)
    .maybeSingle<{ id: string; nome: string }>();
  if (error) throw error;
  if (!servidor) return new Response("Agenda não encontrada.", { status: 404 });

  const missas = await buscarMissasDoServidor(servidor.id);
  const origem = new URL(request.url).origin;
  const ics = gerarIcs(missas, {
    nomeCalendario: `Escala do altar — ${servidor.nome.split(" ")[0]}`,
    servidorId: servidor.id,
    urlEscala: `${origem}/escala`,
  });

  const baixar = new URL(request.url).searchParams.has("download");
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="minhas-missas.ics"`,
      // Apps de agenda buscam de tempos em tempos; 5 min de cache já basta.
      "Cache-Control": "public, max-age=300",
    },
  });
}
