// Céu: domo com degradê, sol com brilho, duas camadas de nuvens fofas, neblina no horizonte,
// silhueta de morros ao longe e estrelas à noite. Nos níveis com PBR também gera o mapa de ambiente
// (reflexos + luz do céu). Segue o que o jogo põe em scene.background e a direção/intensidade do sol.
import * as THREE from "./three.js";

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // always on the far plane
}`;
const FRAG = /* glsl */ `
uniform vec3 top; uniform vec3 horizon; uniform vec3 ground;
uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunStrength;
uniform float clouds; uniform float hills; uniform float time;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
/** nuvem fofa: fbm com deslocamento de domínio (fica "bolhuda" em vez de manchada) */
float puff(vec2 uv) {
  vec2 w = vec2(fbm(uv * 0.7), fbm(uv * 0.7 + 5.2));
  return fbm(uv + w * 0.9);
}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = h > 0.0 ? mix(horizon, top, pow(h, 0.55)) : mix(horizon, ground, smoothstep(0.0, 0.25, -h));
  float skyLum = dot(horizon, vec3(0.299, 0.587, 0.114));
  if (h > 0.0 && skyLum < 0.2) { // stars at night
    vec2 g = floor(d.xz / (h + 0.3) * 260.0);
    col += vec3(step(0.997, hash(g)) * (1.0 - smoothstep(0.04, 0.2, skyLum)) * smoothstep(0.05, 0.3, h) * 0.9);
  }
  float s = max(dot(d, sunDir), 0.0);
  col += sunColor * sunStrength * (pow(s, 900.0) * 6.0 + pow(s, 60.0) * 0.35 + pow(s, 6.0) * 0.08);

  // morros ao longe: duas cristas, a de trás mais clara (profundidade)
  if (hills > 0.0 && h > -0.02 && h < 0.22) {
    float a = atan(d.z, d.x);
    for (int k = 0; k < 2; k++) {
      float sc = k == 0 ? 2.6 : 1.7;
      float base = k == 0 ? 0.052 : 0.080;
      float ridge = base + fbm(vec2(a * sc + float(k) * 11.0, 0.5)) * (k == 0 ? 0.055 : 0.085);
      float m = smoothstep(ridge + 0.004, ridge - 0.004, h) * step(0.0, h);
      vec3 hc = mix(mix(ground, horizon, 0.55), horizon, k == 0 ? 0.30 : 0.55);
      col = mix(col, hc * (k == 0 ? 0.80 : 0.92), m * hills);
    }
  }

  if (clouds > 0.0 && h > 0.0) {
    float lum = dot(horizon, vec3(0.299, 0.587, 0.114));
    vec3 cc = mix(horizon, vec3(1.0), 0.86) * (0.6 + 0.4 * min(1.0, lum * 1.6)) + sunColor * sunStrength * pow(s, 8.0) * 0.3;
    vec3 shade = cc * 0.86;
    // camada alta, fina e rápida
    vec2 uv2 = d.xz / (h + 0.18) * 0.75 + vec2(time * 0.0075, time * 0.004);
    float c2 = smoothstep(0.44, 0.70, puff(uv2)) * smoothstep(0.02, 0.26, h);
    col = mix(col, mix(cc, shade, 0.30), c2 * 0.6 * clouds);
    // camada baixa, gorda e lenta (as "nuvens de desenho")
    vec2 uv = d.xz / (h + 0.10) * 1.25 + vec2(time * 0.0035, time * 0.0018);
    float f = puff(uv);
    float c = smoothstep(0.42, 0.60, f) * smoothstep(0.0, 0.13, h);
    float lit = smoothstep(0.42, 0.68, f); // topo iluminado, base sombreada
    col = mix(col, mix(shade, cc, lit), c * 0.92 * clouds);
  }
  // neblina clara coladinha no horizonte: tira o "corte" seco entre chão e céu
  col = mix(col, mix(horizon, vec3(1.0), 0.22), (1.0 - smoothstep(0.0, 0.14, abs(h))) * 0.35);
  gl_FragColor = vec4(col, 1.0);
}`;

function domeMaterial(cloudy, hilly) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, toneMapped: false,
    uniforms: {
      top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, ground: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunColor: { value: new THREE.Color(1, 0.96, 0.88) }, sunStrength: { value: 1 },
      clouds: { value: cloudy ? 1 : 0 }, hills: { value: hilly ? 1 : 0 }, time: { value: 0 },
    },
  });
}

/** Colors of the dome from the game's sky color (scene.background). */
function tint(u, base) {
  u.horizon.value.copy(base);
  const hsl = {}; base.getHSL(hsl);
  u.top.value.setHSL(hsl.h, Math.min(1, hsl.s * 1.25 + 0.05), hsl.l * 0.62);
  u.ground.value.copy(base).multiplyScalar(0.62);
}
const lum = (c) => c.r * 0.299 + c.g * 0.587 + c.b * 0.114;

/**
 * addSky(world, { level }) — chamado por createWorld.
 * level 0: céu + nuvens leves (sem reflexos) · 1: + reflexos · 2: + morros no horizonte.
 * opt: { clouds, hills } força ligar/desligar (ex.: cidade fechada não quer morros).
 */
export function addSky({ renderer, scene, camera, sun }, level, opt = {}) {
  const cloudy = opt.clouds !== false;
  const hilly = opt.hills !== undefined ? opt.hills : level >= 2;
  const mat = domeMaterial(cloudy, hilly);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat);
  dome.frustumCulled = false; dome.renderOrder = -1000; dome.raycast = () => {};
  dome.userData.sky = true;
  scene.add(dome);

  const base = scene.background && scene.background.isColor ? scene.background.clone() : new THREE.Color(0xaee6ff);
  const baseLum = Math.max(0.05, lum(base)), ENV = 0.3;

  // environment (reflexos + luz ambiente) — só nos níveis com PBR, é a parte cara
  if (level >= 1) {
    const envMat = domeMaterial(false, false); tint(envMat.uniforms, base);
    envMat.uniforms.sunDir.value.copy(sun.position).sub(sun.target.position).normalize();
    envMat.uniforms.sunStrength.value = 0.6;
    const envScene = new THREE.Scene();
    const envDome = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), envMat);
    envScene.add(envDome);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.02, 0.1, 100).texture;
    pmrem.dispose(); envDome.geometry.dispose(); envMat.dispose();
    scene.environmentIntensity = ENV;
  }

  const u = mat.uniforms, d = new THREE.Vector3(), last = new THREE.Color(-1, -1, -1);
  tint(u, base);
  return function update(dt) {
    const bg = scene.background && scene.background.isColor ? scene.background : base;
    if (!bg.equals(last)) {
      last.copy(bg); tint(u, bg);
      // night / storm: less light from the sky
      if (level >= 1) scene.environmentIntensity = ENV * Math.min(1.3, Math.max(0.04, lum(bg) / baseLum));
    }
    d.copy(sun.position).sub(sun.target.position).normalize();
    u.sunDir.value.copy(d);
    u.sunStrength.value = Math.min(1.2, sun.visible ? sun.intensity / 2.6 : 0);
    u.time.value += dt;
    dome.position.copy(camera.position);
    const r = camera.far * 0.95; dome.scale.set(r, r, r);
  };
}
