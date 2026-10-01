type ManufacturerMarkSpec = {
  file?: string;
  invertOnDark?: boolean;
  monogram?: string;
};

export const MANUFACTURER_MARKS: Record<string, ManufacturerMarkSpec[]> = {
  "Northrop Grumman": [{ file: "northrop-grumman.png", invertOnDark: true }],
  "GD-OTS / arsenals": [{ file: "general-dynamics.png" }],
  "Lockheed/RTX JV": [{ file: "lockheed-martin.png", invertOnDark: true }, { file: "rtx.png", invertOnDark: true }],
  Boeing: [{ file: "boeing.svg", invertOnDark: true }],
  "Boeing Defense, Space & Security": [
    { file: "boeing.svg", invertOnDark: true },
  ],
  "GD-OTS": [{ file: "general-dynamics.png" }],
  "General Dynamics": [{ file: "general-dynamics.png" }],
  "Lockheed Martin": [{ file: "lockheed-martin.png", invertOnDark: true }],
  RTX: [{ file: "rtx.png", invertOnDark: true }],
  "RTX (Raytheon)": [{ file: "rtx.png", invertOnDark: true }],
  "RTX / Kongsberg": [
    { file: "rtx.png", invertOnDark: true },
    { file: "kongsberg.png" },
  ],
  "RTX / Lockheed JV": [
    { file: "rtx.png", invertOnDark: true },
    { file: "lockheed-martin.png", invertOnDark: true },
  ],
};


export function munitionImage(id: string) { return `/assets/munitions/${id}.jpg`; }
