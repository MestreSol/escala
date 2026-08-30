import { prisma } from "@/lib/prisma";

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [totalFuncoes, totalMissas, totalServidores] = await Promise.all([
    prisma.funcao.count({ where: { ativo: true } }),
    prisma.missa.count({ where: { ativo: true } }),
    prisma.servidor.count({ where: { ativo: true } }),
  ]);

  const cards = [
    { label: "Funções ativas", value: totalFuncoes, href: "/admin/funcoes" },
    { label: "Missas ativas", value: totalMissas, href: "/admin/missas" },
    { label: "Servidores cadastrados", value: totalServidores, href: "/admin/servidores" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Painel</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <a
            key={card.label}
            href={card.href}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-300"
          >
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            <p className="mt-1 text-sm text-gray-500">{card.label}</p>
          </a>
        ))}
      </div>
      <p className="mt-8 text-sm text-gray-500">
        Comece cadastrando as funções, depois as missas e seus requisitos de função. Em seguida,
        compartilhe o link de inscrição com os servidores e gere a escala pelo calendário.
      </p>
    </div>
  );
}
