import { getBootstrapData } from "@/lib/bootstrap";
import { ReUsaShell } from "@/components/ReUsaShell";
import { resolveRuntimeDatabaseUrl } from "@/lib/db-url";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const data = await getBootstrapData();
    return <ReUsaShell {...data} />;
  } catch (err) {
    const { sourceKey } = resolveRuntimeDatabaseUrl();
    const e = err as { code?: string; message?: string };
    const safeMsg = (e.message || "")
      .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "[REDACTED_DB_URL]")
      .slice(0, 220);

    return (
      <main className="win-desktop-bg flex min-h-screen items-center justify-center p-4">
        <div className="win-acrylic win-window-shadow max-w-lg rounded-2xl border border-white/80 p-6 text-slate-900">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon.svg" alt="ReUsa PY" className="h-9 w-9 rounded-xl" />
            <div>
              <h1 className="text-base font-extrabold">ReUsa PY — Falta conectar la base de datos</h1>
              <p className="text-xs text-slate-500">Configuración inicial en Vercel</p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-700">
            {!sourceKey
              ? "No se detectó una base PostgreSQL conectada a este despliegue en Vercel."
              : `Se detectó la variable ${sourceKey}, pero ocurrió un error al consultar las tablas de PostgreSQL (puede faltar hacer Redeploy luego de conectar Storage).`}
          </p>

          <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-xs text-slate-700">
            <li>
              Abrí tu proyecto en <strong>Vercel → Storage</strong> y conectá una base gratuita{" "}
              <strong>Neon</strong>, <strong>Supabase</strong> o <strong>Prisma Postgres</strong>.
            </li>
            <li>
              Verificá que exista la variable <code>AUTH_SECRET</code> en{" "}
              <strong>Settings → Environment Variables</strong>.
            </li>
            <li>
              Andá a <strong>Deployments → Redeploy</strong> para que se creen las tablas y los 15
              avisos iniciales de Paraguay automáticamente.
            </li>
          </ol>

          {safeMsg && (
            <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-3 text-[11px] text-slate-200">
              {e.code ? `[${e.code}] ` : ""}
              {safeMsg}
            </pre>
          )}
        </div>
      </main>
    );
  }
}
