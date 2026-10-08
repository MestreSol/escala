import Link from "next/link";
import { periodoDaUrl } from "@/lib/periodoEscala";

export default async function ConfirmarEscalaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; semana?: string }>;
}) {
  const { mes, semana } = await searchParams;
  const periodo = periodoDaUrl({ mes, semana });
  const mesParam = periodo.chave;
  const mesLabel = periodo.titulo;
  const parametro = periodo.semanal ? `semana=${periodo.chave}` : `mes=${periodo.chave}`;
  const mesDoCalendario = periodo.semanal
    ? `${periodo.periodoFim.getUTCFullYear()}-${String(periodo.periodoFim.getUTCMonth() + 1).padStart(2, "0")}`
    : periodo.chave;

  const urlCompleta = `/admin/calendario/imagem?${parametro}&variante=completa`;
  const urlNomes = `/admin/calendario/imagem?${parametro}&variante=nomes`;

  return (
    <div>
      <Link href={`/admin/calendario?mes=${mesDoCalendario}`} className="mb-4 inline-block text-sm text-accent hover:text-accent-hover">
        ← Voltar ao calendário
      </Link>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-fg">Escala confirmada — {mesLabel}</h1>
      <p className="mb-8 text-sm text-muted">
        Duas imagens foram geradas: uma completa (com as funções) para o coordenador, e outra só
        com os nomes para compartilhar com o grupo. Para imprimir, baixe em PDF: sai com fundo
        branco, em folhas A4.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-fg">Completa (funções e nomes)</h2>
            <div className="flex gap-4">
              <a
                href={urlCompleta}
                download={`escala-completa-${mesParam}.png`}
                className="text-sm font-medium text-accent hover:text-accent-hover"
              >
                Baixar imagem
              </a>
              <a
                href={`/admin/calendario/pdf?${parametro}&variante=completa`}
                className="text-sm font-medium text-accent hover:text-accent-hover"
                title="Fundo branco, em folhas A4 — pra imprimir"
              >
                Baixar PDF
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlCompleta} alt={`Escala completa de ${mesLabel}`} className="w-full" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-fg">Somente nomes</h2>
            <div className="flex gap-4">
              <a
                href={urlNomes}
                download={`escala-nomes-${mesParam}.png`}
                className="text-sm font-medium text-accent hover:text-accent-hover"
              >
                Baixar imagem
              </a>
              <a
                href={`/admin/calendario/pdf?${parametro}&variante=nomes`}
                className="text-sm font-medium text-accent hover:text-accent-hover"
                title="Fundo branco, em folhas A4 — pra imprimir"
              >
                Baixar PDF
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlNomes} alt={`Escala (somente nomes) de ${mesLabel}`} className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
