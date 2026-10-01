"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { UrbanBlock } from "@/lib/urban-density";

// One draw call, no shadows, animation, picking, per-building materials or props.
export type UrbanMass = Pick<UrbanBlock, "x" | "z" | "width" | "depth" | "height" | "tone">;

export function UrbanDensity({ blocks, theme, visible }: { blocks: UrbanMass[]; theme: "light" | "dark"; visible: boolean }) {
  const mesh=useRef<THREE.InstancedMesh>(null);
  const palette=useMemo(()=>theme==="dark"
    ? [new THREE.Color("#566060"),new THREE.Color("#778080")]
    : [new THREE.Color("#909186"),new THREE.Color("#b5b2a5")],[theme]);
  useLayoutEffect(()=>{
    const instance=mesh.current;
    if(!instance) return;
    const matrix=new THREE.Matrix4(),color=new THREE.Color();
    blocks.forEach((block,index)=>{
      matrix.makeScale(block.width,block.height,block.depth);
      matrix.setPosition(block.x,-.129+block.height/2,block.z);
      instance.setMatrixAt(index,matrix);
      instance.setColorAt(index,color.copy(palette[0]).lerp(palette[1],block.tone));
    });
    instance.instanceMatrix.needsUpdate=true;
    if(instance.instanceColor) instance.instanceColor.needsUpdate=true;
    instance.computeBoundingSphere();
  },[blocks,palette]);
  if(!blocks.length) return null;
  return <instancedMesh ref={mesh} args={[undefined,undefined,blocks.length]} visible={visible} raycast={()=>null}>
    <boxGeometry args={[1,1,1]} />
    <meshStandardMaterial roughness={1} metalness={0} />
  </instancedMesh>;
}
