"use client";

import { useEffect, useRef, useState, Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, ContactShadows, OrbitControls } from "@react-three/drei";
import { WeaponModel } from "./WeaponModel";
import type { MunitionView } from "@/lib/types";

const PHOTO_REFERENCES: Record<string, string> = {
  tlam: "https://commons.wikimedia.org/wiki/File:23_0047790_Convair_Negative_Image_-_Tomahawk_missile_prepared_for_transport_(53821991043).jpg",
  pac3: "https://commons.wikimedia.org/wiki/File:PAC-3_Erint_Missile.jpg",
  sm3: "https://commons.wikimedia.org/wiki/File:SM-3_launch_to_destroy_the_NRO-L_21_satellite.jpg",
  sm6: "https://commons.wikimedia.org/wiki/File:SM-6_Eram_June_2014.jpg",
  amraam: "https://commons.wikimedia.org/wiki/File:AIM-120_AMRAAM_loading.jpg",
  jassm: "https://commons.wikimedia.org/wiki/File:JASSM_m02006120800040.jpg",
  lrasm: "https://www.dvidshub.net/image/9792225/dyess-airmen-validate-pre-flight-procedures-during-lrasm-event-zero",
  harm: "https://commons.wikimedia.org/wiki/File:AGM-88_HARM_on_F-4G.jpg",
  thaad: "https://commons.wikimedia.org/wiki/File:THAAD_1995.jpg",
  jav: "https://commons.wikimedia.org/wiki/File:FGM-148_Javelin_-_ID_061024-A-0497K-004_(cropped).JPEG",
  sting: "https://commons.wikimedia.org/wiki/File:FIM-92_Stinger_firing.jpg",
  m155: "https://commons.wikimedia.org/wiki/File:DM125_155mm_smoke_artillery_shells_by_Rheinmetall_-_German_Army_-_Dynamic_Front_25.webp",
  "Surface vessel": "https://www.navsource.net/archives/05/01051.htm",
  Launcher: "https://www.dvidshub.net/image/9516919/3-12-executes-hirain-during-exercise-typhoon-crossbow",
};

export function WeaponInspector({ selected, munitions, onSelect, theme, supportModels }: {
  supportModels: Record<string, ReactNode>;
  selected: MunitionView;
  munitions: MunitionView[];
  onSelect: (id: string) => void;
  theme: "light" | "dark";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [asset, setAsset] = useState("Weapon");
  const reference = PHOTO_REFERENCES[asset === "Weapon" ? selected.id : asset];
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <>
      <button type="button" className="inspect-model-button" onClick={() => setOpen(true)}>
        <span aria-hidden="true">◇</span> INSPECT 3D MODEL <span aria-hidden="true">↗</span>
      </button>
      <dialog ref={dialog} className="weapon-inspector" onClose={() => setOpen(false)} onClick={event => {
        if (event.target === dialog.current) {
          const bounds = dialog.current!.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false);
        }
      }} aria-labelledby="weapon-inspector-title">
        <header>
          <div><span className="eyebrow">ASSET INSPECTION</span><h2 id="weapon-inspector-title">{asset === "Weapon" ? selected.name : asset}</h2></div>
          <button type="button" aria-label="Close model inspection" onClick={() => setOpen(false)}>×</button>
        </header>
        {open && <div className="weapon-inspector-stage">
          <Canvas orthographic shadows frameloop="demand" dpr={[1, 2]} camera={{ position: [0, .85, 3], zoom: 150 }} gl={{ antialias: true }}>
            <color attach="background" args={[theme === "dark" ? "#111e2a" : "#edf0f2"]} />
            <hemisphereLight intensity={2.2} color="#ffffff" groundColor="#728393" />
            <directionalLight position={[2, 4, 3]} intensity={3.2} castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[-3, 1, -2]} intensity={2.5} color="#aacbdd" />
            <Suspense fallback={null}>
              <Bounds key={`${asset}-${selected.id}`} fit clip observe margin={1.2}>
              {asset === "Weapon" ? (
                <group rotation={[Math.PI / 2 + .15, -.15, -Math.PI / 2]}>
                  <WeaponModel id={selected.id} studio size={1.6} />
                </group>
              ) : <group position={[0, -.35, 0]} rotation={[0, 2.5, 0]}>{supportModels[asset]}</group>}
            </Bounds>
            </Suspense>
            <ContactShadows key={`${selected.id}-${asset}`} position={[0, -.48, 0]} opacity={.32} scale={5} blur={2.8} far={2} frames={8} resolution={256} />
            <OrbitControls makeDefault enablePan={false} minZoom={35} maxZoom={600} target={[.08, 0, 0]} />
          </Canvas>
          <span className="inspection-hint">DRAG TO ORBIT · SCROLL TO ZOOM</span>
        </div>}
        <footer>
          <label>MODEL<select aria-label="Inspect asset type" value={asset} onChange={event => setAsset(event.target.value)}>
            {["Weapon", ...Object.keys(supportModels)].map(name => <option key={name}>{name}</option>)}
          </select></label>
          {asset === "Weapon" && <label>WEAPON<select aria-label="Inspect weapon" value={selected.id} onChange={event => onSelect(event.target.value)}>
            {munitions.map(munition => <option key={munition.id} value={munition.id}>{munition.name}</option>)}
          </select></label>}
          <div><strong>{asset === "Weapon" ? selected.assetClass : "THEATER ASSET"}</strong><span>{asset === "Weapon" ? selected.manufacturer : asset === "Surface vessel" ? "Arleigh Burke–inspired exterior" : asset === "Launcher" ? "HIMARS-inspired exterior" : "Schematic model"}</span></div>
        </footer>
        <p className="inspection-caption">Representative visualization · Not to scale{reference && <> · <a href={reference} target="_blank" rel="noreferrer">Photo reference ↗</a></>}</p>
      </dialog>
    </>
  );
}
