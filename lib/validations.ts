import { z } from "zod";

export const funcaoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da função"),
  prioridade: z.enum(["ALTA", "MEDIA", "BAIXA"]),
  grauMinimo: z.enum(["COROINHA", "ACOLITO", "CERIMONIARIO"]),
  quantidadePadrao: z.coerce.number().int().min(1).max(20).default(1),
  exigeGrupoCompleto: z.coerce.boolean().default(false),
});

export const missaSchema = z.object({
  diaSemana: z.coerce.number().int().min(0).max(6),
  horario: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido (HH:mm)"),
  comunidade: z.string().trim().min(2, "Informe a comunidade"),
});

export const missaFuncaoRequisitoSchema = z.object({
  funcaoId: z.string().min(1),
  quantidade: z.coerce.number().int().min(1).max(20),
});

export const servidorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  idade: z.coerce.number().int().min(1, "Informe uma idade válida").max(120),
  comunidade: z.string().trim().min(2, "Informe a comunidade"),
  categoria: z.enum(["COROINHA", "ACOLITO", "CERIMONIARIO"], {
    message: "Selecione a categoria do servidor",
  }),
  missaIds: z.array(z.string()).min(1, "Selecione pelo menos uma missa"),
});

export type FuncaoInput = z.infer<typeof funcaoSchema>;
export type MissaInput = z.infer<typeof missaSchema>;
export type ServidorInput = z.infer<typeof servidorSchema>;
