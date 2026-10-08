import { AvisoAoUsuario } from "@/lib/avisos";
import "server-only";
import { supabase } from "@/lib/supabase";

/**
 * Bucket do Supabase Storage onde ficam as fotos dos servidores. Precisa
 * existir e estar marcado como público (Storage > New bucket > Public
 * bucket) — não é criado automaticamente pela migration.
 */
const BUCKET = "fotos-servidores";

const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;
const EXTENSAO_POR_TIPO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Tipo real do arquivo pelos primeiros bytes ("assinatura") — o `type` do
 * File vem do navegador e pode ser forjado (ex: um .html renomeado pra .png).
 */
function tipoPelaAssinatura(bytes: Uint8Array): string | null {
  const comeca = (...valores: number[]) => valores.every((valor, i) => bytes[i] === valor);
  if (comeca(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (comeca(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  const texto = (inicio: number, fim: number) => String.fromCharCode(...bytes.slice(inicio, fim));
  if (texto(0, 4) === "RIFF" && texto(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Envia a foto de um servidor para o Storage e devolve a URL pública. */
export async function enviarFotoServidor(servidorId: string, arquivo: File): Promise<string> {
  if (!/^[0-9a-f-]{8,64}$/i.test(servidorId)) {
    throw new AvisoAoUsuario("Servidor inválido.");
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new AvisoAoUsuario("A imagem deve ter no máximo 5MB.");
  }
  const tipoReal = tipoPelaAssinatura(new Uint8Array(await arquivo.slice(0, 12).arrayBuffer()));
  const extensao = tipoReal ? EXTENSAO_POR_TIPO[tipoReal] : undefined;
  if (!tipoReal || !extensao) {
    throw new AvisoAoUsuario("Formato de imagem não suportado. Envie um JPG, PNG ou WEBP.");
  }

  // Nome único por envio — evita servir uma versão em cache do navegador
  // depois de trocar a foto.
  const caminho = `${servidorId}/${Date.now()}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
    contentType: tipoReal,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  return data.publicUrl;
}
