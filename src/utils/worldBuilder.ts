import { BiomeType, CellInfo, WorldConfig, MapData, Landmark, ExpeditionSite, WorldChunk, SimulationLevel } from '../types';
import { Improved2DNoise, SeededRandom } from './noise';
import { EXPEDITION_SITES } from './expeditionDatabase';
import { initializeOffScreenVillages } from './villageSimulator';

// Palette matching a low-poly stylized survival game
export const BIOME_COLORS = {
  water: '#2d6c82',      // Deep warm teal-cyan
  beach: '#dec292',      // Warm golden honeycomb sand
  desert: '#bd6342',     // Rich amber-terracotta clay
  grassland: '#5e8a52',  // Soft moss sage green
  forest: '#3b5735',     // Cozy spruce-fir forest green
  rocky: '#726c6c',      // Warm ash-granite stone grey
};

// Global cache for noise generators to prevent recreations
const noiseCache: {
  [seed: number]: {
    heightNoise: Improved2DNoise;
    moistureNoise: Improved2DNoise;
    detailNoise: Improved2DNoise;
  }
} = {};

function getNoiseGenerators(seed: number) {
  if (!noiseCache[seed]) {
    noiseCache[seed] = {
      heightNoise: new Improved2DNoise(seed),
      moistureNoise: new Improved2DNoise(seed + 98765),
      detailNoise: new Improved2DNoise(seed * 2 + 13),
    };
  }
  return noiseCache[seed];
}

/**
 * Generates a single cell at absolute world coordinates deterministically from a seed
 */
export function generateCellAt(
  worldX: number,
  worldZ: number,
  config: WorldConfig,
  seed: number
): CellInfo {
  const { roughness, forestDensity, rockDensity, waterLevel } = config;
  const noises = getNoiseGenerators(seed);

  // Cell seed for deterministic feature placement
  const cellRand = new SeededRandom(seed + worldX * 73 + worldZ * 31);

  // Normalised coordinates for noise sampling - stable frequency equivalent to a size of 120
  const noiseScale = 1.0 / 120.0;
  const nx = worldX * noiseScale;
  const nz = worldZ * noiseScale;

  // Sample base fbm noises
  const hNoise = noises.heightNoise.fbm(nx * 2.5, nz * 2.5, 4, 1.8, 0.45);
  const mNoise = noises.moistureNoise.fbm(nx * 2.0, nz * 2.0, 3, 2.0, 0.5);
  const dNoise = noises.detailNoise.noise2D(nx * 10, nz * 10);

  // Map hNoise from [-1, 1] to a stable, smooth positive range [0, 1]
  const height = Math.max(0.0, Math.min(1.0, (hNoise + 0.8) / 1.6));

  // Height thresholds mapped beautifully to [0, 1] space
  const waterCutoff = 0.38 + waterLevel * 0.15; // e.g., 0.45
  const beachCutoff = waterCutoff + 0.05;       // e.g., 0.50
  const mountainCutoff = 0.74;

  // Determine biome
  let biome: BiomeType = 'grassland';
  let color = BIOME_COLORS.grassland;

  if (height < waterCutoff) {
    if (height < waterCutoff - 0.08) {
      biome = 'water';
      color = BIOME_COLORS.water;
    } else if (height < waterCutoff - 0.03) {
      biome = 'beach';
      color = BIOME_COLORS.beach;
    } else {
      biome = 'desert';
      color = BIOME_COLORS.desert;
    }
  } else if (height < beachCutoff) {
    biome = 'beach';
    color = BIOME_COLORS.beach;
  } else if (height > mountainCutoff) {
    biome = 'rocky';
    color = BIOME_COLORS.rocky;
  } else {
    // Classification based on moisture
    if (mNoise > 0.55) {
      biome = 'forest';
      color = BIOME_COLORS.forest;
    } else if (mNoise < 0.26) {
      biome = 'desert';
      color = BIOME_COLORS.desert;
    } else if (mNoise < 0.35) {
      biome = 'rocky';
      color = BIOME_COLORS.rocky;
    } else {
      biome = 'grassland';
      color = BIOME_COLORS.grassland;
    }
  }

  // Ground height scaling with stylized terracing to create beautiful plateau layers
  let finalHeight = height * roughness * 12.0;
  if (biome !== 'water') {
    const stepSize = 0.45; // Beautiful stepped terraced layers
    finalHeight = Math.max(0.2, Math.round(finalHeight / stepSize) * stepSize);
  } else {
    // Flat water table lakebed floor
    finalHeight = Math.max(0.1, finalHeight);
  }

  // Determine feature placement
  let hasTree = false;
  let hasRock = false;
  let hasShrub = false;
  let treeHeight = 0;
  let treeRotation = 0;
  let rockSize = 0;
  let rockRotation: [number, number, number] = [0, 0, 0];

  // Deterministic variety sectors of 10x10 size for larger, cleaner clusters
  const sectorX = Math.floor(worldX / 10);
  const sectorZ = Math.floor(worldZ / 10);
  const sectorSeed = Math.abs((sectorX * 17 + sectorZ * 29) % 3);

  let forestBoost = 0.0;
  let rockBoost = 0.0;
  let shrubBoost = 0.0;

  if (sectorSeed === 0) {
    forestBoost = 0.35;
    rockBoost = -0.25;
    shrubBoost = -0.25;
  } else if (sectorSeed === 1) {
    rockBoost = 0.45; // Huge boost for stone and rock clustering!
    forestBoost = -0.25;
    shrubBoost = -0.25;
  } else {
    shrubBoost = 0.35;
    forestBoost = -0.25;
    rockBoost = -0.25;
  }

  if (biome !== 'water') {
    const featureRoll = cellRand.next();

    if (biome === 'forest') {
      const limit = (forestDensity + forestBoost) * 0.85;
      if (featureRoll < limit) {
        hasTree = true;
        treeHeight = cellRand.range(1.1, 2.3);
        treeRotation = cellRand.range(0, Math.PI * 2);
      } else if (featureRoll < limit + 0.08 + rockBoost) {
        if (cellRand.next() < 0.70) { // 30% less rocks
          hasRock = true;
          rockSize = cellRand.range(0.3, 0.7);
          rockRotation = [
            cellRand.range(0, Math.PI),
            cellRand.range(0, Math.PI),
            cellRand.range(0, Math.PI),
          ];
        }
      } else if (featureRoll < limit + 0.15 + shrubBoost) {
        if (cellRand.next() < 0.50) { // 50% less berry bushes
          hasShrub = true;
        }
      }
    } else if (biome === 'grassland') {
      const treeLimit = (forestDensity + forestBoost) * 0.18;
      const rockLimit = treeLimit + (rockDensity + rockBoost) * 0.12;
      
      if (featureRoll < treeLimit) {
        hasTree = true;
        treeHeight = cellRand.range(0.9, 1.8);
        treeRotation = cellRand.range(0, Math.PI * 2);
      } else if (featureRoll < rockLimit) {
        if (cellRand.next() < 0.70) { // 30% less rocks
          hasRock = true;
          rockSize = cellRand.range(0.4, 0.9);
          rockRotation = [
            cellRand.range(0, Math.PI),
            cellRand.range(0, Math.PI),
            cellRand.range(0, Math.PI),
          ];
        }
      } else if (featureRoll < rockLimit + 0.12 + shrubBoost) {
        if (cellRand.next() < 0.50) { // 50% less berry bushes
          hasShrub = true;
        }
      }
    } else if (biome === 'rocky') {
      const limit = (rockDensity + rockBoost) * 0.75;
      if (featureRoll < limit) {
        if (cellRand.next() < 0.70) { // 30% less rocks
          hasRock = true;
          rockSize = cellRand.range(0.5, 1.6);
          rockRotation = [
            cellRand.range(0, Math.PI),
            cellRand.range(0, Math.PI),
            cellRand.range(0, Math.PI),
          ];
        }
      } else if (featureRoll < limit + 0.08 + forestBoost) {
        hasTree = true;
        treeHeight = cellRand.range(0.5, 1.0);
        treeRotation = cellRand.range(0, Math.PI * 2);
      }
    } else if (biome === 'beach') {
      if (featureRoll < 0.10 + rockBoost * 0.4) {
        const isShrub = cellRand.next() > (0.5 - shrubBoost);
        if (isShrub) {
          if (cellRand.next() < 0.50) { // 50% less berry bushes
            hasShrub = true;
          }
        } else {
          if (cellRand.next() < 0.70) { // 30% less rocks
            hasRock = true;
            rockSize = cellRand.range(0.2, 0.5);
            rockRotation = [
              cellRand.range(0, Math.PI),
              cellRand.range(0, Math.PI),
              cellRand.range(0, Math.PI),
            ];
          }
        }
      }
    } else if (biome === 'desert') {
      const cactusLimit = (forestDensity + forestBoost) * 0.16 * 0.30;
      const skeletalLimit = cactusLimit + (rockDensity + rockBoost) * 0.28;
      const shrubLimit = skeletalLimit + (0.15 + shrubBoost) * 0.30;

      if (featureRoll < cactusLimit) {
        hasTree = true;
        treeHeight = cellRand.range(0.8, 1.5);
        treeRotation = cellRand.range(0, Math.PI * 2);
      } else if (featureRoll < skeletalLimit) {
        if (cellRand.next() < 0.70) { // 30% less rocks
          hasRock = true;
          rockSize = cellRand.range(0.6, 1.7);
          rockRotation = [
            cellRand.range(0, Math.PI),
            cellRand.range(0, Math.PI),
            cellRand.range(0, Math.PI),
          ];
        }
      } else if (featureRoll < shrubLimit) {
        if (cellRand.next() < 0.50) { // 50% less berry bushes
          hasShrub = true;
        }
      }
    }
  }

  // Generate resources and name
  let inspectableName = '';
  const resources: CellInfo['resources'] = {};

  if (hasTree) {
    if (biome === 'desert') {
      inspectableName = 'Spiked Saguaro Cactus';
    } else {
      inspectableName = biome === 'rocky' ? 'Alpine Dwarf Pine' : treeHeight > 1.8 ? 'Massive Pine Tree' : 'Pine Tree';
    }
    resources.wood = Math.round(treeHeight * (biome === 'desert' ? 25 : 50));
    resources.fertility = parseFloat((0.8 + dNoise * 0.4).toFixed(2));
  } else if (hasRock) {
    if (biome === 'desert') {
      inspectableName = rockSize > 1.25 ? 'Prehistoric Giant Fossil Bone' : rockSize > 0.82 ? 'Precursor Monolith Obelisk' : 'Weathered Sandstone Rubble';
    } else {
      inspectableName = rockSize > 1.2 ? 'Gigantic Granite Boulder' : rockSize > 0.7 ? 'Slate Rock Outcrop' : 'Loose Granite Stones';
    }
    resources.stone = Math.round(rockSize * (biome === 'desert' ? 60 : 100));
  } else if (hasShrub) {
    inspectableName = biome === 'desert' ? 'Spiny Flower Agave' : 'Wild Berry Shrub';
    resources.fertility = parseFloat(((biome === 'desert' ? 0.35 : 1.1) + dNoise * 0.3).toFixed(2));
  } else {
    switch (biome) {
      case 'desert':
        inspectableName = 'Precursor Ancient Desert Wastes';
        resources.stone = 150;
        resources.fertility = 0.15;
        break;
      case 'water':
        inspectableName = height < waterCutoff * 0.5 ? 'Abyssal Deep Water' : 'Shallow Lake Water';
        resources.water = 1000;
        break;
      case 'beach':
        inspectableName = 'Sandy Coastline';
        resources.fertility = 0.15;
        break;
      case 'grassland':
        inspectableName = 'Fertile Soil Grassland';
        resources.fertility = parseFloat((1.0 + dNoise * 0.4).toFixed(2));
        break;
      case 'forest':
        inspectableName = 'Rich Humus Forest Bed';
        resources.fertility = parseFloat((1.2 + dNoise * 0.3).toFixed(2));
        break;
      case 'rocky':
        inspectableName = 'Solid Bedrock Mountain';
        resources.stone = 500;
        resources.fertility = 0.05;
        break;
    }
  }

  // Assign resourceNode
  let resourceNode: CellInfo['resourceNode'] = null;
  const rollResource = cellRand.next();

  if (biome !== 'water') {
    if (hasShrub) {
      const plantRoll = cellRand.next();
      if (biome === 'desert') {
        if (plantRoll < 0.5) {
          resourceNode = {
            category: 'food',
            type: 'Berries',
            amount: 15,
            maxAmount: 15,
            regrowTimer: 0,
            regrowRate: 1,
            quality: 100,
          };
          inspectableName = 'Prickly Agave Shrub';
        } else {
          resourceNode = {
            category: 'food',
            type: 'Roots',
            amount: 20,
            maxAmount: 20,
            regrowTimer: 0,
            regrowRate: 0.8,
            quality: 100,
          };
          inspectableName = 'Succulent Cactus Root Bulb';
        }
      } else if (biome === 'forest') {
        if (plantRoll < 0.25) {
          resourceNode = {
            category: 'food',
            type: 'Berries',
            amount: 15,
            maxAmount: 15,
            regrowTimer: 0,
            regrowRate: 1,
            quality: 100,
          };
          inspectableName = 'Cinder-Berry Shrub';
        } else if (plantRoll < 0.50) {
          resourceNode = {
            category: 'food',
            type: 'Berries',
            amount: 16,
            maxAmount: 16,
            regrowTimer: 0,
            regrowRate: 1.1,
            quality: 100,
          };
          inspectableName = 'Verdant Jade-Shoot';
        } else if (plantRoll < 0.75) {
          resourceNode = {
            category: 'food',
            type: 'Mushrooms',
            amount: 12,
            maxAmount: 12,
            regrowTimer: 0,
            regrowRate: 1.2,
            quality: 100,
          };
          inspectableName = 'Wild Blue Spore-Shroom';
        } else {
          resourceNode = {
            category: 'food',
            type: 'Roots',
            amount: 15,
            maxAmount: 15,
            regrowTimer: 0,
            regrowRate: 0.9,
            quality: 100,
          };
          inspectableName = 'Fleshy Tuber Bush';
        }
      } else if (biome === 'grassland') {
        if (plantRoll < 0.25) {
          resourceNode = {
            category: 'food',
            type: 'Berries',
            amount: 15,
            maxAmount: 15,
            regrowTimer: 0,
            regrowRate: 1,
            quality: 100,
          };
          inspectableName = 'Wild Barley Grass';
        } else if (plantRoll < 0.50) {
          resourceNode = {
            category: 'food',
            type: 'Berries',
            amount: 15,
            maxAmount: 15,
            regrowTimer: 0,
            regrowRate: 1,
            quality: 100,
          };
          inspectableName = 'Cinder-Berry Shrub';
        } else if (plantRoll < 0.75) {
          resourceNode = {
            category: 'food',
            type: 'Berries',
            amount: 18,
            maxAmount: 18,
            regrowTimer: 0,
            regrowRate: 1.2,
            quality: 100,
          };
          inspectableName = 'Sweet Caelum Oats';
        } else {
          resourceNode = {
            category: 'food',
            type: 'Roots',
            amount: 14,
            maxAmount: 14,
            regrowTimer: 0,
            regrowRate: 1,
            quality: 100,
          };
          inspectableName = 'Wild Storm-Lily Bulb';
        }
      } else {
        // Rocky or beach
        if (plantRoll < 0.35) {
          resourceNode = {
            category: 'material',
            type: 'Fiber',
            amount: 15,
            maxAmount: 15,
            regrowTimer: 0,
            regrowRate: 1,
            quality: 100,
          };
          inspectableName = 'Skeletal Bramble Bush';
        } else if (plantRoll < 0.70) {
          resourceNode = {
            category: 'food',
            type: 'Roots',
            amount: 12,
            maxAmount: 12,
            regrowTimer: 0,
            regrowRate: 1,
            quality: 100,
          };
          inspectableName = 'Sweet Root-Weave';
        } else {
          resourceNode = {
            category: 'food',
            type: 'Roots',
            amount: 12,
            maxAmount: 12,
            regrowTimer: 0,
            regrowRate: 1,
            quality: 100,
          };
          inspectableName = 'Wild Storm-Lily Bulb';
        }
      }
    } else if (hasTree) {
      resourceNode = {
        category: 'material',
        type: 'Wood',
        amount: biome === 'desert' ? 18 : 30,
        maxAmount: biome === 'desert' ? 18 : 30,
        regrowTimer: 0,
        regrowRate: 0.5,
        quality: 100,
      };
      inspectableName = biome === 'desert' ? 'Prickly Obsidian Saguaro' : 'Petrified Ironwood Tree';
    } else if (hasRock) {
      const boulderRoll = cellRand.next();
      if (boulderRoll < 0.50) {
        resourceNode = {
          category: 'material',
          type: 'Stone',
          amount: 25,
          maxAmount: 25,
          regrowTimer: 0,
          regrowRate: 0.3,
          quality: 100,
        };
        inspectableName = biome === 'desert' ? 'Weathered Sandstone Rubble' : 'Slate Quartz Rock';
      } else if (boulderRoll < 0.75) {
        resourceNode = {
          category: 'material',
          type: 'Copper' as any,
          amount: 20,
          maxAmount: 20,
          regrowTimer: 0,
          regrowRate: 0.1,
          quality: 100,
        };
        inspectableName = 'Rich Copper Ore Boulder';
      } else if (boulderRoll < 0.90) {
        resourceNode = {
          category: 'material',
          type: 'Silver' as any,
          amount: 15,
          maxAmount: 15,
          regrowTimer: 0,
          regrowRate: 0.08,
          quality: 100,
        };
        inspectableName = 'Glittering Silver Ore Boulder';
      } else if (boulderRoll < 0.95) {
        resourceNode = {
          category: 'material',
          type: 'Gold' as any,
          amount: 10,
          maxAmount: 10,
          regrowTimer: 0,
          regrowRate: 0.05,
          quality: 100,
        };
        inspectableName = 'Shining Gold Ore Deposit';
      } else {
        resourceNode = {
          category: 'material',
          type: 'Iron' as any,
          amount: 22,
          maxAmount: 22,
          regrowTimer: 0,
          regrowRate: 0.1,
          quality: 100,
        };
        inspectableName = 'Raw Hematite Iron Ore Boulder';
      }
    } else {
      if (biome === 'grassland') {
        const subSeed = cellRand.next();
        if (rollResource < 0.20) {
          if (subSeed < 0.25) {
            if (cellRand.next() < 0.50) { // 50% less berries
              resourceNode = { category: 'food', type: 'Berries', amount: 15, maxAmount: 15, regrowTimer: 0, regrowRate: 1.0, quality: 100 };
              inspectableName = 'Meadow Solar Strawberries';
            }
          } else if (subSeed < 0.50) {
            resourceNode = { category: 'food', type: 'Berries', amount: 12, maxAmount: 12, regrowTimer: 0, regrowRate: 0.9, quality: 100 };
            inspectableName = 'Golden Sunflower Seeds';
          } else if (subSeed < 0.75) {
            resourceNode = { category: 'food', type: 'Roots', amount: 10, maxAmount: 10, regrowTimer: 0, regrowRate: 0.8, quality: 100 };
            inspectableName = 'Vortex Root Corm';
          } else {
            resourceNode = { category: 'food', type: 'Roots', amount: 14, maxAmount: 14, regrowTimer: 0, regrowRate: 0.75, quality: 100 };
            inspectableName = 'Storm-Root Bulb';
          }
        } else if (rollResource < 0.38) {
          if (subSeed < 0.5) {
            resourceNode = { category: 'material', type: 'Fiber', amount: 12, maxAmount: 12, regrowTimer: 0, regrowRate: 1.2, quality: 100 };
            inspectableName = 'Tall Flax Blue-fibers';
          } else {
            resourceNode = { category: 'material', type: 'Fiber', amount: 15, maxAmount: 15, regrowTimer: 0, regrowRate: 1.1, quality: 100 };
            inspectableName = 'Neon Glow-Cotton Bolls';
          }
        } else if (rollResource < 0.46) {
          resourceNode = { category: 'water', type: 'Dew', amount: 5, maxAmount: 5, regrowTimer: 0, regrowRate: 1.5, quality: 100 };
          inspectableName = 'Morning White-clover Dew';
        }
      } else if (biome === 'forest') {
        const subSeed = cellRand.next();
        if (rollResource < 0.25) {
          if (subSeed < 0.2) {
            resourceNode = { category: 'food', type: 'Mushrooms', amount: 8, maxAmount: 8, regrowTimer: 0, regrowRate: 0.7, quality: 100 };
            inspectableName = 'Glowcap Lumina-Mushrooms';
          } else if (subSeed < 0.4) {
            resourceNode = { category: 'food', type: 'Mushrooms', amount: 10, maxAmount: 10, regrowTimer: 0, regrowRate: 0.8, quality: 100 };
            inspectableName = 'Earthy Chanterelle Clump';
          } else if (subSeed < 0.6) {
            if (cellRand.next() < 0.50) { // 50% less berries
              resourceNode = { category: 'food', type: 'Berries', amount: 15, maxAmount: 15, regrowTimer: 0, regrowRate: 1.0, quality: 100 };
              inspectableName = 'Sylvan Emberberries';
            }
          } else if (subSeed < 0.8) {
            if (cellRand.next() < 0.50) { // 50% less berries
              resourceNode = { category: 'food', type: 'Berries', amount: 12, maxAmount: 12, regrowTimer: 0, regrowRate: 1.1, quality: 100 };
              inspectableName = 'Amethyst Violetberries';
            }
          } else {
            resourceNode = { category: 'food', type: 'Roots', amount: 8, maxAmount: 8, regrowTimer: 0, regrowRate: 0.6, quality: 100 };
            inspectableName = 'Storm-Root Stem';
          }
        } else if (rollResource < 0.40) {
          if (subSeed < 0.5) {
            resourceNode = { category: 'material', type: 'Fiber', amount: 10, maxAmount: 10, regrowTimer: 0, regrowRate: 1.2, quality: 100 };
            inspectableName = 'Sprout Fiber Twines';
          } else {
            resourceNode = { category: 'material', type: 'Fiber', amount: 12, maxAmount: 12, regrowTimer: 0, regrowRate: 1.3, quality: 100 };
            inspectableName = 'Climbing Sylvan Ivy';
          }
        } else if (rollResource < 0.48) {
          if (subSeed < 0.5) {
            resourceNode = { category: 'water', type: 'Dew', amount: 6, maxAmount: 6, regrowTimer: 0, regrowRate: 1.4, quality: 100 };
            inspectableName = 'Dew Condenser Moss-Ferns';
          } else {
            resourceNode = { category: 'water', type: 'Rainwater', amount: 15, maxAmount: 15, regrowTimer: 0, regrowRate: 1.1, quality: 100 };
            inspectableName = 'Rain pool Hollow-trunk';
          }
        }
      } else if (biome === 'rocky') {
        const subSeed = cellRand.next();
        if (rollResource < 0.005) {
          resourceNode = { category: 'material', type: 'Bone', amount: 8, maxAmount: 8, regrowTimer: 0, regrowRate: 0.1, quality: 100 };
          inspectableName = 'Weathered Animal Skeletons';
        } else if (rollResource < 0.01) {
          if (subSeed < 0.5) {
            resourceNode = { category: 'rare', type: 'Relics', amount: 3, maxAmount: 3, regrowTimer: 0, regrowRate: 0, quality: 100 };
            inspectableName = 'Ancient Relic Inscribed Tablet';
          } else {
            resourceNode = { category: 'rare', type: 'Relics', amount: 2, maxAmount: 2, regrowTimer: 0, regrowRate: 0, quality: 100 };
            inspectableName = 'Precursor Engraved Totem';
          }
        } else if (rollResource < 0.015) {
          resourceNode = { category: 'rare', type: 'AncientMaterials', amount: 4, maxAmount: 4, regrowTimer: 0, regrowRate: 0, quality: 100 };
          inspectableName = 'Subterranean Silvered Alloy Rails';
        } else if (rollResource < 0.22) {
          if (subSeed < 0.33) {
            if (cellRand.next() < 0.50) { // 50% less berries
              resourceNode = { category: 'food', type: 'Berries', amount: 10, maxAmount: 10, regrowTimer: 0, regrowRate: 0.7, quality: 100 };
              inspectableName = 'High-altitude Cloudberry Shrub';
            }
          } else if (subSeed < 0.66) {
            resourceNode = { category: 'food', type: 'Roots', amount: 8, maxAmount: 8, regrowTimer: 0, regrowRate: 0.5, quality: 100 };
            inspectableName = 'Nourishing Alpine Lichen Mat';
          } else {
            resourceNode = { category: 'food', type: 'Mushrooms', amount: 12, maxAmount: 12, regrowTimer: 0, regrowRate: 0.8, quality: 100 };
            inspectableName = 'Crag Shaggy-Mane Mushrooms';
          }
        } else if (rollResource < 0.40) {
          if (subSeed < 0.5) {
            resourceNode = { category: 'material', type: 'Fiber', amount: 12, maxAmount: 12, regrowTimer: 0, regrowRate: 0.9, quality: 100 };
            inspectableName = 'Alpine Edelweiss Flowers';
          } else {
            resourceNode = { category: 'material', type: 'Fiber', amount: 16, maxAmount: 16, regrowTimer: 0, regrowRate: 1.0, quality: 100 };
            inspectableName = 'Thatch Mountain Tussock Grass';
          }
        }
      } else if (biome === 'beach') {
        const subSeed = cellRand.next();
        if (rollResource < 0.20) {
          resourceNode = { category: 'water', type: 'ReservoirWater', amount: 20, maxAmount: 20, regrowTimer: 0, regrowRate: 0.8, quality: 100 };
          inspectableName = 'Tidal Saltpool Reservoir';
        } else if (rollResource < 0.35) {
          if (subSeed < 0.5) {
            resourceNode = { category: 'material', type: 'Fiber', amount: 14, maxAmount: 14, regrowTimer: 0, regrowRate: 1.4, quality: 100 };
            inspectableName = 'Coarse Dune Marram Grass';
          } else {
            if (cellRand.next() < 0.50) { // 50% less berries
              resourceNode = { category: 'food', type: 'Berries', amount: 10, maxAmount: 10, regrowTimer: 0, regrowRate: 1.2, quality: 100 };
              inspectableName = 'Salt-Crested Gemberries';
            }
          }
        } else if (rollResource < 0.43) {
          resourceNode = { category: 'water', type: 'Dew', amount: 6, maxAmount: 6, regrowTimer: 0, regrowRate: 1.4, quality: 100 };
          inspectableName = 'Coastal Dew Fronds';
        }
      } else if (biome === 'desert') {
        const dRoll = dNoise * 0.5 + cellRand.next() * 0.5;
        if (dRoll < 0.35) {
          const oreChoice = cellRand.next();
          if (oreChoice < 0.35) {
            resourceNode = { category: 'material', type: 'Stone', amount: 30, maxAmount: 30, regrowTimer: 0, regrowRate: 0.2, quality: 100 };
            inspectableName = 'Rusted Cupric Iron Ore Nugget';
          } else if (oreChoice < 0.70) {
            resourceNode = { category: 'material', type: 'Stone', amount: 25, maxAmount: 25, regrowTimer: 0, regrowRate: 0.15, quality: 100 };
            inspectableName = 'Shining Pyrite Gold-vein';
          } else {
            resourceNode = { category: 'material', type: 'Stone', amount: 35, maxAmount: 35, regrowTimer: 0, regrowRate: 0.25, quality: 100 };
            inspectableName = 'Crystalline Quartz Shards';
          }
        } else if (dRoll < 0.355) {
          resourceNode = { category: 'rare', type: 'AncientMaterials', amount: 5, maxAmount: 5, regrowTimer: 0, regrowRate: 0, quality: 100 };
          inspectableName = 'Decommissioned Precursor Metal Beam';
        } else if (dRoll < 0.36) {
          resourceNode = { category: 'material', type: 'Bone', amount: 12, maxAmount: 12, regrowTimer: 0, regrowRate: 0.05, quality: 100 };
          inspectableName = 'Giant Bleached Rib-bone Pile';
        } else if (dRoll < 0.60) {
          resourceNode = { category: 'material', type: 'Fiber', amount: 10, maxAmount: 10, regrowTimer: 0, regrowRate: 0.9, quality: 100 };
          inspectableName = 'Withered Cactus Bark';
        } else if (dRoll < 0.78) {
          if (cellRand.next() < 0.50) { // 50% less fleshy cactus root bulbs
            resourceNode = { category: 'food', type: 'Roots', amount: 8, maxAmount: 8, regrowTimer: 0, regrowRate: 0.5, quality: 100 };
            inspectableName = 'Fleshy Cactus Root Bulb';
          }
        } else if (dRoll < 0.94) {
          resourceNode = { category: 'water', type: 'Dew', amount: 5, maxAmount: 5, regrowTimer: 0, regrowRate: 1.1, quality: 100 };
          inspectableName = 'Desert Dew Succulent';
        }
      }
    }
  } else {
    if (rollResource < 0.25) {
      resourceNode = {
        category: 'water',
        type: 'ReservoirWater',
        amount: 40,
        maxAmount: 40,
        regrowTimer: 0,
        regrowRate: 2.0,
        quality: 100,
      };
      inspectableName = 'Freshwater Crystal Springs';
    }
  }

  // Sanitize flags to guarantee correct visual matching for resource nodes
  if (resourceNode) {
    if (['Berries', 'Mushrooms', 'Roots'].includes(resourceNode.type)) {
      hasShrub = true;
      hasRock = false;
      hasTree = false;
    } else if (resourceNode.type === 'Wood') {
      hasTree = true;
      hasRock = false;
      hasShrub = false;
    } else if (['Stone', 'Copper', 'Silver', 'Gold', 'Iron'].includes(resourceNode.type)) {
      hasRock = true;
      hasTree = false;
      hasShrub = false;
    }
  }

  // Scouting around starting point (default is config.size / 2) is revealed initially
  const startX = config.size ? (config.size / 2) : 60;
  const startZ = config.size ? (config.size / 2) : 60;
  const distFromCenter = Math.sqrt((worldX - startX) ** 2 + (worldZ - startZ) ** 2);
  const isInitialScouted = distFromCenter <= 12;

  return {
    x: worldX,
    z: worldZ,
    height: finalHeight,
    noiseValue: height,
    moisture: mNoise,
    biome,
    color,
    hasTree,
    treeHeight,
    treeRotation,
    hasRock,
    rockSize,
    rockRotation,
    hasShrub,
    inspectableName,
    resources,
    scouted: isInitialScouted,
    itemsOnGround: null,
    construction: null,
    structure: null,
    farmCrop: null,
    resourceNode,
    loaded: false,
  };
}

/**
 * Generates all cells for a 6x6 chunk on demand deterministically.
 */
export function generateChunk(
  chunkX: number,
  chunkZ: number,
  mapData: MapData
): WorldChunk {
  if (!mapData.chunksByKey) {
    mapData.chunksByKey = {};
  }
  const key = `${chunkX},${chunkZ}`;
  if (mapData.chunksByKey[key]) {
    return mapData.chunksByKey[key];
  }

  const config = mapData.config;
  const seed = config.seed;

  const cells: CellInfo[][] = [];
  const biomesInChunk: Record<string, number> = {};

  for (let cx = 0; cx < 6; cx++) {
    const row: CellInfo[] = [];
    for (let cz = 0; cz < 6; cz++) {
      const worldX = chunkX * 6 + cx;
      const worldZ = chunkZ * 6 + cz;
      const cell = generateCellAt(worldX, worldZ, config, seed);
      row.push(cell);

      biomesInChunk[cell.biome] = (biomesInChunk[cell.biome] || 0) + 1;
    }
    cells.push(row);
  }

  // Choose chunk primary biome
  let primaryBiome = 'grassland';
  let maxCount = 0;
  for (const [biome, count] of Object.entries(biomesInChunk)) {
    if (count > maxCount) {
      maxCount = count;
      primaryBiome = biome;
    }
  }
  const biomeSummary = `${primaryBiome.charAt(0).toUpperCase() + primaryBiome.slice(1)} region`;

  const newChunk: WorldChunk = {
    chunkX,
    chunkZ,
    cells,
    loaded: false,
    simulationLevel: 'UNLOADED',
    lastActiveTime: Date.now(),
    biomeSummary,
    discovered: false,
    modified: false,
  };

  // Safe reference mapping to prevent duplicate generation
  mapData.chunksByKey[key] = newChunk;

  // Sync back into mapData.grid compat layer so standard operations do not break
  for (let cx = 0; cx < 6; cx++) {
    for (let cz = 0; cz < 6; cz++) {
      const worldX = chunkX * 6 + cx;
      const worldZ = chunkZ * 6 + cz;
      if (!mapData.grid[worldX]) {
        mapData.grid[worldX] = [];
      }
      mapData.grid[worldX][worldZ] = cells[cx][cz];
    }
  }

  // Deterministically inject ancient sites / landmarks
  const chunkSeed = seed + chunkX * 1337 + chunkZ * 73;
  const chunkRand = new SeededRandom(chunkSeed);

  const landCells: CellInfo[] = [];
  for (let cx = 0; cx < 6; cx++) {
    for (let cz = 0; cz < 6; cz++) {
      const cell = cells[cx][cz];
      if (cell.biome !== 'water') {
        landCells.push(cell);
      }
    }
  }

  const startX = config.size / 2;
  const startZ = config.size / 2;
  const isStartingZone = Math.sqrt((chunkX * 6 + 3 - startX) ** 2 + (chunkZ * 6 + 3 - startZ) ** 2) <= 15;

  if (landCells.length > 0 && !isStartingZone) {
    const spawnRoll = chunkRand.next();
    if (spawnRoll < 0.04) {
      // Landmark Templates
      const landmarkTemplates = [
        {
          type: 'giant_petrified_tree',
          name: 'Petritree Arch-Root',
          description: 'A colossal, fossilized alien tree root reaching towards the sky. Its bark has petrified into glowing silicate, teeming with Root Crystals and storm-hardened resin.',
          storySegment: 'This titanic root survived the colonists\' early attempts to clear the native petrified forests. Faint warm hums still pulse inside, proving that the planet\'s root network is still fully alive, absorbing kinetic friction and feeding off the Storm\'s static electricity.',
          rewards: { knowledgePoints: 30, moraleBoost: 15, ancientMaterials: 4, unlockBuildingType: 'PetrifiedGreenhouse' }
        },
        {
          type: 'ancient_tower',
          name: 'Stormbreaker Spire Tower',
          description: 'A mathematical obsidian spire rising from the high cliffs. Ancient heavy fiber lines run deep into its stone layers, occasionally sparking with blue static discharges.',
          storySegment: 'The walls of this spire are inscribed with equations for cloud-seeding and weather manipulation. It was a weather control tower built by the first human colonists in a failed attempt to weaken the global Storm. The Oracle now studies its humming antenna to predict the moving Eye.',
          rewards: { knowledgePoints: 40, relics: 2, unlockRecipeId: 'relicCompass' }
        },
        {
          type: 'massive_skeleton',
          name: 'Colossal Wind-Rider Fossil',
          description: 'The massive fossilized ribs of a sky-dwelling mega-fauna beast that ruled the skies eons ago. Its hollow fossilized bones are wide enough to build shelters under.',
          storySegment: 'This titan ribcage bears ancient laser burns, indicating that the early colonist engineers tried to exterminate these majestic sky-creatures to clear orbital landing paths. The modern tribe believes the Wind-Riders are sacred guardians of the Eye, reminding us that survival comes from moving with the world, not trying to conquer it.',
          rewards: { knowledgePoints: 25, moraleBoost: -10, relics: 1, unlockRecipeId: 'ancientAmulet' }
        },
        {
          type: 'buried_machine',
          name: 'Atmospheric Anchor Centrifuge',
          description: 'A massive, half-buried planetary cooling centrifuge. Metallic conduits poke through the sand, still drawing electrostatic energy from the passing clouds.',
          storySegment: 'This colossal machine was built by early colonist teams to anchor a permanent safe zone in this sector by draining kinetic energy from the Storm. It failed when its core melted down under extreme wind pressure, but its power cells can still be salvaged for our caravans.',
          rewards: { knowledgePoints: 50, ancientMaterials: 5, unlockBuildingType: 'PrecursorGenerator' }
        },
        {
          type: 'crashed_structure',
          name: 'Firstfall Colonist Lander',
          description: 'A highly burnt escape craft made of strange silver alloys, embedded deep in the ground with warning stencils written in an ancient scientific script.',
          storySegment: 'This spacecraft fell from orbit over a century ago, carrying the first human ancestors to this world. Checking the logs reveals diaries of researchers who realized too late that the planetary desert Storm was not a random weather pattern, but an ecological force of nature that cannot be stopped.',
          rewards: { knowledgePoints: 35, ancientMaterials: 3, relics: 1, unlockRecipeId: 'nanoHealSalve', unlockBuildingType: 'AegisBeacon' }
        },
        {
          type: 'strange_stone_circle',
          name: 'God\'s Eye Moon-Relay',
          description: 'Ten massive alloy pillars arranged in an exact mathematical circle. Under the moonlight, faint cyan ley-lines form on the surface connecting the pillars.',
          storySegment: 'These pillars are not natural stone, but heavy mineral microprocessors linked directly to the orbital satellite networks. The tribe treats this as a temple of the God\'s Eye (the moon), believing that the moon\'s reflection on the floor is the Eye of the Storm\'s physical blessing.',
          rewards: { knowledgePoints: 25, moraleBoost: 20, relics: 2, unlockRecipeId: 'alloySpear' }
        }
      ];

      const landmarkIdx = Math.floor(chunkRand.next() * landmarkTemplates.length);
      const lm = landmarkTemplates[landmarkIdx];
      const cellIdx = Math.floor(chunkRand.next() * landCells.length);
      const chosen = landCells[cellIdx];

      chosen.landmark = {
        id: `lm_${lm.type}_${chunkX}_${chunkZ}`,
        type: lm.type as any,
        name: lm.name,
        description: lm.description,
        storySegment: lm.storySegment,
        rewards: lm.rewards,
        explored: false,
      };
      chosen.inspectableName = `⭐ Landmark: ${lm.name}`;
      chosen.hasTree = false;
      chosen.hasRock = false;
      chosen.hasShrub = false;
      chosen.resourceNode = null;

    } else if (spawnRoll < 0.09) {
      // Expedition Site Template
      const templateIdx = Math.floor(chunkRand.next() * EXPEDITION_SITES.length);
      const template = EXPEDITION_SITES[templateIdx];
      const cellIdx = Math.floor(chunkRand.next() * landCells.length);
      const chosen = landCells[cellIdx];

      chosen.expeditionSite = {
        id: `site_${template.id}_${chunkX}_${chunkZ}`,
        templateId: template.id,
        category: template.category,
        name: template.name,
        tier: template.tier,
        recommendedScoutLevel: template.recommendedScoutLevel,
        typicalDuration: template.typicalDuration,
        durationHours: template.durationHours,
        risk: template.risk,
        finds: template.finds,
        uniqueDiscoveries: template.uniqueDiscoveries,
        clues: template.clues,
        suppliesRequired: template.suppliesRequired,
        equipmentRequiredOrOptional: template.equipmentRequiredOrOptional,
        allowMultipleScouts: template.allowMultipleScouts,
        description: template.description,
        explored: false,
        exhausted: false,
        activeScouts: [],
        remainingLootRuns: 3,
        discovered: false,
      };
      chosen.inspectableName = `🚪 Site: ${template.name}`;
      chosen.hasTree = false;
      chosen.hasRock = false;
      chosen.hasShrub = false;
      chosen.resourceNode = null;
    }
  }

  return newChunk;
}

/**
 * Determines the simulation level of a chunk based on Eye of the Storm and camera coordinates.
 */
export function getChunkSimulationLevel(
  chunkX: number,
  chunkZ: number,
  mapData: MapData,
  cameraWorldPos?: { x: number; z: number }
): SimulationLevel {
  const chunkCenterX = chunkX * 6 + 3;
  const chunkCenterZ = chunkZ * 6 + 3;

  const eyeX = mapData.eyePos?.x ?? 60;
  const eyeZ = mapData.eyePos?.z ?? 60;
  const eyeRadius = mapData.eyeRadius ?? 14.0;

  const dx = chunkCenterX - eyeX;
  const dz = chunkCenterZ - eyeZ;
  const dist = Math.sqrt(dx * dx + dz * dz);

  // 1. FULL_ACTIVE: Inside Eye or within gameplay buffer (eyeRadius + 12.0 cells)
  const gameplayBufferRadius = eyeRadius + 12.0;
  if (dist <= gameplayBufferRadius) {
    return 'FULL_ACTIVE';
  }

  // 2. NEAR_FUTURE: Ahead of migration path
  if (mapData.eyeMovementState === 'migrating' && mapData.eyeTargetPos) {
    const targetX = mapData.eyeTargetPos.x;
    const targetZ = mapData.eyeTargetPos.z;

    const vx = targetX - eyeX;
    const vz = targetZ - eyeZ;
    const len = Math.sqrt(vx * vx + vz * vz);

    if (len > 0.01) {
      const ndx = vx / len;
      const ndz = vz / len;

      const proj = dx * ndx + dz * ndz;
      const perp = Math.abs(dx * (-ndz) + dz * ndx);

      // Preload 25 cells ahead within migration path
      if (proj > 0 && proj <= 25.0 && perp <= gameplayBufferRadius) {
        return 'NEAR_FUTURE';
      }
    }
  }

  // Preload ahead along Oracle future prediction path waypoints
  if (mapData.futureEyePath && mapData.futureEyePath.length > 0) {
    for (const wp of mapData.futureEyePath) {
      const wdx = chunkCenterX - wp.x;
      const wdz = chunkCenterZ - wp.z;
      if (Math.sqrt(wdx * wdx + wdz * wdz) <= gameplayBufferRadius) {
        return 'NEAR_FUTURE';
      }
    }
  }

  // 3. INSPECTION_VISUAL: Loaded because player is looking there with the camera (radius: 24.0 cells)
  const camPos = cameraWorldPos || mapData.cameraWorldPos;
  if (camPos) {
    const cdx = chunkCenterX - camPos.x;
    const cdz = chunkCenterZ - camPos.z;
    const camDist = Math.sqrt(cdx * cdx + cdz * cdz);
    const cameraInspectionRadius = 24.0; // ~4 chunks radius
    if (camDist <= cameraInspectionRadius) {
      return 'INSPECTION_VISUAL';
    }
  }

  // 4. ABSTRACT: Generated and known, but not rendered or active in standard loops
  return 'ABSTRACT';
}

/**
 * Checks if a chunk should be loaded under legacy true/false definitions.
 */
export function isChunkLoaded(
  chunkX: number,
  chunkZ: number,
  mapData: any
): boolean {
  const level = getChunkSimulationLevel(chunkX, chunkZ, mapData);
  return level === 'FULL_ACTIVE' || level === 'INSPECTION_VISUAL' || level === 'NEAR_FUTURE';
}

/**
 * Updates simulation levels of all chunks and triggers dynamic stream generation and unrendering.
 */
export function updateWorldChunkLoading(mapData: MapData): MapData {
  if (!mapData) return mapData;
  if (!mapData.chunksByKey) {
    mapData.chunksByKey = {};
  }

  const eyeX = mapData.eyePos?.x ?? 60;
  const eyeZ = mapData.eyePos?.z ?? 60;
  const eyeRadius = mapData.eyeRadius ?? 14.0;

  const camPos = mapData.cameraWorldPos || { x: eyeX, z: eyeZ };

  // Determine standard generation bounding box around both Eye and Camera
  const searchRadius = Math.max(eyeRadius + 30.0, 36.0);
  
  const minChunkX = Math.max(0, Math.floor((Math.min(eyeX, camPos.x) - searchRadius) / 6));
  const maxChunkX = Math.floor((Math.max(eyeX, camPos.x) + searchRadius) / 6);
  const minChunkZ = Math.max(0, Math.floor((Math.min(eyeZ, camPos.z) - searchRadius) / 6));
  const maxChunkZ = Math.floor((Math.max(eyeZ, camPos.z) + searchRadius) / 6);

  let chunkStateChanged = false;

  // 1. Generate new chunks around active focus areas on demand
  for (let cx = minChunkX; cx <= maxChunkX; cx++) {
    for (let cz = minChunkZ; cz <= maxChunkZ; cz++) {
      const key = `${cx},${cz}`;
      const level = getChunkSimulationLevel(cx, cz, mapData, camPos);

      if (level === 'FULL_ACTIVE' || level === 'INSPECTION_VISUAL' || level === 'NEAR_FUTURE') {
        let chunk = mapData.chunksByKey[key];
        if (!chunk) {
          chunk = generateChunk(cx, cz, mapData);
          chunkStateChanged = true;
        }
        if (!chunk.loaded) {
          chunkStateChanged = true;
        }
        chunk.simulationLevel = level;
        chunk.loaded = true;
        chunk.lastActiveTime = Date.now();

        // Mark all cells inside as loaded
        for (let r = 0; r < 6; r++) {
          for (let c = 0; c < 6; c++) {
            chunk.cells[r][c].loaded = true;
          }
        }
      }
    }
  }

  // 2. Refresh simulation levels of existing chunks, set loaded flags, and unload far-off ones
  for (const [key, chunk] of Object.entries(mapData.chunksByKey)) {
    const level = getChunkSimulationLevel(chunk.chunkX, chunk.chunkZ, mapData, camPos);
    chunk.simulationLevel = level;

    if (level === 'FULL_ACTIVE' || level === 'INSPECTION_VISUAL' || level === 'NEAR_FUTURE') {
      if (!chunk.loaded) {
        chunkStateChanged = true;
      }
      chunk.loaded = true;
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          chunk.cells[r][c].loaded = true;
        }
      }
    } else {
      if (chunk.loaded) {
        chunkStateChanged = true;
      }
      chunk.loaded = false;
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          chunk.cells[r][c].loaded = false;
        }
      }
    }
  }

  if (chunkStateChanged) {
    mapData.chunkLoadToken = (mapData.chunkLoadToken ?? 0) + 1;
  }

  return mapData;
}

/**
 * Legacy stubs to preserve exact imports and prevent build errors
 */
export function placeProceduralLandmarks(grid: CellInfo[][], size: number, seed: number) {}
export function placeProceduralExpeditionSites(grid: CellInfo[][], size: number, seed: number) {}

/**
 * Helper to query a cell from dynamic chunks securely.
 */
export function getCellAtWorld(mapData: MapData, worldX: number, worldZ: number): CellInfo | undefined {
  if (!mapData || !mapData.chunksByKey) return undefined;
  const chunkX = Math.floor(worldX / 6);
  const chunkZ = Math.floor(worldZ / 6);
  const key = `${chunkX},${chunkZ}`;
  const chunk = mapData.chunksByKey[key];
  if (!chunk) return undefined;
  const cx = ((worldX % 6) + 6) % 6;
  const cz = ((worldZ % 6) + 6) % 6;
  return chunk.cells[cx]?.[cz];
}

/**
 * Helper to modify a cell state persistently.
 */
export function setCellAtWorld(mapData: MapData, worldX: number, worldZ: number, changes: Partial<CellInfo>): void {
  if (!mapData) return;
  if (!mapData.chunksByKey) mapData.chunksByKey = {};
  const chunkX = Math.floor(worldX / 6);
  const chunkZ = Math.floor(worldZ / 6);
  const key = `${chunkX},${chunkZ}`;
  let chunk = mapData.chunksByKey[key];
  if (!chunk) {
    chunk = generateChunk(chunkX, chunkZ, mapData);
  }
  const cx = ((worldX % 6) + 6) % 6;
  const cz = ((worldZ % 6) + 6) % 6;
  const cell = chunk.cells[cx]?.[cz];
  if (cell) {
    Object.assign(cell, changes);
    chunk.modified = true;

    // Increment modifications token for Three.js fast sync
    mapData.decorationsRevision = (mapData.decorationsRevision ?? 0) + 1;

    // Sync back to mapData.grid compat layer
    if (!mapData.grid) mapData.grid = [];
    if (!mapData.grid[worldX]) mapData.grid[worldX] = [];
    mapData.grid[worldX][worldZ] = cell;
  }
}

/**
 * Queries all currently loaded cells.
 */
export function getLoadedCells(mapData: MapData): CellInfo[] {
  const list: CellInfo[] = [];
  if (!mapData || !mapData.chunksByKey) return list;
  for (const chunk of Object.values(mapData.chunksByKey)) {
    if (chunk.loaded) {
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          list.push(chunk.cells[r][c]);
        }
      }
    }
  }
  return list;
}

/**
 * Queries all currently loaded chunks.
 */
export function getLoadedChunks(mapData: MapData): WorldChunk[] {
  if (!mapData || !mapData.chunksByKey) return [];
  return Object.values(mapData.chunksByKey).filter(chunk => chunk.loaded);
}

/**
 * Primary initializer called to generate the starting MapData structure
 */
export function generateWorld(config: WorldConfig): MapData {
  const { size, seed } = config;

  const eyePos = { x: size / 2, z: size / 2 };
  const eyeRadius = 14.0;

  // Oracle route prediction
  const futureEyePath: { x: number; z: number }[] = [];
  const initialAngle = Math.random() * Math.PI * 2;
  let curX = eyePos.x;
  let curZ = eyePos.z;
  let curAngle = initialAngle;
  for (let i = 0; i < 6; i++) {
    const dist = 7 + Math.random() * 5;
    curAngle += (Math.random() - 0.5) * 0.6;
    curX = curX + Math.cos(curAngle) * dist;
    curZ = curZ + Math.sin(curAngle) * dist;
    futureEyePath.push({ x: parseFloat(curX.toFixed(1)), z: parseFloat(curZ.toFixed(1)) });
  }

  const worldData: MapData = {
    config,
    grid: [],
    chunksByKey: {},
    cameraWorldPos: { ...eyePos },
    researchPoints: 5,
    unlockedRecipes: ['stoneAxe', 'flintPickaxe', 'grassBasket'],
    unlockedBuildings: [],
    eyePos,
    eyeRadius,
    futureEyePath,
    eyeTargetPos: undefined,
    eyeMovementState: 'stable',
    deityModeActive: false,
    deityModeOverrideDir: undefined,
    deityModeOverrideSpeed: undefined,
    deityModePaused: false,
    stormWallDamageEnabled: true,
    activeLoreLogs: [],
    craftQueue: [],
    villageInventory: {
      maxWeight: 400,
      maxVolume: 400,
      currentWeight: 165.5,
      currentVolume: 195.8,
      cleanliness: 85,
      items: {
        wood: 150,
        stone: 80,
        berries: 40,
        roots: 30,
        mushrooms: 20,
        meat: 30,
        fiber: 45,
        bone: 10,
        dew: 15,
        reservoirWater: 25,
        rainwater: 10,
        relics: 2,
        ancientMaterials: 5,
        reinforcedExplorerPack: 0,
        ruinDiverHarness: 0,
        surveyorsLens: 0,
        expeditionLantern: 0,
        sealedExpeditionSuit: 0,
        ancientPowerCell: 0,
        precisionGear: 0,
        starMetalFragment: 0,
        titanBone: 0,
        fossilResin: 0,
        heartwoodCrystal: 0,
        memoryCrystal: 0,
        livingResinResidue: 0,
        deepCrystal: 0,
        ancientAlloyPlate: 0,
        logicCore: 0,
        sterileAncientCloth: 0,
        regenerationCompound: 0,
        extinctSeed: 0,
        stormLens: 0,
        resonantFossilShard: 0,
        vacuumVessel: 0,
        archiveTablet: 0,
        navigationCore: 0,
        pristineMachineCore: 0,
      }
    },
    caravanInventory: {
      maxWeight: 150,
      maxVolume: 150,
      currentWeight: 20.0,
      currentVolume: 15.0,
      cleanliness: 70,
      items: {
        relics: 1,
        ancientMaterials: 2,
        meat: 10,
        wood: 20
      }
    },
    stockpile: {
      wood: 150,
      stone: 80,
      food: 120,
      medicine: 5,

      berries: 40,
      berriesFresh: 95,
      roots: 30,
      rootsFresh: 90,
      mushrooms: 20,
      mushroomsFresh: 85,
      meat: 30,
      meatFresh: 80,

      fiber: 45,
      bone: 10,

      dew: 15,
      reservoirWater: 25,
      rainwater: 10,

      relics: 2,
      ancientMaterials: 5,

      copper: 0,
      silver: 0,
      gold: 0,
      iron: 0,

      stoneAxe: 0,
      flintPickaxe: 0,
      grassBasket: 0,
      spear: 0,
      bow: 0,
      boiledRoots: 0,
      boiledRootsFresh: 100,
      paddedJerkin: 0,
      saltedMeat: 0,
      saltedMeatFresh: 100,
      steelPickaxe: 0,
      eldritchWard: 0,
      amuletLife: 0,
      thuleciteCore: 0,
      hide: 5,
      fat: 3,
      horns: 0,
      reinforcedExplorerPack: 0,
      ruinDiverHarness: 0,
      surveyorsLens: 0,
      expeditionLantern: 0,
      sealedExpeditionSuit: 0,
      ancientPowerCell: 0,
      precisionGear: 0,
      starMetalFragment: 0,
      titanBone: 0,
      fossilResin: 0,
      heartwoodCrystal: 0,
      memoryCrystal: 0,
      livingResinResidue: 0,
      deepCrystal: 0,
      ancientAlloyPlate: 0,
      logicCore: 0,
      sterileAncientCloth: 0,
      regenerationCompound: 0,
      extinctSeed: 0,
      stormLens: 0,
      resonantFossilShard: 0,
      vacuumVessel: 0,
      archiveTablet: 0,
      navigationCore: 0,
      pristineMachineCore: 0,
    },
    autoGatherThresholds: {
      wood: 0,
      stone: 0,
      food: 0,
      berries: 0,
      roots: 0,
      mushrooms: 0,
      meat: 0,
      fiber: 0,
      copper: 0,
      silver: 0,
      gold: 0,
      iron: 0,
      bone: 0
    },
    animals: [],
    stormDaysUntilMigration: 12,
    stormSpeed: 1.0,
    stormMovementDirection: 'East',
    stormDangerLevel: 'Low',
    knownVillages: initializeOffScreenVillages(),
    oracleMessages: [
      {
        id: 'msg1',
        sender: 'Oracle Vaelen (Red Hollow)',
        text: 'Greetings, fellow Reader of Sky. The Red Hollow suffers a drying period; our water cisterns are empty. We seek water in exchange for meat.',
        timeSent: 'Day 1',
        actionable: true,
        type: 'help',
        status: 'pending',
        cost: { item: 'reservoirWater', qty: 15 },
        reward: { item: 'meat', qty: 30 },
        rewardDescription: 'Gain 30 Meat and +15 Relationship with Red Hollow'
      }
    ],
    discoveredRelics: [
      {
        id: 'relic1',
        name: 'Aegis Command Matrix',
        unknownFunction: 'Suppressed Supply Beacon',
        studyProgress: 0,
        researchValue: 20,
        dangerLevel: 'Low',
        requiredOracleLevel: 1,
        rewardType: 'resources',
        rewardDesc: 'Coordinates for dropped cargo container (+100 Wood, +100 Stone, +5 Gold)'
      },
      {
        id: 'relic2',
        name: 'Chrono-Hydra Cell',
        unknownFunction: 'Magnetic Resonator Core',
        studyProgress: 0,
        researchValue: 35,
        dangerLevel: 'Medium',
        requiredOracleLevel: 3,
        rewardType: 'technology',
        rewardDesc: 'Ancient design principles (+35 Research Points)'
      }
    ],
    predictionHistory: []
  };

  // Pre-generate starting window chunks for size config
  const numChunks = Math.ceil(size / 6);
  for (let cx = 0; cx < numChunks; cx++) {
    for (let cz = 0; cz < numChunks; cz++) {
      generateChunk(cx, cz, worldData);
    }
  }

  updateWorldChunkLoading(worldData);
  return worldData;
}
