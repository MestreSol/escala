import { periodoDaUrl } from "@/lib/periodoEscala";
import { buscarEscalaDoPeriodo } from "@/lib/escalaDoPeriodo";
import { obterParoquiaAtual, obterPastoralAtual } from "@/lib/sessao";
import { ALTURA_CABECALHO, alturaDaOcorrencia, desenharEscala } from "@/lib/imagemEscala";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // O proxy só confere que há sessão; paróquia e pastoral vêm do usuário logado.
  const [paroquia, pastoral] = await Promise.all([obterParoquiaAtual(), obterPastoralAtual()]);
  if (!paroquia || !pastoral) return new Response("Não autorizado.", { status: 401 });

  const { searchParams } = new URL(request.url);
  const variante = searchParams.get("variante") === "nomes" ? "nomes" : "completa";

  const { periodoInicio, periodoFim, titulo: tituloMes } = periodoDaUrl({
    mes: searchParams.get("mes"),
    semana: searchParams.get("semana"),
  });
  const ocorrencias = await buscarEscalaDoPeriodo(paroquia.id, pastoral.id, periodoInicio, periodoFim);

  const altura = Math.max(
    ocorrencias.reduce((total, ocorrencia) => total + alturaDaOcorrencia(ocorrencia, variante), ALTURA_CABECALHO),
    400
  );

  const response = await desenharEscala({ ocorrencias, variante, tema: "escuro", tituloMes, pastoral, altura });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
