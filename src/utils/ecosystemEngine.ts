import { MapData, Animal, AnimalCategory, Tribesperson } from '../types';

// Helper to generate unique IDs
function generateUUID(): string {
  return Math.random().toString(36).slice(2, 11);
}

// Animal species database with configurations
export interface SpeciesConf {
  category: AnimalCategory;
  maxHP: number;
  speed: number;
  yields: { meat: number; hide: number; bones: number; fat: number; rare: number };
  description: string;
  emoji: string;
  preferredBiomes: string[];
}

export const SPECIES_DB: Record<string, SpeciesConf> = {
  // --- INSECTS & SMALL CREATURES (Image 1) ---
  GlowGrub: {
    category: 'Herbivore',
    maxHP: 12,
    speed: 0.6,
    yields: { meat: 5, hide: 1, bones: 1, fat: 0.5, rare: 1 }, // rare = glowing fluid
    description: 'A soft-bodied, neon-veined Glow-Grub found under rich topsoil.',
    emoji: '🐛',
    preferredBiomes: ['forest', 'grassland']
  },
  CinderCentipede: {
    category: 'Herbivore',
    maxHP: 18,
    speed: 0.9,
    yields: { meat: 8, hide: 1, bones: 2, fat: 1, rare: 2 }, // rare = static scale
    description: 'A multi-segmented Cinder-Centipede buzzing with minor static charge.',
    emoji: '🐛',
    preferredBiomes: ['rocky', 'forest']
  },
  PricklyBeetle: {
    category: 'Herbivore',
    maxHP: 22,
    speed: 0.7,
    yields: { meat: 10, hide: 2, bones: 2, fat: 1, rare: 2 },
    description: 'A spiky, protective Prickly Beetle crawling on dry flora.',
    emoji: '🐞',
    preferredBiomes: ['desert', 'beach']
  },

  // --- HERBIVORES / NEUTRAL (Image 1) ---
  JackLeaper: {
    category: 'Herbivore',
    maxHP: 20,
    speed: 1.5,
    yields: { meat: 10, hide: 2, bones: 1, fat: 1, rare: 0 },
    description: 'A high-speed Jack-Leaper with giant, sound-sensitive ears.',
    emoji: '🐇',
    preferredBiomes: ['grassland', 'forest', 'desert']
  },
  PrismHornAntelope: {
    category: 'Herbivore',
    maxHP: 75,
    speed: 1.6,
    yields: { meat: 40, hide: 9, bones: 7, fat: 4, rare: 2 }, // rare = crystal horn
    description: 'A graceful, long-legged Prism-Horn Antelope that bounds across the dry silt steppes.',
    emoji: '🦌',
    preferredBiomes: ['grassland', 'desert']
  },
  TuskedShagBeast: {
    category: 'Herbivore',
    maxHP: 60,
    speed: 0.9,
    yields: { meat: 35, hide: 15, bones: 6, fat: 6, rare: 5 }, // rare = shag wool
    description: 'A heavily woolled Tusked Shag-Beast with protective head horns. Highly cooperative grazer.',
    emoji: '🐑',
    preferredBiomes: ['grassland', 'beach']
  },
  SiltCamel: {
    category: 'Herbivore',
    maxHP: 130,
    speed: 0.8,
    yields: { meat: 80, hide: 22, bones: 14, fat: 12, rare: 4 }, // rare = camel wool
    description: 'A tall, resilient desert grazer with exceptional load capacity.',
    emoji: '🐫',
    preferredBiomes: ['desert', 'grassland']
  },
  AncientDomeBack: {
    category: 'Herbivore',
    maxHP: 110,
    speed: 0.5,
    yields: { meat: 55, hide: 20, bones: 12, fat: 8, rare: 4 }, // rare = mossy plate
    description: 'An ancient Dome-Back with fossil-hardened mossy slate plates on its back.',
    emoji: '🐢',
    preferredBiomes: ['forest', 'grassland', 'beach']
  },
  FrilledShieldHorn: {
    category: 'Herbivore',
    maxHP: 160,
    speed: 0.7,
    yields: { meat: 100, hide: 30, bones: 18, fat: 18, rare: 6 }, // rare = shield crest
    description: 'A massive, thick-skinned Frilled Shield-Horn with defensive head plates and a nose horn.',
    emoji: '🦏',
    preferredBiomes: ['desert', 'rocky', 'grassland']
  },

  // --- PREDATORS / CARNIVORES (Image 1) ---
  ProwlerJackal: {
    category: 'SmallPredator',
    maxHP: 45,
    speed: 1.4,
    yields: { meat: 18, hide: 9, bones: 4, fat: 3, rare: 2 }, // rare = sleek pelt
    description: 'A sleek golden Prowler Jackal that stalks small burrowers.',
    emoji: '🦊',
    preferredBiomes: ['forest', 'grassland']
  },
  ChitinSlasher: {
    category: 'SmallPredator',
    maxHP: 70,
    speed: 1.25,
    yields: { meat: 30, hide: 10, bones: 6, fat: 4, rare: 3 }, // rare = venom tail
    description: 'A territorial, golden-orange Chitin Slasher armed with a jointed stormtail.',
    emoji: '🦂',
    preferredBiomes: ['desert', 'rocky']
  },
  GaleWingFlier: {
    category: 'SmallPredator',
    maxHP: 50,
    speed: 1.35,
    yields: { meat: 20, hide: 4, bones: 6, fat: 2, rare: 3 }, // rare = leathery wings
    description: 'A bat-winged flying predator that dives from above.',
    emoji: '🦇',
    preferredBiomes: ['desert', 'rocky']
  },
  VelociSkitterer: {
    category: 'SmallPredator',
    maxHP: 65,
    speed: 1.55,
    yields: { meat: 35, hide: 10, bones: 8, fat: 5, rare: 3 },
    description: 'A swift, bipedal runner reptile that skitters dynamically through sandy dunes.',
    emoji: '🦖',
    preferredBiomes: ['desert', 'grassland']
  },
  SpinedSaberWolf: {
    category: 'ApexPredator',
    maxHP: 200,
    speed: 1.3,
    yields: { meat: 95, hide: 32, bones: 18, fat: 20, rare: 12 }, // claws/tusks
    description: 'A muscular, double-fanged Spined Saber-Wolf commanding the canyons.',
    emoji: '🐺',
    preferredBiomes: ['forest', 'rocky']
  },
  ScytheBeakStrider: {
    category: 'ApexPredator',
    maxHP: 240,
    speed: 1.4,
    yields: { meat: 110, hide: 35, bones: 22, fat: 15, rare: 15 }, // scythe bones
    description: 'A tall, six-legged Scythe-Beak Strider with powerful mantis claws and a curved beak.',
    emoji: '🦗',
    preferredBiomes: ['forest', 'desert', 'rocky']
  },
  SporeSpitterPlant: {
    category: 'ApexPredator',
    maxHP: 150,
    speed: 0.0,
    yields: { meat: 0, hide: 5, bones: 4, fat: 0, rare: 6 },
    description: 'A dangerous rooted carnivorous plant that attacks nearby creatures with toxic spores.',
    emoji: '🌵',
    preferredBiomes: ['forest', 'grassland', 'desert', 'rocky']
  },

  // --- SCAVENGERS / OMNIVORES (Image 1) ---
  StormVulture: {
    category: 'Scavenger',
    maxHP: 55,
    speed: 1.1,
    yields: { meat: 16, hide: 3, bones: 8, fat: 2, rare: 4 }, // rare = storm feathers
    description: 'A hunched, bald Storm Vulture scavenging battlefield and desert remains.',
    emoji: '🦅',
    preferredBiomes: ['desert', 'rocky']
  },
  PlateBackShellgrazer: {
    category: 'Scavenger',
    maxHP: 75,
    speed: 0.9,
    yields: { meat: 35, hide: 12, bones: 10, fat: 6, rare: 3 }, // rare = shell plates
    description: 'An armored, low-slung Plate-Back Shellgrazer digging up subsurface larvae and seeds.',
    emoji: '🦫',
    preferredBiomes: ['grassland', 'desert', 'beach']
  },
  SiltBadger: {
    category: 'Scavenger',
    maxHP: 65,
    speed: 1.2,
    yields: { meat: 25, hide: 8, bones: 6, fat: 4, rare: 2 },
    description: 'A ferocious, low-built Silt Badger that defends its carcass caches aggressively.',
    emoji: '🦡',
    preferredBiomes: ['forest', 'grassland']
  },
  CarapaceScarab: {
    category: 'Scavenger',
    maxHP: 80,
    speed: 0.85,
    yields: { meat: 40, hide: 15, bones: 10, fat: 8, rare: 4 },
    description: 'A massive, six-legged heavy Carapace Scarab capable of crushing dry bones.',
    emoji: '🪲',
    preferredBiomes: ['desert', 'rocky', 'grassland']
  },

  // --- WATER SPECIES ---
  AureliaFish: {
    category: 'Herbivore',
    maxHP: 15,
    speed: 0.8,
    yields: { meat: 12, hide: 0, bones: 2, fat: 1, rare: 1 }, // rare = glowing scales
    description: 'A glowing, scale-less Aurelia Fish darting through clear lake water.',
    emoji: '🐟',
    preferredBiomes: ['water']
  },

  // --- BACKWARDS COMPATIBILITY ALIASES ---
  Rabbit: {
    category: 'Herbivore',
    maxHP: 20,
    speed: 1.5,
    yields: { meat: 10, hide: 2, bones: 1, fat: 1, rare: 0 },
    description: 'A high-speed Jack-Leaper with giant, sound-sensitive ears.',
    emoji: '🐇',
    preferredBiomes: ['grassland', 'forest', 'desert']
  },
  Deer: {
    category: 'Herbivore',
    maxHP: 75,
    speed: 1.6,
    yields: { meat: 40, hide: 9, bones: 7, fat: 4, rare: 2 },
    description: 'A graceful, long-legged Prism-Horn Antelope that bounds across the dry silt steppes.',
    emoji: '🦌',
    preferredBiomes: ['grassland', 'desert']
  },
  Sheep: {
    category: 'Herbivore',
    maxHP: 60,
    speed: 0.9,
    yields: { meat: 35, hide: 15, bones: 6, fat: 6, rare: 5 },
    description: 'A heavily woolled Tusked Shag-Beast with protective head horns.',
    emoji: '🐑',
    preferredBiomes: ['grassland', 'beach']
  },
  WildGoat: {
    category: 'Herbivore',
    maxHP: 60,
    speed: 1.1,
    yields: { meat: 40, hide: 8, bones: 8, fat: 4, rare: 3 },
    description: 'A rugged climber. Extremely comfortable on rough, stony terrain.',
    emoji: '🐐',
    preferredBiomes: ['rocky', 'desert']
  },
  Cattle: {
    category: 'Herbivore',
    maxHP: 160,
    speed: 0.7,
    yields: { meat: 100, hide: 30, bones: 18, fat: 18, rare: 6 },
    description: 'A massive wild bull. Slow, resilient, holds immense payload capacity.',
    emoji: '🐂',
    preferredBiomes: ['grassland']
  },
  PackBird: {
    category: 'Herbivore',
    maxHP: 130,
    speed: 0.8,
    yields: { meat: 80, hide: 22, bones: 14, fat: 12, rare: 4 },
    description: 'A tall flightless runner. Extremely reliable for pulling heavier caravans.',
    emoji: '🦤',
    preferredBiomes: ['desert', 'beach']
  },
  Elk: {
    category: 'Herbivore',
    maxHP: 110,
    speed: 0.5,
    yields: { meat: 55, hide: 20, bones: 12, fat: 8, rare: 4 },
    description: 'An ancient Dome-Back with fossil-hardened mossy slate plates on its back.',
    emoji: '🦌',
    preferredBiomes: ['forest']
  },
  Antelope: {
    category: 'Herbivore',
    maxHP: 75,
    speed: 1.6,
    yields: { meat: 40, hide: 9, bones: 7, fat: 4, rare: 2 },
    description: 'A graceful, long-legged Prism-Horn Antelope that bounds across the dry silt steppes.',
    emoji: '🦌',
    preferredBiomes: ['grassland', 'desert']
  },
  Boar: {
    category: 'Herbivore',
    maxHP: 90,
    speed: 0.95,
    yields: { meat: 50, hide: 12, bones: 8, fat: 12, rare: 3 },
    description: 'An aggressive wild pig. Attacks back fiercely when provoked or injured.',
    emoji: '🐗',
    preferredBiomes: ['forest', 'rocky']
  },
  Fox: {
    category: 'SmallPredator',
    maxHP: 45,
    speed: 1.4,
    yields: { meat: 18, hide: 9, bones: 4, fat: 3, rare: 2 },
    description: 'A sleek golden Prowler Jackal that stalks small burrowers.',
    emoji: '🦊',
    preferredBiomes: ['forest', 'grassland']
  },
  Wolf: {
    category: 'SmallPredator',
    maxHP: 70,
    speed: 1.25,
    yields: { meat: 30, hide: 10, bones: 6, fat: 4, rare: 3 },
    description: 'A cunning pack predator.',
    emoji: '🐺',
    preferredBiomes: ['forest', 'rocky']
  },
  WildDog: {
    category: 'SmallPredator',
    maxHP: 60,
    speed: 1.3,
    yields: { meat: 25, hide: 8, bones: 6, fat: 4, rare: 1 },
    description: 'A swift, howling hound.',
    emoji: '🐕',
    preferredBiomes: ['desert', 'grassland']
  },
  Bear: {
    category: 'ApexPredator',
    maxHP: 240,
    speed: 1.4,
    yields: { meat: 110, hide: 35, bones: 22, fat: 15, rare: 15 },
    description: 'A towering forest colossus.',
    emoji: '🐻',
    preferredBiomes: ['forest', 'rocky']
  },
  LargeCat: {
    category: 'ApexPredator',
    maxHP: 160,
    speed: 1.45,
    yields: { meat: 65, hide: 25, bones: 12, fat: 10, rare: 8 },
    description: 'A lethal sabertooth.',
    emoji: '🦁',
    preferredBiomes: ['desert', 'rocky']
  },
  DireWolf: {
    category: 'ApexPredator',
    maxHP: 200,
    speed: 1.3,
    yields: { meat: 95, hide: 32, bones: 18, fat: 20, rare: 12 },
    description: 'A mammoth primal alpha hound.',
    emoji: '🐺',
    preferredBiomes: ['forest', 'rocky']
  },
  Vulture: {
    category: 'Scavenger',
    maxHP: 55,
    speed: 1.1,
    yields: { meat: 16, hide: 3, bones: 8, fat: 2, rare: 4 },
    description: 'A hunched, bald Storm Vulture scavenging battlefield and desert remains.',
    emoji: '🦅',
    preferredBiomes: ['desert', 'rocky']
  },
  Hyena: {
    category: 'Scavenger',
    maxHP: 75,
    speed: 1.25,
    yields: { meat: 30, hide: 8, bones: 10, fat: 5, rare: 1 },
    description: 'An aggressive pack scavenger.',
    emoji: '🐆',
    preferredBiomes: ['desert', 'grassland']
  },
  Crow: {
    category: 'Scavenger',
    maxHP: 15,
    speed: 1.6,
    yields: { meat: 5, hide: 1, bones: 2, fat: 0.5, rare: 2 },
    description: 'A tiny black shadow.',
    emoji: '🐦',
    preferredBiomes: ['grassland', 'forest', 'beach', 'desert']
  },
  Fish: {
    category: 'Herbivore',
    maxHP: 15,
    speed: 0.8,
    yields: { meat: 12, hide: 0, bones: 2, fat: 1, rare: 1 },
    description: 'A glowing, scale-less Aurelia Fish darting through clear lake water.',
    emoji: '🐟',
    preferredBiomes: ['water']
  }
};

// Procedural spawning helper
export function createAnimal(
  type: string, 
  x: number, 
  z: number, 
  isBaby = false,
  captiveBorn = false
): Animal {
  const conf = SPECIES_DB[type] || SPECIES_DB.Deer;
  const gender = Math.random() > 0.5 ? 'Male' : 'Female';
  const agePhase = isBaby ? 'Baby' : 'Adult';
  const mul = isBaby ? 0.4 : 1.0;

  return {
    id: 'ani_' + generateUUID(),
    type,
    category: conf.category,
    x,
    z,
    y: 1.0,
    targetX: x,
    targetZ: z,
    
    HP: Math.round(conf.maxHP * mul),
    maxHP: conf.maxHP,
    isDead: false,
    isHarvested: false,
    
    gender,
    agePhase,
    ageDays: isBaby ? 0 : 5 + Math.floor(Math.random() * 8),
    gestationTimer: 0,
    isPregnant: false,
    
    energy: 80 + Math.random() * 20,
    hunger: 20 + Math.random() * 40, // 0 = full, 100 = starving
    thirst: 15 + Math.random() * 30,
    fear: 0,
    stress: 0,
    isSleeping: false,
    sleepTimer: 0,
    
    tameLevel: captiveBorn ? 25 : 0,
    isTame: false,
    captiveBorn,
    trustLevel: 0,
    assignedJob: null,
    assignedToHandler: null,
    
    meatAmount: Math.round(conf.yields.meat * mul),
    hideAmount: Math.round(conf.yields.hide * mul),
    boneAmount: Math.round(conf.yields.bones * mul),
    fatAmount: Math.round(conf.yields.fat * mul),
    rareSpecimenAmount: isBaby ? 0 : conf.yields.rare
  };
}

// Helper functions for map cell access supporting both chunked maps and grid maps
export function getMapSize(mapData: MapData): number {
  return mapData.config?.size || (mapData.grid && mapData.grid.length > 0 ? mapData.grid.length : 80);
}

export function getCellAt(mapData: MapData, worldX: number, worldZ: number): CellInfo | undefined {
  if (!mapData) return undefined;
  const rx = Math.round(worldX);
  const rz = Math.round(worldZ);
  if (mapData.chunksByKey) {
    const chunkX = Math.floor(rx / 6);
    const chunkZ = Math.floor(rz / 6);
    const key = `${chunkX},${chunkZ}`;
    const chunk = mapData.chunksByKey[key];
    if (chunk) {
      const cx = ((rx % 6) + 6) % 6;
      const cz = ((rz % 6) + 6) % 6;
      return chunk.cells[cx]?.[cz];
    }
  }
  return mapData.grid?.[rx]?.[rz];
}

export function getAllLoadedCells(mapData: MapData): CellInfo[] {
  if (mapData.chunksByKey) {
    return Object.values(mapData.chunksByKey)
      .filter((chunk: any) => chunk.loaded !== false)
      .flatMap((chunk: any) => chunk.cells.flat())
      .filter(Boolean);
  }
  if (mapData.grid && mapData.grid.length > 0) {
    return mapData.grid.flat().filter(Boolean);
  }
  return [];
}

// Validates the target coordinate based on animal species locomotion
export function getValidAnimalTarget(
  ani: { type: string; x: number; z: number },
  targetX: number,
  targetY: number, // unused coordinate matching signature
  mapData: MapData
): { x: number; z: number } {
  const size = getMapSize(mapData);
  const isFish = ani.type === 'Fish' || ani.type === 'AureliaFish';
  
  // Clamp boundaries nicely to avoid getting stuck at border edges
  let tx = Math.max(1, Math.min(size - 2, Math.round(targetX)));
  let tz = Math.max(1, Math.min(size - 2, Math.round(targetY)));
  
  const cell = getCellAt(mapData, tx, tz);
  if (cell) {
    if (isFish) {
      if (cell.biome === 'water') {
        return { x: tx, z: tz };
      }
    } else {
      if (cell.biome !== 'water' && !cell.structure) {
        return { x: tx, z: tz };
      }
    }
  }
  
  // Try 8 neighbors up to distance 3 to search for correct habitat terrain cell
  for (let r = 1; r <= 3; r++) {
    const offsets = [
      { x: 0, z: -r }, { x: 0, z: r }, { x: -r, z: 0 }, { x: r, z: 0 },
      { x: -r, z: -r }, { x: -r, z: r }, { x: r, z: -r }, { x: r, z: r }
    ];
    for (const off of offsets) {
      const nx = Math.max(1, Math.min(size - 2, tx + off.x));
      const nz = Math.max(1, Math.min(size - 2, tz + off.z));
      const nCell = getCellAt(mapData, nx, nz);
      if (nCell) {
        if (isFish) {
          if (nCell.biome === 'water') {
            return { x: nx, z: nz };
          }
        } else {
          if (nCell.biome !== 'water' && !nCell.structure) {
            return { x: nx, z: nz };
          }
        }
      }
    }
  }
  
  // Fallback safe: if we could not resolve matching cell, use animal's current location!
  return { x: Math.max(1, Math.min(size - 2, Math.round(ani.x))), z: Math.max(1, Math.min(size - 2, Math.round(ani.z))) };
}

// Spawns natural packs or herds
export function populateInitialMapAnimals(mapData: MapData) {
  const list: Animal[] = [];
  const size = getMapSize(mapData);
  const allCells = getAllLoadedCells(mapData);

  const landCells = allCells.filter(c => c.biome !== 'water' && !c.structure);
  const waterCells = allCells.filter(c => c.biome === 'water');

  if (landCells.length === 0) {
    // If no loaded land cells yet, use default positions around center
    const center = Math.floor(size / 2);
    for (let i = 0; i < 10; i++) {
      const rx = center + Math.floor(Math.random() * 14 - 7);
      const rz = center + Math.floor(Math.random() * 14 - 7);
      landCells.push({ x: rx, z: rz, biome: 'grassland' } as any);
    }
  }

  // Set up 4-5 herds
  const herdTypes = ['PrismHornAntelope', 'TuskedShagBeast', 'SiltCamel', 'AncientDomeBack', 'FrilledShieldHorn', 'Deer', 'Elk', 'Sheep'];
  herdTypes.forEach((type, hIdx) => {
    const randomLand = landCells[Math.floor(Math.random() * landCells.length)];
    if (randomLand) {
      const herdId = `herd_${type}_${hIdx}`;
      const herdSize = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < herdSize; i++) {
        const ax = Math.max(1, Math.min(size - 2, randomLand.x + Math.floor(Math.random() * 5) - 2));
        const az = Math.max(1, Math.min(size - 2, randomLand.z + Math.floor(Math.random() * 5) - 2));
        const c = getCellAt(mapData, ax, az);
        if (c && c.biome !== 'water' && !c.structure) {
          const isBaby = i === herdSize - 1;
          const ani = createAnimal(type, ax, az, isBaby);
          ani.herdId = herdId;
          ani.isHerdLeader = i === 0;
          list.push(ani);
        } else {
          const ani = createAnimal(type, randomLand.x, randomLand.z, i === herdSize - 1);
          ani.herdId = herdId;
          ani.isHerdLeader = i === 0;
          list.push(ani);
        }
      }
    }
  });

  // Spawn predators, grazers, and scavengers on land
  const soloTypes = ['ProwlerJackal', 'ChitinSlasher', 'SpinedSaberWolf', 'VelociSkitterer', 'ScytheBeakStrider', 'GaleWingFlier', 'StormVulture', 'PlateBackShellgrazer', 'SiltBadger', 'CarapaceScarab', 'Fox', 'Wolf', 'Rabbit', 'JackLeaper'];
  for (let s = 0; s < 8; s++) {
    const type = soloTypes[Math.floor(Math.random() * soloTypes.length)];
    const randomLand = landCells[Math.floor(Math.random() * landCells.length)];
    if (randomLand) {
      list.push(createAnimal(type, randomLand.x, randomLand.z, false));
    }
  }

  // Spawn 3-5 dangerous stationary Carnivorous SporeSpitterPlants across the map!
  const plantCount = 3 + Math.floor(Math.random() * 3);
  for (let p = 0; p < plantCount; p++) {
    const randomLand = landCells[Math.floor(Math.random() * landCells.length)];
    if (randomLand) {
      list.push(createAnimal('SporeSpitterPlant', randomLand.x, randomLand.z, false));
    }
  }

  // Spawn active wild fish in lake water cells
  if (waterCells.length > 0) {
    const numFish = Math.min(waterCells.length, 6 + Math.floor(Math.random() * 3));
    for (let f = 0; f < numFish; f++) {
      const cell = waterCells[Math.floor(Math.random() * waterCells.length)];
      list.push(createAnimal('AureliaFish', cell.x, cell.z, false));
    }
  }

  mapData.animals = list;
  syncAnimalsToGrid(mapData);
}

// Synchronizes animals back to individual grid cells as a fallback mechanism for watchtowers / older systems
export function syncAnimalsToGrid(mapData: MapData) {
  const size = getMapSize(mapData);

  // Clear old references safely across all loaded cells
  const allCells = getAllLoadedCells(mapData);
  for (let i = 0; i < allCells.length; i++) {
    if (allCells[i]) {
      allCells[i].wildAnimal = null;
    }
  }

  // Populate living or dead carcasses references on cells
  const list = mapData.animals || [];
  list.forEach((ani) => {
    const rx = Math.max(0, Math.min(size - 1, Math.round(ani.x)));
    const rz = Math.max(0, Math.min(size - 1, Math.round(ani.z)));
    const cell = getCellAt(mapData, rx, rz);
    if (cell) {
      cell.wildAnimal = {
        id: ani.id,
        type: ani.type,
        HP: ani.HP,
        maxHP: ani.maxHP,
        isDead: ani.isDead,
        isHarvested: ani.isHarvested,
        gender: ani.gender,
        agePhase: ani.agePhase,
        isTame: ani.isTame,
        trustLevel: ani.trustLevel,
        tameLevel: ani.tameLevel,
        tameGenerations: ani.captiveBorn ? 1 : 0
      };
    }
  });
}

// Detect if cell is an enclosed area built by LogWalls (pen validation)
export function checkIsWithinPen(mapData: MapData, x: number, z: number): boolean {
  const size = getMapSize(mapData);
  // Basic flood lookup: check if surrounded on 4 cardinal directions within 5 blocks by a LogWall or map perimeter
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  let wallCount = 0;

  dirs.forEach(([dx, dz]) => {
    for (let step = 1; step <= 5; step++) {
      const nx = x + dx * step;
      const nz = z + dz * step;
      if (nx < 0 || nx >= size || nz < 0 || nz >= size) {
        wallCount++; // Map bounds act as wall enclosure
        break;
      }
      const cell = getCellAt(mapData, nx, nz);
      if (cell && (cell.structure?.type === 'LogWall' || cell.construction?.type === 'LogWall')) {
        wallCount++;
        break;
      }
    }
  });

  return wallCount >= 3; // Enclosed on at least 3 sides!
}

// MAIN ECOSYSTEM TICK LOOP
export function tickEcosystemSimulation(
  mapData: MapData, 
  deltaTime: number,
  tribe: Tribesperson[],
  addLog: (text: string, type?: 'info' | 'warning' | 'level' | 'success' | 'combat') => void
) {
  if (!mapData.animals) {
    mapData.animals = [];
  }

  const size = getMapSize(mapData);
  const animals = mapData.animals;
  const eyeX = mapData.eyePos?.x ?? (size / 2);
  const eyeZ = mapData.eyePos?.z ?? (size / 2);
  const eyeRadius = mapData.eyeRadius ?? 14.0;

  // Track predator coordinates for herbivore threat detection
  const predatorsPos = animals
    .filter(a => !a.isDead && (a.category === 'SmallPredator' || a.category === 'ApexPredator'))
    .map(p => ({ x: p.x, z: p.z, id: p.id, category: p.category }));

  // Track hunter coordinates
  const huntersPos = tribe
    .filter(t => t.isAlive && (t.role === 'Hunter' || t.activeJobType === 'Hunt'))
    .map(h => ({ x: h.x, z: h.z, name: h.name, id: h.id }));

  const activeCorpses = animals.filter(a => a.isDead && !a.isHarvested);

  // Maintain population densities naturally! If animal count is below 22, periodically spawn new animals or small packs migrating onto the map
  const activeAnimalsCount = animals.filter(a => !a.isDead).length;
  if (activeAnimalsCount < 22) {
    // Spawning chance scaled by how empty the map is
    const spawnChance = (22 - activeAnimalsCount) * 0.06 * deltaTime;
    if (Math.random() < spawnChance) {
      const herdTypes = ['PrismHornAntelope', 'TuskedShagBeast', 'SiltCamel', 'AncientDomeBack', 'ProwlerJackal', 'ChitinSlasher', 'SpinedSaberWolf', 'StormVulture', 'PlateBackShellgrazer', 'SiltBadger', 'CarapaceScarab', 'Rabbit', 'Deer', 'Elk', 'Fox'];
      const selectedType = herdTypes[Math.floor(Math.random() * herdTypes.length)];
      
      // Spawn migrating animal packs near active eye area within map bounds
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = eyeRadius + 4.0 + Math.random() * 8.0;
      const rx = Math.max(2, Math.min(size - 3, Math.floor(eyeX + Math.cos(angle) * spawnDist)));
      const rz = Math.max(2, Math.min(size - 3, Math.floor(eyeZ + Math.sin(angle) * spawnDist)));

      const cell = getCellAt(mapData, rx, rz);
      if (cell && !cell.structure && cell.biome !== 'water') {
        // Spawn a small group (1-3) of migrating animals of this type!
        const groupSize = Math.random() < 0.5 ? 1 : Math.floor(Math.random() * 2) + 2;
        const herdId = `migrating_${selectedType}_${Date.now().toString().slice(-4)}`;
        for (let g = 0; g < groupSize; g++) {
          const gx = Math.max(2, Math.min(size - 3, rx + Math.floor(Math.random() * 3) - 1));
          const gz = Math.max(2, Math.min(size - 3, rz + Math.floor(Math.random() * 3) - 1));
          const targetCell = getCellAt(mapData, gx, gz);
          if (targetCell && targetCell.biome !== 'water' && !targetCell.structure) {
            const baby = Math.random() > 0.85;
            const newAnimal = createAnimal(selectedType, gx, gz, baby);
            newAnimal.herdId = herdId;
            animals.push(newAnimal);
          }
        }
        addLog(`🌸 Ecosystem: A small pack of wild ${selectedType} has migrated onto our map lands!`, 'success');
      }
    }
  }

  // Loop animals and process behavior trees
  const survivingAnimals: Animal[] = [];
  for (let idx = 0; idx < animals.length; idx++) {
    const ani = animals[idx];
    if (ani.isDead) {
      ani.decayTimer = (ani.decayTimer ?? 0) + deltaTime;
      if (ani.decayTimer < 2.5) {
        survivingAnimals.push(ani);
      }
      continue;
    }
    survivingAnimals.push(ani);

    if (ani.type === 'SporeSpitterPlant') {
      // Rooted Carnivorous Plant Behavior
      ani.hunger = 0;
      ani.thirst = 0;
      ani.stress = 0;
      ani.fear = 0;
      ani.energy = 100;

      let plantTickTimer = ani.aiTickTimer ?? (Math.random() * 0.6);
      plantTickTimer -= deltaTime;
      let pTimerFired = false;
      if (plantTickTimer <= 0) {
        pTimerFired = true;
        plantTickTimer = 0.3 + Math.random() * 0.3;
      }
      ani.aiTickTimer = plantTickTimer;
      
      // Target scanning
      if (pTimerFired) {
        let nearestTarget: { name: string; x: number; z: number; takeDamage: (dmg: number) => void } | null = null;
        let closestD = 4.0 ** 2; // 4 tile range
        
        // Scan villagers
        tribe.forEach(t => {
          if (!t.isAlive) return;
          const d = (ani.x - t.x) ** 2 + (ani.z - t.z) ** 2;
          if (d < closestD) {
            closestD = d;
            nearestTarget = {
              name: t.name,
              x: t.x,
              z: t.z,
              takeDamage: (dmg) => {
                t.stats.health = Math.max(10, t.stats.health - dmg);
                t.statusText = `🤢 Melting from Toxic Plant Spores!`;
              }
            };
          }
        });
        
        // Scan other non-plant animals
        animals.forEach(other => {
          if (other.isDead || other.type === 'SporeSpitterPlant') return;
          const d = (ani.x - other.x) ** 2 + (ani.z - other.z) ** 2;
          if (d < closestD) {
            closestD = d;
            nearestTarget = {
              name: `wild ${other.type}`,
              x: other.x,
              z: other.z,
              takeDamage: (dmg) => {
                other.HP -= dmg * 1.5;
                other.fear = 100;
                if (other.HP <= 0) {
                  other.isDead = true;
                  addLog(`💀 Carnivorous Plant: A rooted SporeSpitterPlant at [${Math.round(ani.x)}, ${Math.round(ani.z)}] has digested a ${other.type}!`, 'combat');
                }
              }
            };
          }
        });
        
        if (nearestTarget) {
          (ani as any).plantTarget = { x: (nearestTarget as any).x, z: (nearestTarget as any).z };
          const dmgAmount = 14 * deltaTime;
          (nearestTarget as any).takeDamage(dmgAmount);
          
          if (Math.random() < 0.1) {
            addLog(`🌵 VEGETATIVE ATTACK: A dangerous rooted Spore-Spitter Plant at [${Math.round(ani.x)}, ${Math.round(ani.z)}] is spraying corrosive spores at ${(nearestTarget as any).name}!`, 'combat');
          }
        } else {
          (ani as any).plantTarget = null;
        }
      }
      
      ani.targetX = ani.x;
      ani.targetZ = ani.z;
      continue;
    }

    if (ani.isLeashed) {
      ani.targetX = ani.x;
      ani.targetZ = ani.z;
      ani.isSleeping = false;
      ani.fear = 0;
      ani.stress = 0;
      continue;
    }

    // Fast Eye-of-storm bounds check for AI abstract mode
    const center = { x: size / 2, z: size / 2 };
    const eyeX = mapData.eyePos?.x ?? center.x;
    const eyeZ = mapData.eyePos?.z ?? center.z;
    const eyeRadius = mapData.eyeRadius ?? 14.0;
    const eyeRadiusSq = eyeRadius * eyeRadius;

    const eyeDx = ani.x - eyeX;
    const eyeDz = ani.z - eyeZ;
    const isInsideEye = (eyeDx * eyeDx + eyeDz * eyeDz) <= eyeRadiusSq;

    if (!isInsideEye) {
      ani.isSleeping = false; // Cannot sleep in a toxic storm!
      
      // Calculate or re-evaluate target towards safety using a fast scheduler timer
      let aiTickTimer = ani.aiTickTimer ?? (Math.random() * 0.6);
      aiTickTimer -= deltaTime;
      let timerFired = false;
      if (aiTickTimer <= 0) {
        timerFired = true;
        aiTickTimer = 0.3 + Math.random() * 0.3;
      }
      ani.aiTickTimer = aiTickTimer;

      if (timerFired || Math.abs(ani.x - ani.targetX) < 0.2) {
        ani.targetX = eyeX + (Math.random() - 0.5) * 6;
        ani.targetZ = eyeZ + (Math.random() - 0.5) * 6;
      }

      // Ensure target coordinates match the species terrain rules
      const validTarget = getValidAnimalTarget(ani, ani.targetX, ani.targetZ, mapData);
      ani.targetX = validTarget.x;
      ani.targetZ = validTarget.z;

      // Move animal towards Safe Zone
      const moveSpeed = SPECIES_DB[ani.type]?.speed || 1.0;
      const finalSpeed = moveSpeed * 1.85 * deltaTime * 3.5 * 1.5;
      const adx = ani.targetX - ani.x;
      const adz = ani.targetZ - ani.z;
      const adSq = adx * adx + adz * adz;

      if (adSq > 0.05) {
        const dist = Math.sqrt(adSq);
        ani.x += (adx / dist) * Math.min(dist, finalSpeed);
        ani.z += (adz / dist) * Math.min(dist, finalSpeed);
      }
      continue; // Bypass the entire complex AI behavior tree!
    }

    // Age progression (extremely slow)
    ani.ageDays += 0.01 * deltaTime;
    if (ani.agePhase === 'Baby' && ani.ageDays > 3.0) {
      ani.agePhase = 'Adult';
      // Recalculate yields for full scale adult
      const conf = SPECIES_DB[ani.type] || SPECIES_DB.Deer;
      ani.meatAmount = conf.yields.meat;
      ani.hideAmount = conf.yields.hide;
      ani.boneAmount = conf.yields.bones;
      ani.fatAmount = conf.yields.fat;
      ani.rareSpecimenAmount = conf.yields.rare;
      ani.HP = conf.maxHP;
      addLog(`✨ Ecosystem News: A baby ${ani.type} has matured into a full-grown Adult!`, 'info');
    }

    // Check captive enclosure pen status
    const currentOnCellX = Math.round(ani.x);
    const currentOnCellZ = Math.round(ani.z);

    // Staggered AI decision tree timer
    let aiTickTimer = ani.aiTickTimer ?? (Math.random() * 0.6);
    aiTickTimer -= deltaTime;
    let timerFired = false;
    if (aiTickTimer <= 0) {
      timerFired = true;
      aiTickTimer = 0.3 + Math.random() * 0.3; // 0.3 to 0.6s intervals
    }
    ani.aiTickTimer = aiTickTimer;

    let inPen = (ani as any).cachedInPen ?? false;
    if (timerFired) {
      inPen = checkIsWithinPen(mapData, currentOnCellX, currentOnCellZ);
      (ani as any).cachedInPen = inPen;
    }

    // Graze on Fiber nodes if present on current cell
    const cell = mapData.grid[currentOnCellX]?.[currentOnCellZ];
    if (cell && cell.resourceNode?.type === 'Fiber' && cell.resourceNode.amount > 0) {
      if (ani.category === 'Herbivore') {
        const maxEaten = 3.5 * deltaTime;
        const eaten = Math.min(cell.resourceNode.amount, maxEaten);
        cell.resourceNode.amount = Math.max(0, cell.resourceNode.amount - eaten);
        ani.hunger = Math.max(0, ani.hunger - eaten * 15);
        ani.thirst = Math.max(0, ani.thirst - eaten * 8);

        if (Math.random() < 0.05 * deltaTime) {
          addLog(`🐏 Grazer Alert: ${ani.isTame ? 'Tame' : 'Wild'} ${ani.type} is grazing on sweet fiber grass at [${currentOnCellX}, ${currentOnCellZ}]!`, 'info');
        }
      }
    }

    if (ani.isTame) {
      // Tame animal jobs and upkeep
      ani.hunger = Math.min(100, ani.hunger + 1.2 * deltaTime);
      ani.thirst = Math.min(100, ani.thirst + 1.5 * deltaTime);

      // Seek food from stockpile or flat grassland grass
      if (ani.hunger > 35) {
        // Tame animal eats grass in village or we consume 1 grain/feed from Stockpile
        if (mapData.stockpile.food > 50) {
          mapData.stockpile.food = Math.max(0, mapData.stockpile.food - 0.1 * deltaTime);
          ani.hunger = Math.max(0, ani.hunger - 35);
        } else {
          ani.hunger = Math.max(0, ani.hunger - 15); // Graze on pen weeds
        }
      }
      if (ani.thirst > 40) {
        ani.thirst = 0; // drinks near well/wells
      }

      // Milk production for Cattle
      if (ani.type === 'Cattle' && ani.gender === 'Female' && Math.random() < 0.01 * deltaTime) {
        mapData.stockpile.reservoirWater = (mapData.stockpile.reservoirWater || 0) + 5; // Yields milk represented as liquid moisture
        // Restores some general food
        mapData.stockpile.food = Math.round((mapData.stockpile.food + 2.5) * 10) / 10;
        addLog(`🥛 Milking: Tame Cattle produced raw milk (+2.5 Food, +5 Liquid Well reserves)!`, 'success');
      }

      // Suckle and trust decay
      ani.trustLevel = Math.min(100, ani.trustLevel + 1 * deltaTime);
    } else {
      // Wild animals update natural attributes
      ani.hunger = Math.min(100, ani.hunger + 1.5 * deltaTime);
      ani.thirst = Math.min(100, ani.thirst + 1.8 * deltaTime);
      ani.stress = Math.max(0, ani.stress - 3 * deltaTime);
      ani.fear = Math.max(0, ani.fear - 4 * deltaTime);

      if (inPen) {
        // Being in an enclosure surrounded by walls increases trust level daily!
        ani.trustLevel = Math.min(100, ani.trustLevel + 5.0 * deltaTime);
        if (ani.trustLevel >= 100 && ani.tameLevel < 100) {
          ani.tameLevel = Math.min(100, ani.tameLevel + 12.0 * deltaTime);
          if (ani.tameLevel >= 100) {
            ani.isTame = true;
            addLog(`🐏 Domestication Success! A wild, captive ${ani.type} has fully adapted to village life and can now perform tasks!`, 'success');
          }
        }
      } else {
        // trust decays outside pens
        ani.trustLevel = Math.max(0, ani.trustLevel - 2 * deltaTime);
      }
    }

    // --- DECISION TREE AI RULES ---

    // 1. SLEEPING STATE
    if (ani.isSleeping) {
      ani.energy = Math.min(100, ani.energy + 10 * deltaTime);
      if (ani.energy >= 95) {
        ani.isSleeping = false;
      }
      continue; // Skip movement/seeking during sleep
    }

    if (ani.energy < 15 && Math.random() < 0.05 * deltaTime) {
      ani.isSleeping = true;
      continue;
    }

    // 2. FEAR & FLEEING REACTIONS
    let isScared = (ani as any).cachedIsScared ?? false;
    let fearSourceX = (ani as any).cachedFearSourceX ?? 0;
    let fearSourceZ = (ani as any).cachedFearSourceZ ?? 0;

    if (timerFired) {
      isScared = false;
      // Detect nearby predators (Herbivores flee from small/apex predators)
      if (ani.category === 'Herbivore' || ani.type === 'Fox') {
        const threatRange = ani.type === 'Rabbit' ? 3.5 : 4.5;
        const nearPredator = predatorsPos.find(p => {
          // Fox does not fear foxes, but fear giants
          if (ani.type === 'Fox' && p.category === 'SmallPredator') return false;
          const d = (ani.x - p.x) ** 2 + (ani.z - p.z) ** 2;
          return d < threatRange ** 2;
        });

        if (nearPredator) {
          fearSourceX = nearPredator.x;
          fearSourceZ = nearPredator.z;
          isScared = true;
          ani.fear = Math.min(100, ani.fear + 45 * deltaTime);
        }
      }

      // Detect nearby villagers (flee from any villager unless they are a Beast Friend)
      const nearVillager = tribe.find(v => {
        if (!v.isAlive) return false;
        // Do not flee from "Beast Friend"
        if (v.traits.includes('Beast Friend')) return false;
        const d = (ani.x - v.x) ** 2 + (ani.z - v.z) ** 2;
        return d < (4.5) ** 2;
      });

      if (nearVillager && !ani.isTame) {
        fearSourceX = nearVillager.x;
        fearSourceZ = nearVillager.z;
        isScared = true;
        ani.fear = Math.min(100, ani.fear + 50 * deltaTime);
      }

      (ani as any).cachedIsScared = isScared;
      (ani as any).cachedFearSourceX = fearSourceX;
      (ani as any).cachedFearSourceZ = fearSourceZ;
    }

    // If scared, flee immediately! Run fast in the opposite direction!
    if (isScared && (ani.x !== ani.targetX || Math.random() < 0.65 * deltaTime)) {
      const fleeDx = ani.x - fearSourceX;
      const fleeDz = ani.z - fearSourceZ;
      const len = Math.max(0.1, Math.sqrt(fleeDx * fleeDx + fleeDz * fleeDz));
      
      // Calculate flee coordinate 3 blocks away
      const fx = Math.max(1, Math.min(size - 2, Math.round(ani.x + (fleeDx / len) * 3.2)));
      const fz = Math.max(1, Math.min(size - 2, Math.round(ani.z + (fleeDz / len) * 3.2)));
      
      ani.targetX = fx;
      ani.targetZ = fz;
      ani.energy = Math.max(5, ani.energy - 3.5 * deltaTime);
      
      // Alert nearby herd members if herded! High alertness contagion
      if (ani.herdId && timerFired) {
        animals.forEach(other => {
          if (other.herdId === ani.herdId && !other.isDead) {
            other.fear = Math.min(100, other.fear + 30 * deltaTime);
            if (other.targetX === other.x || Math.random() < 0.45) {
              other.targetX = fx + (Math.random() * 2 - 1);
              other.targetZ = fz + (Math.random() * 2 - 1);
            }
          }
        });
      }
    }

    // 3. REPRODUCTION & MATING SEASON
    if (ani.category === 'Herbivore' && !ani.isDead && ani.agePhase === 'Adult' && !isScared) {
      if (ani.gender === 'Female' && !ani.isPregnant && ani.hunger < 85 && ani.thirst < 85 && timerFired) {
        // Scan for compatible male nearby - increased radius to 10.0 blocks for reliable natural breeding
        const partner = animals.find(m => 
          m.type === ani.type && 
          m.gender === 'Male' && 
          m.agePhase === 'Adult' && 
          !m.isDead &&
          Math.abs(m.x - ani.x) < 10.0 &&
          Math.abs(m.z - ani.z) < 10.0
        );

        if (partner && Math.random() < 0.15) {
          ani.isPregnant = true;
          ani.gestationTimer = 0;
          addLog(`🌸 Reproduction: A female ${ani.type} has begun a gestation cycle!`, 'success');
        }
      }

      if (ani.isPregnant) {
        ani.gestationTimer += 0.22 * deltaTime; // gestation matures in about 4-5 ticks/days
        if (ani.gestationTimer >= 1.0) {
          ani.isPregnant = false;
          ani.gestationTimer = 0;
          // Spawn baby
          const bx = Math.round(ani.x + (Math.random() * 2 - 1));
          const bz = Math.round(ani.z + (Math.random() * 2 - 1));
          const nx = Math.max(0, Math.min(size - 1, bx));
          const nz = Math.max(0, Math.min(size - 1, bz));
          const validBabyPos = getValidAnimalTarget(ani, nx, nz, mapData);
          const baby = createAnimal(ani.type, validBabyPos.x, validBabyPos.z, true, ani.isTame || inPen);
          if (ani.herdId) baby.herdId = ani.herdId;
          animals.push(baby);
          addLog(`🍼 Rare Event: A cute new Baby ${ani.type} was born into the ecosystem!`, 'success');
        }
      }
    }

    // 4. PREDATORS SEEKING TARGETS IN THE FOOD CHAIN
    if ((ani.category === 'SmallPredator' || ani.category === 'ApexPredator') && !isScared) {
      // Predators hunt herbivores
      if (ani.hunger > 25 && timerFired) {
        // Find best target (prefer babies and healthy adults over hunters)
        let bestTarget: Animal | null = null;
        let closestDist = 9999;

        animals.forEach(other => {
          if (other.isDead || other.isHarvested) return;
          if (other.category !== 'Herbivore' && other.type !== 'Rabbit') return; // Only hunt passive things
          
          const d = (ani.x - other.x) ** 2 + (ani.z - other.z) ** 2;
          if (d < (8.0) ** 2 && d < closestDist) {
            closestDist = d;
            bestTarget = other;
          }
        });

        // Hunt humans/villagers if Apex Predator and starving!
        let targetVillager: Tribesperson | null = null;
        if (ani.category === 'ApexPredator' && ani.hunger > 50) {
          tribe.forEach(t => {
            if (!t.isAlive) return;
            const d = (ani.x - t.x) ** 2 + (ani.z - t.z) ** 2;
            if (d < (6.0) ** 2) {
              targetVillager = t;
            }
          });
        }

        if (targetVillager && Math.random() < 0.4) {
          // Hunt villager! Flee response activated for villager
          const v: Tribesperson = targetVillager;
          ani.targetX = v.x;
          ani.targetZ = v.z;
          (ani as any).cachedHuntTargetType = 'villager';
          (ani as any).cachedHuntTargetId = v.id;
        } else if (bestTarget) {
          const tar: Animal = bestTarget;
          ani.targetX = tar.x;
          ani.targetZ = tar.z;
          (ani as any).cachedHuntTargetType = 'animal';
          (ani as any).cachedHuntTargetId = tar.id;
        } else {
          (ani as any).cachedHuntTargetType = null;
          (ani as any).cachedHuntTargetId = null;
        }
      }

      // Execute attack if already tracking target (cheap per frame)
      if (ani.hunger > 25) {
        const hType = (ani as any).cachedHuntTargetType;
        const hId = (ani as any).cachedHuntTargetId;
        if (hType === 'villager') {
          const v = tribe.find(t => t.id === hId && t.isAlive);
          if (v) {
            const dToV = (ani.x - v.x) ** 2 + (ani.z - v.z) ** 2;
            if (dToV < 1.2 && Math.random() < 0.6 * deltaTime) {
              v.stats.health = Math.max(10, v.stats.health - 25 * deltaTime);
              v.statusText = `😱 Scream! Aggressed by feral ${ani.type}!`;
              addLog(`⚠️ Terror Attack: A vicious wild ${ani.type} is actively biting ${v.name}! Needs immediate hunter backup!`, 'combat');
              
              const nearbyDefenders = tribe.filter(t => t.isAlive && t.role === 'Hunter' && (t.x - v.x) ** 2 + (t.z - v.z) ** 2 < 12 ** 2);
              nearbyDefenders.forEach(def => {
                if (def.activeJobType !== 'Hunt') {
                  def.activeJobType = 'Hunt';
                  def.jobTargetCoords = { x: Math.round(ani.x), z: Math.round(ani.z) };
                  def.statusText = `🏹 Defender: Running to intercept feral ${ani.type}!`;
                }
              });
            }
          }
        } else if (hType === 'animal') {
          const tar = animals.find(a => a.id === hId && !a.isDead);
          if (tar) {
            const dToT = (ani.x - tar.x) ** 2 + (ani.z - tar.z) ** 2;
            if (dToT < 1.1) {
              tar.HP -= 35 * deltaTime;
              tar.fear = 100;
              if (tar.HP <= 0) {
                tar.isDead = true;
                (tar as any).killedByPredator = true;
                ani.hunger = Math.max(0, ani.hunger - 60);
                addLog(`🐾 Food Chain: A wild ${ani.type} struck and devoured a ${tar.type}!`, 'combat');
                (ani as any).cachedHuntTargetType = null;
                (ani as any).cachedHuntTargetId = null;
              }
            }
          }
        }
      }
    }

    // 5. SCAVENGERS SEEKING CORPSES
    if (ani.category === 'Scavenger' && !isScared) {
      if (activeCorpses.length > 0) {
        if (timerFired) {
          let closestCorp: Animal | null = null;
          let dMin = 9999;
          activeCorpses.forEach(corp => {
            const d = (ani.x - corp.x) ** 2 + (ani.z - corp.z) ** 2;
            if (d < dMin) {
              dMin = d;
              closestCorp = corp;
            }
          });

          if (closestCorp) {
            const cp: Animal = closestCorp;
            ani.targetX = cp.x;
            ani.targetZ = cp.z;
            (ani as any).cachedScavengeTargetId = cp.id;
          } else {
            (ani as any).cachedScavengeTargetId = null;
          }
        }

        const scavId = (ani as any).cachedScavengeTargetId;
        if (scavId) {
          const cp = activeCorpses.find(c => c.id === scavId);
          if (cp) {
            const distToCorp = (ani.x - cp.x) ** 2 + (ani.z - cp.z) ** 2;
            if (distToCorp < 1.0) {
              cp.meatAmount = Math.max(0, cp.meatAmount - 8 * deltaTime);
              cp.hideAmount = Math.max(0, cp.hideAmount - 3 * deltaTime);
              if (cp.meatAmount <= 0) {
                cp.isHarvested = true;
                addLog(`🦅 Scavengers: Vultures/Crows have picked the ${cp.type} carcass clean of leftovers.`, 'info');
                (ani as any).cachedScavengeTargetId = null;
              }
            }
          }
        }
      }
    }

    // 6. GENTLE HERDING & WANDERING BEHAVIOR
    const alreadyMoving = Math.abs(ani.x - ani.targetX) > 0.1 || Math.abs(ani.z - ani.targetZ) > 0.1;
    if (!alreadyMoving && timerFired && Math.random() < 0.35) {
      // If we are a herd follower, let's seek or herd close to our leader!
      if (ani.herdId && !ani.isHerdLeader) {
        const leader = animals.find(other => other.herdId === ani.herdId && other.isHerdLeader && !other.isDead);
        if (leader) {
          const offsetDist = (ani.x - leader.x) ** 2 + (ani.z - leader.z) ** 2;
          if (offsetDist > (2.5) ** 2) {
            ani.targetX = Math.round(leader.x + (Math.random() * 2 - 1));
            ani.targetZ = Math.round(leader.z + (Math.random() * 2 - 1));
            continue;
          }
        }
      }

      // Default random local wander based on species bounds
      const roamRadius = ani.type === 'Rabbit' ? 1.5 : 2.5;
      
      // If outside the Eye of the Storm, bias movement towards the safe zone center
      const dxToEye = eyeX - ani.x;
      const dzToEye = eyeZ - ani.z;
      const distToEye = Math.sqrt(dxToEye * dxToEye + dzToEye * dzToEye);
      
      let biasX = 0;
      let biasZ = 0;
      if (distToEye > eyeRadius) {
        // High bias to walk towards safe zone!
        biasX = (dxToEye / distToEye) * roamRadius * 0.75;
        biasZ = (dzToEye / distToEye) * roamRadius * 0.75;
      }
      
      const rx = Math.max(1, Math.min(size - 2, Math.round(ani.x + biasX + (Math.random() * roamRadius * 2 - roamRadius))));
      const rz = Math.max(1, Math.min(size - 2, Math.round(ani.z + biasZ + (Math.random() * roamRadius * 2 - roamRadius))));
      
      const isFish = ani.type === 'Fish' || ani.type === 'AureliaFish';
      const testCell = getCellAt(mapData, rx, rz);
      if (testCell && (isFish ? testCell.biome === 'water' : testCell.biome !== 'water' && !testCell.structure)) {
        ani.targetX = rx;
        ani.targetZ = rz;
      }
    }

    // Ensure target coordinates match the species locomotion terrain rules
    const validTarget = getValidAnimalTarget(ani, ani.targetX, ani.targetZ, mapData);
    ani.targetX = validTarget.x;
    ani.targetZ = validTarget.z;

    // Apply continuous spatial coordinate movement towards target coordinates
    const moveSpeed = SPECIES_DB[ani.type]?.speed || 1.0;
    const speedScalar = isScared ? 1.85 : 1.0;
    const finalSpeed = moveSpeed * speedScalar * deltaTime * 3.5 * 1.5; // Increased by 50% as requested

    const dx = ani.targetX - ani.x;
    const dz = ani.targetZ - ani.z;
    const dSq = dx * dx + dz * dz;

    if (dSq > 0.05) {
      const dist = Math.sqrt(dSq);
      const nextX = ani.x + (dx / dist) * Math.min(dist, finalSpeed);
      const nextZ = ani.z + (dz / dist) * Math.min(dist, finalSpeed);
      
      const ncx = Math.max(0, Math.min(size - 1, Math.round(nextX)));
      const ncz = Math.max(0, Math.min(size - 1, Math.round(nextZ)));
      
      const isFish = ani.type === 'Fish' || ani.type === 'AureliaFish';
      const stepCell = getCellAt(mapData, ncx, ncz);
      
      if (isFish) {
        if (stepCell && stepCell.biome === 'water') {
          ani.x = nextX;
          ani.z = nextZ;
        } else {
          // Fish cannot move to land, cancel movement step and select new aquatic coordinate
          ani.targetX = Math.round(ani.x);
          ani.targetZ = Math.round(ani.z);
        }
      } else {
        if (stepCell && stepCell.biome !== 'water') {
          ani.x = nextX;
          ani.z = nextZ;
        } else {
          // Land animals cannot move to water, stop immediately and seek dry coordinates
          ani.targetX = Math.round(ani.x);
          ani.targetZ = Math.round(ani.z);
        }
      }
      
      // Update discrete altitude matching threeJS grid levels
      const cx = Math.max(0, Math.min(size - 1, Math.round(ani.x)));
      const cz = Math.max(0, Math.min(size - 1, Math.round(ani.z)));
      const onCell = getCellAt(mapData, cx, cz);
      ani.y = onCell?.height || 1.0;
    } else {
      ani.x = ani.targetX;
      ani.z = ani.targetZ;
    }
  }

  mapData.animals = survivingAnimals;

  // Final synchronization back to cellular grid for rendering fallback compatibility
  syncAnimalsToGrid(mapData);
}

// Function checking if a hunter is hunting or tracking an animal
export function setHuntTarget(agent: Tribesperson, animalId: string) {
  (agent as any).assignedHuntAnimalId = animalId;
  agent.activeJobType = 'Hunt';
  (agent as any).huntSubJob = 'hunt';
}
