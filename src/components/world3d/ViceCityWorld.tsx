"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  Bell,
  Compass,
  DoorOpen,
  Heart,
  MapPin,
  MessageCircle,
  Monitor,
  Plus,
  Search,
  Shield,
  Smartphone,
  Sparkles,
  Store,
  User,
  X,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import { STORE_THEMES, getStoreTheme, type StoreTheme } from "@/components/world3d/vicePalette";
import {
  buildViceExterior,
  type AABB,
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
  | null;

function resolveCollisions(pos: THREE.Vector3, colliders: AABB[], bounds: AABB, radius = 0.55) {
  pos.x = Math.max(bounds.minX, Math.min(bounds.maxX, pos.x));
  pos.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, pos.z));

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
    unreadChatCount,
    unreadNotifCount,
    isMobileViewport,
    setExperienceMode,
    worldModal,
    setWorldModal,
  } = useApp();

  // Initialize deep-link modal once if provided
  useEffect(() => {
    if (initialModal) {
      setWorldModal(initialModal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activeStoreSlug, setActiveStoreSlug] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [radarState, setRadarState] = useState({ x: 0, z: 38, yaw: 0 });
  const [showStoreMenu, setShowStoreMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Refs for real-time 60fps loop without re-creating WebGLRenderer
  const activeStoreRef = useRef<string | null>(null);
  const modalOpenRef = useRef<boolean>(Boolean(worldModal));
  const promptRef = useRef<PromptState>(null);
  const doorCooldownRef = useRef<number>(0);

  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 38));
  const playerYawRef = useRef<number>(Math.PI); // Facing North toward ocean & stores
  const camYawRef = useRef<number>(0); // Behind player looking North (-Z)
  const camPitchRef = useRef<number>(0.28);
  const camDistRef = useRef<number>(7.8);
  const keysRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joyVisual, setJoyVisual] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  // Scene handles stored in refs so we can swap exterior <-> interior smoothly
  const sceneRef = useRef<THREE.Scene | null>(null);
  const exteriorRef = useRef<ExteriorWorldHandle | null>(null);
  const interiorRef = useRef<InteriorWorldHandle | null>(null);
  const playerRigRef = useRef<ReturnType<typeof buildVicePlayer> | null>(null);
  const exteriorLightsRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    modalOpenRef.current = Boolean(worldModal);
  }, [worldModal]);

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

  const activeCategoryObj = useMemo(
    () => categories.find((c) => c.slug === activeStoreSlug) || null,
    [categories, activeStoreSlug]
  );

  const activeStoreListings = useMemo(() => {
    if (!activeStoreSlug) return [];
    return listings.filter((l) => l.category.slug === activeStoreSlug);
  }, [listings, activeStoreSlug]);

  const activeTheme = useMemo(
    () => (activeStoreSlug ? getStoreTheme(activeStoreSlug) : null),
    [activeStoreSlug]
  );

  const enterStore = useCallback((categorySlug: string) => {
    if (activeStoreRef.current === categorySlug) return;
    setTransitioning(true);
    setShowStoreMenu(false);
    setTimeout(() => {
      activeStoreRef.current = categorySlug;
      setActiveStoreSlug(categorySlug);
      doorCooldownRef.current = performance.now() + 1400;
      setTimeout(() => setTransitioning(false), 180);
    }, 150);
  }, []);

  const exitStore = useCallback(() => {
    const prevSlug = activeStoreRef.current;
    if (!prevSlug) return;
    const theme = getStoreTheme(prevSlug);
    setTransitioning(true);
    setTimeout(() => {
      activeStoreRef.current = null;
      setActiveStoreSlug(null);
      playerPosRef.current.set(theme.spawnExitX, 0, theme.spawnExitZ);
      playerYawRef.current = theme.side === "west" ? Math.PI / 2 : -Math.PI / 2;
      camYawRef.current = theme.side === "west" ? -Math.PI / 2 : Math.PI / 2;
      doorCooldownRef.current = performance.now() + 1800;
      setTimeout(() => setTransitioning(false), 180);
    }, 150);
  }, []);

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
    }
  }, [enterStore, exitStore, setWorldModal]);

  // Rebuild exterior scene whenever listing counts change (e.g. filter / new listing)
  const rebuildExteriorInScene = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (exteriorRef.current) {
      scene.remove(exteriorRef.current.group);
    }
    const ext = buildViceExterior(listingCountByCategory);
    ext.group.visible = !activeStoreRef.current;
    exteriorRef.current = ext;
    scene.add(ext.group);
  }, [listingCountByCategory]);

  // Rebuild interior scene whenever active store or filtered listings change
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
      const interior = buildStoreInterior(theme, catName, storeListings);
      interiorRef.current = interior;
      scene.add(interior.group);

      if (exteriorRef.current) exteriorRef.current.group.visible = false;
      if (exteriorLightsRef.current) exteriorLightsRef.current.visible = false;
      scene.fog = new THREE.FogExp2(0x140c24, 0.016);

      // Spawn player cleanly inside entrance looking down showroom aisle
      playerPosRef.current.copy(interior.spawnPos);
      playerYawRef.current = Math.PI;
      camYawRef.current = 0;
      camPitchRef.current = 0.24;
    } else {
      if (exteriorRef.current) exteriorRef.current.group.visible = true;
      if (exteriorLightsRef.current) exteriorLightsRef.current.visible = true;
      scene.fog = new THREE.FogExp2(0x3a1c52, 0.0085);
    }
  }, [activeStoreSlug, categories, listings]);

  // Mount Three.js WebGL engine once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1f1138);
    scene.fog = new THREE.FogExp2(0x3a1c52, 0.0085);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      56,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      450
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.appendChild(renderer.domElement);

    // Golden Vice City Sunset Exterior Lighting
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
    sunLight.shadow.camera.far = 220;
    extLights.add(sunLight);

    const cyanFill = new THREE.DirectionalLight(0x38bdf8, 0.55);
    cyanFill.position.set(-28, 18, 45);
    extLights.add(cyanFill);

    scene.add(extLights);
    exteriorLightsRef.current = extLights;

    // Player character
    const player = buildVicePlayer();
    player.group.position.copy(playerPosRef.current);
    player.group.rotation.y = playerYawRef.current;
    scene.add(player.group);
    playerRigRef.current = player;

    // Initial exterior build
    const ext = buildViceExterior(listingCountByCategory);
    exteriorRef.current = ext;
    scene.add(ext.group);

    // Keyboard listeners
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (e.key === "Escape") {
        if (modalOpenRef.current) {
          setWorldModal(null);
        } else if (activeStoreRef.current) {
          exitStore();
        }
        return;
      }

      if (isTyping || modalOpenRef.current) return;

      const lower = e.key.toLowerCase();
      if (lower === "e" || e.key === "Enter") {
        triggerPromptAction();
        return;
      }
      keysRef.current.add(lower);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    // Mouse / Touch Orbit + Raycast Click on 3D canvas
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

      // Treat clean short click/tap as interactive 3D selection!
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
          } else if (ud?.type === "exit") {
            exitStore();
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (modalOpenRef.current) return;
      camDistRef.current = Math.max(4.5, Math.min(13.5, camDistRef.current + e.deltaY * 0.006));
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
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

    // Main 60fps Game Loop
    let rafId = 0;
    let lastTime = performance.now();
    let radarTick = 0;
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

        // Blend mobile virtual joystick
        if (Math.abs(joystickRef.current.x) > 0.08 || Math.abs(joystickRef.current.y) > 0.08) {
          inputRight += joystickRef.current.x;
          inputForward -= joystickRef.current.y;
        }
      }

      const isSprinting = keys.has("shift");
      const speed = isSprinting ? 11.8 : 7.0;

      const inputLen = Math.hypot(inputForward, inputRight);
      let currentSpeed = 0;

      if (inputLen > 0.05) {
        const nf = inputForward / Math.max(1, inputLen);
        const nr = inputRight / Math.max(1, inputLen);

        // Camera forward vector on XZ plane
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

          // Smoothly rotate character toward movement direction
          const targetYaw = Math.atan2(moveVec.x, moveVec.z);
          let diff = targetYaw - playerYawRef.current;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          playerYawRef.current += diff * Math.min(1, dt * 12);
        }
      }

      // Collisions & World-specific updates
      const isInside = Boolean(activeStoreRef.current);
      if (isInside && interiorRef.current) {
        resolveCollisions(
          playerPosRef.current,
          interiorRef.current.colliders,
          interiorRef.current.bounds
        );
        interiorRef.current.update(elapsed, playerPosRef.current);

        // Proximity detection inside store
        let nextPrompt: PromptState = null;
        const exitDist = Math.hypot(
          playerPosRef.current.x - interiorRef.current.exitSpot.x,
          playerPosRef.current.z - interiorRef.current.exitSpot.z
        );
        const pubDist = Math.hypot(
          playerPosRef.current.x - interiorRef.current.publishSpot.x,
          playerPosRef.current.z - interiorRef.current.publishSpot.z
        );

        if (exitDist < 1.35 && now > doorCooldownRef.current) {
          exitStore();
        } else if (exitDist < 2.6) {
          nextPrompt = {
            kind: "exit_store",
            theme: getStoreTheme(activeStoreRef.current!),
          };
        } else if (pubDist < 2.6) {
          nextPrompt = {
            kind: "publish_here",
            categoryName:
              categories.find((c) => c.slug === activeStoreRef.current)?.name || "esta tienda",
          };
        } else {
          let closestDist = 3.1;
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
        resolveCollisions(
          playerPosRef.current,
          exteriorRef.current.colliders,
          exteriorRef.current.bounds
        );
        exteriorRef.current.update(elapsed, dt, playerPosRef.current);

        // Proximity check for glowing GTA store doorway rings
        let nextPrompt: { kind: "enter_store"; theme: StoreTheme; count: number } | null = null;
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
        const prevKey =
          promptRef.current?.kind === "enter_store"
            ? promptRef.current.theme.categorySlug
            : promptRef.current?.kind;
        const nextKey = nextPrompt ? nextPrompt.theme.categorySlug : undefined;
        if (prevKey !== nextKey) {
          promptRef.current = nextPrompt;
          setPrompt(nextPrompt);
        }
      }

      // Sync player transform & animation
      player.group.position.copy(playerPosRef.current);
      player.group.rotation.y = playerYawRef.current;
      player.animate(dt, currentSpeed, isSprinting);

      // Smooth GTA third-person shoulder camera
      const dist = isInside ? Math.min(camDistRef.current, 6.4) : camDistRef.current;
      const horiz = Math.cos(camPitchRef.current) * dist;
      const vert = Math.sin(camPitchRef.current) * dist + 1.9;
      desiredCamPos.set(
        playerPosRef.current.x + Math.sin(camYawRef.current) * horiz,
        Math.max(1.2, Math.min(isInside ? 5.2 : 16, vert)),
        playerPosRef.current.z + Math.cos(camYawRef.current) * horiz
      );

      // Clamp camera inside room walls when inside a store
      if (isInside && interiorRef.current) {
        const b = interiorRef.current.bounds;
        desiredCamPos.x = Math.max(b.minX + 0.3, Math.min(b.maxX - 0.3, desiredCamPos.x));
        desiredCamPos.z = Math.max(b.minZ + 0.3, Math.min(b.maxZ - 0.3, desiredCamPos.z));
      }

      camera.position.lerp(desiredCamPos, Math.min(1, dt * 8.5));
      lookTarget.set(playerPosRef.current.x, 1.55, playerPosRef.current.z);
      camera.lookAt(lookTarget);

      renderer.render(scene, camera);

      // Throttle radar HUD state update to ~10Hz
      radarTick += dt;
      if (radarTick > 0.1) {
        radarTick = 0;
        setRadarState({
          x: playerPosRef.current.x,
          z: playerPosRef.current.z,
          yaw: playerYawRef.current,
        });
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

  // Sync exterior counts whenever listings update
  useEffect(() => {
    rebuildExteriorInScene();
  }, [rebuildExteriorInScene]);

  // Sync interior whenever store or listings change
  useEffect(() => {
    rebuildInteriorInScene();
  }, [rebuildInteriorInScene]);

  // Virtual Joystick Touch Handlers
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
    const maxR = 36;
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

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#140b29] select-none">
      {/* Three.js Fullscreen WebGL Canvas */}
      <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

      {/* Neon Door Transition Flash */}
      <div
        className={`pointer-events-none fixed inset-0 z-30 bg-gradient-to-br from-[#ff2a9d] via-[#1f1138] to-[#00f0ff] transition-opacity duration-200 ${
          transitioning ? "opacity-90" : "opacity-0"
        }`}
      />

      {/* TOP-LEFT HUD: Brand, Classic OS Switcher & Paraguay Filter Bar */}
      <div className="pointer-events-none fixed left-3 top-3 z-20 flex max-w-[calc(100vw-24px)] flex-col gap-2">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-[#ff4fd8]/40 bg-[#120926]/80 px-3 py-1.5 text-white shadow-lg backdrop-blur-md">
            <img src="/icons/icon.svg" alt="ReUsa PY" className="h-6 w-6 rounded-md" />
            <div className="leading-none">
              <span className="bg-gradient-to-r from-[#00f0ff] via-white to-[#ff4fd8] bg-clip-text text-sm font-black italic tracking-tight text-transparent">
                REUSA VICE PY
              </span>
              <span className="block text-[9px] font-semibold tracking-wider text-cyan-200/80">
                MUNDO 3D · PYG / USD
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExperienceMode("classic")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-[#120926]/80 px-3 py-2 text-xs font-bold text-cyan-200 shadow-lg backdrop-blur-md transition hover:border-cyan-300 hover:bg-cyan-500/20 hover:text-white"
          >
            {isMobileViewport ? (
              <Smartphone className="h-3.5 w-3.5" />
            ) : (
              <Monitor className="h-3.5 w-3.5" />
            )}
            <span>{isMobileViewport ? "Vista App" : "Vista Windows OS"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowStoreMenu((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#ff4fd8]/50 bg-[#120926]/80 px-3 py-2 text-xs font-bold text-pink-200 shadow-lg backdrop-blur-md transition hover:bg-[#ff2a9d]/25 hover:text-white"
          >
            <Store className="h-3.5 w-3.5" />
            <span>Tiendas ({categories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-2 text-xs font-bold shadow-lg backdrop-blur-md transition ${
              searchOpen || filters.q || filters.department
                ? "border-emerald-400 bg-emerald-500/25 text-emerald-100"
                : "border-white/20 bg-[#120926]/80 text-slate-200 hover:bg-white/15"
            }`}
            title="Filtrar ciudad o buscar"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filtrar PY</span>
          </button>
        </div>

        {/* Collapsible Paraguay Filter Bar */}
        {searchOpen && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-400/35 bg-[#120926]/90 p-2.5 text-xs text-white shadow-xl backdrop-blur-md">
            <input
              type="search"
              value={filters.q || ""}
              onChange={(e) => updateFilters({ q: e.target.value || undefined })}
              placeholder="Buscar medias, Corolla, casa..."
              className="w-44 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-300 outline-none focus:border-cyan-400"
            />
            <select
              value={filters.department || ""}
              onChange={(e) =>
                updateFilters({ department: e.target.value || undefined, city: undefined })
              }
              className="rounded-lg border border-white/15 bg-[#1d1138] px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
            >
              <option value="">Todo Paraguay</option>
              {departments.map((d) => (
                <option key={d.id} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={filters.currency || ""}
              onChange={(e) =>
                updateFilters({ currency: e.target.value as "" | "PYG" | "USD" })
              }
              className="rounded-lg border border-white/15 bg-[#1d1138] px-2 py-1.5 text-xs text-white outline-none"
            >
              <option value="">PYG + USD</option>
              <option value="PYG">Solo PYG</option>
              <option value="USD">Solo USD</option>
            </select>
          </div>
        )}

        {/* Quick Teleport Stores Drawer */}
        {showStoreMenu && (
          <div className="pointer-events-auto max-h-[60vh] w-72 overflow-y-auto rounded-2xl border border-[#ff4fd8]/40 bg-[#120926]/92 p-2.5 text-white shadow-2xl backdrop-blur-lg fluent-scroll">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-pink-300">
                Ir directo a una tienda
              </span>
              {activeStoreSlug && (
                <button
                  type="button"
                  onClick={() => {
                    exitStore();
                    setShowStoreMenu(false);
                  }}
                  className="rounded-md bg-pink-600/80 px-2 py-0.5 text-[10px] font-bold text-white"
                >
                  Salir a la calle
                </button>
              )}
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
                      isHere
                        ? "bg-white/20 ring-1 ring-cyan-300"
                        : "hover:bg-white/10"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-950 shadow-sm"
                        style={{ backgroundColor: t.neonColor }}
                      >
                        <CategoryIcon name={cat?.icon} className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold tracking-tight text-white">
                          {t.viceName}
                        </p>
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
      </div>

      {/* TOP-RIGHT HUD: Classic Vice City Zone Indicator + Actions */}
      <div className="pointer-events-none fixed right-3 top-3 z-20 flex flex-col items-end gap-2">
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWorldModal(user ? { kind: "publish" } : { kind: "auth" })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff2a9d] to-[#ff6b35] px-3 py-2 text-xs font-extrabold text-white shadow-lg shadow-pink-600/35 transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            <span>Publicar</span>
          </button>

          <button
            type="button"
            onClick={() => setWorldModal(user ? { kind: "chat" } : { kind: "auth" })}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-[#120926]/80 text-cyan-200 shadow-lg backdrop-blur-md hover:bg-white/15"
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
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-[#120926]/80 text-pink-300 shadow-lg backdrop-blur-md hover:bg-white/15"
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
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/50 bg-[#120926]/80 text-amber-300 shadow-lg backdrop-blur-md hover:bg-amber-500/20"
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
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/20 bg-[#120926]/80 px-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md hover:bg-white/15"
          >
            <User className="h-3.5 w-3.5 text-cyan-300" />
            <span className="hidden sm:inline">
              {user ? user.name.split(" ")[0] : "Ingresar"}
            </span>
          </button>
        </div>

        {/* Classic GTA Vice City Zone Banner */}
        <div className="pointer-events-auto flex flex-col items-end rounded-2xl border border-white/15 bg-[#120926]/75 px-3.5 py-2 text-right backdrop-blur-md">
          <span
            className="text-sm font-black italic tracking-wide drop-shadow-[0_0_10px_rgba(0,240,255,0.65)]"
            style={{ color: activeTheme ? activeTheme.neonColor : "#00f0ff" }}
          >
            {activeTheme ? activeTheme.viceName : "OCEAN BOULEVARD PY"}
          </span>
          <span className="text-[11px] font-bold text-pink-200">
            {activeTheme
              ? `${activeCategoryObj?.name || ""} · ${activeStoreListings.length} ${
                  activeStoreListings.length === 1 ? "producto" : "productos"
                }`
              : `${listings.length} productos usados en 10 tiendas`}
          </span>
          {activeStoreSlug && (
            <button
              type="button"
              onClick={exitStore}
              className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-[#ff2a9d] px-2.5 py-1 text-[11px] font-extrabold text-white shadow hover:bg-pink-500"
            >
              <DoorOpen className="h-3.5 w-3.5" /> Salir a la avenida
            </button>
          )}
        </div>
      </div>

      {/* BOTTOM-LEFT: GTA Circular Radar Minimap (Desktop) OR Virtual Thumb Joystick (Mobile) */}
      <div className="fixed bottom-4 left-4 z-20 flex items-end gap-3">
        {isMobileViewport ? (
          <div
            onPointerDown={handleJoyStart}
            onPointerMove={handleJoyMove}
            onPointerUp={handleJoyEnd}
            onPointerCancel={handleJoyEnd}
            className="relative flex h-28 w-28 touch-none items-center justify-center rounded-full border-2 border-cyan-400/60 bg-[#120926]/65 shadow-xl backdrop-blur-md"
          >
            <div className="h-10 w-10 rounded-full border border-white/15" />
            <div
              style={{ transform: `translate(${joyVisual.x}px, ${joyVisual.y}px)` }}
              className={`absolute h-11 w-11 rounded-full border-2 border-white shadow-lg transition-transform duration-75 ${
                joyVisual.active
                  ? "bg-gradient-to-br from-[#00f0ff] to-[#ff2a9d]"
                  : "bg-cyan-400/80"
              }`}
            />
            <span className="pointer-events-none absolute -bottom-5 text-[10px] font-bold text-cyan-200">
              Caminar
            </span>
          </div>
        ) : (
          /* Authentic GTA Vice City Circular Radar */
          <button
            type="button"
            onClick={() => setShowStoreMenu((v) => !v)}
            title="Radar Vice City — Clic para ver todas las tiendas"
            className="group relative h-32 w-32 overflow-hidden rounded-full border-[3px] border-[#00f0ff]/80 bg-[#180d30]/90 shadow-[0_0_24px_rgba(0,240,255,0.28)] backdrop-blur-md"
          >
            {/* Ocean strip at north of radar */}
            <div className="absolute inset-x-0 top-0 h-5 bg-cyan-500/45" />
            {/* Boulevard road vertical line */}
            <div className="absolute bottom-0 left-1/2 top-5 w-4 -translate-x-1/2 bg-slate-700/85" />
            <div className="absolute bottom-0 left-1/2 top-5 w-[1px] -translate-x-1/2 bg-amber-300/70" />

            {/* 10 Store Blips */}
            {!activeStoreSlug &&
              STORE_THEMES.map((t) => {
                const leftPct = 50 + (t.x / 24) * 34;
                const topPct = 50 + ((t.z + 10) / 72) * 42;
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

            {/* Live Player Arrow */}
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
                    : 50 + ((radarState.z + 10) / 72) * 42
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

      {/* BOTTOM-CENTER: Interactive GTA Contextual Prompt & Controls Hint */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex flex-col items-center gap-2 px-4">
        {prompt && !worldModal && (
          <button
            type="button"
            onClick={triggerPromptAction}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border-2 border-[#00f0ff] bg-[#120926]/92 px-4 py-2.5 text-left text-white shadow-[0_0_28px_rgba(0,240,255,0.4)] backdrop-blur-lg transition hover:scale-[1.02]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#ff2a9d] text-sm font-black text-slate-950">
              E
            </span>
            <div className="min-w-0">
              {prompt.kind === "enter_store" && (
                <>
                  <p className="truncate text-xs font-black uppercase tracking-wide text-cyan-200">
                    Entrar a {prompt.theme.viceName}
                  </p>
                  <p className="text-[11px] text-slate-200">
                    {prompt.count} {prompt.count === 1 ? "producto" : "productos"} · Tocá o
                    presioná [E]
                  </p>
                </>
              )}
              {prompt.kind === "inspect_listing" && (
                <>
                  <p className="truncate text-xs font-extrabold text-white">
                    {prompt.listing.title}
                  </p>
                  <p className="flex items-center gap-2 text-[11px] font-bold text-emerald-300">
                    <span>
                      {formatPrice(
                        prompt.listing.price,
                        prompt.listing.currency,
                        prompt.listing.isFree
                      )}
                    </span>
                    {prompt.listing.savingsPercent && (
                      <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white">
                        -{prompt.listing.savingsPercent}% vs nuevo
                      </span>
                    )}
                    <span className="font-normal text-cyan-200">· Ver detalles / Chat</span>
                  </p>
                </>
              )}
              {prompt.kind === "exit_store" && (
                <>
                  <p className="text-xs font-black uppercase text-pink-300">
                    Salir a Ocean Boulevard
                  </p>
                  <p className="text-[11px] text-slate-200">Tocá o presioná [E] para volver</p>
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
        )}

        {/* Controls helper bar */}
        <div className="hidden items-center gap-3 rounded-full border border-white/15 bg-[#120926]/70 px-4 py-1 text-[11px] font-medium text-slate-200 backdrop-blur-md md:flex">
          <span>
            <strong className="text-cyan-300">WASD / Flechas</strong> Caminar
          </span>
          <span>·</span>
          <span>
            <strong className="text-pink-300">Shift</strong> Correr
          </span>
          <span>·</span>
          <span>
            <strong className="text-amber-300">Arrastrar mouse</strong> Girar cámara
          </span>
          <span>·</span>
          <span>
            <strong className="text-emerald-300">Clic en tienda / producto</strong> Interactuar
          </span>
        </div>
      </div>

      {/* FLOATING REAL MARKETPLACE MODAL OVER THE 3D WORLD */}
      {worldModal && (
        <div
          onClick={() => setWorldModal(null)}
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#0c061a]/70 p-2 backdrop-blur-sm sm:p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#00f0ff]/40 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
          >
            {/* Vice-styled Modal Titlebar */}
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
