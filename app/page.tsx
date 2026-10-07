import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { Marca } from "@/components/ui/Marca";
import { listarParoquiasAtivas } from "@/lib/paroquia";

export const dynamic = "force-dynamic";

/** Escolha da paróquia. Com uma só cadastrada, vai direto pra página dela. */
export default async function HomePage() {
  const paroquias = await listarParoquiasAtivas();
  if (paroquias.length === 1) redirect(`/${paroquias[0].slug}`);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm animate-fade-in flex-col items-center justify-center gap-10 px-4 text-center">
      <div className="flex flex-col items-center">
        <Marca className="mb-6" />
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Escala de Servidores do Altar</h1>
        <p className="mt-3 text-sm text-muted">
          {paroquias.length > 0 ? "Escolha a sua paróquia." : "Nenhuma paróquia cadastrada ainda."}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2.5">
        {paroquias.map((paroquia) => (
          <Link key={paroquia.id} href={`/${paroquia.slug}`} className={buttonClasses("secondary", "py-2.5")}>
            {paroquia.nome}
          </Link>
        ))}
        <Link href="/admin" className={buttonClasses("ghost", "py-2.5")}>
          Área do administrador
        </Link>
      </div>
    </div>
  );
}
