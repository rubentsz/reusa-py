"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import {
  ArrowUp,
  Car,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  ExternalLink,
  Heart,
  Link2,
  Menu,
  MessageCircle,
  Monitor,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Store,
  Sun,
  Sunrise,
  User,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import { STORE_THEMES, getStoreTheme, type StoreTheme } from "@/components/world3d/vicePalette";
import {
  buildViceExterior,
  type AABB,
  type DrivableCar,
  type ExteriorWorldHandle,
} from "@/components/world3d/buildExterior";
import {
  buildStoreInterior,
  type InteriorWorldHandle,
} from "@/components/world3d/buildInterior";
import { buildVicePlayer } from "@/components/world3d/buildPlayer";
import {
  TIME_PRESETS,
  buildPmremEnvironment,
  type GraphicsQuality,
  type TimeOfDay,
} from "@/components/world3d/environment";
import { ViceAudioEngine } from "@/components/world3d/audio";
import { ListingDetailView } from "@/components/views/ListingDetailView";
import { PublishView } from "@/components/views/PublishView";
import { ChatView } from "@/components/views/ChatView";
import { FavoritesAlertsView } from "@/components/views/FavoritesAlertsView";
import { ProfileView } from "@/components/views/ProfileView";
import { AuthView } from "@/components/views/AuthView";
import { AdminModerationView } from "@/components/views/AdminModerationView";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatPrice } from "@/lib/format";
import type { ListingDTO } from "@/types/marketplace";

export type WorldModal =
  | { kind: "listing"; slug: string; title?: string }
  | { kind: "publish"; editId?: string }
  | { kind: "chat"; conversationId?: string }
  | { kind: "favorites" }
  | { kind: "profile"; userId?: string }
  | { kind: "auth" }
  | { kind: "admin" }
  | null;

type PromptState =
  | { kind: "enter_store"; theme: StoreTheme; count: number }
  | { kind: "inspect_listing"; listing: ListingDTO }
  | { kind: "exit_store"; theme: StoreTheme }
  | { kind: "publish_here"; categoryName: string }
  | { kind: "talk_npc"; storeName: string }
  | { kind: "use_kiosk" }
  | { kind: "enter_car"; carId: string; carName: string }
  | null;

interface InspectedStandState {
  listing: ListingDTO;
  photoIdx: number;
}

const QUALITY_LABELS: Record<GraphicsQuality, string> = {
  ultra: "Ultra",
  balanced: "Medio",
  fast: "Rápido",
};

const TIME_OPTIONS: { id: TimeOfDay; shortLabel: string; label: string }[] = [
  { id: "sunset", shortLabel: "Atardecer", label: "Atardecer 80s" },
  { id: "night", shortLabel: "Noche", label: "Noche Neón" },
  { id: "day", shortLabel: "Día", label: "Día Tropical" },
];

function resolveExteriorBounds(
  pos: THREE.Vector3,
  bounds: AABB,
  pierBounds: AABB,
  allowPier: boolean
) {
  if (
    allowPier &&
    pos.z < bounds.minZ + 1.5 &&
    pos.x > pierBounds.minX - 0.8 &&
    pos.x < pierBounds.maxX + 0.8
  ) {
    pos.x = Math.max(pierBounds.minX, Math.min(pierBounds.maxX, pos.x));
    pos.z = Math.max(pierBounds.minZ, pos.z);
    return;
  }
  pos.x = Math.max(bounds.minX, Math.min(bounds.maxX, pos.x));
  pos.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, pos.z));
}

function resolveColliders(pos: THREE.Vector3, colliders: AABB[], radius = 0.55) {
  for (const box of colliders) {
    const minX = box.minX - radius;
    const maxX = box.maxX + radius;
    const minZ = box.minZ - radius;
    const maxZ = box.maxZ + radius;
    if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
      const dxLeft = pos.x - minX;
      const dxRight = maxX - pos.x;
      const dzTop = pos.z - minZ;
      const dzBottom = maxZ - pos.z;
      const minPen = Math.min(dxLeft, dxRight, dzTop, dzBottom);
      if (minPen === dxLeft) pos.x = minX;
      else if (minPen === dxRight) pos.x = maxX;
      else if (minPen === dzTop) pos.z = minZ;
      else pos.z = maxZ;
    }
  }
}

export function ViceCityWorld({
  initialModal = null,
}: {
  initialModal?: WorldModal;
}) {
  const {
    user,
    categories,
    departments,
    listings,
    filters,
    updateFilters,
    resetFilters,
    favoriteIds,
    toggleFavorite,
    unreadChatCount,
    unreadNotifCount,
    isMobileViewport,
    setExperienceMode,
    worldModal,
    setWorldModal,
    notifyToast,
  } = useApp();

  useEffect(() => {
    if (initialModal) setWorldModal(initialModal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activeStoreSlug, setActiveStoreSlug] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [radarState, setRadarState] = useState({ x: 0, z: 38, yaw: Math.PI });
  const [showStoreMenu, setShowStoreMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showKioskPanel, setShowKioskPanel] = useState(false);
  const [showNpcPanel, setShowNpcPanel] = useState(false);

  // Definitive Edition v3 Realism & Interactive Showroom States
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("sunset");
  const [quality, setQuality] = useState<GraphicsQuality>(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "balanced" : "ultra"
  );
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [inspectedSpot, setInspectedSpot] = useState<InspectedStandState | null>(null);

  // Gameplay HUD states
  const [drivingCar, setDrivingCar] = useState<{ id: string; name: string; kmh: number } | null>(
    null
  );
  const [nearbyCar, setNearbyCar] = useState<{ id: string; name: string } | null>(null);
  const [mobileSprint, setMobileSprint] = useState(false);

  // Refs synced for 60fps loop & reliable keyboard shortcuts
  const activeStoreRef = useRef<string | null>(null);
  const modalOpenRef = useRef<boolean>(false);
  const worldModalRef = useRef<WorldModal>(worldModal);
  const showKioskRef = useRef<boolean>(false);
  const showNpcRef = useRef<boolean>(false);
  const inspectedSpotRef = useRef<InspectedStandState | null>(null);
  const timeOfDayRef = useRef<TimeOfDay>("sunset");
  const qualityRef = useRef<GraphicsQuality>(quality);
  const promptRef = useRef<PromptState>(null);
  const doorCooldownRef = useRef<number>(0);
  const drivenCarIdRef = useRef<string | null>(null);
  const nearbyCarRef = useRef<{ id: string; name: string } | null>(null);
  const mobileSprintRef = useRef<boolean>(false);
  const favoriteIdsRef = useRef<Set<string>>(favoriteIds);

  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 38));
  const playerVelYRef = useRef<number>(0);
  const playerYawRef = useRef<number>(Math.PI);
  const camYawRef = useRef<number>(0);
  const camPitchRef = useRef<number>(0.24);
  const camDistRef = useRef<number>(8.2);
  const currentLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.55, 38));
  const keysRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joyVisual, setJoyVisual] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  // Three.js + Audio + Postprocessing refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const exteriorRef = useRef<ExteriorWorldHandle | null>(null);
  const interiorRef = useRef<InteriorWorldHandle | null>(null);
  const playerRigRef = useRef<ReturnType<typeof buildVicePlayer> | null>(null);
  const exteriorLightsRef = useRef<THREE.Group | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const fillLightRef = useRef<THREE.DirectionalLight | null>(null);
  const envRTRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const skyTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const audioRef = useRef<ViceAudioEngine | null>(null);
  const isFirstExteriorEffectRef = useRef<boolean>(true);
  const isFirstEnvEffectRef = useRef<boolean>(true);

  useEffect(() => {
    worldModalRef.current = worldModal;
    showKioskRef.current = showKioskPanel;
    showNpcRef.current = showNpcPanel;
    inspectedSpotRef.current = inspectedSpot;
    modalOpenRef.current = Boolean(
      worldModal || showKioskPanel || showNpcPanel || inspectedSpot
    );
  }, [worldModal, showKioskPanel, showNpcPanel, inspectedSpot]);

  useEffect(() => {
    mobileSprintRef.current = mobileSprint;
  }, [mobileSprint]);

  useEffect(() => {
    favoriteIdsRef.current = favoriteIds;
  }, [favoriteIds]);

  useEffect(() => {
    timeOfDayRef.current = timeOfDay;
  }, [timeOfDay]);

  useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);

  const listingCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of listings) {
      counts[l.category.slug] = (counts[l.category.slug] || 0) + 1;
    }
    return counts;
  }, [listings]);

  const listingCountRef = useRef<Record<string, number>>(listingCountByCategory);
  useEffect(() => {
    listingCountRef.current = listingCountByCategory;
  }, [listingCountByCategory]);

  const topDealListing = useMemo(() => {
    return (
      [...listings]
        .filter((l) => !l.isFree && (l.savingsPercent ?? 0) > 0)
        .sort((a, b) => (b.savingsPercent ?? 0) - (a.savingsPercent ?? 0))[0] ||
      listings[0] ||
      null
    );
  }, [listings]);

  const activeCategoryObj = useMemo(
    () => categories.find((c) => c.slug === activeStoreSlug) || null,
    [categories, activeStoreSlug]
  );

  const availableSubcategories = useMemo(() => {
    if (activeCategoryObj?.children && activeCategoryObj.children.length > 0) {
      return activeCategoryObj.children.map((sc) => ({
        id: sc.id,
        slug: sc.slug,
        label: sc.name,
      }));
    }
    const all: { id: string; slug: string; label: string }[] = [];
    for (const c of categories) {
      if (c.children) {
        for (const sc of c.children) {
          all.push({ id: sc.id, slug: sc.slug, label: `${c.name} · ${sc.name}` });
        }
      }
    }
    return all;
  }, [activeCategoryObj, categories]);

  const activeStoreListings = useMemo(() => {
    if (!activeStoreSlug) return [];
    return listings.filter((l) => l.category.slug === activeStoreSlug);
  }, [listings, activeStoreSlug]);

  const bestStoreDeal = useMemo(() => {
    if (activeStoreListings.length === 0) return null;
    const freeOne = activeStoreListings.find((l) => l.isFree);
    const highestSavings = [...activeStoreListings]
      .filter((l) => (l.savingsPercent ?? 0) > 0)
      .sort((a, b) => (b.savingsPercent ?? 0) - (a.savingsPercent ?? 0))[0];
    return highestSavings || freeOne || activeStoreListings[0];
  }, [activeStoreListings]);

  const activeTheme = useMemo(
    () => (activeStoreSlug ? getStoreTheme(activeStoreSlug) : null),
    [activeStoreSlug]
  );

  const applyEnvironmentToScene = useCallback((mode: TimeOfDay) => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    if (!renderer || !scene) return;

    const cfg = TIME_PRESETS[mode];
    const { envRT, skyTexture } = buildPmremEnvironment(renderer, mode);

    if (envRTRef.current) envRTRef.current.dispose();
    if (skyTextureRef.current) skyTextureRef.current.dispose();

    envRTRef.current = envRT;
    skyTextureRef.current = skyTexture;
    scene.environment = envRT.texture;
    renderer.toneMappingExposure = cfg.exposure;

    if (!activeStoreRef.current) {
      scene.background = new THREE.Color(cfg.bgColor);
      scene.fog = new THREE.FogExp2(cfg.fogColor, cfg.fogDensity);
    }

    if (hemiLightRef.current) {
      hemiLightRef.current.color.setHex(cfg.hemiSky);
      hemiLightRef.current.groundColor.setHex(cfg.hemiGround);
      hemiLightRef.current.intensity = cfg.hemiIntensity;
    }
    if (sunLightRef.current) {
      sunLightRef.current.color.setHex(cfg.sunColor);
      sunLightRef.current.intensity = cfg.sunIntensity;
      sunLightRef.current.position.set(cfg.sunPos[0], cfg.sunPos[1], cfg.sunPos[2]);
    }
    if (fillLightRef.current) {
      fillLightRef.current.color.setHex(cfg.fillColor);
      fillLightRef.current.intensity = cfg.fillIntensity;
    }

    if (exteriorRef.current) {
      exteriorRef.current.applyTimeOfDay(mode, skyTexture);
    }
  }, []);

  const snapCameraBehindPlayer = useCallback((isInside: boolean) => {
    const cam = cameraRef.current;
    const container = mountRef.current;
    if (!cam || !container) return;
    const isPortrait = container.clientWidth / Math.max(1, container.clientHeight) < 0.85;
    cam.fov = isPortrait ? 68 : 56;
    cam.updateProjectionMatrix();
    const baseDist = isInside ? (isPortrait ? 8.2 : 6.2) : isPortrait ? 11.2 : 8.2;
    camDistRef.current = baseDist;
    const horiz = Math.cos(camPitchRef.current) * baseDist;
    const vert = Math.sin(camPitchRef.current) * baseDist + 1.9;
    cam.position.set(
      playerPosRef.current.x + Math.sin(camYawRef.current) * horiz,
      vert,
      playerPosRef.current.z + Math.cos(camYawRef.current) * horiz
    );
    currentLookAtRef.current.set(playerPosRef.current.x, 1.55, playerPosRef.current.z);
    cam.lookAt(currentLookAtRef.current);
  }, []);

  const openStandInspection = useCallback((listing: ListingDTO) => {
    const coverIdx = Math.max(
      0,
      listing.images.findIndex((i) => i.isCover)
    );
    const spot = interiorRef.current?.productSpots.find((s) => s.listing.id === listing.id);
    if (spot) {
      spot.setPhotoIndex(coverIdx);
    }
    const next = { listing, photoIdx: coverIdx };
    inspectedSpotRef.current = next;
    setInspectedSpot(next);
    audioRef.current?.playClick();
  }, []);

  const closeStandInspection = useCallback(() => {
    inspectedSpotRef.current = null;
    setInspectedSpot(null);
    audioRef.current?.playClick();
  }, []);

  const stepInspectedPhoto = useCallback((delta: number) => {
    const cur = inspectedSpotRef.current;
    if (!cur) return;
    const len = cur.listing.images.length;
    if (len <= 1) return;
    const nextIdx = ((cur.photoIdx + delta) % len + len) % len;
    const spot = interiorRef.current?.productSpots.find((s) => s.listing.id === cur.listing.id);
    if (spot) {
      spot.setPhotoIndex(nextIdx);
    }
    const updated = { listing: cur.listing, photoIdx: nextIdx };
    inspectedSpotRef.current = updated;
    setInspectedSpot(updated);
    audioRef.current?.playClick();
  }, []);

  const handleShareListing = useCallback(
    (listing: ListingDTO) => {
      if (typeof window === "undefined") return;
      const url = `${window.location.origin}/aviso/${listing.slug}`;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(url)
          .then(() => notifyToast("Enlace del aviso copiado", "success"))
          .catch(() => notifyToast("Copiá el enlace desde la ficha", "info"));
      } else {
        notifyToast(url, "info");
      }
      audioRef.current?.playClick();
    },
    [notifyToast]
  );

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      audioRef.current?.setEnabled(next);
      return next;
    });
  }, []);

  const cycleQuality = useCallback(() => {
    const order: GraphicsQuality[] = ["ultra", "balanced", "fast"];
    setQuality((prev) => {
      const next = order[(order.indexOf(prev) + 1) % order.length];
      notifyToast(`Calidad gráfica: ${QUALITY_LABELS[next]}`, "info");
      return next;
    });
    audioRef.current?.playClick();
  }, [notifyToast]);

  const selectTimeOfDay = useCallback(
    (next: TimeOfDay) => {
      setTimeOfDay(next);
      audioRef.current?.playClick();
      notifyToast(`Ambiente: ${TIME_PRESETS[next].label}`, "info");
    },
    [notifyToast]
  );

  const exitCar = useCallback(() => {
    const curId = drivenCarIdRef.current;
    if (!curId || !exteriorRef.current) return;
    const car = exteriorRef.current.cars.find((c) => c.id === curId);
    if (car) {
      car.speed = 0;
      car.braking = false;
      car.bodyGroup.rotation.z = 0;
      const sideX = car.mesh.position.x + Math.cos(car.yaw) * 2.1;
      const sideZ = car.mesh.position.z - Math.sin(car.yaw) * 2.1;
      playerPosRef.current.set(sideX, 0, sideZ);
      resolveExteriorBounds(
        playerPosRef.current,
        exteriorRef.current.bounds,
        exteriorRef.current.pierBounds,
        true
      );
      resolveColliders(playerPosRef.current, exteriorRef.current.colliders);
    }
    drivenCarIdRef.current = null;
    setDrivingCar(null);
    if (playerRigRef.current) playerRigRef.current.group.visible = true;
    doorCooldownRef.current = performance.now() + 700;
    audioRef.current?.playClick();
  }, []);

  const enterCar = useCallback(
    (carId: string) => {
      if (activeStoreRef.current || !exteriorRef.current) return;
      const car = exteriorRef.current.cars.find((c) => c.id === carId);
      if (!car) return;
      drivenCarIdRef.current = car.id;
      car.speed = 0;
      car.braking = false;
      if (playerRigRef.current) playerRigRef.current.group.visible = false;
      camYawRef.current = car.yaw + Math.PI;
      setDrivingCar({ id: car.id, name: car.name, kmh: 0 });
      audioRef.current?.playClick();
      notifyToast(`Subiste al ${car.name} · H: Bocina · F: Bajar`, "info");
    },
    [notifyToast]
  );

  const triggerHorn = useCallback(() => {
    const curId = drivenCarIdRef.current;
    if (!curId || !exteriorRef.current) return;
    const car = exteriorRef.current.cars.find((c) => c.id === curId);
    if (car) {
      car.hornFlash = 0.55;
      audioRef.current?.playHorn();
    }
  }, []);

  const triggerJump = useCallback(() => {
    if (drivenCarIdRef.current || modalOpenRef.current) return;
    if (playerPosRef.current.y <= 0.02) {
      playerVelYRef.current = 7.4;
    }
  }, []);

  const enterStore = useCallback(
    (categorySlug: string) => {
      if (activeStoreRef.current === categorySlug) return;
      if (drivenCarIdRef.current) exitCar();
      audioRef.current?.playDoorChime();
      setTransitioning(true);
      setShowStoreMenu(false);
      setShowMobileMenu(false);
      setShowKioskPanel(false);
      setShowNpcPanel(false);
      inspectedSpotRef.current = null;
      setInspectedSpot(null);
      setTimeout(() => {
        activeStoreRef.current = categorySlug;
        setActiveStoreSlug(categorySlug);
        doorCooldownRef.current = performance.now() + 1400;
        setTimeout(() => setTransitioning(false), 180);
      }, 150);
    },
    [exitCar]
  );

  const exitStore = useCallback(() => {
    const prevSlug = activeStoreRef.current;
    if (!prevSlug) return;
    const theme = getStoreTheme(prevSlug);
    audioRef.current?.playDoorChime();
    setTransitioning(true);
    setShowKioskPanel(false);
    setShowNpcPanel(false);
    inspectedSpotRef.current = null;
    setInspectedSpot(null);
    setTimeout(() => {
      activeStoreRef.current = null;
      setActiveStoreSlug(null);
      playerPosRef.current.set(theme.spawnExitX, 0, theme.spawnExitZ);
      playerVelYRef.current = 0;
      playerYawRef.current = theme.side === "west" ? Math.PI / 2 : -Math.PI / 2;
      camYawRef.current = theme.side === "west" ? -Math.PI / 2 : Math.PI / 2;
      doorCooldownRef.current = performance.now() + 1800;
      snapCameraBehindPlayer(false);
      setTimeout(() => setTransitioning(false), 180);
    }, 150);
  }, [snapCameraBehindPlayer]);

  const triggerPromptAction = useCallback(() => {
    const p = promptRef.current;
    if (!p) return;
    if (p.kind === "enter_store") {
      enterStore(p.theme.categorySlug);
    } else if (p.kind === "exit_store") {
      exitStore();
    } else if (p.kind === "inspect_listing") {
      openStandInspection(p.listing);
    } else if (p.kind === "publish_here") {
      setWorldModal({ kind: "publish" });
    } else if (p.kind === "talk_npc") {
      setShowNpcPanel(true);
    } else if (p.kind === "use_kiosk") {
      setShowKioskPanel(true);
    } else if (p.kind === "enter_car") {
      enterCar(p.carId);
    }
  }, [enterCar, enterStore, exitStore, openStandInspection, setWorldModal]);

  const rebuildExteriorInScene = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (exteriorRef.current) {
      scene.remove(exteriorRef.current.group);
    }
    const ext = buildViceExterior(
      listingCountByCategory,
      topDealListing,
      skyTextureRef.current || undefined
    );
    if (skyTextureRef.current) {
      ext.applyTimeOfDay(timeOfDayRef.current, skyTextureRef.current);
    }
    ext.group.visible = !activeStoreRef.current;
    exteriorRef.current = ext;
    scene.add(ext.group);
  }, [listingCountByCategory, topDealListing]);

  const rebuildInteriorInScene = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (interiorRef.current) {
      scene.remove(interiorRef.current.group);
      interiorRef.current = null;
    }

    if (activeStoreSlug) {
      const theme = getStoreTheme(activeStoreSlug);
      const catName =
        categories.find((c) => c.slug === activeStoreSlug)?.name || theme.viceName;
      const storeListings = listings.filter((l) => l.category.slug === activeStoreSlug);
      const interior = buildStoreInterior(theme, catName, storeListings, favoriteIdsRef.current);
      interiorRef.current = interior;
      scene.add(interior.group);

      if (exteriorRef.current) exteriorRef.current.group.visible = false;
      if (exteriorLightsRef.current) exteriorLightsRef.current.visible = false;
      scene.background = new THREE.Color(0x0f081e);
      scene.fog = new THREE.FogExp2(0x140c24, 0.014);

      playerPosRef.current.copy(interior.spawnPos);
      playerVelYRef.current = 0;
      playerYawRef.current = Math.PI;
      camYawRef.current = 0;
      camPitchRef.current = 0.24;
      snapCameraBehindPlayer(true);
    } else {
      if (exteriorRef.current) exteriorRef.current.group.visible = true;
      if (exteriorLightsRef.current) exteriorLightsRef.current.visible = true;
      const cfg = TIME_PRESETS[timeOfDayRef.current];
      scene.background = new THREE.Color(cfg.bgColor);
      scene.fog = new THREE.FogExp2(cfg.fogColor, cfg.fogDensity);
    }
  }, [activeStoreSlug, categories, listings, snapCameraBehindPlayer]);

  // Live Time-of-Day updates after initial mount
  useEffect(() => {
    if (isFirstEnvEffectRef.current) {
      isFirstEnvEffectRef.current = false;
      return;
    }
    applyEnvironmentToScene(timeOfDay);
  }, [timeOfDay, applyEnvironmentToScene]);

  // Live Graphics Quality updates (Bloom, Shadows, DPR)
  useEffect(() => {
    const renderer = rendererRef.current;
    const container = mountRef.current;
    if (!renderer || !container) return;

    const dpr =
      quality === "ultra"
        ? Math.min(window.devicePixelRatio || 1, 2)
        : quality === "balanced"
        ? Math.min(window.devicePixelRatio || 1, 1.5)
        : 1;

    renderer.setPixelRatio(dpr);
    renderer.shadowMap.enabled = quality !== "fast";
    renderer.shadowMap.needsUpdate = true;
    if (sunLightRef.current) {
      sunLightRef.current.castShadow = quality !== "fast";
    }

    const w = container.clientWidth;
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h);
    if (composerRef.current) {
      composerRef.current.setPixelRatio(dpr);
      composerRef.current.setSize(w, h);
    }
    if (bloomPassRef.current) {
      bloomPassRef.current.resolution.set(w, h);
    }
  }, [quality]);

  // Mount Three.js WebGL Definitive Edition engine once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const audio = new ViceAudioEngine();
    audioRef.current = audio;

    const initialCfg = TIME_PRESETS[timeOfDayRef.current];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(initialCfg.bgColor);
    scene.fog = new THREE.FogExp2(initialCfg.fogColor, initialCfg.fogDensity);
    sceneRef.current = scene;

    const wInit = container.clientWidth;
    const hInit = Math.max(1, container.clientHeight);
    const aspect = wInit / hInit;
    const isPortraitInit = aspect < 0.85;
    const camera = new THREE.PerspectiveCamera(isPortraitInit ? 68 : 56, aspect, 0.1, 480);
    cameraRef.current = camera;

    const initDpr =
      qualityRef.current === "ultra"
        ? Math.min(window.devicePixelRatio || 1, 2)
        : qualityRef.current === "balanced"
        ? Math.min(window.devicePixelRatio || 1, 1.5)
        : 1;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(initDpr);
    renderer.setSize(wInit, hInit);
    renderer.shadowMap.enabled = qualityRef.current !== "fast";
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = initialCfg.exposure;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Selective UnrealBloom Post-Processing Pipeline (used when quality === "ultra")
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(initDpr);
    composer.setSize(wInit, hInit);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(wInit, hInit),
      0.2,
      0.35,
      0.94
    );
    const outputPass = new OutputPass();
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(outputPass);
    composerRef.current = composer;
    bloomPassRef.current = bloomPass;

    // Exterior Light Rig (dynamically driven by TIME_PRESETS)
    const extLights = new THREE.Group();
    const hemi = new THREE.HemisphereLight(
      initialCfg.hemiSky,
      initialCfg.hemiGround,
      initialCfg.hemiIntensity
    );
    extLights.add(hemi);
    hemiLightRef.current = hemi;

    const sunLight = new THREE.DirectionalLight(initialCfg.sunColor, initialCfg.sunIntensity);
    sunLight.position.set(initialCfg.sunPos[0], initialCfg.sunPos[1], initialCfg.sunPos[2]);
    sunLight.castShadow = qualityRef.current !== "fast";
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.left = -45;
    sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 75;
    sunLight.shadow.camera.bottom = -75;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 230;
    sunLight.shadow.bias = -0.0005;
    extLights.add(sunLight);
    sunLightRef.current = sunLight;

    const fillLight = new THREE.DirectionalLight(initialCfg.fillColor, initialCfg.fillIntensity);
    fillLight.position.set(-28, 18, 45);
    extLights.add(fillLight);
    fillLightRef.current = fillLight;

    scene.add(extLights);
    exteriorLightsRef.current = extLights;

    // Build initial PMREM PBR reflections & sky texture
    const { envRT, skyTexture } = buildPmremEnvironment(renderer, timeOfDayRef.current);
    envRTRef.current = envRT;
    skyTextureRef.current = skyTexture;
    scene.environment = envRT.texture;

    const player = buildVicePlayer();
    player.group.position.copy(playerPosRef.current);
    player.group.rotation.y = playerYawRef.current;
    scene.add(player.group);
    playerRigRef.current = player;

    const ext = buildViceExterior(listingCountRef.current, topDealListing, skyTexture);
    ext.applyTimeOfDay(timeOfDayRef.current, skyTexture);
    exteriorRef.current = ext;
    scene.add(ext.group);

    // Position camera immediately on frame 1 (critical for crisp mobile portrait framing!)
    snapCameraBehindPlayer(false);

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (e.key === "Escape") {
        if (worldModalRef.current) setWorldModal(null);
        else if (inspectedSpotRef.current) closeStandInspection();
        else if (showKioskRef.current) setShowKioskPanel(false);
        else if (showNpcRef.current) setShowNpcPanel(false);
        else if (drivenCarIdRef.current) exitCar();
        else if (activeStoreRef.current) exitStore();
        return;
      }

      if (isTyping) return;

      // Flip 3D product photos with ArrowLeft / ArrowRight during cinematic inspection
      if (inspectedSpotRef.current && !worldModalRef.current) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          stepInspectedPhoto(-1);
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          stepInspectedPhoto(1);
          return;
        }
        return;
      }

      if (modalOpenRef.current) return;

      const lower = e.key.toLowerCase();
      if (lower === "e" || e.key === "Enter") {
        triggerPromptAction();
        return;
      }
      if (lower === "f") {
        if (drivenCarIdRef.current) {
          exitCar();
        } else if (nearbyCarRef.current) {
          enterCar(nearbyCarRef.current.id);
        }
        return;
      }
      if (lower === "h" && drivenCarIdRef.current) {
        triggerHorn();
        return;
      }
      if (lower === "q" && promptRef.current?.kind === "inspect_listing") {
        toggleFavorite(promptRef.current.listing.id);
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        triggerJump();
        return;
      }
      keysRef.current.add(lower);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let lastX = 0;
    let lastY = 0;
    let totalDragDist = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (modalOpenRef.current) return;
      dragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      totalDragDist = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      totalDragDist += Math.hypot(dx, dy);

      camYawRef.current -= dx * 0.0065;
      camPitchRef.current = Math.max(0.08, Math.min(0.75, camPitchRef.current + dy * 0.0045));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;

      if (totalDragDist < 8 && Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) < 8) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);

        const targets = activeStoreRef.current
          ? interiorRef.current?.clickableMeshes || []
          : exteriorRef.current?.clickableMeshes || [];

        const hits = raycaster.intersectObjects(targets, false);
        if (hits.length > 0) {
          const ud = hits[0].object.userData;
          if (ud?.type === "store" && ud.categorySlug) {
            enterStore(ud.categorySlug);
          } else if (ud?.type === "listing" && ud.listing) {
            if (activeStoreRef.current) {
              openStandInspection(ud.listing);
            } else {
              setWorldModal({
                kind: "listing",
                slug: ud.listing.slug,
                title: ud.listing.title,
              });
            }
          } else if (ud?.type === "publish") {
            setWorldModal({ kind: "publish" });
          } else if (ud?.type === "npc") {
            setShowNpcPanel(true);
          } else if (ud?.type === "kiosk") {
            setShowKioskPanel(true);
          } else if (ud?.type === "exit") {
            exitStore();
          } else if (ud?.type === "car" && ud.carId && !drivenCarIdRef.current) {
            enterCar(ud.carId);
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (modalOpenRef.current) return;
      camDistRef.current = Math.max(4.8, Math.min(15, camDistRef.current + e.deltaY * 0.006));
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      const nextAspect = w / h;
      camera.aspect = nextAspect;
      camera.fov = nextAspect < 0.85 ? 68 : 56;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", onResize);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });

    let rafId = 0;
    let lastTime = performance.now();
    let hudTick = 0;
    const moveVec = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    const desiredCamPos = new THREE.Vector3();

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = now * 0.001;

      const keys = keysRef.current;
      let inputForward = 0;
      let inputRight = 0;

      if (!modalOpenRef.current) {
        if (keys.has("w") || keys.has("arrowup")) inputForward += 1;
        if (keys.has("s") || keys.has("arrowdown")) inputForward -= 1;
        if (keys.has("d") || keys.has("arrowright")) inputRight += 1;
        if (keys.has("a") || keys.has("arrowleft")) inputRight -= 1;

        if (Math.abs(joystickRef.current.x) > 0.08 || Math.abs(joystickRef.current.y) > 0.08) {
          inputRight += joystickRef.current.x;
          inputForward -= joystickRef.current.y;
        }
      }

      const isInside = Boolean(activeStoreRef.current);
      let activeDrivenCar: DrivableCar | null = null;
      let currentSpeedForAudio = 0;

      // 1. DRIVING PHYSICS MODE (GTA Vice City cruising!)
      if (!isInside && drivenCarIdRef.current && exteriorRef.current) {
        activeDrivenCar =
          exteriorRef.current.cars.find((c) => c.id === drivenCarIdRef.current) || null;
        if (activeDrivenCar) {
          const accel = inputForward > 0 ? 18 : inputForward < 0 ? 22 : 0;
          activeDrivenCar.braking = inputForward < -0.05;

          if (inputForward > 0.05) {
            activeDrivenCar.speed = Math.min(23, activeDrivenCar.speed + accel * inputForward * dt);
          } else if (inputForward < -0.05) {
            activeDrivenCar.speed = Math.max(-9, activeDrivenCar.speed + accel * inputForward * dt);
          } else {
            activeDrivenCar.speed *= Math.pow(0.18, dt);
            if (Math.abs(activeDrivenCar.speed) < 0.15) activeDrivenCar.speed = 0;
          }

          const steerFactor =
            Math.min(1, Math.abs(activeDrivenCar.speed) / 4.5) *
            (activeDrivenCar.speed >= 0 ? 1 : -1);
          const turnRate = 2.15 * steerFactor * -inputRight;
          activeDrivenCar.yaw += turnRate * dt;
          activeDrivenCar.bodyGroup.rotation.z = THREE.MathUtils.lerp(
            activeDrivenCar.bodyGroup.rotation.z,
            inputRight * steerFactor * 0.09,
            Math.min(1, dt * 8)
          );

          activeDrivenCar.mesh.position.x +=
            Math.sin(activeDrivenCar.yaw) * activeDrivenCar.speed * dt;
          activeDrivenCar.mesh.position.z +=
            Math.cos(activeDrivenCar.yaw) * activeDrivenCar.speed * dt;
          activeDrivenCar.mesh.rotation.y = activeDrivenCar.yaw;

          const carPos = activeDrivenCar.mesh.position;
          const prevX = carPos.x;
          const prevZ = carPos.z;
          resolveExteriorBounds(
            carPos,
            exteriorRef.current.bounds,
            exteriorRef.current.pierBounds,
            false
          );
          resolveColliders(carPos, exteriorRef.current.colliders, 1.35);
          if (Math.hypot(carPos.x - prevX, carPos.z - prevZ) > 0.05) {
            activeDrivenCar.speed *= 0.45;
          }

          playerPosRef.current.set(carPos.x, 0, carPos.z);
          playerYawRef.current = activeDrivenCar.yaw;

          if (!dragging && Math.abs(activeDrivenCar.speed) > 1.5) {
            const desiredChaseYaw = activeDrivenCar.yaw + Math.PI;
            let diff = desiredChaseYaw - camYawRef.current;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            camYawRef.current += diff * Math.min(1, dt * 3.2);
          }

          exteriorRef.current.update(elapsed, dt, playerPosRef.current, activeDrivenCar.id);
        }
      } else {
        // 2. ON-FOOT MOVEMENT + JUMP + SPRINT
        const isSprinting = keys.has("shift") || mobileSprintRef.current;
        const speed = isSprinting ? 11.8 : 7.0;
        const inputLen = Math.hypot(inputForward, inputRight);

        if (inputLen > 0.05) {
          const nf = inputForward / Math.max(1, inputLen);
          const nr = inputRight / Math.max(1, inputLen);
          const forwardX = -Math.sin(camYawRef.current);
          const forwardZ = -Math.cos(camYawRef.current);
          const rightX = Math.cos(camYawRef.current);
          const rightZ = -Math.sin(camYawRef.current);

          moveVec.set(forwardX * nf + rightX * nr, 0, forwardZ * nf + rightZ * nr);
          if (moveVec.lengthSq() > 0.0001) {
            moveVec.normalize();
            playerPosRef.current.x += moveVec.x * speed * dt;
            playerPosRef.current.z += moveVec.z * speed * dt;
            currentSpeedForAudio = speed;

            const targetYaw = Math.atan2(moveVec.x, moveVec.z);
            let diff = targetYaw - playerYawRef.current;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            playerYawRef.current += diff * Math.min(1, dt * 12);
          }
        }

        if (playerPosRef.current.y > 0 || playerVelYRef.current > 0) {
          playerPosRef.current.y += playerVelYRef.current * dt;
          playerVelYRef.current -= 20 * dt;
          if (playerPosRef.current.y <= 0) {
            playerPosRef.current.y = 0;
            playerVelYRef.current = 0;
          }
        }

        if (isInside && interiorRef.current) {
          const b = interiorRef.current.bounds;
          playerPosRef.current.x = Math.max(b.minX, Math.min(b.maxX, playerPosRef.current.x));
          playerPosRef.current.z = Math.max(b.minZ, Math.min(b.maxZ, playerPosRef.current.z));
          resolveColliders(playerPosRef.current, interiorRef.current.colliders);
          interiorRef.current.update(elapsed, playerPosRef.current, favoriteIdsRef.current);

          let nextPrompt: PromptState = null;
          const exitDist = Math.hypot(
            playerPosRef.current.x - interiorRef.current.exitSpot.x,
            playerPosRef.current.z - interiorRef.current.exitSpot.z
          );
          const npcDist = Math.hypot(
            playerPosRef.current.x - interiorRef.current.npcSpot.x,
            playerPosRef.current.z - interiorRef.current.npcSpot.z
          );
          const kioskDist = Math.hypot(
            playerPosRef.current.x - interiorRef.current.kioskSpot.x,
            playerPosRef.current.z - interiorRef.current.kioskSpot.z
          );
          const pubDist = Math.hypot(
            playerPosRef.current.x - interiorRef.current.publishSpot.x,
            playerPosRef.current.z - interiorRef.current.publishSpot.z
          );

          if (exitDist < 1.35 && now > doorCooldownRef.current && !inspectedSpotRef.current) {
            exitStore();
          } else if (exitDist < 2.5) {
            nextPrompt = { kind: "exit_store", theme: getStoreTheme(activeStoreRef.current!) };
          } else if (npcDist < 2.5) {
            nextPrompt = {
              kind: "talk_npc",
              storeName: getStoreTheme(activeStoreRef.current!).viceName,
            };
          } else if (kioskDist < 2.5) {
            nextPrompt = { kind: "use_kiosk" };
          } else if (pubDist < 2.5) {
            nextPrompt = {
              kind: "publish_here",
              categoryName:
                categories.find((c) => c.slug === activeStoreRef.current)?.name || "esta tienda",
            };
          } else {
            let closestDist = 3.2;
            for (const spot of interiorRef.current.productSpots) {
              const d = Math.hypot(
                playerPosRef.current.x - spot.x,
                playerPosRef.current.z - spot.z
              );
              if (d < closestDist) {
                closestDist = d;
                nextPrompt = { kind: "inspect_listing", listing: spot.listing };
              }
            }
          }

          const prevKey =
            promptRef.current?.kind === "inspect_listing"
              ? promptRef.current.listing.id
              : promptRef.current?.kind;
          const nextKey =
            nextPrompt?.kind === "inspect_listing" ? nextPrompt.listing.id : nextPrompt?.kind;
          if (prevKey !== nextKey) {
            promptRef.current = nextPrompt;
            setPrompt(nextPrompt);
          }
        } else if (exteriorRef.current) {
          resolveExteriorBounds(
            playerPosRef.current,
            exteriorRef.current.bounds,
            exteriorRef.current.pierBounds,
            true
          );
          resolveColliders(playerPosRef.current, exteriorRef.current.colliders);
          exteriorRef.current.update(elapsed, dt, playerPosRef.current, null);

          let closestCar: { id: string; name: string } | null = null;
          let minCarDist = 4.6;
          for (const car of exteriorRef.current.cars) {
            const cd = Math.hypot(
              playerPosRef.current.x - car.mesh.position.x,
              playerPosRef.current.z - car.mesh.position.z
            );
            if (cd < minCarDist) {
              minCarDist = cd;
              closestCar = { id: car.id, name: car.name };
            }
          }
          if (nearbyCarRef.current?.id !== closestCar?.id) {
            nearbyCarRef.current = closestCar;
            setNearbyCar(closestCar);
          }

          let nextPrompt: PromptState = null;
          for (const trg of exteriorRef.current.doorTriggers) {
            const d = Math.hypot(playerPosRef.current.x - trg.x, playerPosRef.current.z - trg.z);
            if (d < 1.3 && now > doorCooldownRef.current) {
              enterStore(trg.theme.categorySlug);
              break;
            }
            if (d < 3.6) {
              nextPrompt = {
                kind: "enter_store",
                theme: trg.theme,
                count: listingCountRef.current[trg.theme.categorySlug] ?? 0,
              };
            }
          }
          if (!nextPrompt && closestCar) {
            nextPrompt = { kind: "enter_car", carId: closestCar.id, carName: closestCar.name };
          }

          const promptKey = (p: PromptState) =>
            p?.kind === "enter_store"
              ? `s:${p.theme.categorySlug}`
              : p?.kind === "enter_car"
              ? `c:${p.carId}`
              : p?.kind;
          if (promptKey(promptRef.current) !== promptKey(nextPrompt)) {
            promptRef.current = nextPrompt;
            setPrompt(nextPrompt);
          }
        }

        player.group.position.copy(playerPosRef.current);
        player.group.rotation.y = playerYawRef.current;
        player.animate(dt, playerPosRef.current.y > 0.05 ? 0 : currentSpeedForAudio, isSprinting);
      }

      // 3. CONTINUOUS AMBIENT AUDIO ENGINE (ocean surf, V8 engine, soft footsteps)
      audioRef.current?.updateContinuous({
        time: elapsed,
        playerZ: playerPosRef.current.z,
        isInside,
        isDriving: Boolean(activeDrivenCar),
        carSpeed: activeDrivenCar ? activeDrivenCar.speed : 0,
        walkSpeed: activeDrivenCar ? 0 : currentSpeedForAudio,
        isGrounded: playerPosRef.current.y <= 0.05,
      });

      // 4. ADAPTIVE CAMERA + CINEMATIC 3D STAND ZOOM
      const isPortraitNow = camera.aspect < 0.85;
      const inspectingSpot =
        isInside && inspectedSpotRef.current && interiorRef.current
          ? interiorRef.current.productSpots.find(
              (s) => s.listing.id === inspectedSpotRef.current?.listing.id
            ) || null
          : null;

      if (inspectingSpot && interiorRef.current) {
        const inspectDist = isPortraitNow ? 4.95 : 3.9;
        desiredCamPos.set(
          inspectingSpot.standX + Math.sin(inspectingSpot.standYaw) * inspectDist,
          2.05,
          inspectingSpot.standZ + Math.cos(inspectingSpot.standYaw) * inspectDist
        );
        const b = interiorRef.current.bounds;
        desiredCamPos.x = Math.max(b.minX + 0.35, Math.min(b.maxX - 0.35, desiredCamPos.x));
        desiredCamPos.z = Math.max(b.minZ + 0.35, Math.min(b.maxZ - 0.35, desiredCamPos.z));

        camera.position.lerp(desiredCamPos, Math.min(1, dt * 6.5));
        lookTarget.set(inspectingSpot.standX, 1.94, inspectingSpot.standZ);
        currentLookAtRef.current.lerp(lookTarget, Math.min(1, dt * 7.5));
        camera.lookAt(currentLookAtRef.current);
      } else {
        const targetDist = activeDrivenCar
          ? isPortraitNow
            ? 12.6
            : 10.4
          : isInside
          ? Math.min(camDistRef.current, isPortraitNow ? 8.6 : 6.4)
          : camDistRef.current;

        const horiz = Math.cos(camPitchRef.current) * targetDist;
        const vert = Math.sin(camPitchRef.current) * targetDist + (activeDrivenCar ? 2.4 : 1.9);
        desiredCamPos.set(
          playerPosRef.current.x + Math.sin(camYawRef.current) * horiz,
          Math.max(1.2, Math.min(isInside ? 5.3 : 16, vert + playerPosRef.current.y * 0.5)),
          playerPosRef.current.z + Math.cos(camYawRef.current) * horiz
        );

        if (isInside && interiorRef.current) {
          const b = interiorRef.current.bounds;
          desiredCamPos.x = Math.max(b.minX + 0.3, Math.min(b.maxX - 0.3, desiredCamPos.x));
          desiredCamPos.z = Math.max(b.minZ + 0.3, Math.min(b.maxZ - 0.3, desiredCamPos.z));
        }

        camera.position.lerp(desiredCamPos, Math.min(1, dt * 8.5));
        lookTarget.set(
          playerPosRef.current.x,
          activeDrivenCar ? 1.15 : 1.55 + playerPosRef.current.y * 0.4,
          playerPosRef.current.z
        );
        currentLookAtRef.current.lerp(lookTarget, Math.min(1, dt * 10));
        camera.lookAt(currentLookAtRef.current);
      }

      // Render with UnrealBloom when Ultra, or direct PBR renderer when Balanced/Fast
      if (qualityRef.current === "ultra" && composerRef.current) {
        composerRef.current.render();
      } else {
        renderer.render(scene, camera);
      }

      hudTick += dt;
      if (hudTick > 0.1) {
        hudTick = 0;
        setRadarState({
          x: playerPosRef.current.x,
          z: playerPosRef.current.z,
          yaw: playerYawRef.current,
        });
        if (activeDrivenCar) {
          setDrivingCar({
            id: activeDrivenCar.id,
            name: activeDrivenCar.name,
            kmh: Math.round(Math.abs(activeDrivenCar.speed) * 4.5),
          });
        }
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("wheel", onWheel);
      audio.dispose();
      envRTRef.current?.dispose();
      skyTextureRef.current?.dispose();
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFirstExteriorEffectRef.current) {
      isFirstExteriorEffectRef.current = false;
      return;
    }
    rebuildExteriorInScene();
  }, [rebuildExteriorInScene]);

  useEffect(() => {
    rebuildInteriorInScene();
  }, [rebuildInteriorInScene]);

  // Mobile Virtual Joystick Handlers
  const joyOriginRef = useRef<{ x: number; y: number } | null>(null);
  const handleJoyStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    joyOriginRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setJoyVisual({ x: 0, y: 0, active: true });
  };
  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joyOriginRef.current) return;
    e.stopPropagation();
    const maxR = 32;
    const dx = e.clientX - joyOriginRef.current.x;
    const dy = e.clientY - joyOriginRef.current.y;
    const d = Math.hypot(dx, dy);
    const clamped = Math.min(d, maxR);
    const angle = Math.atan2(dy, dx);
    const cx = Math.cos(angle) * clamped;
    const cy = Math.sin(angle) * clamped;
    joystickRef.current = { x: cx / maxR, y: cy / maxR };
    setJoyVisual({ x: cx, y: cy, active: true });
  };
  const handleJoyEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    joyOriginRef.current = null;
    joystickRef.current = { x: 0, y: 0 };
    setJoyVisual({ x: 0, y: 0, active: false });
  };

  const totalAlerts = unreadChatCount + unreadNotifCount;
  const anyOverlayOpen = Boolean(
    worldModal || showKioskPanel || showNpcPanel || inspectedSpot
  );

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#140b29] select-none">
      {/* Three.js Fullscreen Canvas */}
      <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

      {/* Neon Transition Overlay */}
      <div
        className={`pointer-events-none fixed inset-0 z-30 bg-gradient-to-br from-[#ff2a9d] via-[#1f1138] to-[#00f0ff] transition-opacity duration-200 ${
          transitioning ? "opacity-90" : "opacity-0"
        }`}
      />

      {/* ================================================================= */}
      {/* UNIFIED ZERO-OVERLAP TOP HUD (Mobile + Desktop)                   */}
      {/* ================================================================= */}
      <header className="pointer-events-none fixed inset-x-2.5 top-2.5 z-20 flex items-start justify-between gap-2 md:inset-x-3.5 md:top-3">
        {/* LEFT CLUSTER */}
        <div className="pointer-events-auto flex items-center gap-1.5 md:gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-[#ff4fd8]/40 bg-[#120926]/85 px-2.5 py-1.5 text-white shadow-lg backdrop-blur-md md:rounded-2xl md:px-3">
            <img src="/icons/icon.svg" alt="ReUsa PY" className="h-5 w-5 rounded-md md:h-6 md:w-6" />
            <div className="leading-none">
              <span className="bg-gradient-to-r from-[#00f0ff] via-white to-[#ff4fd8] bg-clip-text text-xs font-black italic tracking-tight text-transparent md:text-sm">
                REUSA VICE
              </span>
              <span className="hidden text-[9px] font-semibold tracking-wider text-cyan-200/80 md:block">
                DEFINITIVE 3D · PYG / USD
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExperienceMode("classic")}
            className="hidden items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-[#120926]/85 px-3 py-2 text-xs font-bold text-cyan-200 shadow-lg backdrop-blur-md transition hover:bg-cyan-500/20 hover:text-white md:inline-flex"
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>Vista Windows OS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowMobileMenu(false);
              setShowStoreMenu((v) => !v);
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-[#ff4fd8]/50 bg-[#120926]/85 px-2.5 py-2 text-[11px] font-bold text-pink-200 shadow-lg backdrop-blur-md transition hover:bg-[#ff2a9d]/25 hover:text-white md:gap-1.5 md:px-3 md:text-xs"
          >
            <Store className="h-3.5 w-3.5" />
            <span>Tiendas</span>
          </button>

          <button
            type="button"
            onClick={() => setShowKioskPanel((v) => !v)}
            className={`hidden items-center gap-1 rounded-xl border px-2.5 py-2 text-xs font-bold shadow-lg backdrop-blur-md transition md:inline-flex ${
              showKioskPanel ||
              filters.q ||
              filters.department ||
              filters.subcategory ||
              filters.minSavings
                ? "border-emerald-400 bg-emerald-500/25 text-emerald-100"
                : "border-white/20 bg-[#120926]/85 text-slate-200 hover:bg-white/15"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filtrar PY</span>
          </button>
        </div>

        {/* RIGHT CLUSTER */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWorldModal(user ? { kind: "publish" } : { kind: "auth" })}
            className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#ff2a9d] to-[#ff6b35] px-2.5 py-2 text-[11px] font-extrabold text-white shadow-lg shadow-pink-600/35 transition hover:brightness-110 md:gap-1.5 md:px-3 md:text-xs"
          >
            <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span>Publicar</span>
          </button>

          <button
            type="button"
            onClick={() => setWorldModal(user ? { kind: "chat" } : { kind: "auth" })}
            className="relative hidden h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-[#120926]/85 text-cyan-200 shadow-lg backdrop-blur-md hover:bg-white/15 md:flex"
            title="Mensajes"
          >
            <MessageCircle className="h-4 w-4" />
            {unreadChatCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff2a9d] px-1 text-[9px] font-bold text-white">
                {unreadChatCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setWorldModal(user ? { kind: "favorites" } : { kind: "auth" })}
            className="relative hidden h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-[#120926]/85 text-pink-300 shadow-lg backdrop-blur-md hover:bg-white/15 md:flex"
            title="Favoritos y Alertas"
          >
            <Heart className="h-4 w-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-slate-950">
                {unreadNotifCount}
              </span>
            )}
          </button>

          {user?.role === "ADMIN" && (
            <button
              type="button"
              onClick={() => setWorldModal({ kind: "admin" })}
              className="hidden h-9 w-9 items-center justify-center rounded-xl border border-amber-400/50 bg-[#120926]/85 text-amber-300 shadow-lg backdrop-blur-md hover:bg-amber-500/20 md:flex"
              title="Moderación"
            >
              <Shield className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setWorldModal(user ? { kind: "profile", userId: user.id } : { kind: "auth" })
            }
            className="hidden h-9 items-center gap-1.5 rounded-xl border border-white/20 bg-[#120926]/85 px-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md hover:bg-white/15 md:inline-flex"
          >
            <User className="h-3.5 w-3.5 text-cyan-300" />
            <span>{user ? user.name.split(" ")[0] : "Ingresar"}</span>
          </button>

          {/* Mobile Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => {
              setShowStoreMenu(false);
              setShowMobileMenu((v) => !v);
            }}
            aria-label="Menú"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-[#120926]/85 text-white shadow-lg backdrop-blur-md md:hidden"
          >
            {showMobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            {totalAlerts > 0 && !showMobileMenu && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff2a9d] px-1 text-[9px] font-bold text-white">
                {totalAlerts}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* DESKTOP SECOND ROW LEFT: Live Time-of-Day, Graphics Quality & Audio Controls */}
      <div className="pointer-events-auto fixed left-3.5 top-[58px] z-20 hidden items-center gap-1.5 md:flex">
        <div className="flex items-center gap-0.5 rounded-full border border-white/15 bg-[#120926]/80 p-0.5 text-[11px] font-bold text-slate-200 shadow-md backdrop-blur-md">
          {TIME_OPTIONS.map((opt) => {
            const active = timeOfDay === opt.id;
            const Icon = opt.id === "sunset" ? Sunrise : opt.id === "night" ? Moon : Sun;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => selectTimeOfDay(opt.id)}
                title={opt.label}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition ${
                  active
                    ? opt.id === "sunset"
                      ? "bg-gradient-to-r from-[#ff2a9d] to-[#ff8b54] text-white"
                      : opt.id === "night"
                      ? "bg-indigo-600 text-cyan-100"
                      : "bg-sky-500 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{opt.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={cycleQuality}
          title="Cambiar calidad gráfica (Ultra / Medio / Rápido)"
          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-[#120926]/80 px-2.5 py-1.5 text-[11px] font-bold text-cyan-200 shadow-md backdrop-blur-md transition hover:bg-white/15"
        >
          <Sparkles className="h-3 w-3 text-[#00f0ff]" />
          <span>{QUALITY_LABELS[quality]}</span>
        </button>

        <button
          type="button"
          onClick={toggleSound}
          title={soundEnabled ? "Silenciar audio ambiente 3D" : "Activar audio ambiente 3D"}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-bold shadow-md backdrop-blur-md transition ${
            soundEnabled
              ? "border-emerald-400/70 bg-emerald-500/25 text-emerald-100"
              : "border-white/15 bg-[#120926]/80 text-slate-300 hover:bg-white/15 hover:text-white"
          }`}
        >
          {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          <span>{soundEnabled ? "Audio ON" : "Audio OFF"}</span>
        </button>
      </div>

      {/* SECOND ROW: Clean Centered Zone / Speedometer Pill (Mobile center / Desktop top-right) */}
      <div className="pointer-events-none fixed inset-x-3 top-[54px] z-20 flex justify-center md:inset-x-auto md:right-3.5 md:top-[58px] md:justify-end">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-[#120926]/80 px-3.5 py-1 text-white shadow-md backdrop-blur-md">
          <span
            className="text-[11px] font-black italic tracking-wide md:text-xs"
            style={{
              color: drivingCar
                ? "#ffd166"
                : activeTheme
                ? activeTheme.neonColor
                : "#00f0ff",
            }}
          >
            {drivingCar
              ? `${drivingCar.name} · ${drivingCar.kmh} km/h`
              : activeTheme
              ? activeTheme.viceName
              : "OCEAN BOULEVARD PY"}
          </span>
          <span className="text-[10px] font-semibold text-pink-200/90">
            {drivingCar
              ? "Conduciendo"
              : activeTheme
              ? `· ${activeStoreListings.length} avisos`
              : `· ${listings.length} avisos`}
          </span>
          {activeStoreSlug && (
            <button
              type="button"
              onClick={exitStore}
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#ff2a9d] px-2 py-0.5 text-[10px] font-extrabold text-white"
            >
              <DoorOpen className="h-3 w-3" /> Salir
            </button>
          )}
        </div>
      </div>

      {/* MOBILE COMPACT TAPPABLE MINI-RADAR (Zero overlap: sits cleanly below zone pill on top-left) */}
      {isMobileViewport && !anyOverlayOpen && !showStoreMenu && !showMobileMenu && (
        <button
          type="button"
          onClick={() => setShowStoreMenu(true)}
          aria-label="Abrir mapa de tiendas"
          className="fixed left-2.5 top-[92px] z-20 h-14 w-14 overflow-hidden rounded-full border-2 border-[#00f0ff]/80 bg-[#180d30]/88 shadow-[0_0_16px_rgba(0,240,255,0.28)] backdrop-blur-md active:scale-95 md:hidden"
        >
          <div className="absolute inset-x-0 top-0 h-2.5 bg-cyan-500/50" />
          <div className="absolute left-1/2 top-0 h-3 w-1.5 -translate-x-1/2 bg-amber-600/80" />
          <div className="absolute bottom-0 left-1/2 top-2.5 w-2 -translate-x-1/2 bg-slate-700/85" />
          {!activeStoreSlug &&
            STORE_THEMES.map((t) => {
              const leftPct = 50 + (t.x / 24) * 34;
              const topPct = 54 + ((t.z + 10) / 76) * 40;
              return (
                <span
                  key={t.categorySlug}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    backgroundColor: t.neonColor,
                  }}
                  className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                />
              );
            })}
          <div
            style={{
              left: `${
                activeStoreSlug
                  ? 50 + (radarState.x / 12) * 35
                  : 50 + (radarState.x / 24) * 34
              }%`,
              top: `${
                activeStoreSlug
                  ? 50 + (radarState.z / 16) * 35
                  : Math.max(12, Math.min(88, 54 + ((radarState.z + 10) / 76) * 40))
              }%`,
              transform: `translate(-50%, -50%) rotate(${-radarState.yaw + Math.PI}rad)`,
            }}
            className="absolute h-0 w-0 border-x-[3px] border-b-[7px] border-x-transparent border-b-white drop-shadow-[0_0_3px_#00f0ff]"
          />
        </button>
      )}

      {/* MOBILE CLEAN SLIDE-DOWN MENU (☰) — Includes Horario, Calidad & Sonido */}
      {showMobileMenu && (
        <div className="fixed right-2.5 top-[54px] z-30 w-64 overflow-hidden rounded-2xl border border-cyan-400/40 bg-[#120926]/95 p-2.5 text-white shadow-2xl backdrop-blur-xl md:hidden">
          {/* Realism Quick Controls */}
          <div className="mb-2 space-y-2 border-b border-white/10 pb-2.5">
            <div>
              <span className="mb-1 block px-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">
                Horario del mundo
              </span>
              <div className="grid grid-cols-3 gap-1">
                {TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => selectTimeOfDay(opt.id)}
                    className={`rounded-lg py-1.5 text-[10px] font-extrabold transition ${
                      timeOfDay === opt.id
                        ? "bg-gradient-to-r from-[#ff2a9d] to-[#ff6b35] text-white"
                        : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {opt.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-1 block px-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">
                Calidad gráfica
              </span>
              <div className="grid grid-cols-3 gap-1">
                {(["ultra", "balanced", "fast"] as GraphicsQuality[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setQuality(q);
                      audioRef.current?.playClick();
                    }}
                    className={`rounded-lg py-1.5 text-[10px] font-extrabold transition ${
                      quality === q
                        ? "bg-cyan-500 text-slate-950"
                        : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {QUALITY_LABELS[q]}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={toggleSound}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold ${
                soundEnabled
                  ? "bg-emerald-500/25 text-emerald-200"
                  : "bg-white/10 text-slate-200"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                Sonido ambiente 3D
              </span>
              <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[10px]">
                {soundEnabled ? "ON" : "OFF"}
              </span>
            </button>
          </div>

          <div className="space-y-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setShowMobileMenu(false);
                setExperienceMode("classic");
              }}
              className="flex w-full items-center gap-2.5 rounded-xl bg-cyan-500/20 px-3 py-2.5 text-cyan-200"
            >
              <Smartphone className="h-4 w-4" /> Cambiar a Vista App Clásica
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMobileMenu(false);
                setShowKioskPanel(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-200 hover:bg-white/10"
            >
              <SlidersHorizontal className="h-4 w-4 text-emerald-300" /> Filtrar ciudad / precio
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMobileMenu(false);
                setWorldModal(user ? { kind: "chat" } : { kind: "auth" });
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-slate-200 hover:bg-white/10"
            >
              <span className="inline-flex items-center gap-2.5">
                <MessageCircle className="h-4 w-4 text-cyan-300" /> Mensajes
              </span>
              {unreadChatCount > 0 && (
                <span className="rounded-full bg-[#ff2a9d] px-1.5 py-0.5 text-[10px] text-white">
                  {unreadChatCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMobileMenu(false);
                setWorldModal(user ? { kind: "favorites" } : { kind: "auth" });
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-slate-200 hover:bg-white/10"
            >
              <span className="inline-flex items-center gap-2.5">
                <Heart className="h-4 w-4 text-pink-400" /> Favoritos y Alertas
              </span>
              {unreadNotifCount > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] text-slate-950">
                  {unreadNotifCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMobileMenu(false);
                setWorldModal(user ? { kind: "profile", userId: user.id } : { kind: "auth" });
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-200 hover:bg-white/10"
            >
              <User className="h-4 w-4 text-indigo-300" />
              {user ? `Mi Perfil (${user.name.split(" ")[0]})` : "Iniciar sesión"}
            </button>
            {user?.role === "ADMIN" && (
              <button
                type="button"
                onClick={() => {
                  setShowMobileMenu(false);
                  setWorldModal({ kind: "admin" });
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-amber-300 hover:bg-white/10"
              >
                <Shield className="h-4 w-4" /> Panel de Moderación
              </button>
            )}
          </div>
        </div>
      )}

      {/* QUICK TELEPORT STORES DRAWER */}
      {showStoreMenu && (
        <div className="fluent-scroll fixed left-2.5 top-[92px] z-30 max-h-[58dvh] w-72 max-w-[calc(100vw-20px)] overflow-y-auto rounded-2xl border border-[#ff4fd8]/40 bg-[#120926]/95 p-2.5 text-white shadow-2xl backdrop-blur-xl md:left-3.5 md:top-[98px]">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-pink-300">
              Entrar a una tienda
            </span>
            <button
              type="button"
              onClick={() => setShowStoreMenu(false)}
              className="rounded-md p-1 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            {STORE_THEMES.map((t) => {
              const cat = categories.find((c) => c.slug === t.categorySlug);
              const count = listingCountByCategory[t.categorySlug] ?? 0;
              const isHere = activeStoreSlug === t.categorySlug;
              return (
                <button
                  key={t.categorySlug}
                  type="button"
                  onClick={() => enterStore(t.categorySlug)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition ${
                    isHere ? "bg-white/20 ring-1 ring-cyan-300" : "hover:bg-white/10"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-950"
                      style={{ backgroundColor: t.neonColor }}
                    >
                      <CategoryIcon name={cat?.icon} className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-white">{t.viceName}</p>
                      <p className="truncate text-[10px] text-slate-300">
                        {cat?.name || t.tagline}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* BOTTOM-LEFT: GTA RADAR (Desktop) OR VIRTUAL JOYSTICK (Mobile)     */}
      {/* ================================================================= */}
      {!inspectedSpot && (
        <div className="fixed bottom-4 left-3 z-20 md:bottom-4 md:left-4">
          {isMobileViewport ? (
            !anyOverlayOpen && (
              <div
                onPointerDown={handleJoyStart}
                onPointerMove={handleJoyMove}
                onPointerUp={handleJoyEnd}
                onPointerCancel={handleJoyEnd}
                className="relative flex h-24 w-24 touch-none items-center justify-center rounded-full border-2 border-cyan-400/65 bg-[#120926]/65 shadow-xl backdrop-blur-md"
              >
                <div className="h-8 w-8 rounded-full border border-white/15" />
                <div
                  style={{ transform: `translate(${joyVisual.x}px, ${joyVisual.y}px)` }}
                  className={`absolute h-10 w-10 rounded-full border-2 border-white shadow-lg ${
                    joyVisual.active
                      ? "bg-gradient-to-br from-[#00f0ff] to-[#ff2a9d]"
                      : "bg-cyan-400/85"
                  }`}
                />
              </div>
            )
          ) : (
            <button
              type="button"
              onClick={() => setShowStoreMenu((v) => !v)}
              title="Radar Vice City — Clic para ver todas las tiendas"
              className="group relative h-32 w-32 overflow-hidden rounded-full border-[3px] border-[#00f0ff]/80 bg-[#180d30]/90 shadow-[0_0_24px_rgba(0,240,255,0.28)] backdrop-blur-md"
            >
              <div className="absolute inset-x-0 top-0 h-5 bg-cyan-500/45" />
              <div className="absolute left-1/2 top-0 h-6 w-2.5 -translate-x-1/2 bg-amber-700/80" />
              <div className="absolute bottom-0 left-1/2 top-5 w-4 -translate-x-1/2 bg-slate-700/85" />
              <div className="absolute bottom-0 left-1/2 top-5 w-[1px] -translate-x-1/2 bg-amber-300/70" />

              {!activeStoreSlug &&
                STORE_THEMES.map((t) => {
                  const leftPct = 50 + (t.x / 24) * 34;
                  const topPct = 54 + ((t.z + 10) / 76) * 40;
                  return (
                    <span
                      key={t.categorySlug}
                      style={{
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        backgroundColor: t.neonColor,
                      }}
                      className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-white/80"
                    />
                  );
                })}

              <div
                style={{
                  left: `${
                    activeStoreSlug
                      ? 50 + (radarState.x / 12) * 35
                      : 50 + (radarState.x / 24) * 34
                  }%`,
                  top: `${
                    activeStoreSlug
                      ? 50 + (radarState.z / 16) * 35
                      : Math.max(8, Math.min(92, 54 + ((radarState.z + 10) / 76) * 40))
                  }%`,
                  transform: `translate(-50%, -50%) rotate(${-radarState.yaw + Math.PI}rad)`,
                }}
                className="absolute h-0 w-0 border-x-[5px] border-b-[11px] border-x-transparent border-b-white drop-shadow-[0_0_4px_#00f0ff]"
              />

              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/60 px-1.5 text-[9px] font-bold tracking-wider text-cyan-200">
                N ↑ RADAR
              </span>
            </button>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* BOTTOM-RIGHT: MOBILE ERGONOMIC GAME BUTTONS (Sprint/Jump/Car/Horn)*/}
      {/* ================================================================= */}
      {isMobileViewport && !anyOverlayOpen && (
        <div className="fixed bottom-4 right-3 z-20 flex flex-col items-end gap-2">
          {drivingCar ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={triggerHorn}
                className="flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 border-amber-300 bg-[#120926]/80 text-[9px] font-bold text-amber-200 shadow-lg backdrop-blur-md active:scale-95"
              >
                <Volume2 className="h-4 w-4" />
                Bocina
              </button>
              <button
                type="button"
                onClick={exitCar}
                className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 border-pink-300 bg-[#ff2a9d] text-[10px] font-extrabold text-white shadow-lg active:scale-95"
              >
                <Car className="h-4 w-4" />
                Bajar
              </button>
            </div>
          ) : (
            <>
              {nearbyCar && !activeStoreSlug && (
                <button
                  type="button"
                  onClick={() => enterCar(nearbyCar.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-pink-300 bg-[#ff2a9d] px-3 py-1.5 text-[11px] font-extrabold text-white shadow-lg active:scale-95"
                >
                  <Car className="h-3.5 w-3.5" /> Subir al auto
                </button>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileSprint((v) => !v)}
                  className={`flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 text-[9px] font-bold shadow-lg backdrop-blur-md active:scale-95 ${
                    mobileSprint
                      ? "border-amber-300 bg-amber-500 text-slate-950"
                      : "border-white/30 bg-[#120926]/75 text-slate-100"
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  Correr
                </button>
                <button
                  type="button"
                  onClick={triggerJump}
                  className="flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 border-cyan-300/70 bg-[#120926]/75 text-[9px] font-bold text-cyan-200 shadow-lg backdrop-blur-md active:scale-95"
                >
                  <ArrowUp className="h-4 w-4" />
                  Saltar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* CINEMATIC 3D PRODUCT STAND INSPECTION BAR (Inside Showroom)       */}
      {/* ================================================================= */}
      {inspectedSpot && !worldModal && (
        <div className="fixed inset-x-3 bottom-4 z-30 mx-auto max-w-xl">
          <div className="rounded-2xl border-2 border-[#00f0ff]/85 bg-[#120926]/92 p-3 text-white shadow-[0_12px_40px_rgba(0,240,255,0.28)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-cyan-500/25 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-cyan-200">
                    Vista 3D en Showroom
                  </span>
                  {inspectedSpot.listing.savingsPercent && (
                    <span className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                      -{inspectedSpot.listing.savingsPercent}% vs. nuevo
                    </span>
                  )}
                </div>
                <h3 className="mt-1 truncate text-sm font-black text-white">
                  {inspectedSpot.listing.title}
                </h3>
                <p className="text-xs font-extrabold text-emerald-300">
                  {formatPrice(
                    inspectedSpot.listing.price,
                    inspectedSpot.listing.currency,
                    inspectedSpot.listing.isFree
                  )}
                  <span className="ml-2 font-normal text-slate-300">
                    · {inspectedSpot.listing.city.name}, {inspectedSpot.listing.department.name}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={closeStandInspection}
                title="Seguir caminando [Esc]"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300 hover:bg-rose-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {/* Live 3D Stand Photo Carousel Controls */}
              <div className="flex items-center gap-1.5">
                {inspectedSpot.listing.images.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => stepInspectedPhoto(-1)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/40 bg-white/10 text-cyan-200 hover:bg-cyan-500/25"
                      title="Foto anterior [←]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-cyan-100">
                      Foto {inspectedSpot.photoIdx + 1} / {inspectedSpot.listing.images.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => stepInspectedPhoto(1)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/40 bg-white/10 text-cyan-200 hover:bg-cyan-500/25"
                      title="Siguiente foto [→]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <span className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300">
                    1 foto en exhibición
                  </span>
                )}
              </div>

              {/* Action Buttons: Favorite, Share, Full Sheet / Chat */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleFavorite(inspectedSpot.listing.id)}
                  title="Guardar en favoritos"
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                    favoriteIds.has(inspectedSpot.listing.id)
                      ? "bg-rose-500 text-white"
                      : "bg-white/10 text-pink-200 hover:bg-rose-500/40"
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      favoriteIds.has(inspectedSpot.listing.id) ? "fill-current" : ""
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handleShareListing(inspectedSpot.listing)}
                  title="Copiar enlace para compartir"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-cyan-200 hover:bg-cyan-500/30"
                >
                  <Link2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectedSpot.listing;
                    closeStandInspection();
                    setWorldModal({
                      kind: "listing",
                      slug: target.slug,
                      title: target.title,
                    });
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#38bdf8] px-3.5 text-xs font-black text-slate-950 shadow-md hover:brightness-110"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Ficha / Chat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* BOTTOM-CENTER: CONTEXTUAL INTERACTIVE PROMPT (Above mobile thumbs)*/}
      {/* ================================================================= */}
      {!inspectedSpot && (
        <div className="pointer-events-none fixed inset-x-3 bottom-[122px] z-20 flex flex-col items-center gap-2 md:bottom-4">
          {prompt && !anyOverlayOpen && !drivingCar && (
            <div className="pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl border-2 border-[#00f0ff] bg-[#120926]/92 px-3 py-2 text-left text-white shadow-[0_0_26px_rgba(0,240,255,0.38)] backdrop-blur-lg">
              <button
                type="button"
                onClick={triggerPromptAction}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#ff2a9d] text-xs font-black text-slate-950">
                  {prompt.kind === "enter_car" ? "F" : "E"}
                </span>
                <div className="min-w-0">
                  {prompt.kind === "enter_store" && (
                    <>
                      <p className="truncate text-xs font-black uppercase text-cyan-200">
                        Entrar a {prompt.theme.viceName}
                      </p>
                      <p className="text-[11px] text-slate-200">
                        {prompt.count} {prompt.count === 1 ? "aviso" : "avisos"} · Tocá o [E]
                      </p>
                    </>
                  )}
                  {prompt.kind === "enter_car" && (
                    <>
                      <p className="truncate text-xs font-black uppercase text-amber-300">
                        Manejar {prompt.carName}
                      </p>
                      <p className="text-[11px] text-slate-200">Presioná [F] o tocá para subir</p>
                    </>
                  )}
                  {prompt.kind === "inspect_listing" && (
                    <>
                      <p className="truncate text-xs font-extrabold text-white">
                        {prompt.listing.title}
                      </p>
                      <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-emerald-300">
                        <span>
                          {formatPrice(
                            prompt.listing.price,
                            prompt.listing.currency,
                            prompt.listing.isFree
                          )}
                        </span>
                        {prompt.listing.savingsPercent && (
                          <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] text-white">
                            -{prompt.listing.savingsPercent}% nuevo
                          </span>
                        )}
                        <span className="font-normal text-cyan-200">· Zoom 3D / Fotos</span>
                      </p>
                    </>
                  )}
                  {prompt.kind === "talk_npc" && (
                    <>
                      <p className="truncate text-xs font-black uppercase text-pink-300">
                        Hablar con el Asesor de {prompt.storeName}
                      </p>
                      <p className="text-[11px] text-slate-200">
                        Te recomienda la mejor oferta · Tocá o [E]
                      </p>
                    </>
                  )}
                  {prompt.kind === "use_kiosk" && (
                    <>
                      <p className="truncate text-xs font-black uppercase text-cyan-300">
                        Kiosco de Filtros en Vivo
                      </p>
                      <p className="text-[11px] text-slate-200">
                        Subcategoría, ciudad, PYG/USD o % ahorro · [E]
                      </p>
                    </>
                  )}
                  {prompt.kind === "exit_store" && (
                    <>
                      <p className="text-xs font-black uppercase text-pink-300">
                        Salir a Ocean Boulevard
                      </p>
                      <p className="text-[11px] text-slate-200">Tocá o presioná [E]</p>
                    </>
                  )}
                  {prompt.kind === "publish_here" && (
                    <>
                      <p className="text-xs font-black uppercase text-emerald-300">
                        Publicar en {prompt.categoryName}
                      </p>
                      <p className="text-[11px] text-slate-200">Subí fotos gratis · Tocá o [E]</p>
                    </>
                  )}
                </div>
              </button>

              {prompt.kind === "inspect_listing" && (
                <button
                  type="button"
                  onClick={() => toggleFavorite(prompt.listing.id)}
                  title="Guardar en favoritos [Q]"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                    favoriteIds.has(prompt.listing.id)
                      ? "bg-rose-500 text-white"
                      : "bg-white/15 text-pink-200 hover:bg-rose-500/40"
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      favoriteIds.has(prompt.listing.id) ? "fill-current" : ""
                    }`}
                  />
                </button>
              )}
            </div>
          )}

          {/* Desktop controls hint bar */}
          <div className="hidden items-center gap-3 rounded-full border border-white/15 bg-[#120926]/75 px-4 py-1 text-[11px] font-medium text-slate-200 backdrop-blur-md md:flex">
            {drivingCar ? (
              <>
                <span>
                  <strong className="text-cyan-300">WASD / Flechas</strong> Manejar ·{" "}
                  <strong className="text-rose-300">S</strong> Freno
                </span>
                <span>·</span>
                <span>
                  <strong className="text-amber-300">H</strong> Bocina
                </span>
                <span>·</span>
                <span>
                  <strong className="text-pink-300">F</strong> Bajar del auto
                </span>
              </>
            ) : (
              <>
                <span>
                  <strong className="text-cyan-300">WASD</strong> Caminar
                </span>
                <span>·</span>
                <span>
                  <strong className="text-pink-300">Shift</strong> Correr
                </span>
                <span>·</span>
                <span>
                  <strong className="text-emerald-300">Espacio</strong> Saltar
                </span>
                <span>·</span>
                <span>
                  <strong className="text-amber-300">F</strong> Subir al auto
                </span>
                <span>·</span>
                <span>
                  <strong className="text-sky-300">Clic</strong> Entrar / Inspeccionar 3D
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* IN-STORE INTERACTIVE NPC ADVISOR DIALOG                           */}
      {/* ================================================================= */}
      {showNpcPanel && activeTheme && (
        <div
          onClick={() => setShowNpcPanel(false)}
          className="fixed inset-0 z-40 flex items-end justify-center bg-[#0c061a]/65 p-3 backdrop-blur-xs sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-[#ff4fd8]/60 bg-[#160b2e] text-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-slate-950"
                  style={{ backgroundColor: activeTheme.neonColor }}
                >
                  NPC
                </span>
                <div>
                  <h2 className="text-sm font-black italic text-cyan-200">
                    Asesor de {activeTheme.viceName}
                  </h2>
                  <p className="text-[11px] text-slate-300">
                    {activeStoreListings.length} publicaciones activas en esta tienda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNpcPanel(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-4 text-xs">
              <p className="rounded-xl bg-white/10 p-3 leading-relaxed text-slate-100">
                {bestStoreDeal ? (
                  <>
                    &quot;¡Bienvenido a <strong>{activeTheme.viceName}</strong>! La mejor
                    oportunidad ahora mismo acá es{" "}
                    <strong className="text-emerald-300">{bestStoreDeal.title}</strong> a{" "}
                    <strong>
                      {formatPrice(
                        bestStoreDeal.price,
                        bestStoreDeal.currency,
                        bestStoreDeal.isFree
                      )}
                    </strong>
                    {bestStoreDeal.savingsPercent
                      ? ` (${bestStoreDeal.savingsPercent}% menos que nuevo)`
                      : ""}
                    . ¿Querés inspeccionarla?&quot;
                  </>
                ) : (
                  `"¡Bienvenido a ${activeTheme.viceName}! Todavía no hay avisos con estos filtros. ¡Podés ser el primero en publicar gratis acá!"`
                )}
              </p>

              <div className="space-y-2">
                {bestStoreDeal && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowNpcPanel(false);
                      openStandInspection(bestStoreDeal);
                    }}
                    className="flex w-full items-center justify-between rounded-xl bg-emerald-600 px-3.5 py-2.5 font-extrabold text-white hover:bg-emerald-500"
                  >
                    <span>Zoom 3D a la mejor oferta de esta tienda</span>
                    <Sparkles className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    updateFilters({ minSavings: "35", sort: "savings" });
                    setShowNpcPanel(false);
                    notifyToast("Mostrando solo ofertas con +35% de ahorro", "success");
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3.5 py-2.5 font-bold text-cyan-100 hover:bg-cyan-500/25"
                >
                  <span>Filtrar ofertas con +35% de ahorro</span>
                  <SlidersHorizontal className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowNpcPanel(false);
                    setWorldModal(user ? { kind: "publish" } : { kind: "auth" });
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-pink-400/40 bg-pink-500/15 px-3.5 py-2.5 font-bold text-pink-100 hover:bg-pink-500/25"
                >
                  <span>Publicar mi producto en {activeCategoryObj?.name}</span>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* LIVE 3D FILTER KIOSK PANEL (Includes Subcategory Filter!)         */}
      {/* ================================================================= */}
      {showKioskPanel && (
        <div
          onClick={() => setShowKioskPanel(false)}
          className="fixed inset-0 z-40 flex items-end justify-center bg-[#0c061a]/65 p-3 backdrop-blur-xs sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-[#00f0ff]/60 bg-[#120926] text-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#00f0ff]" />
                <h2 className="text-sm font-black tracking-wide text-cyan-200">
                  Kiosco de Filtros en Vivo — Paraguay
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowKioskPanel(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-4 text-xs">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cyan-300" />
                <input
                  type="search"
                  value={filters.q || ""}
                  onChange={(e) => updateFilters({ q: e.target.value || undefined })}
                  placeholder="Buscar medias, Corolla, iPhone, casa..."
                  className="w-full rounded-xl border border-white/15 bg-white/10 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-300 outline-none focus:border-cyan-400"
                />
              </div>

              {availableSubcategories.length > 0 && (
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                    Subcategoría {activeCategoryObj ? `de ${activeCategoryObj.name}` : ""}
                  </label>
                  <select
                    value={filters.subcategory || ""}
                    onChange={(e) =>
                      updateFilters({ subcategory: e.target.value || undefined })
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#1e123b] px-2.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="">Todas las subcategorías</option>
                    {availableSubcategories.map((sc) => (
                      <option key={sc.id} value={sc.slug}>
                        {sc.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                    Departamento
                  </label>
                  <select
                    value={filters.department || ""}
                    onChange={(e) =>
                      updateFilters({ department: e.target.value || undefined, city: undefined })
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#1e123b] px-2.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="">Todo Paraguay</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.slug}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                    Moneda
                  </label>
                  <select
                    value={filters.currency || ""}
                    onChange={(e) =>
                      updateFilters({ currency: e.target.value as "" | "PYG" | "USD" })
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#1e123b] px-2.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="">PYG y USD</option>
                    <option value="PYG">Solo Guaraníes (PYG)</option>
                    <option value="USD">Solo Dólares (USD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                  Ahorro mínimo vs. nuevo
                </label>
                <select
                  value={filters.minSavings || ""}
                  onChange={(e) => updateFilters({ minSavings: e.target.value || undefined })}
                  className="w-full rounded-xl border border-white/15 bg-[#1e123b] px-2.5 py-2 text-xs text-white outline-none"
                >
                  <option value="">Cualquier ahorro</option>
                  <option value="20">Al menos 20% menos</option>
                  <option value="35">Al menos 35% menos</option>
                  <option value="50">Al menos 50% menos</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateFilters({ isNegotiable: !filters.isNegotiable })}
                  className={`rounded-lg border px-2.5 py-1.5 font-bold ${
                    filters.isNegotiable
                      ? "border-cyan-400 bg-cyan-500/30 text-white"
                      : "border-white/15 bg-white/5 text-slate-300"
                  }`}
                >
                  Negociable
                </button>
                <button
                  type="button"
                  onClick={() => updateFilters({ acceptsTrade: !filters.acceptsTrade })}
                  className={`rounded-lg border px-2.5 py-1.5 font-bold ${
                    filters.acceptsTrade
                      ? "border-cyan-400 bg-cyan-500/30 text-white"
                      : "border-white/15 bg-white/5 text-slate-300"
                  }`}
                >
                  Permuta
                </button>
                <button
                  type="button"
                  onClick={() => updateFilters({ isFree: !filters.isFree })}
                  className={`rounded-lg border px-2.5 py-1.5 font-bold ${
                    filters.isFree
                      ? "border-emerald-400 bg-emerald-500/30 text-white"
                      : "border-white/15 bg-white/5 text-slate-300"
                  }`}
                >
                  Gratis / Regalo
                </button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetFilters();
                    notifyToast("Filtros restablecidos", "info");
                  }}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2 font-bold text-rose-300 hover:bg-rose-500/15"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Limpiar
                </button>
                <button
                  type="button"
                  onClick={() => setShowKioskPanel(false)}
                  className="rounded-xl bg-[#00f0ff] px-4 py-2 font-black text-slate-950 hover:brightness-110"
                >
                  Aplicar en 3D ({activeStoreSlug ? activeStoreListings.length : listings.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* FLOATING REAL MARKETPLACE MODAL OVER THE 3D WORLD                 */}
      {/* ================================================================= */}
      {worldModal && (
        <div
          onClick={() => setWorldModal(null)}
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#0c061a]/70 p-2 backdrop-blur-sm sm:p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#00f0ff]/40 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
          >
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#160b2e] via-[#271147] to-[#11243b] px-4 text-white">
              <div className="flex min-w-0 items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-[#00f0ff]" />
                <span className="truncate text-xs font-extrabold tracking-wide">
                  {worldModal.kind === "listing" && (worldModal.title || "Detalle de publicación")}
                  {worldModal.kind === "publish" &&
                    (worldModal.editId ? "Editar publicación" : "Publicar en ReUsa PY")}
                  {worldModal.kind === "chat" && "Mensajes — ReUsa PY"}
                  {worldModal.kind === "favorites" && "Favoritos y Alertas"}
                  {worldModal.kind === "profile" && "Perfil y Reputación"}
                  {worldModal.kind === "auth" && "Ingresar a ReUsa PY"}
                  {worldModal.kind === "admin" && "Panel de Moderación"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setWorldModal(null)}
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-600"
              >
                <X className="h-4 w-4" /> Volver al 3D
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {worldModal.kind === "listing" && (
                <ListingDetailView
                  slug={worldModal.slug}
                  onClose={() => setWorldModal(null)}
                />
              )}
              {worldModal.kind === "publish" && (
                <PublishView
                  editId={worldModal.editId}
                  onSuccess={(slug, title) => {
                    setWorldModal({ kind: "listing", slug, title });
                  }}
                />
              )}
              {worldModal.kind === "chat" && (
                <ChatView
                  initialConversationId={worldModal.conversationId}
                  isMobile={isMobileViewport}
                />
              )}
              {worldModal.kind === "favorites" && <FavoritesAlertsView />}
              {worldModal.kind === "profile" && <ProfileView userId={worldModal.userId} />}
              {worldModal.kind === "auth" && (
                <AuthView onAuthenticated={() => setWorldModal(null)} />
              )}
              {worldModal.kind === "admin" && <AdminModerationView />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
