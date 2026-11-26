import type { CommercialStoreDTO, ListingDTO } from "@/types/marketplace";
import { CONDITION_LABELS, formatPrice } from "@/lib/format";

export type StoryCardTheme = "vice" | "clean";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.clip();

  const imgRatio = img.width / Math.max(1, img.height);
  const boxRatio = w / Math.max(1, h);
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  if (imgRatio > boxRatio) {
    dw = h * imgRatio;
    dx = x - (dw - w) / 2;
  } else {
    dh = w / imgRatio;
    dy = y - (dh - h) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawContainImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const scale = Math.min(w / Math.max(1, img.width), h / Math.max(1, img.height));
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) {
    let finalLine = current;
    while (ctx.measureText(finalLine).width > maxWidth && finalLine.length > 4) {
      finalLine = `${finalLine.slice(0, -2)}…`;
    }
    lines.push(finalLine);
  }
  return lines;
}

export async function renderListingStoryCard(
  listing: ListingDTO,
  theme: StoryCardTheme = "vice"
): Promise<string> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const isVice = theme === "vice";
  const accentA = listing.store?.neonColor || (isVice ? "#00f0ff" : "#0067c0");
  const accentB = isVice ? "#ff2a9d" : "#0ea5e9";

  // 1. Background Gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  if (isVice) {
    bg.addColorStop(0, "#0b071d");
    bg.addColorStop(0.48, "#1e0d3d");
    bg.addColorStop(1, "#0f172a");
  } else {
    bg.addColorStop(0, "#f8fafc");
    bg.addColorStop(0.55, "#eef6ff");
    bg.addColorStop(1, "#e2e8f0");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle decorative glow orbs
  const orb1 = ctx.createRadialGradient(180, 260, 40, 180, 260, 460);
  orb1.addColorStop(0, isVice ? "rgba(255, 42, 157, 0.32)" : "rgba(0, 103, 192, 0.14)");
  orb1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, W, H);

  const orb2 = ctx.createRadialGradient(900, 1580, 40, 900, 1580, 520);
  orb2.addColorStop(0, isVice ? "rgba(0, 240, 255, 0.25)" : "rgba(16, 185, 129, 0.14)");
  orb2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = orb2;
  ctx.fillRect(0, 0, W, H);

  // 2. Top Brand Strip
  ctx.fillStyle = isVice ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  drawRoundedRect(ctx, 64, 68, W - 128, 108, 28);
  ctx.fill();
  ctx.strokeStyle = isVice ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.1)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Brand pill text
  ctx.fillStyle = isVice ? "#ffffff" : "#0f172a";
  ctx.font = "900 42px system-ui, -apple-system, sans-serif";
  ctx.fillText("REUSA PY", 104, 134);

  ctx.fillStyle = isVice ? "#67e8f9" : "#0067c0";
  ctx.font = "700 24px system-ui, -apple-system, sans-serif";
  const rightTag = listing.store ? "★ TIENDA OFICIAL" : listing.category.name.toUpperCase();
  const tagW = ctx.measureText(rightTag).width;
  ctx.fillText(rightTag, W - 104 - tagW, 131);

  // 3. Hero Product Photo Card
  const photoX = 64;
  const photoY = 220;
  const photoW = W - 128;
  const photoH = 860;

  ctx.save();
  ctx.shadowColor = isVice ? "rgba(0,0,0,0.55)" : "rgba(15,23,42,0.18)";
  ctx.shadowBlur = 45;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = isVice ? "#111827" : "#ffffff";
  drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 42);
  ctx.fill();
  ctx.restore();

  const coverUrl =
    listing.images.find((i) => i.isCover)?.url || listing.images[0]?.url || "";
  const coverImg = coverUrl ? await loadImage(coverUrl) : null;
  if (coverImg) {
    drawCoverImage(ctx, coverImg, photoX, photoY, photoW, photoH, 42);
  } else {
    ctx.fillStyle = isVice ? "#1e1b4b" : "#cbd5e1";
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 42);
    ctx.fill();
  }

  // Border frame around photo
  ctx.strokeStyle = isVice ? "rgba(255,255,255,0.22)" : "rgba(15,23,42,0.12)";
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 42);
  ctx.stroke();

  // Top-left discount / condition badge over photo
  let badgeX = photoX + 32;
  const badgeY = photoY + 32;
  if (!listing.isFree && listing.savingsPercent) {
    const label = `-${listing.savingsPercent}% OFF`;
    ctx.font = "900 34px system-ui, -apple-system, sans-serif";
    const bw = ctx.measureText(label).width + 54;
    ctx.fillStyle = "#059669";
    drawRoundedRect(ctx, badgeX, badgeY, bw, 66, 20);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, badgeX + 27, badgeY + 45);
    badgeX += bw + 16;
  } else if (listing.isFree) {
    const label = "GRATIS";
    ctx.font = "900 34px system-ui, -apple-system, sans-serif";
    const bw = ctx.measureText(label).width + 54;
    ctx.fillStyle = "#059669";
    drawRoundedRect(ctx, badgeX, badgeY, bw, 66, 20);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, badgeX + 27, badgeY + 45);
    badgeX += bw + 16;
  }

  const condLabel = (CONDITION_LABELS[listing.condition] || listing.condition).toUpperCase();
  ctx.font = "800 28px system-ui, -apple-system, sans-serif";
  const cw = ctx.measureText(condLabel).width + 44;
  ctx.fillStyle =
    listing.condition === "BRAND_NEW"
      ? "#0891b2"
      : listing.condition === "OUTLET"
      ? "#d97706"
      : "rgba(15,23,42,0.84)";
  drawRoundedRect(ctx, badgeX, badgeY, cw, 66, 20);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(condLabel, badgeX + 22, badgeY + 43);

  // Store logo badge in bottom-right of photo if Official Store
  if (listing.store) {
    const stBoxW = 340;
    const stBoxH = 84;
    const sx = photoX + photoW - stBoxW - 28;
    const sy = photoY + photoH - stBoxH - 28;
    ctx.fillStyle = "rgba(10, 12, 28, 0.88)";
    drawRoundedRect(ctx, sx, sy, stBoxW, stBoxH, 22);
    ctx.fill();
    ctx.strokeStyle = accentA;
    ctx.lineWidth = 3;
    ctx.stroke();

    if (listing.store.logoUrl) {
      const logoImg = await loadImage(listing.store.logoUrl);
      if (logoImg) {
        drawContainImage(ctx, logoImg, sx + 14, sy + 12, 60, 60);
      }
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 26px system-ui, -apple-system, sans-serif";
    const sName =
      listing.store.name.length > 18
        ? `${listing.store.name.slice(0, 17)}…`
        : listing.store.name;
    ctx.fillText(sName, sx + (listing.store.logoUrl ? 86 : 24), sy + 42);
    ctx.fillStyle = accentA;
    ctx.font = "700 18px system-ui, -apple-system, sans-serif";
    ctx.fillText("TIENDA OFICIAL PY", sx + (listing.store.logoUrl ? 86 : 24), sy + 66);
  }

  // 4. Info & Price Panel
  const panelY = 1126;
  const panelH = 540;
  ctx.fillStyle = isVice ? "rgba(15, 23, 42, 0.82)" : "#ffffff";
  drawRoundedRect(ctx, 64, panelY, W - 128, panelH, 42);
  ctx.fill();
  ctx.strokeStyle = isVice ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.09)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Title
  ctx.fillStyle = isVice ? "#f8fafc" : "#0f172a";
  ctx.font = "900 48px system-ui, -apple-system, sans-serif";
  const titleLines = wrapLines(ctx, listing.title, W - 216, 2);
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, 108, panelY + 84 + idx * 60);
  });

  // Price Hero
  const priceY = panelY + (titleLines.length > 1 ? 242 : 196);
  const priceText = formatPrice(listing.price, listing.currency, listing.isFree);
  const priceGrad = ctx.createLinearGradient(108, priceY - 60, 700, priceY);
  if (isVice) {
    priceGrad.addColorStop(0, "#00f0ff");
    priceGrad.addColorStop(1, "#34d399");
  } else {
    priceGrad.addColorStop(0, "#0067c0");
    priceGrad.addColorStop(1, "#059669");
  }
  ctx.fillStyle = priceGrad;
  ctx.font = "900 84px system-ui, -apple-system, sans-serif";
  ctx.fillText(priceText, 108, priceY);

  // Reference price strikethrough
  if (!listing.isFree && listing.referenceNewPrice && listing.referenceNewPrice > listing.price) {
    const refText = `Nuevo ref.: ${formatPrice(listing.referenceNewPrice, listing.currency)}`;
    ctx.fillStyle = isVice ? "#94a3b8" : "#64748b";
    ctx.font = "700 30px system-ui, -apple-system, sans-serif";
    ctx.fillText(refText, 112, priceY + 48);
    const rw = ctx.measureText(refText).width;
    ctx.strokeStyle = isVice ? "#94a3b8" : "#64748b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(112, priceY + 38);
    ctx.lineTo(112 + rw, priceY + 38);
    ctx.stroke();
  }

  // Feature Chips (Location + Delivery + Trade)
  const chips: string[] = [
    `📍 ${[listing.neighborhood?.name, listing.city.name].filter(Boolean).join(", ")}`,
  ];
  if (listing.localDeliveryFree) chips.push("🚚 Delivery gratis");
  else if (listing.localDelivery) chips.push("🚚 Delivery local");
  if (listing.nationalShipping) chips.push("📦 Envíos PY");
  if (listing.acceptsTrade) chips.push("🔄 Permuta");
  if (listing.isNegotiable) chips.push("💬 Negociable");

  let cx = 108;
  let cy = panelY + panelH - 134;
  ctx.font = "700 26px system-ui, -apple-system, sans-serif";
  for (const chip of chips.slice(0, 4)) {
    const tw = ctx.measureText(chip).width + 40;
    if (cx + tw > W - 108) {
      cx = 108;
      cy += 64;
    }
    ctx.fillStyle = isVice ? "rgba(255,255,255,0.1)" : "#f1f5f9";
    drawRoundedRect(ctx, cx, cy, tw, 50, 25);
    ctx.fill();
    ctx.fillStyle = isVice ? "#e2e8f0" : "#334155";
    ctx.fillText(chip, cx + 20, cy + 34);
    cx += tw + 14;
  }

  // 5. Bottom CTA Banner
  const ctaY = 1704;
  const ctaGrad = ctx.createLinearGradient(64, ctaY, W - 64, ctaY + 148);
  ctaGrad.addColorStop(0, accentB);
  ctaGrad.addColorStop(1, accentA);
  ctx.fillStyle = ctaGrad;
  drawRoundedRect(ctx, 64, ctaY, W - 128, 148, 34);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 36px system-ui, -apple-system, sans-serif";
  ctx.fillText("COMPRALO O HACÉ TU OFERTA EN REUSA PY", 104, ctaY + 62);
  ctx.font = "700 26px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  const shortUrl = `reusa-py.vercel.app/aviso/${listing.slug}`;
  ctx.fillText(
    shortUrl.length > 48 ? `${shortUrl.slice(0, 47)}…` : shortUrl,
    104,
    ctaY + 110
  );

  return canvas.toDataURL("image/png", 0.96);
}

export async function renderStoreStoryCard(
  store: CommercialStoreDTO,
  catalog: ListingDTO[],
  theme: StoryCardTheme = "vice"
): Promise<string> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const isVice = theme === "vice";
  const neonA = store.neonColor || "#00f0ff";
  const neonB = store.secondaryNeon || "#ff2a9d";

  // 1. Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  if (isVice) {
    bg.addColorStop(0, "#09061a");
    bg.addColorStop(0.5, "#190c33");
    bg.addColorStop(1, "#0b132b");
  } else {
    bg.addColorStop(0, "#ffffff");
    bg.addColorStop(0.55, "#f0f9ff");
    bg.addColorStop(1, "#e2e8f0");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Brand top glow
  const topGlow = ctx.createRadialGradient(W / 2, 260, 40, W / 2, 260, 560);
  topGlow.addColorStop(0, `${neonA}44`);
  topGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, 900);

  // 2. Top Badge
  const pill = "★ TIENDA OFICIAL 3D · AVENIDA DE MARCAS PY ★";
  ctx.font = "800 26px system-ui, -apple-system, sans-serif";
  const pw = ctx.measureText(pill).width + 64;
  ctx.fillStyle = isVice ? "rgba(255,255,255,0.1)" : "#0f172a";
  drawRoundedRect(ctx, (W - pw) / 2, 74, pw, 62, 31);
  ctx.fill();
  ctx.strokeStyle = neonA;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(pill, (W - pw) / 2 + 32, 114);

  // 3. Logo Box + Store Name
  const logoSize = 230;
  const logoX = (W - logoSize) / 2;
  const logoY = 186;
  ctx.fillStyle = "#0b0f22";
  drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 46);
  ctx.fill();
  ctx.strokeStyle = neonA;
  ctx.lineWidth = 6;
  ctx.stroke();

  if (store.logoUrl) {
    const logoImg = await loadImage(store.logoUrl);
    if (logoImg) {
      drawContainImage(ctx, logoImg, logoX + 24, logoY + 24, logoSize - 48, logoSize - 48);
    }
  } else {
    ctx.fillStyle = neonA;
    ctx.font = "900 96px system-ui, -apple-system, sans-serif";
    const init = store.name.slice(0, 2).toUpperCase();
    const iw = ctx.measureText(init).width;
    ctx.fillText(init, logoX + (logoSize - iw) / 2, logoY + 148);
  }

  // Name & Tagline centered
  ctx.textAlign = "center";
  ctx.fillStyle = isVice ? "#ffffff" : "#0f172a";
  ctx.font = "900 66px system-ui, -apple-system, sans-serif";
  const nameLines = wrapLines(ctx, store.name, W - 140, 2);
  nameLines.forEach((line, idx) => {
    ctx.fillText(line, W / 2, 502 + idx * 72);
  });

  ctx.fillStyle = isVice ? neonA : "#0067c0";
  ctx.font = "700 32px system-ui, -apple-system, sans-serif";
  ctx.fillText(store.tagline.slice(0, 56), W / 2, 502 + nameLines.length * 72 + 16);
  ctx.textAlign = "left";

  // 4. Featured Products Grid (up to 3 items)
  const items = catalog.slice(0, 3);
  const startY = 678;
  const cardH = 264;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const y = startY + i * (cardH + 26);
    ctx.fillStyle = isVice ? "rgba(15, 23, 42, 0.85)" : "#ffffff";
    drawRoundedRect(ctx, 64, y, W - 128, cardH, 34);
    ctx.fill();
    ctx.strokeStyle = isVice ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.1)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const imgUrl = item.images.find((im) => im.isCover)?.url || item.images[0]?.url;
    const prodImg = imgUrl ? await loadImage(imgUrl) : null;
    if (prodImg) {
      drawCoverImage(ctx, prodImg, 88, y + 24, 216, 216, 24);
    } else {
      ctx.fillStyle = "#1e293b";
      drawRoundedRect(ctx, 88, y + 24, 216, 216, 24);
      ctx.fill();
    }

    const tx = 336;
    const maxW = W - 128 - 292;
    ctx.fillStyle = isVice ? "#f8fafc" : "#0f172a";
    ctx.font = "800 34px system-ui, -apple-system, sans-serif";
    const lines = wrapLines(ctx, item.title, maxW, 2);
    lines.forEach((l, li) => {
      ctx.fillText(l, tx, y + 78 + li * 44);
    });

    ctx.fillStyle = isVice ? "#34d399" : "#059669";
    ctx.font = "900 50px system-ui, -apple-system, sans-serif";
    ctx.fillText(formatPrice(item.price, item.currency, item.isFree), tx, y + 206);

    if (item.savingsPercent) {
      const off = `-${item.savingsPercent}%`;
      ctx.font = "900 24px system-ui, -apple-system, sans-serif";
      const ow = ctx.measureText(off).width + 30;
      ctx.fillStyle = "#059669";
      drawRoundedRect(ctx, W - 96 - ow, y + 168, ow, 44, 14);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(off, W - 96 - ow + 15, y + 198);
    }
  }

  // 5. Branch Info Strip
  const infoY = 1564;
  ctx.fillStyle = isVice ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)";
  drawRoundedRect(ctx, 64, infoY, W - 128, 118, 28);
  ctx.fill();
  ctx.fillStyle = isVice ? "#e2e8f0" : "#1e293b";
  ctx.font = "700 26px system-ui, -apple-system, sans-serif";
  const addrLine = store.address
    ? `📍 ${store.address.slice(0, 58)}`
    : `📍 ${store.city?.name || "Paraguay"}`;
  ctx.fillText(addrLine, 100, infoY + 50);
  ctx.fillStyle = isVice ? "#94a3b8" : "#475569";
  ctx.font = "600 24px system-ui, -apple-system, sans-serif";
  const hoursLine = [
    store.openingHours ? `🕒 ${store.openingHours}` : null,
    store.whatsappPhone ? `📱 WhatsApp ${store.whatsappPhone}` : null,
  ]
    .filter(Boolean)
    .join("   ·   ");
  ctx.fillText(hoursLine || "Visitá nuestro showroom interactivo en 3D", 100, infoY + 92);

  // 6. Bottom CTA Link Banner
  const ctaY = 1712;
  const ctaGrad = ctx.createLinearGradient(64, ctaY, W - 64, ctaY + 144);
  ctaGrad.addColorStop(0, neonB);
  ctaGrad.addColorStop(1, neonA);
  ctx.fillStyle = ctaGrad;
  drawRoundedRect(ctx, 64, ctaY, W - 128, 144, 34);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 36px system-ui, -apple-system, sans-serif";
  ctx.fillText("ENTRÁ A NUESTRO SHOWROOM 3D", 104, ctaY + 60);
  ctx.font = "700 28px system-ui, -apple-system, sans-serif";
  ctx.fillText(`reusa-py.vercel.app/tienda/${store.slug}`, 104, ctaY + 108);

  return canvas.toDataURL("image/png", 0.96);
}
