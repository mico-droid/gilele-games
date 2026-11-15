// Realistic sky: gradient dome + sun disk + soft clouds, and a matching environment map so
// physically based materials get sky reflections and ambient light. Follows whatever the game sets
// in scene.background (day/night, rain…) and the sun light (direction and intensity).
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
uniform float clouds; uniform float time;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
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
  if (clouds > 0.0 && h > 0.0) {
    vec2 uv = d.xz / (h + 0.12) * 1.3 + vec2(time * 0.004, time * 0.002);
    float c = smoothstep(0.5, 0.78, fbm(uv)) * smoothstep(0.0, 0.25, h) * clouds;
    float lum = dot(horizon, vec3(0.299, 0.587, 0.114));
    vec3 cc = mix(horizon, vec3(1.0), 0.75) * (0.55 + 0.45 * min(1.0, lum * 1.6)) + sunColor * sunStrength * pow(s, 8.0) * 0.25;
    col = mix(col, cc, c * 0.85);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

function domeMaterial(cloudy) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, toneMapped: false,
    uniforms: {
      top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, ground: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunColor: { value: new THREE.Color(1, 0.96, 0.88) }, sunStrength: { value: 1 },
      clouds: { value: cloudy ? 1 : 0 }, time: { value: 0 },
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
 * addSky(world, { level }) — called by createWorld on the realistic levels.
 * level 1: sky + reflections · level 2: + clouds.
 */
export function addSky({ renderer, scene, camera, sun }, level) {
  const mat = domeMaterial(level >= 2);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat);
  dome.frustumCulled = false; dome.renderOrder = -1000; dome.raycast = () => {};
  dome.userData.sky = true;
  scene.add(dome);

  // environment (reflections + ambient) rendered once from a cloudless copy of the sky
  const base = scene.background && scene.background.isColor ? scene.background.clone() : new THREE.Color(0xaee6ff);
  const envMat = domeMaterial(false); tint(envMat.uniforms, base);
  envMat.uniforms.sunDir.value.copy(sun.position).sub(sun.target.position).normalize();
  envMat.uniforms.sunStrength.value = 0.6;
  const envScene = new THREE.Scene();
  const envDome = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), envMat);
  envScene.add(envDome);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.02, 0.1, 100).texture;
  pmrem.dispose(); envDome.geometry.dispose(); envMat.dispose();
  const baseLum = Math.max(0.05, lum(base)), ENV = 0.3;
  scene.environmentIntensity = ENV;

  const u = mat.uniforms, d = new THREE.Vector3(), last = new THREE.Color(-1, -1, -1);
  return function update(dt) {
    const bg = scene.background && scene.background.isColor ? scene.background : base;
    if (!bg.equals(last)) {
      last.copy(bg); tint(u, bg);
      // night / storm: less light from the sky
      scene.environmentIntensity = ENV * Math.min(1.3, Math.max(0.04, lum(bg) / baseLum));
    }
    d.copy(sun.position).sub(sun.target.position).normalize();
    u.sunDir.value.copy(d);
    u.sunStrength.value = Math.min(1.2, sun.visible ? sun.intensity / 2.6 : 0);
    u.time.value += dt;
    dome.position.copy(camera.position);
    const r = camera.far * 0.95; dome.scale.set(r, r, r);
  };
}
