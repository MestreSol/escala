/**
 * Cria (ou atualiza a senha de) um usuário direto no banco — usado pra criar
 * o primeiro SUPERADMIN (ou ADMIN), já que só eles podem cadastrar usuários
 * pelo painel (problema do ovo e da galinha no primeiro acesso).
 *
 * Uso: npm run criar-usuario -- <username> <senha> [ADMIN|OPERADOR|PRESENCA|SUPERADMIN] [endereco-da-paroquia] [endereco-da-pastoral]
 *
 * ADMIN/OPERADOR/PRESENCA precisam da paróquia (o endereço, ex: "sao-jose"); pode
 * omitir se só existir uma. SUPERADMIN não pertence a nenhuma paróquia.
 * A pastoral (ex: "ministros") prende o usuário a ela; ADMIN sem pastoral
 * cuida da paróquia toda. OPERADOR e PRESENCA sempre têm pastoral (pode omitir se a
 * paróquia só tiver uma).
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const USO =
  "Uso: npm run criar-usuario -- <username> <senha> [ADMIN|OPERADOR|PRESENCA|SUPERADMIN] [endereco-da-paroquia] [endereco-da-pastoral]";

async function main() {
  const [username, senha, papelArg, slug, slugPastoral] = process.argv.slice(2);
  const papel = (papelArg ?? "ADMIN").toUpperCase();

  if (!username || !senha) {
    console.error(USO);
    process.exit(1);
  }
  if (senha.length < 8) {
    console.error("A senha deve ter pelo menos 8 caracteres.");
    process.exit(1);
  }
  if (papel !== "ADMIN" && papel !== "OPERADOR" && papel !== "PRESENCA" && papel !== "SUPERADMIN") {
    console.error('Papel inválido — use "ADMIN", "OPERADOR", "PRESENCA" ou "SUPERADMIN".');
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidos (.env).");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  let paroquiaId: string | null = null;
  if (papel !== "SUPERADMIN") {
    let consulta = supabase.from("Paroquia").select("id, slug");
    if (slug) consulta = consulta.eq("slug", slug);
    const { data: paroquias, error: paroquiaError } = await consulta.returns<{ id: string; slug: string }[]>();
    if (paroquiaError) throw paroquiaError;
    if (!paroquias || paroquias.length === 0) {
      console.error(slug ? `Nenhuma paróquia com o endereço "${slug}".` : "Nenhuma paróquia cadastrada.");
      process.exit(1);
    }
    if (paroquias.length > 1) {
      console.error(`Informe a paróquia: ${paroquias.map((p) => p.slug).join(", ")}`);
      process.exit(1);
    }
    paroquiaId = paroquias[0].id;
  }

  let pastoralId: string | null = null;
  if (paroquiaId && (slugPastoral || papel === "OPERADOR" || papel === "PRESENCA")) {
    let consulta = supabase.from("Pastoral").select("id, slug").eq("paroquiaId", paroquiaId);
    if (slugPastoral) consulta = consulta.eq("slug", slugPastoral);
    const { data: pastorais, error: pastoralError } = await consulta.returns<{ id: string; slug: string }[]>();
    if (pastoralError) throw pastoralError;
    if (!pastorais || pastorais.length === 0) {
      console.error(slugPastoral ? `Nenhuma pastoral com o endereço "${slugPastoral}".` : "Nenhuma pastoral cadastrada.");
      process.exit(1);
    }
    if (pastorais.length > 1) {
      console.error(`Informe a pastoral: ${pastorais.map((p) => p.slug).join(", ")}`);
      process.exit(1);
    }
    pastoralId = pastorais[0].id;
  }

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
      .update({ passwordHash, papel, paroquiaId, pastoralId, updatedAt: agora })
      .eq("id", existente.id);
    if (error) throw error;
    console.log(`Usuário "${username}" atualizado (papel: ${papel}).`);
  } else {
    const { error } = await supabase
      .from("Usuario")
      .insert({ id: crypto.randomUUID(), username, passwordHash, papel, paroquiaId, pastoralId, updatedAt: agora });
    if (error) throw error;
    console.log(`Usuário "${username}" criado (papel: ${papel}).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
