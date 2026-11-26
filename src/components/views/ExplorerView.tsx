"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BellPlus,
  Bookmark,
  ChevronRight,
  Filter,
  Gift,
  LayoutGrid,
  List,
  Map as MapIcon,
  MapPin,
  Percent,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ListingCard } from "@/components/ListingCard";
import { ZoneMap } from "@/components/ZoneMap";
import { CONDITION_LABELS } from "@/lib/format";

export function ExplorerView({ isMobile = false }: { isMobile?: boolean }) {
  const {
    user,
    categories,
    departments,
    commercialStores,
    listings,
    totalListings,
    loadingListings,
    filters,
    updateFilters,
    resetFilters,
    savedSearches,
    refreshSavedSearches,
    openListing,
    openPublish,
    openAuth,
    openCommercialStore,
    openRentStore,
    notifyToast,
  } = useApp();

  const [viewLayout, setViewLayout] = useState<"grid" | "list" | "map">("grid");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [savingAlert, setSavingAlert] = useState(false);
  const [alertName, setAlertName] = useState("");
  const [showSaveAlertForm, setShowSaveAlertForm] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.slug === filters.category),
    [categories, filters.category]
  );

  const selectedDept = useMemo(
    () => departments.find((d) => d.slug === filters.department),
    [departments, filters.department]
  );

  const selectedCity = useMemo(
    () => selectedDept?.cities.find((c) => c.slug === filters.city),
    [selectedDept, filters.city]
  );

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      filters.q ||
        filters.category ||
        filters.subcategory ||
        filters.department ||
        filters.city ||
        filters.neighborhood ||
        filters.currency ||
        filters.minPrice ||
        filters.maxPrice ||
        filters.minSavings ||
        filters.condition ||
        filters.isFree ||
        filters.isNegotiable ||
        filters.acceptsTrade ||
        filters.delivery ||
        filters.sellerType ||
        filters.storeSlug ||
        filters.vehicleBrand ||
        filters.vehicleYearMin ||
        filters.vehicleTransmission ||
        filters.realEstateOperation ||
        filters.realEstateType ||
        filters.bedroomsMin ||
        filters.apparelSize
    );
  }, [filters]);

  const topSavingsListings = useMemo(() => {
    return [...listings]
      .filter((l) => (l.savingsPercent ?? 0) >= 35 && !l.isFree)
      .sort((a, b) => (b.savingsPercent ?? 0) - (a.savingsPercent ?? 0))
      .slice(0, 6);
  }, [listings]);

  const handleSaveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      notifyToast("Iniciá sesión para guardar alertas de búsqueda", "info");
      openAuth();
      return;
    }
    if (!alertName.trim()) return;
    setSavingAlert(true);
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: alertName.trim(), query: filters }),
      });
      if (!res.ok) throw new Error();
      setAlertName("");
      setShowSaveAlertForm(false);
      await refreshSavedSearches();
      notifyToast("Alerta de búsqueda guardada. Te avisaremos con nuevos avisos.", "success");
    } catch {
      notifyToast("No se pudo guardar la alerta", "error");
    } finally {
      setSavingAlert(false);
    }
  };

  const breadcrumbs = [
    { label: "Paraguay", onClick: () => resetFilters() },
    ...(selectedDept
      ? [
          {
            label: selectedDept.name,
            onClick: () => updateFilters({ city: undefined, neighborhood: undefined }),
          },
        ]
      : []),
    ...(selectedCity
      ? [{ label: selectedCity.name, onClick: () => updateFilters({ neighborhood: undefined }) }]
      : []),
    ...(selectedCategory
      ? [{ label: selectedCategory.name, onClick: () => updateFilters({ subcategory: undefined }) }]
      : []),
  ];

  const renderFilterFields = () => (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-slate-600">Departamento</label>
        <select
          value={filters.department || ""}
          onChange={(e) =>
            updateFilters({
              department: e.target.value || undefined,
              city: undefined,
              neighborhood: undefined,
            })
          }
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#0067c0]"
        >
          <option value="">Todo Paraguay</option>
          {departments.map((d) => (
            <option key={d.id} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold text-slate-600">Ciudad / Distrito</label>
        <select
          value={filters.city || ""}
          disabled={!selectedDept}
          onChange={(e) =>
            updateFilters({
              city: e.target.value || undefined,
              neighborhood: undefined,
            })
          }
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#0067c0] disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">Todas las ciudades</option>
          {selectedDept?.cities.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold text-slate-600">Moneda y Rango</label>
        <div className="flex gap-1.5">
          <select
            value={filters.currency || ""}
            onChange={(e) =>
              updateFilters({ currency: e.target.value as "" | "PYG" | "USD" })
            }
            className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0067c0]"
          >
            <option value="">Todas</option>
            <option value="PYG">PYG</option>
            <option value="USD">USD</option>
          </select>
          <input
            type="number"
            placeholder="Mín"
            value={filters.minPrice || ""}
            onChange={(e) => updateFilters({ minPrice: e.target.value || undefined })}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-[#0067c0]"
          />
          <input
            type="number"
            placeholder="Máx"
            value={filters.maxPrice || ""}
            onChange={(e) => updateFilters({ maxPrice: e.target.value || undefined })}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-[#0067c0]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold text-slate-600">
          Ahorro mín. vs. nuevo
        </label>
        <select
          value={filters.minSavings || ""}
          onChange={(e) => updateFilters({ minSavings: e.target.value || undefined })}
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#0067c0]"
        >
          <option value="">Cualquier ahorro</option>
          <option value="20">Al menos 20% menos</option>
          <option value="35">Al menos 35% menos</option>
          <option value="50">Al menos 50% menos</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold text-slate-600">Entrega / Retiro</label>
        <select
          value={filters.delivery || ""}
          onChange={(e) =>
            updateFilters({
              delivery: e.target.value as "" | "pickup" | "meetup" | "local" | "national" | "visit",
            })
          }
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#0067c0]"
        >
          <option value="">Todas las modalidades</option>
          <option value="pickup">Retiro en persona</option>
          <option value="meetup">Punto de encuentro público</option>
          <option value="local">Delivery local</option>
          <option value="national">Envío a todo el país</option>
          <option value="visit">Coordinar visita (Autos/Inmuebles)</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold text-slate-600">Estado del producto</label>
        <select
          value={filters.condition || ""}
          onChange={(e) => updateFilters({ condition: e.target.value || undefined })}
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#0067c0]"
        >
          <option value="">Cualquier estado</option>
          {Object.entries(CONDITION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* Dynamic vertical filters */}
      {selectedCategory?.verticalType === "VEHICLE" && (
        <>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Marca / Año mín.
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Ej. Toyota"
                value={filters.vehicleBrand || ""}
                onChange={(e) => updateFilters({ vehicleBrand: e.target.value || undefined })}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-[#0067c0]"
              />
              <input
                type="number"
                placeholder="Año"
                value={filters.vehicleYearMin || ""}
                onChange={(e) => updateFilters({ vehicleYearMin: e.target.value || undefined })}
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-[#0067c0]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Transmisión</label>
            <select
              value={filters.vehicleTransmission || ""}
              onChange={(e) => updateFilters({ vehicleTransmission: e.target.value || undefined })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#0067c0]"
            >
              <option value="">Todas</option>
              <option value="Automática">Automática</option>
              <option value="Manual">Manual</option>
            </select>
          </div>
        </>
      )}

      {selectedCategory?.verticalType === "REAL_ESTATE" && (
        <>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Operación</label>
            <select
              value={filters.realEstateOperation || ""}
              onChange={(e) =>
                updateFilters({
                  realEstateOperation: e.target.value as "" | "SALE" | "RENT",
                })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#0067c0]"
            >
              <option value="">Venta y Alquiler</option>
              <option value="SALE">Solo Venta</option>
              <option value="RENT">Solo Alquiler</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Dormitorios mín.
            </label>
            <select
              value={filters.bedroomsMin || ""}
              onChange={(e) => updateFilters({ bedroomsMin: e.target.value || undefined })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#0067c0]"
            >
              <option value="">Cualquiera</option>
              <option value="1">1+ dormitorios</option>
              <option value="2">2+ dormitorios</option>
              <option value="3">3+ dormitorios</option>
              <option value="4">4+ dormitorios</option>
            </select>
          </div>
        </>
      )}

      {selectedCategory?.verticalType === "APPAREL" && (
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Talle</label>
          <input
            type="text"
            placeholder="Ej. M, 42, 39-43"
            value={filters.apparelSize || ""}
            onChange={(e) => updateFilters({ apparelSize: e.target.value || undefined })}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#0067c0]"
          />
        </div>
      )}

      {/* Toggles row */}
      <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-2">
        <button
          type="button"
          onClick={() => updateFilters({ isNegotiable: !filters.isNegotiable })}
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
            filters.isNegotiable
              ? "border-[#0067c0] bg-[#0067c0]/10 text-[#0067c0]"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Negociable
        </button>
        <button
          type="button"
          onClick={() => updateFilters({ acceptsTrade: !filters.acceptsTrade })}
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
            filters.acceptsTrade
              ? "border-[#0067c0] bg-[#0067c0]/10 text-[#0067c0]"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Repeat className="h-3.5 w-3.5" /> Acepta permuta
        </button>
        <button
          type="button"
          onClick={() => updateFilters({ isFree: !filters.isFree })}
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
            filters.isFree
              ? "border-emerald-600 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Gift className="h-3.5 w-3.5" /> Gratis / Regalo
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
      </div>
    </div>
  );

  // Mobile App view
  if (isMobile) {
    return (
      <div className="flex flex-col pb-6">
        {/* Search & City bar */}
        <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-3.5 pb-2.5 pt-2 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={filters.q || ""}
                onChange={(e) => updateFilters({ q: e.target.value || undefined })}
                placeholder="Buscar medias, iPhone, Corolla, casas..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#0067c0] focus:bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(true)}
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                hasActiveFilters
                  ? "border-[#0067c0] bg-[#0067c0] text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              aria-label="Filtros"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Category horizontal strip */}
          <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => updateFilters({ category: undefined, subcategory: undefined })}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                !filters.category
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              Todo
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  updateFilters({
                    category: filters.category === cat.slug ? undefined : cat.slug,
                    subcategory: undefined,
                  })
                }
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filters.category === cat.slug
                    ? "bg-[#0067c0] text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <CategoryIcon name={cat.icon} className="h-3.5 w-3.5" />
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Seller Type Filter Pills (Todos / Tiendas Oficiales / Particulares) */}
        <div className="mt-2.5 flex items-center gap-1.5 px-3.5">
          {(
            [
              { key: undefined, label: "Todos" },
              { key: "official", label: "★ Tiendas Oficiales" },
              { key: "individual", label: "Particulares" },
            ] as const
          ).map((opt) => {
            const active = filters.sellerType === opt.key;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => updateFilters({ sellerType: opt.key })}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                  active
                    ? opt.key === "official"
                      ? "bg-fuchsia-600 text-white shadow-xs"
                      : "bg-[#0067c0] text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Official Brand Stores Carousel on Mobile */}
        {!hasActiveFilters && (
          <section className="mt-3 px-3.5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Store className="h-4 w-4 text-fuchsia-600" />
                <h2 className="text-sm font-bold text-slate-900">Tiendas Oficiales 3D</h2>
              </div>
              <button
                type="button"
                onClick={() => openRentStore()}
                className="text-xs font-bold text-fuchsia-700"
              >
                + Tu Marca Aquí
              </button>
            </div>
            <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
              {commercialStores.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => openCommercialStore(st.slug, st.name)}
                  style={{ borderColor: `${st.neonColor}45` }}
                  className="flex w-48 shrink-0 items-center gap-2.5 rounded-xl border bg-white p-2.5 text-left shadow-2xs transition active:scale-[0.98]"
                >
                  {st.logoUrl ? (
                    <img
                      src={st.logoUrl}
                      alt={st.name}
                      className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-slate-900 object-contain p-1"
                    />
                  ) : (
                    <div
                      style={{ backgroundColor: st.neonColor }}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                    >
                      <Store className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-xs font-extrabold text-slate-900">
                        {st.name}
                      </span>
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-fuchsia-600" />
                    </div>
                    <p className="truncate text-[10px] text-slate-500">
                      {st.city?.name || "Paraguay"} · {st.activeListingsCount} prod.
                    </p>
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => openRentStore()}
                className="flex w-44 shrink-0 flex-col justify-center rounded-xl border border-dashed border-amber-400 bg-amber-50/75 p-2.5 text-left"
              >
                <span className="text-[11px] font-extrabold text-amber-900">
                  ★ Alquilá tu Local 3D
                </span>
                <span className="mt-0.5 text-[10px] text-amber-800/80">
                  Logo + catálogo en Avenida de Marcas
                </span>
              </button>
            </div>
          </section>
        )}

        {/* Curated savings strip on mobile home when unfiltered */}
        {!hasActiveFilters && topSavingsListings.length > 0 && (
          <section className="mt-3 px-3.5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Mayor ahorro vs. nuevo</h2>
              </div>
              <button
                type="button"
                onClick={() => updateFilters({ sort: "savings", minSavings: "35" })}
                className="text-xs font-semibold text-[#0067c0]"
              >
                Ver todos
              </button>
            </div>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
              {topSavingsListings.map((item) => (
                <ListingCard key={item.id} listing={item} compact />
              ))}
            </div>
          </section>
        )}

        {/* Active filter chips + sort */}
        <div className="mt-3 flex items-center justify-between px-3.5">
          <p className="text-xs font-semibold text-slate-500">
            {loadingListings ? "Buscando..." : `${totalListings} publicaciones en Paraguay`}
          </p>
          <select
            value={filters.sort || "recent"}
            onChange={(e) =>
              updateFilters({
                sort: e.target.value as "recent" | "savings" | "price_asc" | "price_desc",
              })
            }
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
          >
            <option value="recent">Más recientes</option>
            <option value="savings">Mayor % ahorro</option>
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
          </select>
        </div>

        {/* Save search quick banner when filtered */}
        {hasActiveFilters && (
          <div className="mx-3.5 mt-2 flex items-center justify-between rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900">
            <span className="font-medium">¿Querés alertas para esta búsqueda?</span>
            <button
              type="button"
              onClick={() => setShowSaveAlertForm((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#0067c0] px-2.5 py-1 font-semibold text-white"
            >
              <BellPlus className="h-3.5 w-3.5" /> Guardar
            </button>
          </div>
        )}

        {showSaveAlertForm && (
          <form onSubmit={handleSaveSearch} className="mx-3.5 mt-2 flex gap-2">
            <input
              type="text"
              required
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              placeholder="Ej. Autos Toyota en Asunción"
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#0067c0]"
            />
            <button
              type="submit"
              disabled={savingAlert}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
            >
              Crear
            </button>
          </form>
        )}

        {/* Results grid */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 px-3.5">
          {listings.map((item) => (
            <ListingCard key={item.id} listing={item} />
          ))}
        </div>

        {!loadingListings && listings.length === 0 && (
          <div className="mx-3.5 mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm font-bold text-slate-800">No encontramos avisos con esos filtros</p>
            <p className="mt-1 text-xs text-slate-500">
              Probá ampliando la ciudad o limpiando algún filtro.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 rounded-xl bg-[#0067c0] px-4 py-2 text-xs font-semibold text-white"
            >
              Ver todas las publicaciones
            </button>
          </div>
        )}

        {/* Mobile Filter Bottom Sheet */}
        {showAdvancedFilters && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/45 backdrop-blur-xs">
            <div className="max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-base font-bold text-slate-900">Filtrar publicaciones</h3>
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(false)}
                  className="rounded-full bg-slate-100 p-1.5 text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {renderFilterFields()}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetFilters();
                    setShowAdvancedFilters(false);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(false)}
                  className="flex-1 rounded-xl bg-[#0067c0] py-2.5 text-sm font-bold text-white"
                >
                  Ver {totalListings} resultados
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // DESKTOP WINDOWS 11 FILE EXPLORER LAYOUT
  return (
    <div className="flex h-full flex-col bg-[#f8fafd]">
      {/* Windows 11 Explorer Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-white/85 px-3.5 py-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openPublish()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0067c0] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#0058a6]"
          >
            <Plus className="h-3.5 w-3.5" /> Nuevo aviso
          </button>

          <div className="mx-1 h-5 w-px bg-slate-200" />

          <button
            type="button"
            onClick={() => setShowAdvancedFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              showAdvancedFilters || hasActiveFilters
                ? "bg-[#0067c0]/10 text-[#0067c0]"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {hasActiveFilters && (
              <span className="h-1.5 w-1.5 rounded-full bg-[#0067c0]" />
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              updateFilters({
                sort: filters.sort === "savings" ? "recent" : "savings",
                minSavings: filters.minSavings === "30" ? undefined : "30",
              })
            }
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              filters.minSavings
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Percent className="h-3.5 w-3.5" /> Mayor ahorro
          </button>

          <button
            type="button"
            onClick={() => updateFilters({ isFree: !filters.isFree })}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              filters.isFree
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Gift className="h-3.5 w-3.5" /> Gratis
          </button>

          <button
            type="button"
            onClick={() =>
              updateFilters({
                sellerType: filters.sellerType === "official" ? undefined : "official",
              })
            }
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              filters.sellerType === "official"
                ? "bg-fuchsia-100 font-semibold text-fuchsia-800"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Store className="h-3.5 w-3.5 text-fuchsia-600" /> Tiendas Oficiales
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setShowSaveAlertForm((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
            >
              <BellPlus className="h-3.5 w-3.5" /> Guardar alerta
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filters.sort || "recent"}
            onChange={(e) =>
              updateFilters({
                sort: e.target.value as "recent" | "savings" | "price_asc" | "price_desc",
              })
            }
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-[#0067c0]"
          >
            <option value="recent">Ordenar: Recientes</option>
            <option value="savings">Ordenar: Mayor % ahorro</option>
            <option value="price_asc">Ordenar: Menor precio</option>
            <option value="price_desc">Ordenar: Mayor precio</option>
          </select>

          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setViewLayout("grid")}
              title="Vista grilla"
              className={`rounded-md p-1.5 transition ${
                viewLayout === "grid"
                  ? "bg-white text-[#0067c0] shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewLayout("list")}
              title="Vista detalles"
              className={`rounded-md p-1.5 transition ${
                viewLayout === "list"
                  ? "bg-white text-[#0067c0] shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewLayout("map")}
              title="Vista mapa de zonas"
              className={`rounded-md p-1.5 transition ${
                viewLayout === "map"
                  ? "bg-white text-[#0067c0] shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Address Bar (Breadcrumbs + Search Box like Windows 11 Explorer) */}
      <div className="flex items-center gap-2 border-b border-slate-200/70 bg-white/70 px-3.5 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#0067c0]" />
          {breadcrumbs.map((bc, idx) => (
            <span key={bc.label} className="inline-flex shrink-0 items-center gap-1">
              {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
              <button
                type="button"
                onClick={bc.onClick}
                className="rounded px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-100 hover:text-[#0067c0]"
              >
                {bc.label}
              </button>
            </span>
          ))}
        </div>

        <div className="relative w-72 shrink-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={filters.q || ""}
            onChange={(e) => updateFilters({ q: e.target.value || undefined })}
            placeholder="Buscar en ReUsa PY..."
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-[#0067c0]"
          />
        </div>
      </div>

      {/* Collapsible Advanced Filter Bar */}
      {showAdvancedFilters && (
        <div className="border-b border-slate-200/80 bg-[#f1f6fc] px-4 py-3">
          {renderFilterFields()}
        </div>
      )}

      {/* Save Search Inline Form */}
      {showSaveAlertForm && (
        <form
          onSubmit={handleSaveSearch}
          className="flex items-center gap-2 border-b border-sky-200 bg-sky-50 px-4 py-2"
        >
          <BellPlus className="h-4 w-4 text-[#0067c0]" />
          <span className="text-xs font-semibold text-sky-900">Nombre de la alerta:</span>
          <input
            type="text"
            required
            value={alertName}
            onChange={(e) => setAlertName(e.target.value)}
            placeholder="Ej. Departamentos en Asunción o iPhone con +30% ahorro"
            className="flex-1 rounded-lg border border-sky-200 bg-white px-2.5 py-1 text-xs outline-none focus:border-[#0067c0]"
          />
          <button
            type="submit"
            disabled={savingAlert}
            className="rounded-lg bg-[#0067c0] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0058a6]"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setShowSaveAlertForm(false)}
            className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-white"
          >
            Cancelar
          </button>
        </form>
      )}

      {/* Main Split Pane: Windows Explorer Left Tree + Main Content */}
      <div className="flex min-h-0 flex-1">
        {/* Left Navigation Tree */}
        <aside className="fluent-scroll w-56 shrink-0 overflow-y-auto border-r border-slate-200/80 bg-white/65 p-2.5">
          <div className="mb-3">
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Acceso rápido
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition ${
                !hasActiveFilters
                  ? "bg-[#0067c0]/12 font-semibold text-[#0067c0]"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> Todo Paraguay
            </button>
            <button
              type="button"
              onClick={() => updateFilters({ sort: "savings", minSavings: "35", isFree: false })}
              className={`mt-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition ${
                filters.minSavings === "35"
                  ? "bg-emerald-50 font-semibold text-emerald-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Percent className="h-3.5 w-3.5 text-emerald-600" /> Ofertas +35% ahorro
            </button>
            <button
              type="button"
              onClick={() => updateFilters({ isFree: true, minSavings: undefined })}
              className={`mt-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition ${
                filters.isFree
                  ? "bg-emerald-50 font-semibold text-emerald-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Gift className="h-3.5 w-3.5 text-emerald-600" /> Gratis / Regalo
            </button>
          </div>

          <div className="mb-3">
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Categorías
            </p>
            <div className="space-y-0.5">
              {categories.map((cat) => {
                const active = filters.category === cat.slug;
                return (
                  <div key={cat.id}>
                    <button
                      type="button"
                      onClick={() =>
                        updateFilters({
                          category: active ? undefined : cat.slug,
                          subcategory: undefined,
                        })
                      }
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                        active
                          ? "bg-[#0067c0]/12 font-semibold text-[#0067c0]"
                          : "font-medium text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <CategoryIcon name={cat.icon} className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{cat.name}</span>
                    </button>
                    {active && cat.children && cat.children.length > 0 && (
                      <div className="ml-5 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2">
                        {cat.children.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() =>
                              updateFilters({
                                subcategory: filters.subcategory === sub.slug ? undefined : sub.slug,
                              })
                            }
                            className={`block w-full truncate rounded-md px-2 py-1 text-left text-[11px] transition ${
                              filters.subcategory === sub.slug
                                ? "bg-[#0067c0] font-semibold text-white"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-3">
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Departamentos
            </p>
            <div className="space-y-0.5">
              {departments.slice(0, 7).map((dept) => {
                const active = filters.department === dept.slug;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() =>
                      updateFilters({
                        department: active ? undefined : dept.slug,
                        city: undefined,
                        neighborhood: undefined,
                      })
                    }
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                      active
                        ? "bg-[#0067c0]/12 font-semibold text-[#0067c0]"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                    <span className="truncate">{dept.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {savedSearches.length > 0 && (
            <div>
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Mis Alertas
              </p>
              <div className="space-y-0.5">
                {savedSearches.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => updateFilters(s.query)}
                    className="flex w-full items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                  >
                    <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                      <Bookmark className="h-3 w-3 shrink-0 text-amber-500" />
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-200 px-1.5 text-[10px] font-bold text-slate-700">
                      {s.matchCount}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Canvas */}
        <div className="fluent-scroll min-w-0 flex-1 overflow-y-auto p-4">
          {viewLayout === "map" ? (
            <div className="h-full min-h-[460px]">
              <ZoneMap
                listings={listings}
                heightClass="h-full min-h-[460px]"
                onSelectListing={(slug, title) => openListing(slug, title)}
              />
            </div>
          ) : (
            <>
              {/* Avenida de Marcas — Official Brand Stores Strip */}
              {!hasActiveFilters && (
                <section className="mb-4 rounded-2xl border border-fuchsia-200/80 bg-gradient-to-r from-fuchsia-50/90 via-white to-cyan-50/80 p-3.5">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-600 to-cyan-600 text-white shadow-xs">
                        <Store className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">
                          Avenida de Marcas · Tiendas Oficiales 3D
                        </h2>
                        <p className="text-[11px] text-slate-600">
                          Locales comerciales reales en Paraguay con catálogo oficial, stock y pedido directo por WhatsApp
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateFilters({ sellerType: "official" })}
                        className="rounded-lg border border-fuchsia-200 bg-white px-2.5 py-1 text-xs font-semibold text-fuchsia-700 transition hover:bg-fuchsia-50"
                      >
                        Ver productos oficiales
                      </button>
                      <button
                        type="button"
                        onClick={() => openRentStore()}
                        className="rounded-lg bg-gradient-to-r from-amber-500 to-fuchsia-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs transition hover:brightness-110"
                      >
                        + Alquilá tu Local 3D
                      </button>
                    </div>
                  </div>
                  <div className="fluent-scroll flex gap-3 overflow-x-auto pb-1">
                    {commercialStores.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => openCommercialStore(st.slug, st.name)}
                        style={{ borderColor: `${st.neonColor}45` }}
                        className="group flex w-60 shrink-0 items-center gap-3 rounded-xl border bg-white p-2.5 text-left shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        {st.logoUrl ? (
                          <img
                            src={st.logoUrl}
                            alt={st.name}
                            className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 bg-slate-900 object-contain p-1"
                          />
                        ) : (
                          <div
                            style={{ backgroundColor: st.neonColor }}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                          >
                            <Store className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="truncate text-xs font-extrabold text-slate-900 group-hover:text-fuchsia-700">
                              {st.name}
                            </span>
                            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-fuchsia-600" />
                          </div>
                          {st.tagline && (
                            <p className="truncate text-[10.5px] text-slate-500">{st.tagline}</p>
                          )}
                          <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                            {st.city?.name || "Paraguay"} · {st.activeListingsCount} productos
                          </p>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => openRentStore()}
                      className="flex w-52 shrink-0 flex-col justify-center rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-3 text-left transition hover:border-amber-500 hover:bg-amber-50"
                    >
                      <span className="text-xs font-extrabold text-amber-900">
                        ★ LOCAL DISPONIBLE
                      </span>
                      <span className="mt-0.5 text-[10.5px] text-amber-800/80">
                        Colocá el logo y catálogo de tu negocio en ReUsa PY 3D
                      </span>
                    </button>
                  </div>
                </section>
              )}

              {/* Curated Top Savings strip when unfiltered */}
              {!hasActiveFilters && topSavingsListings.length > 0 && (
                <section className="mb-5 rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-sky-50/70 p-3.5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">
                          Mayor ahorro vs. producto nuevo
                        </h2>
                        <p className="text-[11px] text-slate-600">
                          Oportunidades verificadas con precio de referencia nuevo en Paraguay
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateFilters({ sort: "savings", minSavings: "35" })}
                      className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-xs transition hover:bg-emerald-50"
                    >
                      Ver ranking completo
                    </button>
                  </div>
                  <div className="fluent-scroll flex gap-3 overflow-x-auto pb-1">
                    {topSavingsListings.map((item) => (
                      <ListingCard key={item.id} listing={item} compact />
                    ))}
                  </div>
                </section>
              )}

              {/* Results Header */}
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h1 className="text-sm font-bold text-slate-900">
                    {filters.sellerType === "official"
                      ? "Catálogo de Tiendas Oficiales en Paraguay"
                      : selectedCategory
                      ? selectedCategory.name
                      : filters.isFree
                      ? "Artículos Gratis / Regalo"
                      : "Publicaciones recientes en Paraguay"}
                  </h1>
                  <p className="text-[11px] text-slate-500">
                    {loadingListings
                      ? "Actualizando resultados..."
                      : `${totalListings} ${
                          totalListings === 1 ? "publicación encontrada" : "publicaciones encontradas"
                        } · Abrí varios avisos en paralelo para comparar`}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-3 w-3" /> Restablecer filtros
                  </button>
                )}
              </div>

              {loadingListings && listings.length === 0 ? (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"
                    >
                      <div className="skeleton-shimmer aspect-[4/3] w-full" />
                      <div className="space-y-2 p-3">
                        <div className="skeleton-shimmer h-4 w-24 rounded-md" />
                        <div className="skeleton-shimmer h-3.5 w-full rounded-md" />
                        <div className="skeleton-shimmer h-3 w-2/3 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : listings.length === 0 && !loadingListings ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                  <p className="text-sm font-bold text-slate-800">
                    Sin resultados para esta combinación de filtros
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Podés guardar esta búsqueda como alerta o limpiar los filtros para explorar todo.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 rounded-lg bg-[#0067c0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0058a6]"
                  >
                    Ver todas las publicaciones
                  </button>
                </div>
              ) : viewLayout === "list" ? (
                <div className="space-y-2">
                  {listings.map((item) => (
                    <ListingCard key={item.id} listing={item} layout="list" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {listings.map((item) => (
                    <ListingCard key={item.id} listing={item} layout="grid" />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Windows 11 Explorer Status Footer */}
      <div className="flex items-center justify-between border-t border-slate-200/80 bg-white/80 px-3.5 py-1 text-[11px] text-slate-500">
        <span>{totalListings} elementos</span>
        <span>ReUsa PY · Precios en PYG y USD · Economía circular Paraguay</span>
      </div>
    </div>
  );
}
