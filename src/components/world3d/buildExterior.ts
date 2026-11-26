import * as THREE from "three";
import { STORE_THEMES, type StoreTheme } from "@/components/world3d/vicePalette";
import {
  createBoulevardRoadPBR,
  createDealBillboardTexture,
  createNeonSignTexture,
  createPalmFrondTexture,
  createSidewalkTexture,
  createSoftGlowTexture,
  createStuccoBumpTexture,
} from "@/components/world3d/textures";
import { createRealisticOcean, type OceanShaderHandle } from "@/components/world3d/oceanShader";
import { buildSculptedHuman, type HumanRig } from "@/components/world3d/buildPlayer";
import { TIME_PRESETS, type TimeOfDay } from "@/components/world3d/environment";
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

interface ExhaustPuff {
  mesh: THREE.Mesh;
  life: number;
  vel: THREE.Vector3;
}

export interface DrivableCar {
  id: string;
  name: string;
  mesh: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Object3D[];
  headlightMat: THREE.MeshBasicMaterial;
  brakeLightMat: THREE.MeshBasicMaterial;
  headlightCones: THREE.Mesh[];
  laneX: number;
  aiDir: number;
  aiSpeed: number;
  speed: number;
  braking: boolean;
  yaw: number;
  hornFlash: number;
}

interface PedestrianNPC {
  rig: HumanRig;
  axis: "z" | "x";
  min: number;
  max: number;
  dir: number;
  speed: number;
}

export interface ExteriorWorldHandle {
  group: THREE.Group;
  colliders: AABB[];
  bounds: AABB;
  pierBounds: AABB;
  doorTriggers: ExteriorDoorTrigger[];
  cars: DrivableCar[];
  clickableMeshes: THREE.Object3D[];
  applyTimeOfDay: (mode: TimeOfDay, skyTexture: THREE.Texture) => void;
  update: (
    time: number,
    dt: number,
    playerPos: THREE.Vector3,
    drivenCarId: string | null
  ) => void;
}

function createCurvedPalmFrondGeo(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(1.15, 3.3, 3, 9);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    // y runs from -1.65 (base) to +1.65 (tip); shift so base is 0 and tip is 3.3
    const yOrig = pos.getY(i) + 1.65;
    const t = yOrig / 3.3; // 0 at base, 1 at tip
    const droop = -t * t * 1.15 + Math.sin(t * Math.PI) * 0.35;
    pos.setZ(i, yOrig);
    pos.setY(i, droop);
  }
  geo.computeVertexNormals();
  return geo;
}

function createRealisticPalmTree(
  seed: number,
  frondGeo: THREE.BufferGeometry,
  frondMat: THREE.MeshStandardMaterial
): THREE.Group {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4b38, roughness: 0.92 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x4f3526, roughness: 0.95 });

  const leanX = Math.sin(seed * 3.1) * 0.8;
  const leanZ = Math.cos(seed * 2.3) * 0.6;
  const segments = 7;
  const segH = 1.05;

  let curX = 0;
  let curY = 0;
  let curZ = 0;

  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const radiusTop = 0.25 - t * 0.1;
    const radiusBot = 0.29 - t * 0.1;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBot, segH + 0.06, 9),
      i % 2 === 0 ? trunkMat : ringMat
    );
    const nx = leanX * t * t;
    const nz = leanZ * t * t;
    seg.position.set(nx, curY + segH * 0.5, nz);
    seg.rotation.z = -leanX * t * 0.24;
    seg.rotation.x = leanZ * t * 0.24;
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
    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), cocoMat);
    coco.position.set(Math.cos(a) * 0.2, -0.08, Math.sin(a) * 0.2);
    crown.add(coco);
  }

  // 9 arching feathered tropical palm fronds in 2 tiers
  for (let f = 0; f < 9; f++) {
    const angle = (f / 9) * Math.PI * 2 + seed;
    const pivot = new THREE.Group();
    pivot.rotation.y = angle;
    const blade = new THREE.Mesh(frondGeo, frondMat);
    blade.rotation.x = f % 2 === 0 ? -0.14 : -0.34;
    blade.castShadow = true;
    pivot.add(blade);
    crown.add(pivot);
  }

  tree.add(crown);
  tree.userData.crown = crown;
  tree.userData.seed = seed;
  return tree;
}

function createSculpted80sSupercar(id: string, name: string, bodyColor: number): {
  mesh: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Object3D[];
  headlightMat: THREE.MeshBasicMaterial;
  brakeLightMat: THREE.MeshBasicMaterial;
  headlightCones: THREE.Mesh[];
} {
  const car = new THREE.Group();
  const bodyGroup = new THREE.Group();
  car.add(bodyGroup);

  // Glossy PBR clearcoat car paint reflecting sunset/neon PMREM environment!
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: bodyColor,
    roughness: 0.16,
    metalness: 0.55,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1324,
    roughness: 0.05,
    metalness: 0.2,
    clearcoat: 1.0,
    reflectivity: 1.0,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.95,
    roughness: 0.12,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.88 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
  const brakeLightMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });

  // Sculpted 80s Countach / Testarossa wedge profile via ExtrudeGeometry!
  const profile = new THREE.Shape();
  profile.moveTo(-2.3, 0.34); // rear bumper bottom
  profile.lineTo(2.32, 0.32); // front splitter
  profile.lineTo(2.36, 0.54); // front nose
  profile.lineTo(1.25, 0.78); // sloped wedge hood
  profile.lineTo(0.45, 1.24); // raked panoramic windshield
  profile.lineTo(-0.92, 1.24); // roof
  profile.lineTo(-1.85, 0.94); // fastback rear louver deck
  profile.lineTo(-2.34, 0.86); // rear deck tail
  profile.closePath();

  const bodyGeo = new THREE.ExtrudeGeometry(profile, {
    depth: 1.98,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.07,
    bevelSegments: 3,
  });
  bodyGeo.translate(0, 0, -0.99);
  bodyGeo.rotateY(-Math.PI / 2); // Align nose along +Z

  const mainBody = new THREE.Mesh(bodyGeo, paintMat);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  mainBody.userData = { type: "car", carId: id, carName: name };
  bodyGroup.add(mainBody);

  // Tinted windshield + side glass + rear engine louvers
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.44, 0.98), glassMat);
  windshield.position.set(0, 1.03, 0.76);
  windshield.rotation.x = 0.54;
  windshield.userData = { type: "car", carId: id, carName: name };
  bodyGroup.add(windshield);

  const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.36, 1.38), glassMat);
  sideGlass.position.set(0, 1.02, -0.18);
  sideGlass.userData = { type: "car", carId: id, carName: name };
  bodyGroup.add(sideGlass);

  // Side intake strakes (classic Testarossa/Cheetah fins!)
  for (const sx of [-1.09, 1.09]) {
    for (let k = 0; k < 3; k++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 1.15), trimMat);
      fin.position.set(sx, 0.56 + k * 0.08, -0.35);
      bodyGroup.add(fin);
    }
    // Side mirrors
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.14), paintMat);
    mirror.position.set(sx * 1.08, 0.96, 0.65);
    bodyGroup.add(mirror);
  }

  // Iconic rear Countach spoiler wing
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.07, 0.38), paintMat);
  wing.position.set(0, 1.24, -2.06);
  wing.castShadow = true;
  bodyGroup.add(wing);
  for (const px of [-0.72, 0.72]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.24), paintMat);
    strut.position.set(px, 1.04, -2.04);
    bodyGroup.add(strut);
  }

  // Dual chrome exhaust tips
  const exhaustGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.22, 10);
  exhaustGeo.rotateX(Math.PI / 2);
  for (const ex of [-0.48, -0.32, 0.32, 0.48]) {
    const pipe = new THREE.Mesh(exhaustGeo, chromeMat);
    pipe.position.set(ex, 0.36, -2.4);
    bodyGroup.add(pipe);
  }

  // Front headlights + soft additive volumetric beams (visible at night)
  const headlightCones: THREE.Mesh[] = [];
  const coneGeo = new THREE.ConeGeometry(0.85, 3.6, 12, 1, true);
  coneGeo.rotateX(-Math.PI / 2);
  coneGeo.translate(0, 0, 1.8);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xffe4a0,
    transparent: true,
    opacity: 0.075,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });

  for (const hx of [-0.66, 0.66]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), headlightMat);
    hl.position.set(hx, 0.56, 2.41);
    bodyGroup.add(hl);

    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(hx, 0.52, 2.42);
    cone.rotation.x = 0.09;
    cone.visible = false;
    bodyGroup.add(cone);
    headlightCones.push(cone);
  }

  // Full-width 80s rear brake light bar
  const brakeBar = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.17, 0.08), brakeLightMat);
  brakeBar.position.set(0, 0.72, -2.41);
  bodyGroup.add(brakeBar);

  // Subtle neon underglow
  const underglow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 4.1),
    new THREE.MeshBasicMaterial({
      color: bodyColor,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  underglow.rotation.x = -Math.PI / 2;
  underglow.position.y = 0.05;
  car.add(underglow);

  // Detailed spinning alloy spoked wheels!
  const wheels: THREE.Object3D[] = [];
  const tireGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.3, 18);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.32, 12);
  rimGeo.rotateZ(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.33, 0.42, 0.05);

  for (const [wx, wy, wz] of [
    [-1.02, 0.37, 1.42],
    [1.02, 0.37, 1.42],
    [-1.02, 0.37, -1.42],
    [1.02, 0.37, -1.42],
  ]) {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wx, wy, wz);
    wheelGroup.add(new THREE.Mesh(tireGeo, tireMat));
    wheelGroup.add(new THREE.Mesh(rimGeo, chromeMat));
    const sp1 = new THREE.Mesh(spokeGeo, trimMat);
    const sp2 = sp1.clone();
    sp2.rotation.x = Math.PI / 2;
    wheelGroup.add(sp1, sp2);
    car.add(wheelGroup);
    wheels.push(wheelGroup);
  }

  return { mesh: car, bodyGroup, wheels, headlightMat, brakeLightMat, headlightCones };
}

function createSidewalkCafeSet(accentHex: number): THREE.Group {
  const cafe = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.6, roughness: 0.3 });
  const topMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.4 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.7 });

  const tablePole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.78, 8), metalMat);
  tablePole.position.y = 0.39;
  cafe.add(tablePole);

  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 14), topMat);
  tableTop.position.y = 0.78;
  cafe.add(tableTop);

  const umbPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.85, 8), metalMat);
  umbPole.position.y = 1.65;
  cafe.add(umbPole);

  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.45, 8), canopyMat);
  canopy.position.y = 2.55;
  canopy.castShadow = true;
  cafe.add(canopy);

  // Two cute sidewalk chairs
  for (const cx of [-0.72, 0.72]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.4), metalMat);
    seat.position.set(cx, 0.46, 0);
    cafe.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.4), canopyMat);
    back.position.set(cx + (cx < 0 ? -0.18 : 0.18), 0.7, 0);
    cafe.add(back);
  }

  return cafe;
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
  topDealListing?: ListingDTO | null,
  initialSkyTexture?: THREE.Texture
): ExteriorWorldHandle {
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const doorTriggers: ExteriorDoorTrigger[] = [];
  const clickableMeshes: THREE.Object3D[] = [];
  const palmTrees: THREE.Group[] = [];
  const lampGlowPools: THREE.Mesh[] = [];
  const exhaustPuffs: ExhaustPuff[] = [];

  // 1. Sky Dome + Sunset Sun/Moon Disc
  const skyMat = new THREE.MeshBasicMaterial({
    map: initialSkyTexture || null,
    color: 0xffffff,
    side: THREE.BackSide,
    fog: false,
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(285, 28, 18), skyMat);
  group.add(skyDome);

  const sunGroup = new THREE.Group();
  sunGroup.position.set(0, 34, -198);
  const sunDiscMat = new THREE.MeshBasicMaterial({ color: 0xffa94d, fog: false });
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(28, 36), sunDiscMat);
  sunGroup.add(sunDisc);
  const sunHaloMat = new THREE.MeshBasicMaterial({
    color: 0xff3b9a,
    transparent: true,
    opacity: 0.34,
    fog: false,
    blending: THREE.AdditiveBlending,
  });
  const sunHalo = new THREE.Mesh(new THREE.CircleGeometry(42, 36), sunHaloMat);
  sunHalo.position.z = -1;
  sunGroup.add(sunHalo);
  group.add(sunGroup);

  // 2. Ground, PBR Semi-Wet Boulevard Asphalt, Crosswalks, Sidewalks, Sand & GLSL Ocean
  const baseGround = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 220),
    new THREE.MeshStandardMaterial({ color: 0x312340, roughness: 0.92 })
  );
  baseGround.rotation.x = -Math.PI / 2;
  baseGround.position.set(0, -0.05, 10);
  baseGround.receiveShadow = true;
  group.add(baseGround);

  const roadPBR = createBoulevardRoadPBR();
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadPBR.map,
    bumpMap: roadPBR.bumpMap,
    bumpScale: 0.04,
    roughnessMap: roadPBR.roughnessMap,
    roughness: 0.42,
    metalness: 0.28,
  });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(12.4, 128), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, -6);
  road.receiveShadow = true;
  group.add(road);

  // Zebra Pedestrian Crosswalks along Ocean Boulevard!
  const zebraMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 });
  for (const cz of [41, 22, 2, -18, -38, -57]) {
    for (let sx = -4.8; sx <= 4.8; sx += 1.6) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 2.6), zebraMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(sx, 0.025, cz);
      group.add(stripe);
    }
  }

  const sidewalkTex = createSidewalkTexture();
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: sidewalkTex,
    roughness: 0.65,
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
    emissiveIntensity: 0.55,
    roughness: 0.3,
  });
  const westCurb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 128), curbMat);
  westCurb.position.set(-6.2, 0.09, -6);
  group.add(westCurb);
  const eastCurb = westCurb.clone();
  eastCurb.position.x = 6.2;
  group.add(eastCurb);

  // Beach Promenade, Golden Sand & Custom GLSL Ocean Wave Shader!
  const boardwalk = new THREE.Mesh(
    new THREE.BoxGeometry(92, 0.18, 6.5),
    new THREE.MeshStandardMaterial({ color: 0xf4dce8, roughness: 0.72 })
  );
  boardwalk.position.set(0, 0.09, -71);
  boardwalk.receiveShadow = true;
  group.add(boardwalk);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(340, 26),
    new THREE.MeshStandardMaterial({ color: 0xf4cf94, roughness: 0.94 })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, -86);
  sand.receiveShadow = true;
  group.add(sand);

  const oceanHandle: OceanShaderHandle = createRealisticOcean();
  group.add(oceanHandle.mesh);

  // Tropical Wooden Pier over the Ocean
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a6b43, roughness: 0.82 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c3c24, roughness: 0.88 });
  const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.28, 38), woodMat);
  pierDeck.position.set(0, 0.24, -93);
  pierDeck.receiveShadow = true;
  group.add(pierDeck);

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

  for (const [ux, uz, cA, cB] of [
    [-10, -82, 0xff2a9d, 0xfef3c7],
    [-17, -84, 0x00e5ff, 0xfce7f3],
    [10, -82, 0xffb703, 0xe0f7fa],
    [17, -84, 0x34d399, 0xfff1f2],
  ] as [number, number, number, number][]) {
    const umb = createBeachUmbrella(cA, cB);
    umb.position.set(ux, 0.02, uz);
    group.add(umb);
  }

  // Giant "OFERTA DEL DÍA" Neon Arch Gantry
  if (topDealListing) {
    const gantry = new THREE.Group();
    gantry.position.set(0, 0, -61);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x24163d,
      metalness: 0.6,
      roughness: 0.3,
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
        emissiveIntensity: 0.45,
      })
    );
    boardFrame.position.set(0, 7.6, -0.05);
    gantry.add(boardFrame);
    group.add(gantry);
  }

  // 3. Curved Feathered Palm Trees + Streetlamps with Warm Light Pools + Urban Furniture!
  const palmFrondGeo = createCurvedPalmFrondGeo();
  const palmFrondMat = new THREE.MeshStandardMaterial({
    map: createPalmFrondTexture(),
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.65,
  });

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
    const palm = createRealisticPalmTree(idx + 1.3, palmFrondGeo, palmFrondMat);
    palm.position.set(px, 0.16, pz);
    group.add(palm);
    palmTrees.push(palm);
  });

  // Art-Deco Streetlamps with soft radial glowing pools on the sidewalk
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.25 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe4b5 });
  const glowPoolMat = new THREE.MeshBasicMaterial({
    map: createSoftGlowTexture(),
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (let lz = 40; lz >= -56; lz -= 20) {
    for (const lx of [-6.7, 6.7]) {
      const lamp = new THREE.Group();
      lamp.position.set(lx, 0.16, lz);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5.4, 10), poleMat);
      pole.position.y = 2.7;
      lamp.add(pole);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), bulbMat);
      globe.position.y = 5.5;
      lamp.add(globe);
      group.add(lamp);

      const pool = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), glowPoolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(lx, 0.19, lz);
      group.add(pool);
      lampGlowPools.push(pool);
    }
  }

  // Fill courtyard gaps between storefronts: hedges, pastel arches, café tables, benches & fire hydrants!
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
  const planterMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 });
  const hydrantMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.3 });
  const alleyWallMat = new THREE.MeshStandardMaterial({ color: 0x3b2358, roughness: 0.8 });

  const gapZs = [22, 2, -18, -38];
  const cafeColors = [0xff2a9d, 0x00e5ff, 0xffb703, 0x34d399];
  gapZs.forEach((gz, gi) => {
    for (const side of [-1, 1]) {
      // Back garden wall eliminating dark void between shops
      const backAlley = new THREE.Mesh(new THREE.BoxGeometry(10, 4.5, 5.6), alleyWallMat);
      backAlley.position.set(side * 19.5, 2.25, gz);
      group.add(backAlley);

      // Planter + lush tropical hedge
      const planter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 4.8), planterMat);
      planter.position.set(side * 13.6, 0.4, gz);
      group.add(planter);
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.95, 4.4), hedgeMat);
      hedge.position.set(side * 13.6, 1.05, gz);
      group.add(hedge);

      // Sidewalk Café Umbrella Table
      const cafe = createSidewalkCafeSet(cafeColors[(gi + (side === 1 ? 1 : 0)) % cafeColors.length]);
      cafe.position.set(side * 10.6, 0.16, gz);
      group.add(cafe);

      // Red fire hydrant near curb every other block
      if (gi % 2 === 0) {
        const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.62, 8), hydrantMat);
        hyd.position.set(side * 6.8, 0.45, gz + 3.2);
        group.add(hyd);
      }
    }
  });

  // 4. The 10 Detailed Art-Deco Storefronts with Stucco Bump + Translucent Glass Windows!
  const stuccoBump = createStuccoBumpTexture();
  const realGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbeafe,
    roughness: 0.08,
    metalness: 0.1,
    transmission: 0.55,
    transparent: true,
    opacity: 0.62,
    clearcoat: 1.0,
  });

  STORE_THEMES.forEach((theme, idx) => {
    const storeGroup = new THREE.Group();
    storeGroup.position.set(theme.x, 0, theme.z);
    const faceDir = theme.side === "west" ? 1 : -1;

    const buildingW = 10;
    const buildingD = 14.5;
    const buildingH = 8.6 + (idx % 3) * 1.4;

    const facadeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.facadeColor),
      bumpMap: stuccoBump,
      bumpScale: 0.03,
      roughness: 0.68,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.trimColor),
      roughness: 0.4,
      metalness: 0.15,
    });
    const neonMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.neonColor),
      emissive: new THREE.Color(theme.neonColor),
      emissiveIntensity: 1.9,
      roughness: 0.15,
    });
    const secNeonMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.secondaryNeon),
      emissive: new THREE.Color(theme.secondaryNeon),
      emissiveIntensity: 1.6,
      roughness: 0.15,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(buildingW, buildingH, buildingD), facadeMat);
    body.position.y = buildingH / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData = { type: "store", categorySlug: theme.categorySlug };
    storeGroup.add(body);
    clickableMeshes.push(body);

    // Art-Deco vertical fluted pilasters & stepped crown
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(buildingW + 0.4, 0.95, buildingD * 0.62),
      trimMat
    );
    crown.position.y = buildingH + 0.48;
    storeGroup.add(crown);

    const frontX = faceDir * (buildingW / 2 + 0.08);
    for (const pz of [-6.8, -2.0, 2.0, 6.8]) {
      const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.28, buildingH, 0.42), trimMat);
      pilaster.position.set(frontX, buildingH / 2, pz);
      storeGroup.add(pilaster);
    }

    const topNeon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, buildingD + 0.2), neonMat);
    topNeon.position.set(frontX, buildingH - 0.35, 0);
    storeGroup.add(topNeon);

    const midNeon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, buildingD + 0.1), secNeonMat);
    midNeon.position.set(frontX, 3.88, 0);
    storeGroup.add(midNeon);

    const awning = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.24, 6.2), trimMat);
    awning.position.set(faceDir * (buildingW / 2 + 0.95), 3.45, 0);
    awning.rotation.z = faceDir * -0.18;
    storeGroup.add(awning);

    // Translucent glass display windows with warm lit backing shelves visible inside!
    const innerRoomMat = new THREE.MeshStandardMaterial({
      color: 0x2a1b3d,
      emissive: new THREE.Color(theme.secondaryNeon),
      emissiveIntensity: 0.42,
    });
    for (const wz of [-4.4, 4.4]) {
      const innerBack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.25, 3.3), innerRoomMat);
      innerBack.position.set(frontX - faceDir * 0.18, 1.85, wz);
      storeGroup.add(innerBack);

      const glassPane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.35, 3.45), realGlassMat);
      glassPane.position.set(frontX + faceDir * 0.04, 1.85, wz);
      glassPane.userData = { type: "store", categorySlug: theme.categorySlug };
      storeGroup.add(glassPane);
      clickableMeshes.push(glassPane);
    }

    const doorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 2.95, 2.4),
      new THREE.MeshStandardMaterial({
        color: 0x0b0818,
        emissive: new THREE.Color(theme.neonColor),
        emissiveIntensity: 0.45,
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
    signMesh.position.set(faceDir * (buildingW / 2 + 0.24), 5.88, 0);
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

  // 6. Four Sculpted DRIVABLE 80s Supercars with Clearcoat Paint, Brake Lights & Exhaust Smoke!
  const carSpecs = [
    { id: "infernus", name: "Infernus Rosa 86", color: 0xff2a9d, laneX: 2.9, startZ: 28, aiDir: -1, aiSpeed: 8.5 },
    { id: "cheetah", name: "Cheetah Cian 84", color: 0x00e5ff, laneX: 2.9, startZ: -26, aiDir: -1, aiSpeed: 8.5 },
    { id: "banshee", name: "Banshee Blanco 88", color: 0xf8fafc, laneX: -2.9, startZ: -40, aiDir: 1, aiSpeed: 8.0 },
    { id: "stinger", name: "Stinger Dorado 85", color: 0xfbbf24, laneX: -2.9, startZ: 18, aiDir: 1, aiSpeed: 8.0 },
  ];

  const cars: DrivableCar[] = carSpecs.map((spec) => {
    const built = createSculpted80sSupercar(spec.id, spec.name, spec.color);
    built.mesh.position.set(spec.laneX, 0.02, spec.startZ);
    const initYaw = spec.aiDir === -1 ? Math.PI : 0;
    built.mesh.rotation.y = initYaw;
    group.add(built.mesh);
    built.bodyGroup.children.forEach((ch) => {
      if (ch.userData?.type === "car") clickableMeshes.push(ch);
    });
    return {
      id: spec.id,
      name: spec.name,
      mesh: built.mesh,
      bodyGroup: built.bodyGroup,
      wheels: built.wheels,
      headlightMat: built.headlightMat,
      brakeLightMat: built.brakeLightMat,
      headlightCones: built.headlightCones,
      laneX: spec.laneX,
      aiDir: spec.aiDir,
      aiSpeed: spec.aiSpeed,
      speed: 0,
      braking: false,
      yaw: initYaw,
      hornFlash: 0,
    };
  });

  // Exhaust smoke puff pool
  const puffGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const puffMatBase = new THREE.MeshBasicMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  let lastPuffTime = 0;

  // 7. 10 Sculpted Pedestrians strolling sidewalks & boardwalk
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
    const rig = buildSculptedHuman({
      shirtColor: sh,
      pantsColor: pa,
      skinColor: sk,
      withShades: i % 2 === 0,
    });
    rig.group.position.set(side * (8.2 + (i % 2) * 0.6), 0.16, -48 + i * 13);
    group.add(rig.group);
    pedestrians.push({
      rig,
      axis: "z",
      min: -60,
      max: 44,
      dir: i % 3 === 0 ? -1 : 1,
      speed: 1.8 + (i % 3) * 0.45,
    });
  }
  for (let b = 0; b < 2; b++) {
    const [sh, pa, sk] = pedPalette[(b + 2) % pedPalette.length];
    const rig = buildSculptedHuman({
      shirtColor: sh,
      pantsColor: pa,
      skinColor: sk,
      withShades: true,
    });
    rig.group.position.set(-14 + b * 24, 0.18, -71 + b * 1.4);
    group.add(rig.group);
    pedestrians.push({
      rig,
      axis: "x",
      min: -26,
      max: 26,
      dir: b === 0 ? 1 : -1,
      speed: 1.9,
    });
  }

  const bounds: AABB = { minX: -12.4, maxX: 12.4, minZ: -74, maxZ: 49 };
  const pierBounds: AABB = { minX: -3.7, maxX: 3.7, minZ: -110, maxZ: -72 };

  return {
    group,
    colliders,
    bounds,
    pierBounds,
    doorTriggers,
    cars,
    clickableMeshes,
    applyTimeOfDay(mode: TimeOfDay, skyTexture: THREE.Texture) {
      const cfg = TIME_PRESETS[mode];
      skyMat.map = skyTexture;
      skyMat.needsUpdate = true;

      sunDiscMat.color.setHex(cfg.sunDiscColor);
      sunHaloMat.color.setHex(cfg.sunHaloColor);
      sunHaloMat.opacity = cfg.sunHaloOpacity;
      sunGroup.position.set(
        mode === "day" ? 36 : mode === "night" ? -28 : 0,
        mode === "day" ? 66 : mode === "night" ? 56 : 34,
        -198
      );

      roadMat.roughness = cfg.asphaltRoughness;
      roadMat.metalness = cfg.asphaltMetalness;

      oceanHandle.setColors(cfg.oceanShallow, cfg.oceanDeep, cfg.oceanSpecColor, cfg.sunPos);

      const lampVisible = mode !== "day";
      glowPoolMat.opacity = mode === "night" ? 0.78 : 0.36;
      for (const pool of lampGlowPools) pool.visible = lampVisible;
      for (const car of cars) {
        car.headlightCones.forEach((c) => {
          c.visible = mode === "night";
        });
      }
    },
    update(time: number, dt: number, playerPos: THREE.Vector3, drivenCarId: string | null) {
      oceanHandle.update(time);

      for (const palm of palmTrees) {
        const crown = palm.userData.crown as THREE.Group | undefined;
        const seed = (palm.userData.seed as number) || 0;
        if (crown) {
          crown.rotation.z = Math.sin(time * 1.4 + seed) * 0.055;
          crown.rotation.x = Math.cos(time * 1.1 + seed) * 0.04;
        }
      }

      for (let i = 0; i < doorTriggers.length; i++) {
        const trg = doorTriggers[i];
        trg.ring.position.y = 0.28 + Math.sin(time * 3.2 + i) * 0.07;
        trg.ring.rotation.z = time * 1.4;
        (trg.beam.material as THREE.MeshBasicMaterial).opacity =
          0.16 + Math.sin(time * 3 + i) * 0.08;
      }

      // Cars AI, wheel rotation, dynamic brake lights & exhaust smoke!
      for (const car of cars) {
        if (car.hornFlash > 0) {
          car.hornFlash = Math.max(0, car.hornFlash - dt);
          car.headlightMat.color.setHex(
            Math.floor(car.hornFlash * 20) % 2 === 0 ? 0x00f0ff : 0xfffbeb
          );
        } else {
          car.headlightMat.color.setHex(0xfffbeb);
        }

        // Dynamic brake lights flare bright neon red when braking or reversing!
        car.brakeLightMat.color.setHex(car.braking ? 0xff1e56 : 0x991b1b);

        if (car.id === drivenCarId) {
          // Spin wheels smoothly by driven speed
          const wheelSpin = car.speed * dt * 2.5;
          for (const w of car.wheels) w.rotation.x += wheelSpin;

          // Spawn subtle exhaust smoke puffs when accelerating hard!
          if (car.speed > 5 && time - lastPuffTime > 0.09) {
            lastPuffTime = time;
            const puff = new THREE.Mesh(puffGeo, puffMatBase.clone());
            const rearX = car.mesh.position.x - Math.sin(car.yaw) * 2.45;
            const rearZ = car.mesh.position.z - Math.cos(car.yaw) * 2.45;
            puff.position.set(rearX + (Math.random() - 0.5) * 0.5, 0.34, rearZ);
            group.add(puff);
            exhaustPuffs.push({
              mesh: puff,
              life: 0.65,
              vel: new THREE.Vector3(
                (Math.random() - 0.5) * 0.6,
                0.75 + Math.random() * 0.4,
                (Math.random() - 0.5) * 0.6
              ),
            });
          }
          continue;
        }

        const onLane = Math.abs(car.mesh.position.x - car.laneX) < 1.8;
        if (!onLane) {
          car.speed *= 0.92;
          car.braking = false;
          continue;
        }

        const dx = Math.abs(playerPos.x - car.mesh.position.x);
        const dzAhead = (playerPos.z - car.mesh.position.z) * car.aiDir;
        const blockedByPlayer = dx < 2.6 && dzAhead > 0 && dzAhead < 8.5;

        let blockedByCar = false;
        for (const other of cars) {
          if (other.id === car.id) continue;
          const odx = Math.abs(other.mesh.position.x - car.mesh.position.x);
          const odz = (other.mesh.position.z - car.mesh.position.z) * car.aiDir;
          if (odx < 2.4 && odz > 0 && odz < 9.8) {
            blockedByCar = true;
            break;
          }
        }

        car.braking = blockedByPlayer || blockedByCar;
        if (!car.braking) {
          car.mesh.position.z += car.aiDir * car.aiSpeed * dt;
          car.yaw = car.aiDir === -1 ? Math.PI : 0;
          car.mesh.rotation.y = car.yaw;
          for (const w of car.wheels) w.rotation.x += car.aiSpeed * dt * 2.4;
          if (car.mesh.position.z < -64) car.mesh.position.z = 52;
          if (car.mesh.position.z > 52) car.mesh.position.z = -64;
        }
      }

      // Update exhaust smoke particles
      for (let i = exhaustPuffs.length - 1; i >= 0; i--) {
        const p = exhaustPuffs[i];
        p.life -= dt;
        if (p.life <= 0) {
          group.remove(p.mesh);
          (p.mesh.material as THREE.Material).dispose();
          exhaustPuffs.splice(i, 1);
          continue;
        }
        p.mesh.position.addScaledVector(p.vel, dt);
        const s = 1 + (0.65 - p.life) * 2.4;
        p.mesh.scale.setScalar(s);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life * 0.45;
      }

      // Sculpted pedestrians strolling smoothly
      for (const ped of pedestrians) {
        ped.rig.animate(dt, ped.speed * 2.2, false);
        if (ped.axis === "z") {
          ped.rig.group.position.z += ped.dir * ped.speed * dt;
          if (ped.rig.group.position.z > ped.max) ped.dir = -1;
          if (ped.rig.group.position.z < ped.min) ped.dir = 1;
          ped.rig.group.rotation.y = ped.dir === 1 ? 0 : Math.PI;
        } else {
          ped.rig.group.position.x += ped.dir * ped.speed * dt;
          if (ped.rig.group.position.x > ped.max) ped.dir = -1;
          if (ped.rig.group.position.x < ped.min) ped.dir = 1;
          ped.rig.group.rotation.y = ped.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
        }
      }
    },
  };
}
