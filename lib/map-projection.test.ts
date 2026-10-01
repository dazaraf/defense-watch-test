import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import metadata from "../public/assets/maps/terrain/projection.json";
import { MAP_PROJECTION } from "./map-projection";
import { THEATERS } from "./theater";

describe("terrain/vector registration", () => {
  it("uses the same projection for raster terrain and vector boundaries", () => {
    expect(metadata.projection).toEqual(MAP_PROJECTION);
  });
  it.each(Object.entries(THEATERS))("%s has terrain matching its map center and zoom", (id, config) => {
    expect(metadata.theaters[id as keyof typeof metadata.theaters]).toEqual({ center: config.center, scale: config.scale });
    expect(existsSync(resolve("public/assets/maps/terrain", `${id}.jpg`))).toBe(true);
  });
});
