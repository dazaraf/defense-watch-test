# Theater terrain

Source: NASA Blue Marble: Next Generation, July 2004, with shaded topography.
Credit: Reto Stöckli / NASA Earth Observatory.

- [NASA source and explanation](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography/)
- [Original 21600 × 10800 JPEG](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography/july/world.topo.200407.3x21600x10800.jpg)

These six JPEGs are bilinearly reprojected crops of the NASA image, matching the
Mercator center and scale in `lib/theater.ts` and `lib/map-projection.ts`.
They contain terrain shading, not live imagery or an elevation model. Boundaries,
labels and theme colors are drawn separately in the browser. No new terrain is
invented and no displacement is inferred from photographic brightness.

To regenerate, download the original JPEG outside the repository and run from web/:

```sh
python scripts/build-terrain.py /path/to/world.topo.200407.3x21600x10800.jpg
```

The builder needs Pillow, NumPy and the installed Node/TypeScript dependencies.
`projection.json` records the inputs. Tests detect changes that require regeneration.
NASA imagery is public domain in the United States, subject to NASA's media usage
and acknowledgement guidelines. NASA does not endorse this application.
