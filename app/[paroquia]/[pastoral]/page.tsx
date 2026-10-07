import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Marca } from "@/components/ui/Marca";
import { pastoralPublica } from "@/lib/paroquia";

export const dynamic = "force-dynamic";

export default async function PastoralHomePage({ params }: { params: Promise<{ paroquia: string; pastoral: string }> }) {
  const { paroquia: slugParoquia, pastoral: slugPastoral } = await params;
  const { paroquia, pastoral } = await pastoralPublica(slugParoquia, slugPastoral);
  const base = `/${paroquia.slug}/${pastoral.slug}`;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm animate-fade-in flex-col items-center justify-center gap-10 px-4 text-center">
      <div className="flex flex-col items-center">
        <Marca className="mb-6" />
        <p className="text-[11px] font-medium uppercase tracking-wider text-subtle">{paroquia.nome}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">Escala · {pastoral.nome}</h1>
        <p className="mt-3 text-sm text-muted">
          {pastoral.tipo === "COROINHAS"
            ? "Gestão de missas, funções e escala de acólitos, coroinhas e cerimoniários."
            : "Gestão de missas, funções e escala dos ministros."}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2.5">
        <Link href={`${base}/escala`} className={buttonClasses("primary", "py-2.5")}>
          Ver a escala do mês
        </Link>
        <Link href={`${base}/inscricao`} className={buttonClasses("secondary", "py-2.5")}>
          Quero me inscrever para servir
        </Link>
        <Link href={`${base}/indisponibilidade`} className={buttonClasses("secondary", "py-2.5")}>
          Avisar que não posso servir em um dia
        </Link>
        <Link href="/admin" className={buttonClasses("ghost", "py-2.5")}>
          Área do administrador
        </Link>
      </div>
    </div>
  );
}
