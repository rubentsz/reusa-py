"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  CalendarClock,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Flag,
  Heart,
  Home,
  Link2,
  MapPin,
  Maximize2,
  MessageCircle,
  Pencil,
  Phone,
  RefreshCw,
  Repeat,
  Share2,
  ShieldAlert,
  Shirt,
  Star,
  Tag,
  Trash2,
  Truck,
  Users,
  X,
} from "lucide-react";
import type { ListingDTO, ListingStatus } from "@/types/marketplace";
import { useApp } from "@/components/AppContext";
import { ZoneMap } from "@/components/ZoneMap";
import {
  buildWhatsappUrl,
  CONDITION_LABELS,
  daysUntilExpiry,
  extractDomain,
  formatPrice,
  formatRelativeDate,
  REAL_ESTATE_OP_LABELS,
  STATUS_LABELS,
} from "@/lib/format";

export function ListingDetailView({
  slug,
  onClose,
}: {
  slug: string;
  onClose?: () => void;
}) {
  const {
    user,
    favoriteIds,
    toggleFavorite,
    startChatForListing,
    openProfile,
    openPublish,
    openAuth,
    refreshListings,
    notifyToast,
  } = useApp();

  const [listing, setListing] = useState<ListingDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Owner quick actions
  const [showDropPrice, setShowDropPrice] = useState(false);
  const [newPriceInput, setNewPriceInput] = useState("");
  const [updating, setUpdating] = useState(false);

  // Report modal
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("Precio o producto engañoso");
  const [reportDetails, setReportDetails] = useState("");
  const [sendingReport, setSendingReport] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/listings/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.listing) {
          setListing(data.listing);
          setActivePhotoIdx(0);
          setLightboxOpen(false);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!lightboxOpen || !listing) return;
    const total = listing.images.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setLightboxOpen(false);
      } else if (e.key === "ArrowLeft" && total > 1) {
        setActivePhotoIdx((i) => (i === 0 ? total - 1 : i - 1));
      } else if (e.key === "ArrowRight" && total > 1) {
        setActivePhotoIdx((i) => (i === total - 1 ? 0 : i + 1));
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [lightboxOpen, listing]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-white p-8">
        <div className="flex items-center gap-2.5 text-sm font-medium text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin text-[#0067c0]" />
          Cargando publicación...
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center bg-white p-8 text-center">
        <p className="text-base font-bold text-slate-800">Publicación no encontrada</p>
        <p className="mt-1 text-xs text-slate-500">Puede haber sido eliminada por su dueño.</p>
      </div>
    );
  }

  const isOwner = user && (user.id === listing.sellerId || user.role === "ADMIN");
  const isFav = favoriteIds.has(listing.id);
  const images = listing.images.length > 0 ? listing.images : [];
  const currentImg = images[activePhotoIdx]?.url;
  const locationText = [listing.neighborhood?.name, listing.city.name, listing.department.name]
    .filter(Boolean)
    .join(", ");
  const savingsAmount =
    !listing.isFree && listing.referenceNewPrice && listing.referenceNewPrice > listing.price
      ? listing.referenceNewPrice - listing.price
      : null;
  const refDomain = extractDomain(listing.referenceNewUrl);
  const daysLeft = daysUntilExpiry(listing.expiresAt);
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/aviso/${listing.slug}` : undefined;

  const handleStatusChange = async (status: ListingStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setListing(data.listing);
      await refreshListings();
      notifyToast(`Estado actualizado a ${STATUS_LABELS[status]}`, "success");
    } catch {
      notifyToast("No se pudo cambiar el estado", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handlePriceDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(newPriceInput);
    if (!parsed || parsed <= 0 || parsed >= listing.price) {
      notifyToast("Ingresá un precio menor al actual para notificar la baja", "error");
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setListing(data.listing);
      setShowDropPrice(false);
      setNewPriceInput("");
      await refreshListings();
      notifyToast("¡Precio bajado! Notificamos a quienes lo guardaron en favoritos.", "success");
    } catch {
      notifyToast("No se pudo bajar el precio", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleRenew = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renew: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setListing(data.listing);
      notifyToast("Publicación renovada por 60 días más", "success");
    } catch {
      notifyToast("No se pudo renovar", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Seguro que querés eliminar esta publicación permanentemente?")) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await refreshListings();
      notifyToast("Publicación eliminada", "info");
      onClose?.();
    } catch {
      notifyToast("No se pudo eliminar", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuth();
      return;
    }
    setSendingReport(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      if (!res.ok) throw new Error();
      setShowReportForm(false);
      setReportDetails("");
      notifyToast("Denuncia enviada al equipo de moderación. ¡Gracias!", "success");
    } catch {
      notifyToast("Error al enviar la denuncia", "error");
    } finally {
      setSendingReport(false);
    }
  };

  return (
    <div className="fluent-scroll flex h-full flex-col overflow-y-auto bg-[#f8fafd]">
      {/* Owner Management Ribbon */}
      {isOwner && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200 bg-sky-50/90 px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-sky-900">Tu aviso:</span>
            {(["ACTIVE", "RESERVED", "SOLD", "PAUSED"] as ListingStatus[]).map((st) => (
              <button
                key={st}
                type="button"
                disabled={updating}
                onClick={() => handleStatusChange(st)}
                className={`rounded-md px-2 py-1 font-semibold transition ${
                  listing.status === st
                    ? "bg-[#0067c0] text-white"
                    : "bg-white text-slate-700 hover:bg-sky-100"
                }`}
              >
                {STATUS_LABELS[st]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {!listing.isFree && (
              <button
                type="button"
                onClick={() => setShowDropPrice((v) => !v)}
                className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 font-semibold text-white hover:bg-amber-600"
              >
                <ArrowDownRight className="h-3.5 w-3.5" /> Bajar precio
              </button>
            )}
            <button
              type="button"
              disabled={updating}
              onClick={handleRenew}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100"
            >
              <CalendarClock className="h-3.5 w-3.5" /> Renovar ({daysLeft}d)
            </button>
            <button
              type="button"
              onClick={() => openPublish(listing.id)}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={handleDelete}
              className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2.5 py-1 font-semibold text-rose-600 hover:bg-rose-100"
            >
              <Trash2 className="h-3.5 w-3.5" /> Eliminar
            </button>
          </div>
        </div>
      )}

      {showDropPrice && isOwner && (
        <form
          onSubmit={handlePriceDrop}
          className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs"
        >
          <span className="font-semibold text-amber-900">
            Nuevo precio en {listing.currency} (actual: {formatPrice(listing.price, listing.currency)}):
          </span>
          <input
            type="number"
            required
            value={newPriceInput}
            onChange={(e) => setNewPriceInput(e.target.value)}
            placeholder="Ej. 850000"
            className="w-36 rounded-lg border border-amber-300 bg-white px-2.5 py-1 outline-none"
          />
          <button
            type="submit"
            disabled={updating}
            className="rounded-lg bg-amber-600 px-3 py-1 font-bold text-white hover:bg-amber-700"
          >
            Aplicar rebaja
          </button>
        </form>
      )}

      {/* Main Content Body */}
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 p-4 md:grid-cols-12">
        {/* Left Column: Gallery + Description + Vertical Specs + Map */}
        <div className="space-y-4 md:col-span-7">
          {/* Photo Gallery */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="group relative aspect-[4/3] w-full bg-slate-900/5">
              {currentImg && (
                <img
                  src={currentImg}
                  alt={listing.title}
                  onClick={() => setLightboxOpen(true)}
                  className="h-full w-full cursor-zoom-in object-cover transition duration-300 group-hover:scale-[1.01]"
                />
              )}
              {currentImg && (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  title="Ampliar foto en pantalla completa"
                  className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-slate-900/75 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md backdrop-blur-xs transition hover:bg-slate-900"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> Ampliar
                </button>
              )}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoIdx((i) => (i === 0 ? images.length - 1 : i - 1))
                    }
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow-md hover:bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoIdx((i) => (i === images.length - 1 ? 0 : i + 1))
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow-md hover:bg-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <span className="absolute bottom-2.5 right-2.5 rounded-full bg-slate-900/75 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    {activePhotoIdx + 1} / {images.length}
                  </span>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-2.5">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`h-14 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                      idx === activePhotoIdx
                        ? "border-[#0067c0]"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Descripción</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {listing.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>
                Estado: <strong className="text-slate-800">{CONDITION_LABELS[listing.condition]}</strong>
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> {listing.viewsCount} visitas
              </span>
              <span>·</span>
              <span>Publicado {formatRelativeDate(listing.createdAt)}</span>
            </div>
          </div>

          {/* Category-Specific Technical Sheet */}
          {listing.category.verticalType === "VEHICLE" && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <div className="mb-3 flex items-center gap-2">
                <Car className="h-4 w-4 text-[#0067c0]" />
                <h2 className="text-sm font-bold text-slate-900">Ficha del Vehículo</h2>
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs sm:grid-cols-3">
                {listing.vehicleBrand && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Marca</span>
                    <strong className="text-slate-900">{listing.vehicleBrand}</strong>
                  </div>
                )}
                {listing.vehicleModel && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Modelo</span>
                    <strong className="text-slate-900">{listing.vehicleModel}</strong>
                  </div>
                )}
                {listing.vehicleYear && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Año</span>
                    <strong className="text-slate-900">{listing.vehicleYear}</strong>
                  </div>
                )}
                {listing.vehicleMileageKm != null && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Kilometraje</span>
                    <strong className="text-slate-900">
                      {listing.vehicleMileageKm.toLocaleString("es-PY")} km
                    </strong>
                  </div>
                )}
                {listing.vehicleFuel && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Combustible</span>
                    <strong className="text-slate-900">{listing.vehicleFuel}</strong>
                  </div>
                )}
                {listing.vehicleTransmission && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Transmisión</span>
                    <strong className="text-slate-900">{listing.vehicleTransmission}</strong>
                  </div>
                )}
                {listing.vehicleDocs && (
                  <div className="col-span-2 rounded-xl bg-emerald-50/70 p-2.5 sm:col-span-3">
                    <span className="block text-[10px] text-emerald-700">Documentación</span>
                    <strong className="text-emerald-950">{listing.vehicleDocs}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {listing.category.verticalType === "REAL_ESTATE" && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <div className="mb-3 flex items-center gap-2">
                <Home className="h-4 w-4 text-[#0067c0]" />
                <h2 className="text-sm font-bold text-slate-900">Ficha del Inmueble</h2>
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs sm:grid-cols-3">
                {listing.realEstateOperation && (
                  <div className="rounded-xl bg-sky-50 p-2.5">
                    <span className="block text-[10px] text-sky-700">Operación</span>
                    <strong className="text-sky-950">
                      {REAL_ESTATE_OP_LABELS[listing.realEstateOperation]}
                    </strong>
                  </div>
                )}
                {listing.realEstateType && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Tipo</span>
                    <strong className="text-slate-900">{listing.realEstateType}</strong>
                  </div>
                )}
                {listing.areaTotalM2 && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Sup. Terreno</span>
                    <strong className="text-slate-900">{listing.areaTotalM2} m²</strong>
                  </div>
                )}
                {listing.areaBuiltM2 && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Sup. Construida</span>
                    <strong className="text-slate-900">{listing.areaBuiltM2} m²</strong>
                  </div>
                )}
                {listing.bedrooms != null && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Dormitorios</span>
                    <strong className="text-slate-900">{listing.bedrooms}</strong>
                  </div>
                )}
                {listing.bathrooms != null && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Baños</span>
                    <strong className="text-slate-900">{listing.bathrooms}</strong>
                  </div>
                )}
                {listing.parkingSpaces != null && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Cocheras</span>
                    <strong className="text-slate-900">{listing.parkingSpaces}</strong>
                  </div>
                )}
                {listing.furnished != null && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Amoblado</span>
                    <strong className="text-slate-900">{listing.furnished ? "Sí" : "No"}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {listing.category.verticalType === "APPAREL" && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <div className="mb-3 flex items-center gap-2">
                <Shirt className="h-4 w-4 text-[#0067c0]" />
                <h2 className="text-sm font-bold text-slate-900">Detalles de Ropa / Calzado</h2>
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                {listing.apparelSize && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Talle</span>
                    <strong className="text-slate-900">{listing.apparelSize}</strong>
                  </div>
                )}
                {listing.apparelBrand && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Marca</span>
                    <strong className="text-slate-900">{listing.apparelBrand}</strong>
                  </div>
                )}
                {listing.apparelGender && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] text-slate-500">Estilo</span>
                    <strong className="text-slate-900">{listing.apparelGender}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Approximate Location Zone Map */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#0067c0]" />
                <h2 className="text-sm font-bold text-slate-900">Zona aproximada</h2>
              </div>
              <span className="text-xs font-medium text-slate-500">{locationText}</span>
            </div>
            <ZoneMap listings={[listing]} singleMode heightClass="h-52" />
          </div>
        </div>

        {/* Right Column: Price + Savings vs New + Delivery + Contact + Seller */}
        <div className="space-y-4 md:col-span-5">
          {/* Price & Deal Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                  {listing.category.name}
                </span>
                {listing.subcategory && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                    {listing.subcategory.name}
                  </span>
                )}
                {listing.status !== "ACTIVE" && (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-800">
                    {STATUS_LABELS[listing.status]}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggleFavorite(listing.id)}
                className={`rounded-full p-2 transition ${
                  isFav
                    ? "bg-rose-50 text-rose-500"
                    : "bg-slate-100 text-slate-500 hover:text-rose-500"
                }`}
                aria-label="Favorito"
              >
                <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
              </button>
            </div>

            <h1 className="mt-2.5 text-lg font-extrabold leading-snug text-slate-900">
              {listing.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                {formatPrice(listing.price, listing.currency, listing.isFree)}
              </span>
              {listing.realEstateOperation === "RENT" && (
                <span className="text-xs font-semibold text-slate-500">/mes</span>
              )}
              {listing.previousPrice && listing.previousPrice > listing.price && !listing.isFree && (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                  <ArrowDownRight className="h-3.5 w-3.5" /> Antes{" "}
                  {formatPrice(listing.previousPrice, listing.currency)}
                </span>
              )}
            </div>

            {/* Flexible Deal Flags */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {listing.isNegotiable && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-[#0067c0]">
                  <Tag className="h-3 w-3" /> Precio negociable
                </span>
              )}
              {listing.acceptsTrade && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                  <Repeat className="h-3 w-3" /> Acepta permuta / parte de pago
                </span>
              )}
            </div>

            {/* Reference New Product Comparison Card */}
            {(!listing.isFree && (listing.referenceNewPrice || listing.referenceNewUrl)) && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/75 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-900">
                    Comparativa vs. producto nuevo
                  </span>
                  {listing.savingsPercent && (
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-extrabold text-white shadow-xs">
                      Ahorrás {listing.savingsPercent}%
                    </span>
                  )}
                </div>

                {listing.referenceNewPrice && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-800">Precio nuevo de referencia:</span>
                      <span className="font-bold text-emerald-950 line-through">
                        {formatPrice(listing.referenceNewPrice, listing.currency)}
                      </span>
                    </div>
                    {savingsAmount && (
                      <div className="flex justify-between text-xs">
                        <span className="text-emerald-800">Te ahorrás comprando usado:</span>
                        <span className="font-extrabold text-emerald-700">
                          {formatPrice(savingsAmount, listing.currency)}
                        </span>
                      </div>
                    )}
                    {listing.savingsPercent && (
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-emerald-200/80">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{ width: `${Math.min(100, listing.savingsPercent)}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {listing.referenceNewUrl && (
                  <a
                    href={listing.referenceNewUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-2.5 flex items-center justify-between rounded-lg border border-emerald-300/80 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
                  >
                    <span className="truncate">
                      Ver producto nuevo en {refDomain || "tienda externa"}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                )}
                <p className="mt-1.5 text-[10px] text-emerald-800/75">
                  Referencia cargada por el vendedor. Verificá siempre el estado antes de comprar.
                </p>
              </div>
            )}

            {/* Contact CTA Buttons */}
            {!isOwner && (
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => startChatForListing(listing.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0067c0] py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#0058a6]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chatear con {listing.seller.name.split(" ")[0]}
                </button>

                {listing.showWhatsapp && listing.seller.whatsappPhone && (
                  <a
                    href={buildWhatsappUrl(
                      listing.seller.whatsappPhone,
                      listing.title,
                      shareUrl
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    <Phone className="h-4 w-4" />
                    Consultar por WhatsApp
                  </a>
                )}
              </div>
            )}

            {/* Share Listing Row */}
            <div className="mt-3.5 flex items-center gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  const targetUrl =
                    shareUrl || `https://reusa-py.vercel.app/aviso/${listing.slug}`;
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard
                      .writeText(targetUrl)
                      .then(() => notifyToast("Enlace del aviso copiado", "success"))
                      .catch(() => notifyToast("No se pudo copiar el enlace", "error"));
                  } else {
                    notifyToast(targetUrl, "info");
                  }
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
              >
                <Link2 className="h-3.5 w-3.5 text-[#0067c0]" />
                Copiar enlace
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Mirá este aviso en ReUsa PY: ${listing.title} (${formatPrice(
                    listing.price,
                    listing.currency,
                    listing.isFree
                  )}) ${shareUrl || ""}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
              >
                <Share2 className="h-3.5 w-3.5" />
                Compartir WhatsApp
              </a>
            </div>
          </div>

          {/* Delivery & Pickup Options Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <h2 className="mb-2.5 text-sm font-bold text-slate-900">Entrega y coordinación</h2>
            <ul className="space-y-2 text-xs text-slate-700">
              {listing.scheduleVisitOnly ? (
                <li className="flex items-start gap-2 rounded-xl bg-sky-50/80 p-2.5 text-sky-950">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#0067c0]" />
                  <div>
                    <strong className="block">Coordinar visita / ver en persona</strong>
                    <span className="text-[11px] text-sky-800">
                      Acordá día y hora con el vendedor para revisar documentación y estado.
                    </span>
                  </div>
                </li>
              ) : (
                <>
                  {listing.pickupInPerson && (
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>
                        <strong>Retiro en persona</strong> por {locationText} (dirección exacta por chat)
                      </span>
                    </li>
                  )}
                  {listing.publicMeetup && (
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>
                        <strong>Punto de encuentro público</strong> (shopping, estación de servicio, etc.)
                      </span>
                    </li>
                  )}
                  {listing.localDelivery && (
                    <li className="flex items-center gap-2">
                      <Truck className="h-4 w-4 shrink-0 text-[#0067c0]" />
                      <span>
                        <strong>Delivery local en {listing.city.name}</strong>{" "}
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold">
                          {listing.localDeliveryFree ? "Gratis" : "A cargo del comprador"}
                        </span>
                      </span>
                    </li>
                  )}
                  {listing.nationalShipping && (
                    <li className="flex items-center gap-2">
                      <Truck className="h-4 w-4 shrink-0 text-[#0067c0]" />
                      <span>
                        <strong>Envío a todo Paraguay</strong> por encomienda{" "}
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold">
                          {listing.nationalShippingFree ? "Gratis" : "A cargo del comprador"}
                        </span>
                      </span>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>

          {/* Seller Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => openProfile(listing.seller.id)}
                className="flex min-w-0 items-center gap-3 text-left"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0067c0] text-sm font-bold text-white">
                  {listing.seller.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 hover:text-[#0067c0]">
                    {listing.seller.name}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-0.5 font-semibold text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {listing.seller.reviewCount > 0
                        ? `${listing.seller.avgRating} (${listing.seller.reviewCount})`
                        : "Nuevo vendedor"}
                    </span>
                    <span>·</span>
                    <span>Particular</span>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => openProfile(listing.seller.id)}
                className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ver perfil
              </button>
            </div>
            {listing.seller.bio && (
              <p className="mt-2.5 text-xs text-slate-600">{listing.seller.bio}</p>
            )}
          </div>

          {/* Safety Tip & Report */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-[11px] leading-relaxed">
                <strong>Consejo de seguridad:</strong> nunca transfieras señas por adelantado sin
                ver el producto o verificar los papeles en persona.
              </p>
            </div>
            {!isOwner && (
              <button
                type="button"
                onClick={() => setShowReportForm((v) => !v)}
                className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600"
              >
                <Flag className="h-3 w-3" /> Denunciar esta publicación
              </button>
            )}

            {showReportForm && (
              <form onSubmit={handleReportSubmit} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                >
                  <option>Precio o producto engañoso</option>
                  <option>Posible estafa o suplantación</option>
                  <option>Artículo prohibido o ilegal</option>
                  <option>Categoría o datos incorrectos</option>
                  <option>Spam o aviso duplicado</option>
                </select>
                <textarea
                  rows={2}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Contanos brevemente qué encontraste..."
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#0067c0]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReportForm(false)}
                    className="rounded-lg px-2.5 py-1 text-xs text-slate-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReport}
                    className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-700"
                  >
                    Enviar denuncia
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Photo Lightbox */}
      {lightboxOpen && currentImg && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/92 p-4 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Cerrar foto"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-rose-600"
          >
            <X className="h-5 w-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx((i) => (i === 0 ? images.length - 1 : i - 1));
                }}
                aria-label="Foto anterior"
                className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx((i) => (i === images.length - 1 ? 0 : i + 1));
                }}
                aria-label="Siguiente foto"
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88dvh] max-w-[92vw] flex-col items-center gap-3"
          >
            <img
              src={currentImg}
              alt={listing.title}
              className="max-h-[82dvh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
            />
            <div className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white">
              <span className="max-w-[60vw] truncate">{listing.title}</span>
              {images.length > 1 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">
                  {activePhotoIdx + 1} / {images.length}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
