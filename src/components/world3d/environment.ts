import * as THREE from "three";

export type TimeOfDay = "sunset" | "night" | "day";
export type GraphicsQuality = "ultra" | "balanced" | "fast";

export interface TimeOfDayConfig {
  label: string;
  fogColor: number;
  fogDensity: number;
  bgColor: number;
  sunColor: number;
  sunIntensity: number;
  sunPos: [number, number, number];
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  fillColor: number;
  fillIntensity: number;
  sunDiscColor: number;
  sunHaloColor: number;
  sunHaloOpacity: number;
  asphaltRoughness: number;
  asphaltMetalness: number;
  exposure: number;
  oceanShallow: number;
  oceanDeep: number;
  oceanSpecColor: number;
}

export const TIME_PRESETS: Record<TimeOfDay, TimeOfDayConfig> = {
  sunset: {
    label: "Atardecer 80s",
    fogColor: 0x3b1c54,
    fogDensity: 0.007,
    bgColor: 0x1e1035,
    sunColor: 0xffb36b,
    sunIntensity: 1.45,
    sunPos: [18, 42, -105],
    hemiSky: 0xffa8c5,
    hemiGround: 0x2b1847,
    hemiIntensity: 1.05,
    fillColor: 0x38bdf8,
    fillIntensity: 0.6,
    sunDiscColor: 0xffb454,
    sunHaloColor: 0xff3b9a,
    sunHaloOpacity: 0.32,
    asphaltRoughness: 0.64,
    asphaltMetalness: 0.1,
    exposure: 1.04,
    oceanShallow: 0x14b8a6,
    oceanDeep: 0x172554,
    oceanSpecColor: 0xffa94d,
  },
  night: {
    label: "Noche Neón",
    fogColor: 0x0c071c,
    fogDensity: 0.0088,
    bgColor: 0x070414,
    sunColor: 0x93c5fd,
    sunIntensity: 0.78,
    sunPos: [-22, 48, -120],
    hemiSky: 0x4c1d95,
    hemiGround: 0x090d1f,
    hemiIntensity: 0.75,
    fillColor: 0xff2a9d,
    fillIntensity: 0.75,
    sunDiscColor: 0xe2e8f0,
    sunHaloColor: 0x38bdf8,
    sunHaloOpacity: 0.24,
    asphaltRoughness: 0.34,
    asphaltMetalness: 0.26,
    exposure: 1.12,
    oceanShallow: 0x0c4a6e,
    oceanDeep: 0x050816,
    oceanSpecColor: 0x38bdf8,
  },
  day: {
    label: "Día Tropical",
    fogColor: 0x93d5f6,
    fogDensity: 0.0042,
    bgColor: 0x67c6f0,
    sunColor: 0xfff7e6,
    sunIntensity: 1.85,
    sunPos: [38, 68, -75],
    hemiSky: 0xbae6fd,
    hemiGround: 0x78716c,
    hemiIntensity: 1.3,
    fillColor: 0x7dd3fc,
    fillIntensity: 0.45,
    sunDiscColor: 0xfffbeb,
    sunHaloColor: 0xfef08a,
    sunHaloOpacity: 0.36,
    asphaltRoughness: 0.76,
    asphaltMetalness: 0.05,
    exposure: 1.0,
    oceanShallow: 0x2dd4bf,
    oceanDeep: 0x0284c7,
    oceanSpecColor: 0xffffff,
  },
};

export function createSkyTextureForTime(mode: TimeOfDay): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  if (mode === "sunset") {
    grad.addColorStop(0.0, "#100a29");
    grad.addColorStop(0.24, "#2d1457");
    grad.addColorStop(0.45, "#8f2470");
    grad.addColorStop(0.62, "#ea4c7d");
    grad.addColorStop(0.76, "#ff8b54");
    grad.addColorStop(0.9, "#ffd580");
    grad.addColorStop(1.0, "#fff2c6");
  } else if (mode === "night") {
    grad.addColorStop(0.0, "#03020a");
    grad.addColorStop(0.35, "#0b0720");
    grad.addColorStop(0.62, "#1c1042");
    grad.addColorStop(0.82, "#371657");
    grad.addColorStop(1.0, "#0e2240");
  } else {
    grad.addColorStop(0.0, "#0369a1");
    grad.addColorStop(0.32, "#0ea5e9");
    grad.addColorStop(0.62, "#38bdf8");
    grad.addColorStop(0.84, "#bae6fd");
    grad.addColorStop(1.0, "#e0f2fe");
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Stars in sunset & night
  if (mode !== "day") {
    const starCount = mode === "night" ? 260 : 85;
    for (let i = 0; i < starCount; i++) {
      const x = (i * 173 + 31) % 1024;
      const y = (i * 67 + 13) % (mode === "night" ? 320 : 175);
      const r = i % 5 === 0 ? 1.8 : 1.0;
      ctx.fillStyle = `rgba(255,255,255,${mode === "night" ? 0.85 : 0.55})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Soft layered tropical clouds
  const cloudColor =
    mode === "sunset"
      ? "rgba(255, 190, 175, 0.28)"
      : mode === "night"
      ? "rgba(139, 92, 246, 0.14)"
      : "rgba(255, 255, 255, 0.55)";

  ctx.fillStyle = cloudColor;
  for (let c = 0; c < 18; c++) {
    const cx = (c * 137 + 40) % 1024;
    const cy = 175 + ((c * 41) % 145);
    const rx = 55 + (c % 4) * 28;
    const ry = 14 + (c % 3) * 7;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + rx * 0.45, cy - 6, rx * 0.65, ry * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

export function buildPmremEnvironment(
  renderer: THREE.WebGLRenderer,
  mode: TimeOfDay
): { envRT: THREE.WebGLRenderTarget; skyTexture: THREE.CanvasTexture } {
  const skyTexture = createSkyTextureForTime(mode);
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromEquirectangular(skyTexture);
  pmrem.dispose();
  return { envRT, skyTexture };
}
