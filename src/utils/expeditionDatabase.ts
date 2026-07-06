export interface ExpeditionSiteTemplate {
  id: string;
  category: 'Buried Structure' | 'Ancient Tech' | 'Cultural/Historical' | 'Fossil/Natural' | 'Military/Dangerous' | 'Legendary';
  name: string;
  tier: 'Minor' | 'Forgotten' | 'Ancient' | 'Pre-Storm' | 'Legendary' | 'Unclassified';
  recommendedScoutLevel: number;
  typicalDuration: string; // duration display
  durationHours: number; // actual game simulation hours (1 day = 24h, etc.)
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
    id: "buried_homestead",
    category: "Buried Structure",
    name: "Buried Homestead",
    tier: "Minor",
    recommendedScoutLevel: 1,
    typicalDuration: "3-10 hours",
    durationHours: 6,
    risk: "Very Low",
    finds: ["wood", "stone", "berries", "fiber"],
    uniqueDiscoveries: [
      { itemKey: "extinctSeed", name: "Heirloom Seed Varieties", description: "Preserved crop seeds from before the great collapse." },
      { itemKey: "archiveTablet", name: "Domestic Building Blueprints", description: "Old architectural diagrams showing home reinforcement techniques." }
    ],
    clues: "Faint household item contours buried under several layers of ash sand.",
    suppliesRequired: [{ item: "berries", amount: 5 }],
    equipmentRequiredOrOptional: [{ item: "grassBasket", function: "Increases carrying capacity", optional: true }],
    allowMultipleScouts: false,
    description: "A partially collapsed entrance leading to the home of an ancient family. It contains preserved tools and household relics."
  },
  {
    id: "underground_storehouse",
    category: "Buried Structure",
    name: "Underground Storehouse",
    tier: "Forgotten",
    recommendedScoutLevel: 3,
    typicalDuration: "8-24 hours",
    durationHours: 16,
    risk: "Low",
    finds: ["saltedMeat", "berries", "wood", "fiber"],
    uniqueDiscoveries: [
      { itemKey: "fossilResin", name: "Ancient Preservation Resin", description: "A high-grade chemical seal preventing degradation." },
      { itemKey: "vacuumVessel", name: "Vacuum-Storage Vessels", description: "Airtight metal container designed to halt decay." }
    ],
    clues: "Heavy reinforced door with rusted brass hinges protruding from the dune edge.",
    suppliesRequired: [{ item: "boiledRoots", amount: 2 }, { item: "reservoirWater", amount: 2 }],
    equipmentRequiredOrOptional: [{ item: "preservationCase", function: "Protects fragile relics", optional: true }],
    allowMultipleScouts: true,
    description: "A sealed food and material depot designed to survive environmental disasters. Holds construction elements and medicines."
  },
  {
    id: "collapsed_workshop",
    category: "Buried Structure",
    name: "Collapsed Workshop",
    tier: "Forgotten",
    recommendedScoutLevel: 3,
    typicalDuration: "8-24 hours",
    durationHours: 18,
    risk: "Low",
    finds: ["copper", "iron", "wood", "stone"],
    uniqueDiscoveries: [
      { itemKey: "precisionGear", name: "Precision Gears", description: "Slick, micro-toothed gear assemblies carved from rare alloys." },
      { itemKey: "archiveTablet", name: "Specialized Crafting Recipes", description: "Faded manuscript detailing ancient machinery setups." }
    ],
    clues: "Broken metal components and gears half-submerged in petrified mud.",
    suppliesRequired: [{ item: "saltedMeat", amount: 3 }, { item: "reservoirWater", amount: 3 }],
    equipmentRequiredOrOptional: [{ item: "ruinDiverHarness", function: "Reduces danger in collapsed spaces", optional: true }],
    allowMultipleScouts: false,
    description: "The remains of an ancient artisan or engineering facility. Useful metal components and tools are scattered within."
  },
  {
    id: "buried_transit_station",
    category: "Buried Structure",
    name: "Buried Transit Station",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 48,
    risk: "Moderate",
    finds: ["iron", "copper", "ancientMaterials", "relics"],
    uniqueDiscoveries: [
      { itemKey: "ancientAlloyPlate", name: "Lightweight Structural Alloy", description: "A featherlight metal plate with immense resistance." },
      { itemKey: "navigationCore", name: "Caravan Suspension Technology", description: "Frictionless hydraulic axle blueprints." }
    ],
    clues: "Exposed metallic tunnel with parallel tracks curving down into deep bedrock.",
    suppliesRequired: [{ item: "saltedMeat", amount: 6 }, { item: "rainwater", amount: 5 }],
    equipmentRequiredOrOptional: [{ item: "ancientClimbingRig", function: "Shortens shaft expedition duration", optional: true }],
    allowMultipleScouts: true,
    description: "An underground station once used to move people and cargo between settlements. It remains filled with rusted cargo crates."
  },
  {
    id: "subterranean_district",
    category: "Buried Structure",
    name: "Subterranean Residential District",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 56,
    risk: "Moderate",
    finds: ["wood", "fiber", "relics", "gold"],
    uniqueDiscoveries: [
      { itemKey: "archiveTablet", name: "Ancient Furniture Styles", description: "Stylized drawings of ergonomic precursor dwellings." },
      { itemKey: "memoryCrystal", name: "Preserved Family Records", description: "Memory banks preserving personal histories." }
    ],
    clues: "Extensive networks of stone chimneys and vents coughing dust after minor quakes.",
    suppliesRequired: [{ item: "boiledRoots", amount: 6 }, { item: "reservoirWater", amount: 6 }],
    equipmentRequiredOrOptional: [
      { item: "ruinBreathingMask", function: "Protects against toxic dust", optional: true },
      { item: "echoMapper", function: "Reveals hidden rooms", optional: true }
    ],
    allowMultipleScouts: true,
    description: "A large underground neighborhood with many rooms and branching passages, containing home objects and cultural records."
  },
  {
    id: "sealed_emergency_shelter",
    category: "Buried Structure",
    name: "Sealed Emergency Shelter",
    tier: "Ancient",
    recommendedScoutLevel: 4,
    typicalDuration: "8-24 hours",
    durationHours: 24,
    risk: "Moderate",
    finds: ["mushrooms", "dew", "ancientMaterials"],
    uniqueDiscoveries: [
      { itemKey: "vacuumVessel", name: "Advanced Filtration Membranes", description: "Synthesized polymers capable of micro-filtering pure water." },
      { itemKey: "archiveTablet", name: "Emergency Ration Recipes", description: "Formulas for nutrient block synthesis." }
    ],
    clues: "A glowing blue airlock panel half-excavated, blinking with automated diagnostics.",
    suppliesRequired: [{ item: "saltedMeat", amount: 4 }, { item: "reservoirWater", amount: 4 }],
    equipmentRequiredOrOptional: [{ item: "structuralScanner", function: "Warns about cave-ins", optional: true }],
    allowMultipleScouts: false,
    description: "A reinforced refuge built for an unknown ancient disaster. It holds valuable water purifiers and old emergency documents."
  },
  {
    id: "ancient_mine_entrance",
    category: "Buried Structure",
    name: "Ancient Mine Entrance",
    tier: "Ancient",
    recommendedScoutLevel: 6,
    typicalDuration: "1-3 days",
    durationHours: 64,
    risk: "Moderate",
    finds: ["copper", "silver", "gold", "iron"],
    uniqueDiscoveries: [
      { itemKey: "starMetalFragment", name: "Star-Metal Fragments", description: "Extremely heavy, space-born meteor ore pieces." },
      { itemKey: "deepCrystal", name: "Deep Crystal Shards", description: "Sub-crust crystals radiating high thermal energy." }
    ],
    clues: "Carved mining shaft with mineral crystals glowing in the shadows.",
    suppliesRequired: [{ item: "saltedMeat", amount: 8 }, { item: "dew", amount: 8 }],
    equipmentRequiredOrOptional: [{ item: "expeditionLantern", function: "Eliminates fuel requirements, lessens dark danger", optional: true }],
    allowMultipleScouts: true,
    description: "A deep mine once used to extract minerals no longer found on the surface. Requires extreme physical endurance to navigate."
  },
  {
    id: "buried_research_annex",
    category: "Buried Structure",
    name: "Buried Research Annex",
    tier: "Pre-Storm",
    recommendedScoutLevel: 7,
    typicalDuration: "2-5 days",
    durationHours: 96,
    risk: "High",
    finds: ["relics", "ancientMaterials", "silver"],
    uniqueDiscoveries: [
      { itemKey: "logicCore", name: "Research Blueprints", description: "Incredibly dense silicon matrices describing automation." },
      { itemKey: "stormLens", name: "Environmental Sensors", description: "Delicate meteorology gauges." }
    ],
    clues: "A glass dome sticking out of the dunes, half-shielded by dark alloy plates.",
    suppliesRequired: [{ item: "saltedMeat", amount: 10 }, { item: "reservoirWater", amount: 10 }],
    equipmentRequiredOrOptional: [{ item: "sealedExpeditionSuit", function: "Blocks radiation and hazardous bio-agents", optional: false }],
    allowMultipleScouts: false,
    description: "A scientific facility hidden beneath ordinary ruins. It contains advanced atmospheric measurement devices and records."
  },
  {
    id: "weather_observation_station",
    category: "Ancient Tech",
    name: "Weather Observation Station",
    tier: "Pre-Storm",
    recommendedScoutLevel: 7,
    typicalDuration: "1-3 days",
    durationHours: 48,
    risk: "High",
    finds: ["ancientMaterials", "relics", "dew"],
    uniqueDiscoveries: [
      { itemKey: "stormLens", name: "Oracle Equipment Upgrades", description: "Refractive sapphire glass that improves storm forecasting." },
      { itemKey: "deepCrystal", name: "Storm-Pressure Sensors", description: "Delicate carbon-fiber barometers." }
    ],
    clues: "A high-altitude steel antenna array catching storm lightnings and humming.",
    suppliesRequired: [{ item: "boiledRoots", amount: 6 }, { item: "rainwater", amount: 6 }],
    equipmentRequiredOrOptional: [{ item: "surveyorsLens", function: "Speeds up navigation and landmark detection", optional: true }],
    allowMultipleScouts: true,
    description: "A facility once used to study the atmospheric layers and the storm. Crucial for Oracle and prediction progression."
  },
  {
    id: "navigation_relay",
    category: "Ancient Tech",
    name: "Navigation Relay",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 40,
    risk: "Moderate",
    finds: ["copper", "relics", "ancientMaterials"],
    uniqueDiscoveries: [
      { itemKey: "navigationCore", name: "Ancient Map Fragments", description: "Data chips containing landmarks outside our region." }
    ],
    clues: "A rotating beacon head buried in desert sands, clicking rhythmically.",
    suppliesRequired: [{ item: "saltedMeat", amount: 5 }, { item: "reservoirWater", amount: 5 }],
    equipmentRequiredOrOptional: [{ item: "ancientCompass", function: "Speeds up route calculation", optional: true }],
    allowMultipleScouts: false,
    description: "A broken beacon relay that once guided cargo vehicles across the ancient world. Holds coordinates to other regional nodes."
  },
  {
    id: "ancient_fabrication_chamber",
    category: "Ancient Tech",
    name: "Ancient Fabrication Chamber",
    tier: "Pre-Storm",
    recommendedScoutLevel: 8,
    typicalDuration: "2-5 days",
    durationHours: 110,
    risk: "High",
    finds: ["iron", "ancientMaterials", "copper"],
    uniqueDiscoveries: [
      { itemKey: "pristineMachineCore", name: "Uncraftable Machine Cores", description: "Pre-assembled quantum engines for highest-tier structures." },
      { itemKey: "logicCore", name: "Advanced Workstation Blueprints", description: "Instruction manuals for assembling automated fabricators." }
    ],
    clues: "Exposed hydraulic exhaust vents occasionally puffing cold compressed air.",
    suppliesRequired: [{ item: "saltedMeat", amount: 12 }, { item: "reservoirWater", amount: 12 }],
    equipmentRequiredOrOptional: [{ item: "ruinDiverHarness", function: "Safely cross mechanical gears", optional: true }],
    allowMultipleScouts: true,
    description: "An automated heavy manufacturing facility containing assemblers. It remains highly dangerous due to defensive lasers."
  },
  {
    id: "power_regulation_vault",
    category: "Ancient Tech",
    name: "Power Regulation Vault",
    tier: "Pre-Storm",
    recommendedScoutLevel: 7,
    typicalDuration: "2-5 days",
    durationHours: 84,
    risk: "High",
    finds: ["copper", "ancientMaterials", "gold"],
    uniqueDiscoveries: [
      { itemKey: "ancientPowerCell", name: "Ancient Power Cells", description: "Indestructible energy batteries filled with radioactive plasma." },
      { itemKey: "logicCore", name: "Energy-Regulator Modules", description: "Circuit boards that govern safe energy output." }
    ],
    clues: "Crackling sounds and static charges that make hair stand on end within 30 meters.",
    suppliesRequired: [{ item: "saltedMeat", amount: 8 }, { item: "reservoirWater", amount: 8 }],
    equipmentRequiredOrOptional: [{ item: "relicDetector", function: "Identifies safe circuit nodes", optional: true }],
    allowMultipleScouts: false,
    description: "A reinforced high-voltage vault that once distributed energy. Its ancient cells cannot be crafted."
  },
  {
    id: "automated_agricultural",
    category: "Ancient Tech",
    name: "Automated Agricultural Facility",
    tier: "Ancient",
    recommendedScoutLevel: 6,
    typicalDuration: "1-3 days",
    durationHours: 52,
    risk: "Moderate",
    finds: ["berries", "roots", "mushrooms", "dew"],
    uniqueDiscoveries: [
      { itemKey: "extinctSeed", name: "Extinct Crop Seeds", description: "Pristine bio-capsules containing genetic templates for long-lost vegetables." },
      { itemKey: "vacuumVessel", name: "Self-Watering Planter Designs", description: "Hydroponic blueprint profiles." }
    ],
    clues: "Moist, sweet air smelling of damp earth leaking from a rusted metal hatch.",
    suppliesRequired: [{ item: "boiledRoots", amount: 5 }, { item: "reservoirWater", amount: 5 }],
    equipmentRequiredOrOptional: [{ item: "preservationCase", function: "Protects biological seed integrity", optional: true }],
    allowMultipleScouts: true,
    description: "An underground automated greenhouse. Holds extinct crops, hyper-fertility dirt, and irrigation technologies."
  },
  {
    id: "medical_preservation_center",
    category: "Ancient Tech",
    name: "Medical Preservation Center",
    tier: "Pre-Storm",
    recommendedScoutLevel: 8,
    typicalDuration: "2-5 days",
    durationHours: 90,
    risk: "High",
    finds: ["dew", "mushrooms", "silver"],
    uniqueDiscoveries: [
      { itemKey: "regenerationCompound", name: "Regeneration Compound", description: "An organic compound that reconstructs ruptured muscle in seconds." },
      { itemKey: "sterileAncientCloth", name: "Sterile Ancient Cloth", description: "Anti-infection synthetic fabrics." }
    ],
    clues: "An airtight steel hatch smelling of dry alcohol and chemical antiseptics.",
    suppliesRequired: [{ item: "saltedMeat", amount: 8 }, { item: "reservoirWater", amount: 8 }],
    equipmentRequiredOrOptional: [{ item: "ruinBreathingMask", function: "Protects against toxic medical gases", optional: false }],
    allowMultipleScouts: true,
    description: "A sealed bio-storage facility. Highly valued for recovery medicine, healer blueprints, and clinical tools."
  },
  {
    id: "ancient_communication_hub",
    category: "Ancient Tech",
    name: "Ancient Communication Hub",
    tier: "Pre-Storm",
    recommendedScoutLevel: 6,
    typicalDuration: "1-3 days",
    durationHours: 60,
    risk: "Moderate",
    finds: ["relics", "ancientMaterials", "copper"],
    uniqueDiscoveries: [
      { itemKey: "archiveTablet", name: "Coded Tablets", description: "Precursor telecommunication logs requiring Oracle analysis." },
      { itemKey: "navigationCore", name: "Megastructure Coordinates", description: "Navigation map detailing ancient facility coordinates." }
    ],
    clues: "A massive satellite dish partially buried vertically in a rocky ridge.",
    suppliesRequired: [{ item: "saltedMeat", amount: 6 }, { item: "reservoirWater", amount: 6 }],
    equipmentRequiredOrOptional: [{ item: "echoMapper", function: "Maps out communications relays", optional: true }],
    allowMultipleScouts: false,
    description: "A communication station that once connected settlements across the globe. Deciphering its signals reveals other ruins."
  },
  {
    id: "machine_nursery",
    category: "Ancient Tech",
    name: "Machine Nursery",
    tier: "Legendary",
    recommendedScoutLevel: 9,
    typicalDuration: "4-8 days",
    durationHours: 144,
    risk: "Very High",
    finds: ["ancientMaterials", "relics", "gold", "iron"],
    uniqueDiscoveries: [
      { itemKey: "logicCore", name: "Dormant Helper Construct", description: "An inactive automated robot drone designed to assist." },
      { itemKey: "pristineMachineCore", name: "Ancient Logic Cores", description: "Processor matrices containing machine learning logic." }
    ],
    clues: "Rhythmic ticking and clicking deep underground, accompanied by blue sparks.",
    suppliesRequired: [{ item: "saltedMeat", amount: 15 }, { item: "reservoirWater", amount: 15 }],
    equipmentRequiredOrOptional: [{ item: "structuralScanner", function: "Protects against robot defense collapses", optional: false }],
    allowMultipleScouts: true,
    description: "A highly complex facility where helper machines and robotic constructs were crafted and charged."
  },
  {
    id: "ancestral_tomb",
    category: "Cultural/Historical",
    name: "Ancestral Tomb",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 48,
    risk: "Moderate",
    finds: ["gold", "silver", "relics", "bone"],
    uniqueDiscoveries: [
      { itemKey: "relics", name: "Named Morale Relics", description: "Venerated relics that boost tribal morale permanently." }
    ],
    clues: "Carved skull monoliths guarding a narrow obsidian fissure in the mountains.",
    suppliesRequired: [{ item: "boiledRoots", amount: 6 }, { item: "reservoirWater", amount: 6 }],
    equipmentRequiredOrOptional: [{ item: "artifactSatchel", function: "Safely wraps sacred relics to prevent damage", optional: true }],
    allowMultipleScouts: false,
    description: "A burial chamber belonging to an ancient family or ruler. Morale disagreements can occur if sacred items are stolen."
  },
  {
    id: "memorial_archive",
    category: "Cultural/Historical",
    name: "Memorial Archive",
    tier: "Minor",
    recommendedScoutLevel: 2,
    typicalDuration: "3-10 hours",
    durationHours: 8,
    risk: "Very Low",
    finds: ["stone", "fiber", "wood"],
    uniqueDiscoveries: [
      { itemKey: "archiveTablet", name: "Major Lore Entries", description: "A beautifully preserved clay slab containing historical narratives." }
    ],
    clues: "A series of memorial stones standing in rows, covered with moss and vines.",
    suppliesRequired: [{ item: "berries", amount: 4 }],
    equipmentRequiredOrOptional: [{ item: "preservationCase", function: "Protects ancient tablets from cracking", optional: true }],
    allowMultipleScouts: false,
    description: "A structure preserving the names and histories of people lost during the collapse. Generates excellent lore records."
  },
  {
    id: "temple_beneath_sand",
    category: "Cultural/Historical",
    name: "Temple Beneath the Sand",
    tier: "Ancient",
    recommendedScoutLevel: 6,
    typicalDuration: "1-3 days",
    durationHours: 72,
    risk: "Moderate",
    finds: ["relics", "gold", "bone", "dew"],
    uniqueDiscoveries: [
      { itemKey: "heartwoodCrystal", name: "Shrine Blueprints & Sacred Symbols", description: "Fabulous golden engravings that inspire Oracle designs." }
    ],
    clues: "Ancient stone columns and carved arches barely rising from the sand drifts.",
    suppliesRequired: [{ item: "saltedMeat", amount: 6 }, { item: "reservoirWater", amount: 6 }],
    equipmentRequiredOrOptional: [{ item: "expeditionLantern", function: "Safely navigate dark ritual chambers", optional: true }],
    allowMultipleScouts: true,
    description: "A buried religious structure containing ritual chambers and altars. Highly valued for spiritual relic gathering."
  },
  {
    id: "forgotten_school",
    category: "Cultural/Historical",
    name: "Forgotten School",
    tier: "Forgotten",
    recommendedScoutLevel: 3,
    typicalDuration: "8-24 hours",
    durationHours: 20,
    risk: "Low",
    finds: ["wood", "fiber", "berries", "stone"],
    uniqueDiscoveries: [
      { itemKey: "archiveTablet", name: "Education Blueprints", description: "Blueprints containing pedagogy guides to boost apprentice speeds." }
    ],
    clues: "Rusted swing frames and a moldy concrete archway surrounded by dry bushes.",
    suppliesRequired: [{ item: "boiledRoots", amount: 3 }, { item: "reservoirWater", amount: 3 }],
    equipmentRequiredOrOptional: [{ item: "preservationCase", function: "Protects paper records", optional: true }],
    allowMultipleScouts: false,
    description: "An educational academy from before the storms. Contains schoolbooks, maps, and drawings that boost apprentices."
  },
  {
    id: "ancient_council_hall",
    category: "Cultural/Historical",
    name: "Ancient Council Hall",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 42,
    risk: "Moderate",
    finds: ["relics", "silver", "wood", "fiber"],
    uniqueDiscoveries: [
      { itemKey: "archiveTablet", name: "Diplomatic Records", description: "Ancient records describing precursor clans and their compacts." }
    ],
    clues: "Exposed amphitheater seating rings carved into a bedrock crater.",
    suppliesRequired: [{ item: "saltedMeat", amount: 5 }, { item: "reservoirWater", amount: 5 }],
    equipmentRequiredOrOptional: [{ item: "echoMapper", function: "Finds locked vaults", optional: true }],
    allowMultipleScouts: false,
    description: "The administrative center of a lost settlement. Holds precursor laws, alliance maps, and diplomatic logs."
  },
  {
    id: "lost_tribal_settlement",
    category: "Cultural/Historical",
    name: "Lost Tribal Settlement",
    tier: "Minor",
    recommendedScoutLevel: 2,
    typicalDuration: "3-10 hours",
    durationHours: 10,
    risk: "Low",
    finds: ["meat", "hide", "bone", "wood"],
    uniqueDiscoveries: [
      { itemKey: "navigationCore", name: "Rival Tribe Maps", description: "Faded migration logs showing other tribe routes." }
    ],
    clues: "Deteriorated wooden poles and cold leather tents arranged in a circular camp.",
    suppliesRequired: [{ item: "berries", amount: 6 }],
    equipmentRequiredOrOptional: [{ item: "grassBasket", function: "Hauls camp items", optional: true }],
    allowMultipleScouts: true,
    description: "A recent campsite abandoned by another tribe that fled the storm. Contains basic tools and migration routes."
  },
  {
    id: "sealed_library",
    category: "Cultural/Historical",
    name: "Sealed Library",
    tier: "Pre-Storm",
    recommendedScoutLevel: 8,
    typicalDuration: "2-5 days",
    durationHours: 120,
    risk: "High",
    finds: ["relics", "ancientMaterials", "gold", "silver"],
    uniqueDiscoveries: [
      { itemKey: "archiveTablet", name: "Technical Research Archives", description: "Dozens of high-tier blueprint documents." },
      { itemKey: "memoryCrystal", name: "Knowledge Multipliers", description: "Crystalline storage containing centuries of lost scientific theory." }
    ],
    clues: "Extremely heavy steel vault doors marked with a book-and-atom emblem.",
    suppliesRequired: [{ item: "saltedMeat", amount: 10 }, { item: "reservoirWater", amount: 10 }],
    equipmentRequiredOrOptional: [
      { item: "preservationCase", function: "Safeguards fragile paper documents", optional: false },
      { item: "relicDetector", function: "Bypasses automated security panels", optional: true }
    ],
    allowMultipleScouts: true,
    description: "A perfectly sealed archive containing precursor knowledge. Highly valued but incredibly difficult to explore fully."
  },
  {
    id: "colossal_fossil_bed",
    category: "Fossil/Natural",
    name: "Colossal Fossil Bed",
    tier: "Ancient",
    recommendedScoutLevel: 4,
    typicalDuration: "1-3 days",
    durationHours: 36,
    risk: "Moderate",
    finds: ["bone", "stone", "copper", "iron"],
    uniqueDiscoveries: [
      { itemKey: "titanBone", name: "Titan Bones", description: "Immense fossilized limbs of mega-fauna that existed eons ago." },
      { itemKey: "fossilResin", name: "Fossil Marrow Crystals", description: "Mineralized organic residue." }
    ],
    clues: "Giant curved bone columns sticking out of a deep rocky ravine.",
    suppliesRequired: [{ item: "boiledRoots", amount: 4 }, { item: "reservoirWater", amount: 4 }],
    equipmentRequiredOrOptional: [{ item: "ruinDiverHarness", function: "Protects scouts when descending bone crevices", optional: true }],
    allowMultipleScouts: true,
    description: "A burial ground containing fossilized skeleton remains of extinct colossal creatures. Yields unique bones."
  },
  {
    id: "petrified_nest",
    category: "Fossil/Natural",
    name: "Petrified Nest",
    tier: "Forgotten",
    recommendedScoutLevel: 3,
    typicalDuration: "8-24 hours",
    durationHours: 24,
    risk: "Low",
    finds: ["bone", "stone", "fiber"],
    uniqueDiscoveries: [
      { itemKey: "extinctSeed", name: "Intact Fossil Eggs", description: "Preserved calcified eggs containing ancient beast DNA." },
      { itemKey: "ancientAlloyPlate", name: "Ultra-Light Shell Plates", description: "Featherlight protective plates." }
    ],
    clues: "Circular stone mounds with fossilized egg fragments half-buried in sand.",
    suppliesRequired: [{ item: "boiledRoots", amount: 3 }, { item: "reservoirWater", amount: 3 }],
    equipmentRequiredOrOptional: [{ item: "preservationCase", function: "Saves egg shells", optional: true }],
    allowMultipleScouts: false,
    description: "The petrified nesting grounds of an extinct mega-predator or colossal bird species. Great for breeding discoveries."
  },
  {
    id: "ancient_root_chamber",
    category: "Fossil/Natural",
    name: "Ancient Root Chamber",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 48,
    risk: "Moderate",
    finds: ["wood", "dew", "mushrooms"],
    uniqueDiscoveries: [
      { itemKey: "heartwoodCrystal", name: "Heartwood Crystals", description: "Amber crystals formed at the dead cores of colossal petrified trees." },
      { itemKey: "livingResinResidue", name: "Living-Resin Residue", description: "Still-sticky resin fluid with powerful bonding strength." }
    ],
    clues: "A glowing sap fissure in a hollow cliff side near a petrified root.",
    suppliesRequired: [{ item: "saltedMeat", amount: 5 }, { item: "reservoirWater", amount: 5 }],
    equipmentRequiredOrOptional: [{ item: "artifactSatchel", function: "Carries sticky resin safely", optional: true }],
    allowMultipleScouts: false,
    description: "A cavern inside the giant roots of a mountain-sized dead petrified tree. Rich in organic crystal resins."
  },
  {
    id: "amber_grove",
    category: "Fossil/Natural",
    name: "Amber Grove",
    tier: "Forgotten",
    recommendedScoutLevel: 3,
    typicalDuration: "8-24 hours",
    durationHours: 18,
    risk: "Low",
    finds: ["wood", "stone", "berries"],
    uniqueDiscoveries: [
      { itemKey: "fossilResin", name: "Pristine Ancient Resin", description: "A high-purity golden fossil sap chunk." },
      { itemKey: "extinctSeed", name: "Extinct Plant Seeds", description: "Plant genetics preserved inside fossil amber." }
    ],
    clues: "Golden, translucent stones catching the morning light along a clay creek bed.",
    suppliesRequired: [{ item: "boiledRoots", amount: 2 }, { item: "reservoirWater", amount: 2 }],
    equipmentRequiredOrOptional: [{ item: "preservationCase", function: "Safeguards fragile amber", optional: true }],
    allowMultipleScouts: true,
    description: "A buried underground grove with massive pockets of fossilized plant sap and golden amber blocks."
  },
  {
    id: "subterranean_spore",
    category: "Fossil/Natural",
    name: "Subterranean Spore Garden",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 54,
    risk: "Moderate",
    finds: ["mushrooms", "fiber", "dew", "meat"],
    uniqueDiscoveries: [
      { itemKey: "sterileAncientCloth", name: "Luminous Spores & Medicinal Mycelium", description: "Fungal strains that grow active medical mycelium." }
    ],
    clues: "Fluorescent cyan spores drifting out of a wet cave crack, carrying a sweet scent.",
    suppliesRequired: [{ item: "boiledRoots", amount: 6 }, { item: "reservoirWater", amount: 6 }],
    equipmentRequiredOrOptional: [{ item: "ruinBreathingMask", function: "Required to survive toxic fungal spores", optional: false }],
    allowMultipleScouts: true,
    description: "An isolated underground ecosystem that has survived for centuries. Holds bioluminescent fungi and aggressive fauna."
  },
  {
    id: "crystal_ossuary",
    category: "Fossil/Natural",
    name: "Crystal Ossuary",
    tier: "Pre-Storm",
    recommendedScoutLevel: 7,
    typicalDuration: "2-5 days",
    durationHours: 80,
    risk: "High",
    finds: ["stone", "gold", "silver", "relics"],
    uniqueDiscoveries: [
      { itemKey: "memoryCrystal", name: "Memory Crystals", description: "Crystals that store genetic or historical precursor knowledge." },
      { itemKey: "resonantFossilShard", name: "Resonant Fossil Shards", description: "Fossilized teeth that hum in tune with electro-signals." }
    ],
    clues: "Crystalline chime sounds and harmonic vibrations emanating from a dark granite fissure.",
    suppliesRequired: [{ item: "saltedMeat", amount: 8 }, { item: "reservoirWater", amount: 8 }],
    equipmentRequiredOrOptional: [{ item: "echoMapper", function: "Speeds up navigation via acoustics", optional: true }],
    allowMultipleScouts: false,
    description: "A deep geological cavern where ancient remains have become infused with crystalline mineral growths."
  },
  {
    id: "ancient_armory",
    category: "Military/Dangerous",
    name: "Ancient Armory",
    tier: "Pre-Storm",
    recommendedScoutLevel: 7,
    typicalDuration: "2-5 days",
    durationHours: 72,
    risk: "High",
    finds: ["iron", "copper", "ancientMaterials"],
    uniqueDiscoveries: [
      { itemKey: "starMetalFragment", name: "Advanced Spear Blueprints", description: "Instructions for crafting high-tier star-metal blades." },
      { itemKey: "ancientAlloyPlate", name: "Ancient Protective Alloys", description: "Super-reinforced armor fragments." }
    ],
    clues: "Heavy titanium blast shields embossed with crossed sword icons.",
    suppliesRequired: [{ item: "saltedMeat", amount: 6 }, { item: "reservoirWater", amount: 6 }],
    equipmentRequiredOrOptional: [{ item: "ruinDiverHarness", function: "Safely navigate heavy collapsing racks", optional: true }],
    allowMultipleScouts: true,
    description: "A fortified bunker once used to store weapons and equipment. Warning: Automated defense sentries may still be active."
  },
  {
    id: "fortified_bunker",
    category: "Military/Dangerous",
    name: "Fortified Bunker",
    tier: "Pre-Storm",
    recommendedScoutLevel: 8,
    typicalDuration: "2-5 days",
    durationHours: 96,
    risk: "High",
    finds: ["saltedMeat", "iron", "copper", "ancientMaterials"],
    uniqueDiscoveries: [
      { itemKey: "ancientAlloyPlate", name: "Reinforced-Building Blueprints", description: "Defensive wall designs built to withstand debris walls." },
      { itemKey: "vacuumVessel", name: "Storm-Resistant Components", description: "Bunker structural reinforcements." }
    ],
    clues: "A massive, circular bunker hatch embedded flush into a vertical bedrock cliff face.",
    suppliesRequired: [{ item: "saltedMeat", amount: 10 }, { item: "reservoirWater", amount: 10 }],
    equipmentRequiredOrOptional: [{ item: "structuralScanner", function: "Warns of blast lock collapses", optional: false }],
    allowMultipleScouts: true,
    description: "A sealed military refuge built to survive heavy fallout. Highly dangerous, but packed with supreme defensive schematics."
  },
  {
    id: "battlefield_burial",
    category: "Military/Dangerous",
    name: "Battlefield Burial Site",
    tier: "Ancient",
    recommendedScoutLevel: 5,
    typicalDuration: "1-3 days",
    durationHours: 48,
    risk: "Moderate",
    finds: ["bone", "iron", "copper", "relics"],
    uniqueDiscoveries: [
      { itemKey: "ancientAlloyPlate", name: "Named Artifacts & Rare Alloys", description: "Folkloric weapon relics from heroic defenders." }
    ],
    clues: "Rusted metallic spears and shield plates sticking out of an ash valley like grave markers.",
    suppliesRequired: [{ item: "boiledRoots", amount: 5 }, { item: "reservoirWater", amount: 5 }],
    equipmentRequiredOrOptional: [{ item: "relicDetector", function: "Pinpoints buried weapon caches", optional: true }],
    allowMultipleScouts: true,
    description: "A valley filled with the buried machinery and skeletal remains of an ancient battlefield conflict. Valuable scrap."
  },
  {
    id: "containment_facility",
    category: "Military/Dangerous",
    name: "Containment Facility",
    tier: "Legendary",
    recommendedScoutLevel: 9,
    typicalDuration: "4-8 days",
    durationHours: 120,
    risk: "Extreme",
    finds: ["relics", "ancientMaterials", "gold", "bone"],
    uniqueDiscoveries: [
      { itemKey: "pristineMachineCore", name: "Rare Scientific Components", description: "Nuclear isotopes and experimental capacitors." },
      { itemKey: "logicCore", name: "Corruption Biosensors", description: "Devices tracking ancient storm mutations." }
    ],
    clues: "Deep, terrifying growls and vibrating concrete walls beneath the sands, marked with radioactive logos.",
    suppliesRequired: [{ item: "saltedMeat", amount: 12 }, { item: "reservoirWater", amount: 12 }],
    equipmentRequiredOrOptional: [
      { item: "sealedExpeditionSuit", function: "Imperative to block containment gas leakages", optional: false },
      { item: "scoutSignalBeacon", function: "Enables emergency extraction", optional: true }
    ],
    allowMultipleScouts: false,
    description: "A super-reinforced concrete structure designed to hold extremely dangerous organic anomalies. Low-level scouts will refuse to enter."
  },
  {
    id: "collapsed_war_machine",
    category: "Military/Dangerous",
    name: "Collapsed War Machine",
    tier: "Legendary",
    recommendedScoutLevel: 8,
    typicalDuration: "2-5 days",
    durationHours: 100,
    risk: "High",
    finds: ["iron", "ancientMaterials", "copper", "gold"],
    uniqueDiscoveries: [
      { itemKey: "pristineMachineCore", name: "Precursor Machine Core", description: "An intact high-output gravity engine core." },
      { itemKey: "ancientAlloyPlate", name: "Heavy Armor Plates", description: "Thick plates used to build indestructible caravans." }
    ],
    clues: "A colossal metallic leg joint, large as a tree, sticking out of a deep canyon bed.",
    suppliesRequired: [{ item: "saltedMeat", amount: 8 }, { item: "reservoirWater", amount: 8 }],
    equipmentRequiredOrOptional: [{ item: "ruinDiverHarness", function: "Allows crawling inside tight engine shafts", optional: true }],
    allowMultipleScouts: true,
    description: "The rusted, skyscraper-sized wreckage of an ancient walking tank. Contains rare mechanical modules."
  },
  {
    id: "predator_den",
    category: "Military/Dangerous",
    name: "Predator Den in Ancient Ruins",
    tier: "Forgotten",
    recommendedScoutLevel: 4,
    typicalDuration: "8-24 hours",
    durationHours: 16,
    risk: "High",
    finds: ["meat", "hide", "bone", "relics"],
    uniqueDiscoveries: [
      { itemKey: "titanBone", name: "Feral Alpha Skulls", description: "Trophy bones of legendary predators that boost herder courage." }
    ],
    clues: "Gnawed bones and fresh wild predator tracks leading into a beautifully carved stone temple entrance.",
    suppliesRequired: [{ item: "saltedMeat", amount: 4 }],
    equipmentRequiredOrOptional: [{ item: "spear", function: "Fends off nesting beasts", optional: false }],
    allowMultipleScouts: true,
    description: "Vicious predators have nested inside a valuable ancient archaeological building. Requires weapon escorts."
  },
  {
    id: "buried_city_gate",
    category: "Legendary",
    name: "Buried City Gate",
    tier: "Legendary",
    recommendedScoutLevel: 9,
    typicalDuration: "4-8 days",
    durationHours: 168,
    risk: "Very High",
    finds: ["gold", "silver", "copper", "iron", "relics", "ancientMaterials"],
    uniqueDiscoveries: [
      { itemKey: "navigationCore", name: "Precursor City Maps", description: "Detailed blueprints showing multiple connected legendary locations." },
      { itemKey: "pristineMachineCore", name: "Major Story Revelations", description: "Preserved holographic journals explaining the fall." }
    ],
    clues: "A colossal concrete wall stretching hundreds of meters, with a main gate buried under dunes.",
    suppliesRequired: [{ item: "saltedMeat", amount: 15 }, { item: "reservoirWater", amount: 15 }],
    equipmentRequiredOrOptional: [
      { item: "ancientCompass", function: "Prevents scouts from becoming lost in massive sewer sectors", optional: true },
      { item: "echoMapper", function: "Finds secret residential vaults", optional: true }
    ],
    allowMultipleScouts: true,
    description: "The massive, sealed gate of an entire metropolis preserved underground. Holds enough treasures for multiple expeditions."
  },
  {
    id: "dead_tree_interior",
    category: "Legendary",
    name: "Dead Tree Interior",
    tier: "Legendary",
    recommendedScoutLevel: 8,
    typicalDuration: "4-8 days",
    durationHours: 130,
    risk: "Moderate",
    finds: ["wood", "mushrooms", "dew", "relics"],
    uniqueDiscoveries: [
      { itemKey: "heartwoodCrystal", name: "Living Architecture Blueprints", description: "Fabulous instructions for growing organic shelters." },
      { itemKey: "livingResinResidue", name: "Ancient Forest Chronicles", description: "Botanical lore logs showing historical weather trends." }
    ],
    clues: "A narrow hollow gap inside a colossal petrified tree, leaking glowing cyan sap.",
    suppliesRequired: [{ item: "boiledRoots", amount: 10 }, { item: "reservoirWater", amount: 10 }],
    equipmentRequiredOrOptional: [{ item: "ancientClimbingRig", function: "Accelerates vertical tree trunk climbing", optional: true }],
    allowMultipleScouts: false,
    description: "An entrance leading into the heart of one of the mountain-sized petrified trees. Extremely high botanical relic density."
  },
  {
    id: "weather_tower_foundation",
    category: "Legendary",
    name: "Ancient Weather Tower Foundation",
    tier: "Legendary",
    recommendedScoutLevel: 9,
    typicalDuration: "4-8 days",
    durationHours: 150,
    risk: "Very High",
    finds: ["ancientMaterials", "relics", "dew"],
    uniqueDiscoveries: [
      { itemKey: "stormLens", name: "Oracle Matrix Tech", description: "Atmospheric prisms that grant permanent prediction bonuses." },
      { itemKey: "pristineMachineCore", name: "Critical World History Logs", description: "Lore logs detailing the orbital storms creation." }
    ],
    clues: "A massive concrete base surrounded by crackling gravity fields, with hums heard kilometers away.",
    suppliesRequired: [{ item: "saltedMeat", amount: 12 }, { item: "reservoirWater", amount: 12 }],
    equipmentRequiredOrOptional: [{ item: "sealedExpeditionSuit", function: "Required to survive electrostatic currents", optional: false }],
    allowMultipleScouts: true,
    description: "The massive subterranean power vaults of a weather-shaping spire. It houses the most crucial Oracle upgrade devices."
  },
  {
    id: "world_archive",
    category: "Legendary",
    name: "World Archive",
    tier: "Legendary",
    recommendedScoutLevel: 10,
    typicalDuration: "4-8 days",
    durationHours: 192,
    risk: "Extreme",
    finds: ["relics", "ancientMaterials", "gold", "silver"],
    uniqueDiscoveries: [
      { itemKey: "archiveTablet", name: "Complete Technology Blueprints", description: "Automated blueprint caches that unlock high-tier recipes." },
      { itemKey: "memoryCrystal", name: "World Maps & Major Lore Books", description: "A crystal matrix containing complete geographical maps." }
    ],
    clues: "A shining obsidian monument surrounded by concrete libraries, half-buried.",
    suppliesRequired: [{ item: "saltedMeat", amount: 16 }, { item: "reservoirWater", amount: 16 }],
    equipmentRequiredOrOptional: [
      { item: "relicDetector", function: "Crucial to unlock information servers", optional: false },
      { item: "preservationCase", function: "Prevents historical scrolls from breaking", optional: true }
    ],
    allowMultipleScouts: true,
    description: "A legendary underground server database built to store human knowledge through the collapse. Extremely high value."
  },
  {
    id: "sealed_pre_fall_vault",
    category: "Legendary",
    name: "Sealed Pre-Fall Vault",
    tier: "Unclassified",
    recommendedScoutLevel: 10,
    typicalDuration: "4-8 days",
    durationHours: 210,
    risk: "Extreme",
    finds: ["gold", "relics", "ancientMaterials", "saltedMeat"],
    uniqueDiscoveries: [
      { itemKey: "pristineMachineCore", name: "Pristine Uncraftable Nanite Injector", description: "An ancient med-injector that makes the user virtually immortal." },
      { itemKey: "starMetalFragment", name: "Uncraftable Star-Metal Exoskeleton", description: "A high-tech mechanical rig that doubles physical stats." }
    ],
    clues: "An untouched, glowing magnetic airlock door completely free of rust or ash.",
    suppliesRequired: [{ item: "saltedMeat", amount: 20 }, { item: "reservoirWater", amount: 20 }],
    equipmentRequiredOrOptional: [
      { item: "sealedExpeditionSuit", function: "Prevents toxic gas and high pressure shock", optional: false },
      { item: "structuralScanner", function: "Warns of magnetic field implosions", optional: true }
    ],
    allowMultipleScouts: true,
    description: "A secret precursor bunker untouched since before the storm became dominant. Holds the finest items in existence."
  },
  {
    id: "astronaut_settlement",
    category: "Legendary",
    name: "Buried Astronaut Settlement",
    tier: "Legendary",
    recommendedScoutLevel: 9,
    typicalDuration: "4-8 days",
    durationHours: 180,
    risk: "Very High",
    finds: ["relics", "ancientMaterials", "silver", "dew"],
    uniqueDiscoveries: [
      { itemKey: "navigationCore", name: "Origin Space Stencil Blueprints", description: "Fabulous celestial origin coordinates." },
      { itemKey: "logicCore", name: "Anti-Gravity Thruster Units", description: "Floating engine parts." }
    ],
    clues: "Strange, vertical rocket-like cylinders covered in space-burned tiles sticking out of a sandy hollow.",
    suppliesRequired: [{ item: "saltedMeat", amount: 15 }, { item: "reservoirWater", amount: 15 }],
    equipmentRequiredOrOptional: [{ item: "sealedExpeditionSuit", function: "Allows walking inside vacuum spacecraft sectors", optional: false }],
    allowMultipleScouts: false,
    description: "A forgotten installation connected to the tribe's stellar origins, containing bizarre tools and oxygen tanks."
  }
];
