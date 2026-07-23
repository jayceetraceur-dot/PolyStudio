import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  HelpCircle, 
  Users, 
  Flame, 
  Sparkles, 
  Compass, 
  Coins, 
  CheckCircle,
  AlertTriangle,
  X,
  Play
} from 'lucide-react';
import { MapData, Tribesperson, DirectorEvent, DirectorChoice } from '../types';
import { resolveEventChoice } from '../utils/aiDirector';
import { startVisualEventSequence } from '../utils/visualEventExecutor';

interface DirectorEventModalProps {
  mapData: MapData;
  setMapData: React.Dispatch<React.SetStateAction<MapData>>;
  tribe: Tribesperson[];
  setTribe: React.Dispatch<React.SetStateAction<Tribesperson[]>>;
  addLog: (text: string, type: string) => void;
}

export const DirectorEventModal: React.FC<DirectorEventModalProps> = ({
  mapData,
  setMapData,
  tribe,
  setTribe,
  addLog,
}) => {
  const activeEventObj = mapData.aiDirector?.activeEvent;
  const [resolutionText, setResolutionText] = useState<string | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);

  if (!activeEventObj || (activeEventObj as any).deferred) {
    return null;
  }

  if (activeEventObj.resolved && !resolutionText) {
    return null;
  }

  const event: DirectorEvent = activeEventObj.event;

  // Defer / Close Decision to come back later
  const handleDefer = () => {
    setMapData((prev) => {
      const nextMap = { ...prev };
      if (nextMap.aiDirector && nextMap.aiDirector.activeEvent) {
        nextMap.aiDirector = {
          ...nextMap.aiDirector,
          activeEvent: {
            ...nextMap.aiDirector.activeEvent,
            deferred: true,
          } as any
        };
      }
      return nextMap;
    });
    addLog(`⏳ Event "${event.name}" deferred. You can reopen it via the active Chronos event panel on the HUD before it expires!`, 'info');
  };

  // Reject the event if rejectable
  const isRejectable = !!(event as any).isRejectable;
  const rejectChoice = event.choices?.find(c => ['decline', 'ignore', 'reject', 'avoid'].includes(c.id)) || event.choices?.[event.choices.length - 1];

  const handleRejectEvent = () => {
    if (rejectChoice) {
      handleSelectChoice(rejectChoice);
    } else {
      setMapData((prev) => {
        const nextMap = { ...prev };
        if (nextMap.aiDirector) {
          nextMap.aiDirector = {
            ...nextMap.aiDirector,
            activeEvent: null,
          };
        }
        return nextMap;
      });
      addLog(`🚫 Event "${event.name}" was rejected.`, 'warning');
    }
  };

  // Helper to check if a choice is affordable based on stockpile
  const getChoiceStatus = (choiceId: string): { affordable: boolean; message?: string } => {
    const s = mapData.stockpile || {};
    
    switch (event.id) {
      case 'spoiled_food_warning':
        if (choiceId === 'clean' && (s.medicine ?? 0) < 5) return { affordable: false, message: 'Requires 5 Medicine' };
        if (choiceId === 'burn' && (s.food ?? 0) < 15) return { affordable: false, message: 'Requires 15 Food' };
        break;
      case 'pack_birds_migration':
        if (choiceId === 'tame' && (s.berries ?? 0) < 20) return { affordable: false, message: 'Requires 20 Berries' };
        break;
      case 'predator_stalking':
        if (choiceId === 'bait' && ((s.meat ?? 0) < 10 || (s.medicine ?? 0) < 2)) return { affordable: false, message: 'Requires 10 Meat, 2 Medicine' };
        if (choiceId === 'fortify' && (s.wood ?? 0) < 15) return { affordable: false, message: 'Requires 15 Wood' };
        break;
      case 'beast_disease':
        if (choiceId === 'treat' && ((s.fiber ?? 0) < 10 || (s.medicine ?? 0) < 4)) return { affordable: false, message: 'Requires 10 Fiber, 4 Medicine' };
        break;
      case 'tribal_dispute':
        if (choiceId === 'feast' && (s.food ?? 0) < 20) return { affordable: false, message: 'Requires 20 Food' };
        break;
      case 'apprentice_breakthrough':
        if (choiceId === 'recipes' && (s.copper ?? 0) < 10) return { affordable: false, message: 'Requires 10 Copper' };
        break;
      case 'memorial_ritual':
        if ((s.food ?? 0) < 15) return { affordable: false, message: 'Requires 15 Food' };
        break;
      case 'vision_celestial':
        if (choiceId === 'sacrifice' && (s.copper ?? 0) < 10) return { affordable: false, message: 'Requires 10 Copper' };
        break;
      case 'future_biome_forecast':
        if (choiceId === 'scout' && (s.food ?? 0) < 10) return { affordable: false, message: 'Requires 10 Food' };
        break;
      case 'visiting_merchant':
        if (choiceId === 'trade' && (s.copper ?? 0) < 20) return { affordable: false, message: 'Requires 20 Copper' };
        if (choiceId === 'hire' && (s.silver ?? 0) < 10) return { affordable: false, message: 'Requires 10 Silver' };
        break;
      case 'emergency_trade_request':
        if (choiceId === 'help' && (s.wood ?? 0) < 40) return { affordable: false, message: 'Requires 40 Wood' };
        break;
      case 'rival_village_threat':
        if (choiceId === 'pay' && (s.silver ?? 0) < 20) return { affordable: false, message: 'Requires 20 Silver' };
        if (choiceId === 'negotiate' && (s.berries ?? 0) < 10) return { affordable: false, message: 'Requires 10 Berries' };
        break;
      case 'rescue_trapped_scout':
        if (choiceId === 'save' && ((s.food ?? 0) < 15 || (s.spear ?? 0) < 1)) return { affordable: false, message: 'Requires 15 Food, 1 Spear' };
        break;
      case 'raider_scouts_harassment':
        if (choiceId === 'bribe' && (s.copper ?? 0) < 15) return { affordable: false, message: 'Requires 15 Copper' };
        break;
      case 'raider_attack_event':
        if (choiceId === 'evacuate' && ((s.wood ?? 0) < 40 || (s.stone ?? 0) < 40 || (s.food ?? 0) < 30)) {
          return { affordable: false, message: 'Requires 40 Wood, 40 Stone, 30 Food' };
        }
        if (choiceId === 'bribe_gold' && (s.gold ?? 0) < 8) return { affordable: false, message: 'Requires 8 Gold' };
        break;
      case 'storm_surge_extreme':
        if (choiceId === 'discharge' && (s.ancientMaterials ?? 0) < 8) return { affordable: false, message: 'Requires 8 Ancient Materials' };
        break;
    }

    return { affordable: true };
  };

  const handleSelectChoice = (choice: DirectorChoice) => {
    const status = getChoiceStatus(choice.id);
    if (!status.affordable) return; // Prevent clicking disabled options

    setSelectedChoiceId(choice.id);

    // Initialize physical visual event executor in game world
    const nextMap = startVisualEventSequence(event, choice, mapData, tribe, addLog);

    setResolutionText(`Physical world sequence initialized! Strategy "${choice.text}" is now executing in the game world. Track progress via the active event panel on your HUD.`);

    setMapData(nextMap);
  };

  const handleClose = () => {
    // Clear the activeEvent resolved flag completely so it fades out
    setMapData((prev) => {
      const nextMap = { ...prev };
      if (nextMap.aiDirector) {
        nextMap.aiDirector = {
          ...nextMap.aiDirector,
          activeEvent: null, // Clear active event completely
        };
      }
      return nextMap;
    });

    setResolutionText(null);
    setSelectedChoiceId(null);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Danger': return <ShieldAlert className="w-6 h-6 text-rose-500" />;
      case 'Wildlife': return <Flame className="w-6 h-6 text-amber-500 animate-pulse" />;
      case 'Social': return <Users className="w-6 h-6 text-sky-400" />;
      case 'Oracle': return <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />;
      case 'Migration': return <Compass className="w-6 h-6 text-indigo-400" />;
      case 'Trade': return <Coins className="w-6 h-6 text-yellow-500" />;
      default: return <HelpCircle className="w-6 h-6 text-slate-400" />;
    }
  };

  const getCategoryBorder = (cat: string) => {
    switch (cat) {
      case 'Danger': return 'border-rose-600/40 bg-slate-900 shadow-rose-900/10';
      case 'Wildlife': return 'border-amber-600/40 bg-slate-900 shadow-amber-900/10';
      case 'Social': return 'border-sky-500/40 bg-slate-900 shadow-sky-900/10';
      case 'Oracle': return 'border-purple-500/40 bg-slate-900 shadow-purple-900/10';
      case 'Migration': return 'border-indigo-500/40 bg-slate-900 shadow-indigo-900/10';
      case 'Trade': return 'border-yellow-500/40 bg-slate-900 shadow-yellow-900/10';
      default: return 'border-slate-700 bg-slate-900';
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="director-event-overlay" 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`border rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl flex flex-col gap-5 text-slate-100 ${getCategoryBorder(event.category)}`}
        >
          {/* Header row */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-950 rounded-2xl border border-slate-800">
                {getCategoryIcon(event.category)}
              </div>
              <div className="flex-1">
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#cfad8c] uppercase block">
                  🔴 Chronos Tribal Event: {event.category}
                </span>
                <h2 className="text-base font-sans font-extrabold tracking-tight text-white mt-0.5">
                  {event.name}
                </h2>
              </div>
            </div>

            {/* Top-right Close/Defer button */}
            <button
              onClick={handleDefer}
              className="p-1 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer shrink-0"
              title="Close and Decide Later"
              id="close-defer-modal-btn"
            >
              <X size={16} />
            </button>
          </div>

          {/* Core Content or Resolution text */}
          {!resolutionText ? (
            <>
              {/* Event Time-Limited Countdown Window */}
              {(() => {
                const currentDay = mapData.gameDays ?? 0;
                const expires = activeEventObj.expiresDay ?? (activeEventObj.triggeredDay + (event.durationDays ?? 1.5));
                const daysRemaining = Math.max(0, expires - currentDay);
                const hoursRemaining = Math.max(0, daysRemaining * 24);
                const totalDuration = event.durationDays ?? 1.5;
                const elapsed = currentDay - activeEventObj.triggeredDay;
                const percentRemaining = Math.max(0, Math.min(100, ((totalDuration - elapsed) / totalDuration) * 100));

                return (
                  <div className="flex flex-col gap-1.5 bg-slate-950/45 p-3.5 rounded-2xl border border-slate-800/40 font-sans">
                    <div className="flex justify-between items-center text-[10px] font-mono leading-none">
                      <span className="text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1">
                        ⏳ Chronos Timer Window
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${
                        hoursRemaining < 6 
                          ? 'bg-rose-950/50 border border-rose-800/40 text-rose-400 font-extrabold animate-pulse' 
                          : 'bg-amber-950/50 border border-amber-800/40 text-amber-400 font-bold'
                      }`}>
                        {hoursRemaining.toFixed(1)} hours remaining ({daysRemaining.toFixed(2)} days)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900/60 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-850">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          hoursRemaining < 6 ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                        }`}
                        style={{ width: `${percentRemaining}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Event Description */}
              <div className="bg-slate-950/55 p-4 rounded-2xl border border-slate-800/40 text-slate-300 text-[11px] leading-relaxed font-sans">
                {event.description}
              </div>

              {/* Event Options List */}
              <div className="space-y-2 pt-2">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Select your path:</span>
                {event.choices?.map((choice) => {
                  const status = getChoiceStatus(choice.id);
                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleSelectChoice(choice)}
                      disabled={!status.affordable}
                      className={`w-full text-left p-3.5 rounded-xl border font-sans text-xs flex justify-between items-center transition-all ${
                        status.affordable 
                          ? 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 cursor-pointer text-slate-100 shadow-sm' 
                          : 'bg-slate-950/40 border-slate-950 text-slate-500 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 pr-2">
                        <span className="font-semibold text-[11px] tracking-wide text-slate-200">
                          {choice.text}
                        </span>
                        <span className="text-[10px] text-slate-400 italic">
                          {choice.tooltip}
                        </span>
                      </div>
                      
                      {!status.affordable ? (
                        <span className="px-2 py-0.5 rounded bg-rose-950/30 border border-rose-900/40 text-rose-400 text-[8px] font-mono font-bold shrink-0 uppercase tracking-wider">
                          {status.message}
                        </span>
                      ) : (
                        <Play className="w-3 h-3 text-slate-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Defer and Reject action buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-800/60">
                <button
                  onClick={handleDefer}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-[10px] font-mono tracking-wider uppercase border border-slate-700/60 transition-colors cursor-pointer text-center"
                  id="defer-decision-btn"
                >
                  ⏳ Close & Decide Later
                </button>
                
                {isRejectable ? (
                  <button
                    onClick={handleRejectEvent}
                    className="flex-1 py-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 rounded-xl text-[10px] font-mono tracking-wider uppercase border border-rose-900/30 transition-colors cursor-pointer text-center"
                    id="reject-event-btn"
                  >
                    🚫 Reject Event
                  </button>
                ) : (
                  <div className="flex-1 py-2 bg-slate-950/40 text-slate-500 rounded-xl text-[9px] font-mono tracking-wider uppercase border border-slate-900/50 cursor-not-allowed text-center select-none flex items-center justify-center" title="This critical event cannot be rejected!">
                    ⚠️ Cannot Reject
                  </div>
                )}
              </div>
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 py-4 text-center flex flex-col items-center"
            >
              <div className="w-12 h-12 bg-emerald-950/40 border border-emerald-800/60 rounded-full flex items-center justify-center text-emerald-400 mb-2">
                <CheckCircle className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-sans font-extrabold text-sm text-emerald-400">Decision Enacted</h3>
              <p className="text-slate-300 text-xs font-sans max-w-sm leading-relaxed">
                {resolutionText}
              </p>

              <button
                onClick={handleClose}
                className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all duration-200"
                id="continue-adventure-btn"
              >
                Continue Adventure
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
