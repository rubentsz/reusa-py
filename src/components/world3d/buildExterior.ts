import * as THREE from "three";
import { STORE_THEMES, type StoreTheme } from "@/components/world3d/vicePalette";
import {
  createBoulevardRoadTexture,
  createNeonSignTexture,
  createSidewalkTexture,
  createSunsetSkyTexture,
} from "@/components/world3d/textures";

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

export interface ExteriorWorldHandle {
  group: THREE.Group;
  colliders: AABB[];
  bounds: AABB;
  doorTriggers: ExteriorDoorTrigger[];
  clickableMeshes: THREE.Object3D[];
  update: (time: number, dt: number, playerPos: THREE.Vector3) => void;
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

  // Coconuts
  const cocoMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
  for (let c = 0; c < 3; c++) {
    const a = (c / 3) * Math.PI * 2;
    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), cocoMat);
    coco.position.set(Math.cos(a) * 0.2, -0.1, Math.sin(a) * 0.2);
    crown.add(coco);
  }

  // 7 arching palm fronds
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

function createRetroCar(bodyColor: number): THREE.Group {
  const car = new THREE.Group();
  const paintMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.25,
    metalness: 0.55,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.9,
  });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
  const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1e56 });

  // Wedge 80s supercar body
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.65, 4.5), paintMat);
  chassis.position.y = 0.58;
  chassis.castShadow = true;
  car.add(chassis);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.52, 2.0), glassMat);
  cabin.position.set(0, 1.12, -0.15);
  car.add(cabin);

  // Rear 80s spoiler
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.08, 0.38), paintMat);
  spoiler.position.set(0, 1.12, -1.95);
  car.add(spoiler);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelPositions = [
    [-1.02, 0.36, 1.35],
    [1.02, 0.36, 1.35],
    [-1.02, 0.36, -1.35],
    [1.02, 0.36, -1.35],
  ];
  for (const [wx, wy, wz] of wheelPositions) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(wx, wy, wz);
    car.add(w);
  }

  // Headlights & Taillights
  const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), headlightMat);
  hlL.position.set(-0.65, 0.62, 2.26);
  car.add(hlL);
  const hlR = hlL.clone();
  hlR.position.x = 0.65;
  car.add(hlR);

  const tl = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.16, 0.08), taillightMat);
  tl.position.set(0, 0.68, -2.26);
  car.add(tl);

  return car;
}

export function buildViceExterior(
  listingCountByCategory: Record<string, number>
): ExteriorWorldHandle {
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const doorTriggers: ExteriorDoorTrigger[] = [];
  const clickableMeshes: THREE.Object3D[] = [];
  const palmTrees: THREE.Group[] = [];

  // 1. Sunset Sky Dome
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(260, 24, 16),
    new THREE.MeshBasicMaterial({
      map: createSunsetSkyTexture(),
      side: THREE.BackSide,
      fog: false,
    })
  );
  group.add(skyDome);

  // Giant glowing 80s Sunset Sun over the North Ocean
  const sunGroup = new THREE.Group();
  sunGroup.position.set(0, 34, -185);
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(28, 36),
    new THREE.MeshBasicMaterial({ color: 0xff9f43, fog: false })
  );
  sunGroup.add(sunDisc);
  const sunHalo = new THREE.Mesh(
    new THREE.CircleGeometry(38, 36),
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

  // 2. Ground, Boulevard, Sidewalks, Beach & Ocean
  const baseGround = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 220),
    new THREE.MeshStandardMaterial({ color: 0x382849, roughness: 0.95 })
  );
  baseGround.rotation.x = -Math.PI / 2;
  baseGround.position.set(0, -0.05, 10);
  baseGround.receiveShadow = true;
  group.add(baseGround);

  // Asphalt Boulevard
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

  // Pastel Art-Deco Sidewalks
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

  // Neon curb strips
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
    new THREE.BoxGeometry(88, 0.18, 6),
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
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0e4f6e,
    emissiveIntensity: 0.5,
    roughness: 0.18,
    metalness: 0.65,
  });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.position.set(0, -0.25, -182);
  group.add(ocean);

  // 3. Palm Trees & Retro Streetlamps along both sidewalks + beach
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
    [-10, -75],
    [10, -75],
    [22, -74],
  ];

  palmPositions.forEach(([px, pz], idx) => {
    const palm = createPalmTree(idx + 1.3);
    palm.position.set(px, 0.16, pz);
    group.add(palm);
    palmTrees.push(palm);
  });

  // Art-Deco Streetlamps
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
    const faceDir = theme.side === "west" ? 1 : -1; // faces towards boulevard x=0

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

    // Main Art-Deco building volume
    const body = new THREE.Mesh(new THREE.BoxGeometry(buildingW, buildingH, buildingD), facadeMat);
    body.position.y = buildingH / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData = { type: "store", categorySlug: theme.categorySlug };
    storeGroup.add(body);
    clickableMeshes.push(body);

    // Art-Deco stepped crown parapet
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(buildingW + 0.4, 0.9, buildingD * 0.62),
      trimMat
    );
    crown.position.y = buildingH + 0.45;
    storeGroup.add(crown);

    // Horizontal neon roof strips
    const frontX = faceDir * (buildingW / 2 + 0.08);
    const topNeon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, buildingD + 0.2), neonMat);
    topNeon.position.set(frontX, buildingH - 0.35, 0);
    storeGroup.add(topNeon);

    const midNeon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, buildingD + 0.1), secNeonMat);
    midNeon.position.set(frontX, 3.85, 0);
    storeGroup.add(midNeon);

    // Striped pastel awning over entrance
    const awning = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.24, 6.2), trimMat);
    awning.position.set(faceDir * (buildingW / 2 + 0.95), 3.4, 0);
    awning.rotation.z = faceDir * -0.18;
    storeGroup.add(awning);

    // Lit display windows flanking the doorway
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

    // Dark recessed entrance doorway
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

    // Glowing Vice City Neon Signboard facing the Boulevard
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

    // Building AABB Collider
    colliders.push({
      minX: theme.x - buildingW / 2 - 0.55,
      maxX: theme.x + buildingW / 2 + 0.55,
      minZ: theme.z - buildingD / 2 - 0.45,
      maxZ: theme.z + buildingD / 2 + 0.45,
    });

    // Classic GTA Spinning Pink/Cyan Door Entry Marker on sidewalk
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

    doorTriggers.push({
      theme,
      x: theme.doorX,
      z: theme.doorZ,
      ring,
      beam,
    });
  });

  // 5. Distant Vice City Skyline Silhouettes behind both sides
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

  // 6. Four Cruising 80s Retro Sports Cars along the Boulevard
  const cars: { mesh: THREE.Group; laneX: number; dir: number; speed: number }[] = [
    { mesh: createRetroCar(0xff2a9d), laneX: 2.9, dir: -1, speed: 9.5 },
    { mesh: createRetroCar(0x00e5ff), laneX: 2.9, dir: -1, speed: 9.5 },
    { mesh: createRetroCar(0xf8fafc), laneX: -2.9, dir: 1, speed: 8.8 },
    { mesh: createRetroCar(0xfbbf24), laneX: -2.9, dir: 1, speed: 8.8 },
  ];

  cars[0].mesh.position.set(2.9, 0.02, 30);
  cars[0].mesh.rotation.y = Math.PI;
  cars[1].mesh.position.set(2.9, 0.02, -32);
  cars[1].mesh.rotation.y = Math.PI;
  cars[2].mesh.position.set(-2.9, 0.02, -45);
  cars[3].mesh.position.set(-2.9, 0.02, 18);

  cars.forEach((c) => group.add(c.mesh));

  // World playable bounds
  const bounds: AABB = {
    minX: -12.4,
    maxX: 12.4,
    minZ: -68,
    maxZ: 49,
  };

  return {
    group,
    colliders,
    bounds,
    doorTriggers,
    clickableMeshes,
    update(time: number, dt: number, playerPos: THREE.Vector3) {
      // Sway palm fronds in ocean breeze
      for (const palm of palmTrees) {
        const crown = palm.userData.crown as THREE.Group | undefined;
        const seed = (palm.userData.seed as number) || 0;
        if (crown) {
          crown.rotation.z = Math.sin(time * 1.4 + seed) * 0.05;
          crown.rotation.x = Math.cos(time * 1.1 + seed) * 0.04;
        }
      }

      // Pulse & bob GTA store door rings
      for (let i = 0; i < doorTriggers.length; i++) {
        const trg = doorTriggers[i];
        trg.ring.position.y = 0.28 + Math.sin(time * 3.2 + i) * 0.07;
        trg.ring.rotation.z = time * 1.4;
        (trg.beam.material as THREE.MeshBasicMaterial).opacity =
          0.16 + Math.sin(time * 3 + i) * 0.08;
      }

      // Cruise retro cars politely along the boulevard
      for (const car of cars) {
        const dx = Math.abs(playerPos.x - car.mesh.position.x);
        const dzAhead = (playerPos.z - car.mesh.position.z) * car.dir;
        const playerBlocking = dx < 2.2 && dzAhead > 0 && dzAhead < 7.5;
        if (!playerBlocking) {
          car.mesh.position.z += car.dir * car.speed * dt;
          if (car.mesh.position.z < -66) car.mesh.position.z = 54;
          if (car.mesh.position.z > 54) car.mesh.position.z = -66;
        }
      }

      // Gentle ocean shimmer
      ocean.position.y = -0.25 + Math.sin(time * 1.6) * 0.08;
    },
  };
}
