export type Point3 = [number, number, number];

export type TheaterConfig = {
  center: [number, number];
  scale: number;
  region: string;
  lens: string;
  terrain: "maritime" | "land" | "dual" | "network";
  highlightedCountries: string[];
  factory: Point3;
  depot: Point3;
  threats: Point3[];
  camera: Point3;
  target: Point3;
  labels: Array<{
    name: string;
    coordinates: [number, number];
    kind?: "country" | "city" | "region";
  }>;
};

export const THEATERS: Record<string, TheaterConfig> = {
  taiwan: {
    center: [121.2, 24],
    scale: 3_600,
    region: "WESTERN PACIFIC / TAIWAN STRAIT",
    lens: "IMMEDIATE NAVAL + AIR STRIKE BURN",
    terrain: "maritime",
    highlightedCountries: ["Taiwan"],
    factory: [-9.35, 0, 0],
    depot: [0.3, 0, -0.2],
    threats: [[4.7, 0, 0.7]],
    camera: [11.2, 12.2, 15.1],
    target: [-0.4, 0.25, 0],
    labels: [
      { name: "TAIWAN", coordinates: [121, 23.7], kind: "country" },
      { name: "CHINA", coordinates: [118.6, 25.1], kind: "country" },
      { name: "TAIPEI", coordinates: [121.56, 25.04], kind: "city" },
    ],
  },
  korea: {
    center: [127.5, 37.7],
    scale: 3_000,
    region: "NORTHEAST ASIA / KOREAN PENINSULA",
    lens: "SUSTAINED FIRES + INTERCEPTOR DEFENSE",
    terrain: "land",
    highlightedCountries: ["North Korea", "South Korea"],
    factory: [-9.35, 0, 0],
    depot: [0.4, 0, 0.5],
    threats: [[0.2, 0, -5]],
    camera: [9.8, 13.1, 14.2],
    target: [0, 0.2, 0],
    labels: [
      { name: "NORTH KOREA", coordinates: [127.1, 40], kind: "country" },
      { name: "SOUTH KOREA", coordinates: [127.8, 36], kind: "country" },
      { name: "SEOUL", coordinates: [126.98, 37.56], kind: "city" },
    ],
  },
  baltic: {
    center: [24.5, 57.2],
    scale: 1_350,
    region: "NORTHERN EUROPE / BALTIC FLANK",
    lens: "SUSTAINED GROUND + AIR ATTRITION",
    terrain: "land",
    highlightedCountries: ["Estonia", "Latvia", "Lithuania", "Poland", "Finland"],
    factory: [-9.35, 0, 0],
    depot: [-0.3, 0, 0.4],
    threats: [[5.3, 0, 0.2]],
    camera: [11.4, 11.8, 15.4],
    target: [-0.3, 0.25, 0],
    labels: [
      { name: "ESTONIA", coordinates: [25.4, 58.6], kind: "country" },
      { name: "LATVIA", coordinates: [24.6, 57], kind: "country" },
      { name: "LITHUANIA", coordinates: [24, 55.3], kind: "country" },
      { name: "POLAND", coordinates: [19, 52], kind: "country" },
      { name: "BALTIC SEA", coordinates: [20.2, 58], kind: "region" },
    ],
  },
  maritime: {
    center: [145, 17],
    scale: 480,
    region: "WESTERN PACIFIC / SEA CONTROL ARC",
    lens: "CONTINUOUS MARITIME EXPENDITURE",
    terrain: "maritime",
    highlightedCountries: ["Japan", "Philippines", "Taiwan"],
    factory: [-9.35, 0, 0],
    depot: [1, 0, -1.2],
    threats: [[5, 0, 0.5]],
    camera: [12.4, 12.4, 15.2],
    target: [0, 0.2, 0],
    labels: [
      { name: "JAPAN", coordinates: [138, 36], kind: "country" },
      { name: "PHILIPPINES", coordinates: [122, 12.5], kind: "country" },
      { name: "TAIWAN", coordinates: [121, 23.7], kind: "country" },
      { name: "GUAM", coordinates: [144.79, 13.44], kind: "city" },
    ],
  },
  multi: {
    center: [72, 40],
    scale: 150,
    region: "PACIFIC + EUROPE / CONCURRENT DEMAND",
    lens: "THREE THEATERS DRAWING ONE INDUSTRIAL BASE",
    terrain: "dual",
    highlightedCountries: ["Taiwan", "North Korea", "South Korea", "Estonia", "Latvia", "Lithuania", "Poland", "Finland"],
    factory: [-5.8, 0, 0],
    depot: [-0.1, 0, 0],
    threats: [
      [5.1, 0, -3.1],
      [5.1, 0, 3.1],
      [5.1, 0, 0],
    ],
    camera: [11.5, 13.6, 16.3],
    target: [-0.1, 0.15, 0],
    labels: [
      { name: "BALTIC FLANK", coordinates: [24, 57], kind: "region" },
      { name: "TAIWAN STRAIT", coordinates: [120, 24], kind: "region" },
      { name: "KOREAN PENINSULA", coordinates: [127.5, 38], kind: "region" },
      { name: "ONE INDUSTRIAL BASE", coordinates: [-98, 39], kind: "region" },
    ],
  },
  epicfury: {
    center: [-18, 29],
    scale: 128,
    region: "GLOBAL INDUSTRIAL NETWORK",
    lens: "90-DAY CONTINUATION / FEB–APR INTENSITY",
    terrain: "network",
    highlightedCountries: [],
    factory: [-5.7, 0, 0],
    depot: [1.2, 0, 0],
    threats: [[5.1, 0, 0]],
    camera: [11.2, 12.2, 15.7],
    target: [-0.2, 0.2, 0],
    labels: [
      { name: "NORTH AMERICA", coordinates: [-105, 42], kind: "region" },
      { name: "EUROPE", coordinates: [12, 50], kind: "region" },
      { name: "EAST ASIA", coordinates: [120, 35], kind: "region" },
    ],
  },
};
