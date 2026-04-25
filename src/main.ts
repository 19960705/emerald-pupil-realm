import * as THREE from "three";
import "./style.css";

type Seal = {
  root: THREE.Group;
  core: THREE.Mesh;
  ring: THREE.Mesh;
  position: THREE.Vector3;
  awakened: boolean;
  focus: number;
};

type LifePatch = {
  root: THREE.Group;
  position: THREE.Vector3;
  radius: number;
  age: number;
  sealId: number | null;
};

const canvas = document.querySelector<HTMLCanvasElement>("#world");
const intro = document.querySelector<HTMLDivElement>("#intro");
const startButton = document.querySelector<HTMLButtonElement>("#start-button");
const focusButton = document.querySelector<HTMLButtonElement>("#focus-button");
const focusFill = document.querySelector<HTMLElement>("#focus-fill");
const sealCount = document.querySelector<HTMLElement>("#seal-count");
const moodChip = document.querySelector<HTMLElement>("#mood-chip");
const muteButton = document.querySelector<HTMLButtonElement>("#mute-button");

if (!canvas || !intro || !startButton || !focusButton || !focusFill || !sealCount || !moodChip || !muteButton) {
  throw new Error("Missing UI elements");
}

const worldCanvas = canvas;
const introPanel = intro;
const startControl = startButton;
const focusControl = focusButton;
const focusMeter = focusFill;
const sealCounter = sealCount;
const moodLabel = moodChip;
const muteControl = muteButton;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x09100d);
scene.fog = new THREE.FogExp2(0x0a120f, 0.028);

const renderer = new THREE.WebGLRenderer({
  canvas: worldCanvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 220);
const cameraRig = {
  yaw: Math.PI * 0.15,
  pitch: -0.42,
  distance: 9,
};

const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
const pointer = {
  dragging: false,
  x: 0,
  y: 0,
  moved: 0,
};

const keys = new Set<string>();
const player = {
  position: new THREE.Vector3(0, 0, 14),
  velocity: new THREE.Vector3(),
  focusHeld: false,
  focusEnergy: 0,
  totalLife: 0,
  lastGrowth: 0,
  movingAverage: 0,
};

declare global {
  interface Window {
    __emeraldDebug?: () => {
      patches: number;
      totalLife: number;
      awakened: number;
      focusEnergy: number;
      player: { x: number; z: number };
    };
  }
}

const clock = new THREE.Clock();
const lifePatches: LifePatch[] = [];
const seals: Seal[] = [];
const sealObjects: THREE.Object3D[] = [];
const focusTargets: THREE.Object3D[] = [];
const growthSpots = new Map<string, number>();

const deadMaterial = new THREE.MeshStandardMaterial({
  color: 0x6a706b,
  roughness: 0.92,
  metalness: 0.04,
});

const darkStoneMaterial = new THREE.MeshStandardMaterial({
  color: 0x222a26,
  roughness: 0.78,
  metalness: 0.08,
});

const awakenedMaterial = new THREE.MeshStandardMaterial({
  color: 0x76ffbd,
  roughness: 0.42,
  emissive: 0x1ed984,
  emissiveIntensity: 1.3,
});

const groundCanvas = document.createElement("canvas");
groundCanvas.width = 1024;
groundCanvas.height = 1024;
const maybeGroundContext = groundCanvas.getContext("2d");
if (!maybeGroundContext) {
  throw new Error("Could not create terrain texture");
}
const groundContext = maybeGroundContext;
const groundTexture = new THREE.CanvasTexture(groundCanvas);
groundTexture.colorSpace = THREE.SRGBColorSpace;
groundTexture.wrapS = THREE.ClampToEdgeWrapping;
groundTexture.wrapT = THREE.ClampToEdgeWrapping;

function paintBaseTerrain() {
  const gradient = groundContext.createRadialGradient(512, 512, 24, 512, 512, 600);
  gradient.addColorStop(0, "#2e342f");
  gradient.addColorStop(0.52, "#242923");
  gradient.addColorStop(1, "#141a17");
  groundContext.fillStyle = gradient;
  groundContext.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 5500; i += 1) {
    const v = 34 + Math.random() * 48;
    groundContext.fillStyle = `rgba(${v}, ${v + 7}, ${v + 2}, ${0.03 + Math.random() * 0.08})`;
    groundContext.fillRect(Math.random() * 1024, Math.random() * 1024, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  groundTexture.needsUpdate = true;
}

paintBaseTerrain();

const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,
  roughness: 0.96,
  metalness: 0.02,
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 150, 180, 180), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
ground.name = "living-ground";
scene.add(ground);
focusTargets.push(ground);

const hemi = new THREE.HemisphereLight(0xbfffe2, 0x111813, 1.3);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff3c7, 2.4);
sun.position.set(-14, 24, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 80;
sun.shadow.camera.left = -45;
sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45;
sun.shadow.camera.bottom = -45;
scene.add(sun);

const emeraldLight = new THREE.PointLight(0x39ffac, 2.7, 34, 2);
emeraldLight.position.set(0, 4, 0);
scene.add(emeraldLight);

const playerGroup = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.32, 0.72, 8, 16),
  new THREE.MeshStandardMaterial({
    color: 0xcfffe4,
    emissive: 0x14784f,
    emissiveIntensity: 0.36,
    roughness: 0.5,
  }),
);
body.position.y = 0.72;
body.castShadow = true;
playerGroup.add(body);

const eye = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 28, 16),
  new THREE.MeshStandardMaterial({
    color: 0xa8ffd1,
    emissive: 0x4effad,
    emissiveIntensity: 2,
    roughness: 0.2,
  }),
);
eye.position.set(0, 1.25, -0.17);
playerGroup.add(eye);
scene.add(playerGroup);

const gazeBeamMaterial = new THREE.MeshBasicMaterial({
  color: 0x8cffca,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
const gazeBeam = new THREE.Mesh(new THREE.ConeGeometry(0.06, 1, 20, 1, true), gazeBeamMaterial);
gazeBeam.rotation.x = Math.PI / 2;
scene.add(gazeBeam);

const horizonGroup = new THREE.Group();
scene.add(horizonGroup);

function seededNoise(x: number, z: number) {
  return Math.sin(x * 12.9898 + z * 78.233) * 43758.5453 % 1;
}

function createBarrenWorld() {
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const pillarGeo = new THREE.CylinderGeometry(0.26, 0.44, 2.6, 7);
  for (let i = 0; i < 76; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 9 + Math.random() * 55;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (Math.abs(x) < 4 && Math.abs(z - 14) < 5) continue;
    const mesh = new THREE.Mesh(Math.random() > 0.5 ? rockGeo : pillarGeo, Math.random() > 0.18 ? deadMaterial : darkStoneMaterial);
    const scale = 0.28 + Math.random() * 1.5;
    mesh.position.set(x, 0.15 + scale * 0.22, z);
    mesh.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3);
    mesh.scale.set(scale * (0.7 + Math.random() * 0.8), scale * (0.4 + Math.random() * 1.5), scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = "silent-stone";
    horizonGroup.add(mesh);
    focusTargets.push(mesh);
  }

  const archMaterial = new THREE.MeshStandardMaterial({
    color: 0x38413b,
    roughness: 0.72,
    emissive: 0x06130d,
  });
  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2;
    const arch = new THREE.Group();
    arch.position.set(Math.cos(angle) * 62, 0, Math.sin(angle) * 62);
    arch.lookAt(0, 0, 0);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.7, 5.4, 0.7), archMaterial);
    const right = left.clone();
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.62, 0.72), archMaterial);
    left.position.set(-1.9, 2.7, 0);
    right.position.set(1.9, 2.7, 0);
    top.position.set(0, 5.4, 0);
    arch.add(left, right, top);
    arch.scale.setScalar(0.7 + seededNoise(i, 3) * 0.3);
    horizonGroup.add(arch);
  }
}

function createSeal(index: number, angle: number, radius: number) {
  const root = new THREE.Group();
  const position = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  root.position.copy(position);
  root.lookAt(0, 0, 0);

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.28, 0.35, 7), darkStoneMaterial);
  plinth.position.y = 0.18;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  root.add(plinth);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.74, 1),
    new THREE.MeshStandardMaterial({
      color: 0x36403b,
      roughness: 0.64,
      metalness: 0.05,
      emissive: 0x052214,
      emissiveIntensity: 0.18,
    }),
  );
  core.position.y = 1.22;
  core.castShadow = true;
  core.name = `seal-${index}`;
  root.add(core);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.035, 8, 80),
    new THREE.MeshBasicMaterial({
      color: 0x89ffc7,
      transparent: true,
      opacity: 0.08,
    }),
  );
  ring.position.y = 1.22;
  ring.rotation.x = Math.PI / 2;
  root.add(ring);

  scene.add(root);
  sealObjects.push(core);
  focusTargets.push(core);
  seals.push({ root, core, ring, position, awakened: false, focus: 0 });
}

function createSeals() {
  for (let i = 0; i < 5; i += 1) {
    createSeal(i, -Math.PI / 2 + i * (Math.PI * 2 / 5), 19 + (i % 2) * 8);
  }
}

function createMist() {
  const count = 620;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 8 + Math.random() * 70;
    positions[i * 3] = Math.cos(angle) * dist;
    positions[i * 3 + 1] = 0.6 + Math.random() * 10;
    positions[i * 3 + 2] = Math.sin(angle) * dist;
    colors[i * 3] = 0.45 + Math.random() * 0.2;
    colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
    colors[i * 3 + 2] = 0.62 + Math.random() * 0.24;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.11,
    vertexColors: true,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.name = "living-mist";
  scene.add(points);
  return points;
}

const mist = createMist();

function worldToTexture(x: number, z: number) {
  return {
    x: THREE.MathUtils.clamp((x / 150 + 0.5) * 1024, 0, 1024),
    y: THREE.MathUtils.clamp((z / 150 + 0.5) * 1024, 0, 1024),
  };
}

function paintLifeToTerrain(position: THREE.Vector3, radius: number, hueShift: number) {
  const point = worldToTexture(position.x, position.z);
  const r = radius * (1024 / 150);
  const gradient = groundContext.createRadialGradient(point.x, point.y, 2, point.x, point.y, r);
  gradient.addColorStop(0, `hsla(${142 + hueShift}, 88%, 54%, 0.58)`);
  gradient.addColorStop(0.28, `hsla(${154 + hueShift}, 72%, 42%, 0.32)`);
  gradient.addColorStop(1, "rgba(21, 38, 28, 0)");
  groundContext.globalCompositeOperation = "screen";
  groundContext.fillStyle = gradient;
  groundContext.beginPath();
  groundContext.arc(point.x, point.y, r, 0, Math.PI * 2);
  groundContext.fill();
  groundContext.globalCompositeOperation = "source-over";
  groundTexture.needsUpdate = true;
}

function makeLeafMaterial(color: THREE.ColorRepresentation) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.18,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
}

const leafMaterials = [
  makeLeafMaterial(0x58e99a),
  makeLeafMaterial(0x83ffc2),
  makeLeafMaterial(0xd8e874),
  makeLeafMaterial(0x46c987),
];

const flowerMaterial = new THREE.MeshStandardMaterial({
  color: 0xf2e9a2,
  emissive: 0xffd86a,
  emissiveIntensity: 0.64,
  roughness: 0.4,
});

function createPlantPatch(position: THREE.Vector3, intensity: number, sealId: number | null = null) {
  const root = new THREE.Group();
  root.position.copy(position);
  const radius = 1.1 + intensity * 2.7;
  const stems = 8 + Math.floor(intensity * 20);
  const moodFast = player.movingAverage > 1.8;

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 56),
    new THREE.MeshBasicMaterial({
      color: moodFast ? 0xa7ff68 : 0x51ffab,
      transparent: true,
      opacity: 0.1 + intensity * 0.09,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.018;
  root.add(disc);

  for (let i = 0; i < stems; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.pow(Math.random(), 0.55) * radius;
    const height = 0.5 + Math.random() * (moodFast ? 2.6 : 1.65) + intensity * 1.1;
    const base = new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
    const bend = new THREE.Vector3(
      Math.sin(angle * 1.7 + intensity) * 0.3,
      height * 0.5,
      Math.cos(angle * 1.5) * 0.3,
    );
    const curve = new THREE.CatmullRomCurve3([
      base,
      base.clone().add(bend),
      base.clone().add(new THREE.Vector3(Math.sin(angle) * 0.35, height, Math.cos(angle) * 0.35)),
    ]);
    const stem = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 5, 0.015 + intensity * 0.018, 6),
      leafMaterials[Math.floor(Math.random() * leafMaterials.length)],
    );
    stem.castShadow = true;
    root.add(stem);

    const leafCount = moodFast ? 1 : 2;
    for (let j = 0; j < leafCount; j += 1) {
      const leaf = new THREE.Mesh(
        new THREE.PlaneGeometry(0.16 + Math.random() * 0.22, 0.42 + Math.random() * 0.4),
        leafMaterials[Math.floor(Math.random() * leafMaterials.length)],
      );
      const t = 0.36 + Math.random() * 0.48;
      leaf.position.copy(curve.getPoint(t));
      leaf.rotation.set(Math.random() * 0.8, angle + Math.PI * Math.random(), Math.random() * 1.4);
      leaf.scale.y = 0.2;
      root.add(leaf);
    }

    if (Math.random() < 0.18 + intensity * 0.16) {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.055 + intensity * 0.05, 10, 8), flowerMaterial);
      flower.position.copy(curve.getPoint(1));
      root.add(flower);
    }
  }

  root.scale.setScalar(0.03);
  scene.add(root);
  paintLifeToTerrain(position, radius, moodFast ? 42 : 0);
  lifePatches.push({ root, position: position.clone(), radius, age: 0, sealId });
  player.totalLife += radius * 0.03;
}

function createWaterVeins() {
  const material = new THREE.MeshBasicMaterial({
    color: 0x71ffcf,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (let i = 0; i < 5; i += 1) {
    const seal = seals[i];
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.035, 0),
      seal.position.clone().multiplyScalar(0.38).setY(0.04).add(new THREE.Vector3(Math.sin(i) * 4, 0, Math.cos(i * 2) * 4)),
      seal.position.clone().setY(0.045),
    ]);
    const vein = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.025, 7), material.clone());
    vein.name = `water-vein-${i}`;
    scene.add(vein);
  }
}

function awakenSeal(seal: Seal, index: number) {
  seal.awakened = true;
  seal.core.material = awakenedMaterial.clone();
  const ringMaterial = seal.ring.material as THREE.MeshBasicMaterial;
  ringMaterial.opacity = 0.86;
  createPlantPatch(seal.position.clone().add(new THREE.Vector3(0, 0.03, 0)), 1.4, index);
  createPlantPatch(seal.position.clone().add(new THREE.Vector3(1.7, 0.03, -0.8)), 0.9, index);
  createPlantPatch(seal.position.clone().add(new THREE.Vector3(-1.3, 0.03, 1.1)), 0.9, index);
  updateSealHud();
}

function updateSealHud() {
  const awakened = seals.filter((seal) => seal.awakened).length;
  sealCounter.textContent = `${awakened} / ${seals.length}`;
}

function targetKey(point: THREE.Vector3) {
  return `${Math.round(point.x / 1.6)}:${Math.round(point.z / 1.6)}`;
}

function findGazeHit() {
  raycaster.setFromCamera(center, camera);
  const hits = raycaster.intersectObjects(focusTargets, true);
  if (!hits.length) return null;
  const first = hits[0];
  if (first.object === ground && first.point.distanceTo(player.position) < 2.2) {
    const forward = new THREE.Vector3(Math.sin(cameraRig.yaw), 0, Math.cos(cameraRig.yaw)).normalize();
    first.point.copy(player.position).addScaledVector(forward, 4.2);
    first.point.y = 0.035;
  }
  return first;
}

function tryGrowAt(point: THREE.Vector3, dt: number) {
  const now = clock.elapsedTime;
  const key = targetKey(point);
  const last = growthSpots.get(key) ?? -100;
  player.lastGrowth += dt;
  if (now - last < 0.46 || player.lastGrowth < 0.15) return;
  player.lastGrowth = 0;
  growthSpots.set(key, now);

  const jitter = new THREE.Vector3((Math.random() - 0.5) * 1.1, 0.025, (Math.random() - 0.5) * 1.1);
  const intensity = THREE.MathUtils.clamp(player.focusEnergy * 0.9 + 0.28, 0.34, 1.25);
  createPlantPatch(point.clone().add(jitter), intensity);
}

function updateGaze(dt: number) {
  const hit = findGazeHit();
  const focusing = player.focusHeld && Boolean(hit);
  player.focusEnergy = THREE.MathUtils.damp(player.focusEnergy, focusing ? 1 : 0, focusing ? 2.4 : 4.8, dt);
  focusMeter.style.width = `${Math.round(player.focusEnergy * 100)}%`;
  gazeBeamMaterial.opacity = player.focusEnergy * 0.28;

  if (!hit) return;

  const point = hit.point;
  if (player.focusEnergy > 0.08) {
    const from = eye.getWorldPosition(new THREE.Vector3());
    const to = point.clone();
    const mid = from.clone().lerp(to, 0.5);
    const distance = from.distanceTo(to);
    gazeBeam.position.copy(mid);
    gazeBeam.scale.set(1 + player.focusEnergy * 2, distance, 1 + player.focusEnergy * 2);
    gazeBeam.lookAt(to);
    gazeBeam.rotateX(Math.PI / 2);
  }

  if (focusing) {
    tryGrowAt(point, dt);
    seals.forEach((seal, index) => {
      const distance = point.distanceTo(seal.position.clone().setY(point.y));
      if (distance < 2.3 && !seal.awakened) {
        seal.focus += dt * (0.76 + player.focusEnergy * 1.4);
        const ringMaterial = seal.ring.material as THREE.MeshBasicMaterial;
        ringMaterial.opacity = THREE.MathUtils.clamp(0.08 + seal.focus * 0.24, 0.08, 0.86);
        if (seal.focus > 3.3) {
          awakenSeal(seal, index);
        }
      }
    });
  }
}

function updatePlayer(dt: number) {
  const forward = new THREE.Vector3(Math.sin(cameraRig.yaw), 0, Math.cos(cameraRig.yaw)).normalize();
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const movement = new THREE.Vector3();
  if (keys.has("KeyW") || keys.has("ArrowUp")) movement.add(forward);
  if (keys.has("KeyS") || keys.has("ArrowDown")) movement.sub(forward);
  if (keys.has("KeyA") || keys.has("ArrowLeft")) movement.sub(right);
  if (keys.has("KeyD") || keys.has("ArrowRight")) movement.add(right);
  const active = movement.lengthSq() > 0;
  if (active) movement.normalize();
  const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 8 : 4.6;
  player.velocity.lerp(movement.multiplyScalar(speed), 1 - Math.pow(0.0006, dt));
  player.position.addScaledVector(player.velocity, dt);
  player.position.x = THREE.MathUtils.clamp(player.position.x, -62, 62);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -62, 62);
  playerGroup.position.copy(player.position);
  playerGroup.rotation.y = cameraRig.yaw;

  player.movingAverage = THREE.MathUtils.damp(player.movingAverage, player.velocity.length(), 1.7, dt);
  moodLabel.textContent = player.movingAverage > 2.6 ? "急促生长" : player.focusEnergy > 0.6 ? "深度凝视" : "缓慢观察";
}

function updateCamera(dt: number) {
  const forward = new THREE.Vector3(Math.sin(cameraRig.yaw), 0, Math.cos(cameraRig.yaw)).normalize();
  const target = player.position.clone().addScaledVector(forward, 3.2).add(new THREE.Vector3(0, 0.78, 0));
  const horizontalDistance = Math.cos(cameraRig.pitch) * cameraRig.distance;
  const height = Math.sin(-cameraRig.pitch) * cameraRig.distance + 2.5;
  const desired = target
    .clone()
    .addScaledVector(forward, -horizontalDistance)
    .add(new THREE.Vector3(0, height, 0));
  camera.position.lerp(desired, 1 - Math.pow(0.0002, dt));
  camera.lookAt(target);
}

function updateWorld(dt: number, time: number) {
  emeraldLight.position.set(player.position.x, 3.8 + Math.sin(time * 2) * 0.4, player.position.z);
  eye.scale.setScalar(1 + player.focusEnergy * 0.22 + Math.sin(time * 4) * 0.03);
  seals.forEach((seal, index) => {
    seal.root.rotation.y += dt * (seal.awakened ? 0.42 : 0.08);
    seal.core.position.y = 1.22 + Math.sin(time * 1.8 + index) * 0.06;
    seal.ring.rotation.z += dt * (seal.awakened ? 0.9 : 0.2);
  });
  lifePatches.forEach((patch) => {
    patch.age += dt;
    const scale = THREE.MathUtils.clamp(patch.age * 1.7, 0.03, 1);
    patch.root.scale.setScalar(scale);
    patch.root.rotation.y += dt * 0.04;
  });
  const mistPosition = mist.geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < mistPosition.count; i += 1) {
    const x = mistPosition.getX(i);
    const z = mistPosition.getZ(i);
    mistPosition.setX(i, x + Math.sin(time * 0.14 + z) * dt * 0.16);
    mistPosition.setZ(i, z + Math.cos(time * 0.13 + x) * dt * 0.16);
  }
  mistPosition.needsUpdate = true;

  (scene.fog as THREE.FogExp2).density = THREE.MathUtils.lerp(0.028, 0.017, Math.min(player.totalLife / 12, 1));
}

function updateVeins() {
  const awakened = seals.filter((seal) => seal.awakened).length;
  scene.children.forEach((child: THREE.Object3D) => {
    if (child.name.startsWith("water-vein-")) {
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      const index = Number(child.name.split("-").pop());
      material.opacity = seals[index]?.awakened ? 0.55 : Math.max(0, awakened - 3) * 0.08;
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.04);
  const time = clock.elapsedTime;
  updatePlayer(dt);
  updateCamera(dt);
  updateGaze(dt);
  updateWorld(dt, time);
  updateVeins();
  renderer.render(scene, camera);
}

window.__emeraldDebug = () => ({
  patches: lifePatches.length,
  totalLife: Number(player.totalLife.toFixed(2)),
  awakened: seals.filter((seal) => seal.awakened).length,
  focusEnergy: Number(player.focusEnergy.toFixed(2)),
  player: {
    x: Number(player.position.x.toFixed(2)),
    z: Number(player.position.z.toFixed(2)),
  },
});

let audioContext: AudioContext | null = null;
let focusGain: GainNode | null = null;
let masterGain: GainNode | null = null;

function startAudio() {
  if (audioContext) return;
  audioContext = new AudioContext();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.18;
  masterGain.connect(audioContext.destination);

  const low = audioContext.createOscillator();
  low.type = "sine";
  low.frequency.value = 76;
  const lowGain = audioContext.createGain();
  lowGain.gain.value = 0.08;
  low.connect(lowGain).connect(masterGain);
  low.start();

  const shimmer = audioContext.createOscillator();
  shimmer.type = "triangle";
  shimmer.frequency.value = 312;
  focusGain = audioContext.createGain();
  focusGain.gain.value = 0.01;
  shimmer.connect(focusGain).connect(masterGain);
  shimmer.start();
}

function updateAudio() {
  if (!audioContext || !focusGain) return;
  focusGain.gain.setTargetAtTime(0.01 + player.focusEnergy * 0.08 + seals.filter((seal) => seal.awakened).length * 0.008, audioContext.currentTime, 0.08);
  requestAnimationFrame(updateAudio);
}

function bindEvents() {
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  window.addEventListener("keydown", (event) => {
    keys.add(event.code);
    if (event.code === "Space") {
      event.preventDefault();
      player.focusHeld = true;
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
    if (event.code === "Space") player.focusHeld = false;
  });

  window.addEventListener("pointerdown", (event) => {
    pointer.dragging = true;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.moved = 0;
    player.focusHeld = true;
  });

  window.addEventListener("pointermove", (event) => {
    if (!pointer.dragging) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.moved += Math.abs(dx) + Math.abs(dy);
    cameraRig.yaw -= dx * 0.004;
    cameraRig.pitch = THREE.MathUtils.clamp(cameraRig.pitch - dy * 0.0028, -0.8, -0.16);
    if (pointer.moved > 8) player.focusHeld = false;
  });

  window.addEventListener("pointerup", () => {
    pointer.dragging = false;
    player.focusHeld = false;
  });

  window.addEventListener("wheel", (event) => {
    cameraRig.distance = THREE.MathUtils.clamp(cameraRig.distance + event.deltaY * 0.008, 5.4, 15);
  }, { passive: true });

  focusControl.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    player.focusHeld = true;
  });

  focusControl.addEventListener("pointerup", (event) => {
    event.stopPropagation();
    player.focusHeld = false;
  });

  startControl.addEventListener("click", () => {
    introPanel.classList.add("is-hidden");
    startAudio();
    updateAudio();
  });

  muteControl.addEventListener("click", () => {
    startAudio();
    if (!masterGain || !audioContext) return;
    const muted = masterGain.gain.value > 0.001;
    masterGain.gain.setTargetAtTime(muted ? 0 : 0.18, audioContext.currentTime, 0.04);
    muteControl.textContent = muted ? "×" : "♪";
  });
}

createBarrenWorld();
createSeals();
createWaterVeins();
updateSealHud();
bindEvents();
updateCamera(1);
animate();
