export function generateId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Resposta de formulário pra erro do banco: registra o detalhe no log do
 * servidor e devolve só uma mensagem genérica — o texto cru do Postgres
 * (nomes de tabela/coluna, constraints) não deve chegar ao navegador.
 */
export function erroDoBanco(error: { message: string; code?: string }, contexto: string): { error: string } {
  console.error(`[${contexto}]`, error);
  return { error: "Não foi possível salvar agora. Tente de novo em instantes." };
}
