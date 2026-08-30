import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ServidorForm } from "@/components/ServidorForm";
import { updateServidor } from "../actions";

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function EditarServidorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [servidor, missas] = await Promise.all([
    prisma.servidor.findUnique({ where: { id }, include: { preferenciasMissas: true } }),
    prisma.missa.findMany({ where: { ativo: true }, orderBy: [{ diaSemana: "asc" }, { horario: "asc" }] }),
  ]);

  if (!servidor) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Editar servidor</h1>
      <ServidorForm
        action={updateServidor.bind(null, servidor.id)}
        missas={missas}
        defaultValues={{
          ...servidor,
          missaIds: servidor.preferenciasMissas.map((p) => p.missaId),
        }}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
