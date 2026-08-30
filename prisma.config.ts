// Usado apenas localmente para gerenciar o schema/migrations via `prisma
// migrate dev` (rode com --skip-generate: o app em runtime usa
// @supabase/supabase-js, não o Prisma Client). Nunca roda em build/deploy.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
