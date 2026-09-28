import { Marca } from "@/components/ui/Marca";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const redirectTo = from ?? "/admin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <Marca className="mb-5" />
          <h1 className="text-xl font-semibold tracking-tight text-fg">Área do administrador</h1>
          <p className="mt-1 text-sm text-muted">Escala de Servidores do Altar</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <LoginForm redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  );
}
