import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [funcoes, missas, servidores] = await Promise.all([
    supabase.from("Funcao").select("id", { count: "exact", head: true }).eq("ativo", true),
    supabase.from("Missa").select("id", { count: "exact", head: true }).eq("ativo", true),
    supabase.from("Servidor").select("id", { count: "exact", head: true }).eq("ativo", true),
  ]);

  const totalFuncoes = funcoes.count ?? 0;
  const totalMissas = missas.count ?? 0;
  const totalServidores = servidores.count ?? 0;

  const cards = [
    { label: "Funções ativas", value: totalFuncoes, href: "/admin/funcoes" },
    { label: "Missas ativas", value: totalMissas, href: "/admin/missas" },
    { label: "Servidores cadastrados", value: totalServidores, href: "/admin/servidores" },
  ];

  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-subtle">Visão geral</p>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-fg">Painel</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card, index) => (
          <Link
            key={card.label}
            href={card.href}
            style={{ animationDelay: `${index * 60}ms` }}
            className="group animate-fade-in rounded-xl border border-line bg-surface p-6 transition-colors hover:border-accent/40"
          >
            <p className="text-4xl font-semibold tabular-nums tracking-tight text-fg">{card.value}</p>
            <p className="mt-2 flex items-center justify-between text-sm text-muted">
              {card.label}
              <span className="text-subtle transition-all group-hover:translate-x-0.5 group-hover:text-accent">→</span>
            </p>
          </Link>
        ))}
      </div>
      <p className="mt-10 max-w-xl text-sm leading-relaxed text-subtle">
        Comece cadastrando as funções, depois as missas e seus requisitos de função. Em seguida,
        compartilhe o link de inscrição com os servidores e gere a escala pelo calendário.
      </p>
    </div>
  );
}
