import { formatarTelefone, linkWhatsApp } from "@/lib/telefone";

/** Telefone formatado que abre conversa no WhatsApp; "—" quando não há número. */
export function TelefoneLink({ digitos }: { digitos: string | null }) {
  if (!digitos) return <span className="text-subtle">—</span>;
  return (
    <a
      href={linkWhatsApp(digitos)}
      target="_blank"
      rel="noopener noreferrer"
      className="whitespace-nowrap tabular-nums text-muted transition-colors hover:text-accent"
      title="Abrir no WhatsApp"
    >
      {formatarTelefone(digitos)}
    </a>
  );
}
