import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRuntimeDatabaseUrl } from "@/lib/db-url";

export const dynamic = "force-dynamic";

export async function GET() {
  const { url, sourceKey } = resolveRuntimeDatabaseUrl();
  const storageRelatedEnvKeys = Object.keys(process.env)
    .filter((k) => /(DB|DATA|PG|POST|NEON|SUPA|PRISMA|BLOB|STORAGE)/i.test(k))
    .sort();

  try {
    const [categories, departments, listings, commercialStores] = await Promise.all([
      prisma.category.count(),
      prisma.department.count(),
      prisma.listing.count(),
      prisma.commercialStore.count(),
    ]);

    return NextResponse.json({
      ok: true,
      dbConfigured: Boolean(url),
      dbSourceKey: sourceKey,
      blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      counts: { categories, departments, listings, commercialStores },
    });
  } catch (err) {
    const e = err as { code?: string; name?: string; message?: string };
    const safeMessage = (e.message || "Unknown error")
      .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "[REDACTED_DB_URL]")
      .slice(0, 260);

    return NextResponse.json(
      {
        ok: false,
        dbConfigured: Boolean(url),
        dbSourceKey: sourceKey,
        blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
        storageRelatedEnvKeys,
        errorName: e.name || "Error",
        errorCode: e.code || null,
        errorSummary: safeMessage,
      },
      { status: 500 }
    );
  }
}
