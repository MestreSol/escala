export type ServidorFormState = { error?: string };
export type UsuarioFormState = { error?: string };

export type PapelUsuario = "ADMIN" | "OPERADOR" | "SUPERADMIN" | "PRESENCA";

export type ParoquiaRow = {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TipoPastoral = "COROINHAS" | "MINISTROS";
export type ModoEscala = "MENSAL" | "SEMANAL";

export type PastoralRow = {
  id: string;
  paroquiaId: string;
  nome: string;
  slug: string;
  tipo: TipoPastoral;
  modoEscala: ModoEscala;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UsuarioRow = {
  id: string;
  /** Nulo só para SUPERADMIN. */
  paroquiaId: string | null;
  /** Nulo = paróquia toda (escolhe a pastoral no painel). */
  pastoralId: string | null;
  username: string;
  passwordHash: string;
  papel: PapelUsuario;
  createdAt: string;
  updatedAt: string;
};

export type MissaOption = {
  id: string;
  diaSemana: number | null;
  semanaDoMes: number | null;
  dataUnica: string | null;
  horario: string;
  comunidade: string;
};

export type Grau = "COROINHA" | "ACOLITO" | "CERIMONIARIO";
export type Prioridade = "ALTA" | "MEDIA" | "BAIXA";

export type FuncaoRow = {
  id: string;
  paroquiaId: string;
  pastoralId: string;
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
  paroquiaId: string;
  diaSemana: number | null;
  semanaDoMes: number | null;
  dataUnica: string | null;
  horario: string;
  comunidade: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Como uma pastoral serve numa missa; sem linha = padrão (ver lib/missaPastoral.ts). */
export type MissaPastoralRow = {
  id: string;
  missaId: string;
  pastoralId: string;
  escalarTodosAtivos: boolean;
  comunidadeResponsavel: string | null;
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
  paroquiaId: string;
  pastoralId: string;
  nome: string;
  /** Âncora de dia civil (ver lib/occurrences.ts); null = ainda não preenchida. */
  dataNascimento: string | null;
  fotoUrl: string | null;
  /** Só dígitos (DDD + número) — ver lib/telefone.ts. */
  celular: string | null;
  celularResponsavel: string | null;
  comunidade: string;
  categoria: Grau;
  experiente: boolean;
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
  paroquiaId: string;
  missaId: string;
  data: string;
  createdAt: string;
};

export type ServidorVinculoRow = {
  id: string;
  servidorAId: string;
  servidorBId: string;
};

export type ServidorIndisponibilidadeRow = {
  id: string;
  servidorId: string;
  data: string;
  createdAt: string;
};

export type EscalaAtribuicaoRow = {
  id: string;
  pastoralId: string;
  escalaId: string | null;
  ocorrenciaId: string;
  /** Nulo na lista de presença simples de missas `escalarTodosAtivos` (sem função individual). */
  funcaoId: string | null;
  slotIndex: number;
  servidorId: string | null;
  servidorNomeSnapshot: string | null;
  geradoAutomaticamente: boolean;
  /** null = presença ainda não registrada; true = compareceu; false = faltou. */
  presente: boolean | null;
  createdAt: string;
  updatedAt: string;
};
