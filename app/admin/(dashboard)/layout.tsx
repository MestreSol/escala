import { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  cuidaDaParoquiaToda,
  obterParoquiaAtual,
  obterPastoralAtual,
  obterUsuarioAtual,
  podeGerenciarUsuarios,
} from "@/lib/sessao";
import { NavLink } from "@/components/admin/NavLink";
import { logout } from "../login/actions";

const NAV_ITEMS = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/funcoes", label: "Funções" },
  { href: "/admin/missas", label: "Missas" },
  { href: "/admin/servidores", label: "Servidores" },
  { href: "/admin/calendario", label: "Calendário" },
  { href: "/admin/acompanhamento", label: "Acompanhamento" },
  { href: "/admin/aniversariantes", label: "Aniversariantes" },
];
const PRESENCA_ITEM = { href: "/admin/presenca", label: "Presença do dia" };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const usuarioLogado = await obterUsuarioAtual();
  if (!usuarioLogado) redirect("/admin/login");
  const [paroquia, pastoral] = await Promise.all([obterParoquiaAtual(), obterPastoralAtual()]);
  // PRESENCA só registra a presença nas missas do dia — nada mais do painel.
  const navItems =
    usuarioLogado.papel === "PRESENCA"
      ? [PRESENCA_ITEM]
      : [
          ...NAV_ITEMS,
          PRESENCA_ITEM,
          ...(podeGerenciarUsuarios(usuarioLogado) ? [{ href: "/admin/usuarios", label: "Usuários" }] : []),
          ...(cuidaDaParoquiaToda(usuarioLogado) && paroquia ? [{ href: "/admin/pastorais", label: "Pastorais" }] : []),
          ...(usuarioLogado.papel === "SUPERADMIN" ? [{ href: "/admin/paroquias", label: "Paróquias" }] : []),
        ];

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <aside className="sticky top-0 z-30 flex shrink-0 flex-col border-b border-line bg-bg/90 backdrop-blur md:h-screen md:w-56 md:border-r md:border-b-0">
        <div className="flex items-center gap-2.5 px-5 py-4 md:py-6">
          <span aria-hidden className="text-lg leading-none text-accent">✠</span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-fg">Escala</p>
            <p className="max-w-40 truncate text-[11px] uppercase tracking-wider text-subtle">
              {paroquia?.nome ?? "Administração"}
            </p>
            {pastoral ? (
              <p className="max-w-40 truncate text-[11px] font-medium uppercase tracking-wider text-accent">
                {pastoral.nome}
              </p>
            ) : null}
          </div>
          <form action={logout} className="ml-auto md:hidden">
            <button type="submit" className="text-sm text-muted transition-colors hover:text-fg">
              Sair
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:pb-0">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
        <form action={logout} className="hidden border-t border-line p-3 md:block">
          {usuarioLogado ? <p className="truncate px-3 pb-1 text-xs text-subtle">{usuarioLogado.username}</p> : null}
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-fg"
          >
            Sair
          </button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
