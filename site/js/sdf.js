// Ray-marched rabbit: the rig's round cones melted into one body with a smooth
// minimum (a metaball-like blend), drawn in four styles:
//   contour — white body, black ink contours (silhouette + occlusion lines)
//   pixel   — the same contours at a tiny resolution, 1-bit
//   sky     — soft white volumes fading into the blue field (ref 01)
//   gradient— orange-red → pink → white over the volume (ref 03), by nose or by view
// Contour and pixel go through a G-buffer (depth, part, light, feature) and a
// screen-space pass that finds the edges; sky and gradient shade directly.
import * as THREE from 'three';
import { SHAPES } from './rig.js';
import { SOFT_SHAPES } from './soft.js';

THREE.ColorManagement.enabled = false; // colours here are display values

const NS = Math.max(SHAPES.length, SOFT_SHAPES.length);

const COMMON = /* glsl */ `
#define NS ${NS}
uniform vec4 uA[NS];
uniform vec4 uB[NS];
uniform vec4 uC[NS];
uniform vec3 uCamPos;
uniform mat4 uCamWorld;
uniform mat4 uProjInv;
uniform vec4 uBound;
uniform vec4 uHole;
uniform float uGround; // 1: the ground plane y=0 hides what is below it (the rabbit can go down the hole); 2: also a hairline along z=0
uniform vec3 uNose;
uniform vec3 uEyeN;
uniform vec3 uEyeF;
uniform vec2 uRes;
uniform float uPixAngle;
uniform int uMode;
uniform int uPalette;
uniform vec3 uBg;
uniform float uEyeR;
in vec2 vUv;
out vec4 fragColor;

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

// iq's round cone
float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2) {
  vec3 ba = b - a;
  float l2 = dot(ba, ba);
  float rr = r1 - r2;
  float a2 = l2 - rr * rr;
  float il2 = 1.0 / l2;
  vec3 pa = p - a;
  float y = dot(pa, ba);
  float z = y - l2;
  vec3 xv = pa * l2 - ba * y;
  float x2 = dot(xv, xv);
  float y2 = y * y * l2;
  float z2 = z * z * l2;
  float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

float mapG(vec3 p, out int gid) {
  float dg[8];
  for (int i = 0; i < 8; i++) dg[i] = 1e5;
  for (int i = 0; i < NS; i++) {
    vec4 A = uA[i];
    vec4 B = uB[i];
    vec4 C = uC[i];
    if (C.z < 0.0) continue;
    int g = int(C.x + 0.5);
    float f = C.y;
    vec3 a = A.xyz;
    vec3 b = B.xyz;
    vec3 q = p;
    q.z = a.z + (p.z - a.z) * f;
    b.z = a.z + (b.z - a.z) * f;
    float d = sdRoundCone(q, a, b, A.w, B.w) / f;
    dg[g] = smin(dg[g], d, 0.022);
  }
  float best = dg[0];
  gid = 0;
  for (int i = 1; i < 8; i++) if (dg[i] < best) { best = dg[i]; gid = i; }
  float d = smin(dg[0], dg[1], 0.07);
  d = smin(d, dg[2], 0.03);
  d = smin(d, dg[3], 0.03);
  d = smin(d, dg[4], 0.04);
  d = smin(d, dg[5], 0.04);
  d = smin(d, dg[6], 0.06);
  d = smin(d, dg[7], 0.06);
  return d;
}

float map(vec3 p) { int g; return mapG(p, g); }

vec3 calcNormal(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  const float h = 0.0006;
  return normalize(k.xyy * map(p + k.xyy * h) + k.yyx * map(p + k.yyx * h) +
                   k.yxy * map(p + k.yxy * h) + k.xxx * map(p + k.xxx * h));
}

void ray(out vec3 ro, out vec3 rd) {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 v = uProjInv * vec4(ndc, 1.0, 1.0);
  v /= v.w;
  ro = uCamPos;
  rd = normalize((uCamWorld * vec4(v.xyz, 0.0)).xyz);
}

// march; returns t of hit or -1. minD/minT: closest approach, for edge coverage
float march(vec3 ro, vec3 rd, out float minD, out float minT) {
  minD = 1e5; minT = 0.0;
  vec3 oc = ro - uBound.xyz;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - uBound.w * uBound.w;
  float h = b * b - c;
  if (h < 0.0) return -1.0;
  h = sqrt(h);
  float t = max(-b - h, 0.0);
  float tEnd = -b + h;
  for (int i = 0; i < 110; i++) {
    float d = map(ro + rd * t);
    float pr = d / t;
    if (pr < minD) { minD = pr; minT = t; }
    if (d < 0.0004 * t) return t;
    t += d * 0.92;
    if (t > tEnd) break;
  }
  return -1.0;
}

// the ground plane outside the hole, when it is switched on: paper, and it hides what is under it
float groundHit(vec3 ro, vec3 rd) {
  if (uGround < 0.5 || rd.y >= 0.0 || ro.y <= 0.0) return -1.0;
  float t = -ro.y / rd.y;
  vec3 p = ro + rd * t;
  if (uHole.w > 0.5 && length(p.xz - uHole.xy) < uHole.z) return -1.0;
  return t;
}

float holeHit(vec3 ro, vec3 rd) {
  if (uHole.w < 0.5 || rd.y >= 0.0) return -1.0;
  float t = -ro.y / rd.y;
  vec3 p = ro + rd * t;
  return length(p.xz - uHole.xy) < uHole.z ? t : -1.0;
}

int feature(vec3 p) {
  if (min(length(p - uEyeN), length(p - uEyeF)) < uEyeR) return 1;
  if (length(p - uNose) < 0.021) return 2;
  return 0;
}
`;

const VERT = /* glsl */ `
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const MARCH_FRAG = /* glsl */ `
${COMMON}
const vec3 LIGHT = normalize(vec3(-0.35, 0.85, 0.55));

vec3 ramp(float t) {
  vec3 c0 = vec3(1.0, 0.22, 0.06);
  vec3 c1 = vec3(1.0, 0.36, 0.30);
  vec3 c2 = vec3(1.0, 0.56, 0.76);
  vec3 c3 = vec3(1.0, 0.86, 0.92);
  vec3 c4 = vec3(1.0, 1.0, 1.0);
  if (t < 0.25) return mix(c0, c1, t / 0.25);
  if (t < 0.5) return mix(c1, c2, (t - 0.25) / 0.25);
  if (t < 0.78) return mix(c2, c3, (t - 0.5) / 0.28);
  return mix(c3, c4, clamp((t - 0.78) / 0.22, 0.0, 1.0));
}

vec3 shade(vec3 p, vec3 rd) {
  vec3 n = calcNormal(p);
  float ndv = clamp(dot(n, -rd), 0.0, 1.0);
  float ndl = dot(n, LIGHT);
  int f = feature(p);
  if (uMode == 1) {
    // sky: white volumes dissolving into the field at their edges
    if (f == 1) return vec3(0.12, 0.55, 0.95);
    if (f == 2) return vec3(0.93, 0.18, 0.16);
    float rim = pow(1.0 - ndv, 1.25);
    vec3 col = mix(vec3(1.0), uBg, smoothstep(0.0, 1.0, rim));
    col = mix(col, uBg * 0.9, clamp(-ndl, 0.0, 1.0) * 0.35);
    return col;
  }
  // gradient
  if (f == 1) return vec3(0.23, 0.03, 0.09);
  if (f == 2) return vec3(1.0, 0.16, 0.02);
  float t;
  if (uPalette == 0) t = clamp(length(p - uNose) / 0.78, 0.0, 1.0);
  else t = clamp(pow(ndv, 1.4) * 0.95 + n.y * 0.12, 0.0, 1.0);
  vec3 col = ramp(t);
  float sh = clamp(0.5 - 0.5 * ndl, 0.0, 1.0);
  col = mix(col, vec3(0.23, 0.03, 0.09), sh * sh * 0.20);
  // Broad matte colour fields: an illustration rather than a glossy toy.
  return col;
}

void main() {
  vec3 ro, rd;
  ray(ro, rd);
  float minD, minT;
  float t = march(ro, rd, minD, minT);
  float th = holeHit(ro, rd);
  float tg = groundHit(ro, rd);
  if (tg > 0.0 && (t < 0.0 || tg < t)) { t = -1.0; th = -1.0; }
  if (uMode == 0) {
    // G-buffer: t, part, light, feature (part 9 = hole, 10 = ground plane)
    if (tg > 0.0 && t < 0.0 && th < 0.0) {
      // the ground: paper, or ink where the hairline runs along z = 0 (about one pixel wide)
      // one pixel on screen covers more ground the flatter the ray hits it
      bool line = uGround > 1.5 && abs(ro.z + rd.z * tg) < uPixAngle * tg * 1.2 / max(abs(rd.y), 0.02);
      fragColor = vec4(tg, line ? 9.0 : 10.0, 0.0, 0.0); return;
    }
    if (th > 0.0 && (t < 0.0 || th < t)) { fragColor = vec4(th, 9.0, 0.0, 0.0); return; }
    if (t < 0.0) { fragColor = vec4(-1.0, -1.0, 0.0, 0.0); return; }
    vec3 p = ro + rd * t;
    int gid; mapG(p, gid);
    vec3 n = calcNormal(p);
    fragColor = vec4(t, float(gid), dot(n, LIGHT), float(feature(p)));
    return;
  }
  vec3 holeCol = uMode == 1 ? vec3(0.02, 0.1, 0.24) : vec3(0.08, 0.01, 0.03);
  vec3 bg = uBg;
  if (th > 0.0 && (t < 0.0 || th < t)) bg = holeCol;
  if (t > 0.0) { fragColor = vec4(shade(ro + rd * t, rd), 1.0); return; }
  // edge coverage from the closest approach
  float cov = 1.0 - smoothstep(0.0, uPixAngle * 1.5, minD);
  if (cov > 0.0) {
    vec3 col = shade(ro + rd * minT, rd);
    fragColor = vec4(mix(bg, col, cov), 1.0);
    return;
  }
  fragColor = vec4(bg, 1.0);
}
`;

const CONTOUR_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uG;
uniform float uW;
uniform vec3 uInk;
uniform vec3 uPaper;
in vec2 vUv;
out vec4 fragColor;

bool edge(vec4 c, vec4 n) {
  bool ch = c.x > 0.0 && c.y < 9.5, nh = n.x > 0.0 && n.y < 9.5; // the ground plane counts as nothing
  if (ch != nh) return true;
  if (!ch) return false;
  if (c.y > 9.5 && n.y > 9.5) return false; // ground against ground: no line
  if (c.y > 8.5 || n.y > 8.5) return abs(c.y - n.y) > 0.5;
  float dd = abs(c.x - n.x);
  if (dd > 0.05) return true;
  if (abs(c.y - n.y) > 0.5 && dd > 0.022) return true;
  return false;
}

void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  ivec2 sz = textureSize(uG, 0);
  vec4 c = texelFetch(uG, px, 0);
  if (c.y > 9.5) { fragColor = vec4(uPaper, 1.0); return; } // ground plane: paper, no edges drawn on it
  if (c.y > 8.5 || c.w > 0.5) { fragColor = vec4(uInk, 1.0); return; }
  float ink = 0.0;
  for (int r = 1; r <= 2; r++) {
    float rad = uW * float(r) / 2.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7853982 + float(r) * 0.39;
      ivec2 o = ivec2(round(vec2(cos(a), sin(a)) * rad));
      ivec2 q = clamp(px + o, ivec2(0), sz - 1);
      if (edge(c, texelFetch(uG, q, 0))) ink += r == 1 ? 0.5 : 0.25;
    }
  }
  fragColor = vec4(mix(uPaper, uInk, clamp(ink, 0.0, 1.0)), 1.0);
}
`;

const PIXEL_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uG;
uniform vec3 uInk;
uniform vec3 uPaper;
in vec2 vUv;
out vec4 fragColor;
void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  ivec2 sz = textureSize(uG, 0);
  vec4 c = texelFetch(uG, px, 0);
  if (c.x < 0.0) { fragColor = vec4(uPaper, 1.0); return; }
  if (c.y > 9.5) { fragColor = vec4(uPaper, 1.0); return; }
  if (c.y > 8.5) { fragColor = vec4(uInk, 1.0); return; }
  if (c.w > 0.5 && c.w < 1.5) { fragColor = vec4(uPaper, 1.0); return; }
  ivec2 nb[4] = ivec2[4](ivec2(1, 0), ivec2(-1, 0), ivec2(0, 1), ivec2(0, -1));
  for (int i = 0; i < 4; i++) {
    vec4 n = texelFetch(uG, clamp(px + nb[i], ivec2(0), sz - 1), 0);
    if (n.x > 0.0 && n.y < 8.5 && ((n.x < c.x - 0.025 && abs(n.y - c.y) > 0.5) || n.x < c.x - 0.07)) {
      fragColor = vec4(uPaper, 1.0); return;
    }
  }
  fragColor = vec4(uInk, 1.0);
}
`;

const hex = (h) => new THREE.Color(h);

export class SdfView {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{style:'contour'|'pixel'|'sky'|'gradient', bg?:string, pixelSize?:number, palette?:number}} opts
   */
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.style = opts.style;
    this.shapes = ['sky', 'gradient'].includes(this.style) ? SOFT_SHAPES : SHAPES;
    this.pixelSize = opts.pixelSize || 5;
    this.maxDpr = opts.maxDpr; // cap for big canvases: every pixel is a ray
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: false });
    this.renderer.setClearColor(0xffffff, 1);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // colours below are display values
    this.camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.PlaneGeometry(2, 2);

    const zeros = () => Array.from({ length: NS }, () => new THREE.Vector4());
    this.uniforms = {
      uA: { value: zeros() }, uB: { value: zeros() }, uC: { value: zeros() },
      uCamPos: { value: new THREE.Vector3() },
      uCamWorld: { value: new THREE.Matrix4() },
      uProjInv: { value: new THREE.Matrix4() },
      uBound: { value: new THREE.Vector4(0, 0.3, 0, 1) },
      uHole: { value: new THREE.Vector4(0, 0, 0, 0) },
      uGround: { value: opts.ground ? 1 : 0 },
      uNose: { value: new THREE.Vector3() },
      uEyeN: { value: new THREE.Vector3() },
      uEyeF: { value: new THREE.Vector3() },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPixAngle: { value: 0.001 },
      uMode: { value: 0 },
      uPalette: { value: opts.palette || 0 },
      uBg: { value: hex(opts.bg || '#ffffff') },
      uEyeR: { value: opts.style === 'pixel' ? 0.03 : 0.019 },
    };
    this.uniforms.uC.value.forEach(v => v.z = -1);
    this.shapes.forEach((s, i) => this.uniforms.uC.value[i].set(s.g, s.flat || 1, 0, 0));
    this.uniforms.uMode.value = { contour: 0, pixel: 0, sky: 1, gradient: 2 }[this.style];

    this.marchMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: MARCH_FRAG, uniforms: this.uniforms,
      depthTest: false, depthWrite: false,
    });
    this.marchScene = new THREE.Scene();
    this.marchScene.add(new THREE.Mesh(geo, this.marchMat));

    if (this.style === 'contour' || this.style === 'pixel') {
      this.target = new THREE.WebGLRenderTarget(1, 1, {
        type: THREE.FloatType, format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false,
      });
      this.postUniforms = {
        uG: { value: this.target.texture },
        uW: { value: 3 },
        uInk: { value: hex('#000000') },
        uPaper: { value: hex(opts.bg || '#ffffff') },
      };
      this.postMat = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3, vertexShader: VERT,
        fragmentShader: this.style === 'contour' ? CONTOUR_FRAG : PIXEL_FRAG,
        uniforms: this.postUniforms, depthTest: false, depthWrite: false,
      });
      this.postScene = new THREE.Scene();
      this.postScene.add(new THREE.Mesh(geo, this.postMat));
    }
    this.resize();
  }

  setPalette(i) { this.uniforms.uPalette.value = i; }
  setBg(c) { this.uniforms.uBg.value.set(c); if (this.postUniforms) this.postUniforms.uPaper.value.set(c); }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (w === this.cssW && h === this.cssH) return;
    this.cssW = w; this.cssH = h;
    if (this.style === 'pixel') {
      const pw = Math.max(16, Math.round(w / this.pixelSize));
      const ph = Math.max(12, Math.round(h / this.pixelSize));
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(pw, ph, false);
      this.target.setSize(pw, ph);
      this.uniforms.uRes.value.set(pw, ph);
    } else {
      const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr || (this.style === 'contour' ? 2 : 1.5));
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(w, h, false);
      const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
      if (this.target) this.target.setSize(bw, bh);
      this.uniforms.uRes.value.set(bw, bh);
      if (this.postUniforms) this.postUniforms.uW.value = 1.7 * dpr;
    }
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** @param J joints from rig.solve(); hole: [x, z, r] or null */
  update(J, hole) {
    const u = this.uniforms;
    let cx = 0, cy = 0, cz = 0, n = 0;
    this.shapes.forEach((s, i) => {
      const a = J[s.a], b = J[s.b];
      u.uA.value[i].set(a[0], a[1], a[2], s.ra);
      u.uB.value[i].set(b[0], b[1], b[2], s.rb);
      cx += a[0] + b[0]; cy += a[1] + b[1]; cz += a[2] + b[2]; n += 2;
    });
    cx /= n; cy /= n; cz /= n;
    let rad = 0;
    this.shapes.forEach((s) => {
      for (const k of [s.a, s.b]) {
        const p = J[k];
        rad = Math.max(rad, Math.hypot(p[0] - cx, p[1] - cy, p[2] - cz) + Math.max(s.ra, s.rb) + 0.05);
      }
    });
    u.uBound.value.set(cx, cy, cz, rad);
    u.uNose.value.set(...J.nose);
    u.uEyeN.value.set(...J.eyeN);
    u.uEyeF.value.set(...J.eyeF);
    if (hole) u.uHole.value.set(hole[0], hole[1], hole[2], 1);
    else u.uHole.value.w = 0;
  }

  render() {
    const cam = this.camera;
    cam.updateMatrixWorld();
    const u = this.uniforms;
    u.uCamPos.value.copy(cam.position);
    u.uCamWorld.value.copy(cam.matrixWorld);
    u.uProjInv.value.copy(cam.projectionMatrixInverse);
    u.uPixAngle.value = (2 * Math.tan((cam.fov * Math.PI) / 360)) / u.uRes.value.y;
    if (this.target) {
      this.renderer.setRenderTarget(this.target);
      this.renderer.render(this.marchScene, this.quadCam);
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.postScene, this.quadCam);
    } else {
      this.renderer.render(this.marchScene, this.quadCam);
    }
  }

  dispose() { this.renderer.dispose(); }
}
