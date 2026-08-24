export const WORLDS = {
  "kharon-bloomfields": {
    id: "kharon-bloomfields",
    name: "Kharon's Bloomfields",
    type: "Low-gravity fungal forest",
    description: "Kilometers-tall spore-stalks and floating driftmoths. Every orbital year, the ecosystem undergoes Bloomfall — a massive release of bioluminescent spores.",
    signatureEvent: "Bloomfall Spore Drift",
    gravity: 0.5,
    skyColor: "#0d1a12",
    groundColor: "#172b1d",
    fogColor: "#13261a",
    fogDensity: 0.015,
    ambientLight: "#4a7a58",
    sunLight: "#7ce698",
    hazards: {
      spores: 0.4,
      cold: 0.0,
      heat: 0.0,
      radiation: 0.1,
      pressure: 0.0
    },
    ruinType: "Canopy Spire Monolith",
    ruinDescription: "An ancient Firstseed Spire believed to have seeded the planet's spore stalks.",
    ruinUnlockSplice: "s7", // Spore filter
    floraTypes: ["sporeStalk", "shelfBracket", "lichen"],
    faunaTypes: ["grazer", "glider", "hunter"]
  },
  "ashfields-coreth": {
    id: "ashfields-coreth",
    name: "Ashfields of Coreth",
    type: "Volcanic chemosynthetic waste",
    description: "A scorching landscape of molten lava vents, silicon-crystalline grazers, and heavy ashfall. Frequent eruption cycles reshape the terrain.",
    signatureEvent: "Magma Eruption Cycle",
    gravity: 1.1,
    skyColor: "#1f0a05",
    groundColor: "#2a150d",
    fogColor: "#1c0d08",
    fogDensity: 0.02,
    ambientLight: "#803518",
    sunLight: "#ff6b35",
    hazards: {
      spores: 0.0,
      cold: 0.0,
      heat: 0.7,
      radiation: 0.2,
      pressure: 0.0
    },
    ruinType: "Thermal Vault",
    ruinDescription: "A Firstseed terraforming spire still venting geothermal energy into the crust.",
    ruinUnlockSplice: "s8", // Feldspar thermal carapace
    floraTypes: ["ventBush", "crystalNode"],
    faunaTypes: ["burrower", "grazer", "lavaStalker"]
  },
  "hollow-steppe": {
    id: "hollow-steppe",
    name: "The Hollow Steppe",
    type: "Vast windswept grassland",
    description: "Continent-spanning megafauna herds move across golden rolling plains. Coordinated pack predators roam beneath towering ancient obelisks.",
    signatureEvent: "The Great Herd Migration",
    gravity: 1.0,
    skyColor: "#131b24",
    groundColor: "#2e3a1f",
    fogColor: "#1e2920",
    fogDensity: 0.008,
    ambientLight: "#6e805d",
    sunLight: "#e6c675",
    hazards: {
      spores: 0.0,
      cold: 0.1,
      heat: 0.1,
      radiation: 0.0,
      pressure: 0.0
    },
    ruinType: "Navigation Obelisk",
    ruinDescription: "A high obelisk broadcasting magnetic pulses that steer animal migrations.",
    ruinUnlockSplice: "s9", // Steppe strider tendons
    floraTypes: ["goldenGrass", "steppeTree"],
    faunaTypes: ["runner", "megafauna", "packHunter"]
  },
  "pallid-reach": {
    id: "pallid-reach",
    name: "Pallid Reach",
    type: "Irradiated crystalline tundra",
    description: "A frozen airless wilderness illuminated by radiation-absorbing glow beasts, aurora curtains, and icy Firstseed ruin complexes.",
    signatureEvent: "Radiation Surge Tide",
    gravity: 0.8,
    skyColor: "#09121d",
    groundColor: "#15222e",
    fogColor: "#0f1c29",
    fogDensity: 0.012,
    ambientLight: "#406882",
    sunLight: "#5fe6d0",
    hazards: {
      spores: 0.0,
      cold: 0.6,
      heat: 0.0,
      radiation: 0.6,
      pressure: 0.0
    },
    ruinType: "Firstseed Citadel Archive",
    ruinDescription: "The densest Firstseed ruin cluster known, containing ancient planetary logs.",
    ruinUnlockSplice: "s10", // Radiotrophic skin matrix
    floraTypes: ["glowCrystal", "iceLichen"],
    faunaTypes: ["glowBurrower", "scout", "tundraWalker"]
  },
  "vantauri-deep": {
    id: "vantauri-deep",
    name: "Vantauri Deep",
    type: "Volumetric ocean world",
    description: "An endless ocean with no landmass. City-scale bioluminescent reefs and deep-trench leviathans thrive under immense hydrostatic pressure.",
    signatureEvent: "Thermal Convergence",
    gravity: 0.9,
    skyColor: "#05131a",
    groundColor: "#0a2633",
    fogColor: "#081e28",
    fogDensity: 0.025,
    ambientLight: "#1f5f7a",
    sunLight: "#4ce0d2",
    hazards: {
      spores: 0.0,
      cold: 0.3,
      heat: 0.0,
      radiation: 0.0,
      pressure: 0.8
    },
    ruinType: "Abyssal Submerged Vault",
    ruinDescription: "A sealed Firstseed chamber resting on the ocean floor at 10,000 meters.",
    ruinUnlockSplice: "s2", // Trench pressure sac
    floraTypes: ["reefCoral", "seaWeed"],
    faunaTypes: ["reefBuilder", "flickerStalker", "leviathan"]
  }
};
