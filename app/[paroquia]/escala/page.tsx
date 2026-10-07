import { redirecionarParaPastoral } from "@/lib/paroquia";

export const dynamic = "force-dynamic";

/** Endereço de antes das pastorais — ver redirecionarParaPastoral. */
export default async function RotaAntiga({
  params,
  searchParams,
}: {
  params: Promise<{ paroquia: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return redirecionarParaPastoral((await params).paroquia, "/escala", await searchParams);
}
