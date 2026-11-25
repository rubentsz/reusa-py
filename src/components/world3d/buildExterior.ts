import * as THREE from "three";
import { STORE_THEMES, type StoreTheme } from "@/components/world3d/vicePalette";
import {
  createBoulevardRoadTexture,
  createDealBillboardTexture,
  createNeonSignTexture,
  createSidewalkTexture,
  createSunsetSkyTexture,
} from "@/components/world3d/textures";
import type { ListingDTO } from "@/types/marketplace";

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ExteriorDoorTrigger {
  theme: StoreTheme;
  x: number;
  z: number;
  ring: THREE.Mesh;
  beam: THREE.Mesh;
}

export interface DrivableCar {
  id: string;
  name: string;
  mesh: THREE.Group;
  bodyGroup: THREE.Group;
  headlightMat: THREE.MeshBasicMaterial;
  laneX: number;
  aiDir: number;
  aiSpeed: number;
  speed: number;
  yaw: number;
  hornFlash: number;
}

interface PedestrianNPC {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  axis: "z" | "x";
  min: number;
  max: number;
  dir: number;
  speed: number;
  phase: number;
}

export interface ExteriorWorldHandle {
  group: THREE.Group;
  colliders: AABB[];
  bounds: AABB;
  pierBounds: AABB;
  doorTriggers: ExteriorDoorTrigger[];
  cars: DrivableCar[];
  clickableMeshes: THREE.Object3D[];
  update: (
    time: number,
    dt: number,
    playerPos: THREE.Vector3,
    drivenCarId: string | null
  ) => void;
}

function createPalmTree(seed: number): THREE.Group {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4c3b, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });

  const leanX = Math.sin(seed * 3.1) * 0.65;
  const leanZ = Math.cos(seed * 2.3) * 0.55;
  const segments = 6;
  const segH = 1.15;

  let curX = 0;
  let curY = 0;
  let curZ = 0;

  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const radiusTop = 0.24 - t * 0.09;
    const radiusBot = 0.28 - t * 0.09;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBot, segH + 0.08, 7),
      trunkMat
    );
    const nx = leanX * t * t;
    const nz = leanZ * t * t;
    seg.position.set(nx, curY + segH * 0.5, nz);
    seg.rotation.z = -leanX * t * 0.25;
    seg.rotation.x = leanZ * t * 0.25;
    seg.castShadow = true;
    tree.add(seg);
    curX = nx;
    curY += segH;
    curZ = nz;
  }

  const crown = new THREE.Group();
  crown.position.set(curX, curY, curZ);

  const cocoMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
  for (let c = 0; c < 3; c++) {
    const a = (c / 3) * Math.PI * 2;
    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), cocoMat);
    coco.position.set(Math.cos(a) * 0.2, -0.1, Math.sin(a) * 0.2);
    crown.add(coco);
  }

  const frondGeo = new THREE.BoxGeometry(0.42, 0.06, 2.7);
  frondGeo.translate(0, 0, 1.35);
  for (let f = 0; f < 7; f++) {
    const angle = (f / 7) * Math.PI * 2 + seed;
    const frondPivot = new THREE.Group();
    frondPivot.rotation.y = angle;
    const frond = new THREE.Mesh(frondGeo, leafMat);
    frond.rotation.x = 0.34 + (f % 2) * 0.14;
    frond.castShadow = true;
    frondPivot.add(frond);
    crown.add(frondPivot);
  }

  tree.add(crown);
  tree.userData.crown = crown;
  tree.userData.seed = seed;
  return tree;
}

function createRetroCar(id: string, name: string, bodyColor: number): {
  mesh: THREE.Group;
  bodyGroup: THREE.Group;
  headlightMat: THREE.MeshBasicMaterial;
} {
  const car = new THREE.Group();
  const bodyGroup = new THREE.Group();
  car.add(bodyGroup);

  const paintMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.22,
    metalness: 0.58,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.9,
  });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
  const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1e56 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.65, 4.55), paintMat);
  chassis.position.y = 0.58;
  chassis.castShadow = true;
  chassis.userData = { type: "car", carId: id, carName: name };
  bodyGroup.add(chassis);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.52, 2.0), glassMat);
  cabin.position.set(0, 1.12, -0.15);
  cabin.userData = { type: "car", carId: id, carName: name };
  bodyGroup.add(cabin);

  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.08, 0.38), paintMat);
  spoiler.position.set(0, 1.14, -1.96);
  bodyGroup.add(spoiler);

  // Subtle underglow strip (Vice City night-cruiser vibe!)
  const underglow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.85, 3.8),
    new THREE.MeshBasicMaterial({
      color: bodyColor,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    })
  );
  underglow.rotation.x = -Math.PI / 2;
  underglow.position.y = 0.06;
  car.add(underglow);

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.28, 10);
  rimGeo.rotateZ(Math.PI / 2);
  const wheelPositions = [
    [-1.04, 0.36, 1.38],
    [1.04, 0.36, 1.38],
    [-1.04, 0.36, -1.38],
    [1.04, 0.36, -1.38],
  ];
  for (const [wx, wy, wz] of wheelPositions) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(wx, wy, wz);
    car.add(w);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(wx, wy, wz);
    car.add(rim);
  }

  const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.08), headlightMat);
  hlL.position.set(-0.66, 0.62, 2.29);
  bodyGroup.add(hlL);
  const hlR = hlL.clone();
  hlR.position.x = 0.66;
  bodyGroup.add(hlR);

  const tl = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.08), taillightMat);
  tl.position.set(0, 0.68, -2.29);
  bodyGroup.add(tl);

  return { mesh: car, bodyGroup, headlightMat };
}

function createPedestrian(shirtHex: number, pantsHex: number, skinHex: number): {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
} {
  const group = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.7 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.65 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x271912, roughness: 0.9 });

  const legGeo = new THREE.BoxGeometry(0.2, 0.72, 0.22);
  legGeo.translate(0, -0.36, 0);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.13, 0.74, 0);
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.13, 0.74, 0);
  group.add(rightLeg);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.68, 0.3), shirtMat);
  torso.position.y = 1.08;
  torso.castShadow = true;
  group.add(torso);

  const armGeo = new THREE.BoxGeometry(0.16, 0.56, 0.16);
  armGeo.translate(0, -0.25, 0);
  const leftArm = new THREE.Mesh(armGeo, skinMat);
  leftArm.position.set(-0.36, 1.38, 0);
  group.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, skinMat);
  rightArm.position.set(0.36, 1.38, 0);
  group.add(rightArm);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), skinMat);
  head.position.y = 1.64;
  group.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.15, 0.41), hairMat);
  hair.position.y = 1.82;
  group.add(hair);

  return { group, leftLeg, rightLeg, leftArm, rightArm };
}

function createBeachUmbrella(colorA: number, colorB: number): THREE.Group {
  const umb = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
  );
  pole.position.y = 1.2;
  umb.add(pole);

  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(1.65, 0.65, 8),
    new THREE.MeshStandardMaterial({ color: colorA, roughness: 0.75 })
  );
  canopy.position.y = 2.4;
  canopy.castShadow = true;
  umb.add(canopy);

  const lounger = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.22, 1.9),
    new THREE.MeshStandardMaterial({ color: colorB, roughness: 0.8 })
  );
  lounger.position.set(0.95, 0.14, 0.25);
  umb.add(lounger);

  return umb;
}

export function buildViceExterior(
  listingCountByCategory: Record<string, number>,
  topDealListing?: ListingDTO | null
): ExteriorWorldHandle {
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const doorTriggers: ExteriorDoorTrigger[] = [];
  const clickableMeshes: THREE.Object3D[] = [];
  const palmTrees: THREE.Group[] = [];

  // 1. Sunset Sky Dome
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(280, 24, 16),
    new THREE.MeshBasicMaterial({
      map: createSunsetSkyTexture(),
      side: THREE.BackSide,
      fog: false,
    })
  );
  group.add(skyDome);

  // Giant glowing 80s Sunset Sun over the North Ocean
  const sunGroup = new THREE.Group();
  sunGroup.position.set(0, 34, -195);
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(29, 36),
    new THREE.MeshBasicMaterial({ color: 0xff9f43, fog: false })
  );
  sunGroup.add(sunDisc);
  const sunHalo = new THREE.Mesh(
    new THREE.CircleGeometry(40, 36),
    new THREE.MeshBasicMaterial({
      color: 0xff4fa3,
      transparent: true,
      opacity: 0.28,
      fog: false,
    })
  );
  sunHalo.position.z = -1;
  sunGroup.add(sunHalo);
  group.add(sunGroup);

  // 2. Ground, Boulevard, Sidewalks, Beach, Ocean & Tropical Pier
  const baseGround = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 220),
    new THREE.MeshStandardMaterial({ color: 0x382849, roughness: 0.95 })
  );
  baseGround.rotation.x = -Math.PI / 2;
  baseGround.position.set(0, -0.05, 10);
  baseGround.receiveShadow = true;
  group.add(baseGround);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(12.4, 128),
    new THREE.MeshStandardMaterial({
      map: createBoulevardRoadTexture(),
      roughness: 0.72,
      metalness: 0.12,
    })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, -6);
  road.receiveShadow = true;
  group.add(road);

  const sidewalkTex = createSidewalkTexture();
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: sidewalkTex,
    roughness: 0.78,
  });

  const westWalk = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.16, 128), sidewalkMat);
  westWalk.position.set(-9.4, 0.08, -6);
  westWalk.receiveShadow = true;
  group.add(westWalk);

  const eastWalk = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.16, 128), sidewalkMat);
  eastWalk.position.set(9.4, 0.08, -6);
  eastWalk.receiveShadow = true;
  group.add(eastWalk);

  const curbMat = new THREE.MeshStandardMaterial({
    color: 0xff4fa3,
    emissive: 0xff2a9d,
    emissiveIntensity: 0.45,
  });
  const westCurb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 128), curbMat);
  westCurb.position.set(-6.2, 0.09, -6);
  group.add(westCurb);
  const eastCurb = westCurb.clone();
  eastCurb.position.x = 6.2;
  group.add(eastCurb);

  // North Beach Promenade + Golden Sand + Animated Turquoise Ocean
  const boardwalk = new THREE.Mesh(
    new THREE.BoxGeometry(92, 0.18, 6.5),
    new THREE.MeshStandardMaterial({ color: 0xf4dce8, roughness: 0.8 })
  );
  boardwalk.position.set(0, 0.09, -71);
  boardwalk.receiveShadow = true;
  group.add(boardwalk);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 26),
    new THREE.MeshStandardMaterial({ color: 0xf6d39c, roughness: 0.95 })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, -86);
  sand.receiveShadow = true;
  group.add(sand);

  const oceanGeo = new THREE.PlaneGeometry(380, 180, 24, 18);
  oceanGeo.rotateX(-Math.PI / 2);
  const ocean = new THREE.Mesh(
    oceanGeo,
    new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0e4f6e,
      emissiveIntensity: 0.5,
      roughness: 0.18,
      metalness: 0.65,
    })
  );
  ocean.position.set(0, -0.25, -182);
  group.add(ocean);

  // Tropical Wooden Pier over the Ocean!
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a6b43, roughness: 0.85 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c3c24, roughness: 0.9 });
  const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.28, 38), woodMat);
  pierDeck.position.set(0, 0.24, -93);
  pierDeck.receiveShadow = true;
  group.add(pierDeck);

  // Pier posts & warm string lanterns
  const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
  for (let pz = -76; pz >= -111; pz -= 7) {
    for (const px of [-4.1, 4.1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.8, 8), darkWoodMat);
      post.position.set(px, 0.8, pz);
      group.add(post);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), lanternMat);
      bulb.position.set(px, 1.82, pz);
      group.add(bulb);
    }
  }

  // Beach umbrellas & loungers on both sides of the pier
  const umbConfigs: [number, number, number, number][] = [
    [-10, -82, 0xff2a9d, 0xfef3c7],
    [-17, -84, 0x00e5ff, 0xfce7f3],
    [10, -82, 0xffb703, 0xe0f7fa],
    [17, -84, 0x34d399, 0xfff1f2],
  ];
  for (const [ux, uz, cA, cB] of umbConfigs) {
    const umb = createBeachUmbrella(cA, cB);
    umb.position.set(ux, 0.02, uz);
    group.add(umb);
  }

  // Giant "OFERTA DEL DÍA" Neon Gantry Arch spanning Ocean Boulevard!
  if (topDealListing) {
    const gantry = new THREE.Group();
    gantry.position.set(0, 0, -61);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x24163d,
      metalness: 0.5,
      roughness: 0.35,
    });
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.75, 9.6, 0.75), pillarMat);
    pillarL.position.set(-7.6, 4.8, 0);
    gantry.add(pillarL);
    const pillarR = pillarL.clone();
    pillarR.position.x = 7.6;
    gantry.add(pillarR);

    const boardTex = createDealBillboardTexture(topDealListing);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(14.8, 4.4),
      new THREE.MeshBasicMaterial({ map: boardTex, side: THREE.DoubleSide })
    );
    board.position.set(0, 7.6, 0.1);
    board.userData = { type: "listing", listing: topDealListing };
    gantry.add(board);
    clickableMeshes.push(board);

    const boardFrame = new THREE.Mesh(
      new THREE.BoxGeometry(15.2, 4.7, 0.25),
      new THREE.MeshStandardMaterial({
        color: 0x160a2c,
        emissive: 0xff2a9d,
        emissiveIntensity: 0.4,
      })
    );
    boardFrame.position.set(0, 7.6, -0.05);
    gantry.add(boardFrame);
    group.add(gantry);
  }

  // 3. Palm Trees & Retro Streetlamps
  const palmPositions: [number, number][] = [
    [-7.1, 44],
    [7.1, 44],
    [-7.1, 22],
    [7.1, 22],
    [-7.1, 2],
    [7.1, 2],
    [-7.1, -18],
    [7.1, -18],
    [-7.1, -38],
    [7.1, -38],
    [-7.1, -58],
    [7.1, -58],
    [-22, -74],
    [-11, -75],
    [11, -75],
    [22, -74],
  ];
  palmPositions.forEach(([px, pz], idx) => {
    const palm = createPalmTree(idx + 1.3);
    palm.position.set(px, 0.16, pz);
    group.add(palm);
    palmTrees.push(palm);
  });

  const poleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.3 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe4b5 });
  for (let lz = 40; lz >= -56; lz -= 24) {
    for (const lx of [-6.7, 6.7]) {
      const lamp = new THREE.Group();
      lamp.position.set(lx, 0.16, lz);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 5.2, 8), poleMat);
      pole.position.y = 2.6;
      lamp.add(pole);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), bulbMat);
      globe.position.y = 5.35;
      lamp.add(globe);
      group.add(lamp);
    }
  }

  // 4. The 10 Art-Deco Category Storefronts
  STORE_THEMES.forEach((theme, idx) => {
    const storeGroup = new THREE.Group();
    storeGroup.position.set(theme.x, 0, theme.z);
    const faceDir = theme.side === "west" ? 1 : -1;

    const buildingW = 10;
    const buildingD = 14.5;
    const buildingH = 8.4 + (idx % 3) * 1.4;

    const facadeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.facadeColor),
      roughness: 0.65,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.trimColor),
      roughness: 0.45,
    });
    const neonMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.neonColor),
      emissive: new THREE.Color(theme.neonColor),
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const secNeonMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.secondaryNeon),
      emissive: new THREE.Color(theme.secondaryNeon),
      emissiveIntensity: 1.3,
      roughness: 0.2,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(buildingW, buildingH, buildingD), facadeMat);
    body.position.y = buildingH / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData = { type: "store", categorySlug: theme.categorySlug };
    storeGroup.add(body);
    clickableMeshes.push(body);

    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(buildingW + 0.4, 0.9, buildingD * 0.62),
      trimMat
    );
    crown.position.y = buildingH + 0.45;
    storeGroup.add(crown);

    const frontX = faceDir * (buildingW / 2 + 0.08);
    const topNeon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, buildingD + 0.2), neonMat);
    topNeon.position.set(frontX, buildingH - 0.35, 0);
    storeGroup.add(topNeon);

    const midNeon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, buildingD + 0.1), secNeonMat);
    midNeon.position.set(frontX, 3.85, 0);
    storeGroup.add(midNeon);

    const awning = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.24, 6.2), trimMat);
    awning.position.set(faceDir * (buildingW / 2 + 0.95), 3.4, 0);
    awning.rotation.z = faceDir * -0.18;
    storeGroup.add(awning);

    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xfff5e4,
      emissive: new THREE.Color(theme.secondaryNeon),
      emissiveIntensity: 0.45,
      roughness: 0.15,
      metalness: 0.5,
    });
    for (const wz of [-4.4, 4.4]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.3, 3.4), windowMat);
      win.position.set(frontX, 1.8, wz);
      win.userData = { type: "store", categorySlug: theme.categorySlug };
      storeGroup.add(win);
      clickableMeshes.push(win);
    }

    const doorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 2.95, 2.4),
      new THREE.MeshStandardMaterial({
        color: 0x0b0818,
        emissive: new THREE.Color(theme.neonColor),
        emissiveIntensity: 0.35,
      })
    );
    doorMesh.position.set(frontX, 1.5, 0);
    doorMesh.userData = { type: "store", categorySlug: theme.categorySlug };
    storeGroup.add(doorMesh);
    clickableMeshes.push(doorMesh);

    const count = listingCountByCategory[theme.categorySlug] ?? 0;
    const signTex = createNeonSignTexture(
      theme.viceName,
      theme.tagline,
      theme.neonColor,
      theme.secondaryNeon,
      count
    );
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(10.6, 3.2),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signMesh.position.set(faceDir * (buildingW / 2 + 0.22), 5.85, 0);
    signMesh.rotation.y = theme.side === "west" ? Math.PI / 2 : -Math.PI / 2;
    signMesh.userData = { type: "store", categorySlug: theme.categorySlug };
    storeGroup.add(signMesh);
    clickableMeshes.push(signMesh);

    group.add(storeGroup);

    colliders.push({
      minX: theme.x - buildingW / 2 - 0.55,
      maxX: theme.x + buildingW / 2 + 0.55,
      minZ: theme.z - buildingD / 2 - 0.45,
      maxZ: theme.z + buildingD / 2 + 0.45,
    });

    const markerColor = new THREE.Color(theme.neonColor);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.11, 10, 28),
      new THREE.MeshBasicMaterial({ color: markerColor })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(theme.doorX, 0.28, theme.doorZ);
    ring.userData = { type: "store", categorySlug: theme.categorySlug };
    group.add(ring);
    clickableMeshes.push(ring);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88, 0.98, 2.4, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: markerColor,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beam.position.set(theme.doorX, 1.4, theme.doorZ);
    group.add(beam);

    doorTriggers.push({ theme, x: theme.doorX, z: theme.doorZ, ring, beam });
  });

  // 5. Distant Vice City Skyline Silhouettes
  const skylineColors = [0x2a1b4e, 0x3b2260, 0x4b2669, 0x261a44];
  for (let i = 0; i < 16; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const h = 18 + ((i * 11) % 28);
    const w = 8 + ((i * 5) % 8);
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 10),
      new THREE.MeshStandardMaterial({
        color: skylineColors[i % skylineColors.length],
        roughness: 0.85,
      })
    );
    tower.position.set(side * (36 + (i % 3) * 9), h / 2, 42 - i * 7.5);
    group.add(tower);
  }

  // 6. Four DRIVABLE 80s Retro Sports Cars!
  const carSpecs: {
    id: string;
    name: string;
    color: number;
    laneX: number;
    startZ: number;
    aiDir: number;
    aiSpeed: number;
  }[] = [
    { id: "infernus", name: "Infernus Rosa 86", color: 0xff2a9d, laneX: 2.9, startZ: 28, aiDir: -1, aiSpeed: 8.5 },
    { id: "cheetah", name: "Cheetah Cian 84", color: 0x00e5ff, laneX: 2.9, startZ: -26, aiDir: -1, aiSpeed: 8.5 },
    { id: "banshee", name: "Banshee Blanco 88", color: 0xf8fafc, laneX: -2.9, startZ: -40, aiDir: 1, aiSpeed: 8.0 },
    { id: "stinger", name: "Stinger Dorado 85", color: 0xfbbf24, laneX: -2.9, startZ: 18, aiDir: 1, aiSpeed: 8.0 },
  ];

  const cars: DrivableCar[] = carSpecs.map((spec) => {
    const built = createRetroCar(spec.id, spec.name, spec.color);
    built.mesh.position.set(spec.laneX, 0.02, spec.startZ);
    const initYaw = spec.aiDir === -1 ? Math.PI : 0;
    built.mesh.rotation.y = initYaw;
    group.add(built.mesh);
    // Make car chassis/cabin clickable to hop in!
    built.bodyGroup.children.forEach((ch) => {
      if (ch.userData?.type === "car") clickableMeshes.push(ch);
    });
    return {
      id: spec.id,
      name: spec.name,
      mesh: built.mesh,
      bodyGroup: built.bodyGroup,
      headlightMat: built.headlightMat,
      laneX: spec.laneX,
      aiDir: spec.aiDir,
      aiSpeed: spec.aiSpeed,
      speed: 0,
      yaw: initYaw,
      hornFlash: 0,
    };
  });

  // 7. 10 Living Vice City Pedestrians strolling along sidewalks & beach boardwalk
  const pedPalette: [number, number, number][] = [
    [0xff5ec4, 0xf8fafc, 0xe8ba95],
    [0x2dd4bf, 0x1e293b, 0xd89f74],
    [0xfbbf24, 0x0ea5e9, 0xf0c7a5],
    [0xa855f7, 0xfef3c7, 0xc88d62],
    [0xfb7185, 0x334155, 0xe5b28b],
  ];
  const pedestrians: PedestrianNPC[] = [];

  for (let i = 0; i < 8; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const [sh, pa, sk] = pedPalette[i % pedPalette.length];
    const rig = createPedestrian(sh, pa, sk);
    const startZ = -48 + i * 13;
    rig.group.position.set(side * (8.5 + (i % 2) * 0.7), 0.16, startZ);
    group.add(rig.group);
    pedestrians.push({
      ...rig,
      axis: "z",
      min: -60,
      max: 44,
      dir: i % 3 === 0 ? -1 : 1,
      speed: 1.7 + (i % 3) * 0.45,
      phase: i * 1.4,
    });
  }
  // 2 beach boardwalk strollers
  for (let b = 0; b < 2; b++) {
    const [sh, pa, sk] = pedPalette[(b + 2) % pedPalette.length];
    const rig = createPedestrian(sh, pa, sk);
    rig.group.position.set(-14 + b * 24, 0.18, -71 + b * 1.4);
    group.add(rig.group);
    pedestrians.push({
      ...rig,
      axis: "x",
      min: -26,
      max: 26,
      dir: b === 0 ? 1 : -1,
      speed: 1.85,
      phase: b * 2.1,
    });
  }

  // Playable bounds (main boulevard + beach walkway)
  const bounds: AABB = {
    minX: -12.4,
    maxX: 12.4,
    minZ: -74,
    maxZ: 49,
  };
  // Walkable wooden pier extending into the ocean
  const pierBounds: AABB = {
    minX: -3.7,
    maxX: 3.7,
    minZ: -110,
    maxZ: -72,
  };

  return {
    group,
    colliders,
    bounds,
    pierBounds,
    doorTriggers,
    cars,
    clickableMeshes,
    update(time: number, dt: number, playerPos: THREE.Vector3, drivenCarId: string | null) {
      // Sway palms
      for (const palm of palmTrees) {
        const crown = palm.userData.crown as THREE.Group | undefined;
        const seed = (palm.userData.seed as number) || 0;
        if (crown) {
          crown.rotation.z = Math.sin(time * 1.4 + seed) * 0.05;
          crown.rotation.x = Math.cos(time * 1.1 + seed) * 0.04;
        }
      }

      // Animate store doorway rings
      for (let i = 0; i < doorTriggers.length; i++) {
        const trg = doorTriggers[i];
        trg.ring.position.y = 0.28 + Math.sin(time * 3.2 + i) * 0.07;
        trg.ring.rotation.z = time * 1.4;
        (trg.beam.material as THREE.MeshBasicMaterial).opacity =
          0.16 + Math.sin(time * 3 + i) * 0.08;
      }

      // Animate AI cars (skip the car currently driven by the player!)
      for (const car of cars) {
        if (car.hornFlash > 0) {
          car.hornFlash = Math.max(0, car.hornFlash - dt);
          car.headlightMat.color.setHex(
            Math.floor(car.hornFlash * 20) % 2 === 0 ? 0x00f0ff : 0xfffbeb
          );
        } else {
          car.headlightMat.color.setHex(0xfffbeb);
        }

        if (car.id === drivenCarId) continue;

        // Only auto-cruise if still roughly aligned with its boulevard lane
        const onLane = Math.abs(car.mesh.position.x - car.laneX) < 1.8;
        if (!onLane) {
          car.speed *= 0.92;
          continue;
        }

        const dx = Math.abs(playerPos.x - car.mesh.position.x);
        const dzAhead = (playerPos.z - car.mesh.position.z) * car.aiDir;
        const blockedByPlayer = dx < 2.6 && dzAhead > 0 && dzAhead < 8.5;

        // Also avoid rear-ending other cars
        let blockedByCar = false;
        for (const other of cars) {
          if (other.id === car.id) continue;
          const odx = Math.abs(other.mesh.position.x - car.mesh.position.x);
          const odz = (other.mesh.position.z - car.mesh.position.z) * car.aiDir;
          if (odx < 2.4 && odz > 0 && odz < 9.5) {
            blockedByCar = true;
            break;
          }
        }

        if (!blockedByPlayer && !blockedByCar) {
          car.mesh.position.z += car.aiDir * car.aiSpeed * dt;
          car.yaw = car.aiDir === -1 ? Math.PI : 0;
          car.mesh.rotation.y = car.yaw;
          if (car.mesh.position.z < -64) car.mesh.position.z = 52;
          if (car.mesh.position.z > 52) car.mesh.position.z = -64;
        }
      }

      // Animate strolling pedestrians
      for (const ped of pedestrians) {
        ped.phase += dt * 7.5;
        const swing = Math.sin(ped.phase) * 0.45;
        ped.leftLeg.rotation.x = swing;
        ped.rightLeg.rotation.x = -swing;
        ped.leftArm.rotation.x = -swing * 0.75;
        ped.rightArm.rotation.x = swing * 0.75;

        if (ped.axis === "z") {
          ped.group.position.z += ped.dir * ped.speed * dt;
          if (ped.group.position.z > ped.max) ped.dir = -1;
          if (ped.group.position.z < ped.min) ped.dir = 1;
          ped.group.rotation.y = ped.dir === 1 ? 0 : Math.PI;
        } else {
          ped.group.position.x += ped.dir * ped.speed * dt;
          if (ped.group.position.x > ped.max) ped.dir = -1;
          if (ped.group.position.x < ped.min) ped.dir = 1;
          ped.group.rotation.y = ped.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
        }
      }

      // Ocean waves
      ocean.position.y = -0.25 + Math.sin(time * 1.6) * 0.08;
    },
  };
}
