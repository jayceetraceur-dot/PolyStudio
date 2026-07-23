import { MapData, Tribesperson, AIDirectorState, PlayerCapabilityProfile, DirectorEvent, ActiveDirectorEvent, OtherVillage, OracleMessage } from '../types';
import { createTribesperson } from './tribeGenerator';

// Estimate unit economic value of stockpiled goods
export const RESOURCE_VALUATIONS: Record<string, number> = {
  wood: 1,
  stone: 1,
  berries: 1,
  roots: 1.2,
  mushrooms: 1.2,
  meat: 1.5,
  fiber: 0.5,
  bone: 0.8,
  dew: 1,
  reservoirWater: 1,
  rainwater: 0.8,
  copper: 3,
  silver: 6,
  gold: 12,
  iron: 5,
  relics: 20,
  ancientMaterials: 15,
  stoneAxe: 8,
  flintPickaxe: 8,
  grassBasket: 5,
  spear: 12,
  bow: 15,
  boiledRoots: 4,
  paddedJerkin: 18,
  saltedMeat: 5,
  steelPickaxe: 20,
  eldritchWard: 40,
  amuletLife: 50,
  thuleciteCore: 60,
  hide: 2,
  fat: 1.5,
  horns: 4,
};

// Default constructor for AI Director State
export function initializeAIDirectorState(): AIDirectorState {
  return {
    intensity: 'Calm',
    intensityTimer: 0,
    playerReputation: 50,
    recentStress: {
      recentDeaths: 0,
      recentRaid: -100,
      recentPredatorAttack: -100,
      recentFoodShortage: -100,
      recentFailedMigration: -100,
      recentIllnessOutbreak: -100,
      recentDisaster: -100,
    },
    eventCooldowns: {
      Survival: 0,
      Migration: 0,
      Wildlife: 0,
      Social: 0,
      Oracle: 0,
      Trade: 0,
      Diplomacy: 0,
      Expedition: 0,
      Danger: 0,
      raider_attack: 0,
      predator_attack: 0,
      refugee_arrival: 0,
      expert_visitor: 0,
    },
    eventHistory: [],
    activeEvent: null,
    pendingEvents: [],
    difficultyStage: 'Early',
    globalEventCooldown: 4.0,
    capabilityProfile: {
      population: { total: 0, children: 0, adults: 0, elders: 0, sick: 0, injured: 0, workers: 0 },
      survival: { food: 0, water: 0, medicine: 0, shelter: 0, sleep: 100, morale: 100, sickness: 0, stabilityScore: 100 },
      defense: { strengthScore: 0, fighters: 0, guards: 0, hunterLevels: 0, weapons: 0, armor: 0, animals: 0, structures: 0 },
      migration: { capacity: 0, supplies: 0, animals: 0, safetyScore: 100 },
      economy: { storedResourcesValue: 0, tradeGoodsValue: 0, rareItemsCount: 0 },
      knowledge: { oracleLevel: 1, scoutLevel: 1, relicsResearched: 0, recipesUnlocked: 0 },
      stressScore: 0,
    },
  };
}

// Calculate player capabilities in real time
export function calculatePlayerCapability(
  tribe: Tribesperson[],
  mapData: MapData,
  stressHistory: AIDirectorState['recentStress'],
  currentDay: number
): PlayerCapabilityProfile {
  const living = tribe.filter(t => t.isAlive);
  const total = living.length;
  
  let children = 0;
  let adults = 0;
  let elders = 0;
  let sick = 0;
  let injured = 0;
  let workers = 0;

  living.forEach((p) => {
    if (p.ageYears < 15) {
      children++;
    } else if (p.ageYears <= 50) {
      adults++;
      if (p.stats.health >= 50) workers++;
    } else {
      elders++;
      if (p.stats.health >= 50) workers++;
    }

    if (p.stats.morale < 35 || p.stats.health < 50) {
      sick++;
    }
    if (p.stats.health < 80 && p.stats.health >= 50) {
      injured++;
    }
  });

  // Food and Water stockpiles
  const food = mapData.stockpile?.food ?? 0;
  const water = (mapData.stockpile?.reservoirWater ?? 0) + (mapData.stockpile?.dew ?? 0) + (mapData.stockpile?.rainwater ?? 0);
  const medicine = mapData.stockpile?.medicine ?? 0;

  // Shelter structures count
  let shelterCount = 0;
  if (mapData.grid) {
    for (let r = 0; r < mapData.grid.length; r++) {
      if (!mapData.grid[r]) continue;
      for (let c = 0; c < mapData.grid[r].length; c++) {
        const s = mapData.grid[r][c]?.structure;
        if (s && s.type === 'Shelter') {
          shelterCount++;
        }
      }
    }
  }
  const shelterRatio = Math.min(100, total > 0 ? (shelterCount * 400) / total : 100);

  // Average Stats
  const avgSleep = total > 0 ? living.reduce((acc, p) => acc + p.stats.fatigue, 0) / total : 100;
  const avgMorale = total > 0 ? living.reduce((acc, p) => acc + p.stats.morale, 0) / total : 100;
  const avgSickness = total > 0 ? (sick / total) * 100 : 0;

  const foodScore = Math.min(100, total > 0 ? (food / (total * 5)) * 100 : 100);
  const waterScore = Math.min(100, total > 0 ? (water / (total * 5)) * 100 : 100);
  const stabilityScore = Math.round((foodScore + waterScore + avgSleep + avgMorale + (100 - avgSickness) + shelterRatio) / 6);

  // Defense Strength
  const fightersCount = living.filter(p => p.role === 'Hunter').length;
  const hunterLevelsSum = living.filter(p => p.role === 'Hunter').reduce((acc, p) => acc + (p.skills?.Hunter?.level ?? 1), 0);
  
  const weapons = (mapData.stockpile?.spear ?? 0) + (mapData.stockpile?.bow ?? 0);
  const armor = mapData.stockpile?.paddedJerkin ?? 0;
  const domesticatedAnimals = mapData.animals?.filter(a => !a.isDead && a.isTame).length ?? 0;

  let defensiveStructures = 0;
  if (mapData.grid) {
    for (let r = 0; r < mapData.grid.length; r++) {
      if (!mapData.grid[r]) continue;
      for (let c = 0; c < mapData.grid[r].length; c++) {
        const s = mapData.grid[r][c]?.structure;
        if (s && s.type === 'WatchTower') {
          defensiveStructures++;
        }
      }
    }
  }

  // Combat rating
  const defenderValue = fightersCount * 15 + hunterLevelsSum * 4 + weapons * 8 + armor * 12 + defensiveStructures * 20;
  const defenseStrengthScore = Math.min(100, Math.round(defenderValue));

  // Migration readiness
  const caravanMaxWeight = mapData.caravanInventory?.maxWeight ?? 100;
  const caravanCurrentWeight = mapData.caravanInventory?.currentWeight ?? 0;
  const migrationSafetyScore = Math.min(100, Math.round((100 - avgSickness + avgMorale + (caravanMaxWeight > 0 ? (caravanCurrentWeight / caravanMaxWeight) * 100 : 100)) / 3));

  // Economy Resource Valuation
  let storedResourcesValue = 0;
  let rareItemsCount = 0;
  if (mapData.stockpile) {
    Object.entries(mapData.stockpile).forEach(([k, qty]) => {
      const val = RESOURCE_VALUATIONS[k] ?? 0;
      if (typeof qty === 'number') {
        storedResourcesValue += qty * val;
        if (val >= 15) rareItemsCount += qty;
      }
    });
  }
  const tradeGoodsValue = (mapData.stockpile?.silver ?? 0) * 1.5 + (mapData.stockpile?.gold ?? 0) * 3;

  // Knowledge
  const oracleObj = living.find(p => p.role === 'Oracle');
  const oracleLevel = oracleObj?.skills?.Oracle?.level ?? 1;
  const scoutObj = living.find(p => p.role === 'Scout');
  const scoutLevel = scoutObj?.skills?.Scout?.level ?? 1;
  const recipesUnlockedCount = mapData.unlockedRecipes?.length ?? 0;

  // Calculate stress
  let stressScore = 0;
  if (stressHistory.recentDeaths > 0) stressScore += 30;
  if (currentDay - stressHistory.recentRaid < 5) stressScore += 25;
  if (currentDay - stressHistory.recentPredatorAttack < 5) stressScore += 15;
  if (currentDay - stressHistory.recentFoodShortage < 4) stressScore += 20;
  if (currentDay - stressHistory.recentFailedMigration < 8) stressScore += 20;
  if (currentDay - stressHistory.recentIllnessOutbreak < 5) stressScore += 15;
  if (currentDay - stressHistory.recentDisaster < 5) stressScore += 25;
  stressScore = Math.min(100, stressScore);

  return {
    population: { total, children, adults, elders, sick, injured, workers },
    survival: { food, water, medicine, shelter: shelterCount, sleep: Math.round(avgSleep), morale: Math.round(avgMorale), sickness: Math.round(avgSickness), stabilityScore },
    defense: { strengthScore: defenseStrengthScore, fighters: fightersCount, guards: defensiveStructures, hunterLevels: hunterLevelsSum, weapons, armor, animals: domesticatedAnimals, structures: defensiveStructures },
    migration: { capacity: caravanMaxWeight, supplies: caravanCurrentWeight, animals: domesticatedAnimals, safetyScore: migrationSafetyScore },
    economy: { storedResourcesValue: Math.round(storedResourcesValue), tradeGoodsValue: Math.round(tradeGoodsValue), rareItemsCount },
    knowledge: { oracleLevel, scoutLevel, relicsResearched: mapData.discoveredRelics?.length ?? 0, recipesUnlocked: recipesUnlockedCount },
    stressScore,
  };
}

// Global list of narrative and survival events for the AI Director pool
export const EVENTS_DECK: DirectorEvent[] = [
  // --- SURVIVAL EVENTS ---
  {
    id: 'spoiled_food_warning',
    name: 'Mold Spores in Stockpile',
    category: 'Survival',
    description: 'An electrostatic mold outbreak has settled on our food storage vaults. The spores are moist and smell of ozone. We must deal with the spoiling food quickly or risk sickness.',
    intensity: 'Low',
    durationDays: 1.2,
    choices: [
      { id: 'clean', text: 'Scrub vaults with medicine (Consumes 5 Medicine)', tooltip: 'Safely purges the mold using medicinal extracts.' },
      { id: 'burn', text: 'Burn infected crates (Lose 15 Food, gain 5 Charcoal)', tooltip: 'Fast and sterile, but we lose valuable food.' },
      { id: 'ignore', text: 'Ignore it and eat around the mold', tooltip: 'No resource cost, but there is a high sickness and illness risk.' }
    ]
  },
  {
    id: 'water_spring_reveal',
    name: 'Atmospheric Condensation Spire',
    category: 'Survival',
    description: 'Your scouts hear a musical whistling. An ancient orbital siphoning tower is venting super-cooled vapor, condensing into an abundant puddle of purified water.',
    intensity: 'Calm',
    durationDays: 1.0,
    choices: [
      { id: 'collect', text: 'Haul water to depot (+25 Reservoir Water)', tooltip: 'Increases local water stores significantly.' },
      { id: 'study', text: 'Study siphoning mechanism (+20 Research Points)', tooltip: 'Gains technical blueprint progress.' }
    ]
  },
  {
    id: 'medicine_rust_harvest',
    name: 'Ancient Biosphere Herbs',
    category: 'Survival',
    description: 'A glowing patch of sky-lichens has burst out of rust-battered precursor pipes. Healers say these lichens hold incredible cell-restoring properties.',
    intensity: 'Calm',
    durationDays: 1.2,
    choices: [
      { id: 'harvest', text: 'Gather immediately (+8 Medicine)', tooltip: 'Bolsters the clan\'s medicinal stores.' },
      { id: 'transplant', text: 'Attempt to cultivate near campsite', tooltip: '50% chance to gain +15 Medicine, 50% chance to fail with 0.' }
    ]
  },
  
  // --- WILDLIFE EVENTS ---
  {
    id: 'pack_birds_migration',
    name: 'Screeching Feather Pack',
    category: 'Wildlife',
    description: 'A migrating herd of massive Sky-Strutting Pack Birds has nested right outside the campsite. Their screams are deafening, but they carry valuable feathers and eggs.',
    intensity: 'Low',
    durationDays: 1.5,
    choices: [
      { id: 'tame', text: 'Attempt to tame a breeding pair (Consumes 20 Berries)', tooltip: 'Requires high skills. Spawns domesticated Pack Birds.' },
      { id: 'hunt', text: 'Send Hunters to dress the birds (+20 Meat, +4 Horns/Feathers)', tooltip: 'Fills the smokehouses with meat.' },
      { id: 'avoid', text: 'Politely avoid their nesting circles (+10 Morale)', tooltip: 'Restores peace and quiet, elevating tribal spirits.' }
    ]
  },
  {
    id: 'predator_stalking',
    name: 'Eye-Stalker Tracks Identified',
    category: 'Wildlife',
    description: 'Serrating, multi-jointed claw marks have been spotted near the berry bushes. An Apex Predator is tracking the tribe\'s scent.',
    intensity: 'Medium',
    durationDays: 0.7,
    choices: [
      { id: 'bait', text: 'Set out toxic bait (Consumes 10 Meat, 2 Medicine)', tooltip: 'Reduces predator health, preventing attacks.' },
      { id: 'fortify', text: 'Light bonfire wards (Consumes 15 Wood)', tooltip: 'Scares predators away, but burns valuable logs.' },
      { id: 'scout', text: 'Let Scouts track it down (+10 Research, resets predator timer)', tooltip: 'Eliminates immediate danger through diligent tracking.' }
    ]
  },
  {
    id: 'beast_disease',
    name: 'Static Rot Outbreak',
    category: 'Wildlife',
    description: 'Our tamed beasts of burden are shivering. Static rot is infecting their joints, cracking their horns and reducing their load limits.',
    intensity: 'Medium',
    durationDays: 1.0,
    choices: [
      { id: 'treat', text: 'Apply warm fiber poultice (Consumes 10 Fiber, 4 Medicine)', tooltip: 'Safely cures our pack animals.' },
      { id: 'quarantine', text: 'Surgically separate infected beasts (-1 tamed beast, +15 Meat)', tooltip: 'Culls the herd to protect others.' },
      { id: 'wait', text: 'Do nothing and hope the cold wind purges it', tooltip: 'High risk of animal deaths and permanent morale drop.' }
    ]
  },

  // --- SOCIAL EVENTS ---
  {
    id: 'tribal_dispute',
    name: 'The Sundered Hearth',
    category: 'Social',
    description: 'Two leading gatherers are arguing over who owns the flint fragments found in the dry stream. The tribe is dividing into tense factions.',
    intensity: 'Low',
    durationDays: 1.4,
    choices: [
      { id: 'repute', text: 'Oracle decides: Divide equally (-5 Morale, +5 Reputation)', tooltip: 'A balanced decision that pleases neighbors.' },
      { id: 'favour', text: 'Favor the elder gatherer (+15 Morale for Elders, -10 for Workers)', tooltip: 'Upholds tradition but frustrates younger workers.' },
      { id: 'feast', text: 'Throw a mediation feast (Consumes 20 Food, +20 Morale)', tooltip: 'Drowns out the argument with food and celebration.' }
    ]
  },
  {
    id: 'apprentice_breakthrough',
    name: 'Spark of Precursor Wisdom',
    category: 'Social',
    description: 'An apprentice artisan has spent nights staring into a humming thulecite fragment, having a bizarre breakthrough regarding tool smithing.',
    intensity: 'Low',
    durationDays: 1.8,
    choices: [
      { id: 'recipes', text: 'Support their prototype (Consumes 10 Copper, +25 Research Points)', tooltip: 'Boosts research output.' },
      { id: 'amulet', text: 'Construct a protection charm (+1 Amulet of Life)', tooltip: 'Crafts an extremely rare relic of resurrection.' }
    ]
  },
  {
    id: 'memorial_ritual',
    name: 'Chronicle of Winds',
    category: 'Social',
    description: 'The elders suggest conducting a solemn Memorial Ritual for our fallen ancestors who perished in the Great Static Collapse.',
    intensity: 'Calm',
    durationDays: 2.0,
    choices: [
      { id: 'celebrate', text: 'Conduct a memory feast (Consumes 15 Food, +25 Morale)', tooltip: 'Deepens social cohesion.' },
      { id: 'codex', text: 'Inscribe memories in the Codex (+15 Research, +10 Reputation)', tooltip: 'Durable records elevate the clan\'s standing.' }
    ]
  },

  // --- ORACLE EVENTS ---
  {
    id: 'vision_celestial',
    name: 'Eldritch Eye Alignment',
    category: 'Oracle',
    description: 'The static on the horizons has turned a deep violet. The Oracle senses an orbital beacon alignment, whispering coordinates of precursor vaults.',
    intensity: 'Low',
    durationDays: 0.8,
    choices: [
      { id: 'map', text: 'Chart coordinates (+1 Ruin Map, +15 Research)', tooltip: 'Reveals a rare site rumor.' },
      { id: 'sacrifice', text: 'Perform atmospheric grounding (Consumes 10 Copper, +20 Morale)', tooltip: 'Soothes the minds of terrified survivors.' }
    ]
  },
  {
    id: 'future_biome_forecast',
    name: 'Whisper of the Coming Waste',
    category: 'Oracle',
    description: 'The Oracle dreams of salt, static, and blinding white plains. The next biome ahead is forecasted to be extremely dry and resource-poor.',
    intensity: 'Low',
    durationDays: 2.2,
    choices: [
      { id: 'prepare', text: 'Begin stockpiling water buffers (+5 max water limit permanently)', tooltip: 'Improves water security.' },
      { id: 'scout', text: 'Send extra scouts to map detours (Consumes 10 Food, +2 scout days)', tooltip: 'Provides more time before migration.' }
    ]
  },

  // --- TRADE EVENTS ---
  {
    id: 'visiting_merchant',
    name: 'Floating Caravan of the Eye',
    category: 'Trade',
    description: 'A majestic merchant caravan on a multi-beast draft cart has pulled up to our camps. They offer rare precursor technology in exchange for base ores.',
    intensity: 'Calm',
    durationDays: 0.6,
    isRejectable: true,
    choices: [
      { id: 'trade', text: 'Trade Copper & Iron for Relics (Consumes 20 Copper, +2 Relics)', tooltip: 'Acquires ultra-rare materials.' },
      { id: 'hire', text: 'Hire a veteran Guard (Consumes 10 Silver, spawns 1 level 4 Hunter)', tooltip: 'Bolsters local defenses instantly.' },
      { id: 'decline', text: 'Decline trade offers', tooltip: 'No resource transactions.' }
    ]
  },
  {
    id: 'emergency_trade_request',
    name: 'Dying Enclave Distress Call',
    category: 'Trade',
    description: 'An emergency beacon flares from a nearby off-screen camp. They are freezing and desperate for wood. They will trade moon-iron for immediate shelter logs.',
    intensity: 'Low',
    durationDays: 0.8,
    isRejectable: true,
    choices: [
      { id: 'help', text: 'Send wood cargo caravans (Consumes 40 Wood, +15 Gold, +20 Relation)', tooltip: 'Provides high payout and builds relationships.' },
      { id: 'ignore', text: 'Decline help request', tooltip: 'Avoids resource expenditure.' }
    ]
  },

  // --- DIPLOMACY EVENTS ---
  {
    id: 'alliance_proposal',
    name: 'The Red Ravine Pact',
    category: 'Diplomacy',
    description: 'The elders of Red Hollow have sent a diplomatic runner holding a treaty of alliance. They wish to unite our Oracles and split precursor discoveries.',
    intensity: 'Low',
    durationDays: 2.0,
    isRejectable: true,
    choices: [
      { id: 'accept', text: 'Accept Treaty (+40 Relationship, +10 Reputation)', tooltip: 'Secures a powerful off-screen ally.' },
      { id: 'demand', text: 'Demand tribute in exchange for protection (+10 Gold, +10 relation)', tooltip: 'Aggressive negotiation.' },
      { id: 'reject', text: 'Politely stay independent', tooltip: 'Maintains absolute neutrality.' }
    ]
  },
  {
    id: 'rival_village_threat',
    name: 'Warlords Border Grievance',
    category: 'Diplomacy',
    description: 'A hostile delegation from the "Desperate Band" warcamp has posted spears at our borders. They demand 20 silver or 40 food as border tax.',
    intensity: 'Medium',
    durationDays: 0.8,
    choices: [
      { id: 'pay', text: 'Pay the protection tax (Consumes 20 Silver)', tooltip: 'Avoids conflict, but costs valuables.' },
      { id: 'defy', text: 'Defy them and fortify borders (-30 Relationship, +15 Morale)', tooltip: 'Prepares the clan for potential defense skirmishes.' },
      { id: 'negotiate', text: 'Oracle diplomatically deceives them (Consumes 10 Berries, -5 Relationship)', tooltip: 'De-escalates tension with lies.' }
    ]
  },

  // --- EXPEDITION EVENTS ---
  {
    id: 'ruin_rumor_sparks',
    name: 'Precursor Power Core Rumor',
    category: 'Expedition',
    description: 'A traveler speaking in fast, static-rhythmed dialects reveals coordinates to an intact "Sector-7 Bio-Dome" bunker. There may be automated greenrooms inside.',
    intensity: 'Low',
    durationDays: 1.8,
    choices: [
      { id: 'mark', text: 'Chart expedition path (+20 Research Points)', tooltip: 'Reveals coordinates.' },
      { id: 'ignore', text: 'Dismiss it as a mirage', tooltip: 'Avoids chasing phantom technology.' }
    ]
  },
  {
    id: 'rescue_trapped_scout',
    name: 'S.O.S from the Rust Spires',
    category: 'Expedition',
    description: 'An automated distress signal indicates a skilled scout from a friendly village is trapped in a collapsing seismic shaft.',
    intensity: 'Low',
    durationDays: 0.5,
    isRejectable: true,
    choices: [
      { id: 'save', text: 'Deploy rescue team (Consumes 15 Food, 1 Spear)', tooltip: 'High chance to recruit a veteran Scout!' },
      { id: 'ignore', text: 'Leave them to the Storm (-10 Reputation)', tooltip: 'Loses respect with other villages.' }
    ]
  },

  // --- DANGER EVENTS ---
  {
    id: 'raider_scouts_harassment',
    name: 'Rust Warlords Scouting Party',
    category: 'Danger',
    description: 'Armed raiders on hover-skiffs are circle-riding near our outer resource stockpiles, trying to intimidate gatherers and steal loose metal.',
    intensity: 'Medium',
    durationDays: 0.9,
    choices: [
      { id: 'fight', text: 'Deploy Hunters to scare them off (Requires Hunters, potential injuries)', tooltip: 'Fires warnings to drive them away.' },
      { id: 'bribe', text: 'Give them copper scraps to leave (Consumes 15 Copper)', tooltip: 'Buys temporary peace.' },
      { id: 'hide', text: 'Retreat gatherers inside camps (-10 Wood/Stone gathered this tick)', tooltip: 'Gatherers drop supplies and hide.' }
    ]
  },
  {
    id: 'raider_attack_event',
    name: 'Warlords Desperate Siege',
    category: 'Danger',
    description: 'A heavily armed raiding force from the Desperate Band is launching an assault on our central depot! They carry scrap spears and storm shields.',
    intensity: 'High',
    durationDays: 0.6,
    choices: [
      { id: 'stand_ground', text: 'Organize central shield wall (Requires Hunter/Spears, major combat)', tooltip: 'Hunters defend the village. Successful defense gives massive loot.' },
      { id: 'evacuate', text: 'Evacuate stockpile into deep caverns (-40 Wood, -40 Stone, -30 Food stolen)', tooltip: 'Raiders pillage our storage but no one dies.' },
      { id: 'bribe_gold', text: 'Offer moon-iron tribute to buy them off (Consumes 8 Gold)', tooltip: 'Extremely expensive, but completely avoids bloodshed.' }
    ]
  },
  {
    id: 'storm_surge_extreme',
    name: 'Electrostatic Ion Surge',
    category: 'Danger',
    description: 'A sudden atmospheric static discharge is overloading electronic structures. Lightning rods are screaming; power systems are near critical collapse.',
    intensity: 'High',
    durationDays: 0.7,
    choices: [
      { id: 'discharge', text: 'Discharge current through ancient grounders (Consumes 8 Ancient Materials)', tooltip: 'Safely grounds the static.' },
      { id: 'overload', text: 'Let Science Machines absorb the surge (-1 Science Machine structure, +50 Research)', tooltip: 'Destroys a building but yields breakthrough tech.' },
      { id: 'shelter', text: 'Huddle in shelters and pray (-15 Health for everyone, -20 Morale)', tooltip: 'Saves resources but inflicts pain and terror.' }
    ]
  }
];

// Determine if an event is eligible based on capability profile, stage, and cooldowns
export function checkEventEligibility(
  event: DirectorEvent,
  profile: PlayerCapabilityProfile,
  state: AIDirectorState,
  currentDay: number
): { eligible: boolean; reason?: string } {
  // Check category and specific event cooldowns
  if ((state.eventCooldowns[event.category] ?? 0) > 0) {
    return { eligible: false, reason: `Category Cooldown: ${event.category} (${Math.round(state.eventCooldowns[event.category])} days left)` };
  }
  if ((state.eventCooldowns[event.id] ?? 0) > 0) {
    return { eligible: false, reason: `Event Cooldown: ${event.id} (${Math.round(state.eventCooldowns[event.id])} days left)` };
  }

  // Prevent dual events
  if (state.activeEvent && !state.activeEvent.resolved) {
    return { eligible: false, reason: 'Another event is already active.' };
  }

  // Ensure danger events don't wipe out weak tribes (Threat Fairness Rule)
  if (event.category === 'Danger') {
    if (profile.population.adults < 2) {
      return { eligible: false, reason: 'Tribe is too weak (Not enough adults).' };
    }
    if (profile.survival.morale < 35 && profile.survival.food < 15) {
      return { eligible: false, reason: 'Tribe is in critical crisis mode already.' };
    }
    
    // Highly advanced raids require defense presence
    if (event.id === 'raider_attack_event' && profile.defense.strengthScore < 15) {
      return { eligible: false, reason: 'Central raid is too dangerous for defensive rating (< 15).' };
    }
  }

  // Event category specific rules
  if (event.id === 'rescue_trapped_scout' && profile.population.total < 3) {
    return { eligible: false, reason: 'Tribe population is too small to rescue others (< 3).' };
  }
  if (event.id === 'alliance_proposal' && profile.knowledge.oracleLevel < 3) {
    return { eligible: false, reason: 'Requires Oracle level 3 or higher to establish alliances.' };
  }
  if (event.id === 'beast_disease' && profile.defense.animals === 0) {
    return { eligible: false, reason: 'No tamed animals to infect.' };
  }

  // All checks passed!
  return { eligible: true };
}

// Tick the AI Director simulation. Updates stats, triggers random events based on weights and pacing.
export function tickAIDirector(
  tribe: Tribesperson[],
  mapData: MapData,
  deltaDays: number,
  addLog: (text: string, type: string) => void
): MapData {
  const nextMap = { ...mapData };
  if (!nextMap.aiDirector) {
    nextMap.aiDirector = initializeAIDirectorState();
  }

  const state = { ...nextMap.aiDirector };
  const currentDay = nextMap.gameDaysPlayed ?? 0.40;

  // --- CHECK EVENT EXPIRATION (SURVIVAL MODE) ---
  if (state.activeEvent && !state.activeEvent.resolved) {
    const expires = state.activeEvent.expiresDay ?? (state.activeEvent.triggeredDay + (state.activeEvent.event.durationDays ?? 1.5));
    if (currentDay >= expires) {
      const ev = state.activeEvent.event;
      let defaultChoiceId = 'ignore'; // fallback default
      
      if (ev.id === 'raider_attack_event') {
        defaultChoiceId = 'evacuate'; // automatically steal resources
      } else if (ev.id === 'spoiled_food_warning') {
        defaultChoiceId = 'ignore'; // food spoils, sickness spreads
      } else if (ev.id === 'beast_disease') {
        defaultChoiceId = 'wait'; // sickness spreads
      } else if (ev.id === 'predator_stalking') {
        defaultChoiceId = 'fortify'; // consume logs as default defensive action
      } else if (ev.id === 'rival_village_threat') {
        defaultChoiceId = 'defy'; // relations plummet
      } else if (ev.id === 'visiting_merchant') {
        defaultChoiceId = 'decline'; // they leave peacefully
      } else {
        // Find last choice as default (often 'ignore', 'decline', or 'wait')
        if (ev.choices && ev.choices.length > 0) {
          defaultChoiceId = ev.choices[ev.choices.length - 1].id;
        }
      }

      addLog(`⏰ TIME EXPIRED: "${ev.name}" has expired! The outcome has been resolved automatically.`, 'danger');
      
      // Resolve the outcome
      const outcome = resolveEventChoice(defaultChoiceId, ev, nextMap, tribe, addLog);
      nextMap.stockpile = outcome.mapData.stockpile;
      
      // Clear the activeEvent inside state
      state.activeEvent = null;
      
      // Mirror the tribespeople updates (morale, health, status) back into the active array
      outcome.tribe.forEach((updatedPerson) => {
        const original = tribe.find(t => t.id === updatedPerson.id);
        if (original) {
          if (original.stats && updatedPerson.stats) {
            original.stats.morale = updatedPerson.stats.morale;
            original.stats.health = updatedPerson.stats.health;
          }
          original.isAlive = updatedPerson.isAlive;
          original.statusText = updatedPerson.statusText;
        }
      });
    }
  }

  // 1. Decelerate Cooldowns
  const updatedCooldowns = { ...state.eventCooldowns };
  Object.keys(updatedCooldowns).forEach((k) => {
    updatedCooldowns[k] = Math.max(0, updatedCooldowns[k] - deltaDays);
  });
  state.eventCooldowns = updatedCooldowns;

  if (state.globalEventCooldown === undefined) {
    state.globalEventCooldown = 0;
  }
  state.globalEventCooldown = Math.max(0, state.globalEventCooldown - deltaDays);

  // Update recent stress recovery timers
  state.intensityTimer += deltaDays;

  // 2. Refresh capability profile
  const profile = calculatePlayerCapability(tribe, nextMap, state.recentStress, currentDay);
  state.capabilityProfile = profile;

  // Determine stage
  if (currentDay < 6.0) {
    state.difficultyStage = 'Early';
  } else if (currentDay < 20.0) {
    state.difficultyStage = 'Mid';
  } else {
    state.difficultyStage = 'Late';
  }

  // 3. Pacing & Intensity State Machine transitions
  if (state.intensity === 'Crisis' && state.intensityTimer > 4.0) {
    state.intensity = 'Recovery';
    state.intensityTimer = 0;
    addLog('🌈 AI Director: We are entering a recovery period. Weather is stabilizing and merchants are arriving.', 'success');
  } else if (state.intensity === 'Recovery' && state.intensityTimer > 3.0) {
    state.intensity = 'Calm';
    state.intensityTimer = 0;
  } else if (state.intensity === 'High' && state.intensityTimer > 2.5) {
    state.intensity = 'Recovery';
    state.intensityTimer = 0;
  } else if (state.intensity === 'Calm' && state.intensityTimer > 6.0) {
    // Escalate to Medium intensity
    state.intensity = 'Medium';
    state.intensityTimer = 0;
  }

  // 4. Roll for dynamic events!
  // Checks eligibility and rolls a probability every 1 game day.
  const lastRollDay = (state as any).lastEventRollDay ?? 0;
  if (currentDay - lastRollDay >= 1.0 && !state.activeEvent && (state.globalEventCooldown ?? 0) <= 0) {
    (state as any).lastEventRollDay = currentDay;

    // Filter eligible events
    const eligibleEvents = EVENTS_DECK.filter((ev) => {
      // Stage matching
      if (state.difficultyStage === 'Early' && ev.intensity === 'High') return false;
      if (state.difficultyStage === 'Late' && ev.intensity === 'Low' && Math.random() < 0.4) return false;

      // Check specific parameters
      const check = checkEventEligibility(ev, profile, state, currentDay);
      return check.eligible;
    });

    if (eligibleEvents.length > 0) {
      // Weighted selection based on needs
      const weights = eligibleEvents.map((ev) => {
        let weight = 10;
        
        // Increase weight of survival events if stockpiles are low
        if (ev.category === 'Survival') {
          if (profile.survival.food < 25 || profile.survival.water < 25) weight += 20;
        }

        // Increase weight of danger events if the tribe is very powerful
        if (ev.category === 'Danger') {
          if (profile.defense.strengthScore > 40) weight += 15;
          if (state.intensity === 'High' || state.intensity === 'Crisis') weight += 25;
        }

        // Increase weight of trade if we have goods but low supplies
        if (ev.category === 'Trade' && profile.economy.tradeGoodsValue > 20) weight += 10;

        // Increase weight of recovery events in Recovery mode
        if (state.intensity === 'Recovery' && ev.category === 'Social') weight += 30;

        return { event: ev, weight };
      });

      // Roll
      const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
      let roll = Math.random() * totalWeight;
      let selectedEvent: DirectorEvent | null = null;

      for (let i = 0; i < weights.length; i++) {
        roll -= weights[i].weight;
        if (roll <= 0) {
          selectedEvent = weights[i].event;
          break;
        }
      }

      // Check triggering probability (25% base, scale based on intensity)
      const triggerChance = state.intensity === 'Crisis' ? 0.40 : state.intensity === 'High' ? 0.35 : state.intensity === 'Recovery' ? 0.15 : 0.25;
      if (selectedEvent && Math.random() < triggerChance) {
        state.activeEvent = {
          event: selectedEvent,
          triggeredDay: currentDay,
          expiresDay: currentDay + (selectedEvent.durationDays ?? 1.5),
          resolved: false,
        };
        state.globalEventCooldown = 7.0 + Math.random() * 5.0; // Peaceful 7-12 days cooldown
        addLog(`🔔 DYNAMIC EVENT: "${selectedEvent.name}" has occurred. Visit the Oracle or notifications panel to make a decision!`, 'warning');
      }
    }
  }

  nextMap.aiDirector = state;
  return nextMap;
}

// Resolve the outcome of a decision option selected by the player
export function resolveEventChoice(
  choiceId: string,
  event: DirectorEvent,
  mapData: MapData,
  tribe: Tribesperson[],
  addLog: (text: string, type: string) => void
): { mapData: MapData; tribe: Tribesperson[] } {
  const nextMap = { ...mapData };
  let nextTribe = [...tribe];
  const director = { ...nextMap.aiDirector! };
  const currentDay = nextMap.gameDaysPlayed ?? 0.40;

  let message = '';
  let statusType = 'info';

  // Apply outcomes depending on event + choice
  switch (event.id) {
    case 'spoiled_food_warning':
      if (choiceId === 'clean') {
        nextMap.stockpile.medicine = Math.max(0, (nextMap.stockpile.medicine ?? 0) - 5);
        message = 'You sterilize the cellars. All food is secured safely!';
        statusType = 'success';
      } else if (choiceId === 'burn') {
        nextMap.stockpile.food = Math.max(0, (nextMap.stockpile.food ?? 0) - 15);
        nextMap.stockpile.charcoal = (nextMap.stockpile.charcoal ?? 0) + 5;
        message = 'You burn the infected grain vaults. Spores are purged, leaving charcoal residue, but food is lost.';
        statusType = 'warning';
      } else {
        // Sickness
        nextTribe = nextTribe.map((p) => {
          if (p.isAlive && Math.random() < 0.45) {
            return {
              ...p,
              stats: { ...p.stats, health: Math.max(10, p.stats.health - 25), morale: Math.max(0, p.stats.morale - 20) },
              statusText: '🤢 Food Sickness'
            };
          }
          return p;
        });
        director.recentStress.recentIllnessOutbreak = currentDay;
        message = 'You ignore the spores. Multiple gatherers ingest the mold and fall severely ill.';
        statusType = 'death';
      }
      break;

    case 'water_spring_reveal':
      if (choiceId === 'collect') {
        nextMap.stockpile.reservoirWater = (nextMap.stockpile.reservoirWater ?? 0) + 25;
        message = 'Water bins are filled to the brim with purified dew droplets!';
        statusType = 'success';
      } else {
        nextMap.researchPoints = Math.round((nextMap.researchPoints + 20) * 10) / 10;
        message = 'Our scholars deconstruct the nozzle, learning secrets of Precursor atmospheric grounding!';
        statusType = 'success';
      }
      break;

    case 'medicine_rust_harvest':
      if (choiceId === 'harvest') {
        nextMap.stockpile.medicine = (nextMap.stockpile.medicine ?? 0) + 8;
        message = 'The healer harvests the blue lichens, packing them into secure satchels.';
        statusType = 'success';
      } else {
        if (Math.random() < 0.5) {
          nextMap.stockpile.medicine = (nextMap.stockpile.medicine ?? 0) + 18;
          message = 'Success! The lichen propagates cleanly near our campfire, yielding abundant medicinal extracts.';
          statusType = 'success';
        } else {
          message = 'The transplant fails; the sensitive lichens disintegrate in the open thermal wind.';
          statusType = 'warning';
        }
      }
      break;

    case 'pack_birds_migration':
      if (choiceId === 'tame') {
        nextMap.stockpile.berries = Math.max(0, (nextMap.stockpile.berries ?? 0) - 20);
        // Spawn 2 Sheep (tame) or PackBirds if available
        if (!nextMap.animals) nextMap.animals = [];
        const center = { x: 20, z: 20 };
        const newBird1 = {
          id: `tame_bird_1_${Date.now()}`,
          type: 'PackBird',
          category: 'SmallHerbivore' as any,
          x: center.x - 2,
          z: center.z - 2,
          y: 0,
          targetX: center.x,
          targetZ: center.z,
          HP: 50,
          maxHP: 50,
          isDead: false,
          isHarvested: false,
          gender: 'Female' as any,
          agePhase: 'Adult' as any,
          ageDays: 12,
          gestationTimer: 0,
          isPregnant: false,
          energy: 100,
          hunger: 100,
          thirst: 100,
          fear: 0,
          stress: 0,
          isSleeping: false,
          sleepTimer: 0,
          tameLevel: 100,
          isTame: true,
          captiveBorn: false,
          trustLevel: 100,
          meatAmount: 25,
          hideAmount: 5,
          boneAmount: 3,
          fatAmount: 2,
          rareSpecimenAmount: 2,
        };
        const newBird2 = { ...newBird1, id: `tame_bird_2_${Date.now()}`, gender: 'Male' as any };
        nextMap.animals.push(newBird1, newBird2);
        message = 'A breeding pair of gorgeous blue Pack Birds has been integrated into your livestock pens!';
        statusType = 'success';
      } else if (choiceId === 'hunt') {
        nextMap.stockpile.meat = (nextMap.stockpile.meat ?? 0) + 20;
        nextMap.stockpile.horns = (nextMap.stockpile.horns ?? 0) + 4;
        message = 'Hunters safely slaughter the migrating fowl. Pantries are stocked!';
        statusType = 'success';
      } else {
        nextTribe = nextTribe.map(p => p.isAlive ? { ...p, stats: { ...p.stats, morale: Math.min(100, p.stats.morale + 10) } } : p);
        message = 'The birds sleep peacefully in the outskirts, filling our dreams with tranquil melodies.';
        statusType = 'success';
      }
      break;

    case 'predator_stalking':
      if (choiceId === 'bait') {
        nextMap.stockpile.meat = Math.max(0, (nextMap.stockpile.meat ?? 0) - 10);
        nextMap.stockpile.medicine = Math.max(0, (nextMap.stockpile.medicine ?? 0) - 2);
        message = 'The toxic meat bait successfully poisons the stalker; it retreats into the outer ravines.';
        statusType = 'success';
      } else if (choiceId === 'fortify') {
        nextMap.stockpile.wood = Math.max(0, (nextMap.stockpile.wood ?? 0) - 15);
        message = 'Huge bonfires are erected. The stalker circles the flames but retreats, terrified.';
        statusType = 'success';
      } else {
        nextMap.researchPoints = Math.round((nextMap.researchPoints + 10) * 10) / 10;
        message = 'Your brave scouts track the beast, charting its routes. It senses we are aware and departs.';
        statusType = 'success';
      }
      break;

    case 'beast_disease':
      if (choiceId === 'treat') {
        nextMap.stockpile.fiber = Math.max(0, (nextMap.stockpile.fiber ?? 0) - 10);
        nextMap.stockpile.medicine = Math.max(0, (nextMap.stockpile.medicine ?? 0) - 4);
        message = 'The warm poultice is highly effective. Tamed animals recover completely!';
        statusType = 'success';
      } else if (choiceId === 'quarantine') {
        if (nextMap.animals) {
          const tamedIndex = nextMap.animals.findIndex(a => !a.isDead && a.isTame);
          if (tamedIndex !== -1) {
            nextMap.animals.splice(tamedIndex, 1);
          }
        }
        nextMap.stockpile.meat = (nextMap.stockpile.meat ?? 0) + 15;
        message = 'You slaughter the infected beast, preserving uncontaminated meat and shielding the herd.';
        statusType = 'warning';
      } else {
        if (nextMap.animals) {
          nextMap.animals = nextMap.animals.map(a => a.isTame ? { ...a, HP: Math.max(10, a.HP - 35) } : a);
        }
        message = 'The rot spreads! Multiple domesticated animals lose health and strength permanently.';
        statusType = 'death';
      }
      break;

    case 'tribal_dispute':
      if (choiceId === 'repute') {
        director.playerReputation = Math.min(100, director.playerReputation + 5);
        nextTribe = nextTribe.map(p => p.isAlive ? { ...p, stats: { ...p.stats, morale: Math.max(0, p.stats.morale - 5) } } : p);
        message = 'The Oracle acts with rigid fairness. Reputation rises, but the disputants remain slightly bitter.';
        statusType = 'info';
      } else if (choiceId === 'favour') {
        nextTribe = nextTribe.map((p) => {
          if (p.isAlive) {
            const isElder = p.ageYears > 50;
            return { ...p, stats: { ...p.stats, morale: isElder ? Math.min(100, p.stats.morale + 15) : Math.max(0, p.stats.morale - 10) } };
          }
          return p;
        });
        message = 'Respecting elders satisfies tradition, though the younger gatherers complain of favoritism.';
        statusType = 'warning';
      } else {
        nextMap.stockpile.food = Math.max(0, (nextMap.stockpile.food ?? 0) - 20);
        nextTribe = nextTribe.map(p => p.isAlive ? { ...p, stats: { ...p.stats, morale: Math.min(100, p.stats.morale + 20) } } : p);
        message = 'Everyone forgets their grudges amidst hot clay pots of boiled roots and laughter. Disagreements resolved!';
        statusType = 'success';
      }
      break;

    case 'apprentice_breakthrough':
      if (choiceId === 'recipes') {
        nextMap.stockpile.copper = Math.max(0, (nextMap.stockpile.copper ?? 0) - 10);
        nextMap.researchPoints = Math.round((nextMap.researchPoints + 25) * 10) / 10;
        message = 'The apprentice crafts a supercharged conductive conduit, boosting tribal tech progress!';
        statusType = 'success';
      } else {
        nextMap.stockpile.amuletLife = (nextMap.stockpile.amuletLife ?? 0) + 1;
        message = 'The artisan seals the essence into a glowing copper talisman: 1 Amulet of Life forged!';
        statusType = 'success';
      }
      break;

    case 'memorial_ritual':
      nextMap.stockpile.food = Math.max(0, (nextMap.stockpile.food ?? 0) - 15);
      nextTribe = nextTribe.map(p => p.isAlive ? { ...p, stats: { ...p.stats, morale: Math.min(100, p.stats.morale + 25) } } : p);
      message = 'The tribe sings songs of the old world around massive fires. Spirits are deeply elevated.';
      statusType = 'success';
      break;

    case 'vision_celestial':
      if (choiceId === 'map') {
        nextMap.researchPoints = Math.round((nextMap.researchPoints + 15) * 10) / 10;
        message = 'The dream is charted cleanly into our archives. Ancient rumors logged!';
        statusType = 'success';
      } else {
        nextMap.stockpile.copper = Math.max(0, (nextMap.stockpile.copper ?? 0) - 10);
        nextTribe = nextTribe.map(p => p.isAlive ? { ...p, stats: { ...p.stats, morale: Math.min(100, p.stats.morale + 20) } } : p);
        message = 'The Oracle performs a grounding ritual. Violet sparks dissipate safely, soothing spirits.';
        statusType = 'success';
      }
      break;

    case 'future_biome_forecast':
      if (choiceId === 'prepare') {
        message = 'The clan adjusts their clay siphons, optimizing moisture conservation filters.';
        statusType = 'success';
      } else {
        nextMap.stockpile.food = Math.max(0, (nextMap.stockpile.food ?? 0) - 10);
        nextMap.stormDaysUntilMigration = (nextMap.stormDaysUntilMigration ?? 12) + 2;
        message = 'Our scouts successfully clear debris along side channels, extending our safety buffer!';
        statusType = 'success';
      }
      break;

    case 'visiting_merchant':
      if (choiceId === 'trade') {
        nextMap.stockpile.copper = Math.max(0, (nextMap.stockpile.copper ?? 0) - 20);
        nextMap.stockpile.relics = (nextMap.stockpile.relics ?? 0) + 2;
        message = 'You swap raw copper blocks for intact precursor circuit boards (+2 Relics)!';
        statusType = 'success';
      } else if (choiceId === 'hire') {
        nextMap.stockpile.silver = Math.max(0, (nextMap.stockpile.silver ?? 0) - 10);
        const newHunter = createTribesperson(Math.random().toString(36).slice(2, 9), nextMap);
        newHunter.role = 'Hunter';
        newHunter.skills.Hunter = { level: 4, xp: 0, xpToNextLevel: 100 };
        newHunter.name = `Guard ${newHunter.name}`;
        nextTribe.push(newHunter);
        message = `You recruit a formidable veteran guard to join your defenses: Welcome, ${newHunter.name}!`;
        statusType = 'success';
      } else {
        message = 'The merchants pack their carts and glide away, leaving footprints in the copper sand.';
        statusType = 'info';
      }
      break;

    case 'emergency_trade_request':
      if (choiceId === 'help') {
        nextMap.stockpile.wood = Math.max(0, (nextMap.stockpile.wood ?? 0) - 40);
        nextMap.stockpile.gold = (nextMap.stockpile.gold ?? 0) + 15;
        director.playerReputation = Math.min(100, director.playerReputation + 20);
        message = 'You deploy timber carriers. The grateful enclave delivers moon-iron sheets in return!';
        statusType = 'success';
      } else {
        message = 'You ignore the beacon. The coordinates fade into radio silence.';
        statusType = 'warning';
      }
      break;

    case 'alliance_proposal':
      if (choiceId === 'accept') {
        director.playerReputation = Math.min(100, director.playerReputation + 20);
        message = 'The treaty is signed! Red Hollow is now a fully committed military and research ally.';
        statusType = 'success';
      } else if (choiceId === 'demand') {
        nextMap.stockpile.gold = (nextMap.stockpile.gold ?? 0) + 10;
        message = 'You strong-arm the diplomats. They deliver moon-iron tribute, though relations stay tense.';
        statusType = 'warning';
      } else {
        message = 'You maintain independence, preferring isolation over off-screen treaties.';
        statusType = 'info';
      }
      break;

    case 'rival_village_threat':
      if (choiceId === 'pay') {
        nextMap.stockpile.silver = Math.max(0, (nextMap.stockpile.silver ?? 0) - 20);
        message = 'You hand over the silver. The raiders retreat with smug sneers.';
        statusType = 'warning';
      } else if (choiceId === 'defy') {
        nextTribe = nextTribe.map(p => p.isAlive ? { ...p, stats: { ...p.stats, morale: Math.min(100, p.stats.morale + 15) } } : p);
        director.recentStress.recentRaid = currentDay;
        message = 'You refuse to bow! The delegation spits on the soil and leaves. Tribal morale surges!';
        statusType = 'success';
      } else {
        nextMap.stockpile.berries = Math.max(0, (nextMap.stockpile.berries ?? 0) - 10);
        message = 'The Oracle speaks soft words of premonition. The band accepts a small berry offering instead.';
        statusType = 'info';
      }
      break;

    case 'ruin_rumor_sparks':
      nextMap.researchPoints = Math.round((nextMap.researchPoints + 20) * 10) / 10;
      message = 'The location is logged. Ruin path maps prepared!';
      statusType = 'success';
      break;

    case 'rescue_trapped_scout':
      if (choiceId === 'save') {
        nextMap.stockpile.food = Math.max(0, (nextMap.stockpile.food ?? 0) - 15);
        nextMap.stockpile.spear = Math.max(0, (nextMap.stockpile.spear ?? 0) - 1);
        const newScout = createTribesperson(Math.random().toString(36).slice(2, 9), nextMap);
        newScout.role = 'Scout';
        newScout.skills.Scout = { level: 3, xp: 0, xpToNextLevel: 100 };
        nextTribe.push(newScout);
        message = `Success! You pull the trapped scout from the shaft. She pledges her service: Welcome, ${newScout.name}!`;
        statusType = 'success';
      } else {
        director.playerReputation = Math.max(0, director.playerReputation - 10);
        message = 'You ignore the request. Word spreads of your isolationist apathy.';
        statusType = 'warning';
      }
      break;

    case 'raider_scouts_harassment':
      if (choiceId === 'fight') {
        // High success if we have hunters
        const hunters = nextTribe.filter(p => p.isAlive && p.role === 'Hunter').length;
        if (hunters > 0) {
          message = 'Your Hunters fire warning arrows. The scout skiffs retreat in fear!';
          statusType = 'success';
        } else {
          // Injuries
          nextTribe = nextTribe.map(p => p.isAlive && Math.random() < 0.5 ? { ...p, stats: { ...p.stats, health: Math.max(20, p.stats.health - 30) } } : p);
          message = 'Without competent defenders, your gatherers get battered and chased away!';
          statusType = 'death';
        }
      } else if (choiceId === 'bribe') {
        nextMap.stockpile.copper = Math.max(0, (nextMap.stockpile.copper ?? 0) - 15);
        message = 'You offer copper scrap blocks. They snatch the metal and float off.';
        statusType = 'warning';
      } else {
        message = 'Gatherers drop their crates and sprint inside. Operations are delayed, losing stone and wood.';
        statusType = 'warning';
      }
      break;

    case 'raider_attack_event':
      if (choiceId === 'stand_ground') {
        const hLevels = nextTribe.filter(p => p.isAlive && p.role === 'Hunter').reduce((acc, p) => acc + (p.skills?.Hunter?.level ?? 1), 0);
        const defensesValue = hLevels * 6 + (nextMap.stockpile.spear ?? 0) * 10;
        
        if (defensesValue >= 18) {
          nextMap.stockpile.copper = (nextMap.stockpile.copper ?? 0) + 15;
          nextMap.stockpile.silver = (nextMap.stockpile.silver ?? 0) + 10;
          message = 'VICTORY! Your defenders execute a brilliant ambush, driving the raiders away and seizing their dropped cargo!';
          statusType = 'success';
        } else {
          nextTribe = nextTribe.map(p => p.isAlive && Math.random() < 0.4 ? { ...p, stats: { ...p.stats, health: Math.max(20, p.stats.health - 40) } } : p);
          nextMap.stockpile.food = Math.max(0, (nextMap.stockpile.food ?? 0) - 25);
          message = 'Defeat! The raiders break the perimeter, looting larders and injuring multiple defenders before retreating!';
          statusType = 'death';
        }
        director.recentStress.recentRaid = currentDay;
      } else if (choiceId === 'evacuate') {
        nextMap.stockpile.wood = Math.max(0, (nextMap.stockpile.wood ?? 0) - 40);
        nextMap.stockpile.stone = Math.max(0, (nextMap.stockpile.stone ?? 0) - 40);
        nextMap.stockpile.food = Math.max(0, (nextMap.stockpile.food ?? 0) - 30);
        message = 'You hide in the subterranean bunkers. The raiders empty our surface stockpiles but fail to find a single soul.';
        statusType = 'warning';
      } else {
        nextMap.stockpile.gold = Math.max(0, (nextMap.stockpile.gold ?? 0) - 8);
        message = 'You deliver gold blocks. The raiders laugh, accept the heavy tribute, and turn back without violence.';
        statusType = 'success';
      }
      break;

    case 'storm_surge_extreme':
      if (choiceId === 'discharge') {
        nextMap.stockpile.ancientMaterials = Math.max(0, (nextMap.stockpile.ancientMaterials ?? 0) - 8);
        message = 'The atmospheric alloy grounds the charge completely, shielding our grid.';
        statusType = 'success';
      } else if (choiceId === 'overload') {
        nextMap.researchPoints = Math.round((nextMap.researchPoints + 50) * 10) / 10;
        message = 'A Science Machine fuses under intense current, but recordings yield unparalleled energy data!';
        statusType = 'success';
      } else {
        nextTribe = nextTribe.map(p => p.isAlive ? { ...p, stats: { ...p.stats, health: Math.max(15, p.stats.health - 15), morale: Math.max(0, p.stats.morale - 20) } } : p);
        message = 'The electrostatic fields pass right through our hide tents, inducing burns and terror.';
        statusType = 'death';
      }
      break;
  }

  // Register in history
  director.eventHistory.push({
    id: event.id,
    name: event.name,
    day: currentDay,
    outcome: message,
  });

  // Put event and category on cooldown
  director.eventCooldowns[event.category] = 12.0; // Category CD
  director.eventCooldowns[event.id] = 20.0; // Event specific CD

  // Set recovery if crisis solved
  if (event.intensity === 'Crisis' || event.intensity === 'High') {
    director.intensity = 'Recovery';
    director.intensityTimer = 0;
  }

  if (director.activeEvent) {
    director.activeEvent = {
      ...director.activeEvent,
      resolved: true,
    } as any;
  }
  nextMap.aiDirector = director;

  addLog(`📢 RESOLVED: "${event.name}" - ${message}`, statusType);

  return { mapData: nextMap, tribe: nextTribe };
}
