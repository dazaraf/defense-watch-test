"use client";

import { useEffect, useState } from "react";
import { feature } from "topojson-client";
import { geoGraticule10, geoMercator, geoPath } from "d3-geo";
import countriesAtlas from "world-atlas/countries-110m.json";
import type { FeatureCollection } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import * as THREE from "three";
import type { TheaterConfig } from "@/lib/theater";
import { UrbanDensity, type UrbanMass } from "./UrbanDensity";
import { MAP_PROJECTION } from "@/lib/map-projection";

const topology = countriesAtlas as unknown as Topology;
const countries = feature(topology, topology.objects.countries as GeometryCollection) as FeatureCollection;
const imageCache = new Map<string, HTMLImageElement>();
// Twelve theater/theme pairs, with at most two variants each. Cache owns disposal.
const textureCache = new Map<string, THREE.CanvasTexture>();
function cacheTexture(key: string, texture: THREE.CanvasTexture) {
  textureCache.set(key, texture);
  while (textureCache.size > 24) {
    const oldest = textureCache.keys().next().value!;
    textureCache.get(oldest)?.dispose();
    textureCache.delete(oldest);
  }
}
function afterPaint(work: () => void) {
  let timer = 0;
  const frame = requestAnimationFrame(() => { timer = window.setTimeout(work, 0); });
  return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
}
const blockCache = new Map<string, UrbanMass[]>();

function useMapImage(src: string | null) {
  const [loaded, setLoaded] = useState<{ src: string; image: HTMLImageElement } | null>(null);
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const image = imageCache.get(src) ?? new window.Image();
    const ready = () => {
      imageCache.set(src, image);
      if (!cancelled) setLoaded({ src, image });
    };
    if (image.complete && image.naturalWidth) queueMicrotask(ready);
    else { image.addEventListener("load", ready, { once: true }); image.src = src; }
    return () => { cancelled = true; image.removeEventListener("load", ready); };
  }, [src]);
  return loaded?.src === src ? loaded.image : null;
}

export function TheaterMap({ config, theme, theaterId, terrain }: {
  config: TheaterConfig;
  theme: "light" | "dark";
  theaterId: string;
  terrain: boolean;
}) {
  const terrainImage = useMapImage(`/assets/maps/terrain/${theaterId}.jpg`);
  const urbanImage = useMapImage(`/assets/maps/urban/${theaterId}.png`);
  const [regional, setRegional] = useState<{ id: string; blocks: UrbanMass[] } | null>(null);
  useEffect(() => {
    if (!["korea", "taiwan", "baltic"].includes(theaterId)) return;
    let cancelled = false;
    const controller = new AbortController();
    const publish = (blocks: UrbanMass[]) => { if (!cancelled) setRegional({ id: theaterId, blocks }); };
    const cached = blockCache.get(theaterId);
    if (cached) queueMicrotask(() => publish(cached));
    else fetch(`/assets/maps/urban/${theaterId}-blocks.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Urban layer unavailable"); return response.json(); })
      .then((rows: number[][]) => {
        const blocks = rows.map(([x, z, width, depth, height, tone]) => ({ x, z, width, depth, height, tone }));
        blockCache.set(theaterId, blocks);
        publish(blocks);
      }).catch(() => { /* The geographic texture remains usable if the optional relief fails. */ });
    return () => { cancelled = true; controller.abort(); };
  }, [theaterId]);
  const urbanBlocks = regional?.id === theaterId ? regional.blocks : [];
  const key = `${theaterId}:${theme}:${terrain}`;
  const [ready, setReady] = useState<{ key: string; texture: THREE.CanvasTexture } | null>(null);
  useEffect(() => {
    if (!terrainImage || !urbanImage) return;
    const drawTexture = (showTerrain: boolean) => {
      if (typeof document === "undefined") return null;
      const canvas = document.createElement("canvas");
      canvas.width = MAP_PROJECTION.width;
      canvas.height = MAP_PROJECTION.height;
      const context = canvas.getContext("2d");
      if (!context) return null;
      const dark = theme === "dark";
      context.fillStyle = dark ? "#122532" : "#dbe8ef";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const projection = geoMercator().center(config.center)
        .scale(config.scale * MAP_PROJECTION.scaleMultiplier)
        .translate([canvas.width / 2, canvas.height / 2]);
      const path = geoPath(projection, context);

      // Keep exact vector coastlines even where the raster is less detailed.
      context.beginPath();
      path(countries);
      context.fillStyle = dark ? "#354747" : "#d9dcc9";
      context.fill();
      if (showTerrain && terrainImage) {
        context.save();
        context.clip();
        context.globalAlpha = .42;
        context.filter = dark ? "saturate(0.35) brightness(0.8)" : "saturate(0.45) contrast(1.15)";
        context.drawImage(terrainImage, 0, 0, canvas.width, canvas.height);
        context.restore();
      }

      if (showTerrain && urbanImage) {
        context.save();
        context.beginPath();
        path(countries);
        context.clip();
        // Regional masks retain block grain; remote views use footprint texture
        // instead of enlarging buildings beyond the geographic scale.
        context.filter = dark ? "brightness(1.65)" : "none";
        context.globalAlpha = dark ? .8 : 1;
        context.drawImage(urbanImage, 0, 0, canvas.width, canvas.height);
        context.restore();
      }

      context.beginPath();
      path(geoGraticule10());
      context.strokeStyle = dark ? "rgba(155,191,210,.15)" : "rgba(66,99,122,.17)";
      context.lineWidth = 1;
      context.stroke();

      for (const country of countries.features) {
        const highlighted = config.highlightedCountries.includes(String(country.properties?.name ?? ""));
        context.beginPath();
        path(country);
        if (highlighted) {
          context.fillStyle = dark ? "rgba(143,188,164,.10)" : "rgba(235,237,199,.13)";
          context.fill();
        }
        context.strokeStyle = dark ? (highlighted ? "#c3d4cc" : "#748f96") : (highlighted ? "#365d70" : "#6b858c");
        context.lineWidth = highlighted ? 3.4 : 1.7;
        context.stroke();
      }

      for (const label of config.labels) {
        const projected = projection(label.coordinates);
        if (!projected) continue;
        const [x, y] = projected;
        const city = label.kind === "city";
        if (city) {
          context.beginPath();
          context.arc(x, y, 5, 0, Math.PI * 2);
          context.fillStyle = dark ? "#e0eced" : "#254353";
          context.fill();
        }
        context.font = `${city ? 600 : 700} ${city ? 27 : 36}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        context.letterSpacing = "2px";
        context.textAlign = "center";
        context.strokeStyle = dark ? "rgba(12,27,36,.95)" : "rgba(242,246,240,.94)";
        context.lineWidth = 7;
        context.lineJoin = "round";
        context.strokeText(label.name, x, y - (city ? 14 : 0));
        context.fillStyle = dark ? "#edf4ed" : "#243e4c";
        context.fillText(label.name, x, y - (city ? 14 : 0));
      }
      const result = new THREE.CanvasTexture(canvas);
      result.colorSpace = THREE.SRGBColorSpace;
      result.anisotropy = 16;
      return result;
    };
    let cancelled = false;
    let idle = 0;
    const prepare = (showTerrain: boolean) => {
      const variantKey = `${theaterId}:${theme}:${showTerrain}`;
      let texture = textureCache.get(variantKey);
      if (!texture) {
        const created = drawTexture(showTerrain);
        if (!created) return;
        texture = created;
        cacheTexture(variantKey, texture);
      }
      if (!cancelled && showTerrain === terrain) setReady({ key: variantKey, texture });
    };
    const cancelPaint = afterPaint(() => {
      if (cancelled) return;
      prepare(terrain);
      // Warm the alternate variant only after the visible map has painted.
      idle = window.requestIdleCallback(() => { if (!cancelled) prepare(!terrain); });
    });
    return () => { cancelled = true; cancelPaint(); window.cancelIdleCallback(idle); };
  }, [config, terrainImage, urbanImage, theaterId, theme, terrain]);
  const texture = textureCache.get(key) ?? (ready?.key === key ? ready.texture : null);

  return <group>
    <UrbanDensity blocks={urbanBlocks} theme={theme} visible={terrain} />
    <mesh position={[0, -.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[32, 24]} />
      <meshBasicMaterial color={theme === "dark" ? "#0b1823" : "#edf2f5"} toneMapped={false} />
    </mesh>
    <mesh position={[0, -.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[18, 12]} />
      {texture ? <meshBasicMaterial key="mapped" map={texture} toneMapped={false} /> : <meshBasicMaterial key="loading" transparent opacity={0} />}
    </mesh>
    <mesh receiveShadow position={[0, -.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[24, 18]} />
      <shadowMaterial transparent opacity={theme === "dark" ? .28 : .18} />
    </mesh>
  </group>;
}
