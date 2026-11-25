import { execSync } from "node:child_process";

function isPostgresUrl(val) {
  return Boolean(val && (val.startsWith("postgres://") || val.startsWith("postgresql://")));
}

function resolveMigrationUrl() {
  // Prefer unpooled/direct URL for Prisma DDL (db push) to avoid PgBouncer issues on Neon/Supabase/Prisma Postgres
  const preferred = [
    "DATABASE_URL_UNPOOLED",
    "POSTGRES_URL_NON_POOLING",
    "DIRECT_URL",
    "POSTGRES_URL",
    "DATABASE_URL",
    "POSTGRES_PRISMA_URL",
  ];
  for (const key of preferred) {
    if (isPostgresUrl(process.env[key])) {
      return { url: process.env[key], key };
    }
  }
  for (const [key, val] of Object.entries(process.env)) {
    if (/(DATABASE|POSTGRES|NEON|SUPABASE).*URL/i.test(key) && isPostgresUrl(val)) {
      return { url: val, key };
    }
  }
  return { url: "", key: null };
}

function run(cmd, env = process.env) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env });
}

const { url: dbUrl, key: dbKey } = resolveMigrationUrl();
const buildEnv = dbUrl ? { ...process.env, DATABASE_URL: dbUrl } : process.env;

run("npx prisma generate", buildEnv);

if (dbUrl) {
  console.log(`PostgreSQL detectado vía ${dbKey} — aplicando esquema y seed de Paraguay...`);
  run("npx prisma db push --skip-generate --accept-data-loss", buildEnv);
  run("npx tsx prisma/seed.ts", buildEnv);
} else {
  console.warn(
    "⚠ No se encontró una variable PostgreSQL (postgres:// o postgresql://) durante el build. Conectá Neon, Supabase o Prisma Postgres en Vercel Storage y hacé Redeploy."
  );
}

run("npx next build", buildEnv);
