export function formatPrice(price: number, currency: string, isFree?: boolean): string {
  if (isFree) return "Gratis";
  const rounded = Math.round(price);
  if (currency === "USD") {
    return `US$ ${rounded.toLocaleString("es-PY")}`;
  }
  return `Gs. ${rounded.toLocaleString("es-PY")}`;
}

export function computeSavingsPercent(
  price: number,
  referenceNewPrice?: number | null,
  isFree?: boolean
): number | null {
  if (isFree) return null;
  if (!referenceNewPrice || referenceNewPrice <= 0) return null;
  if (price < 0 || price >= referenceNewPrice) return null;
  const pct = Math.round(((referenceNewPrice - price) / referenceNewPrice) * 100);
  if (pct <= 0 || pct >= 100) return null;
  return pct;
}

export function sanitizeExternalUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function extractDomain(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function buildWhatsappUrl(phone: string, listingTitle: string, listingUrl?: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("595")
    ? digits
    : digits.startsWith("0")
    ? `595${digits.slice(1)}`
    : `595${digits}`;
  const text = `Hola! Vi tu publicación "${listingTitle}" en ReUsa PY${
    listingUrl ? ` (${listingUrl})` : ""
  }. ¿Sigue disponible?`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export const CONDITION_LABELS: Record<string, string> = {
  LIKE_NEW: "Sin uso / Como nuevo",
  VERY_GOOD: "Muy bueno",
  GOOD: "Bueno",
  WITH_DETAILS: "Con detalles",
  FOR_PARTS: "Para repuestos",
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  PAUSED: "Pausado",
};

export const REAL_ESTATE_OP_LABELS: Record<string, string> = {
  SALE: "Venta",
  RENT: "Alquiler",
};

export function formatRelativeDate(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Hace instantes";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Ayer";
  if (diffDays < 30) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-PY", { day: "numeric", month: "short", year: "numeric" });
}

export function daysUntilExpiry(expiresAt: string | Date): number {
  const date = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export function addPrivacyJitter(lat: number, lng: number, seedStr: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) | 0;
  }
  const jitterLat = (((hash & 0xff) / 255) - 0.5) * 0.012;
  const jitterLng = ((((hash >> 8) & 0xff) / 255) - 0.5) * 0.012;
  return {
    lat: Number((lat + jitterLat).toFixed(5)),
    lng: Number((lng + jitterLng).toFixed(5)),
  };
}
