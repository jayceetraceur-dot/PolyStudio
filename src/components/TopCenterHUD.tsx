import { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Pause, 
  Sparkles, 
  CalendarDays, 
  CloudSun,
  Leaf,
  Snowflake,
  ChevronDown
} from 'lucide-react';
import { TimeSpeed } from '../types';

interface TopCenterHUDProps {
  gameDays: number;
  timeOfDay: number;
  onChangeTimeOfDay: (time: number) => void;
  timeSpeed: TimeSpeed;
  onChangeTimeSpeed: (speed: TimeSpeed) => void;
  isCreativeMode: boolean;
  onToggleCreativeMode: (enabled: boolean) => void;
  nextCarePackageDay: number;
  onOpenCarePackage: () => void;
}

const MONTH_NAMES = [
  { name: 'Frost Moon', season: 'early-winter', icon: Snowflake, color: 'text-sky-300' },
  { name: 'Deep Ice Moon', season: 'mid-winter', icon: Snowflake, color: 'text-cyan-400' },
  { name: 'Thaw Moon', season: 'late-winter', icon: CloudSun, color: 'text-indigo-300' },
  { name: 'Seed Moon', season: 'early-spring', icon: CalendarDays, color: 'text-emerald-400' },
  { name: 'Sow Moon', season: 'mid-spring', icon: CalendarDays, color: 'text-green-400' },
  { name: 'Bloom Moon', season: 'late-spring', icon: CalendarDays, color: 'text-lime-400' },
  { name: 'Solar Moon', season: 'early-summer', icon: Sun, color: 'text-yellow-400' },
  { name: 'Heat Moon', season: 'mid-summer', icon: Sun, color: 'text-amber-500' },
  { name: 'Thresh Moon', season: 'late-summer', icon: Sun, color: 'text-orange-400' },
  { name: 'Harvest Moon', season: 'early-autumn', icon: Leaf, color: 'text-orange-500' },
  { name: 'Ember Moon', season: 'mid-autumn', icon: Leaf, color: 'text-red-500' },
  { name: 'fog Moon', season: 'late-autumn', icon: Leaf, color: 'text-slate-400' },
];

export default function TopCenterHUD({
  gameDays,
  timeOfDay,
  onChangeTimeOfDay,
  timeSpeed,
  onChangeTimeSpeed,
  isCreativeMode,
  onToggleCreativeMode,
  nextCarePackageDay,
  onOpenCarePackage,
}: TopCenterHUDProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Convert time to 24 Hour representation
  const absoluteMinutes = Math.floor(timeOfDay * 24 * 60);
  const hours = Math.floor(absoluteMinutes / 60);
  const mins = Math.floor(absoluteMinutes % 60);
  const formattedTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

  const isNight = timeOfDay < 0.25 || timeOfDay > 0.75;

  // Derive calendar details
  const totalDays = Math.floor(gameDays);
  const year = Math.floor(totalDays / 360) + 1;
  const monthIndex = Math.floor((totalDays % 360) / 30);
  const day = (totalDays % 30) + 1;

  const currentMonth = MONTH_NAMES[monthIndex] || MONTH_NAMES[0];
  const SeasonalIcon = currentMonth.icon;

  const getSeasonLabel = (season: string) => {
    switch (season) {
      case 'early-winter': case 'mid-winter': case 'late-winter': return 'WINTER';
      case 'early-spring': case 'mid-spring': case 'late-spring': return 'SPRING';
      case 'early-summer': case 'mid-summer': case 'late-summer': return 'SUMMER';
      case 'early-autumn': case 'mid-autumn': case 'late-autumn': return 'AUTUMN';
      default: return 'TEMPERATE';
    }
  };

  const getSeasonTheme = (season: string) => {
    if (season.includes('winter')) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    if (season.includes('spring')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (season.includes('summer')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-amber-750/10 text-orange-400 border-orange-700/20'; // autumn
  };

  return (
    <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
      {/* ALWAYS VISIBLE MAIN CLOCK & CALENDAR TOP BAR */}
      <div 
        id="top-hud-bar"
        className="flex items-center gap-4 px-4 py-2 rounded-2xl border backdrop-blur-md shadow-xl bg-slate-950/80 border-slate-800 text-slate-100"
        style={{ minWidth: '600px' }}
      >
        {/* SECTION 1: CALENDAR */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex flex-col items-start leading-none">
            <span className="text-[8px] font-mono font-bold text-slate-500 tracking-widest uppercase mb-0.5">Chronos Calendar</span>
            <div className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono border ${getSeasonTheme(currentMonth.season)}`}>
                {getSeasonLabel(currentMonth.season)}
              </span>
              <span className="text-xs font-mono font-bold">Y{year}, M{monthIndex + 1}, D{day}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <div className="p-1 rounded-md bg-indigo-600/15">
              <SeasonalIcon className={`w-3.5 h-3.5 ${currentMonth.color}`} />
            </div>
            <div className="leading-none">
              <span className="text-[7.5px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Period</span>
              <span className="text-[10.5px] font-semibold text-slate-200 capitalize">{currentMonth.name}</span>
            </div>
          </div>
        </div>

        <div className="w-px h-7 bg-slate-850" />

        {/* SECTION 2: SOLAR CYCLE CLOCK */}
        <div className="flex-1 flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`p-1.5 rounded-lg ${isNight ? 'bg-amber-500/15 text-yellow-300' : 'bg-amber-500/10 text-amber-500'}`}>
              {isNight ? <Moon size={14} /> : <Sun size={14} />}
            </div>
            <div className="leading-none">
              <span className="text-[8px] uppercase tracking-widest font-mono text-slate-500 font-bold block mb-0.5">Solar Time</span>
              <span className="text-sm font-mono font-bold">{formattedTime}</span>
            </div>
          </div>

          {/* Compact scrubbing solar dial bar */}
          <div className="flex-1 flex flex-col gap-0.5 min-w-[100px]">
            <div className="flex justify-between text-[7.5px] font-mono font-bold text-slate-500 uppercase tracking-wider leading-none">
              <span>Time Scrubber</span>
              <span>
                {timeOfDay < 0.25 ? 'Night' : timeOfDay < 0.35 ? 'Sunrise' : timeOfDay < 0.70 ? 'Midday' : timeOfDay < 0.8 ? 'Sunset' : 'Night'}
              </span>
            </div>
            <input
              id="top-solar-scrub-slider"
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={timeOfDay}
              onChange={(e) => {
                onChangeTimeOfDay(parseFloat(e.target.value));
                onChangeTimeSpeed('paused'); // Pause when scrubbing manually
              }}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>

        <div className="w-px h-7 bg-slate-850" />

        {/* SECTION 3: SIMULATION SPEED */}
        <div className="flex bg-slate-900/60 p-0.5 rounded-xl border border-slate-800/40 gap-1 items-center shrink-0">
          <button
            id="speed-paused"
            onClick={() => onChangeTimeSpeed('paused')}
            className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase rounded-lg transition-all flex items-center gap-0.5 cursor-pointer ${
              timeSpeed === 'paused' 
                ? 'bg-rose-600 text-white shadow shadow-rose-950/20 font-black' 
                : 'text-slate-450 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
            title="Pause Simulation"
          >
            <Pause size={8} className="fill-current" />
            <span>PAUSE</span>
          </button>
          <button
            id="speed-normal"
            onClick={() => onChangeTimeSpeed('normal')}
            className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-lg transition-all cursor-pointer ${timeSpeed === 'normal' ? 'bg-indigo-600 text-white shadow font-bold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
            title="Normal Speed"
          >
            1x
          </button>
          <button
            id="speed-fast"
            onClick={() => onChangeTimeSpeed('fast')}
            className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-lg transition-all cursor-pointer ${timeSpeed === 'fast' ? 'bg-indigo-600 text-white shadow font-bold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
            title="Fast Forward"
          >
            2x
          </button>
          <button
            id="speed-super"
            onClick={() => onChangeTimeSpeed('super')}
            className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-lg transition-all cursor-pointer ${timeSpeed === 'super' ? 'bg-indigo-600 text-white shadow font-bold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
            title="Super Fast"
          >
            4x
          </button>
        </div>
      </div>

      {/* EXPANDABLE BOTTOM PILL PANEL FOR GAME MODE & PRINT POD */}
      <div
        id="top-expandable-pod-panel"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`w-80 rounded-xl border backdrop-blur-md shadow-lg transition-all duration-300 flex flex-col bg-slate-950/80 border-slate-850 text-slate-200 cursor-pointer overflow-hidden ${
          isHovered ? 'max-h-36 p-2.5 gap-2' : 'max-h-7 p-1 items-center justify-center'
        }`}
      >
        {!isHovered ? (
          <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-wider text-indigo-400 uppercase leading-none">
            <span>⚙️ {isCreativeMode ? 'Deity Mode' : 'Survival Mode'}</span>
            <span>•</span>
            <span>
              {isCreativeMode ? 'Unlimited Powers' : Math.floor(gameDays) >= nextCarePackageDay ? '📦 Pod Ready!' : `Pod Cooldown (${Math.floor(gameDays)}/${nextCarePackageDay})`}
            </span>
            <ChevronDown size={10} className="text-indigo-400 animate-bounce ml-0.5" />
          </div>
        ) : (
          <>
            {/* Expanded Settlement Game Mode Switcher */}
            <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Settlement Game Mode
              </span>
              <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-800">
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

            {/* Printing Pod care package status */}
            {!isCreativeMode ? (
              <div className="flex items-center justify-between bg-indigo-950/20 border border-indigo-500/15 p-1.5 rounded-xl w-full">
                <div className="flex flex-col gap-0.5 items-start">
                  <span className="text-[8px] font-mono leading-none text-slate-500 uppercase font-black">
                    DEITY PRINTING POD
                  </span>
                  <span className="text-[9.5px] text-slate-300">
                    {Math.floor(gameDays) >= nextCarePackageDay ? (
                      <span className="text-emerald-400 font-bold animate-pulse">📦 Care Package Ready!</span>
                    ) : (
                      <span>Day {Math.floor(gameDays)}/{nextCarePackageDay} Cooldown</span>
                    )}
                  </span>
                </div>
                {Math.floor(gameDays) >= nextCarePackageDay ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCarePackage();
                    }}
                    className="py-1 px-2 text-[9px] font-mono font-black animate-bounce bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg cursor-pointer transition-all"
                  >
                    Open Pod
                  </button>
                ) : (
                  <div className="w-16 bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, (1 - (nextCarePackageDay - gameDays) / 30) * 100))}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[10px] text-teal-400 italic font-mono text-center py-1">
                ✨ Infinite building and villager spawn unlocked!
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
