import Link from "next/link";
import { Marca } from "@/components/ui/Marca";

export default function InscricaoSucessoPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md animate-fade-in flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex size-14 items-center justify-center rounded-full bg-ok-soft text-2xl text-ok ring-1 ring-ok/20">
        ✓
      </div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-fg">Inscrição enviada!</h1>
      <p className="mb-8 text-sm text-muted">
        Obrigado por se inscrever para servir. Assim que a escala for gerada, você poderá conferir
        com o coordenador em quais missas foi escalado.
      </p>
      <Marca className="mb-6" />
      <Link href="/inscricao" className="text-sm text-muted transition-colors hover:text-fg">
        Enviar outra inscrição
      </Link>
    </div>
  );
}
