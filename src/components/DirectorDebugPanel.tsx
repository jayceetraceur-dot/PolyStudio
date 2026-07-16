import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Shield, 
  Users, 
  Compass, 
  Coins, 
  BookOpen, 
  Clock, 
  Sliders, 
  Flame, 
  ShieldAlert, 
  Wrench, 
  Heart, 
  Skull, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Calendar, 
  ChevronRight, 
  X,
  Play,
  TrendingUp,
  AlertTriangle,
  Radio
} from 'lucide-react';
import { MapData, Tribesperson } from '../types';
import { calculatePlayerCapability, EVENTS_DECK, checkEventEligibility } from '../utils/aiDirector';

interface DirectorDebugPanelProps {
  mapData: MapData;
  setMapData: React.Dispatch<React.SetStateAction<MapData>>;
  tribe: Tribesperson[];
  setTribe: React.Dispatch<React.SetStateAction<Tribesperson[]>>;
  addLog: (text: string, type: string) => void;
}

export const DirectorDebugPanel: React.FC<DirectorDebugPanelProps> = ({
  mapData,
  setMapData,
  tribe,
  setTribe,
  addLog,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'events' | 'villages' | 'triggers'>('status');

  const directorState = mapData.aiDirector;
  if (!directorState) {
    return null; // Don't show if state isn't initialized yet
  }

  const currentDay = mapData.gameDaysPlayed ?? 0.40;
  const profile = directorState.capabilityProfile;

  // Manual Trigger Force Event
  const handleForceEvent = (eventId: string) => {
    const ev = EVENTS_DECK.find(e => e.id === eventId);
    if (!ev) return;

    setMapData((prev) => {
      const nextMap = { ...prev };
      if (nextMap.aiDirector) {
        nextMap.aiDirector = {
          ...nextMap.aiDirector,
          activeEvent: {
            event: ev,
            triggeredDay: nextMap.gameDaysPlayed ?? 0.40,
            resolved: false,
          }
        };
      }
      return nextMap;
    });

    addLog(`🛠️ DEV: Forced event "${ev.name}" to trigger!`, 'warning');
  };

  // Adjust Intensity Manually
  const handleSetIntensity = (intensity: any) => {
    setMapData((prev) => {
      const nextMap = { ...prev };
      if (nextMap.aiDirector) {
        nextMap.aiDirector = {
          ...nextMap.aiDirector,
          intensity,
          intensityTimer: 0,
        };
      }
      return nextMap;
    });
    addLog(`🛠️ DEV: Adjusted AI Director intensity to ${intensity}`, 'info');
  };

  // Adjust Relationship of off-screen village
  const handleAdjustRelationship = (villageId: string, amount: number) => {
    setMapData((prev) => {
      const nextMap = { ...prev };
      if (nextMap.knownVillages) {
        nextMap.knownVillages = nextMap.knownVillages.map((v) => {
          if (v.id === villageId) {
            return {
              ...v,
              relationship: Math.max(-100, Math.min(100, v.relationship + amount))
            };
          }
          return v;
        });
      }
      return nextMap;
    });
    addLog(`🛠️ DEV: Adjusted off-screen village relation.`, 'info');
  };

  const getIntensityColor = (int: string) => {
    switch (int) {
      case 'Calm': return 'text-sky-400 bg-sky-950/40 border-sky-800/50';
      case 'Low': return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50';
      case 'Medium': return 'text-amber-400 bg-amber-950/40 border-amber-800/50';
      case 'High': return 'text-orange-400 bg-orange-950/40 border-orange-800/50';
      case 'Crisis': return 'text-rose-400 bg-rose-950/40 border-rose-800/50 animate-pulse';
      case 'Recovery': return 'text-indigo-400 bg-indigo-950/40 border-indigo-800/50';
      default: return 'text-slate-400 bg-slate-950/40 border-slate-800/50';
    }
  };

  return (
    <div 
      id="director-debug-panel-root"
      className="fixed bottom-4 left-4 z-50 font-mono text-[11px] bg-slate-950/95 border border-indigo-500/30 rounded-xl shadow-2xl backdrop-blur-md text-slate-300 w-80 transition-all duration-300 overflow-hidden"
      style={{ maxHeight: isOpen ? '550px' : '38px', width: isOpen ? '400px' : '220px' }}
    >
      {/* Header Bar */}
      <div 
        id="director-panel-header"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-2.5 bg-slate-900/80 hover:bg-slate-900 cursor-pointer select-none border-b border-indigo-950 transition-colors"
      >
        <div className="flex items-center gap-1.5 text-slate-200 font-semibold tracking-wider">
          <Sliders className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>DIRECTOR MONITOR</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getIntensityColor(directorState.intensity)}`}>
            {directorState.intensity}
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="flex flex-col h-[510px]">
          {/* Sub Tab Buttons */}
          <div className="grid grid-cols-4 border-b border-slate-800/60 bg-slate-900/40 p-1 gap-1">
            <button 
              onClick={() => setActiveTab('status')}
              className={`py-1 text-[9px] rounded font-bold transition-all ${activeTab === 'status' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              Vitals
            </button>
            <button 
              onClick={() => setActiveTab('events')}
              className={`py-1 text-[9px] rounded font-bold transition-all ${activeTab === 'events' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              Events
            </button>
            <button 
              onClick={() => setActiveTab('villages')}
              className={`py-1 text-[9px] rounded font-bold transition-all ${activeTab === 'villages' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              Villages
            </button>
            <button 
              onClick={() => setActiveTab('triggers')}
              className={`py-1 text-[9px] rounded font-bold transition-all ${activeTab === 'triggers' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              Force
            </button>
          </div>

          {/* Tab Scroll Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            
            {/* --- VITALS TAB --- */}
            {activeTab === 'status' && (
              <div className="space-y-3.5">
                {/* Basic Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800/40">
                    <span className="text-slate-500 text-[9px] block uppercase">Pacing Mode</span>
                    <span className="text-slate-200 font-bold block mt-0.5">{directorState.intensity}</span>
                    <span className="text-slate-400 text-[9px] block mt-1">Timer: {directorState.intensityTimer.toFixed(1)} days</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800/40">
                    <span className="text-slate-500 text-[9px] block uppercase">Difficulty Stage</span>
                    <span className="text-amber-400 font-bold block mt-0.5">{directorState.difficultyStage}</span>
                    <span className="text-slate-400 text-[9px] block mt-1">Reputation: {directorState.playerReputation}</span>
                  </div>
                </div>

                {/* Capability Profile Scores */}
                <div className="space-y-2">
                  <span className="text-indigo-400 font-semibold text-[10px] tracking-wider uppercase block">Tribe Capability Ratings</span>
                  
                  <div className="space-y-1.5 bg-slate-900/40 p-2 rounded border border-indigo-950/30">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-300 flex items-center gap-1"><Users className="w-3 h-3 text-sky-400" /> Population Profile:</span>
                      <span className="text-sky-400 font-bold">{profile.population.total} (W:{profile.population.workers})</span>
                    </div>
                    <div className="text-[9px] text-slate-500 flex justify-between px-1">
                      <span>C:{profile.population.children} / A:{profile.population.adults} / E:{profile.population.elders}</span>
                      <span>Sick:{profile.population.sick} Inj:{profile.population.injured}</span>
                    </div>

                    <div className="h-px bg-slate-800/50 my-1"></div>

                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-300 flex items-center gap-1"><Heart className="w-3 h-3 text-emerald-400" /> Survival Stability:</span>
                      <span className="text-emerald-400 font-bold">{profile.survival.stabilityScore}%</span>
                    </div>
                    <div className="text-[9px] text-slate-500 flex justify-between px-1">
                      <span>Food:{profile.survival.food} | Water:{profile.survival.water}</span>
                      <span>Morale:{profile.survival.morale}%</span>
                    </div>

                    <div className="h-px bg-slate-800/50 my-1"></div>

                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-300 flex items-center gap-1"><Shield className="w-3 h-3 text-amber-400" /> Defense Rating:</span>
                      <span className="text-amber-400 font-bold">{profile.defense.strengthScore}%</span>
                    </div>
                    <div className="text-[9px] text-slate-500 flex justify-between px-1">
                      <span>Fighters:{profile.defense.fighters} | Weapons:{profile.defense.weapons}</span>
                      <span>Towers:{profile.defense.guards}</span>
                    </div>

                    <div className="h-px bg-slate-800/50 my-1"></div>

                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-300 flex items-center gap-1"><Compass className="w-3 h-3 text-indigo-400" /> Migration Readiness:</span>
                      <span className="text-indigo-400 font-bold">{profile.migration.safetyScore}%</span>
                    </div>
                    <div className="text-[9px] text-slate-500 flex justify-between px-1">
                      <span>Cap:{profile.migration.capacity}kg | Herd:{profile.migration.animals}</span>
                    </div>

                    <div className="h-px bg-slate-800/50 my-1"></div>

                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-300 flex items-center gap-1"><Flame className="w-3 h-3 text-rose-400 animate-pulse" /> Recent Stress Index:</span>
                      <span className="text-rose-400 font-bold">{profile.stressScore}%</span>
                    </div>
                  </div>
                </div>

                {/* Stress history metrics */}
                <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800/40 text-[9px] space-y-1 text-slate-400">
                  <span className="text-[10px] text-slate-300 font-bold block mb-1">Stress History Matrix</span>
                  <div className="flex justify-between">
                    <span>Deaths: {directorState.recentStress.recentDeaths}</span>
                    <span>Last Raid: {directorState.recentStress.recentRaid > 0 ? `Day ${directorState.recentStress.recentRaid.toFixed(1)}` : 'None'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Food Crisis: {directorState.recentStress.recentFoodShortage > 0 ? `Day ${directorState.recentStress.recentFoodShortage.toFixed(1)}` : 'None'}</span>
                    <span>Last Sickness Wave: {directorState.recentStress.recentIllnessOutbreak > 0 ? `Day ${directorState.recentStress.recentIllnessOutbreak.toFixed(1)}` : 'None'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* --- EVENTS TAB --- */}
            {activeTab === 'events' && (
              <div className="space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-indigo-400 font-semibold text-[10px] tracking-wider uppercase block">Event Eligibility List</span>
                  <span className="text-slate-500 text-[9px]">Roll Day: {(directorState as any).lastEventRollDay?.toFixed(1) ?? 'N/A'}</span>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {EVENTS_DECK.map((ev) => {
                    const check = checkEventEligibility(ev, profile, directorState, currentDay);
                    return (
                      <div 
                        key={ev.id} 
                        className={`p-2 rounded border text-[10px] flex flex-col gap-1 transition-colors ${
                          check.eligible 
                            ? 'bg-emerald-950/10 border-emerald-900/30 text-emerald-100 hover:bg-emerald-950/20' 
                            : 'bg-rose-950/5 border-rose-950/30 text-slate-400 opacity-60'
                        }`}
                      >
                        <div className="flex justify-between font-bold items-center">
                          <span>{ev.name}</span>
                          <span className="text-[8px] uppercase tracking-wider px-1 bg-slate-900 border border-slate-700/50 rounded">
                            {ev.category}
                          </span>
                        </div>
                        {!check.eligible && (
                          <span className="text-[8px] text-rose-400 italic">
                            Blocked: {check.reason}
                          </span>
                        )}
                        {check.eligible && (
                          <div className="flex items-center justify-between text-[8px] text-emerald-400">
                            <span>Intensity: {ev.intensity}</span>
                            <span className="underline cursor-pointer" onClick={() => handleForceEvent(ev.id)}>Force Trigger</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Timers & Cooldowns */}
                <div className="space-y-2 bg-slate-900/60 p-2.5 rounded border border-slate-800/40">
                  <span className="text-indigo-400 font-semibold text-[10px] tracking-wider uppercase block">Category Cooldown Blocks</span>
                  <div className="grid grid-cols-2 gap-1.5 text-[9px] text-slate-400">
                    {Object.entries(directorState.eventCooldowns).map(([cat, daysVal]) => {
                      const days = daysVal as number;
                      if (days <= 0) return null;
                      return (
                        <div key={cat} className="flex justify-between border-b border-slate-800/40 pb-0.5">
                          <span className="text-slate-300">{cat}:</span>
                          <span className="text-rose-400 font-bold">{days.toFixed(1)}d</span>
                        </div>
                      );
                    })}
                    {Object.values(directorState.eventCooldowns).every(d => (d as number) <= 0) && (
                      <span className="text-emerald-400 col-span-2">All category timers cleared. Ready to roll!</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* --- OFF-SCREEN VILLAGES AI DECISIONS --- */}
            {activeTab === 'villages' && (
              <div className="space-y-3">
                <span className="text-indigo-400 font-semibold text-[10px] tracking-wider uppercase block">Off-Screen Settlement States</span>
                
                <div className="space-y-2.5">
                  {mapData.knownVillages?.map((v) => {
                    const relationColor = v.relationship >= 40 ? 'text-emerald-400' : v.relationship <= -35 ? 'text-rose-400' : 'text-amber-400';
                    return (
                      <div key={v.id} className="bg-slate-900/60 p-2 rounded border border-slate-800/50 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-100">
                          <span>{v.name}</span>
                          <span className="text-[8px] text-slate-400 font-mono">Dist: {v.distance}km</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-[9px]">
                          <span>Relation: <span className={`font-bold ${relationColor}`}>{v.relationship}</span></span>
                          <span>Trust: <span className="text-indigo-300 font-bold">{v.trust}%</span></span>
                        </div>

                        {/* Adjust values */}
                        <div className="flex gap-1.5 pt-1">
                          <button 
                            onClick={() => handleAdjustRelationship(v.id, 15)}
                            className="flex-1 py-0.5 bg-emerald-950 border border-emerald-800 hover:bg-emerald-900 text-emerald-300 rounded text-[8px] font-bold"
                          >
                            +15 Relation
                          </button>
                          <button 
                            onClick={() => handleAdjustRelationship(v.id, -15)}
                            className="flex-1 py-0.5 bg-rose-950 border border-rose-800 hover:bg-rose-900 text-rose-300 rounded text-[8px] font-bold"
                          >
                            -15 Relation
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(!mapData.knownVillages || mapData.knownVillages.length === 0) && (
                    <span className="text-slate-500 italic block">No known neighboring settlements registered.</span>
                  )}
                </div>
              </div>
            )}

            {/* --- TRIGGER/OVERRIDE TAB --- */}
            {activeTab === 'triggers' && (
              <div className="space-y-3.5">
                <span className="text-indigo-400 font-semibold text-[10px] tracking-wider uppercase block">Director State overrides</span>

                {/* Intensity adjust list */}
                <div className="space-y-1.5">
                  <span className="text-slate-400 text-[9px] block">Set Current Intensity State:</span>
                  <div className="grid grid-cols-3 gap-1">
                    {['Calm', 'Low', 'Medium', 'High', 'Crisis', 'Recovery'].map((int) => (
                      <button
                        key={int}
                        onClick={() => handleSetIntensity(int)}
                        className={`py-1 text-[8px] font-bold rounded border transition-colors ${
                          directorState.intensity === int 
                            ? 'bg-indigo-600 text-white border-indigo-400' 
                            : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        {int}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-slate-800/50"></div>

                {/* Instant Action shortcuts */}
                <div className="space-y-2">
                  <span className="text-slate-400 text-[9px] block font-semibold">Immediate Scenario Starters:</span>
                  
                  <div className="space-y-1 text-[9px]">
                    <button 
                      onClick={() => handleForceEvent('raider_attack_event')}
                      className="w-full text-left py-1 px-2 rounded bg-rose-950/35 border border-rose-900/30 hover:bg-rose-900/40 text-rose-300 font-bold flex justify-between"
                    >
                      <span>🔥 Force Organized Raider Siege</span>
                      <Play className="w-2.5 h-2.5 self-center" />
                    </button>
                    <button 
                      onClick={() => handleForceEvent('predator_stalking')}
                      className="w-full text-left py-1 px-2 rounded bg-amber-950/35 border border-amber-900/30 hover:bg-amber-950/50 text-amber-300 font-bold flex justify-between"
                    >
                      <span>🐾 Force Apex Predator Stalking tracks</span>
                      <Play className="w-2.5 h-2.5 self-center" />
                    </button>
                    <button 
                      onClick={() => handleForceEvent('visiting_merchant')}
                      className="w-full text-left py-1 px-2 rounded bg-sky-950/35 border border-sky-900/30 hover:bg-sky-950/50 text-sky-300 font-bold flex justify-between"
                    >
                      <span>🚚 Force Floating Trade Caravan Arrival</span>
                      <Play className="w-2.5 h-2.5 self-center" />
                    </button>
                    <button 
                      onClick={() => handleForceEvent('rescue_trapped_scout')}
                      className="w-full text-left py-1 px-2 rounded bg-emerald-950/35 border border-emerald-900/30 hover:bg-emerald-950/50 text-emerald-300 font-bold flex justify-between"
                    >
                      <span>🏕️ Force Trapped Scout Distress S.O.S</span>
                      <Play className="w-2.5 h-2.5 self-center" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Diagnostic Timeline */}
          <div className="p-2 border-t border-slate-800/60 bg-slate-900/20 text-[8px] text-slate-500 flex justify-between">
            <span>Clock: Day {currentDay.toFixed(2)}</span>
            <span>Director Engine Live v1.2</span>
          </div>
        </div>
      )}
    </div>
  );
};
