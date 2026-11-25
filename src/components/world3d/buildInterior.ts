import * as THREE from "three";
import type { ListingDTO } from "@/types/marketplace";
import type { StoreTheme } from "@/components/world3d/vicePalette";
import type { AABB } from "@/components/world3d/buildExterior";
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
}

export interface InteriorWorldHandle {
  group: THREE.Group;
  bounds: AABB;
  colliders: AABB[];
  spawnPos: THREE.Vector3;
  exitSpot: { x: number; z: number; ring: THREE.Mesh };
  publishSpot: { x: number; z: number; ring: THREE.Mesh };
  productSpots: InteriorProductSpot[];
  clickableMeshes: THREE.Object3D[];
  update: (time: number, playerPos: THREE.Vector3) => void;
}

export function buildStoreInterior(
  theme: StoreTheme,
  categoryName: string,
  listings: ListingDTO[]
): InteriorWorldHandle {
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const clickableMeshes: THREE.Object3D[] = [];
  const productSpots: InteriorProductSpot[] = [];

  // Scale room length cleanly based on how many products exist in this category
  const count = listings.length;
  const rowsNeeded = Math.max(2, Math.ceil(count / 2));
  const roomW = 20;
  const roomD = Math.max(20, rowsNeeded * 6.4 + 10);
  const halfW = roomW / 2;
  const halfD = roomD / 2;
  const wallH = 6.2;

  const neonColor = new THREE.Color(theme.neonColor);
  const secNeonColor = new THREE.Color(theme.secondaryNeon);

  // Floor
  const floorMat = new THREE.MeshStandardMaterial({
    map: createCheckerFloorTexture(theme.interiorFloorA, theme.interiorFloorB),
    roughness: 0.35,
    metalness: 0.15,
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

  // Center neon runway stripe down the showroom aisle
  const aisleStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, roomD - 4),
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
    new THREE.PlaneGeometry(11.5, 3.2),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  backSign.position.set(0, 4.0, -halfD + 0.25);
  group.add(backSign);

  // Reception Counter + Stylized Shopkeeper NPC at the back
  const counterZ = -halfD + 2.6;
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
  group.add(counter);

  const counterTrim = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.1, 1.36), neonMat);
  counterTrim.position.set(0, 1.16, counterZ);
  group.add(counterTrim);

  // Stylized NPC behind counter
  const npc = new THREE.Group();
  npc.position.set(0, 0, counterZ - 1.0);
  const npcBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.85, 0.35),
    new THREE.MeshStandardMaterial({ color: neonColor, roughness: 0.6 })
  );
  npcBody.position.y = 1.25;
  npc.add(npcBody);
  const npcHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.44, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xe6b58d, roughness: 0.65 })
  );
  npcHead.position.y = 1.92;
  npc.add(npcHead);
  const npcShades = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.1, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.8 })
  );
  npcShades.position.set(0, 1.94, 0.21);
  npc.add(npcShades);
  group.add(npc);

  colliders.push({
    minX: -3.1,
    maxX: 3.1,
    minZ: counterZ - 1.1,
    maxZ: counterZ + 1.0,
  });

  // Interior warm/neon lighting
  const hemi = new THREE.HemisphereLight(0xf8fafc, 0x2e1065, 1.15);
  group.add(hemi);

  for (let lz = -halfD + 5; lz <= halfD - 4; lz += 9) {
    const pLight = new THREE.PointLight(0xfff1f2, 22, 22, 1.6);
    pLight.position.set(0, wallH - 0.9, lz);
    group.add(pLight);
  }

  // Interactive Product Exhibition Stands for every REAL listing!
  const isShowroomLarge =
    theme.categorySlug === "vehiculos" || theme.categorySlug === "inmuebles";
  const standW = isShowroomLarge ? 4.4 : 3.4;
  const standD = isShowroomLarge ? 2.5 : 2.0;

  listings.forEach((listing, idx) => {
    const col = idx % 2 === 0 ? -1 : 1;
    const row = Math.floor(idx / 2);
    const sx = col * 5.6;
    const sz = halfD - 6.6 - row * 6.2;

    const standGroup = new THREE.Group();
    standGroup.position.set(sx, 0, sz);
    // Angle slightly toward center aisle so shopper sees every display clearly!
    standGroup.rotation.y = col === -1 ? 0.34 : -0.34;

    // Illuminated Pedestal Base
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
      listing.isFree
        ? new THREE.MeshBasicMaterial({ color: 0x10b981 })
        : neonMat
    );
    baseRim.position.y = 0.74;
    standGroup.add(baseRim);

    // Floating Showcase Display Frame with REAL listing image
    const displayGroup = new THREE.Group();
    displayGroup.position.set(0, 2.05, 0);

    const frameW = isShowroomLarge ? 3.5 : 2.8;
    const frameH = isShowroomLarge ? 2.45 : 2.05;

    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(frameW + 0.2, frameH + 0.2, 0.16),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: neonColor,
        emissiveIntensity: 0.35,
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
    photoFront.position.z = 0.09;
    photoFront.userData = { type: "listing", listing };
    displayGroup.add(photoFront);
    clickableMeshes.push(photoFront);

    const photoBack = new THREE.Mesh(new THREE.PlaneGeometry(frameW, frameH), photoMat);
    photoBack.position.z = -0.09;
    photoBack.rotation.y = Math.PI;
    photoBack.userData = { type: "listing", listing };
    displayGroup.add(photoBack);
    clickableMeshes.push(photoBack);

    standGroup.add(displayGroup);

    // Floating 3D Hologram Price & Savings Billboard Sprite above the display
    const holoTex = createPriceHologramTexture(listing, theme.neonColor);
    const holoSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: holoTex, transparent: true })
    );
    holoSprite.scale.set(3.5, 1.38, 1);
    holoSprite.position.set(0, 4.05, 0);
    holoSprite.userData = { type: "listing", listing };
    standGroup.add(holoSprite);
    clickableMeshes.push(holoSprite);

    group.add(standGroup);

    // Interactive floor halo ring in front of the stand
    const ringX = sx - col * 1.9;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.88, 24),
      new THREE.MeshBasicMaterial({
        color: listing.isFree ? 0x10b981 : secNeonColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
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
    });

    // Pedestal collision box
    colliders.push({
      minX: sx - standW / 2 - 0.3,
      maxX: sx + standW / 2 + 0.3,
      minZ: sz - standD / 2 - 0.3,
      maxZ: sz + standD / 2 + 0.3,
    });
  });

  // Dedicated "+ Publicar en esta tienda" Interactive Pedestal near the reception counter
  const publishX = -5.6;
  const publishZ = counterZ + 2.4;
  const pubGroup = new THREE.Group();
  pubGroup.position.set(publishX, 0, publishZ);
  pubGroup.rotation.y = 0.4;

  const pubBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.3, 0.65, 16),
    new THREE.MeshStandardMaterial({ color: 0x13242b, roughness: 0.35 })
  );
  pubBase.position.y = 0.33;
  pubBase.userData = { type: "publish", categorySlug: theme.categorySlug };
  pubGroup.add(pubBase);
  clickableMeshes.push(pubBase);

  const pubPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 1.6),
    new THREE.MeshBasicMaterial({
      map: createActionStandTexture(
        `Vender en ${categoryName}`,
        "Subí tus fotos gratis aquí",
        "#10b981"
      ),
      side: THREE.DoubleSide,
    })
  );
  pubPanel.position.y = 1.9;
  pubPanel.userData = { type: "publish", categorySlug: theme.categorySlug };
  pubGroup.add(pubPanel);
  clickableMeshes.push(pubPanel);
  group.add(pubGroup);

  const publishRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.09, 10, 24),
    new THREE.MeshBasicMaterial({ color: 0x10b981 })
  );
  publishRing.rotation.x = Math.PI / 2;
  publishRing.position.set(publishX + 1.8, 0.15, publishZ);
  group.add(publishRing);

  // Glowing Exit Doorway Ring at front wall (z = +halfD - 1.5)
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
    spawnPos: new THREE.Vector3(0, 0, halfD - 3.6),
    exitSpot: { x: 0, z: exitZ, ring: exitRing },
    publishSpot: { x: publishX + 1.8, z: publishZ, ring: publishRing },
    productSpots,
    clickableMeshes,
    update(time: number, playerPos: THREE.Vector3) {
      exitRing.position.y = 0.18 + Math.sin(time * 3.5) * 0.06;
      publishRing.position.y = 0.18 + Math.cos(time * 3.2) * 0.06;

      for (let i = 0; i < productSpots.length; i++) {
        const spot = productSpots[i];
        spot.displayGroup.position.y = 2.05 + Math.sin(time * 2.1 + i) * 0.08;
        const dist = Math.hypot(playerPos.x - spot.x, playerPos.z - spot.z);
        const scale = dist < 2.8 ? 1.18 + Math.sin(time * 6) * 0.06 : 1.0;
        spot.ring.scale.set(scale, scale, 1);
      }
    },
  };
}
