import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase server-only (service role — ignora Row Level Security).
 * Nunca importe este módulo em um Client Component: a service_role key
 * teria acesso total ao banco se vazasse para o navegador — o import de
 * "server-only" faz o build falhar se isso acontecer. A autorização deste app
 * é feita no código (proxy.ts pras páginas, exigirUsuario nas actions), não
 * via RLS, então o service role é o nível certo de acesso aqui.
 */
// createClient valida os argumentos e lança erro se vierem vazios — isso
// quebraria o build (module evaluation roda mesmo em rotas dynamic) antes
// das env vars existirem. Usamos um placeholder não vazio nesse caso; login
// real só falha (com erro claro, em runtime) se as env vars realmente
// faltarem quando uma query for executada.
export const supabase = createClient(
  process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key",
  { auth: { persistSession: false } }
);
