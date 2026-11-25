import * as THREE from "three";

export interface OceanShaderHandle {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  setColors: (shallowHex: number, deepHex: number, specHex: number, sunPos: [number, number, number]) => void;
  update: (time: number) => void;
}

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vWaveHeight;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Multi-layered rolling ocean swells
    float w1 = sin(pos.x * 0.09 + uTime * 1.35) * 0.24;
    float w2 = cos(pos.z * 0.14 - uTime * 1.75) * 0.18;
    float w3 = sin((pos.x + pos.z) * 0.22 + uTime * 2.2) * 0.09;
    float h = w1 + w2 + w3;

    // Dampen amplitude right at the sandy shoreline (vUv.y near 1.0 = closest to beach)
    float shoreDamp = smoothstep(0.99, 0.86, vUv.y);
    pos.y += h * shoreDamp;
    vWaveHeight = h;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform vec3 uSpecColor;
  uniform vec3 uSunPos;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vWaveHeight;

  void main() {
    // vUv.y = 1.0 is closest to the south beach edge, 0.0 is far northern horizon
    float shoreFactor = smoothstep(0.62, 0.99, vUv.y);
    vec3 baseColor = mix(uDeepColor, uShallowColor, shoreFactor);

    // Subtle procedural wave normal perturbation
    float nx = cos(vWorldPos.x * 0.18 + uTime * 1.6) * 0.14 + sin(vWorldPos.z * 0.35 + uTime * 2.1) * 0.08;
    float nz = sin(vWorldPos.z * 0.22 - uTime * 1.9) * 0.14;
    vec3 normal = normalize(vec3(nx, 1.0, nz));

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 lightDir = normalize(uSunPos - vWorldPos);
    vec3 halfVec = normalize(lightDir + viewDir);

    // Fresnel sky reflection sheen
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
    // Dancing sunset specular glitter path across the ocean
    float spec = pow(max(dot(normal, halfVec), 0.0), 54.0);

    vec3 color = baseColor + uSpecColor * (spec * 1.15 + fresnel * 0.32);

    // Animated white frothy shoreline surf lapping the sand
    float surfWave = sin(vWorldPos.x * 0.15 + uTime * 2.1) * 0.012;
    float foamBand = smoothstep(0.955 + surfWave, 0.985 + surfWave, vUv.y);
    float crestFoam = smoothstep(0.32, 0.48, vWaveHeight) * 0.22;
    color = mix(color, vec3(0.95, 0.98, 1.0), clamp(foamBand * 0.78 + crestFoam, 0.0, 0.85));

    // Gentle atmospheric horizon fade
    float distFade = smoothstep(140.0, 260.0, length(cameraPosition - vWorldPos));
    color = mix(color, uSpecColor * 0.55 + uDeepColor * 0.45, distFade * 0.5);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createRealisticOcean(): OceanShaderHandle {
  const geo = new THREE.PlaneGeometry(420, 180, 64, 48);
  geo.rotateX(-Math.PI / 2);

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: {
      uTime: { value: 0 },
      uShallowColor: { value: new THREE.Color(0x14b8a6) },
      uDeepColor: { value: new THREE.Color(0x172554) },
      uSpecColor: { value: new THREE.Color(0xffa94d) },
      uSunPos: { value: new THREE.Vector3(16, 36, -180) },
    },
  });

  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(0, -0.2, -186);

  return {
    mesh,
    material,
    setColors(shallowHex, deepHex, specHex, sunPos) {
      material.uniforms.uShallowColor.value.setHex(shallowHex);
      material.uniforms.uDeepColor.value.setHex(deepHex);
      material.uniforms.uSpecColor.value.setHex(specHex);
      material.uniforms.uSunPos.value.set(sunPos[0], sunPos[1], sunPos[2]);
    },
    update(time: number) {
      material.uniforms.uTime.value = time;
    },
  };
}
