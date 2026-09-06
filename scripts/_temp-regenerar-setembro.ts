import "dotenv/config";
import { regenerarEscalaPeriodo } from "../app/admin/(dashboard)/calendario/actions";

const periodoInicio = new Date(Date.UTC(2026, 8, 1, 0, 0, 0, 0));
const periodoFim = new Date(Date.UTC(2026, 8, 30, 23, 59, 59, 999));

regenerarEscalaPeriodo(periodoInicio.toISOString(), periodoFim.toISOString())
  .then(() => console.log("Regenerado com sucesso."))
  .catch((error) => {
    const msg = String(error?.message ?? error);
    if (msg.includes("invariant") || msg.includes("static generation") || msg.includes("revalidate")) {
      console.log("Regenerado (revalidatePath ignorado fora do contexto Next).");
      return;
    }
    console.error("Erro inesperado:", error);
    process.exit(1);
  });
