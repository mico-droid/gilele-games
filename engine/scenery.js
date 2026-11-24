// Cenário low-poly reutilizável: terreno com relevo, natureza (árvores, flores, pedras, moitas, grama,
// água), caminhos curvos, pontes, escadas, construções pequenas e objetos que se mexem ou reagem
// quando o jogador chega perto.
//
// Tudo é feito com poucas geometrias compartilhadas + InstancedMesh, para não pesar no celular:
//   const sc = createScenery(world, phys);
//   sc.ground({ size: 220 }); sc.hills(); sc.scatter({ x0: -90, z0: -90, x1: 90, z1: 90 });
//   world.onUpdate((dt) => sc.update(dt, me.x, me.y, me.z));
import * as THREE from "./three.js";
import { getMat, part, GEO, isMobile } from "./core.js";
import { Audio } from "./audio.js";

const { GFX } = THREE;
const rnd = (s) => { let x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };
const lerp = (a, b, k) => a + (b - a) * k;

// ---------------------------------------------------------------- geometrias compartilhadas
/** vertexColors + instanceColor só funcionam se a geometria tiver o atributo "color". */
function withWhite(g) {
  if (!g.attributes.color) {
    const n = g.attributes.position.count, a = new Float32Array(n * 3).fill(1);
    g.setAttribute("color", new THREE.BufferAttribute(a, 3));
  }
  return g;
}
const G = {
  get cone() { return (G._cone ||= new THREE.ConeGeometry(1, 1, 6)); },
  get cone8() { return (G._cone8 ||= new THREE.ConeGeometry(1, 1, 8)); },
  get ico() { return (G._ico ||= new THREE.IcosahedronGeometry(1, 0)); },
  get icoC() { return (G._icoC ||= withWhite(new THREE.IcosahedronGeometry(1, 0))); },
  get sph() { return (G._sph ||= new THREE.IcosahedronGeometry(1, 1)); },
  get dome() { return (G._dome ||= new THREE.SphereGeometry(1, 28, 14)); },
  get plane() { return (G._plane ||= new THREE.PlaneGeometry(1, 1)); },
  get cyl() { return GEO.cyl; },
  get box() { return GEO.box; },
  /** Tufo de grama: 3 lâminas cruzadas (1 draw call quando instanciado). */
  get blade() {
    if (!G._blade) {
      const pts = [];
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI, c = Math.cos(a) * 0.34, s = Math.sin(a) * 0.34;
        // lâmina: quadrilátero que afina pra ponta (dois triângulos) — parece grama, não pinheiro
        const x0 = -c, z0 = -s, x1 = c, z1 = s, tx0 = -c * 0.45, tz0 = -s * 0.45, tx1 = c * 0.45, tz1 = s * 0.45;
        pts.push(x0, 0, z0, x1, 0, z1, tx1, 1, tz1);
        pts.push(x0, 0, z0, tx1, 1, tz1, tx0, 1, tz0);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      g.computeVertexNormals();
      G._blade = withWhite(g);
    }
    return G._blade;
  },
};

/** Material opaco simples, com leve variação de brilho quando o PBR está ligado. */
function mat(color, o = {}) {
  const m = GFX.pbr
    ? new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.9, metalness: o.metal ?? 0, side: o.side })
    : new THREE.MeshLambertMaterial({ color, side: o.side });
  if (o.flat) m.flatShading = true;
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.emissiveIntensity ?? 0.6; }
  if (o.transparent) { m.transparent = true; m.opacity = o.opacity ?? 0.8; }
  return m;
}

// ---------------------------------------------------------------- paleta alegre (infantil)
export const PAL = {
  grass: ["#7ed957", "#8fe063", "#6cc94a", "#a7e86f"],
  leaf: ["#2fa84f", "#37b857", "#52c66b", "#1f9444", "#67d17c"],
  bark: ["#8b5a2b", "#7a4e24", "#9b6a35"],
  rock: ["#9aa5b1", "#8793a1", "#b0bac4"],
  flower: ["#ff5c7a", "#ffd23f", "#ff8c42", "#c77dff", "#56cfe1", "#ffffff", "#ff9ff3"],
  wood: ["#c08552", "#a9714b", "#d2a06a"],
  roof: ["#e4572e", "#f2a65a", "#6ab7c9", "#b05d8c"],
};
const pick = (arr, s) => arr[Math.floor(rnd(s) * arr.length) % arr.length];

// ================================================================= createScenery
export function createScenery(world, phys, opt = {}) {
  const scene = world.scene;
  const live = [];          // { r2, fn(dt, d2, px,py,pz) } animados perto do jogador
  const always = [];        // animados sempre (nuvens, pássaros, moinho)
  const root = new THREE.Group(); scene.add(root);
  const light = GFX.level;  // 0 leve · 1 equilibrado · 2 bonito
  const DENS = opt.density ?? (isMobile ? 0.6 : 1);

  // ---------------------------------------------------------------- terreno
  /**
   * Chão com pequenas variações de altura (visual) + colisão plana em y=0.
   * O relevo é suave (±amp) para o personagem não "flutuar": dá vida sem quebrar a física.
   */
  function ground({ size = 220, color = 0x67c23a, y = 0, amp = 0.32, patches = true, collide = true } = {}) {
    const seg = light === 0 ? 32 : 72;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    const p = geo.attributes.position, n = p.count;
    const f1 = (Math.PI * 2 * 3) / size, f2 = (Math.PI * 2 * 8) / size;   // ondulação suave, sem facetar
    const col = new Float32Array(n * 3), c = new THREE.Color();
    const base = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), z = p.getY(i);
      const h = (Math.sin(x * f1 * 1.7) * Math.cos(z * f1 * 1.3) + Math.sin(x * f1 * 0.6 + z * f1 * 0.9) * 0.8) * amp;
      p.setZ(i, h);
      // manchas de tom (grama mais clara/escura) — tira o aspecto de tapete chapado
      const k = patches ? 0.80 + (Math.sin(x * f1) * Math.cos(z * f1 * 0.83) * 0.5 + 0.5) * 0.3 + (Math.sin(x * f2 + z * f2 * 0.7) * 0.5 + 0.5) * 0.14 : 1;
      c.copy(base).multiplyScalar(k); c.toArray(col, i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat(0xffffff, { rough: 0.98 }));
    m.material.vertexColors = true;
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true;
    root.add(m);
    if (collide && phys) phys.addBox({ x: 0, y: y - 0.5, z: 0, w: size, h: 1, d: size, mesh: false });
    return m;
  }

  /** Morros decorativos no horizonte (sem colisão): dá profundidade e fecha o cenário vazio. */
  function hills({ radius = 150, count = 14, color = 0x4e9e3e, height = 18, y = -1 } = {}) {
    const g = new THREE.Group(); root.add(g);
    const n = Math.round(count * (light === 0 ? 0.6 : 1));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd(i) * 0.3;
      const r = radius * (0.85 + rnd(i + 9) * 0.4);
      const h = height * (0.5 + rnd(i + 3) * 0.8), w = h * (2.6 + rnd(i + 7) * 1.6);
      const col = new THREE.Color(color).lerp(new THREE.Color(0x8fc6e8), 0.18 + rnd(i + 5) * 0.25);
      const m = new THREE.Mesh(G.cone, mat(col, { flat: true, rough: 1 }));
      m.scale.set(w, h, w); m.position.set(Math.cos(a) * r, y + h / 2, Math.sin(a) * r);
      m.rotation.y = rnd(i + 2) * 3; m.receiveShadow = false;
      g.add(m);
    }
    return g;
  }

  /** Monte com colisão: cúpula visual + degraus invisíveis (rise 0.4 ≤ stepUp). Dá relevo pisável. */
  function mound({ x = 0, z = 0, r = 8, h = 2.4, color = 0x6cc94a } = {}) {
    const dome = new THREE.Mesh(G.dome, mat(color, { rough: 1 }));
    dome.scale.set(r, h, r); dome.position.set(x, 0, z); dome.receiveShadow = true; root.add(dome);
    const steps = Math.max(2, Math.round(h / 0.4));
    for (let i = 0; i < steps; i++) {
      const k = (i + 1) / steps, rr = r * Math.sqrt(Math.max(0.02, 1 - k * k)) * 1.02;
      phys.addBox({ x, y: (h * k) / 2, z, w: rr * 2, h: h * k, d: rr * 2, mesh: false });
    }
    return { dome, top: h, x, z, r };
  }

  /** Água com ondinha (shader leve) — decorativa ou com caixa "kill" por baixo. */
  function water({ size = 400, y = -1.2, color = 0x2aa7df, kill = false, waves = true } = {}) {
    const m = mat(color, { rough: 0.42, metal: 0, transparent: true, opacity: 0.95 });
    if (GFX.pbr) { m.envMapIntensity = 0.22; m.metalness = 0.0; m.roughness = 0.42; }
    const u = { t: { value: 0 } };
    if (waves && light > 0) {
      m.onBeforeCompile = (sh) => {
        sh.uniforms.t = u.t;
        sh.vertexShader = "uniform float t;\n" + sh.vertexShader.replace("#include <begin_vertex>",
          "#include <begin_vertex>\ntransformed.z += sin(position.x*0.12 + t*1.1)*0.18 + cos(position.y*0.17 - t*0.8)*0.14;");
      };
    }
    const seg = waves && light > 0 ? 48 : 1;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size, seg, seg), m);
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; mesh.receiveShadow = false;
    root.add(mesh);
    if (kill && phys) phys.addBox({ x: 0, y: y - 1.2, z: 0, w: size, h: 1, d: size, type: "kill", mesh: false });
    always.push((dt) => { u.t.value += dt; });
    return mesh;
  }

  // ---------------------------------------------------------------- natureza
  /** Árvore low-poly: tronco + copa em cones/esferas. kind: "round" | "pine" | "palm". */
  function tree(x, z, { s = 1, y = 0, kind = "round", seed = x * 3 + z, collide = true } = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
    g.rotation.y = rnd(seed) * 6.28; root.add(g);
    const bark = pick(PAL.bark, seed), leaf = pick(PAL.leaf, seed + 4);
    if (kind === "pine") {
      part(0.5, 2.0, 0.5, bark, 0, 1.0, 0, g);
      [[2.8, 1.8, 2.2], [2.1, 1.6, 3.4], [1.3, 1.4, 4.5]].forEach(([w, h, yy]) => {
        const m = new THREE.Mesh(G.cone, mat(leaf, { flat: true })); m.scale.set(w, h, w); m.position.y = yy; m.castShadow = true; g.add(m);
      });
    } else if (kind === "palm") {
      const tr = new THREE.Mesh(G.cyl, mat(bark, { flat: true })); tr.scale.set(0.26, 5, 0.26); tr.position.y = 2.5; tr.rotation.z = 0.08; tr.castShadow = true; g.add(tr);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.28;
        const l = new THREE.Mesh(G.cone, mat(leaf, { flat: true }));
        l.scale.set(0.55, 2.6, 0.55); l.position.set(Math.cos(a) * 1.1, 5.1, Math.sin(a) * 1.1);
        l.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15); l.castShadow = true; g.add(l);
      }
    } else {
      part(0.55, 2.2, 0.55, bark, 0, 1.1, 0, g);
      const blobs = light === 0 ? 1 : 3;
      const put = (r, yy, dx, dz, c) => { const m = new THREE.Mesh(G.ico, mat(c, { flat: true })); m.scale.setScalar(r); m.position.set(dx, yy, dz); m.castShadow = true; g.add(m); };
      put(1.7, 3.1, 0, 0, leaf);
      if (blobs > 1) { put(1.15, 3.7, 0.9, 0.5, pick(PAL.leaf, seed + 1)); put(1.0, 2.8, -0.95, -0.5, pick(PAL.leaf, seed + 2)); }
    }
    if (collide && phys) phys.addBox({ x, y: y + 1.2 * s, z, w: 0.7 * s, h: 2.4 * s, d: 0.7 * s, mesh: false });
    // balança no vento
    if (light > 0) always.push((dt, t) => { g.rotation.z = Math.sin(t * 1.1 + seed) * 0.022; });
    return g;
  }

  /** Pedras arredondadas (sem colisão por padrão: são enfeite). */
  function rock(x, z, { s = 1, y = 0, seed = x * 7 + z, collide = false } = {}) {
    const m = new THREE.Mesh(G.ico, mat(pick(PAL.rock, seed), { flat: true, rough: 0.95 }));
    m.scale.set(s * (0.7 + rnd(seed) * 0.6), s * (0.5 + rnd(seed + 1) * 0.5), s * (0.7 + rnd(seed + 2) * 0.6));
    m.position.set(x, y + s * 0.25, z); m.rotation.set(rnd(seed + 3) * 3, rnd(seed + 4) * 3, rnd(seed + 5) * 3);
    m.castShadow = true; m.receiveShadow = true; root.add(m);
    if (collide && phys) phys.addBox({ x, y: y + s * 0.4, z, w: s * 1.3, h: s * 0.8, d: s * 1.3, mesh: false });
    return m;
  }

  function bush(x, z, { s = 1, y = 0, seed = x * 11 + z } = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); root.add(g);
    const c = pick(PAL.leaf, seed);
    [[0, 0.45, 0, 0.6], [0.5, 0.35, 0.2, 0.45], [-0.45, 0.3, -0.2, 0.4]].forEach(([dx, yy, dz, r]) => {
      const m = new THREE.Mesh(G.ico, mat(c, { flat: true })); m.scale.setScalar(r); m.position.set(dx, yy, dz); m.castShadow = true; g.add(m);
    });
    if (light > 0) always.push((dt, t) => { g.rotation.z = Math.sin(t * 1.6 + seed) * 0.04; });
    return g;
  }

  /**
   * Flores e grama em massa (InstancedMesh: milhares cabem em 2 draw calls).
   * Volta { grass, flowers } — balançam no vento e abrem quando o jogador passa perto.
   */
  function meadow({ area, n = 500, flowers = 0.25, y = 0, test } = {}) {
    const N = Math.max(10, Math.round(n * DENS * (light === 0 ? 0.45 : 1)));
    const nf = Math.round(N * flowers), ng = N - nf;
    const [x0, z0, x1, z1] = area;
    const made = [];
    const grassMat = mat(0x6fc64a, { side: THREE.DoubleSide, rough: 1 }); grassMat.vertexColors = true;
    const gm = new THREE.InstancedMesh(G.blade, grassMat, ng);
    gm.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(ng * 3), 3);
    const d = new THREE.Object3D(), col = new THREE.Color();
    let gi = 0;
    for (let i = 0; i < ng * 4 && gi < ng; i++) {
      const x = lerp(x0, x1, rnd(i * 1.7)), z = lerp(z0, z1, rnd(i * 2.3 + 5));
      if (test && !test(x, z)) continue;
      d.position.set(x, y, z); d.rotation.y = rnd(i) * 6.28;
      const s = 0.9 + rnd(i + 2) * 0.6; d.scale.set(s, 0.5 + rnd(i + 3) * 0.45, s);
      d.updateMatrix(); gm.setMatrixAt(gi, d.matrix);
      col.set(PAL.grass[i % PAL.grass.length]).multiplyScalar(0.95 + rnd(i + 6) * 0.35); col.toArray(gm.instanceColor.array, gi * 3);
      gi++;
    }
    gm.count = gi; gm.castShadow = false; gm.receiveShadow = false; gm.frustumCulled = false; root.add(gm); made.push(gm);

    // flores: caule + pétala (2 instâncias por flor, cores alegres)
    if (nf > 0) {
      const stem = new THREE.InstancedMesh(G.blade, mat(0x5fbe3c, { side: THREE.DoubleSide }), nf);
      const headMat = mat(0xffffff, { rough: 0.6 }); headMat.vertexColors = true;
      const head = new THREE.InstancedMesh(G.icoC, headMat, nf);
      head.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nf * 3), 3);
      let fi = 0;
      for (let i = 0; i < nf * 4 && fi < nf; i++) {
        const x = lerp(x0, x1, rnd(i * 3.1 + 11)), z = lerp(z0, z1, rnd(i * 4.3 + 2));
        if (test && !test(x, z)) continue;
        const hh = 0.85 + rnd(i + 1) * 0.5;
        d.position.set(x, y, z); d.rotation.y = rnd(i) * 6.28; d.scale.set(0.35, hh, 0.35); d.updateMatrix(); stem.setMatrixAt(fi, d.matrix);
        d.position.set(x, y + hh * 0.95, z); d.rotation.set(0, rnd(i) * 6.28, 0);
        const fs = 0.12 + rnd(i + 4) * 0.07; d.scale.set(fs, fs * 0.55, fs); d.updateMatrix(); head.setMatrixAt(fi, d.matrix);
        col.set(pick(PAL.flower, i)); col.toArray(head.instanceColor.array, fi * 3);
        fi++;
      }
      stem.count = head.count = fi; stem.frustumCulled = head.frustumCulled = false;
      head.castShadow = light > 1;
      root.add(stem, head); made.push(stem, head);
    }
    // vento: gira levemente o conjunto todo (barato) — grama "viva" sem custo por instância
    if (light > 0) always.push((dt, t) => { const s = 1 + Math.sin(t * 1.9) * 0.03; gm.scale.set(1, s, 1); });
    return made;
  }

  /** Espalha natureza variada numa área, evitando o que já existe (avoid). */
  function scatter({ area, trees = 18, rocks = 14, bushes = 14, grass = 14, flowers = 0.3, y = 0, avoid = [], kinds = ["round", "round", "pine"] } = {}) {
    const [x0, z0, x1, z1] = area;
    // `grass` = tufos por 100 m² (assim a densidade não muda com o tamanho do mapa)
    const nGrass = Math.round((Math.abs(x1 - x0) * Math.abs(z1 - z0)) / 100 * grass);
    const free = (x, z, r = 2.5) => {
      for (const a of avoid) { const rr = (a.r || 4) + r; if ((x - a.x) ** 2 + (z - a.z) ** 2 < rr * rr) return false; }
      return true;
    };
    let s = 0;
    const place = (n, fn, r) => {
      for (let i = 0; i < n * DENS * 4 && n > 0; i++) {
        const x = lerp(x0, x1, rnd(s * 1.3 + 0.1)), z = lerp(z0, z1, rnd(s * 2.7 + 0.4)); s++;
        if (!free(x, z, r)) continue;
        fn(x, z, s); avoid.push({ x, z, r }); n--;
      }
    };
    place(trees, (x, z, i) => tree(x, z, { y, s: 0.8 + rnd(i) * 0.6, kind: kinds[i % kinds.length], seed: i }), 3.2);
    place(bushes, (x, z, i) => bush(x, z, { y, s: 0.8 + rnd(i) * 0.7, seed: i }), 1.6);
    place(rocks, (x, z, i) => rock(x, z, { y, s: 0.6 + rnd(i) * 1.1, seed: i }), 1.4);
    if (grass) meadow({ area, n: nGrass, flowers, y, test: (x, z) => free(x, z, 0.6) });
  }

  // ---------------------------------------------------------------- construções e caminhos
  /** Lago redondo com margem de areia e pedras — fica bonito no meio do gramado. */
  function pond({ x = 0, z = 0, r = 7, y = -0.3, color = 0x2aa7df, rocks: nr = 5 } = {}) {
    const sand = new THREE.Mesh(new THREE.CircleGeometry(r * 1.22, 28), mat(0xe8d9a8, { rough: 1 }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(x, 0.02, z); sand.receiveShadow = true; root.add(sand);
    const m = mat(color, { rough: 0.42, transparent: true, opacity: 0.95 });
    if (GFX.pbr) { m.envMapIntensity = 0.22; m.metalness = 0; }
    const u = { t: { value: 0 } };
    if (light > 0) m.onBeforeCompile = (sh) => {
      sh.uniforms.t = u.t;
      sh.vertexShader = "uniform float t;\n" + sh.vertexShader.replace("#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.z += sin(position.x*0.5 + t*1.3)*0.08 + cos(position.y*0.6 - t)*0.07;");
    };
    const w = new THREE.Mesh(new THREE.CircleGeometry(r, 28, 1), m);
    w.rotation.x = -Math.PI / 2; w.position.set(x, y, z); root.add(w);
    for (let i = 0; i < nr; i++) { const a = (i / nr) * 6.28 + rnd(i); rock(x + Math.cos(a) * r * 1.18, z + Math.sin(a) * r * 1.18, { s: 0.5 + rnd(i) * 0.6, seed: i + x }); }
    always.push((dt) => { u.t.value += dt; });
    return w;
  }

  /** Caminho curvo de terra/pedra sobre o chão (sem colisão, só visual). points = [[x,z], ...] */
  function path(points, { width = 3, color = 0xd8c08a, y = 0.03 } = {}) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, y, z)));
    const n = Math.max(8, points.length * 10);
    const pos = [], idx = [], up = new THREE.Vector3(0, 1, 0), t = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      const k = i / n, p = curve.getPoint(k);
      curve.getTangent(k, t); s.crossVectors(t, up).normalize().multiplyScalar(width / 2 * (0.85 + Math.sin(k * 14) * 0.15));
      pos.push(p.x - s.x, y, p.z - s.z, p.x + s.x, y, p.z + s.z);
      if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat(color, { rough: 1 })); m.receiveShadow = true; root.add(m);
    return m;
  }

  /** Ponte de madeira com tábuas, corrimão e colisão. */
  function bridge(from, to, { width = 4, y = 0.4, rails = true } = {}) {
    const dx = to[0] - from[0], dz = to[1] - from[1], len = Math.hypot(dx, dz), a = Math.atan2(dx, dz);
    const g = new THREE.Group(); g.position.set((from[0] + to[0]) / 2, y, (from[1] + to[1]) / 2); g.rotation.y = a; root.add(g);
    const planks = Math.max(4, Math.round(len / 0.9));
    for (let i = 0; i < planks; i++) {
      const z = -len / 2 + (i + 0.5) * (len / planks);
      part(width, 0.18, len / planks * 0.86, pick(PAL.wood, i), 0, 0, z, g);
    }
    if (rails) for (const sx of [-1, 1]) {
      part(0.14, 0.14, len, "#8b5a2b", sx * width / 2, 0.95, 0, g);
      for (let i = 0; i <= 4; i++) part(0.16, 1.0, 0.16, "#8b5a2b", sx * width / 2, 0.45, -len / 2 + (i / 4) * len, g);
    }
    if (phys) {
      phys.addBox({ x: g.position.x, y: y - 0.1, z: g.position.z, w: Math.abs(dx) + width * Math.abs(Math.cos(a)) + 0.6, h: 0.4, d: Math.abs(dz) + width * Math.abs(Math.sin(a)) + 0.6, mesh: false });
    }
    return g;
  }

  /** Escada com colisão degrau a degrau (rise ≤ stepUp, dá para subir andando). */
  function stairs({ x = 0, z = 0, ry = 0, steps = 6, rise = 0.45, run = 1.1, width = 4, color = "#b9b2a4" } = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    for (let i = 0; i < steps; i++) {
      const h = (i + 1) * rise, d = run;
      part(width, h, d, color, 0, h / 2, -(i + 0.5) * run, g);
      const c = Math.cos(ry), s = Math.sin(ry), oz = -(i + 0.5) * run;
      if (phys) phys.addBox({ x: x + s * oz, y: h / 2, z: z + c * oz, w: width, h, d: run, mesh: false });
    }
    return { g, top: steps * rise, depth: steps * run };
  }

  /** Casinha / cabana low-poly com telhado colorido (com colisão). */
  function hut({ x = 0, z = 0, ry = 0, w = 5, d = 5, h = 3.2, wall = "#fff1d6", roof, door = true, seed = x + z } = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    const rc = roof || pick(PAL.roof, seed);
    part(w, h, d, wall, 0, h / 2, 0, g);
    const r = new THREE.Mesh(G.cone, mat(rc, { flat: true, rough: 0.85 }));
    r.scale.set(Math.max(w, d) * 0.86, h * 0.62, Math.max(w, d) * 0.86); r.position.y = h + h * 0.31; r.rotation.y = Math.PI / 4; r.castShadow = true; g.add(r);
    if (door) {
      part(1.1, 1.9, 0.12, "#8b5a2b", 0, 0.95, d / 2 + 0.02, g, false);
      part(0.12, 0.12, 0.08, "#facc15", 0.35, 0.95, d / 2 + 0.1, g, false);
    }
    [[-w / 4, w / 4]].forEach(() => {
      for (const sx of [-1, 1]) {
        part(0.95, 0.95, 0.1, "#bfe6ff", sx * w / 4, h * 0.62, d / 2 + 0.02, g, false);
        part(1.05, 0.12, 0.14, "#ffffff", sx * w / 4, h * 0.62 + 0.52, d / 2 + 0.04, g, false);
      }
    });
    if (phys) phys.addBox({ x, y: h / 2, z, w: Math.abs(Math.cos(ry)) * w + Math.abs(Math.sin(ry)) * d, h, d: Math.abs(Math.cos(ry)) * d + Math.abs(Math.sin(ry)) * w, mesh: false });
    return g;
  }

  /** Cerca de madeira entre dois pontos (enfeite, sem colisão). */
  function fence(from, to, { posts = 0, color = "#c08552", h = 1.1 } = {}) {
    const dx = to[0] - from[0], dz = to[1] - from[1], len = Math.hypot(dx, dz);
    const n = posts || Math.max(2, Math.round(len / 2.2));
    const g = new THREE.Group(); root.add(g);
    for (let i = 0; i <= n; i++) {
      const k = i / n; part(0.16, h, 0.16, color, from[0] + dx * k, h / 2, from[1] + dz * k, g);
    }
    const mid = new THREE.Group(); mid.position.set((from[0] + to[0]) / 2, 0, (from[1] + to[1]) / 2); mid.rotation.y = Math.atan2(dx, dz); g.add(mid);
    part(0.07, 0.14, len, color, 0, h * 0.75, 0, mid); part(0.07, 0.14, len, color, 0, h * 0.42, 0, mid);
    return g;
  }

  // ---------------------------------------------------------------- vivo: se mexe / reage
  /** Moinho que gira devagar — marco visual para cenários vazios. */
  function windmill({ x = 0, z = 0, ry = 0, s = 1 } = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.scale.setScalar(s); root.add(g);
    part(2.6, 7, 2.6, "#f6e7cf", 0, 3.5, 0, g);
    const r = new THREE.Mesh(G.cone, mat("#e4572e", { flat: true })); r.scale.set(2.6, 2, 2.6); r.position.y = 8; r.rotation.y = Math.PI / 4; r.castShadow = true; g.add(r);
    const hub = new THREE.Group(); hub.position.set(0, 6, 1.5); g.add(hub);
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Group(); b.rotation.z = (i / 4) * 6.28; hub.add(b);
      part(0.25, 3.4, 0.14, "#8b5a2b", 0, 1.7, 0, b); part(0.9, 2.6, 0.08, "#fffaf0", 0.45, 2.0, 0.06, b);
    }
    if (phys) phys.addBox({ x, y: 3.5, z, w: 2.6 * s, h: 7 * s, d: 2.6 * s, mesh: false });
    always.push((dt) => { hub.rotation.z += dt * 0.7; });
    return g;
  }

  /** Balões subindo e descendo devagar. */
  function balloons({ x = 0, z = 0, n = 3, y = 6, spread = 4 } = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    const list = [];
    for (let i = 0; i < n; i++) {
      const b = new THREE.Group();
      b.position.set((rnd(i) - 0.5) * spread, y + rnd(i + 3) * 2, (rnd(i + 7) - 0.5) * spread); g.add(b);
      const m = new THREE.Mesh(G.sph, mat(pick(PAL.flower, i + 2), { rough: 0.35 })); m.scale.set(0.8, 1.05, 0.8); b.add(m);
      part(0.04, 1.6, 0.04, "#ffffff", 0, -1.3, 0, b, false);
      list.push({ b, y0: b.position.y, ph: rnd(i) * 6.28 });
    }
    always.push((dt, t) => list.forEach((o) => { o.b.position.y = o.y0 + Math.sin(t * 0.8 + o.ph) * 0.6; o.b.rotation.z = Math.sin(t * 0.6 + o.ph) * 0.12; }));
    return g;
  }

  /** Pássaros circulando no céu (sprites de 2 triângulos, custo quase zero). */
  function birds({ x = 0, z = 0, n = 6, y = 22, r = 36 } = {}) {
    const g = new THREE.Group(); root.add(g);
    const list = [];
    for (let i = 0; i < n; i++) {
      const b = new THREE.Group(); g.add(b);
      const L = part(1.1, 0.07, 0.4, "#2b3440", -0.5, 0, 0, b, false), R = part(1.1, 0.07, 0.4, "#2b3440", 0.5, 0, 0, b, false);
      list.push({ b, L, R, a: rnd(i) * 6.28, rr: r * (0.7 + rnd(i + 1) * 0.6), yy: y + rnd(i + 2) * 6, sp: 0.12 + rnd(i + 3) * 0.1 });
      b.scale.setScalar(1.6);
    }
    always.push((dt, t) => list.forEach((o) => {
      o.a += dt * o.sp;
      o.b.position.set(x + Math.cos(o.a) * o.rr, o.yy, z + Math.sin(o.a) * o.rr);
      o.b.rotation.y = -o.a; const f = Math.sin(t * 7 + o.a * 3) * 0.6;
      o.L.rotation.z = f; o.R.rotation.z = -f;
    }));
    return g;
  }

  /** Borboletas que esvoaçam e fogem quando o jogador chega perto. */
  function butterflies({ x = 0, z = 0, n = 5, y = 1.2, r = 3 } = {}) {
    const g = new THREE.Group(); root.add(g);
    const list = [];
    for (let i = 0; i < n; i++) {
      const b = new THREE.Group(); g.add(b);
      const c = pick(PAL.flower, i + 5);
      const L = part(0.28, 0.03, 0.22, c, -0.12, 0, 0, b, false), R = part(0.28, 0.03, 0.22, c, 0.12, 0, 0, b, false);
      list.push({ b, L, R, a: rnd(i) * 6.28, rr: r * (0.4 + rnd(i) * 0.8), ph: rnd(i + 2) * 6.28, up: 0 });
    }
    live.push({ x, z, r2: 900, fn: (dt, t, d2) => {
      const flee = d2 < 36 ? Math.min(1, (36 - d2) / 30) : 0;
      list.forEach((o, i) => {
        o.a += dt * (0.9 + flee * 2.5);
        o.b.position.set(x + Math.cos(o.a) * o.rr, y + flee * 2.2 + Math.sin(t * 2 + o.ph) * 0.35, z + Math.sin(o.a * 1.3) * o.rr);
        o.b.rotation.y = -o.a;
        const f = Math.sin(t * (14 + flee * 10) + i) * 0.9; o.L.rotation.z = f; o.R.rotation.z = -f;
      });
    } });
    return g;
  }

  /** Vaga-lumes (só à noite: ligue com .setNight(true)). */
  function fireflies({ x = 0, z = 0, n = 14, r = 10, y = 1.4 } = {}) {
    const geo = G.ico, m = mat(0xfff3a0, { emissive: 0xffe066, emissiveIntensity: 2.2 });
    m.transparent = true; m.opacity = 0.95;
    const im = new THREE.InstancedMesh(geo, m, n); im.frustumCulled = false; root.add(im);
    const d = new THREE.Object3D();
    always.push((dt, t) => {
      for (let i = 0; i < n; i++) {
        const a = t * (0.3 + rnd(i) * 0.4) + rnd(i + 1) * 6.28, rr = r * (0.3 + rnd(i + 2) * 0.7);
        d.position.set(x + Math.cos(a) * rr, y + Math.sin(t * 1.7 + i) * 0.6, z + Math.sin(a * 1.4) * rr);
        d.scale.setScalar(0.07 * (0.6 + 0.4 * Math.sin(t * 4 + i * 2)));
        d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    });
    return im;
  }

  /** Fogueira: chama que treme + luz quente. */
  function campfire({ x = 0, z = 0, y = 0, lightOn = true } = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); root.add(g);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28; const s = part(0.9, 0.2, 0.22, pick(PAL.bark, i), Math.cos(a) * 0.3, 0.12, Math.sin(a) * 0.3, g); s.rotation.y = a; }
    for (let i = 0; i < 4; i++) rock(x + Math.cos(i * 1.57) * 1.0, z + Math.sin(i * 1.57) * 1.0, { s: 0.45, y, seed: i + x });
    const fl = new THREE.Mesh(G.cone, mat(0xff8c42, { emissive: 0xff6a00, emissiveIntensity: 1.6 }));
    fl.scale.set(0.7, 1.2, 0.7); fl.position.y = 0.72; g.add(fl);
    const fl2 = new THREE.Mesh(G.cone, mat(0xffd23f, { emissive: 0xffc400, emissiveIntensity: 1.8 }));
    fl2.scale.set(0.42, 0.75, 0.42); fl2.position.y = 0.6; g.add(fl2);
    const pl = lightOn && light > 0 ? new THREE.PointLight(0xff9a3c, 3.5, 16, 2) : null;
    if (pl) { pl.position.set(0, 1.4, 0); g.add(pl); }
    always.push((dt, t) => {
      const k = 1 + Math.sin(t * 11) * 0.12 + Math.sin(t * 17.3) * 0.07;
      fl.scale.set(0.7 * k, 1.2 * (2 - k), 0.7 * k); fl2.scale.set(0.42 * k, 0.75 * k, 0.42 * k);
      fl.rotation.y = t * 1.5; if (pl) pl.intensity = 3.5 * k;
    });
    return g;
  }

  /**
   * Objeto genérico que reage à aproximação.
   * reactive({ x, z, radius, onEnter, onExit, update(dt, near, k) })
   */
  function reactive({ x, z, radius = 4, onEnter, onExit, update: up }) {
    const r2 = radius * radius;
    const o = { x, z, near: false };
    live.push({ x, z, r2: (radius + 24) ** 2, fn: (dt, t, d2) => {
      const near = d2 < r2;
      if (near !== o.near) { o.near = near; (near ? onEnter : onExit)?.(o); }
      up?.(dt, near, near ? 1 - Math.sqrt(d2) / radius : 0, t);
    } });
    return o;
  }

  /** Cogumelo-trampolim: afunda e dispara o jogador (usa a física "bounce" do motor). */
  function mushroom({ x = 0, z = 0, y = 0, s = 1, power = 24, color = "#ff5c7a" } = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); root.add(g);
    part(0.5, 0.7, 0.5, "#fdf6e3", 0, 0.35, 0, g);
    const cap = new THREE.Mesh(G.sph, mat(color, { flat: true })); cap.scale.set(1.25, 0.8, 1.25); cap.position.y = 0.85; cap.castShadow = true; g.add(cap);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28; const d = part(0.26, 0.26, 0.26, "#ffffff", Math.cos(a) * 0.7, 1.08, Math.sin(a) * 0.7, g, false); d.scale.y = 0.5; }
    let squash = 0;
    if (phys) phys.addBox({ x, y: y + 1.0 * s, z, w: 2.2 * s, h: 0.4 * s, d: 2.2 * s, type: "bounce", power, mesh: false, onEnter: () => {} });
    live.push({ x, z, r2: 400, fn: (dt, t, d2) => {
      if (d2 < 3 && squash <= 0) { squash = 1; Audio.play("boing"); }
      if (squash > 0) { squash = Math.max(0, squash - dt * 3); const k = Math.sin(squash * Math.PI) * 0.35; cap.scale.set(1.25 + k, 0.8 - k * 0.6, 1.25 + k); }
      else cap.position.y = 0.85 + Math.sin(t * 2 + x) * 0.04;
    } });
    return g;
  }

  /** Baú que abre quando o jogador chega perto (e chama onOpen uma vez). */
  function chest({ x = 0, z = 0, y = 0, ry = 0, radius = 3.2, onOpen } = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; root.add(g);
    part(1.6, 0.9, 1.1, "#a9714b", 0, 0.45, 0, g);
    part(1.7, 0.14, 1.2, "#facc15", 0, 0.9, 0, g, false);
    const lid = new THREE.Group(); lid.position.set(0, 0.9, -0.55); g.add(lid);
    part(1.6, 0.5, 1.1, "#c08552", 0, 0.25, 0.55, lid);
    part(0.3, 0.3, 0.14, "#facc15", 0, 0.2, 1.12, lid, false);
    let open = 0, fired = false;
    reactive({ x, z, radius, onEnter: () => { if (!fired) { fired = true; Audio.play("cp"); onOpen?.(); } } , update: (dt, near) => {
      open += ((near ? 1 : 0) - open) * Math.min(1, dt * 6);
      lid.rotation.x = -open * 1.5;
    } });
    if (phys) phys.addBox({ x, y: y + 0.45, z, w: 1.8, h: 0.9, d: 1.3, mesh: false });
    return g;
  }

  /** Placa/totem que pula e brilha quando o jogador se aproxima. */
  function beacon({ x = 0, z = 0, y = 0, color = "#56cfe1", label } = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); root.add(g);
    const m = new THREE.Mesh(G.ico, mat(color, { emissive: color, emissiveIntensity: 0.5, flat: true }));
    m.scale.setScalar(0.6); m.position.y = 1.4; m.castShadow = true; g.add(m);
    part(0.3, 1.2, 0.3, "#cbd5e1", 0, 0.6, 0, g);
    reactive({ x, z, radius: 5, update: (dt, near, k, t) => {
      m.rotation.y += dt * (1 + k * 4);
      m.position.y = 1.4 + Math.sin(t * 2) * 0.12 + k * 0.4;
      m.material.emissiveIntensity = 0.5 + k * 1.6;
      m.scale.setScalar(0.6 + k * 0.12);
    } });
    return g;
  }

  /** Balanço de parquinho que oscila sozinho. */
  function swing({ x = 0, z = 0, ry = 0 } = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    for (const sx of [-1, 1]) { const a = part(0.2, 3.2, 0.2, "#e4572e", sx * 1.8, 1.6, -0.9, g); a.rotation.z = sx * 0.28; const b = part(0.2, 3.2, 0.2, "#e4572e", sx * 1.8, 1.6, 0.9, g); b.rotation.z = sx * 0.28; }
    part(4.2, 0.2, 0.2, "#e4572e", 0, 3.1, 0, g);
    const sw = new THREE.Group(); sw.position.set(0, 3.1, 0); g.add(sw);
    part(0.06, 2.1, 0.06, "#8b5a2b", -0.45, -1.05, 0, sw); part(0.06, 2.1, 0.06, "#8b5a2b", 0.45, -1.05, 0, sw);
    part(1.2, 0.14, 0.5, "#facc15", 0, -2.1, 0, sw);
    always.push((dt, t) => { sw.rotation.x = Math.sin(t * 1.4) * 0.5; });
    if (phys) [-1, 1].forEach((sx) => phys.addBox({ x: x + sx * 1.8, y: 1.6, z, w: 0.4, h: 3.2, d: 2.2, mesh: false }));
    return g;
  }

  // ---------------------------------------------------------------- noite / luz
  let night = false;
  function setNight(v) { night = !!v; }

  // ---------------------------------------------------------------- loop
  let T = 0;
  function update(dt, px = 0, py = 0, pz = 0) {
    T += dt;
    for (const fn of always) fn(dt, T);
    for (const o of live) {
      const d2 = (px - o.x) ** 2 + (pz - o.z) ** 2;
      if (d2 > o.r2) continue;
      o.fn(dt, T, d2, px, py, pz);
    }
  }

  /** Atalho: anima sozinho seguindo a câmera (quando o jogo não quer chamar update à mão). */
  function autoUpdate() {
    const c = world.camera;
    world.onUpdate((dt) => update(dt, c.position.x, c.position.y, c.position.z));
    return api;
  }

  const api = {
    root, PAL, autoUpdate,
    ground, hills, mound, water, pond, path, bridge, stairs, hut, fence,
    tree, rock, bush, meadow, scatter,
    windmill, balloons, birds, butterflies, fireflies, campfire, mushroom, chest, beacon, swing, reactive,
    setNight, get night() { return night; },
    update,
  };
  return api;
}
