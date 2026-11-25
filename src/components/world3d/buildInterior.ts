import * as THREE from "three";
import type { ListingDTO } from "@/types/marketplace";
import type { StoreTheme } from "@/components/world3d/vicePalette";
import type { AABB } from "@/components/world3d/buildExterior";
import { buildCategoryPropModel } from "@/components/world3d/buildPropModels";
import {
  createActionStandTexture,
  createCheckerFloorTexture,
  createNeonSignTexture,
  createPriceHologramTexture,
  loadProductImageMaterial,
} from "@/components/world3d/textures";

export interface InteriorProductSpot {
  listing: ListingDTO;
  x: number;
  z: number;
  ring: THREE.Mesh;
  displayGroup: THREE.Group;
  propModel: THREE.Group;
  favGem: THREE.Mesh;
}

export interface InteriorWorldHandle {
  group: THREE.Group;
  bounds: AABB;
  colliders: AABB[];
  spawnPos: THREE.Vector3;
  exitSpot: { x: number; z: number; ring: THREE.Mesh };
  publishSpot: { x: number; z: number; ring: THREE.Mesh };
  npcSpot: { x: number; z: number; ring: THREE.Mesh };
  kioskSpot: { x: number; z: number; ring: THREE.Mesh };
  productSpots: InteriorProductSpot[];
  clickableMeshes: THREE.Object3D[];
  update: (time: number, playerPos: THREE.Vector3, favoriteIds: Set<string>) => void;
}

export function buildStoreInterior(
  theme: StoreTheme,
  categoryName: string,
  listings: ListingDTO[],
  favoriteIds: Set<string>
): InteriorWorldHandle {
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const clickableMeshes: THREE.Object3D[] = [];
  const productSpots: InteriorProductSpot[] = [];

  const count = listings.length;
  const rowsNeeded = Math.max(2, Math.ceil(count / 2));
  const roomW = 21;
  const roomD = Math.max(22, rowsNeeded * 6.8 + 11);
  const halfW = roomW / 2;
  const halfD = roomD / 2;
  const wallH = 6.4;

  const neonColor = new THREE.Color(theme.neonColor);
  const secNeonColor = new THREE.Color(theme.secondaryNeon);

  // Floor
  const floorMat = new THREE.MeshStandardMaterial({
    map: createCheckerFloorTexture(theme.interiorFloorA, theme.interiorFloorB),
    roughness: 0.32,
    metalness: 0.16,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW, roomD),
    new THREE.MeshStandardMaterial({ color: 0x120c24, roughness: 0.9 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = wallH;
  group.add(ceiling);

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(theme.interiorWall),
    roughness: 0.72,
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

  // Neon perimeter trim
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
    new THREE.PlaneGeometry(0.26, roomD - 4),
    new THREE.MeshBasicMaterial({ color: secNeonColor, transparent: true, opacity: 0.45 })
  );
  aisleStrip.rotation.x = -Math.PI / 2;
  aisleStrip.position.y = 0.015;
  group.add(aisleStrip);

  // Back Wall Giant Store Neon Sign
  const signTex = createNeonSignTexture(
    theme.viceName,
    categoryName,
    theme.neonColor,
    theme.secondaryNeon,
    count
  );
  const backSign = new THREE.Mesh(
    new THREE.PlaneGeometry(11.8, 3.2),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  backSign.position.set(0, 4.1, -halfD + 0.25);
  group.add(backSign);

  // Potted corner indoor plants
  const potMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  const plantLeafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 });
  for (const [px, pz] of [
    [-halfW + 1.3, -halfD + 1.3],
    [halfW - 1.3, -halfD + 1.3],
    [-halfW + 1.3, halfD - 1.4],
    [halfW - 1.3, halfD - 1.4],
  ]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.75, 10), potMat);
    pot.position.set(px, 0.38, pz);
    group.add(pot);
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65), plantLeafMat);
    bush.position.set(px, 1.15, pz);
    group.add(bush);
  }

  // Interactive Shopkeeper NPC + Neon Reception Counter at the back!
  const counterZ = -halfD + 2.8;
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 1.15, 1.3),
    new THREE.MeshStandardMaterial({
      color: 0x1e1633,
      roughness: 0.35,
      metalness: 0.3,
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

  const npc = new THREE.Group();
  npc.position.set(0, 0, counterZ - 1.0);
  const npcBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.85, 0.35),
    new THREE.MeshStandardMaterial({ color: neonColor, roughness: 0.6 })
  );
  npcBody.position.y = 1.25;
  npcBody.userData = { type: "npc" };
  npc.add(npcBody);
  clickableMeshes.push(npcBody);

  const npcHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.44, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xe6b58d, roughness: 0.65 })
  );
  npcHead.position.y = 1.92;
  npcHead.userData = { type: "npc" };
  npc.add(npcHead);
  clickableMeshes.push(npcHead);

  const npcShades = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.1, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.8 })
  );
  npcShades.position.set(0, 1.94, 0.21);
  npc.add(npcShades);

  // Floating NPC advisor sign
  const npcLabel = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createActionStandTexture("Asesor Vice PY", "Clic o [E] · Mejor ganga", theme.secondaryNeon),
      transparent: true,
    })
  );
  npcLabel.scale.set(2.3, 1.45, 1);
  npcLabel.position.set(0, 2.95, 0);
  npcLabel.userData = { type: "npc" };
  npc.add(npcLabel);
  clickableMeshes.push(npcLabel);
  group.add(npc);

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

  // Interior lighting
  const hemi = new THREE.HemisphereLight(0xf8fafc, 0x2e1065, 1.25);
  group.add(hemi);
  for (let lz = -halfD + 5; lz <= halfD - 4; lz += 9) {
    const pLight = new THREE.PointLight(0xfff1f2, 24, 24, 1.55);
    pLight.position.set(0, wallH - 0.9, lz);
    group.add(pLight);
  }

  // Interactive Product Exhibition Stands: REAL Photo Frame + Rotating 3D Category Model!
  const isShowroomLarge =
    theme.categorySlug === "vehiculos" || theme.categorySlug === "inmuebles";
  const standW = isShowroomLarge ? 4.8 : 4.2;
  const standD = isShowroomLarge ? 2.5 : 2.1;

  listings.forEach((listing, idx) => {
    const col = idx % 2 === 0 ? -1 : 1;
    const row = Math.floor(idx / 2);
    const sx = col * 6.0;
    const sz = halfD - 7.2 - row * 6.4;

    const standGroup = new THREE.Group();
    standGroup.position.set(sx, 0, sz);
    standGroup.rotation.y = col === -1 ? 0.34 : -0.34;

    // Pedestal Base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(standW, 0.72, standD),
      new THREE.MeshStandardMaterial({
        color: 0x18122b,
        roughness: 0.3,
        metalness: 0.45,
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

    // LEFT SIDE OF PEDESTAL: Floating Real Photo Showcase Frame
    const displayGroup = new THREE.Group();
    displayGroup.position.set(-standW * 0.21, 2.02, 0);

    const frameW = isShowroomLarge ? 2.65 : 2.35;
    const frameH = isShowroomLarge ? 1.98 : 1.78;

    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(frameW + 0.18, frameH + 0.18, 0.14),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: neonColor,
        emissiveIntensity: 0.38,
        roughness: 0.25,
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

    // RIGHT SIDE OF PEDESTAL: Rotating Stylized 3D Category Sculpture!
    const propTurntable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.82, 0.12, 18),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: secNeonColor,
        emissiveIntensity: 0.35,
      })
    );
    propTurntable.position.set(standW * 0.28, 0.82, 0);
    standGroup.add(propTurntable);

    const propModel = buildCategoryPropModel(listing, theme.neonColor);
    propModel.position.set(standW * 0.28, 0.92, 0);
    propModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.userData = { type: "listing", listing };
        clickableMeshes.push(child);
      }
    });
    standGroup.add(propModel);

    // Glowing Favorite Heart Gem (visible when listing is in user's favorites!)
    const favGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    favGem.position.set(standW * 0.44, 2.75, 0);
    favGem.visible = favoriteIds.has(listing.id);
    standGroup.add(favGem);

    // Floating 3D Hologram Price & Savings Billboard above stand
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

    // Floor interaction ring in aisle
    const ringX = sx - col * 2.3;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.84, 24),
      new THREE.MeshBasicMaterial({
        color: listing.isFree ? 0x10b981 : secNeonColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(ringX, 0.03, sz);
    group.add(ring);

    productSpots.push({
      listing,
      x: ringX,
      z: sz,
      ring,
      displayGroup,
      propModel,
      favGem,
    });

    colliders.push({
      minX: sx - standW / 2 - 0.3,
      maxX: sx + standW / 2 + 0.3,
      minZ: sz - standD / 2 - 0.3,
      maxZ: sz + standD / 2 + 0.3,
    });
  });

  // LEFT BACK STATION: "+ Publicar en esta tienda" Pedestal
  const publishX = -6.2;
  const publishZ = counterZ + 2.0;
  const pubGroup = new THREE.Group();
  pubGroup.position.set(publishX, 0, publishZ);
  pubGroup.rotation.y = 0.42;

  const pubBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.2, 0.65, 16),
    new THREE.MeshStandardMaterial({ color: 0x13242b, roughness: 0.35 })
  );
  pubBase.position.y = 0.33;
  pubBase.userData = { type: "publish", categorySlug: theme.categorySlug };
  pubGroup.add(pubBase);
  clickableMeshes.push(pubBase);

  const pubPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.5),
    new THREE.MeshBasicMaterial({
      map: createActionStandTexture(`Vender en ${categoryName}`, "Subí tus fotos gratis", "#10b981"),
      side: THREE.DoubleSide,
    })
  );
  pubPanel.position.y = 1.85;
  pubPanel.userData = { type: "publish", categorySlug: theme.categorySlug };
  pubGroup.add(pubPanel);
  clickableMeshes.push(pubPanel);
  group.add(pubGroup);

  const publishRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.08, 10, 24),
    new THREE.MeshBasicMaterial({ color: 0x10b981 })
  );
  publishRing.rotation.x = Math.PI / 2;
  publishRing.position.set(publishX + 1.85, 0.14, publishZ);
  group.add(publishRing);

  // RIGHT FRONT STATION: Interactive 3D Filter Kiosk!
  const kioskX = 6.2;
  const kioskZ = halfD - 3.2;
  const kioskGroup = new THREE.Group();
  kioskGroup.position.set(kioskX, 0, kioskZ);
  kioskGroup.rotation.y = -0.65;

  const kioskStand = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.5, 0.65),
    new THREE.MeshStandardMaterial({ color: 0x161b33, roughness: 0.3, metalness: 0.5 })
  );
  kioskStand.position.y = 0.75;
  kioskStand.userData = { type: "kiosk" };
  kioskGroup.add(kioskStand);
  clickableMeshes.push(kioskStand);

  const kioskScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1.4),
    new THREE.MeshBasicMaterial({
      map: createActionStandTexture(
        "Filtros en Vivo",
        "Ciudad · PYG/USD · % Ahorro",
        "#00f0ff"
      ),
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

  // Glowing Exit Doorway Ring at front wall
  const exitZ = halfD - 1.5;
  const exitDoor = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 3.2, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xff2a9d, transparent: true, opacity: 0.32 })
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
      npc.position.y = Math.sin(time * 2.4) * 0.04;

      for (let i = 0; i < productSpots.length; i++) {
        const spot = productSpots[i];
        spot.displayGroup.position.y = 2.02 + Math.sin(time * 2.0 + i) * 0.07;
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
