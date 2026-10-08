import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { rotuloTodos } from "@/lib/constants";
import type { LinhaEscala, OcorrenciaEscala } from "@/lib/escalaDoPeriodo";
import type { TipoPastoral } from "@/lib/types";

/**
 * Desenho da escala do mês como imagem — usado pela imagem PNG
 * (/admin/calendario/imagem, fundo escuro, pra mandar no grupo) e pelo PDF
 * (/admin/calendario/pdf, fundo branco, pra imprimir).
 */

export type VarianteEscala = "completa" | "nomes";
export type TemaEscala = "escuro" | "claro";

const TEMAS: Record<
  TemaEscala,
  { fundo: string; cartao: string; texto: string; secundario: string; borda: string; aberto: string; destaque: string }
> = {
  escuro: {
    fundo: "#0b0b0c",
    cartao: "#131316",
    texto: "#ededee",
    secundario: "#a1a1a8",
    borda: "#26262b",
    aberto: "#f87171",
    destaque: "#d4a94a",
  },
  // Pra impressão: fundo branco, texto escuro e dourado mais fechado (o claro some no papel).
  claro: {
    fundo: "#ffffff",
    cartao: "#ffffff",
    texto: "#111113",
    secundario: "#52525b",
    borda: "#d4d4d8",
    aberto: "#b91c1c",
    destaque: "#8a6420",
  },
};

/** Largura do desenho em "pixels de layout"; `fator` multiplica tudo (2 = nítido no papel). */
export const LARGURA_ESCALA = 900;
/** Topo (título do mês) + respiro de baixo, sem nenhuma missa. */
export const ALTURA_CABECALHO = 170;

export function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function linhasDaVariante(ocorrencia: OcorrenciaEscala, variante: VarianteEscala): LinhaEscala[] {
  return variante === "completa" ? ocorrencia.linhas : dedupeNomes(ocorrencia.linhas);
}

/** Altura estimada do cartão de uma missa (o desenho não mede texto, então a conta é fixa). */
export function alturaDaOcorrencia(ocorrencia: OcorrenciaEscala, variante: VarianteEscala): number {
  return 64 + Math.max(linhasDaVariante(ocorrencia, variante).length, 1) * 34 + 24;
}

let fontesCache: Promise<{ name: string; data: Buffer; weight: 400 | 700; style: "normal" }[]> | null = null;

function carregarFontes() {
  fontesCache ??= (async () => {
    const dir = path.join(process.cwd(), "assets", "fonts");
    const [regular, bold] = await Promise.all([
      readFile(path.join(dir, "Roboto-Regular.ttf")),
      readFile(path.join(dir, "Roboto-Bold.ttf")),
    ]);
    return [
      { name: "Roboto", data: regular, weight: 400 as const, style: "normal" as const },
      { name: "Roboto", data: bold, weight: 700 as const, style: "normal" as const },
    ];
  })();
  return fontesCache;
}

export async function desenharEscala(opcoes: {
  ocorrencias: OcorrenciaEscala[];
  variante: VarianteEscala;
  tema: TemaEscala;
  tituloMes: string;
  pastoral: { nome: string; tipo: TipoPastoral };
  /** Altura em pixels de layout (antes do fator). */
  altura: number;
  fator?: number;
  /** Ex: "Página 2 de 3" no PDF. */
  rodape?: string;
}): Promise<ImageResponse> {
  const { ocorrencias, variante, tituloMes, pastoral, altura, rodape } = opcoes;
  const cor = TEMAS[opcoes.tema];
  const fator = opcoes.fator ?? 1;
  const px = (valor: number) => valor * fator;
  const fonts = await carregarFontes();

  return new ImageResponse(
    (
      <div
        style={{
          width: px(LARGURA_ESCALA),
          height: px(altura),
          display: "flex",
          flexDirection: "column",
          backgroundColor: cor.fundo,
          padding: px(48),
          fontFamily: "Roboto",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", marginBottom: px(32) }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: px(10) }}>
            <div style={{ display: "flex", width: px(28), height: px(2), backgroundColor: cor.destaque, marginRight: px(12) }} />
            <div style={{ display: "flex", fontSize: px(15), fontWeight: 700, color: cor.destaque, letterSpacing: px(3) }}>
              {`ESCALA · ${pastoral.nome.toUpperCase()}`}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: px(tituloMes.length > 28 ? 26 : 34), fontWeight: 700, color: cor.texto }}>
              {tituloMes}
            </div>
            {rodape ? <div style={{ display: "flex", fontSize: px(14), color: cor.secundario }}>{rodape}</div> : null}
          </div>
          <div style={{ display: "flex", fontSize: px(16), color: cor.secundario, marginTop: px(4) }}>
            {variante === "completa" ? "Funções e servidores" : "Servidores escalados"}
          </div>
        </div>

        {ocorrencias.length === 0 ? (
          <div style={{ display: "flex", fontSize: px(18), color: cor.secundario }}>
            Nenhuma missa gerada para este período.
          </div>
        ) : (
          ocorrencias.map((ocorrencia) => {
            const cabecalho = capitalizar(format(ocorrencia.data, "EEEE, dd/MM", { locale: ptBR }));
            const horario = format(ocorrencia.data, "HH:mm");
            const linhas = linhasDaVariante(ocorrencia, variante);

            return (
              <div
                key={ocorrencia.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  border: `${px(1)}px solid ${cor.borda}`,
                  borderRadius: px(14),
                  backgroundColor: cor.cartao,
                  padding: px(20),
                  marginBottom: px(24),
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", marginBottom: px(12) }}
                >
                  <div style={{ display: "flex", fontSize: px(20), fontWeight: 700, color: cor.texto }}>
                    {cabecalho}
                    <span style={{ color: cor.destaque, marginLeft: px(10) }}>{horario}</span>
                  </div>
                  <div style={{ display: "flex", fontSize: px(16), color: cor.secundario }}>{ocorrencia.comunidade}</div>
                </div>

                {ocorrencia.todosAtivos ? (
                  <div style={{ display: "flex", fontSize: px(18), fontWeight: 700, color: cor.destaque, letterSpacing: px(1) }}>
                    {rotuloTodos(pastoral.tipo).toUpperCase()}
                  </div>
                ) : linhas.length === 0 ? (
                  <div style={{ display: "flex", fontSize: px(15), color: cor.secundario }}>Escala ainda não gerada.</div>
                ) : (
                  linhas.map((linha, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: variante === "completa" ? "space-between" : "flex-start",
                        padding: `${px(6)}px 0`,
                        borderTop: index === 0 ? "none" : `${px(1)}px solid ${cor.borda}`,
                      }}
                    >
                      {variante === "completa" ? (
                        <div style={{ display: "flex", fontSize: px(16), color: cor.secundario }}>
                          {linha.funcaoNome ?? "Presença confirmada"}
                          {linha.totalSlotsDaFuncao > 1 ? ` #${linha.slotIndex}` : ""}
                        </div>
                      ) : null}
                      <div
                        style={{
                          display: "flex",
                          fontSize: px(16),
                          fontWeight: 600,
                          color: linha.servidorNome ? cor.texto : cor.aberto,
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
    { width: px(LARGURA_ESCALA), height: px(altura), fonts }
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
