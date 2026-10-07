import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { Marca } from "@/components/ui/Marca";
import { listarPastoraisAtivas, paroquiaPublica } from "@/lib/paroquia";

export const dynamic = "force-dynamic";

/** Escolha da pastoral. Com uma só, vai direto pra página dela. */
export default async function ParoquiaHomePage({ params }: { params: Promise<{ paroquia: string }> }) {
  const paroquia = await paroquiaPublica((await params).paroquia);
  const pastorais = await listarPastoraisAtivas(paroquia.id);
  if (pastorais.length === 1) redirect(`/${paroquia.slug}/${pastorais[0].slug}`);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm animate-fade-in flex-col items-center justify-center gap-10 px-4 text-center">
      <div className="flex flex-col items-center">
        <Marca className="mb-6" />
        <p className="text-[11px] font-medium uppercase tracking-wider text-subtle">{paroquia.nome}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">Escala das pastorais</h1>
        <p className="mt-3 text-sm text-muted">
          {pastorais.length > 0 ? "Escolha a sua pastoral." : "Nenhuma pastoral cadastrada ainda."}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2.5">
        {pastorais.map((pastoral) => (
          <Link
            key={pastoral.id}
            href={`/${paroquia.slug}/${pastoral.slug}`}
            className={buttonClasses("secondary", "py-2.5")}
          >
            {pastoral.nome}
          </Link>
        ))}
        <Link href="/admin" className={buttonClasses("ghost", "py-2.5")}>
          Área do administrador
        </Link>
      </div>
    </div>
  );
}
