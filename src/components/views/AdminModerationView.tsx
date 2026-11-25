"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, PauseCircle, ShieldAlert, Trash2 } from "lucide-react";
import { useApp } from "@/components/AppContext";
import type { ReportDTO } from "@/types/marketplace";
import { formatPrice, formatRelativeDate, STATUS_LABELS } from "@/lib/format";

export function AdminModerationView() {
  const { user, openListing, refreshListings, notifyToast } = useApp();
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "ADMIN") {
      loadReports();
    } else {
      setLoading(false);
    }
  }, [user?.role]);

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500" />
        <h2 className="mt-3 text-base font-bold text-slate-900">Panel de Moderación</h2>
        <p className="mt-1 text-xs text-slate-500">
          Iniciá sesión con una cuenta de administrador para gestionar reportes.
        </p>
      </div>
    );
  }

  const handleAction = async (
    reportId: string,
    action: "PAUSE_LISTING" | "DELETE_LISTING" | "DISMISS"
  ) => {
    setBusyId(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          moderatorNote: notes[reportId] || "",
        }),
      });
      if (!res.ok) throw new Error();
      await Promise.all([loadReports(), refreshListings()]);
      notifyToast(
        action === "DELETE_LISTING"
          ? "Publicación eliminada y vendedor notificado"
          : action === "PAUSE_LISTING"
          ? "Publicación pausada y reporte resuelto"
          : "Denuncia descartada",
        "success"
      );
    } catch {
      notifyToast("Error procesando la acción", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fluent-scroll h-full space-y-4 overflow-y-auto bg-[#f8fafd] p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-extrabold text-slate-900">
            Moderación de denuncias — ReUsa PY
          </h1>
          <p className="text-xs text-slate-500">
            Revisá los avisos reportados por la comunidad y tomá acción inmediata.
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
          {reports.filter((r) => r.status === "OPEN").length} abiertas
        </span>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">Cargando denuncias...</p>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
          No hay denuncias registradas.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {rep.listing.images[0]?.url && (
                    <img
                      src={rep.listing.images[0].url}
                      alt=""
                      className="h-14 w-16 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          rep.status === "OPEN"
                            ? "bg-rose-100 text-rose-700"
                            : rep.status === "RESOLVED"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {rep.status}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{rep.reason}</span>
                      <span className="text-[11px] text-slate-400">
                        · {formatRelativeDate(rep.createdAt)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openListing(rep.listing.slug, rep.listing.title)}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#0067c0] hover:underline"
                    >
                      {rep.listing.title} (
                      {formatPrice(rep.listing.price, rep.listing.currency, rep.listing.isFree)}) ·{" "}
                      {STATUS_LABELS[rep.listing.status]}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Vendedor: <strong>{rep.listing.seller.name}</strong> · Denunciado por:{" "}
                      <strong>{rep.reporter.name}</strong>
                    </p>
                    {rep.details && (
                      <p className="mt-1.5 rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                        {rep.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {rep.status === "OPEN" && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <input
                    type="text"
                    value={notes[rep.id] || ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [rep.id]: e.target.value }))
                    }
                    placeholder="Nota interna / motivo para el vendedor (opcional)"
                    className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#0067c0]"
                  />
                  <button
                    type="button"
                    disabled={busyId === rep.id}
                    onClick={() => handleAction(rep.id, "PAUSE_LISTING")}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                  >
                    <PauseCircle className="h-3.5 w-3.5" /> Pausar aviso
                  </button>
                  <button
                    type="button"
                    disabled={busyId === rep.id}
                    onClick={() => handleAction(rep.id, "DELETE_LISTING")}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar aviso
                  </button>
                  <button
                    type="button"
                    disabled={busyId === rep.id}
                    onClick={() => handleAction(rep.id, "DISMISS")}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Descartar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
