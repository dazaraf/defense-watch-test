Drop company logo files here, named `{slug}.svg` or `{slug}.png` (SVG preferred).
`CompanyLogo` (`components/rankings/company-logo.tsx`) tries `{slug}.svg`, then
`{slug}.png`, then falls back to a generated monogram badge — so partial
coverage is fine, nothing breaks if a file is missing.

Expected filenames (one per company in `data/rankings_new.json`):

aerovironment
anduril-industries
boeing-defense-space-security
bwx-technologies
castelion
curtiss-wright
divergent-technologies
epirus
general-dynamics
hadrian
hermeus
howmet-aerospace
kratos-defense-security
l3harris-technologies
leonardo-drs
lockheed-martin
mercury-systems
moog-inc
mp-materials
northrop-grumman
rocketdyne-ex-aerojet
rtx-raytheon
saronic-technologies
shield-ai
transdigm-group
ursa-major
woodward-inc
