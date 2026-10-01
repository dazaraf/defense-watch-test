# Urban context across theaters

This is a visual environmental layer, independent of the simulation dataset.
It does not represent current population, actual individual buildings, or military assets.

## Source

Natural Earth, public domain:
- Urban footprints: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-urban-area/
- City anchors: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/
- Terms: https://www.naturalearthdata.com/about/terms-of-use/

Input files from the Natural Earth vector repository:
- https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_urban_areas.geojson
- https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson

The urban areas are generalized historical MODIS-derived footprints, not a current
building inventory. The source has no footprint near the Wonsan anchor, so that
anchor does not invent an urban patch. Coastal clipping can also omit small areas.
They provide recognizable metropolitan shapes. Procedural block
density and heights are artistic choices, not demographic measurements.

`korea.json` contains 12 city anchors and 83 nearby urban polygons, simplified at
0.0015 degrees and rounded to five decimals (about 67 KB). Rebuild from the downloaded
inputs with `python3 scripts/build-urban.py <urban.geojson> <places.geojson>` in `web/`.

## Rendering

At build time, `lib/urban-density.ts` deterministically fills the footprints with tiny block proxies.
Seoul, Incheon and Suwon form the strongest connected metropolitan group. Pyongyang
uses a lower density; secondary cities are quieter. Density falls away from centers
and polygon edges. Regular narrow gaps suggest street grids without explicit roads.
Ocean points are excluded using the same country geometry as the base map.

All six theaters show urban context with terrain enabled. In Korea, roof grain and
muted urban land cover are drawn into the prepared terrain texture beneath labels.
One instanced mesh adds shallow height variation: no per-building draw calls, props,
raycasting, animation, shadow passes, or external texture downloads. A hard cap of
14,000 proxies bounds geometry; each height is below 0.024 scene units. Ordinary
mipmapping reduces texture grain naturally at distance. The original strategic camera,
military geometry, labels, and simulation data remain unchanged.

## Prebuilt theater layers

Taiwan and Baltic use the same source footprints, clipped to the base map land mask,
with muted roof grain, narrow grid gaps, and one instanced mesh capped at 14,000 tiny
blocks per theater. Maritime, Multi-Theater, and Epic Fury use urban textures alone:
individual building relief would add visual noise at their continental camera scales.

Rebuild all six layers with `python3 scripts/build-urban-theaters.py <urban.geojson>
<places.geojson>` in `web/` (requires Pillow, NumPy, Node and project dependencies).
The generator reads the actual theater centers and shared Mercator settings.
`scripts/urban-theaters.json` records projection, rendering budgets, and source city anchors within
the viewport; anchor names are reference metadata, not additional scene labels.

PNG layers are 2100 × 1400, generated at double resolution then downsampled.
Korea preserves its city-weighted distribution in a prebuilt block array.
Regional block arrays are deterministic, sampled inside the clipped urban mask,
and use heights below 0.012 scene units. Assets load on demand and are cached.
Terrain switching selects prepared textures and changes mesh visibility without
recreating the camera or adding UI controls.
