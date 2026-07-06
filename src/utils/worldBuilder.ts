import { BiomeType, CellInfo, WorldConfig, MapData, Landmark, ExpeditionSite } from '../types';
import { Improved2DNoise, SeededRandom } from './noise';
import { EXPEDITION_SITES } from './expeditionDatabase';
import { initializeOffScreenVillages } from './villageSimulator';

// Palette matching a low-poly stylized survival game
export const BIOME_COLORS = {
  water: '#2575a7', // deep clear blue
  beach: '#d9c293', // warm soft sand
  desert: '#cf6030', // orange-ish desert sand
  grassland: '#548f4b', // rich vibrant green
  forest: '#325d2c', // darker forest green
  rocky: '#7a7a7a', // split stone slate grey
};

export function generateWorld(config: WorldConfig): MapData {
  const { size, seed, roughness, forestDensity, rockDensity, waterLevel } = config;

  const heightNoise = new Improved2DNoise(seed);
  const moistureNoise = new Improved2DNoise(seed + 98765);
  const detailNoise = new Improved2DNoise(seed * 2 + 13);

  const grid: CellInfo[][] = [];

  // Determine height thresholds based on config.waterLevel
  // Adjust base water cutoff by the user's config modifier
  const waterCutoff = 0.38 + waterLevel * 0.15; 
  const beachCutoff = waterCutoff + 0.05;
  const mountainCutoff = 0.68;

  for (let x = 0; x < size; x++) {
    const row: CellInfo[] = [];
    for (let z = 0; z < size; z++) {
      // Cell seed for deterministic feature placement
      const cellRand = new SeededRandom(seed + x * 73 + z * 31);

      // Normalised coordinates for noise sampling
      const nx = x / size;
      const nz = z / size;

      // Sample base fbm noises
      const hNoise = heightNoise.fbm(nx * 2.5, nz * 2.5, 4, 1.8, 0.45);
      const mNoise = moistureNoise.fbm(nx * 2.0, nz * 2.0, 3, 2.0, 0.5);
      const dNoise = detailNoise.noise2D(nx * 10, nz * 10);

      // Distance from center (island falloff)
      const dx = nx - 0.5;
      const dz = nz - 0.5;
      const dist = Math.sqrt(dx * dx + dz * dz) * 2; // 0 to ~1.414

      // Taper height at edges to make a gorgeous floating island/plateau structure
      // Outer 15% fades to ocean
      let height = hNoise;
      if (dist > 0.4) {
        const falloff = Math.pow((dist - 0.4) / 1.0, 1.5);
        height = Math.max(0.1, height - falloff * 0.7);
      }

      // Final scaled height
      const finalHeight = height * roughness * 12.0; // max ~12 units tall

      // Determine biome
      let biome: BiomeType = 'grassland';
      let color = BIOME_COLORS.grassland;

      if (height < waterCutoff) {
        // Previously water, now a beautiful orange desert, with small ponds/puddles at extremely low spots
        if (height < 0.14) {
          biome = 'water';
          color = BIOME_COLORS.water;
        } else if (height < 0.18) {
          biome = 'beach'; // sandy shoreline around small lake puddles
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
        // Between beach and mountains, classification is based on moisture
        if (mNoise > 0.55) {
          biome = 'forest';
          color = BIOME_COLORS.forest;
        } else if (mNoise < 0.26) {
          // Dry areas are also orange desert sand
          biome = 'desert';
          color = BIOME_COLORS.desert;
        } else if (mNoise < 0.35) {
          // Bedrock mountains
          biome = 'rocky';
          color = BIOME_COLORS.rocky;
        } else {
          biome = 'grassland';
          color = BIOME_COLORS.grassland;
        }
      }

      // Determine feature placement (must be above water)
      let hasTree = false;
      let hasRock = false;
      let hasShrub = false;
      let treeHeight = 0;
      let treeRotation = 0;
      let rockSize = 0;
      let rockRotation: [number, number, number] = [0, 0, 0];

      // Deterministic variety chunks/sectors of 6x6 size
      const sectorX = Math.floor(x / 6);
      const sectorZ = Math.floor(z / 6);
      const sectorSeed = (sectorX * 17 + sectorZ * 29) % 3;

      let forestBoost = 0.0;
      let rockBoost = 0.0;
      let shrubBoost = 0.0;

      if (sectorSeed === 0) {
        // "Verdant Groves" sector - boost forest density slightly
        forestBoost = 0.12;
      } else if (sectorSeed === 1) {
        // "Stony Quartz Flats" sector - boost rock density slightly
        rockBoost = 0.15;
      } else {
        // "Weald Meadows" sector - boost shrub/food flower density slightly
        shrubBoost = 0.14;
      }

      if (biome !== 'water') {
        const featureRoll = cellRand.next();

        if (biome === 'forest') {
          // Forest is heavily packed with pine trees and sparse mushrooms/shrubs
          const limit = (forestDensity + forestBoost) * 0.85;
          if (featureRoll < limit) {
            hasTree = true;
            treeHeight = cellRand.range(1.1, 2.3);
            treeRotation = cellRand.range(0, Math.PI * 2);
          } else if (featureRoll < limit + 0.08 + rockBoost) {
            hasRock = true;
            rockSize = cellRand.range(0.3, 0.7);
            rockRotation = [
              cellRand.range(0, Math.PI),
              cellRand.range(0, Math.PI),
              cellRand.range(0, Math.PI),
            ];
          } else if (featureRoll < limit + 0.15 + shrubBoost) {
            hasShrub = true;
          }
        } else if (biome === 'grassland') {
          // Grassland has sparse trees, occasional rock piles, and bushes
          const treeLimit = (forestDensity + forestBoost) * 0.18;
          const rockLimit = treeLimit + (rockDensity + rockBoost) * 0.12;
          
          if (featureRoll < treeLimit) {
            hasTree = true;
            treeHeight = cellRand.range(0.9, 1.8);
            treeRotation = cellRand.range(0, Math.PI * 2);
          } else if (featureRoll < rockLimit) {
            hasRock = true;
            rockSize = cellRand.range(0.4, 0.9);
            rockRotation = [
              cellRand.range(0, Math.PI),
              cellRand.range(0, Math.PI),
              cellRand.range(0, Math.PI),
            ];
          } else if (featureRoll < rockLimit + 0.12 + shrubBoost) {
            hasShrub = true;
          }
        } else if (biome === 'rocky') {
          // Rocky ranges have heavy boulder clusters, slate piles, no trees
          const limit = (rockDensity + rockBoost) * 0.75;
          if (featureRoll < limit) {
            hasRock = true;
            rockSize = cellRand.range(0.5, 1.6);
            rockRotation = [
              cellRand.range(0, Math.PI),
              cellRand.range(0, Math.PI),
              cellRand.range(0, Math.PI),
            ];
          } else if (featureRoll < limit + 0.08 + forestBoost) {
            // High altitude tiny pine trees
            hasTree = true;
            treeHeight = cellRand.range(0.5, 1.0);
            treeRotation = cellRand.range(0, Math.PI * 2);
          }
        } else if (biome === 'beach') {
          // Sandy beaches can have drift-stones or rare shrubs
          if (featureRoll < 0.10 + rockBoost * 0.4) {
            hasRock = true;
            rockSize = cellRand.range(0.2, 0.5);
            rockRotation = [
              cellRand.range(0, Math.PI),
              cellRand.range(0, Math.PI),
              cellRand.range(0, Math.PI),
            ];
            hasShrub = cellRand.next() > (0.5 - shrubBoost);
          }
        } else if (biome === 'desert') {
          // Desert has cacti, giant skeletons (rocks), and succulent shrubs/agave
          // Plant features (cacti and shrubs/agave) spawn at 30% of their current rate
          const cactusLimit = (forestDensity + forestBoost) * 0.16 * 0.30;
          const skeletalLimit = cactusLimit + (rockDensity + rockBoost) * 0.28; // high bone/skeleton/ruin rate
          const shrubLimit = skeletalLimit + (0.15 + shrubBoost) * 0.30;

          if (featureRoll < cactusLimit) {
            hasTree = true;
            treeHeight = cellRand.range(0.8, 1.5);
            treeRotation = cellRand.range(0, Math.PI * 2);
          } else if (featureRoll < skeletalLimit) {
            hasRock = true;
            rockSize = cellRand.range(0.6, 1.7); // giant fossils and ruins
            rockRotation = [
              cellRand.range(0, Math.PI),
              cellRand.range(0, Math.PI),
              cellRand.range(0, Math.PI),
            ];
          } else if (featureRoll < shrubLimit) {
            hasShrub = true;
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
        resources.wood = Math.round(treeHeight * (biome === 'desert' ? 25 : 50)); // Cacti have less wood
        resources.fertility = parseFloat((0.8 + dNoise * 0.4).toFixed(2));
      } else if (hasRock) {
        if (biome === 'desert') {
          inspectableName = rockSize > 1.25 ? 'Prehistoric Giant Fossil Bone' : rockSize > 0.82 ? 'Precursor Monolith Obelisk' : 'Weathered Sandstone Rubble';
        } else {
          inspectableName = rockSize > 1.2 ? 'Gigantic Granite Boulder' : rockSize > 0.7 ? 'Slate Rock Outcrop' : 'Loose Granite Stones';
        }
        resources.stone = Math.round(rockSize * (biome === 'desert' ? 60 : 100)); // ruins-scrap yield some stone too
      } else if (hasShrub) {
        inspectableName = biome === 'desert' ? 'Spiny Flower Agave' : 'Wild Berry Shrub';
        resources.fertility = parseFloat(((biome === 'desert' ? 0.35 : 1.1) + dNoise * 0.3).toFixed(2));
      } else {
        // Base land tiles
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

      // Assign Don't Starve resource nodes deterministically based on cell features
      let resourceNode: CellInfo['resourceNode'] = null;
      const rollResource = cellRand.next();

      if (biome !== 'water') {
        if (hasShrub) {
          resourceNode = {
            category: 'food',
            type: 'Berries',
            amount: 15,
            maxAmount: 15,
            regrowTimer: 0,
            regrowRate: 1,
            quality: 100,
          };
          inspectableName = biome === 'desert' ? 'Prickly Agave Shrub' : 'Cinder-Berry Shrub';
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
            // 50% Rocks / Stone
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
            // 25% copper
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
            // 15% silver
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
            // 5% gold
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
            // 5% iron (other minerals)
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
          // Open ground features
          if (biome === 'grassland') {
            const subSeed = cellRand.next();
            if (rollResource < 0.20) {
              // Food Variety
              if (subSeed < 0.25) {
                resourceNode = { category: 'food', type: 'Berries', amount: 15, maxAmount: 15, regrowTimer: 0, regrowRate: 1.0, quality: 100 };
                inspectableName = 'Meadow Solar Strawberries';
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
              // Material (Fiber) Variety
              if (subSeed < 0.5) {
                resourceNode = { category: 'material', type: 'Fiber', amount: 12, maxAmount: 12, regrowTimer: 0, regrowRate: 1.2, quality: 100 };
                inspectableName = 'Tall Flax Blue-fibers';
              } else {
                resourceNode = { category: 'material', type: 'Fiber', amount: 15, maxAmount: 15, regrowTimer: 0, regrowRate: 1.1, quality: 100 };
                inspectableName = 'Neon Glow-Cotton Bolls';
              }
            } else if (rollResource < 0.46) {
              // Water variety
              resourceNode = { category: 'water', type: 'Dew', amount: 5, maxAmount: 5, regrowTimer: 0, regrowRate: 1.5, quality: 100 };
              inspectableName = 'Morning White-clover Dew';
            }
          } else if (biome === 'forest') {
            const subSeed = cellRand.next();
            if (rollResource < 0.25) {
              // Food Variety (highly habitable)
              if (subSeed < 0.2) {
                resourceNode = { category: 'food', type: 'Mushrooms', amount: 8, maxAmount: 8, regrowTimer: 0, regrowRate: 0.7, quality: 100 };
                inspectableName = 'Glowcap Lumina-Mushrooms';
              } else if (subSeed < 0.4) {
                resourceNode = { category: 'food', type: 'Mushrooms', amount: 10, maxAmount: 10, regrowTimer: 0, regrowRate: 0.8, quality: 100 };
                inspectableName = 'Earthy Chanterelle Clump';
              } else if (subSeed < 0.6) {
                resourceNode = { category: 'food', type: 'Berries', amount: 15, maxAmount: 15, regrowTimer: 0, regrowRate: 1.0, quality: 100 };
                inspectableName = 'Sylvan Emberberries';
              } else if (subSeed < 0.8) {
                resourceNode = { category: 'food', type: 'Berries', amount: 12, maxAmount: 12, regrowTimer: 0, regrowRate: 1.1, quality: 100 };
                inspectableName = 'Amethyst Violetberries';
              } else {
                resourceNode = { category: 'food', type: 'Roots', amount: 8, maxAmount: 8, regrowTimer: 0, regrowRate: 0.6, quality: 100 };
                inspectableName = 'Storm-Root Stem';
              }
            } else if (rollResource < 0.40) {
              // Material (Fiber) Variety
              if (subSeed < 0.5) {
                resourceNode = { category: 'material', type: 'Fiber', amount: 10, maxAmount: 10, regrowTimer: 0, regrowRate: 1.2, quality: 100 };
                inspectableName = 'Sprout Fiber Twines';
              } else {
                resourceNode = { category: 'material', type: 'Fiber', amount: 12, maxAmount: 12, regrowTimer: 0, regrowRate: 1.3, quality: 100 };
                inspectableName = 'Climbing Sylvan Ivy';
              }
            } else if (rollResource < 0.48) {
              // Water Variety
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
              // Rocky areas have rich Precursor Artifacts and Carvings (highly rare!)
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
              // Add rich natural food variety to rocky biomes
              if (subSeed < 0.33) {
                resourceNode = { category: 'food', type: 'Berries', amount: 10, maxAmount: 10, regrowTimer: 0, regrowRate: 0.7, quality: 100 };
                inspectableName = 'High-altitude Cloudberry Shrub';
              } else if (subSeed < 0.66) {
                resourceNode = { category: 'food', type: 'Roots', amount: 8, maxAmount: 8, regrowTimer: 0, regrowRate: 0.5, quality: 100 };
                inspectableName = 'Nourishing Alpine Lichen Mat';
              } else {
                resourceNode = { category: 'food', type: 'Mushrooms', amount: 12, maxAmount: 12, regrowTimer: 0, regrowRate: 0.8, quality: 100 };
                inspectableName = 'Crag Shaggy-Mane Mushrooms';
              }
            } else if (rollResource < 0.40) {
              // Add natural fiber plant variety to rocky biomes
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
              // Beach plant variety
              if (subSeed < 0.5) {
                resourceNode = { category: 'material', type: 'Fiber', amount: 14, maxAmount: 14, regrowTimer: 0, regrowRate: 1.4, quality: 100 };
                inspectableName = 'Coarse Dune Marram Grass';
              } else {
                resourceNode = { category: 'food', type: 'Berries', amount: 10, maxAmount: 10, regrowTimer: 0, regrowRate: 1.2, quality: 100 };
                inspectableName = 'Salt-Crested Gemberries';
              }
            } else if (rollResource < 0.43) {
              resourceNode = { category: 'water', type: 'Dew', amount: 6, maxAmount: 6, regrowTimer: 0, regrowRate: 1.4, quality: 100 };
              inspectableName = 'Coastal Dew Fronds';
            }
          } else if (biome === 'desert') {
            // Desert ones loaded with metal, minerals, iron, quartz crystals & prehistoric residues!
            const dRoll = dNoise * 0.5 + cellRand.next() * 0.5; // smooth randomized noise blend
            if (dRoll < 0.35) {
              // Heavy minerals and ore nuggets (highly abundant stone!)
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
              // Heavy metals and tech scrap - rare!
              resourceNode = { category: 'rare', type: 'AncientMaterials', amount: 5, maxAmount: 5, regrowTimer: 0, regrowRate: 0, quality: 100 };
              inspectableName = 'Decommissioned Precursor Metal Beam';
            } else if (dRoll < 0.36) {
              // Giant rib-bone fossil - rare!
              resourceNode = { category: 'material', type: 'Bone', amount: 12, maxAmount: 12, regrowTimer: 0, regrowRate: 0.05, quality: 100 };
              inspectableName = 'Giant Bleached Rib-bone Pile';
            } else if (dRoll < 0.60) {
              // Fibers - abundant pants!
              resourceNode = { category: 'material', type: 'Fiber', amount: 10, maxAmount: 10, regrowTimer: 0, regrowRate: 0.9, quality: 100 };
              inspectableName = 'Withered Cactus Bark';
            } else if (dRoll < 0.78) {
              // Roots/Food - abundant roots!
              resourceNode = { category: 'food', type: 'Roots', amount: 8, maxAmount: 8, regrowTimer: 0, regrowRate: 0.5, quality: 100 };
              inspectableName = 'Fleshy Cactus Root Bulb';
            } else if (dRoll < 0.94) {
              // Dew water - abundant water!
              resourceNode = { category: 'water', type: 'Dew', amount: 5, maxAmount: 5, regrowTimer: 0, regrowRate: 1.1, quality: 100 };
              inspectableName = 'Desert Dew Succulent';
            }
          }
        }
      } else {
        // Biome water
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

      const distFromCenter = Math.sqrt((x - size/2) ** 2 + (z - size/2) ** 2);
      const isInitialScouted = distFromCenter <= 11; // Area around colony center is revealed initially

      row.push({
        x,
        z,
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
      });
    }
    grid.push(row);
  }

  // Inject procedural landmarks
  placeProceduralLandmarks(grid, size, seed);

  // Inject procedural ancient-site expedition entrances
  placeProceduralExpeditionSites(grid, size, seed);

  // --- EYE OF THE STORM INITIALIZATION ---
  const eyePos = { x: size / 2, z: size / 2 };
  const eyeRadius = 14.0;
  
  // Create future waypoints for the Oracle prediction path
  const futureEyePath: { x: number; z: number }[] = [];
  const initialAngle = Math.random() * Math.PI * 2;
  let curX = eyePos.x;
  let curZ = eyePos.z;
  let curAngle = initialAngle;
  for (let i = 0; i < 6; i++) {
    const dist = 7 + Math.random() * 5;
    curAngle += (Math.random() - 0.5) * 0.6;
    curX = Math.max(4, Math.min(size - 4, curX + Math.cos(curAngle) * dist));
    curZ = Math.max(4, Math.min(size - 4, curZ + Math.sin(curAngle) * dist));
    futureEyePath.push({ x: parseFloat(curX.toFixed(1)), z: parseFloat(curZ.toFixed(1)) });
  }

  return {
    config,
    grid,
    researchPoints: 5,
    unlockedRecipes: ['stoneAxe', 'flintPickaxe', 'grassBasket'],
    unlockedBuildings: [],
    eyePos,
    eyeRadius,
    futureEyePath,
    deityModeActive: false,
    deityModeOverrideDir: undefined,
    deityModeOverrideSpeed: undefined,
    deityModePaused: false,
    stormWallDamageEnabled: true,
    activeLoreLogs: [],
    craftQueue: [],
    villageInventory: {
      maxWeight: 400, // starting without StorageBins
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
      maxWeight: 150, // carriage trailer limits
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

      // Minerals
      copper: 0,
      silver: 0,
      gold: 0,
      iron: 0,

      // Crafted products
      stoneAxe: 0,
      flintPickaxe: 0,
      grassBasket: 0,
      spear: 0,
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
}

function placeProceduralLandmarks(grid: CellInfo[][], size: number, seed: number) {
  const rand = new SeededRandom(seed + 9991);
  const landmarksToSpawn: Omit<Landmark, 'explored'>[] = [
    {
      id: 'lm_giant_petrified_tree',
      type: 'giant_petrified_tree',
      name: 'Petritree Arch-Root',
      description: 'A colossal, fossilized alien tree root reaching towards the sky. Its bark has petrified into glowing silicate, teeming with Root Crystals and storm-hardened resin.',
      storySegment: 'This titanic root survived the colonists\' early attempts to clear the native petrified forests. Faint warm hums still pulse inside, proving that the planet\'s root network is still fully alive, absorbing kinetic friction and feeding off the Storm\'s static electricity.',
      rewards: {
        knowledgePoints: 30,
        moraleBoost: 15,
        ancientMaterials: 4,
        unlockBuildingType: 'PetrifiedGreenhouse'
      }
    },
    {
      id: 'lm_ancient_tower',
      type: 'ancient_tower',
      name: 'Stormbreaker Spire Tower',
      description: 'A mathematical obsidian spire rising from the high cliffs. Ancient heavy fiber lines run deep into its stone layers, occasionally sparking with blue static discharges.',
      storySegment: 'The walls of this spire are inscribed with equations for cloud-seeding and weather manipulation. It was a weather control tower built by the first human colonists in a failed attempt to weaken the global Storm. The Oracle now studies its humming antenna to predict the moving Eye.',
      rewards: {
        knowledgePoints: 40,
        relics: 2,
        unlockRecipeId: 'relicCompass'
      }
    },
    {
      id: 'lm_massive_skeleton',
      type: 'massive_skeleton',
      name: 'Colossal Wind-Rider Fossil',
      description: 'The massive fossilized ribs of a sky-dwelling mega-fauna beast that ruled the skies eons ago. Its hollow fossilized bones are wide enough to build shelters under.',
      storySegment: 'This titan ribcage bears ancient laser burns, indicating that the early colonist engineers tried to exterminate these majestic sky-creatures to clear orbital landing paths. The modern tribe believes the Wind-Riders are sacred guardians of the Eye, reminding us that survival comes from moving with the world, not trying to conquer it.',
      rewards: {
        knowledgePoints: 25,
        moraleBoost: -10,
        relics: 1,
        unlockRecipeId: 'ancientAmulet'
      }
    },
    {
      id: 'lm_buried_machine',
      type: 'buried_machine',
      name: 'Atmospheric Anchor Centrifuge',
      description: 'A massive, half-buried planetary cooling centrifuge. Metallic conduits poke through the sand, still drawing electrostatic energy from the passing clouds.',
      storySegment: 'This colossal machine was built by early colonist teams to anchor a permanent safe zone in this sector by draining kinetic energy from the Storm. It failed when its core melted down under extreme wind pressure, but its power cells can still be salvaged for our caravans.',
      rewards: {
        knowledgePoints: 50,
        ancientMaterials: 5,
        unlockBuildingType: 'PrecursorGenerator'
      }
    },
    {
      id: 'lm_crashed_structure',
      type: 'crashed_structure',
      name: 'Firstfall Colonist Lander',
      description: 'A highly burnt escape craft made of strange silver alloys, embedded deep in the ground with warning stencils written in an ancient scientific script.',
      storySegment: 'This spacecraft fell from orbit over a century ago, carrying the first human ancestors to this world. Checking the logs reveals diaries of researchers who realized too late that the planetary desert Storm was not a random weather pattern, but an ecological force of nature that cannot be stopped.',
      rewards: {
        knowledgePoints: 35,
        ancientMaterials: 3,
        relics: 1,
        unlockRecipeId: 'nanoHealSalve',
        unlockBuildingType: 'AegisBeacon'
      }
    },
    {
      id: 'lm_strange_stone_circle',
      type: 'strange_stone_circle',
      name: 'God\'s Eye Moon-Relay',
      description: 'Ten massive alloy pillars arranged in an exact mathematical circle. Under the moonlight, faint cyan ley-lines form on the surface connecting the pillars.',
      storySegment: 'These pillars are not natural stone, but heavy mineral microprocessors linked directly to the orbital satellite networks. The tribe treats this as a temple of the God\'s Eye (the moon), believing that the moon\'s reflection on the floor is the Eye of the Storm\'s physical blessing.',
      rewards: {
        knowledgePoints: 25,
        moraleBoost: 20,
        relics: 2,
        unlockRecipeId: 'alloySpear'
      }
    }
  ];

  const center = size / 2;

  for (const lm of landmarksToSpawn) {
    const landmarkBiomes: Record<string, BiomeType[]> = {
      giant_petrified_tree: ['forest', 'grassland'],
      ancient_tower: ['rocky', 'forest'],
      massive_skeleton: ['desert', 'rocky'],
      buried_machine: ['desert', 'grassland'],
      crashed_structure: ['forest', 'desert'],
      strange_stone_circle: ['grassland', 'beach']
    };

    const allowed = landmarkBiomes[lm.type];
    
    // Find all cells that match requirements
    const candidates: CellInfo[] = [];
    for (let x = 0; x < size; x++) {
      for (let z = 0; z < size; z++) {
        const cell = grid[x][z];
        const dist = Math.sqrt((x - center) ** 2 + (z - center) ** 2);
        if (dist > 12 && dist < size - 2 && allowed.includes(cell.biome) && !cell.landmark && cell.biome !== 'water') {
          candidates.push(cell);
        }
      }
    }

    if (candidates.length > 0) {
      // Pick one deterministically using rand
      const idx = Math.floor(rand.next() * candidates.length);
      const chosen = candidates[idx];
      
      // Inject landmark
      chosen.landmark = {
        ...lm,
        explored: false
      } as Landmark;
      chosen.inspectableName = `⭐ Landmark: ${lm.name}`;

      // Clear standard blocking flora/fauna decorations so there's no visual clutter!
      chosen.hasTree = false;
      chosen.hasRock = false;
      chosen.hasShrub = false;
      chosen.resourceNode = null;
    }
  }
}

export function placeProceduralExpeditionSites(grid: CellInfo[][], size: number, seed: number) {
  const rand = new SeededRandom(seed + 99991);
  const center = size / 2;

  // Let's spawn 12 random sites from our rich collection of templates!
  const sitesToSpawn = [...EXPEDITION_SITES];
  // Shuffle sitesToSpawn deterministically using rand
  for (let i = sitesToSpawn.length - 1; i > 0; i--) {
    const j = Math.floor(rand.next() * (i + 1));
    const temp = sitesToSpawn[i];
    sitesToSpawn[i] = sitesToSpawn[j];
    sitesToSpawn[j] = temp;
  }

  // We will pick 12 diverse sites to place
  const chosenTemplates = sitesToSpawn.slice(0, 12);

  for (const template of chosenTemplates) {
    const candidates: CellInfo[] = [];
    for (let x = 0; x < size; x++) {
      for (let z = 0; z < size; z++) {
        const cell = grid[x][z];
        const dist = Math.sqrt((x - center) ** 2 + (z - center) ** 2);
        // Place sites outside immediate center, in non-water biomes, where no landmark or other site exists
        if (dist > 8 && dist < size - 2 && cell.biome !== 'water' && !cell.landmark && !cell.expeditionSite) {
          candidates.push(cell);
        }
      }
    }

    if (candidates.length > 0) {
      const idx = Math.floor(rand.next() * candidates.length);
      const chosen = candidates[idx];

      chosen.expeditionSite = {
        id: `site_${template.id}_${Math.floor(rand.next() * 10000)}`,
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
        remainingLootRuns: 3, // Can explore a site up to 3 times
        discovered: false, // will be revealed upon scouting
      };

      chosen.inspectableName = `🚪 Site: ${template.name}`;
      
      // Clear trees/rocks so it renders beautifully on the map
      chosen.hasTree = false;
      chosen.hasRock = false;
      chosen.hasShrub = false;
      chosen.resourceNode = null;
    }
  }
}

