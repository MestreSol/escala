import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { pastoralDoPainel } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { paroquia, pastoral } = await pastoralDoPainel();
  // Funções e servidores são da pastoral; missas, da paróquia toda.
  const contarDaPastoral = (tabela: "Funcao" | "Servidor") =>
    supabase.from(tabela).select("id", { count: "exact", head: true }).eq("pastoralId", pastoral.id).eq("ativo", true);
  const [funcoes, missas, servidores] = await Promise.all([
    contarDaPastoral("Funcao"),
    supabase.from("Missa").select("id", { count: "exact", head: true }).eq("paroquiaId", paroquia.id).eq("ativo", true),
    contarDaPastoral("Servidor"),
  ]);

  const totalFuncoes = funcoes.count ?? 0;
  const totalMissas = missas.count ?? 0;
  const totalServidores = servidores.count ?? 0;

  const cards = [
    { label: "Funções ativas", value: totalFuncoes, href: "/admin/funcoes" },
    { label: "Missas ativas (paróquia)", value: totalMissas, href: "/admin/missas" },
    { label: "Servidores cadastrados", value: totalServidores, href: "/admin/servidores" },
  ];
  const linkPublico = `/${paroquia.slug}/${pastoral.slug}`;

  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-subtle">
        {paroquia.nome} · {pastoral.nome}
      </p>
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
        compartilhe o link de inscrição (<span className="text-muted">{linkPublico}/inscricao</span>) com os
        servidores e gere a escala pelo calendário.
      </p>
    </div>
  );
}
