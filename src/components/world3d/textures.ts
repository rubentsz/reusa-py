import * as THREE from "three";
import { formatPrice } from "@/lib/format";
import type { CommercialStoreDTO, ListingDTO } from "@/types/marketplace";

export function createBoulevardRoadPBR(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const mapCanvas = document.createElement("canvas");
  mapCanvas.width = 512;
  mapCanvas.height = 512;
  const ctx = mapCanvas.getContext("2d")!;

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bctx = bumpCanvas.getContext("2d")!;

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = 512;
  roughCanvas.height = 512;
  const rctx = roughCanvas.getContext("2d")!;

  // Base dark weathered asphalt
  ctx.fillStyle = "#222330";
  ctx.fillRect(0, 0, 512, 512);
  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, 512, 512);
  rctx.fillStyle = "#b8b8b8"; // matte default
  rctx.fillRect(0, 0, 512, 512);

  // Subtle tire tracks + damp reflective puddle patches (classic Vice City Definitive Edition!)
  for (let p = 0; p < 10; p++) {
    const px = (p * 113 + 50) % 440 + 36;
    const py = (p * 97 + 30) % 440 + 36;
    const rx = 28 + (p % 3) * 20;
    const ry = 42 + (p % 4) * 24;
    const rGrad = rctx.createRadialGradient(px, py, 4, px, py, ry);
    rGrad.addColorStop(0, "#1c1c1c"); // glossy damp patch reflects neon!
    rGrad.addColorStop(1, "rgba(184,184,184,0)");
    rctx.fillStyle = rGrad;
    rctx.beginPath();
    rctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
    rctx.fill();
  }

  // Asphalt micro-aggregate grain
  for (let i = 0; i < 4200; i++) {
    const x = (i * 73) % 512;
    const y = (i * 191) % 512;
    const light = i % 2 === 0;
    ctx.fillStyle = light ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.1)";
    ctx.fillRect(x, y, 2, 2);
    bctx.fillStyle = light ? "#a8a8a8" : "#525252";
    bctx.fillRect(x, y, 2, 2);
  }

  // Crisp side lines + double yellow Vice City center lines
  ctx.fillStyle = "rgba(248,250,252,0.82)";
  ctx.fillRect(22, 0, 7, 512);
  ctx.fillRect(483, 0, 7, 512);

  ctx.fillStyle = "#facc15";
  ctx.fillRect(245, 0, 7, 512);
  ctx.fillRect(260, 0, 7, 512);

  const configure = (c: HTMLCanvasElement, isColor: boolean) => {
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 16);
    if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  return {
    map: configure(mapCanvas, true),
    bumpMap: configure(bumpCanvas, false),
    roughnessMap: configure(roughCanvas, false),
  };
}

export function createStuccoBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 3600; i++) {
    const x = (i * 59) % 256;
    const y = (i * 131) % 256;
    ctx.fillStyle = i % 2 === 0 ? "rgba(210,210,210,0.35)" : "rgba(70,70,70,0.35)";
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

export function createSidewalkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ebd9e2";
  ctx.fillRect(0, 0, 256, 256);

  // Subtle concrete stone texture
  for (let i = 0; i < 1200; i++) {
    const x = (i * 67) % 256;
    const y = (i * 149) % 256;
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.16)" : "rgba(110,75,100,0.08)";
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.strokeStyle = "rgba(120, 82, 112, 0.28)";
  ctx.lineWidth = 3;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 24);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPalmFrondTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 512);

  // Central stem
  ctx.strokeStyle = "#166534";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(128, 10);
  ctx.lineTo(128, 504);
  ctx.stroke();

  // Feathered tropical palm leaflets along both sides
  for (let y = 26; y < 490; y += 20) {
    const t = y / 512;
    const widthProfile = Math.sin(t * Math.PI) * 112 + 12;
    const gradL = ctx.createLinearGradient(128, y, 128 - widthProfile, y + 24);
    gradL.addColorStop(0, "#15803d");
    gradL.addColorStop(1, "#22c55e");

    ctx.fillStyle = gradL;
    ctx.beginPath();
    ctx.moveTo(126, y);
    ctx.quadraticCurveTo(128 - widthProfile * 0.6, y + 4, 128 - widthProfile, y + 26);
    ctx.quadraticCurveTo(128 - widthProfile * 0.5, y + 18, 126, y + 11);
    ctx.fill();

    const gradR = ctx.createLinearGradient(128, y, 128 + widthProfile, y + 24);
    gradR.addColorStop(0, "#15803d");
    gradR.addColorStop(1, "#4ade80");

    ctx.fillStyle = gradR;
    ctx.beginPath();
    ctx.moveTo(130, y);
    ctx.quadraticCurveTo(128 + widthProfile * 0.6, y + 4, 128 + widthProfile, y + 26);
    ctx.quadraticCurveTo(128 + widthProfile * 0.5, y + 18, 130, y + 11);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createHawaiianShirtTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0891b2";
  ctx.fillRect(0, 0, 256, 256);

  // Subtle linen weave
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let y = 0; y < 256; y += 4) ctx.fillRect(0, y, 256, 1);

  const colors = ["#164e63", "#ecfeff", "#fb7185", "#fde047"];
  for (let i = 0; i < 42; i++) {
    const x = (i * 67 + 20) % 256;
    const y = (i * 89 + 15) % 256;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.ellipse(x, y, 11, 4.5, (i * 0.7) % Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y, 4.5, 11, (i * 0.7) % Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createNeonSignTexture(
  title: string,
  subtitle: string,
  neonColor: string,
  secondaryColor: string,
  listingCount: number
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#10071f";
  ctx.fillRect(0, 0, 768, 256);

  ctx.strokeStyle = neonColor;
  ctx.lineWidth = 10;
  ctx.shadowColor = neonColor;
  ctx.shadowBlur = 24;
  ctx.strokeRect(16, 16, 736, 224);

  ctx.shadowBlur = 10;
  ctx.strokeStyle = secondaryColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, 708, 196);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = neonColor;
  ctx.shadowBlur = 28;
  ctx.font = "italic 900 58px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
  ctx.fillText(title, 384, 102, 680);

  ctx.shadowColor = secondaryColor;
  ctx.shadowBlur = 14;
  ctx.fillStyle = secondaryColor;
  ctx.font = "700 28px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
  ctx.fillText(subtitle.toUpperCase(), 384, 166, 660);

  ctx.shadowBlur = 0;
  const badgeText =
    listingCount === 1 ? "1 AVISO ACTIVO" : `${listingCount} AVISOS ACTIVOS`;
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(264, 196, 240, 28);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 17px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
  ctx.fillText(badgeText, 384, 211);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createMarbleFloorPBR(
  colorA: string,
  colorB: string
): { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  const rCanvas = document.createElement("canvas");
  rCanvas.width = 512;
  rCanvas.height = 512;
  const rctx = rCanvas.getContext("2d")!;

  ctx.fillStyle = colorA;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = colorB;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillRect(256, 256, 256, 256);

  // Polished marble roughness base (very glossy with subtle tile seams)
  rctx.fillStyle = "#2b2b2b";
  rctx.fillRect(0, 0, 512, 512);

  // Subtle marble veining
  ctx.strokeStyle = "rgba(255,255,255,0.075)";
  ctx.lineWidth = 2;
  for (let v = 0; v < 22; v++) {
    const sx = (v * 97) % 512;
    const sy = (v * 53) % 512;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(sx + 50, sy + 20, sx + 80, sy + 85, sx + 140, sy + 70);
    ctx.stroke();
  }

  // Tile grout lines
  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.strokeRect(256, 256, 256, 256);

  rctx.strokeStyle = "#b0b0b0";
  rctx.lineWidth = 4;
  rctx.strokeRect(0, 0, 256, 256);
  rctx.strokeRect(256, 256, 256, 256);

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(7, 7);
  map.colorSpace = THREE.SRGBColorSpace;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(7, 7);

  return { map, roughnessMap };
}

export function createPriceHologramTexture(
  listing: ListingDTO,
  accentColor: string
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 200;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "rgba(15, 10, 32, 0.92)";
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 184, 24);
  ctx.fill();

  ctx.strokeStyle = listing.isFree ? "#10b981" : accentColor;
  ctx.lineWidth = 6;
  ctx.stroke();

  const priceStr = formatPrice(listing.price, listing.currency, listing.isFree);
  ctx.fillStyle = listing.isFree ? "#34d399" : "#ffffff";
  ctx.font = "900 44px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(priceStr, 28, 26, 300);

  if (!listing.isFree && listing.savingsPercent) {
    ctx.fillStyle = "#059669";
    ctx.beginPath();
    ctx.roundRect(334, 24, 152, 46, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 24px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`-${listing.savingsPercent}% NUEVO`, 410, 35, 142);
  } else if (listing.isFree) {
    ctx.fillStyle = "#059669";
    ctx.beginPath();
    ctx.roundRect(356, 24, 130, 44, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 24px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("REGALO", 421, 35);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "700 24px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
  const shortTitle =
    listing.title.length > 34 ? `${listing.title.slice(0, 33)}…` : listing.title;
  ctx.fillText(shortTitle, 28, 94, 456);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "600 20px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
  if (listing.store) {
    const condLabel =
      listing.condition === "BRAND_NEW"
        ? "★ NUEVO"
        : listing.condition === "OUTLET"
        ? "★ OUTLET"
        : "★ OFICIAL";
    const stockStr = listing.stockQuantity != null ? ` · Stock: ${listing.stockQuantity}` : "";
    ctx.fillText(`${condLabel}${stockStr} · [E] Zoom / Pedido`, 28, 140, 456);
  } else {
    const loc = [listing.neighborhood?.name, listing.city.name].filter(Boolean).join(", ");
    ctx.fillText(`📍 ${loc}  ·  Clic o [E] inspeccionar`, 28, 140, 456);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createActionStandTexture(
  title: string,
  subtitle: string,
  neonColor: string
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#160d2d";
  ctx.fillRect(0, 0, 512, 320);

  ctx.strokeStyle = neonColor;
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, 484, 292);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = neonColor;
  ctx.font = "900 72px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("+", 256, 98);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 30px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(title, 256, 178, 440);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "600 22px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(subtitle, 256, 232, 440);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createDealBillboardTexture(listing: ListingDTO): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 1024, 320);
  grad.addColorStop(0, "#190a35");
  grad.addColorStop(0.55, "#2f1152");
  grad.addColorStop(1, "#0e2b45");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 320);

  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, 1000, 296);

  ctx.fillStyle = "#ff2a9d";
  ctx.beginPath();
  ctx.roundRect(42, 34, 360, 50, 14);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 26px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★ OFERTA DEL DÍA PY ★", 222, 60);

  if (listing.savingsPercent) {
    ctx.fillStyle = "#059669";
    ctx.beginPath();
    ctx.roundRect(720, 32, 260, 68, 18);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 38px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(`-${listing.savingsPercent}% NUEVO`, 850, 67);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 44px 'Plus Jakarta Sans', sans-serif";
  const shortTitle =
    listing.title.length > 38 ? `${listing.title.slice(0, 37)}…` : listing.title;
  ctx.fillText(shortTitle, 44, 148, 920);

  const priceStr = formatPrice(listing.price, listing.currency, listing.isFree);
  ctx.fillStyle = "#34d399";
  ctx.font = "900 50px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(priceStr, 44, 224);

  if (listing.referenceNewPrice) {
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "700 28px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(
      `Nuevo ref.: ${formatPrice(listing.referenceNewPrice, listing.currency)}   ·   Tocá esta cartelera para abrir`,
      380,
      228,
      600
    );
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function loadProductImageMaterial(url?: string): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.05,
    emissive: new THREE.Color(0x141420),
    emissiveIntensity: 0.3,
  });

  if (!url) return mat;
  applyImageUrlToMaterial(mat, url);
  return mat;
}

export function applyImageUrlToMaterial(mat: THREE.MeshStandardMaterial, url: string) {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  loader.load(
    url,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      mat.map = texture;
      mat.needsUpdate = true;
    },
    undefined,
    () => {}
  );
}

export function createSoftGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0.0, "rgba(255, 224, 150, 0.72)");
  grad.addColorStop(0.45, "rgba(255, 200, 120, 0.28)");
  grad.addColorStop(1.0, "rgba(255, 200, 120, 0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCommercialSignTexture(
  store: CommercialStoreDTO,
  productCount: number
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 340;
  const ctx = canvas.getContext("2d")!;

  const drawFrame = (logoImg?: HTMLImageElement | null) => {
    const bg = ctx.createLinearGradient(0, 0, 1024, 340);
    bg.addColorStop(0, "#0b071d");
    bg.addColorStop(0.6, "#180d35");
    bg.addColorStop(1, "#0d1f36");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 340);

    // Double glowing neon frame
    ctx.strokeStyle = store.neonColor;
    ctx.lineWidth = 12;
    ctx.shadowColor = store.neonColor;
    ctx.shadowBlur = 22;
    ctx.strokeRect(14, 14, 996, 312);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = store.secondaryNeon;
    ctx.lineWidth = 4;
    ctx.strokeRect(28, 28, 968, 284);

    // Left Logo Medallion Box
    ctx.fillStyle = "#080d1d";
    ctx.beginPath();
    ctx.roundRect(48, 52, 236, 236, 28);
    ctx.fill();
    ctx.strokeStyle = store.neonColor;
    ctx.lineWidth = 5;
    ctx.stroke();

    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(58, 62, 216, 216, 22);
      ctx.clip();
      const aspect = logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight);
      let dw = 204;
      let dh = 204;
      if (aspect > 1) dh = 204 / aspect;
      else dw = 204 * aspect;
      ctx.drawImage(logoImg, 166 - dw / 2, 170 - dh / 2, dw, dh);
      ctx.restore();
    } else {
      ctx.fillStyle = store.neonColor;
      ctx.font = "900 84px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(store.name.slice(0, 2).toUpperCase(), 166, 172);
    }

    // Verified / Plan tier pill
    const badgeText =
      store.planTier === "FLAGSHIP"
        ? "★ TIENDA FLAGSHIP VIP"
        : store.planTier === "FEATURED"
        ? "★ TIENDA OFICIAL DESTACADA"
        : "★ TIENDA OFICIAL PY";
    ctx.fillStyle = store.planTier === "FLAGSHIP" ? "#fbbf24" : store.neonColor;
    ctx.beginPath();
    ctx.roundRect(312, 48, 360, 40, 12);
    ctx.fill();
    ctx.fillStyle = "#0b071d";
    ctx.font = "900 20px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, 492, 69, 344);

    // Store Name
    ctx.textAlign = "left";
    ctx.shadowColor = store.neonColor;
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 62px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
    ctx.fillText(store.name.toUpperCase(), 312, 146, 668);
    ctx.shadowBlur = 0;

    // Tagline
    ctx.fillStyle = store.secondaryNeon;
    ctx.font = "700 28px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
    ctx.fillText(store.tagline || "Catálogo Oficial en ReUsa PY", 312, 214, 668);

    // Bottom status bar
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.roundRect(312, 248, 410, 44, 14);
    ctx.fill();
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "800 23px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
    ctx.fillText(
      `${productCount} ${productCount === 1 ? "PRODUCTO EN CATÁLOGO" : "PRODUCTOS EN CATÁLOGO"} · ENTRAR`,
      332,
      271,
      380
    );
  };

  drawFrame(null);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  if (store.logoUrl) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      drawFrame(img);
      tex.needsUpdate = true;
    };
    img.src = store.logoUrl;
  }

  return tex;
}

export function createAvailableLotSignTexture(lotLabel: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 340;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 1024, 340);
  grad.addColorStop(0, "#1c0e38");
  grad.addColorStop(0.5, "#3b124d");
  grad.addColorStop(1, "#1c1230");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 340);

  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 12;
  ctx.shadowColor = "#fbbf24";
  ctx.shadowBlur = 20;
  ctx.strokeRect(14, 14, 996, 312);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.roundRect(302, 34, 420, 46, 14);
  ctx.fill();
  ctx.fillStyle = "#160a28";
  ctx.font = "900 24px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`★ ${lotLabel.toUpperCase()} ★`, 512, 58);

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#ff2a9d";
  ctx.shadowBlur = 18;
  ctx.font = "900 66px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("TU MARCA AQUÍ", 512, 146);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#7dd3fc";
  ctx.font = "700 30px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("PONÉ TU LOGO Y CATÁLOGO EN ESTE LOCAL 3D", 512, 214, 920);

  ctx.fillStyle = "#ff2a9d";
  ctx.beginPath();
  ctx.roundRect(262, 250, 500, 48, 16);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 24px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("CLIC O [E] PARA ALQUILAR ESTE LOCAL", 512, 274);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createAvenidaMarcasArchTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 180;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 1024, 180);
  grad.addColorStop(0, "#120726");
  grad.addColorStop(0.5, "#280f4a");
  grad.addColorStop(1, "#0d233d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 180);

  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 1008, 164);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 54px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("★ AVENIDA DE MARCAS · REUSA PY ★", 512, 72, 960);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#fbbf24";
  ctx.font = "800 26px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("TIENDAS OFICIALES 3D  ·  LOCALES REALES DE PARAGUAY", 512, 130, 960);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createFloorLogoMedallionTexture(
  store: CommercialStoreDTO
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  const draw = (logoImg?: HTMLImageElement | null) => {
    ctx.clearRect(0, 0, 512, 512);
    ctx.fillStyle = "rgba(12, 8, 28, 0.88)";
    ctx.beginPath();
    ctx.arc(256, 256, 240, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = store.neonColor;
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.strokeStyle = store.secondaryNeon;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(256, 256, 214, 0, Math.PI * 2);
    ctx.stroke();

    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(256, 224, 118, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImg, 138, 106, 236, 236);
      ctx.restore();
    } else {
      ctx.fillStyle = store.neonColor;
      ctx.font = "900 120px 'Plus Jakarta Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(store.name.slice(0, 2).toUpperCase(), 256, 224);
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 32px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(store.name.toUpperCase(), 256, 388, 340);
  };

  draw(null);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  if (store.logoUrl) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      draw(img);
      tex.needsUpdate = true;
    };
    img.src = store.logoUrl;
  }
  return tex;
}
