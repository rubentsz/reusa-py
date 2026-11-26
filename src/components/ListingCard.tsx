"use client";

import {
  ArrowDownRight,
  BadgeCheck,
  Car,
  Heart,
  Home,
  MapPin,
  Repeat,
  Tag,
  Truck,
} from "lucide-react";
import type { ListingDTO } from "@/types/marketplace";
import {
  CONDITION_LABELS,
  formatPrice,
  formatRelativeDate,
  REAL_ESTATE_OP_LABELS,
} from "@/lib/format";
import { useApp } from "@/components/AppContext";

interface ListingCardProps {
  listing: ListingDTO;
  layout?: "grid" | "list";
  compact?: boolean;
}

export function ListingCard({ listing, layout = "grid", compact = false }: ListingCardProps) {
  const { favoriteIds, toggleFavorite, openListing, openCommercialStore } = useApp();
  const isFav = favoriteIds.has(listing.id);
  const cover = listing.images.find((i) => i.isCover)?.url || listing.images[0]?.url;
  const locationLabel = [listing.neighborhood?.name, listing.city.name].filter(Boolean).join(", ");
  const hasPriceDrop =
    !listing.isFree && listing.previousPrice && listing.previousPrice > listing.price;

  const verticalMeta = (() => {
    if (listing.category.verticalType === "VEHICLE") {
      return [
        listing.vehicleYear ? String(listing.vehicleYear) : null,
        listing.vehicleMileageKm != null
          ? `${listing.vehicleMileageKm.toLocaleString("es-PY")} km`
          : null,
        listing.vehicleTransmission,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    if (listing.category.verticalType === "REAL_ESTATE") {
      return [
        listing.realEstateOperation ? REAL_ESTATE_OP_LABELS[listing.realEstateOperation] : null,
        listing.bedrooms ? `${listing.bedrooms} dorm.` : null,
        listing.areaBuiltM2 ? `${listing.areaBuiltM2} m²` : listing.areaTotalM2 ? `${listing.areaTotalM2} m²` : null,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    if (listing.category.verticalType === "APPAREL") {
      return [
        listing.apparelSize ? `Talle ${listing.apparelSize}` : null,
        listing.apparelBrand,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    return CONDITION_LABELS[listing.condition] || listing.condition;
  })();

  if (layout === "list") {
    return (
      <article
        onClick={() => openListing(listing.slug, listing.title)}
        className="group flex cursor-pointer items-center gap-3.5 rounded-xl border border-slate-200/80 bg-white/95 p-2.5 transition hover:border-[#0067c0]/35 hover:bg-[#f7fbff] hover:shadow-sm"
      >
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {cover && (
            <img
              src={cover}
              alt={listing.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          )}
          {listing.isFree && (
            <span className="absolute left-1.5 top-1.5 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              GRATIS
            </span>
          )}
          {!listing.isFree && listing.savingsPercent && (
            <span className="absolute left-1.5 top-1.5 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              -{listing.savingsPercent}%
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {listing.store && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCommercialStore(listing.store!.slug, listing.store!.name);
                  }}
                  className="mb-0.5 inline-flex max-w-full items-center gap-1 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 text-[10px] font-bold text-fuchsia-800 transition hover:bg-fuchsia-100"
                >
                  <BadgeCheck className="h-3 w-3 shrink-0 text-fuchsia-600" />
                  <span className="truncate">Tienda Oficial · {listing.store.name}</span>
                </button>
              )}
              <h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-[#0067c0]">
                {listing.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(listing.id);
              }}
              aria-label="Guardar favorito"
              className={`rounded-lg p-1.5 transition ${
                isFav
                  ? "bg-rose-50 text-rose-500"
                  : "text-slate-400 hover:bg-slate-100 hover:text-rose-500"
              }`}
            >
              <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
            </button>
          </div>

          <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
            <span className="text-base font-extrabold text-slate-900">
              {formatPrice(listing.price, listing.currency, listing.isFree)}
            </span>
            {!listing.isFree && listing.referenceNewPrice && (
              <span className="text-xs text-slate-400 line-through">
                Nuevo: {formatPrice(listing.referenceNewPrice, listing.currency)}
              </span>
            )}
            {listing.realEstateOperation === "RENT" && (
              <span className="text-xs font-medium text-slate-500">/mes</span>
            )}
            {listing.condition === "BRAND_NEW" && (
              <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] font-bold text-cyan-800">
                Nuevo
              </span>
            )}
            {listing.condition === "OUTLET" && (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                Outlet
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {locationLabel}
            </span>
            {verticalMeta && <span>{verticalMeta}</span>}
            {listing.acceptsTrade && (
              <span className="inline-flex items-center gap-1 font-medium text-sky-700">
                <Repeat className="h-3 w-3" /> Permuta
              </span>
            )}
            <span className="ml-auto text-[11px] text-slate-400">
              {formatRelativeDate(listing.createdAt)}
            </span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={() => openListing(listing.slug, listing.title)}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-[#0067c0]/35 hover:shadow-md ${
        compact ? "w-[228px] shrink-0" : "w-full"
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {cover && (
          <img
            src={cover}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        )}

        {/* Top-left badges */}
        <div className="absolute left-2 top-2 flex flex-wrap items-center gap-1">
          {listing.isFree && (
            <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold tracking-tight text-white shadow-sm">
              GRATIS
            </span>
          )}
          {listing.condition === "BRAND_NEW" && (
            <span className="rounded-md bg-cyan-600/95 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
              Nuevo
            </span>
          )}
          {listing.condition === "OUTLET" && (
            <span className="rounded-md bg-amber-600/95 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
              Outlet
            </span>
          )}
          {!listing.isFree && listing.savingsPercent && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-600/95 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-xs">
              <Tag className="h-3 w-3" />-{listing.savingsPercent}%
            </span>
          )}
          {listing.realEstateOperation && (
            <span className="rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
              {REAL_ESTATE_OP_LABELS[listing.realEstateOperation]}
            </span>
          )}
        </div>

        {/* Status overlay if reserved/sold */}
        {listing.status !== "ACTIVE" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45 backdrop-blur-[1px]">
            <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-900 shadow">
              {listing.status === "RESERVED"
                ? "Reservado"
                : listing.status === "SOLD"
                ? "Vendido"
                : "Pausado"}
            </span>
          </div>
        )}

        {/* Favorite button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(listing.id);
          }}
          aria-label={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
          className={`absolute right-2 top-2 rounded-full p-1.5 shadow-sm backdrop-blur-md transition ${
            isFav
              ? "bg-rose-500 text-white"
              : "bg-white/85 text-slate-700 hover:bg-white hover:text-rose-500"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-current" : ""}`} />
        </button>

        {/* Bottom-left delivery/price-drop badge */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
          {hasPriceDrop && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/95 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <ArrowDownRight className="h-3 w-3" /> Bajó de precio
            </span>
          )}
          {listing.localDeliveryFree && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              <Truck className="h-3 w-3" /> Delivery gratis
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        {listing.store && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openCommercialStore(listing.store!.slug, listing.store!.name);
            }}
            className="mb-1 inline-flex w-fit max-w-full items-center gap-1 rounded-full border border-fuchsia-200/90 bg-fuchsia-50/90 px-2 py-0.5 text-[10px] font-bold text-fuchsia-800 transition hover:bg-fuchsia-100"
          >
            <BadgeCheck className="h-3 w-3 shrink-0 text-fuchsia-600" />
            <span className="truncate">{listing.store.name}</span>
          </button>
        )}

        <div className="flex items-baseline justify-between gap-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[16px] font-extrabold tracking-tight text-slate-900">
              {formatPrice(listing.price, listing.currency, listing.isFree)}
            </span>
            {listing.realEstateOperation === "RENT" && (
              <span className="text-[11px] font-medium text-slate-500">/mes</span>
            )}
          </div>
          {listing.isNegotiable && !listing.isFree && (
            <span className="text-[10px] font-semibold text-[#0067c0]">Negociable</span>
          )}
        </div>

        {!listing.isFree && listing.referenceNewPrice && (
          <p className="mt-0.5 text-[11px] text-slate-500">
            {listing.condition === "BRAND_NEW" || listing.condition === "OUTLET"
              ? "Precio lista:"
              : "Nuevo ref.:"}{" "}
            <span className="line-through">
              {formatPrice(listing.referenceNewPrice, listing.currency)}
            </span>
          </p>
        )}

        <h3 className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug text-slate-800 group-hover:text-[#0067c0]">
          {listing.title}
        </h3>

        {verticalMeta && (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-slate-500">
            {listing.category.verticalType === "VEHICLE" && <Car className="h-3 w-3 text-slate-400" />}
            {listing.category.verticalType === "REAL_ESTATE" && <Home className="h-3 w-3 text-slate-400" />}
            <span className="truncate">{verticalMeta}</span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5 text-[11px] text-slate-500">
          <span className="inline-flex min-w-0 items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{locationLabel}</span>
          </span>
          {listing.acceptsTrade ? (
            <span className="shrink-0 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
              Permuta
            </span>
          ) : (
            <span className="shrink-0 text-[10px] text-slate-400">
              {formatRelativeDate(listing.createdAt)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
