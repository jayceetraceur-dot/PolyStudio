import { MapData, CellInfo } from '../types';

export interface SpatialIndex {
  fireplacePos: { x: number; y: number; z: number } | null;
  waterWells: { x: number; z: number }[];
  waterCells: { x: number; z: number }[];
  designatedGather: { x: number; z: number }[];
  designatedHunt: { x: number; z: number }[];
  designatedFarms: { x: number; z: number }[];
  designatedConstructions: { x: number; z: number }[];
  designatedRepairs: { x: number; z: number }[];
  itemsOnGround: { x: number; z: number }[];
  shrubs: { x: number; z: number }[];
  trees: { x: number; z: number }[];
  rocks: { x: number; z: number }[];
  storageBins: { x: number; z: number }[];
  structuresByType: Record<string, { x: number; z: number }[]>;
  resourceNodes: { x: number; z: number; type: string }[];
  dirty: boolean;
}

export function invalidateSpatialIndex(mapData: MapData) {
  if (mapData.spatialIndex) {
    mapData.spatialIndex.dirty = true;
  }
}

export function getSpatialIndex(mapData: MapData): SpatialIndex {
  if (mapData.spatialIndex && !mapData.spatialIndex.dirty) {
    return mapData.spatialIndex;
  }

  const fireplacePos: { x: number; y: number; z: number } | null = null;
  const waterWells: { x: number; z: number }[] = [];
  const waterCells: { x: number; z: number }[] = [];
  const designatedGather: { x: number; z: number }[] = [];
  const designatedHunt: { x: number; z: number }[] = [];
  const designatedFarms: { x: number; z: number }[] = [];
  const designatedConstructions: { x: number; z: number }[] = [];
  const designatedRepairs: { x: number; z: number }[] = [];
  const itemsOnGround: { x: number; z: number }[] = [];
  const shrubs: { x: number; z: number }[] = [];
  const trees: { x: number; z: number }[] = [];
  const rocks: { x: number; z: number }[] = [];
  const storageBins: { x: number; z: number }[] = [];
  const structuresByType: Record<string, { x: number; z: number }[]> = {};
  const resourceNodes: { x: number; z: number; type: string }[] = [];

  let resolvedFireplacePos = fireplacePos;

  // Process loaded cells efficiently
  const loadedCells: CellInfo[] = mapData.chunksByKey
    ? Object.values(mapData.chunksByKey)
        .filter((chunk: any) => chunk.loaded !== false)
        .flatMap((chunk: any) => chunk.cells.flat())
    : (mapData.grid ? mapData.grid.flat().filter((cell) => cell && cell.loaded !== false) : []);

  for (let i = 0; i < loadedCells.length; i++) {
    const cell = loadedCells[i];
    if (!cell) continue;

    const x = cell.x;
    const z = cell.z;

    if (cell.structure && !cell.structure.dismantling) {
      const type = cell.structure.type;
      if (!structuresByType[type]) {
        structuresByType[type] = [];
      }
      structuresByType[type].push({ x, z });

      if (type === 'Fireplace') {
        resolvedFireplacePos = { x, y: cell.height, z };
      } else if (type === 'WaterWell') {
        waterWells.push({ x, z });
      } else if (type === 'StorageBin') {
        storageBins.push({ x, z });
      }

      if (cell.structure.condition < cell.structure.maxCondition) {
        designatedRepairs.push({ x, z });
      }
    }

    if (cell.construction) {
      designatedConstructions.push({ x, z });
    }

    if (cell.farmCrop) {
      designatedFarms.push({ x, z });
    }

    if (cell.biome === 'water') {
      waterCells.push({ x, z });
    }

    if (cell.itemsOnGround) {
      itemsOnGround.push({ x, z });
    }

    if (cell.hasShrub) {
      shrubs.push({ x, z });
    }

    if (cell.hasTree) {
      trees.push({ x, z });
    }

    if (cell.hasRock) {
      rocks.push({ x, z });
    }

    if (cell.gatherDesignated) {
      designatedGather.push({ x, z });
    }

    if (cell.wildAnimal && ((cell.wildAnimal as any).isHuntDesignated || (cell.wildAnimal as any).isCaptureDesignated || (cell.wildAnimal as any).isTameDesignated)) {
      designatedHunt.push({ x, z });
    }

    if (cell.resourceNode && cell.resourceNode.amount > 0) {
      resourceNodes.push({ x, z, type: cell.resourceNode.type });
    }
  }

  if (mapData.animals) {
    for (let i = 0; i < mapData.animals.length; i++) {
      const ani = mapData.animals[i];
      if (!ani.isDead && ((ani as any).isHuntDesignated || (ani as any).isCaptureDesignated || (ani as any).isTameDesignated)) {
        const ax = Math.round(ani.x);
        const az = Math.round(ani.z);
        if (!designatedHunt.some(p => p.x === ax && p.z === az)) {
          designatedHunt.push({ x: ax, z: az });
        }
      }
    }
  }

  const newIndex: SpatialIndex = {
    fireplacePos: resolvedFireplacePos,
    waterWells,
    waterCells,
    designatedGather,
    designatedHunt,
    designatedFarms,
    designatedConstructions,
    designatedRepairs,
    itemsOnGround,
    shrubs,
    trees,
    rocks,
    storageBins,
    structuresByType,
    resourceNodes,
    dirty: false,
  };

  mapData.spatialIndex = newIndex;
  return newIndex;
}
