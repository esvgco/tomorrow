// PS1 rabbit: the same rig, but each primitive is its own rigid low-poly
// segment (as PlayStation characters were built), drawn flat with few faces,
// 32 px textures in hard pixels, vertices snapped to a low-res grid, affine
// (non perspective-correct) texture mapping, 15-bit colour with ordered
// dithering, a blob shadow — rendered small and scaled up without smoothing.
// Same language as the PS1 variants in Unity8Dev (src/v4/gallery/variants).
import * as THREE from 'three';
import { SHAPES, solve, SIT } from './rig.js';

THREE.ColorManagement.enabled = false;

const VERT = /* glsl */ `
uniform vec2 uSnap;
uniform vec3 uLight;
in vec3 color;
out vec3 vCol;
out vec2 vUvW;
out float vW;
out float vWorldY;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldY = wp.y;
  vec3 n = normalize(mat3(modelMatrix) * normal);
  float l = 0.7 + 0.42 * max(dot(n, uLight), 0.0) + 0.06 * n.y;
  vCol = color * l;
  vec4 cp = projectionMatrix * viewMatrix * wp;
  vec2 s = uSnap * 0.5;
  cp.xy = floor(cp.xy / cp.w * s + 0.5) / s * cp.w;
  gl_Position = cp;
  vUvW = uv * cp.w;
  vW = cp.w;
}
`;

const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uUseMap;
uniform float uAlpha;
in vec3 vCol;
in vec2 vUvW;
in float vW;
in float vWorldY;
uniform bool uClipGround;
out vec4 fragColor;
const float B[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
void main() {
  if (uClipGround && vWorldY < 0.0) discard;
  vec3 c = vCol;
  if (uUseMap > 0.5) c *= texture(uMap, vUvW / vW).rgb;
  ivec2 p = ivec2(gl_FragCoord.xy) % 4;
  float d = (B[p.y * 4 + p.x] + 0.5) / 16.0 - 0.5;
  c = clamp(floor(c * 31.0 + 0.5 + d) / 31.0, 0.0, 1.0);
  fragColor = vec4(c, uAlpha);
}
`;

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  let s = 7;
  draw(c.getContext('2d'), () => (s = (s * 16807) % 2147483647) / 2147483647);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const furTex = () => canvasTexture(32, (g, rnd) => {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const v = 238 + Math.floor(rnd() * 18);
    const streak = (x + y * 3) % 7 === 0 ? -10 : 0;
    g.fillStyle = `rgb(${v + streak},${v + streak - 3},${v + streak - 8})`;
    g.fillRect(x, y, 1, 1);
  }
});

const floorTex = () => canvasTexture(32, (g) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 32, 32);
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 16, 16); g.fillRect(16, 16, 16, 16);
  g.fillStyle = '#e0e0e0'; g.fillRect(0, 0, 32, 1); g.fillRect(0, 0, 1, 32);
});

/** A low-poly round cone along +y, from radius ra at 0 to rb at `len`. */
function segment(ra, rb, len, sides) {
  const pts = [
    [0, -ra], [ra * 0.72, -ra * 0.7], [ra, 0], [rb, len], [rb * 0.72, len + rb * 0.7], [0, len + rb],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const g = unindexed(new THREE.LatheGeometry(pts, sides));
  g.computeVertexNormals();
  return g;
}

/** Every face its own vertices, so faces can be lit and coloured flat. */
const unindexed = (g) => (g.index ? g.toNonIndexed() : g);

function paint(g, fn) {
  g = unindexed(g);
  g.computeVertexNormals();
  const pos = g.attributes.position, nor = g.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 3) {
    // one colour per face, from the face's centre and normal
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const nz = (nor.getZ(i) + nor.getZ(i + 1) + nor.getZ(i + 2)) / 3;
    const c = fn(cx, cy, cz, nz);
    for (let k = 0; k < 3; k++) col.set(c, (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

const WHITE = [1, 1, 1];
const PINK = [0.95, 0.62, 0.68];

export class Ps1View {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.pixelSize = opts.pixelSize || 2.5;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.renderer.setClearColor(0xffffff, 1);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
    this.scene = new THREE.Scene();
    this.shared = {
      uSnap: { value: new THREE.Vector2(160, 120) },
      uLight: { value: new THREE.Vector3(-0.35, 0.85, 0.55).normalize() },
    };
    const mat = (map, alpha = 1) => new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG,
      transparent: alpha < 1, depthWrite: alpha >= 1,
      uniforms: { ...this.shared, uMap: { value: map }, uUseMap: { value: map ? 1 : 0 }, uAlpha: { value: alpha }, uClipGround: { value: false } },
    });
    const fur = mat(furTex());
    const plain = mat(null);
    this.rabbitMaterials = [fur, plain];

    // rest lengths: the segments are rigid, so the rest pose gives their length
    const J = solve(SIT);
    this.parts = SHAPES.map((s) => {
      const len = Math.hypot(J[s.b][0] - J[s.a][0], J[s.b][1] - J[s.a][1], J[s.b][2] - J[s.a][2]);
      const isEar = !!s.flat;
      const side = s.g === 2 ? 1 : -1;
      const sides = s.ra > 0.08 ? 7 : s.ra > 0.04 ? 6 : 5;
      const g = paint(segment(s.ra, s.rb, len, sides), () => WHITE);
      const m = new THREE.Mesh(g, fur);
      if (isEar) {
        // pink inner ear: a thinner copy just in front of the ear, on the outer face
        const inner = new THREE.Mesh(paint(segment(s.ra * 0.62, s.rb * 0.5, len * 0.9, 5), () => PINK), plain);
        inner.position.set(0, len * 0.05, 0);
        inner.scale.set(0.9, 1, 0.35);
        inner.userData.side = side;
        m.add(inner);
        m.userData.inner = inner;
      }
      this.scene.add(m);
      return { s, m, len, flat: s.flat || 1 };
    });

    const dot = (r, c) => new THREE.Mesh(paint(new THREE.OctahedronGeometry(r, 0), () => c), plain);
    this.eyeN = dot(0.02, [0.05, 0.04, 0.05]);
    this.eyeF = dot(0.02, [0.05, 0.04, 0.05]);
    this.nose = dot(0.018, [0.86, 0.45, 0.52]);
    this.scene.add(this.eyeN, this.eyeF, this.nose);

    // floor, hole, blob shadow
    const floorMap = floorTex();
    floorMap.repeat.set(12, 12);
    this.floorMap = floorMap;
    const floorGeo = paint(new THREE.PlaneGeometry(8, 8, 3, 3), () => WHITE);
    floorGeo.rotateX(-Math.PI / 2);
    floorGeo.attributes.uv.array.forEach((v, i, a) => (a[i] = v * 12));
    // the ground is drawn first and writes no depth, so the hole and the
    // shadow lie on it without fighting it for the same depth
    const floorMat = mat(floorMap);
    floorMat.depthWrite = false;
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.renderOrder = -3;
    this.scene.add(this.floor);

    const holeGeo = paint(new THREE.CircleGeometry(1, 10), () => [0, 0, 0]);
    holeGeo.rotateX(-Math.PI / 2);
    const holeMat = mat(null);
    holeMat.depthWrite = false;
    this.hole = new THREE.Mesh(holeGeo, holeMat);
    this.hole.renderOrder = -2;
    this.scene.add(this.hole);

    const shGeo = paint(new THREE.CircleGeometry(1, 8), () => [0.55, 0.55, 0.58]);
    shGeo.rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(shGeo, mat(null, 0.55));
    this.shadow.renderOrder = -1;
    this.scene.add(this.shadow);

    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (w === this.cssW && h === this.cssH) return;
    this.cssW = w; this.cssH = h;
    const pw = Math.max(64, Math.round(w / this.pixelSize));
    const ph = Math.max(48, Math.round(h / this.pixelSize));
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(pw, ph, false);
    this.shared.uSnap.value.set(pw * 0.5, ph * 0.5);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setFloorScroll(u) { this.floorMap.offset.x = u; }

  update(J, hole, clipGround = false) {
    this.rabbitMaterials.forEach(m => m.uniforms.uClipGround.value = clipGround);
    this.shadow.visible = !clipGround;
    const up = new THREE.Vector3(0, 1, 0);
    const d = new THREE.Vector3();
    const bs = J.bodyScale || 1; // the torso thins as it stretches
    for (const p of this.parts) {
      const a = J[p.s.a], b = J[p.s.b];
      d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const l = d.length();
      const rs = p.s.g === 0 ? bs : 1;
      p.m.position.set(a[0], a[1], a[2]);
      p.m.quaternion.setFromUnitVectors(up, d.normalize());
      p.m.scale.set(rs, l / p.len, rs / p.flat);
      const inner = p.m.userData.inner;
      if (inner) inner.position.z = inner.userData.side * p.s.ra * 0.55 * p.flat;
    }
    this.eyeN.position.set(...J.eyeN);
    this.eyeF.position.set(...J.eyeF);
    this.nose.position.set(...J.nose);
    const h = Math.max(0, J.pelvis[1] - 0.17);
    const sc = 0.2 * (1 - Math.min(h, 0.3));
    this.shadow.position.x = (J.pelvis[0] + J.chest[0]) / 2;
    this.shadow.scale.set(sc * 1.6, 1, sc * 0.8);
    if (hole) {
      this.hole.visible = true;
      this.hole.position.x = hole[0];
      this.hole.position.z = hole[1];
      this.hole.scale.setScalar(hole[2]);
    } else this.hole.visible = false;
  }

  render() { this.renderer.render(this.scene, this.camera); }
  dispose() { this.renderer.dispose(); this.renderer.forceContextLoss(); }
}
