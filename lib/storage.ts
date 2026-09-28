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

/** Envia a foto de um servidor para o Storage e devolve a URL pública. */
export async function enviarFotoServidor(servidorId: string, arquivo: File): Promise<string> {
  const extensao = EXTENSAO_POR_TIPO[arquivo.type];
  if (!extensao) {
    throw new Error("Formato de imagem não suportado. Envie um JPG, PNG ou WEBP.");
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new Error("A imagem deve ter no máximo 5MB.");
  }

  // Nome único por envio — evita servir uma versão em cache do navegador
  // depois de trocar a foto.
  const caminho = `${servidorId}/${Date.now()}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
    contentType: arquivo.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  return data.publicUrl;
}
