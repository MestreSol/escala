import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Escala de Servidores do Altar</h1>
        <p className="mt-2 text-sm text-gray-500">
          Gestão de missas, funções e escala de acólitos, coroinhas e cerimoniários.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <Link
          href="/inscricao"
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Quero me inscrever para servir
        </Link>
        <Link
          href="/admin"
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
        >
          Área do administrador
        </Link>
      </div>
    </div>
  );
}
