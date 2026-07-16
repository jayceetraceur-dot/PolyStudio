export type BiomeType = 'grassland' | 'forest' | 'rocky' | 'water' | 'beach' | 'desert';

export type SimulationLevel = 'FULL_ACTIVE' | 'INSPECTION_VISUAL' | 'NEAR_FUTURE' | 'ABSTRACT' | 'UNLOADED';

export interface WorldChunk {
  chunkX: number;
  chunkZ: number;
  cells: CellInfo[][]; // 6x6 cells
  loaded: boolean;
  simulationLevel: SimulationLevel;
  lastActiveTime: number;
  biomeSummary: string;
  discovered: boolean;
  modified: boolean;
}

export interface WorldConfig {
  size: number; // grid size (e.g., 40 means 40x40)
  seed: number;
  roughness: number; // height scalar
  forestDensity: number; // 0 to 1
  rockDensity: number; // 0 to 1
  waterLevel: number; // -1 to 1 (relative)
}

export type JobCategory =
  | 'Gather'
  | 'Hunt'
  | 'Build'
  | 'Farm'
  | 'Scout'
  | 'Haul'
  | 'Repair'
  | 'Sleep'
  | 'Eat'
  | 'Drink'
  | 'Study'
  | 'CaravanPacking'
  | 'Heal'
  | 'CraftMedicine';

export type JobPriority = 1 | 2 | 3 | 4 | 0; // 1 = Critical, 4 = Low, 0 = Disabled

export interface CellInfo {
  x: number;
  z: number;
  height: number;
  noiseValue: number;
  moisture: number;
  biome: BiomeType;
  color: string;
  hasTree: boolean;
  treeHeight: number;
  treeRotation: number;
  hasRock: boolean;
  rockSize: number;
  rockRotation: [number, number, number];
  hasShrub: boolean;
  inspectableName: string;
  resources: {
    wood?: number;
    stone?: number;
    water?: number;
    fertility?: number;
  };
  
  // Custom RTS Autonomy AI extensions
  scouted?: boolean; // starts false if Fog of War is enabled
  itemsOnGround?: {
    type: 'wood' | 'stone' | 'food' | 'meat';
    amount: number;
  } | null;
  construction?: {
    type: 'Shelter' | 'WaterWell' | 'LogWall' | 'StorageBin' | 'ArtisanBench' | 'ScienceMachine' | 'RuinousAltar' | 'Tent' | 'Shrine' | 'WatchTower' | 'Fireplace' | 'GatherersPantry' | 'HuntersHut' | 'BuildersLodge' | 'FarmersGranary' | 'ScoutsLookout' | 'HealersSanctum' | 'ArtisansWorkshop' | 'PetrifiedGreenhouse' | 'PrecursorGenerator' | 'AegisBeacon' | 'ObservationPlatform' | 'Observatory' | 'RelicArchive' | 'MeditationShrine' | 'MapHall';
    progress: number;
    maxProgress: number;
  } | null;
  structure?: {
    type: 'Shelter' | 'WaterWell' | 'LogWall' | 'StorageBin' | 'ArtisanBench' | 'ScienceMachine' | 'RuinousAltar' | 'Tent' | 'Shrine' | 'WatchTower' | 'Fireplace' | 'GatherersPantry' | 'HuntersHut' | 'BuildersLodge' | 'FarmersGranary' | 'ScoutsLookout' | 'HealersSanctum' | 'ArtisansWorkshop' | 'PetrifiedGreenhouse' | 'PrecursorGenerator' | 'AegisBeacon' | 'ObservationPlatform' | 'Observatory' | 'RelicArchive' | 'MeditationShrine' | 'MapHall';
    condition: number;
    maxCondition: number;
    dismantling?: boolean;
    dismantleProgress?: number;
  } | null;
  farmCrop?: {
    type: 'Wheat' | 'AmberMaize' | 'VortexCabbage' | 'Gemberries' | 'Stormroot' | 'Pumpkin';
    stage: 'sown' | 'growing' | 'harvestable';
    progress: number; // 0 to 100
  } | null;
  wildAnimal?: {
    id?: string;
    type: string;
    HP: number;
    maxHP: number;
    isDead: boolean;
    isHarvested: boolean;
    gender?: 'Male' | 'Female';
    agePhase?: 'Baby' | 'Adult';
    isTame?: boolean;
    trustLevel?: number;
    tameLevel?: number;
    tameGenerations?: number; // Captive generations (needs multi-gen to be fully quiet/docile)
  } | null;
  resourceNode?: {
    category: 'food' | 'material' | 'water' | 'rare';
    type: 
      | 'Berries' | 'Roots' | 'Mushrooms' | 'Meat'
      | 'Wood' | 'Stone' | 'Fiber' | 'Bone'
      | 'Dew' | 'ReservoirWater' | 'Rainwater'
      | 'Relics' | 'AncientMaterials'
      | 'Copper' | 'Silver' | 'Gold' | 'Iron';
    amount: number;
    maxAmount: number;
    regrowTimer: number; // incremental Days or ticks until regrowing +1 resource
    regrowRate: number; // speed/scalar of regrowth
    quality: number; // freshness index for food (100 is pristine, decending)
  } | null;
  landmark?: Landmark | null;
  gatherDesignated?: boolean;
  expeditionSite?: ExpeditionSite | null;
  loaded?: boolean;
}

export interface ExpeditionSite {
  id: string;
  templateId: string;
  category: 'Buried Structure' | 'Ancient Tech' | 'Cultural/Historical' | 'Fossil/Natural' | 'Military/Dangerous' | 'Legendary';
  name: string;
  tier: 'Minor' | 'Forgotten' | 'Ancient' | 'Pre-Storm' | 'Legendary' | 'Unclassified';
  recommendedScoutLevel: number;
  typicalDuration: string;
  durationHours: number;
  risk: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';
  finds: string[];
  uniqueDiscoveries: { itemKey: string; name: string; description: string }[];
  clues: string;
  suppliesRequired: { item: string; amount: number }[];
  equipmentRequiredOrOptional: { item: string; function: string; optional?: boolean }[];
  allowMultipleScouts: boolean;
  description: string;
  
  // Instance tracking
  explored: boolean;
  exhausted: boolean;
  activeScouts: string[]; // IDs of scouts inside
  remainingLootRuns: number; // starts at 3, decreases each successful run
  discovered: boolean;
}

export interface Landmark {
  id: string;
  type: 'giant_petrified_tree' | 'ancient_tower' | 'massive_skeleton' | 'abandoned_settlement' | 'buried_machine' | 'crashed_structure' | 'strange_stone_circle';
  name: string;
  description: string;
  storySegment: string; // lore snippet text
  explored: boolean;
  studyProgress?: number;
  studyMaxProgress?: number;
  rewards: {
    knowledgePoints?: number;
    moraleBoost?: number; // can be negative for mass graves, etc.
    relics?: number;
    ancientMaterials?: number;
    unlockRecipeId?: string;
    unlockBuildingType?: string;
  };
}

export interface InventoryItem {
  id: string;
  type: string;
  amount: number;
  weight: number;      // weight per unit or stack
  volume: number;      // volume per unit or stack
  freshness?: number;  // 0-100 freshness index
}

export interface InventoryStats {
  maxWeight: number;
  maxVolume: number;
  currentWeight: number;
  currentVolume: number;
  cleanliness: number; // 0-100 organizational factor mitigating spoilage
  items?: Record<string, number>;
}

export interface CraftingJob {
  id: string;
  recipeId: string;
  progress: number;
  maxProgress: number;
  workerId?: string; // assigned builder or artisan
}

export interface MapData {
  config: WorldConfig;
  grid: CellInfo[][];
  chunksByKey?: Record<string, WorldChunk>;
  cameraWorldPos?: { x: number; z: number };
  researchPoints: number;
  unlockedRecipes: string[];
  craftQueue: CraftingJob[];
  villageInventory: InventoryStats;
  caravanInventory: InventoryStats;
  stockpile: {
    wood: number;
    stone: number;
    food: number;
    medicine: number; // For healers to create and use!

    // Detailed Don't Starve items
    berries: number;
    berriesFresh: number; // 0 to 100 freshness %
    roots: number;
    rootsFresh: number;
    mushrooms: number;
    mushroomsFresh: number;
    meat: number;
    meatFresh: number;

    fiber: number;
    bone: number;

    dew: number;
    reservoirWater: number;
    rainwater: number;

    relics: number;
    ancientMaterials: number;

    // Minerals
    copper: number;
    silver: number;
    gold: number;
    iron: number;

    // Crafted products
    stoneAxe: number;
    flintPickaxe: number;
    grassBasket: number;
    spear: number;
    bow: number;
    boiledRoots: number;
    boiledRootsFresh: number;
    paddedJerkin: number;
    saltedMeat: number;
    saltedMeatFresh: number;
    steelPickaxe: number;
    eldritchWard: number;
    amuletLife: number;
    thuleciteCore: number;

    // Wildlife and hunting resources
    hide: number;
    fat: number;
    horns: number;

    // Expedition Gear
    reinforcedExplorerPack?: number;
    ruinDiverHarness?: number;
    surveyorsLens?: number;
    expeditionLantern?: number;
    sealedExpeditionSuit?: number;

    // Index signature for dynamic expedition resources and gear
    [key: string]: any;
  };
  unlockedBuildings?: string[]; // lists of custom unlocked buildings
  activeLoreLogs?: { id: string; landmarkName: string; text: string; discoveredDay: number }[]; // discovered lore log list
  tribeCodexLogs?: CodexEvent[]; // Chronicles log of lineage and important events
  autoGatherThresholds?: Record<string, number>; // auto gather limits for resources
  animals?: Animal[]; // dynamic wildlife simulation actors
  activeRelicStudy?: {
    id: string;
    relicName: string;
    totalDaysRequired: number;
    daysProgress: number;
    oracleName: string;
    oracleHealerLevel: number;
    rewardType: 'rp' | 'resources' | 'healing';
    decodedMessage: string;
  };
  stormDaysUntilMigration?: number;
  stormSpeed?: number;
  stormMovementDirection?: 'North' | 'East' | 'South' | 'West' | 'Northeast' | 'Northwest' | 'Southeast' | 'Southwest';
  stormDangerLevel?: 'Low' | 'Medium' | 'High' | 'Catastrophic';
  eyePos?: { x: number; z: number };
  eyeRadius?: number;
  deityModeActive?: boolean;
  deityModeOverrideDir?: number;
  deityModeOverrideSpeed?: number;
  deityModePaused?: boolean;
  futureEyePath?: { x: number; z: number }[];
  stormWallDamageEnabled?: boolean;
  eyeTargetPos?: { x: number; z: number };
  eyeMovementState?: 'stable' | 'migrating';
  isPackingCaravan?: boolean;
  packingProgress?: number;
  packingTargetProgress?: number;
  eyeMigrationDuration?: number;
  knownVillages?: OtherVillage[];
  oracleMessages?: OracleMessage[];
  discoveredRelics?: DiscoveredRelic[];
  activeApprenticeId?: string;
  predictionHistory?: { day: number; success: boolean }[];
  activeTradeCaravans?: any[];
  settings?: {
    graphicsLevel?: 'Low' | 'High';
    pathfindingTickRate?: 'Slow' | 'Normal' | 'Fast';
  };
  chunkLoadToken?: number;
  decorationsRevision?: number;
  gameDaysPlayed?: number;
  aiDirector?: AIDirectorState;
  isMigrationTravelActive?: boolean;
  caravanPos?: { x: number; z: number };
}

export interface OtherVillage {
  id: string;
  name: string;
  distance: number;
  relationship: number; // -100 to 100
  trust: number;
  fear: number;
  respect: number;
  population: number;
  knownOracle: string;
  availableTradeGoods: { item: string; quantity: number; price: number }[];
  neededGoods: { item: string; priceMultiplier: number }[];
  dangerStatus: 'Safe' | 'Threatened' | 'Under Attack' | 'Evacuating';
  lastContactTime?: string;
  visitorsMayArrive: boolean;

  // OFF-SCREEN SIMULATION EXPANSIONS
  cultureType?: 'Storm-Following Tribe' | 'Stationary Eye Settlement' | 'Relic Hunter Clan' | 'Herding Caravan' | 'Moon-Watcher Enclave' | 'Ruin-Born Settlement' | 'Broken Tribe' | 'Desperate Band';
  originStory?: string;
  region?: string;
  migrationStyle?: 'Constant Nomads' | 'Semi-Stationary' | 'Fixed Fortified' | 'Slow Drifters';
  food?: number; // 0 to 100
  water?: number; // 0 to 100
  medicine?: number; // 0 to 100
  animals?: number; // 0 to 100
  tools?: number; // 0 to 100
  relics?: number; // 0 to 100
  majorShortages?: string[];
  dangerLevel?: number; // 0 to 100
  morale?: number; // 0 to 100
  stability?: number; // 0 to 100
  migrationStatus?: string;
  oracleLevel?: number;
  relationships?: Record<string, 'allied' | 'friendly' | 'neutral' | 'suspicious' | 'rival' | 'hostile' | 'dependent' | 'indebted'>;
  activeProblems?: string[];
  activeOpportunities?: string[];
  recentEvents?: string[]; // history log of stories
  knownAncientSites?: string[];
  knownTradeRoutes?: string[];
  specialResources?: string[];
  culturalTraits?: string[];
  reputation?: string;
  lastContactDate?: string;
  allianceActive?: boolean;
  treatyActive?: boolean;
}

export interface OracleMessage {
  id: string;
  sender: string;
  text: string;
  timeSent: string;
  actionable: boolean;
  rewardDescription?: string;
  isRead?: boolean;
  type: 'help' | 'trade' | 'warning' | 'rumor' | 'news';
  status?: 'pending' | 'accepted' | 'declined' | 'completed';
  cost?: { item: string; qty: number };
  reward?: { item: string; qty: number };
}

export interface DiscoveredRelic {
  id: string;
  name: string;
  unknownFunction: string;
  studyProgress: number; // 0 to 100
  researchValue: number;
  dangerLevel: 'None' | 'Low' | 'Medium' | 'High';
  requiredOracleLevel: number;
  rewardType: 'blueprint' | 'lore' | 'resources' | 'technology';
  rewardDesc: string;
}

export type AnimalCategory = 'Herbivore' | 'SmallPredator' | 'ApexPredator' | 'Scavenger';

export interface Animal {
  id: string;
  type: string; // e.g. 'Rabbit', 'Deer', 'Sheep', 'WildGoat', 'Cattle', 'PackBird', 'Elk', 'Antelope', 'Fox', 'Wolf', 'WildDog', 'Bear', 'LargeCat', 'DireWolf', 'Vulture', 'Hyena', 'Crow'
  category: AnimalCategory;
  x: number;
  z: number;
  y: number;
  targetX: number;
  targetZ: number;
  
  HP: number;
  maxHP: number;
  isDead: boolean;
  isHarvested: boolean;
  
  // Demographics & Lifecycle
  gender: 'Male' | 'Female';
  agePhase: 'Baby' | 'Adult';
  ageDays: number;
  gestationTimer: number; // days pregnant, e.g. 0 to 5 days
  isPregnant: boolean;
  
  // Stats
  energy: number; // 0 to 100
  hunger: number; // 0 to 100
  thirst: number; // 0 to 100
  fear: number;   // 0 to 100
  stress: number; // 0 to 100
  isSleeping: boolean;
  sleepTimer: number; // dynamic sleeping cooldown or hours
  
  // Pack / Herding Behavior
  herdId?: string; // Links animals into grouped cohesive packs
  isHerdLeader?: boolean;
  
  // Taming & Domestic progression
  tameLevel: number;        // 0 to 100
  isTame: boolean;          // true if fully integrated with colony
  isLeashed?: boolean;      // true if animal is secured
  captiveBorn: boolean;     // true if born in captiviity (offspring become fully quiet/tame)
  trustLevel: number;       // 0 to 100 trust based on active feeding
  assignedJob?: 'Carrying' | 'Milking' | 'Plowing' | 'HuntingCompanion' | 'Guarding' | 'Wagon' | null;
  assignedToHandler?: string | null; // tribesperson ID
  
  // Carcass Harvest yields
  meatAmount: number;
  hideAmount: number;
  boneAmount: number;
  fatAmount: number;
  rareSpecimenAmount: number; // Horns / Feathers
  decayTimer?: number;       // Visual death decay tracker
  killedByPredator?: boolean;// Predator hunting outcome tracker
  aiTickTimer?: number;
}

export interface CodexEvent {
  id: string;
  type: 'birth' | 'death' | 'marriage' | 'apprenticeship' | 'mastery' | 'succession' | 'monument';
  title: string;
  description: string;
  day: number;
  year?: number;
}

export type TimeSpeed = 'paused' | 'normal' | 'fast' | 'super';

export interface GameCalendar {
  days: number;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  focusX?: number;
  focusZ?: number;
}

export type TribespersonRole = 
  | 'Gatherer' 
  | 'Hunter' 
  | 'Farmer' 
  | 'Builder' 
  | 'Scout' 
  | 'Healer' 
  | 'Artisan'
  | 'Oracle';

export type TribespersonTrait = 
  | 'Tireless' 
  | 'Green Thumb' 
  | 'Path Finder' 
  | 'Beast Friend' 
  | 'Iron Stomach'
  | 'Storm Listener'
  | 'Sure Hands'
  | 'Strong Back'
  | 'Light Step'
  | 'Stone Eye'
  | 'Root Sense'
  | 'Patient Worker'
  | 'Quick Learner'
  | 'Careful Builder'
  | 'Fast Hands'
  | 'Tool Wise'
  | 'Silent Hunter'
  | 'Bold Hunter'
  | 'Cautious Soul'
  | 'Hardy'
  | 'Deep Sleeper'
  | 'Restless'
  | 'Social Warmth'
  | 'Loner'
  | 'Natural Mentor'
  | 'Sharp Memory'
  | 'Far Seer'
  | 'Relic Curious'
  | 'Steady Nerves'
  | 'Storm Fearful'
  | 'Night Calm'
  | 'Sun Hungry'
  | 'Water Finder'
  | 'Fire Keeper'
  | 'Gentle Hands'
  | 'Tough Skin'
  | 'Pack Mind'
  | 'Independent'
  | 'Waste Not'
  | 'Born Trader'
  | 'Homebound'
  | 'Wanderheart'
  | 'Soft Heart'
  | 'Iron Focus'
  | 'Easily Spooked'
  | 'Sandwise'
  | 'Cliffborn'
  | 'Medicinal Nose'
  | 'Caravan Soul';

export interface TribespersonStats {
  hunger: number; // 0 (starving) to 100 (full)
  thirst: number; // 0 (dehydrated) to 100 (hydrated)
  fatigue: number; // 0 (exhausted) to 100 (fully rested)
  morale: number; // 0 (broken) to 100 (elated)
  health: number; // 0 (dead) to 100 (healthy)
}

export interface TribespersonAttributes {
  strength: number;     // 1 to 10
  endurance: number;    // 1 to 10
  intelligence: number; // 1 to 10
  perception: number;   // 1 to 10
  agility: number;      // 1 to 10
}

export interface SkillProgress {
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export interface IllnessInfo {
  name: string; // e.g. "Storm Fever", "Spoil Gut", "Dust Cough"
  severity: 'Mild' | 'Moderate' | 'Severe';
  durationRemainingDays: number;
  treatmentProgress: number; // 0 to 100
  medicineRequired: number; // e.g. 1 to 3 herbs/mushrooms/roots
  recoveryChance: number; // 0 to 1
  symptoms: string;
}

export interface Tribesperson {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  ageYears: number;
  ageDays: number;
  isAlive: boolean;
  deathReason?: string;
  
  stats: TribespersonStats;
  attributes: TribespersonAttributes;
  role: TribespersonRole;
  traits: TribespersonTrait[];
  
  // Skills mapped to roles they represent
  skills: Record<TribespersonRole, SkillProgress>;
  
  // Simulation coordinate/target coordinates for visuals
  x: number;
  z: number;
  y: number;
  targetX: number;
  targetZ: number;
  color: string;
  
  statusText: string;

  // RimWorld-style priority queue and cargo additions
  priorities: Record<JobCategory, JobPriority>;
  personalInventory: InventoryStats;
  carriage: {
    type: string;
    amount: number;
  } | null;
  activeJobType?: JobCategory | 'MigratingTravel' | null;
  jobTargetCoords?: { x: number; z: number } | null;
  workProgress?: number; // active work time accumulation at current node
  isManualDirectTask?: boolean;
  personality?: 'Brave' | 'Curious' | 'Cowardly' | 'Lazy' | 'Ambitious' | 'Loyal' | 'Greedy';
  relationships?: {
    targetId: string;
    targetName: string;
    type: 'Friend' | 'Rival' | 'Mentor' | 'Apprentice' | 'Family';
    value: number; // -100 to 100
  }[];

  // Generational & Population simulation
  familyName?: string;
  generation?: number;
  parents?: string[];
  isTribeBorn?: boolean;
  agePhase?: 'Child' | 'Teenager' | 'Adult';
  childUpbringing?: 'Hunter Camp' | 'Builder District' | 'Oracle Enclave' | 'General';
  apprenticeTo?: string;
  apprenticeToName?: string;
  masteryTechniques?: string[];
  lineagePath?: string;
  isOracleApprentice?: boolean;
  aiTickTimer?: number;
  hasBackpack?: boolean;

  // Expedition simulation states
  expeditionState?: 'none' | 'entering' | 'exploring' | 'investigating' | 'returning';
  expeditionTargetCoords?: { x: number; z: number } | null;
  expeditionTimer?: number; // hours remaining in current stage
  expeditionDuration?: number; // total duration
  expeditionSiteName?: string;
  expeditionSiteType?: string;
  expeditionLootCollected?: Record<string, number> | null;
  expeditionUniqueFinds?: string[] | null;
  expeditionLogs?: string[] | null;
  illness?: IllnessInfo;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  tier: 'Primitive' | 'Tribal' | 'Advanced' | 'Relic';
  workstation: 'None' | 'ArtisanBench' | 'ScienceMachine' | 'RuinousAltar';
  materials: Record<string, number>;
  skillsRequired?: { role: string; level: number };
  researchCost?: number; // point cost to research
}

export const RECIPE_DATABASE: Record<string, Recipe> = {
  stoneAxe: {
    id: 'stoneAxe',
    name: 'Breathstone Cutter',
    description: 'Increases woodcutting efficiency. Decreases gather node efforts by 50%.',
    tier: 'Primitive',
    workstation: 'None',
    materials: { wood: 15, stone: 10, fiber: 5 },
  },
  flintPickaxe: {
    id: 'flintPickaxe',
    name: 'Breathstone Pickaxe',
    description: 'Increases mining efficiency. Decreases rock harvesting time by 50%.',
    tier: 'Primitive',
    workstation: 'None',
    materials: { wood: 10, stone: 20, fiber: 5 },
  },
  grassBasket: {
    id: 'grassBasket',
    name: 'Handwoven Fiber Basket',
    description: 'Allows haulers and foragers to pack light! Adds +10kg to carrying inventory capacity.',
    tier: 'Primitive',
    workstation: 'None',
    materials: { fiber: 25 },
  },
  spear: {
    id: 'spear',
    name: 'Windbone Spear',
    description: 'Deals 2x damage to animals. Buffs hunter success rate & speeds up slaughter times.',
    tier: 'Tribal',
    workstation: 'ArtisanBench',
    materials: { wood: 20, bone: 8, fiber: 10 },
    skillsRequired: { role: 'Artisan', level: 2 },
    researchCost: 10,
  },
  bow: {
    id: 'bow',
    name: 'Tendon Longbow',
    description: 'A powerful ranged bow. Allows Hunters of Level 4+ to attack animals from a distance (range equals hunter level).',
    tier: 'Tribal',
    workstation: 'ArtisanBench',
    materials: { wood: 30, fiber: 25, bone: 5 },
    skillsRequired: { role: 'Artisan', level: 3 },
    researchCost: 15,
  },
  boiledRoots: {
    id: 'boiledRoots',
    name: 'Clay-Stewed Root Mash',
    description: 'A comforting high-nutrient dish. Retains moisture; restores +40 Hunger and +15 Thirst.',
    tier: 'Tribal',
    workstation: 'ArtisanBench',
    materials: { roots: 6, reservoirWater: 3, wood: 5 },
    skillsRequired: { role: 'Farmer', level: 1 },
    researchCost: 5,
  },
  paddedJerkin: {
    id: 'paddedJerkin',
    name: 'Windbone Vest',
    description: 'Light padding. Lessens severity of exposure & negative morale events by 35%.',
    tier: 'Tribal',
    workstation: 'ArtisanBench',
    materials: { fiber: 30, bone: 12 },
    researchCost: 15,
  },
  saltedMeat: {
    id: 'saltedMeat',
    name: 'Salt-Cured Jerky',
    description: 'Cured and salted high protein snack. Kept airtight, it NEVER decays or spoils.',
    tier: 'Advanced',
    workstation: 'ScienceMachine',
    materials: { meat: 15, reservoirWater: 5, wood: 5 },
    skillsRequired: { role: 'Artisan', level: 3 },
    researchCost: 20,
  },
  steelPickaxe: {
    id: 'steelPickaxe',
    name: 'Moon-Iron Pickaxe',
    description: 'Superb mining tool made of heavy Moon-Iron. Accelerates rock extraction by 75%.',
    tier: 'Advanced',
    workstation: 'ScienceMachine',
    materials: { ancientMaterials: 3, wood: 15, stone: 25 },
    researchCost: 30,
  },
  eldritchWard: {
    id: 'eldritchWard',
    name: 'Stormward Talisman',
    description: 'A glowing electrostatic protective talisman. Completely blocks decay and contamination effects in warehouse storage (+15 Stockpile Cleanliness).',
    tier: 'Advanced',
    workstation: 'ScienceMachine',
    materials: { relics: 1, bone: 10, fiber: 30 },
    researchCost: 40,
  },
  amuletLife: {
    id: 'amuletLife',
    name: 'Breathstone Spark Amulet',
    description: 'Saves a tribe member from death! Automatically shatters to restore 100% heat, hunger, and health using compressed air cells inside the Breathstone.',
    tier: 'Relic',
    workstation: 'RuinousAltar',
    materials: { relics: 3, bone: 15, dew: 10 },
    researchCost: 60,
  },
  thuleciteCore: {
    id: 'thuleciteCore',
    name: 'Atmospheric Anchor Core',
    description: 'An ancient heart pulsating with power. Passive morale boost (+20 Morale state colony-wide).',
    tier: 'Relic',
    workstation: 'RuinousAltar',
    materials: { ancientMaterials: 6, relics: 2, dew: 15 },
    researchCost: 80,
  },
  reinforcedExplorerPack: {
    id: 'reinforcedExplorerPack',
    name: 'Reinforced Explorer Pack',
    description: 'Increases scout carrying capacity by 100% during expeditions.',
    tier: 'Tribal',
    workstation: 'ArtisanBench',
    materials: { fiber: 25, bone: 10, wood: 10 },
    researchCost: 15,
  },
  ruinDiverHarness: {
    id: 'ruinDiverHarness',
    name: 'Ruin Diver Harness',
    description: 'Reduces danger risk during ancient site exploration by 25%.',
    tier: 'Tribal',
    workstation: 'ArtisanBench',
    materials: { fiber: 35, bone: 15, wood: 5 },
    researchCost: 15,
  },
  surveyorsLens: {
    id: 'surveyorsLens',
    name: 'Surveyor\'s Lens',
    description: 'Allows detecting high-tier ruins and landmarks from further away.',
    tier: 'Advanced',
    workstation: 'ScienceMachine',
    materials: { stone: 20, copper: 6, relics: 1 },
    researchCost: 30,
  },
  expeditionLantern: {
    id: 'expeditionLantern',
    name: 'Expedition Lantern',
    description: 'Eliminates fuel requirements, lessens dark danger by 40%.',
    tier: 'Advanced',
    workstation: 'ScienceMachine',
    materials: { copper: 10, fiber: 20, ancientMaterials: 2 },
    researchCost: 30,
  },
  sealedExpeditionSuit: {
    id: 'sealedExpeditionSuit',
    name: 'Sealed Expedition Suit',
    description: 'Required to enter radioactive or vacuum environments.',
    tier: 'Relic',
    workstation: 'RuinousAltar',
    materials: { ancientMaterials: 5, relics: 2, fiber: 60 },
    researchCost: 75,
  },
};

export type EventIntensity = 'Calm' | 'Low' | 'Medium' | 'High' | 'Crisis' | 'Recovery';

export interface PlayerCapabilityProfile {
  population: {
    total: number;
    children: number;
    adults: number;
    elders: number;
    sick: number;
    injured: number;
    workers: number;
  };
  survival: {
    food: number;
    water: number;
    medicine: number;
    shelter: number;
    sleep: number;
    morale: number;
    sickness: number;
    stabilityScore: number;
  };
  defense: {
    strengthScore: number;
    fighters: number;
    guards: number;
    hunterLevels: number;
    weapons: number;
    armor: number;
    animals: number;
    structures: number;
  };
  migration: {
    capacity: number;
    supplies: number;
    animals: number;
    safetyScore: number;
  };
  economy: {
    storedResourcesValue: number;
    tradeGoodsValue: number;
    rareItemsCount: number;
  };
  knowledge: {
    oracleLevel: number;
    scoutLevel: number;
    relicsResearched: number;
    recipesUnlocked: number;
  };
  stressScore: number;
}

export interface DirectorChoice {
  id: string;
  text: string;
  tooltip?: string;
  requirements?: string;
  isEligible?: boolean;
}

export interface DirectorEvent {
  id: string;
  name: string;
  category: 'Survival' | 'Migration' | 'Wildlife' | 'Social' | 'Oracle' | 'Trade' | 'Diplomacy' | 'Expedition' | 'Danger' | 'Recovery';
  description: string;
  intensity: 'Calm' | 'Low' | 'Medium' | 'High' | 'Crisis';
  choices?: DirectorChoice[];
}

export interface ActiveDirectorEvent {
  event: DirectorEvent;
  triggeredDay: number;
  resolved?: boolean;
  selectedChoiceId?: string;
  resolvedMessage?: string;
}

export interface AIDirectorState {
  intensity: EventIntensity;
  intensityTimer: number;
  playerReputation: number;
  recentStress: {
    recentDeaths: number;
    recentRaid: number;
    recentPredatorAttack: number;
    recentFoodShortage: number;
    recentFailedMigration: number;
    recentIllnessOutbreak: number;
    recentDisaster: number;
  };
  eventCooldowns: Record<string, number>;
  eventHistory: { id: string; name: string; day: number; outcome?: string }[];
  activeEvent: ActiveDirectorEvent | null;
  pendingEvents: { eventId: string; triggerDay: number }[];
  capabilityProfile: PlayerCapabilityProfile;
  difficultyStage: 'Early' | 'Mid' | 'Late';
}

