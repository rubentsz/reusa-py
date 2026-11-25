import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRuntimeDatabaseUrl } from "@/lib/db-url";

export const dynamic = "force-dynamic";

export async function GET() {
  const { url, sourceKey } = resolveRuntimeDatabaseUrl();
  const hasDatabaseUrlVar = Boolean(process.env.DATABASE_URL);
  const databaseUrlScheme = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.split("://")[0]
    : null;

  try {
    const [categories, departments, listings] = await Promise.all([
      prisma.category.count(),
      prisma.department.count(),
      prisma.listing.count(),
    ]);

    return NextResponse.json({
      ok: true,
      dbConfigured: Boolean(url),
      dbSourceKey: sourceKey,
      counts: { categories, departments, listings },
    });
  } catch (err) {
    const e = err as { code?: string; name?: string; message?: string };
    // Never expose connection strings or credentials in error text
    const safeMessage = (e.message || "Unknown error")
      .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "[REDACTED_DB_URL]")
      .slice(0, 260);

    return NextResponse.json(
      {
        ok: false,
        dbConfigured: Boolean(url),
        dbSourceKey: sourceKey,
        hasDatabaseUrlVar,
        databaseUrlScheme,
        errorName: e.name || "Error",
        errorCode: e.code || null,
        errorSummary: safeMessage,
      },
      { status: 500 }
    );
  }
}
