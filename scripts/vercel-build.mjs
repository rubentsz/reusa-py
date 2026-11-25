import { execSync } from "node:child_process";

function run(cmd, env = process.env) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env });
}

const resolvedDbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  "";

const buildEnv = resolvedDbUrl
  ? { ...process.env, DATABASE_URL: resolvedDbUrl }
  : process.env;

run("npx prisma generate", buildEnv);

if (
  resolvedDbUrl.startsWith("postgres://") ||
  resolvedDbUrl.startsWith("postgresql://") ||
  resolvedDbUrl.startsWith("prisma+postgres://")
) {
  console.log("PostgreSQL DATABASE_URL detected — pushing Prisma schema and seeding Paraguay data...");
  run("npx prisma db push --skip-generate", buildEnv);
  run("npx tsx prisma/seed.ts", buildEnv);
} else {
  console.warn(
    "⚠ DATABASE_URL no apunta a PostgreSQL durante el build. Conectá Neon, Supabase o Prisma Postgres en Vercel y volvé a desplegar para crear las tablas y los datos iniciales."
  );
}

run("npx next build", buildEnv);
