import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const funcoes = await Promise.all(
    [
      { nome: "Cerimoniário", prioridade: "ALTA" as const, grauMinimo: "CERIMONIARIO" as const },
      { nome: "Turiferário", prioridade: "ALTA" as const, grauMinimo: "COROINHA" as const },
      { nome: "Naveteiro", prioridade: "MEDIA" as const, grauMinimo: "COROINHA" as const },
      { nome: "Cruciferário", prioridade: "MEDIA" as const, grauMinimo: "COROINHA" as const },
      {
        nome: "Ceroferário",
        prioridade: "BAIXA" as const,
        grauMinimo: "COROINHA" as const,
        quantidadePadrao: 2,
        exigeGrupoCompleto: true,
      },
      { nome: "Livro", prioridade: "BAIXA" as const, grauMinimo: "COROINHA" as const },
      { nome: "Sineta", prioridade: "BAIXA" as const, grauMinimo: "COROINHA" as const },
    ].map((data) => prisma.funcao.create({ data }))
  );

  // Exemplo de acúmulo de função: quem faz Naveteiro também pode assumir a
  // Sineta como último recurso, se não houver mais ninguém disponível para ela.
  const naveteiro = funcoes.find((f) => f.nome === "Naveteiro")!;
  const sineta = funcoes.find((f) => f.nome === "Sineta")!;
  await prisma.funcao.update({
    where: { id: naveteiro.id },
    data: { podeAssumir: { connect: { id: sineta.id } } },
  });

  const missaDomingo = await prisma.missa.create({
    data: { diaSemana: 0, horario: "10:00", comunidade: "Matriz" },
  });

  const missaSabado = await prisma.missa.create({
    data: { diaSemana: 6, horario: "19:00", comunidade: "Comunidade Santa Rita" },
  });

  const requisitosDomingo = [
    { nome: "Cerimoniário", quantidade: 1 },
    { nome: "Turiferário", quantidade: 1 },
    { nome: "Naveteiro", quantidade: 1 },
    { nome: "Cruciferário", quantidade: 1 },
    { nome: "Ceroferário", quantidade: 2 },
    { nome: "Sineta", quantidade: 1 },
  ];

  for (const req of requisitosDomingo) {
    const funcao = funcoes.find((f) => f.nome === req.nome)!;
    await prisma.missaFuncaoRequisito.create({
      data: { missaId: missaDomingo.id, funcaoId: funcao.id, quantidade: req.quantidade },
    });
  }

  const requisitosSabado = [
    { nome: "Cruciferário", quantidade: 1 },
    { nome: "Ceroferário", quantidade: 2 },
    { nome: "Livro", quantidade: 1 },
  ];

  for (const req of requisitosSabado) {
    const funcao = funcoes.find((f) => f.nome === req.nome)!;
    await prisma.missaFuncaoRequisito.create({
      data: { missaId: missaSabado.id, funcaoId: funcao.id, quantidade: req.quantidade },
    });
  }

  console.log("Seed concluído: funções e missas de exemplo criadas.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
