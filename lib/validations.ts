import { z } from "zod";
import { normalizarTelefone, telefoneValido } from "@/lib/telefone";

/** Telefone opcional: vira só dígitos; vazio vira null. */
const telefoneOpcional = (rotulo: string) =>
  z
    .string()
    .optional()
    .refine((valor) => !valor?.trim() || /\d/.test(valor), { message: `${rotulo}: use só números` })
    .transform((valor) => normalizarTelefone(valor))
    .refine((digitos) => digitos === null || telefoneValido(digitos), {
      message: `${rotulo}: informe DDD + número (ex: (11) 98765-4321)`,
    });

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
 * NORMAL = sorteio entre quem marcou a missa como preferida (semanais e mensais);
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

const missaMensalSchema = z.object({
  tipo: z.literal("MENSAL"),
  diaSemana: z.coerce.number().int().min(0).max(6),
  semanaDoMes: z.coerce.number().int().min(1).max(5),
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

export const missaSchema = z.discriminatedUnion("tipo", [missaRecorrenteSchema, missaMensalSchema, missaDataUnicaSchema]);

export const missaFuncaoRequisitoSchema = z.object({
  funcaoId: z.string().min(1),
  quantidade: z.coerce.number().int().min(1).max(20),
});

export const servidorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(100, "Nome muito longo"),
  dataNascimento: z.coerce
    .date({ message: "Informe uma data de nascimento válida" })
    .min(new Date("1900-01-01"), { message: "Informe uma data de nascimento válida" })
    // refine (e não .max(new Date())) pra "hoje" ser avaliado a cada envio,
    // não uma vez só quando o servidor sobe.
    .refine((data) => data <= new Date(), { message: "Data de nascimento não pode ser no futuro" }),
  comunidade: z.string().trim().min(2, "Informe a comunidade").max(80, "Nome de comunidade muito longo"),
  categoria: z.enum(["COROINHA", "ACOLITO", "CERIMONIARIO"], {
    message: "Selecione a categoria do servidor",
  }),
  missaIds: z.array(z.string().max(64)).min(1, "Selecione pelo menos uma missa").max(30),
  celular: telefoneOpcional("Celular"),
  celularResponsavel: telefoneOpcional("Celular do responsável"),
});

/** Só os contatos — o que o usuário PRESENCA pode editar (ver /admin/contatos). */
export const contatoSchema = z.object({
  celular: telefoneOpcional("Celular"),
  celularResponsavel: telefoneOpcional("Celular do responsável"),
});

export const usuarioSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Informe um usuário com pelo menos 3 caracteres")
    .max(64, "Usuário muito longo")
    .regex(/^[a-zA-Z0-9._-]+$/, "Use só letras, números, ponto, hífen ou _"),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres").max(128, "Senha muito longa"),
  papel: z.enum(["ADMIN", "OPERADOR", "PRESENCA"]),
});

export const paroquiaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da paróquia").max(100, "Nome muito longo"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "O endereço precisa ter pelo menos 2 caracteres")
    .max(40, "Endereço muito longo")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use só letras minúsculas, números e hífen (ex: sao-jose)"),
  ativo: z.coerce.boolean().default(true),
});

export const pastoralSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da pastoral").max(60, "Nome muito longo"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "O endereço precisa ter pelo menos 2 caracteres")
    .max(40, "Endereço muito longo")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use só letras minúsculas, números e hífen (ex: ministros)"),
  tipo: z.enum(["COROINHAS", "MINISTROS"], { message: "Selecione o tipo da pastoral" }),
  modoEscala: z.enum(["MENSAL", "SEMANAL"], { message: "Selecione o modo da escala" }).default("MENSAL"),
  ativo: z.coerce.boolean().default(true),
});

export type FuncaoInput = z.infer<typeof funcaoSchema>;
export type MissaInput = z.infer<typeof missaSchema>;
export type ServidorInput = z.infer<typeof servidorSchema>;
export type UsuarioInput = z.infer<typeof usuarioSchema>;
export type ParoquiaInput = z.infer<typeof paroquiaSchema>;
