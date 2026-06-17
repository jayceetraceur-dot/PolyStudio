import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  TreePine, 
  Mountain, 
  Droplets, 
  MapPin, 
  Layers, 
  Info, 
  X, 
  Sprout, 
  Eye,
  Heart,
  Flame,
  Award,
  ShieldAlert,
  Camera,
  Activity,
  User,
  Skull,
  Sparkles,
  Compass
} from 'lucide-react';
import { CellInfo, Tribesperson, TribespersonRole, TribespersonTrait, MapData } from '../types';
import { BIOME_COLORS } from '../utils/worldBuilder';
import CraftingTab from './CraftingTab';

interface InspectorProps {
  selectedCell: CellInfo | null;
  onClear: () => void;
  timeOfDay: number; // 0..1
  selectedTribesperson: Tribesperson | null;
  onClearTribesperson: () => void;
  onRoleChange: (id: string, newRole: TribespersonRole) => void;
  onFocusCoordinates: (x: number, z: number) => void;
  onRelocateStructure?: (x: number, z: number) => void;
  onDismantleStructure?: (x: number, z: number) => void;
  mapData?: MapData;
  onDesignateConstruction?: (
    x: number,
    z: number,
    type: 'Shelter' | 'WaterWell' | 'LogWall' | 'StorageBin' | 'Wheat' | 'Tent' | 'Shrine' | 'WatchTower' | 'ArtisanBench' | 'ScienceMachine' | 'RuinousAltar' | 'Fireplace' | 'PetrifiedGreenhouse' | 'PrecursorGenerator' | 'AegisBeacon' | 'GatherersPantry' | 'HuntersHut' | 'BuildersLodge' | 'FarmersGranary' | 'ScoutsLookout' | 'HealersSanctum' | 'ArtisansWorkshop'
  ) => void;
  onManualAction?: (x: number, z: number, actionId: string) => void;
  onStartCraft?: (recipeId: string) => void;
  onCancelCraft?: (jobId: string) => void;
  onResearch?: (recipeId: string) => void;
  onStudyRelic?: () => void;
  tribe?: Tribesperson[];
  isCreativeMode?: boolean;
}

const TRAIT_DATA: Record<TribespersonTrait, { title: string; desc: string; icon: string }> = {
  Tireless: { title: 'Tireless', desc: 'Fatigue drains 45% slower. +2 Endurance.', icon: '⚡' },
  'Green Thumb': { title: 'Green Thumb', desc: 'Gains Farmer xp 50% faster, starts proficient.', icon: '🌾' },
  'Path Finder': { title: 'Path Finder', desc: 'Walks 40% faster in any terrain. +2 Agility.', icon: '🏃' },
  'Beast Friend': { title: 'Beast Friend', desc: 'Gains Hunter xp 50% faster, avoids predator aggro.', icon: '🐺' },
  'Iron Stomach': { title: 'Iron Stomach', desc: 'Needs decays 30% slower. +1 Endurance.', icon: '🍔' },
};

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

const ALL_ROLES: TribespersonRole[] = ['Gatherer', 'Hunter', 'Farmer', 'Builder', 'Scout', 'Healer', 'Artisan', 'Oracle'];

const getStructureCategory = (type: string): 'Portable' | 'Semi-Portable' | 'Permanent' => {
  if (type === 'Tent' || type === 'Shrine') return 'Portable';
  if (type === 'Wheat' || type === 'WatchTower' || type === 'Fireplace') return 'Permanent';
  return 'Semi-Portable';
};

const getStructureEmoji = (type: string): string => {
  switch (type) {
    case 'Tent': return '⛺';
    case 'Shrine': return '⛩️';
    case 'StorageBin': return '📦';
    case 'WaterWell': return '🚰';
    case 'Shelter': return '🏡';
    case 'LogWall': return '🧱';
    case 'ArtisanBench': return '🛠️';
    case 'ScienceMachine': return '🔬';
    case 'RuinousAltar': return '🔮';
    case 'WatchTower': return '🗼';
    case 'Fireplace': return '🔥';
    case 'PetrifiedGreenhouse': return '🌱';
    case 'PrecursorGenerator': return '⚙️';
    case 'AegisBeacon': return '🛡️';
    case 'GatherersPantry': return '🧺';
    case 'HuntersHut': return '🏹';
    case 'BuildersLodge': return '🪵';
    case 'FarmersGranary': return '🌾';
    case 'ScoutsLookout': return '🔭';
    case 'HealersSanctum': return '🌿';
    case 'ArtisansWorkshop': return '⚒️';
    case 'ObservationPlatform': return '🔭';
    case 'Observatory': return '🛰️';
    case 'RelicArchive': return '🏛️';
    case 'MeditationShrine': return '🧘';
    case 'MapHall': return '🗺️';
    default: return '🏗️';
  }
};

export default function Inspector({ 
  selectedCell, 
  onClear, 
  timeOfDay,
  selectedTribesperson,
  onClearTribesperson,
  onRoleChange,
  onFocusCoordinates,
  onRelocateStructure,
  onDismantleStructure,
  mapData,
  onDesignateConstruction,
  onManualAction,
  onStartCraft,
  onCancelCraft,
  onResearch,
  onStudyRelic,
  tribe,
  isCreativeMode = false
}: InspectorProps) {
  const isNight = timeOfDay < 0.25 || timeOfDay > 0.75;
  const [showCrafting, setShowCrafting] = useState(false);
  const [architectTab, setArchitectTab] = useState<'portable' | 'semi' | 'guilds' | 'permanent' | 'tech' | 'oracle'>('portable');

  const getBiomeLabel = (biome: string) => {
    switch (biome) {
      case 'water': return 'Water Body';
      case 'beach': return 'Sandy Shore';
      case 'desert': return 'Ancient Scorched Wastes';
      case 'grassland': return 'Grassland Plain';
      case 'forest': return 'Dense Forest';
      case 'rocky': return 'Bedrock Ridge';
      default: return 'Territory';
    }
  };

  // --- 1. RENDER SELECTED TRIBESPERSON DETAILS ---
  if (selectedTribesperson) {
    const person = selectedTribesperson;
    const formattedAge = `Age ${person.ageYears} (Day ${Math.floor(person.ageDays) + 1})`;

    const needs = [
      { label: 'Health', value: person.stats.health, color: 'bg-rose-500', icon: Heart, fill: '#ef4444' },
      { label: 'Hunger', value: person.stats.hunger, color: 'bg-amber-600', icon: Flame, fill: '#d97706' },
      { label: 'Thirst', value: person.stats.thirst, color: 'bg-blue-500', icon: Droplets, fill: '#3b82f6' },
      { label: 'Fatigue', value: person.stats.fatigue, color: 'bg-indigo-500', icon: Eye, fill: '#6366f1' },
      { label: 'Morale', value: person.stats.morale, color: 'bg-purple-500', icon: Award, fill: '#a855f7' },
    ];

    const attributesList = [
      { key: 'strength', name: 'STR', val: person.attributes.strength, color: 'text-red-500' },
      { key: 'endurance', name: 'END', val: person.attributes.endurance, color: 'text-orange-500' },
      { key: 'intelligence', name: 'INT', val: person.attributes.intelligence, color: 'text-blue-500' },
      { key: 'perception', name: 'PER', val: person.attributes.perception, color: 'text-emerald-500' },
      { key: 'agility', name: 'AGI', val: person.attributes.agility, color: 'text-cyan-500' },
    ];

    return (
      <AnimatePresence>
        <motion.div
          id="tribesman-inspector-panel"
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className={`fixed top-4 right-4 z-40 w-80 p-4 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-300 flex flex-col gap-3 max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar ${
            isNight 
              ? 'bg-slate-950/75 border-slate-850 text-slate-100 shadow-black/20' 
              : 'bg-white/75 border-slate-200/50 text-slate-800 shadow-slate-900/5'
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-3 border-slate-200/20" id="tribesman-inspector-header">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                {person.isAlive ? (
                  <span 
                    className="px-2 py-0.5 text-[9px] font-bold font-mono uppercase tracking-widest text-white rounded shadow-sm"
                    style={{ backgroundColor: ROLE_COLORS[person.role] }}
                  >
                    {person.role}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[9px] font-bold font-mono tracking-widest uppercase bg-slate-800 text-slate-400 rounded flex items-center gap-1">
                    <Skull size={10} /> DECEASED
                  </span>
                )}
                <span className={`text-[10px] font-mono uppercase ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                  {formattedAge}
                </span>
              </div>
              <h3 className="text-xl font-bold tracking-tight leading-snug font-sans flex items-baseline gap-1.5 flex-wrap">
                <span>{person.name}</span>
                {person.familyName && (
                  <span className="text-sm font-semibold text-amber-500 font-serif lowercase tracking-wider">
                    {person.familyName}
                  </span>
                )}
              </h3>
              
              {/* Dynasty, Generation, phase info badges */}
              {person.familyName && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono tracking-wider rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/10">
                    Gen {person.generation || 1} {person.isTribeBorn ? 'Descendant' : 'Pioneer'}
                  </span>
                  {person.agePhase && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono tracking-wider rounded bg-rose-500/15 text-rose-400 border border-rose-500/10">
                      🍼 Stage: {person.agePhase}
                    </span>
                  )}
                  {person.childUpbringing && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono tracking-wider rounded bg-amber-500/15 text-amber-500 border border-amber-500/10">
                      🏡 Upbringing: {person.childUpbringing}
                    </span>
                  )}
                  {person.apprenticeToName && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono tracking-wider rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/10 col-span-2">
                      🎓 Mentee: {person.apprenticeToName}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              id="tribesman-inspector-close-btn"
              onClick={onClearTribesperson}
              className={`p-1.5 rounded-lg transition-all ${
                isNight
                  ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
              }`}
            >
              <X size={16} />
            </button>
          </div>

          {/* Deceased Mortem summary or Active status ticker */}
          {!person.isAlive ? (
            <div className="p-3 bg-red-950/30 border border-red-900/30 rounded-xl text-xs text-red-300 flex items-center gap-3">
              <Skull className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="font-semibold uppercase tracking-wider text-[9px] text-red-400 font-mono">Cause of Death</p>
                <p className="italic font-medium leading-relaxed">
                  Succumbed to {person.deathReason || 'Extreme Hardship'} during of time cycles.
                </p>
              </div>
            </div>
          ) : (
            <div className={`p-2.5 rounded-xl border flex items-center gap-3 text-xs ${isNight ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50 border-slate-200/50'}`}>
              <Activity className="w-4 h-4 text-emerald-500 shrink-0 animate-pulse" />
              <div className="truncate">
                <span className="font-bold text-[8px] tracking-wider uppercase font-mono block text-slate-500 leading-3">Current Action</span>
                <span className="font-medium">{person.statusText}</span>
              </div>
            </div>
          )}

          {/* Needs stats bars */}
          <div className="space-y-2.5" id="needs-section">
            <h4 className={`text-[10px] font-mono font-bold tracking-widest uppercase pb-1.5 border-b border-slate-200/10 ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
              Survival Stats
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {needs.map((item) => (
                <div key={item.label} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <item.icon size={12} className="opacity-80" />
                      <span className="font-medium text-[11px]">{item.label}</span>
                    </div>
                    <span className="font-mono font-bold text-[11px]">{Math.round(item.value)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800/80 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${item.color}`}
                      style={{ width: `${Math.max(0, Math.min(100, item.value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Core Attribute parameters */}
          <div className="space-y-2" id="attributes-section">
            <h4 className={`text-[10px] font-mono font-bold tracking-widest uppercase pb-1 ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
              Core Attributes
            </h4>
            <div className="grid grid-cols-5 gap-1">
              {attributesList.map((attr) => (
                <div 
                  key={attr.key} 
                  className={`flex flex-col items-center justify-center py-2 rounded-xl border text-center ${
                    isNight ? 'bg-slate-900/30 border-slate-800/80' : 'bg-slate-50 border-slate-200/50'
                  }`}
                >
                  <span className={`text-[9px] font-mono font-bold ${attr.color}`}>{attr.name}</span>
                  <span className="text-sm font-bold font-mono">{attr.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Artisan Sub-professions Specializations */}
          {person.role === 'Artisan' && (
            <div className="space-y-2 p-3.5 rounded-2xl border bg-indigo-950/20 border-indigo-500/20" id="artisan-specs-section">
              <h4 className="text-[10px] font-mono font-bold tracking-widest uppercase text-indigo-400">
                Artisan Specializations
              </h4>
              <div className="grid grid-cols-1 gap-1.5 mt-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>🔨</span>
                    <span className="font-bold">Toolmaker</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/15 text-emerald-400">Active (Lvl 1)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>🥋</span>
                    <span className="font-bold">Leatherworker</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/15 text-emerald-400">Active (Lvl 1)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>🧵</span>
                    <span className="font-bold">Weaver</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/15 text-emerald-400">Active (Lvl 1)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>🌋</span>
                    <span className="font-bold">Blacksmith (Ores)</span>
                  </div>
                  {(person.skills.Artisan?.level ?? 1) >= 5 ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/15 text-emerald-400">Active (Lvl 5)</span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-500/10 text-slate-400">Locked (Requires Lvl 5)</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>⚙️</span>
                    <span className="font-bold">Relic Engineer</span>
                  </div>
                  {(person.skills.Artisan?.level ?? 1) >= 9 ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-500/15 text-indigo-400">Active (Lvl 9)</span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-500/10 text-slate-400">Locked (Requires Lvl 9)</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Character traits */}
          {person.traits.length > 0 && (
            <div className="space-y-2" id="traits-section">
              <h4 className={`text-[10px] font-mono font-bold tracking-widest uppercase pb-1 ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                Acquired Traits
              </h4>
              <div className="flex flex-col gap-1.5">
                {person.traits.map((trait) => {
                  const data = TRAIT_DATA[trait];
                  if (!data) return null;
                  return (
                    <div key={trait} className={`p-2.5 rounded-xl border text-xs leading-relaxed flex items-center gap-2.5 ${
                      isNight ? 'bg-indigo-950/15 border-indigo-900/10' : 'bg-indigo-50/20 border-indigo-100/40'
                    }`}>
                      <span className="text-base select-none">{data.icon}</span>
                      <div>
                        <span className="font-bold text-[11px] block text-indigo-500 leading-4">{data.title}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{data.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Learned Mastery Techniques */}
          {person.masteryTechniques && person.masteryTechniques.length > 0 && (
            <div className="space-y-2" id="mastery-techniques-section">
              <h4 className="text-[10px] font-mono font-bold tracking-widest uppercase text-amber-500 pb-1 border-b border-amber-500/10">
                ✨ Learned Mastery Techniques
              </h4>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {person.masteryTechniques.map((tech) => (
                  <span 
                    key={tech} 
                    className="px-2 py-1 text-[9.5px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-1 shadow-sm leading-none"
                  >
                    ✨ {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social Dynamics & Personality */}
          <div className="space-y-3 p-3.5 rounded-2xl border bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-indigo-500/20" id="social-dynamics-section">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-mono font-bold tracking-widest uppercase text-indigo-400">
                Social Identity & Bonds
              </h4>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold font-mono bg-purple-500/15 text-purple-400 border border-purple-500/20">
                👤 {person.personality || 'Brave'}
              </span>
            </div>
            
            {/* Personality description blurb */}
            <p className="text-[10.5px] italic text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
              {(() => {
                switch(person.personality) {
                  case 'Brave': return "Fearless and daring. Gains extra +25% work speed and confidence when hunting big game or fighting beasts.";
                  case 'Curious': return "Inquisitive mind. Moves 40% faster on Scout duties, exploring is second nature.";
                  case 'Cowardly': return "Cautious to a fault. Runs extremely fast away from danger, but works slightly slower when wild animals are close.";
                  case 'Lazy': return "Prefers taking it easy. Consumes energy slower and rests automatically, but works 40% slower on tasks.";
                  case 'Ambitious': return "Hard worker. Completes construction and artisan jobs 35% faster, but harder to keep satisfied.";
                  case 'Loyal': return "Team player. Gets extra +15% work speed when near family or friends.";
                  case 'Greedy': return "Loves resources. Carries loads 15% faster, but gets easily irritated by poor conditions.";
                  default: return "A steady member of the tribal colony.";
                }
              })()}
            </p>

            {/* Social relationships (friends, rivals, family) */}
            <div className="space-y-2 mt-2 pt-2.5 border-t border-slate-200/10">
              <span className="text-[9px] font-bold font-mono uppercase text-slate-500 block">Personal Ties</span>
              {(!person.relationships || person.relationships.length === 0) ? (
                <span className="text-[10px] text-slate-500 italic block">No strong personal ties formed yet. They will emerge as they work near others.</span>
              ) : (
                <div className="flex flex-col gap-2">
                  {person.relationships.map((rel, idx) => {
                    let relColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                    let relIcon = '🤝';
                    if (rel.type === 'Rival') {
                      relColor = 'text-red-400 bg-red-500/10 border-red-500/20';
                      relIcon = '😡';
                    } else if (rel.type === 'Family') {
                      relColor = 'text-pink-400 bg-pink-500/10 border-pink-500/20';
                      relIcon = '❤️';
                    } else if (rel.type === 'Mentor') {
                      relColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                      relIcon = '🎓';
                    } else if (rel.type === 'Apprentice') {
                      relColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
                      relIcon = '🌱';
                    }

                    return (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl border border-slate-200/10 bg-slate-900/30">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{relIcon}</span>
                          <div>
                            <span className="font-bold block text-[11px] leading-3">{rel.targetName}</span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400">Value: {rel.value > 0 ? `+${rel.value}` : rel.value}</span>
                          </div>
                        </div>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border capitalize ${relColor}`}>
                          {rel.type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Specialized Skill levels list */}
          <div className="space-y-2.5" id="skills-section">
            <h4 className={`text-[10px] font-mono font-bold tracking-widest uppercase pb-1.5 border-b border-slate-200/10 ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
              Specialization Skills
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1 no-scrollbar">
              {[...ALL_ROLES]
                .sort((a, b) => {
                  const specA = person.skills[a];
                  const specB = person.skills[b];
                  if (specB.level !== specA.level) return specB.level - specA.level;
                  return specB.xp - specA.xp;
                })
                .map((roleKey) => {
                const spec = person.skills[roleKey];
                const isPrimary = person.role === roleKey;
                const ratio = Math.min(100, (spec.xp / spec.xpToNextLevel) * 100);

                return (
                  <div key={roleKey} className="flex flex-col gap-1 text-[11px]">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: ROLE_COLORS[roleKey] }}
                        />
                        <span className={`font-semibold ${isPrimary ? 'text-indigo-500 font-bold' : ''}`}>
                          {roleKey}
                        </span>
                        {isPrimary && (
                          <span className="text-[8px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/15 px-1 rounded uppercase font-bold font-mono">PRIMARY</span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] font-bold">
                        Lvl {spec.level} <span className="text-slate-400 font-normal">({spec.xp}/{spec.xpToNextLevel} XP)</span>
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-200 dark:bg-slate-800/80 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full" 
                        style={{ width: `${ratio}%`, backgroundColor: ROLE_COLORS[roleKey] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive controls */}
          {person.isAlive && (
            <div className="space-y-3.5 border-t pt-3 mt-1 border-slate-200/10" id="tribesman-actions">
              {/* Manual Job assigner dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <User size={10} className="text-indigo-500" />
                  <span>Assign Primary Role Task</span>
                </label>
                <select
                  id="role-assignment-pulldown"
                  value={person.role}
                  onChange={(e) => onRoleChange(person.id, e.target.value as TribespersonRole)}
                  className={`w-full text-xs font-mono px-2.5 py-1.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none ${
                    isNight 
                      ? 'bg-slate-900 border-slate-850 text-slate-200' 
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Fly Camera focus coordinates button */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="focus-on-member-btn"
                  onClick={() => onFocusCoordinates(person.x, person.z)}
                  className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all w-full ${
                    isNight
                      ? 'border-slate-800 hover:bg-slate-900 text-teal-400'
                      : 'border-slate-200 hover:bg-slate-50 text-indigo-600 shadow-sm'
                  }`}
                >
                  <Camera size={13} />
                  <span>Pan Camera</span>
                </button>

                <button
                  id="inspect-ground-cell-btn"
                  onClick={() => {
                    // Turn on ground cell focus matching coordinates
                    onFocusCoordinates(person.x, person.z);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all w-full ${
                    isNight
                      ? 'border-slate-800 hover:bg-slate-900 text-indigo-400'
                      : 'border-slate-200 hover:bg-slate-50 text-emerald-600 shadow-sm'
                  }`}
                >
                  <Compass size={13} />
                  <span>Track Tile</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  // --- 2. RENDER SELECTED CELL/TILE DETAILS ---
  if (!selectedCell) return null;

  const formattedMoisture = Math.round(selectedCell.moisture * 100);
  const formattedElevation = selectedCell.height.toFixed(1);

  return (
    <AnimatePresence>
      <motion.div
        id="inspector-panel"
        initial={{ opacity: 0, x: 50, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 60, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className={`fixed top-4 right-4 z-40 w-80 p-4 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-300 max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar ${
          isNight 
            ? 'bg-slate-950/75 border-slate-850 text-slate-100 shadow-black/20' 
            : 'bg-white/75 border-slate-200/50 text-slate-800 shadow-slate-900/5'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-3 mb-4 border-slate-200/20" id="inspector-header">
          <div>
            <div className="flex items-center gap-2 mb-1" id="inspector-biome">
              <span 
                className="w-3 h-3 rounded-full animate-pulse shadow-sm" 
                style={{ backgroundColor: BIOME_COLORS[selectedCell.biome] }}
              />
              <span className={`text-xs font-mono tracking-wider uppercase ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                {getBiomeLabel(selectedCell.biome)}
              </span>
            </div>
            <h3 className={`text-sm font-bold tracking-tight uppercase ${isNight ? 'text-slate-100' : 'text-slate-800'}`} id="inspector-title">
              {selectedCell.structure 
                ? `${getStructureEmoji(selectedCell.structure.type)} ${selectedCell.structure.type}` 
                : selectedCell.inspectableName}
            </h3>
          </div>
          <button
            id="inspector-close-btn"
            onClick={onClear}
            className={`p-1.5 rounded-lg transition-all ${
              isNight
                ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Wildlife Ecosystem & Hunting / Taming Dashboard! */}
        {(() => {
          const cellAnimal = mapData?.animals?.find(
            a => Math.round(a.x) === selectedCell.x && Math.round(a.z) === selectedCell.z
          );
          if (!cellAnimal) return null;
          return (
            <div className="mb-4 p-3.5 rounded-xl bg-slate-950/60 border border-indigo-500/30 flex flex-col gap-3 animate-fade-in" id="inspector-animal-details">
              <div className="flex justify-between items-center border-b pb-2 border-slate-800">
                <span className="text-xs font-mono font-black tracking-widest text-[#cfad8c] uppercase flex items-center gap-1.5">
                  🐾 {cellAnimal.category || 'FAUNA ENTITY'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                  cellAnimal.isTame 
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' 
                    : 'bg-amber-950/40 text-amber-400 border-amber-900/50'
                }`}>
                  {cellAnimal.isTame ? '💖 Tame Domestic' : '🐗 Wild'}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-3xl p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  {cellAnimal.type === 'Rabbit' && '🐇'}
                  {cellAnimal.type === 'Deer' && '🦌'}
                  {cellAnimal.type === 'Sheep' && '🐑'}
                  {cellAnimal.type === 'WildGoat' && '🐐'}
                  {cellAnimal.type === 'Boar' && '🐗'}
                  {cellAnimal.type === 'Elk' && '🫎'}
                  {cellAnimal.type === 'PackBird' && '🦤'}
                  {cellAnimal.type === 'Fox' && '🦊'}
                  {cellAnimal.type === 'WildDog' && '🐕'}
                  {cellAnimal.type === 'Vulture' && '🦅'}
                  {cellAnimal.type === 'Wolf' && '🐺'}
                  {cellAnimal.type === 'Bear' && '🐻'}
                  {cellAnimal.type === 'LargeCat' && '🐆'}
                  {cellAnimal.type === 'DireWolf' && '🛡️'}
                  {!['Rabbit','Deer','Sheep','WildGoat','Boar','Elk','PackBird','Fox','WildDog','Vulture','Wolf','Bear','LargeCat','DireWolf'].includes(cellAnimal.type) && '🐾'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-sans font-bold text-slate-100 text-sm leading-none mb-1">
                      {cellAnimal.type}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400 capitalize">
                      {cellAnimal.gender || 'Unknown'} • {cellAnimal.agePhase || 'Adult'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-350">
                    <span>HP:</span>
                    <span className="font-bold text-slate-100">{Math.round(cellAnimal.HP || 100)} / {cellAnimal.maxHP || 100}</span>
                    {cellAnimal.isSleeping && <span className="ml-2 text-indigo-400 font-bold animate-pulse">💤 Sleeping</span>}
                  </div>
                </div>
              </div>

              {/* Animal Internal Needs and Vitality stats */}
              <div className="grid grid-cols-2 gap-1.5 border-t border-b border-slate-900 py-2.5 my-0.5 text-[10px] font-mono">
                <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-900">
                  <span className="text-slate-400">😋 Hunger:</span>
                  <span className={`${(cellAnimal.hunger || 0) < 30 ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
                    {Math.round(cellAnimal.hunger || 0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-900">
                  <span className="text-slate-400">💧 Thirst:</span>
                  <span className={`${(cellAnimal.thirst || 0) < 30 ? 'text-blue-400 animate-pulse' : 'text-slate-200'}`}>
                    {Math.round(cellAnimal.thirst || 0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-900">
                  <span className="text-slate-400">😨 Stress:</span>
                  <span className={`${(cellAnimal.stress || 0) > 50 ? 'text-orange-400' : 'text-slate-200'}`}>
                    {Math.round(cellAnimal.stress || 0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-900">
                  <span className="text-slate-400">⚡ Fear:</span>
                  <span className={`${(cellAnimal.fear || 0) > 10 ? 'text-yellow-400 font-bold' : 'text-slate-200'}`}>
                    {Math.round(cellAnimal.fear || 0)}%
                  </span>
                </div>
              </div>

              {/* Domestication / Taming Progress bar */}
              <div className="p-2.5 rounded-lg bg-indigo-950/25 border border-indigo-500/10 flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-indigo-300">Taming Development:</span>
                  <span className="font-bold text-slate-100">{cellAnimal.tameLevel || 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${cellAnimal.tameLevel || 0}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono mt-0.5">
                  <span className="text-indigo-300">Enclosure Trust Factor:</span>
                  <span className="font-bold text-emerald-400">{cellAnimal.trustLevel || 0}%</span>
                </div>
                {cellAnimal.isTame && (
                  <div className="flex items-center gap-1.5 text-[10px] font-sans font-extrabold text-emerald-400 mt-1">
                    ❇️ Domesticated: Can pull wagons and defend base!
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {!cellAnimal.isTame ? (
                  <>
                    <button
                      onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'designateHunt')}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        (cellAnimal as any).isHuntDesignated
                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg'
                          : 'bg-slate-800 hover:bg-rose-950/40 text-slate-350 border border-slate-700/60'
                      }`}
                    >
                      🎯 {(cellAnimal as any).isHuntDesignated ? 'Hunt Design' : 'Order Hunt'}
                    </button>
                    <button
                      onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'designateCapture')}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        (cellAnimal as any).isCaptureDesignated
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg'
                          : 'bg-slate-800 hover:bg-indigo-950/40 text-slate-350 border border-slate-700/60'
                      }`}
                    >
                      🕸️ {(cellAnimal as any).isCaptureDesignated ? 'Capture Design' : 'Live Capture'}
                    </button>
                    <button
                      onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'tameManualPet')}
                      className="col-span-2 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-extrabold rounded-lg bg-pink-950/40 hover:bg-pink-900/60 text-pink-300 border border-pink-900/30 transition-all font-sans"
                    >
                      🍎 Feed Sweet Berries (Costs 1 Berry)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'domesticSetJobTransport')}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        (cellAnimal as any).assignedJobType === 'transport'
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-350 border border-slate-700'
                      }`}
                    >
                      🐪 Pull Wagons
                    </button>
                    <button
                      onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'domesticSetJobGuard')}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        (cellAnimal as any).assignedJobType === 'guard'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-350 border border-slate-700'
                      }`}
                    >
                      🛡️ Village Guard
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Biome title and description section */}

        {/* Available Actions on Natural Resources */}
        {!selectedCell.structure && (selectedCell.hasTree || selectedCell.hasRock || selectedCell.hasShrub || (selectedCell.resourceNode && selectedCell.resourceNode.amount > 0)) && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-950/20 border border-slate-800 flex flex-col gap-2 animate-fade-in" id="inspector-resource-manual-actions">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#cfad8c] uppercase flex items-center gap-1.5 border-b border-slate-800 pb-1.5 mb-1">
              🌾 Automated Resource Node
            </span>
            <div className="flex flex-col gap-2 text-[10px] text-slate-350 leading-relaxed font-sans">
              {/* Wood / Tree Description */}
              {(selectedCell.hasTree || (selectedCell.resourceNode && selectedCell.resourceNode.type === 'Wood' && selectedCell.resourceNode.amount > 0)) && (
                <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-900/30 flex flex-col gap-0.5">
                  <span className="font-bold text-emerald-400 block font-mono">🪓 Wood Pine Tree Trunk</span>
                  <span>A mature tree containing raw lumber. Your **Gatherers** (villagers with "Gather" priority) will automatically walk here to chop and transport wood to stockpile.</span>
                </div>
              )}

              {/* Shrub / Berries / Food Description */}
              {(selectedCell.hasShrub || (selectedCell.resourceNode && selectedCell.resourceNode.category === 'food' && selectedCell.resourceNode.amount > 0)) && (
                <div className="p-2 rounded-lg bg-lime-950/20 border border-lime-900/30 flex flex-col gap-0.5 font-sans">
                  <span className="font-bold text-lime-400 block font-mono">🍇 Wild Berry Shrub</span>
                  <span>A source of fresh sweet berries. Your **Gatherers** will automatically prune and harvest food resources from this shrub when stockpiles run low.</span>
                </div>
              )}

              {/* Rocks / Stone Outline Description */}
              {(selectedCell.hasRock || (selectedCell.resourceNode && selectedCell.resourceNode.type === 'Stone' && selectedCell.resourceNode.amount > 0)) && (
                <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/30 flex flex-col gap-0.5">
                  <span className="font-bold text-slate-300 block font-mono">🪨 Solid Stone Boulder</span>
                  <span>Craggy surface outcroppings. Your **Gatherers** will automatically break this down using standard copper implements to amass building stone.</span>
                </div>
              )}

              {/* Advanced Ore Mining Description */}
              {selectedCell.resourceNode && ['Copper', 'Silver', 'Gold', 'Iron'].includes(selectedCell.resourceNode.type) && selectedCell.resourceNode.amount > 0 && (
                <div className="p-2 rounded-lg bg-amber-950/20 border border-amber-900/30 flex flex-col gap-0.5">
                  <span className="font-bold text-amber-400 block font-mono">⛏️ {selectedCell.resourceNode.type} Ore Vein</span>
                  <span>
                    {((mapData?.stockpile?.flintPickaxe ?? 0) > 0 || (mapData?.stockpile?.steelPickaxe ?? 0) > 0) ? (
                      <span>A rich mineral strain containing raw ore. Your **Gatherers** will automatically mine and haul these raw metals to base using their tool equipment.</span>
                    ) : (
                      <span className="text-amber-200">⚠️ Locked: Requires a **Flint or Steel Pickaxe** in the stockpile for your Gatherers to harvest. Craft one at the Artisan Bench!</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Available Actions on Procedural Landmarks */}
        {!selectedCell.structure && selectedCell.landmark && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col gap-2.5 animate-fade-in" id="inspector-landmark-actions">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#cfad8c] uppercase flex items-center gap-1.5 animate-pulse">
              ⭐ UNCHARTED LANDMARK FEATURE
            </span>
            
            <div className="flex flex-col gap-1 bg-slate-900/40 p-2.5 rounded-lg border border-indigo-900/20 text-xs text-slate-200">
              <span className="font-sans font-extrabold text-[#cfad8c] text-sm flex items-center gap-1">
                {selectedCell.landmark.name}
              </span>
              <p className="text-[11px] text-slate-300 leading-normal font-sans mt-1">
                {selectedCell.landmark.description}
              </p>
              
              <div className="border-t border-indigo-900/30 my-2 pt-2 text-[10px] font-mono text-slate-400">
                <span className="text-[8px] uppercase font-bold text-indigo-400 block mb-0.5">Potential Rewards</span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  {selectedCell.landmark.rewards.knowledgePoints && (
                    <span>🧠 +{selectedCell.landmark.rewards.knowledgePoints} Knowledge</span>
                  )}
                  {selectedCell.landmark.rewards.moraleBoost && (
                    <span className={selectedCell.landmark.rewards.moraleBoost > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      🎭 {selectedCell.landmark.rewards.moraleBoost > 0 ? '+' : ''}{selectedCell.landmark.rewards.moraleBoost} Morale
                    </span>
                  )}
                  {selectedCell.landmark.rewards.ancientMaterials && (
                    <span>⚙️ +{selectedCell.landmark.rewards.ancientMaterials} Precursor Atoms</span>
                  )}
                  {selectedCell.landmark.rewards.relics && (
                    <span>🏺 +{selectedCell.landmark.rewards.relics} Sacred Relic</span>
                  )}
                  {selectedCell.landmark.rewards.unlockRecipeId && (
                    <span className="text-amber-300 col-span-2">📜 Blueprints: Unknown Craft Recipe</span>
                  )}
                  {selectedCell.landmark.rewards.unlockBuildingType && (
                    <span className="text-indigo-400 col-span-2">🏗️ Schematics: Unlocks {selectedCell.landmark.rewards.unlockBuildingType}</span>
                  )}
                </div>
              </div>
            </div>

            {!selectedCell.landmark.explored ? (
              <button
                onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'exploreLandmark')}
                className="w-full py-2 bg-[#cfad8c] hover:bg-[#bfa07e] text-slate-950 font-extrabold font-mono text-[10px] rounded-xl tracking-wider uppercase transition-all flex flex-col items-center gap-0.5 shadow-md active:scale-95 cursor-pointer animate-pulse"
              >
                <span className="flex items-center gap-1.5 font-bold">🔍 Investigate & Scavenge Core</span>
                <span className="text-[8px] font-mono opacity-80">(Requires active focus | Expends no material)</span>
              </button>
            ) : (
              <div className="flex flex-col gap-2 p-3 bg-emerald-950/20 border border-emerald-500/10 rounded-xl">
                <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-mono font-bold uppercase">
                  <span>✔️ LANDMARK FULLY DECODED</span>
                </div>
                <div className="text-[11px] leading-relaxed text-slate-200 mt-1 italic font-serif">
                  "{selectedCell.landmark.storySegment}"
                </div>
              </div>
            )}
          </div>
        )}

        {/* Structure Info & Relocation/Dismantle Controls */}
        {selectedCell.structure && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/30 flex flex-col gap-2 animate-fade-in" id="inspector-structure-section">
            <div className="flex justify-between items-center border-b pb-1 border-indigo-950/40 mb-0.5">
              <span className="text-[9px] font-mono font-bold tracking-wider text-indigo-400 uppercase flex items-center gap-1">
                ⚙️ Active Structure
              </span>
              <span className={`text-[8.5px] font-mono uppercase font-bold px-1.5 py-0.25 rounded ${
                getStructureCategory(selectedCell.structure.type) === 'Portable' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : getStructureCategory(selectedCell.structure.type) === 'Semi-Portable'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {getStructureCategory(selectedCell.structure.type)}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold">{selectedCell.structure.type}</span>
              <span className="text-xs font-mono text-slate-400">Condition: {selectedCell.structure.condition}%</span>
            </div>

            {selectedCell.structure.dismantling ? (
              <div className="text-[10px] text-amber-400 font-mono italic leading-relaxed bg-amber-950/10 p-2 rounded-lg border border-amber-900/25 flex flex-col gap-1">
                <span>🧹 Designated for dismantling...</span>
                <span>Builders will deconstruct this and pack up its materials.</span>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${selectedCell.structure.dismantleProgress || 0}%` }} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 mt-1">
                {/* Portable relocation controls */}
                {getStructureCategory(selectedCell.structure.type) === 'Portable' && onRelocateStructure && (
                  <button
                    onClick={() => onRelocateStructure(selectedCell.x, selectedCell.z)}
                    className="w-full py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-mono text-[9px] rounded-lg tracking-wider uppercase transition-colors flex items-center justify-center gap-1 active:scale-95 shadow-lg shadow-emerald-500/10 cursor-pointer"
                  >
                    🚀 Relocate Instantly
                  </button>
                )}

                {/* Semi-Portable dismantle controls */}
                {getStructureCategory(selectedCell.structure.type) === 'Semi-Portable' && onDismantleStructure && (
                  <button
                    onClick={() => onDismantleStructure(selectedCell.x, selectedCell.z)}
                    className="w-full py-1.5 px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold font-mono text-[9px] rounded-lg tracking-wider uppercase transition-colors flex items-center justify-center gap-1 active:scale-95 shadow-lg shadow-amber-500/10 cursor-pointer"
                  >
                    🧹 Designate Dismantle
                  </button>
                )}

                {/* Permanent state indicator removed - now managed at bottom */}
              </div>
            )}
          </div>
        )}

        {selectedCell.construction && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/30 flex flex-col gap-2 animate-fade-in" id="inspector-construction-section">
            <span className="text-[9px] font-mono font-bold tracking-wider text-indigo-400 uppercase flex items-center gap-1">
              🏗️ Building in Progress
            </span>
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold">{selectedCell.construction.type}</span>
              <span className="text-xs font-mono text-slate-400">Progress: {Math.round(selectedCell.construction.progress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-indigo-50 rounded-full" style={{ width: `${selectedCell.construction.progress}%` }} />
            </div>
            <button
              onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'cancelConstruction')}
              className="mt-2 w-full py-1.5 px-2 bg-rose-900/40 hover:bg-rose-855 text-rose-200 border border-rose-750/20 font-bold font-mono text-[9px] rounded-lg tracking-wider uppercase transition-colors flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
            >
              ❌ Cancel Construction Blueprint
            </button>
          </div>
        )}

        {selectedCell.farmCrop && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-900/20 border border-emerald-800/30 flex flex-col gap-2 animate-fade-in" id="inspector-crop-section">
            <span className="text-[9px] font-mono font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1">
              🌾 Agricultural Crop Plot
            </span>
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold">{selectedCell.farmCrop.type} ({selectedCell.farmCrop.stage})</span>
              <span className="text-xs font-mono text-slate-400">Growth: {Math.round(selectedCell.farmCrop.progress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-850 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: `${selectedCell.farmCrop.progress}%` }} />
            </div>
            <button
              onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'removeFarmCrop')}
              className="mt-2 w-full py-1.5 px-2 bg-rose-900/40 hover:bg-rose-855 text-rose-200 border border-rose-750/20 font-bold font-mono text-[9px] rounded-lg tracking-wider uppercase transition-colors flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
            >
              🧹 Clear & Remove Crop
            </button>
          </div>
        )}

        {!selectedCell.structure && !selectedCell.construction && !selectedCell.farmCrop && mapData && onDesignateConstruction && (
          <div className="mb-4 p-3 rounded-xl bg-slate-900/30 border border-slate-200/5 flex flex-col gap-2 animate-fade-in" id="inspector-blueprint-architect">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles size={11} className="text-indigo-550 shrink-0" />
              Blueprint Architect
            </span>
            
            {selectedCell.biome === 'water' ? (
              <div className="p-2 border border-dashed border-sky-900/20 rounded-lg text-center text-sky-400 text-[10px] italic bg-sky-950/10">
                🌊 Cannot construct on water bodies.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 mt-1">
                {/* Visual tabs to separate blue prints into different booklet sections */}
                <div className="flex flex-wrap gap-1 border-b border-slate-700/30 pb-2 mb-2">
                  {[
                    { id: 'portable', label: '🏕️ Portable' },
                    { id: 'semi', label: '🏗️ Semi-P' },
                    { id: 'guilds', label: '🛖 Guilds' },
                    { id: 'oracle', label: '🔮 Oracle' },
                    { id: 'permanent', label: '🗻 Fixed' },
                    ...(mapData?.unlockedBuildings && mapData.unlockedBuildings.length > 0 ? [{ id: 'tech', label: '☄️ Tech' }] : [])
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setArchitectTab(tab.id as any)}
                      className={`px-1.5 py-1 text-[8.5px] font-mono font-bold uppercase rounded transition-all cursor-pointer ${
                        architectTab === tab.id
                          ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                  {[
                    {
                      id: 'portable',
                      categoryName: '🏕️ Portable (Instant Move)',
                      items: [
                        { type: 'Tent', label: '⛺ Tent Lodging', cost: '25 Wood', wood: 25, stone: 0, food: 0, desc: 'Portable rests. Fatigue rates 2.2x.' },
                        { type: 'Shrine', label: '⛩️ Ritual Shrine', cost: '15 Wood, 25 Stone', wood: 15, stone: 25, food: 0, desc: 'Passive wisdom. +1.5 RP & +1.0 morale/day.' }
                      ]
                    },
                    {
                      id: 'semi',
                      categoryName: '🏗️ Semi-Portable',
                      items: [
                        { type: 'StorageBin', label: '📦 Storage Bin', cost: '25 Wood, 10 Stone', wood: 25, stone: 10, food: 0, desc: 'Stockpile depot. Expands storage by +500kg.' },
                        { type: 'WaterWell', label: '🚰 Water Well', cost: '10 Wood, 30 Stone', wood: 10, stone: 30, food: 0, desc: 'Satisfies worker thirst instantly.' },
                        { type: 'Shelter', label: '🏡 Shelter Hut', cost: '40 Wood', wood: 40, stone: 0, food: 0, desc: 'Log cabin. Deluxe fatigue rest (3x).' },
                        { type: 'LogWall', label: '🧱 Log Defense Wall', cost: '5 Wood', wood: 5, stone: 0, food: 0, desc: 'Construct simple barricades/defense.' },
                        { type: 'ArtisanBench', label: '🛠️ Artisan Bench', cost: '30 Wood, 10 Stone', wood: 30, stone: 10, food: 0, desc: 'Allows artisan tools crafting.' },
                        { type: 'ScienceMachine', label: '🔬 Science Machine', cost: '40 Wood, 40 Stone', wood: 40, stone: 40, food: 0, desc: 'Laboratory. Deploys recipes +4.5 RP/day.' },
                        { type: 'RuinousAltar', label: '🔮 Ruinous Altar', cost: '50 Wood, 80 Stone, 5 Gold, 3 Silver', wood: 50, stone: 80, food: 0, desc: 'Cosmic desk. Unlocks relic-grade gear.' }
                      ]
                    },
                    {
                      id: 'guilds',
                      categoryName: '🛖 Guild & Role Lodges (+25% Boosts)',
                      items: [
                        { type: 'GatherersPantry', label: '🧺 Gatherer\'s Pantry', cost: '35 Wood, 15 Stone', wood: 35, stone: 15, food: 0, desc: 'Gatherers gather resources & learn 25% faster.' },
                        { type: 'HuntersHut', label: '🏹 Hunter\'s Hut', cost: '40 Wood, 10 Stone', wood: 40, stone: 10, food: 0, desc: 'Hunters deal +25% damage, take -25% damage, & learn 25% faster.' },
                        { type: 'BuildersLodge', label: '🪵 Builder\'s Lodge', cost: '50 Wood, 10 Stone', wood: 50, stone: 10, food: 0, desc: 'Builders build/repair/demolish & learn 25% faster.' },
                        { type: 'FarmersGranary', label: '🌾 Farmer\'s Granary', cost: '25 Wood, 25 Stone', wood: 25, stone: 25, food: 0, desc: 'Farmers plant, water, harvest crop plots & learn 25% faster.' },
                        { type: 'ScoutsLookout', label: '🔭 Scout\'s Lookout', cost: '30 Wood, 20 Stone', wood: 30, stone: 20, food: 0, desc: 'Scouts move, survey unknown areas & learn 25% faster.' },
                        { type: 'HealersSanctum', label: '🌿 Healer\'s Sanctum', cost: '30 Wood, 30 Stone', wood: 30, stone: 30, food: 0, desc: 'Boosts passive HP recovery by +25% & healer training by +25%.' },
                        { type: 'ArtisansWorkshop', label: '⚒️ Artisan\'s Workshop', cost: '40 Wood, 20 Stone', wood: 40, stone: 20, food: 0, desc: 'Artisans craft tools, process resources & learn 25% faster.' }
                      ]
                    },
                    {
                      id: 'oracle',
                      categoryName: '🔮 Oracle Sanctuaries (Exclusive)',
                      items: [
                        { type: 'ObservationPlatform', label: '🔭 Observation Platform', cost: '30 Wood, 15 Stone', wood: 30, stone: 15, food: 0, desc: 'Oracle studies clouds & winds. Unlocks Level 1+ Oracle storm observations.' },
                        { type: 'Observatory', label: '🛰️ Weather Observatory', cost: '55 Wood, 50 Stone', wood: 55, stone: 50, food: 0, desc: 'Advanced meteorological post. Forecasts exact storm Eye paths.' },
                        { type: 'RelicArchive', label: '🏛️ Relic Archive', cost: '45 Wood, 45 Stone', wood: 45, stone: 45, food: 0, desc: 'Stores and maps ancient relics. Boosts study progress speed & yields.' },
                        { type: 'MeditationShrine', label: '🧘 Meditation Shrine', cost: '25 Wood, 35 Stone', wood: 25, stone: 35, food: 0, desc: 'Restorative tranquil spot. Generates research points and lore wisdom.' },
                        { type: 'MapHall', label: '🗺️ Map Hall', cost: '40 Wood, 30 Stone', wood: 40, stone: 30, food: 0, desc: 'Cartographic room. Synthesizes prediction charts of downstream hazards.' }
                      ]
                    },
                    {
                      id: 'permanent',
                      categoryName: '🗻 Permanent (Fixed placement)',
                      items: [
                        { type: 'Wheat', label: '🌾 Wheat Crop Plot', cost: '10 Food', wood: 0, stone: 0, food: 10, desc: 'Plotted, tended, harvested by default.' },
                        { type: 'WatchTower', label: '🗼 Watch Tower', cost: '40 Wood, 60 Stone', wood: 40, stone: 60, food: 0, desc: 'Informative lookout. Alerts if danger/animals enter the zone.' },
                        { type: 'Fireplace', label: '🔥 Great Fireplace', cost: '20 Wood, 15 Stone', wood: 20, stone: 15, food: 0, desc: 'Central warmth of the village. Spawn region.' }
                      ]
                    },
                    ...(mapData?.unlockedBuildings && mapData.unlockedBuildings.length > 0 ? [{
                      id: 'tech',
                      categoryName: '☄️ Precursor Tech (Landmark Lore)',
                      items: [
                        { type: 'PetrifiedGreenhouse', label: '🌱 Petrified Greenhouse', cost: '50 Wood, 30 Stone', wood: 50, stone: 30, food: 0, desc: 'Decoded hydroponics. Passively generates +12.0 food/day.' },
                        { type: 'PrecursorGenerator', label: '⚙️ Precursor Generator', cost: '20 Wood, 60 Stone', wood: 20, stone: 60, food: 0, desc: 'Scavenged core. Passively generates +15.5 RP/day.' },
                        { type: 'AegisBeacon', label: '🛡️ Aegis Shield Beacon', cost: '40 Wood, 40 Stone', wood: 40, stone: 40, food: 0, desc: 'Emitter. Boosts defensive surveillance instantly.' }
                      ].filter(item => mapData.unlockedBuildings?.includes(item.type))
                    }] : [])
                  ]
                    .filter((cat) => cat.id === architectTab)
                    .map((cat) => (
                      <div key={cat.categoryName} className="flex flex-col gap-1">
                        <span className="text-[8px] font-mono font-bold uppercase tracking-wide text-slate-500 mb-1 border-b border-slate-250/10 pb-0.5">
                          {cat.categoryName}
                        </span>
                        <div className="flex flex-col gap-1">
                          {cat.items.map((item) => {
                            const hasRes = (mapData?.stockpile?.wood ?? 0) >= item.wood && (mapData?.stockpile?.stone ?? 0) >= item.stone && (mapData?.stockpile?.food ?? 0) >= item.food;
                            return (
                              <button
                                key={item.type}
                                disabled={!hasRes}
                                onClick={() => onDesignateConstruction?.(selectedCell.x, selectedCell.z, item.type as any)}
                                className={`w-full p-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                                  hasRes 
                                    ? 'bg-indigo-600/10 border-indigo-600/25 hover:bg-indigo-600/20 text-slate-200 cursor-pointer' 
                                    : 'bg-slate-900/30 border-slate-950/20 text-slate-500 cursor-not-allowed opacity-50'
                                }`}
                              >
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-[10px] font-bold">{item.label}</span>
                                  <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold ${hasRes ? 'bg-indigo-500/15 text-indigo-400' : 'bg-rose-500/15 text-rose-400'}`}>
                                    {item.cost}
                                  </span>
                                </div>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">{item.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Available Actions on Structure */}
        {selectedCell.structure && (
          <div className="mb-4 p-3 rounded-xl bg-violet-950/20 border border-violet-900/30 flex flex-col gap-2.5 animate-fade-in" id="inspector-structure-actions">
            <span className="text-[10px] font-mono font-bold tracking-widest text-violet-400 uppercase flex items-center gap-1.5">
              ⚡ Available Actions
            </span>
            <div className="flex flex-col gap-2">
              {selectedCell.structure.type === 'ArtisanBench' && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setShowCrafting(!showCrafting)}
                    className="w-full py-2 px-3 bg-indigo-650 hover:bg-indigo-600 text-white font-bold font-mono text-[10px] rounded-xl tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md cursor-pointer"
                  >
                    🛠️ {showCrafting ? 'Close Crafting Panel' : 'Open Artisan Crafting'}
                  </button>
                  {showCrafting && mapData && (
                    <div className="mt-2 text-slate-100 max-h-[300px] overflow-y-auto no-scrollbar rounded-lg border border-slate-700/30 bg-slate-900/40 p-2">
                      <CraftingTab
                        mapData={mapData}
                        isNight={isNight}
                        onStartCraft={onStartCraft}
                        onCancelCraft={onCancelCraft}
                        onResearch={onResearch}
                        onStudyRelic={onStudyRelic}
                        artisanCount={tribe ? tribe.filter(p => p.isAlive && p.role === 'Artisan').length : 0}
                        isCreativeMode={isCreativeMode}
                      />
                    </div>
                  )}
                </div>
              )}

              {selectedCell.structure.type === 'Fireplace' && (
                <button
                  disabled={(mapData?.stockpile?.wood ?? 0) < 10}
                  onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'fireplaceStoke')}
                  className={`w-full py-2 px-3 font-bold font-mono text-[10px] rounded-xl tracking-wider uppercase transition-all flex flex-col items-center gap-1 shadow-md cursor-pointer ${
                    (mapData?.stockpile?.wood ?? 0) >= 10
                      ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                      : 'bg-slate-850 text-slate-500 opacity-50 cursor-not-allowed border border-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold">🔥 Stoke Great Fire</span>
                  <span className="text-[8px] font-mono opacity-80">(Cost: 10 Wood | Reward: +25 Morale to all)</span>
                </button>
              )}

              {selectedCell.structure.type === 'WaterWell' && (
                <button
                  onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'wellDraw')}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold font-mono text-[10px] rounded-xl tracking-wider uppercase transition-all flex flex-col items-center gap-1 shadow-md cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-bold">🚰 Draw Fresh Water</span>
                  <span className="text-[8px] font-mono opacity-80">(Reward: +20L Water to Stockpile)</span>
                </button>
              )}

              {selectedCell.structure.type === 'ScienceMachine' && (
                <button
                  disabled={(mapData?.stockpile?.wood ?? 0) < 15 || (mapData?.stockpile?.stone ?? 0) < 15}
                  onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'scienceMachineResearch')}
                  className={`w-full py-2 px-3 font-bold font-mono text-[10px] rounded-xl tracking-wider uppercase transition-all flex flex-col items-center gap-1 shadow-md cursor-pointer ${
                    (mapData?.stockpile?.wood ?? 0) >= 15 && (mapData?.stockpile?.stone ?? 0) >= 15
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-850 text-slate-500 opacity-50 cursor-not-allowed border border-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold">🔬 Run Lab Experiments</span>
                  <span className="text-[8px] font-mono opacity-80">(Cost: 15 Wood, 15 Stone | Reward: +25 RP)</span>
                </button>
              )}

              {selectedCell.structure.type === 'Shrine' && (
                <button
                  disabled={(mapData?.stockpile?.food ?? 0) < 10}
                  onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'shrinePray')}
                  className={`w-full py-2 px-3 font-bold font-mono text-[10px] rounded-xl tracking-wider uppercase transition-all flex flex-col items-center gap-1 shadow-md cursor-pointer ${
                    (mapData?.stockpile?.food ?? 0) >= 10
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : 'bg-slate-850 text-slate-500 opacity-50 cursor-not-allowed border border-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold">⛩️ Convene Prayer Meditation</span>
                  <span className="text-[8px] font-mono opacity-80">(Cost: 10 Food | Reward: +20 RP & +15 Morale)</span>
                </button>
              )}

              {selectedCell.structure.type === 'RuinousAltar' && (
                <button
                  disabled={(mapData?.stockpile?.stone ?? 0) < 25 || (mapData?.stockpile?.gold ?? 0) < 2}
                  onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'altarEchoes')}
                  className={`w-full py-2 px-3 font-bold font-mono text-[10px] rounded-xl tracking-wider uppercase transition-all flex flex-col items-center gap-1 shadow-md cursor-pointer ${
                    (mapData?.stockpile?.stone ?? 0) >= 25 && (mapData?.stockpile?.gold ?? 0) >= 2
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-slate-850 text-slate-500 opacity-50 cursor-not-allowed border border-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold">🔮 Ruinous Transcendence</span>
                  <span className="text-[8px] font-mono opacity-80">(Cost: 25 Stone, 2 Gold | Reward: +1 Steel Pick, +30 RP)</span>
                </button>
              )}

              {selectedCell.structure.type === 'WatchTower' && (
                <button
                  onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'watchTowerScan')}
                  className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-mono text-[10px] rounded-xl tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  📡 Scan Danger Borders
                </button>
              )}
            </div>
          </div>
        )}

        {/* Available Actions on Natural Items */}
        {!selectedCell.structure && (selectedCell.hasTree || selectedCell.hasRock || selectedCell.hasShrub || selectedCell.resourceNode) && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/30 flex flex-col gap-2.5 animate-fade-in" id="inspector-object-actions">
            <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
              🌿 Gathering Interactions
            </span>
            <div className="flex flex-col gap-2">
              {/* Wood / Tree Gathering */}
              {(selectedCell.hasTree || (selectedCell.resourceNode && selectedCell.resourceNode.type === 'Wood')) && (
                <button
                  onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'gatherWood')}
                  className="w-full py-2 px-3 bg-amber-700 hover:bg-amber-600 text-white font-bold font-mono text-[10px] rounded-xl tracking-wider uppercase transition-all flex flex-col items-center gap-0.5 shadow-md cursor-pointer text-center"
                >
                  <span className="flex items-center gap-1.5 font-bold">🪓 Chop & Gather Wood</span>
                  <span className="text-[8.5px] opacity-90 text-amber-200">Harvests wood logs directly to stockpile</span>
                </button>
              )}

              {/* Shrub / Berry Gathering */}
              {(selectedCell.hasShrub || (selectedCell.resourceNode && selectedCell.resourceNode.category === 'food')) && (
                <button
                  onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'gatherBerries')}
                  className="w-full py-2 px-3 bg-lime-700 hover:bg-lime-600 text-white font-bold font-mono text-[10px] text-center rounded-xl tracking-wider uppercase transition-all flex flex-col items-center gap-0.5 shadow-md cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-bold">🍇 Gather Fresh Fruits</span>
                  <span className="text-[8.5px] opacity-90 text-lime-200">Harvests edible resources directly to stockpile</span>
                </button>
              )}

              {/* Stone Gathering (Available to everyone) */}
              {(selectedCell.hasRock || (selectedCell.resourceNode && selectedCell.resourceNode.type === 'Stone')) && (
                <button
                  onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'gatherStone')}
                  className="w-full py-2 px-3 bg-zinc-700 hover:bg-zinc-600 text-white font-bold font-mono text-[10px] text-center rounded-xl tracking-wider uppercase transition-all flex flex-col items-center gap-0.5 shadow-md cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-bold">🪨 Gather Stone Blocks</span>
                  <span className="text-[8.5px] opacity-90 text-zinc-200">Breaks boulders for stone blocks</span>
                </button>
              )}

              {/* Iron, Copper, Silver, Gold Mining (Requires Pickaxe) */}
              {selectedCell.resourceNode && ['Copper', 'Silver', 'Gold', 'Iron'].includes(selectedCell.resourceNode.type) && (() => {
                const hasPickaxe = (mapData?.stockpile?.flintPickaxe ?? 0) > 0 || (mapData?.stockpile?.steelPickaxe ?? 0) > 0;
                return (
                  <button
                    disabled={!hasPickaxe}
                    onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'mineOre')}
                    className={`w-full py-2 px-3 font-bold font-mono text-[10px] rounded-xl tracking-wider uppercase transition-all flex flex-col items-center gap-0.5 shadow-md cursor-pointer ${
                      hasPickaxe
                        ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-850 text-slate-500 opacity-50 cursor-not-allowed border border-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-bold">⛏️ Mine {selectedCell.resourceNode.type} Mineral Node</span>
                    {hasPickaxe ? (
                      <span className="text-[8.5px] text-teal-900 font-bold uppercase font-mono">
                        🛠️ Extraction pickaxe detected (mine ore!)
                      </span>
                    ) : (
                      <span className="text-[8.5px] font-sans font-normal text-rose-400">
                        ⚠️ Requires pickaxe (flint/steel) in stock
                      </span>
                    )}
                  </button>
                );
              })()}
            </div>
          </div>
        )}

        {/* Don't Starve Resource Node Information */}
        {!selectedCell.structure && selectedCell.resourceNode && (
          <div className="mb-4 p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col gap-1.5 animate-fade-in" id="inspector-resource-node">
            <div className="flex justify-between items-center border-b pb-1 border-slate-800/60 mb-0.5">
              <span className="text-[9px] font-mono font-bold tracking-wider text-indigo-400 uppercase flex items-center gap-1">
                <Sparkles size={9} /> Procedural Resource Node
              </span>
              <span className="text-[9px] font-mono uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-1 py-0.25 rounded leading-none">
                {selectedCell.resourceNode.category}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold font-sans">{selectedCell.resourceNode.type} Node</span>
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="text-slate-400">Qty:</span>
                <span className="font-sans font-bold text-slate-100">{selectedCell.resourceNode.amount} / {selectedCell.resourceNode.maxAmount}</span>
              </div>
            </div>
            {/* Progress bar of current reserve */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1">
              <div 
                style={{ width: `${(selectedCell.resourceNode.amount / selectedCell.resourceNode.maxAmount) * 100}%` }} 
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              />
            </div>
            {/* Regrowth characteristics */}
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 leading-none mt-0.5">
              <span>Regrowth Rate:</span>
              <span className="text-emerald-400">{selectedCell.resourceNode.regrowRate > 0 ? `+${selectedCell.resourceNode.regrowRate}/day` : 'Non-renewable'}</span>
            </div>
          </div>
        )}

        {/* Resources & Yield */}
        {!selectedCell.structure && (
          <div id="inspector-yields">
            <h4 className={`text-[11px] font-mono font-bold tracking-widest uppercase mb-2 ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
              Yield & Characteristics
            </h4>

            {Object.keys(selectedCell.resources).length > 0 ? (
              <div className="space-y-2" id="inspector-resources-list">
                {selectedCell.resources.wood !== undefined && (
                  <div className="flex items-center justify-between text-sm" id="resource-wood">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-amber-500/10 text-amber-500">
                        <TreePine size={14} />
                      </div>
                      <span>Wood Reserve</span>
                    </div>
                    <span className="font-mono font-semibold">{selectedCell.resources.wood} units</span>
                  </div>
                )}

                {selectedCell.resources.stone !== undefined && (
                  <div className="flex items-center justify-between text-sm" id="resource-stone">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-slate-500/10 text-slate-400">
                        <Mountain size={14} />
                      </div>
                      <span>Raw Stone block</span>
                    </div>
                    <span className="font-mono font-semibold">{selectedCell.resources.stone} units</span>
                  </div>
                )}

                {selectedCell.resources.water !== undefined && (
                  <div className="flex items-center justify-between text-sm" id="resource-water">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-blue-500/10 text-blue-400">
                        <Droplets size={14} />
                      </div>
                      <span>Fresh Water</span>
                    </div>
                    <span className="font-mono font-semibold">{selectedCell.resources.water}L</span>
                  </div>
                )}

                {selectedCell.resources.fertility !== undefined && (
                  <div className="flex items-center justify-between text-sm" id="resource-fertility">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-emerald-500/10 text-emerald-500">
                        <Sprout size={14} />
                      </div>
                      <span>Soil Fertility</span>
                    </div>
                    <span className="font-mono font-semibold">{selectedCell.resources.fertility}x</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs italic text-slate-400 dark:text-slate-500" id="resource-none">
                No harvestable materials on this bedrock.
              </p>
            )}
          </div>
        )}

        {/* Absolute Bottom Demolish Action for any structure */}
        {selectedCell.structure && (
          <div className="mt-4 pt-3 border-t border-slate-200/10 flex flex-col gap-1.5 w-full bg-rose-950/5 p-2 rounded-xl border border-rose-900/10" id="inspector-demolish-bottom">
            {getStructureCategory(selectedCell.structure.type) === 'Permanent' && (
              <div className="text-[9px] font-mono text-rose-400/80 italic text-center p-1 bg-rose-950/10 rounded-lg border border-rose-900/10 leading-normal">
                🔒 Permanent structure. Cannot be moved or dismantled by workers.
              </div>
            )}
            <button
              onClick={() => onManualAction?.(selectedCell.x, selectedCell.z, 'demolishStructure')}
              className="w-full py-1.5 px-2 bg-rose-900 hover:bg-rose-800 text-rose-100 border border-rose-700/35 font-bold font-mono text-[9px] rounded-lg tracking-wider uppercase transition-colors flex items-center justify-center gap-1 active:scale-95 shadow-md cursor-pointer animate-pulse"
            >
              💥 Demolish Structure (Instantly)
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
