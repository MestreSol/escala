export const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export const PRIORIDADE_LABEL: Record<string, string> = {
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

export const PRIORIDADE_ORDEM: Record<string, number> = {
  ALTA: 0,
  MEDIA: 1,
  BAIXA: 2,
};

export const GRAU_LABEL: Record<string, string> = {
  COROINHA: "Coroinha",
  ACOLITO: "Acólito",
  CERIMONIARIO: "Cerimoniário",
};

/** Ordem da hierarquia: quem tem grau maior também pode exercer funções dos graus abaixo. */
export const GRAU_ORDEM: Record<string, number> = {
  COROINHA: 0,
  ACOLITO: 1,
  CERIMONIARIO: 2,
};

export const GRAUS_EM_ORDEM = ["COROINHA", "ACOLITO", "CERIMONIARIO"] as const;
