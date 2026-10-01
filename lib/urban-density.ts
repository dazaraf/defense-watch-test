import { geoMercator } from "d3-geo";
import type { TheaterConfig } from "./theater";
import { MAP_PROJECTION } from "./map-projection";
import source from "../public/assets/maps/urban/korea.json";

type Position = [number, number];
export type UrbanBlock = {
  x: number; z: number; width: number; depth: number; height: number;
  longitude: number; latitude: number; tone: number; city: string;
};
export const URBAN_INSTANCE_LIMIT = 14000;
export const KOREA_URBAN_POLYGONS = source.polygons as Position[][][];

function inRing(x: number, y: number, ring: Position[]) {
  let inside = false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const a=ring[i],b=ring[j];
    if ((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}
export function inUrbanFootprint(longitude: number, latitude: number, rings: Position[][]) {
  return inRing(longitude,latitude,rings[0]) && !rings.slice(1).some(ring=>inRing(longitude,latitude,ring));
}

// These are visual proxies, not building footprints or population estimates.
// Geographic footprints constrain a seeded, deliberately fine-grained block grid.
export function buildUrbanDensity(config: TheaterConfig, onLand: (point: Position) => boolean): UrbanBlock[] {
  const projection=geoMercator().center(config.center).scale(config.scale*MAP_PROJECTION.scaleMultiplier)
    .translate([MAP_PROJECTION.width/2,MAP_PROJECTION.height/2]);
  const blocks: UrbanBlock[]=[];
  let seed=72421;
  let candidates=0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const step=.0045;
  for (const rings of KOREA_URBAN_POLYGONS) {
    const xs=rings[0].map(p=>p[0]),ys=rings[0].map(p=>p[1]);
    const minX=Math.floor(Math.min(...xs)/step),maxX=Math.ceil(Math.max(...xs)/step);
    const minY=Math.floor(Math.min(...ys)/step),maxY=Math.ceil(Math.max(...ys)/step);
    for(let row=minY;row<=maxY;row++) for(let col=minX;col<=maxX;col++) {
      // Fine gaps suggest streets without drawing roads as prominent lines.
      if(col%17===0 || row%13===0) continue;
      const longitude=(col+(random()-.5)*.22)*step;
      const latitude=(row+(random()-.5)*.22)*step;
      if(!inUrbanFootprint(longitude,latitude,rings)) continue;
      let distance=Infinity,city=source.cities[0];
      for(const candidate of source.cities) {
        const d=Math.hypot((longitude-candidate.coordinates[0])*.8,latitude-candidate.coordinates[1]);
        if(d<distance){distance=d;city=candidate;}
      }
      const metro=["Seoul","Incheon","Suwon"].includes(city.name);
      const core=Math.exp(-distance/(metro?.16:.075));
      const edge=step*1.4;
      const interior=[[edge,0],[-edge,0],[0,edge],[0,-edge]].filter(([dx,dy])=>inUrbanFootprint(longitude+dx,latitude+dy,rings)).length/4;
      const density=(metro?.88:city.name==="Pyongyang"?.78:.26)*(.35+.65*core)*(.3+.7*interior);
      if(random()>density || !onLand([longitude,latitude])) continue;
      const pixel=projection([longitude,latitude]);
      if(!pixel || pixel[0]<0 || pixel[0]>MAP_PROJECTION.width || pixel[1]<0 || pixel[1]>MAP_PROJECTION.height) continue;
      const cell=config.scale*MAP_PROJECTION.scaleMultiplier*step*Math.PI/180*18/MAP_PROJECTION.width;
      const block = {longitude,latitude,city:city.name,
        x:(pixel[0]/MAP_PROJECTION.width-.5)*18,z:(pixel[1]/MAP_PROJECTION.height-.5)*12,
        width:cell*(.4+random()*.35),depth:cell*(.5+random()*.35),
        height:.003+random()*.004+core*random()*(metro?.016:.009),tone:random(),
      };
      // Keep coverage across the peninsula when the fixed budget is reached.
      candidates++;
      if (blocks.length < URBAN_INSTANCE_LIMIT) blocks.push(block);
      else {
        const index = Math.floor(random() * candidates);
        if (index < URBAN_INSTANCE_LIMIT) blocks[index] = block;
      }
    }
  }
  return blocks;
}
