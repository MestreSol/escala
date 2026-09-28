import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Marca } from "@/components/ui/Marca";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm animate-fade-in flex-col items-center justify-center gap-10 px-4 text-center">
      <div className="flex flex-col items-center">
        <Marca className="mb-6" />
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Escala de Servidores do Altar</h1>
        <p className="mt-3 text-sm text-muted">
          Gestão de missas, funções e escala de acólitos, coroinhas e cerimoniários.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2.5">
        <Link href="/escala" className={buttonClasses("primary", "py-2.5")}>
          Ver a escala do mês
        </Link>
        <Link href="/inscricao" className={buttonClasses("secondary", "py-2.5")}>
          Quero me inscrever para servir
        </Link>
        <Link href="/indisponibilidade" className={buttonClasses("secondary", "py-2.5")}>
          Avisar que não posso servir em um dia
        </Link>
        <Link href="/admin" className={buttonClasses("ghost", "py-2.5")}>
          Área do administrador
        </Link>
      </div>
    </div>
  );
}
