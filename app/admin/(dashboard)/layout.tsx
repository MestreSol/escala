import Link from "next/link";
import { ReactNode } from "react";
import { logout } from "../login/actions";

const NAV_ITEMS = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/funcoes", label: "Funções" },
  { href: "/admin/missas", label: "Missas" },
  { href: "/admin/servidores", label: "Servidores" },
  { href: "/admin/calendario", label: "Calendário" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-4">
          <p className="text-sm font-semibold text-gray-900">Escala</p>
          <p className="text-xs text-gray-500">Administração</p>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="border-t border-gray-200 p-2">
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-500 hover:bg-gray-100 cursor-pointer"
          >
            Sair
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
