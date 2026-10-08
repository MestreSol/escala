/**
 * Telefones são guardados só com dígitos (DDD + número, ex: "11987654321") e
 * formatados na hora de mostrar. Aceita o que a pessoa digitar: com ou sem
 * parênteses, traço, espaço ou +55.
 */

/** Só os dígitos, sem o +55 do Brasil; vazio vira null. */
export function normalizarTelefone(texto: string | null | undefined): string | null {
  let digitos = (texto ?? "").replace(/\D/g, "");
  if (digitos.length > 11 && digitos.startsWith("55")) digitos = digitos.slice(2);
  return digitos.length === 0 ? null : digitos;
}

/** DDD + 8 dígitos (fixo) ou DDD + 9 dígitos (celular). */
export function telefoneValido(digitos: string): boolean {
  return /^\d{10,11}$/.test(digitos);
}

/** "11987654321" → "(11) 98765-4321"; "1133334444" → "(11) 3333-4444". */
export function formatarTelefone(digitos: string | null | undefined): string {
  if (!digitos) return "";
  const m = digitos.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : digitos;
}

/** Link "https://wa.me/55..." pra abrir conversa no WhatsApp. */
export function linkWhatsApp(digitos: string): string {
  return `https://wa.me/55${digitos}`;
}
