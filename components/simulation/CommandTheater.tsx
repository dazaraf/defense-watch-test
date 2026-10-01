"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid, Html, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import Image from "next/image";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type {
  CompanyRankingView,
  ScenarioView,
  SeriesPoint,
  SimulationRun,
} from "@/lib/types";
import { THEATERS, type Point3 } from "@/lib/theater";
import { stockpileHorizonLabel, horizonState, orderByBaselineDepletion } from "@/lib/simulation-presentation";
import { MANUFACTURER_MARKS, munitionImage } from "@/lib/simulation-assets";
import { WeaponModel as MunitionModel } from "./WeaponModel";
import { TheaterMap } from "./TheaterMap";
import { LauncherAsset, SurfaceVesselAsset } from "./SupportModels";
import { WeaponInspector } from "./WeaponInspector";
import { SiteHeader } from "@/components/layout/site-header";

// The sustainment horizon is defined once, in the theater model's
// horizon_days (SECURITY_GUIDELINES §7). The series shipped to this component
// has one point per day, so its length IS the horizon — derive, never re-type.
function horizonOf(scenario: ScenarioView) {
  return scenario.munitions[0]?.legacy.series.length ?? 1;
}
const MODEL_SCALE = {
  factory: 0.42,
  arsenal: 0.31,
  vessel: 0.26,
  launcher: 0.28,
  inventory: 0.24,
  supplyPulse: 0.33,
  supplyPulseAdvanced: 0.37,
  demandPulse: 0.27,
  demandPulseAlert: 0.31,
} as const;

type TheaterProps = {
  scenarios: ScenarioView[];
};

type ThemeMode = "light" | "dark";
type RightPanelView = "assessment" | "industrial-base" | "events";

const SCENE_COLORS = {
  dark: {
    background: "#07111a",
    fog: "#07111a",
    grid: "#29404f",
    gridMajor: "#587386",
    route: "#9bb9ca",
    routeBright: "#eef5f8",
    structure: "#40596b",
    structureSelected: "#92b7ce",
    tower: "#718b9d",
    light: "#f6f8fa",
  },
  light: {
    background: "#f7f8fa",
    fog: "#f7f8fa",
    grid: "#eceff4",
    gridMajor: "#b9c2d6",
    route: "#2b3e7e",
    routeBright: "#16265c",
    structure: "#e3e6eb",
    structureSelected: "#9db0d4",
    tower: "#5a6fa8",
    light: "#ffffff",
  },
} satisfies Record<ThemeMode, Record<string, string>>;

function formatDay(day: number | null, empty = "—") {
  return day === null ? empty : `D${String(day).padStart(3, "0")}`;
}

function ManufacturerMark({ manufacturer }: { manufacturer: string }) {
  const marks = MANUFACTURER_MARKS[manufacturer] ?? [
    {
      monogram: manufacturer
        .split(/\s|\//)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join(""),
    },
  ];

  return (
    <span className="manufacturer-mark" aria-hidden="true">
      {marks.map((mark, index) =>
        mark.file ? (
          <span
            className={`manufacturer-symbol${mark.invertOnDark ? " is-invert-dark" : ""}`}
            key={`${mark.file}-${index}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/assets/manufacturer-marks/${mark.file}`} alt="" />
          </span>
        ) : (
          <span className="manufacturer-monogram" key={`${mark.monogram}-${index}`}>
            {mark.monogram}
          </span>
        ),
      )}
    </span>
  );
}

function isMaritimeMunition(id: string) {
  return ["lrasm", "sm3", "sm6"].includes(id);
}

function currentPoint(run: SimulationRun, day: number) {
  return run.series[Math.max(0, Math.min(run.series.length - 1, day - 1))];
}

function niceCeil(value: number) {
  if (value <= 1) return 1;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const normalized = value / exponent;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * exponent;
}

function tokenScale(startingInventory: number) {
  return niceCeil(startingInventory / 11);
}

function tokenCount(inventory: number, unitsPerToken: number) {
  if (inventory <= 0) return 0;
  return Math.min(12, Math.max(1, Math.ceil(inventory / unitsPerToken)));
}

function formatUnits(value: number) {
  return Math.round(value).toLocaleString();
}

function makeRoute(start: Point3, end: Point3, lift = 0.38) {
  const a = new THREE.Vector3(...start);
  const c = new THREE.Vector3(...end);
  const b = a.clone().lerp(c, 0.5);
  b.y += lift + a.distanceTo(c) * 0.045;
  return new THREE.QuadraticBezierCurve3(a, b, c);
}

function BattlefieldLabel({
  position,
  eyebrow,
  title,
  detail,
  tone = "blue",
  compact = false,
}: {
  position: Point3;
  eyebrow: string;
  title: string;
  detail: string;
  tone?: "blue" | "red" | "green";
  compact?: boolean;
}) {
  return (
    <Html
      position={position}
      center
      zIndexRange={[2, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div className={`scene-label scene-label-${tone} ${compact ? "is-compact" : ""}`}>
        <span>{eyebrow}</span>
        <strong>{title}</strong>
        <small>{detail}</small>
        {!compact && <i aria-hidden="true" />}
      </div>
    </Html>
  );
}

type SceneNode = "factory" | "supply" | "depot" | "demand" | "threat";

function SceneHotspot({
  position,
  tone,
  active,
  onEnter,
  onLeave,
}: {
  position: Point3;
  tone: "blue" | "red" | "green";
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const color =
    tone === "red" ? "#c8102e" : tone === "green" ? "#5fcb82" : "#9db0d4";

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[active ? 0.085 : 0.055, 10, 10]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 1 : 0.76} />
      </mesh>
      <mesh
        onPointerOver={(event) => {
          event.stopPropagation();
          onEnter();
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          onLeave();
        }}
      >
        <sphereGeometry args={[0.38, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function offsetPoint(point: Point3, lane: number, weight = 1): Point3 {
  return [point[0], point[1], point[2] + lane * weight];
}

function CameraRig({
  position,
  target,
}: {
  position: Point3;
  target: Point3;
}) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(...position);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, position, target]);

  return null;
}

function CameraNavigation({
  controls,
}: {
  controls: RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, gl } = useThree();
  const pressed = useRef(new Set<string>());
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const movement = useMemo(() => new THREE.Vector3(), []);
  const nextTarget = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const movementKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);
    const isEditing = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      Boolean(target.closest("input, textarea, select, button, [contenteditable='true']"));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !movementKeys.has(event.code) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditing(event.target)
      ) {
        return;
      }
      event.preventDefault();
      pressed.current.add(event.code);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      pressed.current.delete(event.code);
    };
    const clearKeys = () => pressed.current.clear();

    gl.domElement.setAttribute(
      "aria-label",
      "Interactive theater map. Use W A S D to move and the mouse wheel to zoom.",
    );
    gl.domElement.setAttribute("tabindex", "0");
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearKeys);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearKeys);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit || pressed.current.size === 0) return;

    camera.getWorldDirection(forward);
    forward.setY(0);
    if (forward.lengthSq() < 0.0001) return;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();
    movement.set(0, 0, 0);
    if (pressed.current.has("KeyW")) movement.add(forward);
    if (pressed.current.has("KeyS")) movement.sub(forward);
    if (pressed.current.has("KeyD")) movement.add(right);
    if (pressed.current.has("KeyA")) movement.sub(right);
    if (movement.lengthSq() === 0) return;

    const distance = camera.position.distanceTo(orbit.target);
    const speed = THREE.MathUtils.clamp(distance * 0.34, 1.5, 5.5);
    movement.normalize().multiplyScalar(speed * Math.min(delta, 0.05));
    nextTarget.copy(orbit.target).add(movement);
    nextTarget.setX(THREE.MathUtils.clamp(nextTarget.x, -9, 7.5));
    nextTarget.setZ(THREE.MathUtils.clamp(nextTarget.z, -5.5, 5.5));
    movement.copy(nextTarget).sub(orbit.target);
    camera.position.add(movement);
    orbit.target.copy(nextTarget);
    orbit.update();
  });

  return null;
}

function RadarSweep({
  position,
  theme,
  alert,
  running,
}: {
  position: Point3;
  theme: ThemeMode;
  alert: boolean;
  running: boolean;
}) {
  const sweep = useRef<THREE.Group>(null);
  const animationTime = useRef(0);

  useFrame((_, delta) => {
    if (!running || !sweep.current) return;
    animationTime.current += delta;
    sweep.current.rotation.y = -animationTime.current * 0.34;
  });

  return (
    <group position={position}>
      {[1.25, 2.15, 3.05].map((radius) => (
        <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[radius, radius + 0.018, 96]} />
          <meshBasicMaterial
            color={alert ? "#c8102e" : SCENE_COLORS[theme].route}
            transparent
            opacity={alert ? 0.3 : 0.2}
          />
        </mesh>
      ))}
      <group ref={sweep}>
        <Line
          points={[
            [0, 0.04, 0],
            [3.1, 0.04, 0],
          ]}
          color={alert ? "#c8102e" : SCENE_COLORS[theme].routeBright}
          lineWidth={1}
          transparent
          opacity={0.55}
        />
      </group>
    </group>
  );
}

type DetailTransform = {
  position: Point3;
  rotation?: Point3;
  scale: Point3;
};

function InstancedBoxes({
  items,
  color,
  emissive = "#000000",
  emissiveIntensity = 0,
  metalness = 0.55,
  roughness = 0.38,
}: {
  items: DetailTransform[];
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const helper = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!mesh.current) return;
    items.forEach((item, index) => {
      helper.position.set(...item.position);
      helper.rotation.set(...(item.rotation ?? [0, 0, 0]));
      helper.scale.set(...item.scale);
      helper.updateMatrix();
      mesh.current?.setMatrixAt(index, helper.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [helper, items]);

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, items.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        metalness={metalness}
        roughness={roughness}
      />
    </instancedMesh>
  );
}

function Factory({
  position,
  active,
  advanced,
  selected,
  theme,
  running,
}: {
  position: Point3;
  active: boolean;
  advanced: boolean;
  selected: boolean;
  theme: ThemeMode;
  running: boolean;
}) {
  const pulse = useRef<THREE.Mesh>(null);
  const animationTime = useRef(0);
  const structureColor = SCENE_COLORS[theme].structure;
  const detailColor = theme === "dark" ? "#a9bdc9" : "#596b78";
  const windowColor = theme === "dark" ? "#9ac7dd" : "#234b67";
  const loadingBays = useMemo(
    () =>
      [-0.38, 0, 0.38].map((x) => ({
        position: [x, 0.26, -0.445] as Point3,
        scale: [0.25, 0.36, 0.025] as Point3,
      })),
    [],
  );
  const loadingBaySlats = useMemo(
    () =>
      [-0.38, 0, 0.38].flatMap((x) =>
        [-0.11, 0, 0.11].map((y) => ({
          position: [x, 0.26 + y, -0.463] as Point3,
          scale: [0.235, 0.012, 0.012] as Point3,
        })),
      ),
    [],
  );
  const roofRibs = useMemo(
    () =>
      [-0.42, -0.21, 0, 0.21, 0.42].map((x) => ({
        position: [x, 0.67, 0] as Point3,
        scale: [0.022, 0.035, 0.88] as Point3,
      })),
    [],
  );
  const sideWindows = useMemo(
    () =>
      [-0.18, 0.08, 0.34].map((z) => ({
        position: [-0.586, 0.42, z] as Point3,
        scale: [0.018, 0.12, 0.16] as Point3,
      })),
    [],
  );

  useFrame((_, delta) => {
    if (!running || !pulse.current) return;
    animationTime.current += delta;
    const wave = (Math.sin(animationTime.current * 3.2 + position[2]) + 1) / 2;
    pulse.current.scale.setScalar(0.75 + wave * 0.35);
  });

  const emissive = active ? (advanced ? "#2ee6c3" : "#4d83c4") : "#0a1421";

  return (
    <group position={position} scale={MODEL_SCALE.factory * (selected ? 1.18 : 1)}>
      <mesh castShadow position={[0, 0.32, 0]}>
        <boxGeometry args={[1.15, 0.64, 0.86]} />
        <meshStandardMaterial
          color={
            selected
              ? SCENE_COLORS[theme].structureSelected
              : SCENE_COLORS[theme].structure
          }
          emissive={emissive}
          emissiveIntensity={active ? 0.16 : 0.03}
          metalness={0.25}
          roughness={0.62}
        />
      </mesh>
      <InstancedBoxes
        items={roofRibs}
        color={detailColor}
        metalness={0.74}
        roughness={0.28}
      />
      <InstancedBoxes
        items={loadingBays}
        color={theme === "dark" ? "#263b49" : "#9ba7ae"}
        emissive={emissive}
        emissiveIntensity={active ? 0.1 : 0.02}
        metalness={0.56}
        roughness={0.36}
      />
      <InstancedBoxes
        items={loadingBaySlats}
        color={detailColor}
        metalness={0.68}
        roughness={0.3}
      />
      <InstancedBoxes
        items={sideWindows}
        color={windowColor}
        emissive={active ? windowColor : "#000000"}
        emissiveIntensity={active ? 0.42 : 0}
        metalness={0.22}
        roughness={0.18}
      />
      <mesh castShadow position={[0.5, 0.24, 0.16]}>
        <boxGeometry args={[0.66, 0.48, 0.68]} />
        <meshStandardMaterial color={SCENE_COLORS[theme].structure} emissive={emissive} emissiveIntensity={active ? 0.3 : 0.08} metalness={0.68} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0.58, 0.54, 0.12]}>
        <cylinderGeometry args={[0.09, 0.09, 0.7, 18]} />
        <meshStandardMaterial color={detailColor} metalness={0.72} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0.58, 0.91, 0.12]}>
        <sphereGeometry args={[0.09, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={detailColor} metalness={0.72} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[-0.32, 0.85, 0]}>
        <boxGeometry args={[0.22, 1.05, 0.22]} />
        <meshStandardMaterial
          color={SCENE_COLORS[theme].structure}
          emissive={emissive}
          emissiveIntensity={active ? 0.45 : 0.08}
          metalness={0.9}
        />
      </mesh>
      <mesh castShadow position={[0.36, 0.72, 0.17]}>
        <cylinderGeometry args={[0.09, 0.12, 0.82, 12]} />
        <meshStandardMaterial color={SCENE_COLORS[theme].structure} emissive={emissive} emissiveIntensity={active ? 0.38 : 0.08} metalness={0.76} roughness={0.3} />
      </mesh>
      {[-0.32, 0, 0.32].map((x) => (
        <mesh key={`vent-${x}`} position={[x, 0.7, -0.12]}>
          <cylinderGeometry args={[0.065, 0.08, 0.18, 10]} />
          <meshStandardMaterial color="#6f8290" metalness={0.64} roughness={0.36} />
        </mesh>
      ))}
      {[-0.23, 0.23].map((z) => (
        <group key={`tank-${z}`} position={[0.72, 0.22, z]}>
          <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.12, 0.42, 18]} />
            <meshStandardMaterial color={structureColor} metalness={0.7} roughness={0.32} />
          </mesh>
          {[-0.14, 0.14].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.121, 0.014, 8, 20]} />
              <meshStandardMaterial color={detailColor} metalness={0.78} roughness={0.24} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0.71, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.018, 8, 28, Math.PI]} />
        <meshStandardMaterial color={detailColor} metalness={0.82} roughness={0.22} />
      </mesh>
      {active && (
        <mesh ref={pulse} position={[0.38, 0.76, 0]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshBasicMaterial color={advanced ? "#70ffe5" : "#70a7e8"} />
        </mesh>
      )}
    </group>
  );
}

function SupplyPulse({
  curve,
  phase,
  rate,
  advanced,
  munitionId,
}: {
  curve: THREE.QuadraticBezierCurve3;
  phase: number;
  rate: number;
  advanced: boolean;
  munitionId: string;
}) {
  const pulse = useRef<THREE.Group>(null);
  const forward = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const progress = (clock.elapsedTime * (0.28 + rate * 0.95) + phase) % 1;
    pulse.current.position.copy(curve.getPoint(progress));
    curve.getTangent(progress, tangent).normalize();
    pulse.current.quaternion.setFromUnitVectors(forward, tangent);
    const visibility = Math.sin(progress * Math.PI);
    pulse.current.scale.setScalar(
      visibility * (advanced ? 1.15 : 0.92),
    );
  });

  return (
    <group ref={pulse}>
      <MunitionModel
        id={munitionId}
        color={advanced ? "#50f3d2" : "#6598cf"}
        emissive={advanced ? "#2ee6c3" : "#174f88"}
        size={advanced ? MODEL_SCALE.supplyPulseAdvanced : MODEL_SCALE.supplyPulse}
      />
    </group>
  );
}

function ArsenalTower({
  position,
  point,
  selected,
  stockout,
  theme,
  munitionId,
  running,
}: {
  position: Point3;
  point: SeriesPoint;
  selected: boolean;
  stockout: boolean;
  theme: ThemeMode;
  munitionId: string;
  running: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const animationTime = useRef(0);
  const height = 0.14 + Math.max(0, point.inventoryPct) * 0.76;
  const detailColor = theme === "dark" ? "#afc0cb" : "#718393";
  const doorColor = theme === "dark" ? "#243744" : "#c0c8ce";
  const sideBraces = useMemo(
    () =>
      [-0.43, 0.43].flatMap((x) =>
        [-0.24, 0, 0.24].map((z) => ({
          position: [x, Math.max(0.1, height * 0.52), z] as Point3,
          scale: [0.035, Math.max(0.12, height * 0.84), 0.035] as Point3,
        })),
      ),
    [height],
  );
  const doorSlats = useMemo(
    () =>
      [-0.12, -0.04, 0.04, 0.12].map((y) => ({
        position: [0, 0.19 + y, -0.405] as Point3,
        scale: [0.38, 0.012, 0.015] as Point3,
      })),
    [],
  );
  const palletCrates = useMemo(
    () =>
      [-0.46, 0, 0.46].map((x, index) => ({
        position: [x, 0.11 + (index % 2) * 0.035, 0.52] as Point3,
        rotation: [0, (index - 1) * 0.12, 0] as Point3,
        scale: [0.26, 0.18 + (index % 2) * 0.07, 0.22] as Point3,
      })),
    [],
  );

  useFrame((_, delta) => {
    if (!running || !group.current || !stockout) return;
    animationTime.current += delta;
    group.current.rotation.y = Math.sin(animationTime.current * 4) * 0.025;
  });

  return (
    <group
      ref={group}
      position={position}
      scale={MODEL_SCALE.arsenal * (selected ? 1.18 : 1)}
    >
      <mesh castShadow position={[0, height / 2, 0]} scale={[1, height, 1]}>
        <boxGeometry args={[1.1, 1, 0.78]} />
        <meshStandardMaterial
          color={
            stockout
              ? "#491015"
              : selected
                ? SCENE_COLORS[theme].structureSelected
                : SCENE_COLORS[theme].tower
          }
          emissive={stockout ? "#c8102e" : selected ? "#1e6fa3" : "#0b3158"}
          emissiveIntensity={stockout ? 0.45 : selected ? 0.12 : 0.04}
          metalness={0.8}
          roughness={0.28}
        />
      </mesh>
      <mesh castShadow position={[0, height + 0.04, 0]}>
        <boxGeometry args={[1.18, 0.06, 0.86]} />
        <meshBasicMaterial color={stockout ? "#c8102e" : "#7fb8e8"} />
      </mesh>
      <InstancedBoxes
        items={sideBraces}
        color={detailColor}
        metalness={0.74}
        roughness={0.28}
      />
      {[0.28, 0.52, 0.76].map((ratio) => (
        <mesh key={ratio} position={[0, Math.max(0.08, height * ratio), 0]}>
          <boxGeometry args={[1.13, 0.035, 0.81]} />
          <meshStandardMaterial color={stockout ? "#761326" : "#8aa2b5"} metalness={0.68} roughness={0.28} />
        </mesh>
      ))}
      <mesh position={[0, 0.2, -0.402]}>
        <boxGeometry args={[0.42, 0.38, 0.025]} />
        <meshStandardMaterial color={doorColor} metalness={0.56} roughness={0.34} />
      </mesh>
      <InstancedBoxes
        items={doorSlats}
        color={stockout ? "#a0182f" : detailColor}
        metalness={0.68}
        roughness={0.28}
      />
      <InstancedBoxes
        items={palletCrates}
        color={stockout ? "#63202a" : SCENE_COLORS[theme].structure}
        emissive={stockout ? "#5d0818" : "#000000"}
        emissiveIntensity={stockout ? 0.38 : 0}
        metalness={0.32}
        roughness={0.54}
      />
      <mesh position={[0.43, height + 0.18, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.28, 10]} />
        <meshStandardMaterial color={detailColor} metalness={0.72} roughness={0.24} />
      </mesh>
      <mesh position={[0.43, height + 0.34, 0]}>
        <sphereGeometry args={[0.045, 12, 8]} />
        <meshBasicMaterial color={stockout ? "#c8102e" : "#79afd1"} />
      </mesh>
      {[-0.46, 0.46].flatMap((x) =>
        [-0.31, 0.31].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, height / 2, z]}>
            <boxGeometry args={[0.055, Math.max(0.12, height), 0.055]} />
            <meshStandardMaterial color={SCENE_COLORS[theme].structureSelected} metalness={0.72} roughness={0.3} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[1.42, 0.06, 1.05]} />
        <meshStandardMaterial
          color={SCENE_COLORS[theme].structure}
          emissive={stockout ? "#8f001f" : "#0a2744"}
          emissiveIntensity={stockout ? 0.75 : 0.2}
        />
      </mesh>
      {!stockout && (
        <group
          position={[0, height + 0.3, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <MunitionModel
            id={munitionId}
            color={selected ? "#dcecf8" : "#91a9bd"}
            emissive="#0b3158"
            size={0.68}
          />
        </group>
      )}
    </group>
  );
}

function ThreatFront({
  position,
  intensity,
  stockout,
  asset,
  theme,
  selected,
  munitionId,
  running,
}: {
  position: Point3;
  intensity: number;
  stockout: boolean;
  asset: "launcher" | "vessel";
  theme: ThemeMode;
  selected: boolean;
  munitionId: string;
  running: boolean;
}) {
  const front = useRef<THREE.Group>(null);
  const animationTime = useRef(0);

  useFrame((_, delta) => {
    if (!running || !front.current) return;
    animationTime.current += delta;
    front.current.position.y =
      asset === "vessel"
        ? Math.sin(animationTime.current * 1.6 + position[2]) * 0.035 * intensity
        : 0;
  });

  const formation: Point3[] =
    asset === "vessel"
      ? [
          [-0.9, 0, -0.08],
          [-0.3, 0, 0.06],
          [0.3, 0, -0.06],
          [0.9, 0, 0.08],
        ]
      : [
          [-0.52, 0, -0.42],
          [0.52, 0, -0.42],
          [-0.52, 0, 0.42],
          [0.52, 0, 0.42],
        ];
  const footprint: Point3[] =
    asset === "vessel"
      ? [
          [-1.25, 0.025, -0.44],
          [1.25, 0.025, -0.44],
          [1.25, 0.025, 0.44],
          [-1.25, 0.025, 0.44],
          [-1.25, 0.025, -0.44],
        ]
      : [
          [-0.86, 0.025, -0.72],
          [0.86, 0.025, -0.72],
          [0.86, 0.025, 0.72],
          [-0.86, 0.025, 0.72],
          [-0.86, 0.025, -0.72],
        ];

  return (
    <group ref={front} position={position}>
      {formation.map((offset, index) => (
        <group
          key={`${asset}-${index}`}
          position={offset}
          scale={(asset === "vessel" ? MODEL_SCALE.vessel : MODEL_SCALE.launcher) * (selected ? 1.15 : 1)}
          rotation={[
            0,
            asset === "vessel"
              ? (index - 1.5) * 0.055
              : index % 2 === 0
                ? -0.12
                : 0.12,
            0,
          ]}
        >
          {asset === "vessel" ? (
            <SurfaceVesselAsset
              color={
                stockout
                  ? "#a9152d"
                  : selected
                    ? theme === "dark"
                      ? "#7798ae"
                      : "#526f86"
                    : theme === "dark"
                      ? "#536e81"
                      : "#657b8e"
              }
              alert={stockout}
              theme={theme}
            />
          ) : (
            <LauncherAsset
              color={
                stockout
                  ? "#a9152d"
                  : selected
                    ? theme === "dark"
                      ? "#7b9db2"
                      : "#557287"
                    : theme === "dark"
                      ? "#566f81"
                      : "#687f91"
              }
              alert={stockout}
              theme={theme}
            />
          )}
          {asset === "vessel" && (
            <>
              <Line
                points={[
                  [-0.08, 0.025, 1.05],
                  [-0.18, 0.018, 1.72],
                ]}
                color={theme === "dark" ? "#80a9c0" : "#71889a"}
                lineWidth={0.65}
                transparent
                opacity={selected ? 0.52 : 0.22}
              />
              <Line
                points={[
                  [0.08, 0.025, 1.05],
                  [0.18, 0.018, 1.72],
                ]}
                color={theme === "dark" ? "#80a9c0" : "#71889a"}
                lineWidth={0.65}
                transparent
                opacity={selected ? 0.52 : 0.22}
              />
            </>
          )}
        </group>
      ))}
      {selected && (
        <>
          <Line
            points={footprint}
            color={stockout ? "#c8102e" : SCENE_COLORS[theme].routeBright}
            lineWidth={0.8}
            transparent
            opacity={0.52}
          />
          <Html
            position={[
              0,
              0.12,
              asset === "vessel" ? 0.62 : 0.86,
            ]}
            center
            zIndexRange={[2, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div className="formation-label">
              <span>{munitionId.toUpperCase()}</span>
              <strong>{asset === "vessel" ? "4 VESSELS" : "4 FIRE UNITS"}</strong>
            </div>
          </Html>
        </>
      )}
      <pointLight
        color="#c8102e"
        intensity={selected ? (stockout ? 1.8 : 0.35 + intensity * 0.25) : 0.08}
        distance={3}
      />
    </group>
  );
}

function RepercussionField({
  position,
  asset,
  pressure,
  inventoryPct,
  stockout,
  theme,
  running,
}: {
  position: Point3;
  asset: "launcher" | "vessel";
  pressure: number;
  inventoryPct: number;
  stockout: boolean;
  theme: ThemeMode;
  running: boolean;
}) {
  const activity = useRef<THREE.Group>(null);
  const animationTime = useRef(0);
  const readiness = Math.max(0, Math.min(1, inventoryPct));
  const radius = 0.7 + readiness * 1.45;
  const markerCount = Math.max(1, Math.min(7, Math.ceil(pressure * 7)));
  const markers: Point3[] = [
    [-0.72, 0, -0.48],
    [0.64, 0, -0.58],
    [-0.18, 0, 0.76],
    [0.82, 0, 0.4],
    [-0.9, 0, 0.3],
    [0.25, 0, -0.92],
    [0.12, 0, 1.02],
  ];

  useFrame((_, delta) => {
    if (!running || !activity.current) return;
    animationTime.current += delta;
    const wave = (Math.sin(animationTime.current * 2.1) + 1) / 2;
    activity.current.scale.setScalar(0.94 + wave * 0.1);
    activity.current.rotation.y = Math.sin(animationTime.current * 0.22) * 0.03;
  });

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <ringGeometry args={[radius, radius + 0.035, 72]} />
        <meshBasicMaterial
          color={
            stockout
              ? "#c8102e"
              : readiness < 0.35
                ? "#d66f28"
                : SCENE_COLORS[theme].routeBright
          }
          transparent
          opacity={stockout ? 0.82 : 0.36}
        />
      </mesh>

      <group ref={activity}>
        {markers.slice(0, markerCount).map((marker, index) => (
          <group
            key={`${asset}-effect-${index}`}
            position={[marker[0], 0.024, marker[2]]}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              {asset === "vessel" ? (
                <ringGeometry args={[0.06, 0.1 + index * 0.008, 18]} />
              ) : (
                <circleGeometry args={[0.08 + index * 0.008, 18]} />
              )}
              <meshBasicMaterial
                color={asset === "vessel" ? "#d7e9f6" : "#23080d"}
                transparent
                opacity={0.28 + pressure * 0.38}
              />
            </mesh>
            <mesh position={[0, 0.1 + (index % 3) * 0.04, 0]}>
              <sphereGeometry args={[0.035 + pressure * 0.026, 8, 8]} />
              <meshBasicMaterial
                color={stockout ? "#c8102e" : index % 2 === 0 ? "#e09a43" : "#8394a2"}
                transparent
                opacity={0.42 + pressure * 0.34}
              />
            </mesh>
          </group>
        ))}
      </group>

      {stockout && (
        <group position={[0, 0.46, 0]}>
          <Line
            points={[
              [-0.55, 0, -0.55],
              [0.55, 0, 0.55],
            ]}
            color="#c8102e"
            lineWidth={2}
            transparent
            opacity={0.8}
          />
          <Line
            points={[
              [-0.55, 0, 0.55],
              [0.55, 0, -0.55],
            ]}
            color="#c8102e"
            lineWidth={2}
            transparent
            opacity={0.8}
          />
        </group>
      )}
    </group>
  );
}

function DemandPulse({
  curve,
  phase,
  intensity,
  stockout,
  munitionId,
}: {
  curve: THREE.QuadraticBezierCurve3;
  phase: number;
  intensity: number;
  stockout: boolean;
  munitionId: string;
}) {
  const pulse = useRef<THREE.Group>(null);
  const forward = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const progress =
      (clock.elapsedTime * (0.22 + intensity * 0.92) + phase * 0.71) % 1;
    pulse.current.position.copy(curve.getPoint(progress));
    curve.getTangent(progress, tangent).normalize();
    pulse.current.quaternion.setFromUnitVectors(forward, tangent);
    pulse.current.scale.setScalar(
      Math.sin(progress * Math.PI) * (intensity > 0.02 ? 1 : 0),
    );
  });

  return (
    <group ref={pulse}>
      <MunitionModel
        id={munitionId}
        color={stockout ? "#c8102e" : "#c8102e"}
        emissive="#c8102e"
        size={stockout ? MODEL_SCALE.demandPulseAlert : MODEL_SCALE.demandPulse}
      />
    </group>
  );
}

function InventoryFormation({
  position,
  count,
  munitionId,
  stockout,
  theme,
}: {
  position: Point3;
  count: number;
  munitionId: string;
  stockout: boolean;
  theme: ThemeMode;
}) {
  const columns = Math.min(6, Math.max(1, count));
  const rows = Math.ceil(count / columns);

  return (
    <group position={[position[0], 0.04, position[2] + 0.32]}>
      {Array.from({ length: count }, (_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const itemsInRow = Math.min(columns, count - row * columns);
        return (
          <group
            key={index}
            position={[
              (column - (itemsInRow - 1) / 2) * 0.23,
              0.07,
              (row - (rows - 1) / 2) * 0.21,
            ]}
          >
            <mesh
              position={[0, -0.065, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <circleGeometry args={[0.052, 12]} />
              <meshBasicMaterial
                color={stockout ? "#7b1427" : SCENE_COLORS[theme].route}
                transparent
                opacity={0.42}
              />
            </mesh>
            <group rotation={[0, 0, Math.PI / 2]}>
              <MunitionModel
                id={munitionId}
                color={
                  stockout
                    ? "#c8102e"
                    : theme === "dark"
                      ? "#c4d5e3"
                      : "#294f71"
                }
                emissive={stockout ? "#c8102e" : "#0b3158"}
                size={MODEL_SCALE.inventory}
              />
            </group>
          </group>
        );
      })}
    </group>
  );
}

function TheaterScene({
  scenario,
  day,
  advanced,
  selectedId,
  theme,
  playing,
  terrain,
}: {
  terrain: boolean;
  scenario: ScenarioView;
  day: number;
  advanced: boolean;
  selectedId: string;
  theme: ThemeMode;
  playing: boolean;
}) {
  const config = THEATERS[scenario.id] ?? THEATERS.taiwan;
  const colors = SCENE_COLORS[theme];
  const [hoveredNode, setHoveredNode] = useState<SceneNode | null>(null);
  const orbitControls = useRef<OrbitControlsImpl>(null);
  const { gl } = useThree();
  const spacing = Math.min(0.84, 6 / Math.max(1, scenario.munitions.length - 1));
  const points = scenario.munitions.map((munition) => {
    const run = advanced ? munition.advanced : munition.legacy;
    return {
      munition,
      run,
      point: currentPoint(run, day),
    };
  });

  useEffect(() => {
    const clearHoveredNode = () => setHoveredNode(null);
    const clearOutsideCanvas = (event: PointerEvent) => {
      if (event.target !== gl.domElement) clearHoveredNode();
    };
    gl.domElement.addEventListener("pointerleave", clearHoveredNode);
    window.addEventListener("pointermove", clearOutsideCanvas, true);
    return () => {
      gl.domElement.removeEventListener("pointerleave", clearHoveredNode);
      window.removeEventListener("pointermove", clearOutsideCanvas, true);
    };
  }, [gl]);

  return (
    <>
      <color attach="background" args={[colors.background]} />
      {theme === "dark" && <fog attach="fog" args={[colors.fog, 24, 48]} />}
      <hemisphereLight
        color={theme === "dark" ? "#c8d9e3" : "#ffffff"}
        groundColor={theme === "dark" ? "#1c2d3a" : "#d8dee6"}
        intensity={theme === "dark" ? 1.05 : 0.65}
      />
      <ambientLight intensity={theme === "dark" ? 0.65 : 0.75} color="#91aabb" />
      <directionalLight
        castShadow
        position={[-2, 10, 6]}
        intensity={theme === "dark" ? 2.55 : 2.2}
        color={colors.light}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-normalBias={0.035}
      />
      <pointLight
        position={[-6, 4, 1]}
        intensity={theme === "dark" ? 1.5 : 2.2}
        color={theme === "dark" ? "#8fb2c8" : "#174f88"}
      />
      <CameraRig position={config.camera} target={config.target} />
      <TheaterMap config={config} theme={theme} theaterId={scenario.id} terrain={terrain} />
      {theme === "dark" && (
        <Grid
          position={[0, -0.08, 0]}
          args={[18, 13]}
          cellSize={0.35}
          cellThickness={0.35}
          cellColor={colors.grid}
          sectionSize={1.4}
          sectionThickness={0.7}
          sectionColor={colors.gridMajor}
          fadeDistance={18}
          fadeStrength={1.2}
          infiniteGrid={false}
        />
      )}
      <RadarSweep
        position={config.depot}
        theme={theme}
        alert={points.some(({ run }) => run.stockoutDay !== null && day >= run.stockoutDay)}
        running={playing}
      />
      {points.map(({ munition, run, point }, index) => {
        const lane = (index - (scenario.munitions.length - 1) / 2) * spacing;
        const selected = selectedId === munition.id;
        const stockout = run.stockoutDay !== null && day >= run.stockoutDay;
        const productionRate = Math.min(
          1,
          point.production / Math.max(1, point.consumption),
        );
        const consumptionRate = Math.min(
          1,
          point.consumption / Math.max(1, munition.peakConsumption),
        );
        const factoryLaneWeight =
          config.terrain === "maritime" ? 0.68 : 0.58;
        const depotLaneWeight =
          config.terrain === "maritime" ? 0.82 : 0.72;
        const threatLaneWeight =
          config.terrain === "maritime"
            ? 1.35
            : config.terrain === "land"
              ? 1.05
              : config.threats.length > 1
                ? 0.9
                : 1.1;
        const factory = offsetPoint(config.factory, lane, factoryLaneWeight);
        const depot = offsetPoint(config.depot, lane, depotLaneWeight);
        const inventoryDepot = offsetPoint(
          [config.depot[0] - 0.92, 0, config.depot[2]],
          lane,
          config.terrain === "maritime" ? 1.05 : 0.92,
        );
        const theaterAsset =
          config.terrain === "maritime" ||
          (config.terrain === "dual" && isMaritimeMunition(munition.id))
            ? "vessel"
            : "launcher";
        const threatBase = config.threats[index % config.threats.length];
        const threat = offsetPoint(threatBase, lane, threatLaneWeight);
        const demandEndpoint = selected ? threatBase : threat;
        const supplyCurve = makeRoute(factory, depot);
        const demandCurve = makeRoute(demandEndpoint, depot, 0.22);
        const supplyLabelPoint = supplyCurve.getPoint(0.54).toArray() as Point3;
        const demandLabelPoint = demandCurve.getPoint(0.52).toArray() as Point3;
        const supplyPoints = supplyCurve.getPoints(32).map((vector) => vector.toArray() as Point3);
        const demandPoints = demandCurve.getPoints(32).map((vector) => vector.toArray() as Point3);
        const unitsPerToken = tokenScale(munition.startingInventory);
        const inventoryTokens = tokenCount(point.inventory, unitsPerToken);
        const cumulativeConsumption = run.series
          .slice(0, day)
          .reduce((sum, seriesPoint) => sum + seriesPoint.consumption, 0);
        const dailyShortfall = Math.max(0, point.consumption - point.production);
        const consequencePressure = Math.min(
          1,
          cumulativeConsumption /
            Math.max(munition.startingInventory * 0.65, munition.peakConsumption * 10),
        );
        const supplyPulseCount = selected
          ? Math.max(1, Math.min(4, Math.ceil(productionRate * 4)))
          : 1;
        const demandPulseCount = selected
          ? Math.max(1, Math.min(5, Math.ceil(consumptionRate * 5)))
          : 1;
        return (
          <group key={munition.id}>
            <Line
              points={supplyPoints}
              color={advanced ? "#3fd6bc" : "#34658f"}
              lineWidth={selected ? 2 : 1}
              transparent
              opacity={selected ? 0.95 : 0.45}
            />
            <Line
              points={demandPoints}
              color="#7a1126"
              lineWidth={selected ? 2 : 1}
              transparent
              opacity={selected ? 0.9 : 0.38}
            />
            {selected && (
              <mesh position={depot} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.95, 1.03, 48]} />
                <meshBasicMaterial
                  color={stockout ? "#c8102e" : "#76bfff"}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            )}
            <Factory
              position={factory}
              active={point.production > 0}
              advanced={advanced}
              selected={selected}
              theme={theme}
              running={playing}
            />
            {playing && point.production > 0 && (
              <>
                {Array.from({ length: supplyPulseCount }, (_, pulseIndex) => (
                  <SupplyPulse
                    key={pulseIndex}
                    curve={supplyCurve}
                    phase={(index * 0.19 + pulseIndex / supplyPulseCount) % 1}
                    rate={productionRate}
                    advanced={advanced}
                    munitionId={munition.id}
                  />
                ))}
              </>
            )}
            <ArsenalTower
              position={depot}
              point={point}
              selected={selected}
              stockout={stockout}
              theme={theme}
              munitionId={munition.id}
              running={playing}
            />
            <InventoryFormation
              position={inventoryDepot}
              count={inventoryTokens}
              munitionId={munition.id}
              stockout={stockout}
              theme={theme}
            />
            {selected && (
              <>
                <ThreatFront
                  position={threatBase}
                  intensity={consumptionRate}
                  stockout={stockout}
                  asset={theaterAsset}
                  theme={theme}
                  selected
                  munitionId={munition.id}
                  running={playing}
                />
                <RepercussionField
                  position={threatBase}
                  asset={theaterAsset}
                  pressure={consequencePressure}
                  inventoryPct={point.inventoryPct}
                  stockout={stockout}
                  theme={theme}
                  running={playing}
                />
              </>
            )}
            {playing && Array.from({ length: demandPulseCount }, (_, pulseIndex) => (
              <DemandPulse
                key={pulseIndex}
                curve={demandCurve}
                phase={(index * 0.23 + pulseIndex / demandPulseCount) % 1}
                intensity={consumptionRate}
                stockout={stockout}
                munitionId={munition.id}
              />
            ))}
            {selected && (
              <>
                <SceneHotspot
                  position={[factory[0], 0.54, factory[2]]}
                  tone={advanced ? "green" : "blue"}
                  active={hoveredNode === "factory"}
                  onEnter={() => setHoveredNode("factory")}
                  onLeave={() => setHoveredNode(null)}
                />
                <SceneHotspot
                  position={supplyLabelPoint}
                  tone={advanced ? "green" : "blue"}
                  active={hoveredNode === "supply"}
                  onEnter={() => setHoveredNode("supply")}
                  onLeave={() => setHoveredNode(null)}
                />
                <SceneHotspot
                  position={[depot[0], 0.68, depot[2]]}
                  tone={stockout ? "red" : "blue"}
                  active={hoveredNode === "depot"}
                  onEnter={() => setHoveredNode("depot")}
                  onLeave={() => setHoveredNode(null)}
                />
                <SceneHotspot
                  position={demandLabelPoint}
                  tone="red"
                  active={hoveredNode === "demand"}
                  onEnter={() => setHoveredNode("demand")}
                  onLeave={() => setHoveredNode(null)}
                />
                <SceneHotspot
                  position={[threatBase[0], 0.66, threatBase[2]]}
                  tone="red"
                  active={hoveredNode === "threat"}
                  onEnter={() => setHoveredNode("threat")}
                  onLeave={() => setHoveredNode(null)}
                />

                {hoveredNode === null && (
                  <BattlefieldLabel
                    position={[depot[0], 1.02, depot[2]]}
                    eyebrow={munition.id.toUpperCase()}
                    title={`MAG ${Math.round(point.inventoryPct * 100)}%`}
                    detail={`${formatUnits(point.inventory)} UNITS`}
                    tone={stockout ? "red" : "blue"}
                    compact
                  />
                )}
                {hoveredNode === "factory" && (
                  <BattlefieldLabel
                    position={[factory[0] + 0.72, 0.94, factory[2]]}
                    eyebrow="PRODUCTION SOURCE"
                    title={munition.manufacturer}
                    detail={`PRODUCTION ${formatUnits(point.production)} / DAY`}
                    tone={advanced ? "green" : "blue"}
                  />
                )}
                {hoveredNode === "supply" && (
                  <BattlefieldLabel
                    position={[
                      supplyLabelPoint[0],
                      supplyLabelPoint[1] + 0.16,
                      supplyLabelPoint[2],
                    ]}
                    eyebrow="SUPPLY FLOW"
                    title={`${formatUnits(point.production)} / DAY`}
                    detail="FACTORY TO MAGAZINE"
                    tone={advanced ? "green" : "blue"}
                    compact
                  />
                )}
                {hoveredNode === "depot" && (
                  <BattlefieldLabel
                    position={[depot[0], 1.14, depot[2]]}
                    eyebrow={`MAGAZINE / ${munition.id.toUpperCase()}`}
                    title={`${formatUnits(point.inventory)} UNITS · ${Math.round(point.inventoryPct * 100)}%`}
                    detail={`1 MODEL = ${formatUnits(unitsPerToken)} UNITS · ${inventoryTokens} SHOWN`}
                    tone={stockout ? "red" : "blue"}
                  />
                )}
                {hoveredNode === "demand" && (
                  <BattlefieldLabel
                    position={[
                      demandLabelPoint[0],
                      demandLabelPoint[1] + 0.16,
                      demandLabelPoint[2],
                    ]}
                    eyebrow="DEMAND FLOW"
                    title={`${formatUnits(point.consumption)} / DAY`}
                    detail="MAGAZINE TO THEATER"
                    tone="red"
                    compact
                  />
                )}
                {hoveredNode === "threat" && (
                  <BattlefieldLabel
                    position={[threatBase[0] - 0.58, 1.02, threatBase[2]]}
                    eyebrow="THEATER EFFECT"
                    title={
                      stockout
                        ? "CAPABILITY GAP"
                        : `${formatUnits(cumulativeConsumption)} EXPENDED`
                    }
                    detail={`${theaterAsset === "vessel" ? "4 REP. VESSELS" : "4 REP. FIRE UNITS"} · SHORTFALL ${formatUnits(dailyShortfall)} / DAY`}
                    tone="red"
                  />
                )}
              </>
            )}
          </group>
        );
      })}

      <CameraNavigation controls={orbitControls} />
      <OrbitControls
        ref={orbitControls}
        makeDefault
        enableDamping
        dampingFactor={0.06}
        enablePan={false}
        minDistance={4}
        maxDistance={25.5}
        minPolarAngle={0.45}
        maxPolarAngle={1.25}
        zoomToCursor
        target={config.target}
      />
    </>
  );
}

function horizonPosition(day: number, horizon: number) {
  return `${((Math.max(1, Math.min(horizon, day)) - 1) / (horizon - 1)) * 100}%`;
}

function horizonSpan(startDay: number, endDay: number, horizon: number) {
  const start = (Math.max(1, Math.min(horizon, startDay)) - 1) / (horizon - 1);
  const end = (Math.max(1, Math.min(horizon, endDay)) - 1) / (horizon - 1);
  return `${Math.max(0, end - start) * 100}%`;
}

function SustainmentBoard({
  scenario,
  day,
  advanced,
  selectedId,
  onSelect,
}: {
  scenario: ScenarioView;
  day: number;
  advanced: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const orderedMunitions = useMemo(() => orderByBaselineDepletion(scenario.munitions), [scenario.munitions]);
  const horizon = horizonOf(scenario);
  return (
    <div className={`sustainment-board ${advanced ? "is-comparison" : ""}`}>
      <div className="sustainment-heading">
        <span>SUSTAINMENT HORIZON</span>
        {advanced ? (
          <div className="sustainment-mode-key" aria-label="Baseline with advanced extension">
            <span><i className="is-baseline" />BASE</span>
            <strong><i className="is-advanced" />ADV EXT</strong>
          </div>
        ) : (
          <strong>BASELINE</strong>
        )}
      </div>
      <div className="sustainment-axis" aria-hidden="true">
        <span />
        <div>
          {[1, 0.25, 0.5, 0.75, 1.0].map((fraction, i) => {
            const day = i === 0 ? 1 : Math.round(horizon * fraction);
            return <i key={`${i}-${day}`}>{formatDay(day)}</i>;
          })}
        </div>
        <span />
      </div>
      <div className="sustainment-lanes">
        {orderedMunitions.map((munition) => {
          const legacyRun = munition.legacy;
          const advancedRun = munition.advanced;
          const run = advanced ? munition.advanced : munition.legacy;
          const point = currentPoint(run, day);
          const stockout = run.stockoutDay;
          const baselineEndDay = legacyRun.stockoutDay ?? horizon;
          const advancedEndDay = advancedRun.stockoutDay ?? horizon;
          const hasAdvancedExtension =
            advanced &&
            legacyRun.stockoutDay !== null &&
            advancedEndDay > baselineEndDay;
          const offline = stockout !== null && day >= stockout;
          const legacyHorizon = stockpileHorizonLabel(legacyRun);
          const advancedHorizon = stockpileHorizonLabel(advancedRun);
          return (
            <button
              key={munition.id}
              type="button"
              className={`${munition.id === selectedId ? "is-active" : ""} ${offline ? "is-offline" : ""} horizon-${horizonState(run)}`}
              onClick={() => onSelect(munition.id)}
              aria-pressed={munition.id === selectedId}
              aria-label={
                advanced
                  ? `${munition.name}: baseline horizon ${legacyHorizon}, advanced horizon ${advancedHorizon}; advanced inventory ${Math.round(point.inventoryPct * 100)} percent`
                  : `${munition.name}: horizon ${legacyHorizon}; inventory ${Math.round(point.inventoryPct * 100)} percent`
              }
            >
              <span className="lane-code">{munition.id.toUpperCase()}</span>
              <span
                className="lane-track"
                aria-hidden="true"
              >
                <i
                  className="lane-runway is-baseline"
                  style={{ width: horizonPosition(baselineEndDay, horizon) }}
                />
                {hasAdvancedExtension && (
                  <i
                    className="lane-runway is-advanced"
                    style={{
                      left: horizonPosition(baselineEndDay, horizon),
                      width: horizonSpan(
                        baselineEndDay,
                        advancedEndDay,
                        horizon,
                      ),
                    }}
                  />
                )}
                {stockout !== null && (
                  <i
                    className="lane-runway is-depleted"
                    style={{
                      left: horizonPosition(stockout, horizon),
                      right: 0,
                    }}
                  />
                )}
                {stockout !== null && (
                  <b
                    className={`lane-marker lane-stockout ${advanced ? "is-advanced" : ""}`}
                    style={{ left: horizonPosition(stockout, horizon) }}
                    title={`${advanced ? "Advanced" : "Baseline"} stockout ${formatDay(stockout)}`}
                  />
                )}
                <u
                  className="lane-current"
                  style={{ left: horizonPosition(day, horizon) }}
                />
              </span>
              <span className="lane-state">
                {advanced
                  ? `${legacyHorizon}→${advancedHorizon}`
                  : legacyHorizon}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IndustrialBasePanel({
  manufacturer,
  companies,
}: {
  manufacturer: string;
  companies: CompanyRankingView[];
}) {
  const pillarRows = [
    { key: "surgeCapacity", label: "SURGE" },
    { key: "investmentQuality", label: "CAPITAL" },
    { key: "americaScore", label: "DOMESTIC" },
    { key: "adversaryExposure", label: "LOW EXPOSURE" },
  ] as const;

  return (
    <div className="industrial-base-panel" role="tabpanel">
      <div className="base-linkage">
        <span>LINE OWNER</span>
        <strong className="manufacturer-inline">
          <ManufacturerMark manufacturer={manufacturer} />
          {manufacturer}
        </strong>
        <small>{companies.length} RANKED PRIME{companies.length === 1 ? "" : "S"} LINKED</small>
      </div>
      {companies.length === 0 ? (
        <div className="base-unmatched">
          <strong>NO RANKING MATCH</strong>
          <span>LINE REMAINS IN THEATER MODEL</span>
        </div>
      ) : (
        companies.map((company) => (
          <section className="company-assessment" key={company.name}>
            <div className="company-heading">
              <div>
                <span>{company.tier === "prime" ? "PRIME" : "OTHER"} / R{String(company.rank).padStart(2, "0")}</span>
                <strong className="manufacturer-inline">
                  <ManufacturerMark manufacturer={company.name} />
                  {company.name}
                </strong>
                <small>{company.ticker.toUpperCase()} · {company.category}</small>
              </div>
              <div className="arsenal-score">
                <span>ARSENAL</span>
                <strong>{company.arsenalScore}</strong>
                <small className={`trend-${company.trendDirection}`}>
                  {company.trendDirection === "up" ? "↑" : company.trendDirection === "down" ? "↓" : "→"} {company.quarterTrend}
                </small>
              </div>
            </div>

            <div className="company-risk-line">
              <span className={`risk-${company.riskLevel}`}>{company.riskLabel}</span>
              <small>CONF {company.dataConfidence.toUpperCase()}</small>
            </div>

            <div className="pillar-chart" aria-label={`${company.name} pillar scores`}>
              {pillarRows.map((pillar) => {
                const score = company.pillarScores[pillar.key];
                return (
                  <div className="pillar-row" key={pillar.key}>
                    <span>{pillar.label}</span>
                    <i aria-hidden="true"><b style={{ width: `${score}%` }} /></i>
                    <strong>{score}</strong>
                  </div>
                );
              })}
            </div>

            <div className="company-programs">
              <span>PROGRAMS</span>
              <strong>{company.keyPrograms.slice(0, 3).join(" · ")}</strong>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

type FeedItem = {
  day: number;
  code: string;
  title: string;
  detail: string;
  severity: "info" | "warning" | "success";
  status: "past" | "next";
};

type TimelineMilestone = {
  day: number;
  code: string;
  label: string;
  severity: "info" | "warning" | "success";
};

function getFeed(
  scenario: ScenarioView,
  day: number,
  advanced: boolean,
): FeedItem[] {
  const mode = advanced ? "advanced" : "legacy";
  const items: Omit<FeedItem, "status">[] = [
    {
      day: 1,
      code: "THEATER",
      title: "Simulation initiated",
      detail: `${scenario.label} · ${mode.toUpperCase()} posture`,
      severity: "info",
    },
  ];

  if (advanced) items.push({ day: 1, code: "SURGE", title: "Surge applied from day 1", detail: "Advanced production active across all lines", severity: "info" });

  scenario.munitions.forEach((munition) => {
    const run = advanced ? munition.advanced : munition.legacy;
    if (run.stockoutDay !== null) {
      items.push({
        day: run.stockoutDay,
        code: "STOCKOUT",
        title: `${munition.name} exhausted`,
        detail: `${munition.manufacturer} · supply line offline`,
        severity: "warning",
      });
    }
    if (run.sustained) {
      items.push({ day: 1, code: "SUSTAIN", title: `${munition.id.toUpperCase()} sustained`, detail: "Production covers theater burn from day 1", severity: "success" });
    }
  });

  const validItems = items.filter((item) => item.day >= 1 && item.day <= horizonOf(scenario));
  const past = validItems
    .filter((item) => item.day <= day)
    .sort((a, b) => b.day - a.day)
    .slice(0, 3)
    .map((item) => ({ ...item, status: "past" as const }));
  const next = validItems
    .filter((item) => item.day > day)
    .sort((a, b) => a.day - b.day)
    .slice(0, 2)
    .map((item) => ({ ...item, status: "next" as const }));
  return [...past, ...next];
}

function getMilestones(run: SimulationRun): TimelineMilestone[] {
  const milestones: Array<TimelineMilestone | null> = [
    run.stockoutDay === null
      ? null
      : {
          day: run.stockoutDay,
          code: "EMPTY",
          label: "Magazine stockout",
          severity: "warning",
        },
    run.sustained ? { day: 1, code: "SUSTAIN", label: "Production covers burn from day 1", severity: "success" } : null,
  ];

  return milestones
    .filter((item): item is TimelineMilestone => item !== null)
    .filter((item) => item.day >= 1 && item.day <= run.series.length)
    .sort((a, b) => a.day - b.day);
}

function getPhase(day: number) {
  return day <= 90 ? "CAMPAIGN PHASE · D001–090" : "EXTENDED BURN · D091–365";
}

export default function CommandTheater({ scenarios }: TheaterProps) {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const scenario =
    scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const orderedMunitions = useMemo(() => orderByBaselineDepletion(scenario.munitions), [scenario.munitions]);
  const horizon = horizonOf(scenario);
  const theater = THEATERS[scenario.id] ?? THEATERS.taiwan;
  const cameraOptions = useMemo(() => ({ position: theater.camera, fov: 31 }), [theater.camera]);
  const [selectedId, setSelectedId] = useState(scenario.munitions[0].id);
  const [day, setDay] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [terrain, setTerrain] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [linesOpen, setLinesOpen] = useState(true);
  const [feedOpen, setFeedOpen] = useState(true);
  const viewOptions = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      const panel = viewOptions.current;
      if (panel?.open && !event.composedPath().includes(panel)) panel.open = false;
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    return () => document.removeEventListener("pointerdown", dismissOutside, true);
  }, []);

  const [rightPanelView, setRightPanelView] =
    useState<RightPanelView>("assessment");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem("arsenal-theme");
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
        return;
      }
      setTheme("light");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setDay((current) => {
        if (current >= horizon) {
          setPlaying(false);
          return horizon;
        }
        return Math.min(horizon, current + speed);
      });
    }, 90);
    return () => window.clearInterval(timer);
  }, [playing, speed, horizon]);

  const selected =
    scenario.munitions.find((item) => item.id === selectedId) ??
    scenario.munitions[0];
  const selectedRun = advanced ? selected.advanced : selected.legacy;
  const selectedPoint = currentPoint(selectedRun, day);
  const milestones = getMilestones(selectedRun);
  const contextualMilestone =
    milestones.find((milestone) => milestone.day >= day) ??
    milestones[milestones.length - 1] ??
    null;
  const phase = getPhase(day);
  const { readiness, stockouts, posture } =
    scenario.summary[advanced ? "advanced" : "legacy"][day - 1];
  const feed = getFeed(scenario, day, advanced);
  const { supplyDays, dailyBalance, burnRatio } = selectedPoint;
  const flowCeiling = Math.max(
    1,
    selectedPoint.production,
    selectedPoint.consumption,
  );

  function changeScenario(id: string) {
    const next = scenarios.find((item) => item.id === id);
    if (!next) return;
    setScenarioId(id);
    setSelectedId(next.munitions[0].id);
    setDay(1);
    setPlaying(false);
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("arsenal-theme", next);
  }

  return (
    <>
      <SiteHeader
        active="simulation"
        simulationControls={{ theme, onToggleTheme: toggleTheme }}
      />
      <div className="command-shell terminal-route" data-theme={theme}>

      <main>
        <h1 className="sr-only">Surge readiness theater</h1>

        <div className="scenario-bar">
          <nav className="scenario-tabs" aria-label="Theater selection">
            {scenarios.map((item, index) => (
              <button key={item.id} type="button"
                className={item.id === scenario.id ? "is-active" : ""}
                onClick={() => changeScenario(item.id)}
                aria-pressed={item.id === scenario.id}
                title={item.longLabel}>
                <span>{String(index + 1).padStart(2, "0")}</span>{item.label}
              </button>
            ))}
          </nav>
          <details className="scenario-brief" onKeyDown={event => {
            if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); }
          }} onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
          }}>
            <summary>Scenario info <span aria-hidden="true">ⓘ</span></summary>
            <div className="scenario-brief-popover">
              <strong>{scenario.longLabel}</strong>
              <p>{scenario.description}</p>
            </div>
          </details>
        </div>

        <section className="theater-frame">
          <Canvas
            shadows
            camera={cameraOptions}
            dpr={[1.15, 2]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
          >
            <TheaterScene
              scenario={scenario}
              day={day}
              advanced={advanced}
              selectedId={selected.id}
              theme={theme}
              playing={playing}
              terrain={terrain}
            />
          </Canvas>
          <div className="tilt-shift-mask" aria-hidden="true" />
          <div className="scene-toolbar">
          <div className="scene-view-actions">
            <button type="button" aria-expanded={linesOpen} aria-controls="munition-list" onClick={() => setLinesOpen(value => !value)}>Weapons</button>
            <button type="button" aria-expanded={feedOpen} aria-controls="supply-details" onClick={() => setFeedOpen(value => !value)}>Details</button>
            <details ref={viewOptions} open className="view-options" onKeyDown={event => {
              if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); }
            }} onBlur={event => {
              if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
            }}>
              <summary aria-label="View options">View <span aria-hidden="true">⌄</span></summary>
              <div className="view-options-panel">
                <label><input type="checkbox" checked={terrain} onChange={event => setTerrain(event.target.checked)} />Terrain shading</label>
                <div className="view-map-key" aria-label="Map key">
                  <span><i className="legend-factory" />Production</span>
                  <span><i className="legend-arsenal" />Magazine</span>
                  <span><i className="legend-threat" />Demand</span>
                </div>
                <p>Drag to orbit · Scroll to zoom<br />W A S D to move</p>
              </div>
            </details>
          </div>
          <div
            className="hud hud-primary"
            aria-live="polite"
            aria-label={`Readiness ${readiness} percent, ${stockouts} of ${scenario.munitions.length} stockouts, ${posture.toLowerCase()} posture`}
          >
            <div className="hud-metric">
              <span>READINESS</span>
              <strong>{readiness}%</strong>
              <i
                className={`status-pip posture-${posture.toLowerCase()}`}
                title={`${posture} posture`}
              />
            </div>
            <div className="hud-metric">
              <span>STOCKOUTS</span>
              <strong>{stockouts}/{scenario.munitions.length}</strong>
            </div>
          </div>

          </div>

          {linesOpen && <aside id="munition-list"
            className={`munition-rail ${linesOpen ? "is-open" : "is-collapsed"}`}
            aria-label="Munition supply lines"
          >
            <button
              type="button"
              className="panel-toggle"
              onClick={() => setLinesOpen((value) => !value)}
              aria-expanded={linesOpen}
            >
              <span>MUNITIONS</span>
              <strong>{scenario.munitions.length}</strong>
              <i>−</i>
            </button>
            {orderedMunitions.map((munition) => {
                const run = advanced ? munition.advanced : munition.legacy;
                const point = currentPoint(run, day);
                const offline =
                  run.stockoutDay !== null && day >= run.stockoutDay;
                return (
                  <button
                    key={munition.id}
                    type="button"
                    className={`${selected.id === munition.id ? "is-active" : ""} ${offline ? "is-offline" : ""} horizon-${horizonState(run)}`}
                    onClick={() => setSelectedId(munition.id)}
                    aria-pressed={selected.id === munition.id}
                  >
                    <span className="munition-thumb" aria-hidden="true">
                      <Image
                        src={munitionImage(munition.id)}
                        alt=""
                        width={42}
                        height={42}
                        unoptimized
                      />
                    </span>
                    <span className="munition-copy">
                      <span className="munition-code">{munition.id}</span>
                      <span className="munition-name">{munition.name}</span>
                    </span>
                    <span className="munition-level">
                      {offline ? "EMPTY" : `${Math.round(point.inventoryPct * 100)}%`}
                    </span>
                    <span className="level-bar">
                      <i style={{ width: `${Math.min(100, point.inventoryPct * 100)}%` }} />
                    </span>
                  </button>
                );
              })}
          </aside>}

          {feedOpen && <aside id="supply-details"
            className={`intel-feed ${feedOpen ? "is-open" : "is-collapsed"}`}
            aria-label="Selected supply line"
          >

                <div className="intel-tabs" role="tablist" aria-label="Supply line views">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightPanelView === "assessment"}
                    onClick={() => setRightPanelView("assessment")}
                  >
                    SUPPLY
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightPanelView === "industrial-base"}
                    onClick={() => setRightPanelView("industrial-base")}
                  >
                    BASE <strong>{selected.industrialBase.length}</strong>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightPanelView === "events"}
                    onClick={() => setRightPanelView("events")}
                  >
                    EVENTS <strong>{feed.length}</strong>
                  </button>
                  <button
                    type="button"
                    className="intel-collapse"
                    onClick={() => setFeedOpen(false)}
                    aria-label="Collapse selected supply line panel"
                  >
                    −
                  </button>
                </div>
                {rightPanelView === "assessment" ? (
                  <div className="line-assessment" role="tabpanel">
                    <div className="assessment-identity">
                      <Image
                        src={munitionImage(selected.id)}
                        alt=""
                        width={42}
                        height={42}
                        unoptimized
                      />
                      <div>
                        <span>{selected.id.toUpperCase()}</span>
                        <strong>{selected.name}</strong>
                        <small className="manufacturer-inline">
                          <ManufacturerMark manufacturer={selected.manufacturer} />
                          {selected.manufacturer}
                        </small>
                      </div>
                    </div>

                    <div className="assessment-metrics">
                      <div>
                        <span>DAYS COVER</span>
                        <strong>
                          {supplyDays === null
                            ? "∞"
                            : supplyDays.toFixed(1)}
                        </strong>
                      </div>
                      <div>
                        <span>NET / DAY</span>
                        <strong className={dailyBalance < 0 ? "is-negative" : "is-positive"}>
                          {dailyBalance > 0 ? "+" : ""}
                          {formatUnits(dailyBalance)}
                        </strong>
                      </div>
                      <div>
                        <span>BURN / PROD</span>
                        <strong>
                          {burnRatio === null ? "—" : `${burnRatio.toFixed(1)}×`}
                        </strong>
                      </div>
                      <div>
                        <span>SURGE</span>
                        <strong>×{advanced ? selected.surgeMultiple : 1}</strong>
                      </div>
                    </div>

                    <div className="flow-balance">
                      <div className="assessment-section-heading">
                        <span>FLOW BALANCE</span>
                        <strong className={dailyBalance < 0 ? "is-negative" : "is-positive"}>
                          {dailyBalance < 0 ? "DEFICIT" : "SURPLUS"}
                        </strong>
                      </div>
                      <div className="flow-row">
                        <span>PROD</span>
                        <i>
                          <b
                            className="flow-production"
                            style={{
                              width: `${(selectedPoint.production / flowCeiling) * 100}%`,
                            }}
                          />
                        </i>
                        <strong>{formatUnits(selectedPoint.production)}</strong>
                      </div>
                      <div className="flow-row">
                        <span>BURN</span>
                        <i>
                          <b
                            className="flow-consumption"
                            style={{
                              width: `${(selectedPoint.consumption / flowCeiling) * 100}%`,
                            }}
                          />
                        </i>
                        <strong>{formatUnits(selectedPoint.consumption)}</strong>
                      </div>
                    </div>

                    <div className="assessment-milestones">
                      <div>
                        <span>HORIZON</span>
                        <strong>
                          {selectedRun.stockoutDay === null
                            ? stockpileHorizonLabel(selectedRun)
                            : day >= selectedRun.stockoutDay
                              ? `${formatDay(selectedRun.stockoutDay)} / EMPTY`
                              : `${formatDay(selectedRun.stockoutDay)} / T−${selectedRun.stockoutDay - day}D`}
                        </strong>
                      </div>

                    </div>
                  </div>
                ) : rightPanelView === "industrial-base" ? (
                  <IndustrialBasePanel
                    manufacturer={selected.manufacturer}
                    companies={selected.industrialBase}
                  />
                ) : (
                  <div role="tabpanel">
                    {feed.map((item, index) => (
                      <div
                        key={`${item.code}-${item.day}-${index}`}
                        className={`feed-item feed-${item.severity} ${item.status === "next" ? "feed-upcoming" : ""}`}
                      >
                        <span>
                          {item.status === "next" && <b>NEXT</b>}
                          {formatDay(item.day)}
                        </span>
                        <div>
                          <em>{item.code}</em>
                          <strong>{item.title}</strong>
                          <small>{item.detail}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </aside>}

          <div className="theater-controls">
            <div className="playback">
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                aria-label={playing ? "Pause simulation" : "Play simulation"}
              >
                {playing ? "Ⅱ" : "▶"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDay(1);
                  setPlaying(false);
                }}
                aria-label="Reset simulation"
              >
                ↺
              </button>
            </div>
            <div className="timeline">
              <div className="timeline-copy">
                <span>DAY {String(day).padStart(3, "0")} / {horizon}</span>
                <strong title={phase}>{phase}</strong>
              </div>
              <label className="timeline-track">
                <span className="sr-only">Simulation day</span>
                <input
                  type="range"
                  min="1"
                  max={horizon}
                  value={day}
                  onChange={(event) => {
                    setDay(Number(event.target.value));
                    setPlaying(false);
                  }}
                />
                <span className="timeline-markers" aria-hidden="true">
                  {milestones.map((milestone) => {
                    const position =
                      ((milestone.day - 1) / (horizon - 1)) * 100;
                    const labelAlignment =
                      position < 8
                        ? "align-start"
                        : position > 92
                          ? "align-end"
                          : "align-center";
                    const isContextual = milestone === contextualMilestone;
                    return (
                      <i
                        key={`${milestone.code}-${milestone.day}`}
                        className={`timeline-marker marker-${milestone.severity} ${
                          milestone.day <= day ? "is-past" : ""
                        } ${isContextual ? `is-contextual ${labelAlignment}` : ""}`}
                        style={{ left: `${position}%` }}
                        title={`${milestone.code} ${formatDay(milestone.day)} · ${milestone.label}`}
                      >
                        {isContextual && (
                          <span className="timeline-marker-label">
                            <b>{milestone.code}</b>
                            <small>{formatDay(milestone.day)}</small>
                          </span>
                        )}
                      </i>
                    );
                  })}
                </span>
              </label>
            </div>
            <button
              type="button"
              className="speed-control"
              onClick={() => setSpeed((value) => (value === 1 ? 3 : 1))}
              aria-label={`Simulation speed ${speed} times`}
            >
              {speed}×
            </button>
            <button
              type="button"
              className={`advanced-control ${advanced ? "is-active" : ""}`}
              onClick={() => setAdvanced((value) => !value)}
              aria-pressed={advanced}
              aria-label={`Manufacturing model: ${advanced ? "advanced manufacturing" : "baseline"}`}
              title="Toggle manufacturing model"
            >
              <span className="toggle-track"><i /></span>
              <span className="model-copy">
                <small>MODEL</small>
                <strong>{advanced ? "ADVANCED MANUFACTURING" : "BASELINE"}</strong>
              </span>
            </button>
          </div>

        </section>

        <section className="analytics-strip">
          <div className="selected-summary">
            <div className="selected-heading">
              <Image
                className="selected-weapon-image"
                src={munitionImage(selected.id)}
                alt={`${selected.name} reference`}
                width={82}
                height={58}
                unoptimized
              />
              <div>
                <span className="eyebrow">SELECTED WEAPON</span>
                <h2>{selected.name}</h2>
              </div>
            </div>
            <p className="manufacturer-inline">
              <ManufacturerMark manufacturer={selected.manufacturer} />
              {selected.manufacturer} · {selected.assetClass}
            </p>
            <WeaponInspector selected={selected} munitions={scenario.munitions} onSelect={setSelectedId} theme={theme} supportModels={{
              Factory: <group scale={2}><Factory position={[0, 0, 0]} active advanced={advanced} selected={false} theme={theme} running={false} /></group>,
              Magazine: <group scale={2.5}><ArsenalTower position={[0, 0, 0]} point={selectedPoint} selected={false} stockout={false} theme={theme} munitionId={selected.id} running={false} /></group>,
              "Surface vessel": <SurfaceVesselAsset color="#8b9da7" alert={false} theme={theme} />,
              Launcher: <group scale={.8}><LauncherAsset color="#748477" alert={false} theme={theme} /></group>,
            }} />
            <div className="selected-baseline">
              <span>START <b>{formatUnits(selected.startingInventory)}</b></span>
              <span>BASE / D <b>{formatUnits(selected.baselineProduction)}</b></span>
              <span>BURN / D <b>{formatUnits(selected.peakConsumption)}</b></span>
            </div>
            <span className="asset-class">
              ADVANCED PRODUCTION ×{selected.surgeMultiple}
            </span>

          <div className="metric-deltas">
            <div>
              <span>HORIZON</span>
              <strong>
                {stockpileHorizonLabel(selected.legacy)}
                <i>→</i>
                {stockpileHorizonLabel(selected.advanced)}
              </strong>
            </div>

          </div>

          </div>

          <SustainmentBoard
            scenario={scenario}
            day={day}
            advanced={advanced}
            selectedId={selected.id}
            onSelect={setSelectedId}
          />
        </section>
      </main>
      </div>
    </>
  );
}
