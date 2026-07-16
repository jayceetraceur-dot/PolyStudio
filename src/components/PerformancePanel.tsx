import React, { useState, useEffect, useRef } from 'react';
import { Activity, Cpu, Zap, ChevronDown, ChevronUp, Layers, Users, CircleDot } from 'lucide-react';
import { MapData, Tribesperson } from '../types';

interface PerformancePanelProps {
  mapData: MapData;
  tribe: Tribesperson[];
}

export const PerformancePanel: React.FC<PerformancePanelProps> = ({ mapData, tribe }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fps, setFps] = useState(60);
  const [frameTime, setFrameTime] = useState(16.6);
  const frameTimesRef = useRef<number[]>([]);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const calculateFps = (time: number) => {
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const currentFrameTime = delta;
      setFrameTime(currentFrameTime);

      const currentFps = Math.min(120, Math.round(1000 / Math.max(1, delta)));
      
      // Rolling average of FPS for stability
      frameTimesRef.current.push(currentFps);
      if (frameTimesRef.current.length > 30) {
        frameTimesRef.current.shift();
      }
      
      const avgFps = Math.round(
        frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
      );
      setFps(avgFps);

      requestRef.current = requestAnimationFrame(calculateFps);
    };

    requestRef.current = requestAnimationFrame(calculateFps);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  const activeVillagers = tribe.filter(p => p.isAlive).length;
  const activeAnimals = mapData.animals?.filter(a => !a.isDead).length ?? 0;
  const activeJobs = tribe.filter(p => p.isAlive && p.activeJobType).length;
  const aiUpdateCost = (mapData as any).perfSimulationTimeMs ?? 0;
  
  // Calculate size
  const gridSize = mapData.grid?.length ?? 40;
  const loadedChunks = Math.ceil(gridSize / 6) * Math.ceil(gridSize / 6);

  // Active particles: Estimate campfire smoke, chimney smoke, smelting sparks, and dust particles
  const campfireCount = mapData.grid?.flatMap(row => row || []).filter(cell => cell?.structure?.type === 'Campfire').length ?? 0;
  const smeltingCount = mapData.grid?.flatMap(row => row || []).filter(cell => cell?.structure?.type === 'Smelter' || cell?.structure?.type === 'Forge').length ?? 0;
  const activeParticles = campfireCount * 12 + smeltingCount * 25 + activeAnimals * 2 + 5;

  // Pathfinding Queue Size: Idle villagers awaiting next staggered scheduler tick to evaluate job targets
  const pathfindingQueueSize = tribe.filter(p => p.isAlive && (!p.activeJobType || p.jobTargetCoords === null)).length;

  // CPU load indicator based on AI update cost and frame times
  const cpuLoadPercent = Math.min(100, Math.round((aiUpdateCost / 16.6) * 100));

  const getFpsColor = (f: number) => {
    if (f >= 55) return 'text-emerald-400';
    if (f >= 40) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getMsColor = (ms: number) => {
    if (ms < 3) return 'text-emerald-400';
    if (ms < 8) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div 
      id="perf-panel-root"
      className="fixed bottom-4 right-4 z-50 font-mono text-[11px] bg-slate-950/90 border border-slate-800/80 rounded-lg shadow-2xl backdrop-blur-md text-slate-300 w-64 transition-all duration-200 overflow-hidden"
    >
      {/* Header Panel */}
      <div 
        id="perf-panel-header"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-2.5 bg-slate-900/60 hover:bg-slate-900/90 border-b border-slate-800/50 cursor-pointer select-none transition-colors"
      >
        <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>PERFORMANCE MONITOR</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-bold ${getFpsColor(fps)}`}>{fps} FPS</span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Expanded Metrics Content */}
      {isOpen && (
        <div id="perf-panel-content" className="p-3 space-y-3.5 divide-y divide-slate-800/45">
          {/* Main Rendering Metrics */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Frame Time:</span>
              <span className="font-semibold text-slate-200">{frameTime.toFixed(1)} ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">AI Update Cost:</span>
              <span className={`font-semibold ${getMsColor(aiUpdateCost)}`}>{aiUpdateCost.toFixed(2)} ms</span>
            </div>
            
            {/* CPU Load Progress Meter */}
            <div className="pt-1.5 space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>CPU STRAW (AI TICK)</span>
                <span>{cpuLoadPercent}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden border border-slate-800/30">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    cpuLoadPercent < 35 ? 'bg-emerald-500' : cpuLoadPercent < 70 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${cpuLoadPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Simulation & World Scaling Metrics */}
          <div className="pt-2.5 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1 text-slate-400">
                <Layers className="w-3 h-3 text-sky-400" /> Loaded Chunks:
              </span>
              <span className="text-slate-200 font-semibold">{loadedChunks} <span className="text-[10px] text-slate-500">({gridSize}x{gridSize})</span></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1 text-slate-400">
                <Users className="w-3 h-3 text-violet-400" /> Active Villagers:
              </span>
              <span className="text-slate-200 font-semibold">{activeVillagers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1 text-slate-400">
                <CircleDot className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} /> Active Animals:
              </span>
              <span className="text-slate-200 font-semibold">{activeAnimals}</span>
            </div>
          </div>

          {/* AI Scheduler & Pathfinding Metrics */}
          <div className="pt-2.5 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1 text-slate-400">
                <Zap className="w-3 h-3 text-emerald-400" /> Active Jobs:
              </span>
              <span className="text-slate-200 font-semibold">{activeJobs} / {activeVillagers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1 text-slate-400">
                <Cpu className="w-3 h-3 text-amber-400" /> Pathfinding Queue:
              </span>
              <span className={`font-semibold ${pathfindingQueueSize > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-200'}`}>
                {pathfindingQueueSize} <span className="text-[10px] text-slate-500">idle</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1 text-slate-400">
                <Activity className="w-3 h-3 text-rose-400" /> Active Particles:
              </span>
              <span className="text-slate-200 font-semibold">{activeParticles}</span>
            </div>
          </div>

          {/* Optimization State & Scalable Settings Overview */}
          <div className="pt-2.5 space-y-1.5 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">GRAPHICS QUALITY:</span>
              <span className={`px-1 rounded border text-[9px] font-bold ${
                mapData.settings?.graphicsLevel === 'Low'
                  ? 'text-rose-400 bg-rose-950/40 border-rose-900/30'
                  : 'text-sky-400 bg-sky-950/40 border-sky-900/30'
              }`}>
                {(mapData.settings?.graphicsLevel || 'HIGH').toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">AI TICK RATE:</span>
              <span className={`px-1 rounded border text-[9px] font-bold ${
                mapData.settings?.pathfindingTickRate === 'Slow'
                  ? 'text-emerald-450 bg-emerald-950/40 border-emerald-900/30'
                  : mapData.settings?.pathfindingTickRate === 'Fast'
                    ? 'text-amber-400 bg-amber-950/40 border-amber-900/30'
                    : 'text-slate-400 bg-slate-900/40 border-slate-800/30'
              }`}>
                {(mapData.settings?.pathfindingTickRate || 'Normal').toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-900 text-[9px]">
              <span className="text-slate-500">DYNAMIC CULLING:</span>
              <span className="text-emerald-400 bg-emerald-950/40 px-1 border border-emerald-900/30 rounded font-bold">ACTIVE</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
