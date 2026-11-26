"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Camera,
  Clock,
  ExternalLink,
  Globe,
  Link2,
  MapPin,
  Minus,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import { ZoneMap } from "@/components/ZoneMap";
import {
  buildStoreCartWhatsappUrl,
  CONDITION_LABELS,
  formatPrice,
} from "@/lib/format";
import { STORE_PLANS } from "@/lib/storePlans";
import type { CommercialStoreDTO, ListingDTO } from "@/types/marketplace";

export function CommercialStoreView({
  slug,
  onEnter3DStore,
}: {
  slug: string;
  onEnter3DStore?: (storeSlug: string) => void;
}) {
  const {
    storeCart,
    addToStoreCart,
    updateStoreCartQty,
    clearStoreCart,
    trackStoreEvent,
    openListing,
    openMerchantDashboard,
    openStoreStoryCard,
    notifyToast,
  } = useApp();

  const [store, setStore] = useState<CommercialStoreDTO | null>(null);
  const [catalog, setCatalog] = useState<ListingDTO[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [condFilter, setCondFilter] = useState<string>("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/stores/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.store) {
          setStore(data.store);
          setCatalog(data.listings ?? []);
          setCanManage(Boolean(data.canManage));
          trackStoreEvent(data.store.id, "visit");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, trackStoreEvent]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      if (condFilter && item.condition !== condFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${item.title} ${item.description} ${item.sku || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [catalog, condFilter, search]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-slate-50 p-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <RefreshCw className="h-4 w-4 animate-spin text-cyan-600" />
          Cargando Tienda Oficial...
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center bg-slate-50 p-8 text-center">
        <Store className="h-10 w-10 text-slate-400" />
        <p className="mt-2 text-base font-bold text-slate-800">Tienda no encontrada</p>
        <p className="mt-1 text-xs text-slate-500">
          Esta tienda comercial pudo haber sido pausada o no existe.
        </p>
      </div>
    );
  }

  const plan = STORE_PLANS[store.planTier];
  const cartItems = storeCart[store.id] ?? [];
  const totalCartCount = cartItems.reduce((acc, i) => acc + i.qty, 0);
  const directUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tienda/${store.slug}`
      : `https://reusa-py.vercel.app/tienda/${store.slug}`;

  const whatsappPhone = store.whatsappPhone || store.owner?.whatsappPhone || "";
  const cartWaUrl =
    whatsappPhone && cartItems.length > 0
      ? buildStoreCartWhatsappUrl(
          whatsappPhone,
          store.name,
          cartItems.map((c) => ({
            title: c.listing.title,
            qty: c.qty,
            price: c.listing.price,
            currency: c.listing.currency,
            isFree: c.listing.isFree,
            sku: c.listing.sku,
          })),
          directUrl
        )
      : null;

  const generalWaUrl = whatsappPhone
    ? `https://wa.me/${
        whatsappPhone.replace(/\D/g, "").startsWith("595")
          ? whatsappPhone.replace(/\D/g, "")
          : `595${whatsappPhone.replace(/\D/g, "").replace(/^0/, "")}`
      }?text=${encodeURIComponent(`Hola ${store.name}! Vi su Tienda Oficial 3D en ReUsa PY (${directUrl}).`)}`
    : null;

  return (
    <div className="fluent-scroll flex h-full flex-col overflow-y-auto bg-[#f6f8fc]">
      {/* Branded Hero Banner */}
      <div
        className="relative overflow-hidden border-b border-slate-200 px-4 py-5 text-white sm:px-6"
        style={{
          background: `linear-gradient(125deg, #120926 0%, #1e1142 58%, ${store.neonColor}44 100%)`,
        }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-slate-950/90 p-1 shadow-lg"
              style={{ borderColor: store.neonColor }}
            >
              {store.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xl font-black text-white">
                  {store.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase text-slate-950"
                  style={{ backgroundColor: store.neonColor }}
                >
                  <BadgeCheck className="h-3 w-3" /> {plan.badge}
                </span>
                {store.city && (
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-slate-100">
                    {store.city.name}
                    {store.department ? `, ${store.department.name}` : ""}
                  </span>
                )}
              </div>
              <h1 className="mt-1 truncate text-xl font-black tracking-tight text-white">
                {store.name}
              </h1>
              <p className="text-xs text-cyan-100/90">{store.tagline}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onEnter3DStore && (
              <button
                type="button"
                onClick={() => onEnter3DStore(store.slug)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#38bdf8] px-3 py-2 text-xs font-black text-slate-950 shadow-md hover:brightness-110"
              >
                <Sparkles className="h-3.5 w-3.5" /> Entrar al Showroom 3D
              </button>
            )}
            <button
              type="button"
              onClick={() => openStoreStoryCard(store, catalog)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff2a9d] to-fuchsia-600 px-3 py-2 text-xs font-extrabold text-white shadow-md hover:brightness-110"
            >
              <Sparkles className="h-3.5 w-3.5" /> Placa IG / WhatsApp
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(directUrl)
                  .then(() => notifyToast("Link directo de la tienda copiado", "success"))
                  .catch(() => {});
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"
            >
              <Link2 className="h-3.5 w-3.5" /> Copiar link
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => openMerchantDashboard(store.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-amber-300"
              >
                <Settings className="h-3.5 w-3.5" /> Gestionar tienda
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 p-4 lg:grid-cols-12">
        {/* Left: Store Info + Cart + Map */}
        <div className="space-y-4 lg:col-span-4">
          {/* Quick Multi-Item WhatsApp Cart */}
          <div className="rounded-2xl border-2 border-emerald-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-extrabold text-slate-900">
                  Pedido rápido ({totalCartCount})
                </h2>
              </div>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearStoreCart(store.id)}
                  className="text-[11px] font-semibold text-rose-500 hover:underline"
                >
                  Vaciar
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Sumá varios productos de <strong>{store.name}</strong> y enviá el pedido completo
                por WhatsApp en 1 clic.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {cartItems.map((ci) => (
                  <div
                    key={ci.listing.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-800">{ci.listing.title}</p>
                      <p className="text-[11px] font-semibold text-emerald-700">
                        {formatPrice(ci.listing.price * ci.qty, ci.listing.currency, ci.listing.isFree)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateStoreCartQty(store.id, ci.listing.id, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-700 shadow-xs hover:bg-rose-50 hover:text-rose-600"
                      >
                        {ci.qty === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      </button>
                      <span className="w-5 text-center font-bold">{ci.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateStoreCartQty(store.id, ci.listing.id, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-700 shadow-xs hover:bg-emerald-50 hover:text-emerald-600"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {cartWaUrl ? (
                  <a
                    href={cartWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackStoreEvent(store.id, "whatsapp_click")}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <Phone className="h-4 w-4" /> Enviar pedido completo por WhatsApp
                  </a>
                ) : (
                  <p className="text-[11px] text-amber-700">
                    Esta tienda aún no cargó un número de WhatsApp.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Real Branch Details Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <h2 className="text-sm font-extrabold text-slate-900">Información del Local</h2>
            {store.description && (
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{store.description}</p>
            )}
            <ul className="mt-3 space-y-2 text-xs text-slate-700">
              {store.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0067c0]" />
                  <span>{store.address}</span>
                </li>
              )}
              {store.openingHours && (
                <li className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span>{store.openingHours}</span>
                </li>
              )}
            </ul>

            <div className="mt-3 flex flex-wrap gap-2">
              {generalWaUrl && (
                <a
                  href={generalWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackStoreEvent(store.id, "whatsapp_click")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <Phone className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
              {store.instagramUrl && (
                <a
                  href={store.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-pink-50 px-2.5 py-1.5 text-xs font-bold text-pink-700 hover:bg-pink-100"
                >
                  <Camera className="h-3.5 w-3.5" /> Instagram
                </a>
              )}
              {store.websiteUrl && (
                <a
                  href={store.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100"
                >
                  <Globe className="h-3.5 w-3.5" /> Sitio Web
                </a>
              )}
            </div>

            {catalog.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <ZoneMap listings={[catalog[0]]} singleMode heightClass="h-36" />
              </div>
            )}
          </div>
        </div>

        {/* Right: Searchable Store Catalog */}
        <div className="space-y-3 lg:col-span-8">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Buscar en ${store.name} (nombre o SKU)...`}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-[#0067c0] focus:bg-white"
              />
            </div>
            <select
              value={condFilter}
              onChange={(e) => setCondFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">Todos ({catalog.length})</option>
              <option value="BRAND_NEW">Nuevos</option>
              <option value="OUTLET">Outlet / Exhibición</option>
              <option value="LIKE_NEW">Como nuevos</option>
            </select>
          </div>

          {filteredCatalog.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              No hay productos que coincidan con tu búsqueda en este catálogo.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredCatalog.map((item) => {
                const cover = item.images.find((i) => i.isCover)?.url || item.images[0]?.url;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition hover:border-cyan-400 hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        trackStoreEvent(store.id, "product_click");
                        openListing(item.slug, item.title);
                      }}
                      className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 text-left"
                    >
                      {cover && (
                        <img
                          src={cover}
                          alt={item.title}
                          className="h-full w-full object-cover transition hover:scale-105"
                        />
                      )}
                      <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs ${
                            item.condition === "BRAND_NEW"
                              ? "bg-sky-600"
                              : item.condition === "OUTLET"
                              ? "bg-amber-600"
                              : "bg-slate-800"
                          }`}
                        >
                          {CONDITION_LABELS[item.condition] || item.condition}
                        </span>
                        {item.savingsPercent && (
                          <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                            -{item.savingsPercent}%
                          </span>
                        )}
                      </div>
                      {item.stockQuantity != null && (
                        <span className="absolute bottom-2 right-2 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-white">
                          Stock: {item.stockQuantity}
                        </span>
                      )}
                    </button>

                    <div className="flex flex-1 flex-col p-3">
                      <button
                        type="button"
                        onClick={() => {
                          trackStoreEvent(store.id, "product_click");
                          openListing(item.slug, item.title);
                        }}
                        className="line-clamp-2 text-left text-xs font-extrabold text-slate-900 hover:text-[#0067c0]"
                      >
                        {item.title}
                      </button>

                      {item.sku && (
                        <span className="mt-0.5 text-[10px] font-medium text-slate-400">
                          SKU: {item.sku}
                        </span>
                      )}

                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-base font-black text-slate-900">
                          {formatPrice(item.price, item.currency, item.isFree)}
                        </span>
                        {item.referenceNewPrice && item.referenceNewPrice > item.price && (
                          <span className="text-[11px] text-slate-400 line-through">
                            {formatPrice(item.referenceNewPrice, item.currency)}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            trackStoreEvent(store.id, "product_click");
                            addToStoreCart(store.id, item);
                          }}
                          className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-2 text-[11px] font-extrabold text-white hover:bg-emerald-700"
                        >
                          <Plus className="h-3.5 w-3.5" /> Sumar al pedido
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            trackStoreEvent(store.id, "product_click");
                            openListing(item.slug, item.title);
                          }}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-2.5 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Ficha
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
