import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Lightbulb, 
  Hammer, 
  Cpu, 
  Users, 
  Flame, 
  Play, 
  Pause,
  RotateCw
} from 'lucide-react';

export interface GodTip {
  id: string;
  category: 'building' | 'crafting' | 'simulation' | 'survival' | 'powers';
  title: string;
  text: string;
}

export const GOD_TIPS: GodTip[] = [
  {
    id: 'shelter_need',
    category: 'survival',
    title: 'Divine Shelter & Health',
    text: 'Tribespeople need a warm place to rest during cold nights. Build Shelters (15 Wood, 5 Stone) so they can recover health and energy. Unsheltered pioneers will lose health over time!'
  },
  {
    id: 'priorities_system',
    category: 'simulation',
    title: 'Job Allocation & Priorities',
    text: 'Click on a tribesperson to customize their job priorities. High priority categories (like Gathering or Building) are evaluated first. Toggle off jobs to keep them focused on critical tasks!'
  },
  {
    id: 'artisan_crafting',
    category: 'crafting',
    title: 'Artisan Labor Boost',
    text: 'Crafting complex items in your blueprints queue requires skilled hands. Set a tribesperson\'s role to "Artisan" in their details panel to boost active crafting speeds by +150% per active artisan!'
  },
  {
    id: 'science_machine_points',
    category: 'building',
    title: 'Lore & Passive Research',
    text: 'Build Science Machines to passively unlock research points. You can also assign scholars to study ancient obelisks and giant skeletal remains to reveal advanced schematic designs!'
  },
  {
    id: 'gathering_tools',
    category: 'crafting',
    title: 'Tribal Gear & Tool Speeds',
    text: 'Crafting tools like CopperAxes or GoldPicks speeds up harvesting. Once stored in the stockpile, tribespeople with gathering duties will automatically seek out, equip, and utilize these tools!'
  },
  {
    id: 'fireplace_heat',
    category: 'survival',
    title: 'Fireplaces Shield Against Frost',
    text: 'Building a Fireplace shields your community from hazardous frosts during cold nights, providing high-efficiency warmth, health restoration, and faster nutrition recovery in its radius.'
  },
  {
    id: 'greenhouse_food',
    category: 'building',
    title: 'Hydroponic Petrified Greenhouses',
    text: 'Once researched, Petrified Greenhouses can grow highly nutritious crops on any terrain, producing a continuous stream of food to feed a growing clan.'
  },
  {
    id: 'scouting_scouts',
    category: 'simulation',
    title: 'Clearing the Mist with Scouts',
    text: 'Dark fog of war shrouds the outer regions of your diorama colony. Set a tribesperson\'s priority to "Scouting" so they clear fog layers, discovering fertile soil, rich deposits, and mysterious relics!'
  },
  {
    id: 'care_packages',
    category: 'powers',
    title: 'Celestial Care Packages',
    text: 'Every few days, the Guarding Deity can select and materialize a celestial Care Package containing emergency materials, exotic resources, or skilled new pioneers!'
  }
];

export function GodTips() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverRef = useRef(false);

  // Transition to next tip
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % GOD_TIPS.length);
    setProgress(0);
  };

  // Transition to previous tip
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + GOD_TIPS.length) % GOD_TIPS.length);
    setProgress(0);
  };

  // Tick the autoplay and progressive bar
  useEffect(() => {
    if (!isPlaying || !isVisible) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    const intervalTime = 60000; // 60 seconds per tip
    const stepTime = 200; // tick progress every 200ms
    const totalSteps = intervalTime / stepTime;

    progressTimerRef.current = setInterval(() => {
      if (hoverRef.current) return; // Pause on hover to allow detailed reading

      setProgress((p) => {
        if (p >= 100) {
          handleNext();
          return 0;
        }
        return p + (100 / totalSteps);
      });
    }, stepTime);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isPlaying, isVisible, currentIndex]);

  const activeTip = GOD_TIPS[currentIndex];

  const getIconForCategory = (cat: string) => {
    switch (cat) {
      case 'survival':
        return <Flame size={16} className="text-amber-500 animate-pulse" />;
      case 'building':
        return <Hammer size={16} className="text-blue-400" />;
      case 'crafting':
        return <Cpu size={16} className="text-indigo-400" />;
      case 'simulation':
        return <Users size={16} className="text-emerald-400" />;
      case 'powers':
        return <Sparkles size={16} className="text-amber-300" />;
      default:
        return <Lightbulb size={16} className="text-teal-400" />;
    }
  };

  return (
    <>
      <AnimatePresence>
        {isVisible ? (
          <motion.div
            id="god-tips-popup"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20 }}
            onMouseEnter={() => { hoverRef.current = true; }}
            onMouseLeave={() => { hoverRef.current = false; }}
            className="fixed bottom-[74px] right-[20px] md:bottom-[80px] md:right-[24px] z-45 w-[330px] max-w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Header / Category Identifier */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-950/60 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                {getIconForCategory(activeTip.category)}
                <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                  Guarding Wisdom • {activeTip.category}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  title={isPlaying ? "Pause rotation" : "Auto-rotate tips"}
                  className="p-1 hover:bg-slate-800 rounded transition text-slate-400 hover:text-slate-200"
                >
                  {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                </button>
                <button 
                  onClick={() => setIsVisible(false)}
                  title="Dismiss wisdom list"
                  className="p-1 hover:bg-slate-800 rounded transition text-slate-400 hover:text-rose-400"
                >
                  <X size={11} />
                </button>
              </div>
            </div>

            {/* Content Segment */}
            <div className="p-3.5 select-none">
              <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1">
                💡 {activeTip.title}
              </h3>
              <p className="mt-1.5 text-[11px] text-slate-300 leading-relaxed font-sans">
                {activeTip.text}
              </p>
            </div>

            {/* Stepper controls */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-950/30 border-t border-slate-800/60">
              <span className="text-[10px] font-mono text-slate-500 font-medium">
                Tip {currentIndex + 1} of {GOD_TIPS.length}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrev}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleNext}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Autoplay loading indicator slider bar */}
            {isPlaying && (
              <div className="w-full h-[2.5px] bg-slate-950/80">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-r-sm transition-all duration-200 ease-linear shadow-[0_0_4px_rgba(6,182,212,0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </motion.div>
        ) : (
          <motion.button
            id="god-tips-trigger"
            onClick={() => setIsVisible(true)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            className="fixed bottom-[74px] right-[20px] md:bottom-[80px] md:right-[24px] z-45 p-2 bg-gradient-to-tr from-slate-900 via-slate-950 to-slate-900 border border-slate-700/60 hover:border-teal-500/60 rounded-xl text-slate-300 hover:text-teal-400 shadow-xl flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer"
          >
            <Lightbulb size={13} className="text-teal-400 animate-pulse" />
            <span>Divine Tips</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
