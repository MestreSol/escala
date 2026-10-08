/**
 * Erro com mensagem feita pra pessoa ler (ex: "Fulano já está escalado
 * neste dia"). Em produção o Next esconde o texto de QUALQUER erro lançado
 * por uma Server Action (vira o "Minified React error #441"), então as
 * actions não deixam este erro escapar: `comAvisos` o transforma em valor
 * de retorno, que chega inteiro no navegador e vira toast.
 */
export class AvisoAoUsuario extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "AvisoAoUsuario";
  }
}

/** O que uma action sem estado devolve: nada (deu certo) ou um aviso pra mostrar. */
export type ResultadoAcao = void | { aviso: string };

/** Pra actions sem estado (ActionForm, DeleteButton, AcaoEscalaForm...). */
export async function comAvisos(executar: () => Promise<unknown>): Promise<ResultadoAcao> {
  try {
    await executar();
  } catch (error) {
    if (error instanceof AvisoAoUsuario) return { aviso: error.message };
    throw error;
  }
}

/** Pra actions de formulário (useActionState), que já devolvem `{ error }`. */
export async function comAvisosNoFormulario<T extends { error?: string }>(
  executar: () => Promise<T>
): Promise<T | { error: string }> {
  try {
    return await executar();
  } catch (error) {
    if (error instanceof AvisoAoUsuario) return { error: error.message };
    throw error;
  }
}
