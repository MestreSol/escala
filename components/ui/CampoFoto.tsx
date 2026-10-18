"use client";

import { useRef } from "react";

/** Maior lado da foto depois de reduzida — sobra pra foto de perfil e fica bem abaixo do limite de envio. */
const LADO_MAXIMO = 1024;
const QUALIDADE_JPEG = 0.85;

/**
 * Reduz a foto no próprio navegador antes do envio: foto de celular tem 3–8MB
 * e o envio de Server Action é limitado (ver serverActions.bodySizeLimit em
 * next.config.ts) — sem isso o upload dava erro 500. Se o navegador não
 * conseguir ler a imagem, devolve o arquivo original.
 */
async function reduzirFoto(arquivo: File): Promise<File> {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" }).catch(() => null);
  if (!bitmap) return arquivo;
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const contexto = canvas.getContext("2d");
  if (!contexto) return arquivo;
  // PNG com transparência viraria fundo preto no JPEG.
  contexto.fillStyle = "#fff";
  contexto.fillRect(0, 0, largura, altura);
  contexto.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALIDADE_JPEG));
  if (!blob || blob.size >= arquivo.size) return arquivo;
  return new File([blob], arquivo.name.replace(/\.[^.]*$/, "") + ".jpg", { type: "image/jpeg" });
}

/** Input de foto (name="foto") que já entrega a imagem reduzida pro form. */
export function CampoFoto({
  onEscolher,
  className,
}: {
  /** Chamado com o arquivo final (ou null), ex: pra mostrar prévia. */
  onEscolher?: (arquivo: File | null) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <input
      ref={inputRef}
      type="file"
      name="foto"
      accept="image/jpeg,image/png,image/webp"
      required
      className={className}
      onChange={async (evento) => {
        const input = evento.currentTarget;
        const original = input.files?.[0] ?? null;
        if (!original) {
          onEscolher?.(null);
          return;
        }
        // Enquanto reduz, o form não envia (validação nativa) — senão ia o arquivo grande.
        input.setCustomValidity("Aguarde, preparando a foto...");
        try {
          const reduzida = await reduzirFoto(original);
          if (reduzida !== original && inputRef.current === input) {
            const transferencia = new DataTransfer();
            transferencia.items.add(reduzida);
            input.files = transferencia.files;
          }
          onEscolher?.(input.files?.[0] ?? original);
        } catch {
          onEscolher?.(original);
        } finally {
          input.setCustomValidity("");
        }
      }}
    />
  );
}
