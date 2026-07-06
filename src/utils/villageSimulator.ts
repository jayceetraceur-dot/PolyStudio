import { OtherVillage, OracleMessage, MapData, Tribesperson } from '../types';

// Available culture types for off-screen villages
export const VILLAGE_ARCHETYPES = [
  {
    cultureType: 'Storm-Following Tribe' as const,
    migrationStyle: 'Constant Nomads' as const,
    description: 'Nomadic like your own clan. Skilled at tracking weather fronts and taming herd beasts.',
    specialResources: ['Pack Animals', 'Preserved Meat', 'Storm Maps'],
    culturalTraits: ['Adaptive', 'Resilient', 'Weather-wise']
  },
  {
    cultureType: 'Stationary Eye Settlement' as const,
    migrationStyle: 'Semi-Stationary' as const,
    description: 'Built in large, slow-moving safe thermal corridors. Boasts heavy buildings and active greenhouses.',
    specialResources: ['Advanced Medicine', 'Refined Materials', 'Trained Specialists'],
    culturalTraits: ['Agrarian', 'Constructive', 'Static-loving']
  },
  {
    cultureType: 'Relic Hunter Clan' as const,
    migrationStyle: 'Slow Drifters' as const,
    description: 'A secretive syndicate that stalks the ruins of precursor colonies, excavating long-buried secrets.',
    specialResources: ['Relic Fragments', 'Ruin Maps', 'Precursor Components'],
    culturalTraits: ['Secretive', 'Inquisitive', 'Risk-tolerant']
  },
  {
    cultureType: 'Herding Caravan' as const,
    migrationStyle: 'Constant Nomads' as const,
    description: 'A massive floating market that herds pack birds, wool-goats, and armor-beetles across the valleys.',
    specialResources: ['Breeding Pairs', 'Herd Milk & Cheese', 'Tack & Harnesses'],
    culturalTraits: ['Mercantile', 'Beast-masters', 'Nomadic']
  },
  {
    cultureType: 'Moon-Watcher Enclave' as const,
    migrationStyle: 'Semi-Stationary' as const,
    description: 'A monastic community that interprets the static-bursts of the God\'s Eye, seeking prophecy and memory crystals.',
    specialResources: ['Memory Crystals', 'Moon-Iron Ore', 'Prediction Techniques'],
    culturalTraits: ['Mystical', 'Isolated', 'Knowledge-keepers']
  },
  {
    cultureType: 'Ruin-Born Settlement' as const,
    migrationStyle: 'Fixed Fortified' as const,
    description: 'Lives directly inside sealed blast-chambers of old world bunkers. Possesses higher tech but holds outsiders in extreme suspicion.',
    specialResources: ['Preserved Machinery', 'Power Cells', 'Technical Blueprints'],
    culturalTraits: ['Xenophobic', 'Technological', 'Fortified']
  },
  {
    cultureType: 'Broken Tribe' as const,
    migrationStyle: 'Slow Drifters' as const,
    description: 'A shattered remnant of a colony caught in a sudden storm collapse, searching desperately for shelter.',
    specialResources: ['Scrap Metal', 'Discarded Heirlooms'],
    culturalTraits: ['Desperate', 'Humble', 'Traumatized']
  },
  {
    cultureType: 'Desperate Band' as const,
    migrationStyle: 'Constant Nomads' as const,
    description: 'A low-morale, low-supply warband that may turn to raiding others if their extreme shortages are ignored.',
    specialResources: ['Raid Trophy', 'Weapon Scraps'],
    culturalTraits: ['Aggressive', 'Famine-stricken', 'Unpredictable']
  }
];

const ANCIENT_SITE_NAMES = [
  'Sector-7 Bio-Dome', 'Omega Storage Complex', 'Precursor Array Sigma',
  'Subterranean Cradle', 'Bunker 104', 'Drowned Lab Zeta', 'Shattered Cryo-Vault'
];

const REGIONS = [
  'The Rusting Spires', 'The Glass Desert', 'Wailing Basins',
  'The Obsidian Ridges', 'Whispering Kelp Fields', 'The Hollow Valleys', 'Searing Salt Beds'
];

const ORACLE_FIRST_NAMES = [
  'Vaelen', 'Sariel', 'Kael', 'Lyra', 'Teron', 'Gryph', 'Myra', 'Zarek', 'Orla', 'Nesta', 'Eon', 'Silas'
];

// Seed initial values for a full list of off-screen simulation villages
export function initializeOffScreenVillages(): OtherVillage[] {
  return [
    {
      id: 'v1',
      name: 'Red Hollow',
      distance: 8,
      relationship: 15,
      trust: 25,
      fear: 5,
      respect: 15,
      population: 45,
      knownOracle: 'Oracle Vaelen',
      availableTradeGoods: [
        { item: 'meat', quantity: 20, price: 5 },
        { item: 'bone', quantity: 15, price: 3 },
        { item: 'horns', quantity: 5, price: 15 }
      ],
      neededGoods: [
        { item: 'reservoirWater', priceMultiplier: 1.8 },
        { item: 'berries', priceMultiplier: 1.5 }
      ],
      dangerStatus: 'Safe',
      lastContactTime: '3 days ago',
      visitorsMayArrive: true,

      // Expansions
      cultureType: 'Storm-Following Tribe',
      originStory: 'Founded inside a crimson iron canyon where clay filter-pools gather dew.',
      region: 'Wailing Basins',
      migrationStyle: 'Constant Nomads',
      food: 40,
      water: 10, // suffering drying crisis
      medicine: 25,
      animals: 35,
      tools: 30,
      relics: 4,
      majorShortages: ['Water'],
      dangerLevel: 12,
      morale: 65,
      stability: 80,
      migrationStatus: 'Sheltered in Iron Spires',
      oracleLevel: 3,
      relationships: { 'v2': 'friendly', 'v3': 'suspicious' },
      activeProblems: ['Severe drought dried up central clay filters.'],
      activeOpportunities: ['Discovered an underground moist cavern.'],
      recentEvents: ['Established contact with the player\'s tribe.', 'Traded meat with neighbors.'],
      knownAncientSites: ['Subterranean Cradle'],
      knownTradeRoutes: ['The Red Ravine Path'],
      specialResources: ['Dew Siphons', 'Camel-Birds'],
      culturalTraits: ['Water-Wise', 'Hardy Hunter'],
      reputation: 'Honorable survivalists',
      lastContactDate: 'Y1 M1 D1'
    },
    {
      id: 'v2',
      name: 'Bloomfields Clan',
      distance: 14,
      relationship: 20,
      trust: 40,
      fear: 0,
      respect: 30,
      population: 60,
      knownOracle: 'Oracle Sariel',
      availableTradeGoods: [
        { item: 'berries', quantity: 40, price: 2 },
        { item: 'fiber', quantity: 30, price: 3 },
        { item: 'mushrooms', quantity: 20, price: 4 }
      ],
      neededGoods: [
        { item: 'stone', priceMultiplier: 1.5 },
        { item: 'wood', priceMultiplier: 1.3 }
      ],
      dangerStatus: 'Safe',
      lastContactTime: 'Yesterday',
      visitorsMayArrive: true,

      // Expansions
      cultureType: 'Stationary Eye Settlement',
      originStory: 'A coalition of farmers who settled the geothermal vents of the Bloomfields Basin.',
      region: 'The Hollow Valleys',
      migrationStyle: 'Semi-Stationary',
      food: 75,
      water: 70,
      medicine: 40,
      animals: 20,
      tools: 50,
      relics: 2,
      majorShortages: ['Stone', 'Wood'],
      dangerLevel: 8,
      morale: 85,
      stability: 95,
      migrationStatus: 'Stationary in Basin Corridors',
      oracleLevel: 4,
      relationships: { 'v1': 'friendly', 'v3': 'neutral' },
      activeProblems: ['Fungal rot threatening lower nursery beds.'],
      activeOpportunities: ['Bountiful seasonal yield in root vegetables.'],
      recentEvents: ['Bred three new draft beasts.', 'Re-sealed thermal greenhouse dome.'],
      knownAncientSites: ['Sector-7 Bio-Dome'],
      knownTradeRoutes: ['Thermal Vent Sump'],
      specialResources: ['Precursor Fertilizers', 'Giant Pumpkins'],
      culturalTraits: ['Sedentary', 'Cultivators'],
      reputation: 'Gentle suppliers',
      lastContactDate: 'Y1 M1 D1'
    },
    {
      id: 'v3',
      name: 'Ruin-Diver Enclave',
      distance: 22,
      relationship: 0,
      trust: 10,
      fear: 15,
      respect: 20,
      population: 35,
      knownOracle: 'Oracle Kael',
      availableTradeGoods: [
        { item: 'ancientMaterials', quantity: 8, price: 12 },
        { item: 'copper', quantity: 10, price: 8 },
        { item: 'silver', quantity: 5, price: 15 }
      ],
      neededGoods: [
        { item: 'meat', priceMultiplier: 1.6 },
        { item: 'saltedMeat', priceMultiplier: 2.0 }
      ],
      dangerStatus: 'Threatened',
      lastContactTime: 'Never',
      visitorsMayArrive: false,

      // Expansions
      cultureType: 'Relic Hunter Clan',
      originStory: 'A rogue guild of explorers who took up residence inside an ancient command center.',
      region: 'The Rusting Spires',
      migrationStyle: 'Slow Drifters',
      food: 20,
      water: 30,
      medicine: 15,
      animals: 10,
      tools: 80,
      relics: 18,
      majorShortages: ['Food'],
      dangerLevel: 35,
      morale: 50,
      stability: 65,
      migrationStatus: 'Escavating Precursor Tower',
      oracleLevel: 5,
      relationships: { 'v1': 'suspicious', 'v2': 'neutral' },
      activeProblems: ['Saber-wolf pack guarding ruin entrance.', 'High radiation leakage.'],
      activeOpportunities: ['Located an unbreached weapons bank.'],
      recentEvents: ['Unearthed a functional memory storage crystal.', 'Scouts encountered wild scavengers.'],
      knownAncientSites: ['Omega Storage Complex', 'Precursor Array Sigma'],
      knownTradeRoutes: ['The Rusty Runway'],
      specialResources: ['Plasma Torches', 'Decoder Matrices'],
      culturalTraits: ['Scavengers', 'Tech-reverent'],
      reputation: 'Secretive relic traders',
      lastContactDate: 'Never'
    },
    {
      id: 'v4',
      name: 'Wind-Bone Caravan',
      distance: 18,
      relationship: 5,
      trust: 15,
      fear: 0,
      respect: 18,
      population: 50,
      knownOracle: 'Oracle Lyra',
      availableTradeGoods: [
        { item: 'horns', quantity: 8, price: 10 },
        { item: 'featherVest', quantity: 3, price: 25 },
        { item: 'beastFlesh', quantity: 15, price: 6 }
      ],
      neededGoods: [
        { item: 'medicine', priceMultiplier: 1.7 },
        { item: 'copper', priceMultiplier: 1.4 }
      ],
      dangerStatus: 'Safe',
      lastContactTime: 'Never',
      visitorsMayArrive: true,

      // Expansions
      cultureType: 'Herding Caravan',
      originStory: 'A collective of avian herdsmen riding massive pack-birds across the trade corridors.',
      region: 'The Glass Desert',
      migrationStyle: 'Constant Nomads',
      food: 45,
      water: 50,
      medicine: 12,
      animals: 75,
      tools: 40,
      relics: 3,
      majorShortages: ['Medicine'],
      dangerLevel: 15,
      morale: 70,
      stability: 85,
      migrationStatus: 'Traversing Salt Flat Margins',
      oracleLevel: 2,
      relationships: { 'v1': 'friendly', 'v2': 'neutral', 'v3': 'suspicious' },
      activeProblems: ['Herd sickness infecting younger pack-birds.'],
      activeOpportunities: ['Abundant nesting grounds discovered on northern mesa.'],
      recentEvents: ['Hatched twelve healthy pack-birds.', 'Avoided a minor lightning cyclone.'],
      knownAncientSites: ['Shattered Cryo-Vault'],
      knownTradeRoutes: ['The Feather Path'],
      specialResources: ['Pack-Bird Eggs', 'Feather Leather'],
      culturalTraits: ['Avian-bond', 'Bargainers'],
      reputation: 'Lively merchants',
      lastContactDate: 'Never'
    },
    {
      id: 'v5',
      name: 'Ash-Mirror Monastery',
      distance: 28,
      relationship: 0,
      trust: 5,
      fear: 0,
      respect: 25,
      population: 28,
      knownOracle: 'Oracle Teron',
      availableTradeGoods: [
        { item: 'relics', quantity: 3, price: 30 },
        { item: 'memoryCrystal', quantity: 2, price: 40 },
        { item: 'herbs', quantity: 20, price: 3 }
      ],
      neededGoods: [
        { item: 'food', priceMultiplier: 1.9 },
        { item: 'wood', priceMultiplier: 1.6 }
      ],
      dangerStatus: 'Safe',
      lastContactTime: 'Never',
      visitorsMayArrive: false,

      // Expansions
      cultureType: 'Moon-Watcher Enclave',
      originStory: 'A highly reclusive group observing the moon of iron from an elevated basalt peak.',
      region: 'The Obsidian Ridges',
      migrationStyle: 'Semi-Stationary',
      food: 18,
      water: 40,
      medicine: 60,
      animals: 5,
      tools: 20,
      relics: 15,
      majorShortages: ['Food', 'Wood'],
      dangerLevel: 10,
      morale: 60,
      stability: 90,
      migrationStatus: 'Ritual Starwatching on Obsidian Slopes',
      oracleLevel: 6,
      relationships: { 'v3': 'neutral', 'v4': 'neutral' },
      activeProblems: ['Extreme freezing temperatures freezing storage bins.'],
      activeOpportunities: ['A wave of star-shards landed on the crest.'],
      recentEvents: ['Conducted a static dream communion.', 'Welcomed a new oracle apprentice.'],
      knownAncientSites: ['Precursor Array Sigma'],
      knownTradeRoutes: ['The Basalt Staircase'],
      specialResources: ['Astral Ink', 'Lunar-Iron Slags'],
      culturalTraits: ['Monastic', 'Dream-Seers'],
      reputation: 'Wise and ominous prophecy-keepers',
      lastContactDate: 'Never'
    }
  ];
}

// Tick-based Lightweight Simulation Engine for Off-screen villages
// Evaluated weekly (every 7 game days)
export function runWeeklyVillageSimulation(
  mapData: MapData,
  currentDay: number,
  addLog: (text: string, type: string) => void
): { updatedVillages: OtherVillage[]; newMessages: OracleMessage[] } {
  
  const villages = mapData.knownVillages ? [...mapData.knownVillages] : initializeOffScreenVillages();
  const newMessages: OracleMessage[] = [];

  // Update each village's simulation state
  const updatedVillages = villages.map((v) => {
    const next = { ...v };

    // 1. Resource Consumption (scale based on population)
    const popFactor = next.population / 40;
    const foodConsumption = Math.round((4 + Math.random() * 4) * popFactor);
    const waterConsumption = Math.round((5 + Math.random() * 4) * popFactor);

    next.food = Math.max(0, (next.food ?? 50) - foodConsumption);
    next.water = Math.max(0, (next.water ?? 50) - waterConsumption);

    // 2. Archetype Production & State Updates
    let foodProduction = 0;
    let waterProduction = 0;
    let medicineProduction = 0;
    let animalChange = 0;
    let toolProduction = 0;
    let relicProduction = 0;

    switch (next.cultureType) {
      case 'Storm-Following Tribe':
        foodProduction = Math.round(10 + Math.random() * 8);
        waterProduction = Math.round(8 + Math.random() * 6);
        animalChange = Math.round(Math.random() * 4 - 1);
        toolProduction = Math.round(3 + Math.random() * 4);
        break;
      case 'Stationary Eye Settlement':
        foodProduction = Math.round(18 + Math.random() * 10);
        waterProduction = Math.round(15 + Math.random() * 8);
        medicineProduction = Math.round(5 + Math.random() * 4);
        toolProduction = Math.round(6 + Math.random() * 5);
        break;
      case 'Relic Hunter Clan':
        foodProduction = Math.round(6 + Math.random() * 5);
        waterProduction = Math.round(6 + Math.random() * 5);
        relicProduction = Math.random() > 0.4 ? 1 : 0;
        toolProduction = Math.round(10 + Math.random() * 6);
        break;
      case 'Herding Caravan':
        foodProduction = Math.round(8 + Math.random() * 6);
        waterProduction = Math.round(8 + Math.random() * 6);
        animalChange = Math.round(4 + Math.random() * 6);
        break;
      case 'Moon-Watcher Enclave':
        foodProduction = Math.round(4 + Math.random() * 4);
        waterProduction = Math.round(10 + Math.random() * 6);
        medicineProduction = Math.round(8 + Math.random() * 5);
        relicProduction = Math.random() > 0.5 ? 1 : 0;
        break;
      case 'Ruin-Born Settlement':
        foodProduction = Math.round(8 + Math.random() * 6);
        waterProduction = Math.round(8 + Math.random() * 6);
        toolProduction = Math.round(12 + Math.random() * 8);
        break;
      case 'Broken Tribe':
        foodProduction = Math.round(2 + Math.random() * 3);
        waterProduction = Math.round(3 + Math.random() * 4);
        break;
      case 'Desperate Band':
        foodProduction = Math.round(1 + Math.random() * 3);
        waterProduction = Math.round(2 + Math.random() * 3);
        break;
    }

    next.food = Math.min(100, (next.food ?? 50) + foodProduction);
    next.water = Math.min(100, (next.water ?? 50) + waterProduction);
    next.medicine = Math.min(100, (next.medicine ?? 20) + medicineProduction);
    next.animals = Math.max(0, Math.min(100, (next.animals ?? 20) + animalChange));
    next.tools = Math.min(100, (next.tools ?? 25) + toolProduction);
    if (relicProduction > 0) {
      next.relics = Math.min(50, (next.relics ?? 0) + relicProduction);
    }

    // Adjust trade inventory according to what they produce
    const tradeGoods = [...(next.availableTradeGoods || [])];
    tradeGoods.forEach((g) => {
      // simulate inventory changes
      if (g.item === 'meat' || g.item === 'beastFlesh') {
        g.quantity = Math.max(5, Math.min(40, g.quantity + Math.round(Math.random() * 8 - 4)));
      } else if (g.item === 'berries' || g.item === 'mushrooms') {
        g.quantity = Math.max(5, Math.min(50, g.quantity + Math.round(Math.random() * 12 - 6)));
      } else if (g.item === 'ancientMaterials' || g.item === 'copper' || g.item === 'silver') {
        g.quantity = Math.max(2, Math.min(15, g.quantity + Math.round(Math.random() * 3 - 1)));
      }
    });
    next.availableTradeGoods = tradeGoods;

    // 3. Compute Shortages
    const shortages: string[] = [];
    if (next.food < 20) shortages.push('Food');
    if (next.water < 20) shortages.push('Water');
    if (next.medicine < 15) shortages.push('Medicine');
    if (next.tools < 15) shortages.push('Tools');
    next.majorShortages = shortages;

    // Morale & Stability Fluctuations
    let moraleDelta = 0;
    let stabilityDelta = 0;

    if (shortages.includes('Food') || shortages.includes('Water')) {
      moraleDelta -= 8;
      stabilityDelta -= 5;
    } else {
      moraleDelta += 3;
      stabilityDelta += 2;
    }

    next.morale = Math.max(10, Math.min(100, (next.morale ?? 70) + moraleDelta));
    next.stability = Math.max(10, Math.min(100, (next.stability ?? 80) + stabilityDelta));

    // Population Changes
    if (next.morale < 30 || next.stability < 30) {
      next.population = Math.max(5, next.population - Math.round(1 + Math.random() * 3)); // desertion or starvation
    } else if (next.morale > 75 && next.stability > 80 && Math.random() > 0.6) {
      next.population = Math.min(120, next.population + Math.round(1 + Math.random() * 2)); // births or migrants joining
    }

    // 4. Update Migration Progress / Status
    if (next.migrationStyle === 'Constant Nomads' && Math.random() > 0.4) {
      const currentLoc = next.migrationStatus || 'Encamped';
      const steps = ['Crossing high passes', 'Drifting through mineral valleys', 'Pitching tents near dry oasis', 'Scouting next storm safe-zone', 'Escaping sudden heatwave'];
      const nextStep = steps[Math.floor(Math.random() * steps.length)];
      next.migrationStatus = nextStep;
      next.distance = Math.max(4, Math.min(30, next.distance + Math.round(Math.random() * 6 - 3)));
    }

    // 5. Inter-Village Off-Screen Economy Trading
    // A simplified trade simulator matching villages with complimentary needs/surpluses
    return next;
  });

  // Run matching pairs for trading
  for (let i = 0; i < updatedVillages.length; i++) {
    const vA = updatedVillages[i];
    for (let j = i + 1; j < updatedVillages.length; j++) {
      const vB = updatedVillages[j];

      // Match food surplus with animal/tool surplus
      if ((vA.food ?? 50) > 60 && (vB.food ?? 50) < 30) {
        // Trade 15 food for 5 tools or 1 relic
        vA.food -= 15;
        vB.food += 15;
        if ((vB.tools ?? 20) > 25) {
          vB.tools -= 6;
          vA.tools = (vA.tools ?? 20) + 6;
          vA.recentEvents = [`Traded food surplus with ${vB.name} for high-grade tools.`, ...(vA.recentEvents || [])].slice(0, 10);
          vB.recentEvents = [`Bought emergency food supplies from ${vA.name} in exchange for tools.`, ...(vB.recentEvents || [])].slice(0, 10);
        }
      } else if ((vB.food ?? 50) > 60 && (vA.food ?? 50) < 30) {
        vB.food -= 15;
        vA.food += 15;
        if ((vA.tools ?? 20) > 25) {
          vA.tools -= 6;
          vB.tools = (vB.tools ?? 20) + 6;
          vB.recentEvents = [`Traded food surplus with ${vA.name} for high-grade tools.`, ...(vB.recentEvents || [])].slice(0, 10);
          vA.recentEvents = [`Bought emergency food supplies from ${vB.name} in exchange for tools.`, ...(vA.recentEvents || [])].slice(0, 10);
        }
      }
    }
  }

  // 6. Off-Screen Events Generation (One random event triggers sometimes)
  if (Math.random() > 0.2 && updatedVillages.length > 0) {
    const eventIndex = Math.floor(Math.random() * updatedVillages.length);
    const target = updatedVillages[eventIndex];
    const eventRoll = Math.random();

    if (eventRoll < 0.15) {
      // Successful Migration
      target.stability = Math.min(100, (target.stability ?? 80) + 15);
      target.morale = Math.min(100, (target.morale ?? 70) + 10);
      target.migrationStatus = 'Completed Salt Beds Crossing';
      target.recentEvents = ['Successfully crossed the brutal Searing Salt Beds with minimal pack loss.', ...(target.recentEvents || [])].slice(0, 10);
      
      newMessages.push({
        id: `weekly_msg_${currentDay}_${target.id}`,
        sender: `${target.knownOracle} (${target.name})`,
        text: `The skies were kind. The ${target.name} clan has safely navigated the salt flats. Our pack herds thrive and our trade lanterns are lit.`,
        timeSent: `Day ${Math.floor(currentDay)}`,
        actionable: false,
        type: 'news'
      });
    } 
    else if (eventRoll < 0.30) {
      // Failed Migration / Storm Collision
      target.population = Math.max(10, target.population - Math.round(4 + Math.random() * 4));
      target.food = Math.max(5, (target.food ?? 50) - 20);
      target.water = Math.max(5, (target.water ?? 50) - 20);
      target.morale = Math.max(10, (target.morale ?? 70) - 25);
      target.recentEvents = ['Caught by storm wall static. Lost multiple pack animals and raw grain stocks.', ...(target.recentEvents || [])].slice(0, 10);
      
      newMessages.push({
        id: `weekly_msg_${currentDay}_${target.id}`,
        sender: `${target.knownOracle} (${target.name})`,
        text: `Precursor static engulfed our rearguard during the crossing. We lost supplies and several elders are injured. We need fresh medicine.`,
        timeSent: `Day ${Math.floor(currentDay)}`,
        actionable: true,
        type: 'help',
        cost: { item: 'medicine', qty: 3 },
        reward: { item: 'ancientMaterials', qty: 4 },
        status: 'pending'
      });
    }
    else if (eventRoll < 0.45 && target.majorShortages?.includes('Food')) {
      // Food Shortage Panic
      newMessages.push({
        id: `weekly_msg_${currentDay}_${target.id}`,
        sender: `${target.knownOracle} (${target.name})`,
        text: `Famine spreads. The ${target.name} is on the brink. We will trade our precious Precursor metals for immediate nutritional supply.`,
        timeSent: `Day ${Math.floor(currentDay)}`,
        actionable: true,
        type: 'help',
        cost: { item: 'food', qty: 30 },
        reward: { item: 'silver', qty: 25 },
        status: 'pending'
      });
    }
    else if (eventRoll < 0.60) {
      // Predator Attack
      target.population = Math.max(10, target.population - Math.round(2 + Math.random() * 2));
      target.morale = Math.max(10, (target.morale ?? 70) - 15);
      target.recentEvents = ['Saber-wolf pack raided the outer livestock pens.', ...(target.recentEvents || [])].slice(0, 10);

      newMessages.push({
        id: `weekly_msg_${currentDay}_${target.id}`,
        sender: `${target.knownOracle} (${target.name})`,
        text: `A vicious pack of Saber-wolves is stalking our outer migration carts. They killed three herdsmen and wounded others. Send aid if you hear this signal.`,
        timeSent: `Day ${Math.floor(currentDay)}`,
        actionable: true,
        type: 'help',
        cost: { item: 'medicine', qty: 2 },
        reward: { item: 'horns', qty: 3 },
        status: 'pending'
      });
    }
    else if (eventRoll < 0.75) {
      // Ruin Discovery
      target.relics = Math.min(50, (target.relics ?? 0) + 4);
      const siteName = ANCIENT_SITE_NAMES[Math.floor(Math.random() * ANCIENT_SITE_NAMES.length)];
      target.recentEvents = [`Discovered the unbreached site: ${siteName}. Found intact relics.`, ...(target.recentEvents || [])].slice(0, 10);

      newMessages.push({
        id: `weekly_msg_${currentDay}_${target.id}`,
        sender: `${target.knownOracle} (${target.name})`,
        text: `Our scouts breached the airlock of "${siteName}". We found strange glass cells and copper nodes. We offer ruin coordinates in exchange for tools.`,
        timeSent: `Day ${Math.floor(currentDay)}`,
        actionable: true,
        type: 'trade',
        cost: { item: 'wood', qty: 50 },
        reward: { item: 'ancientMaterials', qty: 5 },
        status: 'pending'
      });
    }
    else if (eventRoll < 0.85) {
      // Oracle Death / Succession
      const oldOracle = target.knownOracle;
      const newName = ORACLE_FIRST_NAMES[Math.floor(Math.random() * ORACLE_FIRST_NAMES.length)];
      target.knownOracle = `Oracle ${newName}`;
      target.oracleLevel = Math.max(1, (target.oracleLevel ?? 3) - 1);
      target.recentEvents = [`${oldOracle} has passed into the storm. Apprentice ${newName} assumed the Mirror.`, ...(target.recentEvents || [])].slice(0, 10);

      newMessages.push({
        id: `weekly_msg_${currentDay}_${target.id}`,
        sender: `${target.knownOracle} (${target.name})`,
        text: `Static has claimed our elder. I, Oracle ${newName}, have ascended the Star-Mirror. The alignment is weak but I send peaceful signals.`,
        timeSent: `Day ${Math.floor(currentDay)}`,
        actionable: false,
        type: 'news'
      });
    }
    else if (eventRoll < 0.95 && target.stability && target.stability < 20) {
      // Village Collapse!
      target.population = 0;
      target.dangerStatus = 'Evacuating';
      target.recentEvents = ['The clan has fully collapsed. Survivors scattered into the radioactive mist.', ...(target.recentEvents || [])].slice(0, 10);
      
      newMessages.push({
        id: `weekly_msg_${currentDay}_${target.id}`,
        sender: `Static Signals`,
        text: `Broken transmission: The ${target.name} camp has collapsed. The storm eye shifted too fast. Survivors are fleeing in all directions...`,
        timeSent: `Day ${Math.floor(currentDay)}`,
        actionable: false,
        type: 'warning'
      });
      addLog(`⚠️ Oracle Report: The off-screen "${target.name}" clan has collapsed under severe storm and supply pressure. Fleeing refugees are scattered.`, 'warning');
    }
  }

  // 7. General rumors unconfirmed signal generation
  if (Math.random() > 0.65) {
    const randomRegion = REGIONS[Math.floor(Math.random() * REGIONS.length)];
    const randomRuin = ANCIENT_SITE_NAMES[Math.floor(Math.random() * ANCIENT_SITE_NAMES.length)];
    const rumorTexts = [
      `Distant lightning flashes suggest a major precursor tech cache has been unearthed near ${randomRegion}.`,
      `Scouts whisper of a massive pack-bird nesting ground located inside the canyons of ${randomRegion}.`,
      `Orbital telemetry anomalies warn of a colossal storm cell converging on ${randomRegion} within weeks.`,
      `Merchant caravans report that ${randomRuin} contains a functional power core waiting to be deciphered.`,
      `Signals speak of a hidden cache of ancient memory storage crystals in the basalt ridges.`
    ];
    newMessages.push({
      id: `rumor_${currentDay}_${Math.random()}`,
      sender: `Oracle Star-Sieve`,
      text: rumorTexts[Math.floor(Math.random() * rumorTexts.length)],
      timeSent: `Day ${Math.floor(currentDay)}`,
      actionable: false,
      type: 'rumor'
    });
  }

  return { updatedVillages, newMessages };
}

// Roll chance of visual visitor spawns near the loaded base!
// Spawn rules:
// - Can spawn a Trade Caravan (3-4 traders, 1 pack animal), a Messenger, a Refugee Group, or a Specialist.
// - This is loaded into the game state and physically rendered.
// Let's create helper generators for these groups!
export interface OutsideVisitorGroup {
  id: string;
  type: 'Caravan' | 'Messenger' | 'Refugees' | 'Specialist' | 'HostileRaiders';
  name: string;
  originVillage: string;
  count: number;
  inventory: Record<string, number>;
  daysRemaining: number;
  arrivalDay: number;
  dialogueText: string;
  description: string;
}

export function rollDailyVisitorArrival(
  currentDay: number,
  knownVillages: OtherVillage[]
): OutsideVisitorGroup | null {
  const spawnRoll = Math.random();
  // 12% chance of visitor arrival per game day if we have known villages
  if (spawnRoll > 0.12 || !knownVillages || knownVillages.length === 0) return null;

  const source = knownVillages[Math.floor(Math.random() * knownVillages.length)];
  if (source.population <= 0) return null; // collapsed

  const typesRoll = Math.random();
  const id = `visitor_${Math.floor(currentDay)}_${Math.random().toString(36).slice(2, 6)}`;

  if (typesRoll < 0.45) {
    // 1. Trade Caravan
    const items = ['meat', 'berries', 'fiber', 'bone', 'silver', 'copper'];
    const qty1 = Math.round(5 + Math.random() * 15);
    const qty2 = Math.round(5 + Math.random() * 10);
    const chosenItem1 = items[Math.floor(Math.random() * items.length)];
    const chosenItem2 = items[(Math.floor(Math.random() * items.length) + 1) % items.length];

    return {
      id,
      type: 'Caravan',
      name: `Caravan from ${source.name}`,
      originVillage: source.id,
      count: 3,
      inventory: { [chosenItem1]: qty1, [chosenItem2]: qty2, silver: 15 },
      daysRemaining: 1.5, // stays for 1.5 days
      arrivalDay: Math.floor(currentDay),
      dialogueText: `Peace be upon your fire. We have traveled from ${source.name} with pack-birds laden with items. Let us exchange goods.`,
      description: `A trade caravan of three merchants and a heavily laden pack bird.`
    };
  } 
  else if (typesRoll < 0.70) {
    // 2. Messenger
    return {
      id,
      type: 'Messenger',
      name: `Messenger from ${source.name}`,
      originVillage: source.id,
      count: 1,
      inventory: { silver: 5 },
      daysRemaining: 0.8,
      arrivalDay: Math.floor(currentDay),
      dialogueText: `I run for Oracle ${source.knownOracle}. I bear a report on the regional weather paths and a small token of respect.`,
      description: `A swift messenger dressed in light storm-duster armor.`
    };
  } 
  else if (typesRoll < 0.88) {
    // 3. Refugee Group
    const count = Math.round(3 + Math.random() * 4);
    return {
      id,
      type: 'Refugees',
      name: `Fleeing Refugees`,
      originVillage: source.id,
      count,
      inventory: { wood: 10 },
      daysRemaining: 3.0,
      arrivalDay: Math.floor(currentDay),
      dialogueText: `Please... our shelter collapsed. We have walked through the static wind for two days. We are hungry, cold, and need warm tents.`,
      description: `A shivering group of ${count} survivors carrying small satchels of belongings.`
    };
  } 
  else {
    // 4. Visiting Specialist
    const specialties = ['Healer', 'Artisan', 'Scout', 'Builder'];
    const chosenSpec = specialties[Math.floor(Math.random() * specialties.length)];
    return {
      id,
      type: 'Specialist',
      name: `Specialist ${chosenSpec}`,
      originVillage: source.id,
      count: 1,
      inventory: {},
      daysRemaining: 2.0,
      arrivalDay: Math.floor(currentDay),
      dialogueText: `I am a skilled ${chosenSpec} seeking short-term contract. For a bit of food and silver, I will assist your building projects or hunt for your larder!`,
      description: `A professional wandering specialist carrying precision toolkits.`
    };
  }
}
