"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarPlus,
  Check,
  ExternalLink,
  Inbox,
  PauseCircle,
  PlayCircle,
  Plus,
  Settings,
  ShieldAlert,
  Sparkles,
  Store,
  Trash2,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import type {
  CommercialStoreDTO,
  ReportDTO,
  StoreInquiryDTO,
} from "@/types/marketplace";
import {
  daysUntilExpiry,
  formatPrice,
  formatRelativeDate,
  STATUS_LABELS,
} from "@/lib/format";
import {
  STORE_PLAN_LIST,
  STORE_PLANS,
  STORE_STATUS_LABELS,
  type StorePlanTier,
} from "@/lib/storePlans";

type AdminTab = "stores" | "inquiries" | "reports";

export function AdminModerationView() {
  const {
    user,
    categories,
    departments,
    openListing,
    openMerchantDashboard,
    refreshListings,
    refreshCommercialStores,
    notifyToast,
  } = useApp();

  const [tab, setTab] = useState<AdminTab>("stores");
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [stores, setStores] = useState<CommercialStoreDTO[]>([]);
  const [inquiries, setInquiries] = useState<StoreInquiryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [generatedCreds, setGeneratedCreds] = useState<{
    storeName: string;
    email: string;
    password: string;
  } | null>(null);

  // Create Commercial Store form
  const [showCreateStore, setShowCreateStore] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newTagline, setNewTagline] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");
  const [newCategoryId, setNewCategoryId] = useState(categories[0]?.id || "");
  const [newDepartmentId, setNewDepartmentId] = useState(departments[0]?.id || "");
  const [newCityId, setNewCityId] = useState(departments[0]?.cities[0]?.id || "");
  const [newPlan, setNewPlan] = useState<StorePlanTier>("FEATURED");
  const [newDurationDays, setNewDurationDays] = useState("30");
  const [creatingStore, setCreatingStore] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [repRes, stRes, inqRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/stores?includeAll=true"),
        fetch("/api/store-inquiries"),
      ]);
      if (repRes.ok) {
        const d = await repRes.json();
        setReports(d.reports ?? []);
      }
      if (stRes.ok) {
        const d = await stRes.json();
        setStores(d.stores ?? []);
      }
      if (inqRes.ok) {
        const d = await inqRes.json();
        setInquiries(d.inquiries ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      loadAll();
    } else {
      setLoading(false);
    }
  }, [user?.role, loadAll]);

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500" />
        <h2 className="mt-3 text-base font-bold text-slate-900">Panel de Administración</h2>
        <p className="mt-1 text-xs text-slate-500">
          Iniciá sesión con una cuenta de administrador para gestionar tiendas y moderación.
        </p>
      </div>
    );
  }

  const handleReportAction = async (
    reportId: string,
    action: "PAUSE_LISTING" | "DELETE_LISTING" | "DISMISS"
  ) => {
    setBusyId(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, moderatorNote: notes[reportId] || "" }),
      });
      if (!res.ok) throw new Error();
      await Promise.all([loadAll(), refreshListings()]);
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

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingStore(true);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          ownerEmail: newOwnerEmail,
          ownerName: newOwnerName || undefined,
          tagline: newTagline || undefined,
          whatsappPhone: newWhatsapp || undefined,
          categoryId: newCategoryId || null,
          departmentId: newDepartmentId || null,
          cityId: newCityId || null,
          planTier: newPlan,
          durationDays: Number(newDurationDays) || 30,
          status: "ACTIVE",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear la tienda");
      if (data.generatedCredentials) {
        setGeneratedCreds({
          storeName: data.store.name,
          email: data.generatedCredentials.email,
          password: data.generatedCredentials.password,
        });
      }
      setNewName("");
      setNewOwnerEmail("");
      setNewOwnerName("");
      setNewTagline("");
      setNewWhatsapp("");
      setShowCreateStore(false);
      await Promise.all([loadAll(), refreshCommercialStores()]);
      notifyToast(`¡Local "${data.store.name}" activado en Avenida de Marcas 3D!`, "success");
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : "Error creando tienda", "error");
    } finally {
      setCreatingStore(false);
    }
  };

  const handlePatchStore = async (storeId: string, patch: Record<string, unknown>, msg: string) => {
    setBusyId(storeId);
    try {
      const res = await fetch(`/api/stores/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      await Promise.all([loadAll(), refreshCommercialStores()]);
      notifyToast(msg, "success");
    } catch {
      notifyToast("No se pudo actualizar la tienda", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteStore = async (st: CommercialStoreDTO) => {
    if (!confirm(`¿Eliminar la tienda "${st.name}" de Avenida de Marcas?`)) return;
    setBusyId(st.id);
    try {
      const res = await fetch(`/api/stores/${st.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await Promise.all([loadAll(), refreshCommercialStores(), refreshListings()]);
      notifyToast("Tienda eliminada", "info");
    } catch {
      notifyToast("Error eliminando tienda", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveInquiry = async (inq: StoreInquiryDTO) => {
    setBusyId(inq.id);
    try {
      const res = await fetch(`/api/store-inquiries/${inq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approveAndCreateStore: true,
          planTier: inq.desiredPlan,
          durationDays: 30,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error aprobando solicitud");
      if (data.generatedCredentials) {
        setGeneratedCreds({
          storeName: data.store.name,
          email: data.generatedCredentials.email,
          password: data.generatedCredentials.password,
        });
      }
      await Promise.all([loadAll(), refreshCommercialStores()]);
      notifyToast(`¡Local "${inq.businessName}" aprobado y publicado en 3D!`, "success");
      setTab("stores");
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : "Error", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectInquiry = async (inq: StoreInquiryDTO) => {
    setBusyId(inq.id);
    try {
      const res = await fetch(`/api/store-inquiries/${inq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });
      if (!res.ok) throw new Error();
      await loadAll();
      notifyToast("Solicitud rechazada", "info");
    } finally {
      setBusyId(null);
    }
  };

  const newInquiriesCount = inquiries.filter((i) => i.status === "NEW").length;
  const openReportsCount = reports.filter((r) => r.status === "OPEN").length;
  const selectedDeptCities = departments.find((d) => d.id === newDepartmentId)?.cities || [];

  return (
    <div className="fluent-scroll h-full space-y-4 overflow-y-auto bg-[#f8fafd] p-4">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-extrabold text-slate-900">
            Administración Comercial y Moderación — ReUsa PY
          </h1>
          <p className="text-xs text-slate-500">
            Vendé locales 3D, aprobá solicitudes, controlá planes/vencimientos y moderá reportes.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTab("stores")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
              tab === "stores"
                ? "bg-[#0067c0] text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Store className="h-3.5 w-3.5" /> Tiendas 3D ({stores.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("inquiries")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
              tab === "inquiries"
                ? "bg-[#0067c0] text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Inbox className="h-3.5 w-3.5" /> Solicitudes
            {newInquiriesCount > 0 && (
              <span className="rounded-full bg-[#ff2a9d] px-1.5 py-0.5 text-[10px] text-white">
                {newInquiriesCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("reports")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
              tab === "reports"
                ? "bg-[#0067c0] text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Denuncias ({openReportsCount})
          </button>
        </div>
      </div>

      {/* Auto-generated merchant credentials alert banner */}
      {generatedCreds && (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-4 text-xs text-emerald-950">
          <div className="flex items-start justify-between gap-2">
            <div>
              <strong className="block text-sm font-black">
                Cuenta creada automáticamente para {generatedCreds.storeName}
              </strong>
              <p className="mt-1">
                Enviá estos accesos al dueño del local para que suba su logo y catálogo desde{" "}
                <strong>Mi Tienda</strong>:
              </p>
              <p className="mt-1.5 font-mono text-xs">
                Email: <strong>{generatedCreds.email}</strong> · Contraseña temporal:{" "}
                <strong>{generatedCreds.password}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGeneratedCreds(null)}
              className="rounded-lg bg-emerald-200 px-2 py-1 text-[11px] font-bold"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: COMMERCIAL STORES MANAGEMENT */}
      {tab === "stores" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-600">
              Locales vendidos en Avenida de Marcas 3D ({stores.filter((s) => s.status === "ACTIVE").length} activos)
            </p>
            <button
              type="button"
              onClick={() => setShowCreateStore((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff2a9d] to-[#ff6b35] px-3.5 py-2 text-xs font-black text-white shadow-xs hover:brightness-110"
            >
              <Plus className="h-3.5 w-3.5" /> Crear Local Vendido
            </button>
          </div>

          {showCreateStore && (
            <form
              onSubmit={handleCreateStore}
              className="space-y-3 rounded-2xl border-2 border-pink-200 bg-white p-4 text-xs shadow-xs"
            >
              <h2 className="text-sm font-black text-slate-900">
                Dar de alta un nuevo Local Comercial 3D
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Nombre comercial *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. CellShop Asunción"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">
                    Email del dueño (si no existe, se crea cuenta) *
                  </label>
                  <input
                    type="email"
                    required
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    placeholder="dueno@local.com.py"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Nombre del contacto</label>
                  <input
                    type="text"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    placeholder="Ej. Carlos Gómez"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">WhatsApp del local</label>
                  <input
                    type="tel"
                    value={newWhatsapp}
                    onChange={(e) => setNewWhatsapp(e.target.value)}
                    placeholder="0981 000 000"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Eslogan</label>
                  <input
                    type="text"
                    value={newTagline}
                    onChange={(e) => setNewTagline(e.target.value)}
                    placeholder="Celulares, Gaming & Servicio Técnico"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Rubro / Categoría</label>
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Departamento</label>
                  <select
                    value={newDepartmentId}
                    onChange={(e) => {
                      setNewDepartmentId(e.target.value);
                      const c0 = departments.find((d) => d.id === e.target.value)?.cities[0]?.id || "";
                      setNewCityId(c0);
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Ciudad</label>
                  <select
                    value={newCityId}
                    onChange={(e) => setNewCityId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                  >
                    {selectedDeptCities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Plan Contratado</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as StorePlanTier)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                  >
                    {STORE_PLAN_LIST.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatPrice(p.monthlyPricePyg, "PYG")}/mes · hasta {p.maxProducts} prod.)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Vigencia (días)</label>
                  <input
                    type="number"
                    min={1}
                    max={1825}
                    value={newDurationDays}
                    onChange={(e) => setNewDurationDays(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateStore(false)}
                  className="rounded-xl px-3 py-2 font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingStore}
                  className="rounded-xl bg-[#0067c0] px-4 py-2 font-extrabold text-white hover:bg-[#0058a6] disabled:opacity-60"
                >
                  {creatingStore ? "Creando..." : "Activar en Avenida de Marcas 3D"}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="text-xs text-slate-500">Cargando tiendas...</p>
          ) : (
            <div className="space-y-3">
              {stores.map((st) => {
                const plan = STORE_PLANS[st.planTier];
                const dLeft = st.expiresAt ? daysUntilExpiry(st.expiresAt) : null;
                return (
                  <div
                    key={st.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 bg-slate-900 p-1"
                          style={{ borderColor: st.neonColor }}
                        >
                          {st.logoUrl ? (
                            <img src={st.logoUrl} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <Store className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <strong className="text-sm font-black text-slate-900">{st.name}</strong>
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-black text-slate-950"
                              style={{ backgroundColor: plan.accentColor }}
                            >
                              {plan.badge}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                st.status === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {STORE_STATUS_LABELS[st.status]}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Dueño: <strong>{st.owner?.name}</strong> ({st.owner?.email}) ·{" "}
                            <code>/tienda/{st.slug}</code>
                          </p>
                          <p className="mt-1 text-[11px] text-slate-600">
                            Productos: <strong>{st.activeListingsCount}/{st.maxProducts}</strong> ·
                            Visitas: <strong>{st.visitsCount}</strong> · Clics WhatsApp:{" "}
                            <strong>{st.whatsappClicksCount}</strong>
                            {dLeft !== null ? ` · Vence en ${dLeft} días` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <select
                          value={st.planTier}
                          disabled={busyId === st.id}
                          onChange={(e) =>
                            handlePatchStore(
                              st.id,
                              { planTier: e.target.value },
                              `Plan actualizado a ${STORE_PLANS[e.target.value as StorePlanTier].name}`
                            )
                          }
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-bold"
                        >
                          <option value="BASIC">Básico</option>
                          <option value="FEATURED">Destacado</option>
                          <option value="FLAGSHIP">Flagship VIP</option>
                        </select>

                        <button
                          type="button"
                          disabled={busyId === st.id}
                          onClick={() =>
                            handlePatchStore(st.id, { extendDays: 30 }, "Vigencia renovada +30 días")
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" /> +30 días
                        </button>

                        <button
                          type="button"
                          disabled={busyId === st.id}
                          onClick={() =>
                            handlePatchStore(
                              st.id,
                              { status: st.status === "ACTIVE" ? "PAUSED" : "ACTIVE" },
                              st.status === "ACTIVE" ? "Tienda pausada" : "Tienda reactivada"
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                        >
                          {st.status === "ACTIVE" ? (
                            <>
                              <PauseCircle className="h-3.5 w-3.5" /> Pausar
                            </>
                          ) : (
                            <>
                              <PlayCircle className="h-3.5 w-3.5" /> Activar
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => openMerchantDashboard(st.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#0067c0] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#0058a6]"
                        >
                          <Settings className="h-3.5 w-3.5" /> Gestionar
                        </button>

                        <button
                          type="button"
                          disabled={busyId === st.id}
                          onClick={() => handleDeleteStore(st)}
                          className="rounded-lg bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100"
                          title="Eliminar tienda"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STORE INQUIRIES (LEADS FROM "TU MARCA AQUÍ") */}
      {tab === "inquiries" && (
        <div className="space-y-3">
          {inquiries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
              Aún no hay solicitudes de locales comerciales.
            </div>
          ) : (
            inquiries.map((inq) => (
              <div
                key={inq.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                          inq.status === "NEW"
                            ? "bg-pink-100 text-pink-700"
                            : inq.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {inq.status}
                      </span>
                      <strong className="text-sm font-black text-slate-900">
                        {inq.businessName}
                      </strong>
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">
                        {STORE_PLANS[inq.desiredPlan].name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        · {formatRelativeDate(inq.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-700">
                      Contacto: <strong>{inq.contactName}</strong> · WhatsApp:{" "}
                      <strong>{inq.contactPhone}</strong> · Email: {inq.contactEmail}
                    </p>
                    <p className="mt-0.5 text-slate-500">
                      Rubro: {inq.rubro} · Ciudad: {inq.cityName}
                      {inq.instagramOrWeb ? ` · ${inq.instagramOrWeb}` : ""}
                    </p>
                    {inq.notes && (
                      <p className="mt-2 rounded-lg bg-slate-50 p-2 text-slate-700">{inq.notes}</p>
                    )}
                  </div>

                  {inq.status !== "APPROVED" && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === inq.id}
                        onClick={() => handleApproveInquiry(inq)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Aprobar y Crear Local 3D
                      </button>
                      {inq.status !== "REJECTED" && (
                        <button
                          type="button"
                          disabled={busyId === inq.id}
                          onClick={() => handleRejectInquiry(inq)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Descartar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: COMMUNITY MODERATION REPORTS */}
      {tab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
              No hay denuncias registradas.
            </div>
          ) : (
            reports.map((rep) => (
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
                      onClick={() => handleReportAction(rep.id, "PAUSE_LISTING")}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                    >
                      <PauseCircle className="h-3.5 w-3.5" /> Pausar aviso
                    </button>
                    <button
                      type="button"
                      disabled={busyId === rep.id}
                      onClick={() => handleReportAction(rep.id, "DELETE_LISTING")}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar aviso
                    </button>
                    <button
                      type="button"
                      disabled={busyId === rep.id}
                      onClick={() => handleReportAction(rep.id, "DISMISS")}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Check className="h-3.5 w-3.5" /> Descartar
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
