import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const redirectTo = from ?? "/admin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Área do administrador</h1>
        <p className="mb-6 text-sm text-gray-500">Escala de Servidores do Altar</p>
        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
