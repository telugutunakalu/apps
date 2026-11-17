// తెలుగు తునకలు · lib/v1/three-kit.js
// Shared three.js setup for the 3D apps. Pages must provide an import map:
//   { "imports": { "three": "<lib>/vendor/three/three.module.min.js",
//                  "three/addons/": "<lib>/vendor/three/addons/" } }
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { el } from "./safe.js";
import { createLoop, prefersReducedMotion, fontsReady } from "./shell.js";

export { THREE, fontsReady };

/* ---------- capability & quality ---------- */
export function webglAvailable() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

/** "low" | "mid" | "high" — override with ?q=low|mid|high for testing. */
export function qualityTier() {
  const q = new URLSearchParams(location.search).get("q");
  if (["low", "mid", "high"].includes(q)) return q;
  const mem = navigator.deviceMemory ?? 8, cores = navigator.hardwareConcurrency ?? 8;
  if (mem <= 2 || cores <= 4) return "low";
  if (matchMedia("(pointer: coarse)").matches || Math.min(screen.width, screen.height) < 720) return "mid";
  return "high";
}
const DPR_CAP = { low: 1, mid: 1.5, high: 2 };

/**
 * Create a renderer whose canvas fills `container`. pixelSize > 1 renders at reduced
 * resolution and upscales without smoothing — the "pixel 3D" look, and cheaper too.
 * Returns null (and shows a Telugu message) when WebGL is unavailable.
 */
export function createRenderer({ container, tier = qualityTier(), pixelSize = 1, alpha = false, exposure = 1,
  toneMapping = THREE.ACESFilmicToneMapping, antialias = null } = {}) {
  if (!webglAvailable()) {
    container.append(el("div", { class: "tt-webgl-fallback", text: "క్షమించండి — ఈ పరికరంలో 3D (WebGL) అందుబాటులో లేదు. దయచేసి Chrome / Safari తాజా వెర్షన్‌లో ప్రయత్నించండి." }));
    return null;
  }
  const canvas = el("canvas", { class: "tt-canvas" + (pixelSize > 1 ? " tt-canvas--pixel" : "") });
  container.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha, antialias: antialias ?? (tier === "high" && pixelSize === 1), powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP[tier]) / pixelSize);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = toneMapping;
  renderer.toneMappingExposure = exposure;
  if (!alpha) renderer.setClearColor(0x000000, 1);
  renderer.userData = { tier, pixelSize };   // WebGLRenderer has no userData of its own
  return renderer;
}

/**
 * Colour for renderer.setClearColor / scene.background when rendering through the
 * EffectComposer. In three r160 the clear colour is written already sRGB-encoded into
 * the composer's linear target and OutputPass encodes it again (a grey haze), so we
 * pre-linearise once more. For skies prefer skyDome() — it goes through normal shading.
 */
export const composerColor = hex => new THREE.Color(hex).convertSRGBToLinear();

/** Composer with optional bloom (skipped on the low tier). */
export function createComposer(renderer, scene, camera, { bloom = null } = {}) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let bloomPass = null;
  if (bloom && renderer.userData.tier !== "low") {
    bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), bloom.strength ?? 0.8, bloom.radius ?? 0.4, bloom.threshold ?? 0.2);
    composer.addPass(bloomPass);
  }
  composer.addPass(new OutputPass());
  return { composer, bloomPass };
}

/** Keep renderer/composer/camera sized to the container (ResizeObserver). Returns a disposer. */
export function autoResize({ renderer, camera, composer = null, bloomPass = null, container, onResize = null }) {
  const apply = () => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    bloomPass?.resolution.set(w, h);
    if (camera?.isPerspectiveCamera) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
    onResize?.(w, h);
  };
  const ro = new ResizeObserver(apply);
  ro.observe(container);
  apply();
  return () => ro.disconnect();
}

/* ---------- Telugu text → textures (three.js can't shape Telugu; the 2D canvas can) ---------- */
const texCache = new Map();

/**
 * Draw `text` centred on a canvas sized to fit it. Call `await fontsReady()` first.
 * opts: { height=256 px, font="'Noto Sans Telugu'", weight=700, color, stroke, strokeWidth, glow, bg, padding }
 */
export function glyphCanvas(text, { height = 256, font = "'Noto Sans Telugu', sans-serif", weight = 700, color = "#ffffff",
  stroke = null, strokeWidth = 0, glow = null, bg = null, padding = 0.16, radius = 0.18 } = {}) {
  const probe = document.createElement("canvas").getContext("2d");
  const base = 100;
  probe.font = `${weight} ${base}px ${font}`;
  const m = probe.measureText(text);
  const asc = m.actualBoundingBoxAscent || base * 0.8, desc = m.actualBoundingBoxDescent || base * 0.25;
  const left = m.actualBoundingBoxLeft || 0, right = m.actualBoundingBoxRight || m.width;
  const inner = height * (1 - padding * 2);
  const scale = inner / Math.max(asc + desc, base * 0.7);
  const width = Math.max(height, Math.ceil((left + right) * scale + height * padding * 2));
  const c = document.createElement("canvas");
  c.width = width; c.height = height;
  const g = c.getContext("2d");
  if (bg) {
    g.fillStyle = bg;
    const r = height * radius;
    g.beginPath();
    if (g.roundRect) g.roundRect(0, 0, width, height, r); else g.rect(0, 0, width, height);   // Safari < 16
    g.fill();
  }
  g.font = `${weight} ${base * scale}px ${font}`;
  g.textBaseline = "alphabetic";
  const x = width / 2 - ((right - left) / 2) * scale;
  const y = height / 2 + ((asc - desc) / 2) * scale;
  if (glow) { g.shadowColor = glow; g.shadowBlur = height * 0.12; }
  if (stroke && strokeWidth) { g.lineJoin = "round"; g.strokeStyle = stroke; g.lineWidth = strokeWidth * scale; g.strokeText(text, x, y); }
  g.fillStyle = color;
  g.fillText(text, x, y);
  return c;
}

/** Cached CanvasTexture for a glyph; texture.userData.aspect = width/height. */
export function glyphTexture(text, opts = {}) {
  const key = text + "|" + JSON.stringify(opts);
  if (texCache.has(key)) return texCache.get(key);
  const canvas = glyphCanvas(text, opts);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData.aspect = canvas.width / canvas.height;
  texCache.set(key, tex);
  return tex;
}

/** Camera-facing glyph. size = world height. */
export function glyphSprite(text, { size = 1, ...opts } = {}) {
  const tex = glyphTexture(text, opts);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(size * tex.userData.aspect, size, 1);
  return s;
}

/** Flat glyph plane (for signs/gates that should not face the camera). */
export function glyphPlane(text, { size = 1, side = THREE.DoubleSide, ...opts } = {}) {
  const tex = glyphTexture(text, opts);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size * tex.userData.aspect, size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side, depthWrite: false }));
  return mesh;
}

/* ---------- particles ---------- */
let dotTex = null;
export function dotTexture() {
  if (dotTex) return dotTex;
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.25, "rgba(255,255,255,.85)"); grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}

/** Pooled additive particle bursts: burst.emit(pos, {count,color,speed}); burst.update(dt) each frame. */
export class Burst extends THREE.Points {
  constructor({ max = 1200, size = 0.22 } = {}) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(max * 3).fill(-1e5), col = new Float32Array(max * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    super(geo, new THREE.PointsMaterial({ size, map: dotTexture(), vertexColors: true, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    this.frustumCulled = false;
    this.max = max; this.cursor = 0;
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.span = new Float32Array(max);
    this.base = new Float32Array(max * 3); this.gravity = new Float32Array(max);
  }
  emit(at, { count = 40, color = 0xffc233, speed = 4, spread = 1, gravity = -6, life = 0.9, dir = null } = {}) {
    const c = new THREE.Color(color), p = this.geometry.attributes.position.array;
    for (let n = 0; n < count; n++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      const sp = speed * (0.35 + Math.random() * 0.65);
      let vx = r * Math.cos(th) * sp * spread, vy = Math.abs(u) * sp, vz = r * Math.sin(th) * sp * spread;
      if (dir) { vx += dir.x * speed; vy += dir.y * speed; vz += dir.z * speed; }
      this.vel.set([vx, vy, vz], i * 3);
      p[i * 3] = at.x; p[i * 3 + 1] = at.y; p[i * 3 + 2] = at.z;
      this.base.set([c.r, c.g, c.b], i * 3);
      this.life[i] = this.span[i] = life * (0.6 + Math.random() * 0.6);
      this.gravity[i] = gravity;
    }
  }
  update(dt) {
    const p = this.geometry.attributes.position.array, col = this.geometry.attributes.color.array;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { p[i * 3 + 1] = -1e5; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; continue; }
      this.vel[i * 3 + 1] += this.gravity[i] * dt;
      p[i * 3] += this.vel[i * 3] * dt; p[i * 3 + 1] += this.vel[i * 3 + 1] * dt; p[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const k = this.life[i] / this.span[i];
      col[i * 3] = this.base[i * 3] * k; col[i * 3 + 1] = this.base[i * 3 + 1] * k; col[i * 3 + 2] = this.base[i * 3 + 2] * k;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}

/* ---------- sky ---------- */
/** Gradient sky sphere (top → horizon → bottom); colours go through normal shading so fog matches. */
export function skyDome({ top = "#1b1340", horizon = "#ff9a5a", bottom = "#2a1530", radius = 400, exponent = 0.7 } = {}) {
  const uniforms = { top: { value: new THREE.Color(top) }, horizon: { value: new THREE.Color(horizon) }, bottom: { value: new THREE.Color(bottom) }, exponent: { value: exponent } };
  const mat = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vPos; void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top, horizon, bottom; uniform float exponent; varying vec3 vPos;
      void main(){ float h = vPos.y; vec3 c = h > 0. ? mix(horizon, top, pow(h, exponent)) : mix(horizon, bottom, pow(-h, .5));
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), mat);
  mesh.userData.setColors = c => { for (const k of ["top", "horizon", "bottom"]) if (c[k]) uniforms[k].value.set(c[k]); };
  return mesh;
}

/* ---------- ambient Telugu-letter backdrop for menus / DOM apps ---------- */
/**
 * Slowly drifting glowing letters behind page content. Cheap: its own small transparent
 * renderer at DPR 1, paused when off-screen, hidden tab, or reduced motion (one static frame).
 */
export async function createBackdrop(container, { letters = ["అ", "ఆ", "క", "గ", "మ", "తె", "లు", "గు", "శ్రీ", "ఱ"], color = null, count = 24, opacity = 0.2 } = {}) {
  if (!webglAvailable()) return null;
  await fontsReady();
  const accent = color ?? (getComputedStyle(document.documentElement).getPropertyValue("--tt-accent").trim() || "#ff8a3d");
  const host = el("div", { attrs: { "aria-hidden": "true" }, style: { position: "absolute", inset: "0", zIndex: "0", pointerEvents: "none", overflow: "hidden" } });
  container.prepend(host);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
  renderer.setPixelRatio(1);
  renderer.domElement.className = "tt-canvas";
  host.append(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 12;
  const sprites = [];
  for (let i = 0; i < count; i++) {
    const s = glyphSprite(letters[i % letters.length], { size: 1, color: accent, glow: accent });
    s.material.opacity = opacity * (0.4 + Math.random() * 0.6);
    const sc = 0.8 + Math.random() * 1.8;
    s.scale.multiplyScalar(sc);
    s.position.set((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 14, -Math.random() * 10);
    s.userData = { vy: 0.15 + Math.random() * 0.35, phase: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.2 };
    scene.add(s); sprites.push(s);
  }
  const dispose = autoResize({ renderer, camera, container: host });
  let t = 0, visible = true;
  const loop = createLoop({
    update: dt => {
      t += dt;
      for (const s of sprites) {
        s.position.y += s.userData.vy * dt;
        s.position.x += Math.sin(t * 0.4 + s.userData.phase) * 0.004;
        s.material.rotation += s.userData.spin * dt;
        if (s.position.y > 8) s.position.y = -8;
      }
    },
    render: () => renderer.render(scene, camera),
  });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible && !prefersReducedMotion() ? loop.start() : loop.stop(); }).observe(host);
  if (prefersReducedMotion()) renderer.render(scene, camera); else loop.start();
  return { stop: () => loop.stop(), start: () => visible && loop.start(), dispose: () => { loop.stop(); dispose(); renderer.dispose(); host.remove(); } };
}

/* ---------- voxels ---------- */
const unitBox = new THREE.BoxGeometry(1, 1, 1);

/**
 * Parse ASCII voxel art. `layers` go bottom → top; each layer is rows (back → front) of
 * characters (left → right). `palette` maps characters to colours; "." and " " are empty.
 * Returns [{x,y,z,color}] centred on x/z with y starting at 0.
 */
export function parseVoxelArt(layers, palette) {
  const out = [];
  const depth = Math.max(...layers.map(l => l.length)), width = Math.max(...layers.flat().map(r => r.length));
  layers.forEach((rows, y) => rows.forEach((row, z) => [...row].forEach((ch, x) => {
    if (ch === "." || ch === " " || !palette[ch]) return;
    out.push({ x: x - (width - 1) / 2, y, z: z - (depth - 1) / 2, color: palette[ch] });
  })));
  return out;
}

/** One InstancedMesh for a voxel model (one draw call). */
export function voxelMesh(voxels, { size = 1, material = null } = {}) {
  const mat = material ?? new THREE.MeshLambertMaterial();
  const mesh = new THREE.InstancedMesh(unitBox, mat, voxels.length);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  voxels.forEach((v, i) => {
    m.makeScale(size, size, size).setPosition(v.x * size, (v.y + 0.5) * size, v.z * size);
    mesh.setMatrixAt(i, m); mesh.setColorAt(i, c.set(v.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/**
 * Many copies of one voxel model in a single InstancedMesh (e.g. 200 palm trees = 1 draw call).
 * placements: [{x,y,z,rotY,scale}]. mesh.userData.place(i, placement) moves copy i later (for recycling scenery).
 */
export function voxelInstances(voxels, placements, { size = 1, material = null } = {}) {
  const mat = material ?? new THREE.MeshLambertMaterial();
  const per = voxels.length;
  const mesh = new THREE.InstancedMesh(unitBox, mat, per * placements.length);
  const local = new THREE.Matrix4(), world = new THREE.Matrix4(), out = new THREE.Matrix4(), c = new THREE.Color();
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const place = (copy, p) => {
    q.setFromAxisAngle(up, p.rotY ?? 0); sc.setScalar(p.scale ?? 1); pos.set(p.x ?? 0, p.y ?? 0, p.z ?? 0);
    world.compose(pos, q, sc);
    voxels.forEach((v, i) => {
      local.makeScale(size, size, size).setPosition(v.x * size, (v.y + 0.5) * size, v.z * size);
      mesh.setMatrixAt(copy * per + i, out.multiplyMatrices(world, local));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  placements.forEach((p, k) => { place(k, p); voxels.forEach((v, i) => mesh.setColorAt(k * per + i, c.set(v.color))); });
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.userData.place = place;
  return mesh;
}
