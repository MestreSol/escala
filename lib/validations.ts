import { z } from "zod";

export const funcaoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da função"),
  prioridade: z.enum(["ALTA", "MEDIA", "BAIXA"]),
  grauMinimo: z.enum(["COROINHA", "ACOLITO", "CERIMONIARIO"]),
  quantidadePadrao: z.coerce.number().int().min(1).max(20).default(1),
  exigeGrupoCompleto: z.coerce.boolean().default(false),
});

const missaCamposComuns = {
  horario: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido (HH:mm)"),
  comunidade: z.string().trim().min(2, "Informe a comunidade"),
};

/**
 * Quem serve numa missa (ver Missa no schema e lib/scheduleGenerator.ts):
 * NORMAL = sorteio entre quem marcou a missa como preferida (só semanais);
 * TODOS_ATIVOS = sorteio das funções entre todos os ativos (só data única);
 * COMUNIDADE = sorteio só entre a comunidade responsável (só data única);
 * LISTA_TODOS = sem funções, todo ativo numa lista de presença ("TODOS OS COROINHAS").
 */
export const modoEscalacaoSchema = z.enum(["NORMAL", "TODOS_ATIVOS", "COMUNIDADE", "LISTA_TODOS"]);
export type ModoMissa = z.infer<typeof modoEscalacaoSchema>;

const missaRecorrenteSchema = z.object({
  tipo: z.literal("RECORRENTE"),
  diaSemana: z.coerce.number().int().min(0).max(6),
  modoEscalacao: z.enum(["NORMAL", "LISTA_TODOS"]).default("NORMAL"),
  ...missaCamposComuns,
});

// "Missa grande" — evento de data única (ex: Natal), fora do ciclo semanal.
const missaDataUnicaSchema = z
  .object({
    tipo: z.literal("DATA_UNICA"),
    dataUnica: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida"),
    modoEscalacao: z.enum(["TODOS_ATIVOS", "COMUNIDADE", "LISTA_TODOS"]).default("TODOS_ATIVOS"),
    comunidadeResponsavel: z.string().trim().optional(),
    ...missaCamposComuns,
  })
  .refine((d) => d.modoEscalacao !== "COMUNIDADE" || Boolean(d.comunidadeResponsavel && d.comunidadeResponsavel.length >= 2), {
    message: "Informe a comunidade responsável",
    path: ["comunidadeResponsavel"],
  });

export const missaSchema = z.discriminatedUnion("tipo", [missaRecorrenteSchema, missaDataUnicaSchema]);

export const missaFuncaoRequisitoSchema = z.object({
  funcaoId: z.string().min(1),
  quantidade: z.coerce.number().int().min(1).max(20),
});

export const servidorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  dataNascimento: z.coerce
    .date({ message: "Informe uma data de nascimento válida" })
    .max(new Date(), { message: "Data de nascimento não pode ser no futuro" }),
  comunidade: z.string().trim().min(2, "Informe a comunidade"),
  categoria: z.enum(["COROINHA", "ACOLITO", "CERIMONIARIO"], {
    message: "Selecione a categoria do servidor",
  }),
  missaIds: z.array(z.string()).min(1, "Selecione pelo menos uma missa"),
});

export const usuarioSchema = z.object({
  username: z.string().trim().min(3, "Informe um usuário com pelo menos 3 caracteres"),
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  papel: z.enum(["ADMIN", "OPERADOR"]),
});

export type FuncaoInput = z.infer<typeof funcaoSchema>;
export type MissaInput = z.infer<typeof missaSchema>;
export type ServidorInput = z.infer<typeof servidorSchema>;
export type UsuarioInput = z.infer<typeof usuarioSchema>;
