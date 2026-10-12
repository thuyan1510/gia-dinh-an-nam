import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
const config = await fetch("/models/config.json").then((r) => r.json());
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(640, 640);
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
document.body.append(renderer.domElement);
const loader = new GLTFLoader(),
  textures = new THREE.TextureLoader();
const draco = new DRACOLoader().setDecoderPath(
  "/three/examples/jsm/libs/draco/gltf/",
);
loader.setDRACOLoader(draco);
window.renderWeek = async function (week, azimuth = -1.2) {
  const definition = config.scenes.find(
    (s) => s.id === config.weeks.find((w) => w.week === week + 1).sceneId,
  );
  const gltf = await loader.loadAsync(`/models/${definition.file}`),
    model = gltf.scene;
  if (gltf.animations.length) {
    const mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(gltf.animations[0]).play();
    mixer.setTime(0);
  }
  const allowed = new Set(definition.neutralParts || definition.outerParts);
  const textureCache = new Map();
  async function texture(path, color) {
    if (!path) return null;
    if (!textureCache.has(path)) {
      const t = await textures.loadAsync(`/models/${path}`);
      t.flipY = false;
      if (color) t.colorSpace = THREE.SRGBColorSpace;
      textureCache.set(path, t);
    }
    return textureCache.get(path);
  }
  const meshes = [];
  model.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  for (const mesh of meshes) {
    const name = mesh.material.name;
    mesh.visible = allowed.has(name);
    if (!mesh.visible) continue;
    const surface =
      definition.surfaces.find((s) => s.name === name) ||
      definition.surfaces.find((s) => s.name === "default");
    const diffuse = await texture(surface?.textures?.diffuseMap, true);
    const opacity = await texture(surface?.textures?.opacityMap, false);
    mesh.material = new THREE.MeshStandardMaterial({
      map: diffuse,
      color: diffuse ? 0xffffff : 0xd89880,
      metalness: 0,
      roughness: 0.72,
      alphaMap: opacity,
      transparent: !!opacity,
      alphaTest: opacity ? 0.03 : 0,
      emissive: 0x7b2812,
      emissiveIntensity: 0.055,
      side: THREE.DoubleSide,
    });
  }
  model.updateMatrixWorld(true);
  const box = new THREE.Box3();
  for (const mesh of meshes.filter((m) => m.visible))
    box.union(new THREE.Box3().setFromObject(mesh, true));
  const center = box.getCenter(new THREE.Vector3()),
    size = box.getSize(new THREE.Vector3());
  model.position.sub(center);
  const scale = 1 / Math.max(size.x, size.y, size.z);
  model.scale.setScalar(scale);
  model.position.multiplyScalar(scale);
  const scene = new THREE.Scene();
  scene.add(model);
  scene.add(new THREE.HemisphereLight(0xffe8d3, 0x965941, 2.1));
  const key = new THREE.DirectionalLight(0xffe8d2, 3.4);
  key.position.set(-2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe4b5, 3.8);
  rim.position.set(3, 2, -3);
  scene.add(rim);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100);
  camera.position.set(Math.sin(azimuth) * 2.1, 0.25, Math.cos(azimuth) * 2.1);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  const png = renderer.domElement.toDataURL("image/png");
  model.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });
  for (const t of textureCache.values()) t.dispose();
  return {
    png,
    model: definition.file,
    sceneId: definition.id,
    completedWeek: week,
  };
};
window.rendererReady = true;
