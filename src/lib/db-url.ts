function isPostgresUrl(val?: string): val is string {
  if (!val) return false;
  return val.startsWith("postgres://") || val.startsWith("postgresql://");
}

const RUNTIME_CANDIDATES = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DIRECT_URL",
  "NEON_DATABASE_URL",
  "SUPABASE_POSTGRES_URL",
];

export function resolveRuntimeDatabaseUrl(): { url: string | null; sourceKey: string | null } {
  for (const key of RUNTIME_CANDIDATES) {
    const val = process.env[key];
    if (isPostgresUrl(val)) {
      return { url: val, sourceKey: key };
    }
  }

  // Fallback: scan any prefixed Vercel Marketplace Postgres env var (e.g. STORAGE_DATABASE_URL)
  for (const [key, val] of Object.entries(process.env)) {
    if (/(DATABASE|POSTGRES|NEON|SUPABASE).*URL/i.test(key) && isPostgresUrl(val)) {
      return { url: val, sourceKey: key };
    }
  }

  return { url: null, sourceKey: null };
}
