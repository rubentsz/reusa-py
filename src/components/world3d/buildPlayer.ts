import * as THREE from "three";
import { createHawaiianShirtTexture } from "@/components/world3d/textures";

export interface PlayerRig {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  torso: THREE.Mesh;
  animate: (dt: number, speed: number, isSprinting: boolean) => void;
}

export function buildVicePlayer(): PlayerRig {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe6b58d, roughness: 0.65 });
  const shirtMat = new THREE.MeshStandardMaterial({
    map: createHawaiianShirtTexture(),
    roughness: 0.7,
  });
  const jeansMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1615, roughness: 0.9 });
  const shadesMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.15,
    metalness: 0.8,
  });

  // Legs
  const legGeo = new THREE.BoxGeometry(0.24, 0.78, 0.26);
  legGeo.translate(0, -0.39, 0);

  const leftLeg = new THREE.Mesh(legGeo, jeansMat);
  leftLeg.position.set(-0.15, 0.84, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, jeansMat);
  rightLeg.position.set(0.15, 0.84, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // White 80s sneakers attached to legs
  const shoeGeo = new THREE.BoxGeometry(0.26, 0.14, 0.36);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(0, -0.77, 0.05);
  leftLeg.add(leftShoe);

  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0, -0.77, 0.05);
  rightLeg.add(rightShoe);

  // Torso (Hawaiian floral shirt)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.74, 0.34), shirtMat);
  torso.position.set(0, 1.21, 0);
  torso.castShadow = true;
  group.add(torso);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.19, 0.64, 0.19);
  armGeo.translate(0, -0.28, 0);

  const leftArm = new THREE.Mesh(armGeo, shirtMat);
  leftArm.position.set(-0.42, 1.52, 0);
  leftArm.castShadow = true;
  group.add(leftArm);

  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.16), skinMat);
  leftHand.position.set(0, -0.62, 0);
  leftArm.add(leftHand);

  const rightArm = new THREE.Mesh(armGeo, shirtMat);
  rightArm.position.set(0.42, 1.52, 0);
  rightArm.castShadow = true;
  group.add(rightArm);

  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.16), skinMat);
  rightHand.position.set(0, -0.62, 0);
  rightArm.add(rightHand);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.42), skinMat);
  head.position.set(0, 1.82, 0);
  head.castShadow = true;
  group.add(head);

  // Hair (80s swept look)
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.46), hairMat);
  hair.position.set(0, 2.02, -0.02);
  group.add(hair);

  // Retro sunglasses
  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.08), shadesMat);
  shades.position.set(0, 1.84, 0.21);
  group.add(shades);

  // Subtle ground shadow ring under player
  const footRing = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.48, 24),
    new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    })
  );
  footRing.rotation.x = -Math.PI / 2;
  footRing.position.y = 0.03;
  group.add(footRing);

  let walkPhase = 0;

  return {
    group,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    torso,
    animate(dt: number, speed: number, isSprinting: boolean) {
      if (speed > 0.15) {
        const freq = isSprinting ? 13 : 9;
        const amp = isSprinting ? 0.78 : 0.52;
        walkPhase += dt * freq;
        const swing = Math.sin(walkPhase) * amp;
        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = -swing;
        leftArm.rotation.x = -swing * 0.85;
        rightArm.rotation.x = swing * 0.85;
        torso.position.y = 1.21 + Math.abs(Math.sin(walkPhase)) * 0.05;
      } else {
        // Smooth idle settle
        leftLeg.rotation.x *= 0.82;
        rightLeg.rotation.x *= 0.82;
        leftArm.rotation.x *= 0.82;
        rightArm.rotation.x *= 0.82;
        torso.position.y += (1.21 - torso.position.y) * 0.2;
      }
    },
  };
}
