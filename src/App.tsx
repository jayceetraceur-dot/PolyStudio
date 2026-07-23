import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  Sparkles, 
  FolderOpen, 
  Play, 
  Settings as SettingsIcon, 
  LogOut, 
  Check, 
  X, 
  Trash2, 
  Sliders, 
  Volume2, 
  Grid, 
  RefreshCw, 
  Moon, 
  Sun, 
  Flame, 
  Zap,
  Info,
  ChevronRight,
  Download,
  AlertOctagon,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CellInfo, WorldConfig, TimeSpeed, Tribesperson, TribespersonRole, JobCategory, JobPriority, RECIPE_DATABASE, Recipe, CraftingJob, MapData } from './types';
import { generateWorld, updateWorldChunkLoading } from './utils/worldBuilder';
import GameCanvas from './components/GameCanvas';
import Inspector from './components/Inspector';
import ControlsOverlay from './components/ControlsOverlay';
import TopCenterHUD from './components/TopCenterHUD';
import { PerformancePanel } from './components/PerformancePanel';
import { createTribesperson, tickTribeSimulation, ROLE_COLORS, establishSocialBonds } from './utils/tribeGenerator';
import { tickExpeditionsSimulation } from './utils/expeditionSimulator';
import { runWeeklyVillageSimulation, rollDailyVisitorArrival } from './utils/villageSimulator';
import { GodTips } from './components/GodTips';
import { OracleHub } from './components/OracleHub';
import { tickAIDirector } from './utils/aiDirector';
import { DirectorDebugPanel } from './components/DirectorDebugPanel';
import { DirectorEventModal } from './components/DirectorEventModal';
import { populateInitialMapAnimals } from './utils/ecosystemEngine';
import { getSpatialIndex } from './utils/spatialIndex';
import CraftingHub from './components/CraftingHub';


const INITIAL_WORLD_SEED = Math.floor(Math.random() * 8999) + 1000;
const INITIAL_WORLD_CONFIG: WorldConfig = {
  size: 120,
  seed: INITIAL_WORLD_SEED,
  roughness: 1.0,
  forestDensity: 0.65,
  rockDensity: 0.55,
  waterLevel: 0.0,
};

export default function App() {
  // Menu and modal states
  const [showMainMenu, setShowMainMenu] = useState(true);
  const [gameError, setGameError] = useState<string | null>(null);
  const [menuTab, setMenuTab] = useState<'main' | 'new_tribe' | 'load_tribe' | 'settings' | 'exit_screen'>('main');
  const [showWorldGen, setShowWorldGen] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmExitState, setConfirmExitState] = useState<'none' | 'save_prompt' | 'just_exit'>('none');
  const [lastGameSaved, setLastGameSaved] = useState(true);
  const isGeneratingNewWorldRef = useRef(false);

  // Settings State
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('diorama_colony_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.pathfindingTickRate) parsed.pathfindingTickRate = 'Normal';
        return parsed;
      }
    } catch (e) {}
    return {
      volume: 80,
      showGrid: true,
      autoSave: 'off',
      graphicsLevel: 'High',
      pathfindingTickRate: 'Normal'
    };
  });

  // Synchronize settings into mapData structure for engine optimizations
  useEffect(() => {
    setMapData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        settings: {
          graphicsLevel: settings.graphicsLevel || 'High',
          pathfindingTickRate: settings.pathfindingTickRate || 'Normal'
        }
      };
    });
  }, [settings]);

  // Saves state
  const [saves, setSaves] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('diorama_colony_saves');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });

  // 1. World Config State
  const [config, setConfig] = useState<WorldConfig>(INITIAL_WORLD_CONFIG);

  // 2. Procedural Map State
  const [mapData, setMapData] = useState(() => generateWorld(INITIAL_WORLD_CONFIG));

  const handleUpdateMapData = (updater: (prev: MapData) => MapData) => {
    setMapData((prev) => {
      const next = updater({ ...prev });
      updateWorldChunkLoading(next);
      return next;
    });
  };

  // Monitor physical migration travel completion and trigger seed jump
  useEffect(() => {
    if (mapData?.triggerMigrationComplete) {
      completePhysicalMigration();
    }
  }, [mapData?.triggerMigrationComplete]);

  // 3. Selection & Inspect targets (Tile Selection)
  const [selectedCell, setSelectedCell] = useState<CellInfo | null>(null);
  const [relocatingStructure, setRelocatingStructure] = useState<{ x: number; z: number } | null>(null);

  // Synchronize selectedCell in real-time with the live grid to prevent Inspector stale UI
  useEffect(() => {
    if (selectedCell && mapData?.grid) {
      const freshCell = mapData.grid[selectedCell.x]?.[selectedCell.z];
      if (freshCell) {
        const structType = freshCell.structure?.type;
        const constType = freshCell.construction?.type;
        const constProg = freshCell.construction?.progress;
        const prevStructType = selectedCell.structure?.type;
        const prevConstType = selectedCell.construction?.type;
        const prevConstProg = selectedCell.construction?.progress;

        if (
          structType !== prevStructType ||
          constType !== prevConstType ||
          constProg !== prevConstProg ||
          freshCell.hasTree !== selectedCell.hasTree ||
          freshCell.hasRock !== selectedCell.hasRock ||
          freshCell.hasShrub !== selectedCell.hasShrub ||
          freshCell.scouted !== selectedCell.scouted ||
          freshCell.resourceNode?.amount !== selectedCell.resourceNode?.amount ||
          freshCell.itemsOnGround?.amount !== selectedCell.itemsOnGround?.amount ||
          freshCell.farmCrop?.stage !== selectedCell.farmCrop?.stage
        ) {
          setSelectedCell(freshCell);
        }
      } else {
        setSelectedCell(null);
      }
    }
  }, [mapData, selectedCell]);

  // 4. Tribe Simulation states
  const [tribe, setTribe] = useState<Tribesperson[]>([]);
  const tribeRef = useRef<Tribesperson[]>([]);
  useEffect(() => {
    tribeRef.current = tribe;
  }, [tribe]);

  const [worldId, setWorldId] = useState(() => Math.random());
  const [selectedTribesperson, setSelectedTribesperson] = useState<Tribesperson | null>(null);
  
  // Game clock / days tracking (a continuous float. Day 0.40 starts mid-afternoon Day 1)
  const [gameDays, setGameDays] = useState(0.40);
  const [timeSpeed, setTimeSpeed] = useState<TimeSpeed>('normal');
  const [focusCoordinates, setFocusCoordinates] = useState<{ x: number; z: number } | null>(null);

  // Creative Mode and ONI-style Care Package states
  const [isCreativeMode, setIsCreativeMode] = useState(false);
  const [isEventWindowCollapsed, setIsEventWindowCollapsed] = useState(false);
  const [nextCarePackageDay, setNextCarePackageDay] = useState(1);
  const [showCarePackagePopup, setShowCarePackagePopup] = useState(false);
  const [carePackageOptions, setCarePackageOptions] = useState<any[]>([]);
  const [showOracleHub, setShowOracleHub] = useState(false);
  const [showCraftingModal, setShowCraftingModal] = useState(false);

  // Toggle Creative settings
  const toggleCreativeMode = (enabled: boolean) => {
    setIsCreativeMode(enabled);
    if (enabled) {
      setMapData((prev) => {
        const nextMap = { ...prev };
        nextMap.stockpile = {
          ...prev.stockpile,
          wood: 9999,
          stone: 9999,
          food: 9999,
          copper: 9999,
          silver: 9999,
          gold: 9999,
          iron: 9999,
          relics: 9999,
          ancientMaterials: 9999,
        };
        nextMap.researchPoints = 9999;
        nextMap.unlockedRecipes = Object.keys(RECIPE_DATABASE);
        nextMap.unlockedBuildings = ['PetrifiedGreenhouse', 'PrecursorGenerator', 'AegisBeacon'];
        return nextMap;
      });
      addLog('🛠️ Deity Mode Activated! All materials set to maximum, and all blueprints unlocked.', 'info');
    } else {
      setMapData((prev) => {
        const nextMap = { ...prev };
        nextMap.stockpile = {
          ...prev.stockpile,
          wood: 100,
          stone: 100,
          food: 100,
        };
        nextMap.researchPoints = 0;
        nextMap.unlockedRecipes = [];
        nextMap.unlockedBuildings = [];
        return nextMap;
      });
      addLog('🏕️ Deity Mode Deactivated! Returned to standard Survival rules.', 'warning');
    }
  };

  const generateCarePackageOptions = () => {
    const currentMap = mapDataRef.current;
    const p = createTribesperson(Math.random().toString(36).slice(2, 9), currentMap);
    
    const optPioneer = {
      type: 'pioneer',
      title: `👤 Veteran Pioneer: ${p.name}`,
      description: `A pristine level 1 ${p.role}. Spawns with specialized primary skills and healthy stats (100% health, 80% morale).`,
      icon: 'user',
      value: p,
    };

    const optMaterials = {
      type: 'resources',
      title: '📦 Construction Material Drop crate',
      description: 'A supply landing carrying essential shelter components: +150 Wood logs and +150 Stone blocks.',
      icon: 'package',
      value: { wood: 150, stone: 150 },
    };

    const optFood = {
      type: 'food',
      title: '🍖 Rations Bundle Supply Pack',
      description: 'Emergency supply package filled with shelf-stable grains and cured meat: +150 Food units.',
      icon: 'apple',
      value: { food: 150 },
    };

    setCarePackageOptions([optPioneer, optMaterials, optFood]);
    setShowCarePackagePopup(true);
  };

  const handleClaimCarePackage = (option: any) => {
    if (option.type === 'pioneer') {
      const p = option.value;
      setTribe((prev) => [...prev, p]);
      addLog(`✨ Deity Printing Pod: Welcomed Pioneer "${p.name}" the ${p.role} into the tribe colony!`, 'info');
    } else if (option.type === 'resources') {
      setMapData((prev) => {
        const nextMap = { ...prev };
        nextMap.stockpile = {
          ...prev.stockpile,
          wood: prev.stockpile.wood + option.value.wood,
          stone: prev.stockpile.stone + option.value.stone,
        };
        return nextMap;
      });
      addLog(`✨ Deity Printing Pod: Unloaded care package (+150 Wood, +150 Stone) directly into stockpiles.`, 'info');
    } else if (option.type === 'food') {
      setMapData((prev) => {
        const nextMap = { ...prev };
        nextMap.stockpile = {
          ...prev.stockpile,
          food: prev.stockpile.food + option.value.food,
        };
        return nextMap;
      });
      addLog(`✨ Deity Printing Pod: Distributed rations package (+150 Food) into storage cells.`, 'info');
    }

    setNextCarePackageDay(Math.floor(gameDays) + 30);
    setShowCarePackagePopup(false);
  };

  // Save settings helper
  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    localStorage.setItem('diorama_colony_settings', JSON.stringify(newSettings));
  };

  // Save current game state to local storage
  const handleSaveGame = (slotIndex: number) => {
    const timestamp = new Date().toLocaleString();
    const totalDays = Math.floor(gameDays);
    const year = Math.floor(totalDays / 360) + 1;
    const month = Math.floor((totalDays % 360) / 30) + 1;
    const day = (totalDays % 30) + 1;
    
    const saveName = `Colony of Day ${totalDays} (Year ${year} Month ${month} Day ${day})`;
    
    const newSave = {
      name: saveName,
      timestamp,
      slotIndex,
      config,
      mapData,
      tribe,
      gameDays,
      logs
    };

    setSaves((prev) => {
      const nextSaves = prev.filter(s => s.slotIndex !== slotIndex);
      nextSaves.push(newSave);
      localStorage.setItem('diorama_colony_saves', JSON.stringify(nextSaves));
      return nextSaves;
    });
    
    setLastGameSaved(true);
    addLog(`💾 Progress successfully saved to Save Slot ${slotIndex + 1}!`, 'info');
  };

  // Delete a save slot
  const handleDeleteSave = (slotIndex: number, e: any) => {
    e.stopPropagation(); // Stop slot click
    setSaves((prev) => {
      const nextSaves = prev.filter(s => s.slotIndex !== slotIndex);
      localStorage.setItem('diorama_colony_saves', JSON.stringify(nextSaves));
      return nextSaves;
    });
  };

  // Load a save
  const handleLoadGame = (saveState: any) => {
    isGeneratingNewWorldRef.current = false;
    
    setConfig(saveState.config);
    
    // Defensive merging for Oracle systems in case loading old save
    const loadedMapData = { ...saveState.mapData };
    if (loadedMapData.stormDaysUntilMigration === undefined) loadedMapData.stormDaysUntilMigration = 12;
    if (loadedMapData.stormSpeed === undefined) loadedMapData.stormSpeed = 1.0;
    if (loadedMapData.stormMovementDirection === undefined) loadedMapData.stormMovementDirection = 'East';
    if (loadedMapData.stormDangerLevel === undefined) loadedMapData.stormDangerLevel = 'Low';
    if (!loadedMapData.knownVillages) {
      loadedMapData.knownVillages = [
        {
          id: 'v1',
          name: 'Red Hollow',
          distance: 8,
          relationship: 10,
          trust: 25,
          fear: 5,
          respect: 15,
          population: 45,
          knownOracle: 'Vaelen',
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
          visitorsMayArrive: true
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
          knownOracle: 'Sariel',
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
          visitorsMayArrive: true
        }
      ];
    }
    if (!loadedMapData.oracleMessages) {
      loadedMapData.oracleMessages = [
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
      ];
    }
    if (!loadedMapData.discoveredRelics) {
      loadedMapData.discoveredRelics = [
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
        }
      ];
    }
    if (!loadedMapData.predictionHistory) loadedMapData.predictionHistory = [];

    setMapData(loadedMapData);
    setTribe(saveState.tribe || []);
    setGameDays(saveState.gameDays);
    setWorldId(Math.random());
    const resolvedLogs = Array.isArray(saveState.logs) ? saveState.logs : [];
    setLogs(resolvedLogs);
    
    setSelectedCell(null);
    setSelectedTribesperson(null);
    setRelocatingStructure(null);
    
    setShowMainMenu(false);
    setShowPauseMenu(false);
    setLastGameSaved(true);
    setTimeSpeed('normal');
    
    // Smooth reset focus
    setTimeout(() => {
      setFocusCoordinates({ x: saveState.config.size / 2, z: saveState.config.size / 2 });
    }, 100);
  };

  // Reset to Main Menu
  const resetToMainMenu = () => {
    setShowMainMenu(true);
    setShowPauseMenu(false);
    setShowWorldGen(false);
    setShowSettings(false);
    setConfirmExitState('none');
    setTimeSpeed('paused');
  };

  // Start smooth new game with custom configurations
  const startNewGame = (customConfig: WorldConfig) => {
    isGeneratingNewWorldRef.current = true;
    
    setConfig(customConfig);
    const newMap = generateWorld(customConfig);
    setMapData(newMap);
    setWorldId(Math.random());
    
    // Clear state
    setSelectedCell(null);
    setSelectedTribesperson(null);
    setRelocatingStructure(null);
    setTribe([]); // Clear old tribe members to prevent flash of previous colony survivors
    setGameDays(0.40); // Reset game clock to starting day afternoon
    
    setShowMainMenu(false);
    setShowWorldGen(false);
    setLastGameSaved(false);
    setTimeSpeed('normal');
  };
  
  // Game Simulation Event log buffer
  const [logs, setLogs] = useState<{ id: string; text: string; type: 'info' | 'warning' | 'death' | 'level'; timeText: string }[]>([]);

  const [tempWarning, setTempWarning] = useState<string | null>(null);
  const showTempWarning = (msg: string) => {
    setTempWarning(msg);
    setTimeout(() => {
      setTempWarning(null);
    }, 3000);
  };

  // Derived properties from gameDays
  const timeOfDay = gameDays % 1.0;
  const setTimeOfDay = (t: number) => {
    setGameDays((prev) => Math.floor(prev) + t);
  };

  // Safe reference anchors for tick loop closures
  const gameDaysRef = useRef(gameDays);
  useEffect(() => {
    gameDaysRef.current = gameDays;
  }, [gameDays]);

  const mapDataRef = useRef(mapData);
  useEffect(() => {
    mapDataRef.current = mapData;
  }, [mapData]);

  const addLog = (text: string, type: 'info' | 'warning' | 'death' | 'level' | 'success' | 'combat' | any) => {
    const id = Math.random().toString(36).slice(2, 9);
    const totalDays = Math.floor(gameDaysRef.current);
    const year = Math.floor(totalDays / 360) + 1;
    const month = Math.floor((totalDays % 360) / 30) + 1;
    const day = (totalDays % 30) + 1;
    const timeText = `Y${year} M${month} D${day}`;
    
    setLogs((prev) => [
      { id, text, type, timeText },
      ...prev.slice(0, 49) // Keep last 50
    ]);
  };

  // 5. Automatically initiate starting pioneers when mapData/config changes
  useEffect(() => {
    if (!isGeneratingNewWorldRef.current) return;
    isGeneratingNewWorldRef.current = false;

    const startingTribe: Tribesperson[] = [];
    for (let i = 0; i < 5; i++) {
      startingTribe.push(createTribesperson(Math.random().toString(36).slice(2, 9), mapData));
    }
    setTribe(establishSocialBonds(startingTribe));
    setSelectedTribesperson(null);
    setSelectedCell(null);
    setLogs([
      { id: 'est', text: '🏕️ Tribal colony established! 5 sturdy pioneers spawned.', type: 'info', timeText: 'Y1 M1 D1' }
    ]);
    setFocusCoordinates({ x: mapData.config.size / 2, z: mapData.config.size / 2 });
  }, [mapData]);

  // Automatically update map layout whenever config is committed
  const handleConfigChange = (newConfig: WorldConfig) => {
    setConfig(newConfig);
    setMapData(generateWorld(newConfig));
    setWorldId(Math.random());
    setSelectedCell(null); // Clear selections on remap to prevent layout crashes
  };

  const handleChangeAutoGatherThreshold = (key: string, value: number) => {
    setMapData((prev) => {
      const nextThresholds = { ...(prev.autoGatherThresholds || {}) };
      nextThresholds[key] = Math.min(9999, Math.max(0, Math.floor(value)));
      const next = {
        ...prev,
        autoGatherThresholds: nextThresholds
      };
      // Keep selected cell updated in UI
      if (selectedCell) {
        const matchingCell = next.grid[selectedCell.x]?.[selectedCell.z];
        if (matchingCell) {
          setSelectedCell({ ...matchingCell });
        }
      }
      return next;
    });
  };

  // Synchronize selectedCell with the latest grid cell data in real-time
  useEffect(() => {
    if (!selectedCell || !mapData) return;
    const freshCell = mapData.grid[selectedCell.x]?.[selectedCell.z];
    if (freshCell) {
      // Check if the data is actually different to avoid infinite renders
      const hasChanged = 
        freshCell.hasTree !== selectedCell.hasTree ||
        freshCell.hasRock !== selectedCell.hasRock ||
        freshCell.hasShrub !== selectedCell.hasShrub ||
        freshCell.gatherDesignated !== selectedCell.gatherDesignated ||
        freshCell.resourceNode?.amount !== selectedCell.resourceNode?.amount;
      if (hasChanged) {
        setSelectedCell(freshCell);
      }
    }
  }, [mapData, selectedCell]);

  // Handle ESC key to open/pause the game
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMainMenu) {
          if (showWorldGen) {
            setShowWorldGen(false);
          }
          return;
        }
        // Toggle pause menu
        setShowPauseMenu((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showMainMenu, showWorldGen]);

  // High performance game tick handling solar cycles and tribal simulation
  useEffect(() => {
    if (showMainMenu || showPauseMenu || timeSpeed === 'paused' || gameError) return;

    let lastTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      try {
        const elapsedSeconds = (now - lastTime) / 1000;
        lastTime = now;

        // Calculate incremental speeds (amount of days passed in 1 real-world second)
        // A full cycle (0 to 1 day) at normal rate takes 3 minutes (180s). Fast is 50s, Super is 16s.
        let rateOfTime = 0.005556; 
        if (timeSpeed === 'fast') rateOfTime = 0.020;
        if (timeSpeed === 'super') rateOfTime = 0.0625;

        const deltaDays = rateOfTime * elapsedSeconds;

        // Progress game clock ticks
        setGameDays((prev) => prev + deltaDays);

        // Mutate mapData and tribespeople atomically on each frame
        setMapData((prevMap) => {
          try {
            const nextMap = { ...prevMap };
            nextMap.grid = prevMap.grid.map((row) => [...row]);
            nextMap.stockpile = { ...prevMap.stockpile };

            // 1. Process Crafting Queue Item
            if (nextMap.craftQueue && nextMap.craftQueue.length > 0) {
              const activeJob = { ...nextMap.craftQueue[0] };
              
              // Artisans boost craft speed
              const artisanCount = tribeRef.current.filter(p => p.isAlive && p.role === 'Artisan').length;
              const craftSpeedBonus = 1.0 + artisanCount * 1.5; // +150% speed per Artisan!
              
              activeJob.progress += deltaDays * 350 * craftSpeedBonus; // Takes ~5-8 gameplay hours to craft
              
              if (activeJob.progress >= activeJob.maxProgress) {
                const recipeId = activeJob.recipeId;
                const currentQty = (nextMap.stockpile as any)[recipeId] || 0;
                (nextMap.stockpile as any)[recipeId] = currentQty + 1;
                
                const recipeName = RECIPE_DATABASE[recipeId]?.name || recipeId;
                addLog(`✨ Crafting Complete: The tribe has successfully assembled a "${recipeName}"!`, 'level');
                
                nextMap.craftQueue = nextMap.craftQueue.slice(1);
              } else {
                nextMap.craftQueue = [activeJob, ...nextMap.craftQueue.slice(1)];
              }
            }

            // 1.5 Process Active Relic Study
            if (nextMap.activeRelicStudy) {
              const study = { ...nextMap.activeRelicStudy };
              const currentOracle = tribeRef.current.find(t => t.name === study.oracleName && t.isAlive);
              const currentLvl = currentOracle ? (currentOracle.skills.Healer?.level ?? 1) : study.oracleHealerLevel;
              const studyRate = 1.0 + (currentLvl - 1) * 0.15;
              
              // Only progress study if Oracle has physically arrived at the research station
              const isArrived = currentOracle && 
                                currentOracle.activeJobType === 'StudyRelic' && 
                                currentOracle.jobTargetCoords && 
                                Math.sqrt((currentOracle.x - currentOracle.jobTargetCoords.x) ** 2 + (currentOracle.z - currentOracle.jobTargetCoords.z) ** 2) < 0.8;

              if (isArrived) {
                study.daysProgress += deltaDays * studyRate;
              }
              
              if (study.daysProgress >= study.totalDaysRequired) {
                if (study.rewardType === 'rp') {
                  nextMap.researchPoints = Math.round((nextMap.researchPoints + 35.0) * 10) / 10;
                } else if (study.rewardType === 'resources') {
                  nextMap.stockpile.wood += 100;
                  nextMap.stockpile.stone += 100;
                  nextMap.stockpile.gold = (nextMap.stockpile.gold ?? 0) + 5;
                } else if (study.rewardType === 'healing') {
                  (nextMap as any).triggerHealingReward = true;
                }
                
                addLog(`🔮 Relic Deciphered! Oracle "${study.oracleName}" has fully translated "${study.relicName}".`, 'success');
                addLog(`📜 Decoded Message: "${study.decodedMessage}"`, 'level');
                
                nextMap.activeRelicStudy = undefined;
              } else {
                nextMap.activeRelicStudy = study;
              }
            }

            // 1.7 Advance the Storm!
            if (nextMap.eyePos === undefined) {
              nextMap.eyePos = { x: nextMap.grid.length / 2, z: nextMap.grid.length / 2 };
            }
            if (nextMap.eyeRadius === undefined) {
              nextMap.eyeRadius = 14.0;
            }
            if (nextMap.eyeMovementState === undefined) {
              nextMap.eyeMovementState = 'stable';
            }
            if (nextMap.stormSpeed === undefined) {
              nextMap.stormSpeed = 1.8; // cells per game day
            }
            if (!nextMap.futureEyePath || nextMap.futureEyePath.length === 0) {
              const size = nextMap.grid.length;
              const futureEyePath: { x: number; z: number }[] = [];
              let curX = nextMap.eyePos.x;
              let curZ = nextMap.eyePos.z;
              let curAngle = Math.random() * Math.PI * 2;
              for (let i = 0; i < 6; i++) {
                // Calculate dynamic migration distance scaling with days survived and tribe size
                const days = nextMap.gameDaysPlayed ?? 0;
                let baseMin = 12;
                let baseMax = 18;
                let dayMultiplier = 1.0 + Math.min(1.2, days * 0.04);
                let tribeMultiplier = 1.0 + Math.min(0.4, ((tribeRef.current?.length ?? 0) - 4) * 0.05);
                const randomFactor = 0.85 + Math.random() * 0.3;
                let finalDist = (baseMin + Math.random() * (baseMax - baseMin)) * dayMultiplier * tribeMultiplier * randomFactor;
                // Clamp within safe, interesting boundaries based on game phase
                if (days < 5) finalDist = Math.max(10, Math.min(18, finalDist));
                else if (days < 15) finalDist = Math.max(15, Math.min(28, finalDist));
                else finalDist = Math.max(22, Math.min(42, finalDist));

                curAngle += (Math.random() - 0.5) * 0.6;
                curX = Math.max(14.5, Math.min(5000.0, curX + Math.cos(curAngle) * finalDist));
                curZ = Math.max(14.5, Math.min(5000.0, curZ + Math.sin(curAngle) * finalDist));
                futureEyePath.push({ x: parseFloat(curX.toFixed(1)), z: parseFloat(curZ.toFixed(1)) });
              }
              nextMap.futureEyePath = futureEyePath;
            }

            const currentSpeed = nextMap.deityModeOverrideSpeed !== undefined ? nextMap.deityModeOverrideSpeed : (nextMap.stormSpeed ?? 1.8);
            const isDeityPaused = nextMap.deityModePaused === true;

            if (!isDeityPaused) {
              if (nextMap.eyeMovementState === 'stable') {
                if (nextMap.eyeAnchorPos === undefined) {
                  nextMap.eyeAnchorPos = { x: nextMap.eyePos.x, z: nextMap.eyePos.z };
                }

                // Slow, organic drift around anchor position (up to 2.0 blocks)
                const driftTime = (nextMap.gameDaysPlayed ?? 0) * Math.PI * 0.15;
                const driftX = Math.sin(driftTime) * 2.0;
                const driftZ = Math.cos(driftTime * 0.7) * 2.0;

                nextMap.eyePos.x = nextMap.eyeAnchorPos.x + driftX;
                nextMap.eyePos.z = nextMap.eyeAnchorPos.z + driftZ;

                if (nextMap.stormDaysUntilMigration !== undefined) {
                  const previousDays = prevMap.stormDaysUntilMigration ?? 12;
                  nextMap.stormDaysUntilMigration -= deltaDays;
                  
                  if (previousDays > 0 && nextMap.stormDaysUntilMigration <= 0) {
                    if (nextMap.futureEyePath && nextMap.futureEyePath.length > 0) {
                      nextMap.eyeAnchorPos = undefined; // Reset anchor for next landing
                      nextMap.eyeTargetPos = nextMap.futureEyePath[0];
                      nextMap.futureEyePath.shift();
                      nextMap.eyeMovementState = 'migrating';
                      addLog(`🔮 THE ORACLE'S PREDICTION HAS COME TO PASS! The Storm Eye begins migrating to a new safe-zone! Pack up and move immediately!`, 'warning');
                    }
                  }
                }
              }

              if (nextMap.eyeMovementState === 'migrating' && nextMap.eyeTargetPos) {
                const dx = nextMap.eyeTargetPos.x - nextMap.eyePos.x;
                const dz = nextMap.eyeTargetPos.z - nextMap.eyePos.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                const moveDist = currentSpeed * deltaDays;

                if (nextMap.isMigrationTravelActive) {
                  nextMap.caravanPos = { x: nextMap.eyePos.x, z: nextMap.eyePos.z };
                  setFocusCoordinates({ x: nextMap.eyePos.x, z: nextMap.eyePos.z });
                  
                  if (dist <= moveDist || nextMap.eyePos.x >= nextMap.grid.length - 15.0) {
                    nextMap.triggerMigrationComplete = true;
                  }
                }

                // Update heading string based on vector
                if (dist > 0.01) {
                  const headingRad = Math.atan2(dz, dx);
                  let deg = (headingRad * 180) / Math.PI;
                  if (deg < 0) deg += 360;
                  
                  if (deg >= 337.5 || deg < 22.5) nextMap.stormMovementDirection = 'East';
                  else if (deg >= 22.5 && deg < 67.5) nextMap.stormMovementDirection = 'Southeast';
                  else if (deg >= 67.5 && deg < 112.5) nextMap.stormMovementDirection = 'South';
                  else if (deg >= 112.5 && deg < 157.5) nextMap.stormMovementDirection = 'Southwest';
                  else if (deg >= 157.5 && deg < 202.5) nextMap.stormMovementDirection = 'West';
                  else if (deg >= 202.5 && deg < 247.5) nextMap.stormMovementDirection = 'Northwest';
                  else if (deg >= 247.5 && deg < 292.5) nextMap.stormMovementDirection = 'North';
                  else if (deg >= 292.5 && deg < 337.5) nextMap.stormMovementDirection = 'Northeast';
                }

                if (dist <= moveDist) {
                  nextMap.eyePos = { ...nextMap.eyeTargetPos };
                  nextMap.eyeMovementState = 'stable';
                  nextMap.eyeAnchorPos = { ...nextMap.eyeTargetPos }; // Anchor here
                  nextMap.eyeTargetPos = undefined;
                  
                  const daysVal = nextMap.gameDaysPlayed ?? 0;
                  if (daysVal < 5) {
                    nextMap.stormDaysUntilMigration = 35 + Math.floor(Math.random() * 10); // 35-45 days for early game
                  } else if (daysVal < 15) {
                    nextMap.stormDaysUntilMigration = 30 + Math.floor(Math.random() * 10); // 30-40 days for mid game
                  } else {
                    nextMap.stormDaysUntilMigration = 25 + Math.floor(Math.random() * 10); // 25-35 days for late game
                  }
                  
                  const size = nextMap.grid.length;
                  const lastWp = (nextMap.futureEyePath && nextMap.futureEyePath.length > 0) 
                    ? nextMap.futureEyePath[nextMap.futureEyePath.length - 1] 
                    : nextMap.eyePos;
                  const curAngle = Math.random() * Math.PI * 2;
                  
                  // Calculate dynamic migration distance scaling with days survived and tribe size
                  let baseMin = 12;
                  let baseMax = 18;
                  let dayMultiplier = 1.0 + Math.min(1.2, daysVal * 0.04);
                  let tribeMultiplier = 1.0 + Math.min(0.4, ((tribeRef.current?.length ?? 0) - 4) * 0.05);
                  const randomFactor = 0.85 + Math.random() * 0.3;
                  let finalDist = (baseMin + Math.random() * (baseMax - baseMin)) * dayMultiplier * tribeMultiplier * randomFactor;
                  if (daysVal < 5) finalDist = Math.max(10, Math.min(18, finalDist));
                  else if (daysVal < 15) finalDist = Math.max(15, Math.min(28, finalDist));
                  else finalDist = Math.max(22, Math.min(42, finalDist));

                  const nextX = Math.max(14.5, Math.min(5000.0, lastWp.x + Math.cos(curAngle) * finalDist));
                  const nextZ = Math.max(14.5, Math.min(5000.0, lastWp.z + Math.sin(curAngle) * finalDist));
                  if (!nextMap.futureEyePath) nextMap.futureEyePath = [];
                  nextMap.futureEyePath.push({ x: parseFloat(nextX.toFixed(1)), z: parseFloat(nextZ.toFixed(1)) });

                  addLog(`✨ THE STORM EYE HAS STABILIZED! A temporary safe zone has been secured here. Rebuild your encampment and rest before the eye shifts again.`, 'success');
                } else {
                  nextMap.eyePos.x += (dx / dist) * moveDist;
                  nextMap.eyePos.z += (dz / dist) * moveDist;
                }
              }
            }

            // Food decays/rots when outside the eye or during migration
            if (nextMap.eyeMovementState === 'migrating' || (nextMap.stormDaysUntilMigration !== undefined && nextMap.stormDaysUntilMigration <= 0)) {
              nextMap.stockpile.food = Math.max(0, nextMap.stockpile.food - deltaDays * 35.0);
              if (nextMap.stockpile.berriesFresh > 0) nextMap.stockpile.berriesFresh = Math.max(0, nextMap.stockpile.berriesFresh - deltaDays * 45.0);
              if (nextMap.stockpile.meatFresh > 0) nextMap.stockpile.meatFresh = Math.max(0, nextMap.stockpile.meatFresh - deltaDays * 45.0);
              if (nextMap.stockpile.rootsFresh > 0) nextMap.stockpile.rootsFresh = Math.max(0, nextMap.stockpile.rootsFresh - deltaDays * 45.0);
              if (nextMap.stockpile.mushroomsFresh > 0) nextMap.stockpile.mushroomsFresh = Math.max(0, nextMap.stockpile.mushroomsFresh - deltaDays * 45.0);
            }

            // 1.75 ACTIVE PLAYER TRIBE RESOURCE CONSUMPTION
            const aliveTribeSize = tribeRef.current.filter(p => p.isAlive).length;
            if (aliveTribeSize > 0) {
              const dailyFoodPerPerson = 1.0;
              const dailyWaterPerPerson = 1.0;
              const totalFoodToConsume = dailyFoodPerPerson * aliveTribeSize * deltaDays;
              const totalWaterToConsume = dailyWaterPerPerson * aliveTribeSize * deltaDays;

              // Consume food starting with most perishable or common: berries, mushrooms, roots, meat
              let remainingFoodToConsume = totalFoodToConsume;
              const foodTypes: ('berries' | 'mushrooms' | 'roots' | 'meat')[] = ['berries', 'mushrooms', 'roots', 'meat'];
              for (const type of foodTypes) {
                const qty = nextMap.stockpile[type] || 0;
                if (qty > 0) {
                  const consumeAmount = Math.min(qty, remainingFoodToConsume);
                  nextMap.stockpile[type] = parseFloat((qty - consumeAmount).toFixed(2));
                  remainingFoodToConsume -= consumeAmount;
                }
              }

              // Consume water: rainwater, dew, reservoirWater
              let remainingWaterToConsume = totalWaterToConsume;
              const waterTypes: ('rainwater' | 'dew' | 'reservoirWater')[] = ['rainwater', 'dew', 'reservoirWater'];
              for (const type of waterTypes) {
                const qty = nextMap.stockpile[type] || 0;
                if (qty > 0) {
                  const consumeAmount = Math.min(qty, remainingWaterToConsume);
                  nextMap.stockpile[type] = parseFloat((qty - consumeAmount).toFixed(2));
                  remainingWaterToConsume -= consumeAmount;
                }
              }

              // Keep main food total synchronized
              nextMap.stockpile.food = parseFloat((
                (nextMap.stockpile.berries || 0) +
                (nextMap.stockpile.roots || 0) +
                (nextMap.stockpile.mushrooms || 0) +
                (nextMap.stockpile.meat || 0)
              ).toFixed(2));
            }

            // 1.8 OFF-SCREEN VILLAGE SIMULATION & PHYSICAL VISITOR TICKS
            const currentDays = (gameDaysRef.current ?? 0.40) + deltaDays;
            nextMap.gameDaysPlayed = currentDays;

            // Weekly Off-Screen Simulation Ticks (every 7 game days)
            const lastSimDay = prevMap.lastVillageSimulationDay ?? 0.40;
            if (currentDays - lastSimDay >= 7.0) {
              const { updatedVillages, newMessages } = runWeeklyVillageSimulation(prevMap, currentDays, addLog);
              nextMap.knownVillages = updatedVillages;
              nextMap.oracleMessages = [...newMessages, ...(prevMap.oracleMessages || [])].slice(0, 50);
              nextMap.lastVillageSimulationDay = currentDays;
            }

            // Daily Visitor Arrival Rolls (on integer day rollover)
            const lastCheckDay = prevMap.lastVisitorCheckDay ?? Math.floor(currentDays);
            if (Math.floor(currentDays) > lastCheckDay) {
              nextMap.lastVisitorCheckDay = Math.floor(currentDays);
              
              // Daily warning logs for critical food or water levels
              const activeTribeCount = tribeRef.current.filter(p => p.isAlive).length;
              if (activeTribeCount > 0) {
                const totalWaterRemaining = (nextMap.stockpile.rainwater || 0) + (nextMap.stockpile.dew || 0) + (nextMap.stockpile.reservoirWater || 0);
                const daysFoodLeft = (nextMap.stockpile.food || 0) / activeTribeCount;
                const daysWaterLeft = totalWaterRemaining / activeTribeCount;

                if (nextMap.stockpile.food <= 0) {
                  addLog(`💀 FAMINE OVERHEAD: The tribe is starving! Zero food remains in stockpile. Health will deteriorate rapidly unless food is secured!`, 'warning');
                } else if (daysFoodLeft < 2.0) {
                  addLog(`⚠️ CRITICAL FOOD SUPPLY: Only ${(nextMap.stockpile.food || 0).toFixed(0)} units of food left (${daysFoodLeft.toFixed(1)} days of supply). Assign Gatherers or Hunters!`, 'warning');
                }

                if (totalWaterRemaining <= 0) {
                  addLog(`💀 DEHYDRATION CRISIS: The tribe's water supply has completely run dry! Build wells or collect rainwater before they collapse!`, 'warning');
                } else if (daysWaterLeft < 2.0) {
                  addLog(`⚠️ CRITICAL WATER SUPPLY: Only ${totalWaterRemaining.toFixed(0)} units of water left (${daysWaterLeft.toFixed(1)} days of supply). Set up rain catchers or wells!`, 'warning');
                }
              }

              // Only spawn new visitor group if the previous group departed
              if (!nextMap.activeVisitorGroup) {
                const visitorGroup = rollDailyVisitorArrival(currentDays, nextMap.knownVillages || []);
                if (visitorGroup) {
                  nextMap.activeVisitorGroup = visitorGroup;
                  addLog(`👥 CONTACT: A ${visitorGroup.name} has arrived at the boundary of your loaded area! Visit the Oracle menu or check the campsite.`, 'info');
                }
              }
            }

            // Visitor Timer Decay & Auto-Departure
            if (nextMap.activeVisitorGroup) {
              const visitor = { ...nextMap.activeVisitorGroup };
              visitor.daysRemaining -= deltaDays;
              if (visitor.daysRemaining <= 0) {
                addLog(`👥 Departure: The ${visitor.name} has packed up their belongings and departed.`, 'info');
                nextMap.activeVisitorGroup = null;
              } else {
                nextMap.activeVisitorGroup = visitor;
              }
            }

            // Active Trade Caravans Ticking
            if (nextMap.activeTradeCaravans && nextMap.activeTradeCaravans.length > 0) {
              const updatedCaravans: any[] = [];
              nextMap.activeTradeCaravans.forEach((caravan: any) => {
                const updated = { ...caravan };
                updated.daysRemaining -= deltaDays;
                if (updated.daysRemaining <= 0) {
                  // Caravan completed!
                  // Add cargo items or silver to stockpile
                  if (updated.cargo) {
                    Object.entries(updated.cargo).forEach(([item, qty]: [string, any]) => {
                      nextMap.stockpile[item] = (nextMap.stockpile[item] || 0) + qty;
                    });
                  }
                  
                  // Modify target village relationship & trust
                  if (nextMap.knownVillages) {
                    nextMap.knownVillages = nextMap.knownVillages.map((v: any) => {
                      if (v.id === updated.villageId) {
                        const relBoost = updated.messengerType === 'oracle' ? 18 : updated.messengerType === 'armed' ? 8 : 4;
                        const trustBoost = Math.round(relBoost * 1.5);
                        
                        // Clear active shortages if we sent those as aid!
                        let majorShortages = [...(v.majorShortages || [])];
                        let foodVal = v.food ?? 50;
                        let waterVal = v.water ?? 50;
                        let medVal = v.medicine ?? 20;

                        if (updated.cargoSent) {
                          Object.entries(updated.cargoSent).forEach(([itemSent, qtySent]: [string, any]) => {
                            if (itemSent === 'reservoirWater') {
                              majorShortages = majorShortages.filter(s => s !== 'Water');
                              waterVal = Math.min(100, waterVal + 40);
                            }
                            if (itemSent === 'berries' || itemSent === 'meat') {
                              majorShortages = majorShortages.filter(s => s !== 'Food');
                              foodVal = Math.min(100, foodVal + 40);
                            }
                            if (itemSent === 'medicine') {
                              majorShortages = majorShortages.filter(s => s !== 'Medicine');
                              medVal = Math.min(100, medVal + 40);
                            }
                          });
                        }

                        return {
                          ...v,
                          relationship: Math.min(100, v.relationship + relBoost),
                          trust: Math.min(100, v.trust + trustBoost),
                          food: foodVal,
                          water: waterVal,
                          medicine: medVal,
                          majorShortages
                        };
                      }
                      return v;
                    });
                  }

                  addLog(`🪙 TRADE COMPLETED: Your ${updated.messengerType === 'oracle' ? 'Oracle Diplomat' : updated.messengerType === 'armed' ? 'Armed Guard' : 'Scout Runner'} caravan has returned from ${updated.villageName}! Stockpiles updated.`, 'success');
                } else {
                  updatedCaravans.push(updated);
                }
              });
              nextMap.activeTradeCaravans = updatedCaravans;
            }

            // 2. Accumulate Research Points Passively via Spatial Index
            const spatial = getSpatialIndex(nextMap);
            const machinesCount = (spatial.structuresByType['ScienceMachine'] || []).length;
            const precursorGenerators = (spatial.structuresByType['PrecursorGenerator'] || []).length;
            const petrifiedGreenhouses = (spatial.structuresByType['PetrifiedGreenhouse'] || []).length;
            
            // Also Artisans add a minor research boost
            const researcherBonus = tribeRef.current.filter(p => p.isAlive && p.role === 'Artisan').length * 0.4;

            // Accumulate points (base is +0.5 per game day, machines give +4.5 per day, researchers give +1 per day)
            const dayProgressRatio = deltaDays; // percentage of days passed this tick
            const newRP = (0.5 + machinesCount * 4.5 + precursorGenerators * 15.5 + researcherBonus) * dayProgressRatio;
            nextMap.researchPoints = Math.round((prevMap.researchPoints + newRP) * 100) / 100;

            const newFood = petrifiedGreenhouses * 12.0 * dayProgressRatio;
            if (newFood > 0) {
              nextMap.stockpile.food = Math.round((nextMap.stockpile.food + newFood) * 10) / 10;
            }

            const startTime = performance.now();
            setTribe((prevTribe) => {
              try {
                // First process our customized ancient-site expedition ticks!
                let simulated = tickExpeditionsSimulation(
                  prevTribe,
                  nextMap,
                  deltaDays,
                  addLog
                );

                // Then process standard survivor needs and job pathfinding
                simulated = tickTribeSimulation(
                  simulated,
                  nextMap,
                  deltaDays,
                  timeSpeed,
                  addLog
                );
                
                // Dynamic Circular Safety Check & Storm Damage
                const checkStormDamage = nextMap.stormWallDamageEnabled !== false;
                const eyeX = nextMap.eyePos?.x ?? (nextMap.grid.length / 2);
                const eyeZ = nextMap.eyePos?.z ?? (nextMap.grid.length / 2);
                const eyeRadius = nextMap.eyeRadius ?? 14.0;
                const eyeRadiusSq = eyeRadius * eyeRadius;

                simulated = simulated.map((p) => {
                  if (p.isAlive) {
                    const dx = p.x - eyeX;
                    const dz = p.z - eyeZ;
                    const distSq = dx * dx + dz * dz;
                    const isOutsideEye = distSq > (eyeRadius + 1.5) * (eyeRadius + 1.5);

                    const isScoutOrStormrider = 
                      p.role === 'Scout' && (p.skills?.Scout?.level ?? 1) >= 5;

                    if (isOutsideEye && checkStormDamage && !isScoutOrStormrider) {
                      const damageAmount = deltaDays * 360; // 15 HP lost per game hour (360 per day)
                      const nextHealth = Math.max(0, p.stats.health - damageAmount);
                      const stats = { ...p.stats, health: nextHealth };
                      
                      if (nextHealth <= 0) {
                        addLog(`💀 ${p.name} was left behind by the migrating Eye and has been disintegrated by the Storm Wall!`, 'death');
                        return { ...p, isAlive: false, deathReason: 'Storm Static Disintegration', stats };
                      }
                      
                      // Notify occasionally
                      if (Math.random() < 0.05 * deltaDays) {
                        addLog(`⚠️ STORM DAMAGE: ${p.name} is caught outside the Eye of the Storm! (Health degrading!)`, 'warning');
                      }
                      return { ...p, stats };
                    }
                  }
                  return p;
                });
                
                const endTime = performance.now();
                (nextMap as any).perfSimulationTimeMs = endTime - startTime;

                if ((nextMap as any).triggerHealingReward) {
                  simulated = simulated.map((p) => {
                    if (p.isAlive) {
                      return {
                        ...p,
                        stats: {
                          ...p.stats,
                          health: Math.min(100, p.stats.health + 50)
                        }
                      };
                    }
                    return p;
                  });
                  delete (nextMap as any).triggerHealingReward;
                }
                return simulated;
              } catch (simError: any) {
                console.error("TRIBE SIMULATION TICK CRASH:", simError);
                setGameError(simError.message || String(simError));
                return prevTribe;
              }
            });

            const directorMap = tickAIDirector(tribeRef.current, nextMap, deltaDays, addLog);
            updateWorldChunkLoading(directorMap);
            const lastWarn = (directorMap as any).lastToolWarning;
            if (lastWarn) {
              showTempWarning(lastWarn);
              delete (directorMap as any).lastToolWarning;
            }
            return directorMap;
          } catch (mapError: any) {
            console.error("MAP DATA UPDATE TICK CRASH:", mapError);
            setGameError(mapError.message || String(mapError));
            return prevMap;
          }
        });

        frameId = requestAnimationFrame(tick);
      } catch (loopError: any) {
        console.error("GAME TICK CRASH:", loopError);
        setGameError(loopError.message || String(loopError));
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [timeSpeed, gameError, showMainMenu, showPauseMenu]);

  // Helper callbacks
  const handleSpawnTribe = (count: number) => {
    setTribe((prev) => {
      const addition: Tribesperson[] = [];
      const currentMap = mapDataRef.current;
      for (let i = 0; i < count; i++) {
        addition.push(createTribesperson(Math.random().toString(36).slice(2, 9), currentMap));
      }
      addLog(`👤 Muster completed: Spawning ${count} new wanderers into the clan.`, 'info');
      // If we spawn count large, center focal target on first addition
      if (addition.length > 0) {
        setFocusCoordinates({ x: addition[0].x, z: addition[0].z });
      }
      return [...prev, ...addition];
    });
  };

  const handleChangePriorities = (personId: string, job: JobCategory, priority: JobPriority) => {
    setTribe((prev) => prev.map((p) => {
      if (p.id !== personId) return p;
      return {
        ...p,
        priorities: {
          ...p.priorities,
          [job]: priority,
        },
        activeJobType: null,
        jobTargetCoords: null,
      };
    }));
  };

  const handleDesignateConstruction = (
    x: number, 
    z: number, 
    type: string
  ) => {
    const woodCosts: Record<string, number> = { Shelter: 40, WaterWell: 10, LogWall: 5, StorageBin: 25, Wheat: 0, Tent: 25, Shrine: 15, WatchTower: 40, ArtisanBench: 30, ScienceMachine: 40, RuinousAltar: 50, Fireplace: 20, PetrifiedGreenhouse: 50, PrecursorGenerator: 20, AegisBeacon: 40, GatherersPantry: 35, HuntersHut: 40, BuildersLodge: 50, FarmersGranary: 25, ScoutsLookout: 30, HealersSanctum: 30, ArtisansWorkshop: 40, ObservationPlatform: 30, Observatory: 55, RelicArchive: 45, MeditationShrine: 25, MapHall: 40 };
    const stoneCosts: Record<string, number> = { Shelter: 0, WaterWell: 30, LogWall: 0, StorageBin: 10, Wheat: 0, Tent: 0, Shrine: 25, WatchTower: 60, ArtisanBench: 10, ScienceMachine: 40, RuinousAltar: 80, Fireplace: 15, PetrifiedGreenhouse: 30, PrecursorGenerator: 60, AegisBeacon: 40, GatherersPantry: 15, HuntersHut: 10, BuildersLodge: 10, FarmersGranary: 25, ScoutsLookout: 20, HealersSanctum: 30, ArtisansWorkshop: 20, ObservationPlatform: 15, Observatory: 50, RelicArchive: 45, MeditationShrine: 35, MapHall: 30 };
    const foodCosts: Record<string, number> = { Shelter: 0, WaterWell: 0, LogWall: 0, StorageBin: 0, Wheat: 10, Tent: 0, Shrine: 0, WatchTower: 0, ArtisanBench: 0, ScienceMachine: 0, RuinousAltar: 0, Fireplace: 0, PetrifiedGreenhouse: 0, PrecursorGenerator: 0, AegisBeacon: 0, GatherersPantry: 0, HuntersHut: 0, BuildersLodge: 0, FarmersGranary: 0, ScoutsLookout: 0, HealersSanctum: 0, ArtisansWorkshop: 0, ObservationPlatform: 0, Observatory: 0, RelicArchive: 0, MeditationShrine: 0, MapHall: 0 };
    const goldCosts: Record<string, number> = { Shelter: 0, WaterWell: 0, LogWall: 0, StorageBin: 0, Wheat: 0, Tent: 0, Shrine: 0, WatchTower: 0, ArtisanBench: 0, ScienceMachine: 0, RuinousAltar: 5, Fireplace: 0, PetrifiedGreenhouse: 0, PrecursorGenerator: 0, AegisBeacon: 0, GatherersPantry: 0, HuntersHut: 0, BuildersLodge: 0, FarmersGranary: 0, ScoutsLookout: 0, HealersSanctum: 0, ArtisansWorkshop: 0, ObservationPlatform: 0, Observatory: 0, RelicArchive: 0, MeditationShrine: 0, MapHall: 0 };
    const silverCosts: Record<string, number> = { Shelter: 0, WaterWell: 0, LogWall: 0, StorageBin: 0, Wheat: 0, Tent: 0, Shrine: 0, WatchTower: 0, ArtisanBench: 0, ScienceMachine: 0, RuinousAltar: 3, Fireplace: 0, PetrifiedGreenhouse: 0, PrecursorGenerator: 0, AegisBeacon: 0, GatherersPantry: 0, HuntersHut: 0, BuildersLodge: 0, FarmersGranary: 0, ScoutsLookout: 0, HealersSanctum: 0, ArtisansWorkshop: 0, ObservationPlatform: 0, Observatory: 0, RelicArchive: 0, MeditationShrine: 0, MapHall: 0 };

    const woodCost = woodCosts[type] ?? 0;
    const stoneCost = stoneCosts[type] ?? 0;
    const foodCost = foodCosts[type] ?? 0;
    const goldCost = goldCosts[type] ?? 0;
    const silverCost = silverCosts[type] ?? 0;

    const currentMap = mapDataRef.current;

    // Check custom multi-tile 2x2 validation if placing Shelter
    if (type === 'Shelter') {
      const size = currentMap.grid.length;
      for (let dx = 0; dx < 2; dx++) {
        for (let dz = 0; dz < 2; dz++) {
          const nx = x + dx;
          const nz = z + dz;
          if (nx >= size || nz >= size) {
            addLog(`⚠️ Cannot place Shelter! It occupies a 2x2 space and exceeds map bounds.`, "warning");
            return;
          }
          const checkCell = currentMap.grid[nx]?.[nz];
          if (!checkCell || checkCell.structure || checkCell.construction || checkCell.farmCrop || checkCell.biome === 'water') {
            addLog(`⚠️ Cannot place Shelter! The 2x2 space must be flat land and free of other buildings/water/crops.`, "warning");
            return;
          }
        }
      }
    } else {
      // Safety check: Is the tile occupied?
      const cellCheck = currentMap.grid[x]?.[z];
      if (!cellCheck || cellCheck.structure || cellCheck.construction || cellCheck.farmCrop) {
        addLog(`⚠️ Cannot place blueprint! Block [${x}, ${z}] is already occupied. Clear it first!`, "warning");
        return;
      }
    }

    if (!isCreativeMode) {
      if (
        currentMap.stockpile.wood < woodCost || 
        currentMap.stockpile.stone < stoneCost || 
        currentMap.stockpile.food < foodCost ||
        (currentMap.stockpile.gold ?? 0) < goldCost ||
        (currentMap.stockpile.silver ?? 0) < silverCost
      ) {
        addLog(`⚠️ Cannot designate blueprint! Need ${woodCost} wood, ${stoneCost} stone, ${foodCost} food${goldCost ? `, ${goldCost} gold` : ''}${silverCost ? `, ${silverCost} silver` : ''}.`, "warning");
        return;
      }
    }

    setMapData((prevMap) => {
      const nextMap = { ...prevMap };
      // Force all idle/active agents to re-evaluate priorities immediately to start building
      nextMap.forceJobReevaluation = (prevMap.forceJobReevaluation ?? 0) + 1;
      nextMap.grid = prevMap.grid.map(row => [...row]);
      nextMap.stockpile = {
        ...prevMap.stockpile,
        wood: isCreativeMode ? prevMap.stockpile.wood : prevMap.stockpile.wood - woodCost,
        stone: isCreativeMode ? prevMap.stockpile.stone : prevMap.stockpile.stone - stoneCost,
        food: isCreativeMode ? prevMap.stockpile.food : prevMap.stockpile.food - foodCost,
        gold: isCreativeMode ? (prevMap.stockpile.gold ?? 0) : (prevMap.stockpile.gold ?? 0) - goldCost,
        silver: isCreativeMode ? (prevMap.stockpile.silver ?? 0) : (prevMap.stockpile.silver ?? 0) - silverCost,
      };

      const cell = nextMap.grid[x][z];
      cell.scouted = true; // Auto-scouted so builders can see it

      // When building on a tile with resources, the resource disappears and can't regrow till empty again
      if (cell.resourceNode) {
        cell.resourceNode.amount = 0;
        cell.resourceNode.regrowTimer = 0;
      }
      cell.hasTree = false;
      cell.hasRock = false;
      cell.hasShrub = false;

      const cropTypes: Record<string, string> = {
        Wheat: 'Solar Wheat',
        AmberMaize: 'Amber Glow-Corn',
        VortexCabbage: 'Vortex Jade-Cabbage',
        Gemberries: 'Cinder Gem-Berry',
        Stormroot: 'Storm-Root Bulb'
      };

      if (cropTypes[type]) {
        cell.farmCrop = {
          type: type as any,
          stage: 'sown',
          progress: 0,
        };
        cell.inspectableName = `Sown ${cropTypes[type]} Crop Plot`;
      } else {
        cell.construction = {
          type,
          progress: 0,
          maxProgress: 100,
        };
        cell.inspectableName = `Unfinished blueprints: ${type}`;

        if (type === 'Shelter') {
          (cell as any).isMultiTileParent = true;
          const childOffsets = [[1, 0], [0, 1], [1, 1]];
          childOffsets.forEach(([dx, dz]) => {
            const cCell = nextMap.grid[x + dx][z + dz];
            cCell.scouted = true;
            if (cCell.resourceNode) {
              cCell.resourceNode.amount = 0;
              cCell.resourceNode.regrowTimer = 0;
            }
            cCell.hasTree = false;
            cCell.hasRock = false;
            cCell.hasShrub = false;
            cCell.construction = {
              type,
              progress: 0,
              maxProgress: 100,
            };
            (cCell as any).isMultiTileChildOf = { x, z };
            cCell.inspectableName = `Unfinished blueprints: Shelter child`;
          });
        }
      }

      if (nextMap.spatialIndex) {
        nextMap.spatialIndex.dirty = true;
      }
      nextMap.forceJobReevaluation = (nextMap.forceJobReevaluation ?? 0) + 1;
      return nextMap;
    });

    const isCropPlot = ['Wheat', 'AmberMaize', 'VortexCabbage', 'Gemberries', 'Stormroot', 'Pumpkin'].includes(type);
    const targetJob = isCropPlot ? 'Farm' : 'Build';

    setTribe((prevTribe) => {
      const living = prevTribe.filter(p => p.isAlive);
      if (living.length === 0) return prevTribe;

      const ranked = [...living].sort((a, b) => {
        const lvlA = targetJob === 'Build' ? (a.skills.Builder?.level ?? 1) : (a.skills.Farmer?.level ?? 1);
        const lvlB = targetJob === 'Build' ? (b.skills.Builder?.level ?? 1) : (b.skills.Farmer?.level ?? 1);

        const roleBonusA = targetJob === 'Build' ? (a.role === 'Builder' ? 50 : 0) : (a.role === 'Farmer' ? 50 : 0);
        const roleBonusB = targetJob === 'Build' ? (b.role === 'Builder' ? 50 : 0) : (b.role === 'Farmer' ? 50 : 0);

        const stateA = (a.activeJobType !== 'Sleep' && a.stats.fatigue > 15) ? 100 : 0;
        const stateB = (b.activeJobType !== 'Sleep' && b.stats.fatigue > 15) ? 100 : 0;

        const distA = Math.hypot(a.x - x, a.z - z);
        const distB = Math.hypot(b.x - x, b.z - z);

        const scoreA = (lvlA * 100) + roleBonusA + stateA - distA;
        const scoreB = (lvlB * 100) + roleBonusB + stateB - distB;

        return scoreB - scoreA;
      });

      if (ranked.length === 0) return prevTribe;

      const leadWorker = ranked[0];
      const leadLvl = targetJob === 'Build' ? (leadWorker.skills.Builder?.level ?? 1) : (leadWorker.skills.Farmer?.level ?? 1);

      // Select lead + up to 2 helper assistants
      const helpers = ranked.slice(0, Math.min(3, ranked.length));
      const helperIds = new Set(helpers.map(h => h.id));

      addLog(`🏗️ Task Assigned: ${targetJob === 'Build' ? 'Builder' : 'Farmer'} ${leadWorker.name} (Level ${leadLvl}) ${helpers.length > 1 ? `and ${helpers.length - 1} assistant(s)` : ''} assigned to [${x}, ${z}]!`, 'success');

      return prevTribe.map((p) => {
        if (helperIds.has(p.id)) {
          const isLead = p.id === leadWorker.id;
          return {
            ...p,
            activeJobType: targetJob as any,
            jobTargetCoords: { x, z },
            targetX: x,
            targetZ: z,
            workProgress: 0,
            isManualDirectTask: true,
            statusText: isLead
              ? `🔨 ${targetJob === 'Build' ? 'Constructing' : 'Farming'} at [${x}, ${z}]`
              : `🤝 Assisting ${leadWorker.name} with ${targetJob} at [${x}, ${z}]`
          };
        }
        return p;
      });
    });

    addLog(`🏗️ Placed blueprint: ${type} at [${x}, ${z}]. Cost: ${woodCost} wood, ${stoneCost} stone, ${foodCost} food deducted.`, "info");
  };

  const handleExecuteManualAction = (
    x: number,
    z: number,
    actionId: string
  ) => {
    let outputCell: CellInfo | null = null;
    let success = false;

    setMapData((prev) => {
      const nextMap = { ...prev };
      nextMap.grid = prev.grid.map((row) => [...row]);
      nextMap.stockpile = { ...prev.stockpile };

      const cell = nextMap.grid[x]?.[z];
      if (!cell) return prev;

      const hasPickaxe = (nextMap.stockpile.flintPickaxe ?? 0) > 0 || 
                         (nextMap.stockpile.steelPickaxe ?? 0) > 0 ||
                         (nextMap.caravanInventory?.items?.flintPickaxe ?? 0) > 0 ||
                         (nextMap.caravanInventory?.items?.steelPickaxe ?? 0) > 0;

      const hasAxe = (nextMap.stockpile.stoneAxe ?? 0) > 0 ||
                     (nextMap.caravanInventory?.items?.stoneAxe ?? 0) > 0;

      if (actionId === 'gatherWood') {
        if (cell.hasTree || (cell.resourceNode && cell.resourceNode.type === 'Wood')) {
          if (hasAxe) {
            cell.gatherDesignated = true;
            addLog(`🪓 Designated Wood cluster for felling! Gatherers will chop and haul the materials.`, 'info');
            success = true;
          } else {
            addLog(`⚠️ Cannot chop tree! Need an axe in the stockpile.`, 'warning');
            (nextMap as any).lastToolWarning = 'needs axe';
          }
        }
      } 
      else if (actionId === 'gatherBerries') {
        if (cell.hasShrub || (cell.resourceNode && cell.resourceNode.category === 'food')) {
          cell.gatherDesignated = true;
          
          let amountToHarvest = 0;
          if (cell.resourceNode && cell.resourceNode.amount > 0) {
            amountToHarvest = Math.min(3, cell.resourceNode.amount);
            cell.resourceNode.amount -= amountToHarvest;
            if (cell.resourceNode.amount <= 0) {
              cell.hasShrub = false;
            }
          } else {
            cell.resourceNode = {
              category: 'food',
              type: 'Berries',
              amount: 15,
              maxAmount: 15,
              regrowTimer: 0,
              regrowRate: 1.0,
              quality: 100
            };
            amountToHarvest = 3;
            cell.resourceNode.amount -= amountToHarvest;
          }
          
          if (amountToHarvest > 0) {
            nextMap.stockpile.berries = (nextMap.stockpile.berries ?? 0) + amountToHarvest;
            nextMap.stockpile.food = (nextMap.stockpile.berries ?? 0) + (nextMap.stockpile.roots ?? 0) + (nextMap.stockpile.mushrooms ?? 0) + (nextMap.stockpile.meat ?? 0);
            addLog(`🍇 Manual Pluck: You plucked +${amountToHarvest} Berries directly from the bush! Gatherers will harvest the remaining ${cell.resourceNode?.amount ?? 0} berries.`, 'success');
          } else {
            addLog(`🍇 Designated food cluster for plucking! Gatherers will harvest and haul the products.`, 'info');
          }
          success = true;
        }
      }
      else if (actionId === 'gatherStone') {
        if (cell.hasRock || (cell.resourceNode && cell.resourceNode.type === 'Stone')) {
          if (hasPickaxe) {
            cell.gatherDesignated = true;
            addLog(`🪨 Designated stone boulder for mining! Artisans/Gatherers will quarry and haul the stone.`, 'info');
            success = true;
          } else {
            addLog(`⚠️ Cannot mine stone! Need a pickaxe in the stockpile.`, 'warning');
            (nextMap as any).lastToolWarning = 'needs pickaxe';
          }
        }
      }
      else if (actionId === 'mineOre') {
        if (cell.resourceNode) {
          const nodeType = cell.resourceNode.type;
          if (hasPickaxe) {
            cell.gatherDesignated = true;
            addLog(`⛏️ Designated ${nodeType} ore for extraction! Artisans will mine and haul the ore.`, 'info');
            success = true;
          } else {
            addLog(`⚠️ Cannot mine ${nodeType}! Need a pickaxe in the stockpile.`, 'warning');
            (nextMap as any).lastToolWarning = 'needs pickaxe';
          }
        }
      }
      else if (actionId === 'fireplaceStoke') {
        if (nextMap.stockpile.wood >= 10) {
          nextMap.stockpile.wood -= 10;
          // boost morale of everyone in tribe
          setTribe((t) => t.map(p => ({
            ...p,
            stats: { ...p.stats, morale: Math.min(100, p.stats.morale + 25) }
          })));
          addLog(`🔥 Stoke fire complete: Deducted 10 Wood. Comfort and morale boosted (+25) for village!`, 'level');
          success = true;
        } else {
          addLog(`⚠️ Missing Wood to stoke fireplace! Need 10 Wood.`, 'warning');
        }
      }
      else if (actionId === 'wellDraw') {
        nextMap.stockpile.water = (nextMap.stockpile.water ?? 0) + 20;
        addLog(`🚰 Drew 20L pure drinking water from well! Stockpile refreshed.`, 'info');
        success = true;
      }
      else if (actionId === 'scienceMachineResearch') {
        if (nextMap.stockpile.wood >= 15 && nextMap.stockpile.stone >= 15) {
          nextMap.stockpile.wood -= 15;
          nextMap.stockpile.stone -= 15;
          nextMap.researchPoints += 25.0;
          addLog(`🔬 Conducted active research at the Science Machine! Gained +25 Research Points (+25 RP)!`, 'level');
          success = true;
        } else {
          addLog(`⚠️ Insufficient resources! Need 15 Wood and 15 Stone to conduct laboratory research.`, 'warning');
        }
      }
      else if (actionId === 'shrinePray') {
        if (nextMap.stockpile.food >= 10) {
          nextMap.stockpile.food -= 10;
          nextMap.researchPoints += 20.0;
          setTribe((t) => t.map(p => ({
            ...p,
            stats: { ...p.stats, morale: Math.min(100, p.stats.morale + 15) }
          })));
          addLog(`⛩️ Offered continuous prayers at the Ritual Shrine: +20 RP and +15 Morale granted!`, 'level');
          success = true;
        } else {
          addLog(`⚠️ Insufficient food offering! Need 10 Food.`, 'warning');
        }
      }
      else if (actionId === 'altarEchoes') {
        if (nextMap.stockpile.stone >= 25 && (nextMap.stockpile.gold ?? 0) >= 2) {
          nextMap.stockpile.stone -= 25;
          nextMap.stockpile.gold = (nextMap.stockpile.gold ?? 0) - 2;
          nextMap.stockpile.steelPickaxe = (nextMap.stockpile.steelPickaxe ?? 0) + 1;
          nextMap.researchPoints += 30;
          addLog(`🔮 Sacrament at Ruinous Altar completed: Received +1 Steel Pickaxe and +30 Research Points!`, 'level');
          success = true;
        } else {
          addLog(`⚠️ Altar rejects your offering. Requires 25 Stone and 2 Gold.`, 'warning');
        }
      }
      else if (actionId === 'exploreLandmark') {
        if (cell.landmark && !cell.landmark.explored) {
          const lm = cell.landmark;
          lm.explored = true;
          cell.inspectableName = `✔️ Explored: ${lm.name}`;

          // Rewards
          if (lm.rewards.knowledgePoints) {
            nextMap.researchPoints += lm.rewards.knowledgePoints;
          }
          if (lm.rewards.relics) {
            nextMap.stockpile.relics = (nextMap.stockpile.relics ?? 0) + lm.rewards.relics;
          }
          if (lm.rewards.ancientMaterials) {
            nextMap.stockpile.ancientMaterials = (nextMap.stockpile.ancientMaterials ?? 0) + lm.rewards.ancientMaterials;
          }
          if (lm.rewards.moraleBoost) {
            const boost = lm.rewards.moraleBoost;
            setTribe((t) => t.map(p => ({
              ...p,
              stats: { ...p.stats, morale: Math.min(100, Math.max(0, p.stats.morale + boost)) }
            })));
          }

          // Unlock recipe or building
          if (lm.rewards.unlockRecipeId) {
            if (!nextMap.unlockedRecipes.includes(lm.rewards.unlockRecipeId)) {
              nextMap.unlockedRecipes = [...nextMap.unlockedRecipes, lm.rewards.unlockRecipeId];
            }
          }
          if (lm.rewards.unlockBuildingType) {
            if (!nextMap.unlockedBuildings) {
              nextMap.unlockedBuildings = [];
            }
            if (!nextMap.unlockedBuildings.includes(lm.rewards.unlockBuildingType)) {
              nextMap.unlockedBuildings = [...nextMap.unlockedBuildings, lm.rewards.unlockBuildingType];
            }
          }

          let unlockNotify = '';
          if (lm.rewards.unlockRecipeId) {
            unlockNotify = ` Unlocked craft recipe: [${lm.rewards.unlockRecipeId}]!`;
          }
          if (lm.rewards.unlockBuildingType) {
            unlockNotify += ` Unlocked custom blueprint: [${lm.rewards.unlockBuildingType}]!`;
          }

          // Record discovered lore log in Logbook!
          if (!nextMap.activeLoreLogs) {
            nextMap.activeLoreLogs = [];
          }
          nextMap.activeLoreLogs.push({
            id: lm.id,
            landmarkName: lm.name,
            text: lm.storySegment,
            discoveredDay: Math.floor(gameDaysRef.current) + 1
          });

          addLog(`⭐ LANDMARK DISCOVERED: Inspired exploration of "${lm.name}"! Gained +${lm.rewards.knowledgePoints ?? 0} RP.${unlockNotify}`, 'level');
          success = true;
        }
      }
      else if (actionId === 'studyLandmark') {
        if (cell.landmark && !cell.landmark.explored) {
          const lm = cell.landmark;
          const scholars = tribeRef.current.filter(p => p.isAlive && ['Builder', 'Artisan', 'Oracle'].includes(p.role));
          if (scholars.length === 0) {
            addLog(`⚠️ Cannot study! You need an active Builder, Artisan, or Oracle scholar in your tribe. Set a villager to one of these roles first!`, 'warning');
            return;
          }

          const chosenScholar = scholars.find(s => s.activeJobType !== 'Sleep' && s.activeJobType !== 'Eat') || scholars[0];

          lm.studyProgress = 0;
          lm.studyMaxProgress = 100;
          (lm as any).studyingWorkerId = chosenScholar.id;
          (lm as any).studyingWorkerName = chosenScholar.name;

          setTribe((prevTribe) => prevTribe.map((p) => {
            if (p.id === chosenScholar.id) {
              return {
                ...p,
                activeJobType: 'Study',
                jobTargetCoords: { x, z },
                isManualDirectTask: true,
                statusText: `🧐 Travelling to study and decode ancient structure: "${lm.name}"...`
              };
            }
            return p;
          }));

          addLog(`📜 Scholar ${chosenScholar.name} has been dispatched to study and decode the "${lm.name}"!`, 'info');
          success = true;
        }
      }
      else if (actionId === 'removeFarmCrop') {
        if (cell.farmCrop) {
          const cropName = cell.farmCrop.type;
          cell.farmCrop = undefined;
          cell.inspectableName = 'Fertile Soil Grassland';
          addLog(`🧹 Cleared and removed agricultural plot containing ${cropName} crop!`, 'info');
          success = true;
          nextMap.forceJobReevaluation = (prev.forceJobReevaluation ?? 0) + 1;
        }
      }
      else if (actionId === 'watchTowerScan') {
        if (cell.structure?.type === 'WatchTower') {
          let cellsRevealed = 0;
          const discoveredLandmarks: string[] = [];
          const discoveredOres: string[] = [];
          const discoveredAnimals: string[] = [];

          const radius = 6;
          for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
              if (dx * dx + dz * dz <= radius * radius) {
                const targetX = x + dx;
                const targetZ = z + dz;
                const tCell = nextMap.grid[targetX]?.[targetZ];
                if (tCell) {
                  if (!tCell.scouted) {
                    tCell.scouted = true;
                    cellsRevealed++;
                  }
                  if (tCell.landmark && !tCell.landmark.explored) {
                    discoveredLandmarks.push(tCell.landmark.name);
                  }
                  if (tCell.resourceNode && tCell.resourceNode.amount > 0) {
                    discoveredOres.push(tCell.resourceNode.type || tCell.resourceNode.category);
                  }
                  if (tCell.wildAnimal) {
                    discoveredAnimals.push(tCell.wildAnimal.type);
                  }
                }
              }
            }
          }

          const stormDays = nextMap.stormDaysUntilMigration?.toFixed(1) ?? '??';
          const stormSpeed = nextMap.stormSpeed?.toFixed(1) ?? '1.0';
          const stormDir = nextMap.stormMovementDirection ?? 'East';
          const stormDanger = nextMap.stormDangerLevel ?? 'Low';

          addLog(`📡 WatchTower Radar Sweep complete! Scanned sectors within a 6-mile radius. cleared Fog of War over ${cellsRevealed} tiles.`, 'success');
          
          if (discoveredLandmarks.length > 0) {
            const uniqueLms = Array.from(new Set(discoveredLandmarks));
            addLog(`🔍 Landmarks Detected: [${uniqueLms.join(', ')}] located in scanned sectors.`, 'info');
          }
          if (discoveredOres.length > 0) {
            const uniqueOres = Array.from(new Set(discoveredOres));
            addLog(`⛏️ Resource Deposits: Detected [${uniqueOres.join(', ')}] mineral/flora pockets.`, 'info');
          }
          if (discoveredAnimals.length > 0) {
            const uniqueAnis = Array.from(new Set(discoveredAnimals));
            addLog(`🐾 Wildlife Activity: Spotted [${uniqueAnis.join(', ')}] wandering nearby.`, 'info');
          }

          addLog(`💨 Storm Watch: Wall moving ${stormDir} at ${stormSpeed} km/h (Danger Level: ${stormDanger}). Impact countdown: ${stormDays} days remaining.`, 'level');
          success = true;
        }
      }
      else if (actionId === 'cancelConstruction') {
        let targetX = x;
        let targetZ = z;
        if ((cell as any).isMultiTileChildOf) {
          targetX = (cell as any).isMultiTileChildOf.x;
          targetZ = (cell as any).isMultiTileChildOf.z;
        }

        const parentCell = nextMap.grid[targetX]?.[targetZ];
        if (parentCell && parentCell.construction) {
          const bType = parentCell.construction.type;
          
          // Refund 100% construction costs when canceled
          const woodCosts: Record<string, number> = { Shelter: 40, WaterWell: 10, LogWall: 5, StorageBin: 25, Wheat: 0, Tent: 25, Shrine: 15, WatchTower: 40, ArtisanBench: 30, ScienceMachine: 40, RuinousAltar: 50, Fireplace: 20, PetrifiedGreenhouse: 50, PrecursorGenerator: 20, AegisBeacon: 40, GatherersPantry: 35, HuntersHut: 40, BuildersLodge: 50, FarmersGranary: 25, ScoutsLookout: 30, HealersSanctum: 30, ArtisansWorkshop: 40, ObservationPlatform: 30, Observatory: 55, RelicArchive: 45, MeditationShrine: 25, MapHall: 40 };
          const stoneCosts: Record<string, number> = { Shelter: 0, WaterWell: 30, LogWall: 0, StorageBin: 10, Wheat: 0, Tent: 0, Shrine: 25, WatchTower: 60, ArtisanBench: 10, ScienceMachine: 40, RuinousAltar: 80, Fireplace: 15, PetrifiedGreenhouse: 30, PrecursorGenerator: 60, AegisBeacon: 40, GatherersPantry: 15, HuntersHut: 10, BuildersLodge: 10, FarmersGranary: 25, ScoutsLookout: 20, HealersSanctum: 30, ArtisansWorkshop: 20, ObservationPlatform: 15, Observatory: 50, RelicArchive: 45, MeditationShrine: 35, MapHall: 30 };
          const foodCosts: Record<string, number> = { Shelter: 0, WaterWell: 0, LogWall: 0, StorageBin: 0, Wheat: 10, Tent: 0, Shrine: 0, WatchTower: 0, ArtisanBench: 0, ScienceMachine: 0, RuinousAltar: 0, Fireplace: 0, PetrifiedGreenhouse: 0, PrecursorGenerator: 0, AegisBeacon: 0, GatherersPantry: 0, HuntersHut: 0, BuildersLodge: 0, FarmersGranary: 0, ScoutsLookout: 0, HealersSanctum: 0, ArtisansWorkshop: 0, ObservationPlatform: 0, Observatory: 0, RelicArchive: 0, MeditationShrine: 0, MapHall: 0 };
          const goldCosts: Record<string, number> = { Shelter: 0, WaterWell: 0, LogWall: 0, StorageBin: 0, Wheat: 0, Tent: 0, Shrine: 0, WatchTower: 0, ArtisanBench: 0, ScienceMachine: 0, RuinousAltar: 5, Fireplace: 0, PetrifiedGreenhouse: 0, PrecursorGenerator: 0, AegisBeacon: 0, GatherersPantry: 0, HuntersHut: 0, BuildersLodge: 0, FarmersGranary: 0, ScoutsLookout: 0, HealersSanctum: 0, ArtisansWorkshop: 0, ObservationPlatform: 0, Observatory: 0, RelicArchive: 0, MeditationShrine: 0, MapHall: 0 };
          const silverCosts: Record<string, number> = { Shelter: 0, WaterWell: 0, LogWall: 0, StorageBin: 0, Wheat: 0, Tent: 0, Shrine: 0, WatchTower: 0, ArtisanBench: 0, ScienceMachine: 0, RuinousAltar: 3, Fireplace: 0, PetrifiedGreenhouse: 0, PrecursorGenerator: 0, AegisBeacon: 0, GatherersPantry: 0, HuntersHut: 0, BuildersLodge: 0, FarmersGranary: 0, ScoutsLookout: 0, HealersSanctum: 0, ArtisansWorkshop: 0, ObservationPlatform: 0, Observatory: 0, RelicArchive: 0, MeditationShrine: 0, MapHall: 0 };

          const wRefund = woodCosts[bType] ?? 0;
          const sRefund = stoneCosts[bType] ?? 0;
          const fRefund = foodCosts[bType] ?? 0;
          const gRefund = goldCosts[bType] ?? 0;
          const slRefund = silverCosts[bType] ?? 0;

          nextMap.stockpile.wood += wRefund;
          nextMap.stockpile.stone += sRefund;
          nextMap.stockpile.food += fRefund;
          nextMap.stockpile.gold = (nextMap.stockpile.gold ?? 0) + gRefund;
          nextMap.stockpile.silver = (nextMap.stockpile.silver ?? 0) + slRefund;

          parentCell.construction = undefined;
          parentCell.inspectableName = 'Fertile Soil Grassland';
          delete (parentCell as any).isMultiTileParent;

          if (bType === 'Shelter') {
            const childOffsets = [[1, 0], [0, 1], [1, 1]];
            childOffsets.forEach(([dx, dz]) => {
              const cCell = nextMap.grid[targetX + dx]?.[targetZ + dz];
              if (cCell) {
                cCell.construction = undefined;
                cCell.inspectableName = 'Fertile Soil Grassland';
                delete (cCell as any).isMultiTileChildOf;
              }
            });
          }

          addLog(`❌ Canceled construction blueprint for ${bType}! Full refund given (+${wRefund} Wood, +${sRefund} Stone, +${fRefund} Food).`, 'info');
          success = true;
          nextMap.forceJobReevaluation = (prev.forceJobReevaluation ?? 0) + 1;
        }
      }
      else if (actionId === 'demolishStructure') {
        let targetX = x;
        let targetZ = z;
        if ((cell as any).isMultiTileChildOf) {
          targetX = (cell as any).isMultiTileChildOf.x;
          targetZ = (cell as any).isMultiTileChildOf.z;
        }

        const parentCell = nextMap.grid[targetX]?.[targetZ];
        if (parentCell && parentCell.structure) {
          const sType = parentCell.structure.type;
          
          // Refund 50% construction costs when demolished
          const woodCosts: Record<string, number> = { Shelter: 40, WaterWell: 10, LogWall: 5, StorageBin: 25, Wheat: 0, Tent: 25, Shrine: 15, WatchTower: 40, ArtisanBench: 30, ScienceMachine: 40, RuinousAltar: 50, Fireplace: 20, GatherersPantry: 35, HuntersHut: 40, BuildersLodge: 50, FarmersGranary: 25, ScoutsLookout: 30, HealersSanctum: 30, ArtisansWorkshop: 40, ObservationPlatform: 30, Observatory: 55, RelicArchive: 45, MeditationShrine: 25, MapHall: 40 };
          const stoneCosts: Record<string, number> = { Shelter: 0, WaterWell: 30, LogWall: 0, StorageBin: 10, Wheat: 0, Tent: 0, Shrine: 25, WatchTower: 60, ArtisanBench: 10, ScienceMachine: 40, RuinousAltar: 80, Fireplace: 15, GatherersPantry: 15, HuntersHut: 10, BuildersLodge: 10, FarmersGranary: 25, ScoutsLookout: 20, HealersSanctum: 30, ArtisansWorkshop: 20, ObservationPlatform: 15, Observatory: 50, RelicArchive: 45, MeditationShrine: 35, MapHall: 30 };
          const foodCosts: Record<string, number> = { Shelter: 0, WaterWell: 0, LogWall: 0, StorageBin: 0, Wheat: 10, Tent: 0, Shrine: 0, WatchTower: 0, ArtisanBench: 0, ScienceMachine: 0, RuinousAltar: 0, Fireplace: 0, GatherersPantry: 0, HuntersHut: 0, BuildersLodge: 0, FarmersGranary: 0, ScoutsLookout: 0, HealersSanctum: 0, ArtisansWorkshop: 0, ObservationPlatform: 0, Observatory: 0, RelicArchive: 0, MeditationShrine: 0, MapHall: 0 };
          const goldCosts: Record<string, number> = { Shelter: 0, WaterWell: 0, LogWall: 0, StorageBin: 0, Wheat: 0, Tent: 0, Shrine: 0, WatchTower: 0, ArtisanBench: 0, ScienceMachine: 0, RuinousAltar: 5, Fireplace: 0, GatherersPantry: 0, HuntersHut: 0, BuildersLodge: 0, FarmersGranary: 0, ScoutsLookout: 0, HealersSanctum: 0, ArtisansWorkshop: 0, ObservationPlatform: 0, Observatory: 0, RelicArchive: 0, MeditationShrine: 0, MapHall: 0 };
          const silverCosts: Record<string, number> = { Shelter: 0, WaterWell: 0, LogWall: 0, StorageBin: 0, Wheat: 0, Tent: 0, Shrine: 0, WatchTower: 0, ArtisanBench: 0, ScienceMachine: 0, RuinousAltar: 3, Fireplace: 0, GatherersPantry: 0, HuntersHut: 0, BuildersLodge: 0, FarmersGranary: 0, ScoutsLookout: 0, HealersSanctum: 0, ArtisansWorkshop: 0, ObservationPlatform: 0, Observatory: 0, RelicArchive: 0, MeditationShrine: 0, MapHall: 0 };

          const wRefund = Math.floor((woodCosts[sType] ?? 0) * 0.5);
          const sRefund = Math.floor((stoneCosts[sType] ?? 0) * 0.5);
          const fRefund = Math.floor((foodCosts[sType] ?? 0) * 0.5);
          const gRefund = Math.floor((goldCosts[sType] ?? 0) * 0.5);
          const slRefund = Math.floor((silverCosts[sType] ?? 0) * 0.5);

          nextMap.stockpile.wood += wRefund;
          nextMap.stockpile.stone += sRefund;
          nextMap.stockpile.food += fRefund;
          nextMap.stockpile.gold = (nextMap.stockpile.gold ?? 0) + gRefund;
          nextMap.stockpile.silver = (nextMap.stockpile.silver ?? 0) + slRefund;

          parentCell.structure = undefined;
          parentCell.inspectableName = 'Fertile Soil Grassland';
          delete (parentCell as any).isMultiTileParent;

          if (sType === 'Shelter') {
            const childOffsets = [[1, 0], [0, 1], [1, 1]];
            childOffsets.forEach(([dx, dz]) => {
              const cCell = nextMap.grid[targetX + dx]?.[targetZ + dz];
              if (cCell) {
                cCell.structure = undefined;
                cCell.inspectableName = 'Fertile Soil Grassland';
                delete (cCell as any).isMultiTileChildOf;
              }
            });
          }

          addLog(`💥 Demolished structure ${sType} instantly! Got 50% refund (+${wRefund} Wood, +${sRefund} Stone).`, 'info');
          success = true;
          nextMap.forceJobReevaluation = (prev.forceJobReevaluation ?? 0) + 1;
        }
      }
      else if (['designateHunt', 'designateCapture', 'tameManualPet', 'domesticSetJobTransport', 'domesticSetJobGuard', 'domesticSetJobHerd'].includes(actionId)) {
        // Find animal closest to selected tile within 1.5 tile radius
        const ani = (() => {
          if (!nextMap.animals) return undefined;
          let bestA = undefined;
          let bestD = 2.25; // max distance squared (1.5 * 1.5)
          for (const a of nextMap.animals) {
            const d = (a.x - x) ** 2 + (a.z - z) ** 2;
            if (d < bestD) {
              bestD = d;
              bestA = a;
            }
          }
          return bestA;
        })();

        if (ani) {
          if (actionId === 'designateHunt') {
            (ani as any).isCaptureDesignated = false;
            (ani as any).isHuntDesignated = !(ani as any).isHuntDesignated;
            if (cell.wildAnimal) {
              (cell.wildAnimal as any).isCaptureDesignated = false;
              (cell.wildAnimal as any).isHuntDesignated = (ani as any).isHuntDesignated;
            }
            addLog(`🎯 Game Order: Hunt designation on ${ani.type} toggled to ${(ani as any).isHuntDesignated ? 'ACTIVE' : 'CANCELLED'}. Hunters will locate and track.`, 'info');
            success = true;
          }
          else if (actionId === 'designateCapture') {
            (ani as any).isHuntDesignated = false;
            (ani as any).isCaptureDesignated = !(ani as any).isCaptureDesignated;
            if (cell.wildAnimal) {
              (cell.wildAnimal as any).isHuntDesignated = false;
              (cell.wildAnimal as any).isCaptureDesignated = (ani as any).isCaptureDesignated;
            }
            addLog(`🕸️ Game Order: Capture designation on ${ani.type} toggled to ${(ani as any).isCaptureDesignated ? 'ACTIVE' : 'CANCELLED'}.`, 'success');
            success = true;
          }
          else if (actionId === 'tameManualPet') {
            if (nextMap.stockpile.berries >= 3) {
              const currentFlag = !(ani as any).isTameDesignated;
              (ani as any).isTameDesignated = currentFlag;
              if (cell.wildAnimal) {
                (cell.wildAnimal as any).isTameDesignated = currentFlag;
              }
              addLog(`🍎 Game Order: Tame designation on wild ${ani.type} toggled to ${currentFlag ? 'ACTIVE' : 'CANCELLED'}. Hunters will approach and feed.`, 'info');
              success = true;
            } else {
              addLog(`⚠️ Tame designation failed: Need at least 3 Berries in the stockpile to use as bait.`, 'warning');
            }
          }
          else if (actionId === 'domesticSetJobTransport') {
            ani.isTame = true;
            (ani as any).assignedJobType = (ani as any).assignedJobType === 'transport' ? 'none' : 'transport';
            addLog(`🐪 Domestic Duty: ${ani.type} set to caravan role to pull transport wagons!`, 'info');
            success = true;
          }
          else if (actionId === 'domesticSetJobGuard') {
            ani.isTame = true;
            (ani as any).assignedJobType = (ani as any).assignedJobType === 'guard' ? 'none' : 'guard';
            addLog(`🛡️ Domestic Duty: ${ani.type} guardian role set to defend the village!`, 'success');
            success = true;
          }
          else if (actionId === 'domesticSetJobHerd') {
            ani.isTame = true;
            (ani as any).assignedJobType = (ani as any).assignedJobType === 'herd' ? 'none' : 'herd';
            addLog(`🐑 Domestic Duty: ${ani.type} herding role set to assist farmers with livestock!`, 'success');
            success = true;
          }
        } else {
          addLog(`⚠️ No target wild animal located close to this tile.`, 'warning');
        }
      }

      if (success) {
        outputCell = { ...cell };
        nextMap.forceJobReevaluation = (prev.forceJobReevaluation ?? 0) + 1;
      }
      return nextMap;
    });

    if (outputCell && success) {
      setSelectedCell(outputCell);
      
      // Direct manual assignment trigger
      if (['gatherWood', 'gatherBerries', 'gatherStone', 'mineOre'].includes(actionId)) {
        setTribe((prevTribe) => {
          const living = prevTribe.filter(p => p.isAlive);
          if (living.length === 0) return prevTribe;
          const ranked = [...living].sort((a, b) => {
            const isMine = actionId === 'mineOre' || actionId === 'gatherStone';
            const lvlA = isMine ? (a.skills.Artisan?.level ?? a.skills.Gatherer?.level ?? 1) : (a.skills.Gatherer?.level ?? 1);
            const lvlB = isMine ? (b.skills.Artisan?.level ?? b.skills.Gatherer?.level ?? 1) : (b.skills.Gatherer?.level ?? 1);

            const roleA = isMine ? (a.role === 'Artisan' || a.role === 'Gatherer' ? 50 : 0) : (a.role === 'Gatherer' ? 50 : 0);
            const roleB = isMine ? (b.role === 'Artisan' || b.role === 'Gatherer' ? 50 : 0) : (b.role === 'Gatherer' ? 50 : 0);

            const stateA = (a.activeJobType !== 'Sleep' && a.stats.fatigue > 15) ? 100 : 0;
            const stateB = (b.activeJobType !== 'Sleep' && b.stats.fatigue > 15) ? 100 : 0;

            const distA = Math.hypot(a.x - x, a.z - z);
            const distB = Math.hypot(b.x - x, b.z - z);

            return ((lvlB * 100) + roleB + stateB - distB) - ((lvlA * 100) + roleA + stateA - distA);
          });

          const lead = ranked[0];
          const helpers = ranked.slice(0, Math.min(3, ranked.length));
          const helperIds = new Set(helpers.map(h => h.id));

          addLog(`🏃‍♂️ Gather Order: Dispatched highest level Gatherer (${lead.name}) and team to harvest [${x}, ${z}]!`, 'success');

          return prevTribe.map(p => helperIds.has(p.id) ? {
            ...p,
            activeJobType: 'Gather' as const,
            jobTargetCoords: { x, z },
            targetX: x,
            targetZ: z,
            workProgress: 0,
            isManualDirectTask: true,
            statusText: p.id === lead.id
              ? `🏃‍♂️ Gathering resources at [${x}, ${z}]`
              : `🤝 Assisting ${lead.name} gathering at [${x}, ${z}]`
          } : p);
        });
      } else if (['designateHunt', 'designateCapture', 'tameManualPet'].includes(actionId)) {
        setTribe((prevTribe) => {
          const living = prevTribe.filter(p => p.isAlive);
          if (living.length === 0) return prevTribe;
          const ranked = [...living].sort((a, b) => {
            const lvlA = a.skills.Hunter?.level ?? 1;
            const lvlB = b.skills.Hunter?.level ?? 1;

            const roleA = a.role === 'Hunter' ? 50 : 0;
            const roleB = b.role === 'Hunter' ? 50 : 0;

            const stateA = (a.activeJobType !== 'Sleep' && a.stats.fatigue > 15) ? 100 : 0;
            const stateB = (b.activeJobType !== 'Sleep' && b.stats.fatigue > 15) ? 100 : 0;

            const distA = Math.hypot(a.x - x, a.z - z);
            const distB = Math.hypot(b.x - x, b.z - z);

            return ((lvlB * 100) + roleB + stateB - distB) - ((lvlA * 100) + roleA + stateA - distA);
          });

          const lead = ranked[0];
          const helpers = ranked.slice(0, Math.min(2, ranked.length));
          const helperIds = new Set(helpers.map(h => h.id));

          addLog(`🏹 Strike Order: Dispatched highest level Hunter (${lead.name}, Level ${lead.skills.Hunter?.level ?? 1}) to tackle target at [${x}, ${z}]!`, 'success');

          return prevTribe.map(p => helperIds.has(p.id) ? {
            ...p,
            activeJobType: 'Hunt' as const,
            jobTargetCoords: { x, z },
            targetX: x,
            targetZ: z,
            workProgress: 0,
            isManualDirectTask: true,
            statusText: p.id === lead.id
              ? `🏹 Hunting/Capturing at [${x}, ${z}]`
              : `🤝 Assisting ${lead.name} with hunt at [${x}, ${z}]`
          } : p);
        });
      }
    }
  };

  const handleLaunchExpedition = (x: number, z: number, scoutId: string, supplies: { item: string; amount: number }[], equipment: string[]) => {
    setMapData((prev) => {
      const nextMap = { ...prev };
      nextMap.grid = prev.grid.map((row) =>
        row.map((cell) => {
          if (cell.x === x && cell.z === z && cell.expeditionSite) {
            const site = { ...cell.expeditionSite };
            site.activeScouts = [...site.activeScouts, scoutId];
            return { ...cell, expeditionSite: site };
          }
          return cell;
        })
      );

      // Deduct supplies from stockpile
      supplies.forEach((s) => {
        if (nextMap.stockpile[s.item as keyof typeof nextMap.stockpile] !== undefined) {
          (nextMap.stockpile as any)[s.item] = Math.max(0, (nextMap.stockpile as any)[s.item] - s.amount);
        }
      });

      // Deduct equipment from stockpile
      equipment.forEach((eq) => {
        if (nextMap.stockpile[eq as keyof typeof nextMap.stockpile] !== undefined) {
          (nextMap.stockpile as any)[eq] = Math.max(0, (nextMap.stockpile as any)[eq] - 1);
        }
      });

      return nextMap;
    });

    setTribe((prevTribe) =>
      prevTribe.map((p) => {
        if (p.id === scoutId) {
          const backpackItems: Record<string, number> = {};
          equipment.forEach(eq => {
            backpackItems[eq] = 1;
          });

          return {
            ...p,
            expeditionState: 'entering',
            expeditionTargetCoords: { x, z },
            expeditionTimer: 1.5, // 1.5 game hours walking
            expeditionDuration: 12,
            expeditionSiteName: selectedCell?.expeditionSite?.name || 'Ancient Ruins',
            expeditionSiteType: selectedCell?.expeditionSite?.templateId || '',
            expeditionLootCollected: {},
            expeditionUniqueFinds: [],
            expeditionLogs: [`🚶 [Hour 0] Packed supplies and optional gear. Began marching to the coordinates of ${selectedCell?.expeditionSite?.name || 'Ancient Ruins'}.`],
            activeJobType: 'Scout' as const,
            jobTargetCoords: { x, z },
            targetX: x,
            targetZ: z,
            personalInventory: {
              ...p.personalInventory,
              items: backpackItems
            },
            statusText: `🚶 Travelling to ${selectedCell?.expeditionSite?.name || 'Ancient Ruins'}...`
          };
        }
        return p;
      })
    );

    // Mirror in local selectedCell state so it updates instantly in the UI panel
    setSelectedCell((prev) => {
      if (prev && prev.x === x && prev.z === z && prev.expeditionSite) {
        const site = { ...prev.expeditionSite };
        site.activeScouts = [...site.activeScouts, scoutId];
        return { ...prev, expeditionSite: site };
      }
      return prev;
    });

    const scoutName = tribe.find(p => p.id === scoutId)?.name || 'Scout';
    addLog(`🚀 Expedition: ${scoutName} has loaded gear and set out for ${selectedCell?.expeditionSite?.name || 'Ancient Site'}!`, 'success');
  };

  const handleRelocateStructure = (sx: number, sz: number, tx: number, tz: number) => {
    if (sx === tx && sz === tz) {
      setRelocatingStructure(null);
      addLog(`🚚 Relocation cancelled. Selected same coordinate.`, "info");
      return;
    }

    const currentMap = mapDataRef.current;
    const targetCell = currentMap.grid[tx]?.[tz];
    const sourceCell = currentMap.grid[sx]?.[sz];

    if (!sourceCell || !sourceCell.structure) {
      setRelocatingStructure(null);
      addLog(`⚠️ Cannot relocate structure. Source tile is empty.`, "warning");
      return;
    }

    if (!targetCell) {
      setRelocatingStructure(null);
      addLog(`⚠️ Cannot relocate structure. Indicated tile is invalid.`, "warning");
      return;
    }

    if (!targetCell.scouted) {
      addLog(`⚠️ Area is unexplored! Scouts must scout the land [${tx}, ${tz}] first.`, "warning");
      return;
    }

    if (targetCell.biome === 'water' || targetCell.biome === 'ocean') {
      addLog(`⚠️ Cannot build or place buildings in deep water at [${tx}, ${tz}]!`, "warning");
      return;
    }

    if (targetCell.hasTree || targetCell.hasRock || targetCell.hasShrub || targetCell.farmCrop || targetCell.structure || targetCell.construction || targetCell.wildAnimal) {
      addLog(`⚠️ Target tile [${tx}, ${tz}] is obstructed! Clear it first.`, "warning");
      return;
    }

    setMapData((prev) => {
      const nextMap = { ...prev };
      nextMap.grid = prev.grid.map(row => [...row]);
      
      const sCell = nextMap.grid[sx][sz];
      const tCell = nextMap.grid[tx][tz];

      const movingStructure = sCell.structure;
      sCell.structure = null;
      sCell.inspectableName = 'Fertile Soil Grassland';

      tCell.structure = movingStructure;
      if (movingStructure) {
        tCell.inspectableName = `Colony structure: ${movingStructure.type}`;
      }

      return nextMap;
    });

    setRelocatingStructure(null);
    setSelectedCell(targetCell);
    addLog(`🚚 Instant Relocation: Transported Portable ${sourceCell.structure.type} instantly to coordinates [${tx}, ${tz}]!`, "level");
  };

  const handleDismantleStructure = (x: number, z: number) => {
    setMapData((prev) => {
      const nextMap = { ...prev };
      nextMap.grid = prev.grid.map(row => [...row]);
      
      let targetX = x;
      let targetZ = z;
      const cellCheck = nextMap.grid[x]?.[z];
      if (cellCheck && (cellCheck as any).isMultiTileChildOf) {
        targetX = (cellCheck as any).isMultiTileChildOf.x;
        targetZ = (cellCheck as any).isMultiTileChildOf.z;
      }

      const cell = nextMap.grid[targetX]?.[targetZ];
      if (cell && cell.structure) {
        cell.structure = {
          ...cell.structure,
          dismantling: true,
          dismantleProgress: 0,
        };
        addLog(`🧹 Designated dismantle for ${cell.structure.type} at [${targetX}, ${targetZ}]! Builders with Build priority will approach and pack it.`, `info`);
      }
      return nextMap;
    });

    setSelectedCell(null);
  };

  const handleRoleChange = (id: string, newRole: TribespersonRole) => {
    if (newRole === 'Oracle') {
      const existingOracle = tribe.find(p => p.isAlive && p.role === 'Oracle' && p.id !== id);
      if (existingOracle) {
        addLog(`⚠️ Only ONE active Oracle may exist! Please assign ${existingOracle.name} ${existingOracle.familyName || ''} to another profession first.`, 'warning');
        return;
      }
    }

    setTribe((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      addLog(`✏️ Assigned role: ${p.name}'s task altered from ${p.role} to ${newRole}.`, 'info');
      
      // Initialize Oracle skill if it doesn't exist
      const skills = { ...p.skills };
      if (newRole === 'Oracle' && !skills.Oracle) {
        skills.Oracle = { level: 1, xp: 0, xpToNextLevel: 100 };
      }

      return { 
        ...p, 
        role: newRole, 
        skills,
        color: ROLE_COLORS[newRole] || '#ffffff',
        statusText: `Traveling as ${newRole}...` 
      };
    }));
  };

  const handleTriggerDisaster = (type: 'plague' | 'drought' | 'bounty' | 'feast') => {
    const aliveCount = tribe.filter(person => person.isAlive).length;
    if (aliveCount === 0) {
      addLog("⚠️ No tribal members are currently alive to receive divine events.", "warning");
      return;
    }

    setTribe((prev) => {
      return prev.map((p) => {
        if (!p.isAlive) return p;

        const stats = { ...p.stats };
        if (type === 'drought') {
          stats.thirst = Math.max(8, stats.thirst - 45);
          stats.hunger = Math.max(8, stats.hunger - 35);
          stats.morale = Math.max(5, stats.morale - 25);
        } else if (type === 'plague') {
          stats.health = Math.max(12, stats.health - 40);
          stats.fatigue = Math.max(4, stats.fatigue - 35);
          stats.morale = Math.max(5, stats.morale - 20);
        } else if (type === 'bounty' || type === 'feast') {
          stats.hunger = 100;
          stats.thirst = 100;
          stats.health = Math.min(100, stats.health + 30);
          stats.morale = Math.min(100, stats.morale + 35);
        }

        return { ...p, stats };
      });
    });

    if (type === 'drought') {
      addLog("🌾 Solar Drought! Heat index spikes; water reserves and hydration drop!", "warning");
    } else if (type === 'plague') {
      addLog("🤢 Crimson Mold Disease! A toxic mold contaminates camps; health degrades rapidly!", "warning");
    } else if (type === 'bounty' || type === 'feast') {
      addLog("🍖 Divine Harvest Fest! Full satiety, cell replenishment, and moral uplift completed!", "level");
    }
  };

  const handleFocusCoordinates = (x: number, z: number) => {
    // Generates a new coordinate object reference to trigger camera snap in Canvas
    setFocusCoordinates({ x, z });
  };

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

  const handleStartCraft = (recipeId: string) => {
    const recipe = RECIPE_DATABASE[recipeId];
    if (!recipe) return;

    // Check workstation requirements
    let hasWorkstation = true;
    if (!isCreativeMode && recipe.workstation !== 'None') {
      let count = 0;
      for (let r = 0; r < config.size; r++) {
        for (let c = 0; c < config.size; c++) {
          if (mapData.grid[r]?.[c]?.structure?.type === recipe.workstation) {
            count++;
          }
        }
      }
      if (count === 0) {
        addLog(`⚠️ Cannot craft: Requires a built "${recipe.workstation}" workstation on the map!`, 'warning');
        return;
      }
    }

    // Check material requirements
    if (!isCreativeMode) {
      for (const [mat, qty] of Object.entries(recipe.materials)) {
        const qtyNum = qty as number;
        const stock = mapData.stockpile[mat as keyof typeof mapData.stockpile] as number || 0;
        if (stock < qtyNum) {
          addLog(`⚠️ Cannot craft "${recipe.name}": Missing ${qtyNum - stock} units of ${mat}.`, 'warning');
          return;
        }
      }
    }

    // Check research
    if (!isCreativeMode && recipe.researchCost && !mapData.unlockedRecipes.includes(recipeId)) {
      addLog(`⚠️ Cannot craft: "${recipe.name}" has not been researched yet!`, 'warning');
      return;
    }

    // Deduct materials and queue
    setMapData((prevMap) => {
      const nextMap = { ...prevMap };
      nextMap.stockpile = { ...prevMap.stockpile };
      if (!isCreativeMode) {
        for (const [mat, qty] of Object.entries(recipe.materials)) {
          (nextMap.stockpile as any)[mat] -= qty as number;
        }
      }
      const newJob: CraftingJob = {
        id: Math.random().toString(36).slice(2, 9),
        recipeId,
        progress: 0,
        maxProgress: 100,
        workerId: null,
      };
      nextMap.craftQueue = [...(prevMap.craftQueue || []), newJob];
      addLog(`🛠️ Crafting Enqueued: Started assembling "${recipe.name}"!`, 'info');
      return nextMap;
    });
  };

  const handleCancelCraft = (jobId: string) => {
    setMapData((prevMap) => {
      const nextMap = { ...prevMap };
      if (!nextMap.craftQueue) return prevMap;
      const jobIndex = nextMap.craftQueue.findIndex(j => j.id === jobId);
      if (jobIndex === -1) return prevMap;
      
      const job = nextMap.craftQueue[jobIndex];
      const recipe = RECIPE_DATABASE[job.recipeId];
      if (recipe) {
        // refund 70% of material costs
        nextMap.stockpile = { ...prevMap.stockpile };
        for (const [mat, qty] of Object.entries(recipe.materials)) {
          const refund = Math.floor((qty as number) * 0.7);
          (nextMap.stockpile as any)[mat] = ((nextMap.stockpile as any)[mat] || 0) + refund;
        }
        addLog(`🛠️ Cancelled Crafting: "${recipe.name}" cancelled. Refunded 70% of materials.`, 'info');
      }

      nextMap.craftQueue = nextMap.craftQueue.filter(j => j.id !== jobId);
      return nextMap;
    });
  };

  const handleResearch = (recipeId: string) => {
    const recipe = RECIPE_DATABASE[recipeId];
    if (!recipe || !recipe.researchCost) return;
    
    if (!isCreativeMode && mapData.researchPoints < recipe.researchCost) {
      addLog(`🔬 Cannot Research: Need ${Math.ceil(recipe.researchCost - mapData.researchPoints)} more Research Points!`, 'warning');
      return;
    }

    setMapData((prevMap) => {
      if (prevMap.unlockedRecipes.includes(recipeId)) return prevMap;
      const nextMap = { ...prevMap };
      nextMap.researchPoints = isCreativeMode ? prevMap.researchPoints : Math.round((prevMap.researchPoints - (recipe.researchCost ?? 0)) * 10) / 10;
      nextMap.unlockedRecipes = [...prevMap.unlockedRecipes, recipeId];
      addLog(`🔬 Technology Unlocked: Successfully study-completed and researched "${recipe.name}"!`, 'level');
      return nextMap;
    });
  };

  const handleStartPackingCaravan = () => {
    setMapData((prev) => {
      const nextMap = { ...prev };
      nextMap.isPackingCaravan = true;
      nextMap.packingProgress = 0;
      return nextMap;
    });
    addLog(`🚚 Caravan Packing initiated! Villagers are now packing stockpile goods, dismantling tents, and carrying crates to the Wagon.`, 'info');
  };

  const handleMigrateRegion = () => {
    const bigBeastTamedAndTransport = mapData.animals?.filter(ani => 
      ani.isTame && 
      (ani as any).assignedJobType === 'transport' && 
      !['JackLeaper', 'TuskedShagBeast', 'GlowGrub', 'CinderCentipede', 'PricklyBeetle', 'Rabbit', 'Sheep', 'WildGoat'].includes(ani.type)
    ) || [];

    if (bigBeastTamedAndTransport.length === 0) {
      addLog(`🚚 Migrating on foot: Without a tamed draft beast, villagers must carry supplies in backpacks! Keep them inside the storm eye!`, 'warning');
      setTribe((prev) => prev.map(p => ({ ...p, hasBackpack: true })));
    } else {
      addLog(`✨ Physical Migration: ${bigBeastTamedAndTransport[0].type} pulls the caravan wagon! Stay inside the moving eye of the storm!`, 'success');
    }

    setMapData((prev) => {
      const nextMap = { ...prev };
      nextMap.isMigrationTravelActive = true;
      nextMap.isPackingCaravan = false;
      nextMap.packingProgress = 0;
      nextMap.caravanPos = { x: nextMap.eyePos?.x ?? 25, z: nextMap.eyePos?.z ?? 25 };
      nextMap.eyeTargetPos = { x: nextMap.grid.length - 14.5, z: nextMap.grid.length - 14.5 };
      nextMap.eyeMovementState = 'migrating';
      nextMap.deityModeOverrideSpeed = 10.0; // speed up storm eye movement!
      return nextMap;
    });
  };

  const completePhysicalMigration = () => {
    const bigBeastTamedAndTransport = mapData.animals?.filter(ani => 
      ani.isTame && 
      (ani as any).assignedJobType === 'transport' && 
      !['JackLeaper', 'TuskedShagBeast', 'GlowGrub', 'CinderCentipede', 'PricklyBeetle', 'Rabbit', 'Sheep', 'WildGoat'].includes(ani.type)
    ) || [];

    const newSeed = Math.floor(Math.random() * 99999) + 1;
    const newConfig = { ...config, seed: newSeed };
    const nextMap = generateWorld(newConfig);

    nextMap.isPackingCaravan = false;
    nextMap.packingProgress = 0;
    nextMap.isMigrationTravelActive = false;

    if (mapData.caravanInventory) {
      nextMap.caravanInventory = { ...mapData.caravanInventory };
    }

    const size = newConfig.size;
    const centerX = Math.floor(size / 2);
    const centerZ = Math.floor(size / 2);

    setTribe((prevTribe) => {
      return prevTribe.map(agent => {
        const isFrontGuard = agent.role === 'Scout' || agent.role === 'Hunter';
        const offsetX = isFrontGuard ? 3.0 : -1.0;
        return {
          ...agent,
          x: centerX + offsetX + (Math.random() * 2 - 1),
          z: centerZ + (Math.random() * 2 - 1),
          activeJobType: null,
          jobTargetCoords: null,
          workProgress: 0,
          hasBackpack: false
        };
      });
    });

    // Populate the new region with wild ecosystem animals FIRST
    populateInitialMapAnimals(nextMap);

    // Append the tamed caravan pulling beasts that migrated with the tribe
    bigBeastTamedAndTransport.forEach(beast => {
      nextMap.animals.push({
        ...beast,
        x: centerX + (Math.random() * 3 - 1.5),
        z: centerZ + (Math.random() * 3 - 1.5),
        HP: beast.maxHP || beast.HP,
        hunger: 20,
        fear: 0,
        stress: 10
      });
    });

    setConfig(newConfig);
    
    // Randomize storm properties for the new region
    nextMap.stormDaysUntilMigration = 10 + Math.floor(Math.random() * 8);
    nextMap.stormSpeed = parseFloat((0.8 + Math.random() * 0.6).toFixed(1));
    const directions = ['North', 'East', 'South', 'West', 'Northeast', 'Northwest', 'Southeast', 'Southwest'] as const;
    nextMap.stormMovementDirection = directions[Math.floor(Math.random() * directions.length)];
    const dangers = ['Low', 'Medium', 'High'] as const;
    nextMap.stormDangerLevel = dangers[Math.floor(Math.random() * dangers.length)];

    setMapData(nextMap);
    setWorldId(Math.random());
    setSelectedCell(null);

    // Award 100 XP to any active living Oracle for a successful migration
    setTribe((prevTribe) => {
      return prevTribe.map(agent => {
        let skills = agent.skills;
        if (agent.isAlive && agent.role === 'Oracle') {
          skills = { ...agent.skills };
          if (skills.Oracle) {
            const skill = { ...skills.Oracle };
            skill.xp += 100;
            if (skill.xp >= skill.xpToNextLevel) {
              skill.level += 1;
              skill.xp -= skill.xpToNextLevel;
              skill.xpToNextLevel = Math.round(skill.xpToNextLevel * 1.5);
              addLog(`🎉 LEVEL UP! Oracle ${agent.name} has reached level ${skill.level}!`, 'level');
            }
            skills.Oracle = skill;
          }
        }
        return {
          ...agent,
          skills,
          x: centerX + (Math.random() * 2 - 1),
          z: centerZ + (Math.random() * 2 - 1),
          activeJobType: null,
          jobTargetCoords: null,
          workProgress: 0,
          hasBackpack: false
        };
      });
    });

    if (bigBeastTamedAndTransport.length === 0) {
      addLog(`🚚 MIGRATION SUCCESSFUL! Your tribe successfully crossed the storm wall on foot to a brand-new region (Seed: ${newSeed})!`, 'success');
    } else {
      addLog(`🚚 MIGRATION SUCCESSFUL! Your caravan wagon successfully arrived in a brand-new region (Seed: ${newSeed}), safely pulled by your ${bigBeastTamedAndTransport[0].type}!`, 'success');
    }
  };

  const handleStudyRelic = () => {
    if (mapData.activeRelicStudy) {
      addLog('⚠️ Study Relic: The oracle is already deciphering a relic. Only one relic can be studied at a time!', 'warning');
      return;
    }
    if (mapData.stockpile.relics <= 0) {
      addLog('⚠️ Study Relic failed: No Ancient Relics in storage stockpile!', 'warning');
      return;
    }

    // Find the highest-level Healer in the living tribe to act as the Oracle
    const livingTribe = tribe.filter(p => p.isAlive);
    const sortedHealers = [...livingTribe].sort((a, b) => (b.skills.Healer?.level ?? 1) - (a.skills.Healer?.level ?? 1));
    const bestHealer = sortedHealers.find(p => p.role === 'Healer') || sortedHealers[0];
    
    const oracleName = bestHealer ? bestHealer.name : "Village Seer";
    const oracleHealerLevel = bestHealer ? (bestHealer.skills.Healer?.level ?? 1) : 1;

    // Relic pools to pick from
    const RELIC_POOL = [
      {
        name: "Aegis Command Matrix",
        baseDays: 2.5,
        rewardType: "resources" as const,
        message: "A pristine crystalline chip engraved with emergency supply coordinates. Deciphering has unlocked an airtight drop storage capsule, yielding +100 Wood, +100 Stone, and +5 Gold!",
      },
      {
        name: "Chrono-Hydra Cell",
        baseDays: 1.5,
        rewardType: "rp" as const,
        message: "A humming dark energy cell with rotating magnetic fields. Deciphering its blueprints provides deep cosmic energy secrets, boosting tribal Knowledge by +35.0 Research Points!",
      },
      {
        name: "Nanite Life-Weaver",
        baseDays: 2.0,
        rewardType: "healing" as const,
        message: "An injector filled with dormant medical micro-drones. When deciphered, it releases a sanitizing auric pulse, restoring 50% health to all living tribespeople!",
      },
      {
        name: "Thulecite Rosetta Slate",
        baseDays: 3.0,
        rewardType: "rp" as const,
        message: "A heavy slate covered in celestial mathematical proofs. When deciphered, it unlocks deep architectural wisdom, yielding +50.0 Research Points and a permanent discovery of Precursor blueprints!",
      }
    ];

    const chosenRelic = RELIC_POOL[Math.floor(Math.random() * RELIC_POOL.length)];

    setMapData((prevMap) => {
      const nextMap = { ...prevMap };
      nextMap.stockpile = { ...prevMap.stockpile };
      nextMap.stockpile.relics -= 1;
      
      nextMap.activeRelicStudy = {
        id: Math.random().toString(36).slice(2, 9),
        relicName: chosenRelic.name,
        totalDaysRequired: chosenRelic.baseDays,
        daysProgress: 0,
        oracleName: oracleName,
        oracleHealerLevel: oracleHealerLevel,
        rewardType: chosenRelic.rewardType,
        decodedMessage: chosenRelic.message,
      };

      const speedFactor = 1.0 + (oracleHealerLevel - 1) * 0.15;
      const daysLeft = (chosenRelic.baseDays / speedFactor).toFixed(1);
      addLog(`🔮 Deciphering Started: Oracle ${oracleName} (Healer Lvl ${oracleHealerLevel}) has begun deciphering "${chosenRelic.name}". It will take approx ${daysLeft} days.`, 'info');
      return nextMap;
    });
  };

  const handleOrganizeWarehouse = () => {
    setMapData((prevMap) => {
      const nextMap = { ...prevMap };
      if (!nextMap.villageInventory) return prevMap;
      nextMap.villageInventory = { ...nextMap.villageInventory };
      nextMap.villageInventory.cleanliness = Math.min(100, nextMap.villageInventory.cleanliness + 35);
      addLog('🧹 Warehouse Tidy: Successfully sweep-cleaned and organized central warehouse storage areas! Defective spoilage factor decreased.', 'info');
      return nextMap;
    });
  };

  const handleTransferToCaravan = (itemKey: string, amount: number) => {
    setMapData((prevMap) => {
      const nextMap = { ...prevMap };
      nextMap.stockpile = { ...prevMap.stockpile };
      if (!nextMap.caravanInventory) return prevMap;
      nextMap.caravanInventory = { ...nextMap.caravanInventory };
      if (!nextMap.caravanInventory.items) nextMap.caravanInventory.items = {};
      nextMap.caravanInventory.items = { ...nextMap.caravanInventory.items };

      const availableStock = nextMap.stockpile[itemKey as keyof typeof nextMap.stockpile] as number || 0;
      const moveQty = Math.min(amount, availableStock);
      if (moveQty <= 0) {
        addLog(`⚠️ Logistical Transfer failed: No "${itemKey}" in Base storage stockpile.`, 'warning');
        return prevMap;
      }

      // Check caravan limitations
      const itemW = getUnitWeight(itemKey) * moveQty;
      const itemV = getUnitVolume(itemKey) * moveQty;
      if (nextMap.caravanInventory.currentWeight + itemW > nextMap.caravanInventory.maxWeight) {
        addLog(`⚠️ Transfer blocked: Caravan cart is too heavy to carry this (+${itemW.toFixed(1)}kg Overweight!).`, 'warning');
        return prevMap;
      }
      if (nextMap.caravanInventory.currentVolume + itemV > nextMap.caravanInventory.maxVolume) {
        addLog(`⚠️ Transfer blocked: Caravan cart is out of cargo space (+${itemV.toFixed(1)}L Overvolume!).`, 'warning');
        return prevMap;
      }

      // Execute transfer
      (nextMap.stockpile as any)[itemKey] -= moveQty;
      nextMap.caravanInventory.items[itemKey] = (nextMap.caravanInventory.items[itemKey] || 0) + moveQty;

      // Recalculate caravan current weight and volume based on its items
      let totalW = 0;
      let totalV = 0;
      Object.entries(nextMap.caravanInventory.items).forEach(([k, qty]) => {
        const q = qty as number;
        totalW += getUnitWeight(k) * q;
        totalV += getUnitVolume(k) * q;
      });
      nextMap.caravanInventory.currentWeight = Math.round(totalW * 10) / 10;
      nextMap.caravanInventory.currentVolume = Math.round(totalV * 10) / 10;

      // Keep food synchronized (handling undefined values safely)
      nextMap.stockpile.food = (nextMap.stockpile.berries || 0) + (nextMap.stockpile.roots || 0) + (nextMap.stockpile.mushrooms || 0) + (nextMap.stockpile.meat || 0);

      addLog(`📦 Logistics: Loaded ${moveQty}x ${itemKey} onto Caravan Storage Cart.`, 'info');
      return nextMap;
    });
  };

  const handleTransferToVillage = (itemKey: string, amount: number) => {
    setMapData((prevMap) => {
      const nextMap = { ...prevMap };
      nextMap.stockpile = { ...prevMap.stockpile };
      if (!nextMap.caravanInventory || !nextMap.caravanInventory.items) return prevMap;
      nextMap.caravanInventory = { ...nextMap.caravanInventory };
      nextMap.caravanInventory.items = { ...nextMap.caravanInventory.items };

      const caravanStock = nextMap.caravanInventory.items[itemKey] || 0;
      const moveQty = Math.min(amount, caravanStock);
      if (moveQty <= 0) return prevMap;

      // Execute transfer
      nextMap.caravanInventory.items[itemKey] -= moveQty;
      (nextMap.stockpile as any)[itemKey] = ((nextMap.stockpile as any)[itemKey] || 0) + moveQty;

      // Recalculate caravan current weight and volume based on its items
      let totalW = 0;
      let totalV = 0;
      Object.entries(nextMap.caravanInventory.items).forEach(([k, qty]) => {
        const q = qty as number;
        totalW += getUnitWeight(k) * q;
        totalV += getUnitVolume(k) * q;
      });
      nextMap.caravanInventory.currentWeight = Math.round(totalW * 10) / 10;
      nextMap.caravanInventory.currentVolume = Math.round(totalV * 10) / 10;

      // Keep food synchronized (handling undefined values safely)
      nextMap.stockpile.food = (nextMap.stockpile.berries || 0) + (nextMap.stockpile.roots || 0) + (nextMap.stockpile.mushrooms || 0) + (nextMap.stockpile.meat || 0);

      addLog(`📦 Logistics: Unloaded ${moveQty}x ${itemKey} into Central Village Stockpile storage bins.`, 'info');
      return nextMap;
    });
  };

  const isNight = timeOfDay < 0.25 || timeOfDay > 0.75;

  // Track the most current data structure values for the selected inspector card
  const activeInspectedPerson = selectedTribesperson 
    ? tribe.find((t) => t.id === selectedTribesperson.id) || selectedTribesperson 
    : null;

  return (
    <div 
      id="app-root-viewport" 
      className={`relative w-screen h-screen overflow-hidden select-none transition-colors duration-1000 ${
        isNight ? 'bg-[#04060b]' : 'bg-[#7bc6fc]'
      }`}
    >
      {/* Tool Missing Temporary Warning Message */}
      {tempWarning && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-red-950/90 border border-red-500/50 px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3 backdrop-blur-md animate-bounce">
          <span className="text-xl">⚠️</span>
          <span className="text-white font-mono font-bold tracking-wider text-sm uppercase">({tempWarning})</span>
        </div>
      )}

      {/* 3D Viewport Layer */}
      <div id="game-canvas-container" className="absolute inset-0 z-0 animate-fade-in">
        <GameCanvas
          mapData={mapData}
          selectedCell={selectedCell}
          onSelectCell={(cell) => {
            if (relocatingStructure) {
              if (cell) {
                handleRelocateStructure(relocatingStructure.x, relocatingStructure.z, cell.x, cell.z);
              }
              return;
            }
            setSelectedCell(cell);
            if (cell) setSelectedTribesperson(null);
          }}
          timeOfDay={timeOfDay}
          timeSpeed={timeSpeed}
          tribe={tribe}
          selectedTribesperson={activeInspectedPerson}
          onSelectTribesperson={(p) => {
            setSelectedTribesperson(p);
            if (p) setSelectedCell(null);
          }}
          focusCoordinates={focusCoordinates}
          worldId={worldId}
          onCameraMove={(pos) => {
            setMapData((prev) => {
              if (
                prev.cameraWorldPos &&
                Math.abs(prev.cameraWorldPos.x - pos.x) < 0.1 &&
                Math.abs(prev.cameraWorldPos.z - pos.z) < 0.1
              ) {
                return prev;
              }
              const next = {
                ...prev,
                cameraWorldPos: { x: pos.x, z: pos.z }
              };
              updateWorldChunkLoading(next);
              return next;
            });
          }}
        />
      </div>

      {/* Floating HUD clock header and active game controls */}
      {!showMainMenu && (
        <>
          {/* Floating HUD clock header placed at upper center */}
          <div 
            id="hud-header"
            className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center"
          >
            <TopCenterHUD
              gameDays={gameDays}
              timeOfDay={timeOfDay}
              onChangeTimeOfDay={setTimeOfDay}
              timeSpeed={timeSpeed}
              onChangeTimeSpeed={setTimeSpeed}
              isCreativeMode={isCreativeMode}
              onToggleCreativeMode={toggleCreativeMode}
              nextCarePackageDay={nextCarePackageDay}
              onOpenCarePackage={generateCarePackageOptions}
            />
          </div>

          {/* Game Interactive Controls Overlay (Left Column, Active Tabs, Log widgets) */}
          <ControlsOverlay
            config={config}
            onChangeConfig={handleConfigChange}
            timeOfDay={timeOfDay}
            onChangeTimeOfDay={setTimeOfDay}
            timeSpeed={timeSpeed}
            onChangeTimeSpeed={setTimeSpeed}
            tribe={tribe}
            selectedTribesperson={activeInspectedPerson}
            onSelectTribesperson={(p) => {
              setSelectedTribesperson(p);
              setSelectedCell(null);
            }}
            onSpawnTribe={handleSpawnTribe}
            logs={logs}
            onTriggerDisaster={handleTriggerDisaster}
            onFocusCoordinates={handleFocusCoordinates}
            mapData={mapData}
            onUpdateMapData={handleUpdateMapData}
            selectedCell={selectedCell}
            onChangePriorities={handleChangePriorities}
            onDesignateConstruction={handleDesignateConstruction}
            onStartCraft={handleStartCraft}
            onCancelCraft={handleCancelCraft}
            onResearch={handleResearch}
            onStudyRelic={handleStudyRelic}
            onOrganizeWarehouse={handleOrganizeWarehouse}
            onTransferToCaravan={handleTransferToCaravan}
            onTransferToVillage={handleTransferToVillage}
            onMigrateRegion={handleMigrateRegion}
            onStartPacking={handleStartPackingCaravan}
            onChangeAutoGatherThreshold={handleChangeAutoGatherThreshold}
            isCreativeMode={isCreativeMode}
            onToggleCreativeMode={toggleCreativeMode}
            nextCarePackageDay={nextCarePackageDay}
            onOpenCarePackage={generateCarePackageOptions}
            gameDays={gameDays}
          />

          {/* Performance telemetry diagnostics panel HUD */}
          <PerformancePanel mapData={mapData} tribe={tribe} />

          {/* AI Director Debug & Control panel overlay (Deity Mode Only) */}
          {isCreativeMode && (
            <DirectorDebugPanel 
              mapData={mapData}
              setMapData={setMapData}
              tribe={tribe}
              setTribe={setTribe}
              addLog={addLog}
            />
          )}

          {/* Survival Mode Chronos Active Events HUD Window (Collapsible, Bottom-Left) */}
          {!isCreativeMode && mapData.aiDirector?.activeEvent && !mapData.aiDirector.activeEvent.resolved && (() => {
            const activeEvent = mapData.aiDirector.activeEvent;
            const currentDay = mapData.gameDaysPlayed ?? 0.40;
            const duration = activeEvent.event.durationDays ?? 1.5;
            const triggeredAt = activeEvent.triggeredDay ?? 0;
            const expiresAt = activeEvent.expiresDay ?? (triggeredAt + duration);
            const timeLeftDays = Math.max(0, expiresAt - currentDay);
            const hoursLeft = timeLeftDays * 24;
            const displayHours = Math.floor(hoursLeft);
            const displayMins = Math.floor((hoursLeft % 1) * 60);

            if (isEventWindowCollapsed) {
              return (
                <div 
                  id="chronos-active-events-window-collapsed"
                  onClick={() => setIsEventWindowCollapsed(false)}
                  className="fixed bottom-4 left-4 z-40 pointer-events-auto cursor-pointer bg-slate-900/95 hover:bg-slate-850/95 border border-[#cfad8c]/40 rounded-xl p-3 shadow-2xl text-slate-100 flex items-center justify-between gap-3 font-sans transition-all duration-300 animate-fade-in w-72"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[8px] font-mono uppercase tracking-wider text-[#cfad8c]/80">Active Event</span>
                      <span className="text-[10px] font-bold text-white truncate leading-tight">{activeEvent.event.name}</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEventWindowCollapsed(false);
                    }}
                    className="p-1 hover:bg-slate-800 rounded text-[#cfad8c]"
                  >
                    <ChevronUp size={14} />
                  </button>
                </div>
              );
            }

            return (
              <div 
                id="chronos-active-events-window"
                className="fixed bottom-4 left-4 z-40 pointer-events-auto w-72 bg-slate-900/95 border border-[#cfad8c]/30 rounded-2xl p-4 shadow-2xl text-slate-100 flex flex-col gap-3 font-sans transition-all duration-300 animate-fade-in"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#cfad8c] font-bold">
                      Chronos Active Event
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      1 ACTIVE
                    </div>
                    <button 
                      onClick={() => setIsEventWindowCollapsed(true)}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                      title="Collapse Panel"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1 bg-slate-950/45 p-2.5 rounded-xl border border-slate-800/40">
                  <span className="text-[11px] font-bold text-white leading-tight">
                    {activeEvent.event.name}
                  </span>
                  <span className="text-[9px] text-[#cfad8c] font-mono uppercase tracking-wider">
                    {activeEvent.event.category}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {activeEvent.event.description}
                  </p>
                </div>

                {/* Timer progress bar and remaining countdown */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock size={11} className="text-slate-500" />
                      Time Remaining:
                    </span>
                    <span className={`font-bold ${timeLeftDays < 0.3 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                      {displayHours}h {displayMins}m
                    </span>
                  </div>
                  
                  {/* Visual progress bar */}
                  <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-850 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        (timeLeftDays / duration) < 0.3 ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, (timeLeftDays / duration) * 100))}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setMapData((prev) => {
                      const nextMap = { ...prev };
                      if (nextMap.aiDirector && nextMap.aiDirector.activeEvent) {
                        nextMap.aiDirector = {
                          ...nextMap.aiDirector,
                          activeEvent: {
                            ...nextMap.aiDirector.activeEvent,
                            deferred: false,
                          } as any
                        };
                      }
                      return nextMap;
                    });
                  }}
                  className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer text-center"
                  id="reopen-chronos-decision-btn"
                >
                  ⚠️ Open Decision Modal
                </button>
              </div>
            );
          })()}

          {/* AI Director Interactive Decision dialog overlay */}
          <DirectorEventModal
            mapData={mapData}
            setMapData={setMapData}
            tribe={tribe}
            setTribe={setTribe}
            addLog={addLog}
          />

          {/* Interactive Selected Mesh Inspector Overlay (Right Column Panel Slider) */}
          <Inspector
            selectedCell={selectedCell}
            onClear={() => setSelectedCell(null)}
            timeOfDay={timeOfDay}
            selectedTribesperson={activeInspectedPerson}
            onClearTribesperson={() => setSelectedTribesperson(null)}
            onRoleChange={handleRoleChange}
            onFocusCoordinates={handleFocusCoordinates}
            onRelocateStructure={(x, z) => setRelocatingStructure({ x, z })}
            onDismantleStructure={(x, z) => handleDismantleStructure(x, z)}
            mapData={mapData}
            onDesignateConstruction={handleDesignateConstruction}
            onManualAction={handleExecuteManualAction}
            onLaunchExpedition={handleLaunchExpedition}
            onStartCraft={handleStartCraft}
            onCancelCraft={handleCancelCraft}
            onResearch={handleResearch}
            onStudyRelic={handleStudyRelic}
            tribe={tribe}
            isCreativeMode={isCreativeMode}
            onOpenOracleHub={() => setShowOracleHub(true)}
            onOpenCraftingModal={() => setShowCraftingModal(true)}
          />

          {/* Relocation Mode Active Prompt */}
          <AnimatePresence>
            {relocatingStructure && (
              <motion.div
                id="relocation-toast-panel"
                initial={{ opacity: 0, y: -50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute top-20 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl border bg-slate-900 border-indigo-500/40 shadow-2xl shadow-indigo-500/10 flex flex-col items-center gap-2 max-w-sm pointer-events-auto text-slate-100"
              >
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                  <Compass className="animate-spin" size={14} />
                  <span>Relocation Mode Active</span>
                </div>
                <p className="text-[10px] text-slate-400 text-center font-mono leading-relaxed">
                  Instantly relocating Portable structure from <strong className="text-white">[{relocatingStructure.x}, {relocatingStructure.z}]</strong>.
                  Click any empty, scouted land cell to place the structure, or click cancel to abort.
                </p>
                <button
                  onClick={() => {
                    setRelocatingStructure(null);
                    addLog(`🚚 Relocation cancelled.`, `info`);
                  }}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold font-mono text-[9px] rounded-lg tracking-wider uppercase transition-colors"
                >
                  Cancel Relocation
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* deity printing pod selection modal */}
          <AnimatePresence>
            {showCarePackagePopup && carePackageOptions.length > 0 && (
              <div id="care-package-overlay" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl flex flex-col gap-6 text-slate-100"
                >
                  <div className="text-center flex flex-col items-center gap-1.5 border-b border-indigo-900/40 pb-4">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#cfad8c] uppercase flex items-center gap-1.5 animate-pulse">
                      🔵 DEITY PRINTING POD DETECTED
                    </span>
                    <h2 className="text-2xl font-bold font-sans tracking-tight text-white">Choose Your Care Package</h2>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      Deep within your colony's dimensional matrix, an automated supply gate has ionized. Choose exactly **one** asset to materialize.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="care-package-grid">
                    {carePackageOptions.map((opt, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ y: -6, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleClaimCarePackage(opt)}
                        className="text-left p-5 rounded-2xl border flex flex-col gap-3 transition-colors cursor-pointer bg-slate-800/40 hover:bg-slate-800 border-slate-700/50 hover:border-indigo-400 group relative overflow-hidden"
                      >
                        {/* Glowing radial accent light */}
                        <div className="absolute -bottom-4 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />

                        <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-500/20 flex items-center justify-center text-xl">
                          {opt.type === 'pioneer' ? '👤' : opt.type === 'resources' ? '📦' : '🍖'}
                        </div>

                        <div>
                          <h4 className="font-extrabold text-sm tracking-tight text-indigo-300 font-mono mb-1">
                            {opt.title}
                          </h4>
                          <p className="text-[11px] leading-relaxed text-slate-400 font-sans group-hover:text-slate-350">
                            {opt.description}
                          </p>
                        </div>

                        {opt.type === 'pioneer' && opt.value && (
                          <div className="mt-auto pt-3 border-t border-slate-800/60 text-[9px] font-mono text-slate-500 grid grid-cols-2 gap-1 bg-slate-900/30 p-2 rounded-lg">
                            <div>Role: <strong>{opt.value.role}</strong></div>
                            <div>Health: <strong>{opt.value.stats.health}%</strong></div>
                            <div>STR: <strong>{opt.value.attributes.strength}</strong></div>
                            <div>INT: <strong>{opt.value.attributes.intelligence}</strong></div>
                          </div>
                        )}

                        {opt.type === 'resources' && (
                          <div className="mt-auto pt-3 border-t border-slate-800/60 text-[9px] font-mono text-slate-500 grid grid-cols-2 gap-1 bg-slate-900/30 p-2 rounded-lg">
                            <div>Drawn: +150 Wood</div>
                            <div>Material: +150 Stone</div>
                          </div>
                        )}

                        {opt.type === 'food' && (
                          <div className="mt-auto pt-3 border-t border-slate-800/60 text-[9px] font-mono text-slate-500 grid grid-cols-2 gap-1 bg-slate-900/30 p-2 rounded-lg">
                            <div>Prepared Food Packs</div>
                            <div>Units: +150 Food</div>
                          </div>
                        )}

                        <div className="mt-3 py-1.5 px-3 rounded-lg bg-indigo-900/20 group-hover:bg-indigo-600 group-hover:text-slate-950 font-bold font-mono text-[9px] text-indigo-300 text-center tracking-wider uppercase transition-colors">
                          Materialize
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  <div className="text-center pt-2 border-t border-indigo-900/30">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                      SYSTEM LEVEL 1 PRINTING pod — CHOOSE ONE CHOICE
                    </span>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* God Tips Popup Layer */}
          <GodTips />
        </>
      )}

      {/* MAIN START MENU OVERLAY PANEL */}
      {showMainMenu && (
        <div id="main-menu-overlay" className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in pointer-events-auto">
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-slate-100 flex flex-col gap-6 max-h-[85vh] overflow-y-auto no-scrollbar relative">
            
            {menuTab === 'main' && (
              <div className="flex flex-col gap-6 text-center">
                {/* Visual campfire branding / header */}
                <div className="flex flex-col items-center gap-1.5 mt-2">
                  <div className="w-14 h-14 rounded-full bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shadow-lg animate-pulse">
                    <Flame size={28} className="text-amber-500 shrink-0" />
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-wider font-sans bg-gradient-to-r from-amber-400 via-orange-400 to-indigo-400 bg-clip-text text-transparent uppercase mt-1">
                    Diorama Colony
                  </h1>
                  <p className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                    3D Procedural Tribal God Sim
                  </p>
                </div>

                {/* Subtext description box */}
                <div className="p-3 bg-slate-950/40 border border-slate-800/50 rounded-2xl text-[11px] text-slate-400 font-mono leading-relaxed text-left">
                  🌟 Act as the guiding deity in a responsive, procedurally-crafted 3D world. Orchestrate blueprints, manage food, build defenses, and ensure your pioneers survive off the land!
                </div>

                {/* Buttons stack */}
                <div className="flex flex-col gap-2.5 mt-2">
                  <button
                    id="menu-btn-new-tribe"
                    onClick={() => {
                      const newSeed = Math.floor(Math.random() * 8999) + 1000;
                      setConfig((prev) => ({ ...prev, seed: newSeed }));
                      setMenuTab('new_tribe');
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/10 active:scale-98 transition-all cursor-pointer"
                  >
                    <Play size={14} fill="currentColor" />
                    <span>New Tribe Settlement</span>
                  </button>

                  <button
                    id="menu-btn-load-tribe"
                    onClick={() => setMenuTab('load_tribe')}
                    className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/30 text-slate-200 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2.5 active:scale-98 transition-all cursor-pointer"
                  >
                    <FolderOpen size={14} />
                    <span>Load Tribe Save</span>
                  </button>

                  <button
                    id="menu-btn-settings"
                    onClick={() => {
                      setMenuTab('settings');
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-slate-850/60 hover:bg-slate-800/80 border border-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2.5 active:scale-98 transition-all cursor-pointer"
                  >
                    <Sliders size={14} />
                    <span>Simulation Settings</span>
                  </button>

                  <button
                    id="menu-btn-exit"
                    onClick={() => setMenuTab('exit_screen')}
                    className="w-full py-3 px-4 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 hover:text-rose-300 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2.5 active:scale-98 transition-all cursor-pointer mt-2"
                  >
                    <LogOut size={14} />
                    <span>Exit Simulator</span>
                  </button>
                </div>
              </div>
            )}

            {menuTab === 'new_tribe' && (
              <div className="flex flex-col gap-4 text-left">
                <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Compass className="text-amber-500 animate-spin" size={16} />
                    <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-100">World Inception Config</h2>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 font-mono leading-normal">
                  Customize the parameters to construct a unique procedural 3D land topography before spawning your pioneer tribe.
                </p>

                <div className="flex flex-col gap-3.5 my-2">
                  {/* Seed Input */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 flex justify-between items-center">
                      <span>World Generation Seed</span>
                      <span className="text-indigo-400 font-bold font-mono">#{config.seed}</span>
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        value={config.seed}
                        onChange={(e) => setConfig({ ...config, seed: parseInt(e.target.value) || 123 })}
                        className="flex-1 bg-slate-950/60 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
                      />
                      <button
                        onClick={() => setConfig({ ...config, seed: Math.floor(Math.random() * 8999) + 1000 })}
                        className="bg-slate-850 hover:bg-slate-700/80 text-indigo-400 hover:text-white p-2 rounded-xl border border-slate-800 transition-all cursor-pointer flex items-center justify-center"
                        title="Randomize Seed"
                      >
                        <Sparkles size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Grid Size preset choices */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">
                      Grid Geometry
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[60, 120, 180].map((s) => (
                        <button
                          key={s}
                          onClick={() => setConfig({ ...config, size: s })}
                          className={`text-xs p-2 rounded-xl text-center font-bold tracking-tight border transition-all cursor-pointer ${
                            config.size === s 
                              ? 'bg-indigo-650 border-indigo-500 text-white shadow-lg shadow-indigo-650/15'
                              : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          <div>{s === 60 ? 'Small' : s === 120 ? 'Medium' : 'Large'}</div>
                          <div className="text-[8px] font-mono opacity-60 font-medium">{s}x{s} Tiles</div>
                        </button>
                      ))}
                    </div>
                  </div>



                  {/* Forest Density */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">
                      <span>Vegetation Forest Density</span>
                      <span className="text-indigo-400">{Math.round(config.forestDensity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={config.forestDensity}
                      onChange={(e) => setConfig({ ...config, forestDensity: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Rock Outcrop Density */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">
                      <span>Lithic Rock Density</span>
                      <span className="text-indigo-400">{Math.round(config.rockDensity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={config.rockDensity}
                      onChange={(e) => setConfig({ ...config, rockDensity: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Elevation Roughness */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">
                      <span>Elevation Scale Roughness</span>
                      <span className="text-indigo-400">{config.roughness.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.05"
                      value={config.roughness}
                      onChange={(e) => setConfig({ ...config, roughness: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Confirm actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setMenuTab('main')}
                    className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-850 hover:bg-slate-800 text-slate-350 text-[10px] font-bold uppercase tracking-wider cursor-pointer font-sans"
                  >
                    Back
                  </button>
                  <button
                    id="menu-inception-launch"
                    onClick={() => startNewGame(config)}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-550 text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-650/15 font-sans"
                  >
                    <span>Establish Tribe</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {menuTab === 'load_tribe' && (
              <div className="flex flex-col gap-4 text-left">
                <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <FolderOpen size={16} className="text-indigo-400" />
                    <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-100">Load Past Tribes</h2>
                  </div>
                </div>

                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {saves.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-xs italic bg-slate-950/30 font-mono">
                      No saved tribes. Establish a settlement and save manually via the ESC pause menu to store progress.
                    </div>
                  ) : (
                    saves
                      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                      .map((save) => (
                        <div
                          key={save.slotIndex}
                          onClick={() => handleLoadGame(save)}
                          className="p-3 bg-slate-950/40 hover:bg-indigo-650/10 border border-slate-850 hover:border-indigo-500/20 rounded-xl flex items-center justify-between text-left cursor-pointer group transition-all"
                        >
                          <div className="flex flex-col gap-1 pr-3">
                            <span className="text-[11px] font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                              {save.name}
                            </span>
                            <span className="text-[8px] font-mono text-slate-500 flex items-center gap-1">
                              Saved: {save.timestamp} • Seed #{save.config.seed}
                            </span>
                          </div>
                          
                          <button
                            onClick={(e) => handleDeleteSave(save.slotIndex, e)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Save"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                  )}
                </div>

                <button
                  onClick={() => setMenuTab('main')}
                  className="w-full mt-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl border border-slate-800 bg-slate-850 hover:bg-slate-800 text-slate-350 cursor-pointer font-sans"
                >
                  Back
                </button>
              </div>
            )}

            {menuTab === 'settings' && (
              <div className="flex flex-col gap-4 text-left">
                <div className="border-b border-[#1f2e4d] pb-2 flex items-center gap-2">
                  <SettingsIcon className="text-indigo-500" size={15} />
                  <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-100">Global Settings</h2>
                </div>

                <div className="flex flex-col gap-4 my-2">
                  {/* Volume Slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-slate-500">
                      <span className="flex items-center gap-1"><Volume2 size={13} /> Sound Volume</span>
                      <span className="text-indigo-400">{settings.volume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={settings.volume}
                      onChange={(e) => saveSettings({ ...settings, volume: parseInt(e.target.value) })}
                      className="w-full h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer text-xs"
                    />
                  </div>

                  {/* Show Grid Selector toggle */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50 border border-slate-850">
                    <div className="flex flex-col gap-0.5 max-w-[70%]">
                      <span className="text-[10px] font-bold text-slate-200">Show 3D Tile Outlines</span>
                      <span className="text-[8px] font-mono text-slate-500">Provides coordinate margins outlines on grid cells.</span>
                    </div>
                    <button
                      onClick={() => saveSettings({ ...settings, showGrid: !settings.showGrid })}
                      className={`px-3 py-1 text-[9px] font-mono font-bold rounded-lg tracking-wider border transition-all ${
                        settings.showGrid
                          ? 'bg-indigo-650/20 border-indigo-500/40 text-indigo-400'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {settings.showGrid ? 'ACTIVE' : 'MUTED'}
                    </button>
                  </div>

                  {/* Auto-Save choice */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1"><RefreshCw size={11} /> AutoSave Frequency</span>
                    <div className="grid grid-cols-4 gap-1">
                      {['off', '1min', '5min', '10min'].map((freq) => (
                        <button
                          key={freq}
                          onClick={() => saveSettings({ ...settings, autoSave: freq })}
                          className={`text-[9px] font-mono font-bold py-1.5 rounded-lg border text-center transition-all cursor-pointer capitalize ${
                            settings.autoSave === freq
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {freq === 'off' ? 'Off' : freq}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* High Graphics mode toggle */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50 border border-slate-850">
                    <div className="flex flex-col gap-0.5 max-w-[70%]">
                      <span className="text-[10px] font-bold text-slate-200">High Resolution Details</span>
                      <span className="text-[8px] font-mono text-slate-500">Augments detail processing and dynamic visualizers.</span>
                    </div>
                    <button
                      onClick={() => saveSettings({ ...settings, graphicsLevel: settings.graphicsLevel === 'High' ? 'Low' : 'High' })}
                      className={`px-3 py-1 text-[9px] font-mono font-bold rounded-lg tracking-wider border transition-all ${
                        settings.graphicsLevel === 'High'
                          ? 'bg-indigo-650/20 border-indigo-500/40 text-indigo-400'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {settings.graphicsLevel}
                    </button>
                  </div>

                  {/* AI & Pathfinding tick rate */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50 border border-slate-850">
                    <div className="flex flex-col gap-0.5 max-w-[60%] text-left">
                      <span className="text-[10px] font-bold text-slate-200">AI Tick Frequency</span>
                      <span className="text-[8px] font-mono text-slate-500">Fast updates increase precision; Slow updates dramatically improve CPU.</span>
                    </div>
                    <div className="flex gap-1">
                      {(['Slow', 'Normal', 'Fast'] as const).map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => saveSettings({ ...settings, pathfindingTickRate: rate })}
                          className={`px-2 py-1 text-[8px] font-mono font-bold rounded-md border transition-all ${
                            settings.pathfindingTickRate === rate
                              ? 'bg-emerald-650/20 border-emerald-500/40 text-emerald-400'
                              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
                          }`}
                        >
                          {rate.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setMenuTab('main')}
                  className="w-full mt-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl border border-slate-800 bg-slate-850 hover:bg-slate-800 text-slate-350 cursor-pointer font-sans"
                >
                  Confirm & Close
                </button>
              </div>
            )}

            {menuTab === 'exit_screen' && (
              <div className="flex flex-col gap-5 text-center p-4">
                <div className="w-12 h-12 rounded-full bg-rose-950/40 border border-rose-900/30 flex items-center justify-center text-rose-400 mx-auto">
                  <LogOut size={20} />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-200">Deity Session Closed</h2>
                  <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
                    The mechanical simulation of Diorama Colony is paused. Thank you for ruling and looking after your tribal flock!
                  </p>
                </div>

                <div className="p-3 border border-indigo-500/10 rounded-2xl bg-indigo-500/10 font-mono text-[9px] text-indigo-300 select-text leading-relaxed">
                  You can now safely close this browser or tab. To revive your settlement later, launch the app again!
                </div>

                <button
                  onClick={() => setMenuTab('main')}
                  className="w-full mt-2 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-lg shadow-indigo-650/10 transition-colors font-sans"
                >
                  Restart deity session
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORACLE HUB INTERACTIVE INFORMATION HUB OVERLAY */}
      {showOracleHub && (() => {
        const activeOracle = tribe.find(p => p.isAlive && p.role === 'Oracle');
        if (!activeOracle) return null;
        return (
          <OracleHub
            mapData={mapData}
            setMapData={setMapData}
            tribe={tribe}
            setTribe={setTribe}
            oracle={activeOracle}
            onClose={() => setShowOracleHub(false)}
            addLog={addLog}
            gameDays={gameDays}
          />
        );
      })()}

      {/* ARTISAN CRAFTING POPUP OVERLAY */}
      {showCraftingModal && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="w-full max-w-3xl bg-slate-900/95 border border-slate-700/50 rounded-3xl p-6 shadow-2xl text-slate-100 flex flex-col max-h-[85vh] relative animate-fade-in overflow-hidden">
            <button
              onClick={() => setShowCraftingModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-800/50 hover:bg-slate-800/80 p-2 rounded-full z-50 flex items-center justify-center w-8 h-8"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <span className="text-xl">🛠️</span>
              <div>
                <h2 className="font-extrabold text-sm uppercase tracking-wider text-white">Artisan's Bench Crafting</h2>
                <p className="text-[10px] text-slate-400">Queue up tool, weapon, defensive and luxury projects for your village artisans.</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
              <CraftingHub
                mapData={mapData}
                isNight={timeOfDay < 0.25 || timeOfDay > 0.75}
                onStartCraft={handleStartCraft}
                onCancelCraft={handleCancelCraft}
                onResearch={handleResearch}
                onStudyRelic={handleStudyRelic}
                artisanCount={tribe ? tribe.filter(p => p.isAlive && p.role === 'Artisan').length : 0}
                isCreativeMode={isCreativeMode}
                onClose={() => setShowCraftingModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* PAUSE MENU OVERLAY PANEL */}
      {showPauseMenu && !showMainMenu && (
        <div id="pause-menu-overlay" className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in pointer-events-auto">
          <div className="w-full max-w-sm bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl text-slate-100 flex flex-col gap-4 relative">
            
            {showSettings && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="border-b border-[#1f2e4d] pb-2 flex items-center gap-2">
                  <SettingsIcon className="text-indigo-500" size={15} />
                  <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-150">In-Game General Settings</h2>
                </div>

                <div className="flex flex-col gap-4 my-2">
                  {/* Volume */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-widest text-slate-500">
                      <span className="flex items-center gap-1"><Volume2 size={12} /> Sound Volume</span>
                      <span className="text-indigo-400">{settings.volume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={settings.volume}
                      onChange={(e) => saveSettings({ ...settings, volume: parseInt(e.target.value) })}
                      className="w-full h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Grid Toggle */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50 border border-slate-850">
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-[9px] font-bold text-slate-200 uppercase tracking-wide">Show Tile Outlines</span>
                      <span className="text-[7px] font-mono text-slate-500">Provides coordinate boundaries.</span>
                    </div>
                    <button
                      onClick={() => saveSettings({ ...settings, showGrid: !settings.showGrid })}
                      className={`px-2.5 py-0.5 text-[8px] font-mono font-bold rounded tracking-wider border transition-all ${
                        settings.showGrid
                          ? 'bg-indigo-650/20 border-indigo-500/40 text-indigo-400'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {settings.showGrid ? 'ACTIVE' : 'MUTED'}
                    </button>
                  </div>

                  {/* Graphics quality */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50 border border-slate-850">
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-[9px] font-bold text-slate-200 uppercase tracking-wide">High Graphics</span>
                      <span className="text-[7px] font-mono text-slate-500">Augments detail quality.</span>
                    </div>
                    <button
                      onClick={() => saveSettings({ ...settings, graphicsLevel: settings.graphicsLevel === 'High' ? 'Low' : 'High' })}
                      className={`px-2.5 py-0.5 text-[8px] font-mono font-bold rounded tracking-wider border transition-all ${
                        settings.graphicsLevel === 'High'
                          ? 'bg-indigo-650/20 border-indigo-500/40 text-indigo-400'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {settings.graphicsLevel}
                    </button>
                  </div>

                  {/* AI & Pathfinding tick rate */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50 border border-slate-850">
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-[9px] font-bold text-slate-200 uppercase tracking-wide">AI Tick Frequency</span>
                      <span className="text-[7px] font-mono text-slate-500">Simulation tick intervals.</span>
                    </div>
                    <div className="flex gap-1">
                      {(['Slow', 'Normal', 'Fast'] as const).map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => saveSettings({ ...settings, pathfindingTickRate: rate })}
                          className={`px-2 py-0.5 text-[7px] font-mono font-bold rounded border transition-all ${
                            settings.pathfindingTickRate === rate
                              ? 'bg-emerald-650/20 border-emerald-500/40 text-emerald-400'
                              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
                          }`}
                        >
                          {rate.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] tracking-wider uppercase rounded-xl cursor-pointer"
                >
                  Confirm & Close Settings
                </button>
              </div>
            )}

            {!showSettings && confirmExitState === 'none' && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="text-center flex flex-col items-center gap-1 mt-2">
                  <Grid size={24} className="text-indigo-400 animate-pulse shrink-0" />
                  <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-100 mt-1">Simulation Suspended</h3>
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none">Pause menu controls</span>
                </div>

                <div className="flex flex-col gap-3 my-2">
                  {/* Resume Game */}
                  <button
                    onClick={() => setShowPauseMenu(false)}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] tracking-wider uppercase transition-all cursor-pointer font-sans"
                  >
                    ▶️ Resume Deity Work
                  </button>

                  {/* Manual Save Choice dropdown / widget */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 flex flex-col gap-2">
                    <span className="text-[8px] font-mono font-extrabold uppercase tracking-widest text-slate-500 text-left">💾 Save Tribe Progress</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[0, 1, 2].map((slot) => {
                        const hasSave = saves.some(s => s.slotIndex === slot);
                        return (
                          <button
                            key={slot}
                            onClick={() => handleSaveGame(slot)}
                            className="py-2 rounded-xl text-center font-bold text-[9px] border transition-all cursor-pointer flex flex-col items-center justify-center bg-slate-900 hover:bg-indigo-600/15 border-slate-800 hover:border-indigo-500/20 text-slate-300"
                            title={hasSave ? "Overwrite Save Slot" : "Create Save"}
                          >
                            <span className="font-sans font-bold">Slot {slot + 1}</span>
                            <span className="text-[6px] font-mono opacity-50 uppercase tracking-tight">{hasSave ? 'REPLACE' : 'EMPTY'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Direct Load choice */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 flex flex-col gap-2">
                    <span className="text-[8px] font-mono font-extrabold uppercase tracking-widest text-slate-500 text-left">📂 Load Save Slot</span>
                    {saves.length === 0 ? (
                      <span className="text-[8px] font-mono italic text-slate-600 text-center py-1">No saves located.</span>
                    ) : (
                      <div className="flex flex-col gap-1 max-h-[110px] overflow-y-auto pr-0.5">
                        {saves
                          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                          .map((save) => (
                            <button
                              key={save.slotIndex}
                              onClick={() => handleLoadGame(save)}
                              className="w-full p-2 bg-slate-900 hover:bg-slate-850 border border-slate-850 text-slate-300 rounded-lg text-left flex items-center justify-between text-[10px] cursor-pointer"
                            >
                              <div className="flex flex-col text-left">
                                <span className="font-bold text-slate-200">Slot {save.slotIndex + 1}</span>
                                <span className="text-[6px] font-mono text-slate-500">{save.timestamp}</span>
                              </div>
                              <ChevronRight size={10} className="text-slate-500 animate-pulse" />
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Settings popup click */}
                  <button
                    onClick={() => setShowSettings(true)}
                    className="w-full py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-350 font-bold text-[10px] tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1 font-sans"
                  >
                    <Sliders size={11} />
                    <span>In-Game Settings</span>
                  </button>

                  {/* exit trigger */}
                  <button
                    onClick={() => setConfirmExitState('save_prompt')}
                    className="w-full mt-1.5 py-2.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 hover:text-rose-300 font-bold text-[10px] tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1 font-sans"
                  >
                    <LogOut size={11} />
                    <span>Exit to Main Menu</span>
                  </button>
                </div>
              </div>
            )}

            {/* EXIT CONFIRMATION SAVE PROMPT */}
            {!showSettings && confirmExitState === 'save_prompt' && (
              <div className="flex flex-col gap-4 text-center py-2 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-indigo-950/40 border border-indigo-900/40 flex items-center justify-center text-indigo-400 mx-auto animate-bounce">
                  <Download size={16} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-100">Save Tribe Progress?</h4>
                  <p className="text-[10px] text-slate-400 font-mono leading-relaxed max-w-[280px] mx-auto">
                    Guarding Deity, do you want to save your progress in Save Slot 1 before returning to the main menu?
                  </p>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <button
                    onClick={() => {
                      // Save to Slot 1, then exit
                      handleSaveGame(0);
                      resetToMainMenu();
                    }}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                  >
                    <Check size={12} />
                    <span>Yes, Save & Exit</span>
                  </button>

                  <button
                    onClick={() => {
                      // Exit directly without updating saves
                      resetToMainMenu();
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-950/50 hover:bg-rose-950/20 hover:text-rose-400 border border-slate-805 text-slate-400 font-bold text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                  >
                    <X size={12} />
                    <span>No, Exit Directly</span>
                  </button>

                  <button
                    onClick={() => setConfirmExitState('none')}
                    className="w-full mt-1.5 py-1.5 text-[9px] font-mono text-slate-400 hover:text-white hover:underline uppercase tracking-wider cursor-pointer"
                  >
                    Cancel Action
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CRITICAL GAME ERROR OVERLAY */}
      {gameError && (
        <div id="game-crash-overlay" className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in pointer-events-auto">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl text-slate-100 flex flex-col gap-6 relative">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
                <AlertOctagon size={22} className="animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-400 capitalize tracking-wide">Simulation Restored</h3>
                <p className="text-[10px] font-mono text-slate-400">An unexpected state collision occurred</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Error Core Details:</span>
              <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl font-mono text-xs text-red-300 leading-relaxed max-h-[160px] overflow-y-auto break-all">
                {gameError}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 mt-2">
              <button
                onClick={() => {
                  setGameError(null);
                  resetToMainMenu();
                }}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
              >
                <span>Safely Return to Main Menu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
