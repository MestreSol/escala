/**
 * Cria (ou atualiza a senha de) um usuário direto no banco — usado pra criar
 * o primeiro ADMIN, já que só um ADMIN pode cadastrar usuários pela tela
 * /admin/usuarios (problema do ovo e da galinha no primeiro acesso).
 *
 * Uso: npm run criar-usuario -- <username> <senha> [ADMIN|OPERADOR]
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

async function main() {
  const [username, senha, papelArg] = process.argv.slice(2);
  const papel = (papelArg ?? "ADMIN").toUpperCase();

  if (!username || !senha) {
    console.error("Uso: npm run criar-usuario -- <username> <senha> [ADMIN|OPERADOR]");
    process.exit(1);
  }
  if (senha.length < 6) {
    console.error("A senha deve ter pelo menos 6 caracteres.");
    process.exit(1);
  }
  if (papel !== "ADMIN" && papel !== "OPERADOR") {
    console.error('Papel inválido — use "ADMIN" ou "OPERADOR".');
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidos (.env).");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const passwordHash = await bcrypt.hash(senha, 10);
  const agora = new Date().toISOString();

  const { data: existente, error: buscaError } = await supabase
    .from("Usuario")
    .select("id")
    .eq("username", username)
    .returns<{ id: string }[]>()
    .maybeSingle();
  if (buscaError) throw buscaError;

  if (existente) {
    const { error } = await supabase
      .from("Usuario")
      .update({ passwordHash, papel, updatedAt: agora })
      .eq("id", existente.id);
    if (error) throw error;
    console.log(`Usuário "${username}" atualizado (papel: ${papel}).`);
  } else {
    const { error } = await supabase
      .from("Usuario")
      .insert({ id: crypto.randomUUID(), username, passwordHash, papel, updatedAt: agora });
    if (error) throw error;
    console.log(`Usuário "${username}" criado (papel: ${papel}).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
