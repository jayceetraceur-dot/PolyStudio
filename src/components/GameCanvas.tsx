import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CellInfo, MapData, TimeSpeed, Tribesperson } from '../types';
import { BIOME_COLORS } from '../utils/worldBuilder';
import { ambientAudioEngine } from '../utils/audioEngine';
import {
  createVillagerMesh,
  updateVillagerEquipment,
  updateVillagerAnimation,
  createAnimalMesh,
  updateAnimalAnimation,
  setLatestSelectedPerson
} from '../utils/appearanceSystems';


function getThoughtEmoji(person: Tribesperson): string {
  if (!person.isAlive) return '💀';
  
  const status = person.statusText?.toLowerCase() || '';
  
  // High Priority Status checks
  if (status.includes('love') || status.includes('flirt')) return '❤️';
  if (status.includes('argue') || status.includes('mad') || status.includes('angry')) return '😡';
  if (status.includes('socializ') || status.includes('chat') || status.includes('talk')) {
    if (person.stats.morale > 75) return '😊';
    return '💬';
  }
  if (person.stats.health < 40) return '🤕';
  if (person.stats.morale < 25) return '😡';
  if (person.stats.hunger < 25) return '🍖';
  if (person.stats.thirst < 25) return '💧';
  if (person.stats.fatigue < 25) return '🥱';

  // Job checks
  if (person.activeJobType === 'Sleep') return '💤';
  if (person.activeJobType === 'Eat') return '🍞';
  if (person.activeJobType === 'Study') return '🧐';
  if (person.activeJobType === 'Gather') return '🍎';
  if (person.activeJobType === 'Hunt') return '🏹';
  if (person.activeJobType === 'Farm') return '🌾';
  if (person.activeJobType === 'Build') return '🔨';
  if (person.activeJobType === 'Repair') return '🔧';
  if (person.activeJobType === 'Scout') return '👁️';
  if (person.activeJobType === 'Haul') return '📦';

  // Fallbacks
  if (status.includes('rest') || status.includes('idle')) return '🍃';
  if (status.includes('think') || status.includes('analyz') || status.includes('contemplat')) return '💭';

  return '💭'; // default thinking/doing bubble
}

interface GameCanvasProps {
  mapData: MapData;
  selectedCell: CellInfo | null;
  onSelectCell: (cell: CellInfo | null) => void;
  timeOfDay: number; // 0..1
  timeSpeed: TimeSpeed;
  tribe: Tribesperson[];
  selectedTribesperson: Tribesperson | null;
  onSelectTribesperson: (person: Tribesperson | null) => void;
  focusCoordinates: { x: number; z: number } | null;
  worldId?: number;
  onCameraMove?: (pos: { x: number; z: number }) => void;
}

export default function GameCanvas({
  mapData,
  selectedCell,
  onSelectCell,
  timeOfDay,
  timeSpeed,
  tribe,
  selectedTribesperson,
  onSelectTribesperson,
  focusCoordinates,
  worldId,
  onCameraMove,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetFocalPointRef = useRef<THREE.Vector3 | null>(null);
  const lastCamChunkX = useRef<number | null>(null);
  const lastCamChunkZ = useRef<number | null>(null);
  const lastSpatialSoundTimeRef = useRef<number>(0);

  // Keep latest props in ref to access them inside non-reactive Three.js loop without tearing down the renderer
  const propsRef = useRef({ 
    mapData, 
    selectedCell, 
    onSelectCell, 
    timeOfDay, 
    timeSpeed,
    tribe,
    selectedTribesperson,
    onSelectTribesperson,
    focusCoordinates,
    worldId,
    onCameraMove
  });

  useEffect(() => {
    propsRef.current = { 
      mapData, 
      selectedCell, 
      onSelectCell, 
      timeOfDay, 
      timeSpeed,
      tribe,
      selectedTribesperson,
      onSelectTribesperson,
      focusCoordinates,
      worldId,
      onCameraMove
    };
  }, [mapData, selectedCell, onSelectCell, timeOfDay, timeSpeed, tribe, selectedTribesperson, onSelectTribesperson, focusCoordinates, worldId, onCameraMove]);
  
  // One-shot camera tracking center trigger
  useEffect(() => {
    if (focusCoordinates && targetFocalPointRef.current) {
      targetFocalPointRef.current.set(focusCoordinates.x, targetFocalPointRef.current.y, focusCoordinates.z);
    }
  }, [focusCoordinates]);

  // Loading state
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Direct fix for duplicates / overlay freeze - completely clear alternative/older elements:
    container.innerHTML = '';

    // Hoist animating collections to avoid temporal dead zone issues inside rebuildDecorations
    let animatingHammers: THREE.Object3D[] = [];
    let animatingFireplaceLights: THREE.Object3D[] = [];
    let animatingFireplaceFlames: THREE.Object3D[] = [];
    let animatingWindows: THREE.Object3D[] = [];
    let animatingSwayingPlants: THREE.Object3D[] = [];

    // --- 1. SETUP THREE.JS SCENE, CAMERA, & RENDERER ---
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    
    // Low-poly ambient fog that changes color depending on time of day
    const fog = new THREE.FogExp2('#141c2c', 0.015);
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // --- 2. CAMERA RTS CONTROL STATE ---
    // Camera is styled as a focal-orbiting system.
    // We navigate by shifting a "focusPoint" anchor horizontally,
    // and maintaining an orbit angle (theta, phi, dist) around it.
    const focalPoint = new THREE.Vector3(mapData.config.size / 2, 2, mapData.config.size / 2);
    let cameraDistance = 28.0;
    let cameraTheta = -Math.PI / 4; // Horizontal rotation
    let cameraPhi = Math.PI / 4.2;   // Polar height rotation
    
    // Smooth dampening target variables
    const targetFocalPoint = focalPoint.clone();
    targetFocalPointRef.current = targetFocalPoint;
    let targetDistance = cameraDistance;
    let targetTheta = cameraTheta;
    let targetPhi = cameraPhi;

    // Movement tracking
    const keysPressed: { [key: string]: boolean } = {};
    let isMouseDown = false;
    let mouseDownButton = -1; // 0: Left, 1: Middle, 2: Right
    const previousMousePosition = { x: 0, y: 0 };

    // Set camera base position initially
    camera.position.set(
      focalPoint.x + cameraDistance * Math.sin(cameraPhi) * Math.sin(cameraTheta),
      focalPoint.y + cameraDistance * Math.cos(cameraPhi),
      focalPoint.z + cameraDistance * Math.sin(cameraPhi) * Math.cos(cameraTheta)
    );
    camera.lookAt(focalPoint);

    // --- 3. CREATE STARRY SKYBOX ACCENT ---
    const starsCount = 400;
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
      // Sphere scattering for sky dome
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 200 + Math.random() * 50; // far away
      starPositions[i] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 1] = Math.abs(r * Math.cos(phi)); // Keep in top hemisphere
      starPositions[i + 2] = r * Math.sin(phi) * Math.cos(theta);
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.0,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.0 // starts invisible, fades in at night
    });
    const starField = new THREE.Points(starsGeometry, starMat);
    scene.add(starField);

    // --- 4. LIGHTS SETUP ---
    // Ambient light - gives overall biome tint
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Sun light (Directional)
    const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    // Map shadow volume box
    const d = mapData.config.size * 0.9;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0006;
    scene.add(sunLight);

    // Moon light (Directional) - low power blue tinted light casting moonshadows
    const moonLight = new THREE.DirectionalLight(0x7597ff, 0.3);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 512;
    moonLight.shadow.mapSize.height = 512;
    moonLight.shadow.camera.left = -d;
    moonLight.shadow.camera.right = d;
    moonLight.shadow.camera.top = d;
    moonLight.shadow.camera.bottom = -d;
    moonLight.shadow.bias = -0.001;
    scene.add(moonLight);

    // --- 5. TILE/BIOME VISUAL MODELS CONTAINER ---
    // To facilitate raycasting, we track all inspectable meshes
    const cellMeshes: THREE.Object3D[] = [];
    let trackingEntityId: string | null = null;
    let trackingEntityType: 'person' | 'animal' | null = null;
    const entityGroup = new THREE.Group();
    scene.add(entityGroup);

    interface FishBoid {
      group: THREE.Group;
      tailMesh: THREE.Mesh;
      position: THREE.Vector3;
      velocity: THREE.Vector3;
      lakeId: number;
      lakeCenter: THREE.Vector3;
      lakeCells: { x: number; z: number; seaFloorHeight: number; surfaceHeight: number }[];
      targetY: number;
      speed: number;
      swimOffset: number;
    }

    const fishFlock: FishBoid[] = [];
    const fishGroup = new THREE.Group();
    scene.add(fishGroup);

    // Filtered group for tribespeople
    const actorGroup = new THREE.Group();
    scene.add(actorGroup);
    const actorMeshesMap = new Map<string, THREE.Group>();
    const animalMeshesMap = new Map<string, THREE.Group>();

    // Sub-group strictly tracking live changing widgets (trees, rocks, crops, huts, wells, dropped logs, etc.)
    const decorationsGroup = new THREE.Group();
    scene.add(decorationsGroup);
    let decorationMeshes: THREE.Object3D[] = [];
    let debrisMeshes: THREE.Mesh[] = [];
    let innerWallPanels: THREE.Mesh[] = [];
    let outerWallPanels: THREE.Mesh[] = [];

    // --- STORM WALL VISUAL GROUP ---
    const stormWallGroup = new THREE.Group();
    scene.add(stormWallGroup);

    // Dynamic lightning PointLight to create epic ambient storm flashes
    const stormLightningLight = new THREE.PointLight(0xa5f3fc, 0, 120, 1.2);
    stormLightningLight.position.set(0, 8, 0);
    stormWallGroup.add(stormLightningLight);

    // stormWallMesh is now a Group so that existing code scales and rotates it seamlessly
    const stormWallMesh = new THREE.Group();
    stormWallGroup.add(stormWallMesh);

    // Create 16 segmented panels for the inner storm wall
    const panelsCount = 16;
    const innerThetaLength = (Math.PI * 2) / panelsCount;
    for (let i = 0; i < panelsCount; i++) {
      const thetaStart = i * innerThetaLength;
      // Cylinder segment geometry: radius 14.0, height 18.0, 2 segments
      const geom = new THREE.CylinderGeometry(14.0, 14.0, 18.0, 2, 1, true, thetaStart, innerThetaLength);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x8c4f1c, // Desert sandstorm warm dusty orange-brown
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const panel = new THREE.Mesh(geom, mat);
      panel.position.y = 9.0;
      panel.userData = {
        angle: thetaStart + innerThetaLength / 2,
      };
      stormWallMesh.add(panel);
      innerWallPanels.push(panel);
    }

    // stormOuterRingMesh is also a Group
    const stormOuterRingMesh = new THREE.Group();
    stormWallGroup.add(stormOuterRingMesh);

    // Create 16 segmented panels for the outer storm wall (slightly larger and taller)
    const outerThetaLength = (Math.PI * 2) / panelsCount;
    for (let i = 0; i < panelsCount; i++) {
      const thetaStart = i * outerThetaLength;
      // Cylinder segment geometry: radius 14.4, height 22.0
      const geom = new THREE.CylinderGeometry(14.4, 14.4, 22.0, 2, 1, true, thetaStart, outerThetaLength);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x5c2f0c, // Darker surrounding storm wall
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const panel = new THREE.Mesh(geom, mat);
      panel.position.y = 11.0;
      panel.userData = {
        angle: thetaStart + outerThetaLength / 2,
      };
      stormOuterRingMesh.add(panel);
      outerWallPanels.push(panel);
    }

    // Dynamic wind streak bands inside the storm wall
    const windStreaksGroup = new THREE.Group();
    stormWallGroup.add(windStreaksGroup);
    const streakHeights = [2.0, 6.0, 10.0, 14.0];
    streakHeights.forEach((h, idx) => {
      const streakGeom = new THREE.RingGeometry(13.8 + idx * 0.15, 14.1 + idx * 0.15, 32);
      streakGeom.rotateX(Math.PI / 2);
      const streakMat = new THREE.MeshBasicMaterial({
        color: 0xd97706,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
      });
      const streak = new THREE.Mesh(streakGeom, streakMat);
      streak.position.y = h;
      windStreaksGroup.add(streak);
    });

    // Create flying sandstorm dust/debris particles
    const debrisGroup = new THREE.Group();
    stormWallGroup.add(debrisGroup);
    const debrisColors = [0x78350f, 0xd97706, 0x451a03, 0x78716c, 0xa16207, 0x854d0e];
    const debrisCount = 120; // More particles for thick dust feeling
    for (let i = 0; i < debrisCount; i++) {
      // Use tiny tetrahedron particles for high-performance organic dust grains
      const size = 0.03 + Math.random() * 0.09;
      const geom = new THREE.TetrahedronGeometry(size, 0);
      const color = debrisColors[Math.floor(Math.random() * debrisColors.length)];
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3 + Math.random() * 0.5,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.userData = {
        radiusOffset: Math.random() * 3.0 - 1.0, // orbit slightly inside or outside the wall
        speed: (1.2 + Math.random() * 2.2) * (Math.random() > 0.45 ? 1 : -1), // move with wind direction
        angle: Math.random() * Math.PI * 2,
        heightPercent: Math.random(),
        wobbleSpeed: 2.0 + Math.random() * 3.5,
        wobbleAmount: 0.12 + Math.random() * 0.4,
        wobbleOffset: Math.random() * Math.PI * 2,
        rotSpeedX: 1.0 + Math.random() * 2.5,
        rotSpeedY: 1.0 + Math.random() * 2.5,
      };
      debrisGroup.add(mesh);
      debrisMeshes.push(mesh);
    }

    // Group for future path preview dots
    const debugPathGroup = new THREE.Group();
    scene.add(debugPathGroup);

    // Group for the packing caravan cart in the diorama
    const caravanMeshGroup = new THREE.Group();
    scene.add(caravanMeshGroup);

    let lastUserInteractionTime = 0;

    // Procedural Pool assets to save memory and CPU
    const geomPool = {
      tile: new THREE.BoxGeometry(0.96, 1, 0.96),
      // Cylinders with low face counts to enforce a nice flat Low-Poly feel!
      trunk: new THREE.CylinderGeometry(0.12, 0.18, 0.8, 4),
      water: new THREE.BoxGeometry(0.96, 1, 0.96),
      shrubBerry: new THREE.SphereGeometry(0.04, 4, 4),
    };

    // Dispose geometry pool on clean-up
    const disposePoolGeometry = () => {
      Object.values(geomPool).forEach(g => g.dispose());
    };

    // Cache of reusable materials to make rendering lightning-fast
    const materialCache: { [key: string]: THREE.Material } = {
      beach: new THREE.MeshStandardMaterial({
        color: new THREE.Color(BIOME_COLORS.beach),
        roughness: 0.9,
        metalness: 0.05,
        flatShading: true,
      }),
      desert: new THREE.MeshStandardMaterial({
        color: new THREE.Color(BIOME_COLORS.desert),
        roughness: 0.92,
        metalness: 0.08,
        flatShading: true,
      }),
      grassland: new THREE.MeshStandardMaterial({
        color: new THREE.Color(BIOME_COLORS.grassland),
        roughness: 0.85,
        metalness: 0.1,
        flatShading: true,
      }),
      forest: new THREE.MeshStandardMaterial({
        color: new THREE.Color(BIOME_COLORS.forest),
        roughness: 0.8,
        metalness: 0.1,
        flatShading: true,
      }),
      rocky: new THREE.MeshStandardMaterial({
        color: new THREE.Color(BIOME_COLORS.rocky),
        roughness: 0.9,
        metalness: 0.2,
        flatShading: true,
      }),
      waterFloor: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#194e70'), // dark sandy silt
        roughness: 0.95,
        flatShading: true,
      }),
      woodTrunk: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#4d3319'), // rough wood brown
        roughness: 0.9,
        flatShading: true,
      }),
      shrubGreen: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#78ab46'),
        roughness: 0.8,
        flatShading: true,
      }),
      berryRed: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#cf2b2b'),
        roughness: 0.5,
        flatShading: true,
      }),
    };

    const translucentWaterMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#358dc2'),
      transparent: true,
      opacity: 0.65,
      roughness: 0.2,
      metalness: 0.4,
      flatShading: true,
    });

    const boundaryCliffsMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3c3d42'), // dark granite base
      roughness: 0.95,
      flatShading: true,
    });

    // Clean up cache helper
    const disposeCacheMaterials = () => {
      Object.values(materialCache).forEach(mat => mat.dispose());
      translucentWaterMat.dispose();
      boundaryCliffsMat.dispose();
    };

    // To add low-poly flare to foliage, we stack cones with very few sides (5 radial sections)
    const getPineFoliageGeom = (heightScale: number, tierIndex: number) => {
      const actualHeight = heightScale || 1.25;
      const radius = 0.55 * (1.0 - tierIndex * 0.25);
      const coneHeight = 0.7 * actualHeight;
      const geom = new THREE.ConeGeometry(radius, coneHeight, 5); // 5 sides = very faceted low-poly!
      return geom;
    };

    // Water animate components tracking
    const animatingWaterNodes: { mesh: THREE.Mesh; baseX: number; baseZ: number; baseY: number; bounceOffset: number }[] = [];

    // --- SIGNATURE GENERATOR TO PREVENT COSTLY REBUILD CHURN ---
    const getGridDecorationsSignature = (currentMap: MapData) => {
      let signature = '';
      if (!currentMap) return signature;
      
      const loadedCells = currentMap.chunksByKey 
        ? Object.values(currentMap.chunksByKey).filter((chunk: any) => chunk.loaded).flatMap((chunk: any) => chunk.cells.flat())
        : (currentMap.grid ? currentMap.grid.flat().filter(cell => cell && cell.loaded !== false) : []);

      for (const cell of loadedCells) {
        if (!cell) continue;
        if (
          cell.hasTree ||
          cell.hasRock ||
          cell.hasShrub ||
          cell.structure ||
          cell.construction ||
          cell.farmCrop ||
          cell.resourceNode ||
          cell.itemsOnGround ||
          cell.scouted
        ) {
          const treePart = cell.hasTree ? 'T' + (cell.treeHeight != null ? cell.treeHeight.toFixed(1) : '1.5') : '';
          const rockPart = cell.hasRock ? 'R' + (cell.rockSize != null ? cell.rockSize.toFixed(1) : '1.0') : '';
          const shrubPart = cell.hasShrub ? 'S' : '';
          const structPart = cell.structure ? 'ST' + cell.structure.type : '';
          const constPart = cell.construction ? 'C' + cell.construction.type + (cell.construction.progress != null ? (Math.floor(cell.construction.progress / 20) * 20).toFixed(0) : '0') : '';
          const cropPart = cell.farmCrop ? 'FC' + cell.farmCrop.type + (cell.farmCrop.stage ?? 0) : '';
          const resPart = cell.resourceNode ? 'RN' + cell.resourceNode.type : '';
          const itemPart = cell.itemsOnGround ? 'I' + cell.itemsOnGround.type + (cell.itemsOnGround.amount != null ? (Math.floor(cell.itemsOnGround.amount / 5) * 5).toFixed(0) : '0') : '';
          const scoutPart = cell.scouted ? 's' : '';
          
          signature += `${cell.x},${cell.z}:${treePart}${rockPart}${shrubPart}${structPart}${constPart}${cropPart}${resPart}${itemPart}${scoutPart};`;
        }
      }
      return signature;
    };

    // --- REBUILD DYNAMIC DECORATIONS CORE ---
    const rebuildDecorations = (currentMap: MapData, time: number) => {
      // 1. Remove old decorationsGroup children from cellMeshes for clickable select
      decorationMeshes.forEach(mesh => {
        const idx = cellMeshes.indexOf(mesh);
        if (idx > -1) cellMeshes.splice(idx, 1);
      });
      decorationMeshes = [];

      // 2. Clear decorations group
      while (decorationsGroup.children.length > 0) {
        decorationsGroup.remove(decorationsGroup.children[0]);
      }

      const greenGrassInstances: { position: THREE.Vector3; scale: THREE.Vector3; rotation: THREE.Euler }[] = [];
      const yellowGrassInstances: { position: THREE.Vector3; scale: THREE.Vector3; rotation: THREE.Euler }[] = [];

      // 3. Loop and recreate assets matching live state
      const loadedCells = currentMap.chunksByKey 
        ? Object.values(currentMap.chunksByKey).filter((chunk: any) => chunk.loaded).flatMap((chunk: any) => chunk.cells.flat())
        : (currentMap.grid ? currentMap.grid.flat().filter(cell => cell && cell.loaded !== false) : []);

      for (const cell of loadedCells) {
        if (!cell) continue;
        const x = cell.x;
        const z = cell.z;
        const y = cell.height;
        const startIndex = decorationsGroup.children.length;

          // Procedural Landmark Rendering
          if (cell.landmark) {
            const lmType = cell.landmark.type;
            const lmGroup = new THREE.Group();
            lmGroup.position.set(x, y, z);

            if (lmType === 'giant_petrified_tree') {
              // Giant trunk (fossilized silicate jade/crystal tree)
              const trunkMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#386b5c'), // Jade crystal green
                roughness: 0.15,
                metalness: 0.8,
                flatShading: true
              });
              const crystalMat = new THREE.MeshBasicMaterial({ color: 0x01ffe4 });

              // Base trunk
              const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.8, 6), trunkMat);
              baseCyl.position.y = 0.9;
              baseCyl.castShadow = true;
              baseCyl.receiveShadow = true;
              lmGroup.add(baseCyl);

              // Tapering mid
              const midCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 2.2, 5), trunkMat);
              midCyl.position.y = 2.4;
              midCyl.castShadow = true;
              lmGroup.add(midCyl);

              // Angular crystal structures growing around roots
              for (let i = 0; i < 4; i++) {
                const cry = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 4), crystalMat);
                const angle = (i * Math.PI) / 2;
                cry.position.set(Math.cos(angle) * 0.7, 0.2, Math.sin(angle) * 0.7);
                cry.rotation.set(0.5, angle, 0.2);
                cry.castShadow = true;
                lmGroup.add(cry);
              }

              // Giant arch-like branch
              const archGeo = new THREE.BoxGeometry(1.5, 0.25, 0.25);
              const branchL = new THREE.Mesh(archGeo, trunkMat);
              branchL.position.set(-0.6, 2.9, 0);
              branchL.rotation.z = 0.45;
              branchL.castShadow = true;
              lmGroup.add(branchL);

              const branchR = new THREE.Mesh(archGeo, trunkMat);
              branchR.position.set(0.6, 2.9, 0);
              branchR.rotation.z = -0.45;
              branchR.castShadow = true;
              lmGroup.add(branchR);

              baseCyl.userData = { cell };
              midCyl.userData = { cell };
              decorationMeshes.push(baseCyl, midCyl);
              cellMeshes.push(baseCyl);
            } 
            else if (lmType === 'ancient_tower') {
              // Precursor obsidian spire tower
              const towerMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#1c1d22'), // obsidian
                roughness: 0.2,
                metalness: 0.9,
                flatShading: true
              });
              const neonMat = new THREE.MeshBasicMaterial({ color: 0x00afff });

              // Stacking tapering octagonal sections
              const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.52, 1.0, 4), towerMat);
              b1.position.y = 0.5;
              b1.rotation.y = Math.PI / 4;
              b1.castShadow = true;
              b1.receiveShadow = true;
              lmGroup.add(b1);

              const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.40, 1.0, 4), towerMat);
              b2.position.y = 1.5;
              b2.rotation.y = Math.PI / 4;
              b2.castShadow = true;
              lmGroup.add(b2);

              const b3 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.28, 1.2, 4), towerMat);
              b3.position.y = 2.6;
              b3.rotation.y = Math.PI / 4;
              b3.castShadow = true;
              lmGroup.add(b3);

              // Floating ring
              const ringGroup = new THREE.Group();
              ringGroup.position.set(0, 1.8, 0);
              for (let i = 0; i < 6; i++) {
                const seg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.35), towerMat);
                const angle = (i * Math.PI) / 3;
                seg.position.set(Math.cos(angle) * 0.6, 0, Math.sin(angle) * 0.6);
                seg.rotation.y = -angle;
                seg.castShadow = true;
                ringGroup.add(seg);
              }
              lmGroup.add(ringGroup);

              // Top glowing orb
              const orb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), neonMat);
              orb.position.set(0, 3.4, 0);
              lmGroup.add(orb);

              b1.userData = { cell };
              b2.userData = { cell };
              b3.userData = { cell };
              decorationMeshes.push(b1, b2, b3);
              cellMeshes.push(b1);
            } 
            else if (lmType === 'massive_skeleton') {
              // Prehistoric ribcage structure (bone tunnel)
              const boneMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#ece9dc'), // bleached bone
                roughness: 0.95,
                flatShading: true
              });

              // Sequence of rib arches
              for (let i = 0; i < 4; i++) {
                const zOffset = (i - 1.5) * 0.55;
                const vertebra = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.25), boneMat);
                vertebra.position.set(0, 1.45, zOffset);
                vertebra.castShadow = true;
                lmGroup.add(vertebra);

                // Rib left
                const rL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.12), boneMat);
                rL.position.set(-0.55, 0.75, zOffset);
                rL.rotation.z = -0.4;
                rL.castShadow = true;
                lmGroup.add(rL);

                // Rib right
                const rR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.12), boneMat);
                rR.position.set(0.55, 0.75, zOffset);
                rR.rotation.z = 0.4;
                rR.castShadow = true;
                lmGroup.add(rR);

                if (i === 1) {
                  vertebra.userData = { cell };
                  cellMeshes.push(vertebra);
                }
                decorationMeshes.push(vertebra, rL, rR);
              }
            } 
            else if (lmType === 'buried_machine') {
              // Chronos Dynamo Generator (rusted copper cogwheels and half-buried core)
              const rustMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#a85632'), // copper rust orange
                roughness: 0.9,
                metalness: 0.5,
                flatShading: true
              });
              const steelMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#4a4d52'), // dull ancient steel
                roughness: 0.8,
                metalness: 0.7,
                flatShading: true
              });
              const neonOrangeMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });

              // Sunken rotor dome
              const domeCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.6, 6), rustMat);
              domeCyl.position.y = 0.25;
              domeCyl.castShadow = true;
              domeCyl.receiveShadow = true;
              lmGroup.add(domeCyl);

              // Sunken cogwheel sticking out of ground
              const cog = new THREE.Group();
              cog.position.set(0.25, 0.2, -0.25);
              cog.rotation.set(0.4, 0.2, 1.1);
              const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.15, 6), steelMat);
              wheel.castShadow = true;
              cog.add(wheel);

              // Cog teeth
              for (let i = 0; i < 6; i++) {
                const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.18), steelMat);
                const angle = (i * Math.PI) / 3;
                tooth.position.set(Math.cos(angle) * 0.48, 0, Math.sin(angle) * 0.48);
                tooth.rotation.y = -angle;
                tooth.castShadow = true;
                cog.add(tooth);
              }
              lmGroup.add(cog);

              // Glowing indicator lights
              const indicator = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), neonOrangeMat);
              indicator.position.set(-0.35, 0.45, 0.1);
              lmGroup.add(indicator);

              domeCyl.userData = { cell };
              decorationMeshes.push(domeCyl, wheel, indicator);
              cellMeshes.push(domeCyl);
            } 
            else if (lmType === 'crashed_structure') {
              // Crashed Pioneer capsule
              const capsuleMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#cfd4da'), // carbonized silver casing
                roughness: 0.45,
                metalness: 0.75,
                flatShading: true
              });
              const darkBurnMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#212224'), // absolute black carbon
                roughness: 0.9,
                flatShading: true
              });
              const boosterMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });

              const capsuleGroup = new THREE.Group();
              // Angle it representing hit-ground velocity vector
              capsuleGroup.rotation.set(0.6, 0.2, -0.4);
              capsuleGroup.position.set(0, 0.2, 0);

              // Main body cylinder
              const capsuleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.48, 1.35, 5), capsuleMat);
              capsuleBody.castShadow = true;
              capsuleGroup.add(capsuleBody);

              // Nose cone
              const nose = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 5), darkBurnMat);
              nose.position.y = 0.925;
              nose.castShadow = true;
              capsuleGroup.add(nose);

              // Glowing thruster cone
              const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.3, 4), darkBurnMat);
              thruster.position.y = -0.8;
              thruster.castShadow = true;
              capsuleGroup.add(thruster);

              const flame = new THREE.Mesh(new THREE.SphereGeometry(0.14, 4, 3), boosterMat);
              flame.position.y = -0.92;
              capsuleGroup.add(flame);

              lmGroup.add(capsuleGroup);

              capsuleBody.userData = { cell };
              decorationMeshes.push(capsuleBody, nose, thruster);
              cellMeshes.push(capsuleBody);
            } 
            else if (lmType === 'strange_stone_circle') {
              // Stone monolith arrangement
              const slateMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#43464d'), // ancient dark grey slate
                roughness: 0.95,
                flatShading: true
              });
              const lineMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

              // Circle of stones
              const stoneCount = 8;
              const radius = 0.85;
              for (let i = 0; i < stoneCount; i++) {
                const angle = (i * Math.PI * 2) / stoneCount;
                const stoneHeight = 0.55 + Math.sin(i * 1.5) * 0.15;
                const stone = new THREE.Mesh(new THREE.BoxGeometry(0.16, stoneHeight, 0.24), slateMat);
                stone.position.set(Math.cos(angle) * radius, stoneHeight / 2, Math.sin(angle) * radius);
                // Turn slightly to face center
                stone.rotation.y = -angle + Math.PI / 2 + (Math.sin(i) * 0.2);
                stone.castShadow = true;
                lmGroup.add(stone);

                if (i === 0) {
                  stone.userData = { cell };
                  cellMeshes.push(stone);
                }
                decorationMeshes.push(stone);
              }

              // Central flat glowing seal glyph
              const seal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), lineMat);
              seal.position.y = 0.01;
              seal.rotation.x = Math.PI / 2;
              seal.scale.set(1.1, 1.1, 0.05);
              lmGroup.add(seal);
              decorationMeshes.push(seal);
            }

            decorationsGroup.add(lmGroup);
          }

          else if (cell.expeditionSite) {
            const siteGroup = new THREE.Group();
            siteGroup.position.set(x, y, z);

            const wallMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#334155'),
              roughness: 0.8,
              flatShading: true
            });
            const doorMat = new THREE.MeshBasicMaterial({ color: 0x0c0a09 });
            const lightMat = new THREE.MeshBasicMaterial({ color: cell.expeditionSite.exhausted ? 0x64748b : 0x10b981 });

            const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), wallMat);
            p1.position.set(-0.35, 0.4, 0);
            p1.castShadow = true;
            p1.receiveShadow = true;
            siteGroup.add(p1);

            const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), wallMat);
            p2.position.set(0.35, 0.4, 0);
            p2.castShadow = true;
            p2.receiveShadow = true;
            siteGroup.add(p2);

            const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 0.3), wallMat);
            lintel.position.set(0, 0.9, 0);
            lintel.castShadow = true;
            siteGroup.add(lintel);

            const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.1), doorMat);
            door.position.set(0, 0.4, -0.05);
            siteGroup.add(door);

            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), lightMat);
            bulb.position.set(0, 1.05, 0);
            siteGroup.add(bulb);

            p1.userData = { cell };
            p2.userData = { cell };
            lintel.userData = { cell };
            door.userData = { cell };

            decorationMeshes.push(p1, p2, lintel, door);
            cellMeshes.push(p1);

            decorationsGroup.add(siteGroup);
          }

          // Tree flora
          else if (cell.hasTree) {
            if (cell.biome === 'desert') {
              const cactusGroup = new THREE.Group();
              cactusGroup.position.set(x, y, z);

              const thornMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#8c6239'), // Sand-brown wood bark
                roughness: 0.9,
                flatShading: true
              });
              const hookMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#ae4e2c'), // Vibrant terracotta orange thorn hooks
                roughness: 0.7,
                flatShading: true
              });

              // Main stem
              const mainStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 5), thornMat);
              mainStem.position.y = 0.45;
              mainStem.castShadow = true;
              cactusGroup.add(mainStem);

              // Left branch (high angle)
              const leftBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.4, 4), thornMat);
              leftBranch.position.set(-0.16, 0.55, 0.05);
              leftBranch.rotation.z = Math.PI / 4;
              leftBranch.rotation.y = Math.PI / 6;
              leftBranch.castShadow = true;
              cactusGroup.add(leftBranch);

              // Right branch (lower angle)
              const rightBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.4, 4), thornMat);
              rightBranch.position.set(0.16, 0.38, -0.05);
              rightBranch.rotation.z = -Math.PI / 4;
              rightBranch.rotation.y = -Math.PI / 6;
              rightBranch.castShadow = true;
              cactusGroup.add(rightBranch);

              // Back branch (middle height)
              const backBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.35, 4), thornMat);
              backBranch.position.set(0.02, 0.48, -0.16);
              backBranch.rotation.x = -Math.PI / 4;
              backBranch.castShadow = true;
              cactusGroup.add(backBranch);

              // Add sharp hooked spines onto branches pointing downwards
              const addHook = (parent: THREE.Object3D, px: number, py: number, pz: number, rotZ: number, rotY: number) => {
                const hook = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.065, 4), hookMat);
                hook.position.set(px, py, pz);
                hook.rotation.set(Math.PI, rotY, rotZ); // upside down cone
                hook.castShadow = true;
                parent.add(hook);
              };

              addHook(leftBranch, 0, 0.1, 0, 0.3, 0);
              addHook(leftBranch, 0.02, -0.05, 0, 0.2, 0.5);
              addHook(rightBranch, 0, 0.1, 0, -0.3, 0);
              addHook(rightBranch, -0.02, -0.05, 0, -0.2, -0.5);
              addHook(backBranch, 0, 0.08, 0, 0, 0.4);

              cactusGroup.scale.set(0.9, cell.treeHeight * 1.0, 0.9);
              cactusGroup.rotation.y = cell.treeRotation;

              mainStem.userData = { cell, swayType: 'dunethorn' };
              leftBranch.userData = { cell, swayType: 'dunethorn' };
              rightBranch.userData = { cell, swayType: 'dunethorn' };
              backBranch.userData = { cell, swayType: 'dunethorn' };

              decorationMeshes.push(mainStem, leftBranch, rightBranch, backBranch);
              cellMeshes.push(mainStem, leftBranch, rightBranch, backBranch);
              decorationsGroup.add(cactusGroup);
            } else {
              const treeGroup = new THREE.Group();
              treeGroup.position.set(x, y, z);

              const trunkMesh = new THREE.Mesh(geomPool.trunk, materialCache.woodTrunk);
              trunkMesh.position.y = 0.4;
              trunkMesh.castShadow = true;
              treeGroup.add(trunkMesh);

              const foliageColorStr = cell.treeHeight > 1.8 ? '#1b401e' : '#27522a';
              const foliageMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(foliageColorStr),
                roughness: 0.85,
                flatShading: true,
              });

              // Deterministic tree foliage color jitter based on coordinates x, z
              const treeJitterH = (Math.sin(x * 15.3 + z * 47.1) * 0.02);
              const treeJitterS = (Math.cos(x * 25.4 + z * 21.2) * 0.05);
              const treeJitterL = (Math.sin(x * 55.6 + z * 68.9) * 0.08);
              foliageMat.color.offsetHSL(treeJitterH, treeJitterS, treeJitterL);

              const botConeMesh = new THREE.Mesh(getPineFoliageGeom(cell.treeHeight, 0), foliageMat);
              botConeMesh.position.y = 0.8;
              botConeMesh.castShadow = true;
              treeGroup.add(botConeMesh);

              const topConeMesh = new THREE.Mesh(getPineFoliageGeom(cell.treeHeight, 1), foliageMat);
              topConeMesh.position.y = 1.35 * cell.treeHeight * 0.8;
              topConeMesh.castShadow = true;
              treeGroup.add(topConeMesh);

              const jitter = 0.14;
              treeGroup.position.x += Math.cos(cell.treeRotation) * jitter;
              treeGroup.position.z += Math.sin(cell.treeRotation) * jitter;
              treeGroup.rotation.y = cell.treeRotation;
              treeGroup.scale.set(0.9, cell.treeHeight * 0.8, 0.9);

              trunkMesh.userData = { cell };
              botConeMesh.userData = { cell };
              topConeMesh.userData = { cell };

              decorationMeshes.push(trunkMesh, botConeMesh, topConeMesh);
              cellMeshes.push(trunkMesh, botConeMesh, topConeMesh);

              decorationsGroup.add(treeGroup);
            }
          }

          // Boulder minerals
          else if (cell.hasRock) {
            if (cell.biome === 'desert') {
              const isGiantBone = cell.resourceNode?.type === 'Bone';
              const isAncientObelisk = cell.resourceNode?.type === 'Relics';

              if (isGiantBone) {
                const boneGroup = new THREE.Group();
                boneGroup.position.set(x, y, z);

                const boneMat = new THREE.MeshStandardMaterial({
                  color: new THREE.Color('#eae8df'), // bleached skeletal bone
                  roughness: 0.95,
                  flatShading: true
                });

                // Spine hub block
                const spineHub = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.16), boneMat);
                spineHub.position.y = 0.5;
                spineHub.castShadow = true;
                boneGroup.add(spineHub);

                // Two curved protective ribs for skeletal feeling
                const ribL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.06), boneMat);
                ribL.position.set(-0.25, 0.25, 0);
                ribL.rotation.z = -Math.PI / 6;
                ribL.castShadow = true;
                boneGroup.add(ribL);

                const ribR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.06), boneMat);
                ribR.position.set(0.25, 0.25, 0);
                ribR.rotation.z = Math.PI / 6;
                ribR.castShadow = true;
                boneGroup.add(ribR);

                boneGroup.rotation.y = cell.rockRotation[1];
                boneGroup.scale.set(cell.rockSize * 0.85, cell.rockSize * 0.85, cell.rockSize * 0.85);

                spineHub.userData = { cell };
                ribL.userData = { cell };
                ribR.userData = { cell };

                decorationMeshes.push(spineHub, ribL, ribR);
                cellMeshes.push(spineHub);
                decorationsGroup.add(boneGroup);
              } 
              else if (isAncientObelisk) {
                const ruinGroup = new THREE.Group();
                ruinGroup.position.set(x, y, z);

                const monoMat = new THREE.MeshStandardMaterial({
                  color: new THREE.Color('#32302a'), // ancient precursor metal/alloy
                  roughness: 0.8,
                  metalness: 0.61,
                  flatShading: true
                });

                // Obelisk pyramid pillar
                const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.11, 0.85, 4), monoMat);
                tower.position.y = 0.425;
                tower.castShadow = true;
                ruinGroup.add(tower);

                // Neon glowing core particle
                const coreMat = new THREE.MeshBasicMaterial({ color: 0x01ffe4 });
                const orb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 3), coreMat);
                orb.position.set(0, 0.9, 0);
                ruinGroup.add(orb);

                ruinGroup.rotation.y = cell.rockRotation[1];
                ruinGroup.scale.set(cell.rockSize, cell.rockSize, cell.rockSize);

                tower.userData = { cell };
                decorationMeshes.push(tower);
                cellMeshes.push(tower);
                decorationsGroup.add(ruinGroup);
              }
              else {
                // Rusted scrap plate (if AncientMaterials), otherwise sandstone rubble!
                const isAncientMat = cell.resourceNode?.type === 'AncientMaterials';
                const matColor = isAncientMat ? '#94421b' : '#cbae82'; // rusted iron red-orange vs. warm sandstone

                const scrapGeom = isAncientMat
                  ? new THREE.BoxGeometry(cell.rockSize * 0.35, cell.rockSize * 0.25, cell.rockSize * 0.35)
                  : new THREE.DodecahedronGeometry(cell.rockSize * 0.25, 0); // jagged rock shard for sandstones

                const scrapMat = new THREE.MeshStandardMaterial({
                  color: new THREE.Color(matColor),
                  roughness: isAncientMat ? 0.9 : 0.95,
                  metalness: isAncientMat ? 0.72 : 0.1,
                  flatShading: true
                });

                const rockJitterH = (Math.sin(x * 17.3 + z * 39.1) * 0.03);
                const rockJitterS = (Math.cos(x * 21.4 + z * 27.2) * 0.04);
                const rockJitterL = (Math.sin(x * 43.6 + z * 51.9) * 0.05);
                scrapMat.color.offsetHSL(rockJitterH, rockJitterS, rockJitterL);

                const scrapMesh = new THREE.Mesh(scrapGeom, scrapMat);
                scrapMesh.position.set(x, y + cell.rockSize * (isAncientMat ? 0.125 : 0.2), z);
                scrapMesh.rotation.set(cell.rockRotation[0] ?? 0, cell.rockRotation[1] ?? 0, cell.rockRotation[2] ?? 0);
                scrapMesh.castShadow = true;

                scrapMesh.userData = { cell };
                decorationMeshes.push(scrapMesh);
                cellMeshes.push(scrapMesh);
                decorationsGroup.add(scrapMesh);
              }
            } else {
              const segments = cell.rockSize > 1.2 ? 1 : 0;
              const rockGeom = new THREE.IcosahedronGeometry(cell.rockSize * 0.4, segments);
              const greyColors = ['#696a6e', '#7b7d82', '#58595c'];
              const chosenColor = greyColors[Math.floor(cell.rockRotation[0] * 3) % 3];
              
              const rockMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(chosenColor),
                roughness: 0.9,
                metalness: 0.25,
                flatShading: true,
              });

              const rockJitterH = (Math.sin(x * 19.3 + z * 33.1) * 0.02);
              const rockJitterS = (Math.cos(x * 29.4 + z * 29.2) * 0.03);
              const rockJitterL = (Math.sin(x * 49.6 + z * 59.9) * 0.06);
              rockMat.color.offsetHSL(rockJitterH, rockJitterS, rockJitterL);
              const rockMesh = new THREE.Mesh(rockGeom, rockMat);
              rockMesh.position.set(x, y + cell.rockSize * 0.15, z);
              rockMesh.position.x += Math.sin(cell.rockRotation[1] * 3) * 0.12;
              rockMesh.position.z += Math.cos(cell.rockRotation[2] * 3) * 0.12;
              rockMesh.rotation.set(cell.rockRotation[0] ?? 0, cell.rockRotation[1] ?? 0, cell.rockRotation[2] ?? 0);
              rockMesh.scale.set(1.1, 0.85, 1.1);
              rockMesh.castShadow = true;
              rockMesh.receiveShadow = true;

              rockMesh.userData = { cell };
              decorationMeshes.push(rockMesh);
              cellMeshes.push(rockMesh);

              decorationsGroup.add(rockMesh);
            }
          }

          // Shrubs & Alien Flora
          else if (cell.hasShrub) {
            const isFiber = cell.resourceNode?.type === 'Fiber';
            if (isFiber) {
              const fiberGroup = new THREE.Group();
              fiberGroup.position.set(x, y, z);

              const node = cell.resourceNode!;
              const amount = node.amount || 0;
              const maxAmount = node.maxAmount || 10;
              const sizeScale = Math.max(0.1, amount / maxAmount);

              // Biome-specific Grass: Whipgrass (green, tall, flexible) vs Rootweave (sandy-ocher, spiky)
              const isDesert = cell.biome === 'desert';
              const grassColor = isDesert ? new THREE.Color('#cca062') : new THREE.Color('#387042'); // ocher vs deep green
              const grassMat = new THREE.MeshStandardMaterial({
                color: grassColor,
                roughness: 0.85,
                flatShading: true,
              });

              const numBlades = 12;
              const bladeGeom = new THREE.ConeGeometry(0.016, 0.45, 3); // faceted 3-sided blades

              for (let b = 0; b < numBlades; b++) {
                const blade = new THREE.Mesh(bladeGeom, grassMat);
                const bladeSeed = (cell.moisture * (b + 1) * 31.4159) % 1.0;
                const ox = (bladeSeed * 0.44) - 0.22;
                const oz = (((bladeSeed * 7.13) % 1.0) * 0.44) - 0.22;
                const bHeight = (0.24 + bladeSeed * 0.26) * sizeScale;

                blade.scale.set(1.0 + sizeScale * 0.2, bHeight / 0.45, 1.0 + sizeScale * 0.2);
                blade.position.set(ox, bHeight / 2, oz);
                blade.rotation.x = (bladeSeed * 0.35) - 0.175;
                blade.rotation.z = (((bladeSeed * 4.31) % 1.0) * 0.35) - 0.175;
                blade.rotation.y = bladeSeed * Math.PI * 2;
                blade.castShadow = true;

                // Wind sway registration
                blade.userData = { cell, swayType: isDesert ? 'rootweave' : 'whipgrass' };
                fiberGroup.add(blade);
                decorationMeshes.push(blade);
              }

              decorationsGroup.add(fiberGroup);
            } else if (cell.biome === 'desert') {
              // --- ARMORED SUCCULENT (Desert concentric thick leaves rosette + terracotta tips) ---
              const agaveGroup = new THREE.Group();
              agaveGroup.position.set(x, y, z);

              const succulentMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#4e7e5a'), // aloe green
                roughness: 0.8,
                flatShading: true
              });
              const tipMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#ae4e2c'), // orange-red terracotta tips
                roughness: 0.7,
                flatShading: true
              });

              // Base Outer Concentric Rosette (6 blades)
              for (let i = 0; i < 6; i++) {
                const leafGroup = new THREE.Group();
                leafGroup.rotation.y = (i * Math.PI) / 3;

                const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.28, 3), succulentMat);
                leaf.position.set(0, 0.08, 0.08);
                leaf.rotation.x = Math.PI / 4.5;
                leaf.castShadow = true;
                leafGroup.add(leaf);

                // Terracotta colored pointed tip
                const tip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 3), tipMat);
                tip.position.set(0, 0.14, 0.03);
                tip.rotation.x = -Math.PI / 8;
                leaf.add(tip);

                agaveGroup.add(leafGroup);
              }

              // Middle Rosette Layer (4 slightly smaller, steeper blades)
              for (let i = 0; i < 4; i++) {
                const leafGroup = new THREE.Group();
                leafGroup.rotation.y = (i * Math.PI) / 2 + Math.PI / 4;

                const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.22, 3), succulentMat);
                leaf.position.set(0, 0.08, 0.05);
                leaf.rotation.x = Math.PI / 3.5;
                leaf.castShadow = true;
                leafGroup.add(leaf);

                const tip = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.05, 3), tipMat);
                tip.position.set(0, 0.11, 0.02);
                tip.rotation.x = -Math.PI / 8;
                leaf.add(tip);

                agaveGroup.add(leafGroup);
              }

              // Bright central seed bud core
              const coreMat = new THREE.MeshStandardMaterial({ color: 0xff6200, roughness: 0.8, metalness: 0.1 }); // standard moisture core
              const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06, 0), coreMat);
              core.position.set(0, 0.12, 0);
              agaveGroup.add(core);

              core.userData = { cell, swayType: 'succulent' };
              decorationMeshes.push(core);
              cellMeshes.push(core);

              decorationsGroup.add(agaveGroup);
            } else if (cell.biome === 'forest') {
              // --- SPORE BLOOM (Forest magic mushroom clusters, cyan stalks + red caps) ---
              const sporeGroup = new THREE.Group();
              sporeGroup.position.set(x, y, z);

              const stalkMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.8, metalness: 0.1 }); // standard cyan stalk
              const capMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.7, flatShading: true }); // red cap

              // Main Spore Bloom Mushroom
              const stalk1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.3, 5), stalkMat);
              stalk1.position.y = 0.15;
              stalk1.rotation.z = -0.1;
              stalk1.castShadow = true;
              sporeGroup.add(stalk1);

              const cap1 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.1, 5), capMat);
              cap1.position.y = 0.15;
              stalk1.add(cap1);

              // Smaller side baby mushroom
              const stalk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.18, 5), stalkMat);
              stalk2.position.set(0.12, 0.09, -0.06);
              stalk2.rotation.z = 0.25;
              stalk2.rotation.x = 0.1;
              stalk2.castShadow = true;
              sporeGroup.add(stalk2);

              const cap2 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.06, 5), capMat);
              cap2.position.y = 0.09;
              stalk2.add(cap2);

              stalk1.userData = { cell, swayType: 'sporebloom' };
              stalk2.userData = { cell, swayType: 'sporebloom' };
              decorationMeshes.push(stalk1, stalk2);
              cellMeshes.push(stalk1);

              decorationsGroup.add(sporeGroup);
            } else {
              // --- LUSH BERRY BUSH (Leafy green clusters with bright red berries) ---
              const fruitGroup = new THREE.Group();
              fruitGroup.position.set(x, y, z);

              const leavesMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#2e6f40'), // vibrant bush green
                roughness: 0.8,
                flatShading: true
              });
              
              const berryMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#ff1744'), // high-contrast vibrant red dots!
                roughness: 0.6,
                metalness: 0.1,
              });

              // Create overlapping foliage spheres to make a larger, nice bushy shape
              const bushParts = [
                { r: 0.38, x: 0, y: 0.28, z: 0 },
                { r: 0.30, x: -0.22, y: 0.22, z: 0.12 },
                { r: 0.30, x: 0.22, y: 0.24, z: -0.12 },
                { r: 0.24, x: 0.04, y: 0.36, z: 0.18 },
              ];

              bushParts.forEach((part, index) => {
                const leafMesh = new THREE.Mesh(new THREE.TetrahedronGeometry(part.r, 0), leavesMat);
                leafMesh.position.set(part.x, part.y, part.z);
                leafMesh.castShadow = true;
                leafMesh.receiveShadow = true;
                fruitGroup.add(leafMesh);

                // Register the primary bush mesh for interactions
                if (index === 0) {
                  leafMesh.userData = { cell, swayType: 'berrybush' };
                  decorationMeshes.push(leafMesh);
                  cellMeshes.push(leafMesh);
                }
              });

              // Add prominent red berries scattered on the bush (represented by beautiful red dots)
              const berryOffsets = [
                { x: 0.18, y: 0.45, z: 0.10 },
                { x: -0.30, y: 0.30, z: 0.18 },
                { x: 0.30, y: 0.28, z: -0.10 },
                { x: -0.08, y: 0.36, z: -0.30 },
                { x: 0.12, y: 0.30, z: 0.30 },
                { x: -0.18, y: 0.40, z: -0.15 },
              ];

              berryOffsets.forEach((bOffset) => {
                const berryMesh = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.065), berryMat);
                berryMesh.position.set(bOffset.x, bOffset.y, bOffset.z);
                berryMesh.castShadow = true;
                fruitGroup.add(berryMesh);
              });

              decorationsGroup.add(fruitGroup);
            }
          }

          // Items on ground piles
          if (cell.itemsOnGround) {
            const itemsGroup = new THREE.Group();
            itemsGroup.position.set(x, y, z);
            
            const itemType = cell.itemsOnGround.type;
            const amount = cell.itemsOnGround.amount;
            const count = Math.min(3, Math.max(1, Math.floor(amount / 5) + 1));

            for (let i = 0; i < count; i++) {
              let itemMesh;
              if (itemType === 'wood') {
                itemMesh = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.04, 0.04, 0.3, 4),
                  materialCache.woodTrunk || new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 })
                );
                itemMesh.rotation.z = Math.PI / 2;
                itemMesh.rotation.y = i * 1.1;
                itemMesh.position.set(
                  (i - 1) * 0.08 + Math.sin(i) * 0.02,
                  0.04,
                  (i - 1) * 0.08 + Math.cos(i) * 0.02
                );
              } else if (itemType === 'stone') {
                itemMesh = new THREE.Mesh(
                  new THREE.DodecahedronGeometry(0.07, 0),
                  new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9, flatShading: true })
                );
                itemMesh.position.set(
                  (i - 1) * 0.1,
                  0.05,
                  (i - 1) * 0.06
                );
              } else {
                itemMesh = new THREE.Mesh(
                  new THREE.SphereGeometry(0.06, 4, 3),
                  materialCache.berryRed || new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.8 })
                );
                itemMesh.position.set(
                  (i - 1) * 0.08,
                  0.05,
                  (i - 1) * 0.08
                );
              }
              itemMesh.castShadow = true;
              itemsGroup.add(itemMesh);
            }

            decorationsGroup.add(itemsGroup);
          }

          // Underway construction blueprints scaffoldings
          if (cell.construction && !(cell as any).isMultiTileChildOf) {
            const buildType = cell.construction.type;
            const progress = cell.construction.progress;

            const scaffoldGroup = new THREE.Group();
            if (buildType === 'Shelter') {
              scaffoldGroup.position.set(x + 0.5, y, z + 0.5);
            } else {
              scaffoldGroup.position.set(x, y, z);
            }

            const sizeMap: Record<string, number> = { Shelter: 1.35, WaterWell: 0.5, LogWall: 0.4, StorageBin: 0.4, Fireplace: 0.5, GatherersPantry: 0.53, HuntersHut: 0.5, BuildersLodge: 0.55, FarmersGranary: 0.48, ScoutsLookout: 0.45, HealersSanctum: 0.5, ArtisansWorkshop: 0.55 };
            const boxSize = sizeMap[buildType] || 0.5;

            const boxGeom = new THREE.BoxGeometry(boxSize + 0.05, boxSize * 0.6, boxSize + 0.05);
            const scaffoldMat = new THREE.MeshStandardMaterial({
              color: 0xffd700,
              roughness: 0.5,
              transparent: true,
              opacity: 0.35 + Math.sin(time * 6) * 0.1,
              wireframe: true
            });
            const scaffoldMesh = new THREE.Mesh(boxGeom, scaffoldMat);
            scaffoldMesh.position.y = (boxSize * 0.6) / 2;
            scaffoldGroup.add(scaffoldMesh);

            const coreGeom = new THREE.BoxGeometry(boxSize * 0.9, (boxSize * 0.5) * (progress / 100), boxSize * 0.9);
            const coreMesh = new THREE.Mesh(
              coreGeom,
              new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.8, flatShading: true })
            );
            coreMesh.position.y = ((boxSize * 0.5) * (progress / 100)) / 2;
            scaffoldGroup.add(coreMesh);

            scaffoldMesh.userData = { cell };
            decorationMeshes.push(scaffoldMesh);
            cellMeshes.push(scaffoldMesh);

            decorationsGroup.add(scaffoldGroup);
          }

          // Built finished structures
          if (cell.structure && !(cell as any).isMultiTileChildOf) {
            const sType = cell.structure.type;
            const sGroup = new THREE.Group();
            if (sType === 'Shelter') {
              sGroup.position.set(x + 0.5, y, z + 0.5);
              sGroup.scale.set(0.5, 0.5, 0.5);
            } else {
              sGroup.position.set(x, y, z);
            }

            if (sType === 'Shelter') {
              // 2x2 complex double high hexagonal hut
              const hutGeom = new THREE.CylinderGeometry(0.2, 1.7, 2.3, 6);
              const hutMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9, flatShading: true });
              const hutMesh = new THREE.Mesh(hutGeom, hutMat);
              hutMesh.position.y = 2.3 / 2;
              hutMesh.castShadow = true;
              hutMesh.receiveShadow = true;
              sGroup.add(hutMesh);

              // Elegant multi-tiered roof / hexagonal dome
              const capMesh = new THREE.Mesh(
                new THREE.ConeGeometry(1.8, 1.1, 6),
                new THREE.MeshStandardMaterial({ color: 0x4a2a0c, roughness: 0.9, flatShading: true })
              );
              capMesh.position.y = 2.3 + 1.1 / 2;
              capMesh.castShadow = true;
              sGroup.add(capMesh);

              // Small aesthetic smoke chimney stack on roof top
              const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
              const chimneyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 4), chimneyMat);
              chimneyMesh.position.set(0.4, 2.9, 0.4);
              sGroup.add(chimneyMesh);

              // Sub-canopy/doorframe structural arch for visual complexity
              const doorMat = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.8 });
              const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.2), doorMat);
              doorMesh.position.set(0, 0.55, 1.5);
              sGroup.add(doorMesh);

              // Smoothly transitioning window light panels!
              const windowMat = new THREE.MeshStandardMaterial({ 
                color: 0xffe699, 
                emissive: 0xffaa00, 
                emissiveIntensity: 0.0, 
                roughness: 0.1 
              });

              const leftWin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.02), windowMat);
              leftWin.name = 'structure_window';
              leftWin.position.set(-0.85, 1.15, 0.85);
              leftWin.rotation.y = -Math.PI / 4;
              sGroup.add(leftWin);

              const rightWin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.02), windowMat);
              rightWin.name = 'structure_window';
              rightWin.position.set(0.85, 1.15, 0.85);
              rightWin.rotation.y = Math.PI / 4;
              sGroup.add(rightWin);

              const backWin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.02), windowMat);
              backWin.name = 'structure_window';
              backWin.position.set(0, 1.15, -1.2);
              sGroup.add(backWin);

              hutMesh.userData = { cell };
              decorationMeshes.push(hutMesh);
              cellMeshes.push(hutMesh);
            } 
            else if (sType === 'WaterWell') {
              const wellGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 6);
              const wellMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9, flatShading: true });
              const wellMesh = new THREE.Mesh(wellGeom, wellMat);
              wellMesh.position.y = 0.25 / 2;
              wellMesh.castShadow = true;
              wellMesh.receiveShadow = true;
              sGroup.add(wellMesh);

              const wRing = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.05, 0.5),
                new THREE.MeshBasicMaterial({ color: 0x2299ff })
              );
              wRing.position.y = 0.12;
              sGroup.add(wRing);

              wellMesh.userData = { cell };
              decorationMeshes.push(wellMesh);
              cellMeshes.push(wellMesh);
            } 
            else if (sType === 'LogWall') {
              // Check neighbors to auto-snap and align
              const leftWall = currentMap.grid[x - 1]?.[z]?.structure?.type === 'LogWall' || currentMap.grid[x - 1]?.[z]?.construction?.type === 'LogWall';
              const rightWall = currentMap.grid[x + 1]?.[z]?.structure?.type === 'LogWall' || currentMap.grid[x + 1]?.[z]?.construction?.type === 'LogWall';
              const frontWall = currentMap.grid[x]?.[z - 1]?.structure?.type === 'LogWall' || currentMap.grid[x]?.[z - 1]?.construction?.type === 'LogWall';
              const backWall = currentMap.grid[x]?.[z + 1]?.structure?.type === 'LogWall' || currentMap.grid[x]?.[z + 1]?.construction?.type === 'LogWall';

              const isHorizontal = leftWall || rightWall || (!frontWall && !backWall);
              
              // Define geometry based on alignment: snap to form a continuous seamless horizontal / vertical wall 1 block high!
              let wWidth = isHorizontal ? 1.0 : 0.35;
              let wDepth = isHorizontal ? 0.35 : 1.0;
              let wHeight = 0.95; // 1 block high continuous wall

              const wallGeom = new THREE.BoxGeometry(wWidth, wHeight, wDepth);
              const wallMesh = new THREE.Mesh(
                wallGeom,
                new THREE.MeshStandardMaterial({ color: 0x6e4e2a, roughness: 0.9, flatShading: true })
              );
              wallMesh.position.y = wHeight / 2;
              wallMesh.castShadow = true;
              wallMesh.receiveShadow = true;
              sGroup.add(wallMesh);

              // Elegant crenellated wooden palisade spikes on top
              const spikeGeom = new THREE.ConeGeometry(0.08, 0.2, 4);
              const spikeMat = new THREE.MeshStandardMaterial({ color: 0x4d361c, roughness: 0.9 });
              if (isHorizontal) {
                // Spikes along the horizontal top
                const startX = -0.5;
                const endX = 0.5;
                for (let wI = startX; wI <= endX + 0.01; wI += 0.2) {
                  const spike = new THREE.Mesh(spikeGeom, spikeMat);
                  spike.position.set(wI, wHeight + 0.1, 0);
                  sGroup.add(spike);
                }
              } else {
                // Spikes along the vertical top
                const startZ = -0.5;
                const endZ = 0.5;
                for (let wI = startZ; wI <= endZ + 0.01; wI += 0.2) {
                  const spike = new THREE.Mesh(spikeGeom, spikeMat);
                  spike.position.set(0, wHeight + 0.1, wI);
                  sGroup.add(spike);
                }
              }

              wallMesh.userData = { cell };
              decorationMeshes.push(wallMesh);
              cellMeshes.push(wallMesh);
            } 
            else if (sType === 'StorageBin') {
              const binGeom = new THREE.BoxGeometry(0.55, 0.32, 0.55);
              const binMesh = new THREE.Mesh(
                binGeom,
                new THREE.MeshStandardMaterial({ color: 0xd2a679, roughness: 0.9, flatShading: true })
              );
              binMesh.position.y = 0.32 / 2;
              binMesh.castShadow = true;
              binMesh.receiveShadow = true;
              sGroup.add(binMesh);

              const trim = new THREE.Mesh(
                new THREE.BoxGeometry(0.58, 0.05, 0.58),
                new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.2 })
              );
              trim.position.y = 0.16;
              sGroup.add(trim);

              // Stacked logs, stones, and crop piles based on actual stockpile metrics!
              const stk = currentMap?.stockpile;
              const woodCount = stk?.wood || 0;
              const stoneCount = stk?.stone || 0;
              const foodCount = (stk?.food || 0) + (stk?.berries || 0) + (stk?.meat || 0);

              // 1. Physically stack logs (Wood)
              if (woodCount > 0) {
                const logsLimit = Math.min(5, Math.ceil(woodCount / 10));
                for (let k = 0; k < logsLimit; k++) {
                  const logMesh = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.016, 0.016, 0.16, 4),
                    new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 })
                  );
                  logMesh.rotation.z = Math.PI / 2;
                  logMesh.rotation.y = Math.PI / 4 + k * 0.15;
                  const layer = Math.floor(k / 2);
                  const pairIdx = k % 2;
                  logMesh.position.set(
                    -0.12 + (pairIdx * 0.04) - (layer * 0.015),
                    0.16 + (layer * 0.03),
                    0.0 + (pairIdx * 0.02)
                  );
                  logMesh.castShadow = true;
                  sGroup.add(logMesh);
                }
              }

              // 2. Physically pile stones (Stone)
              if (stoneCount > 0) {
                const stonesLimit = Math.min(5, Math.ceil(stoneCount / 10));
                for (let k = 0; k < stonesLimit; k++) {
                  const rMesh = new THREE.Mesh(
                    new THREE.DodecahedronGeometry(0.03, 0),
                    new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9, flatShading: true })
                  );
                  const layer = Math.floor(k / 2);
                  const pileIdx = k % 2;
                  rMesh.position.set(
                    0.12 + (pileIdx * 0.03) - (layer * 0.015),
                    0.16 + (layer * 0.03),
                    0.0 + (pileIdx * 0.03) - 0.02
                  );
                  rMesh.castShadow = true;
                  sGroup.add(rMesh);
                }
              }

              // 3. Physically pile crops/berries/meats (Food)
              if (foodCount > 0) {
                const foodsLimit = Math.min(5, Math.ceil(foodCount / 10));
                for (let k = 0; k < foodsLimit; k++) {
                  const fMesh = new THREE.Mesh(
                    new THREE.SphereGeometry(0.028, 5, 4),
                    new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.8, flatShading: true })
                  );
                  const layer = Math.floor(k / 2);
                  const colIdx = k % 2;
                  fMesh.position.set(
                    0.0 + (colIdx * 0.03) - 0.015,
                    0.16 + (layer * 0.025),
                    0.12 + (colIdx * 0.015) - (layer * 0.015)
                  );
                  fMesh.castShadow = true;
                  sGroup.add(fMesh);
                }
              }

              binMesh.userData = { cell };
              decorationMeshes.push(binMesh);
              cellMeshes.push(binMesh);
            }
            else if (sType === 'Tent') {
              const canvasGeom = new THREE.ConeGeometry(1.0, 2.0, 4);
              const canvasMat = new THREE.MeshStandardMaterial({ color: 0xcfab7b, roughness: 0.95, flatShading: true });
              const canvasMesh = new THREE.Mesh(canvasGeom, canvasMat);
              canvasMesh.position.y = 1.0;
              canvasMesh.rotation.y = Math.PI / 4;
              canvasMesh.castShadow = true;
              canvasMesh.receiveShadow = true;
              sGroup.add(canvasMesh);

              // Protruding wooden apex support sticks
              const stickMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
              const stickGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4);
              
              for (let i = 0; i < 3; i++) {
                const stick = new THREE.Mesh(stickGeom, stickMat);
                stick.position.set(0, 1.9, 0);
                stick.rotation.z = 0.25 * Math.sin(i * 2.1);
                stick.rotation.x = 0.25 * Math.cos(i * 2.1);
                stick.castShadow = true;
                sGroup.add(stick);
              }

              const flapGeom = new THREE.BoxGeometry(0.06, 1.1, 0.65);
              const flapMat = new THREE.MeshStandardMaterial({ color: 0x4a321a, roughness: 0.9, flatShading: true });
              const flap = new THREE.Mesh(flapGeom, flapMat);
              flap.position.set(0.48, 0.55, 0);
              sGroup.add(flap);

              canvasMesh.userData = { cell };
              decorationMeshes.push(canvasMesh);
              cellMeshes.push(canvasMesh);
            }
            else if (sType === 'Shrine') {
              const baseGeom = new THREE.CylinderGeometry(0.38, 0.40, 0.1, 6);
              const baseMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9, flatShading: true });
              const baseMesh = new THREE.Mesh(baseGeom, baseMat);
              baseMesh.position.y = 0.05;
              baseMesh.castShadow = true;
              baseMesh.receiveShadow = true;
              sGroup.add(baseMesh);

              const crystalGeom = new THREE.ConeGeometry(0.12, 0.3, 4);
              const crystalMat = new THREE.MeshStandardMaterial({ color: 0x00ccff, roughness: 0.1, metalness: 0.9, emissive: 0x003366 });
              const crystal = new THREE.Mesh(crystalGeom, crystalMat);
              crystal.position.y = 0.1 + 0.15;
              sGroup.add(crystal);

              for (let i = 0; i < 4; i++) {
                const pil = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.04, 0.04, 0.18, 4),
                  new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9 })
                );
                const a = i * (Math.PI / 2);
                pil.position.set(Math.cos(a) * 0.28, 0.09, Math.sin(a) * 0.28);
                sGroup.add(pil);
              }

              baseMesh.userData = { cell };
              decorationMeshes.push(baseMesh);
              cellMeshes.push(baseMesh);
            }
            else if (sType === 'WatchTower') {
              const towerGeom = new THREE.CylinderGeometry(0.24, 0.28, 1.1, 6);
              const towerMat = new THREE.MeshStandardMaterial({ color: 0x5a5d64, roughness: 0.9, flatShading: true });
              const towerMesh = new THREE.Mesh(towerGeom, towerMat);
              towerMesh.position.y = 1.1 / 2;
              towerMesh.castShadow = true;
              towerMesh.receiveShadow = true;
              sGroup.add(towerMesh);

              const platformGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 6);
              const platformMat = new THREE.MeshStandardMaterial({ color: 0x3d3f43, roughness: 0.8 });
              const platform = new THREE.Mesh(platformGeom, platformMat);
              platform.position.y = 1.1 + 0.04;
              sGroup.add(platform);

              const roofGeom = new THREE.ConeGeometry(0.34, 0.35, 6);
              const roofMat = new THREE.MeshStandardMaterial({ color: 0xb22222, roughness: 0.8, flatShading: true });
              const roof = new THREE.Mesh(roofGeom, roofMat);
              roof.position.y = 1.18 + 0.175;
              sGroup.add(roof);

              towerMesh.userData = { cell };
              decorationMeshes.push(towerMesh);
              cellMeshes.push(towerMesh);
            }
            else if (sType === 'ArtisanBench') {
              const tableGeom = new THREE.BoxGeometry(0.7, 0.1, 0.45);
              const tableMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9, flatShading: true });
              const tableMesh = new THREE.Mesh(tableGeom, tableMat);
              tableMesh.position.y = 0.35;
              tableMesh.castShadow = true;
              tableMesh.receiveShadow = true;
              sGroup.add(tableMesh);

              const legMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1d, roughness: 0.9 });
              const legGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 4);
              const legOffsets = [
                [-0.28, -0.16],
                [0.28, -0.16],
                [-0.28, 0.16],
                [0.28, 0.16]
              ];
              legOffsets.forEach(([ox, oz]) => {
                const leg = new THREE.Mesh(legGeom, legMat);
                leg.position.set(ox, 0.15, oz);
                sGroup.add(leg);
              });

              const boxGeom = new THREE.BoxGeometry(0.18, 0.12, 0.14);
              const boxMat = new THREE.MeshStandardMaterial({ color: 0xa0522d });
              const toolBox = new THREE.Mesh(boxGeom, boxMat);
              toolBox.position.set(-0.15, 0.42, 0.05);
              sGroup.add(toolBox);

              // Render raw materials and animatable hammer if crafting jobs are currently active in the colony!
              const isCraftingActive = currentMap?.craftQueue && currentMap.craftQueue.length > 0;
              if (isCraftingActive) {
                // Miniature materials log and stone
                const logMatRef = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
                const miniLog = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 4), logMatRef);
                miniLog.rotation.z = Math.PI / 2;
                miniLog.position.set(0.12, 0.42, 0.04);
                sGroup.add(miniLog);

                const miniStone = new THREE.Mesh(
                  new THREE.DodecahedronGeometry(0.024, 0),
                  new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9, flatShading: true })
                );
                miniStone.position.set(0.14, 0.42, -0.04);
                sGroup.add(miniStone);

                // Toolkit hammer group
                const hammerGroup = new THREE.Group();
                hammerGroup.name = 'active_hammer';
                hammerGroup.position.set(0.06, 0.41, 0.0);
                
                const malletHead = new THREE.Mesh(
                  new THREE.BoxGeometry(0.03, 0.05, 0.03),
                  new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6 })
                );
                malletHead.position.set(0, 0.08, 0);
                hammerGroup.add(malletHead);

                const handle = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.006, 0.006, 0.1),
                  new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
                );
                handle.position.set(0, 0.04, 0);
                hammerGroup.add(handle);

                sGroup.add(hammerGroup);
              }

              tableMesh.userData = { cell };
              decorationMeshes.push(tableMesh);
              cellMeshes.push(tableMesh);
            }
            else if (sType === 'ScienceMachine') {
              const boilerGeom = new THREE.BoxGeometry(0.5, 0.3, 0.5);
              const boilerMat = new THREE.MeshStandardMaterial({ color: 0xbf9b30, roughness: 0.5, metalness: 0.7, flatShading: true });
              const boilerMesh = new THREE.Mesh(boilerGeom, boilerMat);
              boilerMesh.position.y = 0.15;
              boilerMesh.castShadow = true;
              boilerMesh.receiveShadow = true;
              sGroup.add(boilerMesh);

              const pipeGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.36, 6);
              const pipeMat = new THREE.MeshStandardMaterial({ color: 0x8e8e8e, metalness: 0.9, roughness: 0.2 });
              const pipe1 = new THREE.Mesh(pipeGeom, pipeMat);
              pipe1.position.set(0.14, 0.35, -0.1);
              sGroup.add(pipe1);

              const pipe2 = new THREE.Mesh(pipeGeom, pipeMat);
              pipe2.position.set(-0.14, 0.35, -0.1);
              sGroup.add(pipe2);

              const bulbGeom = new THREE.SphereGeometry(0.12, 8, 8);
              const bulbMat = new THREE.MeshStandardMaterial({ color: 0xbf55ec, emissive: 0x8e44ad, roughness: 0.1 });
              const bulb = new THREE.Mesh(bulbGeom, bulbMat);
              bulb.position.set(0, 0.38, 0.1);
              sGroup.add(bulb);

              boilerMesh.userData = { cell };
              decorationMeshes.push(boilerMesh);
              cellMeshes.push(boilerMesh);
            }
            else if (sType === 'RuinousAltar') {
              const obsidianGeom = new THREE.CylinderGeometry(0.38, 0.44, 0.22, 6);
              const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x1b1928, roughness: 0.2, metalness: 0.9, flatShading: true });
              const altarMesh = new THREE.Mesh(obsidianGeom, obsidianMat);
              altarMesh.position.y = 0.11;
              altarMesh.castShadow = true;
              altarMesh.receiveShadow = true;
              sGroup.add(altarMesh);

              const floatingCrystalGeom = new THREE.OctahedronGeometry(0.15);
              const crystalMat = new THREE.MeshStandardMaterial({ color: 0x9b59b6, emissive: 0x2e0854, roughness: 0.05, metalness: 1.0 });
              const floatCrystal = new THREE.Mesh(floatingCrystalGeom, crystalMat);
              floatCrystal.position.set(0, 0.46, 0);
              sGroup.add(floatCrystal);

              altarMesh.userData = { cell };
              decorationMeshes.push(altarMesh);
              cellMeshes.push(altarMesh);
            }
            else if (sType === 'Fireplace') {
              // Stone ring border
              const ringGeom = new THREE.CylinderGeometry(0.24, 0.28, 0.12, 8);
              const ringMat = new THREE.MeshStandardMaterial({ color: 0x5a5d64, roughness: 0.95, flatShading: true });
              const ringMesh = new THREE.Mesh(ringGeom, ringMat);
              ringMesh.position.y = 0.06;
              ringMesh.castShadow = true;
              ringMesh.receiveShadow = true;
              sGroup.add(ringMesh);

              // Central black ashen cavity
              const ashGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 8);
              const ashMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
              const ashMesh = new THREE.Mesh(ashGeom, ashMat);
              ashMesh.position.y = 0.1;
              sGroup.add(ashMesh);

              // Crossed logs
              const logMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
              const logGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.24, 5);
              
              const log1 = new THREE.Mesh(logGeom, logMat);
              log1.rotation.x = Math.PI / 2;
              log1.rotation.z = Math.PI / 4;
              log1.position.set(0, 0.12, 0);
              sGroup.add(log1);

              const log2 = new THREE.Mesh(logGeom, logMat);
              log2.rotation.x = Math.PI / 2;
              log2.rotation.z = -Math.PI / 4;
              log2.position.set(0, 0.12, 0);
              sGroup.add(log2);

              // Glowing flame cone
              const flameGeom = new THREE.ConeGeometry(0.12, 0.28, 6);
              const flameMat = new THREE.MeshStandardMaterial({ 
                color: 0xff4500, 
                emissive: 0xff8c00, 
                roughness: 0.1,
                flatShading: true
              });
              const flameMesh = new THREE.Mesh(flameGeom, flameMat);
              flameMesh.name = 'fireplace_flame';
              flameMesh.position.y = 0.15 + 0.14;
              sGroup.add(flameMesh);

              // Create warm fireplace light source
              const fireLight = new THREE.PointLight(0xff9e3d, 2.5, 6);
              fireLight.name = 'fireplace_light';
              fireLight.position.set(0, 0.35, 0);
              fireLight.castShadow = true;
              fireLight.shadow.bias = -0.002;
              fireLight.shadow.mapSize.width = 256;
              fireLight.shadow.mapSize.height = 256;
              sGroup.add(fireLight);

              // Link for raycaster selection
              ringMesh.userData = { cell };
              decorationMeshes.push(ringMesh);
              cellMeshes.push(ringMesh);
            }
            else if (sType === 'PetrifiedGreenhouse') {
              const baseGeom = new THREE.CylinderGeometry(0.38, 0.42, 0.12, 6);
              const baseMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9, flatShading: true });
              const baseMesh = new THREE.Mesh(baseGeom, baseMat);
              baseMesh.position.y = 0.06;
              baseMesh.castShadow = true;
              baseMesh.receiveShadow = true;
              sGroup.add(baseMesh);

              const seedGeom = new THREE.DodecahedronGeometry(0.18);
              const seedMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x15803d });
              const seedMesh = new THREE.Mesh(seedGeom, seedMat);
              seedMesh.position.y = 0.22;
              sGroup.add(seedMesh);

              const domeGeom = new THREE.SphereGeometry(0.32, 6, 6, 0, Math.PI * 2, 0, Math.PI / 2);
              const domeMat = new THREE.MeshStandardMaterial({ 
                color: 0x2dd4bf, 
                roughness: 0.1, 
                metalness: 0.9, 
                transparent: true, 
                opacity: 0.5,
                flatShading: true
              });
              const domeMesh = new THREE.Mesh(domeGeom, domeMat);
              domeMesh.position.y = 0.12;
              domeMesh.castShadow = true;
              sGroup.add(domeMesh);

              baseMesh.userData = { cell };
              decorationMeshes.push(baseMesh);
              cellMeshes.push(baseMesh);
            }
            else if (sType === 'PrecursorGenerator') {
              const baseGeom = new THREE.CylinderGeometry(0.35, 0.4, 0.15, 6);
              const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, flatShading: true });
              const baseMesh = new THREE.Mesh(baseGeom, baseMat);
              baseMesh.position.y = 0.075;
              baseMesh.castShadow = true;
              baseMesh.receiveShadow = true;
              sGroup.add(baseMesh);

              const coilGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 6);
              const coilMat = new THREE.MeshStandardMaterial({ color: 0xea580c, metalness: 0.9, roughness: 0.2, flatShading: true });
              const coilMesh = new THREE.Mesh(coilGeom, coilMat);
              coilMesh.position.y = 0.15 + 0.25;
              sGroup.add(coilMesh);

              const ringGeom = new THREE.TorusGeometry(0.24, 0.04, 4, 8);
              const ringMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x1d4ed8, flatShading: true });
              const ringMesh = new THREE.Mesh(ringGeom, ringMat);
              ringMesh.rotation.x = Math.PI / 2;
              ringMesh.position.y = 0.45;
              sGroup.add(ringMesh);

              baseMesh.userData = { cell };
              decorationMeshes.push(baseMesh);
              cellMeshes.push(baseMesh);
            }
            else if (sType === 'AegisBeacon') {
              const baseGeom = new THREE.ConeGeometry(0.22, 0.85, 4);
              const baseMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.1, flatShading: true });
              const baseMesh = new THREE.Mesh(baseGeom, baseMat);
              baseMesh.position.y = 0.85 / 2;
              baseMesh.castShadow = true;
              baseMesh.receiveShadow = true;
              sGroup.add(baseMesh);

              const crystalGeom = new THREE.OctahedronGeometry(0.12);
              const crystalMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });
              const crystalMesh = new THREE.Mesh(crystalGeom, crystalMat);
              crystalMesh.position.y = 0.85 + 0.12;
              sGroup.add(crystalMesh);

              baseMesh.userData = { cell };
              decorationMeshes.push(baseMesh);
              cellMeshes.push(baseMesh);
            }
             else if (sType === 'GatherersPantry') {
               // Green Pyramid Tent
               const tentGeom = new THREE.ConeGeometry(0.38, 0.65, 4);
               tentGeom.rotateY(Math.PI / 4);
               const tentMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.9, flatShading: true });
               const tentMesh = new THREE.Mesh(tentGeom, tentMat);
               tentMesh.position.y = 0.325;
               tentMesh.castShadow = true;
               tentMesh.receiveShadow = true;
               sGroup.add(tentMesh);

               // Crossed tribal poles
               const poleGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.85, 4);
               const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
               const p1 = new THREE.Mesh(poleGeom, poleMat);
               p1.position.set(0, 0.45, 0); p1.rotation.z = 0.15; p1.rotation.x = 0.15;
               sGroup.add(p1);
               const p2 = new THREE.Mesh(poleGeom, poleMat);
               p2.position.set(0, 0.45, 0); p2.rotation.z = -0.15; p2.rotation.x = -0.15;
               sGroup.add(p2);

               // Tiny red berries on the ground next to it
               const berryGeom = new THREE.SphereGeometry(0.06, 4, 4);
               const berryMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.5 });
               for (let i = 0; i < 3; i++) {
                 const berry = new THREE.Mesh(berryGeom, berryMat);
                 berry.position.set((i - 1) * 0.15, 0.05, 0.22);
                 sGroup.add(berry);
               }

               tentMesh.userData = { cell };
               decorationMeshes.push(tentMesh);
               cellMeshes.push(tentMesh);
             }
             else if (sType === 'HuntersHut') {
               // Red Pyramid Tent
               const tentGeom = new THREE.ConeGeometry(0.38, 0.65, 4);
               tentGeom.rotateY(Math.PI / 4);
               const tentMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.9, flatShading: true });
               const tentMesh = new THREE.Mesh(tentGeom, tentMat);
               tentMesh.position.y = 0.325;
               tentMesh.castShadow = true;
               tentMesh.receiveShadow = true;
               sGroup.add(tentMesh);

               // Crossed tribal poles
               const poleGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.85, 4);
               const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
               const p1 = new THREE.Mesh(poleGeom, poleMat);
               p1.position.set(0, 0.45, 0); p1.rotation.z = 0.15; p1.rotation.x = 0.15;
               sGroup.add(p1);
               const p2 = new THREE.Mesh(poleGeom, poleMat);
               p2.position.set(0, 0.45, 0); p2.rotation.z = -0.15; p2.rotation.x = -0.15;
               sGroup.add(p2);

               // Small slanted hunting spear next to tent
               const spearGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.65, 4);
               const spearMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5 });
               const spear = new THREE.Mesh(spearGeom, spearMat);
               spear.rotation.z = Math.PI / 6;
               spear.position.set(-0.16, 0.32, 0.22);
               sGroup.add(spear);

               tentMesh.userData = { cell };
               decorationMeshes.push(tentMesh);
               cellMeshes.push(tentMesh);
             }
             else if (sType === 'BuildersLodge') {
               // Orange Pyramid Tent
               const tentGeom = new THREE.ConeGeometry(0.38, 0.65, 4);
               tentGeom.rotateY(Math.PI / 4);
               const tentMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.9, flatShading: true });
               const tentMesh = new THREE.Mesh(tentGeom, tentMat);
               tentMesh.position.y = 0.325;
               tentMesh.castShadow = true;
               tentMesh.receiveShadow = true;
               sGroup.add(tentMesh);

               // Crossed tribal poles
               const poleGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.85, 4);
               const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
               const p1 = new THREE.Mesh(poleGeom, poleMat);
               p1.position.set(0, 0.45, 0); p1.rotation.z = 0.15; p1.rotation.x = 0.15;
               sGroup.add(p1);
               const p2 = new THREE.Mesh(poleGeom, poleMat);
               p2.position.set(0, 0.45, 0); p2.rotation.z = -0.15; p2.rotation.x = -0.15;
               sGroup.add(p2);

               // Stacked logs on the side
               const logGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.35, 6);
               const logMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
               const log1 = new THREE.Mesh(logGeom, logMat);
               log1.rotation.z = Math.PI / 2;
               log1.position.set(0.18, 0.05, -0.2);
               sGroup.add(log1);

               tentMesh.userData = { cell };
               decorationMeshes.push(tentMesh);
               cellMeshes.push(tentMesh);
             }
             else if (sType === 'FarmersGranary') {
               // Yellow/Amber Pyramid Tent
               const tentGeom = new THREE.ConeGeometry(0.38, 0.65, 4);
               tentGeom.rotateY(Math.PI / 4);
               const tentMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9, flatShading: true });
               const tentMesh = new THREE.Mesh(tentGeom, tentMat);
               tentMesh.position.y = 0.325;
               tentMesh.castShadow = true;
               tentMesh.receiveShadow = true;
               sGroup.add(tentMesh);

               // Crossed tribal poles
               const poleGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.85, 4);
               const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
               const p1 = new THREE.Mesh(poleGeom, poleMat);
               p1.position.set(0, 0.45, 0); p1.rotation.z = 0.15; p1.rotation.x = 0.15;
               sGroup.add(p1);
               const p2 = new THREE.Mesh(poleGeom, poleMat);
               p2.position.set(0, 0.45, 0); p2.rotation.z = -0.15; p2.rotation.x = -0.15;
               sGroup.add(p2);

               // Small grain basket decoration
               const basketGeom = new THREE.CylinderGeometry(0.08, 0.06, 0.1, 6);
               const basketMat = new THREE.MeshStandardMaterial({ color: 0xb58900, roughness: 0.95 });
               const basket = new THREE.Mesh(basketGeom, basketMat);
               basket.position.set(-0.2, 0.05, 0.2);
               sGroup.add(basket);

               tentMesh.userData = { cell };
               decorationMeshes.push(tentMesh);
               cellMeshes.push(tentMesh);
             }
             else if (sType === 'ScoutsLookout') {
               // Purple/Indigo Pyramid Tent
               const tentGeom = new THREE.ConeGeometry(0.38, 0.65, 4);
               tentGeom.rotateY(Math.PI / 4);
               const tentMat = new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 0.9, flatShading: true });
               const tentMesh = new THREE.Mesh(tentGeom, tentMat);
               tentMesh.position.y = 0.325;
               tentMesh.castShadow = true;
               tentMesh.receiveShadow = true;
               sGroup.add(tentMesh);

               // Crossed tribal poles
               const poleGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.85, 4);
               const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
               const p1 = new THREE.Mesh(poleGeom, poleMat);
               p1.position.set(0, 0.45, 0); p1.rotation.z = 0.15; p1.rotation.x = 0.15;
               sGroup.add(p1);
               const p2 = new THREE.Mesh(poleGeom, poleMat);
               p2.position.set(0, 0.45, 0); p2.rotation.z = -0.15; p2.rotation.x = -0.15;
               sGroup.add(p2);

               // Mini tall signal flag post
               const poleG = new THREE.CylinderGeometry(0.008, 0.008, 0.55, 4);
               const poleMesh = new THREE.Mesh(poleG, poleMat);
               poleMesh.position.set(0.2, 0.275, 0.2);
               sGroup.add(poleMesh);
               const flagG = new THREE.BoxGeometry(0.12, 0.08, 0.01);
               const flagM = new THREE.MeshStandardMaterial({ color: 0xa855f7 });
               const flagMesh = new THREE.Mesh(flagG, flagM);
               flagMesh.position.set(0.2, 0.5, 0.25);
               sGroup.add(flagMesh);

               tentMesh.userData = { cell };
               decorationMeshes.push(tentMesh);
               cellMeshes.push(tentMesh);
             }
             else if (sType === 'HealersSanctum') {
               // Teal Pyramid Tent
               const tentGeom = new THREE.ConeGeometry(0.38, 0.65, 4);
               tentGeom.rotateY(Math.PI / 4);
               const tentMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.9, flatShading: true });
               const tentMesh = new THREE.Mesh(tentGeom, tentMat);
               tentMesh.position.y = 0.325;
               tentMesh.castShadow = true;
               tentMesh.receiveShadow = true;
               sGroup.add(tentMesh);

               // Crossed tribal poles
               const poleGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.85, 4);
               const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
               const p1 = new THREE.Mesh(poleGeom, poleMat);
               p1.position.set(0, 0.45, 0); p1.rotation.z = 0.15; p1.rotation.x = 0.15;
               sGroup.add(p1);
               const p2 = new THREE.Mesh(poleGeom, poleMat);
               p2.position.set(0, 0.45, 0); p2.rotation.z = -0.15; p2.rotation.x = -0.15;
               sGroup.add(p2);

               // Glowing healer crystal beacon on the side
               const healerBeaconGeom = new THREE.SphereGeometry(0.07, 6, 6);
               const healerBeaconMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x14532d, roughness: 0.1 });
               const healerBeacon = new THREE.Mesh(healerBeaconGeom, healerBeaconMat);
               healerBeacon.position.set(-0.2, 0.07, -0.2);
               sGroup.add(healerBeacon);

               tentMesh.userData = { cell };
               decorationMeshes.push(tentMesh);
               cellMeshes.push(tentMesh);
             }
             else if (sType === 'ArtisansWorkshop') {
               // Blue Pyramid Tent
               const tentGeom = new THREE.ConeGeometry(0.38, 0.65, 4);
               tentGeom.rotateY(Math.PI / 4);
               const tentMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.9, flatShading: true });
               const tentMesh = new THREE.Mesh(tentGeom, tentMat);
               tentMesh.position.y = 0.325;
               tentMesh.castShadow = true;
               tentMesh.receiveShadow = true;
               sGroup.add(tentMesh);

               // Crossed tribal poles
               const poleGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.85, 4);
               const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
               const p1 = new THREE.Mesh(poleGeom, poleMat);
               p1.position.set(0, 0.45, 0); p1.rotation.z = 0.15; p1.rotation.x = 0.15;
               sGroup.add(p1);
               const p2 = new THREE.Mesh(poleGeom, poleMat);
               p2.position.set(0, 0.45, 0); p2.rotation.z = -0.15; p2.rotation.x = -0.15;
               sGroup.add(p2);

               // Tiny anvil box decoration next to it
               const anvilGeom = new THREE.BoxGeometry(0.12, 0.08, 0.08);
               const anvilMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
               const anvil = new THREE.Mesh(anvilGeom, anvilMat);
               anvil.position.set(0.2, 0.04, 0.2);
               sGroup.add(anvil);

               tentMesh.userData = { cell };
               decorationMeshes.push(tentMesh);
               cellMeshes.push(tentMesh);
             }
            else if (sType === 'ObservationPlatform') {
              // Tall wooden platform with a brass cylinder telescope
              const scaffoldGeom = new THREE.CylinderGeometry(0.18, 0.28, 0.6, 5);
              const scaffoldMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, flatShading: true });
              const scaffold = new THREE.Mesh(scaffoldGeom, scaffoldMat);
              scaffold.position.y = 0.3;
              scaffold.castShadow = true;
              sGroup.add(scaffold);

              const deckGeom = new THREE.BoxGeometry(0.5, 0.05, 0.5);
              const deckMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.9 });
              const deck = new THREE.Mesh(deckGeom, deckMat);
              deck.position.y = 0.6;
              sGroup.add(deck);

              // Telescope pointing up
              const scopeGeom = new THREE.CylinderGeometry(0.04, 0.024, 0.28, 6);
              const scopeMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, roughness: 0.3, metalness: 0.8 });
              const scope = new THREE.Mesh(scopeGeom, scopeMat);
              scope.position.set(0, 0.72, 0);
              scope.rotation.x = -Math.PI / 4; // 45 degrees up
              sGroup.add(scope);

              scaffold.userData = { cell };
              decorationMeshes.push(scaffold);
              cellMeshes.push(scaffold);
            }
            else if (sType === 'Observatory') {
              // Cylindrical white stone base with metallic dome and solar/star tracking dish
              const baseGeom = new THREE.CylinderGeometry(0.35, 0.38, 0.45, 8);
              const baseMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
              const baseMesh = new THREE.Mesh(baseGeom, baseMat);
              baseMesh.position.y = 0.225;
              baseMesh.castShadow = true;
              sGroup.add(baseMesh);

              const domeGeom = new THREE.SphereGeometry(0.25, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
              const domeMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.7, roughness: 0.4 });
              const dome = new THREE.Mesh(domeGeom, domeMat);
              dome.position.y = 0.45;
              sGroup.add(dome);

              // Glowing weather lens
              const lensGeom = new THREE.SphereGeometry(0.06, 6, 6);
              const lensMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x7e22ce, roughness: 0.1 });
              const lens = new THREE.Mesh(lensGeom, lensMat);
              lens.position.set(0.12, 0.52, 0.12);
              sGroup.add(lens);

              baseMesh.userData = { cell };
              decorationMeshes.push(baseMesh);
              cellMeshes.push(baseMesh);
            }
            else if (sType === 'RelicArchive') {
              // Solid dark stone repository with pillars and amber archives light
              const platformGeom = new THREE.BoxGeometry(0.65, 0.12, 0.65);
              const platformMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, flatShading: true });
              const platform = new THREE.Mesh(platformGeom, platformMat);
              platform.position.y = 0.06;
              platform.receiveShadow = true;
              sGroup.add(platform);

              // 4 miniature columns
              const colGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 5);
              const colMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, flatShading: true });
              for (let dx of [-0.22, 0.22]) {
                for (let dz of [-0.22, 0.22]) {
                  const col = new THREE.Mesh(colGeom, colMat);
                  col.position.set(dx, 0.295, dz);
                  col.castShadow = true;
                  sGroup.add(col);
                }
              }

              // Overhanging roof
              const roofGeom = new THREE.BoxGeometry(0.65, 0.08, 0.65);
              const roofMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6, roughness: 0.4 });
              const roof = new THREE.Mesh(roofGeom, roofMat);
              roof.position.y = 0.51;
              sGroup.add(roof);

              // Floating relic artifact model inside columns
              const relicGeom = new THREE.OctahedronGeometry(0.08, 0);
              const relicMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0x78350f, metalness: 0.9, roughness: 0.1 });
              const relicMesh = new THREE.Mesh(relicGeom, relicMat);
              relicMesh.position.y = 0.295;
              sGroup.add(relicMesh);

              platform.userData = { cell };
              decorationMeshes.push(platform);
              cellMeshes.push(platform);
            }
            else if (sType === 'MeditationShrine') {
              // Low stone slab base + floating meditation orb with purple leaf specks
              const gardenGeom = new THREE.CylinderGeometry(0.42, 0.45, 0.08, 6);
              const gardenMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
              const garden = new THREE.Mesh(gardenGeom, gardenMat);
              garden.position.y = 0.04;
              garden.receiveShadow = true;
              sGroup.add(garden);

              // Floating tranquil orb
              const orbGeom = new THREE.SphereGeometry(0.09, 8, 8);
              const orbMat = new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0x9d174d, roughness: 0.2 });
              const orb = new THREE.Mesh(orbGeom, orbMat);
              orb.position.y = 0.35;
              sGroup.add(orb);

              // Scattering tiny visual aesthetic leaves around
              const leafGeom = new THREE.BoxGeometry(0.05, 0.01, 0.05);
              const leafMat = new THREE.MeshStandardMaterial({ color: 0xd946ef, roughness: 0.9 });
              for (let i = 0; i < 4; i++) {
                const leaf = new THREE.Mesh(leafGeom, leafMat);
                const angle = i * (Math.PI / 2) + 0.4;
                leaf.position.set(Math.cos(angle) * 0.25, 0.07, Math.sin(angle) * 0.25);
                leaf.rotation.y = angle;
                sGroup.add(leaf);
              }

              garden.userData = { cell };
              decorationMeshes.push(garden);
              cellMeshes.push(garden);
            }
            else if (sType === 'MapHall') {
              // Flat wood hex drafting table with small lit points of the lands map
              const tableBaseGeom = new THREE.CylinderGeometry(0.3, 0.35, 0.2, 6);
              const tableBaseMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9, flatShading: true });
              const tableBase = new THREE.Mesh(tableBaseGeom, tableBaseMat);
              tableBase.position.y = 0.1;
              tableBase.castShadow = true;
              tableBase.receiveShadow = true;
              sGroup.add(tableBase);

              const tableTopGeom = new THREE.BoxGeometry(0.65, 0.05, 0.65);
              const tableTopMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
              const tableTop = new THREE.Mesh(tableTopGeom, tableTopMat);
              tableTop.position.y = 0.225;
              sGroup.add(tableTop);

              // Standard mini indicators
              const pinA = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b }));
              pinA.position.set(-0.12, 0.265, -0.1);
              sGroup.add(pinA);

              const pinB = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x1e3a8a }));
              pinB.position.set(0.15, 0.265, 0.12);
              sGroup.add(pinB);

              tableBase.userData = { cell };
              decorationMeshes.push(tableBase);
              cellMeshes.push(tableBase);
            }

            decorationsGroup.add(sGroup);
          }

          // Agricultural crop sowing fields
          if (cell.farmCrop) {
            const crop = cell.farmCrop;
            const progress = crop.progress;
            const stage = crop.stage;

            const cropGroup = new THREE.Group();
            cropGroup.position.set(x, y, z);

            const isHarvestable = stage === 'harvestable';

            if (crop.type === 'Wheat') {
              // Wheat grows from small grass shoots to villager-height (0.85)!
              let heightFactor = 0.1;
              if (stage === 'sown') {
                heightFactor = 0.05 + (progress / 100) * 0.1;
              } else if (stage === 'growing') {
                heightFactor = 0.15 + (progress / 100) * 0.7;
              } else if (stage === 'harvestable') {
                heightFactor = 0.85;
              }

              // Color starts as fresh young grass green, matures into rich green, and turns brilliant gold when ripe
              let stalkColor = 0x558b2f;
              if (stage === 'sown') {
                stalkColor = 0x7cb342; // fresh young shoot
              } else if (stage === 'growing') {
                if (progress < 50) {
                  stalkColor = 0x558b2f; // healthy green grass
                } else {
                  stalkColor = 0x9ccc65; // ripening yellowish-green grass
                }
              } else if (stage === 'harvestable') {
                stalkColor = 0xffcc33; // ripe golden wheat
              }

              const stalkMat = new THREE.MeshStandardMaterial({ color: stalkColor, roughness: 0.9, flatShading: true });
              const stalkGeom = new THREE.CylinderGeometry(0.009, 0.016, heightFactor, 4);

              // Render dense cluster of 8 elegant wheat stalks per tile
              const numStalks = 8;
              for (let cI = 0; cI < numStalks; cI++) {
                const stalk = new THREE.Mesh(stalkGeom, stalkMat);
                const offsetAngle = cI * (Math.PI * 2 / numStalks) + 0.3;
                // Distribute stalks inside the tile
                const ox = Math.cos(offsetAngle) * 0.16;
                const oz = Math.sin(offsetAngle) * 0.16;
                
                stalk.position.set(ox, heightFactor / 2, oz);
                // Gentle natural bending/swaying angles
                stalk.rotation.x = Math.sin(cI) * 0.06;
                stalk.rotation.z = Math.cos(cI) * 0.06;
                stalk.castShadow = true;
                cropGroup.add(stalk);

                // Render golden grain seed heads at the top of wheat stalks
                if (isHarvestable || (stage === 'growing' && progress > 50)) {
                  const grSize = Math.max(0.012, (progress / 100) * 0.038);
                  const headMesh = new THREE.Mesh(
                    new THREE.ConeGeometry(grSize, grSize * 2.8, 4),
                    new THREE.MeshStandardMaterial({ color: 0xdfb000, roughness: 0.7, flatShading: true })
                  );
                  headMesh.position.set(ox, heightFactor, oz);
                  headMesh.rotation.x = Math.sin(cI) * 0.12;
                  headMesh.rotation.z = Math.cos(cI) * 0.12;
                  cropGroup.add(headMesh);
                }
              }
            } else if (crop.type === 'AmberMaize') {
              // Tall Corn Stalks with bright gold ears!
              let heightFactor = 0.08;
              if (stage === 'sown') {
                heightFactor = 0.05 + (progress / 100) * 0.1;
              } else if (stage === 'growing') {
                heightFactor = 0.15 + (progress / 100) * 0.8;
              } else if (stage === 'harvestable') {
                heightFactor = 1.1;
              }

              const stalkMat = new THREE.MeshStandardMaterial({ color: 0x33691e, roughness: 0.85, flatShading: true });
              const cornMat = new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.7, metalness: 0.1 }); // golden-yellow corn ears
              const huskMat = new THREE.MeshStandardMaterial({ color: 0x689f38, roughness: 0.9, flatShading: true });

              const numMaize = stage === 'sown' ? 3 : 6;
              for (let i = 0; i < numMaize; i++) {
                const angle = i * (Math.PI * 2 / numMaize) + 0.15;
                const ox = Math.cos(angle) * (stage === 'sown' ? 0.08 : 0.15);
                const oz = Math.sin(angle) * (stage === 'sown' ? 0.08 : 0.15);

                const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, stage === 'sown' ? 0.01 : 0.022, heightFactor, 4), stalkMat);
                stalk.position.set(ox, heightFactor / 2, oz);
                stalk.castShadow = true;
                cropGroup.add(stalk);

                // Add corn ears only if harvestable
                if (stage === 'harvestable') {
                  const earG = new THREE.Group();
                  earG.position.set(ox, heightFactor * 0.55, oz);
                  
                  const corn = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 4), cornMat);
                  corn.rotation.x = 0.4;
                  corn.position.set(0.02, 0, 0.02);
                  earG.add(corn);

                  const husk = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.012), huskMat);
                  husk.rotation.x = 0.35;
                  husk.position.set(0.01, -0.01, 0.01);
                  earG.add(husk);

                  cropGroup.add(earG);
                }
              }
            } else if (crop.type === 'VortexCabbage') {
              // Spiraling low-poly cabbage heads on the ground
              let cabbageSize = 0.015;
              if (stage === 'sown') {
                cabbageSize = 0.01 + (progress / 100) * 0.025;
              } else if (stage === 'growing') {
                cabbageSize = 0.035 + (progress / 100) * 0.085;
              } else if (stage === 'harvestable') {
                cabbageSize = 0.12;
              }

              const leafMat = new THREE.MeshStandardMaterial({ color: 0x00c853, roughness: 0.9, flatShading: true });
              const coreMat = new THREE.MeshStandardMaterial({ color: 0x69f0ae, roughness: 0.8, flatShading: true });

              const numCabbages = stage === 'sown' ? 2 : 4;
              for (let i = 0; i < numCabbages; i++) {
                const angle = i * (Math.PI / 2) + 0.5;
                const ox = Math.cos(angle) * (stage === 'sown' ? 0.06 : 0.14);
                const oz = Math.sin(angle) * (stage === 'sown' ? 0.06 : 0.14);

                const cabG = new THREE.Group();
                cabG.position.set(ox, cabbageSize * 0.4, oz);

                if (stage === 'sown') {
                  // Tiny seedling leaves
                  for (let leaf = 0; leaf < 2; leaf++) {
                    const leafM = new THREE.Mesh(new THREE.BoxGeometry(cabbageSize * 2.0, cabbageSize * 0.4, cabbageSize * 0.15), leafMat);
                    leafM.rotation.y = (leaf * Math.PI) / 2;
                    leafM.rotation.x = 0.1;
                    cabG.add(leafM);
                  }
                } else {
                  // Core sphere
                  const core = new THREE.Mesh(new THREE.SphereGeometry(cabbageSize, 5, 5), coreMat);
                  cabG.add(core);

                  // Outer layered leaves
                  const leafCount = stage === 'growing' ? 2 : 3;
                  for (let leaf = 0; leaf < leafCount; leaf++) {
                    const leafM = new THREE.Mesh(new THREE.BoxGeometry(cabbageSize * 1.6, cabbageSize * 0.9, cabbageSize * 0.2), leafMat);
                    leafM.rotation.y = (leaf * Math.PI) / 3;
                    leafM.rotation.x = 0.15;
                    cabG.add(leafM);
                  }
                }
                cabG.castShadow = true;
                cropGroup.add(cabG);
              }
            } else if (crop.type === 'Gemberries') {
              // Multi-branch berry shrubs with glowing crimson ruby-berries!
              let heightFactor = 0.05;
              if (stage === 'sown') {
                heightFactor = 0.04 + (progress / 100) * 0.08;
              } else if (stage === 'growing') {
                heightFactor = 0.12 + (progress / 100) * 0.33;
              } else if (stage === 'harvestable') {
                heightFactor = 0.45;
              }

              const branchMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.95 });
              const leafMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.9, flatShading: true });
              const berryMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.6, metalness: 0.1 });

              const numBushes = stage === 'sown' ? 2 : 3;
              for (let i = 0; i < numBushes; i++) {
                const angle = i * (Math.PI * 2 / numBushes) + 0.2;
                const ox = Math.cos(angle) * (stage === 'sown' ? 0.06 : 0.15);
                const oz = Math.sin(angle) * (stage === 'sown' ? 0.06 : 0.15);

                const bushG = new THREE.Group();
                bushG.position.set(ox, 0, oz);

                const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.005, stage === 'sown' ? 0.008 : 0.018, heightFactor, 4), branchMat);
                branch.position.y = heightFactor / 2;
                bushG.add(branch);

                if (stage !== 'sown') {
                  const leaves = new THREE.Mesh(new THREE.SphereGeometry(heightFactor * 0.55, 4, 4), leafMat);
                  leaves.position.y = heightFactor * 0.8;
                  leaves.scale.set(1.1, 0.8, 1.1);
                  bushG.add(leaves);
                }

                // Crimson berries only when harvestable
                if (stage === 'harvestable') {
                  for (let b = 0; b < 4; b++) {
                    const berry = new THREE.Mesh(new THREE.SphereGeometry(0.015, 3, 3), berryMat);
                    const bAngle = b * (Math.PI / 2);
                    berry.position.set(
                      Math.cos(bAngle) * heightFactor * 0.4,
                      heightFactor * (0.6 + Math.sin(b) * 0.15),
                      Math.sin(bAngle) * heightFactor * 0.4
                    );
                    bushG.add(berry);
                  }
                }
                bushG.castShadow = true;
                cropGroup.add(bushG);
              }
            } else if (crop.type === 'Stormroot') {
              // Spiky static-grey leaves with underground storm-bulbs peeking out!
              let sizeFactor = 0.015;
              if (stage === 'sown') {
                sizeFactor = 0.01 + (progress / 100) * 0.02;
              } else if (stage === 'growing') {
                sizeFactor = 0.03 + (progress / 100) * 0.06;
              } else if (stage === 'harvestable') {
                sizeFactor = 0.09;
              }

              const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a148c, roughness: 0.9, flatShading: true }); // dark purple/indigo leaves
              const bulbMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.7, flatShading: true }); // static grey corm
              const staticMat = new THREE.MeshStandardMaterial({ color: 0x00acc1, roughness: 0.4, metalness: 0.2 }); // standard static core

              const numRoots = stage === 'sown' ? 2 : 4;
              for (let i = 0; i < numRoots; i++) {
                const angle = i * (Math.PI / 2) + 0.1;
                const ox = Math.cos(angle) * (stage === 'sown' ? 0.06 : 0.14);
                const oz = Math.sin(angle) * (stage === 'sown' ? 0.06 : 0.14);

                const rootG = new THREE.Group();
                rootG.position.set(ox, sizeFactor * 0.2, oz);

                // Bulb peeking out only if harvestable
                if (stage === 'harvestable') {
                  const bulb = new THREE.Mesh(new THREE.SphereGeometry(sizeFactor, 4, 4), bulbMat);
                  bulb.scale.set(1, 1.4, 1);
                  bulb.castShadow = true;
                  rootG.add(bulb);

                  const spark = new THREE.Mesh(new THREE.BoxGeometry(sizeFactor * 0.4, sizeFactor * 0.4, sizeFactor * 0.4), staticMat);
                  spark.position.y = sizeFactor * 0.7;
                  rootG.add(spark);
                }

                // Spiky dark leaves emerging
                const leafCount = stage === 'sown' ? 2 : 4;
                for (let leaf = 0; leaf < leafCount; leaf++) {
                  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.005, sizeFactor * 2.8, 3), leafMat);
                  blade.rotation.z = (leaf % 2 === 0 ? 0.35 : -0.35);
                  blade.rotation.x = (leaf > 1 ? 0.35 : -0.35);
                  blade.position.y = sizeFactor * 0.4;
                  rootG.add(blade);
                }

                cropGroup.add(rootG);
              }
            } else {
              // Standard fallback crops (e.g. Pumpkins)
              const heightFactor = Math.max(0.08, (progress / 100) * 0.35);
              const stalkColor = isHarvestable ? 0xffcc33 : (stage === 'growing' ? 0x22aa33 : 0x447722);
              const stalkMat = new THREE.MeshStandardMaterial({ color: stalkColor, roughness: 0.9, flatShading: true });
              const stalkGeom = new THREE.CylinderGeometry(0.012, 0.02, heightFactor, 4);

              for (let cI = 0; cI < 4; cI++) {
                const stalk = new THREE.Mesh(stalkGeom, stalkMat);
                const offsetAngle = cI * (Math.PI / 2) + 0.3;
                const ox = Math.cos(offsetAngle) * 0.14;
                const oz = Math.sin(offsetAngle) * 0.14;
                stalk.position.set(ox, heightFactor / 2, oz);
                stalk.rotation.x = Math.sin(cI) * 0.08;
                stalk.rotation.z = Math.cos(cI) * 0.08;
                stalk.castShadow = true;
                cropGroup.add(stalk);

                // Render golden cluster grain heads at the top of wheat stalks
                if (isHarvestable || progress > 55) {
                  const grSize = (progress / 100) * 0.035;
                  const headMesh = new THREE.Mesh(
                    new THREE.ConeGeometry(grSize, grSize * 2.5, 4),
                    new THREE.MeshStandardMaterial({ color: 0xdfb000, roughness: 0.7, flatShading: true })
                  );
                  headMesh.position.set(ox, heightFactor, oz);
                  headMesh.rotation.x = Math.sin(cI) * 0.12;
                  headMesh.rotation.z = Math.cos(cI) * 0.12;
                  cropGroup.add(headMesh);
                }
              }

              // Draw orange pumpkins on the ground for high progress fields!
              if (isHarvestable || progress > 40) {
                const vegSize = (progress / 100) * 0.065;
                const vegGroup = new THREE.Group();
                vegGroup.position.set(0, 0.03, 0);

                const pumpkinMesh = new THREE.Mesh(
                  new THREE.SphereGeometry(vegSize, 6, 6),
                  new THREE.MeshStandardMaterial({ color: 0xe65c00, roughness: 0.9, flatShading: true })
                );
                pumpkinMesh.scale.set(1.25, 0.85, 1.25); // flattened pumpkin shape
                pumpkinMesh.castShadow = true;
                vegGroup.add(pumpkinMesh);

                const greenStem = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.01, 0.01, 0.03, 4),
                  new THREE.MeshStandardMaterial({ color: 0x228822, roughness: 0.9 })
                );
                greenStem.position.set(0, vegSize * 0.85, 0);
                greenStem.rotation.z = 0.2;
                vegGroup.add(greenStem);

                cropGroup.add(vegGroup);
              }
            }

            decorationsGroup.add(cropGroup);
          }

          // --- BIOME GRASS GENERATOR ---
          let grassChance = 0.0;
          let isYellow = false;

          // Grass removed as requested by the user. Originally:
          // if (cell.biome === 'grassland' || cell.biome === 'forest') { grassChance = 0.90; } ...

          if (grassChance > 0 && cell.biome !== 'water' && !cell.structure && !cell.construction) {
            // Use deterministic seeded random to prevent grass from regenerating randomly
            const seedSin = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
            const seededRandom = seedSin - Math.floor(seedSin);

            if (seededRandom < grassChance) {
              // DENSITY INCREASED: 14 blades of grass instead of 7!
              const numBlades = 14;
              for (let b = 0; b < numBlades; b++) {
                // deterministic offset per blade
                const bladeSeed = (seededRandom * (b + 1) * 31.4159) % 1.0;
                const ox = (bladeSeed * 0.45) - 0.225;
                const oz = (((bladeSeed * 7.13) % 1.0) * 0.45) - 0.225;
                const bHeight = 0.08 + bladeSeed * 0.12;

                const pos = new THREE.Vector3(x + ox, y + bHeight / 2, z + oz);
                const scl = new THREE.Vector3(1.0, bHeight / 0.12, 1.0);
                const rot = new THREE.Euler(
                  (bladeSeed * 0.2) - 0.1,
                  bladeSeed * Math.PI * 2,
                  (((bladeSeed * 4.31) % 1.0) * 0.2) - 0.1
                );

                if (isYellow) {
                  yellowGrassInstances.push({ position: pos, scale: scl, rotation: rot });
                } else {
                  greenGrassInstances.push({ position: pos, scale: scl, rotation: rot });
                }
              }
            }
          }

        const endIndex = decorationsGroup.children.length;
        for (let i = startIndex; i < endIndex; i++) {
          const child = decorationsGroup.children[i];
          child.userData = child.userData || {};
          child.userData.cell = cell;
        }
      }

      // --- BUILD GREEN GRASS INSTANCED MESH ---
      if (greenGrassInstances.length > 0) {
        const bladeGeom = new THREE.ConeGeometry(0.015, 0.12, 3);
        const grassMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#558b2f'),
          roughness: 0.9,
          flatShading: true,
        });

        const instancedGreenGrass = new THREE.InstancedMesh(bladeGeom, grassMat, greenGrassInstances.length);
        instancedGreenGrass.castShadow = true;
        instancedGreenGrass.receiveShadow = true;

        const dummy = new THREE.Object3D();
        for (let i = 0; i < greenGrassInstances.length; i++) {
          const inst = greenGrassInstances[i];
          dummy.position.copy(inst.position);
          dummy.scale.copy(inst.scale);
          dummy.rotation.copy(inst.rotation);
          dummy.updateMatrix();
          instancedGreenGrass.setMatrixAt(i, dummy.matrix);
        }
        instancedGreenGrass.instanceMatrix.needsUpdate = true;
        decorationsGroup.add(instancedGreenGrass);
      }

      // --- BUILD YELLOW GRASS INSTANCED MESH ---
      if (yellowGrassInstances.length > 0) {
        const bladeGeom = new THREE.ConeGeometry(0.015, 0.12, 3);
        const grassMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#d89e2b'),
          roughness: 0.9,
          flatShading: true,
        });

        const instancedYellowGrass = new THREE.InstancedMesh(bladeGeom, grassMat, yellowGrassInstances.length);
        instancedYellowGrass.castShadow = true;
        instancedYellowGrass.receiveShadow = true;

        const dummy = new THREE.Object3D();
        for (let i = 0; i < yellowGrassInstances.length; i++) {
          const inst = yellowGrassInstances[i];
          dummy.position.copy(inst.position);
          dummy.scale.copy(inst.scale);
          dummy.rotation.copy(inst.rotation);
          dummy.updateMatrix();
          instancedYellowGrass.setMatrixAt(i, dummy.matrix);
        }
        instancedYellowGrass.instanceMatrix.needsUpdate = true;
        decorationsGroup.add(instancedYellowGrass);
      }

      // Apply storm/danger visual effects to decorations outside the Eye
      const eyeX = currentMap.eyePos?.x ?? 60;
      const eyeZ = currentMap.eyePos?.z ?? 60;
      const eyeRadius = currentMap.eyeRadius ?? 14.0;
      const insideRadiusSq = (eyeRadius + 2.0) * (eyeRadius + 2.0);

      decorationsGroup.children.forEach((child) => {
        const cell = child.userData?.cell;
        if (cell) {
          const dx = cell.x - eyeX;
          const dz = cell.z - eyeZ;
          const distSq = dx * dx + dz * dz;
          if (distSq > insideRadiusSq) {
            child.traverse((node: any) => {
              if (node.isMesh && node.material) {
                const mats = Array.isArray(node.material) ? node.material : [node.material];
                mats.forEach((mat) => {
                  if (mat.color) {
                    mat.color.lerp(new THREE.Color(0x5c3a21), 0.7); // Blend with deep storm-brown tint
                  }
                  if (mat.opacity !== undefined) {
                    mat.transparent = true;
                    mat.opacity = Math.min(mat.opacity, 0.65);
                  }
                });
              }
            });
          }
        }
      });

      // Freeze static matrices in decorationsGroup to keep render loop fast
      decorationsGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.updateMatrix();
          child.matrixAutoUpdate = false;
        }
      });

      // Collect animated components to avoid expensive scene traversals in the 60fps render loop
      animatingHammers = [];
      animatingFireplaceLights = [];
      animatingFireplaceFlames = [];
      animatingWindows = [];
      animatingSwayingPlants = [];

      decorationsGroup.traverse((child) => {
        if (child.name === 'active_hammer') {
          animatingHammers.push(child);
        } else if (child.name === 'fireplace_light') {
          animatingFireplaceLights.push(child);
        } else if (child.name === 'fireplace_flame') {
          animatingFireplaceFlames.push(child);
        } else if (child.name === 'structure_window') {
          animatingWindows.push(child);
        } else if (child.userData && child.userData.swayType) {
          animatingSwayingPlants.push(child);
        }
      });
    };

    // --- 6. RENDER PROCEDURAL LANDSCAPE GRID ---
    const build3DWorld = (currentMap: MapData) => {
      // Clear previous
      cellMeshes.length = 0;
      while (entityGroup.children.length > 0) {
        const obj = entityGroup.children[0];
        entityGroup.remove(obj);
      }

      const size = currentMap.grid ? currentMap.grid.length : 120;
      const centerCoord = size / 2;

      // Adjust focal camera limits based on world size only if not initialized
      if (!targetFocalPoint.x && !targetFocalPoint.z) {
        targetFocalPoint.set(centerCoord, 1, centerCoord);
        focalPoint.copy(targetFocalPoint);
      }

      // Render a dark protective bounding bed (plateau cliff base wrapping the bottom layer)
      // Representing our diorama frame - enlarged to support infinite scrolling
      const frameGeom = new THREE.BoxGeometry(5000, 5.0, 5000);
      const dioramaFrameMat = new THREE.MeshStandardMaterial({
        color: 0x1d1e21, // elegant charcoal bedrock slab
        roughness: 0.95,
        flatShading: true,
      });
      const frameMesh = new THREE.Mesh(frameGeom, dioramaFrameMat);
      // sit lower down
      frameMesh.position.set(60, -3.1, 60);
      frameMesh.receiveShadow = true;
      frameMesh.updateMatrix();
      frameMesh.matrixAutoUpdate = false;
      entityGroup.add(frameMesh);

      // Loop through loaded columns
      const loadedCells = currentMap.chunksByKey 
        ? Object.values(currentMap.chunksByKey).filter((chunk: any) => chunk.loaded).flatMap((chunk: any) => chunk.cells.flat())
        : (currentMap.grid ? currentMap.grid.flat().filter(cell => cell && cell.loaded !== false) : []);

      const eyeX = currentMap.eyePos?.x ?? 60;
      const eyeZ = currentMap.eyePos?.z ?? 60;
      const eyeRadius = currentMap.eyeRadius ?? 14.0;
      const renderRadiusSq = (eyeRadius + 2.0) * (eyeRadius + 2.0);

      for (const cell of loadedCells) {
        if (!cell) continue;
        const x = cell.x;
        const z = cell.z;
        
        let landHeight = cell.height;
        let isBedrockUndersea = false;

        // Undersea land adjustment - create a physical basin depression
        if (cell.biome === 'water') {
          landHeight = Math.max(0.1, cell.height - 0.7); // sink land down to create a basin
          isBedrockUndersea = true;
        }

        // Create standard columnar slice
        const baseMaterial = isBedrockUndersea ? materialCache.waterFloor : materialCache[cell.biome] || materialCache.grassland;
        const tileMat = baseMaterial.clone() as THREE.MeshStandardMaterial;
        
        // Apply storm/danger tint if outside the safe Eye area
        const dx = x - eyeX;
        const dz = z - eyeZ;
        const distSq = dx * dx + dz * dz;
        if (distSq > renderRadiusSq) {
          tileMat.color.setHex(0x52341b); // Blighted desert storm brown-rust
          tileMat.roughness = 0.98;
        } else {
          // Slight deterministic color jitter inside safe area
          const tileJitterH = (Math.sin(x * 11.3 + z * 31.1) * 0.012);
          const tileJitterS = (Math.cos(x * 19.4 + z * 13.2) * 0.02);
          const tileJitterL = (Math.sin(x * 41.6 + z * 73.9) * 0.045);
          if (tileMat.color) {
            tileMat.color.offsetHSL(tileJitterH, tileJitterS, tileJitterL);
          }
        }

        const tileMesh = new THREE.Mesh(
          geomPool.tile,
          tileMat
        );
        
        // Scale block vertically from Y=0 to elevate height
        tileMesh.scale.set(1.0, Math.max(0.1, landHeight), 1.0);
        tileMesh.position.set(x, landHeight / 2, z);
        tileMesh.castShadow = !isBedrockUndersea; // Sea floors don't cast shadows
        tileMesh.receiveShadow = true;

        tileMesh.updateMatrix();
        tileMesh.matrixAutoUpdate = false;

        // Wire metadata user data for picking
        tileMesh.userData = { cell };
        entityGroup.add(tileMesh);
        cellMeshes.push(tileMesh);

        // Add a flat translucent aesthetic water sheet if this is sea/lake
        if (cell.biome === 'water') {
          const waterThickness = 0.7; // Exactly fills the basin up to the original generated cutoff level
          let waterMat = translucentWaterMat;
          if (distSq > renderRadiusSq) {
            waterMat = translucentWaterMat.clone();
            waterMat.color.setHex(0x3e230e); // Murky/dusty sandstorm water
          }
          const waterMesh = new THREE.Mesh(geomPool.water, waterMat);
          
          waterMesh.scale.set(0.98, waterThickness, 0.98);
          waterMesh.position.set(x, landHeight + waterThickness / 2, z);
          waterMesh.userData = { cell };
          
          entityGroup.add(waterMesh);
          cellMeshes.push(waterMesh);

          // Register water node to float slightly during active rendering loop
          animatingWaterNodes.push({
            mesh: waterMesh,
            baseX: x,
            baseZ: z,
            baseY: landHeight + waterThickness / 2,
            bounceOffset: (x * 0.4 + z * 0.6) % (Math.PI * 2),
          });
        }
      }

      // --- FISH SPAWNING & LAKE DETECTION ---
      // Clear legacy fish
      while (fishGroup.children.length > 0) {
        const child = fishGroup.children[0];
        fishGroup.remove(child);
        child.traverse((node: any) => {
          if (node.isMesh) {
            node.geometry.dispose();
            if (Array.isArray(node.material)) {
              node.material.forEach((m) => m.dispose());
            } else {
              node.material.dispose();
            }
          }
        });
      }
      fishFlock.length = 0;

      // 1. Locate connected water bodies
      const visited = new Set<string>();
      const waterBodies: { x: number; z: number; cell: any; seaFloorHeight: number; surfaceHeight: number }[][] = [];

      // Helper function to safely fetch cells by world coordinate
      const getCellAtWorld = (currentMap: MapData, cx: number, cz: number) => {
        if (currentMap.chunksByKey) {
          const chunkX = Math.floor(cx / 6);
          const chunkZ = Math.floor(cz / 6);
          const chunkKey = `${chunkX},${chunkZ}`;
          const chunk = currentMap.chunksByKey[chunkKey];
          if (chunk) {
            const lx = cx - chunk.chunkX * 6;
            const lz = cz - chunk.chunkZ * 6;
            return chunk.cells[lx]?.[lz] || null;
          }
          return null;
        }
        return currentMap.grid?.[cx]?.[cz] || null;
      };

      for (const cell of loadedCells) {
        if (!cell || cell.biome !== 'water') continue;
        const tx = cell.x;
        const tz = cell.z;
        const key = `${tx},${tz}`;
        if (visited.has(key)) continue;

        const body: { x: number; z: number; cell: any; seaFloorHeight: number; surfaceHeight: number }[] = [];
        const queue: [number, number][] = [[tx, tz]];
        visited.add(key);

        while (queue.length > 0) {
          const [cx, cz] = queue.shift()!;
          const cCell = getCellAtWorld(currentMap, cx, cz);
          if (cCell) {
            const seaFloor = Math.max(0.1, cCell.height - 0.7);
            const surface = cCell.height;
            body.push({ x: cx, z: cz, cell: cCell, seaFloorHeight: seaFloor, surfaceHeight: surface });
          }

          const dirs = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
          ];
          for (const [dx, dz] of dirs) {
            const nx = cx + dx;
            const nz = cz + dz;
            const nKey = `${nx},${nz}`;
            
            const nCell = getCellAtWorld(currentMap, nx, nz);
            if (nCell && nCell.loaded !== false && nCell.biome === 'water' && !visited.has(nKey)) {
              visited.add(nKey);
              queue.push([nx, nz]);
            }
          }
        }

        // Require at least a 2x2 grid of water cells (size >= 4 contiguously)
        if (body.length >= 4) {
          waterBodies.push(body);
        }
      }

      // 2. Spawn flocking fish inside recognized water bodies
      waterBodies.forEach((body, lakeIndex) => {
        let sumX = 0;
        let sumZ = 0;
        let sumSurface = 0;
        let sumFloor = 0;
        body.forEach((c) => {
          sumX += c.x;
          sumZ += c.z;
          sumSurface += c.surfaceHeight;
          sumFloor += c.seaFloorHeight;
        });

        const lakeCenter = new THREE.Vector3(sumX / body.length, 0, sumZ / body.length);
        const avgSurface = sumSurface / body.length;
        const avgFloor = sumFloor / body.length;
        lakeCenter.y = (avgSurface + avgFloor) / 2;

        // Scale count of fish proportionally. The bigger the lake, the more fish are added for visual beauty!
        const fishCount = Math.min(24, Math.max(3, Math.floor(body.length * 0.45)));

        for (let i = 0; i < fishCount; i++) {
          const tile = body[Math.floor(Math.random() * body.length)];
          const spawnY = tile.seaFloorHeight + 0.15 + Math.random() * 0.35; // comfortable swimming region under surface

          const fGroup = new THREE.Group();

          // Select radiant low-poly custom palettes
          const colorRoll = Math.random();
          const fishColor = colorRoll < 0.38 
            ? 0xff8324 // Radiant Gold Koi
            : colorRoll < 0.72 
              ? 0x22a7ff // Azure Pacific Tang
              : 0xff3b6b; // Neon Pink Damsel

          // Make body cone point along Z axis
          const bodyGeom = new THREE.ConeGeometry(0.045, 0.16, 4);
          bodyGeom.rotateX(Math.PI / 2);

          const fishMat = new THREE.MeshStandardMaterial({
            color: fishColor,
            roughness: 0.25,
            metalness: 0.65,
            flatShading: true,
          });

          const bodyMesh = new THREE.Mesh(bodyGeom, fishMat);
          bodyMesh.castShadow = false;
          bodyMesh.receiveShadow = false;
          fGroup.add(bodyMesh);

          // Small tail fin cone mesh
          const tailGeom = new THREE.ConeGeometry(0.022, 0.07, 3);
          tailGeom.rotateX(Math.PI / 2);
          const tailMesh = new THREE.Mesh(tailGeom, fishMat);
          tailMesh.position.set(0, 0, -0.095);
          fGroup.add(tailMesh);

          // Disperse position organically
          fGroup.position.set(
            tile.x + (Math.random() * 0.6 - 0.3),
            spawnY,
            tile.z + (Math.random() * 0.6 - 0.3)
          );

          const angle = Math.random() * Math.PI * 2;
          const speed = 0.5 + Math.random() * 0.4;
          const velocity = new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);

          fishGroup.add(fGroup);

          fishFlock.push({
            group: fGroup,
            tailMesh,
            position: fGroup.position,
            velocity,
            lakeId: lakeIndex,
            lakeCenter,
            lakeCells: body,
            targetY: spawnY,
            speed,
            swimOffset: Math.random() * Math.PI * 2,
          });
        }
      });

      // Render initial dynamic asset layer
      rebuildDecorations(mapData, 0);
    };

    build3DWorld(mapData);

    // --- 8. FLOATING SELECTOR INDICATOR ---
    const selectorGeom = new THREE.RingGeometry(0.55, 0.63, 6);
    selectorGeom.rotateX(-Math.PI / 2); // align flat
    const selectorMat = new THREE.MeshBasicMaterial({
      color: 0xffd700, // sparkling gold border
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const selectorMesh = new THREE.Mesh(selectorGeom, selectorMat);
    selectorMesh.visible = false;
    scene.add(selectorMesh);

    // Dynamic bounding corner outlines for the selector
    const glowLineMat = new THREE.LineBasicMaterial({ color: 0xffea00 });
    const glowLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.48, 0, -0.48),
      new THREE.Vector3(-0.48, 0, 0.48),
      new THREE.Vector3(0.48, 0, 0.48),
      new THREE.Vector3(0.48, 0, -0.48),
      new THREE.Vector3(-0.48, 0, -0.48), // Close
    ]);
    const selectorBox = new THREE.Line(glowLineGeom, glowLineMat);
    selectorBox.position.copy(selectorMesh.position);
    selectorBox.visible = false;
    scene.add(selectorBox);

    // --- 9. EVENT LISTENERS: CAMERA NAVIGATION & DRAGS ---
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'arrowup', 's', 'arrowdown', 'a', 'arrowleft', 'd', 'arrowright'].includes(k)) {
        trackingEntityId = null;
        trackingEntityType = null;
      }
      if (k === 'w' || k === 'arrowup') keysPressed['w'] = true;
      if (k === 's' || k === 'arrowdown') keysPressed['s'] = true;
      if (k === 'a' || k === 'arrowleft') keysPressed['a'] = true;
      if (k === 'd' || k === 'arrowright') keysPressed['d'] = true;
      if (k === 'q') keysPressed['q'] = true;
      if (k === 'e') keysPressed['e'] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keysPressed['w'] = false;
      if (k === 's' || k === 'arrowdown') keysPressed['s'] = false;
      if (k === 'a' || k === 'arrowleft') keysPressed['a'] = false;
      if (k === 'd' || k === 'arrowright') keysPressed['d'] = false;
      if (k === 'q') keysPressed['q'] = false;
      if (k === 'e') keysPressed['e'] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      mouseDownButton = e.button;
      previousMousePosition.x = e.clientX;
      previousMousePosition.y = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      previousMousePosition.x = e.clientX;
      previousMousePosition.y = e.clientY;

      // Right mouse button (2) or Middle mouse (1) orbits camera rotation
      if (mouseDownButton === 2 || mouseDownButton === 1) {
        const sens = 0.007;
        targetTheta -= deltaX * sens;
        targetPhi = Math.max(0.12, Math.min(Math.PI / 2.05, targetPhi + deltaY * sens)); // Clamp polar angle
      } 
      // Left mouse button (0) drags and translates focal plane target point
      else if (mouseDownButton === 0) {
        const sens = 0.04;
        
        // Cancel camera tracking on manual drag panning
        trackingEntityId = null;
        trackingEntityType = null;

        // Calculate camera forward & right alignment in world space
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0; // flatten
        forward.normalize();

        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        right.y = 0;
        right.normalize();

        // Translate target focalPoint
        // Panning direction is inverted to feel like grabbing the land directly!
        targetFocalPoint.addScaledVector(right, -deltaX * sens * (cameraDistance / 35));
        targetFocalPoint.addScaledVector(forward, -deltaY * sens * (cameraDistance / 35));
      }
    };

    const handleMouseUp = () => {
      isMouseDown = false;
      mouseDownButton = -1;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const sens = 0.04;
      // Change camera zoom distance target smoothly
      targetDistance = Math.max(8.0, Math.min(65.0, targetDistance + e.deltaY * sens));
    };

    // Block right-click browser menu to permit flawless RTS right-click camera orbiting
    const preventContextMenu = (e: Event) => e.preventDefault();

    // Fetch cell at coordinate position supporting both flat grid and chunk-based systems
    const getCellAtWorldLoc = (m: MapData, tx: number, tz: number) => {
      if (!m) return null;
      if (m.chunksByKey) {
        const chunkX = Math.floor(tx / 6);
        const chunkZ = Math.floor(tz / 6);
        const chunkKey = `${chunkX},${chunkZ}`;
        const chunk = m.chunksByKey[chunkKey];
        if (chunk) {
          const lx = tx - chunk.chunkX * 6;
          const lz = tz - chunk.chunkZ * 6;
          return chunk.cells[lx]?.[lz] || null;
        }
        return null;
      }
      return m.grid?.[tx]?.[tz] || null;
    };

    // Raycast click picker
    const raycaster = new THREE.Raycaster();
    const mouseRelativePos = new THREE.Vector2();

    const handleCanvasClick = (e: MouseEvent) => {
      // Lazy initialise the browser audio engine on first click
      try {
        ambientAudioEngine.init();
        ambientAudioEngine.resume();
      } catch (err) {
        console.warn('Audio start blocked by browser action restrictions:', err);
      }

      // Pick cell ONLY on short, deliberate left clicks (excluding drags)
      if (mouseDownButton !== -1 && mouseDownButton !== 0) return;

      // Calculate relative viewport bounds
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRelativePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRelativePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseRelativePos, camera);
      const intersects = raycaster.intersectObjects([...cellMeshes, ...actorGroup.children], true);

      if (intersects.length > 0) {
        // Retrieve cell or tribesperson bind metadata of picked node
        let cellObj: THREE.Object3D | null = intersects[0].object;
        let cellData: CellInfo | null = null;
        let personData: Tribesperson | null = null;
        let animalData: any = null;
        
        while (cellObj) {
          if (cellObj.userData) {
            if (cellObj.userData.person) {
              personData = cellObj.userData.person;
              break;
            }
            if (cellObj.userData.animal) {
              animalData = cellObj.userData.animal;
              break;
            }
            if (cellObj.userData.cell) {
              cellData = cellObj.userData.cell;
              break;
            }
          }
          cellObj = cellObj.parent;
        }

        if (personData) {
          propsRef.current.onSelectTribesperson(personData);
          propsRef.current.onSelectCell(null);
          if (trackingEntityId !== personData.id) {
            trackingEntityId = null;
            trackingEntityType = null;
          }
        } else if (animalData) {
          const mapData = propsRef.current.mapData;
          if (mapData) {
            const ax = Math.round(animalData.x);
            const az = Math.round(animalData.z);
            const cellAtAnimal = getCellAtWorldLoc(mapData, ax, az);
            if (cellAtAnimal) {
              propsRef.current.onSelectCell(cellAtAnimal);
              propsRef.current.onSelectTribesperson(null);
            }
          }
          if (trackingEntityId !== animalData.id) {
            trackingEntityId = null;
            trackingEntityType = null;
          }
        } else if (cellData) {
          propsRef.current.onSelectCell(cellData);
          propsRef.current.onSelectTribesperson(null);
          trackingEntityId = null;
          trackingEntityType = null;
        }
      } else {
        // Clear click empty region
        propsRef.current.onSelectCell(null);
        propsRef.current.onSelectTribesperson(null);
        trackingEntityId = null;
        trackingEntityType = null;
      }
    };

    const handleCanvasDblClick = (e: MouseEvent) => {
      if (mouseDownButton !== -1 && mouseDownButton !== 0) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouseRelativePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRelativePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseRelativePos, camera);
      const intersects = raycaster.intersectObjects([...cellMeshes, ...actorGroup.children], true);

      if (intersects.length > 0) {
        let cellObj: THREE.Object3D | null = intersects[0].object;
        let personData: Tribesperson | null = null;
        let animalData: any = null;
        
        while (cellObj) {
          if (cellObj.userData) {
            if (cellObj.userData.person) {
              personData = cellObj.userData.person;
              break;
            }
            if (cellObj.userData.animal) {
              animalData = cellObj.userData.animal;
              break;
            }
          }
          cellObj = cellObj.parent;
        }

        if (personData) {
          trackingEntityId = personData.id;
          trackingEntityType = 'person';
          propsRef.current.onSelectTribesperson(personData);
          propsRef.current.onSelectCell(null);
        } else if (animalData) {
          trackingEntityId = animalData.id;
          trackingEntityType = 'animal';
          const mapData = propsRef.current.mapData;
          if (mapData) {
            const ax = Math.round(animalData.x);
            const az = Math.round(animalData.z);
            const cellAtAnimal = getCellAtWorldLoc(mapData, ax, az);
            if (cellAtAnimal) {
              propsRef.current.onSelectCell(cellAtAnimal);
              propsRef.current.onSelectTribesperson(null);
            }
          }
        }
      }
    };

    // Bind listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
    renderer.domElement.addEventListener('contextmenu', preventContextMenu);
    renderer.domElement.addEventListener('click', handleCanvasClick);
    renderer.domElement.addEventListener('dblclick', handleCanvasDblClick);

    // Initial load finish confirmation
    setIsReady(true);

    // --- 10. ANIMATION & INTEGRATION RENDER LOOP ---
    const clock = new THREE.Clock();
    let frameId: number;
    let lastRenderedMapDataRef: MapData | null = null;
    let lastGridSignature = '';
    let lastLoadedChunksSignature = '';
    let lastChunkLoadToken = -1;
    let lastDecorationsRevision = -1;
    let frameCount = 0;

    const getLoadedChunksSignature = (currentMap: MapData) => {
      let signature = '';
      if (!currentMap) return signature;
      if (currentMap.chunksByKey) {
        for (const [key, chunk] of Object.entries(currentMap.chunksByKey)) {
          if (chunk.loaded) {
            signature += `${key};`;
          }
        }
      } else if (currentMap.grid) {
        const size = currentMap.grid.length;
        for (let x = 0; x < size; x += 6) {
          for (let z = 0; z < size; z += 6) {
            const cell = currentMap.grid[x]?.[z];
            if (cell && cell.loaded !== false) {
              signature += `${Math.floor(x/6)},${Math.floor(z/6)};`;
            }
          }
        }
      }
      return signature;
    };

    const animateLoop = () => {
      frameId = requestAnimationFrame(animateLoop);
      
      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();

      const latestProps = propsRef.current;

      // Realtime Chunk & Decoration Sync using ultra-fast revision tokens
      if (latestProps.mapData) {
        const chunkLoadToken = latestProps.mapData.chunkLoadToken ?? 0;
        const decorationsRev = latestProps.mapData.decorationsRevision ?? 0;

        let needsWorldRebuild = chunkLoadToken !== lastChunkLoadToken;
        let needsDecorationsRebuild = decorationsRev !== lastDecorationsRevision;

        // Fallback staggered check (every 30 frames) to be 100% sure we didn't miss any direct modifications
        frameCount++;
        if (frameCount >= 30) {
          frameCount = 0;
          
          const currentChunksSig = getLoadedChunksSignature(latestProps.mapData);
          if (currentChunksSig !== lastLoadedChunksSignature) {
            lastLoadedChunksSignature = currentChunksSig;
            needsWorldRebuild = true;
          }

          const currentSig = getGridDecorationsSignature(latestProps.mapData);
          if (currentSig !== lastGridSignature) {
            lastGridSignature = currentSig;
            needsDecorationsRebuild = true;
          }
        }

        if (needsWorldRebuild) {
          lastChunkLoadToken = chunkLoadToken;
          build3DWorld(latestProps.mapData); // Rebuild 3D terrain tiles dynamically!
          needsDecorationsRebuild = true; // Always rebuild decorations when world chunks change
        }

        if (needsDecorationsRebuild) {
          lastDecorationsRevision = decorationsRev;
          rebuildDecorations(latestProps.mapData, elapsed); // Rebuild decoration meshes!
        }
        
        lastRenderedMapDataRef = latestProps.mapData;
      }

      // Calculate day/night fireplace glow multiplier (smaller/dimmer in daytime, full in nighttime)
      let fireplaceGlowFactor = 1.0;
      const tOfDay = latestProps.timeOfDay;
      if (tOfDay < 0.2) {
        fireplaceGlowFactor = 1.0;
      } else if (tOfDay >= 0.2 && tOfDay < 0.3) {
        fireplaceGlowFactor = 1.0 - ((tOfDay - 0.2) / 0.1) * 0.98;
      } else if (tOfDay >= 0.3 && tOfDay < 0.7) {
        fireplaceGlowFactor = 0.02; // extremely small and dim during peak daytime!
      } else if (tOfDay >= 0.7 && tOfDay < 0.82) {
        fireplaceGlowFactor = 0.02 + ((tOfDay - 0.7) / 0.12) * 0.98;
      } else {
        fireplaceGlowFactor = 1.0;
      }

      // Read graphics quality setting to toggle expensive features on the fly
      const isLowGraphics = latestProps.mapData?.settings?.graphicsLevel === 'Low';
      if (sunLight) sunLight.castShadow = !isLowGraphics;
      if (moonLight) moonLight.castShadow = !isLowGraphics;

      // Rotate active workshop hammers
      animatingHammers.forEach((child) => {
        child.rotation.z = Math.sin(elapsed * 12.0) * 0.45 + 0.35;
      });

      // Animate fireplace lights (dim/distance depending on day/night)
      animatingFireplaceLights.forEach((child) => {
        if (child instanceof THREE.PointLight) {
          child.intensity = 0.02 + 2.48 * fireplaceGlowFactor;
          child.distance = 1.2 + 4.8 * fireplaceGlowFactor;
        }
      });

      // Animate fireplace flames (scaling + flicker)
      animatingFireplaceFlames.forEach((child) => {
        const baseScale = 0.18 + 0.82 * fireplaceGlowFactor;
        const flicker = Math.sin(elapsed * 24.0) * 0.02;
        const scaleVal = Math.max(0.1, baseScale + flicker);
        child.scale.set(scaleVal, scaleVal, scaleVal);
      });

      // Gradually illuminate structure windows at night
      animatingWindows.forEach((child) => {
        let windowLightFactor = 0;
        if (tOfDay >= 0.7 && tOfDay < 0.85) {
          windowLightFactor = (tOfDay - 0.7) / 0.15;
        } else if (tOfDay >= 0.85 || tOfDay < 0.2) {
          windowLightFactor = 1.0;
        } else if (tOfDay >= 0.2 && tOfDay < 0.35) {
          windowLightFactor = 1.0 - (tOfDay - 0.2) / 0.15;
        }
        const mesh = child as any;
        if (mesh.material && 'emissiveIntensity' in mesh.material) {
          mesh.material.emissiveIntensity = windowLightFactor * 2.5;
        }
      });

      // Apply dynamic wind sways to plants (completely disabled on low graphics to save massive CPU)
      if (!isLowGraphics) {
        animatingSwayingPlants.forEach((child) => {
          const sType = child.userData.swayType;
          const px = child.position.x + (child.parent?.position.x ?? 0);
          const pz = child.position.z + (child.parent?.position.z ?? 0);

          if (sType === 'whipgrass') {
            child.rotation.z = Math.sin(elapsed * 3.6 + px * 1.5) * 0.12;
            child.rotation.x = Math.cos(elapsed * 3.2 + pz * 1.2) * 0.08;
          } else if (sType === 'rootweave') {
            child.rotation.z = Math.sin(elapsed * 2.4 + px * 2.0) * 0.045;
          } else if (sType === 'dunethorn') {
            child.rotation.z = Math.sin(elapsed * 1.2 + px * 0.8) * 0.016;
            child.rotation.x = Math.cos(elapsed * 1.1 + pz * 0.8) * 0.012;
          } else if (sType === 'succulent') {
            child.rotation.z = Math.sin(elapsed * 0.8 + px * 0.5) * 0.01;
          } else if (sType === 'sporebloom') {
            child.rotation.z = Math.sin(elapsed * 2.8 + px * 1.8) * 0.04;
            child.rotation.y = Math.cos(elapsed * 1.4) * 0.03;
          } else if (sType === 'sandfruit') {
            child.rotation.z = Math.sin(elapsed * 1.6 + px * 1.2) * 0.02;
          }
        });
      }

      // 1. WASD camera target shifting (relative to current theta angle)
      const moveSpeed = 0.35 * (cameraDistance / 28);
      const shiftVector = new THREE.Vector3(0, 0, 0);

      // Camera horizontal directional helpers
      const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      lookDir.y = 0;
      lookDir.normalize();

      const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      rightDir.y = 0;
      rightDir.normalize();

      if (keysPressed['w']) {
        shiftVector.addScaledVector(lookDir, moveSpeed);
      }
      if (keysPressed['s']) {
        shiftVector.addScaledVector(lookDir, -moveSpeed);
      }
      if (keysPressed['a']) {
        shiftVector.addScaledVector(rightDir, -moveSpeed);
      }
      if (keysPressed['d']) {
        shiftVector.addScaledVector(rightDir, moveSpeed);
      }

      // Q and E rotation
      const rotSpeed = 1.5 * delta;
      if (keysPressed['q']) {
        targetTheta -= rotSpeed;
      }
      if (keysPressed['e']) {
        targetTheta += rotSpeed;
      }

      // Keep focus bounds within map size margins to keep diorama centered - expanded for procedural scroll
      const minLimit = -1000;
      const maxLimit = 2000;
      
      targetFocalPoint.add(shiftVector);
      targetFocalPoint.x = Math.max(minLimit, Math.min(maxLimit, targetFocalPoint.x));
      targetFocalPoint.z = Math.max(minLimit, Math.min(maxLimit, targetFocalPoint.z));

      // Convert camera position to chunk coordinates and trigger loading if it shifts
      const camChunkX = Math.floor(targetFocalPoint.x / 6);
      const camChunkZ = Math.floor(targetFocalPoint.z / 6);
      if (camChunkX !== lastCamChunkX.current || camChunkZ !== lastCamChunkZ.current) {
        lastCamChunkX.current = camChunkX;
        lastCamChunkZ.current = camChunkZ;
        if (latestProps.onCameraMove) {
          latestProps.onCameraMove({ x: targetFocalPoint.x, z: targetFocalPoint.z });
        }
      }

      // --- 1.5 Smoothly track Entity (or Eye center position when not active with keyboard or dragging) ---
      const keysUsed = keysPressed['w'] || keysPressed['a'] || keysPressed['s'] || keysPressed['d'];
      if (keysUsed) {
        lastUserInteractionTime = elapsed;
        trackingEntityId = null;
        trackingEntityType = null;
      }

      // Check external selected entity change to keep tracking in sync
      const currentSelectedPersonId = latestProps.selectedTribesperson?.id || null;
      if (trackingEntityType === 'person' && trackingEntityId !== currentSelectedPersonId) {
        trackingEntityId = null;
        trackingEntityType = null;
      }
      const currentSelectedCellCoords = latestProps.selectedCell ? `${latestProps.selectedCell.x},${latestProps.selectedCell.z}` : null;
      if (trackingEntityType === 'animal') {
        const trackedAnimal = latestProps.mapData?.animals?.find((a: any) => a.id === trackingEntityId);
        if (trackedAnimal) {
          const ax = Math.round(trackedAnimal.x);
          const az = Math.round(trackedAnimal.z);
          if (currentSelectedCellCoords !== `${ax},${az}`) {
            trackingEntityId = null;
            trackingEntityType = null;
          }
        } else {
          trackingEntityId = null;
          trackingEntityType = null;
        }
      }

      let entityTargetX: number | null = null;
      let entityTargetZ: number | null = null;

      if (trackingEntityId) {
        if (trackingEntityType === 'person') {
          const person = latestProps.tribe?.find((t: any) => t.id === trackingEntityId);
          if (person && person.isAlive) {
            entityTargetX = person.x;
            entityTargetZ = person.z;
          } else {
            trackingEntityId = null;
            trackingEntityType = null;
          }
        } else if (trackingEntityType === 'animal') {
          const animal = latestProps.mapData?.animals?.find((a: any) => a.id === trackingEntityId);
          if (animal && !animal.isDead) {
            entityTargetX = animal.x;
            entityTargetZ = animal.z;
          } else {
            trackingEntityId = null;
            trackingEntityType = null;
          }
        }
      }

      if (entityTargetX !== null && entityTargetZ !== null) {
        targetFocalPoint.x = entityTargetX;
        targetFocalPoint.z = entityTargetZ;
      } else {
        const hasEyePos = latestProps.mapData?.eyePos !== undefined;
        const isMigrating = latestProps.mapData?.eyeMovementState === 'migrating';

        if (hasEyePos && (elapsed - lastUserInteractionTime > 3.0 || isMigrating)) {
          const eyeX = latestProps.mapData.eyePos.x;
          const eyeZ = latestProps.mapData.eyePos.z;
          targetFocalPoint.x += (eyeX - targetFocalPoint.x) * 0.04;
          targetFocalPoint.z += (eyeZ - targetFocalPoint.z) * 0.04;
        }
      }

      // --- 1.6 Update Storm Wall position, scale, and spin rotation ---
      if (latestProps.mapData) {
        const eyeX = latestProps.mapData.eyePos?.x ?? 60;
        const eyeZ = latestProps.mapData.eyePos?.z ?? 60;
        const eyeRadius = latestProps.mapData.eyeRadius ?? 14.0;

        stormWallGroup.position.set(eyeX, 0, eyeZ);

        // Cylinder base radius in geom is 14.0
        const scaleFactor = eyeRadius / 14.0;
        stormWallMesh.scale.set(scaleFactor, 1.0, scaleFactor);
        stormOuterRingMesh.scale.set(scaleFactor, 1.0, scaleFactor);

        // Rotations
        stormWallMesh.rotation.y = -elapsed * 0.08;
        stormOuterRingMesh.rotation.y = elapsed * 0.22;

        // Dynamic Lightning flickers/flashes inside the sandstorm
        if (Math.random() < 0.012) {
          stormLightningLight.intensity = 1.8 + Math.random() * 2.2;
          // Randomly position the lightning point inside the storm wall to create asymmetric glow
          const flashAngle = Math.random() * Math.PI * 2;
          stormLightningLight.position.set(Math.cos(flashAngle) * eyeRadius, 4.0 + Math.random() * 8.0, Math.sin(flashAngle) * eyeRadius);
        } else {
          stormLightningLight.intensity *= 0.82; // rapid decay for snappy flashes
        }

        // Camera-facing opacity fading for inner and outer panels to keep center village readable
        const camAngle = Math.atan2(camera.position.z - eyeZ, camera.position.x - eyeX);
        const fadeRange = Math.PI / 1.8; // Wider smooth fade window (around 100 degrees)

        innerWallPanels.forEach((panel) => {
          const baseAngle = panel.userData.angle;
          const worldAngle = baseAngle + stormWallMesh.rotation.y;
          // Map Three.js cylinder angle to standard polar angle
          const panelPolarAngle = Math.atan2(Math.cos(worldAngle), Math.sin(worldAngle));
          
          let diff = Math.abs(panelPolarAngle - camAngle);
          diff = diff % (Math.PI * 2);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;

          const minOpacity = 0.02; // extremely low opacity so it does not block the view
          const maxOpacity = 0.45;

          if (diff < fadeRange) {
            const ratio = diff / fadeRange;
            (panel.material as THREE.MeshBasicMaterial).opacity = minOpacity + ratio * (maxOpacity - minOpacity);
          } else {
            (panel.material as THREE.MeshBasicMaterial).opacity = maxOpacity;
          }
        });

        outerWallPanels.forEach((panel) => {
          const baseAngle = panel.userData.angle;
          const worldAngle = baseAngle + stormOuterRingMesh.rotation.y;
          // Map Three.js cylinder angle to standard polar angle
          const panelPolarAngle = Math.atan2(Math.cos(worldAngle), Math.sin(worldAngle));
          
          let diff = Math.abs(panelPolarAngle - camAngle);
          diff = diff % (Math.PI * 2);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;

          const minOpacity = 0.01;
          const maxOpacity = 0.35;

          if (diff < fadeRange) {
            const ratio = diff / fadeRange;
            (panel.material as THREE.MeshBasicMaterial).opacity = minOpacity + ratio * (maxOpacity - minOpacity);
          } else {
            (panel.material as THREE.MeshBasicMaterial).opacity = maxOpacity;
          }
        });

        // Orbit and animate the sandstorm debris around the storm wall boundary
        debrisMeshes.forEach((mesh) => {
          const ud = mesh.userData;
          ud.angle += delta * ud.speed;
          
          const currentRadius = eyeRadius + ud.radiusOffset;
          const wobble = Math.sin(elapsed * ud.wobbleSpeed + ud.wobbleOffset) * ud.wobbleAmount;
          
          const posX = Math.cos(ud.angle) * currentRadius;
          const posZ = Math.sin(ud.angle) * currentRadius;
          const posY = 0.5 + ud.heightPercent * 16.0 + wobble;
          
          mesh.position.set(posX, posY, posZ);
          
          mesh.rotation.x += delta * (ud.rotSpeedX || 2.0);
          mesh.rotation.y += delta * (ud.rotSpeedY || 1.5);
        });
      }

      // --- 1.6.5 Update and Render Caravan Wagon/Cart in Diorama ---
      let fireplacePos: { x: number; y: number; z: number } | null = null;
      if (latestProps.mapData?.grid) {
        const size = latestProps.mapData.grid.length;
        for (let r = 0; r < size; r++) {
          const row = latestProps.mapData.grid[r];
          if (row) {
            for (let c = 0; c < size; c++) {
              const cell = row[c];
              if (cell && cell.structure?.type === 'Fireplace') {
                fireplacePos = { x: r, y: cell.height, z: c };
                break;
              }
            }
          }
          if (fireplacePos) break;
        }
      }

      const isTraveling = latestProps.mapData?.isMigrationTravelActive;
      const caravanPos = latestProps.mapData?.caravanPos;
      const bigBeastTamedAndTransport = latestProps.mapData?.animals?.filter((ani: any) => 
        ani.isTame && 
        ani.assignedJobType === 'transport' && 
        !['JackLeaper', 'TuskedShagBeast', 'GlowGrub', 'CinderCentipede', 'PricklyBeetle', 'Rabbit', 'Sheep', 'WildGoat'].includes(ani.type)
      ) || [];

      if ((fireplacePos && latestProps.mapData?.isPackingCaravan) || (isTraveling && caravanPos && bigBeastTamedAndTransport.length > 0)) {
        caravanMeshGroup.visible = true;
        if (isTraveling && caravanPos) {
          caravanMeshGroup.position.set(caravanPos.x, 0.45, caravanPos.z);
          
          if (latestProps.mapData?.eyeTargetPos) {
            const dx = latestProps.mapData.eyeTargetPos.x - caravanPos.x;
            const dz = latestProps.mapData.eyeTargetPos.z - caravanPos.z;
            caravanMeshGroup.rotation.y = Math.atan2(dx, dz) + Math.PI;
          }
        } else if (fireplacePos) {
          caravanMeshGroup.position.set(fireplacePos.x + 1.2, fireplacePos.y + 0.1, fireplacePos.z + 1.2);
          caravanMeshGroup.rotation.y = 0;
        }
        
        const progress = latestProps.mapData.packingProgress ?? 0;
        const progressKey = `${progress}_${latestProps.mapData.caravanInventory.items ? Object.keys(latestProps.mapData.caravanInventory.items).length : 0}`;
        if ((caravanMeshGroup as any).lastProgressKey !== progressKey) {
          (caravanMeshGroup as any).lastProgressKey = progressKey;
          
          // Clear children safely
          while (caravanMeshGroup.children.length > 0) {
            const child = caravanMeshGroup.children[0];
            if ((child as any).geometry) (child as any).geometry.dispose();
            if ((child as any).material) {
              if (Array.isArray((child as any).material)) {
                (child as any).material.forEach((m: any) => m.dispose());
              } else {
                (child as any).material.dispose();
              }
            }
            caravanMeshGroup.remove(child);
          }
          
          // Platform
          const platGeom = new THREE.BoxGeometry(1.4, 0.15, 2.0);
          const platMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, flatShading: true });
          const platform = new THREE.Mesh(platGeom, platMat);
          platform.position.y = 0.35;
          caravanMeshGroup.add(platform);
          
          // Wheels
          const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 8);
          wheelGeom.rotateZ(Math.PI / 2);
          const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8, flatShading: true });
          const wheelFL = new THREE.Mesh(wheelGeom, wheelMat);
          wheelFL.position.set(-0.75, 0.35, 0.6);
          const wheelFR = new THREE.Mesh(wheelGeom, wheelMat);
          wheelFR.position.set(0.75, 0.35, 0.6);
          const wheelBL = new THREE.Mesh(wheelGeom, wheelMat);
          wheelBL.position.set(-0.75, 0.35, -0.6);
          const wheelBR = new THREE.Mesh(wheelGeom, wheelMat);
          wheelBR.position.set(0.75, 0.35, -0.6);
          caravanMeshGroup.add(wheelFL);
          caravanMeshGroup.add(wheelFR);
          caravanMeshGroup.add(wheelBL);
          caravanMeshGroup.add(wheelBR);
          
          // Shafts
          const shaftGeom = new THREE.BoxGeometry(0.08, 0.08, 1.2);
          const shaftL = new THREE.Mesh(shaftGeom, platMat);
          shaftL.position.set(-0.3, 0.35, 1.1);
          const shaftR = new THREE.Mesh(shaftGeom, platMat);
          shaftR.position.set(0.3, 0.35, 1.1);
          caravanMeshGroup.add(shaftL);
          caravanMeshGroup.add(shaftR);
          
          // Piled Cargo bundles based on progress
          if (progress > 10) {
            const bundle1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), new THREE.MeshStandardMaterial({ color: 0xcd853f, roughness: 0.9, flatShading: true }));
            bundle1.position.set(-0.25, 0.7, -0.35);
            caravanMeshGroup.add(bundle1);
          }
          if (progress > 35) {
            const bundle2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.7), new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9, flatShading: true }));
            bundle2.position.set(0.25, 0.68, -0.3);
            caravanMeshGroup.add(bundle2);
          }
          if (progress > 60) {
            const bundle3 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 6), new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9, flatShading: true }));
            bundle3.rotation.z = Math.PI / 2;
            bundle3.position.set(0, 1.0, -0.35);
            caravanMeshGroup.add(bundle3);
          }
          if (progress > 85) {
            const flagGeom = new THREE.ConeGeometry(0.12, 0.4, 4);
            flagGeom.rotateX(Math.PI / 2);
            const flag = new THREE.Mesh(flagGeom, new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 0.8 }));
            flag.position.set(0, 1.3, 0.35);
            caravanMeshGroup.add(flag);
          }
          
          // Pack animal harness in front
          const harnessBeast = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0xbc7c43, roughness: 0.9, flatShading: true }));
          harnessBeast.position.set(0, 0.65, 2.0);
          caravanMeshGroup.add(harnessBeast);
          
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.5), new THREE.MeshStandardMaterial({ color: 0xbc7c43, roughness: 0.9, flatShading: true }));
          head.position.set(0, 1.15, 2.4);
          caravanMeshGroup.add(head);
          
          const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.08), platMat);
          yoke.position.set(0, 0.6, 1.5);
          caravanMeshGroup.add(yoke);
        }
      } else {
        caravanMeshGroup.visible = false;
      }

      // --- 1.7 Update debug pathway preview dots ---
      while (debugPathGroup.children.length > 0) {
        debugPathGroup.remove(debugPathGroup.children[0]);
      }

      if (latestProps.mapData?.futureEyePath) {
        const getCellHeightAtWorld = (m: MapData, tx: number, tz: number) => {
          if (m.chunksByKey) {
            const chunkX = Math.floor(tx / 6);
            const chunkZ = Math.floor(tz / 6);
            const chunkKey = `${chunkX},${chunkZ}`;
            const chunk = m.chunksByKey[chunkKey];
            if (chunk) {
              const lx = tx - chunk.chunkX * 6;
              const lz = tz - chunk.chunkZ * 6;
              return chunk.cells[lx]?.[lz]?.height ?? 0;
            }
            return 0;
          }
          return m.grid?.[tx]?.[tz]?.height ?? 0;
        };

        latestProps.mapData.futureEyePath.forEach((pt: any) => {
          const dotGeom = new THREE.SphereGeometry(0.2, 8, 8);
          const dotMat = new THREE.MeshBasicMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0.75,
          });
          const dotMesh = new THREE.Mesh(dotGeom, dotMat);
          
          const cellY = getCellHeightAtWorld(latestProps.mapData, Math.round(pt.x), Math.round(pt.z));
          
          dotMesh.position.set(pt.x, cellY + 0.15, pt.z);
          debugPathGroup.add(dotMesh);
        });
      }

      // --- 1.8 Chunk Streaming and Camera Culling ---
      // Handled in a single unified, highly optimized pass below after camera coordinates are updated.

      // 2. Linear interpolate dampening on camera values for high-end cinematic smoothness
      const dampRatio = 0.12;
      focalPoint.lerp(targetFocalPoint, dampRatio);
      cameraDistance += (targetDistance - cameraDistance) * dampRatio;
      cameraTheta += (targetTheta - cameraTheta) * dampRatio;
      cameraPhi += (targetPhi - cameraPhi) * dampRatio;

      // 3. Update spherical camera coordinates
      camera.position.set(
        focalPoint.x + cameraDistance * Math.sin(cameraPhi) * Math.sin(cameraTheta),
        focalPoint.y + cameraDistance * Math.cos(cameraPhi),
        focalPoint.z + cameraDistance * Math.sin(cameraPhi) * Math.cos(cameraTheta)
      );
      camera.lookAt(focalPoint);

      // 3.5. Distance-based view/focal-distance and Storm Eye culling optimization
      if (latestProps.mapData) {
        const eyeX = latestProps.mapData.eyePos?.x ?? 60;
        const eyeZ = latestProps.mapData.eyePos?.z ?? 60;
        const eyeRadius = latestProps.mapData.eyeRadius ?? 14.0;
        
        // Render only inside the storm and right surrounding it (margin of 4.5 tiles)
        const renderRadius = eyeRadius + 4.5;
        const renderRadiusSq = renderRadius * renderRadius;

        const maxCullDist = Math.max(22, cameraDistance * 1.05 + 8);
        const maxCullDistSq = maxCullDist * maxCullDist;

        entityGroup.children.forEach((child) => {
          // Keep active underlying bedrock frame mesh always loaded
          if (child.position.y < -2) {
            child.visible = true;
            return;
          }
          const dxEye = child.position.x - eyeX;
          const dzEye = child.position.z - eyeZ;
          const distEyeSq = dxEye * dxEye + dzEye * dzEye;

          const dxCam = child.position.x - focalPoint.x;
          const dzCam = child.position.z - focalPoint.z;
          const distCamSq = dxCam * dxCam + dzCam * dzCam;

          child.visible = (distEyeSq <= renderRadiusSq) && (distCamSq < maxCullDistSq);
        });

        decorationsGroup.children.forEach((child) => {
          const dxEye = child.position.x - eyeX;
          const dzEye = child.position.z - eyeZ;
          const distEyeSq = dxEye * dxEye + dzEye * dzEye;

          const dxCam = child.position.x - focalPoint.x;
          const dzCam = child.position.z - focalPoint.z;
          const distCamSq = dxCam * dxCam + dzCam * dzCam;

          child.visible = (distEyeSq <= renderRadiusSq) && (distCamSq < maxCullDistSq);
        });

        actorGroup.children.forEach((child) => {
          const dxEye = child.position.x - eyeX;
          const dzEye = child.position.z - eyeZ;
          const distEyeSq = dxEye * dxEye + dzEye * dzEye;

          const dxCam = child.position.x - focalPoint.x;
          const dzCam = child.position.z - focalPoint.z;
          const distCamSq = dxCam * dxCam + dzCam * dzCam;

          child.visible = (distEyeSq <= renderRadiusSq) && (distCamSq < maxCullDistSq);
        });

        fishGroup.children.forEach((child) => {
          const dxEye = child.position.x - eyeX;
          const dzEye = child.position.z - eyeZ;
          const distEyeSq = dxEye * dxEye + dzEye * dzEye;

          const dxCam = child.position.x - focalPoint.x;
          const dzCam = child.position.z - focalPoint.z;
          const distCamSq = dxCam * dxCam + dzCam * dzCam;

          child.visible = (distEyeSq <= renderRadiusSq) && (distCamSq < maxCullDistSq);
        });
      }

      // 4. Update the highlight selector ring if a tile is selected
      if (latestProps.selectedCell) {
        const cell = latestProps.selectedCell;
        
        let surfaceHeight = cell.height;
        if (cell.biome === 'water') {
          surfaceHeight = Math.max(0.1, cell.height - 0.7) + 0.7; // snap highlight to actual sea surface level
        }

        selectorMesh.visible = true;
        selectorBox.visible = true;

        // Hover slightly above surface to prevent clipping
        const floatHeight = surfaceHeight + 0.08 + Math.sin(elapsed * 5) * 0.03;
        
        selectorMesh.position.set(cell.x, floatHeight, cell.z);
        selectorBox.position.set(cell.x, floatHeight, cell.z);

        // Slow loop rotation for neat scanning visual appeal
        selectorMesh.rotation.y = elapsed * 0.8;
      } else {
        selectorMesh.visible = false;
        selectorBox.visible = false;
      }

      // 5. Animate fluid low-poly water ripples
      animatingWaterNodes.forEach(({ mesh, bounceOffset, baseY }) => {
        if (!mesh.visible) return;
        // Simple subtle low poly vertical ripple
        const rate = 1.2;
        const scale = 0.08;
        mesh.position.y = baseY + Math.sin(elapsed * rate + bounceOffset) * scale;
      });

      // 5b. Ambient Low-Poly Audio State Tracker
      if (Math.floor(elapsed * 60) % 15 === 0) {
        const focusGridX = Math.round(focalPoint.x);
        const focusGridZ = Math.round(focalPoint.z);
        
        const getCellAtWorldLoc = (currentMap: MapData, cx: number, cz: number) => {
          if (currentMap.chunksByKey) {
            const chunkX = Math.floor(cx / 6);
            const chunkZ = Math.floor(cz / 6);
            const chunkKey = `${chunkX},${chunkZ}`;
            const chunk = currentMap.chunksByKey[chunkKey];
            if (chunk) {
              const lx = cx - chunk.chunkX * 6;
              const lz = cz - chunk.chunkZ * 6;
              return chunk.cells[lx]?.[lz] || null;
            }
            return null;
          }
          return currentMap.grid?.[cx]?.[cz] || null;
        };

        const focusCell = getCellAtWorldLoc(latestProps.mapData, focusGridX, focusGridZ);
        const activeBiome = focusCell ? focusCell.biome : 'grassland';
        const isNight = latestProps.timeOfDay < 0.25 || latestProps.timeOfDay > 0.75;
        ambientAudioEngine.updateAmbientZone(activeBiome, isNight);

        // Periodic spatial audio dispatcher (every 2.2 seconds) with distance attenuation relative to focalPoint
        const now = elapsed;
        if (now - lastSpatialSoundTimeRef.current > 2.2) {
          lastSpatialSoundTimeRef.current = now;
          
          const eyeX = latestProps.mapData.eyePos?.x ?? 60;
          const eyeZ = latestProps.mapData.eyePos?.z ?? 60;
          const eyeRadius = latestProps.mapData.eyeRadius ?? 14.0;
          const camToEyeDist = Math.hypot(focalPoint.x - eyeX, focalPoint.z - eyeZ);
          
          if (camToEyeDist > eyeRadius - 4.0) {
            ambientAudioEngine.playSpatialSound('storm_rumble', focalPoint.x, focalPoint.z, focalPoint.x, focalPoint.z);
          } else {
            const nearbyAnimals = latestProps.mapData.animals?.filter((a: any) => !a.isDead && Math.hypot(a.x - focalPoint.x, a.z - focalPoint.z) < 14) || [];
            const nearbyVillagers = latestProps.tribe?.filter((v: any) => v.isAlive && Math.hypot(v.x - focalPoint.x, v.z - focalPoint.z) < 14) || [];
            
            const rand = Math.random();
            if (rand < 0.35 && nearbyAnimals.length > 0) {
              const animal = nearbyAnimals[Math.floor(Math.random() * nearbyAnimals.length)];
              if (animal.type === 'SporeSpitterPlant') {
                ambientAudioEngine.playSpatialSound('spore_spit', animal.x, animal.z, focalPoint.x, focalPoint.z);
              } else if (animal.category === 'Herbivore') {
                ambientAudioEngine.playSpatialSound('alien_chirp', animal.x, animal.z, focalPoint.x, focalPoint.z);
              } else {
                ambientAudioEngine.playSpatialSound('animal_cry', animal.x, animal.z, focalPoint.x, focalPoint.z);
              }
            } else if (rand < 0.70 && nearbyVillagers.length > 0) {
              const villager = nearbyVillagers[Math.floor(Math.random() * nearbyVillagers.length)];
              if (villager.activeJobType === 'Build' || villager.activeJobType === 'Mine' || villager.activeJobType === 'Chop') {
                ambientAudioEngine.playSpatialSound('villager_work', villager.x, villager.z, focalPoint.x, focalPoint.z);
              } else {
                ambientAudioEngine.playSpatialSound('villager_chat', villager.x, villager.z, focalPoint.x, focalPoint.z);
              }
            }
          }
        }
      }

      // 6. Day-Night lighting rotation and matching visual dome coloring
      let sunAngle = latestProps.timeOfDay * Math.PI * 2 - Math.PI / 2;
      
      const r = (mapData.config?.size ?? 120) * 1.5;
      const midX = focalPoint.x;
      const midZ = focalPoint.z;

      // Rotate Sun position
      sunLight.position.set(
        midX + Math.cos(sunAngle) * r,
        Math.sin(sunAngle) * r,
        midZ + Math.cos(sunAngle) * r * 0.3
      );

      // Rotate moon position directly opposite to the sun
      let moonAngle = sunAngle + Math.PI;
      moonLight.position.set(
        midX + Math.cos(moonAngle) * r,
        Math.sin(moonAngle) * r,
        midZ + Math.cos(moonAngle) * r * 0.3
      );

      // Calculate sky color palette ratios based on time of day
      const t = latestProps.timeOfDay;
      let skyColor = new THREE.Color('#78b1f5'); // standard day baby blue
      let groundFogColor = new THREE.Color('#cce2ff');
      let skyIntensity = 1.0;
      let starOpacity = 0.0;

      if (t < 0.2) {
        // Midnight to twilight (Dark Blue/Indigo black)
        skyColor.set('#04060b');
        groundFogColor.set('#07090f');
        skyIntensity = 0.12;
        starOpacity = 1.0;
        sunLight.intensity = 0;
        moonLight.intensity = 0.35;
      } else if (t >= 0.2 && t < 0.3) {
        // Dawn sunrise golden ratio transition
        const progress = (t - 0.2) / 0.1;
        skyColor.lerpColors(new THREE.Color('#04060b'), new THREE.Color('#eb7524'), progress);
        groundFogColor.lerpColors(new THREE.Color('#07090f'), new THREE.Color('#f0ae81'), progress);
        skyIntensity = 0.15 + progress * 0.85;
        starOpacity = 1.0 - progress;
        sunLight.intensity = progress * 1.2;
        sunLight.color.set('#ff9947'); // warm sunrise golden orange
        moonLight.intensity = (1.0 - progress) * 0.35;
      } else if (t >= 0.3 && t < 0.7) {
        // Broad daylight bright clear skies
        skyColor.set('#7bc6fc');
        groundFogColor.set('#e2f2fc');
        skyIntensity = 1.1;
        starOpacity = 0.0;
        sunLight.intensity = 1.3;
        sunLight.color.set('#fffcf0'); // crisp daylight white
        moonLight.intensity = 0;
      } else if (t >= 0.7 && t < 0.82) {
        // Sunset dusk twilight gradient
        const progress = (t - 0.7) / 0.12;
        skyColor.lerpColors(new THREE.Color('#7bc6fc'), new THREE.Color('#94214f'), progress);
        groundFogColor.lerpColors(new THREE.Color('#e2f2fc'), new THREE.Color('#ffa669'), progress);
        skyIntensity = 1.1 - progress * 0.75;
        starOpacity = progress * 0.8;
        sunLight.intensity = (1.0 - progress) * 1.3;
        sunLight.color.set('#cf3a66'); // rich pink/magenta sunset flare
        moonLight.intensity = 0;
      } else {
        // Night cooling
        const progress = (t - 0.82) / 0.18;
        skyColor.lerpColors(new THREE.Color('#94214f'), new THREE.Color('#04060b'), progress);
        groundFogColor.lerpColors(new THREE.Color('#ffa669'), new THREE.Color('#07090f'), progress);
        skyIntensity = 0.35 - progress * 0.23;
        starOpacity = 0.8 + progress * 0.2;
        sunLight.intensity = 0;
        moonLight.intensity = progress * 0.35;
      }

      // Commit daylight shaders transitions
      renderer.setClearColor(skyColor, 1.0);
      ambientLight.color.set(groundFogColor);
      ambientLight.intensity = skyIntensity * 0.45 + 0.1;
      fog.color.copy(groundFogColor);
      starMat.opacity = starOpacity;

      // --- 6.5. UPDATE AND RENDER TRIBESPEOPLE IN REAL-TIME ---
      const latestTribe = latestProps.tribe || [];
      const activeIds = new Set<string>();

      latestTribe.forEach((person) => {
        const isOnExpeditionInside = person.expeditionState && person.expeditionState !== 'none' && person.expeditionState !== 'entering';

        if (!person.isAlive || isOnExpeditionInside) {
          if (actorMeshesMap.has(person.id)) {
            const mesh = actorMeshesMap.get(person.id)!;
            actorGroup.remove(mesh);
            actorMeshesMap.delete(person.id);
          }
          return;
        }

        activeIds.add(person.id);

        let actorMeshGroup = actorMeshesMap.get(person.id);

        const ROLE_COLORS: Record<string, string> = {
          Gatherer: '#e29578', // Peach/Orange
          Hunter: '#e63946',   // Bold Red
          Farmer: '#4ecdc4',   // Teal
          Builder: '#ffb703',  // Bright Golden Yellow
          Scout: '#a8dadc',    // Sky Cyan
          Healer: '#ff006e',   // Vibrant Magenta
          Artisan: '#ff70a6',  // Vivid Pink
        };

        if (!actorMeshGroup) {
          const activeColor = ROLE_COLORS[person.role] || person.color || '#cccccc';
          actorMeshGroup = createVillagerMesh(person, activeColor, materialCache);

          // Add selectable children to cellMeshes for Raycasting selection
          actorMeshGroup.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.userData = { person };
              cellMeshes.push(child);
            }
          });

          actorGroup.add(actorMeshGroup);
          actorMeshesMap.set(person.id, actorMeshGroup);
        }

        // Calculate visibility early
        let isActorVisible = true;
        if (latestProps.mapData) {
          const eyeX = latestProps.mapData.eyePos?.x ?? 60;
          const eyeZ = latestProps.mapData.eyePos?.z ?? 60;
          const eyeRadius = latestProps.mapData.eyeRadius ?? 14.0;
          const renderRadiusSq = (eyeRadius + 4.5) * (eyeRadius + 4.5);
          
          const maxCullDist = Math.max(22, cameraDistance * 1.05 + 8);
          const maxCullDistSq = maxCullDist * maxCullDist;
          
          const dxEye = person.x - eyeX;
          const dzEye = person.z - eyeZ;
          const distEyeSq = dxEye * dxEye + dzEye * dzEye;
          
          const dxCam = person.x - focalPoint.x;
          const dzCam = person.z - focalPoint.z;
          const distCamSq = dxCam * dxCam + dzCam * dzCam;
          
          isActorVisible = (distEyeSq <= renderRadiusSq) && (distCamSq < maxCullDistSq);
        }

        actorMeshGroup.visible = isActorVisible;

        if (!isActorVisible) {
          // Apply coordinates directly and skip detailed animations/height calculations
          actorMeshGroup.position.set(person.x, person.y || 1.05, person.z);
          return;
        }

        // Live walking bob animation cycle
        const speedSq = (person.targetX - person.x) ** 2 + (person.targetZ - person.z) ** 2;
        const isMoving = speedSq > 0.01 && latestProps.timeSpeed !== 'paused';

        // Discrete height mapping matching the sharp flat tops of our low-poly diorama blocks
        const getDiscreteHeight = (px: number, pz: number) => {
          const cx = Math.round(px);
          const cz = Math.round(pz);
          const currentMap = latestProps.mapData;
          if (!currentMap) return person.y;
          
          const getCellAtWorldLoc = (m: MapData, tx: number, tz: number) => {
            if (m.chunksByKey) {
              const chunkX = Math.floor(tx / 6);
              const chunkZ = Math.floor(tz / 6);
              const chunkKey = `${chunkX},${chunkZ}`;
              const chunk = m.chunksByKey[chunkKey];
              if (chunk) {
                const lx = tx - chunk.chunkX * 6;
                const lz = tz - chunk.chunkZ * 6;
                return chunk.cells[lx]?.[lz] || null;
              }
              return null;
            }
            return m.grid?.[tx]?.[tz] || null;
          };

          const cell = getCellAtWorldLoc(currentMap, cx, cz);
          if (!cell) return 1.0;
          
          // Provide a minor elevation buffer so shoes sit perfectly on top of physical boxes
          return cell.height + 0.01;
        };

        const terrainY = getDiscreteHeight(person.x, person.z);

        if (isMoving) {
          const angle = Math.atan2(person.targetX - person.x, person.targetZ - person.z);
          let diff = angle - actorMeshGroup.rotation.y;
          let diffNormalized = Math.atan2(Math.sin(diff), Math.cos(diff));
          actorMeshGroup.rotation.y += diffNormalized * 0.15;
        }

        // Butter-smooth position interpolation decoupling Three.JS renders from React tick limits
        const targetX = person.x;
        const targetZ = person.z;
        const targetY = terrainY;

        const distSq = (actorMeshGroup.position.x - targetX) ** 2 + (actorMeshGroup.position.z - targetZ) ** 2;
        if (distSq > 4.0 || (actorMeshGroup.position.x === 0 && actorMeshGroup.position.z === 0)) {
          actorMeshGroup.position.set(targetX, targetY, targetZ);
        } else {
          actorMeshGroup.position.x = THREE.MathUtils.lerp(actorMeshGroup.position.x, targetX, 0.22);
          actorMeshGroup.position.z = THREE.MathUtils.lerp(actorMeshGroup.position.z, targetZ, 0.22);
          actorMeshGroup.position.y = THREE.MathUtils.lerp(actorMeshGroup.position.y, targetY, 0.22);
        }

        // Active job or role equipment
        const isWorking = !!person.activeJobType && !person.carriage;
        updateVillagerEquipment(actorMeshGroup, person, isWorking);

        // State-machine-driven animations
        updateVillagerAnimation(actorMeshGroup, person, elapsed, latestProps.timeSpeed || 'normal', isMoving, terrainY);
      });

      // Render active physical visitors (Caravans, Messengers, Refugees, Specialists)
      const visitorGroup = latestProps.mapData?.activeVisitorGroup;
      if (visitorGroup) {
        for (let k = 0; k < visitorGroup.count; k++) {
          const visitorId = `${visitorGroup.id}_member_${k}`;
          activeIds.add(visitorId);

          let visitorMeshGroup = actorMeshesMap.get(visitorId);

          if (!visitorMeshGroup) {
            visitorMeshGroup = new THREE.Group();

            // Set visitor colors depending on visitor type
            let colorHex = '#e0a96d'; // fallback gold
            if (visitorGroup.type === 'Caravan') colorHex = '#f59e0b'; // Gold
            else if (visitorGroup.type === 'Messenger') colorHex = '#06b6d4'; // Cyan
            else if (visitorGroup.type === 'Refugees') colorHex = '#78716c'; // Dusty Stone Grey
            else if (visitorGroup.type === 'Specialist') colorHex = '#8b5cf6'; // Royal Purple
            else if (visitorGroup.type === 'HostileRaiders') colorHex = '#ef4444'; // Red

            // Torso (Drape-like Low-poly robe/duster)
            const bodyGeom = new THREE.CylinderGeometry(0.08, 0.20, 0.44, 5);
            const bodyMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(colorHex),
              roughness: 0.8,
              flatShading: true,
            });
            const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
            bodyMesh.position.y = 0.22;
            bodyMesh.castShadow = true;
            bodyMesh.receiveShadow = true;
            visitorMeshGroup.add(bodyMesh);

            // Head
            const headGeom = new THREE.SphereGeometry(0.12, 5, 5);
            const headMat = new THREE.MeshStandardMaterial({ color: 0xdec1a7, roughness: 0.6 });
            const headMesh = new THREE.Mesh(headGeom, headMat);
            headMesh.position.set(0, 0.48, 0);
            headMesh.castShadow = true;
            visitorMeshGroup.add(headMesh);

            // Outer Hood or Traveler Hat
            const hatGeom = new THREE.ConeGeometry(0.16, 0.18, 5);
            const hatMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.85, flatShading: true });
            const hatMesh = new THREE.Mesh(hatGeom, hatMat);
            hatMesh.position.set(0, 0.58, 0);
            hatMesh.castShadow = true;
            visitorMeshGroup.add(hatMesh);

            // Floating visitor gem/jewel marker
            const jewelGeom = new THREE.OctahedronGeometry(0.06, 0);
            const jewelMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(colorHex).multiplyScalar(1.2),
              roughness: 0.1,
              metalness: 0.9,
              flatShading: true,
            });
            const jewelMesh = new THREE.Mesh(jewelGeom, jewelMat);
            jewelMesh.position.set(0, 0.80, 0);
            visitorMeshGroup.add(jewelMesh);

            // Attach user data for identification if clicked
            bodyMesh.userData = { isVisitor: true, visitorGroup };
            headMesh.userData = { isVisitor: true, visitorGroup };

            actorGroup.add(visitorMeshGroup);
            actorMeshesMap.set(visitorId, visitorMeshGroup);
          }

          // Positioning around fireplace
          const size = latestProps.mapData?.config?.size || 40;
          const radius = 1.6 + k * 0.35;
          const angle = (k * 2 * Math.PI) / visitorGroup.count + elapsed * 0.1;
          
          const cx = fireplacePos ? fireplacePos.x : Math.floor(size / 2);
          const cz = fireplacePos ? fireplacePos.z : Math.floor(size / 2);
          const cy = fireplacePos ? fireplacePos.y : 0.2;

          const targetWorldX = cx + Math.cos(angle) * radius;
          const targetWorldZ = cz + Math.sin(angle) * radius;
          const targetY = cy + 0.04;

          visitorMeshGroup.position.set(targetWorldX, targetY, targetWorldZ);
          visitorMeshGroup.lookAt(new THREE.Vector3(cx, targetY, cz));

          // Idle breathing sway
          visitorMeshGroup.position.y += Math.sin(elapsed * 2.0 + k) * 0.012;
        }
      }

      // Prune dead mesh avatars
      actorMeshesMap.forEach((mesh, id) => {
        if (!activeIds.has(id)) {
          actorGroup.remove(mesh);
          actorMeshesMap.delete(id);
        }
      });

      // --- 6.6. UPDATE AND RENDER ECOSYSTEM WILDLIFE ANIMALS ---
      const latestAnimals = latestProps.mapData?.animals || [];
      const activeAnimalIds = new Set<string>();

      latestAnimals.forEach((animal) => {
        activeAnimalIds.add(animal.id);

        let animalMeshGroup = animalMeshesMap.get(animal.id);

        if (!animalMeshGroup) {
          animalMeshGroup = createAnimalMesh(animal, THREE);

          // Label sub-meshes with metadata for selection raycasting
          animalMeshGroup.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.userData = { animal };
              cellMeshes.push(child);
            }
          });

          actorGroup.add(animalMeshGroup);
          animalMeshesMap.set(animal.id, animalMeshGroup);
        }

        // Calculate visibility early
        let isAnimalVisible = true;
        if (latestProps.mapData) {
          const eyeX = latestProps.mapData.eyePos?.x ?? 60;
          const eyeZ = latestProps.mapData.eyePos?.z ?? 60;
          const eyeRadius = latestProps.mapData.eyeRadius ?? 14.0;
          const renderRadiusSq = (eyeRadius + 4.5) * (eyeRadius + 4.5);
          
          const maxCullDist = Math.max(22, cameraDistance * 1.05 + 8);
          const maxCullDistSq = maxCullDist * maxCullDist;
          
          const dxEye = animal.x - eyeX;
          const dzEye = animal.z - eyeZ;
          const distEyeSq = dxEye * dxEye + dzEye * dzEye;
          
          const dxCam = animal.x - focalPoint.x;
          const dzCam = animal.z - focalPoint.z;
          const distCamSq = dxCam * dxCam + dzCam * dzCam;
          
          isAnimalVisible = (distCamSq < maxCullDistSq);
        }

        animalMeshGroup.visible = isAnimalVisible;

        if (!isAnimalVisible) {
          // Apply coordinates directly and skip detailed animations/height calculations
          animalMeshGroup.position.set(animal.x, animal.y || 1.0, animal.z);
          return;
        }

        // Live coordinate dynamics
        const speedSq = (animal.targetX - animal.x) ** 2 + (animal.targetZ - animal.z) ** 2;
        const isMoving = speedSq > 0.01 && latestProps.timeSpeed !== 'paused';
        const isDead = animal.isDead;
        const decayProgress = isDead ? Math.max(0, Math.min(1.0, (animal.decayTimer ?? 0) / 2.5)) : 0;

        let rSpeed = 16.0;
        let scaleSize = animal.agePhase === 'Juvenile' ? 0.6 : (animal.agePhase === 'Elder' ? 1.15 : 0.95);
        
        let multiplier = 1.0;
        if (animal.category === 'SmallPredator') {
          multiplier = 1.5;
        } else if (animal.category === 'ApexPredator') {
          multiplier = 2.0;
        }
        scaleSize *= multiplier * (1.0 - decayProgress);
        animalMeshGroup.scale.set(scaleSize, scaleSize, scaleSize);

        const getDiscreteHeight = (px: number, pz: number) => {
          const cx = Math.round(px);
          const cz = Math.round(pz);
          const currentMap = latestProps.mapData;
          if (!currentMap) return 1.0;
          
          const getCellAtWorldLoc = (m: MapData, tx: number, tz: number) => {
            if (m.chunksByKey) {
              const chunkX = Math.floor(tx / 6);
              const chunkZ = Math.floor(tz / 6);
              const chunkKey = `${chunkX},${chunkZ}`;
              const chunk = m.chunksByKey[chunkKey];
              if (chunk) {
                const lx = tx - chunk.chunkX * 6;
                const lz = tz - chunk.chunkZ * 6;
                return chunk.cells[lx]?.[lz] || null;
              }
              return null;
            }
            return m.grid?.[tx]?.[tz] || null;
          };

          const cell = getCellAtWorldLoc(currentMap, cx, cz);
          if (!cell) return 1.0;
          return cell.height + 0.03;
        };

        const terrainY = getDiscreteHeight(animal.x, animal.z);

        if (isMoving && !isDead) {
          const angle = Math.atan2(animal.targetX - animal.x, animal.targetZ - animal.z);
          let diff = angle - animalMeshGroup.rotation.y;
          let diffNormalized = Math.atan2(Math.sin(diff), Math.cos(diff));
          animalMeshGroup.rotation.y += diffNormalized * 0.15;
        }

        const targetX = animal.x;
        const targetZ = animal.z;
        const targetY = isDead 
          ? terrainY - 0.22 * decayProgress 
          : (animal.isSleeping ? terrainY - 0.01 : terrainY + (isMoving ? Math.abs(Math.sin(elapsed * rSpeed)) * 0.05 : 0));

        const dSq = (animalMeshGroup.position.x - targetX) ** 2 + (animalMeshGroup.position.z - targetZ) ** 2;
        if (dSq > 4.0 || (animalMeshGroup.position.x === 0 && animalMeshGroup.position.z === 0)) {
          animalMeshGroup.position.set(targetX, targetY, targetZ);
        } else {
          animalMeshGroup.position.x = THREE.MathUtils.lerp(animalMeshGroup.position.x, targetX, 0.2);
          animalMeshGroup.position.z = THREE.MathUtils.lerp(animalMeshGroup.position.z, targetZ, 0.2);
          animalMeshGroup.position.y = THREE.MathUtils.lerp(animalMeshGroup.position.y, targetY, 0.2);
        }

        // Apply state-machine-driven visual animations for low-poly animals
        updateAnimalAnimation(animalMeshGroup, animal, elapsed, latestProps.timeSpeed || 'normal', isMoving, terrainY);

        // Toggle jewel color based on designation
        const indicator = animalMeshGroup.getObjectByName('statusIndicator') as THREE.Mesh;
        if (indicator) {
          if ((animal as any).isHuntDesignated) {
            indicator.visible = true;
            (indicator.material as THREE.MeshStandardMaterial).color.setHex(0xff3333); // Red target
          } else if ((animal as any).isCaptureDesignated) {
            indicator.visible = true;
            (indicator.material as THREE.MeshStandardMaterial).color.setHex(0x3344ff); // Sapphire blue taming net
          } else {
            indicator.visible = false;
          }
        }
      });

      // Prune dead animal meshes
      animalMeshesMap.forEach((mesh, id) => {
        if (!activeAnimalIds.has(id)) {
          actorGroup.remove(mesh);
          animalMeshesMap.delete(id);
        }
      });

      // --- ANIMATING BOID FLOCK OF FISH ---
      const fishDelta = Math.min(0.04, delta); // clamp to prevent high-delta teleporting

      fishFlock.forEach((boid) => {
        // Skip heavy flocking calculations for boids that are far/culled to maximize performance
        if (boid.group && !boid.group.visible) {
          return;
        }

        const cohesion = new THREE.Vector3();
        const alignment = new THREE.Vector3();
        const separation = new THREE.Vector3();

        let neighborCount = 0;
        const perceptionRadius = 1.8;
        const separationRadius = 0.45;

        fishFlock.forEach((other) => {
          if (other === boid || other.lakeId !== boid.lakeId) return;

          const dist = boid.position.distanceTo(other.position);
          if (dist < perceptionRadius) {
            cohesion.add(other.position);
            alignment.add(other.velocity);
            neighborCount++;

            if (dist < separationRadius) {
              const diff = new THREE.Vector3().subVectors(boid.position, other.position);
              diff.normalize().divideScalar(Math.max(0.05, dist));
              separation.add(diff);
            }
          }
        });

        const acceleration = new THREE.Vector3();

        if (neighborCount > 0) {
          cohesion.divideScalar(neighborCount).sub(boid.position).multiplyScalar(0.07);
          alignment.divideScalar(neighborCount).sub(boid.velocity).multiplyScalar(0.1);
          
          acceleration.add(cohesion);
          acceleration.add(alignment);
        }

        if (separation.lengthSq() > 0) {
          separation.multiplyScalar(0.4);
          acceleration.add(separation);
        }

        // Steer back to the specific center of this entire lake body of water
        const distToLakeCenter = boid.position.distanceTo(boid.lakeCenter);
        if (distToLakeCenter > 2.2) {
          const steerToCenter = new THREE.Vector3().subVectors(boid.lakeCenter, boid.position);
          steerToCenter.normalize().multiplyScalar(0.25);
          acceleration.add(steerToCenter);
        }

        // Boundary constraint: fish must stay inside water biome cells
        const curCellX = Math.round(boid.position.x);
        const curCellZ = Math.round(boid.position.z);
        const curCell = latestProps.mapData?.grid?.[curCellX]?.[curCellZ];
        const isCurrentlyInWater = curCell && curCell.biome === 'water';

        if (!isCurrentlyInWater) {
          let closestTile = boid.lakeCells[0];
          let minDist = 99999;
          boid.lakeCells.forEach((c) => {
            const d = Math.pow(boid.position.x - c.x, 2) + Math.pow(boid.position.z - c.z, 2);
            if (d < minDist) {
              minDist = d;
              closestTile = c;
            }
          });
          const pullIn = new THREE.Vector3(closestTile.x, boid.position.y, closestTile.z).sub(boid.position);
          pullIn.normalize().multiplyScalar(0.75);
          acceleration.add(pullIn);
        }

        // Apply acceleration forces to velocity
        boid.velocity.add(acceleration);
        boid.velocity.y = 0; // limit movement to horizontal planes

        // Enforce physical swimming speed constraints
        const speed = boid.velocity.length();
        const maxSpeed = 1.1;
        const minSpeed = 0.35;
        if (speed > maxSpeed) {
          boid.velocity.setLength(maxSpeed);
        } else if (speed < minSpeed) {
          boid.velocity.setLength(minSpeed);
        }

        // Progress boid movement pathing
        boid.position.addScaledVector(boid.velocity, fishDelta);

        // Hover swimming vertical height oscillation based on current underwater grid floor
        const tile = latestProps.mapData?.grid?.[Math.round(boid.position.x)]?.[Math.round(boid.position.z)];
        if (tile && tile.biome === 'water') {
          const seaFloor = Math.max(0.1, tile.height - 0.7);
          
          // Gently bob up and down
          boid.targetY = seaFloor + 0.16 + Math.sin(elapsed * 0.75 + boid.swimOffset) * 0.12;
          boid.position.y += (boid.targetY - boid.position.y) * 0.08;
        }

        // Face front path direction
        if (boid.velocity.lengthSq() > 0.001) {
          const lookTarget = new THREE.Vector3().addVectors(boid.position, boid.velocity);
          lookTarget.y = boid.position.y;
          boid.group.lookAt(lookTarget);
        }

        // Tail wiggle speed correlates with real velocity
        boid.swimOffset += fishDelta * boid.velocity.length() * 14.0;
        boid.tailMesh.rotation.y = Math.sin(boid.swimOffset) * 0.45;
      });

      // --- UPDATE HTML THOUGHT BUBBLES ---
      const bubbleContainer = document.getElementById('thought-bubbles-container');
      const container = containerRef.current;
      if (bubbleContainer && container) {
        const activeBubbleIds = new Set<string>();

        latestTribe.forEach((person) => {
          if (!person.isAlive) return;
          const actorMeshGroup = actorMeshesMap.get(person.id);
          if (actorMeshGroup) {
            const tempV3 = new THREE.Vector3();
            tempV3.setFromMatrixPosition(actorMeshGroup.matrixWorld);
            tempV3.y += 0.85; // float above head

            tempV3.project(camera);

            if (tempV3.z <= 1) {
              const x2D = (tempV3.x * 0.5 + 0.5) * container.clientWidth;
              const y2D = (-(tempV3.y) * 0.5 + 0.5) * container.clientHeight;

              if (x2D >= -50 && x2D <= container.clientWidth + 50 && y2D >= -50 && y2D <= container.clientHeight + 50) {
                const bubbleId = `bubble-${person.id}`;
                activeBubbleIds.add(bubbleId);

                let bubbleEl = document.getElementById(bubbleId);
                const emoji = getThoughtEmoji(person);

                if (!bubbleEl) {
                  bubbleEl = document.createElement('div');
                  bubbleEl.id = bubbleId;
                  bubbleEl.className = "absolute top-0 left-0 select-none pointer-events-none";
                  bubbleEl.style.transformOrigin = "bottom center";
                  bubbleEl.style.zIndex = "10";
                  bubbleEl.style.opacity = "0.7"; // 70% opacity for thought bubbles
                  
                  const inner = document.createElement('div');
                  inner.className = "relative flex items-center justify-center bg-white border border-slate-900/10 shadow-lg rounded-full w-7 h-7 text-xs animate-bounce";
                  inner.style.transformOrigin = "bottom center";
                  bubbleEl.appendChild(inner);
                  
                  const tail = document.createElement('div');
                  tail.className = "absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white border-b border-r border-slate-900/10 rotate-45 rounded-sm";
                  inner.appendChild(tail);

                  const emojiSpan = document.createElement('span');
                  emojiSpan.className = "z-10 text-[13px] leading-none mb-0.5";
                  emojiSpan.id = `emoji-${person.id}`;
                  inner.appendChild(emojiSpan);

                  bubbleContainer.appendChild(bubbleEl);
                }

                const emojiSpan = document.getElementById(`emoji-${person.id}`);
                if (emojiSpan && emojiSpan.textContent !== emoji) {
                  emojiSpan.textContent = emoji;
                }

                bubbleEl.style.transform = `translate3d(${x2D - 14}px, ${y2D - 42}px, 0px)`;
                bubbleEl.style.display = 'block';
              }
            }
          }
        });

        const children = bubbleContainer.children;
        for (let i = children.length - 1; i >= 0; i--) {
          const child = children[i];
          if (!activeBubbleIds.has(child.id)) {
            bubbleContainer.removeChild(child);
          }
        }
      }

      renderer.render(scene, camera);
    };

    animateLoop();

    // --- 11. CLEANUP ON COMPONENT UNMOUNT OR WORLD CONFIG REMODEL ---
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      renderer.domElement.removeEventListener('contextmenu', preventContextMenu);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.domElement.removeEventListener('dblclick', handleCanvasDblClick);
      resizeObserver.disconnect();
      
      // Memory cleanup
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        try {
          container.removeChild(renderer.domElement);
        } catch (e) {
          console.warn('Failed to remove child from container during cleanup:', e);
        }
      }
      if (container) {
        try {
          container.innerHTML = '';
        } catch (innerErr) {}
      }
      
      try {
        renderer.dispose();
      } catch (err) {}
      
      try {
        selectorGeom.dispose();
      } catch (err) {}
      
      try {
        selectorMat.dispose();
      } catch (err) {}
      
      try {
        glowLineGeom.dispose();
      } catch (err) {}
      
      try {
        glowLineMat.dispose();
      } catch (err) {}
      
      try {
        starsGeometry.dispose();
      } catch (err) {}
      
      try {
        starMat.dispose();
      } catch (err) {}
      
      try {
        disposePoolGeometry();
      } catch (err) {}
      
      try {
        disposeCacheMaterials();
      } catch (err) {}
      
      try {
        ambientAudioEngine.dispose();
      } catch (err) {}
    };
  }, [mapData.config.size, mapData.config.seed, worldId]); // Remount Three.js scene strictly when world configuration or dimension triggers rebuild

  return (
    <div id="canvas-wrapper" className="w-full h-full relative bg-[#121620]">
      {!isReady && (
        <div 
          id="canvas-loader"
          className="absolute inset-0 flex flex-col items-center justify-center bg-[#070911]/90 backdrop-blur z-50 text-white font-mono gap-3"
        >
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-widest font-bold text-slate-400">Booting Low-Poly World Core...</span>
        </div>
      )}
      <div id="threejs-canvas-target" ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing block" />
      {/* Dynamic 2D Speech / Thought Bubbles overlay */}
      <div 
        id="thought-bubbles-container" 
        className="absolute inset-0 pointer-events-none overflow-hidden select-none z-10"
      />
    </div>
  );
}
