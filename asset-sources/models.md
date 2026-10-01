# Visualization asset sources

These assets are bundled only as lightweight, representative silhouettes. They do
not encode performance, targeting, range, deployment, or location data.

## CC0 3D models

- `cc0/simple-missile.obj` — “Simple missile” by tbbk, CC0.
  Source: https://opengameart.org/content/simple-missile
- `cc0/launcher-body.obj`, `cc0/launcher-head.obj`, and
  `cc0/launcher-rocket.obj` — “Missile Launcher Tank” by mutantleg, CC0.
  Source: https://opengameart.org/content/missile-launcher-tank
- `cc0/surface-vessel-hull.obj` — hull from “LowPoly Ship Pack” by Quaternius,
  CC0.
  Source: https://opengameart.org/content/lowpoly-ship-pack

CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/

## Geographic boundaries

Country boundaries come from `world-atlas/countries-50m.json`, generated from
Natural Earth public-domain data. Place labels are visual orientation markers.
All industrial, magazine, demand, and supply-flow positions remain schematic and
must not be interpreted as real facilities or deployments.

Natural Earth: https://www.naturalearthdata.com/about/terms-of-use/

The original terrain source is retained at `public/assets/maps/nasa-blue-marble-2048.jpg`.
The live scene now uses higher-resolution, preprojected NASA Blue Marble terrain
crops documented in `public/assets/maps/terrain/README.md`.

NASA source:
https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_shallow_topo_2048.jpg

## Procedural simulation models

The active weapon silhouettes, launcher chassis and surface-vessel hull are authored
in the application (`WeaponModel.tsx` and `CommandTheater.tsx`). They use no downloaded
meshes or textures. Weapon shapes are representative, normalized illustrations,
not engineering models. The older CC0 OBJ files remain archived here with their
original attribution; the live scene no longer loads them.

### Public-photo exterior reference pass

`SupportModels.tsx` replaces the generic tracked launcher and short ship with
original, merged-mesh exterior illustrations. Photographs were inspected as visual
references; no photographic textures or third-party meshes are bundled by this pass.

- Destroyer: [USS Arleigh Burke photo index](https://www.navsource.net/archives/05/01051.htm),
  [reference photograph](https://www.navsource.net/archives/05/pix2/05015192.jpg).
  Used for the narrow hull, stepped deckhouse, paired funnels, lattice mast,
  deck fittings and flight-deck markings. This is a representative class-inspired
  silhouette, not a reproduction of a particular ship's configuration.
- Launcher: [DVIDS image 9516919](https://www.dvidshub.net/image/9516919/3-12-executes-hirain-during-exercise-typhoon-crossbow),
  U.S. Marine Corps public release, 4 February 2026. Used for the six-wheel truck,
  armored cab, raised rectangular pod and visible frame details. It is a generic
  land-demand marker, not a claim that each simulated munition uses HIMARS.
- Weapons: see [munition photo sources](../munitions/LICENSES.md). The AMRAAM,
  HARM and JASSM photos informed slimmer bodies, contrasting nose materials,
  distinct fin plans and faceted cruise-missile bodies. Remaining weapons use
  representative silhouettes; reference links are available in the inspector.

Models are normalized independently for readability. Facilities remain schematic.
Geometry is shared and merged by material (five weapon layers, six vehicle layers)
so detail does not create a separate draw call for every tread or railing.

## Urban context across theaters

The terrain includes a generalized Natural Earth urban-footprint layer with original
procedural building-mass proxies. See [urban source notes](../maps/urban/README.md)
for attribution, the rebuild command, rendering limits, and historical-data caveats.
