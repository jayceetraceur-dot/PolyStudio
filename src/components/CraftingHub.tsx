import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Hammer, 
  BookOpen, 
  Zap, 
  Sparkles, 
  AlertCircle, 
  Package, 
  ShieldAlert, 
  Flame, 
  Wrench, 
  Shield, 
  Home, 
  Gem, 
  X, 
  ArrowRight,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { MapData, RECIPE_DATABASE, Recipe, CraftingJob } from '../types';

interface CraftingHubProps {
  mapData: MapData;
  isNight: boolean;
  onStartCraft?: (recipeId: string) => void;
  onCancelCraft?: (jobId: string) => void;
  onResearch?: (recipeId: string) => void;
  onStudyRelic?: () => void;
  artisanCount: number;
  isCreativeMode?: boolean;
  onClose?: () => void;
}

// Map recipe IDs to their new functional categories as requested: Tools, Weapons, Structure, Luxury
const FUNCTIONAL_CATEGORIES: Record<string, 'Tools' | 'Weapons' | 'Structure' | 'Luxury'> = {
  stoneAxe: 'Tools',
  flintPickaxe: 'Tools',
  steelPickaxe: 'Tools',
  grassBasket: 'Tools',
  reinforcedExplorerPack: 'Tools',
  surveyorsLens: 'Tools',
  expeditionLantern: 'Tools',

  spear: 'Weapons',
  bow: 'Weapons',
  paddedJerkin: 'Weapons', // Windbone Vest (Defensive Gear)

  ruinDiverHarness: 'Structure', // Explorer safety, building protective gear
  eldritchWard: 'Structure', // Stormward Talisman (Blocks decay/contamination inside warehouses)
  sealedExpeditionSuit: 'Structure', // High-tier environmental protection suit

  boiledRoots: 'Luxury', // prepared warm root mash delicacy
  saltedMeat: 'Luxury', // salt-cured jerky delicacy
  amuletLife: 'Luxury', // Resurrection amulet
  thuleciteCore: 'Luxury', // Atmospheric Anchor Core
};

// Nice icons and color presets for each category
const CATEGORY_METADATA = {
  Tools: {
    icon: <Wrench size={14} className="text-emerald-400" />,
    emoji: '⛏️',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/25',
    bgColor: 'bg-emerald-500/10',
    accentColor: 'from-emerald-500 to-teal-500',
    desc: 'Utility implements to accelerate woodcutting, mining, and resource transport capacity.'
  },
  Weapons: {
    icon: <Shield size={14} className="text-rose-400" />,
    emoji: '⚔️',
    color: 'text-rose-400',
    borderColor: 'border-rose-500/25',
    bgColor: 'bg-rose-500/10',
    accentColor: 'from-rose-500 to-amber-500',
    desc: 'Hunting bows, spears, and light protection gear to repel predators and raiders.'
  },
  Structure: {
    icon: <Home size={14} className="text-sky-400" />,
    emoji: '🏰',
    color: 'text-sky-400',
    borderColor: 'border-sky-500/25',
    bgColor: 'bg-sky-500/10',
    accentColor: 'from-sky-500 to-indigo-500',
    desc: 'Static talismans and exploration structures to protect stockpiles and navigate radioactive ruins.'
  },
  Luxury: {
    icon: <Gem size={14} className="text-amber-400" />,
    emoji: '💎',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/25',
    bgColor: 'bg-amber-500/10',
    accentColor: 'from-amber-500 to-yellow-400',
    desc: 'Special delicacies, resurrection amulets, and ancient cores that boost village-wide morale.'
  },
};

export default function CraftingHub({
  mapData,
  isNight,
  onStartCraft,
  onCancelCraft,
  onResearch,
  onStudyRelic,
  artisanCount,
  isCreativeMode = false,
  onClose,
}: CraftingHubProps) {
  const [selectedCategory, setSelectedCategory] = useState<'Tools' | 'Weapons' | 'Structure' | 'Luxury'>('Tools');

  const categories = ['Tools', 'Weapons', 'Structure', 'Luxury'] as const;

  // Find constructed workstations on the map
  const getBuiltWorkstations = (): Record<string, number> => {
    const counts: Record<string, number> = {
      'None': 99,
      'ScienceMachine': 0,
      'StorageBin': 0,
      'WaterWell': 0,
      'Shelter': 0
    };
    for (let r = 0; r < mapData.grid.length; r++) {
      if (!mapData.grid[r]) continue;
      for (let c = 0; c < mapData.grid[r].length; c++) {
         const struct = mapData.grid[r][c]?.structure;
         if (struct) {
           counts[struct.type] = (counts[struct.type] || 0) + 1;
         }
      }
    }
    return counts;
  };

  const workstations = getBuiltWorkstations();

  // Helper to resolve recipe category cleanly
  const getRecipeCategory = (id: string): 'Tools' | 'Weapons' | 'Structure' | 'Luxury' => {
    return FUNCTIONAL_CATEGORIES[id] || 'Tools';
  };

  // Filter recipes by category
  const filteredRecipes = Object.entries(RECIPE_DATABASE).map(
    ([id, r]) => [id, r as Recipe] as const
  ).filter(
    ([id]) => getRecipeCategory(id) === selectedCategory
  );

  const activeMetadata = CATEGORY_METADATA[selectedCategory];

  return (
    <div
      id="crafting-hub-panel"
      className={`rounded-2xl border backdrop-blur-md transition-all duration-500 flex flex-col gap-5 ${
        isNight
          ? 'bg-slate-950/45 border-slate-800 text-slate-100'
          : 'bg-slate-900/40 border-slate-800 text-slate-100'
      }`}
    >
      {/* HUB SUB-HEADER CONTROL CENTER */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch justify-between p-4 bg-slate-950/45 border-b border-slate-800/60 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 shrink-0">
            <BookOpen size={18} className="text-amber-500 animate-pulse" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-widest text-slate-100">
              Technology Catalog
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Available blueprints: {Object.keys(RECIPE_DATABASE).length} | Unlocked: {mapData.unlockedRecipes.length}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* RESEARCH COMPASS STAT */}
          <div className="flex items-center gap-1.5 bg-indigo-950/60 px-3 py-1.5 rounded-xl border border-indigo-500/20 font-mono">
            <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider">Research Compass:</span>
            <strong className="text-xs font-black text-indigo-200">{mapData.researchPoints.toFixed(1)} RP</strong>
          </div>

          {/* CLOSE AND GATHER BUTTON FOR ACCESSIBILITY */}
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-[10px] font-mono uppercase bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/50 transition-all cursor-pointer font-bold flex items-center gap-1"
              title="Close Bench to gather missing items"
              id="crafting-hub-close-top-btn"
            >
              <span>🚪 Close Bench</span>
            </button>
          )}
        </div>
      </div>

      {/* DUAL COLUMN MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 px-4 pb-4">
        
        {/* LEFT COLUMN: CATEGORIES & RECIPES LISTING (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* FUNCTIONAL TAB SELECTORS */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950/50 rounded-xl border border-slate-800/80 shrink-0">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const meta = CATEGORY_METADATA[cat];

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`py-2.5 px-2 text-[10px] font-mono leading-none tracking-tight font-extrabold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 border ${
                    isSelected
                      ? `${meta.color} ${meta.bgColor} ${meta.borderColor} shadow-lg scale-[1.02]`
                      : 'text-slate-500 hover:text-slate-200 border-transparent bg-transparent'
                  }`}
                >
                  <span className="text-base">{meta.emoji}</span>
                  <span className="text-[8.5px] uppercase tracking-wider text-center leading-tight whitespace-nowrap">{cat}</span>
                </button>
              );
            })}
          </div>

          {/* ACTIVE CATEGORY HERO CARD */}
          <div className={`p-3 rounded-xl border ${activeMetadata.borderColor} ${activeMetadata.bgColor} flex flex-col gap-1.5`}>
            <div className="flex items-center gap-1.5">
              {activeMetadata.icon}
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${activeMetadata.color}`}>
                Category: {selectedCategory}
              </span>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed font-sans">{activeMetadata.desc}</p>
          </div>

          {/* RECIPES LIST GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
            {filteredRecipes.map(([recipeId, recipe]) => {
              const isUnlocked = isCreativeMode || !recipe.researchCost || mapData.unlockedRecipes.includes(recipeId);
              const requiredWSInfo = recipe.workstation;
              const hasWorkstation = isCreativeMode || requiredWSInfo === 'None' || (workstations[requiredWSInfo] || 0) > 0;

              // Check materials available
              const materialsCheckList = Object.entries(recipe.materials).map(([mat, qty]) => {
                const currentStock = (mapData.stockpile as any)[mat] ?? 0;
                const sufficient = isCreativeMode || currentStock >= qty;
                return {
                  mat,
                  qty,
                  currentStock,
                  sufficient,
                };
              });

              const materialsSufficient = isCreativeMode || materialsCheckList.every((m) => m.sufficient);
              const canCraftNow = isUnlocked && materialsSufficient && hasWorkstation;
              const hasMissingMaterials = !materialsSufficient;

              return (
                <div
                  key={recipeId}
                  onClick={(e) => {
                    // Avoid double triggers if clicked on direct button
                    if ((e.target as HTMLElement).closest('button')) return;
                    if (isUnlocked) {
                      if (canCraftNow) {
                        onStartCraft?.(recipeId);
                      }
                    } else if (recipe.researchCost && mapData.researchPoints >= recipe.researchCost) {
                      onResearch?.(recipeId);
                    }
                  }}
                  className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all relative overflow-hidden group select-none ${
                    canCraftNow
                      ? 'bg-slate-900/80 border-slate-700/80 hover:border-indigo-500/80 hover:bg-slate-850 cursor-pointer shadow-md hover:shadow-indigo-500/15 active:scale-[0.99]'
                      : isUnlocked
                      ? 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 cursor-pointer'
                      : mapData.researchPoints >= (recipe.researchCost ?? 0)
                      ? 'bg-slate-950/85 border-purple-900/50 hover:border-purple-500/60 hover:bg-purple-950/30 cursor-pointer'
                      : 'bg-slate-950/85 border-slate-900/80 opacity-90'
                  }`}
                >
                  {/* TOP NAMEPLATE & TIER BADGE */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-100 flex items-center gap-1.5 group-hover:text-amber-300 transition-colors">
                        <span className="text-xs shrink-0">{activeMetadata.emoji}</span>
                        <span>{recipe.name}</span>
                        {!isUnlocked && (
                          <span className="text-[7px] font-mono text-purple-400 bg-purple-950/60 px-1 border border-purple-700/25 font-extrabold uppercase rounded">
                            LOCKED
                          </span>
                        )}
                      </h5>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[7px] font-mono px-1.5 py-0.2 rounded-full border ${
                          recipe.tier === 'Primitive' ? 'bg-indigo-950/40 border-indigo-500/20 text-indigo-300' :
                          recipe.tier === 'Tribal' ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-300' :
                          recipe.tier === 'Advanced' ? 'bg-amber-950/40 border-amber-500/20 text-amber-300' :
                          'bg-purple-950/40 border-purple-500/20 text-purple-300'
                        }`}>
                          {recipe.tier}
                        </span>
                        {canCraftNow && (
                          <span className="text-[7.5px] font-mono text-emerald-400 font-bold bg-emerald-950/50 px-1.5 rounded border border-emerald-500/30">
                            Ready to Craft
                          </span>
                        )}
                      </div>
                    </div>
                    {recipe.researchCost && !isUnlocked && (
                      <span className="text-[8.5px] font-mono text-purple-300 font-bold flex items-center gap-1 bg-purple-950/40 border border-purple-700/20 px-1.5 py-0.5 rounded shrink-0">
                        🔬 {recipe.researchCost} RP
                      </span>
                    )}
                  </div>

                  {/* DESCRIPTION */}
                  <p className="text-[9px] text-slate-400 leading-snug">{recipe.description}</p>

                  {/* WORKSTATION REQUIREMENT */}
                  {requiredWSInfo !== 'None' && (
                    <div className="flex items-center gap-1 font-mono text-[8px] leading-3 border-t border-slate-800/40 pt-1.5">
                      <span className="text-slate-500">WORKSTATION:</span>
                      <span className={hasWorkstation ? 'text-emerald-400 font-bold' : 'text-rose-400 flex items-center gap-1'}>
                        {requiredWSInfo === 'ScienceMachine' ? '🔬 Science Machine' : `🛠️ ${requiredWSInfo}`}
                        {!hasWorkstation && <AlertCircle size={8} />}
                      </span>
                    </div>
                  )}

                  {/* MATERIAL INGREDIENTS LIST */}
                  <div className="flex flex-col gap-1 font-mono text-[8px] mt-1">
                    <span className="text-slate-500 leading-none mb-1 text-[7.5px] uppercase tracking-wider">Required Ingredients:</span>
                    <div className="flex flex-wrap gap-1">
                      {materialsCheckList.map((m) => (
                        <span
                          key={m.mat}
                          className={`px-1.5 py-0.5 rounded border ${
                            m.sufficient
                              ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400'
                              : 'bg-rose-950/20 border-rose-500/20 text-rose-400'
                          }`}
                        >
                          {m.qty}x {m.mat} ({m.currentStock}/{m.qty})
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* MISSING MATERIALS GATHER NOTICE HELPER TIP */}
                  {isUnlocked && hasMissingMaterials && (
                    <div className="p-1.5 rounded bg-rose-950/20 border border-rose-900/25 text-[8px] font-mono text-rose-300 italic flex items-center gap-1">
                      <AlertCircle size={10} className="text-rose-400 shrink-0" />
                      <span>Missing materials? You can close the bench to gather them on the map.</span>
                    </div>
                  )}

                  {/* ACTION CONTROLS */}
                  <div className="mt-auto pt-2 border-t border-slate-800/60 flex items-center justify-end">
                    {!isUnlocked ? (
                      <button
                        disabled={mapData.researchPoints < (recipe.researchCost ?? 0)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onResearch?.(recipeId);
                        }}
                        className={`px-3 py-1.5 bg-purple-700 hover:bg-purple-600 font-sans tracking-wide text-white rounded-lg text-[9px] font-bold transition-all active:scale-95 cursor-pointer w-full flex items-center justify-center gap-1.5 shadow ${
                          mapData.researchPoints < (recipe.researchCost ?? 0)
                            ? 'opacity-40 cursor-not-allowed bg-slate-850 text-slate-500 hover:bg-slate-850'
                            : ''
                        }`}
                      >
                        <Sparkles size={10} />
                        <span>Unlock Blueprint</span>
                      </button>
                    ) : (
                      <button
                        disabled={!canCraftNow}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canCraftNow) onStartCraft?.(recipeId);
                        }}
                        className={`px-3 py-1.5 font-sans tracking-wide text-white rounded-lg text-[9px] font-bold transition-all active:scale-95 cursor-pointer w-full flex items-center justify-center gap-1.5 shadow ${
                          canCraftNow
                            ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
                            : 'bg-slate-850 border border-slate-800/40 text-slate-500 hover:bg-slate-850 cursor-not-allowed'
                        }`}
                      >
                        <Hammer size={10} />
                        <span>{canCraftNow ? 'Click Item to Assemble' : 'Missing Materials / Station'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* RIGHT COLUMN: QUEUE & RELIC DETAILS & ACTIONS (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col gap-4 border-l border-slate-800/40 lg:pl-4">
          
          {/* ASSIGNED ARTISANS HUD SPEED BONUS */}
          <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-950/15 font-mono text-[9px] flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 uppercase tracking-widest font-bold">Village Artisans</span>
              <span className="text-indigo-400 font-extrabold">{artisanCount} assigned</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full" 
                style={{ width: `${Math.min(100, artisanCount * 25)}%` }}
              />
            </div>
            <p className="text-[8px] text-slate-500 leading-normal">
              Active assembly speed bonus: <strong className="text-indigo-300 font-extrabold">+{artisanCount * 150}%</strong> from live craftsmen in the colony.
            </p>
          </div>

          {/* ACTIVE DECIPHERING RELIC WORKSTATION MODULE */}
          {mapData.activeRelicStudy ? (
            <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono leading-none font-bold text-indigo-300 uppercase tracking-widest animate-pulse flex items-center gap-1">
                  🔮 Deciphering Relic
                </span>
                <span className="text-[9px] font-mono font-bold text-indigo-200 bg-indigo-900/40 px-1.5 py-0.5 rounded border border-indigo-700/30">
                  {Math.min(100, Math.round((mapData.activeRelicStudy.daysProgress / mapData.activeRelicStudy.totalDaysRequired) * 100))}%
                </span>
              </div>
              
              <div className="flex flex-col gap-1.5 text-[9px] leading-tight text-slate-300 border-t border-indigo-900/35 pt-2">
                <div>
                  <span className="font-bold text-indigo-400 uppercase tracking-wider text-[8px]">Relic:</span>
                  <div className="text-[10px] text-slate-100 font-bold mt-0.5">{mapData.activeRelicStudy.relicName}</div>
                </div>
                <div>
                  <span className="font-bold text-indigo-400 uppercase tracking-wider text-[8px]">Assigned Oracle:</span>
                  <div className="text-slate-200 mt-0.5">{mapData.activeRelicStudy.oracleName} (Healer Lvl {mapData.activeRelicStudy.oracleHealerLevel})</div>
                </div>
                <div className="text-[8px] italic text-amber-400 font-mono mt-1 leading-relaxed border-t border-indigo-950/60 pt-1.5">
                  💡 The assigned Oracle will travel directly to the ancient relic location to study it. Progress occurs only while they stand physically adjacent to it!
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden mt-1 border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (mapData.activeRelicStudy.daysProgress / mapData.activeRelicStudy.totalDaysRequired) * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            mapData.stockpile.relics > 0 && (
              <div className="p-3.5 rounded-xl border border-amber-600/30 bg-amber-600/5 flex flex-col gap-2.5">
                <div>
                  <span className="text-[9px] font-mono leading-none font-bold text-amber-300 uppercase tracking-widest flex items-center gap-1">
                    🌟 Ancient Relic Study
                  </span>
                  <p className="text-[9.5px] text-slate-300 mt-1.5 leading-relaxed">
                    You have <strong className="text-amber-300">{mapData.stockpile.relics} ancient relic(s)</strong> in base storage. Study to send your highest Healer/Oracle to decode secrets and reward resources or knowledge.
                  </p>
                </div>
                <button
                  onClick={onStudyRelic}
                  className="w-full py-2 text-[9px] font-mono bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-lg transition-all active:scale-95 cursor-pointer shadow-md uppercase tracking-wider text-center"
                >
                  Study Relic
                </button>
              </div>
            )
          )}

          {/* ASSEMBLY QUEUE CONTAINER */}
          <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/45 font-mono text-[9px] flex flex-col gap-2.5">
            <span className="text-[9px] font-extrabold text-indigo-400 flex items-center gap-1 uppercase tracking-widest">
              <Zap size={11} className="animate-pulse" /> Assembly Line Queue
            </span>

            {mapData.craftQueue && mapData.craftQueue.length > 0 ? (
              <div className="space-y-2 max-h-[25vh] overflow-y-auto no-scrollbar">
                {mapData.craftQueue.map((job: CraftingJob, idx: number) => {
                  const recipe = RECIPE_DATABASE[job.recipeId];
                  if (!recipe) return null;
                  const isFirst = idx === 0;

                  return (
                    <div key={job.id} className="p-2.5 rounded bg-slate-900/60 border border-slate-800/40">
                      <div className="flex justify-between items-center text-[10px] text-slate-200">
                        <span className="font-bold flex items-center gap-1">
                          {isFirst ? '🔨 Active:' : '⏳ Enqueued:'} {recipe.name}
                        </span>
                        <button
                          onClick={() => onCancelCraft?.(job.id)}
                          className="text-rose-400 hover:text-rose-300 underline font-semibold cursor-pointer text-[8px] tracking-wider uppercase"
                        >
                          Cancel
                        </button>
                      </div>
                      {isFirst && (
                        <div className="mt-2 w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all duration-300 animate-pulse"
                            style={{ width: `${Math.min(100, Math.max(5, job.progress))}%` }}
                          />
                        </div>
                      )}
                      <div className="flex justify-between text-[8px] text-slate-500 mt-1.5">
                        <span>Tier: {recipe.tier}</span>
                        <span>{isFirst ? `${Math.round(job.progress)}%` : 'In Queue'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 italic text-[9px] leading-relaxed">
                No active assembly tasks. Choose a blueprint to begin the fabrication cycle!
              </div>
            )}
          </div>

          {/* LOWER CLOSE ACTIONS & EXPLANATORY MATERIALS BUFFER NOTICE */}
          <div className="p-3.5 rounded-xl border border-slate-800/40 bg-slate-950/20 text-[9px] text-slate-400 leading-relaxed font-sans mt-auto flex flex-col gap-2">
            <div className="flex items-start gap-1.5">
              <FolderOpen size={13} className="text-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong>Gather Support Notice:</strong> If you lack required metals, bone, or fibers, you can safely close this workbench interface, deploy gatherers, and resume fabrication later.
              </span>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[9.5px] font-mono tracking-wider uppercase border border-slate-700/50 transition-colors cursor-pointer text-center font-bold"
                id="crafting-hub-close-bottom-btn"
              >
                🚪 Close Hub & Gather Resources
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
