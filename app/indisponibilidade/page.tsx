import { redirecionarRotaAntiga } from "@/lib/paroquia";

export const dynamic = "force-dynamic";

/** Rota antiga — ver redirecionarRotaAntiga. */
export default async function RotaAntiga({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return redirecionarRotaAntiga("/indisponibilidade", await searchParams);
}
