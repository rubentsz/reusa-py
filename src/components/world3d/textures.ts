import * as THREE from "three";
import { formatPrice } from "@/lib/format";
import type { ListingDTO } from "@/types/marketplace";

export function createSunsetSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, "#120c2c");
  grad.addColorStop(0.26, "#2c1654");
  grad.addColorStop(0.46, "#8c2772");
  grad.addColorStop(0.62, "#e84a7f");
  grad.addColorStop(0.76, "#ff8b5a");
  grad.addColorStop(0.88, "#ffd27d");
  grad.addColorStop(1.0, "#fff0c2");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle retro stars near the zenith
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  for (let i = 0; i < 65; i++) {
    const x = (i * 97) % 512;
    const y = (i * 53) % 150;
    const r = (i % 3 === 0 ? 1.4 : 0.9);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBoulevardRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  // Sun-baked asphalt
  ctx.fillStyle = "#272736";
  ctx.fillRect(0, 0, 512, 512);

  // Subtle grain
  for (let i = 0; i < 2400; i++) {
    const x = (i * 73) % 512;
    const y = (i * 191) % 512;
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.08)";
    ctx.fillRect(x, y, 2, 2);
  }

  // Side white lines
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillRect(24, 0, 6, 512);
  ctx.fillRect(482, 0, 6, 512);

  // Double yellow Vice City center lines
  ctx.fillStyle = "#facc15";
  ctx.fillRect(246, 0, 7, 512);
  ctx.fillRect(259, 0, 7, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSidewalkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#e8d6df";
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = "rgba(130, 88, 120, 0.25)";
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

export function createHawaiianShirtTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  // Iconic Tommy Vercetti turquoise base
  ctx.fillStyle = "#06b6d4";
  ctx.fillRect(0, 0, 256, 256);

  // Tropical palm silhouettes & flowers
  const colors = ["#0e7490", "#ecfeff", "#fb7185", "#fde047"];
  for (let i = 0; i < 36; i++) {
    const x = (i * 67 + 20) % 256;
    const y = (i * 89 + 15) % 256;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 4, (i * 0.7) % Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y, 4, 10, (i * 0.7) % Math.PI, 0, Math.PI * 2);
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

  // Dark synth backing panel
  ctx.fillStyle = "#120921";
  ctx.fillRect(0, 0, 768, 256);

  // Outer glowing neon border
  ctx.strokeStyle = neonColor;
  ctx.lineWidth = 10;
  ctx.shadowColor = neonColor;
  ctx.shadowBlur = 22;
  ctx.strokeRect(16, 16, 736, 224);

  // Inner thin accent border
  ctx.shadowBlur = 8;
  ctx.strokeStyle = secondaryColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, 708, 196);

  // Main Vice City neon title
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = neonColor;
  ctx.shadowBlur = 26;
  ctx.font = "italic 900 58px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
  ctx.fillText(title, 384, 104, 680);

  // Subtitle
  ctx.shadowColor = secondaryColor;
  ctx.shadowBlur = 12;
  ctx.fillStyle = secondaryColor;
  ctx.font = "700 28px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
  ctx.fillText(subtitle.toUpperCase(), 384, 168, 660);

  // Live count badge
  ctx.shadowBlur = 0;
  const badgeText =
    listingCount === 1 ? "1 AVISO ACTIVO" : `${listingCount} AVISOS ACTIVOS`;
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(264, 196, 240, 28);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 17px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
  ctx.fillText(badgeText, 384, 211);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCheckerFloorTexture(colorA: string, colorB: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = colorA;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = colorB;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillRect(128, 128, 128, 128);

  // Subtle tile grout
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 128, 128);
  ctx.strokeRect(128, 128, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPriceHologramTexture(
  listing: ListingDTO,
  accentColor: string
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 200;
  const ctx = canvas.getContext("2d")!;

  // Frosted neon card background
  ctx.fillStyle = "rgba(15, 10, 32, 0.92)";
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 184, 24);
  ctx.fill();

  ctx.strokeStyle = listing.isFree ? "#10b981" : accentColor;
  ctx.lineWidth = 6;
  ctx.stroke();

  // Price line
  const priceStr = formatPrice(listing.price, listing.currency, listing.isFree);
  ctx.fillStyle = listing.isFree ? "#34d399" : "#ffffff";
  ctx.font = "900 44px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(priceStr, 28, 26, 300);

  // Savings pill on top-right
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

  // Title
  ctx.textAlign = "left";
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "700 24px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
  const shortTitle =
    listing.title.length > 34 ? `${listing.title.slice(0, 33)}…` : listing.title;
  ctx.fillText(shortTitle, 28, 94, 456);

  // Location & hint
  ctx.fillStyle = "#38bdf8";
  ctx.font = "600 20px 'Plus Jakarta Sans', 'Segoe UI', sans-serif";
  const loc = [listing.neighborhood?.name, listing.city.name].filter(Boolean).join(", ");
  ctx.fillText(`📍 ${loc}  ·  Clic o [E] para ver`, 28, 140, 456);

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

export function loadProductImageMaterial(url?: string): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.05,
    emissive: new THREE.Color(0x111118),
    emissiveIntensity: 0.35,
  });

  if (!url) return mat;

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
    () => {
      // Keep clean neutral material if image fails to load
    }
  );

  return mat;
}
