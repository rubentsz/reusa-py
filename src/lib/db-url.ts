function isPostgresUrl(val?: string): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  return trimmed.startsWith("postgres://") || trimmed.startsWith("postgresql://");
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
      return { url: val.trim(), sourceKey: key };
    }
  }

  // Fallback: detect ANY env variable whose value is a postgres:// or postgresql:// URI
  for (const [key, val] of Object.entries(process.env)) {
    if (isPostgresUrl(val)) {
      return { url: val.trim(), sourceKey: key };
    }
  }

  return { url: null, sourceKey: null };
}
