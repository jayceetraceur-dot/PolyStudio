import { 
  Sun, 
  Moon, 
  CalendarDays, 
  CloudSun,
  Flame,
  Leaf,
  Snowflake
} from 'lucide-react';

interface WorldClockProps {
  gameDays: number;
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

export default function WorldClock({ gameDays }: WorldClockProps) {
  // Derive details: 30 days per month, 12 months per year (360 days total)
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
    return 'bg-amber-700/10 text-orange-400 border-orange-700/20'; // autumn
  };

  return (
    <div 
      id="world-clock-badge"
      className="flex items-center gap-3.5 pl-3.5 pr-4 py-1.5 rounded-xl border border-slate-200/10 bg-slate-900/40 backdrop-blur-sm shadow-inner text-slate-100"
    >
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-[9px] font-mono font-bold text-slate-500 tracking-widest uppercase">Chronos Cycle</span>
        <div className="flex items-center gap-1.5">
          {/* Active Season badge */}
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono border ${getSeasonTheme(currentMonth.season)}`}>
            {getSeasonLabel(currentMonth.season)}
          </span>
          <span className="text-xs font-mono font-bold">Y{year}, M{monthIndex + 1}, D{day}</span>
        </div>
      </div>

      <div className="w-px h-7 bg-slate-800" />

      {/* Atmospheric Moon/Harvest details */}
      <div className="flex items-center gap-2">
        <div className="p-1 rounded-lg bg-indigo-600/15">
          <SeasonalIcon className={`w-3.5 h-3.5 ${currentMonth.color}`} />
        </div>
        <div>
          <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest block leading-3">Period</span>
          <span className="text-xs font-semibold text-slate-200 block truncate max-w-28 capitalize">{currentMonth.name}</span>
        </div>
      </div>
    </div>
  );
}
