import { ServidorForm } from "@/components/ServidorForm";
import { Marca } from "@/components/ui/Marca";
import { pastoralPublica } from "@/lib/paroquia";
import { listarMissasDePreferencia } from "@/lib/missaPastoral";
import { usaGraus } from "@/lib/constants";
import { createServidor } from "./actions";

// Lista de missas vem do banco e muda com o tempo — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function InscricaoPage({ params }: { params: Promise<{ paroquia: string; pastoral: string }> }) {
  const { paroquia: slugParoquia, pastoral: slugPastoral } = await params;
  const { paroquia, pastoral } = await pastoralPublica(slugParoquia, slugPastoral);
  const missas = await listarMissasDePreferencia(paroquia.id, pastoral.id);

  return (
    <div className="min-h-screen bg-bg px-4 py-12 sm:py-20">
      <div className="mx-auto max-w-lg animate-fade-in">
        <Marca className="mb-6" />
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-fg">Inscrição · {pastoral.nome}</h1>
        <p className="mb-10 text-sm text-muted">
          Preencha seus dados para participar da escala {usaGraus(pastoral.tipo) ? "de acólitos, coroinhas e cerimoniários" : `de ${pastoral.nome.toLowerCase()}`}{" "}
          da {paroquia.nome}.
        </p>
        <ServidorForm
          action={createServidor.bind(null, paroquia.slug, pastoral.slug)}
          missas={missas}
          usaGraus={usaGraus(pastoral.tipo)}
          submitLabel="Enviar inscrição"
        />
      </div>
    </div>
  );
}
