/**
 * Idade em anos completos a partir da data de nascimento (âncora de dia
 * civil, meia-noite UTC — mesma convenção de MissaOcorrencia.data, ver
 * lib/occurrences.ts). Usa os getters UTC também para `referencia` por
 * consistência com essa âncora.
 */
export function calcularIdade(dataNascimento: Date, referencia: Date = new Date()): number {
  let idade = referencia.getUTCFullYear() - dataNascimento.getUTCFullYear();
  const jaFezAniversarioEsteAno =
    referencia.getUTCMonth() > dataNascimento.getUTCMonth() ||
    (referencia.getUTCMonth() === dataNascimento.getUTCMonth() &&
      referencia.getUTCDate() >= dataNascimento.getUTCDate());
  if (!jaFezAniversarioEsteAno) idade--;
  return idade;
}
