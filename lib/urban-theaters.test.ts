import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import metadata from "../scripts/urban-theaters.json";
import { MAP_PROJECTION } from "./map-projection";
import { THEATERS } from "./theater";
import { URBAN_INSTANCE_LIMIT } from "./urban-density";

describe("urban context across theaters", () => {
  it("registers every additional urban layer to the strategic projection", () => {
    expect(metadata.projection).toEqual(MAP_PROJECTION);
    expect(Object.keys(metadata.theaters).sort()).toEqual(Object.keys(THEATERS).sort());
    for (const [id, layer] of Object.entries(metadata.theaters)) {
      const theater = THEATERS[id as keyof typeof THEATERS];
      expect(layer.center).toEqual(theater.center);
      expect(layer.scale).toBe(theater.scale);
      const png = readFileSync(`public/assets/maps/urban/${id}.png`);
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([MAP_PROJECTION.width, MAP_PROJECTION.height]);
    }
  });
  it.each(["korea", "taiwan", "baltic"] as const)("%s bounds miniature geometry and rendering cost", id => {
    const blocks: number[][] = JSON.parse(readFileSync(`public/assets/maps/urban/${id}-blocks.json`, "utf8"));
    expect(blocks.length).toBe(metadata.theaters[id].instances);
    expect(blocks.length).toBeGreaterThan(1000);
    expect(blocks.length).toBeLessThanOrEqual(URBAN_INSTANCE_LIMIT);
    for (const [x, z, width, depth, height, tone] of blocks) {
      expect([x,z,width,depth,height,tone].every(Number.isFinite)).toBe(true);
      expect(Math.abs(x)).toBeLessThan(9);
      expect(Math.abs(z)).toBeLessThan(6);
      expect(width).toBeGreaterThan(0);
      expect(depth).toBeGreaterThan(0);
      expect(Math.max(width,depth)).toBeLessThan(.005);
      expect(height).toBeGreaterThan(0);
      expect(height).toBeLessThan(.024);
      expect(tone).toBeGreaterThanOrEqual(0);
      expect(tone).toBeLessThanOrEqual(1);
    }
  });
  it("uses texture alone at continental camera scales", () => {
    for (const id of ["maritime", "multi", "epicfury"] as const) {
      expect(metadata.theaters[id].mode).toBe("texture");
      expect(metadata.theaters[id].instances).toBe(0);
    }
  });
});
