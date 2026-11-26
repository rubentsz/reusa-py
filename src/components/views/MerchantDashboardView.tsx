"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  Eye,
  FileSpreadsheet,
  Link2,
  MousePointerClick,
  Package,
  Palette,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Store,
  Trash2,
  Upload,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import {
  STORE_COLOR_PRESETS,
  STORE_PLANS,
  STORE_STATUS_LABELS,
} from "@/lib/storePlans";
import { CONDITION_LABELS, daysUntilExpiry, formatPrice } from "@/lib/format";
import type { CommercialStoreDTO, ListingDTO } from "@/types/marketplace";

type MerchantTab = "overview" | "branding" | "catalog" | "csv";

const CSV_TEMPLATE = `titulo,precio,moneda,precio_anterior,condicion,stock,sku,descripcion,categoria_slug,foto_url
Auriculares Bluetooth ANC Pro,420000,PYG,590000,BRAND_NEW,12,AUD-ANC-01,"Cancelación activa de ruido con 35h de batería, garantía oficial 6 meses.",tecnologia,/uploads/seed/iphone.jpg
Notebook Ultrabook 14 Outlet,680,USD,920,OUTLET,3,NB-OUT-14,"Unidad de exhibición impecable con SSD 512GB y 16GB RAM.",tecnologia,/uploads/seed/laptop.jpg`;

export function MerchantDashboardView({
  initialStoreId,
  onEnter3DStore,
}: {
  initialStoreId?: string;
  onEnter3DStore?: (slug: string) => void;
}) {
  const {
    categories,
    departments,
    refreshCommercialStores,
    refreshListings,
    openStoreStoryCard,
    notifyToast,
  } = useApp();

  const [stores, setStores] = useState<CommercialStoreDTO[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(initialStoreId || "");
  const [catalog, setCatalog] = useState<ListingDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<MerchantTab>("overview");

  // Branding Form States
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [facadeColor, setFacadeColor] = useState("#ecfeff");
  const [neonColor, setNeonColor] = useState("#00f0ff");
  const [secondaryNeon, setSecondaryNeon] = useState("#ff2a9d");
  const [npcGreeting, setNpcGreeting] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [cityId, setCityId] = useState("");
  const [address, setAddress] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Add Product Form States
  const [showNewProd, setShowNewProd] = useState(false);
  const [pTitle, setPTitle] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pCategoryId, setPCategoryId] = useState(categories[0]?.id || "");
  const [pCondition, setPCondition] = useState("BRAND_NEW");
  const [pCurrency, setPCurrency] = useState<"PYG" | "USD">("PYG");
  const [pPrice, setPPrice] = useState("");
  const [pRefPrice, setPRefPrice] = useState("");
  const [pSku, setPSku] = useState("");
  const [pStock, setPStock] = useState("10");
  const [pImages, setPImages] = useState<string[]>([]);
  const [uploadingProdImg, setUploadingProdImg] = useState(false);
  const [creatingProd, setCreatingProd] = useState(false);

  // CSV Import States
  const [csvText, setCsvText] = useState(CSV_TEMPLATE);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvResult, setCsvResult] = useState<{
    createdCount: number;
    skippedCount: number;
    errors: string[];
  } | null>(null);

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stores?mine=true");
      if (res.ok) {
        const data = await res.json();
        const list: CommercialStoreDTO[] = data.stores ?? [];
        setStores(list);
        if (list.length > 0) {
          setSelectedStoreId((prev) =>
            prev && list.some((s) => s.id === prev) ? prev : initialStoreId && list.some((s) => s.id === initialStoreId) ? initialStoreId : list[0].id
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, [initialStoreId]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const activeStore = useMemo(
    () => stores.find((s) => s.id === selectedStoreId) || stores[0] || null,
    [stores, selectedStoreId]
  );

  const loadStoreCatalog = useCallback(async (storeId: string) => {
    const res = await fetch(`/api/stores/${encodeURIComponent(storeId)}?includeAll=true`);
    if (res.ok) {
      const data = await res.json();
      setCatalog(data.listings ?? []);
      if (data.store) {
        const s: CommercialStoreDTO = data.store;
        setName(s.name);
        setTagline(s.tagline || "");
        setDescription(s.description || "");
        setLogoUrl(s.logoUrl || "");
        setFacadeColor(s.facadeColor || "#ecfeff");
        setNeonColor(s.neonColor || "#00f0ff");
        setSecondaryNeon(s.secondaryNeon || "#ff2a9d");
        setNpcGreeting(s.npcGreeting || "");
        setDepartmentId(s.departmentId || departments[0]?.id || "");
        setCityId(s.cityId || departments[0]?.cities[0]?.id || "");
        setAddress(s.address || "");
        setOpeningHours(s.openingHours || "");
        setWhatsappPhone(s.whatsappPhone || "");
        setInstagramUrl(s.instagramUrl || "");
        setWebsiteUrl(s.websiteUrl || "");
        if (s.categoryId) setPCategoryId(s.categoryId);
      }
    }
  }, [departments]);

  useEffect(() => {
    if (activeStore?.id) {
      loadStoreCatalog(activeStore.id);
    }
  }, [activeStore?.id, loadStoreCatalog]);

  const activeDeptCities = useMemo(() => {
    return departments.find((d) => d.id === departmentId)?.cities || [];
  }, [departments, departmentId]);

  const handleUploadFiles = async (files: FileList | null): Promise<string[]> => {
    if (!files || files.length === 0) return [];
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error subiendo imagen");
    return (data.files || []).map((f: { url: string }) => f.url);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;
    setSavingBrand(true);
    try {
      const res = await fetch(`/api/stores/${activeStore.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tagline,
          description,
          logoUrl: logoUrl || null,
          facadeColor,
          neonColor,
          secondaryNeon,
          npcGreeting: npcGreeting || null,
          departmentId: departmentId || null,
          cityId: cityId || null,
          address: address || null,
          openingHours: openingHours || null,
          whatsappPhone: whatsappPhone || null,
          instagramUrl: instagramUrl || null,
          websiteUrl: websiteUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setStores((prev) => prev.map((s) => (s.id === activeStore.id ? data.store : s)));
      await refreshCommercialStores();
      notifyToast("¡Marca y fachada 3D actualizadas en vivo!", "success");
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : "Error guardando marca", "error");
    } finally {
      setSavingBrand(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;
    const priceNum = Number(pPrice);
    if (!priceNum || priceNum <= 0) {
      notifyToast("Ingresá un precio válido mayor a 0", "error");
      return;
    }
    const resolvedDept = activeStore.departmentId || departments[0]?.id;
    const resolvedCity = activeStore.cityId || departments[0]?.cities[0]?.id;
    const imgs =
      pImages.length > 0
        ? pImages.map((url, idx) => ({ url, isCover: idx === 0 }))
        : [{ url: activeStore.logoUrl || "/uploads/seed/laptop.jpg", isCover: true }];

    setCreatingProd(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pTitle,
          description:
            pDesc.trim().length >= 10
              ? pDesc.trim()
              : `${pTitle} — Producto oficial de ${activeStore.name}.`,
          storeId: activeStore.id,
          categoryId: pCategoryId || categories[0]?.id,
          condition: pCondition,
          currency: pCurrency,
          price: priceNum,
          referenceNewPrice: pRefPrice ? Number(pRefPrice) : null,
          sku: pSku || null,
          stockQuantity: pStock !== "" ? Number(pStock) : null,
          departmentId: resolvedDept,
          cityId: resolvedCity,
          pickupInPerson: true,
          localDelivery: true,
          nationalShipping: true,
          showWhatsapp: true,
          images: imgs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el producto");
      setPTitle("");
      setPDesc("");
      setPPrice("");
      setPRefPrice("");
      setPSku("");
      setPStock("10");
      setPImages([]);
      setShowNewProd(false);
      await Promise.all([
        loadStoreCatalog(activeStore.id),
        refreshListings(),
        refreshCommercialStores(),
      ]);
      notifyToast("¡Producto agregado al showroom 3D!", "success");
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : "Error creando producto", "error");
    } finally {
      setCreatingProd(false);
    }
  };

  const handleToggleProductStatus = async (item: ListingDTO) => {
    const nextStatus = item.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const res = await fetch(`/api/listings/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok && activeStore) {
      await Promise.all([loadStoreCatalog(activeStore.id), refreshListings()]);
      notifyToast(nextStatus === "ACTIVE" ? "Producto activado" : "Producto pausado", "info");
    }
  };

  const handleDeleteProduct = async (item: ListingDTO) => {
    if (!confirm(`¿Eliminar "${item.title}" del catálogo?`)) return;
    const res = await fetch(`/api/listings/${item.id}`, { method: "DELETE" });
    if (res.ok && activeStore) {
      await Promise.all([
        loadStoreCatalog(activeStore.id),
        refreshListings(),
        refreshCommercialStores(),
      ]);
      notifyToast("Producto eliminado", "info");
    }
  };

  const handleImportCsv = async () => {
    if (!activeStore || !csvText.trim()) return;
    setImportingCsv(true);
    setCsvResult(null);
    try {
      const res = await fetch(`/api/stores/${activeStore.id}/import-csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error importando CSV");
      setCsvResult({
        createdCount: data.createdCount,
        skippedCount: data.skippedCount,
        errors: data.errors || [],
      });
      await Promise.all([
        loadStoreCatalog(activeStore.id),
        refreshListings(),
        refreshCommercialStores(),
      ]);
      notifyToast(`Importados ${data.createdCount} productos al showroom 3D`, "success");
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : "Error en importación CSV", "error");
    } finally {
      setImportingCsv(false);
    }
  };

  const downloadCsvTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-catalogo-reusa-py.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-slate-50">
        <RefreshCw className="h-5 w-5 animate-spin text-[#0067c0]" />
      </div>
    );
  }

  if (!activeStore) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <Store className="h-10 w-10 text-slate-400" />
        <h2 className="mt-3 text-base font-extrabold text-slate-800">
          Todavía no tenés una tienda comercial asignada
        </h2>
        <p className="mt-1 max-w-md text-xs text-slate-500">
          Solicitá un local desde los carteles &quot;LOCAL DISPONIBLE — TU MARCA AQUÍ&quot; en
          Avenida de Marcas para activar tu showroom 3D.
        </p>
      </div>
    );
  }

  const plan = STORE_PLANS[activeStore.planTier];
  const directUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tienda/${activeStore.slug}`
      : `https://reusa-py.vercel.app/tienda/${activeStore.slug}`;
  const daysLeft = activeStore.expiresAt ? daysUntilExpiry(activeStore.expiresAt) : null;

  return (
    <div className="fluent-scroll flex h-full flex-col overflow-y-auto bg-[#f6f8fc]">
      {/* Header + Store Switcher (if user owns multiple stores or is ADMIN) */}
      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 bg-slate-900 p-1"
              style={{ borderColor: activeStore.neonColor }}
            >
              {activeStore.logoUrl ? (
                <img
                  src={activeStore.logoUrl}
                  alt={activeStore.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Store className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              {stores.length > 1 ? (
                <select
                  value={activeStore.id}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm font-black text-slate-900 outline-none"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({STORE_STATUS_LABELS[s.status]})
                    </option>
                  ))}
                </select>
              ) : (
                <h1 className="text-base font-black text-slate-900">{activeStore.name}</h1>
              )}
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="rounded bg-sky-100 px-1.5 py-0.5 font-bold text-sky-800">
                  {plan.name}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 font-bold ${
                    activeStore.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {STORE_STATUS_LABELS[activeStore.status]}
                </span>
                {daysLeft !== null && (
                  <span className="text-slate-500">· Vence en {daysLeft} días</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openStoreStoryCard(activeStore, catalog)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff2a9d] to-fuchsia-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-xs hover:brightness-110"
            >
              <Sparkles className="h-3.5 w-3.5" /> Placa IG / WhatsApp
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(directUrl)
                  .then(() => notifyToast("Link directo copiado para Instagram/WhatsApp", "success"))
                  .catch(() => {});
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              <Link2 className="h-3.5 w-3.5 text-[#0067c0]" /> /tienda/{activeStore.slug}
            </button>
            {onEnter3DStore && (
              <button
                type="button"
                onClick={() => onEnter3DStore(activeStore.slug)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#38bdf8] px-3 py-1.5 text-xs font-black text-slate-950 hover:brightness-110"
              >
                <Sparkles className="h-3.5 w-3.5" /> Ver en 3D
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-auto mt-3 flex max-w-5xl flex-wrap gap-1.5">
          {[
            { id: "overview" as const, label: "Resumen y Métricas", icon: BarChart3 },
            { id: "branding" as const, label: "Logo y Fachada 3D", icon: Palette },
            {
              id: "catalog" as const,
              label: `Catálogo (${catalog.length}/${activeStore.maxProducts})`,
              icon: Package,
            },
            { id: "csv" as const, label: "Carga Masiva CSV", icon: FileSpreadsheet },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  tab === t.id
                    ? "bg-[#0067c0] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <Eye className="h-3.5 w-3.5 text-sky-600" /> Visitas al Showroom
                </span>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {activeStore.visitsCount.toLocaleString("es-PY")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <MousePointerClick className="h-3.5 w-3.5 text-indigo-600" /> Clics en Productos
                </span>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {activeStore.productClicksCount.toLocaleString("es-PY")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <Phone className="h-3.5 w-3.5 text-emerald-600" /> Pedidos WhatsApp
                </span>
                <p className="mt-1 text-2xl font-black text-emerald-700">
                  {activeStore.whatsappClicksCount.toLocaleString("es-PY")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <Package className="h-3.5 w-3.5 text-amber-600" /> Cupo de Catálogo
                </span>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {catalog.filter((c) => c.status === "ACTIVE").length}
                  <span className="text-sm font-semibold text-slate-400">
                    /{activeStore.maxProducts}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-200 bg-gradient-to-r from-sky-50 to-cyan-50 p-4 text-xs text-slate-700">
              <strong className="block text-sm font-extrabold text-slate-900">
                Link directo de tu Showroom 3D para Instagram y WhatsApp Business
              </strong>
              <p className="mt-1">
                Compartí{" "}
                <code className="rounded bg-white px-2 py-0.5 font-bold text-[#0067c0]">
                  {directUrl}
                </code>{" "}
                y tus clientes entran directamente dentro de tu tienda 3D en ReUsa PY con tu logo y
                catálogo cargado.
              </p>
            </div>
          </div>
        )}

        {tab === "branding" && (
          <form
            onSubmit={handleSaveBranding}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-xs"
          >
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-4">
              <div
                className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 bg-slate-950 p-1.5"
                style={{ borderColor: neonColor }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <Store className="h-8 w-8 text-slate-500" />
                )}
              </div>
              <div className="flex-1 min-w-[220px]">
                <p className="font-extrabold text-slate-900">Logo real del local (se ve en 3D)</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Subí tu logo en PNG transparente, JPG o WebP. Se renderiza automáticamente en el
                  cartel luminoso exterior, cartel interior y medallón del piso 3D.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0067c0] px-3 py-1.5 font-bold text-white hover:bg-[#0058a6]">
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingLogo ? "Subiendo..." : "Subir Logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        try {
                          setUploadingLogo(true);
                          const urls = await handleUploadFiles(e.target.files);
                          if (urls[0]) setLogoUrl(urls[0]);
                          notifyToast("Logo subido. Guardá los cambios para aplicarlo en 3D.", "success");
                        } catch (err) {
                          notifyToast(err instanceof Error ? err.message : "Error", "error");
                        } finally {
                          setUploadingLogo(false);
                        }
                      }}
                    />
                  </label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="O pegá una URL de logo..."
                    className="flex-1 min-w-[180px] rounded-xl border border-slate-200 px-2.5 py-1.5 text-[11px] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Color Presets + Custom Pickers */}
            <div>
              <label className="mb-1.5 block font-bold text-slate-700">
                Paleta de Fachada y Luces Neón 3D
              </label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {STORE_COLOR_PRESETS.map((pr) => (
                  <button
                    key={pr.name}
                    type="button"
                    onClick={() => {
                      setFacadeColor(pr.facade);
                      setNeonColor(pr.neon);
                      setSecondaryNeon(pr.secondary);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold hover:bg-slate-50"
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: pr.neon }}
                    />
                    {pr.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                  <input
                    type="color"
                    value={facadeColor}
                    onChange={(e) => setFacadeColor(e.target.value)}
                    className="h-7 w-7 cursor-pointer rounded"
                  />
                  <span className="font-semibold text-slate-700">Fachada</span>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                  <input
                    type="color"
                    value={neonColor}
                    onChange={(e) => setNeonColor(e.target.value)}
                    className="h-7 w-7 cursor-pointer rounded"
                  />
                  <span className="font-semibold text-slate-700">Neón 1</span>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                  <input
                    type="color"
                    value={secondaryNeon}
                    onChange={(e) => setSecondaryNeon(e.target.value)}
                    className="h-7 w-7 cursor-pointer rounded"
                  />
                  <span className="font-semibold text-slate-700">Neón 2</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-bold text-slate-700">Nombre del Local</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#0067c0]"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Eslogan / Subtítulo</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#0067c0]"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Departamento</label>
                <select
                  value={departmentId}
                  onChange={(e) => {
                    const dId = e.target.value;
                    setDepartmentId(dId);
                    const firstCity = departments.find((d) => d.id === dId)?.cities[0]?.id || "";
                    setCityId(firstCity);
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
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                >
                  {activeDeptCities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Dirección física</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Av. España 1234, Asunción"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Horario de atención</label>
                <input
                  type="text"
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  placeholder="Lun a Sáb 09:00 - 19:00"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">WhatsApp de pedidos</label>
                <input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="0981 000 000"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Instagram URL</label>
                <input
                  type="text"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/tulocal"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block font-bold text-slate-700">Sitio Web</label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://tulocal.com.py"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block font-bold text-slate-700">
                  Saludo del Asesor NPC dentro del Showroom 3D
                </label>
                <textarea
                  rows={2}
                  value={npcGreeting}
                  onChange={(e) => setNpcGreeting(e.target.value)}
                  placeholder="¡Bienvenido! Todos nuestros equipos tienen garantía..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block font-bold text-slate-700">Descripción del negocio</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingBrand}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0067c0] px-5 py-2.5 font-extrabold text-white shadow-sm hover:bg-[#0058a6] disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingBrand ? "Guardando..." : "Guardar y actualizar 3D"}
              </button>
            </div>
          </form>
        )}

        {tab === "catalog" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600">
                Mostrando {catalog.length} productos en tu tienda (límite activo:{" "}
                <strong>{activeStore.maxProducts}</strong>)
              </p>
              <button
                type="button"
                onClick={() => setShowNewProd((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" /> Nuevo Producto
              </button>
            </div>

            {showNewProd && (
              <form
                onSubmit={handleCreateProduct}
                className="space-y-3 rounded-2xl border-2 border-emerald-200 bg-white p-4 text-xs shadow-xs"
              >
                <h3 className="text-sm font-black text-slate-900">
                  Agregar producto al catálogo de {activeStore.name}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-bold text-slate-700">Título del producto *</label>
                    <input
                      type="text"
                      required
                      value={pTitle}
                      onChange={(e) => setPTitle(e.target.value)}
                      placeholder="Ej. Samsung Galaxy S25 Ultra 256GB — Nuevo Sellado"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">Categoría</label>
                    <select
                      value={pCategoryId}
                      onChange={(e) => setPCategoryId(e.target.value)}
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
                    <label className="mb-1 block font-bold text-slate-700">Tipo / Condición</label>
                    <select
                      value={pCondition}
                      onChange={(e) => setPCondition(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                    >
                      <option value="BRAND_NEW">Nuevo (Tienda Oficial)</option>
                      <option value="OUTLET">Outlet / Exhibición</option>
                      <option value="LIKE_NEW">Seminuevo / Como nuevo</option>
                      <option value="VERY_GOOD">Usado — Muy bueno</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">Moneda</label>
                      <select
                        value={pCurrency}
                        onChange={(e) => setPCurrency(e.target.value as "PYG" | "USD")}
                        className="w-full rounded-xl border border-slate-200 px-2 py-2 outline-none"
                      >
                        <option value="PYG">PYG</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block font-bold text-slate-700">Precio *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={pPrice}
                        onChange={(e) => setPPrice(e.target.value)}
                        placeholder="Ej. 450000"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">
                      Precio tachado / Lista (opcional para % OFF)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={pRefPrice}
                      onChange={(e) => setPRefPrice(e.target.value)}
                      placeholder="Ej. 590000"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">SKU / Código interno</label>
                    <input
                      type="text"
                      value={pSku}
                      onChange={(e) => setPSku(e.target.value)}
                      placeholder="Ej. SKU-0042"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">Stock disponible</label>
                    <input
                      type="number"
                      min={0}
                      value={pStock}
                      onChange={(e) => setPStock(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-bold text-slate-700">Descripción</label>
                    <textarea
                      rows={2}
                      value={pDesc}
                      onChange={(e) => setPDesc(e.target.value)}
                      placeholder="Garantía, colores disponibles, envío..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-bold text-slate-700">Fotos del producto</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 font-bold text-white hover:bg-slate-800">
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingProdImg ? "Subiendo..." : "Subir fotos"}
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            try {
                              setUploadingProdImg(true);
                              const urls = await handleUploadFiles(e.target.files);
                              setPImages((prev) => [...prev, ...urls].slice(0, 10));
                            } catch (err) {
                              notifyToast(err instanceof Error ? err.message : "Error", "error");
                            } finally {
                              setUploadingProdImg(false);
                            }
                          }}
                        />
                      </label>
                      {pImages.map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt=""
                          className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewProd(false)}
                    className="rounded-xl px-3 py-2 font-bold text-slate-500 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingProd}
                    className="rounded-xl bg-emerald-600 px-4 py-2 font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {creatingProd ? "Publicando..." : "Publicar en mi Tienda 3D"}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {catalog.map((item) => {
                const img = item.images[0]?.url;
                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-xs"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {img && (
                        <img
                          src={img}
                          alt=""
                          className="h-12 w-14 shrink-0 rounded-xl object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-slate-900">{item.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="font-black text-emerald-700">
                            {formatPrice(item.price, item.currency, item.isFree)}
                          </span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">
                            {CONDITION_LABELS[item.condition] || item.condition}
                          </span>
                          {item.sku && <span className="text-slate-400">SKU: {item.sku}</span>}
                          {item.stockQuantity != null && (
                            <span className="text-slate-500">· Stock: {item.stockQuantity}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleProductStatus(item)}
                        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                          item.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        }`}
                      >
                        {item.status === "ACTIVE" ? "Activo" : "Pausado"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(item)}
                        className="rounded-lg bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100"
                        title="Eliminar producto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "csv" && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  Carga Masiva de Catálogo (CSV / Excel)
                </h2>
                <p className="mt-0.5 text-slate-500">
                  Subí decenas de productos en segundos. Soporta coma (<code>,</code>) y punto y
                  coma (<code>;</code> de Excel en español).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Download className="h-3.5 w-3.5" /> Descargar plantilla CSV
                </button>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 font-bold text-white hover:bg-slate-800">
                  <Upload className="h-3.5 w-3.5" /> Cargar archivo .csv
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      file.text().then((txt) => setCsvText(txt));
                    }}
                  />
                </label>
              </div>
            </div>

            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] outline-none focus:border-[#0067c0] focus:bg-white"
            />

            {csvResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                <p className="font-bold">
                  Resultado: {csvResult.createdCount} productos creados · {csvResult.skippedCount}{" "}
                  omitidos.
                </p>
                {csvResult.errors.length > 0 && (
                  <ul className="mt-1.5 list-disc pl-4 text-[11px] text-rose-700">
                    {csvResult.errors.map((er, i) => (
                      <li key={i}>{er}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={importingCsv}
                onClick={handleImportCsv}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {importingCsv ? "Importando..." : "Importar catálogo al Showroom 3D"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
