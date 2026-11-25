"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Car,
  CheckCircle2,
  Home,
  Loader2,
  Shirt,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import { computeSavingsPercent, formatPrice } from "@/lib/format";

interface UploadedPhoto {
  url: string;
  isCover: boolean;
}

export function PublishView({
  editId,
  onSuccess,
}: {
  editId?: string;
  onSuccess?: (slug: string, title: string) => void;
}) {
  const {
    user,
    categories,
    departments,
    openAuth,
    openListing,
    refreshListings,
    notifyToast,
  } = useApp();

  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [condition, setCondition] = useState("VERY_GOOD");

  const [isFree, setIsFree] = useState(false);
  const [currency, setCurrency] = useState<"PYG" | "USD">("PYG");
  const [price, setPrice] = useState("");
  const [referenceNewPrice, setReferenceNewPrice] = useState("");
  const [referenceNewUrl, setReferenceNewUrl] = useState("");

  const [isNegotiable, setIsNegotiable] = useState(true);
  const [acceptsTrade, setAcceptsTrade] = useState(false);

  const [pickupInPerson, setPickupInPerson] = useState(true);
  const [publicMeetup, setPublicMeetup] = useState(true);
  const [localDelivery, setLocalDelivery] = useState(false);
  const [localDeliveryFree, setLocalDeliveryFree] = useState(false);
  const [nationalShipping, setNationalShipping] = useState(false);
  const [nationalShippingFree, setNationalShippingFree] = useState(false);
  const [showWhatsapp, setShowWhatsapp] = useState(true);

  const [departmentId, setDepartmentId] = useState(
    user?.departmentId || departments[0]?.id || ""
  );
  const [cityId, setCityId] = useState(
    user?.cityId || departments[0]?.cities[0]?.id || ""
  );
  const [neighborhoodId, setNeighborhoodId] = useState("");

  // Vehicle fields
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMileageKm, setVehicleMileageKm] = useState("");
  const [vehicleFuel, setVehicleFuel] = useState("Flex / Nafta");
  const [vehicleTransmission, setVehicleTransmission] = useState("Automática");
  const [vehicleDocs, setVehicleDocs] = useState("Título y Cédula Verde al día");

  // Real estate fields
  const [realEstateOperation, setRealEstateOperation] = useState<"SALE" | "RENT">("SALE");
  const [realEstateType, setRealEstateType] = useState("Casa");
  const [areaTotalM2, setAreaTotalM2] = useState("");
  const [areaBuiltM2, setAreaBuiltM2] = useState("");
  const [bedrooms, setBedrooms] = useState("2");
  const [bathrooms, setBathrooms] = useState("2");
  const [parkingSpaces, setParkingSpaces] = useState("1");
  const [furnished, setFurnished] = useState(false);

  // Apparel fields
  const [apparelSize, setApparelSize] = useState("");
  const [apparelBrand, setApparelBrand] = useState("");
  const [apparelGender, setApparelGender] = useState("Unisex");

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId]
  );
  const selectedDept = useMemo(
    () => departments.find((d) => d.id === departmentId),
    [departments, departmentId]
  );
  const selectedCity = useMemo(
    () => selectedDept?.cities.find((c) => c.id === cityId),
    [selectedDept, cityId]
  );

  const isVisitVertical =
    selectedCategory?.verticalType === "VEHICLE" ||
    selectedCategory?.verticalType === "REAL_ESTATE";

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/listings/${editId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.listing) return;
        const l = data.listing;
        setTitle(l.title);
        setDescription(l.description);
        setCategoryId(l.categoryId);
        setSubcategoryId(l.subcategoryId || "");
        setCondition(l.condition);
        setIsFree(l.isFree);
        setCurrency(l.currency);
        setPrice(l.price ? String(l.price) : "");
        setReferenceNewPrice(l.referenceNewPrice ? String(l.referenceNewPrice) : "");
        setReferenceNewUrl(l.referenceNewUrl || "");
        setIsNegotiable(l.isNegotiable);
        setAcceptsTrade(l.acceptsTrade);
        setPickupInPerson(l.pickupInPerson);
        setPublicMeetup(l.publicMeetup);
        setLocalDelivery(l.localDelivery);
        setLocalDeliveryFree(l.localDeliveryFree);
        setNationalShipping(l.nationalShipping);
        setNationalShippingFree(l.nationalShippingFree);
        setShowWhatsapp(l.showWhatsapp);
        setDepartmentId(l.departmentId);
        setCityId(l.cityId);
        setNeighborhoodId(l.neighborhoodId || "");
        setPhotos(l.images.map((img: { url: string; isCover: boolean }) => ({ url: img.url, isCover: img.isCover })));
      })
      .finally(() => setLoadingEdit(false));
  }, [editId]);

  const liveSavings = useMemo(() => {
    const p = Number(price);
    const ref = Number(referenceNewPrice);
    if (Number.isNaN(p) || Number.isNaN(ref)) return null;
    return computeSavingsPercent(p, ref, isFree);
  }, [price, referenceNewPrice, isFree]);

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white p-8 text-center">
        <Camera className="h-10 w-10 text-[#0067c0]" />
        <h2 className="mt-3 text-base font-bold text-slate-900">
          Iniciá sesión para publicar en ReUsa PY
        </h2>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          Publicar es 100% gratis: podés subir hasta 10 fotos y vender desde unas medias hasta un
          auto o una casa.
        </p>
        <button
          type="button"
          onClick={openAuth}
          className="mt-4 rounded-xl bg-[#0067c0] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0058a6]"
        >
          Ingresar o crear cuenta
        </button>
      </div>
    );
  }

  if (loadingEdit) {
    return (
      <div className="flex h-full items-center justify-center bg-white p-8 text-sm text-slate-500">
        Cargando publicación para editar...
      </div>
    );
  }

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const remainingSlots = 10 - photos.length;
    if (remainingSlots <= 0) {
      notifyToast("Ya alcanzaste el máximo de 10 fotos", "error");
      return;
    }
    const selected = Array.from(fileList).slice(0, remainingSlots);
    const formData = new FormData();
    selected.forEach((f) => formData.append("files", f));

    setUploading(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        notifyToast(data.error || "Error subiendo fotos", "error");
        return;
      }
      setPhotos((prev) => {
        const added = (data.files as { url: string }[]).map((f, i) => ({
          url: f.url,
          isCover: prev.length === 0 && i === 0,
        }));
        return [...prev, ...added];
      });
      notifyToast("Fotos comprimidas y subidas", "success");
    } catch {
      notifyToast("Error subiendo imágenes", "error");
    } finally {
      setUploading(false);
    }
  };

  const setCover = (idx: number) => {
    setPhotos((prev) => prev.map((p, i) => ({ ...p, isCover: i === idx })));
  };

  const movePhoto = (idx: number, dir: -1 | 1) => {
    setPhotos((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length > 0 && !next.some((p) => p.isCover)) {
        next[0] = { ...next[0], isCover: true };
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId && photos.length === 0) {
      notifyToast("Subí al menos 1 foto real del producto", "error");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        categoryId,
        subcategoryId: subcategoryId || null,
        condition,
        isFree,
        currency,
        price: isFree ? 0 : Number(price) || 0,
        referenceNewPrice:
          !isFree && referenceNewPrice ? Number(referenceNewPrice) : null,
        referenceNewUrl: !isFree && referenceNewUrl.trim() ? referenceNewUrl.trim() : null,
        isNegotiable: isFree ? false : isNegotiable,
        acceptsTrade: isFree ? false : acceptsTrade,
        pickupInPerson,
        publicMeetup,
        localDelivery,
        localDeliveryFree,
        nationalShipping,
        nationalShippingFree,
        scheduleVisitOnly: isVisitVertical,
        showWhatsapp,
        departmentId,
        cityId,
        neighborhoodId: neighborhoodId || null,
        ...(selectedCategory?.verticalType === "VEHICLE"
          ? {
              vehicleBrand: vehicleBrand || null,
              vehicleModel: vehicleModel || null,
              vehicleYear: vehicleYear ? Number(vehicleYear) : null,
              vehicleMileageKm: vehicleMileageKm ? Number(vehicleMileageKm) : null,
              vehicleFuel,
              vehicleTransmission,
              vehicleDocs,
            }
          : {}),
        ...(selectedCategory?.verticalType === "REAL_ESTATE"
          ? {
              realEstateOperation,
              realEstateType,
              areaTotalM2: areaTotalM2 ? Number(areaTotalM2) : null,
              areaBuiltM2: areaBuiltM2 ? Number(areaBuiltM2) : null,
              bedrooms: bedrooms ? Number(bedrooms) : null,
              bathrooms: bathrooms ? Number(bathrooms) : null,
              parkingSpaces: parkingSpaces ? Number(parkingSpaces) : null,
              furnished,
            }
          : {}),
        ...(selectedCategory?.verticalType === "APPAREL"
          ? {
              apparelSize: apparelSize || null,
              apparelBrand: apparelBrand || null,
              apparelGender: apparelGender || null,
            }
          : {}),
        images: photos,
      };

      const res = await fetch(editId ? `/api/listings/${editId}` : "/api/listings", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        notifyToast(data.error || "Revisá los datos ingresados", "error");
        return;
      }

      await refreshListings();
      notifyToast(
        editId ? "Publicación actualizada" : "¡Publicado en ReUsa PY!",
        "success"
      );
      if (onSuccess) {
        onSuccess(data.listing.slug, data.listing.title);
      } else {
        openListing(data.listing.slug, data.listing.title);
      }
    } catch {
      notifyToast("Error guardando la publicación", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="fluent-scroll mx-auto h-full max-w-3xl space-y-5 overflow-y-auto bg-[#f8fafd] p-4 pb-10"
    >
      <div>
        <h1 className="text-lg font-extrabold text-slate-900">
          {editId ? "Editar publicación" : "Publicar un producto usado"}
        </h1>
        <p className="text-xs text-slate-500">
          100% gratis en Paraguay · Vigencia de 60 días renovables · Desde unas medias hasta un auto
          o una casa.
        </p>
      </div>

      {/* 1. Photos */}
      {!editId && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Fotos ({photos.length}/10)</h2>
              <p className="text-[11px] text-slate-500">
                Se comprimen automáticamente a WebP para cargar rápido en celulares.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0067c0] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0058a6]">
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploading ? "Subiendo..." : "Subir fotos"}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading || photos.length >= 10}
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </label>
          </div>

          {photos.length === 0 ? (
            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 py-8 text-center transition hover:border-[#0067c0]/50 hover:bg-sky-50/40">
              <Camera className="h-7 w-7 text-slate-400" />
              <span className="mt-2 text-xs font-semibold text-slate-700">
                Hacé clic para elegir fotos desde tu PC o celular
              </span>
              <span className="mt-0.5 text-[11px] text-slate-400">
                JPG, PNG o WebP · Hasta 10 imágenes (máx. 8 MB c/u)
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </label>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
              {photos.map((photo, idx) => (
                <div
                  key={`${photo.url}-${idx}`}
                  className={`group relative overflow-hidden rounded-xl border-2 ${
                    photo.isCover ? "border-[#0067c0]" : "border-slate-200"
                  }`}
                >
                  <img src={photo.url} alt="" className="aspect-square w-full object-cover" />
                  {photo.isCover && (
                    <span className="absolute left-1 top-1 rounded bg-[#0067c0] px-1.5 py-0.5 text-[9px] font-bold text-white">
                      Portada
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-slate-900/70 p-1 text-white">
                    <button
                      type="button"
                      onClick={() => movePhoto(idx, -1)}
                      disabled={idx === 0}
                      className="rounded p-0.5 hover:bg-white/20 disabled:opacity-30"
                      title="Mover izquierda"
                    >
                      <ArrowLeft className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCover(idx)}
                      className={`rounded p-0.5 hover:bg-white/20 ${
                        photo.isCover ? "text-amber-300" : ""
                      }`}
                      title="Elegir como portada"
                    >
                      <Star className={`h-3 w-3 ${photo.isCover ? "fill-current" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePhoto(idx, 1)}
                      disabled={idx === photos.length - 1}
                      className="rounded p-0.5 hover:bg-white/20 disabled:opacity-30"
                      title="Mover derecha"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="rounded p-0.5 text-rose-300 hover:bg-white/20"
                      title="Quitar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. Category & Basic Info */}
      <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">¿Qué vas a vender?</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Categoría *</label>
            <select
              required
              disabled={Boolean(editId)}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0067c0]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Subcategoría</label>
            <select
              disabled={Boolean(editId) || !selectedCategory?.children?.length}
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0067c0]"
            >
              <option value="">Seleccionar (opcional)</option>
              {selectedCategory?.children?.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Título del aviso *</label>
          <input
            type="text"
            required
            minLength={4}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Zapatillas Nike Talle 42, Toyota Corolla 2019 o Casa 3 dormitorios..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0067c0]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Descripción *</label>
          <textarea
            required
            minLength={10}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contá detalles reales, tiempo de uso, accesorios incluidos o si tiene algún detalle..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0067c0]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Estado *</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0067c0]"
          >
            <option value="LIKE_NEW">Sin uso / Como nuevo</option>
            <option value="VERY_GOOD">Muy bueno</option>
            <option value="GOOD">Bueno</option>
            <option value="WITH_DETAILS">Con detalles</option>
            <option value="FOR_PARTS">Para repuestos</option>
          </select>
        </div>
      </section>

      {/* Dynamic Vertical Block: Vehicle / Real Estate / Apparel */}
      {!editId && selectedCategory?.verticalType === "VEHICLE" && (
        <section className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-[#0067c0]" />
            <h2 className="text-sm font-bold text-slate-900">Datos clave del Vehículo</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <input
              type="text"
              placeholder="Marca (ej. Toyota)"
              value={vehicleBrand}
              onChange={(e) => setVehicleBrand(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0067c0]"
            />
            <input
              type="text"
              placeholder="Modelo (ej. Corolla)"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0067c0]"
            />
            <input
              type="number"
              placeholder="Año (ej. 2019)"
              value={vehicleYear}
              onChange={(e) => setVehicleYear(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0067c0]"
            />
            <input
              type="number"
              placeholder="Kilometraje"
              value={vehicleMileageKm}
              onChange={(e) => setVehicleMileageKm(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0067c0]"
            />
            <select
              value={vehicleFuel}
              onChange={(e) => setVehicleFuel(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
            >
              <option>Flex / Nafta</option>
              <option>Nafta</option>
              <option>Diésel</option>
              <option>Híbrido</option>
              <option>Eléctrico</option>
            </select>
            <select
              value={vehicleTransmission}
              onChange={(e) => setVehicleTransmission(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
            >
              <option>Automática</option>
              <option>Manual</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Documentación (ej. Título y Cédula Verde al día)"
            value={vehicleDocs}
            onChange={(e) => setVehicleDocs(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0067c0]"
          />
        </section>
      )}

      {!editId && selectedCategory?.verticalType === "REAL_ESTATE" && (
        <section className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-[#0067c0]" />
            <h2 className="text-sm font-bold text-slate-900">Datos del Inmueble</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <select
              value={realEstateOperation}
              onChange={(e) => setRealEstateOperation(e.target.value as "SALE" | "RENT")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
            >
              <option value="SALE">En Venta</option>
              <option value="RENT">En Alquiler</option>
            </select>
            <select
              value={realEstateType}
              onChange={(e) => setRealEstateType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <option>Casa</option>
              <option>Departamento</option>
              <option>Terreno</option>
              <option>Dúplex</option>
              <option>Local</option>
            </select>
            <input
              type="number"
              placeholder="Sup. total m²"
              value={areaTotalM2}
              onChange={(e) => setAreaTotalM2(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            />
            <input
              type="number"
              placeholder="Sup. construida m²"
              value={areaBuiltM2}
              onChange={(e) => setAreaBuiltM2(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            />
            <input
              type="number"
              placeholder="Dormitorios"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            />
            <input
              type="number"
              placeholder="Baños"
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            />
            <input
              type="number"
              placeholder="Cocheras"
              value={parkingSpaces}
              onChange={(e) => setParkingSpaces(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            />
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={furnished}
                onChange={(e) => setFurnished(e.target.checked)}
              />
              Amoblado
            </label>
          </div>
        </section>
      )}

      {!editId && selectedCategory?.verticalType === "APPAREL" && (
        <section className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
          <div className="flex items-center gap-2">
            <Shirt className="h-4 w-4 text-[#0067c0]" />
            <h2 className="text-sm font-bold text-slate-900">Datos de Ropa / Calzado</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="text"
              placeholder="Talle (ej. M, 42, 39-43)"
              value={apparelSize}
              onChange={(e) => setApparelSize(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            />
            <input
              type="text"
              placeholder="Marca (ej. Nike, Zara)"
              value={apparelBrand}
              onChange={(e) => setApparelBrand(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            />
            <select
              value={apparelGender}
              onChange={(e) => setApparelGender(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <option>Unisex</option>
              <option>Hombre</option>
              <option>Mujer</option>
              <option>Niños</option>
            </select>
          </div>
        </section>
      )}

      {/* 3. Price & Reference New Product */}
      <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">Precio y comparación vs. nuevo</h2>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
            />
            Publicar como Gratis / Regalo
          </label>
        </div>

        {!isFree && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Moneda</label>
                <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setCurrency("PYG")}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                      currency === "PYG"
                        ? "bg-[#0067c0] text-white shadow-xs"
                        : "text-slate-600"
                    }`}
                  >
                    Gs. (PYG)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency("USD")}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                      currency === "USD"
                        ? "bg-[#0067c0] text-white shadow-xs"
                        : "text-slate-600"
                    }`}
                  >
                    US$ (USD)
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tu precio de venta ({currency}) *
                </label>
                <input
                  type="number"
                  required={!isFree}
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={currency === "PYG" ? "Ej. 250000" : "Ej. 14500"}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-[#0067c0]"
                />
              </div>
            </div>

            {/* Optional Reference New Price & URL */}
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5">
              <div className="mb-2 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-950">
                  Referencia del producto nuevo (opcional — aumenta tus visitas)
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-emerald-900">
                    Precio nuevo en tienda ({currency})
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={referenceNewPrice}
                    onChange={(e) => setReferenceNewPrice(e.target.value)}
                    placeholder={currency === "PYG" ? "Ej. 480000" : "Ej. 25000"}
                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-emerald-900">
                    Link del producto nuevo (URL opcional)
                  </label>
                  <input
                    type="url"
                    value={referenceNewUrl}
                    onChange={(e) => setReferenceNewUrl(e.target.value)}
                    placeholder="https://tienda.com.py/producto"
                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {liveSavings && (
                <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">
                  <CheckCircle2 className="h-4 w-4" />
                  Vista previa: El comprador verá &quot;Ahorrás {liveSavings}% vs. nuevo&quot; (
                  {formatPrice(Number(referenceNewPrice) - Number(price), currency)} menos)
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-1 text-xs">
              <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isNegotiable}
                  onChange={(e) => setIsNegotiable(e.target.checked)}
                />
                Precio negociable
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={acceptsTrade}
                  onChange={(e) => setAcceptsTrade(e.target.checked)}
                />
                Acepta permuta / parte de pago
              </label>
            </div>
          </>
        )}
      </section>

      {/* 4. Location & Delivery */}
      <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">Ubicación y forma de entrega</h2>

        {!editId && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Departamento *
              </label>
              <select
                required
                value={departmentId}
                onChange={(e) => {
                  const nextDept = departments.find((d) => d.id === e.target.value);
                  setDepartmentId(e.target.value);
                  setCityId(nextDept?.cities[0]?.id || "");
                  setNeighborhoodId("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0067c0]"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Ciudad *</label>
              <select
                required
                value={cityId}
                onChange={(e) => {
                  setCityId(e.target.value);
                  setNeighborhoodId("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0067c0]"
              >
                {selectedDept?.cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Barrio / Zona (aprox.)
              </label>
              <select
                value={neighborhoodId}
                onChange={(e) => setNeighborhoodId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0067c0]"
              >
                <option value="">General de la ciudad</option>
                {selectedCity?.neighborhoods.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {isVisitVertical ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-950">
            <strong>Adaptado a {selectedCategory?.name}:</strong> se mostrará automáticamente la
            opción <em>&quot;Coordinar visita / ver en persona&quot;</em> en lugar de envío a
            domicilio, protegiendo tu dirección exacta en el mapa.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 pt-1 text-xs sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-2.5">
              <input
                type="checkbox"
                checked={pickupInPerson}
                onChange={(e) => setPickupInPerson(e.target.checked)}
              />
              <span>Retiro en persona (por zona/barrio)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-2.5">
              <input
                type="checkbox"
                checked={publicMeetup}
                onChange={(e) => setPublicMeetup(e.target.checked)}
              />
              <span>Punto de encuentro público</span>
            </label>
            <div className="rounded-xl border border-slate-200 p-2.5">
              <label className="flex cursor-pointer items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={localDelivery}
                  onChange={(e) => setLocalDelivery(e.target.checked)}
                />
                Delivery local en la ciudad
              </label>
              {localDelivery && (
                <label className="mt-1.5 ml-6 flex cursor-pointer items-center gap-1.5 text-[11px] text-emerald-700">
                  <input
                    type="checkbox"
                    checked={localDeliveryFree}
                    onChange={(e) => setLocalDeliveryFree(e.target.checked)}
                  />
                  Delivery gratis incluido
                </label>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 p-2.5">
              <label className="flex cursor-pointer items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={nationalShipping}
                  onChange={(e) => setNationalShipping(e.target.checked)}
                />
                Envío a todo el país (encomienda)
              </label>
              {nationalShipping && (
                <label className="mt-1.5 ml-6 flex cursor-pointer items-center gap-1.5 text-[11px] text-emerald-700">
                  <input
                    type="checkbox"
                    checked={nationalShippingFree}
                    onChange={(e) => setNationalShippingFree(e.target.checked)}
                  />
                  Envío gratis a todo el país
                </label>
              )}
            </div>
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={showWhatsapp}
            onChange={(e) => setShowWhatsapp(e.target.checked)}
          />
          Mostrar botón de WhatsApp en este aviso{" "}
          {user.whatsappPhone ? (
            <span className="text-emerald-700">({user.whatsappPhone})</span>
          ) : (
            <span className="text-amber-600">(agregá tu número en Mi Perfil)</span>
          )}
        </label>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || uploading}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0067c0] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0058a6] disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {editId ? "Guardar cambios" : "Publicar aviso ahora"}
        </button>
      </div>
    </form>
  );
}
