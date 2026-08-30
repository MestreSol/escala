import Link from "next/link";

export default function InscricaoSucessoPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Inscrição enviada!</h1>
      <p className="mb-6 text-sm text-gray-500">
        Obrigado por se inscrever para servir. Assim que a escala for gerada, você poderá conferir
        com o coordenador em quais missas foi escalado.
      </p>
      <Link href="/inscricao" className="text-sm font-medium text-blue-700 hover:text-blue-900">
        Enviar outra inscrição
      </Link>
    </div>
  );
}
