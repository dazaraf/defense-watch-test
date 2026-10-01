import { describe, expect, it } from "vitest";
import { feature } from "topojson-client";
import { geoContains } from "d3-geo";
import type { FeatureCollection } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import atlas from "world-atlas/countries-50m.json";
import { buildUrbanDensity, URBAN_INSTANCE_LIMIT } from "./urban-density";
import { THEATERS } from "./theater";
const topology=atlas as unknown as Topology;
const land=(feature(topology,topology.objects.countries as GeometryCollection) as FeatureCollection).features.filter(f=>["South Korea","North Korea"].includes(String(f.properties?.name)));
const onLand=(point:[number,number])=>land.some(f=>geoContains(f,point));
const blocks=buildUrbanDensity(THEATERS.korea,onLand);

describe("Korean urban context",()=>{
  it("keeps the metropolitan mass well above Pyongyang and secondary cities",()=>{
    const count=(names:string[])=>blocks.filter(b=>names.includes(b.city)).length;
    expect(count(["Seoul","Incheon","Suwon"])).toBeGreaterThan(1500);
    expect(count(["Seoul","Incheon","Suwon"])).toBeGreaterThan(count(["Pyongyang"])*3);
    expect(count(["Pyongyang"])).toBeGreaterThan(count(["Kaesong"]));
  });
  it("retains secondary settlements across the peninsula within the budget", () => {
    for (const name of ["Seoul", "Pyongyang", "Busan", "Daegu", "Daejeon", "Gwangju", "Kaesong", "Hamhung", "Chongjin"]) {
      expect(blocks.some(block => block.city === name), name).toBe(true);
    }
  });
  it("is deterministic and bounded, with height subordinate to military tokens",()=>{
    expect(blocks.length).toBeLessThanOrEqual(URBAN_INSTANCE_LIMIT);
    expect(buildUrbanDensity(THEATERS.korea,onLand)).toEqual(blocks);
    for(const block of blocks){expect(block.height).toBeLessThan(.024);expect(block.width).toBeLessThan(.005);expect(block.x).toBeGreaterThanOrEqual(-9);expect(block.x).toBeLessThanOrEqual(9);expect(block.z).toBeGreaterThanOrEqual(-6);expect(block.z).toBeLessThanOrEqual(6);}
  });
  it("respects the land mask, including complete exclusion",()=>{
    expect(buildUrbanDensity(THEATERS.korea,()=>false)).toEqual([]);
    expect(blocks.every(b=>onLand([b.longitude,b.latitude]))).toBe(true);
  });
});
