import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { periodoDoMes, paraExibicao } from "@/lib/occurrences";
import { buscarEscalaDoPeriodo } from "@/lib/escalaDoPeriodo";
import { obterParoquiaAtual, obterPastoralAtual } from "@/lib/sessao";
import { ALTURA_CABECALHO, alturaDaOcorrencia, capitalizar, desenharEscala } from "@/lib/imagemEscala";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // O proxy só confere que há sessão; paróquia e pastoral vêm do usuário logado.
  const [paroquia, pastoral] = await Promise.all([obterParoquiaAtual(), obterPastoralAtual()]);
  if (!paroquia || !pastoral) return new Response("Não autorizado.", { status: 401 });

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes") ?? undefined;
  const variante = searchParams.get("variante") === "nomes" ? "nomes" : "completa";

  const { periodoInicio, periodoFim } = periodoDoMes(mes);
  const ocorrencias = await buscarEscalaDoPeriodo(paroquia.id, pastoral.id, periodoInicio, periodoFim);
  const tituloMes = capitalizar(format(paraExibicao(periodoInicio), "MMMM 'de' yyyy", { locale: ptBR }));

  const altura = Math.max(
    ocorrencias.reduce((total, ocorrencia) => total + alturaDaOcorrencia(ocorrencia, variante), ALTURA_CABECALHO),
    400
  );

  const response = await desenharEscala({ ocorrencias, variante, tema: "escuro", tituloMes, pastoral, altura });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
