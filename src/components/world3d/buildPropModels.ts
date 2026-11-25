import * as THREE from "three";
import type { ListingDTO } from "@/types/marketplace";

/**
 * Builds a stylized rotating 3D miniature prop representing the listing's category
 * to sit beside its real photograph on the showroom pedestal.
 */
export function buildCategoryPropModel(listing: ListingDTO, neonHex: string): THREE.Group {
  const root = new THREE.Group();
  const accent = new THREE.Color(neonHex);
  const cat = listing.category.slug;
  const sub = listing.subcategory?.slug || "";

  const accentMat = new THREE.MeshStandardMaterial({
    color: accent,
    roughness: 0.3,
    metalness: 0.45,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.6,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.45,
    roughness: 0.15,
    metalness: 0.8,
  });
  const warmMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55 });

  if (cat === "vehiculos") {
    if (sub === "motos") {
      // Stylized 3D sport motorcycle
      const wheelGeo = new THREE.TorusGeometry(0.28, 0.08, 8, 16);
      const wFront = new THREE.Mesh(wheelGeo, darkMat);
      wFront.position.set(0.48, 0.32, 0);
      root.add(wFront);
      const wBack = wFront.clone();
      wBack.position.x = -0.48;
      root.add(wBack);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.28, 0.26), accentMat);
      frame.position.set(0, 0.54, 0);
      root.add(frame);

      const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.28), accentMat);
      fairing.position.set(0.34, 0.72, 0);
      fairing.rotation.z = -0.35;
      root.add(fairing);

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.24), darkMat);
      seat.position.set(-0.22, 0.7, 0);
      root.add(seat);
    } else {
      // Stylized miniature 3D retro coupe
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.34, 0.72), accentMat);
      body.position.y = 0.28;
      root.add(body);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.26, 0.62), glassMat);
      cabin.position.set(-0.06, 0.54, 0);
      root.add(cabin);

      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.72), accentMat);
      spoiler.position.set(-0.64, 0.52, 0);
      root.add(spoiler);

      const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12);
      wheelGeo.rotateX(Math.PI / 2);
      for (const [wx, wz] of [
        [0.44, 0.36],
        [0.44, -0.36],
        [-0.44, 0.36],
        [-0.44, -0.36],
      ]) {
        const w = new THREE.Mesh(wheelGeo, darkMat);
        w.position.set(wx, 0.16, wz);
        root.add(w);
      }
    }
    return root;
  }

  if (cat === "inmuebles") {
    // 3D architectural house / apartment maquette
    const lawn = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.08, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.9 })
    );
    lawn.position.y = 0.04;
    root.add(lawn);

    if (sub === "departamentos") {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.15, 0.68), whiteMat);
      tower.position.set(0, 0.64, 0);
      root.add(tower);
      for (let f = 0; f < 3; f++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.18, 0.52), glassMat);
        win.position.set(0, 0.35 + f * 0.32, 0);
        root.add(win);
      }
    } else {
      const floor1 = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.48, 0.78), whiteMat);
      floor1.position.set(0, 0.32, 0);
      root.add(floor1);

      const floor2 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.42, 0.68), warmMat);
      floor2.position.set(0.18, 0.76, 0);
      root.add(floor2);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.09, 0.88), darkMat);
      roof.position.set(0, 0.98, 0);
      root.add(roof);

      const win = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.8), glassMat);
      win.position.set(-0.22, 0.34, 0);
      root.add(win);
    }
    return root;
  }

  if (cat === "tecnologia") {
    if (sub === "notebooks-pc") {
      // Open sleek 3D laptop
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.68), whiteMat);
      base.position.y = 0.12;
      root.add(base);
      const kb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.42), darkMat);
      kb.position.set(0, 0.16, 0.04);
      root.add(kb);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.64, 0.05), whiteMat);
      lid.position.set(0, 0.44, -0.32);
      lid.rotation.x = -0.18;
      root.add(lid);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.55), glassMat);
      screen.position.set(0, 0.44, -0.29);
      screen.rotation.x = -0.18;
      root.add(screen);
    } else {
      // Sleek 3D smartphone standing angled
      const phone = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.88, 0.07), darkMat);
      phone.position.y = 0.54;
      root.add(phone);
      const display = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.78), glassMat);
      display.position.set(0, 0.54, 0.04);
      root.add(display);
      const camBump = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.03), accentMat);
      camBump.position.set(-0.1, 0.82, -0.045);
      root.add(camBump);
    }
    return root;
  }

  if (cat === "ropa-calzado") {
    // 3D Sneaker / Apparel showcase
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.36), whiteMat);
    sole.position.set(0, 0.14, 0);
    root.add(sole);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.26, 0.32), accentMat);
    upper.position.set(-0.06, 0.32, 0);
    root.add(upper);
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.3), whiteMat);
    collar.position.set(-0.22, 0.5, 0);
    root.add(collar);
    return root;
  }

  if (cat === "hogar-muebles") {
    if (sub === "electrodomesticos") {
      // 3D Double-door inverter fridge
      const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.64, 1.15, 0.52), whiteMat);
      fridge.position.y = 0.58;
      root.add(fridge);
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.12, 0.54), darkMat);
      seam.position.y = 0.58;
      root.add(seam);
    } else {
      // 3D Modern L-shaped sofa
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.28, 0.58), darkMat);
      seat.position.y = 0.22;
      root.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.42, 0.16), darkMat);
      back.position.set(0, 0.48, -0.22);
      root.add(back);
      const chaise = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.52), darkMat);
      chaise.position.set(0.38, 0.22, 0.46);
      root.add(chaise);
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.12), accentMat);
      pillow.position.set(-0.32, 0.45, -0.06);
      root.add(pillow);
    }
    return root;
  }

  if (cat === "deportes") {
    // 3D Mountain bike
    const wheelGeo = new THREE.TorusGeometry(0.32, 0.055, 8, 18);
    const w1 = new THREE.Mesh(wheelGeo, darkMat);
    w1.position.set(0.5, 0.36, 0);
    root.add(w1);
    const w2 = w1.clone();
    w2.position.x = -0.5;
    root.add(w2);
    const topTube = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.07, 0.07), accentMat);
    topTube.position.set(0, 0.66, 0);
    root.add(topTube);
    const downTube = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.07, 0.07), accentMat);
    downTube.position.set(0.06, 0.46, 0);
    downTube.rotation.z = 0.55;
    root.add(downTube);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.52), darkMat);
    handle.position.set(0.38, 0.84, 0);
    root.add(handle);
    return root;
  }

  if (cat === "herramientas") {
    // 3D Cordless brushless drill
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.22), accentMat);
    body.position.set(0, 0.64, 0);
    root.add(body);
    const chuck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.28, 10),
      darkMat
    );
    chuck.rotation.z = Math.PI / 2;
    chuck.position.set(0.45, 0.64, 0);
    root.add(chuck);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.46, 0.18), darkMat);
    grip.position.set(-0.1, 0.34, 0);
    grip.rotation.z = 0.18;
    root.add(grip);
    const battery = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.24), accentMat);
    battery.position.set(-0.08, 0.12, 0);
    root.add(battery);
    return root;
  }

  if (cat === "instrumentos-hobbies") {
    // 3D Electric Guitar
    const guitarBody = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.12), warmMat);
    guitarBody.position.set(0, 0.38, 0);
    root.add(guitarBody);
    const pickguard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.14), whiteMat);
    pickguard.position.set(0.04, 0.38, 0);
    root.add(pickguard);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.72, 0.08), darkMat);
    neck.position.set(0, 0.96, 0);
    root.add(neck);
    return root;
  }

  if (cat === "bebes-ninos") {
    // 3D Foldable Stroller
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.36, 0.48), accentMat);
    basket.position.set(0, 0.56, 0);
    root.add(basket);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.48), whiteMat);
    hood.position.set(-0.2, 0.84, 0);
    root.add(hood);
    const wheelGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 10);
    wheelGeo.rotateX(Math.PI / 2);
    for (const [wx, wz] of [
      [0.24, 0.24],
      [0.24, -0.24],
      [-0.24, 0.24],
      [-0.24, -0.24],
    ]) {
      const w = new THREE.Mesh(wheelGeo, darkMat);
      w.position.set(wx, 0.16, wz);
      root.add(w);
    }
    return root;
  }

  // Default: Neon gift / box showcase
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.68, 0.68), accentMat);
  box.position.y = 0.42;
  root.add(box);
  const ribbon1 = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.72), whiteMat);
  ribbon1.position.y = 0.42;
  root.add(ribbon1);
  return root;
}
