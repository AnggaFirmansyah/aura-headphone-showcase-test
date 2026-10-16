import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export function createRenderer(stage) {
  const dpr = Math.min(devicePixelRatio, 2);
  const renderer = new THREE.WebGLRenderer({
    // at >=2x the backbuffer already supersamples edges; MSAA there is pure cost
    antialias: dpr < 2,
    alpha: true,
  });
  renderer.domElement.id = "scene";
  renderer.setPixelRatio(dpr);
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);
  return renderer;
}

export function buildStudio(renderer, scene) {
  // studio environment: the single biggest lie that makes primitives look photographed
  scene.environment = buildStudioEnvironment(renderer);
  scene.add(buildContactShadow());

  // env light does the heavy lifting; key = shadow + spec highlights, rim = separation, gold = theme kicker
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3.5, 4.5, 2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -2.5;
  key.shadow.camera.right = 2.5;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 14;
  key.shadow.bias = -0.0004;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xbcd0ff, 1.6);
  rim.position.set(-3.5, 1.2, -2.8);
  scene.add(rim);

  const kicker = new THREE.PointLight(0xd9a441, 0.55);
  kicker.position.set(2.4, -1.4, 1.6);
  scene.add(kicker);

  // ShadowMaterial floor: invisible except the shadow, so the page backdrop shows through
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.ShadowMaterial({ opacity: 0.32 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.62;
  ground.receiveShadow = true;
  scene.add(ground);

  return { key, rim, kicker };
}

// Custom studio IBL: emissive panels arranged like a real set, captured to a cubemap via PMREM.
// Ceiling strip = the long soft reflection; cool side fills = edge separation; a dim gold panel
// low front keeps the theme colour in the metal. Replaces the generic RoomEnvironment.
export function buildStudioEnvironment(renderer) {
  const set = new THREE.Scene();
  set.add(new THREE.Mesh(
    new THREE.BoxGeometry(11, 7, 11),
    new THREE.MeshBasicMaterial({ color: 0x101216, side: THREE.BackSide })
  ));
  const panel = (color, w, h, pos, rot, mult) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(mult), side: THREE.DoubleSide })
    );
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    set.add(mesh);
  };
  panel(0xffffff, 7, 2, [0, 3.4, 0.2], [Math.PI / 2, 0, 0], 2.4); // ceiling softbox
  panel(0xd7e2ff, 2.4, 3.6, [-5.4, 0.2, -0.6], [0, Math.PI / 2, 0], 0.9); // cool fill, key side
  panel(0xd7e2ff, 2.4, 3.6, [5.4, 0.2, -0.6], [0, -Math.PI / 2, 0], 0.65); // cool fill, rim side
  panel(0xd9a441, 2.2, 1.4, [2.6, -1.5, 5.4], [0, Math.PI, 0], 0.5); // gold accent
  panel(0x9aa1ab, 7, 5, [0, -3.4, 0], [-Math.PI / 2, 0, 0], 0.22); // floor bounce
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(set, 0.05).texture;
  pmrem.dispose();
  return texture;
}

// soft grounding blob under the product; procedural gradient, no texture files
export function buildContactShadow() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 126);
  g.addColorStop(0, "rgba(0,0,0,.5)");
  g.addColorStop(0.55, "rgba(0,0,0,.2)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.6),
    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: new THREE.CanvasTexture(c) })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -1.605; // a hair above the shadow floor
  return mesh;
}

// Post chain for wide viewports: GTAO for crevices, subtle bloom for hot speculars, then tone map.
// Phones skip it: full-screen passes cost more than they return on small DPR2 screens.
export function createPost(renderer, scene, camera, w, h) {
  // half-float target with MSAA: the composer bypasses the canvas' own antialiasing
  const target = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);

  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, w, h);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0.7;
  gtao.updateGtaoMaterial({ radius: 0.12, scale: 1.2, samples: 16 });
  composer.addPass(gtao);

  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.22, 0.6, 1.12);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  return {
    composer,
    dispose() {
      gtao.dispose();
      bloom.dispose();
      composer.dispose();
    },
  };
}

export function createControls(camera, dom, reduced) {
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 3.4;
  controls.maxDistance = 9.5;
  controls.minPolarAngle = 0.7;
  controls.maxPolarAngle = 1.78;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.7;
  return controls;
}

// framing: compact = bottom sheet, wide = side column with product pushed right
export function createFitter(camera, controls) {
  let wideState = null;
  return (w, h) => {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const wide = innerWidth >= 1024;
    if (wide !== wideState) {
      wideState = wide;
      if (wide) {
        // side column exists from lg; xl has room for a closer, more product-shot framing
        const xl = innerWidth >= 1280;
        camera.position.set(xl ? -0.62 : -0.9, 0.15, xl ? 6.1 : 6.3);
        controls.target.set(xl ? -0.62 : -0.9, -0.15, 0);
      } else {
        // keep the product fully in frame and clear of the bottom sheet, on any aspect
        const tanV = Math.tan(THREE.MathUtils.degToRad(17)); // half of the 34deg vertical fov
        // fit box at 1.35 + ~8% air: clears the top hint line and short screens
        const z = THREE.MathUtils.clamp(1.46 / (tanV * Math.min(w / h, 1.4)), 7, 11);
        const sheet = Math.min(0.5, 440 / h);
        const y = -0.15 - (sheet / 2) * (2 * z * tanV);
        camera.position.set(0, y + 0.2, z);
        controls.target.set(0, y, 0);
      }
      controls.update();
    }
  };
}

export function buildProduct() {
  const mats = {
    body: new THREE.MeshPhysicalMaterial({
      color: "#22262d",
      roughness: 0.42,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.3,
    }),
    metal: new THREE.MeshStandardMaterial({ color: "#c9ced6", metalness: 1, roughness: 0.34 }),
    cushion: new THREE.MeshStandardMaterial({ color: "#17191c", roughness: 0.95 }),
    gold: new THREE.MeshStandardMaterial({ color: "#d9a441", metalness: 1, roughness: 0.32 }),
  };

  const product = new THREE.Group();
  const parts = []; // exploded-view movers: base -> to

  const add = (geometry, mat, pos, to, rot, group) => {
    const mesh = new THREE.Mesh(geometry, mat);
    if (rot) mesh.rotation.copy(rot);
    mesh.position.copy(pos);
    mesh.userData.base = pos;
    mesh.userData.to = to;
    mesh.userData.group = group;
    parts.push(mesh);
    product.add(mesh);
  };

  const V = (x, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const rotX = new THREE.Euler(0, Math.PI / 2, 0);
  const rotZ = new THREE.Euler(0, 0, Math.PI / 2);

  add(new THREE.TorusGeometry(1.02, 0.085, 24, 96, Math.PI), mats.body, V(0), V(0, 0.55, 0), null, "band");

  for (const s of [1, -1]) {
    add(new THREE.SphereGeometry(0.085, 24, 16), mats.body, V(1.02 * s), V(1.55 * s), null, "band"); // caps close the torus ends
    add(new THREE.CylinderGeometry(0.032, 0.032, 0.38, 16), mats.metal, V(1.02 * s, -0.19), V(1.45 * s, -0.05), null, "yoke");
    add(new THREE.CylinderGeometry(0.5, 0.5, 0.36, 64), mats.body, V(0.86 * s, -0.62), V(1.3 * s, -0.62), rotZ, "shell");
    add(new THREE.CylinderGeometry(0.44, 0.44, 0.05, 64), mats.metal, V(1.055 * s, -0.62), V(2.3 * s, -0.62), rotZ, "shell");
    add(new THREE.TorusGeometry(0.44, 0.012, 12, 80), mats.metal, V(1.08 * s, -0.62), V(2.55 * s, -0.62), rotX, "shell");
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 24), mats.gold, V(1.09 * s, -0.62), V(2.38 * s, -0.62), rotZ, "shell");
    add(new THREE.TorusGeometry(0.34, 0.135, 20, 64), mats.cushion, V(0.63 * s, -0.62), V(0.1 * s, -0.62), rotX, "cushion");
    // internals: invisible inside the cup shell until the exploded view opens
    add(
      new THREE.SphereGeometry(0.27, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      mats.metal,
      V(0.72 * s, -0.62),
      V(1.66 * s, -0.62),
      new THREE.Euler(0, 0, (-s * Math.PI) / 2),
      "core"
    );
    add(new THREE.TorusGeometry(0.3, 0.022, 10, 48), mats.gold, V(0.7 * s, -0.62), V(1.5 * s, -0.62), rotX, "core");
  }

  product.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  product.position.y = -0.15;

  return { product, mats, parts };
}
