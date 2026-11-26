import * as THREE from "three";
import { createHawaiianShirtTexture } from "@/components/world3d/textures";

export interface HumanRig {
  group: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  torsoGroup: THREE.Group;
  animate: (dt: number, speed: number, isSprinting: boolean) => void;
}

export function buildSculptedHuman(opts: {
  useHawaiianShirt?: boolean;
  shirtColor?: number;
  pantsColor?: number;
  skinColor?: number;
  hairColor?: number;
  shoeColor?: number;
  withShades?: boolean;
  withFootRing?: boolean;
}): HumanRig {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: opts.skinColor ?? 0xe2ae85,
    roughness: 0.58,
    metalness: 0.02,
  });
  const shirtMat = opts.useHawaiianShirt
    ? new THREE.MeshStandardMaterial({
        map: createHawaiianShirtTexture(),
        roughness: 0.65,
      })
    : new THREE.MeshStandardMaterial({
        color: opts.shirtColor ?? 0x06b6d4,
        roughness: 0.65,
      });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: opts.pantsColor ?? 0x1d4ed8,
    roughness: 0.78,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: opts.shoeColor ?? 0xf8fafc,
    roughness: 0.42,
  });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const hairMat = new THREE.MeshStandardMaterial({
    color: opts.hairColor ?? 0x1f1512,
    roughness: 0.8,
  });
  const shadesMat = new THREE.MeshPhysicalMaterial({
    color: 0x09090b,
    roughness: 0.08,
    metalness: 0.85,
    clearcoat: 1.0,
  });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x291c14, roughness: 0.5 });

  // Sculpted articulated legs (Capsule thighs/calves + rounded sneakers)
  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.9, 0);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.32, 6, 12), pantsMat);
    thigh.position.y = -0.22;
    thigh.castShadow = true;
    legPivot.add(thigh);

    const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.32, 6, 12), pantsMat);
    calf.position.y = -0.56;
    calf.castShadow = true;
    legPivot.add(calf);

    const shoeUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.14, 6, 10), shoeMat);
    shoeUpper.rotation.x = Math.PI / 2;
    shoeUpper.position.set(0, -0.81, 0.06);
    legPivot.add(shoeUpper);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.05, 0.32), soleMat);
    sole.position.set(0, -0.87, 0.05);
    legPivot.add(sole);

    return legPivot;
  };

  const leftLeg = makeLeg(-0.145);
  const rightLeg = makeLeg(0.145);
  group.add(leftLeg, rightLeg);

  // Sculpted Torso Group (pelvis + belt + tapered athletic chest + open V-neck collar)
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 1.24, 0);

  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.24, 0.2, 14), pantsMat);
  hips.position.y = -0.34;
  hips.scale.set(1.12, 1, 0.72);
  torsoGroup.add(hips);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.06, 14), beltMat);
  belt.position.y = -0.26;
  belt.scale.set(1.12, 1, 0.73);
  torsoGroup.add(belt);

  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.62, 16), shirtMat);
  chest.position.y = 0.06;
  chest.scale.set(1.15, 1, 0.74);
  chest.castShadow = true;
  torsoGroup.add(chest);

  // Rounded shoulder caps tucked naturally into torso & sleeves
  const shoulderGeo = new THREE.SphereGeometry(0.105, 10, 10);
  const shL = new THREE.Mesh(shoulderGeo, shirtMat);
  shL.position.set(-0.285, 0.27, 0);
  torsoGroup.add(shL);
  const shR = shL.clone();
  shR.position.x = 0.285;
  torsoGroup.add(shR);

  // Open shirt V-neck collar + subtle chest skin
  const vNeck = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 8), skinMat);
  vNeck.rotation.x = Math.PI;
  vNeck.position.set(0, 0.28, 0.18);
  torsoGroup.add(vNeck);

  // Anatomical neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.16, 12), skinMat);
  neck.position.y = 0.44;
  torsoGroup.add(neck);

  // Rounded sculpted head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 14), skinMat);
  head.scale.set(0.92, 1.08, 0.96);
  head.position.set(0, 0.65, 0.01);
  head.castShadow = true;
  torsoGroup.add(head);

  // Sculpted 80s swept hair crown
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.225, 16, 12), hairMat);
  hairTop.scale.set(0.96, 0.76, 1.04);
  hairTop.position.set(0, 0.75, -0.025);
  torsoGroup.add(hairTop);

  const hairBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.12, 6, 10), hairMat);
  hairBack.position.set(0, 0.64, -0.09);
  torsoGroup.add(hairBack);

  if (opts.withShades !== false) {
    const lensGeo = new THREE.BoxGeometry(0.13, 0.065, 0.04);
    const lensL = new THREE.Mesh(lensGeo, shadesMat);
    lensL.position.set(-0.075, 0.67, 0.19);
    lensL.rotation.y = -0.15;
    torsoGroup.add(lensL);

    const lensR = new THREE.Mesh(lensGeo, shadesMat);
    lensR.position.set(0.075, 0.67, 0.19);
    lensR.rotation.y = 0.15;
    torsoGroup.add(lensR);

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.03), shadesMat);
    bridge.position.set(0, 0.68, 0.2);
    torsoGroup.add(bridge);
  }

  // Sculpted articulated arms (short sleeve + tanned forearm + rounded hand)
  const makeArm = (xOffset: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOffset, 0.27, 0);

    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.16, 6, 10), shirtMat);
    sleeve.position.y = -0.12;
    sleeve.castShadow = true;
    armPivot.add(sleeve);

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.26, 6, 10), skinMat);
    forearm.position.y = -0.37;
    forearm.castShadow = true;
    armPivot.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.072, 8, 8), skinMat);
    hand.position.y = -0.55;
    armPivot.add(hand);

    return armPivot;
  };

  const leftArm = makeArm(-0.34);
  const rightArm = makeArm(0.34);
  torsoGroup.add(leftArm, rightArm);
  group.add(torsoGroup);

  if (opts.withFootRing) {
    const footRing = new THREE.Mesh(
      new THREE.RingGeometry(0.38, 0.47, 28),
      new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.48,
      })
    );
    footRing.rotation.x = -Math.PI / 2;
    footRing.position.y = 0.03;
    group.add(footRing);
  }

  let walkPhase = 0;

  return {
    group,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    torsoGroup,
    animate(dt: number, speed: number, isSprinting: boolean) {
      if (speed > 0.15) {
        const freq = isSprinting ? 13.5 : 9.2;
        const amp = isSprinting ? 0.78 : 0.5;
        walkPhase += dt * freq;
        const swing = Math.sin(walkPhase) * amp;
        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = -swing;
        leftArm.rotation.x = -swing * 0.85;
        rightArm.rotation.x = swing * 0.85;
        torsoGroup.position.y = 1.24 + Math.abs(Math.sin(walkPhase)) * 0.045;
        torsoGroup.rotation.y = Math.sin(walkPhase) * 0.06;
        torsoGroup.rotation.x = isSprinting ? 0.08 : 0.02;
      } else {
        leftLeg.rotation.x *= 0.82;
        rightLeg.rotation.x *= 0.82;
        leftArm.rotation.x *= 0.82;
        rightArm.rotation.x *= 0.82;
        torsoGroup.position.y += (1.24 - torsoGroup.position.y) * 0.18;
        torsoGroup.rotation.y *= 0.85;
        torsoGroup.rotation.x *= 0.85;
      }
    },
  };
}

export function buildVicePlayer(): HumanRig {
  return buildSculptedHuman({
    useHawaiianShirt: true,
    pantsColor: 0x1e40af,
    skinColor: 0xe3af86,
    hairColor: 0x1c1310,
    shoeColor: 0xf8fafc,
    withShades: true,
    withFootRing: true,
  });
}
