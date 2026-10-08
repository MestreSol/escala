import { PDFDocument } from "pdf-lib";
import { periodoDaUrl } from "@/lib/periodoEscala";
import { buscarEscalaDoPeriodo, type OcorrenciaEscala } from "@/lib/escalaDoPeriodo";
import { obterParoquiaAtual, obterPastoralAtual } from "@/lib/sessao";
import {
  ALTURA_CABECALHO,
  LARGURA_ESCALA,
  alturaDaOcorrencia,
  desenharEscala,
  type VarianteEscala,
} from "@/lib/imagemEscala";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A4 em pontos (1/72"). */
const A4 = { largura: 595.28, altura: 841.89 };
/** Altura da página A4 nos mesmos "pixels de layout" do desenho (largura 900). */
const ALTURA_PAGINA = Math.round((LARGURA_ESCALA * A4.altura) / A4.largura);
/** O desenho não mede texto: folga por cartão pra estimativa nunca cortar o fim da página. */
const FOLGA_POR_CARTAO = 6;
/** O último cartão já tem a própria margem de baixo; no papel basta isso. */
const MARGEM_INFERIOR_PDF = 24;
/** 2x = ~220 dpi no A4, nítido na impressão. */
const FATOR = 2;

/**
 * Escala do mês em PDF, fundo branco, pra imprimir: uma página A4 por bloco
 * de missas, sem partir o cartão de uma missa entre duas páginas.
 */
export async function GET(request: Request) {
  // O proxy só confere que há sessão; paróquia e pastoral vêm do usuário logado.
  const [paroquia, pastoral] = await Promise.all([obterParoquiaAtual(), obterPastoralAtual()]);
  if (!paroquia || !pastoral) return new Response("Não autorizado.", { status: 401 });

  const { searchParams } = new URL(request.url);
  const variante: VarianteEscala = searchParams.get("variante") === "nomes" ? "nomes" : "completa";

  const {
    chave,
    periodoInicio,
    periodoFim,
    titulo: tituloMes,
  } = periodoDaUrl({ mes: searchParams.get("mes"), semana: searchParams.get("semana") });
  const ocorrencias = await buscarEscalaDoPeriodo(paroquia.id, pastoral.id, periodoInicio, periodoFim);

  const paginas = paginar(ocorrencias, variante);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Escala ${pastoral.nome} — ${tituloMes}`);

  for (const [indice, pagina] of paginas.entries()) {
    const ocupado = pagina.reduce(
      (total, ocorrencia) => total + alturaDaOcorrencia(ocorrencia, variante) + FOLGA_POR_CARTAO,
      ALTURA_CABECALHO + MARGEM_INFERIOR_PDF
    );
    // Uma missa sozinha maior que a folha: desenha mais alto e encolhe pra caber.
    const altura = Math.max(ALTURA_PAGINA, ocupado);
    const imagem = await desenharEscala({
      ocorrencias: pagina,
      variante,
      tema: "claro",
      tituloMes,
      pastoral,
      altura,
      fator: FATOR,
      rodape: paginas.length > 1 ? `Página ${indice + 1} de ${paginas.length}` : undefined,
    });
    const png = await pdf.embedPng(await imagem.arrayBuffer());

    const escala = Math.min(A4.largura / png.width, A4.altura / png.height);
    const largura = png.width * escala;
    const alturaDesenho = png.height * escala;
    const folha = pdf.addPage([A4.largura, A4.altura]);
    folha.drawImage(png, {
      x: (A4.largura - largura) / 2,
      y: A4.altura - alturaDesenho,
      width: largura,
      height: alturaDesenho,
    });
  }

  const bytes = await pdf.save();
  const mesArquivo = chave;
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="escala-${pastoral.slug}-${variante}-${mesArquivo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Distribui as missas em páginas A4 sem partir nenhum cartão; sempre pelo menos uma página. */
function paginar(ocorrencias: OcorrenciaEscala[], variante: VarianteEscala): OcorrenciaEscala[][] {
  const espaco = ALTURA_PAGINA - ALTURA_CABECALHO - MARGEM_INFERIOR_PDF;
  const paginas: OcorrenciaEscala[][] = [[]];
  let usado = 0;
  for (const ocorrencia of ocorrencias) {
    const altura = alturaDaOcorrencia(ocorrencia, variante) + FOLGA_POR_CARTAO;
    const atual = paginas[paginas.length - 1];
    if (atual.length > 0 && usado + altura > espaco) {
      paginas.push([ocorrencia]);
      usado = altura;
    } else {
      atual.push(ocorrencia);
      usado += altura;
    }
  }
  return paginas;
}
