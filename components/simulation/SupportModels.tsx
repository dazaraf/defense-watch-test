"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type Vec = [number, number, number];
type Layer = "paint" | "deck" | "rubber" | "glass" | "metal" | "mark";
type Model = Record<Layer, THREE.BufferGeometry>;
const models = new Map<string, Model>();
const materials = new Map<string, Record<Layer, THREE.MeshStandardMaterial>>();

// Public-photo exterior studies. Shared merged geometry keeps even the deck
// railings and wheel treads to six draw calls per vehicle on the live board.
function builder() {
  const parts: Record<Layer, THREE.BufferGeometry[]> = { paint: [], deck: [], rubber: [], glass: [], metal: [], mark: [] };
  function add(layer: Layer, g: THREE.BufferGeometry, pos: Vec = [0, 0, 0], rot: Vec = [0, 0, 0]) {
    g.rotateX(rot[0]); g.rotateY(rot[1]); g.rotateZ(rot[2]); g.translate(...pos);
    const flat = g.index ? g.toNonIndexed() : g.clone();
    g.dispose(); flat.deleteAttribute("uv"); parts[layer].push(flat);
  }
  function box(layer: Layer, size: Vec, pos: Vec, rot?: Vec) { add(layer, new THREE.BoxGeometry(...size), pos, rot); }
  function cylinder(layer: Layer, r: number, length: number, pos: Vec, rot?: Vec, top = r) { add(layer, new THREE.CylinderGeometry(top, r, length, 20), pos, rot); }
  function strut(layer: Layer, a: Vec, b: Vec, radius = .006) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const g = new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 6);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize()));
    add(layer, g, start.add(end).multiplyScalar(.5).toArray() as Vec);
  }
  function finish(): Model {
    return Object.fromEntries(Object.entries(parts).map(([layer, geometries]) => {
      const merged = mergeGeometries(geometries)!;
      geometries.forEach(g => g.dispose()); merged.computeBoundingSphere();
      return [layer, merged];
    })) as Model;
  }
  return { add, box, cylinder, strut, finish };
}

function destroyer(): Model {
  const { add, box, cylinder, strut, finish } = builder();
  // Bow is +Z. Narrow, flared hull with a separate non-skid deck.
  const outline = new THREE.Shape();
  const points = [[-.23,-1.58],[.23,-1.58],[.29,-1.10],[.30,-.35],[.27,.64],[.17,1.22],[.055,1.58],[0,1.70],[-.055,1.58],[-.17,1.22],[-.27,.64],[-.30,-.35],[-.29,-1.10]];
  points.forEach(([x,z],i) => i ? outline.lineTo(x,-z) : outline.moveTo(x,-z)); outline.closePath();
  add("paint", new THREE.ExtrudeGeometry(outline,{depth:.165,bevelEnabled:true,bevelThickness:.025,bevelSize:.023,bevelSegments:2}).rotateX(-Math.PI/2),[0,.025,0]);
  add("deck", new THREE.ShapeGeometry(outline).rotateX(-Math.PI/2),[0,.218,0]);
  // Forward deckhouse and sloping bridge/radar faces.
  box("paint",[.46,.18,.92],[0,.31,.13]);
  add("paint",new THREE.CylinderGeometry(.23,.30,.28,4).rotateY(Math.PI/4).scale(1,1,1.35),[0,.53,.34]);
  box("paint",[.38,.065,.39],[0,.70,.38]);
  for (const x of [-.14,-.07,0,.07,.14]) box("glass",[.049,.036,.012],[x,.692,.58]);
  for (const side of [-1,1]) {
    box("glass",[.009,.033,.24],[side*.194,.692,.39]);
    add("mark",new THREE.CircleGeometry(.093,8),[side*.189,.53,.34],[0,side*Math.PI/2,0]);
    box("paint",[.1,.028,.47],[side*.23,.425,.23]);
    // Liferaft canisters, davit and a dark rigid-hull boat.
    for (const z of [-.40,-.30,-.20]) cylinder("mark",.024,.073,[side*.266,.32,z],[0,0,Math.PI/2]);
    add("rubber",new THREE.CapsuleGeometry(.038,.17,3,8).rotateX(Math.PI/2),[side*.252,.315,-.65]);
    strut("metal",[side*.22,.25,-.75],[side*.28,.44,-.75]);
    strut("metal",[side*.28,.44,-.75],[side*.30,.44,-.60]);
  }
  // Two separate exhaust housings with dark open-looking stack caps.
  for (const z of [-.12,-.68]) {
    add("paint",new THREE.CylinderGeometry(.145,.19,.30,4).rotateY(Math.PI/4).scale(1,1,1.3),[0,.52,z]);
    for (const x of [-.069,.069]) {
      cylinder("metal",.051,.09,[x,.70,z]);
      cylinder("rubber",.044,.008,[x,.749,z]);
    }
    for (let j=0;j<4;j++) box("deck",[.19,.009,.008],[0,.42+j*.025,z+.173]);
  }
  // Forward and aft deck hatches, separated from gun and flight deck.
  for (const [center,rows] of [[.87,4],[-1.02,3]]) {
    box("metal",[.32,.019,rows*.064+.025],[0,.237,center]);
    for(let row=0;row<rows;row++) for(let col=0;col<4;col++) {
      box("deck",[.061,.012,.049],[-.114+col*.076,.253,center+(row-(rows-1)/2)*.064]);
    }
  }
  cylinder("paint",.095,.055,[0,.255,1.21]);
  add("paint",new THREE.SphereGeometry(.105,8,4,0,Math.PI*2,0,Math.PI/2).scale(.8,1,1.05),[0,.28,1.21]);
  strut("metal",[0,.32,1.24],[0,.35,1.55],.012);
  // Lattice mast, platforms, yardarms and radomes.
  for (const side of [-1,1]) {
    strut("paint",[side*.085,.71,.12],[side*.023,1.20,.04],.014);
    strut("metal",[side*.08,.76,.12],[-side*.038,1.06,.06]);
  }
  for (const [y,width] of [[.90,.43],[1.09,.28],[1.24,.20]]) {
    box("metal",[width,.014,.06],[0,y,.06]);
    strut("metal",[-width/2,y,.06],[0,y-.13,.07]);
    strut("metal",[width/2,y,.06],[0,y-.13,.07]);
    for(const side of [-1,1]) strut("metal",[side*width/2,y,.06],[side*width/2,y+.10,.06],.003);
  }
  cylinder("paint",.024,.35,[0,1.15,.06],undefined,.01);
  add("mark",new THREE.SphereGeometry(.043,12,8),[0,1.36,.06]);
  box("deck",[.17,.052,.017],[0,1.23,.075]);
  for(const z of [-.9,.66]) {
    cylinder("paint",.045,.055,[0,.46,z]);
    add("mark",new THREE.SphereGeometry(.044,12,8),[0,.51,z]);
  }
  // Flight-deck paint lies flat on the deck, including an actual H.
  add("mark",new THREE.RingGeometry(.139,.145,48).rotateX(-Math.PI/2),[0,.222,-1.32]);
  for(const x of [-.049,.049]) box("mark",[.008,.003,.14],[x,.223,-1.32]);
  box("mark",[.10,.003,.008],[0,.223,-1.32]);
  for(const side of [-1,1]) {
    const rail: Vec[] = [[side*.222,.29,-1.52],[side*.281,.29,-1.02],[side*.29,.29,-.36],[side*.257,.29,.65],[side*.16,.29,1.22],[side*.034,.29,1.58]];
    for(let i=0;i<rail.length-1;i++) {
      strut("metal",rail[i],rail[i+1],.003);
      const a=new THREE.Vector3(...rail[i]),b=new THREE.Vector3(...rail[i+1]);
      for(let t=0;t<1;t+=.25) {const p=a.clone().lerp(b,t); strut("metal",[p.x,.22,p.z],p.toArray() as Vec,.0025);}
    }
    for(const z of [-1.5,1.31]) cylinder("metal",.014,.029,[side*.14,.24,z]);
  }
  return finish();
}

function launcher(): Model {
  const { box, cylinder, strut, finish } = builder();
  box("rubber",[.49,.10,1.55],[0,.24,0]);
  box("paint",[.63,.07,1.48],[0,.32,0]);
  for(const x of [-.315,.315]) for(const z of [-.54,.28,.62]) {
    cylinder("rubber",.17,.115,[x,.18,z],[0,0,Math.PI/2]);
    cylinder("paint",.093,.125,[x,.18,z],[0,0,Math.PI/2]);
    cylinder("metal",.031,.135,[x,.18,z],[0,0,Math.PI/2]);
    for(let i=0;i<20;i++) {
      const a=i*Math.PI/10;
      box("rubber",[.12,.024,.05],[x,.18+Math.sin(a)*.163,z+Math.cos(a)*.163],[-a,0,0]);
    }
    box("paint",[.14,.028,.35],[x,.375,z]);
  }
  // Armored cab, sloped windscreen, door panels, steps and mirrors.
  box("paint",[.59,.39,.46],[0,.56,-.50]);
  box("paint",[.57,.065,.49],[0,.79,-.49]);
  box("glass",[.49,.14,.02],[0,.65,-.735],[.14,0,0]);
  box("paint",[.028,.16,.026],[0,.65,-.753],[.14,0,0]);
  box("rubber",[.36,.1,.018],[0,.44,-.741]);
  box("paint",[.67,.073,.08],[0,.34,-.79]);
  for(const side of [-1,1]) {
    box("glass",[.013,.13,.24],[side*.301,.66,-.51]);
    box("deck",[.014,.20,.30],[side*.304,.47,-.50]);
    box("metal",[.02,.013,.056],[side*.316,.56,-.37]);
    box("metal",[.1,.028,.22],[side*.34,.32,-.43]);
    box("metal",[.1,.028,.22],[side*.34,.25,-.43]);
    strut("metal",[side*.28,.71,-.68],[side*.41,.70,-.67]);
    box("glass",[.055,.09,.02],[side*.41,.67,-.67]);
    box("mark",[.06,.048,.018],[side*.244,.42,-.751]);
    box("deck",[.10,.19,.25],[side*.255,.45,-.07]);
  }
  cylinder("paint",.21,.07,[0,.405,.39]);
  // Raised single rectangular pod, never exposed missile noses.
  const angle=.48, pivot=new THREE.Vector3(0,.63,.30);
  const podPoint=(x:number,y:number,z:number): Vec => new THREE.Vector3(x,y,z).applyAxisAngle(new THREE.Vector3(1,0,0),angle).add(pivot).toArray() as Vec;
  box("paint",[.55,.32,1.03],podPoint(0,0,0),[angle,0,0]);
  for(const side of [-1,1]) {
    box("deck",[.022,.25,.93],podPoint(side*.282,0,0),[angle,0,0]);
    for(const z of [-.43,-.21,.03,.25,.45]) box("paint",[.035,.35,.025],podPoint(side*.297,0,z),[angle,0,0]);
    strut("metal",[side*.20,.36,.53],podPoint(side*.20,-.16,-.27),.021);
    strut("paint",podPoint(side*.245,.18,-.49),podPoint(side*.245,.18,-.72),.017);
  }
  strut("paint",podPoint(-.245,.18,-.72),podPoint(.245,.18,-.72),.017);
  for(const x of [-.175,0,.175]) for(const y of [-.08,.08]) {
    cylinder("metal",.070,.018,podPoint(x,y,-.527),[Math.PI/2+angle,0,0]);
    cylinder("rubber",.058,.022,podPoint(x,y,-.539),[Math.PI/2+angle,0,0]);
  }
  strut("metal",[.24,.78,-.35],[.24,1.13,-.35],.004);
  return finish();
}

type Props = { color: string; alert: boolean; theme: "light" | "dark" };
function SupportModel({kind,color,alert,theme}: Props & {kind:"ship"|"launcher"}) {
  const geometry = useMemo(() => {
    if(!models.has(kind)) models.set(kind,kind === "ship" ? destroyer() : launcher());
    return models.get(kind)!;
  },[kind]);
  const palette = useMemo(() => {
    const key=`${color}/${alert}/${theme}`;
    if(!materials.has(key)) {
      const colors = {paint:color,deck:theme === "dark" ? "#586873":"#626e73",rubber:"#202725",glass:"#263f4d",metal:"#8b989c",mark:"#d6d6c9"};
      materials.set(key,Object.fromEntries(Object.entries(colors).map(([layer,tint])=>[layer,new THREE.MeshStandardMaterial({color:tint,roughness:layer === "glass" ? .23 : .72,metalness:layer === "metal" ? .65 : .12,emissive:alert&&layer === "paint" ? "#c8102e":"#000000",emissiveIntensity:.15})])) as Record<Layer,THREE.MeshStandardMaterial>);
    }
    return materials.get(key)!;
  },[color,alert,theme]);
  return <group dispose={null}>{(Object.keys(geometry) as Layer[]).map(layer=><mesh key={layer} geometry={geometry[layer]} material={palette[layer]} castShadow receiveShadow />)}</group>;
}
export function SurfaceVesselAsset(props:Props) {return <SupportModel kind="ship" {...props}/>;}
export function LauncherAsset(props:Props) {return <SupportModel kind="launcher" {...props}/>;}
