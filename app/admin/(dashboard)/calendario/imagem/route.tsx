import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { periodoDoMes } from "@/lib/occurrences";
import { buscarEscalaDoPeriodo, type LinhaEscala } from "./data";

export const runtime = "nodejs";
// Lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

const LARGURA = 900;
const COR_TEXTO = "#111827";
const COR_TEXTO_SECUNDARIO = "#6b7280";
const COR_BORDA = "#e5e7eb";
const COR_ABERTO = "#dc2626";

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

  const tituloMes = capitalizar(format(periodoInicio, "MMMM 'de' yyyy", { locale: ptBR }));

  let altura = 140;
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

  return new ImageResponse(
    (
      <div
        style={{
          width: LARGURA,
          minHeight: altura,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          padding: 48,
          fontFamily: "Roboto",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 32 }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: COR_TEXTO }}>
            Escala — {tituloMes}
          </div>
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
                  borderRadius: 10,
                  padding: 20,
                  marginBottom: 24,
                }}
              >
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: COR_TEXTO }}>
                    {cabecalho} — {horario}
                  </div>
                  <div style={{ fontSize: 16, color: COR_TEXTO_SECUNDARIO }}>{ocorrencia.comunidade}</div>
                </div>

                {linhas.length === 0 ? (
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
                          {linha.funcaoNome}
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
