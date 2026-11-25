"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  ArrowUp,
  Car,
  DoorOpen,
  Heart,
  Menu,
  MessageCircle,
  Monitor,
  Plus,
  RotateCcw,
  Search,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Store,
  User,
  Volume2,
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

function playRetroHorn() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    gain.connect(ctx.destination);

    for (const freq of [370, 466]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.36);
    }
    setTimeout(() => ctx.close().catch(() => {}), 450);
  } catch {}
}

function resolveExteriorBounds(
  pos: THREE.Vector3,
  bounds: AABB,
  pierBounds: AABB,
  allowPier: boolean
) {
  if (allowPier && pos.z < bounds.minZ + 1.5 && pos.x > pierBounds.minX - 0.8 && pos.x < pierBounds.maxX + 0.8) {
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

  // Gameplay HUD states
  const [drivingCar, setDrivingCar] = useState<{ id: string; name: string; kmh: number } | null>(
    null
  );
  const [nearbyCar, setNearbyCar] = useState<{ id: string; name: string } | null>(null);
  const [mobileSprint, setMobileSprint] = useState(false);

  // Refs synced for 60fps loop
  const activeStoreRef = useRef<string | null>(null);
  const modalOpenRef = useRef<boolean>(false);
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
  const keysRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joyVisual, setJoyVisual] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const exteriorRef = useRef<ExteriorWorldHandle | null>(null);
  const interiorRef = useRef<InteriorWorldHandle | null>(null);
  const playerRigRef = useRef<ReturnType<typeof buildVicePlayer> | null>(null);
  const exteriorLightsRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    modalOpenRef.current = Boolean(worldModal || showKioskPanel || showNpcPanel);
  }, [worldModal, showKioskPanel, showNpcPanel]);

  useEffect(() => {
    mobileSprintRef.current = mobileSprint;
  }, [mobileSprint]);

  useEffect(() => {
    favoriteIdsRef.current = favoriteIds;
  }, [favoriteIds]);

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
    cam.lookAt(playerPosRef.current.x, 1.55, playerPosRef.current.z);
  }, []);

  const exitCar = useCallback(() => {
    const curId = drivenCarIdRef.current;
    if (!curId || !exteriorRef.current) return;
    const car = exteriorRef.current.cars.find((c) => c.id === curId);
    if (car) {
      car.speed = 0;
      car.bodyGroup.rotation.z = 0;
      // Place player cleanly beside car door
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
  }, []);

  const enterCar = useCallback(
    (carId: string) => {
      if (activeStoreRef.current || !exteriorRef.current) return;
      const car = exteriorRef.current.cars.find((c) => c.id === carId);
      if (!car) return;
      drivenCarIdRef.current = car.id;
      car.speed = 0;
      if (playerRigRef.current) playerRigRef.current.group.visible = false;
      camYawRef.current = car.yaw + Math.PI;
      setDrivingCar({ id: car.id, name: car.name, kmh: 0 });
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
      playRetroHorn();
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
      setTransitioning(true);
      setShowStoreMenu(false);
      setShowMobileMenu(false);
      setShowKioskPanel(false);
      setShowNpcPanel(false);
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
    setTransitioning(true);
    setShowKioskPanel(false);
    setShowNpcPanel(false);
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
      setWorldModal({ kind: "listing", slug: p.listing.slug, title: p.listing.title });
    } else if (p.kind === "publish_here") {
      setWorldModal({ kind: "publish" });
    } else if (p.kind === "talk_npc") {
      setShowNpcPanel(true);
    } else if (p.kind === "use_kiosk") {
      setShowKioskPanel(true);
    } else if (p.kind === "enter_car") {
      enterCar(p.carId);
    }
  }, [enterCar, enterStore, exitStore, setWorldModal]);

  const rebuildExteriorInScene = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (exteriorRef.current) {
      scene.remove(exteriorRef.current.group);
    }
    const ext = buildViceExterior(listingCountByCategory, topDealListing);
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
      scene.fog = new THREE.FogExp2(0x140c24, 0.015);

      playerPosRef.current.copy(interior.spawnPos);
      playerVelYRef.current = 0;
      playerYawRef.current = Math.PI;
      camYawRef.current = 0;
      camPitchRef.current = 0.24;
      snapCameraBehindPlayer(true);
    } else {
      if (exteriorRef.current) exteriorRef.current.group.visible = true;
      if (exteriorLightsRef.current) exteriorLightsRef.current.visible = true;
      scene.fog = new THREE.FogExp2(0x3a1c52, 0.0085);
    }
  }, [activeStoreSlug, categories, listings, snapCameraBehindPlayer]);

  // Mount Three.js WebGL engine once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1f1138);
    scene.fog = new THREE.FogExp2(0x3a1c52, 0.0085);
    sceneRef.current = scene;

    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    const isPortraitInit = aspect < 0.85;
    const camera = new THREE.PerspectiveCamera(isPortraitInit ? 68 : 56, aspect, 0.1, 460);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.appendChild(renderer.domElement);

    const extLights = new THREE.Group();
    const hemi = new THREE.HemisphereLight(0xffb4c8, 0x2d1a4a, 1.15);
    extLights.add(hemi);

    const sunLight = new THREE.DirectionalLight(0xffb86c, 1.9);
    sunLight.position.set(18, 42, -90);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.left = -45;
    sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 75;
    sunLight.shadow.camera.bottom = -75;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 230;
    extLights.add(sunLight);

    const cyanFill = new THREE.DirectionalLight(0x38bdf8, 0.55);
    cyanFill.position.set(-28, 18, 45);
    extLights.add(cyanFill);
    scene.add(extLights);
    exteriorLightsRef.current = extLights;

    const player = buildVicePlayer();
    player.group.position.copy(playerPosRef.current);
    player.group.rotation.y = playerYawRef.current;
    scene.add(player.group);
    playerRigRef.current = player;

    const ext = buildViceExterior(listingCountRef.current, topDealListing);
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
        if (worldModal) setWorldModal(null);
        else if (showKioskPanel) setShowKioskPanel(false);
        else if (showNpcPanel) setShowNpcPanel(false);
        else if (drivenCarIdRef.current) exitCar();
        else if (activeStoreRef.current) exitStore();
        return;
      }

      if (isTyping || modalOpenRef.current) return;

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
            setWorldModal({
              kind: "listing",
              slug: ud.listing.slug,
              title: ud.listing.title,
            });
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

      // 1. DRIVING PHYSICS MODE (GTA Vice City cruising!)
      if (!isInside && drivenCarIdRef.current && exteriorRef.current) {
        activeDrivenCar =
          exteriorRef.current.cars.find((c) => c.id === drivenCarIdRef.current) || null;
        if (activeDrivenCar) {
          const accel = inputForward > 0 ? 18 : inputForward < 0 ? 22 : 0;
          if (inputForward > 0.05) {
            activeDrivenCar.speed = Math.min(23, activeDrivenCar.speed + accel * inputForward * dt);
          } else if (inputForward < -0.05) {
            activeDrivenCar.speed = Math.max(-9, activeDrivenCar.speed + accel * inputForward * dt);
          } else {
            // Natural rolling friction
            activeDrivenCar.speed *= Math.pow(0.18, dt);
            if (Math.abs(activeDrivenCar.speed) < 0.15) activeDrivenCar.speed = 0;
          }

          // Smooth velocity-scaled steering + subtle drift body roll
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

          // Keep car safely inside boulevard & promenade (not off pier!)
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

          // Gentle GTA chase camera auto-follow behind steering when not dragging mouse
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
        let currentSpeed = 0;

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
            currentSpeed = speed;

            const targetYaw = Math.atan2(moveVec.x, moveVec.z);
            let diff = targetYaw - playerYawRef.current;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            playerYawRef.current += diff * Math.min(1, dt * 12);
          }
        }

        // Jump gravity physics
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

          // Interior proximity prompts (Exit, NPC Advisor, Filter Kiosk, Publish, Products)
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

          if (exitDist < 1.35 && now > doorCooldownRef.current) {
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
              const d = Math.hypot(playerPosRef.current.x - spot.x, playerPosRef.current.z - spot.z);
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

          // Check nearby drivable car
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

          // Check store doorways first, otherwise show car prompt if near a car
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
        player.animate(dt, playerPosRef.current.y > 0.05 ? 0 : currentSpeed, isSprinting);
      }

      // Smooth adaptive camera
      const isPortraitNow = camera.aspect < 0.85;
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
      camera.lookAt(lookTarget);

      renderer.render(scene, camera);

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
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
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
      {/* UNIFIED ZERO-OVERLAP TOP HUD (adapts cleanly for Mobile & Desktop) */}
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
                MUNDO 3D · PYG / USD
              </span>
            </div>
          </div>

          {/* Desktop-only top-left buttons */}
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
              showKioskPanel || filters.q || filters.department || filters.minSavings
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

          {/* Desktop icons */}
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

          {/* Mobile Hamburger Menu Button (replaces cluttered individual icons!) */}
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

      {/* SECOND ROW: Clean Centered Zone / Speedometer Pill (ZERO overlap on Mobile or Desktop!) */}
      <div className="pointer-events-none fixed inset-x-3 top-[54px] z-20 flex justify-center md:inset-x-auto md:right-3.5 md:top-[58px] md:justify-end">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-[#120926]/78 px-3.5 py-1 text-white shadow-md backdrop-blur-md">
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

      {/* MOBILE CLEAN SLIDE-DOWN MENU (☰) */}
      {showMobileMenu && (
        <div className="fixed right-2.5 top-[54px] z-30 w-60 overflow-hidden rounded-2xl border border-cyan-400/40 bg-[#120926]/95 p-2 text-white shadow-2xl backdrop-blur-xl md:hidden">
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
        <div className="fluent-scroll fixed left-2.5 top-[92px] z-30 max-h-[58dvh] w-72 max-w-[calc(100vw-20px)] overflow-y-auto rounded-2xl border border-[#ff4fd8]/40 bg-[#120926]/95 p-2.5 text-white shadow-2xl backdrop-blur-xl md:left-3.5 md:top-[60px]">
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
      <div className="fixed bottom-4 left-3 z-20 md:bottom-4 md:left-4">
        {isMobileViewport ? (
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

      {/* ================================================================= */}
      {/* BOTTOM-RIGHT: MOBILE ERGONOMIC GAME BUTTONS (Sprint/Jump/Car/Horn)*/}
      {/* ================================================================= */}
      {isMobileViewport && !worldModal && !showKioskPanel && !showNpcPanel && (
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
      {/* BOTTOM-CENTER: CONTEXTUAL INTERACTIVE PROMPT (Above mobile thumbs)*/}
      {/* ================================================================= */}
      <div className="pointer-events-none fixed inset-x-3 bottom-[122px] z-20 flex flex-col items-center gap-2 md:bottom-4">
        {prompt && !worldModal && !showKioskPanel && !showNpcPanel && !drivingCar && (
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
                      <span className="font-normal text-cyan-200">· Ver / Chat</span>
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
                      Filtrá por ciudad, PYG/USD o % ahorro · [E]
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

            {/* Quick Favorite Heart right on 3D product stand! */}
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
                  className={`h-4 w-4 ${favoriteIds.has(prompt.listing.id) ? "fill-current" : ""}`}
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
                <strong className="text-cyan-300">WASD / Flechas</strong> Manejar
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
                <strong className="text-sky-300">Clic</strong> Entrar / Ver
              </span>
            </>
          )}
        </div>
      </div>

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
                    . ¿Querés verla?&quot;
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
                      setWorldModal({
                        kind: "listing",
                        slug: bestStoreDeal.slug,
                        title: bestStoreDeal.title,
                      });
                    }}
                    className="flex w-full items-center justify-between rounded-xl bg-emerald-600 px-3.5 py-2.5 font-extrabold text-white hover:bg-emerald-500"
                  >
                    <span>Ver la mejor oferta de esta tienda</span>
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
      {/* LIVE 3D FILTER KIOSK PANEL                                        */}
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
