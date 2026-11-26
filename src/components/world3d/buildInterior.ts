import * as THREE from "three";
import type { CommercialStoreDTO, ListingDTO } from "@/types/marketplace";
import type { StoreTheme } from "@/components/world3d/vicePalette";
import type { AABB } from "@/components/world3d/buildExterior";
import { buildCategoryPropModel } from "@/components/world3d/buildPropModels";
import { buildSculptedHuman } from "@/components/world3d/buildPlayer";
import {
  applyImageUrlToMaterial,
  createActionStandTexture,
  createCommercialSignTexture,
  createFloorLogoMedallionTexture,
  createMarbleFloorPBR,
  createNeonSignTexture,
  createPriceHologramTexture,
  loadProductImageMaterial,
} from "@/components/world3d/textures";

export interface InteriorProductSpot {
  listing: ListingDTO;
  x: number;
  z: number;
  standX: number;
  standZ: number;
  standYaw: number;
  ring: THREE.Mesh;
  displayGroup: THREE.Group;
  propModel: THREE.Group;
  favGem: THREE.Mesh;
  photoMaterial: THREE.MeshStandardMaterial;
  setPhotoIndex: (idx: number) => void;
}

export interface InteriorWorldHandle {
  group: THREE.Group;
  bounds: AABB;
  colliders: AABB[];
  spawnPos: THREE.Vector3;
  isCommercialStore: boolean;
  exitSpot: { x: number; z: number; ring: THREE.Mesh };
  publishSpot: { x: number; z: number; ring: THREE.Mesh };
  npcSpot: { x: number; z: number; ring: THREE.Mesh };
  kioskSpot: { x: number; z: number; ring: THREE.Mesh };
  productSpots: InteriorProductSpot[];
  clickableMeshes: THREE.Object3D[];
  update: (time: number, playerPos: THREE.Vector3, favoriteIds: Set<string>) => void;
}

function addCategoryWallDecor(
  group: THREE.Group,
  slug: string,
  halfW: number,
  halfD: number,
  neonColor: THREE.Color
) {
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.9,
    roughness: 0.15,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });

  if (slug === "vehiculos") {
    // Stacked alloy tires display & racing stripes on side walls
    const tireGeo = new THREE.TorusGeometry(0.45, 0.16, 10, 18);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    for (const sx of [-halfW + 1.1, halfW - 1.1]) {
      for (let t = 0; t < 3; t++) {
        const tire = new THREE.Mesh(tireGeo, tireMat);
        tire.rotation.x = Math.PI / 2;
        tire.position.set(sx, 0.25 + t * 0.34, -halfD + 4.5);
        group.add(tire);
      }
    }
    return;
  }

  if (slug === "ropa-calzado") {
    // Boutique chrome clothing racks & illuminated mirrors along both side walls
    const garmentColors = [0xff5ec4, 0x38bdf8, 0xfbbf24, 0x34d399];
    for (const side of [-1, 1]) {
      const rack = new THREE.Group();
      rack.position.set(side * (halfW - 1.15), 0, -halfD + 6.5);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.8, 8), chromeMat);
      bar.rotation.x = Math.PI / 2;
      bar.position.y = 1.65;
      rack.add(bar);
      for (const gz of [-1.2, 1.2]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.65, 8), chromeMat);
        leg.position.set(0, 0.82, gz);
        rack.add(leg);
      }
      garmentColors.forEach((col, i) => {
        const cloth = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.85, 0.16),
          new THREE.MeshStandardMaterial({ color: col, roughness: 0.75 })
        );
        cloth.position.set(0, 1.15, -0.9 + i * 0.6);
        rack.add(cloth);
      });
      group.add(rack);
    }
    return;
  }

  if (slug === "inmuebles") {
    // Illuminated architectural blueprint boards on left/right walls
    const bpMat = new THREE.MeshStandardMaterial({
      color: 0x0c4a6e,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
    });
    for (const side of [-1, 1]) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 3.6), bpMat);
      board.position.set(side * (halfW - 0.25), 2.8, -halfD + 6.5);
      group.add(board);
    }
    return;
  }

  if (slug === "tecnologia") {
    // Glowing tech wall screens
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: neonColor,
      emissiveIntensity: 0.65,
    });
    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const scr = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 2.4), screenMat);
        scr.position.set(side * (halfW - 0.25), 3.0, -halfD + 5 + i * 3.4);
        group.add(scr);
      }
    }
    return;
  }

  // Default stylish boutique wall shelves & decorative frames
  for (const side of [-1, 1]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 3.4), darkMat);
    shelf.position.set(side * (halfW - 0.45), 2.2, -halfD + 6.5);
    group.add(shelf);
    const accent = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 3.4),
      new THREE.MeshBasicMaterial({ color: neonColor })
    );
    accent.position.set(side * (halfW - 0.7), 2.2, -halfD + 6.5);
    group.add(accent);
  }
}

export function buildStoreInterior(
  theme: StoreTheme,
  categoryName: string,
  listings: ListingDTO[],
  favoriteIds: Set<string>,
  commercialStore?: CommercialStoreDTO
): InteriorWorldHandle {
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const clickableMeshes: THREE.Object3D[] = [];
  const productSpots: InteriorProductSpot[] = [];

  const count = listings.length;
  const rowsNeeded = Math.max(2, Math.ceil(count / 2));
  const roomW = commercialStore?.planTier === "FLAGSHIP" ? 23.0 : 21.5;
  const roomD = Math.max(22, rowsNeeded * 6.8 + 11.5);
  const halfW = roomW / 2;
  const halfD = roomD / 2;
  const wallH = 6.5;

  const neonColor = new THREE.Color(commercialStore?.neonColor || theme.neonColor);
  const secNeonColor = new THREE.Color(commercialStore?.secondaryNeon || theme.secondaryNeon);

  // Polished Reflective Veined Marble Showroom Floor (uses PMREM envMap!)
  const marblePBR = createMarbleFloorPBR(theme.interiorFloorA, theme.interiorFloorB);
  const floorMat = new THREE.MeshStandardMaterial({
    map: marblePBR.map,
    roughnessMap: marblePBR.roughnessMap,
    roughness: 0.22,
    metalness: 0.28,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW, roomD),
    new THREE.MeshStandardMaterial({ color: 0x100a20, roughness: 0.85 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = wallH;
  group.add(ceiling);

  const wallMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(theme.interiorWall),
    roughness: 0.65,
  });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, 0.4), wallMat);
  backWall.position.set(0, wallH / 2, -halfD);
  group.add(backWall);

  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, 0.4), wallMat);
  frontWall.position.set(0, wallH / 2, halfD);
  group.add(frontWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, wallH, roomD), wallMat);
  leftWall.position.set(-halfW, wallH / 2, 0);
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, wallH, roomD), wallMat);
  rightWall.position.set(halfW, wallH / 2, 0);
  group.add(rightWall);

  // Bespoke wall decor tailored to this category!
  addCategoryWallDecor(group, theme.categorySlug, halfW, halfD, neonColor);

  // Neon ceiling perimeter strips
  const neonMat = new THREE.MeshBasicMaterial({ color: neonColor });
  const secNeonMat = new THREE.MeshBasicMaterial({ color: secNeonColor });

  const stripLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, roomD - 0.6), neonMat);
  stripLeft.position.set(-halfW + 0.3, wallH - 0.35, 0);
  group.add(stripLeft);

  const stripRight = stripLeft.clone();
  stripRight.position.x = halfW - 0.3;
  group.add(stripRight);

  const stripBack = new THREE.Mesh(new THREE.BoxGeometry(roomW - 0.6, 0.16, 0.16), secNeonMat);
  stripBack.position.set(0, wallH - 0.35, -halfD + 0.3);
  group.add(stripBack);

  const aisleStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, roomD - 4),
    new THREE.MeshBasicMaterial({ color: secNeonColor, transparent: true, opacity: 0.45 })
  );
  aisleStrip.rotation.x = -Math.PI / 2;
  aisleStrip.position.y = 0.015;
  group.add(aisleStrip);

  // Back Wall Giant Store Sign (Commercial Brand Real Logo OR Category Neon)
  const signTex = commercialStore
    ? createCommercialSignTexture(commercialStore, count)
    : createNeonSignTexture(
        theme.viceName,
        categoryName,
        theme.neonColor,
        theme.secondaryNeon,
        count
      );
  const backSign = new THREE.Mesh(
    new THREE.PlaneGeometry(12.2, 3.6),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  backSign.position.set(0, 4.15, -halfD + 0.25);
  group.add(backSign);

  // Commercial Brand Extras: Glowing Floor Logo Medallion + Illuminated Side Wall Brand Lightboxes!
  if (commercialStore) {
    const medallionTex = createFloorLogoMedallionTexture(commercialStore);
    const medallion = new THREE.Mesh(
      new THREE.CircleGeometry(2.35, 36),
      new THREE.MeshBasicMaterial({
        map: medallionTex,
        transparent: true,
        depthWrite: false,
      })
    );
    medallion.rotation.x = -Math.PI / 2;
    medallion.position.set(0, 0.025, halfD - 6.6);
    group.add(medallion);

    const sideBannerGeo = new THREE.PlaneGeometry(6.4, 2.1);
    const sideBannerMat = new THREE.MeshBasicMaterial({ map: signTex });
    const leftBanner = new THREE.Mesh(sideBannerGeo, sideBannerMat);
    leftBanner.position.set(-halfW + 0.26, 4.1, 0);
    leftBanner.rotation.y = Math.PI / 2;
    group.add(leftBanner);

    const rightBanner = new THREE.Mesh(sideBannerGeo, sideBannerMat);
    rightBanner.position.set(halfW - 0.26, 4.1, 0);
    rightBanner.rotation.y = -Math.PI / 2;
    group.add(rightBanner);
  }

  // Potted indoor designer plants
  const potMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const plantLeafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65 });
  for (const [px, pz] of [
    [-halfW + 1.3, -halfD + 1.3],
    [halfW - 1.3, -halfD + 1.3],
    [-halfW + 1.3, halfD - 1.4],
    [halfW - 1.3, halfD - 1.4],
  ]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.75, 12), potMat);
    pot.position.set(px, 0.38, pz);
    group.add(pot);
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 1), plantLeafMat);
    bush.position.set(px, 1.15, pz);
    group.add(bush);
  }

  // Interactive Sculpted Shopkeeper NPC behind Backlit Reception Counter!
  const counterZ = -halfD + 2.8;
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 1.15, 1.3),
    new THREE.MeshPhysicalMaterial({
      color: 0x1a132c,
      roughness: 0.2,
      metalness: 0.35,
      clearcoat: 0.8,
    })
  );
  counter.position.set(0, 0.58, counterZ);
  counter.castShadow = true;
  counter.userData = { type: "npc" };
  group.add(counter);
  clickableMeshes.push(counter);

  const counterTrim = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.1, 1.36), neonMat);
  counterTrim.position.set(0, 1.16, counterZ);
  group.add(counterTrim);

  const npcRig = buildSculptedHuman({
    shirtColor: neonColor.getHex(),
    pantsColor: 0x0f172a,
    skinColor: 0xdfa980,
    withShades: true,
  });
  npcRig.group.position.set(0, 0, counterZ - 0.95);
  npcRig.group.traverse((ch) => {
    if ((ch as THREE.Mesh).isMesh) {
      ch.userData = { type: "npc" };
      clickableMeshes.push(ch);
    }
  });
  group.add(npcRig.group);

  const npcLabel = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createActionStandTexture(
        commercialStore ? `Asesor ${commercialStore.name}` : "Asesor Vice PY",
        commercialStore ? "Horarios · WhatsApp · Info" : "Clic o [E] · Mejor ganga",
        commercialStore?.secondaryNeon || theme.secondaryNeon
      ),
      transparent: true,
    })
  );
  npcLabel.scale.set(2.3, 1.45, 1);
  npcLabel.position.set(0, 2.85, counterZ - 0.95);
  npcLabel.userData = { type: "npc" };
  group.add(npcLabel);
  clickableMeshes.push(npcLabel);

  const npcRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.08, 10, 24),
    new THREE.MeshBasicMaterial({ color: secNeonColor })
  );
  npcRing.rotation.x = Math.PI / 2;
  npcRing.position.set(0, 0.14, counterZ + 1.85);
  npcRing.userData = { type: "npc" };
  group.add(npcRing);
  clickableMeshes.push(npcRing);

  colliders.push({
    minX: -3.1,
    maxX: 3.1,
    minZ: counterZ - 1.1,
    maxZ: counterZ + 0.9,
  });

  // Interior warm showroom lighting
  const hemi = new THREE.HemisphereLight(0xf8fafc, 0x2e1065, 1.25);
  group.add(hemi);
  for (let lz = -halfD + 5; lz <= halfD - 4; lz += 9) {
    const pLight = new THREE.PointLight(0xfff1f2, 26, 25, 1.5);
    pLight.position.set(0, wallH - 0.8, lz);
    group.add(pLight);
  }

  // Real Glass Vitrine material + Ceiling Spotlight Cones
  const vitrineGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xe0f2fe,
    roughness: 0.05,
    metalness: 0.05,
    transparent: true,
    opacity: 0.24,
    clearcoat: 1.0,
    depthWrite: false,
  });
  const spotCanMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
  const lightConeGeo = new THREE.ConeGeometry(2.1, 4.8, 16, 1, true);
  const lightConeMat = new THREE.MeshBasicMaterial({
    color: 0xfff7ed,
    transparent: true,
    opacity: 0.055,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const isShowroomLarge =
    theme.categorySlug === "vehiculos" || theme.categorySlug === "inmuebles";
  const standW = isShowroomLarge ? 5.0 : 4.4;
  const standD = isShowroomLarge ? 2.6 : 2.2;

  listings.forEach((listing, idx) => {
    const col = idx % 2 === 0 ? -1 : 1;
    const row = Math.floor(idx / 2);
    const sx = col * 6.0;
    const sz = halfD - 7.4 - row * 6.4;
    const standYaw = col === -1 ? 0.36 : -0.36;

    const standGroup = new THREE.Group();
    standGroup.position.set(sx, 0, sz);
    standGroup.rotation.y = standYaw;

    // Ceiling spotlight fixture + soft volumetric light cone over this stand
    const spotCan = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.35, 12), spotCanMat);
    spotCan.position.set(0, wallH - 0.2, 0);
    standGroup.add(spotCan);
    const spotCone = new THREE.Mesh(lightConeGeo, lightConeMat);
    spotCone.position.set(0, wallH - 2.6, 0);
    standGroup.add(spotCone);

    // Glossy Showroom Pedestal Base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(standW, 0.72, standD),
      new THREE.MeshPhysicalMaterial({
        color: 0x161028,
        roughness: 0.22,
        metalness: 0.45,
        clearcoat: 0.9,
      })
    );
    base.position.y = 0.36;
    base.castShadow = true;
    base.receiveShadow = true;
    base.userData = { type: "listing", listing };
    standGroup.add(base);
    clickableMeshes.push(base);

    const baseRim = new THREE.Mesh(
      new THREE.BoxGeometry(standW + 0.08, 0.09, standD + 0.08),
      listing.isFree ? new THREE.MeshBasicMaterial({ color: 0x10b981 }) : neonMat
    );
    baseRim.position.y = 0.74;
    standGroup.add(baseRim);

    // LEFT: Illuminated Real Photo Display Frame (supports live multi-photo switching!)
    const displayGroup = new THREE.Group();
    displayGroup.position.set(-standW * 0.21, 2.02, 0);

    const frameW = isShowroomLarge ? 2.75 : 2.45;
    const frameH = isShowroomLarge ? 2.05 : 1.82;

    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(frameW + 0.18, frameH + 0.18, 0.14),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: neonColor,
        emissiveIntensity: 0.42,
        roughness: 0.22,
      })
    );
    backing.userData = { type: "listing", listing };
    displayGroup.add(backing);
    clickableMeshes.push(backing);

    const coverUrl =
      listing.images.find((i) => i.isCover)?.url || listing.images[0]?.url;
    const photoMat = loadProductImageMaterial(coverUrl);

    const photoFront = new THREE.Mesh(new THREE.PlaneGeometry(frameW, frameH), photoMat);
    photoFront.position.z = 0.08;
    photoFront.userData = { type: "listing", listing };
    displayGroup.add(photoFront);
    clickableMeshes.push(photoFront);

    const photoBack = new THREE.Mesh(new THREE.PlaneGeometry(frameW, frameH), photoMat);
    photoBack.position.z = -0.08;
    photoBack.rotation.y = Math.PI;
    photoBack.userData = { type: "listing", listing };
    displayGroup.add(photoBack);
    clickableMeshes.push(photoBack);

    standGroup.add(displayGroup);

    // RIGHT: Real Glass Vitrine + Rotating Sculpted 3D Category Prop!
    const propX = standW * 0.28;
    const propTurntable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.84, 0.12, 20),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: secNeonColor,
        emissiveIntensity: 0.4,
        metalness: 0.6,
        roughness: 0.2,
      })
    );
    propTurntable.position.set(propX, 0.82, 0);
    standGroup.add(propTurntable);

    const propModel = buildCategoryPropModel(listing, theme.neonColor);
    propModel.position.set(propX, 0.92, 0);
    propModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.userData = { type: "listing", listing };
        clickableMeshes.push(child);
      }
    });
    standGroup.add(propModel);

    // Clear glass vitrine showcase cube around the 3D prop
    const vitrineCase = new THREE.Mesh(new THREE.BoxGeometry(1.72, 1.55, 1.72), vitrineGlassMat);
    vitrineCase.position.set(propX, 1.62, 0);
    vitrineCase.userData = { type: "listing", listing };
    standGroup.add(vitrineCase);
    clickableMeshes.push(vitrineCase);

    // Glowing Favorite Heart Gem
    const favGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    favGem.position.set(standW * 0.44, 2.75, 0);
    favGem.visible = favoriteIds.has(listing.id);
    standGroup.add(favGem);

    // Floating 3D Hologram Price & Savings Billboard
    const holoTex = createPriceHologramTexture(listing, theme.neonColor);
    const holoSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: holoTex, transparent: true })
    );
    holoSprite.scale.set(3.6, 1.4, 1);
    holoSprite.position.set(0, 3.85, 0);
    holoSprite.userData = { type: "listing", listing };
    standGroup.add(holoSprite);
    clickableMeshes.push(holoSprite);

    group.add(standGroup);

    const ringX = sx - col * 2.35;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.84, 24),
      new THREE.MeshBasicMaterial({
        color: listing.isFree ? 0x10b981 : secNeonColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(ringX, 0.03, sz);
    group.add(ring);

    productSpots.push({
      listing,
      x: ringX,
      z: sz,
      standX: sx,
      standZ: sz,
      standYaw,
      ring,
      displayGroup,
      propModel,
      favGem,
      photoMaterial: photoMat,
      setPhotoIndex(nextIdx: number) {
        const imgs = listing.images;
        if (!imgs || imgs.length === 0) return;
        const safe = ((nextIdx % imgs.length) + imgs.length) % imgs.length;
        applyImageUrlToMaterial(photoMat, imgs[safe].url);
      },
    });

    colliders.push({
      minX: sx - standW / 2 - 0.3,
      maxX: sx + standW / 2 + 0.3,
      minZ: sz - standD / 2 - 0.3,
      maxZ: sz + standD / 2 + 0.3,
    });
  });

  // Left Pedestal: "+ Publicar" (Community store) OR "Catálogo / Info / Pedido" (Commercial store)
  const publishX = -6.2;
  const publishZ = counterZ + 2.0;
  const pubGroup = new THREE.Group();
  pubGroup.position.set(publishX, 0, publishZ);
  pubGroup.rotation.y = 0.42;

  const leftActionUserData = commercialStore
    ? { type: "store_info", storeSlug: commercialStore.slug }
    : { type: "publish", categorySlug: theme.categorySlug };

  const pubBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.2, 0.65, 16),
    new THREE.MeshStandardMaterial({ color: 0x13242b, roughness: 0.3, metalness: 0.4 })
  );
  pubBase.position.y = 0.33;
  pubBase.userData = leftActionUserData;
  pubGroup.add(pubBase);
  clickableMeshes.push(pubBase);

  const pubPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.5),
    new THREE.MeshBasicMaterial({
      map: createActionStandTexture(
        commercialStore ? "Catálogo y Pedido" : `Vender en ${categoryName}`,
        commercialStore ? "WhatsApp · Mapa · Horarios" : "Subí tus fotos gratis",
        commercialStore ? commercialStore.neonColor : "#10b981"
      ),
      side: THREE.DoubleSide,
    })
  );
  pubPanel.position.y = 1.85;
  pubPanel.userData = leftActionUserData;
  pubGroup.add(pubPanel);
  clickableMeshes.push(pubPanel);
  group.add(pubGroup);

  const publishRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.08, 10, 24),
    new THREE.MeshBasicMaterial({ color: commercialStore ? neonColor : 0x10b981 })
  );
  publishRing.rotation.x = Math.PI / 2;
  publishRing.position.set(publishX + 1.85, 0.14, publishZ);
  group.add(publishRing);

  // Interactive 3D Filter Kiosk
  const kioskX = 6.2;
  const kioskZ = halfD - 3.2;
  const kioskGroup = new THREE.Group();
  kioskGroup.position.set(kioskX, 0, kioskZ);
  kioskGroup.rotation.y = -0.65;

  const kioskStand = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.5, 0.65),
    new THREE.MeshStandardMaterial({ color: 0x161b33, roughness: 0.25, metalness: 0.55 })
  );
  kioskStand.position.y = 0.75;
  kioskStand.userData = { type: "kiosk" };
  kioskGroup.add(kioskStand);
  clickableMeshes.push(kioskStand);

  const kioskScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1.4),
    new THREE.MeshBasicMaterial({
      map: createActionStandTexture("Filtros en Vivo", "Subcategoría · Ciudad · %", "#00f0ff"),
      side: THREE.DoubleSide,
    })
  );
  kioskScreen.position.set(0, 2.05, 0.12);
  kioskScreen.userData = { type: "kiosk" };
  kioskGroup.add(kioskScreen);
  clickableMeshes.push(kioskScreen);
  group.add(kioskGroup);

  const kioskRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.08, 10, 24),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff })
  );
  kioskRing.rotation.x = Math.PI / 2;
  kioskRing.position.set(kioskX - 1.85, 0.14, kioskZ);
  kioskRing.userData = { type: "kiosk" };
  group.add(kioskRing);
  clickableMeshes.push(kioskRing);

  // Exit Doorway
  const exitZ = halfD - 1.5;
  const exitDoor = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 3.2, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xff2a9d, transparent: true, opacity: 0.34 })
  );
  exitDoor.position.set(0, 1.6, halfD - 0.22);
  exitDoor.userData = { type: "exit" };
  group.add(exitDoor);
  clickableMeshes.push(exitDoor);

  const exitRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.11, 10, 28),
    new THREE.MeshBasicMaterial({ color: 0xff2a9d })
  );
  exitRing.rotation.x = Math.PI / 2;
  exitRing.position.set(0, 0.18, exitZ);
  exitRing.userData = { type: "exit" };
  group.add(exitRing);
  clickableMeshes.push(exitRing);

  const bounds: AABB = {
    minX: -halfW + 0.9,
    maxX: halfW - 0.9,
    minZ: -halfD + 0.9,
    maxZ: halfD - 0.9,
  };

  return {
    group,
    bounds,
    colliders,
    spawnPos: new THREE.Vector3(0, 0, halfD - 3.8),
    isCommercialStore: Boolean(commercialStore),
    exitSpot: { x: 0, z: exitZ, ring: exitRing },
    publishSpot: { x: publishX + 1.85, z: publishZ, ring: publishRing },
    npcSpot: { x: 0, z: counterZ + 1.85, ring: npcRing },
    kioskSpot: { x: kioskX - 1.85, z: kioskZ, ring: kioskRing },
    productSpots,
    clickableMeshes,
    update(time: number, playerPos: THREE.Vector3, liveFavorites: Set<string>) {
      exitRing.position.y = 0.18 + Math.sin(time * 3.5) * 0.06;
      publishRing.position.y = 0.14 + Math.cos(time * 3.2) * 0.05;
      npcRing.position.y = 0.14 + Math.sin(time * 3.0) * 0.05;
      kioskRing.position.y = 0.14 + Math.cos(time * 3.4) * 0.05;
      npcRig.torsoGroup.position.y = 1.24 + Math.sin(time * 2.2) * 0.025;

      for (let i = 0; i < productSpots.length; i++) {
        const spot = productSpots[i];
        spot.displayGroup.position.y = 2.02 + Math.sin(time * 2.0 + i) * 0.06;
        spot.propModel.rotation.y = time * 0.95 + i;
        spot.favGem.visible = liveFavorites.has(spot.listing.id);
        spot.favGem.rotation.y = time * 2.2;
        const dist = Math.hypot(playerPos.x - spot.x, playerPos.z - spot.z);
        const scale = dist < 3.0 ? 1.18 + Math.sin(time * 6) * 0.06 : 1.0;
        spot.ring.scale.set(scale, scale, 1);
      }
    },
  };
}
