// Three.js pinned version for every Gilele game. Change here to upgrade all games at once.
export * from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { MeshStandardMaterial, MeshLambertMaterial as BaseLambert } from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

/**
 * Graphics level, decided once when the game opens (shared by every game via localStorage "gilele:quality"):
 *   0 = Leve (old look: Lambert, no sky/reflections) · 1 = Equilibrado (realistic, lighter) · 2 = Bonito (realistic, full)
 * "auto": PC → 2, phone → 1 (0 on very weak phones or if the last run was too slow).
 */
function pickLevel() {
  let q = "auto", slow = false;
  try { q = localStorage.getItem("gilele:quality") || "auto"; slow = localStorage.getItem("gilele:autoSlow") === "1"; } catch (e) {}
  if (q === "low") return 0;
  if (q === "medium") return 1;
  if (q === "high") return 2;
  const touch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  const phone = touch && Math.min(screen.width, screen.height) < 820;
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  if (slow || (phone && (mem <= 2 || cores <= 4))) return 0;
  return phone ? 1 : 2;
}
export const GFX = { level: pickLevel() };
GFX.pbr = GFX.level > 0;

// Every game asks for "Lambert" materials; on the realistic levels they become physically based
// (MeshStandardMaterial: real light response, sky reflections). No game code needs to change.
class RealMaterial extends MeshStandardMaterial {
  constructor(p = {}) {
    const { reflectivity, combine, refractionRatio, specularMap, ...rest } = p;
    super({ roughness: 0.9, metalness: 0, envMapIntensity: 1, ...rest });
  }
}
export const MeshLambertMaterial = GFX.pbr ? RealMaterial : BaseLambert;
