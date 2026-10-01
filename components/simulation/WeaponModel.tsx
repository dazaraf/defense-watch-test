"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Exterior silhouettes studied from the public photographs listed in models/LICENSES.md.
// Normalized for board legibility; these are visual models, not scale drawings.
const PROFILES = {
  tlam: { radius: .037, length: .70, nose: .13, wings: .28, tail: .13, sweep: .04, paint: "#b9c3c4" },
  pac3: { radius: .025, length: .78, nose: .17, wings: .045, tail: .065, sweep: .07, paint: "#e1e3d9" },
  sm3: { radius: .041, length: .92, nose: .19, wings: .055, tail: .105, sweep: .10, paint: "#d6dad9" },
  sm6: { radius: .037, length: .84, nose: .19, wings: .065, tail: .10, sweep: .10, paint: "#d4d8d8" },
  amraam: { radius: .023, length: .71, nose: .18, wings: .066, tail: .062, sweep: .09, paint: "#c8cecf" },
  jassm: { radius: .059, length: .67, nose: .18, wings: .31, tail: .11, sweep: .12, paint: "#657078" },
  thaad: { radius: .035, length: .83, nose: .16, wings: 0, tail: .048, sweep: .06, paint: "#deded3" },
  lrasm: { radius: .060, length: .69, nose: .17, wings: .30, tail: .12, sweep: .13, paint: "#78838b" },
  harm: { radius: .026, length: .74, nose: .21, wings: .13, tail: .075, sweep: .12, paint: "#d9ddd8" },
  m155: { radius: .100, length: .40, nose: .19, wings: 0, tail: 0, sweep: 0, paint: "#6c7650" },
  jav: { radius: .041, length: .52, nose: .04, wings: 0, tail: 0, sweep: 0, paint: "#637454" },
  sting: { radius: .050, length: .66, nose: .03, wings: 0, tail: 0, sweep: 0, paint: "#6b7555" },
} as const;

type Layer = "body" | "metal" | "dark" | "band" | "ceramic";
type WeaponGeometry = Record<Layer, THREE.BufferGeometry>;
const cache = new Map<string, WeaponGeometry>();
const materialCache = new Map<string, Record<Layer, THREE.MeshStandardMaterial>>();

function buildWeapon(id: string): WeaponGeometry {
  const p = PROFILES[id as keyof typeof PROFILES] ?? PROFILES.tlam;
  const parts: Record<Layer, THREE.BufferGeometry[]> = { body: [], metal: [], dark: [], band: [], ceramic: [] };
  const stealth = id === "jassm" || id === "lrasm";
  const tube = id === "jav" || id === "sting";
  const r = p.radius, half = p.length / 2;
  function add(layer: Layer, geometry: THREE.BufferGeometry, x = 0, y = 0, z = 0) {
    const expanded = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose();
    expanded.deleteAttribute("uv");
    expanded.translate(x, y, z);
    parts[layer].push(expanded);
  }
  function ring(layer: Layer, radius: number, y: number, thickness = .008) {
    add(layer, new THREE.CylinderGeometry(radius, radius, thickness, 24), 0, y);
  }
  function fin(y: number, span: number, chord: number, sweep: number, angle: number) {
    const shape = new THREE.Shape();
    shape.moveTo(r * .8, chord / 2);
    shape.lineTo(r + span, chord / 2 - sweep);
    shape.lineTo(r + span * .92, -chord / 2 - sweep * .5);
    shape.lineTo(r * .8, -chord / 2);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: .007, bevelEnabled: true, bevelThickness: .0015, bevelSize: .002, bevelSegments: 1, steps: 1 });
    geometry.translate(0, y, -.0035);
    geometry.rotateY(angle);
    add("body", geometry);
  }

  if (stealth) {
    const points = [new THREE.Vector2(r * .65, -half), new THREE.Vector2(r, -half + .06), new THREE.Vector2(r, half - .08), new THREE.Vector2(r * .72, half), new THREE.Vector2(.006, half + p.nose)];
    const shell = new THREE.LatheGeometry(points, 8);
    shell.rotateY(Math.PI / 4);
    shell.scale(1.22, 1, .72);
    shell.computeVertexNormals();
    add("body", shell);
    add("dark", new THREE.BoxGeometry(r * 1.2, .17, .014), 0, -.12, r * .71);
  } else {
    add("body", new THREE.CylinderGeometry(r, r * .94, p.length, 32));
    if (tube) {
      ring("dark", r * 1.14, half, .045);
      ring("dark", r * 1.14, -half, .045);
      add("dark", new THREE.BoxGeometry(.062, .14, .068), 0, -.05, r + .03);
      add("body", new THREE.BoxGeometry(.11, .13, .10), 0, .16, r + .025);
      add("metal", new THREE.CylinderGeometry(.028, .028, .016, 20).rotateX(Math.PI / 2), 0, .17, r + .082);
    } else {
      const points = Array.from({ length: 13 }, (_, i) => {
        const t = i / 12;
        return new THREE.Vector2(r * Math.cos(t * Math.PI / 2), half + t * p.nose);
      });
      add(id === "m155" ? "metal" : "ceramic", new THREE.LatheGeometry(points, 48));
    }
  }
  // Separate collars, nozzle recess, panel seams and identification bands.
  ring("metal", r * 1.02, -half + .025, .025);
  ring("dark", r * .72, -half - .014, .014);
  if (!stealth) {
    for (const y of [-half * .65, half * .34]) ring("metal", r * 1.008, y, .004);
    ring("band", r * 1.012, half * .65, id === "m155" ? .023 : .013);
    if (id === "m155") ring("metal", r * 1.055, -half + .05, .035);
  }
  if (id === "sm3") {
    ring("dark", r * 1.025, -.13, .021);
    ring("metal", r * 1.06, -.28, .023);
  }
  if (!tube && id !== "m155") {
    const wings = stealth || id === "tlam" ? 2 : 4;
    if (p.wings > 0) for (let i = 0; i < wings; i++) fin(id === "harm" ? .085 : -.015, p.wings, stealth || id === "tlam" ? .055 : id === "harm" ? .20 : .10, p.sweep, i * Math.PI * 2 / wings);
    // AGM-158 family has two canted tail surfaces, not a cruciform rocket tail.
    const tailCount = stealth ? 2 : 4;
    for (let i = 0; i < tailCount; i++) fin(-half + .055, p.tail, stealth ? .13 : .09, .035, stealth ? Math.PI * (.22 + i * .56) : i * Math.PI / 2);
    add("metal", new THREE.BoxGeometry(.007, p.length * .58, .005), 0, -.03, r);
  }
  if (id === "tlam") {
    // Ventral inlet fairing and dark intake mouth.
    add("body", new THREE.BoxGeometry(.047, .15, .031), 0, -.14, r + .008);
    add("dark", new THREE.BoxGeometry(.037, .007, .019), 0, -.062, r + .013);
  }
  if (id === "sm3" || id === "sm6") {
    add("body", new THREE.CylinderGeometry(r, r * 1.24, .17, 32), 0, -half + .075);
    ring("metal", r * 1.24, -half, .014);
  }
  // Small printed inspection/stencil bars follow the casing, rather than floating.
  if (!stealth && !tube) for (const y of [-.19, .03, .19]) {
    add("dark", new THREE.BoxGeometry(.009, .025, .0018), 0, y, r * 1.002);
    for (let line = 0; line < 3; line++) add("dark", new THREE.BoxGeometry(.018, .0015, .0018), 0, y + .019 + line * .004, r * 1.002);
  }
  if (id === "jav") {
    add("body",new THREE.BoxGeometry(.15,.15,.13),.08,.10,r+.03);
    add("dark",new THREE.CylinderGeometry(.036,.036,.02,24).rotateX(Math.PI/2),.08,.10,r+.105);
    add("ceramic",new THREE.CylinderGeometry(.026,.026,.021,24).rotateX(Math.PI/2),.08,.10,r+.11);
  }
  if (id === "sting") {
    add("dark",new THREE.BoxGeometry(.026,.18,.035),0,-.12,r+.08);
    add("body",new THREE.CylinderGeometry(.022,.022,.15,16).rotateZ(Math.PI/2),.06,-.03,r+.03);
  }
  if (stealth) add("band", new THREE.BoxGeometry(.085, .012, .004), 0, -.20, r * .79);
  // Each weapon is at most five draw calls, shared by every inventory token and pulse.
  const result = {} as WeaponGeometry;
  for (const layer of Object.keys(parts) as Layer[]) {
    result[layer] = parts[layer].length ? mergeGeometries(parts[layer])! : new THREE.BufferGeometry();
    result[layer].computeBoundingSphere();
    parts[layer].forEach(g => g.dispose());
  }
  return result;
}

export function WeaponModel({ id, color, emissive = "#000000", size = 1, studio = false }: {
  id: string; color?: string; emissive?: string; size?: number; studio?: boolean;
}) {
  const geometry = useMemo(() => {
    if (!cache.has(id)) cache.set(id, buildWeapon(id));
    return cache.get(id)!;
  }, [id]);
  const paint = PROFILES[id as keyof typeof PROFILES]?.paint ?? "#bac5cd";
  const materials = useMemo(() => {
    const bodyColor = studio ? paint : color ?? paint;
    const key = `${bodyColor}/${emissive}/${studio}/${id === "m155"}`;
    if (!materialCache.has(key)) {
      materialCache.set(key, {
        ceramic: new THREE.MeshStandardMaterial({ color: "#e8e5d9", metalness: .03, roughness: .74 }),
        body: new THREE.MeshStandardMaterial({ color: bodyColor, metalness: .15, roughness: .64, emissive, emissiveIntensity: studio ? 0 : .08 }),
        metal: new THREE.MeshStandardMaterial({ color: id === "m155" ? "#b8a16a" : "#85949c", metalness: .72, roughness: .32 }),
        dark: new THREE.MeshStandardMaterial({ color: "#202a30", metalness: .2, roughness: .65 }),
        band: new THREE.MeshStandardMaterial({ color: "#d9ad52", metalness: .16, roughness: .5 }),
      });
    }
    return materialCache.get(key)!;
  }, [color, emissive, id, paint, studio]);
  return (
    <group scale={size} dispose={null}>
      {(Object.keys(geometry) as Layer[]).map(layer => (
        <mesh key={layer} geometry={geometry[layer]} material={materials[layer]} castShadow receiveShadow />
      ))}
    </group>
  );
}
