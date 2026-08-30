export type ServidorFormState = { error?: string };

export type MissaOption = {
  id: string;
  diaSemana: number;
  horario: string;
  comunidade: string;
};

export type Grau = "COROINHA" | "ACOLITO" | "CERIMONIARIO";
export type Prioridade = "ALTA" | "MEDIA" | "BAIXA";

export type FuncaoRow = {
  id: string;
  nome: string;
  prioridade: Prioridade;
  grauMinimo: Grau;
  quantidadePadrao: number;
  exigeGrupoCompleto: boolean;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MissaRow = {
  id: string;
  diaSemana: number;
  horario: string;
  comunidade: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MissaFuncaoRequisitoRow = {
  id: string;
  missaId: string;
  funcaoId: string;
  quantidade: number;
  ativo: boolean;
};

export type ServidorRow = {
  id: string;
  nome: string;
  idade: number;
  comunidade: string;
  categoria: Grau;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServidorMissaPreferenciaRow = {
  id: string;
  servidorId: string;
  missaId: string;
};

export type MissaOcorrenciaRow = {
  id: string;
  missaId: string;
  data: string;
  createdAt: string;
};

export type EscalaAtribuicaoRow = {
  id: string;
  escalaId: string | null;
  ocorrenciaId: string;
  funcaoId: string;
  slotIndex: number;
  servidorId: string | null;
  servidorNomeSnapshot: string | null;
  geradoAutomaticamente: boolean;
  createdAt: string;
  updatedAt: string;
};
