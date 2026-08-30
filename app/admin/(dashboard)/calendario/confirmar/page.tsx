import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { periodoDoMes, paraExibicao } from "@/lib/occurrences";

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default async function ConfirmarEscalaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const { periodoInicio } = periodoDoMes(mes);
  const mesReferencia = paraExibicao(periodoInicio);
  const mesParam = format(mesReferencia, "yyyy-MM");
  const mesLabel = capitalizar(format(mesReferencia, "MMMM 'de' yyyy", { locale: ptBR }));

  const urlCompleta = `/admin/calendario/imagem?mes=${mesParam}&variante=completa`;
  const urlNomes = `/admin/calendario/imagem?mes=${mesParam}&variante=nomes`;

  return (
    <div>
      <Link href={`/admin/calendario?mes=${mesParam}`} className="mb-4 inline-block text-sm text-blue-700 hover:text-blue-900">
        ← Voltar ao calendário
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Escala confirmada — {mesLabel}</h1>
      <p className="mb-8 text-sm text-gray-500">
        Duas imagens foram geradas: uma completa (com as funções) para o coordenador, e outra só
        com os nomes para compartilhar com o grupo.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Completa (funções e nomes)</h2>
            <a
              href={urlCompleta}
              download={`escala-completa-${mesParam}.png`}
              className="text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              Baixar
            </a>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlCompleta} alt={`Escala completa de ${mesLabel}`} className="w-full" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Somente nomes</h2>
            <a
              href={urlNomes}
              download={`escala-nomes-${mesParam}.png`}
              className="text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              Baixar
            </a>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlNomes} alt={`Escala (somente nomes) de ${mesLabel}`} className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
