import { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  FastForward, 
  Compass, 
  Settings, 
  RefreshCw, 
  Sun, 
  Moon, 
  HelpCircle, 
  Sparkles, 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Skull, 
  Flame, 
  Droplets, 
  Heart,
  Briefcase,
  Layers,
  MapPin,
  MessageSquare,
  Zap,
  Activity,
  Hammer,
  Warehouse,
  BookOpen
} from 'lucide-react';
import { WorldConfig, TimeSpeed, Tribesperson, TribespersonRole, JobCategory, JobPriority, MapData, CellInfo, RECIPE_DATABASE, Recipe } from '../types';
import CraftingTab from './CraftingTab';
import InventoryTab from './InventoryTab';

interface ControlsOverlayProps {
  config: WorldConfig;
  onChangeConfig: (newConfig: WorldConfig) => void;
  timeOfDay: number; // 0..1
  onChangeTimeOfDay: (time: number) => void;
  timeSpeed: TimeSpeed;
  onChangeTimeSpeed: (speed: TimeSpeed) => void;
  tribe: Tribesperson[];
  selectedTribesperson: Tribesperson | null;
  onSelectTribesperson: (person: Tribesperson | null) => void;
  onSpawnTribe: (count: number) => void;
  logs: { id: string; text: string; type: 'info' | 'warning' | 'death' | 'level'; timeText: string }[];
  onTriggerDisaster: (type: 'plague' | 'drought' | 'bounty' | 'feast') => void;
  onFocusCoordinates: (x: number, z: number) => void;
  mapData: MapData;
  selectedCell: CellInfo | null;
  onChangePriorities: (personId: string, job: JobCategory, priority: JobPriority) => void;
  onDesignateConstruction: (x: number, z: number, type: 'Shelter' | 'WaterWell' | 'LogWall' | 'StorageBin' | 'Wheat' | 'Tent' | 'Shrine' | 'WatchTower' | 'ArtisanBench' | 'ScienceMachine' | 'RuinousAltar' | 'Fireplace' | 'PetrifiedGreenhouse' | 'PrecursorGenerator' | 'AegisBeacon' | 'GatherersPantry' | 'HuntersHut' | 'BuildersLodge' | 'FarmersGranary' | 'ScoutsLookout' | 'HealersSanctum' | 'ArtisansWorkshop') => void;
  onStartCraft?: (recipeId: string) => void;
  onCancelCraft?: (jobId: string) => void;
  onResearch?: (recipeId: string) => void;
  onStudyRelic?: () => void;
  onOrganizeWarehouse?: () => void;
  onTransferToCaravan?: (itemKey: string, amount: number) => void;
  onTransferToVillage?: (itemKey: string, amount: number) => void;
  onMigrateRegion?: () => void;
  onChangeAutoGatherThreshold?: (key: string, value: number) => void;

  // Game Mode & Care Package props
  isCreativeMode: boolean;
  onToggleCreativeMode: (enabled: boolean) => void;
  nextCarePackageDay: number;
  onOpenCarePackage: () => void;
  gameDays: number;
}

const ROLE_COLORS: Record<TribespersonRole, string> = {
  Gatherer: '#e29578', 
  Hunter: '#e63946',   
  Farmer: '#4ecdc4',   
  Builder: '#ffb703',  
  Scout: '#a8dadc',    
  Healer: '#ff006e',   
  Artisan: '#ff70a6',  
  Oracle: '#a855f7',
};

export default function ControlsOverlay({
  config,
  onChangeConfig,
  timeOfDay,
  onChangeTimeOfDay,
  timeSpeed,
  onChangeTimeSpeed,
  tribe,
  selectedTribesperson,
  onSelectTribesperson,
  onSpawnTribe,
  logs,
  onTriggerDisaster,
  onFocusCoordinates,
  mapData,
  selectedCell,
  onChangePriorities,
  onDesignateConstruction,
  onStartCraft,
  onCancelCraft,
  onResearch,
  onStudyRelic,
  onOrganizeWarehouse,
  onTransferToCaravan,
  onTransferToVillage,
  onMigrateRegion,
  onChangeAutoGatherThreshold,

  isCreativeMode,
  onToggleCreativeMode,
  nextCarePackageDay,
  onOpenCarePackage,
  gameDays
}: ControlsOverlayProps) {
  // Config form local states to allow typing before committing
  const [localSize, setLocalSize] = useState(config.size);
  const [localSeed, setLocalSeed] = useState(config.seed);
  const [localForest, setLocalForest] = useState(config.forestDensity);
  const [localRock, setLocalRock] = useState(config.rockDensity);
  const [localRoughness, setLocalRoughness] = useState(config.roughness);
  const [localWater, setLocalWater] = useState(config.waterLevel);
  
  const [introSeconds, setIntroSeconds] = useState(15);
  useEffect(() => {
    const timer = setInterval(() => {
      setIntroSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  const [activeTab, setActiveTab ] = useState<'tribe' | 'work' | 'craft' | 'inventory' | 'lore'>('tribe');
  const [showDetailedRes, setShowDetailedRes] = useState(false);
  const [isLogHovered, setIsLogHovered] = useState(false);
  
  const [editingThresholdKey, setEditingThresholdKey] = useState<string | null>(null);
  const [editingThresholdLabel, setEditingThresholdLabel] = useState<string>('');
  const [localThresholdInput, setLocalThresholdInput] = useState<string>('');

  const openThresholdEditor = (key: string, label: string) => {
    setEditingThresholdKey(key);
    setEditingThresholdLabel(label);
    const current = (mapData.autoGatherThresholds || {})[key] ?? 0;
    setLocalThresholdInput(current > 0 ? String(current) : '');
  };
  
  // Search & Filter local states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'alive' | 'deceased'>('alive');

  const triggerRegen = () => {
    onChangeConfig({
      size: localSize,
      seed: localSeed,
      roughness: localRoughness,
      forestDensity: localForest,
      rockDensity: localRock,
      waterLevel: localWater,
    });
  };

  const randomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 99999) + 1;
    setLocalSeed(newSeed);
    onChangeConfig({
      size: localSize,
      seed: newSeed,
      roughness: localRoughness,
      forestDensity: localForest,
      rockDensity: localRock,
      waterLevel: localWater,
    });
  };

  // Convert time to 24 Hour representation
  const absoluteMinutes = Math.floor(timeOfDay * 24 * 60);
  const hours = Math.floor(absoluteMinutes / 60);
  const mins = Math.floor(absoluteMinutes % 60);
  const formattedTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

  const isNight = timeOfDay < 0.25 || timeOfDay > 0.75;

  // --- DERIVED METRICS FOR CLAN ---
  const aliveMembers = tribe.filter(t => t.isAlive);
  const deadMembers = tribe.filter(t => !t.isAlive);
  
  const totalPop = aliveMembers.length;
  const deadCount = deadMembers.length;

  const avgMorale = totalPop > 0 
    ? Math.round(aliveMembers.reduce((sum, t) => sum + t.stats.morale, 0) / totalPop) 
    : 0;
  const avgHealth = totalPop > 0 
    ? Math.round(aliveMembers.reduce((sum, t) => sum + t.stats.health, 0) / totalPop) 
    : 0;
  const avgHunger = totalPop > 0 
    ? Math.round(aliveMembers.reduce((sum, t) => sum + t.stats.hunger, 0) / totalPop) 
    : 0;

  // Filter roster list
  const filteredRoster = tribe.filter(person => {
    // 1. Search Query
    if (searchQuery && !person.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // 2. Role Filter
    if (roleFilter !== 'all' && person.role !== roleFilter) {
      return false;
    }
    // 3. Status Filter
    if (statusFilter === 'alive' && !person.isAlive) return false;
    if (statusFilter === 'deceased' && person.isAlive) return false;
    
    return true;
  });

  return (
    <div className="absolute inset-0 pointer-events-none z-30 font-sans flex flex-col justify-between p-4" id="overlay-root">
      
      {/* LEFT COLUMN: Controls & Generation config */}
      <div 
        id="left-controls-col"
        className={`flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto pointer-events-auto select-none no-scrollbar transition-all duration-300 ${
          activeTab === 'work' ? 'w-[720px] md:w-[840px]' : 'w-85'
        }`}
      >
        
        {/* World Status & Clock widget */}
        <div id="clock-widget" className={`p-4 rounded-2xl border backdrop-blur-md shadow-lg transition-colors duration-500 flex flex-col gap-3 ${
          isNight 
            ? 'bg-slate-950/80 border-slate-800 text-slate-100 shadow-teal-950/10' 
            : 'bg-white/80 border-slate-200 text-slate-800 shadow-slate-900/5'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${isNight ? 'bg-amber-500/15 text-yellow-300' : 'bg-amber-500/10 text-amber-500'}`}>
                {isNight ? <Moon size={16} /> : <Sun size={16} />}
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-widest font-mono text-slate-500 font-bold block leading-3">Solar Cycle</span>
                <span className="text-lg font-mono font-bold leading-5">{formattedTime}</span>
              </div>
            </div>

            {/* Simulated Speed badging */}
            <div className="flex bg-slate-200/45 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-250/20 gap-1 items-center">
              <button
                id="speed-paused"
                onClick={() => onChangeTimeSpeed('paused')}
                className={`px-2.5 py-0.75 text-[9.5px] font-mono font-bold uppercase rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  timeSpeed === 'paused' 
                    ? 'bg-rose-600 text-white shadow shadow-rose-950/20' 
                    : 'text-slate-500 dark:text-indigo-400 hover:bg-slate-300/30 dark:hover:bg-slate-800/50'
                }`}
                title="Pause Simulation"
              >
                <Pause size={9.5} className="fill-current shrink-0" />
                <span>PAUSE</span>
              </button>
              <button
                id="speed-normal"
                onClick={() => onChangeTimeSpeed('normal')}
                className={`px-2 py-0.5 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer ${timeSpeed === 'normal' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-300/30 dark:hover:bg-slate-800/50'}`}
                title="Normal Speed"
              >
                1x
              </button>
              <button
                id="speed-fast"
                onClick={() => onChangeTimeSpeed('fast')}
                className={`px-2 py-0.5 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer ${timeSpeed === 'fast' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-300/30 dark:hover:bg-slate-800/50'}`}
                title="Fast Forward"
              >
                2x
              </button>
              <button
                id="speed-super"
                onClick={() => onChangeTimeSpeed('super')}
                className={`px-2 py-0.5 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer ${timeSpeed === 'super' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-300/30 dark:hover:bg-slate-800/50'}`}
                title="Super Fast"
              >
                4x
              </button>
            </div>
          </div>

          {/* Scrubbing solar dial bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest leading-3">
              <span>Time of Day</span>
              <span>
                {timeOfDay < 0.25 ? 'Night' : timeOfDay < 0.35 ? 'Sunrise' : timeOfDay < 0.70 ? 'Midday' : timeOfDay < 0.8 ? 'Sunset' : 'Night'}
              </span>
            </div>
            <input
              id="solar-scrub-slider"
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={timeOfDay}
              onChange={(e) => {
                onChangeTimeOfDay(parseFloat(e.target.value));
                onChangeTimeSpeed('paused'); // Pause when scrubbing manually
              }}
              className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Game Mode Switcher and Care Package Pill */}
          <div className="flex flex-col gap-2 border-t border-slate-200/10 pt-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Settlement Game Mode
              </span>
              <div className="flex bg-slate-900/40 p-0.5 rounded-lg border border-slate-700/20">
                <button
                  type="button"
                  onClick={() => onToggleCreativeMode(false)}
                  className={`px-2 py-0.5 text-[9px] font-bold tracking-tight rounded cursor-pointer transition-all ${
                    !isCreativeMode
                      ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Survival
                </button>
                <button
                  type="button"
                  onClick={() => onToggleCreativeMode(true)}
                  className={`px-2 py-0.5 text-[9px] font-bold tracking-tight rounded cursor-pointer transition-all flex items-center gap-1 ${
                    isCreativeMode
                      ? 'bg-teal-600 text-white shadow-md font-extrabold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Sparkles size={8} /> Deity
                </button>
              </div>
            </div>

            {/* Print Pod / Care Package status (Only in Survival Mode) */}
            {!isCreativeMode && (
              <div className="flex items-center justify-between bg-indigo-950/20 border border-indigo-500/15 p-2 rounded-xl">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-mono leading-none text-slate-500 uppercase font-black">
                    DEITY PRINTING POD
                  </span>
                  <span className="text-[10px] text-slate-300">
                    {Math.floor(gameDays) >= nextCarePackageDay ? (
                      <span className="text-emerald-400 font-bold animate-pulse">📦 Care Package Ready!</span>
                    ) : (
                      <span>Cooldown (Day {Math.floor(gameDays)}/{nextCarePackageDay})</span>
                    )}
                  </span>
                </div>
                {Math.floor(gameDays) >= nextCarePackageDay ? (
                  <button
                    type="button"
                    onClick={onOpenCarePackage}
                    className="py-1 px-2 text-[9px] font-mono font-black animate-bounce bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg cursor-pointer transition-all"
                  >
                    Open Pod
                  </button>
                ) : (
                  <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, (1 - (nextCarePackageDay - gameDays) / 30) * 100))}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PERSISTENT COLONY STOCKPILE BANNER */}
        <div 
          id="colony-stockpile-card"
          className={`p-3 rounded-2xl border backdrop-blur-md shadow-md transition-all flex flex-col gap-1.5 shrink-0 ${
            isNight 
              ? 'bg-slate-950/80 border-slate-800 text-slate-100' 
              : 'bg-white/80 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex justify-between items-center border-b pb-1 border-slate-200/10 mb-0.5 pointer-events-auto">
            <span className="text-[9px] font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Colony Stockpile Reserves
            </span>
            <button
              onClick={() => setShowDetailedRes(!showDetailedRes)}
              className="text-[9px] font-mono uppercase bg-indigo-600/15 text-indigo-500 hover:bg-indigo-600/25 px-1.5 py-0.5 rounded cursor-pointer leading-none border border-indigo-600/20"
            >
              {showDetailedRes ? 'Compact' : 'Inventory Details ▾'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div 
              onClick={() => openThresholdEditor('wood', 'Wood')}
              className={`p-1.5 rounded-xl border flex flex-col items-center justify-center cursor-pointer hover:bg-amber-500/10 active:scale-95 transition-all pointer-events-auto ${
                isNight ? 'bg-slate-900/40 border-slate-850 hover:border-amber-500/40' : 'bg-slate-50 border-slate-100 hover:border-amber-500/40'
              }`}
              title="Click to set Auto-Gather Limit"
            >
              <span className="text-[14px] mb-0.5" title="Wood">🪵</span>
              <span className="text-[8px] font-mono text-slate-500 uppercase font-bold">Wood</span>
              <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-500">{mapData.stockpile.wood}</span>
              {((mapData.autoGatherThresholds || {})['wood'] ?? 0) > 0 && (
                <span className="text-[7px] font-mono text-amber-500 bg-amber-500/10 px-1 rounded [line-height:1] mt-0.5" title="Auto-gather when below this quantity">
                  Min: {(mapData.autoGatherThresholds || {})['wood']}
                </span>
              )}
            </div>
            <div 
              onClick={() => openThresholdEditor('stone', 'Stone')}
              className={`p-1.5 rounded-xl border flex flex-col items-center justify-center cursor-pointer hover:bg-slate-400/10 active:scale-95 transition-all pointer-events-auto ${
                isNight ? 'bg-slate-905/40 border-slate-850 hover:border-slate-400/40' : 'bg-slate-50 border-slate-100 hover:border-slate-400/40'
              }`}
              title="Click to set Auto-Gather Limit"
            >
              <span className="text-[14px] mb-0.5" title="Stone">🪨</span>
              <span className="text-[8px] font-mono text-slate-500 uppercase font-bold">Stone</span>
              <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-400">{mapData.stockpile.stone}</span>
              {((mapData.autoGatherThresholds || {})['stone'] ?? 0) > 0 && (
                <span className="text-[7px] font-mono text-slate-400 bg-slate-400/10 px-1 rounded [line-height:1] mt-0.5" title="Auto-gather when below this quantity">
                  Min: {(mapData.autoGatherThresholds || {})['stone']}
                </span>
              )}
            </div>
            <div 
              onClick={() => openThresholdEditor('food', 'Food')}
              className={`p-1.5 rounded-xl border flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-500/10 active:scale-95 transition-all pointer-events-auto ${
                isNight ? 'bg-slate-905/40 border-slate-850 hover:border-emerald-500/40' : 'bg-slate-50 border-slate-100 hover:border-emerald-500/40'
              }`}
              title="Click to set Auto-Gather Limit"
            >
              <span className="text-[14px] mb-0.5" title="Food">🍖</span>
              <span className="text-[8px] font-mono text-slate-500 uppercase font-bold">Food</span>
              <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-500">{mapData.stockpile.food}</span>
              {((mapData.autoGatherThresholds || {})['food'] ?? 0) > 0 && (
                <span className="text-[7px] font-mono text-emerald-500 bg-emerald-500/10 px-1 rounded [line-height:1] mt-0.5" title="Auto-gather when below this quantity">
                  Min: {(mapData.autoGatherThresholds || {})['food']}
                </span>
              )}
            </div>
          </div>

          {/* DETAILED EXPANDED DRAWER */}
          {showDetailedRes && (
            <div className="mt-1 border-t border-slate-200/10 pt-2 flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {/* Food Category Breakdowns */}
              <div>
                <span className="text-[8px] font-mono font-bold tracking-wider text-slate-500 uppercase">🌽 Satiating Foods (Spoilage)</span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="flex items-center gap-1">🍓 Berries: <strong className="font-sans text-slate-300">{(mapData.stockpile as any).berries ?? 0}</strong></span>
                    <div className="flex gap-1">
                      <span className="text-[8px] font-semibold text-slate-500">{(mapData.stockpile as any).berries > 0 ? `${Math.round((mapData.stockpile as any).berriesFresh)}%` : '-'}</span>
                      {(mapData.stockpile as any).berries > 0 && (
                        <div className="w-6 h-1 bg-slate-800 rounded-full overflow-hidden self-center">
                          <div
                            style={{ width: `${Math.round((mapData.stockpile as any).berriesFresh)}%` }}
                            className={`h-full ${
                              (mapData.stockpile as any).berriesFresh < 15 ? 'bg-red-500 animate-pulse' : (mapData.stockpile as any).berriesFresh < 40 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="flex items-center gap-1">🥕 Roots: <strong className="font-sans text-slate-300">{(mapData.stockpile as any).roots ?? 0}</strong></span>
                    <div className="flex gap-1">
                      <span className="text-[8px] font-semibold text-slate-500">{(mapData.stockpile as any).roots > 0 ? `${Math.round((mapData.stockpile as any).rootsFresh)}%` : '-'}</span>
                      {(mapData.stockpile as any).roots > 0 && (
                        <div className="w-6 h-1 bg-slate-800 rounded-full overflow-hidden self-center">
                          <div
                            style={{ width: `${Math.round((mapData.stockpile as any).rootsFresh)}%` }}
                            className={`h-full ${
                              (mapData.stockpile as any).rootsFresh < 15 ? 'bg-red-500 animate-pulse' : (mapData.stockpile as any).rootsFresh < 40 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="flex items-center gap-1">🍄 Shrooms: <strong className="font-sans text-slate-300">{(mapData.stockpile as any).mushrooms ?? 0}</strong></span>
                    <div className="flex gap-1">
                      <span className="text-[8px] font-semibold text-slate-500">{(mapData.stockpile as any).mushrooms > 0 ? `${Math.round((mapData.stockpile as any).mushroomsFresh)}%` : '-'}</span>
                      {(mapData.stockpile as any).mushrooms > 0 && (
                        <div className="w-6 h-1 bg-slate-800 rounded-full overflow-hidden self-center">
                          <div
                            style={{ width: `${Math.round((mapData.stockpile as any).mushroomsFresh)}%` }}
                            className={`h-full ${
                              (mapData.stockpile as any).mushroomsFresh < 15 ? 'bg-red-500 animate-pulse' : (mapData.stockpile as any).mushroomsFresh < 40 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="flex items-center gap-1">🍖 Meat: <strong className="font-sans text-slate-300">{(mapData.stockpile as any).meat ?? 0}</strong></span>
                    <div className="flex gap-1">
                      <span className="text-[8px] font-semibold text-slate-500">{(mapData.stockpile as any).meat > 0 ? `${Math.round((mapData.stockpile as any).meatFresh)}%` : '-'}</span>
                      {(mapData.stockpile as any).meat > 0 && (
                        <div className="w-6 h-1 bg-slate-800 rounded-full overflow-hidden self-center">
                          <div
                            style={{ width: `${Math.round((mapData.stockpile as any).meatFresh)}%` }}
                            className={`h-full ${
                              (mapData.stockpile as any).meatFresh < 15 ? 'bg-red-500 animate-pulse' : (mapData.stockpile as any).meatFresh < 40 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Water & Material Categories */}
              <div>
                <span className="text-[8px] font-mono font-bold tracking-wider text-slate-500 uppercase">💧 Hydrating Water & Fiber Fabrics</span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1 text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span>🌾 Sedge Fiber:</span>
                    <strong className="text-slate-300 font-sans">{(mapData.stockpile as any).fiber ?? 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>🦴 Scav Bone:</span>
                    <strong className="text-slate-300 font-sans font-bold">{(mapData.stockpile as any).bone ?? 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>💧 Scent Dew:</span>
                    <strong className="text-slate-300 font-sans">{(mapData.stockpile as any).dew ?? 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>🌊 Reservoir:</span>
                    <strong className="text-slate-300 font-sans font-bold">{(mapData.stockpile as any).reservoirWater ?? 0}</strong>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span>⛈️ Trapped Rainwater:</span>
                    <strong className="text-slate-300 font-sans">{(mapData.stockpile as any).rainwater ?? 0}</strong>
                  </div>
                </div>
              </div>

              {/* Rare Relics and Ancient Materials with gold glowing alerts */}
              {(((mapData.stockpile as any).relics > 0) || ((mapData.stockpile as any).ancientMaterials > 0)) && (
                <div className="bg-amber-950/25 border border-amber-600/10 rounded-lg p-1.5 mt-0.5">
                  <span className="text-[8px] font-mono font-bold tracking-wider text-amber-500 uppercase flex items-center gap-1">
                    <Sparkles size={8} className="animate-pulse" /> Outlander Relic Treasures
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-1 text-[10px] font-mono">
                    <div className="flex justify-between text-amber-300/95">
                      <span>🏺 Sacred Relics:</span>
                      <strong className="font-sans">{(mapData.stockpile as any).relics ?? 0}</strong>
                    </div>
                    <div className="flex justify-between text-amber-300/95">
                      <span>⚙️ Ancient Alloy:</span>
                      <strong className="font-sans">{(mapData.stockpile as any).ancientMaterials ?? 0}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* QUADRUPLE COLUMN TAB BUTTONS */}
        <div className="grid grid-cols-4 p-1 bg-slate-900/10 dark:bg-slate-900/60 rounded-2xl border border-slate-200/10 backdrop-blur-sm self-stretch shrink-0 gap-0.5">
          <button
            id="tab-roster-btn"
            onClick={() => setActiveTab('tribe')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[9px] font-bold tracking-tight rounded-xl transition-all cursor-pointer ${
              activeTab === 'tribe'
                ? 'bg-indigo-600 text-white shadow font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Users size={11} />
            <span className="font-sans leading-none text-[8px] sm:text-[9px]">Roster</span>
          </button>
          
          <button
            id="tab-work-btn"
            onClick={() => setActiveTab('work')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[9px] font-bold tracking-tight rounded-xl transition-all cursor-pointer ${
              activeTab === 'work'
                ? 'bg-indigo-600 text-white shadow font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Briefcase size={11} />
            <span className="font-sans leading-none text-[8px] sm:text-[9px]">Work</span>
          </button>


          <button
            id="tab-inventory-btn"
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[9px] font-bold tracking-tight rounded-xl transition-all cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-indigo-600 text-white shadow font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Warehouse size={11} />
            <span className="font-sans leading-none text-[8px] sm:text-[9px]">Depot</span>
          </button>

          <button
            id="tab-lore-btn"
            onClick={() => setActiveTab('lore')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[9px] font-bold tracking-tight rounded-xl transition-all cursor-pointer ${
              activeTab === 'lore'
                ? 'bg-indigo-600 text-white shadow font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen size={11} />
            <span className="font-sans leading-none text-[8px] sm:text-[9px]">Codex</span>
          </button>
        </div>

        {/* --- TAB CONTENT: TRIBAL ROSTER DIRECTORY --- */}
        {activeTab === 'tribe' && (
          <div 
            id="tribe-roster-dashboard"
            className={`p-4 rounded-2xl border backdrop-blur-md shadow-lg transition-all duration-500 flex flex-col gap-3.5 max-h-[68vh] overflow-y-auto no-scrollbar ${
              isNight 
                ? 'bg-slate-950/80 border-slate-800 text-slate-100 shadow-teal-950/10' 
                : 'bg-white/80 border-slate-200 text-slate-800 shadow-slate-900/5'
            }`}
          >
            {/* Demographic Indicators */}
            <div className="grid grid-cols-3 gap-1.5" id="demographic-pills">
              <div className={`p-2 rounded-xl text-center border ${isNight ? 'bg-slate-900/30 border-slate-850' : 'bg-slate-50 border-slate-100'}`}>
                <span className="text-[8px] font-mono font-bold text-slate-500 uppercase block">Active Size</span>
                <span className="text-sm font-extrabold text-indigo-500 font-mono tracking-tight">{totalPop} <span className="text-[10px] text-slate-500 font-normal">pop</span></span>
              </div>
              <div className={`p-2 rounded-xl text-center border ${isNight ? 'bg-slate-900/30 border-slate-850' : 'bg-slate-50 border-slate-100'}`}>
                <span className="text-[8px] font-mono font-bold text-slate-500 uppercase block">Avg Morale</span>
                <span className={`text-sm font-extrabold font-mono tracking-tight ${avgMorale < 40 ? 'text-rose-500' : avgMorale < 70 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {avgMorale}%
                </span>
              </div>
              <div className={`p-2 rounded-xl text-center border ${isNight ? 'bg-slate-900/30 border-slate-850' : 'bg-slate-50 border-slate-100'}`}>
                <span className="text-[8px] font-mono font-bold text-slate-500 uppercase block">Avg Health</span>
                <span className="text-sm font-extrabold text-rose-500 font-mono tracking-tight">{avgHealth}%</span>
              </div>
            </div>

            {/* Spawn / Add Villagers & Disasters Panels (CREATIVE MODE ONLY) */}
            {isCreativeMode && (
              <>
                {/* Spawn / Add Villagers Panel */}
                <div className={`p-2.5 rounded-xl border border-dashed ${isNight ? 'border-slate-800' : 'border-slate-300'}`}>
                  <div className="flex items-center gap-1 mb-1.5">
                    <UserPlus size={11} className="text-emerald-500" />
                    <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-slate-500">Muster Tribesmen</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      id="spawn-one-btn"
                      onClick={() => onSpawnTribe(1)}
                      className="py-1 px-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold tracking-tight cursor-pointer shadow active:scale-95 transition-all text-center"
                    >
                      +1 Wanderer
                    </button>
                    <button
                      id="spawn-ten-btn"
                      onClick={() => onSpawnTribe(10)}
                      className="py-1 px-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold tracking-tight cursor-pointer shadow active:scale-95 transition-all text-center"
                    >
                      +10 Cohort
                    </button>
                    <button
                      id="spawn-hundred-btn"
                      onClick={() => onSpawnTribe(100)}
                      className="py-1 px-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold tracking-tight cursor-pointer shadow active:scale-95 transition-all text-center"
                    >
                      +100 Clan
                    </button>
                  </div>
                </div>

                {/* Sandbox Disaster triggers */}
                <div className={`p-2 rounded-xl border ${isNight ? 'bg-slate-900/20 border-slate-850' : 'bg-slate-50/50 border-slate-150'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <Flame size={11} className="text-amber-500 animate-pulse" />
                      <span className="text-[9px] font-mono font-bold uppercase text-slate-500 tracking-wider">God-Mode Disasters</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-center">
                    <button
                      id="disaster-famine-btn"
                      onClick={() => onTriggerDisaster('drought')}
                      className="py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 font-mono text-[9px] font-bold border border-red-500/15 cursor-pointer active:scale-95 transition-all"
                    >
                      🌾 Famine Drought
                    </button>
                    <button
                      id="disaster-feast-btn"
                      onClick={() => onTriggerDisaster('feast')}
                      className="py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-mono text-[9px] font-bold border border-emerald-500/15 cursor-pointer active:scale-95 transition-all"
                    >
                      🍖 Bounteous Feast
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Search Filter input elements */}
            <div className="flex flex-col gap-1.5" id="roster-search-filters">
              {/* Search text */}
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="villager-search-box"
                  type="text"
                  placeholder="Search tribesmen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full text-[11px] pl-6.5 pr-2.5 py-1 rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isNight ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                />
              </div>

              {/* Advanced select items */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] font-mono text-slate-500 uppercase font-bold tracking-widest pl-1">Role Type</label>
                  <select
                    id="roster-role-selector"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className={`w-full font-mono text-[10px] p-1 rounded border outline-none ${
                      isNight ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <option value="all">Unfiltered</option>
                    <option value="Gatherer">Gatherers</option>
                    <option value="Hunter">Hunters</option>
                    <option value="Farmer">Farmers</option>
                    <option value="Builder">Builders</option>
                    <option value="Scout">Scouts</option>
                    <option value="Healer">Healers</option>
                    <option value="Artisan">Artisans</option>
                  </select>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] font-mono text-slate-500 uppercase font-bold tracking-widest pl-1">Mortality</label>
                  <select
                    id="roster-life-selector"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className={`w-full font-mono text-[10px] p-1 rounded border outline-none ${
                       isNight ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <option value="alive">Living Only</option>
                    <option value="deceased">Deceased Only</option>
                    <option value="all">Full Record</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Roster list representation */}
            <div className="flex flex-col gap-1.5" id="villager-scrolling-container">
              <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest pl-1 pb-1 border-b border-slate-200/5 block">
                Roster Catalogue ({filteredRoster.length} matches)
              </span>
              <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1 no-scrollbar text-xs">
                {filteredRoster.length > 0 ? (
                  filteredRoster.map((person) => {
                    const isInspected = selectedTribesperson?.id === person.id;
                    return (
                      <button
                        key={person.id}
                        id={`roster-item-${person.id}`}
                        onClick={() => {
                          onSelectTribesperson(person);
                          onFocusCoordinates(person.x, person.z);
                        }}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2.5 cursor-pointer transition-all active:scale-98 ${
                          isInspected
                            ? 'bg-indigo-600/15 border-indigo-500 text-slate-100 shadow'
                            : isNight
                              ? 'bg-slate-900/30 border-slate-850 text-slate-300 hover:bg-slate-900/60'
                              : 'bg-slate-50 border-slate-150 text-slate-700 hover:bg-slate-100/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {/* Colored role dot */}
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0 block border border-black/10"
                            style={{ backgroundColor: ROLE_COLORS[person.role] || '#fff' }}
                            title={person.role}
                          />
                          <div className="truncate">
                            <span className={`font-semibold  block truncate leading-4 ${isInspected ? 'text-indigo-400' : ''}`}>
                              {person.name}
                            </span>
                            <span className="text-[10px] text-slate-500 block leading-3 truncate">
                              {person.isAlive ? (
                                person.role === 'Artisan' ? (
                                  `${(person.skills.Artisan?.level ?? 1) >= 9 ? 'Relic Engineer ⚙️' : (person.skills.Artisan?.level ?? 1) >= 5 ? 'Veteran Artisan 🛠️' : 'Apprentice Artisan'} (Lvl ${person.skills.Artisan?.level ?? 1}) • Age ${person.ageYears}`
                                ) : (
                                  `${person.role} • Age ${person.ageYears}`
                                )
                              ) : `Deceased • Age ${person.ageYears}`}
                            </span>
                          </div>
                        </div>

                        {/* Visual indicator bar warns of low survival checks */}
                        {person.isAlive ? (
                          <div className="flex flex-col gap-0.5 items-end justify-center shrink-0">
                            <div className="flex gap-0.5 items-center">
                              <Heart size={10} className="text-rose-500" />
                              <span className="font-mono text-[9px] font-bold">{Math.round(person.stats.health)}</span>
                            </div>
                            <div className="w-8 h-1 rounded bg-slate-300 dark:bg-slate-800 overflow-hidden">
                              <div 
                                className="h-full bg-rose-500 rounded-full"
                                style={{ width: `${person.stats.health}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <Skull size={12} className="text-slate-500 shrink-0" />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-[11px] italic text-slate-400 text-center py-4">No matching clansmen found.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'work' && (
          <div 
            id="work-priorities-dashboard"
            className={`p-4 rounded-2xl border backdrop-blur-md shadow-lg transition-all duration-500 flex flex-col gap-3.5 max-h-[68vh] overflow-y-auto no-scrollbar ${
              isNight 
                ? 'bg-slate-950/80 border-slate-800 text-slate-100 shadow-teal-950/10' 
                : 'bg-white/80 border-slate-200 text-slate-800 shadow-slate-900/5'
            }`}
          >
            <div className="flex flex-col gap-1 border-b pb-2 border-slate-200/10">
              <div className="flex items-center gap-2">
                <Briefcase size={15} className="text-indigo-500 shrink-0" />
                <h4 className="font-semibold text-sm tracking-tight">Work Priorities Grid</h4>
              </div>
              <p className="text-[9px] text-slate-450 dark:text-slate-400 font-medium">
                Click cells to cycle: <span className="text-amber-500 font-semibold">1 (High)</span> ➔ <span className="text-emerald-500 font-semibold">2</span> ➔ <span className="text-sky-500 font-semibold">3</span> ➔ <span className="text-slate-400 font-semibold">4</span> ➔ <span className="text-slate-500">❌ (Off)</span>. Workers execute lowest-numbered jobs first.
              </p>
            </div>

            {totalPop === 0 ? (
              <p className="text-xs italic text-slate-400 text-center py-4">No living tribe members available to schedule.</p>
            ) : (
              <div className="overflow-x-auto w-full pb-1 border border-slate-200/10 rounded-xl bg-slate-900/5 dark:bg-slate-950/20">
                <table className="w-full text-xs text-left border-collapse min-w-[680px] md:min-w-[780px]">
                  <thead>
                    <tr className="border-b border-slate-200/10 text-slate-450 font-mono text-[9px] uppercase tracking-wider bg-slate-550/5">
                      <th className="py-3 px-4 font-bold text-slate-400 w-36">Member</th>
                      {(['Gather', 'Hunt', 'Build', 'Farm', 'Scout', 'Haul', 'Repair', 'Sleep', 'Eat', 'Drink'] as JobCategory[]).map((job) => (
                        <th key={job} className="py-2.5 text-center font-bold px-0.5 min-w-[50px] md:min-w-[60px] leading-tight uppercase text-[9px]">
                          {job}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aliveMembers.map((person) => (
                      <tr 
                        key={person.id} 
                        className="border-b border-slate-200/5 hover:bg-slate-500/10 transition-colors"
                      >
                        {/* Member Identity cell */}
                        <td className="py-2.5 px-4 font-medium flex items-center gap-2.5 whitespace-nowrap">
                          <span 
                            className="w-3 h-3 rounded-full ring-2 ring-white/10 shrink-0 block" 
                            style={{ backgroundColor: person.color }} 
                          />
                          <button
                            onClick={() => onFocusCoordinates(person.x, person.z)}
                            className="hover:underline hover:text-indigo-500 font-bold text-left cursor-pointer truncate max-w-[150px] text-xs"
                          >
                            {person.name}
                          </button>
                        </td>

                        {/* Priorities cells */}
                        {(['Gather', 'Hunt', 'Build', 'Farm', 'Scout', 'Haul', 'Repair', 'Sleep', 'Eat', 'Drink'] as JobCategory[]).map((job) => {
                          const val = person.priorities?.[job] ?? 0;
                          
                          // Style based on priority level
                          let colorClasses = '';
                          if (val === 1) colorClasses = 'bg-amber-500/90 text-slate-950 border-amber-600 font-bold shadow-sm shadow-amber-500/10';
                          else if (val === 2) colorClasses = 'bg-emerald-500/90 text-white border-emerald-600 font-extrabold';
                          else if (val === 3) colorClasses = 'bg-sky-500/90 text-white border-sky-600 font-bold';
                          else if (val === 4) colorClasses = 'bg-slate-400 dark:bg-slate-700 text-white border-slate-450 dark:border-slate-600';
                          else colorClasses = 'bg-slate-100/10 text-slate-500 border-dashed border-slate-200/15 filter saturate-50 hover:bg-slate-500/10';

                          return (
                            <td key={job} className="py-1 text-center px-0.5">
                              <button
                                onClick={() => {
                                  // cycle value: 1 -> 2 -> 3 -> 4 -> 0 -> 1 ...
                                  const nextPriority = (val === 0 ? 1 : val === 4 ? 0 : val + 1) as JobPriority;
                                  onChangePriorities(person.id, job, nextPriority);
                                }}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center border text-[11px] transition-all duration-150 cursor-pointer mx-auto ${colorClasses}`}
                                title={`${job}: Row value is ${val === 0 ? 'Disabled' : 'Priority ' + val}`}
                              >
                                {val === 0 ? '-' : val}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}


        {activeTab === 'inventory' && (
          <InventoryTab
            mapData={mapData}
            tribe={tribe}
            isNight={isNight}
            onOrganizeWarehouse={onOrganizeWarehouse}
            onTransferToCaravan={onTransferToCaravan}
            onTransferToVillage={onTransferToVillage}
            onMigrateRegion={onMigrateRegion}
          />
        )}

        {activeTab === 'lore' && (
          <div 
            id="lore-codex-tab"
            className={`p-4 rounded-2xl border backdrop-blur-md shadow-lg transition-all duration-500 flex flex-col gap-3.5 max-h-[68vh] overflow-y-auto no-scrollbar ${
              isNight 
                ? 'bg-slate-950/85 border-slate-800 text-slate-150' 
                : 'bg-white/90 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex justify-between items-center border-b pb-2 border-slate-200/10">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-mono text-indigo-400 font-bold block leading-3">Island Archives</span>
                <h3 className="text-sm font-extrabold flex items-center gap-1.5 leading-none">
                  📖 Lore Codex Logbook
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-550/15 text-indigo-400 font-extrabold">
                🏺 {mapData.activeLoreLogs?.length ?? 0} / 6 Found
              </span>
            </div>

            {(!mapData.activeLoreLogs || mapData.activeLoreLogs.length === 0) ? (
              <div className="py-8 px-4 border border-dashed border-slate-700/30 rounded-xl text-center flex flex-col items-center gap-2">
                <Compass size={24} className="text-indigo-400 animate-pulse" />
                <span className="text-[11px] font-bold text-slate-300">Uncharted Terrain Awaiting</span>
                <p className="text-[10.5px] leading-relaxed text-slate-400 max-w-[220px]">
                  Send your people across the fog of war. Deep forests, desert wastes, and rocky crags hide monolithic structures that contain lost precursor tech!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {mapData.activeLoreLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-3 rounded-xl border border-indigo-900/40 bg-indigo-950/20 flex flex-col gap-1.5 animate-fade-in text-left"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-extrabold text-[#cfad8c]">
                        ⭐ {log.landmarkName}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-indigo-400">
                        Day {log.discoveredDay}
                      </span>
                    </div>
                    <p className="text-[10.5px] leading-relaxed text-slate-300 italic font-serif bg-slate-950/30 p-2 rounded-lg border border-slate-900/40">
                      "{log.text}"
                    </p>
                    <div className="text-[9px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                      <span>✔️ Decoded & Documented</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ancestral Sagas Section */}
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-200/10 text-left">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-500 flex items-center gap-1.5">
                🧬 Ancestry Chronicle Logs ({mapData.tribeCodexLogs?.length ?? 0})
              </span>
              {(!mapData.tribeCodexLogs || mapData.tribeCodexLogs.length === 0) ? (
                <span className="text-[10px] text-slate-500 italic block">No historical dynastic moments recorded yet. They occur during births, maturation, training, and passing.</span>
              ) : (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto no-scrollbar pr-0.5" id="tribe-chronicles-scroller">
                  {[...mapData.tribeCodexLogs].reverse().map((ev) => {
                    let evEmoji = '📜';
                    let evColor = 'border-amber-500/10 hover:border-amber-500/20 bg-amber-500/5 text-amber-100';
                    if (ev.type === 'birth') {
                      evEmoji = '🍼';
                      evColor = 'border-rose-500/10 hover:border-rose-500/20 bg-rose-500/5 text-rose-100';
                    } else if (ev.type === 'marriage') {
                      evEmoji = '❤️';
                      evColor = 'border-pink-500/10 hover:border-pink-500/20 bg-pink-500/5 text-pink-100';
                    } else if (ev.type === 'death') {
                      evEmoji = '🕯️';
                      evColor = 'border-red-500/15 hover:border-red-500/35 bg-red-500/5 text-red-100';
                    } else if (ev.type === 'mastery') {
                      evEmoji = '✨';
                      evColor = 'border-yellow-500/10 hover:border-yellow-500/30 bg-yellow-500/5 text-yellow-105';
                    } else if (ev.type === 'apprenticeship') {
                      evEmoji = '🎓';
                      evColor = 'border-cyan-500/10 hover:border-cyan-500/20 bg-cyan-900/5 text-cyan-100';
                    }

                    return (
                      <div key={ev.id} className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 text-[10px] leading-relaxed transition-all ${evColor}`}>
                        <div className="flex justify-between items-center text-[9px] font-mono font-bold text-slate-400">
                          <span className="flex items-center gap-1">
                            <span>{evEmoji}</span>
                            <span>{ev.title}</span>
                          </span>
                          <span>Day {ev.day}</span>
                        </div>
                        <p className="text-[9.5px] opacity-90 leading-normal">{ev.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CLAN EVENT LOG FEED TICKER CONTAINER (Always visible at the bottom of sidebar) */}
      </div>

      {/* CENTERING WRAPPER FOR CHRONOS LOG (Relocated to Middle/Bottom with Hover Opacity + Stretch Upward + Scrollable) */}
      <div 
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none"
        style={{ width: '450px', maxWidth: '90vw' }}
      >
        <div 
          id="tribal-log-widget-centered"
          onMouseEnter={() => setIsLogHovered(true)}
          onMouseLeave={() => setIsLogHovered(false)}
          className={`p-3.5 rounded-2xl border backdrop-blur-md shadow-xl flex flex-col gap-2 transition-all duration-300 ${
            isLogHovered ? 'scale-102 opacity-100' : 'scale-100 opacity-25'
          } ${
            isNight 
              ? 'bg-slate-950/85 border-slate-800 text-slate-100' 
              : 'bg-white/85 border-slate-200 text-slate-800'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-1.5 border-slate-200/10">
            <div className="flex items-center gap-1.5">
              <MessageSquare size={13} className="text-amber-500" />
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest leading-3">Chronos Tribal Dispatch Log</span>
            </div>
            {isLogHovered && (
              <span className="text-[8px] font-mono text-slate-450 uppercase animate-pulse">
                Scroll history ↕️
              </span>
            )}
          </div>

          {/* Messages list */}
          <div 
            className={`flex flex-col gap-1.5 pr-1 text-[10.5px] leading-relaxed overflow-y-auto transition-all duration-300 no-scrollbar ${
              isLogHovered ? 'max-h-36' : 'max-h-5'
            }`}
            id="logs-scroller-centered"
          >
            {logs.slice(0, isLogHovered ? 40 : 5).map((log) => {
              let badgeColor = 'text-indigo-400 dark:text-indigo-300';
              if (log.type === 'death') badgeColor = 'text-rose-500 font-extrabold';
              if (log.type === 'warning') badgeColor = 'text-amber-500 font-semibold';
              if (log.type === 'level') badgeColor = 'text-emerald-400 font-extrabold';

              return (
                <div key={log.id} className="flex items-start gap-1 font-mono text-left">
                  <span className="text-[8px] font-mono text-slate-500 shrink-0 select-none">[{log.timeText}]</span>
                  <span className={`${badgeColor} leading-3.5`}>
                    {log.text}
                  </span>
                </div>
              );
            })}
            {logs.length === 0 && (
              <span className="text-slate-500 italic text-[10px] text-center block">No messages.</span>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Navigation Instruction / Help legends */}
      <div className="flex flex-col md:flex-row md:items-end justify-between w-full pointer-events-none mt-auto gap-4" id="bottom-bar">
        {/* Help panel removed in favor of 15-second timed intro screen modal */}
        <div />

        {/* Dynamic Seed Info stamp on bottom right of overlay */}
        <div className={`p-2.5 rounded-xl border font-mono text-[10px] tracking-wide pointer-events-auto transition-colors align-bottom hidden md:flex items-center gap-1.5 ${
          isNight 
            ? 'bg-slate-950/40 border-slate-800/80 text-emerald-400' 
            : 'bg-white/40 border-slate-200/80 text-indigo-600'
        }`} id="seed-stamp">
          <MapPin size={10} />
          <span>GEO::GRID [{config.size}x{config.size}] // SEED {config.seed}</span>
        </div>
      </div>

      {/* 15-SECOND FLOATING INTRODUCTORY CAMERA TUTORIAL SCREEN */}
      {introSeconds > 0 && (
        <div 
          id="intro-overlay"
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[150] transition-opacity duration-1000 ease-in-out pointer-events-auto animate-fade-in"
        >
          <div 
            id="intro-card"
            className="p-8 max-w-sm w-full bg-slate-900 border border-slate-800 text-slate-150 rounded-3xl shadow-2xl relative flex flex-col gap-6 text-center mx-4"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <Compass size={24} className="text-emerald-400 rotate-12" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white">Tribal Pioneers</h2>
                <p className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-bold">RTS God-Game Camera Guide</p>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-b border-white/5 py-4 text-left" id="intro-rules-list">
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-semibold text-slate-400">Pan Focus View</span>
                <kbd className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 font-mono text-[9px] text-[#cfad8c]">W, A, S, D Keys</kbd>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-semibold text-slate-400">Alternative Pan</span>
                <kbd className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 font-mono text-[9px] text-[#cfad8c]">Left Click & Drag</kbd>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-semibold text-slate-400">Orbit & Rotate Angle</span>
                <kbd className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 font-mono text-[9px] text-[#cfad8c]">Right Click & Drag</kbd>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-semibold text-slate-400">Zoom In & Out</span>
                <kbd className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 font-mono text-[9px] text-[#cfad8c]">Mouse Scroll Wheel</kbd>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-semibold text-slate-400">Select Settler / Tile</span>
                <kbd className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 font-mono text-[9px] text-[#cfad8c]">Left Click Selection</kbd>
              </div>
            </div>

            <div className="flex flex-col gap-2 bg-slate-950/20 p-2 rounded-xl">
              <button
                onClick={() => setIntroSeconds(0)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-mono font-bold tracking-widest uppercase transition-all shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
              >
                Let's Play
              </button>
              <div className="text-[9px] font-mono text-slate-400 uppercase tracking-widest leading-none mt-1 animate-pulse">
                Auto-dismissing in {introSeconds}s...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Gather Threshold Config Mini Window */}
      {editingThresholdKey && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 pointer-events-auto">
          <div className="bg-slate-900 border border-slate-750 p-5 rounded-2xl w-full max-w-xs shadow-2xl text-slate-100 relative">
            <h4 className="text-sm font-semibold tracking-wide text-amber-400 mb-1 flex items-center gap-2">
              ⚙️ Auto-Gather Limit: {editingThresholdLabel}
            </h4>
            <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
              Define the stock quantity below which villagers will automatically seek out and gather {editingThresholdLabel}. Max limit: 9999. Set to 0 to disable.
            </p>
            <div className="flex gap-2 items-center mb-4">
              <input
                type="number"
                min="0"
                max="9999"
                value={localThresholdInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setLocalThresholdInput(val);
                }}
                placeholder="0 (disabled)"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 w-full focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-center"
                autoFocus
                id="auto-gather-threshold-input"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditingThresholdKey(null)}
                className="px-2.5 py-1 text-[10px] bg-slate-850 hover:bg-slate-800 text-slate-350 rounded-md cursor-pointer transition-colors font-semibold border border-slate-800"
                id="cancel-gather-thresh"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  let num = parseInt(localThresholdInput, 10);
                  if (isNaN(num)) num = 0;
                  if (num > 9999) num = 9999;
                  if (num < 0) num = 0;
                  onChangeAutoGatherThreshold?.(editingThresholdKey, num);
                  setEditingThresholdKey(null);
                }}
                className="px-3 py-1 text-[10px] bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md cursor-pointer font-bold transition-colors shadow-sm"
                id="save-gather-thresh"
              >
                Apply Limit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
