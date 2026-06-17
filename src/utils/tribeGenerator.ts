import { Tribesperson, TribespersonRole, TribespersonTrait, SkillProgress, MapData, JobCategory, JobPriority, CodexEvent } from '../types';
import { tickEcosystemSimulation, populateInitialMapAnimals, checkIsWithinPen, createAnimal } from './ecosystemEngine';

const PRIMITIVE_PREFIXES = ['O', 'A', 'Kra', 'Tor', 'Gla', 'Bro', 'Ula', 'Yor', 'Zal', 'Mao', 'Nu', 'Sha', 'Vek', 'Bax', 'Hul', 'Jin', 'Kael', 'Rox', 'Ther', 'Grom'];
const PRIMITIVE_SUFFIXES = ['g', 'na', 'k', 'thor', 'm', 'ron', 'la', 'ra', 'zin', 'ya', 'dak', 'sha', 'vex', 'tar', 'don', 'kis', 'lor', 'gan', 'bor', 'tis'];

export function generateRandomName(gender: 'Male' | 'Female'): string {
  const pre = PRIMITIVE_PREFIXES[Math.floor(Math.random() * PRIMITIVE_PREFIXES.length)];
  const suf = PRIMITIVE_SUFFIXES[Math.floor(Math.random() * PRIMITIVE_SUFFIXES.length)];
  const rawName = pre + suf;
  return rawName.charAt(0).toUpperCase() + rawName.slice(1);
}

export const ROLES: TribespersonRole[] = ['Gatherer', 'Hunter', 'Farmer', 'Builder', 'Scout', 'Healer', 'Artisan', 'Oracle'];
const TRAITS: TribespersonTrait[] = ['Tireless', 'Green Thumb', 'Path Finder', 'Beast Friend', 'Iron Stomach'];

export const ROLE_COLORS: Record<TribespersonRole, string> = {
  Gatherer: '#e29578', // Peach/Orange
  Hunter: '#e63946',   // Bold Red
  Farmer: '#4ecdc4',   // Teal
  Builder: '#ffb703',  // Bright Golden Yellow
  Scout: '#a8dadc',    // Sky Cyan
  Healer: '#ff006e',   // Vibrant Magenta
  Artisan: '#ff70a6',  // Vivid Pink
  Oracle: '#a855f7',   // Royal violet for the Oracle role
};

export function hasStructureInVillage(mapData: any, type: string): boolean {
  if (!mapData || !mapData.grid) return false;
  for (let r = 0; r < mapData.grid.length; r++) {
    const row = mapData.grid[r];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell.structure && cell.structure.type === type && !cell.structure.dismantling) {
        return true;
      }
    }
  }
  return false;
}

export function getXPRequirement(level: number): number {
  const XP_REQUIREMENTS = [100, 150, 220, 320, 450, 620, 850, 1150, 1550, 2100];
  if (level < 1) return 100;
  if (level > 10) return 999999;
  return XP_REQUIREMENTS[level - 1];
}

export function awardSkillXP(
  agent: Tribesperson,
  skillName: TribespersonRole,
  rawAmount: number,
  mapData: any,
  addLog: (text: string, type: 'info' | 'warning' | 'death' | 'level') => void,
  isApprenticeBoost: boolean = false
) {
  if (!agent.skills) return;
  const sk = agent.skills[skillName];
  if (!sk) return;

  if (sk.level >= 10) {
    sk.level = 10;
    sk.xp = 0;
    sk.xpToNextLevel = getXPRequirement(10);
    return;
  }

  // Intelligence scaling (Default = 5, ranges from 4 to 12)
  const intStat = agent.attributes?.intelligence ?? 5;
  const intMult = Math.max(0.2, 1.0 + (intStat - 5) * 0.12);

  // Farming and gathering gain experienced 1.5x faster
  const classMult = (skillName === 'Farmer' || skillName === 'Gatherer') ? 1.5 : 1.0;

  // Central factor to balance life-long progression
  const scaleFactor = 0.0018;

  const apprenticeMult = isApprenticeBoost ? 1.5 : 1.0;
  const xpEarned = rawAmount * intMult * classMult * scaleFactor * apprenticeMult;
  sk.xp += xpEarned;

  // Sync requirements
  sk.xpToNextLevel = getXPRequirement(sk.level);

  if (sk.xp >= sk.xpToNextLevel) {
    while (sk.xp >= sk.xpToNextLevel && sk.level < 10) {
      sk.xp -= sk.xpToNextLevel;
      sk.level++;
      sk.xpToNextLevel = getXPRequirement(sk.level);
    }
    if (sk.level >= 10) {
      sk.level = 10;
      sk.xp = 0;
    }
    
    const message = isApprenticeBoost
      ? `✨ Apprentice Boost! ${agent.name} trained with their mentor nearby, reaching ${skillName} level ${sk.level}!`
      : `✨ ${agent.name} reached ${skillName} level ${sk.level}!`;
    addLog(message, 'level');
  }
}

function initSkills(): Record<TribespersonRole, SkillProgress> {
  const result: Partial<Record<TribespersonRole, SkillProgress>> = {};
  ROLES.forEach((role) => {
    result[role] = {
      level: 1,
      xp: 0,
      xpToNextLevel: getXPRequirement(1),
    };
  });
  return result as Record<TribespersonRole, SkillProgress>;
}

export const FAMILY_SURNAMES = ['Ironwood', 'Thornrunner', 'Starwatcher', 'Rockcarver', 'Stormrider'];

export function createTribesperson(id: string, mapData: MapData): Tribesperson {
  const gender = Math.random() > 0.5 ? ('Male' as const) : ('Female' as const);
  const name = generateRandomName(gender);
  
  // Pick 1-2 random traits
  const numTraits = Math.random() > 0.75 ? 2 : 1;
  const shuffledTraits = [...TRAITS].sort(() => 0.5 - Math.random());
  const traits = shuffledTraits.slice(0, numTraits) as TribespersonTrait[];

  // Assign Surname
  const familyName = FAMILY_SURNAMES[Math.floor(Math.random() * FAMILY_SURNAMES.length)];

  // Stats
  const stats = {
    hunger: 80 + Math.floor(Math.random() * 20),
    thirst: 85 + Math.floor(Math.random() * 15),
    fatigue: 75 + Math.floor(Math.random() * 25),
    morale: 60 + Math.floor(Math.random() * 40),
    health: 100,
  };

  // Attributes: base standard stats
  const baseAttr = () => Math.floor(Math.random() * 6) + 4; // 4 to 9
  const attributes = {
    strength: baseAttr(),
    endurance: baseAttr(),
    intelligence: baseAttr(),
    perception: baseAttr(),
    agility: baseAttr(),
  };

  // Trait bonuses to attributes
  if (traits.includes('Tireless')) attributes.endurance += 2;
  if (traits.includes('Path Finder')) attributes.agility += 2;
  if (traits.includes('Iron Stomach')) attributes.endurance += 1;

  const ageYears = 14 + Math.floor(Math.random() * 45); // Starter ages: 14 to 59
  const ageDays = Math.floor(Math.random() * 360);

  // Primary Role selection
  const role = ROLES[Math.floor(Math.random() * ROLES.length)];
  const skills = initSkills();
  
  // Buff primary role starting statistics based on age:
  // - under 20: level 2..3
  // - 20 to 29: level 3..4
  // - 30 to 39: level 4..6
  // - 40 to 49: level 6..7
  // - 50+: level 7..9
  let startingLvl = 2;
  if (ageYears < 20) {
    startingLvl = Math.floor(Math.random() * 2) + 2;
  } else if (ageYears >= 20 && ageYears < 30) {
    startingLvl = Math.floor(Math.random() * 2) + 3;
  } else if (ageYears >= 30 && ageYears < 40) {
    startingLvl = Math.floor(Math.random() * 3) + 4;
  } else if (ageYears >= 40 && ageYears < 50) {
    startingLvl = Math.floor(Math.random() * 2) + 6;
  } else {
    startingLvl = Math.floor(Math.random() * 3) + 7;
  }
  skills[role].level = startingLvl;
  skills[role].xpToNextLevel = getXPRequirement(startingLvl);
  
  if (traits.includes('Green Thumb')) {
    const lVal = Math.max(skills['Farmer'].level, 3);
    skills['Farmer'].level = lVal;
    skills['Farmer'].xpToNextLevel = getXPRequirement(lVal);
  }
  if (traits.includes('Beast Friend')) {
    const lVal = Math.max(skills['Hunter'].level, 3);
    skills['Hunter'].level = lVal;
    skills['Hunter'].xpToNextLevel = getXPRequirement(lVal);
  }

  // Initial Placement positioning (spawn on a non-water land tile or near the village Fireplace)
  const size = mapData.grid.length;
  let px = size / 2;
  let pz = size / 2;
  let py = 1;
  let found = false;

  // Search for Fireplace structure on the map
  let fireplaceCell: { x: number; z: number; height: number } | null = null;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = mapData.grid[r]?.[c];
      if (cell && cell.structure?.type === 'Fireplace') {
        fireplaceCell = { x: r, z: c, height: cell.height };
        break;
      }
    }
    if (fireplaceCell) break;
  }

  if (fireplaceCell) {
    let attempts = 0;
    while (attempts < 20) {
      const rx = fireplaceCell.x + (Math.random() - 0.5) * 2;
      const rz = fireplaceCell.z + (Math.random() - 0.5) * 2;
      const gridX = Math.max(0, Math.min(size - 1, Math.floor(rx)));
      const gridZ = Math.max(0, Math.min(size - 1, Math.floor(rz)));
      const targetCell = mapData.grid[gridX]?.[gridZ];
      if (targetCell && targetCell.biome !== 'water') {
        px = rx;
        pz = rz;
        py = targetCell.height;
        found = true;
        break;
      }
      attempts++;
    }
    if (!found) {
      px = fireplaceCell.x;
      pz = fireplaceCell.z;
      py = fireplaceCell.height;
      found = true;
    }
  } else {
    // Find a suitable land tile
    let attempts = 0;
    while (!found && attempts < 100) {
      const x = Math.floor(Math.random() * size);
      const z = Math.floor(Math.random() * size);
      const cell = mapData.grid[x][z];
      if (cell.biome !== 'water') {
        px = x;
        pz = z;
        py = cell.height;
        found = true;
      }
      attempts++;
    }
  }


  const defaultPriorities: Record<JobCategory, JobPriority> = {
    Sleep: 1,
    Eat: 1,
    Drink: 1,
    Gather: role === 'Gatherer' ? 1 : 2,
    Hunt: role === 'Hunter' ? 1 : 2,
    Build: role === 'Builder' ? 1 : 2,
    Farm: role === 'Farmer' ? 1 : 2,
    Scout: role === 'Scout' ? 1 : 2,
    Haul: 2,
    Repair: role === 'Builder' ? 2 : 3,
  };

  const personalities: ('Brave' | 'Curious' | 'Cowardly' | 'Lazy' | 'Ambitious' | 'Loyal' | 'Greedy')[] = [
    'Brave', 'Curious', 'Cowardly', 'Lazy', 'Ambitious', 'Loyal', 'Greedy'
  ];
  const personality = personalities[Math.floor(Math.random() * personalities.length)];

  return {
    id,
    name,
    gender,
    ageYears,
    ageDays,
    isAlive: true,
    stats,
    attributes,
    role,
    traits,
    skills,
    x: px,
    z: pz,
    y: py,
    targetX: px,
    targetZ: pz,
    color: ROLE_COLORS[role] || '#ffffff',
    statusText: 'Standing idle looking at skies.',
    priorities: defaultPriorities,
    personalInventory: {
      maxWeight: 15,
      maxVolume: 15,
      currentWeight: 0,
      currentVolume: 0,
      cleanliness: 90,
    },
    carriage: null,
    activeJobType: null,
    jobTargetCoords: null,
    workProgress: 0,
    personality,
    relationships: [],
    familyName,
    generation: 1,
    isTribeBorn: false,
    agePhase: 'Adult',
    lineagePath: `${name} ${familyName} (Founder)`,
    masteryTechniques: []
  };
}

export function createTribeBornChild(
  id: string,
  father: Tribesperson,
  mother: Tribesperson,
  mapData: MapData,
  currentDay: number
): { child: Tribesperson; codexEvent: CodexEvent } {
  // 1. Genetics Weighted Inheritance
  const inherit = (fVal: number, mVal: number) => {
    const min = Math.min(fVal, mVal);
    const max = Math.max(fVal, mVal);
    // Weighted inheritance is a value in-between the two parents' values, with +/- 1 mutation
    const base = min + Math.floor(Math.random() * (max - min + 1));
    const mutationVal = Math.random() < 0.15 ? (Math.random() > 0.5 ? 1 : -1) : 0;
    return Math.max(1, Math.min(10, base + mutationVal));
  };

  const attributes = {
    strength: inherit(father.attributes.strength, mother.attributes.strength),
    endurance: inherit(father.attributes.endurance, mother.attributes.endurance),
    intelligence: inherit(father.attributes.intelligence, mother.attributes.intelligence),
    perception: inherit(father.attributes.perception, mother.attributes.perception),
    agility: inherit(father.attributes.agility, mother.attributes.agility),
  };

  // Inherit Family Surnames and Dynasty Specialty
  let familyName = father.familyName || mother.familyName || 'Stormrider';
  if (father.familyName && mother.familyName) {
    familyName = Math.random() > 0.5 ? father.familyName : mother.familyName;
  }

  const generation = Math.max(father.generation || 1, mother.generation || 1) + 1;

  const gender = Math.random() > 0.5 ? 'Male' : 'Female';
  const name = generateRandomName(gender);

  const traits: TribespersonTrait[] = [];
  const parentTraits = Array.from(new Set([...(father.traits || []), ...(mother.traits || [])]));
  if (parentTraits.length > 0 && Math.random() < 0.6) {
    traits.push(parentTraits[Math.floor(Math.random() * parentTraits.length)]);
  } else {
    const shuffledTraits = [...TRAITS].sort(() => 0.5 - Math.random());
    traits.push(shuffledTraits[0]);
  }

  const skills = initSkills();

  // Position near mother but on land
  const px = mother.x + (Math.random() - 0.5) * 1.5;
  const pz = mother.z + (Math.random() - 0.5) * 1.5;

  const potentialRoll = Math.random();
  const potentialGrade = potentialRoll > 0.95 ? 'S' : potentialRoll > 0.75 ? 'A' : potentialRoll > 0.4 ? 'B' : 'C';

  if (potentialGrade === 'S') {
    attributes.strength = Math.min(10, attributes.strength + 2);
    attributes.intelligence = Math.min(10, attributes.intelligence + 2);
    attributes.perception = Math.min(10, attributes.perception + 2);
  } else if (potentialGrade === 'A') {
    attributes.intelligence = Math.min(10, attributes.intelligence + 1);
  }

  // Childhood Upbringing details analyzed on transition to Teenager later
  const lineagePath = `${father.name} ${father.familyName || ''} & ${mother.name} ${mother.familyName || ''} ➔ ${name} ${familyName}`;

  const defaultPriorities: Record<JobCategory, JobPriority> = {
    Sleep: 1,
    Eat: 1,
    Drink: 1,
    Gather: 0,
    Hunt: 0,
    Build: 0,
    Farm: 0,
    Scout: 0,
    Haul: 0,
    Repair: 0,
  };

  const child: Tribesperson = {
    id,
    name,
    gender,
    ageYears: 0,
    ageDays: 0,
    isAlive: true,
    stats: {
      hunger: 90,
      thirst: 90,
      fatigue: 90,
      morale: 85,
      health: 100,
    },
    attributes,
    role: 'Gatherer',
    traits,
    skills,
    x: px,
    z: pz,
    y: mother.y,
    targetX: px,
    targetZ: pz,
    color: '#38bdf8', // custom color denoting child status
    statusText: `👶 Innately cute baby of the ${familyName} family!`,
    priorities: defaultPriorities,
    personalInventory: { maxWeight: 5, maxVolume: 5, currentWeight: 0, currentVolume: 0, cleanliness: 100, items: {} },
    carriage: null,
    activeJobType: null,
    jobTargetCoords: null,
    personality: Math.random() > 0.5 ? father.personality : mother.personality,
    relationships: [
      { targetId: father.id, targetName: father.name, type: 'Family', value: 95 },
      { targetId: mother.id, targetName: mother.name, type: 'Family', value: 95 },
    ],
    familyName,
    generation,
    parents: [father.id, mother.id],
    isTribeBorn: true,
    agePhase: 'Child',
    lineagePath,
    masteryTechniques: []
  };

  const codexEvent: CodexEvent = {
    id: `birth-${id}-${currentDay}`,
    type: 'birth',
    title: `👶 Legendary Birth: ${name} ${familyName}`,
    description: `${name} was born into the ${familyName} dynasty (Gen ${generation}) to parents ${father.name} and ${mother.name}! Potential Rank: ${potentialGrade}.`,
    day: currentDay,
  };

  return { child, codexEvent };
}

export function establishSocialBonds(tribe: Tribesperson[]): Tribesperson[] {
  if (tribe.length < 2) return tribe;
  
  const nextTribe = tribe.map(t => ({
    ...t,
    relationships: t.relationships ? [...t.relationships] : []
  }));

  const link = (
    aIdx: number, 
    bIdx: number, 
    typeA: 'Friend' | 'Rival' | 'Mentor' | 'Apprentice' | 'Family', 
    typeB: 'Friend' | 'Rival' | 'Mentor' | 'Apprentice' | 'Family', 
    val: number
  ) => {
    const a = nextTribe[aIdx];
    const b = nextTribe[bIdx];
    if (a && b) {
      a.relationships = a.relationships || [];
      b.relationships = b.relationships || [];
      a.relationships = a.relationships.filter(r => r.targetId !== b.id);
      b.relationships = b.relationships.filter(r => r.targetId !== a.id);
      
      a.relationships.push({ targetId: b.id, targetName: b.name, type: typeA, value: val });
      b.relationships.push({ targetId: a.id, targetName: a.name, type: typeB, value: val });
    }
  };

  if (nextTribe.length >= 2) {
    // Family connection
    link(0, 1, 'Family', 'Family', 80);
  }
  if (nextTribe.length >= 3) {
    // Friendship
    link(1, 2, 'Friend', 'Friend', 65);
  }
  if (nextTribe.length >= 5) {
    // Feud / Bitter rivalry
    link(3, 4, 'Rival', 'Rival', -50);
    // Mentorship: Veteran training apprentice
    link(2, 4, 'Mentor', 'Apprentice', 45);
  }

  return nextTribe;
}

/**
 * Safely resolves or assigns housing for a villager.
 * Primary: family home (below capacity or previously assigned).
 * Secondary: friends house (secondary house).
 * Tent capacity: 2 people.
 * Shelter capacity: 4 to 6 people (using 5 average).
 */
export function getVillagerHousing(
  agent: Tribesperson,
  mapData: MapData,
  tribe: Tribesperson[]
): { x: number; z: number } {
  const dynamicAgent = agent as any;
  const size = mapData.grid.length;
  const depotX = Math.floor(size / 2);
  const depotZ = Math.floor(size / 2);

  // If already has familyHome that still exists, use it!
  if (dynamicAgent.familyHome) {
    const rx = Math.max(0, Math.min(size - 1, dynamicAgent.familyHome.x));
    const rz = Math.max(0, Math.min(size - 1, dynamicAgent.familyHome.z));
    const cell = mapData.grid[rx]?.[rz];
    if (cell && cell.structure && (cell.structure.type === 'Shelter' || cell.structure.type === 'Tent')) {
      return dynamicAgent.familyHome;
    }
  }

  // Find all shelter structures on map
  const shelters: Array<{ x: number; z: number; type: string; cap: number; occupants: string[] }> = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = mapData.grid[r][c];
      if (cell.structure && !(cell as any).isMultiTileChildOf) {
        if (cell.structure.type === 'Shelter') {
          shelters.push({ x: r, z: c, type: 'Shelter', cap: 5, occupants: [] });
        } else if (cell.structure.type === 'Tent') {
          shelters.push({ x: r, z: c, type: 'Tent', cap: 2, occupants: [] });
        }
      }
    }
  }

  if (shelters.length === 0) {
    return { x: depotX, z: depotZ };
  }

  // Count current occupants
  tribe.forEach((t) => {
    const dynamicT = t as any;
    if (t.id !== agent.id && t.isAlive && dynamicT.familyHome) {
      const match = shelters.find((s) => s.x === dynamicT.familyHome.x && s.z === dynamicT.familyHome.z);
      if (match) {
        match.occupants.push(t.id);
      }
    }
  });

  // 1. Try to find shelter below its rated capacity (Primary Home)
  const primaryShelter = shelters.find((s) => s.occupants.length < s.cap);
  if (primaryShelter) {
    dynamicAgent.familyHome = { x: primaryShelter.x, z: primaryShelter.z };
    return dynamicAgent.familyHome;
  }

  // 2. Try to find a friend's home (Secondary Home) - allow slight over-capacity squeeze
  const secondaryShelter = shelters.find((s) => s.occupants.length < s.cap + 2);
  if (secondaryShelter) {
    dynamicAgent.friendHome = { x: secondaryShelter.x, z: secondaryShelter.z };
    return dynamicAgent.friendHome;
  }

  // Fallback to the first existing shelter
  dynamicAgent.familyHome = { x: shelters[0].x, z: shelters[0].z };
  return dynamicAgent.familyHome;
}

/**
 * Update the whole tribe list by 1 simulation step, resolving autonomous job priority checklists.
 */
export function tickTribeSimulation(
  tribe: Tribesperson[], 
  mapData: MapData, 
  deltaTime: number, // scaled by speed multiplier
  timeSpeed: string,
  addLog: (text: string, type: 'info' | 'warning' | 'death' | 'level' | 'success' | 'combat' | any) => void,
  gameDays?: number
): Tribesperson[] {
  if (timeSpeed === 'paused') return tribe;

  if (!mapData.tribeCodexLogs) mapData.tribeCodexLogs = [];

  // Seed default history chronicle logs if completely empty
  if (mapData.tribeCodexLogs.length === 0) {
    mapData.tribeCodexLogs.push({
      id: 'founding',
      type: 'monument',
      title: '🏕️ Tribal Dynasty Founded',
      description: 'The First Pioneers crossed the high crags and established the settlement under the eye of the storm.',
      day: 1
    });

    // Retroactively assign Surnames & lineage to standard crew to kick off family tree
    tribe.forEach(t => {
      if (!t.familyName) {
        t.familyName = FAMILY_SURNAMES[Math.floor(Math.random() * FAMILY_SURNAMES.length)];
        t.generation = 1;
        t.lineagePath = `${t.name} ${t.familyName} (Founder)`;
        t.isTribeBorn = false;
        t.agePhase = 'Adult';
        t.masteryTechniques = t.masteryTechniques || [];
      }
    });
  }

  // --- POPULATION REPRODUCTION LOOP ---
  const currentDay = Math.floor(gameDays ?? 1);
  const alivePeople = tribe.filter(t => t.isAlive);
  const totalAliveCount = alivePeople.length;

  if (totalAliveCount < 30 && mapData.stockpile.food > 30 && Math.random() < 0.004 * deltaTime) {
    const males = alivePeople.filter(t => t.gender === 'Male' && t.agePhase !== 'Child' && t.agePhase !== 'Teenager');
    const females = alivePeople.filter(t => t.gender === 'Female' && t.agePhase !== 'Child' && t.agePhase !== 'Teenager');

    if (males.length > 0 && females.length > 0) {
      const father = males[Math.floor(Math.random() * males.length)];
      const mother = females[Math.floor(Math.random() * females.length)];

      const { child, codexEvent } = createTribeBornChild(
        `child-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        father,
        mother,
        mapData,
        currentDay
      );

      tribe.push(child);
      mapData.tribeCodexLogs.push(codexEvent);
      addLog(`👶 New Birth! ${child.name} ${child.familyName} was born to ${father.name} and ${mother.name}!`, 'level');
    }
  }

  const size = mapData.grid.length;

  // --- MULTI-LAYER INVENTORY WEIGHTS AND LIMITS --
  const getUnitWeight = (type: string): number => {
    switch (type) {
      case 'wood': return 0.8;
      case 'stone': return 1.5;
      case 'berries': case 'roots': case 'mushrooms': return 0.05;
      case 'meat': return 0.15;
      case 'fiber': return 0.02;
      case 'bone': return 0.4;
      case 'dew': case 'reservoirWater': case 'rainwater': return 0.1;
      case 'relics': case 'ancientMaterials': return 2.0;
      // Craftables
      case 'stoneAxe': case 'flintPickaxe': return 1.2;
      case 'spear': return 1.5;
      case 'boiledRoots': return 0.06;
      case 'paddedJerkin': return 2.5;
      case 'saltedMeat': return 0.12;
      case 'steelPickaxe': return 2.2;
      case 'eldritchWard': return 5.0;
      case 'amuletLife': return 0.3;
      case 'thuleciteCore': return 1.0;
      case 'grassBasket': return 0.5;
      default: return 0.1;
    }
  };

  const getUnitVolume = (type: string): number => {
    switch (type) {
      case 'wood': return 1.2;
      case 'stone': return 0.8;
      case 'berries': case 'roots': case 'mushrooms': return 0.05;
      case 'meat': return 0.15;
      case 'fiber': return 0.08;
      case 'bone': return 0.3;
      case 'dew': case 'reservoirWater': case 'rainwater': return 0.1;
      case 'relics': case 'ancientMaterials': return 1.5;
      // Craftables
      case 'stoneAxe': case 'flintPickaxe': return 1.5;
      case 'spear': return 2.0;
      case 'boiledRoots': return 0.06;
      case 'paddedJerkin': return 3.0;
      case 'saltedMeat': return 0.12;
      case 'steelPickaxe': return 2.5;
      case 'eldritchWard': return 4.0;
      case 'amuletLife': return 0.2;
      case 'thuleciteCore': return 0.8;
      case 'grassBasket': return 1.0;
      default: return 0.1;
    }
  };

  // 1. Scan the map size and structures
  let storageBins = 0;
  let shrines = 0;
  let watchTowers = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = mapData.grid[r][c];
      if (cell && cell.structure) {
        if (cell.structure.type === 'StorageBin') {
          storageBins++;
        } else if (cell.structure.type === 'Shrine' && !cell.structure.dismantling) {
          shrines++;
        } else if (cell.structure.type === 'WatchTower' && !cell.structure.dismantling) {
          watchTowers++;
        }
      }
    }
  }

  // 1b. WatchTower dynamic danger warning checklist
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = mapData.grid[r][c];
      if (cell && cell.structure && cell.structure.type === 'WatchTower' && !cell.structure.dismantling) {
        const rad = 5;
        for (let dx = -rad; dx <= rad; dx++) {
          for (let dz = -rad; dz <= rad; dz++) {
            const nx = r + dx;
            const nz = c + dz;
            if (nx >= 0 && nx < size && nz >= 0 && nz < size) {
              const checkCell = mapData.grid[nx][nz];
              if (checkCell && checkCell.wildAnimal && !checkCell.wildAnimal.isDead) {
                // Warning frequency throttle using random roll
                if (Math.random() < 0.01) {
                  addLog(`🗼 Watch Tower Alert: A wild, dynamic ${checkCell.wildAnimal.type} has entered the perimeter of the watchtower situated at [${r}, ${c}]! (Near coordinates [${nx}, ${nz}])`, 'warning');
                }
              }
            }
          }
        }
      }
    }
  }

  // 2. Village Storage limits
  if (!mapData.villageInventory) {
    mapData.villageInventory = { maxWeight: 400, maxVolume: 400, currentWeight: 0, currentVolume: 0, cleanliness: 90, items: {} };
  }
  mapData.villageInventory.maxWeight = 400 + storageBins * 500; // Each StorageBin adds +500kg
  mapData.villageInventory.maxVolume = 400 + storageBins * 500;

  // Sync village inventory items and current weights
  let vWeight = 0;
  let vVolume = 0;
  const vItems: Record<string, number> = {};

  Object.entries(mapData.stockpile).forEach(([k, val]) => {
    if (typeof val === 'number' && !k.toLowerCase().includes('fresh') && k !== 'food') {
      if (val > 0) {
        vWeight += val * getUnitWeight(k);
        vVolume += val * getUnitVolume(k);
        vItems[k] = val;
      }
    }
  });
  mapData.villageInventory.currentWeight = Math.round(vWeight * 10) / 10;
  mapData.villageInventory.currentVolume = Math.round(vVolume * 10) / 10;
  mapData.villageInventory.items = vItems;

  // Logistics bottleneck drops cleanliness if inventory exceeds constraints
  const overWT = vWeight > mapData.villageInventory.maxWeight;
  const overVM = vVolume > mapData.villageInventory.maxVolume;
  if (overWT || overVM) {
    const decay = 2.5 * deltaTime * (1 + (Math.max(0, vWeight - mapData.villageInventory.maxWeight) + Math.max(0, vVolume - mapData.villageInventory.maxVolume)) / 100);
    mapData.villageInventory.cleanliness = Math.max(10, Math.round(mapData.villageInventory.cleanliness - decay));
  } else {
    // slow natural recovery of order
    mapData.villageInventory.cleanliness = Math.min(100, Math.round(mapData.villageInventory.cleanliness + 0.5 * deltaTime));
  }

  // Spoilage scaling
  const spoilageMultiplier = 1.0 + (100 - mapData.villageInventory.cleanliness) * 0.05; // 1x to 5.5x speed

  // Initialize Caravan Storage if not exists
  if (!mapData.caravanInventory) {
    mapData.caravanInventory = {
      maxWeight: 150,
      maxVolume: 150,
      currentWeight: 0,
      currentVolume: 0,
      cleanliness: 70,
      items: { relics: 1, ancientMaterials: 2, meat: 10, wood: 20 }
    };
  }

  // Sync Caravan inventory items and weights
  let cWeight = 0;
  let cVolume = 0;
  if (!mapData.caravanInventory.items) {
    mapData.caravanInventory.items = {};
  }
  Object.entries(mapData.caravanInventory.items).forEach(([k, val]) => {
    const valNum = val as number;
    if (valNum > 0) {
      cWeight += valNum * getUnitWeight(k);
      cVolume += valNum * getUnitVolume(k);
    }
  });
  mapData.caravanInventory.currentWeight = Math.round(cWeight * 10) / 10;
  mapData.caravanInventory.currentVolume = Math.round(cVolume * 10) / 10;

  // --- DON'T STARVE STOCKPILE FOOD SPOILAGE TICK ---
  const SPOIL_RATES = {
    berries: 1.7,    // loses 1.7% freshness per day (delayed by 2x)
    roots: 0.8,      // loses 0.8% freshness per day (delayed by 2x)
    mushrooms: 1.25,  // loses 1.25% freshness per day (delayed by 2x)
    meat: 2.625,      // loses 2.625% freshness per day (delayed by 2x)
  };

  // If the stockpile fields are somehow undefined, initialize them
  if (mapData.stockpile.berries === undefined) {
    mapData.stockpile.berries = Math.floor(mapData.stockpile.food * 0.40);
    mapData.stockpile.berriesFresh = 95;
    mapData.stockpile.roots = Math.floor(mapData.stockpile.food * 0.25);
    mapData.stockpile.rootsFresh = 90;
    mapData.stockpile.mushrooms = Math.floor(mapData.stockpile.food * 0.15);
    mapData.stockpile.mushroomsFresh = 85;
    mapData.stockpile.meat = Math.max(0, mapData.stockpile.food - mapData.stockpile.berries - mapData.stockpile.roots - mapData.stockpile.mushrooms);
    mapData.stockpile.meatFresh = 80;

    mapData.stockpile.fiber = 45;
    mapData.stockpile.bone = 10;
    mapData.stockpile.dew = 15;
    mapData.stockpile.reservoirWater = 25;
    mapData.stockpile.rainwater = 10;
    mapData.stockpile.relics = 2;
    mapData.stockpile.ancientMaterials = 5;
  }

  // Decay freshness scaled by spoilageMultiplier
  if (mapData.stockpile.berries > 0) {
    mapData.stockpile.berriesFresh = Math.max(0, mapData.stockpile.berriesFresh - SPOIL_RATES.berries * deltaTime * spoilageMultiplier);
    if (mapData.stockpile.berriesFresh <= 0) {
      const lost = Math.max(1, Math.ceil(mapData.stockpile.berries * 0.15));
      mapData.stockpile.berries = Math.max(0, mapData.stockpile.berries - lost);
      mapData.stockpile.berriesFresh = 85; // reset remaining to partially fresh
      addLog(`🤢 Stockpile Alert: ${lost} Berries rotted away and were discarded!`, 'warning');
    }
  }
  if (mapData.stockpile.roots > 0) {
    mapData.stockpile.rootsFresh = Math.max(0, mapData.stockpile.rootsFresh - SPOIL_RATES.roots * deltaTime * spoilageMultiplier);
    if (mapData.stockpile.rootsFresh <= 0) {
      const lost = Math.max(1, Math.ceil(mapData.stockpile.roots * 0.08));
      mapData.stockpile.roots = Math.max(0, mapData.stockpile.roots - lost);
      mapData.stockpile.rootsFresh = 80;
      addLog(`🤢 Stockpile Alert: ${lost} wild Roots decayed in storage!`, 'warning');
    }
  }
  if (mapData.stockpile.mushrooms > 0) {
    mapData.stockpile.mushroomsFresh = Math.max(0, mapData.stockpile.mushroomsFresh - SPOIL_RATES.mushrooms * deltaTime * spoilageMultiplier);
    if (mapData.stockpile.mushroomsFresh <= 0) {
      const lost = Math.max(1, Math.ceil(mapData.stockpile.mushrooms * 0.12));
      mapData.stockpile.mushrooms = Math.max(0, mapData.stockpile.mushrooms - lost);
      mapData.stockpile.mushroomsFresh = 80;
      addLog(`🤢 Stockpile Alert: ${lost} Mushrooms spoiled and turned to dust!`, 'warning');
    }
  }
  if (mapData.stockpile.meat > 0) {
    mapData.stockpile.meatFresh = Math.max(0, mapData.stockpile.meatFresh - SPOIL_RATES.meat * deltaTime * spoilageMultiplier);
    if (mapData.stockpile.meatFresh <= 0) {
      const lost = Math.max(1, Math.ceil(mapData.stockpile.meat * 0.18));
      mapData.stockpile.meat = Math.max(0, mapData.stockpile.meat - lost);
      mapData.stockpile.meatFresh = 75;
      addLog(`🤢 Stockpile Alert: ${lost} Meat spoiled and rotted away!`, 'warning');
    }
  }

  // Handle external adjustments to stockpile.food (e.g. consumed for building construction)
  const sumFood = mapData.stockpile.berries + mapData.stockpile.roots + mapData.stockpile.mushrooms + mapData.stockpile.meat;
  if (Math.abs(mapData.stockpile.food - sumFood) > 0.1) {
    if (mapData.stockpile.food <= 0) {
      mapData.stockpile.berries = 0;
      mapData.stockpile.roots = 0;
      mapData.stockpile.mushrooms = 0;
      mapData.stockpile.meat = 0;
    } else {
      const ratio = mapData.stockpile.food / sumFood;
      mapData.stockpile.berries = Math.round(mapData.stockpile.berries * ratio);
      mapData.stockpile.roots = Math.round(mapData.stockpile.roots * ratio);
      mapData.stockpile.mushrooms = Math.round(mapData.stockpile.mushrooms * ratio);
      mapData.stockpile.meat = Math.max(0, mapData.stockpile.food - mapData.stockpile.berries - mapData.stockpile.roots - mapData.stockpile.mushrooms);
    }
  }

  // Synchronize food count
  mapData.stockpile.food = mapData.stockpile.berries + mapData.stockpile.roots + mapData.stockpile.mushrooms + mapData.stockpile.meat;

  // Ensure ecosystem is loaded
  if (!mapData.animals || mapData.animals.length === 0) {
    populateInitialMapAnimals(mapData);
  }

  // Run the live Wildlife Ecosystem Simulation Tick
  tickEcosystemSimulation(mapData, deltaTime, tribe, addLog);

  // --- A. GROW CROPS AND REGROW RESOURCES ON THE GRID ---
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = mapData.grid[r][c];

      // Grow crops
      if (cell.farmCrop && cell.farmCrop.stage === 'growing') {
        cell.farmCrop.progress += 3.5 * deltaTime;
        if (cell.farmCrop.progress >= 100) {
          cell.farmCrop.progress = 100;
          cell.farmCrop.stage = 'harvestable';
        }
      }

      // Regrowth/Decay of Don't Starve resourceNode
      if (cell.resourceNode) {
        const node = cell.resourceNode;
        if (cell.structure || cell.construction) {
          // If occupied by a structure or active construction blueprint, it cannot regrow.
          // Reset timer to 0 so it must pass the full regrow time after building is taken out.
          node.regrowTimer = 0;
        } else if (node.amount < node.maxAmount) {
          node.regrowTimer += node.regrowRate * deltaTime;
          if (node.regrowTimer >= 1.0) {
            const added = Math.min(node.maxAmount - node.amount, Math.floor(node.regrowTimer));
            node.amount += added;
            node.regrowTimer = 0;

            // Soft visual restore
            if (node.amount > 0) {
              if (node.type === 'Berries') cell.hasShrub = true;
              else if (node.type === 'Wood') cell.hasTree = true;
              else if (['Stone', 'Copper', 'Silver', 'Gold', 'Iron'].includes(node.type)) cell.hasRock = true;
            }
          }
        }
      }
    }
  }

  // --- B. DETAILED TRIBESPEOPLE DECISION & NAVIGATION TICK ---
  const nextTribe = tribe.map((agent) => {
    if (!agent.isAlive) return agent;

    const defaultPersonalities: ('Brave' | 'Curious' | 'Cowardly' | 'Lazy' | 'Ambitious' | 'Loyal' | 'Greedy')[] = [
      'Brave', 'Curious', 'Cowardly', 'Lazy', 'Ambitious', 'Loyal', 'Greedy'
    ];
    const personality = agent.personality || defaultPersonalities[Math.floor(Math.random() * defaultPersonalities.length)];
    let tempRelationships = agent.relationships ? [...agent.relationships] : [];

    // --- Proximity Scan ---
    const nearbyAgents = tribe.filter(
      other => other.id !== agent.id && other.isAlive && Math.abs(other.x - agent.x) < 1.5 && Math.abs(other.z - agent.z) < 1.5
    );

    const hasMentorNearby = nearbyAgents.some(other => {
      const rel = tempRelationships.find(r => r.targetId === other.id);
      return rel && rel.type === 'Mentor';
    });

    let speedModifier = 1.0;

    // --- 1. Needs decay ---
    const fatigueFactor = agent.traits.includes('Tireless') ? 0.55 : 1.0;
    const digestFactor = agent.traits.includes('Iron Stomach') ? 0.70 : 1.0;

    const stats = { ...agent.stats };
    const attributes = { ...agent.attributes };

    // Personality dynamics
    if (personality === 'Lazy') {
      speedModifier *= 0.60;
      stats.fatigue = Math.min(100, stats.fatigue + 0.12 * deltaTime * 10);
    } else if (personality === 'Ambitious') {
      speedModifier *= 1.35;
      stats.morale = Math.max(0, stats.morale - 0.25 * deltaTime);
    }

    // Nearby interactions
    nearbyAgents.forEach(other => {
      let rel = tempRelationships.find(r => r.targetId === other.id);
      if (!rel) {
        rel = { targetId: other.id, targetName: other.name, type: 'Friend', value: 10 };
        tempRelationships.push(rel);
      }

      if (Math.random() < 0.03 * deltaTime * 15) {
        let valDelta = 2;
        if (personality === 'Lazy' && other.personality === 'Ambitious') {
          valDelta = -6;
        } else if (personality === 'Ambitious' && other.personality === 'Lazy') {
          valDelta = -6;
        } else if (personality === 'Greedy' && other.personality === 'Loyal') {
          valDelta = -4;
        } else if (personality === 'Brave' && other.personality === 'Brave') {
          valDelta = 5;
        } else if (personality === 'Curious' && other.personality === 'Curious') {
          valDelta = 5;
        }
        
        rel.value = Math.max(-100, Math.min(100, rel.value + valDelta));

        if (rel.value > 45 && rel.type === 'Rival') {
          rel.type = 'Friend';
          addLog(`🤝 Harmony Restored: ${agent.name} and ${other.name} settled their past grudges and are now Friends!`, 'info');
        } else if (rel.value < -35 && rel.type !== 'Rival') {
          rel.type = 'Rival';
          addLog(`😡 Bitter Rivalry: ${agent.name} and ${other.name} had a nasty argument and are now Rivals!`, 'warning');
        } else if (rel.value >= 40 && rel.type !== 'Friend' && rel.type !== 'Family' && rel.type !== 'Mentor' && rel.type !== 'Apprentice') {
          rel.type = 'Friend';
          addLog(`🤝 New Friendship: ${agent.name} and ${other.name} became great friends!`, 'info');
        }
      }

      if (rel.type === 'Friend') {
        speedModifier *= 1.25;
        stats.morale = Math.min(100, stats.morale + 0.6 * deltaTime);
      } else if (rel.type === 'Rival') {
        speedModifier *= 0.60;
        stats.morale = Math.max(0, stats.morale - 1.5 * deltaTime);
        if (Math.random() < 0.003 * deltaTime * 20) {
          addLog(`😡 Clashing Rivals: ${agent.name} and their rival ${other.name} are yelling and arguing nearby!`, 'warning');
        }
      } else if (rel.type === 'Mentor' && other.personality !== 'Lazy') {
        speedModifier *= 1.15;
      } else if (rel.type === 'Apprentice') {
        speedModifier *= 1.15;
      } else if (rel.type === 'Family') {
        speedModifier *= 1.15;
        stats.morale = Math.min(100, stats.morale + 0.9 * deltaTime);
      }
    });

    const ageScale = agent.agePhase === 'Child' ? 0.45 : agent.agePhase === 'Teenager' ? 0.8 : 1.0;
    stats.hunger = Math.max(0, stats.hunger - 1.15 * digestFactor * ageScale * deltaTime);
    stats.thirst = Math.max(0, stats.thirst - 1.55 * digestFactor * ageScale * deltaTime);
    stats.fatigue = Math.max(0, stats.fatigue - 0.90 * fatigueFactor * ageScale * deltaTime);

    // Morale updates
    let moraleChange = 0;
    if (stats.hunger < 25) moraleChange -= 2.5 * deltaTime;
    else if (stats.hunger > 60) moraleChange += 0.8 * deltaTime;

    if (stats.thirst < 25) moraleChange -= 3.5 * deltaTime;
    else if (stats.thirst > 60) moraleChange += 0.8 * deltaTime;

    if (stats.fatigue < 15) moraleChange -= 2.0 * deltaTime;
    else if (stats.fatigue > 50) moraleChange += 0.5 * deltaTime;

    // Shrine passive morale boost
    if (shrines > 0) {
      moraleChange += 1.5 * shrines * deltaTime;
    }

    stats.morale = Math.max(0, Math.min(100, stats.morale + moraleChange));

    // Health states (starvation and hydration)
    let healthChange = 0;
    const isStarving = stats.hunger <= 0;
    const isDehydrated = stats.thirst <= 0;
    const isExhausted = stats.fatigue <= 0;

    if (isStarving) healthChange -= 4.0 * deltaTime;
    if (isDehydrated) healthChange -= 6.0 * deltaTime;
    if (isExhausted) healthChange -= 1.0 * deltaTime;

    if (!isStarving && !isDehydrated && stats.hunger > 60 && stats.thirst > 60 && stats.health < 100) {
      let recoveryRate = 1.5;
      if (hasStructureInVillage(mapData, 'HealersSanctum')) {
        recoveryRate *= 1.25;
      }
      const hasAnyLivingHealer = tribe.some(p => p.isAlive && p.role === 'Healer');
      if (hasAnyLivingHealer) {
        recoveryRate *= 1.25;
      }
      healthChange += recoveryRate * deltaTime;
    }

    stats.health = Math.max(0, Math.min(100, stats.health + healthChange * deltaTime * 12));

    if (stats.health <= 0) {
      const deathReason = isStarving ? 'Starvation' : isDehydrated ? 'Dehydration' : 'Exhaustion';
      addLog(`💀 ${agent.name} (${agent.role}) has died of ${deathReason} at age ${agent.ageYears}!`, 'death');
      return { ...agent, isAlive: false, deathReason, stats };
    }

    // --- Aging ---
    const ageIncreaseDays = 4.5 * deltaTime; // 10x aging speed: age 10 years in 1 game year
    let ageDays = agent.ageDays + ageIncreaseDays;
    let ageYears = agent.ageYears;
    let agePhase = agent.agePhase || 'Adult';
    let childUpbringing = agent.childUpbringing;
    let color = agent.color;
    let role: TribespersonRole = agent.role;
    let priorities = { ...agent.priorities };
    let traits = [...(agent.traits || [])];
    let masteryTechniques = [...(agent.masteryTechniques || [])];
    let apprenticeTo = agent.apprenticeTo ?? null;
    let apprenticeToName = agent.apprenticeToName ?? null;
    let isOracleApprentice = agent.isOracleApprentice ?? false;

    // --- MASTERY TECHNIQUES FOR ADULTS ---
    if (agePhase === 'Adult') {
      const primarySkill = agent.skills[role];
      if (primarySkill && primarySkill.level >= 5) {
        let techName = '';
        if (role === 'Gatherer') techName = 'Deep Foraging';
        else if (role === 'Hunter') techName = 'Silent Tracking';
        else if (role === 'Builder') techName = 'Rapid Assembly';
        else if (role === 'Farmer') techName = 'Abundant Harvest';
        else if (role === 'Scout') techName = 'Wind Walker';
        else if (role === 'Healer') techName = 'Herbal Expertise';
        else if (role === 'Artisan') techName = 'Master Crafting';

        if (techName && !masteryTechniques.includes(techName)) {
          masteryTechniques.push(techName);
          addLog(`✨ MASTERY UNLOCKED: ${agent.name} has unlocked the legendary technique '${techName}'!`, 'level');
          if (!mapData.tribeCodexLogs) mapData.tribeCodexLogs = [];
          mapData.tribeCodexLogs.push({
            id: `mastery-${agent.id}-${Date.now()}`,
            type: 'mastery',
            title: `✨ Master Technique: ${agent.name}`,
            description: `${agent.name} has unlocked the legendary '${techName}' technique, passing it down to any future apprentices.`,
            day: currentDay
          });
        }
      }
    }

    // --- APPRENTICESHIP SYSTEM SYSTEM ---
    if (agePhase === 'Teenager') {
      if (!apprenticeTo) {
        // Find a living adult master
        const potentialMentors = tribe.filter(o => o.isAlive && o.agePhase === 'Adult' && o.id !== agent.id);
        if (potentialMentors.length > 0) {
          const mentor = potentialMentors.sort((a,b) => {
            const maxA = Math.max(...Object.values(a.skills).map(s => s.level));
            const maxB = Math.max(...Object.values(b.skills).map(s => s.level));
            return maxB - maxA;
          })[0];
          
          if (mentor) {
            apprenticeTo = mentor.id;
            apprenticeToName = mentor.name;
            role = mentor.role;
            addLog(`🎓 Apprenticeship: Teenager ${agent.name} started learning from Master ${mentor.name} (${mentor.role})`, 'info');
            if (!mapData.tribeCodexLogs) mapData.tribeCodexLogs = [];
            mapData.tribeCodexLogs.push({
              id: `apprentice-${agent.id}-${Date.now()}`,
              type: 'apprenticeship',
              title: `🎓 Apprentice Pair: ${agent.name}`,
              description: `${agent.name} was apprenticed to Master ${mentor.name} (${mentor.role}) to study ancestral secrets.`,
              day: currentDay
            });
          }
        }
      } else {
        const mentor = tribe.find(o => o.id === apprenticeTo && o.isAlive);
        if (mentor) {
          role = mentor.role;
          const mRole = mentor.role;
          let teachingMultiplier = 1.0;
          const trainingHutMapping: Record<string, string> = {
            Gatherer: 'GatherersPantry',
            Hunter: 'HuntersHut',
            Builder: 'BuildersLodge',
            Farmer: 'FarmersGranary',
            Scout: 'ScoutsLookout',
            Healer: 'HealersSanctum',
            Artisan: 'ArtisansWorkshop',
          };
          const associatedHutName = trainingHutMapping[mRole];
          if (associatedHutName && hasStructureInVillage(mapData, associatedHutName)) {
            teachingMultiplier *= 1.25;
          }
          const prevLvl = agent.skills[mRole].level;
          awardSkillXP(agent, mRole, 18.0 * teachingMultiplier * deltaTime, mapData, addLog);
          if (agent.skills[mRole].level > prevLvl) {
            addLog(`⭐ Mentor Training: Apprentice ${agent.name} learned ${mRole} Level ${agent.skills[mRole].level}!`, 'level');
          }

          if (mentor.skills[mRole].level >= 5) {
            const mTechs = mentor.masteryTechniques || [];
            mTechs.forEach(t => {
              if (!masteryTechniques.includes(t)) {
                masteryTechniques.push(t);
                addLog(`⚡ Legacy Technique: Apprentice ${agent.name} learned '${t}' from ${mentor.name}!`, 'level');
              }
            });
          }
        } else {
          apprenticeTo = null;
          apprenticeToName = null;
        }
      }
    }

    if (ageDays >= 360) {
      ageDays = ageDays % 360;
      ageYears += 1;
      addLog(`🎂 ${agent.name} grows older! Celebrating age ${ageYears}.`, 'info');

      // Child -> Teenager Transition
      if (agePhase === 'Child' && ageYears >= 4) {
        agePhase = 'Teenager';
        
        // Scan surrounding grid to find childhood environment:
        const cx = Math.floor(agent.x);
        const cz = Math.floor(agent.z);
        let workshops = 0;
        let oracles = 0;
        const radius = 4;
        for (let rx = -radius; rx <= radius; rx++) {
          for (let rz = -radius; rz <= radius; rz++) {
            const cell = mapData.grid[cx + rx]?.[cz + rz];
            if (cell && cell.structure) {
              const type = cell.structure.type;
              if (['ArtisanBench', 'ScienceMachine', 'PrecursorGenerator', 'StorageBin'].includes(type)) {
                workshops++;
              } else if (['RuinousAltar', 'Shrine', 'AegisBeacon'].includes(type)) {
                oracles++;
              }
            }
          }
        }

        let upbringing: 'Hunter Camp' | 'Builder District' | 'Oracle Enclave' | 'General' = 'Hunter Camp';
        if (workshops > oracles && workshops > 0) {
          upbringing = 'Builder District';
          agent.skills['Builder'].level = 3;
          agent.skills['Artisan'].level = 2;
          attributes.strength = Math.min(10, attributes.strength + 2);
          attributes.endurance = Math.min(10, attributes.endurance + 1);
          if (!traits.includes('Tireless')) traits.push('Tireless');
        } else if (oracles > workshops && oracles > 0) {
          upbringing = 'Oracle Enclave';
          agent.skills['Healer'].level = 3;
          attributes.intelligence = Math.min(10, attributes.intelligence + 2);
          attributes.perception = Math.min(10, attributes.perception + 1);
        } else {
          upbringing = 'Hunter Camp';
          agent.skills['Hunter'].level = 3;
          agent.skills['Gatherer'].level = 2;
          attributes.agility = Math.min(10, attributes.agility + 1.5);
          if (!traits.includes('Path Finder')) traits.push('Path Finder');
        }

        childUpbringing = upbringing;
        color = '#f472b6'; // apprentice color
        if (!mapData.tribeCodexLogs) mapData.tribeCodexLogs = [];
        mapData.tribeCodexLogs.push({
          id: `upbringing-${agent.id}-${Date.now()}`,
          type: 'apprenticeship',
          title: `🧑 Upbringing: ${agent.name} ${agent.familyName || ''}`,
          description: `${agent.name} has grown into a Teenager (Age 4) having been raised in the ${upbringing}! They are looking to start apprenticeships!`,
          day: currentDay
        });
        addLog(`🧑 Childhood Environment: ${agent.name} entered teenage years in the ${upbringing}!`, 'level');
      }

      // Teenager -> Adult Transition
      else if (agePhase === 'Teenager' && ageYears >= 12) {
        agePhase = 'Adult';
        
        let bestRole: TribespersonRole = 'Gatherer';
        let bestLvl = 1;
        for (const r of Object.keys(agent.skills) as TribespersonRole[]) {
          if (agent.skills[r].level > bestLvl) {
            bestLvl = agent.skills[r].level;
            bestRole = r;
          }
        }
        role = bestRole;
        color = ROLE_COLORS[bestRole] || '#ffffff';

        priorities = {
          Sleep: 1,
          Eat: 1,
          Drink: 1,
          Gather: role === 'Gatherer' ? 1 : 2,
          Hunt: role === 'Hunter' ? 1 : 2,
          Build: role === 'Builder' ? 1 : 2,
          Farm: role === 'Farmer' ? 1 : 2,
          Scout: role === 'Scout' ? 1 : 2,
          Haul: 2,
          Repair: role === 'Builder' ? 2 : 3,
        };

        if (!mapData.tribeCodexLogs) mapData.tribeCodexLogs = [];
        mapData.tribeCodexLogs.push({
          id: `adult-${agent.id}-${Date.now()}`,
          type: 'marriage',
          title: `🎓 Tribe Adulthood: ${agent.name} ${agent.familyName || ''}`,
          description: `${agent.name} of the ${agent.familyName || ''} family completed their upbringing (${childUpbringing || 'Camp'}) and entered Adulthood as a master ${role}!`,
          day: currentDay
        });
        addLog(`🎓 Training Complete: ${agent.name} ${agent.familyName} is now a full adult worker! Role: ${role}.`, 'level');
      }

      if (ageYears > 64) {
        if (Math.random() < 0.005 * (ageYears - 64)) {
          addLog(`💀 ${agent.name} (~${agent.role}) passed away peacefully of Old Age at ${ageYears}!`, 'death');
          if (!mapData.tribeCodexLogs) mapData.tribeCodexLogs = [];
          mapData.tribeCodexLogs.push({
            id: `oldage-${agent.id}-${Date.now()}`,
            type: 'death',
            title: `🕯️ Peace Passing: ${agent.name} ${agent.familyName || ''} Died`,
            description: `${agent.name} passed away peacefully of advanced old age at age ${ageYears}. Surnames line: ${agent.familyName}.`,
            day: currentDay
          });
          return { ...agent, isAlive: false, deathReason: 'Advanced Old Age', ageYears, ageDays };
        }
      }
    }

    // --- Autonomous Job Evaluation Checklist ---
    let activeJobType = agent.activeJobType;
    let jobTargetCoords = agent.jobTargetCoords;
    let workProgress = agent.workProgress ?? 0;
    let carriage = agent.carriage;
    let x = agent.x;
    let z = agent.z;
    let statusText = agent.statusText;

    // Survival Emergencies (forces overrides immediately)
    const sleepCrit = stats.fatigue < 25;
    const hungerCrit = stats.hunger < 35;
    const thirstCrit = stats.thirst < 35;

    // Predator fear alert: non-combat role types immediately trigger a flee state when any Apex or pack predator crosses their boundary
    let nearHostilePredator: any = null;
    const isHunterOrScout = agent.role === 'Hunter' || agent.role === 'Scout';
    if (!isHunterOrScout && mapData.animals) {
      nearHostilePredator = mapData.animals.find(a => 
        !a.isDead && 
        (a.category === 'ApexPredator' || a.category === 'SmallPredator') &&
        (a.x - agent.x) ** 2 + (a.z - agent.z) ** 2 < (4.0) ** 2
      );
    }

    let overriddenJob: JobCategory | null = null;
    if (nearHostilePredator) {
      overriddenJob = 'Haul'; // set active job to safety evacuation movement
      statusText = `😱 Scream! Fleeing wild ${nearHostilePredator.type}!`;
      
      const nearestDefender = tribe.find(t => t.id !== agent.id && t.isAlive && t.role === 'Hunter');
      const safeX = nearestDefender ? Math.round(nearestDefender.x) : Math.floor(size / 2) + 2;
      const safeZ = nearestDefender ? Math.round(nearestDefender.z) : Math.floor(size / 2) + 2;
      
      jobTargetCoords = { x: safeX, z: safeZ };
      workProgress = 0;
      
      if (Math.random() < 0.08 * deltaTime) {
        addLog(`😱 S.O.S: ${agent.name} is running for safety, screaming "Help! Feral beast ${nearHostilePredator.type}!"`, 'warning');
      }
    } else if (sleepCrit) overriddenJob = 'Sleep';
    else if (thirstCrit) overriddenJob = 'Drink';
    else if (hungerCrit) overriddenJob = 'Eat';
    else if (carriage && carriage.amount > 0) overriddenJob = 'Haul'; // must return what is currently loaded

    if (overriddenJob && !nearHostilePredator) {
      if (activeJobType !== overriddenJob) {
        activeJobType = overriddenJob;
        jobTargetCoords = null; // force find coordinates matching this emergency
        workProgress = 0;
      }
    } else if (nearHostilePredator) {
      activeJobType = 'Haul';
    }

    // Evaluate priorities and available jobs if idle, lost target, doing a low-priority sweeping fallback,
    // or if a MUCH higher priority task became available in the colony and their needs are met!
    const isSweepingFallback = (activeJobType === 'Haul' && (agent as any).haulSubJob === 'organizeStockpile') || 
                               (activeJobType === 'Repair' && (agent as any).repairSubJob === 'organizeStockpile');

    const inSurvivalSurvivalEmergency = sleepCrit || hungerCrit || thirstCrit;
    let shouldReevaluate = false;
    
    if (isSweepingFallback) {
      shouldReevaluate = true;
    } else if (!activeJobType || !jobTargetCoords) {
      // Idle agent! Only re-evaluate with a 12% chance per tick to avoid heavy 60FPS grid scans,
      // OR if forced by a new blueprint/job placement!
      if (Math.random() < 0.12) {
        shouldReevaluate = true;
      }
    } else {
      // Performing active job. Check periodically (e.g., 4% per frame) if a better/higher priority job is available
      if (!inSurvivalSurvivalEmergency && activeJobType !== 'Sleep' && activeJobType !== 'Eat' && activeJobType !== 'Drink') {
        if (Math.random() < 0.04) {
          shouldReevaluate = true;
        }
      }
    }

    // Direct force reevaluation trigger
    const forceGen = (mapData as any).forceJobReevaluation ?? 0;
    if ((agent as any).lastReevalGen !== forceGen) {
      shouldReevaluate = true;
      (agent as any).lastReevalGen = forceGen;
    }

    if (agent.isManualDirectTask) {
      shouldReevaluate = false;
    }

    if (shouldReevaluate) {
      const available: { type: JobCategory; x: number; z: number; score: number }[] = [];

      // Helper to add job if allowed
      const addCandidate = (type: JobCategory, goalX: number, goalZ: number, basePriority: number, scoreModifier = 0) => {
        if (basePriority <= 0) return; // 0 means disabled
        available.push({
          type,
          x: goalX,
          z: goalZ,
          score: basePriority + scoreModifier,
        });
      };

      const depotX = Math.floor(size / 2);
      const depotZ = Math.floor(size / 2);

      const timeOfDay = gameDays !== undefined ? (gameDays % 1.0) : 0.5;
      const isNight = timeOfDay < 0.22 || timeOfDay > 0.78;
      const needsNightSleep = isNight && !agent.traits.includes('Tireless');

      if (agent.role === 'Oracle') {
        // Evaluate Sleep first
        if (agent.priorities.Sleep > 0 && (stats.fatigue < 85 || needsNightSleep)) {
          const home = getVillagerHousing(agent, mapData, tribe);
          const cell = mapData.grid[home.x]?.[home.z];
          const isShelter = cell?.structure?.type === 'Shelter' || cell?.structure?.type === 'Tent';
          const nighttimePriorityBonus = needsNightSleep ? -0.35 : 0.0;
          addCandidate('Sleep', home.x, home.z, agent.priorities.Sleep, (isShelter ? -0.25 : 0) + nighttimePriorityBonus);
        }
        // Evaluate Drink
        if (agent.priorities.Drink > 0 && stats.thirst < 85) {
          let bestX = -1, bestZ = -1, bestDist = 9999;
          let isWell = false;
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              const cell = mapData.grid[r][c];
              if (cell.structure?.type === 'WaterWell') {
                const d = Math.abs(r - x) + Math.abs(c - z);
                if (d < bestDist) {
                  bestDist = d;
                  bestX = r;
                  bestZ = c;
                  isWell = true;
                }
              } else if (cell.biome === 'water' && !isWell) {
                const d = Math.abs(r - x) + Math.abs(c - z);
                if (d < bestDist) {
                  bestDist = d;
                  bestX = r;
                  bestZ = c;
                }
              }
            }
          }
          if (bestX !== -1) {
            addCandidate('Drink', bestX, bestZ, agent.priorities.Drink, isWell ? -0.2 : 0);
          }
        }
        // Evaluate Eat
        if (agent.priorities.Eat > 0 && stats.hunger < 85) {
          if (mapData.stockpile.food > 0) {
            addCandidate('Eat', depotX, depotZ, agent.priorities.Eat, -0.1);
          } else {
            let bestX = -1, bestZ = -1, bestDist = 9999;
            for (let r = 0; r < size; r++) {
              for (let c = 0; c < size; c++) {
                const cell = mapData.grid[r][c];
                if (cell.resourceNode && cell.resourceNode.type === 'Berries' && cell.resourceNode.amount > 0 && cell.scouted) {
                  const d = Math.abs(r - x) + Math.abs(c - z);
                  if (d < bestDist) {
                    bestDist = d;
                    bestX = r;
                    bestZ = c;
                  }
                }
              }
            }
            if (bestX !== -1) {
              addCandidate('Eat', bestX, bestZ, agent.priorities.Eat, 0);
            }
          }
        }
        // If no urgent survival candidate, find Oracle buildings on the grid!
        if (available.length === 0) {
          const oracleStructures: { type: string; x: number; z: number }[] = [];
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              const cell = mapData.grid[r][c];
              if (cell.structure && !cell.construction) {
                const t = cell.structure.type;
                if (['ObservationPlatform', 'Observatory', 'RelicArchive', 'MeditationShrine', 'MapHall'].includes(t)) {
                  oracleStructures.push({ type: t, x: r, z: c });
                }
              }
            }
          }

          if (oracleStructures.length > 0) {
            const targetBuilding = oracleStructures[Math.floor(Math.random() * oracleStructures.length)];
            addCandidate('Scout', targetBuilding.x, targetBuilding.z, 2, -0.1);
            (agent as any).oracleActivityType = targetBuilding.type;
          } else {
            let fireplaceX = depotX, fireplaceZ = depotZ;
            let foundFireplace = false;
            for (let r = 0; r < size; r++) {
              for (let c = 0; c < size; c++) {
                if (mapData.grid[r][c].structure?.type === 'Fireplace') {
                  fireplaceX = r;
                  fireplaceZ = c;
                  foundFireplace = true;
                  break;
                }
              }
            }
            addCandidate('Scout', fireplaceX, fireplaceZ, 3, 0);
            (agent as any).oracleActivityType = foundFireplace ? 'Fireplace' : 'Depot';
          }
        }
      } else {
        // Evaluate 15 Job Types based on priorities (lower priority value e.g. 1 is highest priority score)
        
        // 1. Sleep: Villagers without the "Tireless" trait must sleep at night.
        if (agent.priorities.Sleep > 0 && (stats.fatigue < 85 || needsNightSleep)) {
          const home = getVillagerHousing(agent, mapData, tribe);
          const cell = mapData.grid[home.x]?.[home.z];
          const isShelter = cell?.structure?.type === 'Shelter' || cell?.structure?.type === 'Tent';
          
          // Give higher priority weight during night sleep to ensure they head straight home!
          const nighttimePriorityBonus = needsNightSleep ? -0.35 : 0.0;
          addCandidate('Sleep', home.x, home.z, agent.priorities.Sleep, (isShelter ? -0.25 : 0) + nighttimePriorityBonus);
        }

      // 2. Drink
      if (agent.priorities.Drink > 0 && stats.thirst < 85) {
        // Find water cell or WaterWell structure
        let bestX = -1, bestZ = -1, bestDist = 9999;
        let isWell = false;
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const cell = mapData.grid[r][c];
            if (cell.structure?.type === 'WaterWell') {
              const d = Math.abs(r - x) + Math.abs(c - z);
              if (d < bestDist) {
                bestDist = d;
                bestX = r;
                bestZ = c;
                isWell = true;
              }
            } else if (cell.biome === 'water' && !isWell) {
              const d = Math.abs(r - x) + Math.abs(c - z);
              if (d < bestDist) {
                bestDist = d;
                bestX = r;
                bestZ = c;
              }
            }
          }
        }
        if (bestX !== -1) {
          addCandidate('Drink', bestX, bestZ, agent.priorities.Drink, isWell ? -0.2 : 0);
        }
      }

      // 3. Eat
      if (agent.priorities.Eat > 0 && stats.hunger < 85) {
        if (mapData.stockpile.food > 0) {
          addCandidate('Eat', depotX, depotZ, agent.priorities.Eat, -0.1);
        } else {
          // direct berry chewing
          let bestX = -1, bestZ = -1, bestDist = 9999;
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              if (mapData.grid[r][c].hasShrub && mapData.grid[r][c].scouted) {
                const d = Math.abs(r - x) + Math.abs(c - z);
                if (d < bestDist) {
                  bestDist = d;
                  bestX = r;
                  bestZ = c;
                }
              }
            }
          }
          if (bestX !== -1) {
            addCandidate('Eat', bestX, bestZ, agent.priorities.Eat, 0);
          }
        }
      }

      // 4. Haul
      if (agent.priorities.Haul > 0) {
        if (carriage && carriage.amount > 0) {
          // must dump at depot
          addCandidate('Haul', depotX, depotZ, 0.4); // extremely urgent
        } else {
          // look for itemsOnGround
          let bestX = -1, bestZ = -1, bestDist = 9999;
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              if (mapData.grid[r][c].itemsOnGround && mapData.grid[r][c].scouted) {
                const d = Math.abs(r - x) + Math.abs(c - z);
                if (d < bestDist) {
                  bestDist = d;
                  bestX = r;
                  bestZ = c;
                }
              }
            }
          }
          if (bestX !== -1) {
            addCandidate('Haul', bestX, bestZ, agent.priorities.Haul, 0);
            (agent as any).haulSubJob = 'physical';
          } else {
            // Default to depot cleaning/sweeping to organize stockpiles and keep warehouses clean!
            addCandidate('Haul', depotX, depotZ, agent.priorities.Haul, 0.5); // lower priority than actual hauling
            (agent as any).haulSubJob = 'organizeStockpile';
          }
        }
      }

      // 5. Gather (Wood logs, rocks, shrubs, and custom Don't Starve resource nodes)
      if (agent.priorities.Gather > 0 && (!carriage || carriage.amount < 30)) {
        let bestX = -1, bestZ = -1, bestDist = 9999;
        const thresholdMap = mapData.autoGatherThresholds || {};
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const cell = mapData.grid[r][c];
            const hasNodeToGather = cell.resourceNode && cell.resourceNode.amount > 0;
            
            let satisfiesAutoGather = false;
            if (cell.hasTree) {
              const limit = thresholdMap['wood'] || 0;
              if (limit > 0 && mapData.stockpile.wood < limit) {
                satisfiesAutoGather = true;
              }
            }
            if (cell.hasRock) {
              const limit = thresholdMap['stone'] || 0;
              if (limit > 0 && mapData.stockpile.stone < limit) {
                satisfiesAutoGather = true;
              }
            }
            if (cell.hasShrub) {
              const limitBerries = thresholdMap['berries'] || 0;
              const limitFood = thresholdMap['food'] || 0;
              if ((limitBerries > 0 && (mapData.stockpile as any).berries < limitBerries) ||
                  (limitFood > 0 && mapData.stockpile.food < limitFood)) {
                satisfiesAutoGather = true;
              }
            }
            if (hasNodeToGather && cell.resourceNode) {
              const nodeType = cell.resourceNode.type;
              const typeMap: Record<string, string> = {
                Berries: 'berries',
                Roots: 'roots',
                Mushrooms: 'mushrooms',
                Meat: 'meat',
                Wood: 'wood',
                Stone: 'stone',
                Fiber: 'fiber',
                Bone: 'bone',
                Dew: 'dew',
                ReservoirWater: 'reservoirWater',
                Rainwater: 'rainwater',
                Relics: 'relics',
                AncientMaterials: 'ancientMaterials',
                Copper: 'copper',
                Silver: 'silver',
                Gold: 'gold',
                Iron: 'iron',
              };
              const rKey = typeMap[nodeType] || 'wood';
              const limit = thresholdMap[rKey] || 0;
              
              const isFood = ['Berries', 'Roots', 'Mushrooms', 'Meat'].includes(nodeType);
              const limitFood = thresholdMap['food'] || 0;
              
              if ((limit > 0 && ((mapData.stockpile as any)[rKey] ?? 0) < limit) ||
                  (isFood && limitFood > 0 && mapData.stockpile.food < limitFood)) {
                satisfiesAutoGather = true;
              }
            }

            if ((cell.hasTree || cell.hasRock || cell.hasShrub || hasNodeToGather) && cell.scouted && (cell.gatherDesignated || satisfiesAutoGather)) {
              const d = Math.abs(r - x) + Math.abs(c - z);
              if (d < bestDist) {
                bestDist = d;
                bestX = r;
                bestZ = c;
              }
            }
          }
        }
        if (bestX !== -1) {
          addCandidate('Gather', bestX, bestZ, agent.priorities.Gather, 0);
        }
      }

      // 6. Hunt / Fisherman / Water collection (Wild animals & Lake/Well interaction)
      if (agent.priorities.Hunt > 0) {
        let bestX = -1, bestZ = -1, bestDist = 9999;
        let jobMode: 'hunt' | 'fish' | 'water' = 'hunt';

        // 6a. Search for wild animals to hunt
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const cell = mapData.grid[r][c];
            if (cell.wildAnimal && !cell.wildAnimal.isDead && cell.scouted) {
              const d = Math.abs(r - x) + Math.abs(c - z);
              if (d < bestDist) {
                bestDist = d;
                bestX = r;
                bestZ = c;
                jobMode = 'hunt';
              }
            }
          }
        }

        // 6b. If no game to narrow down, search for lakes or wells to fish/fetch water
        if (bestX === -1) {
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              const cell = mapData.grid[r][c];
              if (cell.scouted) {
                if (cell.biome === 'water') {
                  const d = Math.abs(r - x) + Math.abs(c - z);
                  if (d < bestDist) {
                    bestDist = d;
                    bestX = r;
                    bestZ = c;
                    jobMode = 'fish';
                  }
                } else if (cell.structure && cell.structure.type === 'WaterWell') {
                  const d = Math.abs(r - x) + Math.abs(c - z);
                  if (d < bestDist) {
                    bestDist = d;
                    bestX = r;
                    bestZ = c;
                    jobMode = 'water';
                  }
                }
              }
            }
          }
        }

        if (bestX !== -1) {
          let walkX = bestX;
          let walkZ = bestZ;
          if (jobMode === 'fish') {
            const neighbors = [
              { r: bestX - 1, c: bestZ },
              { r: bestX + 1, c: bestZ },
              { r: bestX, c: bestZ - 1 },
              { r: bestX, c: bestZ + 1 },
              { r: bestX - 1, c: bestZ - 1 },
              { r: bestX - 1, c: bestZ + 1 },
              { r: bestX + 1, c: bestZ - 1 },
              { r: bestX + 1, c: bestZ + 1 },
            ];
            for (const n of neighbors) {
              if (n.r >= 0 && n.r < size && n.c >= 0 && n.c < size) {
                const cell = mapData.grid[n.r]?.[n.c];
                if (cell && cell.biome !== 'water') {
                  walkX = n.r;
                  walkZ = n.c;
                  break;
                }
              }
            }
          }
          addCandidate('Hunt', walkX, walkZ, agent.priorities.Hunt, -0.05);
          (agent as any).huntSubJob = jobMode;
        }
      }

      // 7. Build (Blueprints & Dismantling)
      if (agent.priorities.Build > 0) {
        let bestX = -1, bestZ = -1, bestDist = 9999;
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const cell = mapData.grid[r][c];
            // Skip child tiles of multi-tile structures to ensure builders target the 2x2 parent tile directly!
            if ((cell as any).isMultiTileChildOf) continue;

            const hasBuildOrDismantle = cell.construction || (cell.structure && cell.structure.dismantling);
            if (hasBuildOrDismantle && cell.scouted) {
              const d = Math.abs(r - x) + Math.abs(c - z);
              if (d < bestDist) {
                bestDist = d;
                bestX = r;
                bestZ = c;
              }
            }
          }
        }
        if (bestX !== -1) {
          addCandidate('Build', bestX, bestZ, agent.priorities.Build, -0.1);
        }
      }

      // 8. Farm (Sow, Tend, Harvest crops)
      if (agent.priorities.Farm > 0) {
        let bestX = -1, bestZ = -1, bestDist = 9999;
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (mapData.grid[r][c].farmCrop && mapData.grid[r][c].scouted) {
              const d = Math.abs(r - x) + Math.abs(c - z);
              if (d < bestDist) {
                bestDist = d;
                bestX = r;
                bestZ = c;
              }
            }
          }
        }
        if (bestX !== -1) {
          addCandidate('Farm', bestX, bestZ, agent.priorities.Farm, 0);
        }
      }

      // 9. Scout (Fog of War blocks)
      if (agent.priorities.Scout > 0) {
        let bestX = -1, bestZ = -1, bestDist = 9999;
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (!mapData.grid[r][c].scouted) {
              const d = Math.abs(r - x) + Math.abs(c - z);
              if (d < bestDist) {
                bestDist = d;
                bestX = r;
                bestZ = c;
              }
            }
          }
        }
        if (bestX !== -1) {
          addCandidate('Scout', bestX, bestZ, agent.priorities.Scout, 0.05);
        }
      }

      // 10. Repair (Damaged structures)
      if (agent.priorities.Repair > 0) {
        let bestX = -1, bestZ = -1, bestDist = 9999;
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const structure = mapData.grid[r][c].structure;
            if (structure && structure.condition < 95 && mapData.grid[r][c].scouted) {
              const d = Math.abs(r - x) + Math.abs(c - z);
              if (d < bestDist) {
                bestDist = d;
                bestX = r;
                bestZ = c;
              }
            }
          }
        }
        if (bestX !== -1) {
          addCandidate('Repair', bestX, bestZ, agent.priorities.Repair, 0.1);
          (agent as any).repairSubJob = 'physical';
        } else {
          // Keep depot warehouse in check if nothing is broken!
          addCandidate('Repair', depotX, depotZ, agent.priorities.Repair, 0.6); // lower priority than actual repairs
          (agent as any).repairSubJob = 'organizeStockpile';
        }
      }
      }

      // Sort by priority value (lower score values have higher precedence)
      available.sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        const distA = Math.abs(a.x - x) + Math.abs(a.z - z);
        const distB = Math.abs(b.x - x) + Math.abs(b.z - z);
        return distA - distB;
      });

      let chosen = available[0];
      if (isSweepingFallback && available.length > 0) {
        const nonFallback = available.find(cand => {
          const isCandFallback = (cand.type === 'Haul' && cand.x === depotX && cand.z === depotZ) ||
                                 (cand.type === 'Repair' && cand.x === depotX && cand.z === depotZ);
          return !isCandFallback;
        });
        if (nonFallback) {
          chosen = nonFallback;
        }
      }

      if (chosen) {
        const isChosenFallback = (chosen.type === 'Haul' && chosen.x === depotX && chosen.z === depotZ) ||
                                 (chosen.type === 'Repair' && chosen.x === depotX && chosen.z === depotZ);
        
        let doSwitch = false;
        if (!activeJobType || !jobTargetCoords) {
          doSwitch = true;
        } else if (isSweepingFallback && !isChosenFallback) {
          doSwitch = true;
        } else if (activeJobType && jobTargetCoords) {
          // Compare priority score levels: lower is higher priority
          const currentJobPriority = agent.priorities[activeJobType] ?? 99;
          if (chosen.score < currentJobPriority) {
            doSwitch = true;
          }
        }

        if (doSwitch) {
          activeJobType = chosen.type;
          jobTargetCoords = { x: chosen.x, z: chosen.z };
          workProgress = 0;
        }
      } else {
        if (!activeJobType || !jobTargetCoords) {
          activeJobType = null;
          jobTargetCoords = null;
          workProgress = 0;
        }
      }
    }

    // --- 4. EXECUTION OF TARGETED JOB ---
    if (activeJobType && jobTargetCoords) {
      const destX = jobTargetCoords.x;
      const destZ = jobTargetCoords.z;
      const distance = Math.sqrt((destX - x) ** 2 + (destZ - z) ** 2);

      if (distance < 0.6) {
        // Execution
        // Determine a dynamic speed multiplier based on the relevant specialization level (15% faster per level)
        let speedMultiplier = 1.0;
        const cell = mapData.grid[destX]?.[destZ];

        if (activeJobType === 'Scout') {
          const lvl = agent.skills.Scout?.level ?? 1;
          speedMultiplier = 1.0 + (lvl - 1) * 0.15;
          if (hasStructureInVillage(mapData, 'ScoutsLookout')) {
            speedMultiplier *= 1.25;
          }
        } else if (activeJobType === 'Farm') {
          const lvl = agent.skills.Farmer?.level ?? 1;
          speedMultiplier = 1.0 + (lvl - 1) * 0.15;
          if (hasStructureInVillage(mapData, 'FarmersGranary')) {
            speedMultiplier *= 1.25;
          }
        } else if (activeJobType === 'Gather') {
          let skillName: TribespersonRole = 'Gatherer';
          if (cell?.resourceNode) {
            const nodeType = cell.resourceNode.type;
            if (['Copper', 'Silver', 'Gold', 'Iron', 'Bone', 'Stone'].includes(nodeType)) {
              skillName = 'Artisan';
            } else if (['Relics', 'AncientMaterials'].includes(nodeType)) {
              skillName = 'Scout';
            } else {
              skillName = 'Gatherer';
            }
          } else if (cell?.hasRock) {
            skillName = 'Artisan';
          } else {
            skillName = 'Gatherer';
          }
          const lvl = agent.skills[skillName]?.level ?? 1;
          speedMultiplier = 1.0 + (lvl - 1) * 0.15;
          if (skillName === 'Gatherer' && hasStructureInVillage(mapData, 'GatherersPantry')) {
            speedMultiplier *= 1.25;
          }
          if (skillName === 'Artisan' && hasStructureInVillage(mapData, 'ArtisansWorkshop')) {
            speedMultiplier *= 1.25;
          }
        } else if (activeJobType === 'Hunt') {
          const lvl = agent.skills.Hunter?.level ?? 1;
          speedMultiplier = 1.0 + (lvl - 1) * 0.15;
          if (hasStructureInVillage(mapData, 'HuntersHut')) {
            speedMultiplier *= 1.25;
          }
        } else if (activeJobType === 'Repair' || activeJobType === 'Build') {
          const lvl = agent.skills.Builder?.level ?? 1;
          speedMultiplier = 1.0 + (lvl - 1) * 0.15;
          if (hasStructureInVillage(mapData, 'BuildersLodge')) {
            speedMultiplier *= 1.25;
          }
        }

        speedMultiplier *= speedModifier;
        workProgress += deltaTime * speedMultiplier * 8.0;

        if (activeJobType === 'Sleep') {
          const isSheltered = cell?.structure?.type === 'Shelter';
          statusText = isSheltered ? '💤 Resting inside cozy Shelter...' : '💤 Resting under open sky...';
          const rate = isSheltered ? 3.0 : 1.35;
          stats.fatigue = Math.min(100, stats.fatigue + 45 * rate * deltaTime);
          stats.morale = Math.min(100, stats.morale + 1.5 * deltaTime);
          if (stats.fatigue >= 99) {
            addLog(`🌅 ${agent.name} is fully rested and ready for priorities.`, 'info');
            activeJobType = null;
            jobTargetCoords = null;
          }
        } 
        
        else if (activeJobType === 'Drink') {
          const isWell = cell?.structure?.type === 'WaterWell';
          statusText = isWell ? '💧 Drinking cold well water...' : '💧 Scoop and drinking from lake...';
          const rate = isWell ? 5.0 : 2.5;
          stats.thirst = Math.min(100, stats.thirst + 40 * rate * deltaTime);
          if (stats.thirst >= 99) {
            activeJobType = null;
            jobTargetCoords = null;
          }
        } 
        
        else if (activeJobType === 'Eat') {
          if (destX === Math.floor(size / 2) && destZ === Math.floor(size / 2) && mapData.stockpile.food > 0) {
            statusText = '🍖 Savoring stockpile tribal meals...';
            
            // Select food item from stockpile to eat
            const availableFoods: ('berries' | 'roots' | 'mushrooms' | 'meat')[] = [];
            if (mapData.stockpile.berries > 0) availableFoods.push('berries');
            if (mapData.stockpile.roots > 0) availableFoods.push('roots');
            if (mapData.stockpile.mushrooms > 0) availableFoods.push('mushrooms');
            if (mapData.stockpile.meat > 0) availableFoods.push('meat');

            if (availableFoods.length > 0) {
              // Sort by lowest freshness so they consume what is about to spoil first
              availableFoods.sort((a, b) => {
                const freshA = mapData.stockpile[`${a}Fresh` as keyof typeof mapData.stockpile] as number;
                const freshB = mapData.stockpile[`${b}Fresh` as keyof typeof mapData.stockpile] as number;
                return freshA - freshB;
              });

              const chosenFood = availableFoods[0];
              const freshness = mapData.stockpile[`${chosenFood}Fresh` as keyof typeof mapData.stockpile] as number;

              // Consume 1 unit
              mapData.stockpile[chosenFood]--;
              
              // Recalculate summary food
              mapData.stockpile.food = mapData.stockpile.berries + mapData.stockpile.roots + mapData.stockpile.mushrooms + mapData.stockpile.meat;

              stats.hunger = 100;

              // Spoilage effects on morale and health!
              const hasIronStomach = agent.traits.includes('Iron Stomach');

              if (freshness < 15) {
                if (hasIronStomach) {
                  stats.morale = Math.max(0, stats.morale - 4);
                  stats.health = Math.max(10, stats.health - 2);
                  addLog(`🤢 ${agent.name} ate stale/rancid ${chosenFood}, but their Iron Stomach shrugged it off!`, 'warning');
                } else {
                  stats.morale = Math.max(0, stats.morale - 25);
                  stats.health = Math.max(5, stats.health - 18);
                  addLog(`🤮 ${agent.name} got food poisoning from eating ruined, spoiled ${chosenFood}!`, 'warning');
                }
              } else if (freshness < 40) {
                if (!hasIronStomach) {
                  stats.morale = Math.max(0, stats.morale - 10);
                  stats.health = Math.max(10, stats.health - 3);
                  addLog(`🤢 ${agent.name} dined on stale, souring ${chosenFood}. Feeling slightly sick.`, 'warning');
                } else {
                  addLog(`😋 ${agent.name} consumed stale ${chosenFood} with absolute indifference.`, 'info');
                }
              } else {
                stats.morale = Math.min(100, stats.morale + 12);
                stats.health = Math.min(100, stats.health + 4);
              }
            } else {
              mapData.stockpile.food = Math.max(0, mapData.stockpile.food - 1);
              stats.hunger = 100;
            }

            activeJobType = null;
            jobTargetCoords = null;
          } else if (cell?.hasShrub) {
            statusText = '🍓 Gathering and eating wild berries...';
            stats.hunger = Math.min(100, stats.hunger + 30 * deltaTime);
            if (stats.hunger >= 98) {
              activeJobType = null;
              jobTargetCoords = null;
            }
          } else {
            statusText = '⚠️ Starving! Stockpile has no food resources!';
            activeJobType = null;
            jobTargetCoords = null;
          }
        } 
        
        else if (activeJobType === 'Scout') {
          if (agent.role === 'Oracle') {
            const strucType = cell?.structure?.type;
            const lvl = agent.skills.Oracle?.level ?? 1;

            if (strucType === 'ObservationPlatform') {
              statusText = `🔮 Observation Platform: Oracle deciphering cosmic skies & wind vectors (Lvl ${lvl})...`;
              // Generate research points (Knowledge)
              const rpRate = 0.25 * lvl;
              mapData.researchPoints = Math.round((mapData.researchPoints + rpRate * deltaTime) * 100) / 100;
              // Training XP
              awardSkillXP(agent, 'Oracle', 24 * deltaTime, mapData, addLog, hasMentorNearby);
            } 
            else if (strucType === 'Observatory') {
              statusText = `🔭 Observatory: Studying celestial stars, galaxies, and predicting the storm direction (Lvl ${lvl})...`;
              const rpRate = 0.45 * lvl;
              mapData.researchPoints = Math.round((mapData.researchPoints + rpRate * deltaTime) * 100) / 100;
              awardSkillXP(agent, 'Oracle', 30 * deltaTime, mapData, addLog, hasMentorNearby);
            } 
            else if (strucType === 'RelicArchive') {
              statusText = `📜 Relic Archive: Translating ancient texts & uncovering precursor blueprints (Lvl ${lvl})...`;
              const rpRate = 0.55 * lvl;
              mapData.researchPoints = Math.round((mapData.researchPoints + rpRate * deltaTime) * 100) / 100;
              awardSkillXP(agent, 'Oracle', 35 * deltaTime, mapData, addLog, hasMentorNearby);
            } 
            else if (strucType === 'MeditationShrine') {
              statusText = `🧘 Meditation Shrine: In transcendental harmony with pure spatial currents (Lvl ${lvl})...`;
              const rpRate = 0.35 * lvl;
              mapData.researchPoints = Math.round((mapData.researchPoints + rpRate * deltaTime) * 100) / 100;
              awardSkillXP(agent, 'Oracle', 28 * deltaTime, mapData, addLog, hasMentorNearby);
            } 
            else if (strucType === 'MapHall') {
              statusText = `🗺️ Map Hall: Drawing precise terrain contours & plotting future paths (Lvl ${lvl})...`;
              const rpRate = 0.4 * lvl;
              mapData.researchPoints = Math.round((mapData.researchPoints + rpRate * deltaTime) * 100) / 100;
              awardSkillXP(agent, 'Oracle', 32 * deltaTime, mapData, addLog, hasMentorNearby);
            } 
            else {
              // Idle campfire contemplation
              statusText = `🔮 Fireplace: Oracle staring into fire to decode future prophecies (Lvl ${lvl})...`;
              const rpRate = 0.12 * lvl;
              mapData.researchPoints = Math.round((mapData.researchPoints + rpRate * deltaTime) * 100) / 100;
              awardSkillXP(agent, 'Oracle', 12 * deltaTime, mapData, addLog, hasMentorNearby);
            }

            // After doing research, cycle action targets to refresh or sleep
            if (workProgress > 4.5) {
              activeJobType = null;
              jobTargetCoords = null;
              workProgress = 0;
            }
          } else {
            statusText = '🗺️ Mapping coordinates...';
            if (workProgress > 2.0) {
              const rad = 4;
              for (let dx = -rad; dx <= rad; dx++) {
                for (let dz = -rad; dz <= rad; dz++) {
                  const nx = destX + dx;
                  const nz = destZ + dz;
                  if (nx >= 0 && nx < size && nz >= 0 && nz < size) {
                    mapData.grid[nx][nz].scouted = true;
                  }
                }
              }
              addLog(`🗺️ ${agent.name} charted and scouted coordinates [${destX}, ${destZ}]!`, 'info');
              activeJobType = null;
              jobTargetCoords = null;

              // Scout skill gain
              awardSkillXP(agent, 'Scout', 40, mapData, addLog, hasMentorNearby);
            }
          }
        } 
        
        else if (activeJobType === 'Gather') {
          if (cell) {
            if (cell.resourceNode && cell.resourceNode.amount > 0) {
              const node = cell.resourceNode;
              
              // Determine status text and skills based on node type
              let nodeSkill: 'Gatherer' | 'Artisan' | 'Scout' = 'Gatherer';
              let actionText = 'Harvesting resource node...';
              let harvestLimit = 15;
              
              const typeMap: Record<string, string> = {
                Berries: 'berries',
                Roots: 'roots',
                Mushrooms: 'mushrooms',
                Meat: 'meat',
                Wood: 'wood',
                Stone: 'stone',
                Fiber: 'fiber',
                Bone: 'bone',
                Dew: 'dew',
                ReservoirWater: 'reservoirWater',
                Rainwater: 'rainwater',
                Relics: 'relics',
                AncientMaterials: 'ancientMaterials',
                Copper: 'copper',
                Silver: 'silver',
                Gold: 'gold',
                Iron: 'iron',
              };

              const resolvedType = typeMap[node.type] || 'wood';

              switch (node.type) {
                case 'Berries':
                  actionText = '🍇 Plucking ripe wild berries...';
                  harvestLimit = 15;
                  nodeSkill = 'Gatherer';
                  break;
                case 'Roots':
                  actionText = '🥕 Digging up edible tubers and roots...';
                  harvestLimit = 10;
                  nodeSkill = 'Gatherer';
                  break;
                case 'Mushrooms':
                  actionText = '🍄 Harvesting forest mushrooms...';
                  harvestLimit = 8;
                  nodeSkill = 'Gatherer';
                  break;
                case 'Wood':
                  actionText = '🪓 Felling pine timber...';
                  harvestLimit = 30;
                  break;
                case 'Stone':
                  actionText = '⛏️ Quarrying stone slabs...';
                  harvestLimit = 25;
                  nodeSkill = 'Artisan';
                  break;
                case 'Copper':
                  actionText = '⛏️ Quarrying rich copper ore veins...';
                  harvestLimit = 15;
                  nodeSkill = 'Artisan';
                  break;
                case 'Silver':
                  actionText = '⛏️ Chipping at glittering silver ore strands...';
                  harvestLimit = 12;
                  nodeSkill = 'Artisan';
                  break;
                case 'Gold':
                  actionText = '⛏️ Extracting shining native gold flakes...';
                  harvestLimit = 8;
                  nodeSkill = 'Artisan';
                  break;
                case 'Iron':
                  actionText = '⛏️ Breaking heavy hematite iron ore...';
                  harvestLimit = 18;
                  nodeSkill = 'Artisan';
                  break;
                case 'Fiber':
                  actionText = '🌾 Sickling sedge fiber grass...';
                  harvestLimit = 15;
                  nodeSkill = 'Gatherer';
                  break;
                case 'Bone':
                  actionText = '🦴 Scavenging ancient skeleton bones...';
                  harvestLimit = 8;
                  nodeSkill = 'Artisan';
                  break;
                case 'Dew':
                  actionText = '💧 Collecting morning plant dew...';
                  harvestLimit = 6;
                  nodeSkill = 'Gatherer';
                  break;
                case 'ReservoirWater':
                  actionText = '💧 Scooping reservoir water...';
                  harvestLimit = 20;
                  nodeSkill = 'Gatherer';
                  break;
                case 'Rainwater':
                  actionText = '💧 Collecting hollowed rainwater...';
                  harvestLimit = 15;
                  nodeSkill = 'Gatherer';
                  break;
                case 'Relics':
                  actionText = '🏺 Dredging ancient relic artifacts...';
                  harvestLimit = 1;
                  nodeSkill = 'Scout';
                  break;
                case 'AncientMaterials':
                  actionText = '⚙️ Salvaging ancient metallic debris...';
                  harvestLimit = 3;
                  nodeSkill = 'Scout';
                  break;
              }

              statusText = actionText;

              // Complete harvest work
              const workTarget = node.type === 'Relics' || node.type === 'AncientMaterials' ? 4.0 : 2.2;
              if (workProgress > workTarget) {
                const qtyToHarvest = Math.min(node.amount, harvestLimit);
                node.amount -= qtyToHarvest;
                
                // Set carriage
                carriage = {
                  type: resolvedType as any,
                  amount: qtyToHarvest
                };

                // Clear visual cues if depleted
                if (node.amount <= 0) {
                  if (node.type === 'Berries') cell.hasShrub = false;
                  else if (node.type === 'Wood') cell.hasTree = false;
                  else if (['Stone', 'Copper', 'Silver', 'Gold', 'Iron'].includes(node.type)) cell.hasRock = false;
                }
                cell.gatherDesignated = false;

                // Immediately return resource!
                activeJobType = 'Haul';
                jobTargetCoords = { x: Math.floor(size / 2), z: Math.floor(size / 2) };
                workProgress = 0;
                addLog(`🎯 ${agent.name} harvested +${qtyToHarvest} ${node.type}! Hauling cargo...`, 'info');

                // Skill leveling
                awardSkillXP(agent, nodeSkill, 35, mapData, addLog, hasMentorNearby);
              }
            } else if (cell.hasTree) {
              statusText = '🪓 Felling pine logger logs...';
              if (workProgress > 2.8) {
                cell.hasTree = false;
                cell.gatherDesignated = false;
                cell.inspectableName = 'Fertile Soil Grassland';
                cell.itemsOnGround = { type: 'wood', amount: 30 };
                carriage = { type: 'wood', amount: 30 };
                
                // Immediately return resource!
                activeJobType = 'Haul';
                jobTargetCoords = { x: Math.floor(size / 2), z: Math.floor(size / 2) };
                workProgress = 0;
                addLog(`🪓 ${agent.name} felled a log tree! Cargo loaded.`, 'info');

                awardSkillXP(agent, 'Gatherer', 30, mapData, addLog, hasMentorNearby);
              }
            } else if (cell.hasRock) {
              statusText = '⛏️ Splitting mountain granite quarry...';
              if (workProgress > 3.6) {
                cell.hasRock = false;
                cell.gatherDesignated = false;
                cell.inspectableName = 'Fertile Soil Grassland';
                cell.itemsOnGround = { type: 'stone', amount: 25 };
                carriage = { type: 'stone', amount: 25 };
                
                activeJobType = 'Haul';
                jobTargetCoords = { x: Math.floor(size / 2), z: Math.floor(size / 2) };
                workProgress = 0;
                addLog(`⛏️ ${agent.name} quarried stones! Cargo loaded.`, 'info');

                awardSkillXP(agent, 'Artisan', 30, mapData, addLog, hasMentorNearby);
              }
            } else if (cell.hasShrub) {
              statusText = '🍇 Plucking ripe berries...';
              if (workProgress > 2.0) {
                cell.hasShrub = false;
                cell.gatherDesignated = false;
                cell.inspectableName = 'Fertile Soil Grassland';
                cell.itemsOnGround = { type: 'food', amount: 20 };
                carriage = { type: 'food', amount: 20 };
                
                activeJobType = 'Haul';
                jobTargetCoords = { x: Math.floor(size / 2), z: Math.floor(size / 2) };
                workProgress = 0;
                addLog(`🍇 ${agent.name} gathered ripe berries! Cargo loaded.`, 'info');

                awardSkillXP(agent, 'Gatherer', 25, mapData, addLog, hasMentorNearby);
              }
            } else {
              activeJobType = null;
              jobTargetCoords = null;
            }
          }
        } 
        
        else if (activeJobType === 'Build') {
          if (cell?.construction) {
            statusText = `🔨 hammer building ${cell.construction.type} (${Math.round(cell.construction.progress)}%)...`;
            const buildFactor = (14 + agent.attributes.strength * 1.5 + agent.skills.Builder.level * 3) * speedMultiplier * deltaTime;
            cell.construction.progress += buildFactor;

            // Sync construction progress to 2x2 children
            if (cell.construction.type === 'Shelter') {
              const childOffsets = [[1, 0], [0, 1], [1, 1]];
              childOffsets.forEach(([dx, dz]) => {
                const cCell = mapData.grid[cell.x + dx]?.[cell.z + dz];
                if (cCell && cCell.construction) {
                  cCell.construction.progress = cell.construction.progress;
                }
              });
            }

            if (cell.construction.progress >= 100) {
              const bType = cell.construction.type;
              cell.construction = null;
              cell.structure = {
                type: bType,
                condition: 100,
                maxCondition: 100,
              };
              cell.inspectableName = `Colony structure: ${bType}`;

              // Finalise 2x2 children on construction completion
              if (bType === 'Shelter') {
                const childOffsets = [[1, 0], [0, 1], [1, 1]];
                childOffsets.forEach(([dx, dz]) => {
                  const cCell = mapData.grid[cell.x + dx]?.[cell.z + dz];
                  if (cCell) {
                    cCell.construction = null;
                    cCell.structure = {
                      type: 'Shelter',
                      condition: 100,
                      maxCondition: 100,
                    };
                    (cCell as any).isMultiTileChildOf = { x: cell.x, z: cell.z };
                    cCell.inspectableName = `Colony structure: Shelter (Annex)`;
                  }
                });
              }

              addLog(`🏗️ Completed structural construction of: ${bType}!`, 'info');
              activeJobType = null;
              jobTargetCoords = null;

              awardSkillXP(agent, 'Builder', 50, mapData, addLog, hasMentorNearby);
            }
          } else if (cell?.structure && cell.structure.dismantling) {
            const structType = cell.structure.type;
            if (cell.structure.dismantleProgress === undefined) {
              cell.structure.dismantleProgress = 0;
            }
            statusText = `🧹 deconstructing & packing ${structType} (${Math.round(cell.structure.dismantleProgress)}%)...`;
            const dismantleFactor = (15 + agent.attributes.strength * 1.0 + agent.skills.Builder.level * 2.5) * speedMultiplier * deltaTime;
            cell.structure.dismantleProgress += dismantleFactor;

            if (cell.structure.dismantleProgress >= 100) {
              const refundCosts: Record<string, { wood: number; stone: number; food: number; gold?: number; silver?: number }> = {
                Tent: { wood: 25, stone: 0, food: 0 },
                Shrine: { wood: 15, stone: 25, food: 0 },
                StorageBin: { wood: 25, stone: 10, food: 0 },
                ArtisanBench: { wood: 30, stone: 10, food: 0 },
                ScienceMachine: { wood: 40, stone: 40, food: 0 },
                RuinousAltar: { wood: 50, stone: 80, food: 0, gold: 5, silver: 3 },
                WaterWell: { wood: 10, stone: 30, food: 0 },
                Shelter: { wood: 40, stone: 0, food: 0 },
                LogWall: { wood: 5, stone: 0, food: 0 },
                WatchTower: { wood: 40, stone: 60, food: 0 },
                GatherersPantry: { wood: 35, stone: 15, food: 0 },
                HuntersHut: { wood: 40, stone: 10, food: 0 },
                BuildersLodge: { wood: 50, stone: 10, food: 0 },
                FarmersGranary: { wood: 25, stone: 25, food: 0 },
                ScoutsLookout: { wood: 30, stone: 20, food: 0 },
                HealersSanctum: { wood: 30, stone: 30, food: 0 },
                ArtisansWorkshop: { wood: 40, stone: 20, food: 0 }
              };

              const costs = refundCosts[structType] || { wood: 5, stone: 10, food: 0 };
              mapData.stockpile.wood += costs.wood;
              mapData.stockpile.stone += costs.stone;
              mapData.stockpile.food += costs.food;
              if (costs.gold) mapData.stockpile.gold = (mapData.stockpile.gold ?? 0) + costs.gold;
              if (costs.silver) mapData.stockpile.silver = (mapData.stockpile.silver ?? 0) + costs.silver;

              const goldMsg = costs.gold ? `, +${costs.gold} Gold` : '';
              const silverMsg = costs.silver ? `, +${costs.silver} Silver` : '';
              addLog(`🧹 ${agent.name} fully dismantled and packed the ${structType}! Materials refunded: +${costs.wood} Wood, +${costs.stone} Stone, +${costs.food} Food${goldMsg}${silverMsg}.`, 'info');
              
              // Clear 2x2 children if the structure being dismantled is a Shelter 
              if (structType === 'Shelter') {
                const childOffsets = [[1, 0], [0, 1], [1, 1]];
                childOffsets.forEach(([dx, dz]) => {
                  const cCell = mapData.grid[cell.x + dx]?.[cell.z + dz];
                  if (cCell) {
                    cCell.structure = null;
                    delete (cCell as any).isMultiTileChildOf;
                    cCell.inspectableName = 'Fertile Soil Grassland';
                  }
                });
                delete (cell as any).isMultiTileParent;
              }

              cell.structure = null;
              cell.inspectableName = 'Fertile Soil Grassland';
              activeJobType = null;
              jobTargetCoords = null;

              awardSkillXP(agent, 'Builder', 35, mapData, addLog, hasMentorNearby);
            }
          } else {
            activeJobType = null;
            jobTargetCoords = null;
          }
        } 
        
        else if (activeJobType === 'Farm') {
          if (cell?.farmCrop) {
            const crop = cell.farmCrop;
            if (crop.stage === 'sown') {
              statusText = '🌱 Sowing seeds on field plots...';
              crop.progress += 25 * speedMultiplier * deltaTime;
              if (crop.progress >= 100) {
                crop.stage = 'growing';
                crop.progress = 0;
                addLog(`🌱 Crops sowed by ${agent.name} entered incubation.`, 'info');
              }
            } else if (crop.stage === 'growing') {
              statusText = '🌿 Watering crops, accelerated growth...';
              crop.progress += 30 * speedMultiplier * deltaTime; // quickening
              if (crop.progress >= 100) {
                crop.stage = 'harvestable';
                crop.progress = 100;
              }
            } else if (crop.stage === 'harvestable') {
              statusText = '🌾 Sickle harvesting ripe fields...';
              if (workProgress > 2.0) {
                cell.farmCrop = null;
                cell.itemsOnGround = { type: 'food', amount: 30 };
                carriage = { type: 'food', amount: 30 };
                
                activeJobType = 'Haul';
                jobTargetCoords = { x: Math.floor(size / 2), z: Math.floor(size / 2) };
                workProgress = 0;
                addLog(`🌾 Harvested ripe crops! Cargo loaded.`, 'info');

                awardSkillXP(agent, 'Farmer', 40, mapData, addLog, hasMentorNearby);
              }
            }
          } else {
            activeJobType = null;
            jobTargetCoords = null;
          }
        } 
        
        else if (activeJobType === 'Hunt') {
          const subJob = (agent as any).huntSubJob || 'hunt';
          if (subJob === 'hunt') {
            // Find target animal in range or track it!
            let targetAnimal: any = null;
            const targetId = (agent as any).assignedHuntAnimalId;

            if (targetId && mapData.animals) {
              targetAnimal = mapData.animals.find(a => a.id === targetId && !a.isDead) || null;
            }

            // Fallback: search for any wild animal on the current cell
            if (!targetAnimal && cell?.wildAnimal && !cell.wildAnimal.isDead && mapData.animals) {
              targetAnimal = mapData.animals.find(a => a.id === cell.wildAnimal?.id && !a.isDead) || null;
            }

            if (targetAnimal) {
              // Physically track the animal coordinates! Update job target coordinates on the fly!
              jobTargetCoords = { x: Math.round(targetAnimal.x), z: Math.round(targetAnimal.z) };

              const dx = targetAnimal.x - agent.x;
              const dz = targetAnimal.z - agent.z;
              const rangeSq = dx * dx + dz * dz;

              // Hunters weapon choice & shooting range:
              // Hunters use spear at 1.5 blocks, or bow (if role is Scout or level 4+) at 4.5 blocks!
              const hLevel = agent.skills.Hunter?.level || 1;
              const isRanged = agent.role === 'Scout' || hLevel >= 4;
              const attackRange = isRanged ? 4.5 : 1.4;

              if (rangeSq <= attackRange * attackRange) {
                // Within range! Stop moving and enter Aim/Attack stance
                (agent as any).isAiming = true;
                
                statusText = `${isRanged ? '🏹 Aiming Bow' : '🗡️ Thrusting Spear'} at wild ${targetAnimal.type} (HP: ${Math.round(targetAnimal.HP)})...`;
                
                if (workProgress > 1.2) {
                  // Fire shot!
                  const hasHunterHut = hasStructureInVillage(mapData, 'HuntersHut');
                  const dmgMult = (hasHunterHut ? 1.25 : 1.0) * (isRanged ? 1.15 : 1.0);
                  const dmg = (18 + agent.attributes.strength * 2.0 + hLevel * 4.5) * dmgMult * deltaTime;
                  
                  targetAnimal.HP -= dmg;
                  targetAnimal.fear = 100; // Explodes in fear and flees!
                  
                  // Visual tracer projectile indicator (handled in Canvas rendering)
                  if (isRanged) {
                     (agent as any).projectileTracer = {
                       fromX: agent.x,
                       fromZ: agent.z,
                       toX: targetAnimal.x,
                       toZ: targetAnimal.z,
                       time: 0.3
                     };
                  }

                  // Dangerous animals attack back
                  if (['Boar', 'Wolf', 'Bear', 'LargeCat', 'DireWolf'].includes(targetAnimal.type)) {
                    const hurtPower = targetAnimal.type === 'Bear' ? 24 : (targetAnimal.type === 'Boar' ? 8 : 12);
                    stats.health = Math.max(10, stats.health - hurtPower * deltaTime);
                    stats.fatigue = Math.max(15, stats.fatigue - 4 * deltaTime);
                  }

                  workProgress = 0; // reset aiming time

                  if (targetAnimal.HP <= 0) {
                    targetAnimal.isDead = true;
                    (agent as any).isAiming = false;
                    
                    // Check if capture was requested
                    if (targetAnimal.tameLevel > 0 || (targetAnimal as any).isCaptureDesignated || cell.wildAnimal?.isTame) {
                      // Live capture
                      carriage = { 
                        type: 'captive_animal', 
                        name: targetAnimal.type, 
                        amount: 1,
                        id: targetAnimal.id 
                      } as any;
                      
                      // Remove animal actor from list during transport
                      mapData.animals = mapData.animals.filter((a: any) => a.id !== targetAnimal?.id);
                      
                      addLog(`🕸️ Capture Completed: Secured a live wild ${targetAnimal.type}! Carrying to enclosure...`, 'success');
                      awardSkillXP(agent, 'Hunter', 60, mapData, addLog, hasMentorNearby);
                      
                      activeJobType = 'Haul';
                      jobTargetCoords = { x: Math.floor(size / 2), z: Math.floor(size / 2) };
                      workProgress = 0;
                    } else {
                      // Drop meat on ground directly!
                      const rx = Math.max(0, Math.min(size - 1, Math.round(targetAnimal.x)));
                      const rz = Math.max(0, Math.min(size - 1, Math.round(targetAnimal.z)));
                      const targetCell = mapData.grid[rx]?.[rz];
                      if (targetCell) {
                        targetCell.itemsOnGround = {
                          type: 'meat',
                          amount: Math.round((targetAnimal.meatAmount || 20) * (1 + agent.skills.Hunter.level * 0.1))
                        };
                      }
                      
                      // Haul hides, brains and bones directly to tribal storage
                      mapData.stockpile.hide = (mapData.stockpile.hide ?? 0) + (targetAnimal.hideAmount || 2);
                      mapData.stockpile.bone = (mapData.stockpile.bone ?? 0) + (targetAnimal.boneAmount || 2);
                      if (targetAnimal.rareSpecimenAmount > 0) {
                        mapData.stockpile.horns = (mapData.stockpile.horns ?? 0) + targetAnimal.rareSpecimenAmount;
                      }

                      addLog(`🎯 ${agent.name} slain wild ${targetAnimal.type}! Raw meat dropped on ground. Secured +${targetAnimal.hideAmount || 2} Hides and +${targetAnimal.boneAmount || 2} Bones to storage.`, 'success');
                      awardSkillXP(agent, 'Hunter', 50, mapData, addLog, hasMentorNearby);
                      
                      activeJobType = null;
                      jobTargetCoords = null;
                      (agent as any).isManualDirectTask = false;
                      workProgress = 0;
                    }
                  }
                }
              } else {
                // Out of range, keep pursuing!
                statusText = `👣 Pursuit: Tracking wild ${targetAnimal.type}...`;
                (agent as any).isAiming = false;
              }
            } else {
              // Carcass harvesting sub-job
              let harvestTarget = mapData.animals?.find((a: any) => a.id === (agent as any).harvestCarcassId) || null;
              if (!harvestTarget) {
                harvestTarget = mapData.animals?.find((a: any) => a.isDead && !a.isHarvested && Math.abs(a.x - agent.x) < 2.0 && Math.abs(a.z - agent.z) < 2.0) || null;
              }

              if (harvestTarget && !harvestTarget.isHarvested) {
                statusText = `🩸 Dressing game carcass for stockpile...`;
                if (workProgress > 2.0) {
                  carriage = {
                    type: 'harvested_beast',
                    amount: 1,
                    yields: {
                      meat: harvestTarget.meatAmount,
                      hide: harvestTarget.hideAmount,
                      bone: harvestTarget.boneAmount,
                      fat: harvestTarget.fatAmount,
                      horns: harvestTarget.rareSpecimenAmount
                    }
                  } as any;

                  harvestTarget.isHarvested = true;
                  mapData.animals = mapData.animals?.filter((a: any) => a.id !== harvestTarget?.id) || [];

                  addLog(`🥩 Harvest Completed: Harvested bones + fresh woodskins from ${harvestTarget.type}.`, 'success');
                  awardSkillXP(agent, 'Hunter', 50, mapData, addLog, hasMentorNearby);

                  activeJobType = 'Haul';
                  jobTargetCoords = { x: Math.floor(size / 2), z: Math.floor(size / 2) };
                  workProgress = 0;
                }
              } else {
                activeJobType = null;
                jobTargetCoords = null;
              }
            }
          } else if (subJob === 'fish') {
            statusText = `🎣 Fisherman: Casting nets & harvesting fish from water basin...`;
            if (workProgress > 3.0) {
              carriage = { type: 'meat', amount: 15 }; // fish is stored/represented as meat
              mapData.stockpile.reservoirWater = (mapData.stockpile.reservoirWater ?? 0) + 15;
              addLog(`🎣 Fisherman ${agent.name} caught fresh fish (+15 Meat) and purified lake water (+15 Reservoir Water)!`, 'info');

              activeJobType = 'Haul';
              jobTargetCoords = { x: Math.floor(size / 2), z: Math.floor(size / 2) };
              workProgress = 0;

              awardSkillXP(agent, 'Hunter', 40, mapData, addLog, hasMentorNearby);
            }
          } else if (subJob === 'water') {
            statusText = `🚰 Locating, collecting & purifying water from well...`;
            if (workProgress > 2.5) {
              carriage = { type: 'reservoirWater', amount: 25 };
              addLog(`🚰 ${agent.name} drawn and purified standard water from well (+25 Reservoir Water)!`, 'info');

              activeJobType = 'Haul';
              jobTargetCoords = { x: Math.floor(size / 2), z: Math.floor(size / 2) };
              workProgress = 0;

              awardSkillXP(agent, 'Hunter', 30, mapData, addLog, hasMentorNearby);
            }
          }
        } 
        
        else if (activeJobType === 'Repair') {
          const subJob = (agent as any).repairSubJob || 'physical';
          if (subJob === 'organizeStockpile') {
            statusText = `🧹 Prevent Spoilage: Organizing stockpile & sweeping warehouses...`;
            mapData.villageInventory.cleanliness = Math.min(100, mapData.villageInventory.cleanliness + 20 * speedMultiplier * deltaTime);
            if (workProgress > 4.0) {
              workProgress = 0;
              addLog(`🧹 ${agent.name} cleaned and inspected storage bins to prevent food spoilage (+20% Cleanliness).`, 'info');
              activeJobType = null;
              jobTargetCoords = null;

              awardSkillXP(agent, 'Gatherer', 20, mapData, addLog, hasMentorNearby);
            }
          } else if (cell?.structure && cell.structure.condition < 100) {
            statusText = `🩹 Hammering repairs on structure condition (${Math.round(cell.structure.condition)}%)...`;
            cell.structure.condition = Math.min(100, cell.structure.condition + 20 * speedMultiplier * deltaTime);
            if (cell.structure.condition >= 100) {
              addLog(`🔧 Repaired structure to mint condition.`, 'info');
              activeJobType = null;
              jobTargetCoords = null;

              awardSkillXP(agent, 'Builder', 25, mapData, addLog, hasMentorNearby);
            }
          } else {
            activeJobType = null;
            jobTargetCoords = null;
          }
        } 
        
        else if (activeJobType === 'Haul') {
          if (carriage && carriage.amount > 0) {
            const rawDropType = carriage.type as string;

            if (rawDropType === 'captive_animal') {
              // Find a pen cell to release them
              let penX = -1, penZ = -1;
              for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                  const cell = mapData.grid[r][c];
                  if (!cell.structure && !cell.construction && cell.biome !== 'water' && checkIsWithinPen(mapData, r, c)) {
                    penX = r;
                    penZ = c;
                    break;
                  }
                }
                if (penX !== -1) break;
              }

              const dropX = penX !== -1 ? penX : Math.floor(size / 2) + 1;
              const dropZ = penZ !== -1 ? penZ : Math.floor(size / 2) + 1;

              if (destX === dropX && destZ === dropZ) {
                statusText = '🕸_ Releasing captured animal into enclosure...';
                if (workProgress > 1.2) {
                  const aniId = (carriage as any).id;
                  const aniType = (carriage as any).name || (carriage as any).type;
                  const newAni = createAnimal(aniType, dropX, dropZ, false, false);
                  newAni.id = aniId || newAni.id;
                  newAni.trustLevel = 50;
                  newAni.tameLevel = 8;
                  newAni.stress = 10;
                  if (penX !== -1) {
                    newAni.isSleeping = false;
                  }

                  if (!mapData.animals) mapData.animals = [];
                  mapData.animals.push(newAni);

                  addLog(`🕸️ ${agent.name} released captured wild ${aniType} into the village pen (+50 Trust)!`, 'success');
                  carriage = null;
                  activeJobType = null;
                  jobTargetCoords = null;
                  workProgress = 0;
                }
              } else {
                jobTargetCoords = { x: dropX, z: dropZ };
              }
            } else if (destX === Math.floor(size / 2) && destZ === Math.floor(size / 2)) {
              statusText = '📦 Stockpiling resources at depot...';
              if (workProgress > 1.0) {
                if (rawDropType === 'harvested_beast') {
                  const yields = (carriage as any).yields || { meat: 30, hide: 5, bone: 2, fat: 2, horns: 0 };
                  mapData.stockpile.meat = (mapData.stockpile.meat || 0) + (yields.meat || 0);
                  mapData.stockpile.hide = (mapData.stockpile.hide || 0) + (yields.hide || 0);
                  mapData.stockpile.bone = (mapData.stockpile.bone || 0) + (yields.bone || 0);
                  mapData.stockpile.fat = (mapData.stockpile.fat || 0) + (yields.fat || 0);
                  mapData.stockpile.horns = (mapData.stockpile.horns || 0) + (yields.horns || 0);

                  if (yields.meat > 0) {
                    const oldQty = mapData.stockpile.meat - yields.meat;
                    const oldFresh = mapData.stockpile.meatFresh || 100;
                    mapData.stockpile.meatFresh = Math.min(100, Math.round((oldQty * oldFresh + yields.meat * 100) / mapData.stockpile.meat));
                  }
                  mapData.stockpile.food = mapData.stockpile.berries + mapData.stockpile.roots + mapData.stockpile.mushrooms + mapData.stockpile.meat;

                  addLog(`📦 Depot stash: +${yields.meat} Meat, +${yields.hide} Hide, +${yields.fat} Fat, +${yields.bone} Bones, +${yields.horns} Horns/Feathers!`, 'success');
                } else {
                  let dropType: any = rawDropType;
                  if (rawDropType === 'food') {
                    dropType = 'berries';
                  }

                  const oldQty = (mapData.stockpile as any)[dropType] || 0;
                  const addedQty = carriage.amount;
                  (mapData.stockpile as any)[dropType] = oldQty + addedQty;

                  const isFoodItem = ['berries', 'roots', 'mushrooms', 'meat'].includes(dropType);
                  if (isFoodItem) {
                    const freshnessKey = `${dropType}Fresh`;
                    const oldFresh = (mapData.stockpile as any)[freshnessKey] || 100;
                    const blendedFresh = Math.min(100, Math.round((oldQty * oldFresh + addedQty * 100) / (oldQty + addedQty)));
                    (mapData.stockpile as any)[freshnessKey] = blendedFresh;
                  }
                  mapData.stockpile.food = mapData.stockpile.berries + mapData.stockpile.roots + mapData.stockpile.mushrooms + mapData.stockpile.meat;

                  addLog(`📦 Hauler stashed +${addedQty} ${dropType} at depot!`, 'info');
                }

                carriage = null;
                activeJobType = null;
                jobTargetCoords = null;
                workProgress = 0;
              }
            } else {
              jobTargetCoords = { x: Math.floor(size / 2), z: Math.floor(size / 2) };
            }
          } else if (cell?.itemsOnGround) {
            statusText = '📦 Lifting supplies...';
            if (workProgress > 1.0) {
              carriage = { type: cell.itemsOnGround.type, amount: cell.itemsOnGround.amount };
              cell.itemsOnGround = null;
              // immediately return to base
              jobTargetCoords = { x: Math.floor(size / 2), z: Math.floor(size / 2) };
              workProgress = 0;
            }
          } else {
            activeJobType = null;
            jobTargetCoords = null;
          }
        }
      } else {
        // TRAVELING to target coordinates
        let sp = 1.0;
        if (agent.traits.includes('Path Finder')) sp = 1.4;
        
        let pWeight = 0;
        if (carriage && carriage.amount > 0) {
          pWeight = carriage.amount * getUnitWeight(carriage.type);
        }
        const hasBasket = mapData.stockpile.grassBasket > 0;
        const maxWeight = 15 + (hasBasket ? 10 : 0);
        const wRatio = pWeight / maxWeight;
        const loadPenalty = wRatio > 0.4 ? Math.max(0.3, 1.0 - (wRatio - 0.4) * 1.25) : 1.0;

        let watchTowerSpeedBonus = 1.0;
        if (agent.role === 'Scout' && watchTowers > 0) {
          watchTowerSpeedBonus += watchTowers * 0.15;
        }

        // Upgraded speed factors for satisfyingly fast, responsive walking
        const movementFactor = (36.0 + agent.attributes.agility * 3.6) * sp * loadPenalty * watchTowerSpeedBonus;

        const dirX = (destX - x) / distance;
        const dirZ = (destZ - z) / distance;

        x += dirX * movementFactor * deltaTime;
        z += dirZ * movementFactor * deltaTime;

        // Visual targets for smooth interpolations in GameCanvas
        agent.targetX = destX;
        agent.targetZ = destZ;

        let encumberedMsg = loadPenalty < 0.9 ? ` (🐌 Encumbered)` : '';
        statusText = `🚶 Traveling to [${destX}, ${destZ}] to ${activeJobType}${encumberedMsg}...`;
      }
    } else {
      // -----------------------------------------------------------------------
      // ADAPTIVE TRIBAL AMBIENT IDLE SYSTEM
      // -----------------------------------------------------------------------
      // Checks if the agent is already in one of our delightful idle activities
      const isCurrentlyEngaged = 
        statusText.startsWith('🧘') || 
        statusText.startsWith('🌸') || 
        statusText.startsWith('💤') ||
        statusText.startsWith('💬') || 
        statusText.startsWith('🤝') || 
        statusText.startsWith('🎣') || 
        statusText.startsWith('🏊') || 
        statusText.startsWith('🔍') || 
        statusText.startsWith('🦋') ||
        statusText.startsWith('🌊');

      // Randomly change idle activity to keep things highly dynamic, or if they just started being idle
      if (!isCurrentlyEngaged || Math.random() < 0.08 * deltaTime) {
        const choice = Math.random();

        if (choice < 0.22) {
          // --- SOCIALIZING ---
          // Locate another living member to chat, share intelligence, and raise morale
          const crew = tribe.filter(t => t.id !== agent.id && t.isAlive);
          if (crew.length > 0) {
            const partner = crew[Math.floor(Math.random() * crew.length)];
            // Navigate to stand close to classmate/pioneer
            agent.targetX = Math.max(1, Math.min(size - 2, partner.x + (Math.random() - 0.5) * 1.5));
            agent.targetZ = Math.max(1, Math.min(size - 2, partner.z + (Math.random() - 0.5) * 1.5));

            const dialogues = [
              `💬 Discussing ancient sky-god legends with ${partner.name}...`,
              `🤝 Sharing campfire songs and bonding with ${partner.name}...`,
              `💬 Complaining about the hot/dry weather with ${partner.name}...`,
              `🎓 Teaching advanced tool-making secrets to ${partner.name}...`,
              `🤝 Trading gossip and laughing with ${partner.name}...`
            ];
            statusText = dialogues[Math.floor(Math.random() * dialogues.length)];

            stats.morale = Math.min(100, stats.morale + 3.0);
            if (Math.random() < 0.05) {
              attributes.intelligence = Math.min(10, attributes.intelligence + 1);
            }
          } else {
            statusText = '🧘 Meditating and reflecting silently...';
            agent.targetX = x;
            agent.targetZ = z;
          }
        } 
        else if (choice < 0.48) {
          // --- SWIMMING / FISHING ---
          // Scan for any nearby water cells
          const waterTiles: {rx: number, rz: number}[] = [];
          for (let dx = -5; dx <= 5; dx++) {
            for (let dz = -5; dz <= 5; dz++) {
              const rx = Math.floor(x) + dx;
              const rz = Math.floor(z) + dz;
              if (rx >= 0 && rx < size && rz >= 0 && rz < size) {
                if (mapData.grid[rx][rz].biome === 'water') {
                  waterTiles.push({ rx, rz });
                }
              }
            }
          }

          if (waterTiles.length > 0) {
            const spot = waterTiles[Math.floor(Math.random() * waterTiles.length)];
            agent.targetX = spot.rx;
            agent.targetZ = spot.rz;

            if (Math.random() < 0.5) {
              statusText = '🎣 Casting a primitive fiber line to fish in the water basin...';
              
              const neighbors = [
                { r: spot.rx - 1, c: spot.rz },
                { r: spot.rx + 1, c: spot.rz },
                { r: spot.rx, c: spot.rz - 1 },
                { r: spot.rx, c: spot.rz + 1 },
              ];
              for (const n of neighbors) {
                if (n.r >= 0 && n.r < size && n.c >= 0 && n.c < size) {
                  const cell = mapData.grid[n.r]?.[n.c];
                  if (cell && cell.biome !== 'water') {
                    agent.targetX = n.r;
                    agent.targetZ = n.c;
                    break;
                  }
                }
              }

              stats.morale = Math.min(100, stats.morale + 2.0);
              // Small chance to actively harvest/deliver raw food to stockpile
              if (Math.random() < 0.1) {
                mapData.stockpile.meat = (mapData.stockpile.meat ?? 0) + 1;
                addLog(`🎣 Skill Catch! ${agent.name} hooked a fish while relaxing by the lake!`, 'info');
              }
            } else {
              statusText = '🏊 Swimming and floating around in the refreshing lake...';
              stats.morale = Math.min(100, stats.morale + 5.0);
              stats.fatigue = Math.max(0, stats.fatigue - 3.0); // gets fully refreshed but slightly tired
            }
          } else {
            // Beach stroll instead if lake-less
            statusText = '🌊 Strolling down the sandy beaches looking for seashells...';
            agent.targetX = Math.max(1, Math.min(size - 2, x + (Math.random() - 0.5) * 6));
            agent.targetZ = Math.max(1, Math.min(size - 2, z + (Math.random() - 0.5) * 6));
          }
        } 
        else if (choice < 0.75) {
          // --- NAPPING / RESTING IN MEADOWS ---
          agent.targetX = x;
          agent.targetZ = z;
          const naps = [
            '💤 Napping peaceful under the glorious open sky...',
            '🧘 Sunbathing, absorbing energy in the green clearing...',
            '🌸 Cloud-watching and resting head on the soft grass...',
            '💤 Dosing off on the warm beach sand...'
          ];
          statusText = naps[Math.floor(Math.random() * naps.length)];
          stats.fatigue = Math.min(100, stats.fatigue + 10.0 * deltaTime);
          stats.health = Math.min(100, stats.health + 2.0 * deltaTime);
        } 
        else {
          // --- NATURE STUDY & BUTTERFLY CHASING ---
          const dX = x + (Math.random() - 0.5) * 10;
          const dZ = z + (Math.random() - 0.5) * 10;
          const rx = Math.max(1, Math.min(size - 2, Math.floor(dX)));
          const rz = Math.max(1, Math.min(size - 2, Math.floor(dZ)));

          if (mapData.grid[rx]?.[rz]?.biome !== 'water') {
            agent.targetX = rx;
            agent.targetZ = rz;
          } else {
            agent.targetX = x;
            agent.targetZ = z;
          }

          const studies = [
            '🦋 Chasing high-poly amber butterflies in the flowers...',
            '🔍 Sniffing aromatic blue scent-dew forest flowers...',
            '🔍 Examining details on a strange basalt granite boulder...',
            '🦋 Tickling a wild desert squirrel...'
          ];
          statusText = studies[Math.floor(Math.random() * studies.length)];
          stats.morale = Math.min(100, stats.morale + 1.5);
          if (Math.random() < 0.05) {
            attributes.perception = Math.min(10, attributes.perception + 1);
          }
        }
      }

      // Move toward active idle coordinates
      const dist = Math.sqrt((agent.targetX - x) ** 2 + (agent.targetZ - z) ** 2);
      if (dist > 0.4) {
        const idleWanderSpeed = 20.0; // standard strolling pace
        const dx = (agent.targetX - x) / dist;
        const dz = (agent.targetZ - z) / dist;
        x += dx * idleWanderSpeed * deltaTime;
        z += dz * idleWanderSpeed * deltaTime;
      } else {
        // Arrived at idle destination: idle face orientation
        agent.targetX = x;
        agent.targetZ = z;
      }
    }

    const currentGridX = Math.max(0, Math.min(size - 1, Math.floor(x)));
    const currentGridZ = Math.max(0, Math.min(size - 1, Math.floor(z)));
    const yCoord = mapData.grid[currentGridX]?.[currentGridZ]?.height || 1.0;

    let carriageWeight = 0;
    let carriageVolume = 0;
    if (carriage && carriage.amount > 0) {
      carriageWeight = carriage.amount * getUnitWeight(carriage.type);
      carriageVolume = carriage.amount * getUnitVolume(carriage.type);
    }
    const hasBasketEffect = mapData.stockpile.grassBasket > 0;
    const personalInventory = {
      maxWeight: 15 + (hasBasketEffect ? 10 : 0),
      maxVolume: 15 + (hasBasketEffect ? 15 : 0),
      currentWeight: Math.round(carriageWeight * 10) / 10,
      currentVolume: Math.round(carriageVolume * 10) / 10,
      cleanliness: getSurvivalEquipmentCleanliness(agent), // relative tidy metric
      items: carriage && carriage.amount > 0 ? { [carriage.type]: carriage.amount } : {}
    };

    return {
      ...agent,
      x,
      z,
      y: yCoord,
      targetX: jobTargetCoords ? jobTargetCoords.x : agent.targetX,
      targetZ: jobTargetCoords ? jobTargetCoords.z : agent.targetZ,
      stats,
      attributes,
      statusText,
      activeJobType,
      jobTargetCoords,
      workProgress,
      isManualDirectTask: (activeJobType && activeJobType !== 'Haul') ? agent.isManualDirectTask : false,
      carriage,
      personalInventory,
      personality,
      relationships: tempRelationships,
      skills: { ...agent.skills },
      // Generational fields
      ageDays,
      ageYears,
      agePhase,
      childUpbringing,
      color,
      role,
      priorities,
      traits,
      masteryTechniques,
      apprenticeTo,
      apprenticeToName,
      isOracleApprentice
    };
  });

  // Post-sim checks: Family/Friend passing tragedy mourning effects
  const deadThisTick = nextTribe.filter(next => !next.isAlive && tribe.find(prev => prev.id === next.id && prev.isAlive));
  if (deadThisTick.length > 0) {
    deadThisTick.forEach(dead => {
      nextTribe.forEach(survivor => {
        if (!survivor.isAlive) return;
        
        const relList = survivor.relationships || [];
        const bond = relList.find(r => r.targetId === dead.id);
        if (bond) {
          if (bond.type === 'Family') {
            survivor.stats.morale = Math.max(0, survivor.stats.morale - 55);
            survivor.stats.fatigue = Math.max(0, survivor.stats.fatigue - 30);
            survivor.statusText = `🖤 Grief-stricken over the passing of ${dead.name}...`;
            addLog(`🖤 Family Tragedy: ${survivor.name} has plunged into deep grief, sobbing uncontrollable tears at the sudden passing of their beloved ${dead.name}!`, 'death');
          } else if (bond.type === 'Friend') {
            survivor.stats.morale = Math.max(0, survivor.stats.morale - 25);
            survivor.statusText = `💔 Saddened by the tragic death of their friend ${dead.name}...`;
            addLog(`💔 Shared Grief: ${survivor.name} is deeply saddened and in shock over the death of their close friend ${dead.name}.`, 'death');
          } else if (bond.type === 'Mentor') {
            survivor.stats.morale = Math.max(0, survivor.stats.morale - 15);
            addLog(`🎓 Lost Teacher: Apprentice ${survivor.name} is mourning the death of their inspiring mentor ${dead.name}.`, 'death');
          } else if (bond.type === 'Apprentice') {
            survivor.stats.morale = Math.max(0, survivor.stats.morale - 15);
            addLog(`🎓 Lost Pupil: Mentor ${survivor.name} is mourning the passing of their apprentice ${dead.name}.`, 'death');
          }
        }
      });
    });
  }

  return nextTribe;
}

function getTaskDescription(role: TribespersonRole): string {
  switch (role) {
    case 'Gatherer':
      return 'Gathering berries and wild roots';
    case 'Hunter':
      return 'Tracking games and big game';
    case 'Farmer':
      return 'Cultivating barley seedlings';
    case 'Builder':
      return 'Felling logs and clearing rocky bedrocks';
    case 'Scout':
      return 'Surveying uncharted islands';
    case 'Healer':
      return 'Grinding medical herbs';
    case 'Artisan':
      return 'Weaving tribal bone carvings';
    default:
      return 'Assembling stone circles';
  }
}

function getSurvivalEquipmentCleanliness(agent: Tribesperson): number {
  return Math.round(80 + agent.stats.morale * 0.2);
}

