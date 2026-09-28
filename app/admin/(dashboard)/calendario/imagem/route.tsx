import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { periodoDoMes, paraExibicao } from "@/lib/occurrences";
import { buscarEscalaDoPeriodo, type LinhaEscala } from "@/lib/escalaDoPeriodo";

export const runtime = "nodejs";
// Lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

const LARGURA = 900;
// Mesmas cores do tema escuro do site (ver app/globals.css).
const COR_FUNDO = "#0b0b0c";
const COR_CARTAO = "#131316";
const COR_TEXTO = "#ededee";
const COR_TEXTO_SECUNDARIO = "#a1a1a8";
const COR_BORDA = "#26262b";
const COR_ABERTO = "#f87171";
const COR_DESTAQUE = "#d4a94a";

async function carregarFontes() {
  const dir = path.join(process.cwd(), "assets", "fonts");
  const [regular, bold] = await Promise.all([
    readFile(path.join(dir, "Roboto-Regular.ttf")),
    readFile(path.join(dir, "Roboto-Bold.ttf")),
  ]);
  return [
    { name: "Roboto", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Roboto", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes") ?? undefined;
  const variante = searchParams.get("variante") === "nomes" ? "nomes" : "completa";

  const { periodoInicio, periodoFim } = periodoDoMes(mes);
  const ocorrencias = await buscarEscalaDoPeriodo(periodoInicio, periodoFim);
  const fonts = await carregarFontes();

  const tituloMes = capitalizar(format(paraExibicao(periodoInicio), "MMMM 'de' yyyy", { locale: ptBR }));

  let altura = 170;
  for (const ocorrencia of ocorrencias) {
    altura += 64;
    const linhas =
      variante === "completa"
        ? ocorrencia.linhas
        : dedupeNomes(ocorrencia.linhas);
    altura += Math.max(linhas.length, 1) * 34;
    altura += 24;
  }
  altura = Math.max(altura, 400);

  const response = new ImageResponse(
    (
      <div
        style={{
          width: LARGURA,
          minHeight: altura,
          display: "flex",
          flexDirection: "column",
          backgroundColor: COR_FUNDO,
          padding: 48,
          fontFamily: "Roboto",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", width: 28, height: 2, backgroundColor: COR_DESTAQUE, marginRight: 12 }} />
            <div style={{ display: "flex", fontSize: 15, fontWeight: 700, color: COR_DESTAQUE, letterSpacing: 3 }}>
              ESCALA
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: COR_TEXTO }}>{tituloMes}</div>
          <div style={{ fontSize: 16, color: COR_TEXTO_SECUNDARIO, marginTop: 4 }}>
            {variante === "completa" ? "Funções e servidores" : "Servidores escalados"}
          </div>
        </div>

        {ocorrencias.length === 0 ? (
          <div style={{ display: "flex", fontSize: 18, color: COR_TEXTO_SECUNDARIO }}>
            Nenhuma missa gerada para este período.
          </div>
        ) : (
          ocorrencias.map((ocorrencia) => {
            const cabecalho = capitalizar(format(ocorrencia.data, "EEEE, dd/MM", { locale: ptBR }));
            const horario = format(ocorrencia.data, "HH:mm");
            const linhas = variante === "completa" ? ocorrencia.linhas : dedupeNomes(ocorrencia.linhas);

            return (
              <div
                key={ocorrencia.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  border: `1px solid ${COR_BORDA}`,
                  borderRadius: 14,
                  backgroundColor: COR_CARTAO,
                  padding: 20,
                  marginBottom: 24,
                }}
              >
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: COR_TEXTO }}>
                    {cabecalho}
                    <span style={{ color: COR_DESTAQUE, marginLeft: 10 }}>{horario}</span>
                  </div>
                  <div style={{ fontSize: 16, color: COR_TEXTO_SECUNDARIO }}>{ocorrencia.comunidade}</div>
                </div>

                {ocorrencia.todosAtivos ? (
                  <div style={{ display: "flex", fontSize: 18, fontWeight: 700, color: COR_DESTAQUE, letterSpacing: 1 }}>
                    TODOS OS COROINHAS
                  </div>
                ) : linhas.length === 0 ? (
                  <div style={{ display: "flex", fontSize: 15, color: COR_TEXTO_SECUNDARIO }}>
                    Nenhuma função configurada.
                  </div>
                ) : (
                  linhas.map((linha, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: variante === "completa" ? "space-between" : "flex-start",
                        padding: "6px 0",
                        borderTop: index === 0 ? "none" : `1px solid ${COR_BORDA}`,
                      }}
                    >
                      {variante === "completa" ? (
                        <div style={{ display: "flex", fontSize: 16, color: COR_TEXTO_SECUNDARIO }}>
                          {linha.funcaoNome ?? "Presença confirmada"}
                          {linha.totalSlotsDaFuncao > 1 ? ` #${linha.slotIndex}` : ""}
                        </div>
                      ) : null}
                      <div
                        style={{
                          display: "flex",
                          fontSize: 16,
                          fontWeight: 600,
                          color: linha.servidorNome ? COR_TEXTO : COR_ABERTO,
                        }}
                      >
                        {linha.servidorNome ?? "Vaga em aberto"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })
        )}
      </div>
    ),
    {
      width: LARGURA,
      height: altura,
      fonts,
    }
  );

  // O Next define "public, max-age=0, must-revalidate" por padrão em
  // produção — sem um validador (ETag/Last-Modified), isso deixa margem pra
  // caches intermediários (CDN, proxy) servirem uma imagem antiga em vez de
  // revalidar. Como esta rota sempre reflete o estado atual do banco (missas
  // e atribuições podem ser apagadas a qualquer momento), forçamos no-store
  // pra garantir que a imagem de confirmação nunca fique desatualizada.
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function dedupeNomes(linhas: LinhaEscala[]): LinhaEscala[] {
  const vistos = new Set<string>();
  const resultado: LinhaEscala[] = [];
  for (const linha of linhas) {
    if (linha.servidorNome === null) {
      resultado.push(linha);
      continue;
    }
    if (vistos.has(linha.servidorNome)) continue;
    vistos.add(linha.servidorNome);
    resultado.push(linha);
  }
  return resultado;
}
