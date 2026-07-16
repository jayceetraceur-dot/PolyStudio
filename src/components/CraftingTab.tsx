import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hammer, BookOpen, Zap, Sparkles, AlertCircle } from 'lucide-react';
import { MapData, RECIPE_DATABASE, Recipe, CraftingJob } from '../types';

interface CraftingTabProps {
  mapData: MapData;
  isNight: boolean;
  onStartCraft?: (recipeId: string) => void;
  onCancelCraft?: (jobId: string) => void;
  onResearch?: (recipeId: string) => void;
  onStudyRelic?: () => void;
  artisanCount: number;
  isCreativeMode?: boolean;
}

export default function CraftingTab({
  mapData,
  isNight,
  onStartCraft,
  onCancelCraft,
  onResearch,
  onStudyRelic,
  artisanCount,
  isCreativeMode = false,
}: CraftingTabProps) {
  const [selectedTier, setSelectedTier] = useState<'Primitive' | 'Tribal' | 'Advanced' | 'Relic'>('Primitive');

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

  // Filter recipes by tier
  const recipesByTier = Object.entries(RECIPE_DATABASE).map(
    ([id, r]) => [id, r as Recipe] as const
  ).filter(
    ([_, recipe]) => recipe.tier === selectedTier
  );

  return (
    <div
      id="crafting-dashboard-panel"
      className={`p-4 rounded-2xl border backdrop-blur-md shadow-lg transition-all duration-500 flex flex-col gap-3 max-h-[50vh] overflow-y-auto no-scrollbar ${
        isNight
          ? 'bg-slate-950/80 border-slate-800 text-slate-100'
          : 'bg-white/80 border-slate-200 text-slate-800'
      }`}
    >
      {/* HEADER SECTION: RESEARCH COMPASS */}
      <div className="flex items-center justify-between border-b pb-2 border-slate-200/10">
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-amber-500 animate-pulse" />
          <h4 className="font-semibold text-sm tracking-tight text-slate-100 dark:text-slate-100">Active Crafting Blueprints</h4>
        </div>
        <div className="flex items-center gap-1.5 bg-indigo-900/40 px-2.5 py-1 rounded-xl border border-indigo-700/30">
          <span className="text-[10px] font-mono font-bold text-indigo-300">RESEARCH COMPASS:</span>
          <strong className="text-[11px] font-mono font-extrabold text-indigo-200">{mapData.researchPoints.toFixed(1)} RP</strong>
        </div>
      </div>

      {/* ANCIENT RELIC STUDYING INTERACTIVE MODULE */}
      {mapData.activeRelicStudy ? (
        <div className="p-2.5 rounded-xl border border-indigo-500/20 bg-indigo-950/20 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono leading-none font-bold text-indigo-400 uppercase tracking-wider animate-pulse flex items-center gap-1">
              🔮 Relic Study In Progress
            </span>
            <span className="text-[8px] font-mono font-bold text-slate-400">
              {Math.min(100, Math.round((mapData.activeRelicStudy.daysProgress / mapData.activeRelicStudy.totalDaysRequired) * 100))}%
            </span>
          </div>
          
          <div className="flex flex-col gap-0.5 text-[8.5px] leading-tight text-slate-300">
            <div>
              <span className="font-bold text-indigo-300">Relic:</span> {mapData.activeRelicStudy.relicName}
            </div>
            <div>
              <span className="font-bold text-indigo-300">Oracle:</span> {mapData.activeRelicStudy.oracleName} (Healer Lvl {mapData.activeRelicStudy.oracleHealerLevel})
            </div>
            <div>
              <span className="font-bold text-indigo-300">Progress:</span> {mapData.activeRelicStudy.daysProgress.toFixed(1)} / {mapData.activeRelicStudy.totalDaysRequired.toFixed(1)} Days
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 transition-all duration-300"
              style={{ width: `${Math.min(100, (mapData.activeRelicStudy.daysProgress / mapData.activeRelicStudy.totalDaysRequired) * 100)}%` }}
            />
          </div>
          
          {mapData.stockpile.relics > 0 && (
            <span className="text-[7.5px] text-slate-400 self-end">
              ({mapData.stockpile.relics} more relics in stockpile)
            </span>
          )}
        </div>
      ) : (
        mapData.stockpile.relics > 0 && (
          <div className="p-2.5 rounded-xl border border-amber-600/20 bg-amber-600/10 flex items-center justify-between gap-1.5">
            <div className="flex flex-col text-left shrink-0">
              <span className="text-[9px] font-mono leading-none font-bold text-amber-300 uppercase">ANCIENT RELIC STUDY AVAILABLE!</span>
              <span className="text-[8px] text-slate-300 mt-0.5 leading-tight">Assign oracle to decode ancient secrets. Relics left: {mapData.stockpile.relics}</span>
            </div>
            <button
              onClick={onStudyRelic}
              className="px-2.5 py-1 text-[9px] font-mono bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg transition-all active:scale-95 cursor-pointer shadow-md"
            >
              Study Relic
            </button>
          </div>
        )
      )}

      {/* ACTIVE CRAFTING QUEUE PROGRESS CARD */}
      <div className="p-2.5 rounded-xl border border-slate-200/5 bg-slate-900/30 font-mono text-[9px] flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-indigo-400 flex items-center gap-1">
            <Zap size={10} className="animate-pulse" /> Active Crafting Queue
          </span>
          {artisanCount > 0 && (
            <span className="text-[8px] px-1 py-0.2 heading-none bg-emerald-500/15 text-emerald-400 rounded">
              Artisan boost: +{artisanCount * 150}% speed
            </span>
          )}
        </div>

        {mapData.craftQueue && mapData.craftQueue.length > 0 ? (
          <div className="space-y-2">
            {mapData.craftQueue.map((job: CraftingJob, idx: number) => {
              const recipe = RECIPE_DATABASE[job.recipeId];
              if (!recipe) return null;
              const isFirst = idx === 0;

              return (
                <div key={job.id} className="p-2 rounded bg-slate-950/40 border border-slate-200/5">
                  <div className="flex justify-between items-center text-[10px] text-slate-300">
                    <span className="font-bold flex items-center gap-1">
                      {isFirst ? '🔨 Assemble:' : '⏳ Enqueued:'} {recipe.name}
                    </span>
                    <button
                      onClick={() => onCancelCraft?.(job.id)}
                      className="text-rose-400 hover:text-rose-300 underline font-semibold cursor-pointer text-[8px]"
                    >
                      Cancel (70% Refund)
                    </button>
                  </div>
                  {isFirst && (
                    <div className="mt-1.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(5, job.progress))}%` }}
                      />
                    </div>
                  )}
                  <div className="flex justify-between text-[8px] text-slate-500 mt-1">
                    <span>Tier: {recipe.tier}</span>
                    <span>{isFirst ? `${Math.round(job.progress)}% completed` : 'Waiting...'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-2 border border-dashed border-slate-200/10 rounded text-center text-slate-500 italic text-[8px]">
            No active crafting tasks. Select a recipe card below to start assembling primitive or relic tech!
          </div>
        )}
      </div>

      {/* TECH TIER SELECTOR */}
      <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-950/40 rounded-xl border border-slate-800 shrink-0">
        {(['Primitive', 'Tribal', 'Advanced', 'Relic'] as const).map((t) => {
          const isSelected = selectedTier === t;
          let color = 'text-indigo-400 bg-indigo-500/10 border border-indigo-700/25';
          if (t === 'Tribal') color = 'text-emerald-400 bg-emerald-500/10 border border-emerald-700/25';
          if (t === 'Advanced') color = 'text-amber-400 bg-amber-500/10 border border-amber-700/25';
          if (t === 'Relic') color = 'text-purple-400 bg-purple-500/10 border border-purple-700/25';

          return (
            <button
              key={t}
              onClick={() => setSelectedTier(t)}
              className={`py-1 text-[10px] font-mono leading-none tracking-tight font-bold rounded-lg transition-all cursor-pointer ${
                isSelected
                  ? color + ' shadow-lg scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* RECIPES LIST GRID */}
      <div className="grid grid-cols-1 gap-2">
        {recipesByTier.map(([recipeId, recipe]) => {
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

          return (
            <div
              key={recipeId}
              className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all relative overflow-hidden ${
                isUnlocked
                  ? 'bg-slate-900/40 border-slate-800'
                  : 'bg-slate-950/80 border-slate-900/60 opacity-90'
              }`}
            >
              {/* TOP NAMEPLATE */}
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h5 className="text-[11px] font-bold text-slate-100 flex items-center gap-1.5">
                    {recipe.name}
                    {!isUnlocked && <span className="text-[8px] font-mono text-purple-400 bg-purple-950/60 px-1 border border-purple-700/20 font-bold uppercase rounded">LOCKED</span>}
                  </h5>
                  <span className="text-[8px] text-indigo-400 font-mono capitalize">{recipe.tier} item</span>
                </div>
                {recipe.researchCost && !isUnlocked && (
                  <span className="text-[9px] font-mono text-purple-300 font-bold flex items-center gap-1 bg-purple-950/40 border border-purple-700/20 px-1.5 py-0.5 rounded">
                    🔬 {recipe.researchCost} RP
                  </span>
                )}
              </div>

              {/* DESCRIPTION */}
              <p className="text-[9px] text-slate-400 leading-snug">{recipe.description}</p>

              {/* WORKSTATION REQUIREMENT */}
              {requiredWSInfo !== 'None' && (
                <div className="flex items-center gap-1 font-mono text-[8px] leading-3 mt-0.5">
                  <span className="text-slate-500">WORKSTATION:</span>
                  <span className={hasWorkstation ? 'text-emerald-400 font-bold' : 'text-rose-400 flex items-center gap-1'}>
                    {requiredWSInfo === 'ScienceMachine' ? '🔬 Science Machine' : `🛠️ ${requiredWSInfo}`}
                    {!hasWorkstation && <AlertCircle size={8} />}
                  </span>
                </div>
              )}

              {/* MATERIAL INGREDIENTS LIST */}
              <div className="flex flex-wrap gap-1 mt-1 font-mono text-[8px]">
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

              {/* INSTRUCTION LOCK CONTROL BUTTON */}
              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-end">
                {!isUnlocked ? (
                  <button
                    disabled={mapData.researchPoints < (recipe.researchCost ?? 0)}
                    onClick={() => onResearch?.(recipeId)}
                    className={`px-3 py-1 bg-purple-700 hover:bg-purple-600 font-sans tracking-wide text-white rounded-lg text-[9px] font-bold transition-all active:scale-95 cursor-pointer w-full flex items-center justify-center gap-1.5 shadow ${
                      mapData.researchPoints < (recipe.researchCost ?? 0)
                        ? 'opacity-40 cursor-not-allowed bg-slate-850 text-slate-500 hover:bg-slate-850'
                        : ''
                    }`}
                  >
                    <Sparkles size={10} />
                    <span>Unlock Technology Blueprint</span>
                  </button>
                ) : (
                  <button
                    disabled={!canCraftNow}
                    onClick={() => onStartCraft?.(recipeId)}
                    className={`px-3 py-1 bg-indigo-600 hover:bg-indigo-500 font-sans tracking-wide text-white rounded-lg text-[9px] font-bold transition-all active:scale-95 cursor-pointer w-full flex items-center justify-center gap-1.5 shadow ${
                      !canCraftNow
                        ? 'bg-slate-800 border border-slate-700/30 text-slate-500 hover:bg-slate-800 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <Hammer size={10} />
                    <span>Assemble Item Blueprint</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
