import { prisma } from "@/lib/prisma";
import { ServidorForm } from "@/components/ServidorForm";
import { createServidor } from "./actions";

export default async function InscricaoPage() {
  const missas = await prisma.missa.findMany({
    where: { ativo: true },
    orderBy: [{ diaSemana: "asc" }, { horario: "asc" }],
  });

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-2xl font-semibold text-gray-900">Inscrição de servidor do altar</h1>
        <p className="mb-8 text-sm text-gray-500">
          Preencha seus dados para participar da escala de acólitos, coroinhas e cerimoniários.
        </p>
        <ServidorForm action={createServidor} missas={missas} submitLabel="Enviar inscrição" />
      </div>
    </div>
  );
}
