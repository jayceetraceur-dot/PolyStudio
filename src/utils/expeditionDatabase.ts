export interface ExpeditionSiteTemplate {
  id: string;
  category: 'Buried Structure' | 'Ancient Tech' | 'Cultural/Historical' | 'Fossil/Natural' | 'Military/Dangerous' | 'Legendary';
  name: string;
  tier: 'Minor' | 'Forgotten' | 'Ancient' | 'Pre-Storm' | 'Legendary' | 'Unclassified';
  recommendedScoutLevel: number;
  typicalDuration: string; // duration display
  durationHours: number; // actual game simulation hours
  risk: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';
  finds: string[];
  uniqueDiscoveries: { itemKey: string; name: string; description: string }[];
  clues: string;
  suppliesRequired: { item: string; amount: number }[];
  equipmentRequiredOrOptional: { item: string; function: string; optional?: boolean }[];
  allowMultipleScouts: boolean;
  description: string;
}

export const EXPEDITION_SITES: ExpeditionSiteTemplate[] = [
  {
    id: "firstfall_habitat_minor",
    category: "Buried Structure",
    name: "Firstfall Habitat Delta-4",
    tier: "Minor",
    recommendedScoutLevel: 1,
    typicalDuration: "3-10 hours",
    durationHours: 6,
    risk: "Very Low",
    finds: ["wood", "stone", "berries", "fiber"],
    uniqueDiscoveries: [
      { itemKey: "extinctSeed", name: "Skyseed pods", description: "Preserved atmospheric spores of pre-storm floating flora." },
      { itemKey: "archiveTablet", name: "Damaged Colonist Journal", description: "Faded electronic records describing early landing attempts before the Storm erupted." }
    ],
    clues: "Partially exposed carbon-fiber struts buried under several layers of electrostatic sand.",
    suppliesRequired: [{ item: "berries", amount: 5 }],
    equipmentRequiredOrOptional: [{ item: "grassBasket", function: "Increases carrying capacity", optional: true }],
    allowMultipleScouts: false,
    description: "The crushed, dome-shaped hull of an early landing module. It represents the failed dream of permanent settlements before the Storm taught humans humility."
  },
  {
    id: "seed_ark_forgotten",
    category: "Buried Structure",
    name: "Subterranean Seed Ark",
    tier: "Forgotten",
    recommendedScoutLevel: 3,
    typicalDuration: "8-24 hours",
    durationHours: 16,
    risk: "Low",
    finds: ["saltedMeat", "berries", "wood", "fiber"],
    uniqueDiscoveries: [
      { itemKey: "fossilResin", name: "Thunder Resin Jar", description: "Electro-cured sap preserving organic matter." },
      { itemKey: "vacuumVessel", name: "Sealed Pressure Core", description: "Airtight brass capsule holding pressurized planetary air samples." }
    ],
    clues: "Heavy reinforced thermal blast door protruding from the dune edge.",
    suppliesRequired: [{ item: "boiledRoots", amount: 2 }, { item: "reservoirWater", amount: 2 }],
    equipmentRequiredOrOptional: [{ item: "preservationCase", function: "Protects fragile relics", optional: true }],
    allowMultipleScouts: true,
    description: "A cryogenic preservation vault where human colonists tried to isolate Terran crops from the planet's atmospheric wrath. The crops died; only alien mutations remain."
  },
  {
    id: "pressure_engine_vault",
    category: "Buried Structure",
    name: "Pressure Engine Vault",
    tier: "Forgotten",
    recommendedScoutLevel: 3,
    typicalDuration: "8-24 hours",
    durationHours: 18,
    risk: "Low",
    finds: ["copper", "iron", "wood", "stone"],
    uniqueDiscoveries: [
      { itemKey: "precisionGear", name: "Precision Storm Gears", description: "Dense micro-gears built to survive high atmospheric drag." },
      { itemKey: "archiveTablet", name: "Atmospheric Anchoring Schematics", description: "Faded digital diagrams for anchoring habitats against wind pressure." }
    ],
    clues: "Broken compression vents and pneumatic pipes half-submerged in petrified mud.",
    suppliesRequired: [{ item: "saltedMeat", amount: 3 }, { item: "reservoirWater", amount: 3 }],
    equipmentRequiredOrOptional: [{ item: "ruinDiverHarness", function: "Reduces danger in collapsed spaces", optional: true }],
    allowMultipleScouts: false,
    description: "A bunker housing ancient atmospheric compression engines. The colonists used these to generate artificial pressure zones, which the global Storm eventually crushed."
  },
  {
    id: "ancient_migration_station",
    category: "Buried Structure",
    name: "Ancient Migration Station",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 48,
    risk: "Moderate",
    finds: ["iron", "copper", "ancientMaterials", "relics"],
    uniqueDiscoveries: [
      { itemKey: "ancientAlloyPlate", name: "Atmospheric Alloy Plate", description: "A featherlight structural shielding plate designed to deflect micro-debris." },
      { itemKey: "navigationCore", name: "Frictionless Axle Blueprint", description: "A pre-storm blueprint for building storm-resistant caravan wheels." }
    ],
    clues: "Exposed titanium rail tracks curving down into deep bedrock fissures.",
    suppliesRequired: [{ item: "saltedMeat", amount: 6 }, { item: "rainwater", amount: 5 }],
    equipmentRequiredOrOptional: [{ item: "ancientClimbingRig", function: "Shortens shaft expedition duration", optional: true }],
    allowMultipleScouts: true,
    description: "An early underground terminal built when humans first realized they had to move to survive. It became a graveyard when the Eye moved faster than their transit vehicles."
  },
  {
    id: "broken_shield_dome",
    category: "Buried Structure",
    name: "Broken Shield Dome Lambda",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 56,
    risk: "Moderate",
    finds: ["wood", "fiber", "relics", "gold"],
    uniqueDiscoveries: [
      { itemKey: "archiveTablet", name: "False Eye blueprints", description: "Schematics for dome generators that attempted to mimic the Eye's safety." },
      { itemKey: "memoryCrystal", name: "Firstfall Colony Log", description: "Records describing the sudden failure of the local shield during an orbital super-storm." }
    ],
    clues: "Extensive networks of fused-glass pillars reflecting moonlight in the dunes.",
    suppliesRequired: [{ item: "boiledRoots", amount: 6 }, { item: "reservoirWater", amount: 6 }],
    equipmentRequiredOrOptional: [
      { item: "ruinBreathingMask", function: "Protects against toxic dust", optional: true },
      { item: "echoMapper", function: "Reveals hidden rooms", optional: true }
    ],
    allowMultipleScouts: true,
    description: "The ruins of a geodesic city once protected by an electrostatic shield. When the generators failed, the Storm wall swallowed the city whole. A reminder of the folly of permanent brick and stone."
  },
  {
    id: "firstfall_shelter_sealed",
    category: "Buried Structure",
    name: "Sealed Firstfall Shelter",
    tier: "Ancient",
    recommendedScoutLevel: 4,
    typicalDuration: "8-24 hours",
    durationHours: 24,
    risk: "Moderate",
    finds: ["mushrooms", "dew", "ancientMaterials"],
    uniqueDiscoveries: [
      { itemKey: "vacuumVessel", name: "High-Efficiency Dew Collector", description: "Synthetic carbon-filter components designed to extract water from storm wind." },
      { itemKey: "archiveTablet", name: "Nomadic Ration Recipes", description: "Early survival formulas for compact nutrient blocks." }
    ],
    clues: "A glowing blue biometric airlock panel half-excavated, blinking with automated emergency diagnostics.",
    suppliesRequired: [{ item: "saltedMeat", amount: 4 }, { item: "reservoirWater", amount: 4 }],
    equipmentRequiredOrOptional: [{ item: "structuralScanner", function: "Warns about cave-ins", optional: true }],
    allowMultipleScouts: false,
    description: "An emergency shelter built deep into solid mountain bedrock. Unlike surface cities, this survived because it didn't challenge the wind, though its occupants eventually had to venture out as nomads."
  },
  {
    id: "buried_terraforming_spine",
    category: "Buried Structure",
    name: "Buried Terraforming Spine",
    tier: "Ancient",
    recommendedScoutLevel: 6,
    typicalDuration: "1-3 days",
    durationHours: 64,
    risk: "Moderate",
    finds: ["copper", "silver", "gold", "iron"],
    uniqueDiscoveries: [
      { itemKey: "starMetalFragment", name: "Moon-Iron Shards", description: "Highly reflective, heavy alien ore displaying magnetic alignment." },
      { itemKey: "deepCrystal", name: "Sub-Crust Root Crystal", description: "A crystal that pulses in tandem with the planet's atmospheric currents." }
    ],
    clues: "Massive drill shafts lined with mineral crystals glowing under the moonlight.",
    suppliesRequired: [{ item: "saltedMeat", amount: 8 }, { item: "dew", amount: 8 }],
    equipmentRequiredOrOptional: [{ item: "expeditionLantern", function: "Eliminates fuel requirements, lessens dark danger", optional: true }],
    allowMultipleScouts: true,
    description: "A subterranean machine designed to inject alien soil with earth-like cultures. It was torn asunder by tectonic-atmospheric shifts, leaving a vein of raw Moon-Iron and petrified roots."
  },
  {
    id: "failed_artificial_eye",
    category: "Buried Structure",
    name: "Failed Artificial Eye Site",
    tier: "Pre-Storm",
    recommendedScoutLevel: 7,
    typicalDuration: "2-5 days",
    durationHours: 96,
    risk: "High",
    finds: ["relics", "ancientMaterials", "silver"],
    uniqueDiscoveries: [
      { itemKey: "logicCore", name: "Storm-Predicting Matrix", description: "A dense computer module designed to track the Eye Above." },
      { itemKey: "stormLens", name: "Stormglass Lens Shard", description: "Flawless, laser-cut glass designed to measure electrostatic charges." }
    ],
    clues: "A colossal, dead sapphire hemisphere sticking out of the dunes, half-shielded by carbon armor plates.",
    suppliesRequired: [{ item: "saltedMeat", amount: 10 }, { item: "reservoirWater", amount: 10 }],
    equipmentRequiredOrOptional: [{ item: "sealedExpeditionSuit", function: "Blocks radiation and hazardous bio-agents", optional: false }],
    allowMultipleScouts: false,
    description: "An observatory built to create an artificial 'Eye'—a safe sector of calm air that would remain permanent. The project imploded, creating an electrostatic vortex."
  },
  {
    id: "stormbreaker_tower_minor",
    category: "Ancient Tech",
    name: "Stormbreaker Tower Spire",
    tier: "Pre-Storm",
    recommendedScoutLevel: 7,
    typicalDuration: "1-3 days",
    durationHours: 48,
    risk: "High",
    finds: ["ancientMaterials", "relics", "dew"],
    uniqueDiscoveries: [
      { itemKey: "stormLens", name: "Refractive Stormglass Prism", description: "A highly calibrated crystal capable of redirecting lightning." },
      { itemKey: "deepCrystal", name: "Static Charge Barometer", description: "A delicate instrument used by the Oracle to sense approaching sand walls." }
    ],
    clues: "A high-altitude alloy spire catching storm lightning, humming with unstable energy.",
    suppliesRequired: [{ item: "boiledRoots", amount: 6 }, { item: "rainwater", amount: 6 }],
    equipmentRequiredOrOptional: [{ item: "surveyorsLens", function: "Speeds up navigation and landmark detection", optional: true }],
    allowMultipleScouts: true,
    description: "A defensive outpost armed with cloud-seeding and wind-dampening lasers. It stands frozen in a perpetual state of firing, attracting localized lightnings."
  },
  {
    id: "moon_signal_relay_minor",
    category: "Ancient Tech",
    name: "Moon-Signal Relay Site",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 40,
    risk: "Moderate",
    finds: ["copper", "relics", "ancientMaterials"],
    uniqueDiscoveries: [
      { itemKey: "navigationCore", name: "Lunar Orbit Map Chip", description: "Data fragments tracing the orbital path of the Eye Above." }
    ],
    clues: "A rotating dish head buried in sand, clicking rhythmically as if trying to speak to the moon.",
    suppliesRequired: [{ item: "saltedMeat", amount: 5 }, { item: "reservoirWater", amount: 5 }],
    equipmentRequiredOrOptional: [{ item: "ancientCompass", function: "Speeds up route calculation", optional: true }],
    allowMultipleScouts: false,
    description: "A communication tower once linked to the colonists' colony ship in orbit. The tribe believes it is a sacred temple that spoke directly to the God's Eye (the moon)."
  },
  {
    id: "bioforming_gardens_ancient",
    category: "Ancient Tech",
    name: "Bioforming Garden Sinks",
    tier: "Pre-Storm",
    recommendedScoutLevel: 8,
    typicalDuration: "2-5 days",
    durationHours: 110,
    risk: "High",
    finds: ["iron", "ancientMaterials", "copper"],
    uniqueDiscoveries: [
      { itemKey: "pristineMachineCore", name: "Synthesizer core", description: "An automated chemical mixer used to fabricate organic binders." },
      { itemKey: "logicCore", name: "Bio-seeding blueprints", description: "Instruction templates for cultivating storm-resistant spore flora." }
    ],
    clues: "Exposed greenhouse tubes occasionally puffing moist, nitrogen-rich air from beneath the cracked shale.",
    suppliesRequired: [{ item: "saltedMeat", amount: 12 }, { item: "reservoirWater", amount: 12 }],
    equipmentRequiredOrOptional: [{ item: "ruinDiverHarness", function: "Safely cross mechanical gears", optional: true }],
    allowMultipleScouts: true,
    description: "An underground hydroponic nursery where colonists tried to splice Earth crops with local desert weeds. The result is a wild, toxic garden guarded by defensive automated drones."
  },
  {
    id: "atmospheric_anchor_vault",
    category: "Ancient Tech",
    name: "Atmospheric Anchor Vault",
    tier: "Pre-Storm",
    recommendedScoutLevel: 7,
    typicalDuration: "2-5 days",
    durationHours: 84,
    risk: "High",
    finds: ["copper", "ancientMaterials", "gold"],
    uniqueDiscoveries: [
      { itemKey: "ancientPowerCell", name: "Static Battery Core", description: "An indestructible capsule humming with captured lightning power." },
      { itemKey: "logicCore", name: "Pressure Regulator Plate", description: "A heavy circuit board that maintains a stable pressure envelope." }
    ],
    clues: "Deep electric crackles and localized static charges that make hair stand on end within 30 meters.",
    suppliesRequired: [{ item: "saltedMeat", amount: 8 }, { item: "reservoirWater", amount: 8 }],
    equipmentRequiredOrOptional: [{ item: "relicDetector", function: "Identifies safe circuit nodes", optional: true }],
    allowMultipleScouts: false,
    description: "A reinforced underground facility once meant to anchor the wind. It failed when the Storm bypassed its magnetic coils, but the power cells inside are still fully active."
  },
  {
    id: "seed_ark_metropolis",
    category: "Ancient Tech",
    name: "Grand Seed Ark Enclave",
    tier: "Ancient",
    recommendedScoutLevel: 6,
    typicalDuration: "1-3 days",
    durationHours: 52,
    risk: "Moderate",
    finds: ["berries", "roots", "mushrooms", "dew"],
    uniqueDiscoveries: [
      { itemKey: "extinctSeed", name: "Skyseed pod specimens", description: "High-grade pre-storm spore shells that grow into buoyant, water-storing plants." },
      { itemKey: "vacuumVessel", name: "Soil-Moistening Regulator", description: "Ancient irrigation matrix blueprints." }
    ],
    clues: "Damp, sweet soil smell leaking from a rusted copper ventilation hatch.",
    suppliesRequired: [{ item: "boiledRoots", amount: 5 }, { item: "reservoirWater", amount: 5 }],
    equipmentRequiredOrOptional: [{ item: "preservationCase", function: "Protects biological seed integrity", optional: true }],
    allowMultipleScouts: true,
    description: "A major biological vault. It preserves the genome of pre-storm flora and failed Terran hybrid crops, buried deep enough to escape the radioactive static walls."
  },
  {
    id: "bioforming_enclave",
    category: "Ancient Tech",
    name: "Bioforming Laboratory Sector",
    tier: "Pre-Storm",
    recommendedScoutLevel: 8,
    typicalDuration: "2-5 days",
    durationHours: 90,
    risk: "High",
    finds: ["dew", "mushrooms", "silver"],
    uniqueDiscoveries: [
      { itemKey: "regenerationCompound", name: "Concentrated Bioforming Gel", description: "An organic compound that seals physical wounds and accelerates cell division." },
      { itemKey: "sterileAncientCloth", name: "Synthetic Skin Bandages", description: "Bio-synthetic fabric used to bind injuries." }
    ],
    clues: "An airtight steel airlock leaking dry ethanol vapor and cold, filtered oxygen.",
    suppliesRequired: [{ item: "saltedMeat", amount: 8 }, { item: "reservoirWater", amount: 8 }],
    equipmentRequiredOrOptional: [{ item: "ruinBreathingMask", function: "Protects against toxic medical gases", optional: false }],
    allowMultipleScouts: true,
    description: "A laboratory specialized in bioforming. Here, researchers analyzed how human DNA could be adjusted to withstand the planet's atmospheric density."
  },
  {
    id: "echo_vault_comm",
    category: "Ancient Tech",
    name: "Echo Vault Communication Hub",
    tier: "Pre-Storm",
    recommendedScoutLevel: 6,
    typicalDuration: "1-3 days",
    durationHours: 60,
    risk: "Moderate",
    finds: ["relics", "ancientMaterials", "copper"],
    uniqueDiscoveries: [
      { itemKey: "archiveTablet", name: "Decryption Slate", description: "Telecommunication modules that can translate ancient warning signals." },
      { itemKey: "navigationCore", name: "Pre-Storm City Coordinates", description: "A solid navigation map listing the coordinates of major failed settlements." }
    ],
    clues: "A massive satellite receiver dish buried vertically in a rocky ridge, occasionally reflecting moonlight.",
    suppliesRequired: [{ item: "saltedMeat", amount: 6 }, { item: "reservoirWater", amount: 6 }],
    equipmentRequiredOrOptional: [{ item: "echoMapper", function: "Maps out communications relays", optional: true }],
    allowMultipleScouts: false,
    description: "A central terminal once used to coordinate evacuations when the cities fell. It continuously broadcasts automated distress loops that sound like whispers of ghosts to the tribe."
  },
  {
    id: "failed_artificial_eye_metropolis",
    category: "Ancient Tech",
    name: "Artificial Eye Core",
    tier: "Legendary",
    recommendedScoutLevel: 9,
    typicalDuration: "4-8 days",
    durationHours: 144,
    risk: "Very High",
    finds: ["ancientMaterials", "relics", "gold", "iron"],
    uniqueDiscoveries: [
      { itemKey: "logicCore", name: "Luminous Hover Construct", description: "An inactive, drone construct that can float and assist caravans." },
      { itemKey: "pristineMachineCore", name: "Pristine Navigation Core", description: "An intact gravity-stabilization engine processor." }
    ],
    clues: "Faint blue lightning flares pulsing deep underground, accompanied by low humming vibration.",
    suppliesRequired: [{ item: "saltedMeat", amount: 15 }, { item: "reservoirWater", amount: 15 }],
    equipmentRequiredOrOptional: [{ item: "structuralScanner", function: "Protects against robot defense collapses", optional: false }],
    allowMultipleScouts: true,
    description: "The core facility of the artificial dome network. Here, the final attempts to rewrite the planet's weather patterns were made before the global Storm tore down the colony's power grid."
  },
  {
    id: "root_crystal_ossuary",
    category: "Cultural/Historical",
    name: "Root-Crystal Ossuary",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 48,
    risk: "Moderate",
    finds: ["gold", "silver", "relics", "bone"],
    uniqueDiscoveries: [
      { itemKey: "relics", name: "God-Eye Totem Shard", description: "A beautifully polished crystal carved in the shape of the Moon-Eye." }
    ],
    clues: "Ancient stone monoliths with glowing roots wrapping around skeletal remains inside an obsidian cleft.",
    suppliesRequired: [{ item: "boiledRoots", amount: 6 }, { item: "reservoirWater", amount: 6 }],
    equipmentRequiredOrOptional: [{ item: "artifactSatchel", function: "Safely wraps sacred relics to prevent damage", optional: true }],
    allowMultipleScouts: false,
    description: "A ceremonial burial site where early nomads laid their dead. Over time, root-crystals grew through their bones, creating beautiful fossilized shrines sacred to the Oracle."
  },
  {
    id: "echo_vault_minor",
    category: "Cultural/Historical",
    name: "Echo Vault Memorial Archive",
    tier: "Minor",
    recommendedScoutLevel: 2,
    typicalDuration: "3-10 hours",
    durationHours: 8,
    risk: "Very Low",
    finds: ["stone", "fiber", "wood"],
    uniqueDiscoveries: [
      { itemKey: "archiveTablet", name: "Chronicle of the Great Humbling", description: "A digital slate detailing how the colonists chose to abandon their stone walls and follow the Eye." }
    ],
    clues: "A circle of smooth alloy plates standing upright, etched with thousands of names.",
    suppliesRequired: [{ item: "berries", amount: 4 }],
    equipmentRequiredOrOptional: [{ item: "preservationCase", function: "Protects ancient tablets from cracking", optional: true }],
    allowMultipleScouts: false,
    description: "A monument dedicated to the casualties of the early colony war against the Storm. It contains logs of scientists realizing that adaptation, not conquest, is the only key to survival."
  },
  {
    id: "storm_taken_altar",
    category: "Cultural/Historical",
    name: "Storm-Taken Altar of the Eye",
    tier: "Ancient",
    recommendedScoutLevel: 6,
    typicalDuration: "1-3 days",
    durationHours: 72,
    risk: "Moderate",
    finds: ["relics", "gold", "bone", "dew"],
    uniqueDiscoveries: [
      { itemKey: "heartwoodCrystal", name: "Sacred Moon-Lens Blueprint", description: "Etched copper templates showing how to construct the Oracle's focus lenses." }
    ],
    clues: "Fallen glass obelisks and sand-blasted arches barely visible through heavy electrostatic haze.",
    suppliesRequired: [{ item: "saltedMeat", amount: 6 }, { item: "reservoirWater", amount: 6 }],
    equipmentRequiredOrOptional: [{ item: "expeditionLantern", function: "Safely navigate dark ritual chambers", optional: true }],
    allowMultipleScouts: true,
    description: "An early shrine built where the Eye of the Storm stalled for an entire month, long ago. Early colonists began treating the calm as a blessing from the Moon-Eye."
  },
  {
    id: "firstfall_enclave",
    category: "Cultural/Historical",
    name: "Firstfall Enclave Ruins",
    tier: "Forgotten",
    recommendedScoutLevel: 3,
    typicalDuration: "8-24 hours",
    durationHours: 20,
    risk: "Low",
    finds: ["wood", "fiber", "berries", "stone"],
    uniqueDiscoveries: [
      { itemKey: "archiveTablet", name: "Meteorological Records", description: "A collection of data slides detailing the mathematical rhythm of the Storm's movement." }
    ],
    clues: "Rusted dome structures and shattered solar sails surrounded by dry desert shrubs.",
    suppliesRequired: [{ item: "boiledRoots", amount: 3 }, { item: "reservoirWater", amount: 3 }],
    equipmentRequiredOrOptional: [{ item: "preservationCase", function: "Protects paper records", optional: true }],
    allowMultipleScouts: false,
    description: "A ruined compound where early colonists lived during the first decade. It contains simple learning materials, diaries of children marveling at the blue sky, and maps of an earth they would never see."
  },
  {
    id: "stormbreaker_enclave",
    category: "Cultural/Historical",
    name: "Stormbreaker Council Hall",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 42,
    risk: "Moderate",
    finds: ["relics", "silver", "wood", "fiber"],
    uniqueDiscoveries: [
      { itemKey: "archiveTablet", name: "Surrender Compact Log", description: "The historical record of the first five clans agreeing to live together under the Eye." }
    ],
    clues: "Shattered metallic columns arranged in a wide circle on a rocky ledge.",
    suppliesRequired: [{ item: "saltedMeat", amount: 5 }, { item: "reservoirWater", amount: 5 }],
    equipmentRequiredOrOptional: [{ item: "echoMapper", function: "Finds locked vaults", optional: true }],
    allowMultipleScouts: false,
    description: "The meeting hall where the first colonists sat to debate their surrender. Here, they agreed to abandon their heavy machines, take up walking staffs, and follow the Moon-Eye."
  },
  {
    id: "pre_storm_migration_camp",
    category: "Cultural/Historical",
    name: "Pre-Storm Migration Camp",
    tier: "Minor",
    recommendedScoutLevel: 2,
    typicalDuration: "3-10 hours",
    durationHours: 10,
    risk: "Low",
    finds: ["meat", "hide", "bone", "wood"],
    uniqueDiscoveries: [
      { itemKey: "navigationCore", name: "Faded Migration Trail Map", description: "A mapped path tracing historical movements of the Eye over the last century." }
    ],
    clues: "Shattered bone poles and leather tents half-buried in a sandy valley.",
    suppliesRequired: [{ item: "berries", amount: 6 }],
    equipmentRequiredOrOptional: [{ item: "grassBasket", function: "Hauls camp items", optional: true }],
    allowMultipleScouts: true,
    description: "An abandoned campsite of another nomad tribe that moved on days ago. Contains crude survival bone tools and discarded gear."
  },
  {
    id: "echo_archive_sealed",
    category: "Cultural/Historical",
    name: "Sealed Echo Archive",
    tier: "Pre-Storm",
    recommendedScoutLevel: 8,
    typicalDuration: "2-5 days",
    durationHours: 120,
    risk: "High",
    finds: ["relics", "ancientMaterials", "gold", "silver"],
    uniqueDiscoveries: [
      { itemKey: "archiveTablet", name: "Advanced Oracle blueprint", description: "Instructions for constructing high-precision mapping terminals." },
      { itemKey: "memoryCrystal", name: "Atmospheric History Crystal", description: "A crystal matrix containing pre-storm data that proves the Storm has a predictable biological pulse." }
    ],
    clues: "Heavy reinforced metal vault door embossed with a stylized double-eye motif.",
    suppliesRequired: [{ item: "saltedMeat", amount: 10 }, { item: "reservoirWater", amount: 10 }],
    equipmentRequiredOrOptional: [
      { item: "preservationCase", function: "Safeguards fragile paper documents", optional: false },
      { item: "relicDetector", function: "Bypasses automated security panels", optional: true }
    ],
    allowMultipleScouts: true,
    description: "A perfectly preserved library vault. Unlike other structures, it contains no weapons—only centuries of atmospheric data, colonist diaries, and maps of the moving Eye."
  },
  {
    id: "fossil_megafauna_hollows",
    category: "Fossil/Natural",
    name: "Fossil Megafauna Hollows",
    tier: "Ancient",
    recommendedScoutLevel: 4,
    typicalDuration: "1-3 days",
    durationHours: 36,
    risk: "Moderate",
    finds: ["bone", "stone", "copper", "iron"],
    uniqueDiscoveries: [
      { itemKey: "titanBone", name: "Colossal Windbone Skeleton", description: "A massive fossilized wing-strut of a prehistoric flying titan." },
      { itemKey: "fossilResin", name: "Fossilized Thunder-Sap", description: "Petrified amber holding extinct plant spores." }
    ],
    clues: "Giant curved bone columns sticking out of a deep rocky ravine like petrified tree trunks.",
    suppliesRequired: [{ item: "boiledRoots", amount: 4 }, { item: "reservoirWater", amount: 4 }],
    equipmentRequiredOrOptional: [{ item: "ruinDiverHarness", function: "Protects scouts when descending bone crevices", optional: true }],
    allowMultipleScouts: true,
    description: "A dry canyon filled with the skeleton remains of extinct, mountain-sized flying creatures. Their hollow rib cages are large enough to shelter an entire caravan."
  },
  {
    id: "wind_rider_nest",
    category: "Fossil/Natural",
    name: "Wind-Rider Nesting Grounds",
    tier: "Forgotten",
    recommendedScoutLevel: 3,
    typicalDuration: "8-24 hours",
    durationHours: 24,
    risk: "Low",
    finds: ["bone", "stone", "fiber"],
    uniqueDiscoveries: [
      { itemKey: "extinctSeed", name: "Fossilized Egg Shells", description: "Thick, calcified shells of pre-storm storm-adapted flying beasts." },
      { itemKey: "ancientAlloyPlate", name: "Petrified Feather Plating", description: "A lightweight organic matrix with steel-like structural strength." }
    ],
    clues: "Circular sand-mounds lined with fossilized egg fragments catching the moon's reflection.",
    suppliesRequired: [{ item: "boiledRoots", amount: 3 }, { item: "reservoirWater", amount: 3 }],
    equipmentRequiredOrOptional: [{ item: "preservationCase", function: "Saves egg shells", optional: true }],
    allowMultipleScouts: false,
    description: "The nesting site of the ancient Wind-Riders, colossal birds that lived in the upper storm clouds. The tribe's legends say they would carry children who fell outside the Eye back to safety."
  },
  {
    id: "root_crystal_chamber_minor",
    category: "Fossil/Natural",
    name: "Root-Crystal Chamber",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 48,
    risk: "Moderate",
    finds: ["wood", "dew", "mushrooms"],
    uniqueDiscoveries: [
      { itemKey: "heartwoodCrystal", name: "Vibrant Root Crystal Core", description: "A pure, glowing energy crystal grown within a petrified megatree core." },
      { itemKey: "livingResinResidue", name: "Sticky Thunder Sap Residue", description: "Uncured organic sap with incredible bonding strength." }
    ],
    clues: "A glowing sap fissure in a hollow cliff side near a massive petrified root.",
    suppliesRequired: [{ item: "saltedMeat", amount: 5 }, { item: "reservoirWater", amount: 5 }],
    equipmentRequiredOrOptional: [{ item: "artifactSatchel", function: "Carries sticky resin safely", optional: true }],
    allowMultipleScouts: false,
    description: "A cave formed inside the root systems of a dead, petrified megatree. Tectonic pressure and lightning strikes have converted its sap into glowing energy crystals."
  },
  {
    id: "root_crystal_grove",
    category: "Fossil/Natural",
    name: "Root-Crystal Grove",
    tier: "Forgotten",
    recommendedScoutLevel: 3,
    typicalDuration: "8-24 hours",
    durationHours: 18,
    risk: "Low",
    finds: ["wood", "stone", "berries"],
    uniqueDiscoveries: [
      { itemKey: "fossilResin", name: "Aromatic Thunder Resin", description: "Hardened golden sap that emits a calming, therapeutic scent." },
      { itemKey: "extinctSeed", name: "Ancient Petritree Sapling", description: "Seeds of petrified megatrees preserved in amber." }
    ],
    clues: "Golden, translucent crystal nodules catching the morning light along a clay creek bed.",
    suppliesRequired: [{ item: "boiledRoots", amount: 2 }, { item: "reservoirWater", amount: 2 }],
    equipmentRequiredOrOptional: [{ item: "preservationCase", function: "Safeguards fragile amber", optional: true }],
    allowMultipleScouts: true,
    description: "A shallow subterranean grove where petrified roots are saturated with amber resin. Excellent material for crafting sacred staves and Oracle instruments."
  },
  {
    id: "bioforming_garden_minor",
    category: "Fossil/Natural",
    name: "Spore Bioforming Garden",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 54,
    risk: "Moderate",
    finds: ["mushrooms", "fiber", "dew", "meat"],
    uniqueDiscoveries: [
      { itemKey: "sterileAncientCloth", name: "Bioluminescent Mycelium Spores", description: "Luminous spores that can be cultivated to purify water." }
    ],
    clues: "Fluorescent cyan spores drifting out of a wet cave crack, carrying a cool moisture scent.",
    suppliesRequired: [{ item: "boiledRoots", amount: 6 }, { item: "reservoirWater", amount: 6 }],
    equipmentRequiredOrOptional: [{ item: "ruinBreathingMask", function: "Required to survive toxic fungal spores", optional: false }],
    allowMultipleScouts: true,
    description: "A pocket ecosystem that survived the colony collapse. It is filled with pre-storm bioluminescent fungi that grow only in high-humidity storm-fronts."
  },
  {
    id: "root_crystal_ossuary_deep",
    category: "Fossil/Natural",
    name: "Crystalline Skeleton Caves",
    tier: "Pre-Storm",
    recommendedScoutLevel: 7,
    typicalDuration: "2-5 days",
    durationHours: 80,
    risk: "High",
    finds: ["stone", "gold", "silver", "relics"],
    uniqueDiscoveries: [
      { itemKey: "memoryCrystal", name: "Nomadic Memory Crystal", description: "An ancient data recording detailing the first migrations." },
      { itemKey: "resonantFossilShard", name: "Resonant Windbone Flute", description: "A hollow bone that hums with a beautiful melody when wind passes through." }
    ],
    clues: "Harmonic chime vibrations emanating from a deep granite fissure.",
    suppliesRequired: [{ item: "saltedMeat", amount: 8 }, { item: "reservoirWater", amount: 8 }],
    equipmentRequiredOrOptional: [{ item: "echoMapper", function: "Speeds up navigation via acoustics", optional: true }],
    allowMultipleScouts: false,
    description: "A deep geological fault where petrified remains and ancient nomad bones have fused with mineral crystals under extreme tectonic heat."
  },
  {
    id: "storm_rider_arsenal",
    category: "Military/Dangerous",
    name: "Storm-Rider Arsenal",
    tier: "Pre-Storm",
    recommendedScoutLevel: 7,
    typicalDuration: "2-5 days",
    durationHours: 72,
    risk: "High",
    finds: ["iron", "copper", "ancientMaterials"],
    uniqueDiscoveries: [
      { itemKey: "starMetalFragment", name: "Windbone Harpoon Tip", description: "Heavy alloy tips designed to anchor nomadic structures in gale winds." },
      { itemKey: "ancientAlloyPlate", name: "Reinforced Alloy Plating", description: "High-integrity metal sheets salvageable for caravan armor." }
    ],
    clues: "Heavy carbon-fiber blast doors etched with crossed lightning and staff icons.",
    suppliesRequired: [{ item: "saltedMeat", amount: 6 }, { item: "reservoirWater", amount: 6 }],
    equipmentRequiredOrOptional: [{ item: "ruinDiverHarness", function: "Safely navigate heavy collapsing racks", optional: true }],
    allowMultipleScouts: true,
    description: "A military supply bunker built by 'Storm Riders'—the early human squads who ventured outside the safe zones to repair weather towers."
  },
  {
    id: "atmospheric_anchor_bunker",
    category: "Military/Dangerous",
    name: "Atmospheric Anchor Bunker",
    tier: "Pre-Storm",
    recommendedScoutLevel: 8,
    typicalDuration: "2-5 days",
    durationHours: 96,
    risk: "High",
    finds: ["saltedMeat", "iron", "copper", "ancientMaterials"],
    uniqueDiscoveries: [
      { itemKey: "ancientAlloyPlate", name: "Storm-Resistant Caravan Blueprint", description: "Schematics for building stormproof shelters." },
      { itemKey: "vacuumVessel", name: "Reinforced Pressure Core", description: "Heavy stabilization core designed to counteract tornado force." }
    ],
    clues: "A massive, circular blast hatch embedded flush into a vertical bedrock cliff face.",
    suppliesRequired: [{ item: "saltedMeat", amount: 10 }, { item: "reservoirWater", amount: 10 }],
    equipmentRequiredOrOptional: [{ item: "structuralScanner", function: "Warns of blast lock collapses", optional: false }],
    allowMultipleScouts: true,
    description: "A sealed command center built to manage the planetary weather towers. It is guarded by automated high-voltage turrets that still perceive humans as unauthorized trespassers."
  },
  {
    id: "precursor_defense_trench",
    category: "Military/Dangerous",
    name: "Precursor Defense Trench",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 48,
    risk: "Moderate",
    finds: ["bone", "iron", "copper", "relics"],
    uniqueDiscoveries: [
      { itemKey: "ancientAlloyPlate", name: "Shattered Storm-Shield Array", description: "Fragments of an early mobile shield generator." }
    ],
    clues: "Rusted metallic defensive lines and spear-tipped poles sticking out of an ash valley like grave markers.",
    suppliesRequired: [{ item: "boiledRoots", amount: 5 }, { item: "reservoirWater", amount: 5 }],
    equipmentRequiredOrOptional: [{ item: "relicDetector", function: "Pinpoints buried weapon caches", optional: true }],
    allowMultipleScouts: true,
    description: "The site of a tragic battle where early human soldiers tried to defend their settlement against a shifting storm front. Their weapons are rusted, and their armor is fused with sand."
  },
  {
    id: "atmospheric_control_containment",
    category: "Military/Dangerous",
    name: "Atmospheric Control Containment",
    tier: "Legendary",
    recommendedScoutLevel: 9,
    typicalDuration: "4-8 days",
    durationHours: 120,
    risk: "Extreme",
    finds: ["relics", "ancientMaterials", "gold", "bone"],
    uniqueDiscoveries: [
      { itemKey: "pristineMachineCore", name: "Vortex Inductor Core", description: "A highly unstable gravity core capable of creating localized vacuums." },
      { itemKey: "logicCore", name: "Atmospheric Mutator Module", description: "Hardware tracking the genetic adaptation of plants in high-friction wind." }
    ],
    clues: "Deep, terrifying wind-howls and vibrating alloy walls beneath the sand, leaking static charge.",
    suppliesRequired: [{ item: "saltedMeat", amount: 12 }, { item: "reservoirWater", amount: 12 }],
    equipmentRequiredOrOptional: [
      { item: "sealedExpeditionSuit", function: "Imperative to block containment gas leakages", optional: false },
      { item: "scoutSignalBeacon", function: "Enables emergency extraction", optional: true }
    ],
    allowMultipleScouts: false,
    description: "An ultra-reinforced bunker designed to contain a simulated planetary vortex. Low-level scouts will refuse to enter due to the crushing wind-pressures and active defense barriers."
  },
  {
    id: "pilgrim_wreck",
    category: "Military/Dangerous",
    name: "Pilgrim Land-Cruiser Wreck",
    tier: "Legendary",
    recommendedScoutLevel: 8,
    typicalDuration: "2-5 days",
    durationHours: 100,
    risk: "High",
    finds: ["iron", "ancientMaterials", "copper", "gold"],
    uniqueDiscoveries: [
      { itemKey: "pristineMachineCore", name: "Nomadic Engine Core", description: "A high-output thermal engine core suitable for advanced mobile bases." },
      { itemKey: "ancientAlloyPlate", name: "Indestructible Wheel Shielding", description: "Heavy titanium armor plate to construct stormproof caravans." }
    ],
    clues: "A colossal rusted wheel chassis, larger than a forest tree, sticking out of a deep canyon bed.",
    suppliesRequired: [{ item: "saltedMeat", amount: 8 }, { item: "reservoirWater", amount: 8 }],
    equipmentRequiredOrOptional: [{ item: "ruinDiverHarness", function: "Allows crawling inside tight engine shafts", optional: true }],
    allowMultipleScouts: true,
    description: "The wreckage of a skyscraper-sized land vehicle used during the first great migrations. It collapsed when the Eye moved into a mountain range, forcing the survivors to travel lighter."
  },
  {
    id: "feral_storm_catcher_nest",
    category: "Military/Dangerous",
    name: "Feral Storm-Catcher Nest",
    tier: "Forgotten",
    recommendedScoutLevel: 4,
    typicalDuration: "8-24 hours",
    durationHours: 16,
    risk: "High",
    finds: ["meat", "hide", "bone", "relics"],
    uniqueDiscoveries: [
      { itemKey: "titanBone", name: "Alphascale Skull Shield", description: "The dense horn of an apex predator that protects caravans from flying debris." }
    ],
    clues: "Gnawed windbones and fresh wild predator tracks leading into a beautifully carved stone temple entrance.",
    suppliesRequired: [{ item: "saltedMeat", amount: 4 }],
    equipmentRequiredOrOptional: [{ item: "spear", function: "Fends off nesting beasts", optional: false }],
    allowMultipleScouts: true,
    description: "Dangerous, storm-adapted predators have nested inside a ruined weather tower control room. Highly valuable data slides are guarded by these feral beasts."
  },
  {
    id: "storm_taken_city_gate",
    category: "Legendary",
    name: "Storm-Taken City Gate",
    tier: "Legendary",
    recommendedScoutLevel: 9,
    typicalDuration: "4-8 days",
    durationHours: 168,
    risk: "Very High",
    finds: ["gold", "silver", "copper", "iron", "relics", "ancientMaterials"],
    uniqueDiscoveries: [
      { itemKey: "navigationCore", name: "Global Migration Chart", description: "A complete mapping chip of the planet's atmospheric currents." },
      { itemKey: "pristineMachineCore", name: "The Humbling Chronicle", description: "A holographic journal showing the final moments of the city's leaders realizing they should have migrated." }
    ],
    clues: "A colossal concrete barrier wall stretching hundreds of meters, with a main security gate buried under sand dunes.",
    suppliesRequired: [{ item: "saltedMeat", amount: 15 }, { item: "reservoirWater", amount: 15 }],
    equipmentRequiredOrOptional: [
      { item: "ancientCompass", function: "Prevents scouts from becoming lost in massive sewer sectors", optional: true },
      { item: "echoMapper", function: "Finds secret residential vaults", optional: true }
    ],
    allowMultipleScouts: true,
    description: "The gateway to New Rome, the largest permanent city built by the colonists. It stands as a silent monument of dust—a testament that those who build permanent walls are eventually swallowed by the Storm."
  },
  {
    id: "root_crystal_cavern",
    category: "Legendary",
    name: "Root-Crystal Megacavern",
    tier: "Legendary",
    recommendedScoutLevel: 8,
    typicalDuration: "4-8 days",
    durationHours: 130,
    risk: "Moderate",
    finds: ["wood", "mushrooms", "dew", "relics"],
    uniqueDiscoveries: [
      { itemKey: "heartwoodCrystal", name: "Organic Habitat Blueprint", description: "Instructions on how to grow shelters from live petritree roots instead of cutting them." },
      { itemKey: "livingResinResidue", name: "Deep Earth Botanical Chart", description: "Geological maps showing where underground water pockets reside." }
    ],
    clues: "A narrow hollow gap inside a colossal petrified root, leaking glowing cyan sap.",
    suppliesRequired: [{ item: "boiledRoots", amount: 10 }, { item: "reservoirWater", amount: 10 }],
    equipmentRequiredOrOptional: [{ item: "ancientClimbingRig", function: "Accelerates vertical tree trunk climbing", optional: true }],
    allowMultipleScouts: false,
    description: "An immense underground hollow within the roots of the World Tree. The crystal density here is so high that the cavern floor glows like a sea of stars under the moon."
  },
  {
    id: "stormbreaker_spire_core",
    category: "Legendary",
    name: "Stormbreaker Spire Core",
    tier: "Legendary",
    recommendedScoutLevel: 9,
    typicalDuration: "4-8 days",
    durationHours: 150,
    risk: "Very High",
    finds: ["ancientMaterials", "relics", "dew"],
    uniqueDiscoveries: [
      { itemKey: "stormLens", name: "God-Eye Focusing Prism", description: "The ultimate focal lens used to construct the Oracle's storm prediction engines." },
      { itemKey: "pristineMachineCore", name: "Firstfall Planetary Survey", description: "Scientific logs showing that the Storm was actually created by the planet's ecosystem to heal itself." }
    ],
    clues: "A massive alloy base surrounded by crackling gravity fields, with hums heard kilometers away.",
    suppliesRequired: [{ item: "saltedMeat", amount: 12 }, { item: "reservoirWater", amount: 12 }],
    equipmentRequiredOrOptional: [{ item: "sealedExpeditionSuit", function: "Required to survive electrostatic currents", optional: false }],
    allowMultipleScouts: true,
    description: "The core power station of the global Weather Grid. It contains the most valuable Oracle materials and the true story of how the colonists' attempts to destroy the Storm nearly broke the planet."
  },
  {
    id: "grand_echo_vault",
    category: "Legendary",
    name: "Grand Echo Vault",
    tier: "Legendary",
    recommendedScoutLevel: 10,
    typicalDuration: "4-8 days",
    durationHours: 192,
    risk: "Extreme",
    finds: ["relics", "ancientMaterials", "gold", "silver"],
    uniqueDiscoveries: [
      { itemKey: "archiveTablet", name: "Nomadic Adaptation Blueprint", description: "Advanced blueprints unlocking advanced navigation, caravan gears, and farming." },
      { itemKey: "memoryCrystal", name: "Firstfall Origin Records", description: "Historical journals describing Earth's final days and why the colony ship was launched." }
    ],
    clues: "A shining obsidian monument surrounded by collapsed libraries, half-buried.",
    suppliesRequired: [{ item: "saltedMeat", amount: 16 }, { item: "reservoirWater", amount: 16 }],
    equipmentRequiredOrOptional: [
      { item: "relicDetector", function: "Crucial to unlock information servers", optional: false },
      { item: "preservationCase", function: "Prevents historical scrolls from breaking", optional: true }
    ],
    allowMultipleScouts: true,
    description: "The ultimate database built by the final governors of the colony. It was designed to store all human knowledge through the centuries of nomadic survival, waiting for a generation wise enough to read it."
  },
  {
    id: "firstfall_alpha_vault",
    category: "Legendary",
    name: "Firstfall Alpha Vault",
    tier: "Unclassified",
    recommendedScoutLevel: 10,
    typicalDuration: "4-8 days",
    durationHours: 210,
    risk: "Extreme",
    finds: ["gold", "relics", "ancientMaterials", "saltedMeat"],
    uniqueDiscoveries: [
      { itemKey: "pristineMachineCore", name: "Pristine Nanite Medical Capsule", description: "An ancient med-capsule that rejuvenates health and stabilizes morale." },
      { itemKey: "starMetalFragment", name: "Moon-Iron Power Rig", description: "An advanced titanium and Moon-Iron exoskeleton that vastly boosts scout speed." }
    ],
    clues: "An untouched, glowing magnetic airlock door completely free of rust or sand, reflecting moonlight.",
    suppliesRequired: [{ item: "saltedMeat", amount: 20 }, { item: "reservoirWater", amount: 20 }],
    equipmentRequiredOrOptional: [
      { item: "sealedExpeditionSuit", function: "Prevents toxic gas and high pressure shock", optional: false },
      { item: "structuralScanner", function: "Warns of magnetic field implosions", optional: true }
    ],
    allowMultipleScouts: true,
    description: "The legendary command module of the original colonist mothership. It landed intact in a mountainous valley and remains completely sealed, carrying the purest artifacts of pre-storm technology."
  },
  {
    id: "moon_signal_hub",
    category: "Legendary",
    name: "Moon-Signal Hub Delta",
    tier: "Legendary",
    recommendedScoutLevel: 9,
    typicalDuration: "4-8 days",
    durationHours: 180,
    risk: "Very High",
    finds: ["relics", "ancientMaterials", "silver", "dew"],
    uniqueDiscoveries: [
      { itemKey: "navigationCore", name: "Star Map Calibration Matrix", description: "An ancient stellar map linking the planet's coordinates to our lost mother-world." },
      { itemKey: "logicCore", name: "Anti-Gravity Thruster Plates", description: "Floating plates that can make caravan transport practically weightless." }
    ],
    clues: "Strange, vertical rocket silos covered in heat-shield tiles sticking out of a sandy hollow, aligned perfectly with the moon.",
    suppliesRequired: [{ item: "saltedMeat", amount: 15 }, { item: "reservoirWater", amount: 15 }],
    equipmentRequiredOrOptional: [{ item: "sealedExpeditionSuit", function: "Allows walking inside vacuum spacecraft sectors", optional: false }],
    allowMultipleScouts: false,
    description: "The primary transmitter built to align orbital satellites with the surface. The tribe believes it was the high altar where the first Oracle received the vision of the 'God's Eye' watching over them."
  }
];
