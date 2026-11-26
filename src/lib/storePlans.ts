export type StorePlanTier = "BASIC" | "FEATURED" | "FLAGSHIP";
export type StoreStatus = "PENDING" | "ACTIVE" | "PAUSED" | "EXPIRED";

export interface StorePlanSpec {
  id: StorePlanTier;
  name: string;
  badge: string;
  monthlyPricePyg: number;
  maxProducts: number;
  defaultSlotOrder: number;
  accentColor: string;
  highlight?: boolean;
  features: string[];
}

export const STORE_PLANS: Record<StorePlanTier, StorePlanSpec> = {
  BASIC: {
    id: "BASIC",
    name: "Plan Básico",
    badge: "LOCAL OFICIAL",
    monthlyPricePyg: 190000,
    maxProducts: 15,
    defaultSlotOrder: 60,
    accentColor: "#38bdf8",
    features: [
      "Local 3D propio en Avenida de Marcas",
      "Tu logo real en cartelera exterior e interior",
      "Hasta 15 productos (Nuevos, Outlet o Usados)",
      "Link directo /tienda/tu-marca para Instagram/WhatsApp",
      "Carrito de pedido rápido por WhatsApp",
      "Métricas de visitas y clics en vivo",
    ],
  },
  FEATURED: {
    id: "FEATURED",
    name: "Plan Destacado",
    badge: "DESTACADO",
    monthlyPricePyg: 390000,
    maxProducts: 60,
    defaultSlotOrder: 30,
    accentColor: "#ff2a9d",
    highlight: true,
    features: [
      "Todo lo del Plan Básico",
      "Hasta 60 productos con carga masiva CSV/Excel",
      "Colores de fachada, neón doble y Asesor NPC personalizado",
      "Insignia Tienda Oficial destacada en buscador general",
      "Mapa de sucursal física, horarios e Instagram/Web",
      "Métricas completas (visitas, productos y pedidos WhatsApp)",
    ],
  },
  FLAGSHIP: {
    id: "FLAGSHIP",
    name: "Plan Flagship VIP",
    badge: "FLAGSHIP VIP",
    monthlyPricePyg: 690000,
    maxProducts: 250,
    defaultSlotOrder: 10,
    accentColor: "#fbbf24",
    features: [
      "Ubicación VIP en primera fila de Avenida de Marcas",
      "Hasta 250 productos en catálogo + carga masiva CSV",
      "Showroom 3D premium con bandera, vitrinas y logo en piso",
      "Máxima prioridad en resultados y recomendaciones del NPC",
      "Soporte prioritario de diseño y carga inicial",
      "Panel completo de métricas y renovación flexible",
    ],
  },
};

export const STORE_PLAN_LIST: StorePlanSpec[] = [
  STORE_PLANS.BASIC,
  STORE_PLANS.FEATURED,
  STORE_PLANS.FLAGSHIP,
];

export const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  PENDING: "Pendiente",
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  EXPIRED: "Vencida",
};

export const STORE_COLOR_PRESETS = [
  { name: "Miami Cyan", facade: "#ecfeff", neon: "#00f0ff", secondary: "#ff2a9d" },
  { name: "Vice Sunset", facade: "#fff1f2", neon: "#ff2a9d", secondary: "#ffd166" },
  { name: "Tropical Green", facade: "#ecfdf5", neon: "#34d399", secondary: "#fbbf24" },
  { name: "Luxury Gold", facade: "#fefce8", neon: "#fbbf24", secondary: "#a855f7" },
  { name: "Electric Violet", facade: "#f5f3ff", neon: "#a855f7", secondary: "#00f0ff" },
  { name: "Racing Red", facade: "#fef2f2", neon: "#fb7185", secondary: "#38bdf8" },
];
