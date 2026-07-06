import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wind, 
  CloudRain, 
  TrendingUp, 
  MapPin, 
  Users, 
  Handshake, 
  MessageSquare, 
  Compass, 
  HelpCircle, 
  Shield, 
  Activity, 
  ChevronRight, 
  Sparkles, 
  BookOpen, 
  Clock, 
  Coins, 
  ArrowRightLeft,
  X,
  UserCheck,
  AlertTriangle,
  Flame,
  Droplets,
  Heart
} from 'lucide-react';
import { Tribesperson, MapData, OtherVillage, OracleMessage, DiscoveredRelic } from '../types';

interface OracleHubProps {
  mapData: MapData;
  setMapData: React.Dispatch<React.SetStateAction<MapData>>;
  tribe: Tribesperson[];
  setTribe: React.Dispatch<React.SetStateAction<Tribesperson[]>>;
  oracle: Tribesperson;
  onClose: () => void;
  addLog: (text: string, type: string) => void;
  gameDays: number;
}

const ORACLE_LEVELS = [
  { level: 1, title: 'Storm Reader', perk: 'Predict storm direction and time before migration (±3 days)' },
  { level: 2, title: 'Weather Reader', perk: 'Predict storm speed and exact migration countdown' },
  { level: 3, title: 'Biome Forecaster', perk: 'Scan upcoming biome names and expected characteristics' },
  { level: 4, title: 'Resource Forecaster', perk: 'Assess resource concentrations and mineral deposits' },
  { level: 5, title: 'Animal Forecaster', perk: 'Predict wildlife migrations and hunting abundance' },
  { level: 6, title: 'Distant Signal Listener', perk: 'Pick up orbital static signals & ancient precursor distress calls' },
  { level: 7, title: 'Diplomatic Oracle', perk: 'Contact distant settlements and secure peaceful trade' },
  { level: 8, title: 'Relic Interpreter', perk: 'Translate precursor ruins and unlock high-level blueprints' },
  { level: 9, title: 'Long Path Seer', perk: 'Map out multi-region migration paths with 100% confidence' },
  { level: 10, title: 'Master Oracle', perk: 'Attain ultimate union with the Storm. Unlock Storm-breaking blueprints' }
];

const PREDICTED_BIOMES = [
  { name: 'Petrified Forest', expectedRes: 'Wood, Ancient Materials, Stone', expectedAni: 'PackBird, Vulture', risk: 'Low', usefulness: 'Excellent wood logging & precursor ruin scouting', story: 'A vast expanse of calcified prehistoric trees. Humid wind currents suggest the next Eye coordinates will rest over these ancient branches.' },
  { name: 'Salt Flats', expectedRes: 'Stone, Silver, Gold', expectedAni: 'None', risk: 'Medium', usefulness: 'High mineral harvesting but extremely dry', story: 'A gleaming white desert basin. Survival requires storing ample water, but the exposed bedrock holds rich metal deposits.' },
  { name: 'Bloomfields', expectedRes: 'Beries, Roots, Fiber', expectedAni: 'Deer, Sheep, Rabbit', risk: 'Low', usefulness: 'Abundant wild gathering and mild weather', story: 'A lush grassland sheltered by towering thermal cliffs. Excellent location to rest, feed livestock, and replenish tribal food stockpiles.' },
  { name: 'Fossil Fields', expectedRes: 'Bone, Stone, Ancient Materials', expectedAni: 'ApexPredator, Hyena', risk: 'High', usefulness: 'Rare relics and fossils but infested with scavengers', story: 'The burial grounds of sky-beasts that failed to escape the storm wall centuries ago. Precursor energy fields are still active here.' },
  { name: 'Rocky Highlands', expectedRes: 'Stone, Copper, Iron, Silver', expectedAni: 'WildGoat, Wolf', risk: 'High', usefulness: 'Mining and smelting opportunities, cold air current', story: 'A high-altitude, wind-battered ridge. Terrifying lightning strikes are common, but the exposed veins of iron and copper are rich.' },
  { name: 'Ruined Zone', expectedRes: 'Ancient Materials, Relics, Gold', expectedAni: 'DireWolf, Crow', risk: 'Extreme', usefulness: 'Extremely high relic research value, dangerous predators', story: 'The colossal remains of a precursor dome shield. Heavy electrostatic discharge remains, but the central archives are ripe for decrypting.' },
  { name: 'Dry Basin', expectedRes: 'Fossil Resin, Stone, Roots', expectedAni: 'Antelope, Fox', risk: 'Medium', usefulness: 'Moderate survival, sparse vegetation', story: 'An arid valley where the storm recently raged. The air is dry and dusty, but hidden subterranean springs can be tapped.' }
];

export const OracleHub: React.FC<OracleHubProps> = ({
  mapData,
  setMapData,
  tribe,
  setTribe,
  oracle,
  onClose,
  addLog,
  gameDays
}) => {
  const [activeTab, setActiveTab] = useState<'storm' | 'migration' | 'biomes' | 'resources' | 'villages' | 'trade' | 'messages' | 'relics'>('storm');
  const [selectedVillageId, setSelectedVillageId] = useState<string>('v1');
  const [selectedRelicId, setSelectedRelicId] = useState<string>('');

  // Cart/Trade State
  const [tradeCart, setTradeCart] = useState<Record<string, number>>({});
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');

  const oracleLevel = oracle.skills.Oracle?.level ?? 1;
  const oracleXP = oracle.skills.Oracle?.xp ?? 0;
  const oracleXPToNext = oracle.skills.Oracle?.xpToNextLevel ?? 100;
  const currentDays = mapData.stormDaysUntilMigration ?? 12;

  // Determine prediction error based on level
  const getPredictionDetails = () => {
    if (oracleLevel >= 9) {
      return { confidence: 100, errorDays: 0, text: 'Perfect long-term alignment.' };
    } else if (oracleLevel >= 5) {
      return { confidence: 85, errorDays: 0.5, text: 'Strong weather coordination.' };
    } else if (oracleLevel >= 3) {
      return { confidence: 65, errorDays: 1.5, text: 'Moderate pre-storm static readings.' };
    } else {
      return { confidence: 45, errorDays: 3.0, text: 'Unreliable wind sensory perception.' };
    }
  };

  const { confidence, errorDays, text: confidenceText } = getPredictionDetails();

  // Calculations for Migration Tab
  const unpackedCount = mapData.grid.reduce((acc, row) => {
    return acc + row.filter(cell => cell.structure && !cell.structure.isPackable && cell.structure.condition < 100).length;
  }, 0);

  const elders = tribe.filter(p => p.isAlive && p.ageYears >= 60);
  const children = tribe.filter(p => p.isAlive && p.agePhase === 'Child');
  const injured = tribe.filter(p => p.isAlive && p.stats.health < 40);

  const bigBeastTamedAndTransport = mapData.animals?.filter(ani => 
    ani.isTame && 
    (ani as any).assignedJobType === 'transport' && 
    !['Rabbit', 'Sheep', 'WildGoat'].includes(ani.type)
  ) || [];

  const caravanReady = bigBeastTamedAndTransport.length > 0;

  // Helper to handle village interaction
  const handleIncreaseRelationship = (villageId: string, amount: number, costResource: string, costQty: number) => {
    const currentQty = mapData.stockpile[costResource] || 0;
    if (currentQty < costQty) {
      addLog(`⚠️ Cannot send gift: Need ${costQty} ${costResource}!`, 'warning');
      return;
    }

    setMapData(prev => {
      const next = { ...prev };
      next.stockpile = { ...prev.stockpile, [costResource]: currentQty - costQty };
      if (next.knownVillages) {
        next.knownVillages = next.knownVillages.map(v => {
          if (v.id === villageId) {
            const rel = Math.min(100, Math.max(-100, v.relationship + amount));
            const trust = Math.min(100, v.trust + Math.round(amount * 1.5));
            return { ...v, relationship: rel, trust };
          }
          return v;
        });
      }
      return next;
    });

    const vName = mapData.knownVillages?.find(v => v.id === villageId)?.name || 'Distant Tribe';
    addLog(`🤝 Diplomatic Offering: Oracle ${oracle.name} sent ${costQty} ${costResource} to ${vName}. Relationship improved by +${amount}!`, 'success');
  };

  // Helper to Accept message requests
  const handleAcceptMessage = (msgId: string) => {
    const msg = mapData.oracleMessages?.find(m => m.id === msgId);
    if (!msg || msg.status !== 'pending') return;

    if (msg.cost) {
      const currentQty = mapData.stockpile[msg.cost.item] || 0;
      if (currentQty < msg.cost.qty) {
        addLog(`⚠️ Message offer blocked: Stockpile lacks ${msg.cost.qty} units of ${msg.cost.item}!`, 'warning');
        return;
      }

      setMapData(prev => {
        const next = { ...prev };
        next.stockpile = { ...prev.stockpile, [msg.cost!.item]: currentQty - msg.cost!.qty };
        
        // reward
        if (msg.reward) {
          const rewardItem = msg.reward.item;
          next.stockpile[rewardItem] = (next.stockpile[rewardItem] || 0) + msg.reward.qty;
        }

        // update relationship for sender village
        if (next.knownVillages) {
          next.knownVillages = next.knownVillages.map(v => {
            if (msg.sender.includes(v.name)) {
              return { 
                ...v, 
                relationship: Math.min(100, v.relationship + 15), 
                trust: Math.min(100, v.trust + 20),
                morale: Math.min(100, (v.morale ?? 70) + 10),
                stability: Math.min(100, (v.stability ?? 80) + 8)
              };
            }
            return v;
          });
        }

        next.oracleMessages = next.oracleMessages?.map(m => {
          if (m.id === msgId) return { ...m, status: 'accepted' as const };
          return m;
        });

        return next;
      });

      const claimedReward = msg.rewardDescription || `${msg.reward?.qty} ${msg.reward?.item}`;
      addLog(`✉️ Agreement Signed: Successfully fulfilled trade/aid request from "${msg.sender}".`, 'success');
      addLog(`✨ Reward claimed: +${claimedReward}`, 'info');
    }
  };

  // Decline Message
  const handleDeclineMessage = (msgId: string) => {
    setMapData(prev => {
      const next = { ...prev };
      next.oracleMessages = next.oracleMessages?.map(m => {
        if (m.id === msgId) return { ...m, status: 'declined' as const };
        return m;
      });
      return next;
    });
    addLog(`✉️ Request Declined: Turned down the message offer.`, 'info');
  };

  // Start studying a discovered relic
  const handleAssignRelicStudy = (relic: DiscoveredRelic) => {
    if (oracleLevel < relic.requiredOracleLevel) {
      addLog(`⚠️ Restricted: Oracle requires Level ${relic.requiredOracleLevel} to study ${relic.name}!`, 'warning');
      return;
    }

    setMapData(prev => {
      const next = { ...prev };
      next.activeRelicStudy = {
        id: relic.id,
        relicName: relic.name,
        totalDaysRequired: relic.dangerLevel === 'High' ? 4 : relic.dangerLevel === 'Medium' ? 2.5 : 1.5,
        daysProgress: 0,
        oracleName: oracle.name,
        oracleHealerLevel: oracle.skills.Healer?.level ?? 1,
        rewardType: relic.rewardType === 'blueprint' ? 'rp' : relic.rewardType === 'resources' ? 'resources' : 'healing',
        decodedMessage: relic.rewardDesc
      };
      
      // Remove from pool
      next.discoveredRelics = next.discoveredRelics?.filter(r => r.id !== relic.id);
      return next;
    });

    addLog(`🔮 Deciphering Relic: Oracle "${oracle.name}" has initiated the decryption matrix of "${relic.name}"!`, 'success');
    onClose();
  };

  // Trade Execution
  const executeTrade = (village: OtherVillage) => {
    let totalCost = 0;
    
    // Check buy/sell validity
    for (const item of Object.keys(tradeCart)) {
      const qty = tradeCart[item] || 0;
      if (qty === 0) continue;
      
      const vg = village.availableTradeGoods.find(g => g.item === item);
      const ng = village.neededGoods.find(n => n.item === item);

      if (tradeMode === 'buy') {
        const price = vg ? vg.price : 10;
        totalCost += price * qty;
      } else {
        const basePrice = 4; // standard sell base
        const mult = ng ? ng.priceMultiplier : 1.0;
        totalCost += Math.round(basePrice * mult) * qty;
      }
    }

    if (tradeMode === 'buy') {
      const silverInStock = mapData.stockpile.silver || 0;
      if (silverInStock < totalCost) {
        addLog(`⚠️ Trade Blocked: Stockpile needs ${totalCost} Silver, you only have ${silverInStock}!`, 'warning');
        return;
      }

      setMapData(prev => {
        const next = { ...prev };
        next.stockpile = { ...prev.stockpile };
        next.stockpile.silver = silverInStock - totalCost;

        for (const item of Object.keys(tradeCart)) {
          const qty = tradeCart[item] || 0;
          if (qty <= 0) continue;
          next.stockpile[item] = (next.stockpile[item] || 0) + qty;
        }

        // Adjust relationship slightly on good trade
        if (next.knownVillages) {
          next.knownVillages = next.knownVillages.map(v => {
            if (v.id === village.id) return { ...v, relationship: Math.min(100, v.relationship + 2) };
            return v;
          });
        }

        return next;
      });

      addLog(`🪙 Purchase Complete! Bought items from ${village.name} for ${totalCost} Silver coins.`, 'success');
    } else {
      // Check if we actually have the goods to sell
      for (const item of Object.keys(tradeCart)) {
        const qty = tradeCart[item] || 0;
        if (qty <= 0) continue;
        const currentQty = mapData.stockpile[item] || 0;
        if (currentQty < qty) {
          addLog(`⚠️ Trade Blocked: Lacking ${qty} units of ${item} to sell!`, 'warning');
          return;
        }
      }

      setMapData(prev => {
        const next = { ...prev };
        next.stockpile = { ...prev.stockpile };
        next.stockpile.silver = (next.stockpile.silver || 0) + totalCost;

        for (const item of Object.keys(tradeCart)) {
          const qty = tradeCart[item] || 0;
          if (qty <= 0) continue;
          next.stockpile[item] -= qty;
        }

        // Adjust relationship slightly
        if (next.knownVillages) {
          next.knownVillages = next.knownVillages.map(v => {
            if (v.id === village.id) return { ...v, relationship: Math.min(100, v.relationship + 3) };
            return v;
          });
        }

        return next;
      });

      addLog(`🪙 Sales Finalized! Sold tribal items to ${village.name} earning +${totalCost} Silver.`, 'success');
    }

    setTradeCart({});
  };

  const selectedVillage = mapData.knownVillages?.find(v => v.id === selectedVillageId) || mapData.knownVillages?.[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" id="oracle-overlay-container">
        <motion.div
          id="oracle-hub-panel"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl flex overflow-hidden font-sans"
        >
          {/* Side Bar: Oracle Progression & Profile */}
          <div className="w-1/4 bg-slate-950/40 border-r border-slate-800/60 p-6 flex flex-col gap-6" id="oracle-profile-sidebar">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
                <Sparkles size={32} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-amber-400">{oracle.name} {oracle.familyName}</h2>
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Tribe's Grand Oracle</p>
              </div>
            </div>

            {/* Level & XP progression indicator */}
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/40 flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <span className="text-[11px] font-bold text-slate-300">Level {oracleLevel}</span>
                <span className="text-[9px] font-mono text-slate-500">{oracleXP} / {oracleXPToNext} XP</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, (oracleXP / oracleXPToNext) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] italic text-amber-500/80 leading-relaxed font-mono">
                Current Role: {ORACLE_LEVELS[oracleLevel - 1]?.title || 'Master Seer'}
              </p>
            </div>

            {/* Path progression list */}
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1 pr-1 border-t border-slate-800/40 pt-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 font-mono">Abilities Timeline</h4>
              {ORACLE_LEVELS.map((o) => (
                <div 
                  key={o.level} 
                  className={`p-2 rounded-lg flex items-start gap-2 border text-[10px] leading-tight ${
                    oracleLevel >= o.level 
                      ? 'bg-slate-900/40 border-amber-500/20 text-slate-200' 
                      : 'opacity-40 border-transparent text-slate-500'
                  }`}
                >
                  <div className={`mt-0.5 w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-mono ${
                    oracleLevel >= o.level ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {o.level}
                  </div>
                  <div>
                    <span className="font-bold block text-slate-300">{o.title}</span>
                    <span className="text-[9px] text-slate-500 font-mono block leading-snug">{o.perk}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main content hub */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/20" id="oracle-main-content">
            {/* Tab navigation bar */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4" id="oracle-hub-header">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {[
                  { id: 'storm', label: 'Forecast', icon: Wind },
                  { id: 'migration', label: 'Migration', icon: Compass },
                  { id: 'biomes', label: 'Upcoming Biomes', icon: CloudRain },
                  { id: 'resources', label: 'Resources/Fauna', icon: TrendingUp },
                  { id: 'villages', label: 'Settlements', icon: Users },
                  { id: 'trade', label: 'Trade', icon: Handshake },
                  { id: 'messages', label: 'Messages', icon: MessageSquare },
                  { id: 'relics', label: 'Relic Study', icon: BookOpen },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activeTab === t.id
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dynamic tab contents */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6" id="oracle-hub-tab-body">
              {activeTab === 'storm' && (
                <div className="flex flex-col gap-6" id="tab-storm-forecast">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Days Until Move</span>
                      <h3 className="text-2xl font-bold font-mono text-amber-400">
                        {currentDays <= 0 ? '0.0' : currentDays.toFixed(1)} Days
                      </h3>
                      <p className="text-[10px] font-mono text-slate-400">Time margin until storm wall hits</p>
                    </div>
                    <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Movement Direction</span>
                      <h3 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
                        <Compass className="text-amber-500 animate-spin-slow" size={20} />
                        {mapData.stormMovementDirection || 'East'}
                      </h3>
                      <p className="text-[10px] font-mono text-slate-400">Wind stream vectors vector alignment</p>
                    </div>
                    <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Forecast Confidence</span>
                      <h3 className="text-2xl font-bold font-mono text-emerald-400">{confidence}%</h3>
                      <p className="text-[10px] font-mono text-slate-400">{confidenceText}</p>
                    </div>
                  </div>

                  {/* Weather schematic visual panel */}
                  <div className="bg-slate-950/30 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                      <div>
                        <h4 className="font-bold text-slate-200">Wind Stream Vectors & Moving Eye Paths</h4>
                        <p className="text-xs text-slate-400">Simulated meteorological radar coordinates based on Oracle perception</p>
                      </div>
                      <span className="px-2.5 py-0.5 bg-slate-800 text-[10px] font-mono text-slate-300 rounded-full">
                        Confidence Error margin: ±{errorDays.toFixed(1)} Days
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-6 items-center">
                      {/* Visual Path Grid */}
                      <div className="relative border border-slate-800/80 rounded-xl aspect-video bg-slate-950 overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 opacity-10">
                          {Array.from({ length: 48 }).map((_, i) => (
                            <div key={i} className="border-r border-b border-slate-200" />
                          ))}
                        </div>
                        {/* Current settlement block */}
                        <div className="absolute left-[30%] top-[40%] flex flex-col items-center">
                          <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500 animate-ping absolute" />
                          <div className="w-3 h-3 rounded-full bg-amber-500 relative z-10" />
                          <span className="text-[8px] font-mono text-amber-400 font-bold mt-1.5 bg-slate-900/90 px-1 py-0.2 rounded border border-amber-500/20">OUR CAMP</span>
                        </div>
                        {/* Eye vector line */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                          <line 
                            x1="30%" y1="40%" 
                            x2="70%" y2="50%" 
                            stroke="#e2ba5e" 
                            strokeWidth="2" 
                            strokeDasharray="4 3"
                            className="animate-pulse"
                          />
                          <circle cx="70%" cy="50%" r="6" fill="#10b981" />
                          <circle cx="70%" cy="50%" r="12" stroke="#10b981" strokeWidth="1" fill="none" className="animate-ping" />
                        </svg>
                        <div className="absolute left-[65%] top-[55%] bg-slate-900/90 px-1 py-0.2 rounded border border-emerald-500/20">
                          <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase">Predicted Eye Stop</span>
                        </div>
                        {/* Direction Arrow */}
                        <div className="absolute right-4 top-4 flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                          <TrendingUp size={10} className="text-amber-500" />
                          <span className="text-[9px] font-mono text-slate-300">Storm velocity: {mapData.stormSpeed?.toFixed(1) || '1.0'} km/h</span>
                        </div>
                      </div>

                      {/* Forecast written description */}
                      <div className="flex flex-col gap-3">
                        <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/40">
                          <h5 className="text-xs font-bold text-slate-300 mb-1">Atmospheric Readings</h5>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                            "The precursor towers are vibrating at 35Hz. Sub-surface electrostatic pressure is building toward the {mapData.stormMovementDirection || 'East'}. The moving Eye of the Storm will carry us toward the {mapData.stormMovementDirection || 'East'} soon; any stationary structures must be packed or abandoned."
                          </p>
                        </div>
                        <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/40 flex items-center gap-2.5">
                          <Shield size={16} className="text-emerald-500 shrink-0" />
                          <div>
                            <h6 className="text-[11px] font-bold text-slate-200">Precursor Storm Anchors</h6>
                            <p className="text-[9px] text-slate-400 font-mono">
                              Build Weather Spires or Shield Anchors inside the village to increase time remaining in current zones.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'migration' && (
                <div className="flex flex-col gap-6" id="tab-migration-planning">
                  <div className="bg-slate-950/20 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                      <div>
                        <h4 className="font-bold text-slate-200">Migration Readiness Blueprint</h4>
                        <p className="text-xs text-slate-400 font-mono">Survival assessment based on caravan weight and vulnerable tribespeople</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 font-mono ${
                        caravanReady ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {caravanReady ? <UserCheck size={12} /> : <AlertTriangle size={12} />}
                        {caravanReady ? 'CARAVAN READY TO MOVE' : 'CARAVAN BLOCKED: NO TRANSPORT ANIMAL'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex flex-col gap-4">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Vulnerability Audit</h5>
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center p-3 bg-slate-900/60 rounded-xl border border-slate-800/40">
                            <span className="text-xs text-slate-300">Unpacked / Exposed Structures</span>
                            <span className={`text-xs font-mono font-bold ${unpackedCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {unpackedCount} Structures
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-900/60 rounded-xl border border-slate-800/40">
                            <span className="text-xs text-slate-300">Elderly Villagers (60+ years)</span>
                            <span className="text-xs font-mono font-bold text-slate-300">{elders.length} elders</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-900/60 rounded-xl border border-slate-800/40">
                            <span className="text-xs text-slate-300">Children / Infants</span>
                            <span className="text-xs font-mono font-bold text-slate-300">{children.length} children</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-900/60 rounded-xl border border-slate-800/40">
                            <span className="text-xs text-slate-300">Injured Villagers (Health &lt; 40%)</span>
                            <span className={`text-xs font-mono font-bold ${injured.length > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                              {injured.length} injured
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Oracle Strategy Insights</h5>
                        <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800/40 flex flex-col gap-2.5">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="text-amber-500 mt-0.5 shrink-0" size={16} />
                            <div>
                              <h6 className="text-[11px] font-bold text-slate-200">Unpacked Structure Warnings</h6>
                              <p className="text-[9px] text-slate-400 font-mono leading-relaxed mt-0.5">
                                All stationary buildings (Shelters, Wells, Farms) will be obliterated if left unpacked. Use builders to dismantle them for full caravan credit.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Activity className="text-sky-500 mt-0.5 shrink-0" size={16} />
                            <div>
                              <h6 className="text-[11px] font-bold text-slate-200">Elderly & Injured Travel Strain</h6>
                              <p className="text-[9px] text-slate-400 font-mono leading-relaxed mt-0.5">
                                Elderly and injured survivors require comfortable carriage space. Ensure you have high morale and ample medicine before moving the tribe.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Migration Readiness Details */}
                        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-slate-400 font-mono">Caravan Weight Capacity</span>
                            <span className="text-[11px] font-mono text-slate-200">
                              {mapData.villageInventory?.currentWeight?.toFixed(1) || '0.0'} / {mapData.villageInventory?.maxWeight || '400'} kg
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-slate-400 font-mono">Tamed Beasts Pulling Wagons</span>
                            <span className="text-[11px] font-mono text-amber-400 font-bold">
                              {bigBeastTamedAndTransport.length} assigned
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'biomes' && (
                <div className="flex flex-col gap-4" id="tab-future-biomes">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <h4 className="font-bold text-slate-200">Long-Term Biome Seer Map</h4>
                      <p className="text-xs text-slate-400 font-mono">Predicted future landscapes moving within the Eye's path</p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">Scanning level: {oracleLevel}/10</span>
                  </div>

                  {oracleLevel < 3 ? (
                    <div className="p-12 text-center flex flex-col items-center gap-2 bg-slate-950/40 border border-slate-800 rounded-2xl">
                      <Shield size={36} className="text-amber-500 opacity-60" />
                      <h5 className="font-bold text-slate-300">Scan Locked</h5>
                      <p className="text-xs text-slate-500 font-mono max-w-sm">
                        Oracle must reach at least Level 3 (Biome Forecaster) to predict upcoming regions' biomes and unique characteristics!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {PREDICTED_BIOMES.map((b, i) => (
                        <div key={i} className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-amber-400 text-xs">{b.name}</span>
                            <span className={`px-2 py-0.2 text-[8px] font-mono rounded font-bold uppercase ${
                              b.risk === 'Low' ? 'bg-emerald-500/10 text-emerald-400' : b.risk === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              Risk: {b.risk}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono leading-relaxed italic">"{b.story}"</p>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono mt-1 border-t border-slate-800/60 pt-2">
                            <div>
                              <span className="text-slate-500 block">Expected resources:</span>
                              <span className="text-slate-300">{b.expectedRes}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Fauna profiles:</span>
                              <span className="text-slate-300">{b.expectedAni}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="flex flex-col gap-4" id="tab-resources-animals">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <h4 className="font-bold text-slate-200">Resource & Wildlife Abundance Radar</h4>
                      <p className="text-xs text-slate-400 font-mono">Statistical probabilities of upcoming resource deposits and migratory fauna patterns</p>
                    </div>
                  </div>

                  {oracleLevel < 4 ? (
                    <div className="p-12 text-center flex flex-col items-center gap-2 bg-slate-950/40 border border-slate-800 rounded-2xl">
                      <TrendingUp size={36} className="text-amber-500 opacity-60" />
                      <h5 className="font-bold text-slate-300">Radar Offline</h5>
                      <p className="text-xs text-slate-500 font-mono max-w-sm">
                        Oracle must reach at least Level 4 (Resource Forecaster) to read upcoming resource densities and metal compositions!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { title: 'Scrap Metal & Precursor Ruins', rate: 75, status: 'High Density', color: 'bg-emerald-500' },
                        { title: 'Subterranean Aquifers / Fresh Water', rate: 45, status: 'Moderate', color: 'bg-amber-500' },
                        { title: 'Star-Metal Fragments / Meteorites', rate: 15, status: 'Extremely Rare', color: 'bg-rose-500' },
                        { title: 'Wild Berries & Medicinal Roots', rate: 85, status: 'Abundant', color: 'bg-emerald-500' },
                        { title: 'Vulnerable Game (Deer, Antelope)', rate: 60, status: 'Common Migration', color: 'bg-emerald-500' },
                        { title: 'Apex Predators (DireWolf, LargeCat)', rate: 35, status: 'Guarded Territory', color: 'bg-amber-500' },
                      ].map((r, i) => (
                        <div key={i} className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl flex flex-col gap-2">
                          <span className="text-xs font-bold text-slate-300 block">{r.title}</span>
                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-slate-500">Probability:</span>
                            <span className="text-slate-300 font-bold">{r.rate}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div className={`h-full ${r.color}`} style={{ width: `${r.rate}%` }} />
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest text-center mt-1 block">
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'villages' && (
                <div className="flex flex-col gap-4 h-full overflow-hidden" id="tab-known-villages">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <h4 className="font-bold text-slate-200">Contacted Settlements & Clans</h4>
                      <p className="text-xs text-slate-400 font-mono">Known encampments wandering the move-paths of the storm system</p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">Total: {mapData.knownVillages?.length || 0}</span>
                  </div>

                  <div className="grid grid-cols-12 gap-6 overflow-hidden flex-1">
                    {/* Left: Village list scrollpane (4 cols) */}
                    <div className="col-span-4 flex flex-col gap-2 overflow-y-auto max-h-[500px] pr-2 border-r border-slate-800/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono block mb-1">Known Clans</span>
                      {mapData.knownVillages?.map((v) => {
                        const hasMajorShortage = v.majorShortages && v.majorShortages.length > 0;
                        const isCollapsed = v.population === 0;
                        return (
                          <button
                            key={v.id}
                            disabled={isCollapsed}
                            onClick={() => setSelectedVillageId(v.id)}
                            className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition relative ${
                              isCollapsed ? 'opacity-40 cursor-not-allowed bg-slate-950/20 border-slate-900' :
                              selectedVillageId === v.id
                                ? 'bg-amber-500/10 border-amber-500/40'
                                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-200 text-xs">{v.name}</span>
                              <span className={`px-1.5 py-0.2 text-[8px] font-mono rounded ${
                                isCollapsed ? 'bg-slate-800 text-slate-500' :
                                v.dangerStatus === 'Safe' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {isCollapsed ? 'COLLAPSED' : v.dangerStatus}
                              </span>
                            </div>
                            
                            <p className="text-[9px] text-slate-400 font-mono">{v.cultureType || 'Nomadic Group'}</p>
                            
                            <div className="flex justify-between items-center text-[10px] font-mono mt-1 pt-1 border-t border-slate-800/40">
                              <span className="text-slate-500">Distance:</span>
                              <span className="text-slate-300">{v.distance} Leagues</span>
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-slate-500">Relationship:</span>
                              <span className={`font-bold ${v.relationship >= 15 ? 'text-emerald-400' : v.relationship < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                {v.relationship > 0 ? `+${v.relationship}` : v.relationship}
                              </span>
                            </div>

                            {hasMajorShortage && !isCollapsed && (
                              <div className="absolute top-1.5 right-1.5 flex gap-1">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" title="Crisis Ongoing" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right: Detailed View (8 cols) */}
                    <div className="col-span-8 flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-2">
                      {selectedVillage ? (
                        <div className="flex flex-col gap-4 bg-slate-950/25 border border-slate-800/60 rounded-xl p-4">
                          {/* Heading & Culture Description */}
                          <div className="border-b border-slate-800/60 pb-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="text-sm font-bold text-amber-400 font-mono">{selectedVillage.name}</h3>
                                <p className="text-[10px] text-slate-400 font-mono italic">"{selectedVillage.cultureType || 'Nomadic Clan'}"</p>
                              </div>
                              <div className="text-right text-[10px] font-mono text-slate-400">
                                <div>Oracle: <span className="text-slate-200">{selectedVillage.knownOracle}</span></div>
                                <div>Region: <span className="text-slate-200">{selectedVillage.region || 'Unknown'}</span></div>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-300 font-mono mt-2 leading-relaxed bg-slate-900/30 p-2.5 rounded-lg border border-slate-800/40">
                              {selectedVillage.originStory || 'This tribe wanders the remote margins of the storm cell system, using standard filter-lanterns.'}
                            </p>
                          </div>

                          {/* Status Panels (Population, Morale, Stability) */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-lg font-mono text-[10px]">
                              <span className="text-slate-500 block uppercase tracking-wider text-[8px] mb-1">Population Estimate</span>
                              <span className="text-slate-200 font-bold text-xs">~{selectedVillage.population} people</span>
                              <span className="text-[8px] text-slate-500 block mt-0.5">{selectedVillage.migrationStyle || 'Constant Nomads'}</span>
                            </div>

                            <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-lg font-mono text-[10px]">
                              <span className="text-slate-500 block uppercase tracking-wider text-[8px] mb-1">Clanal Morale</span>
                              <span className="text-slate-200 font-bold text-xs">
                                {selectedVillage.morale !== undefined ? (
                                  selectedVillage.morale > 75 ? '🟢 Enthusiastic' :
                                  selectedVillage.morale > 45 ? '🟡 Weary' :
                                  '🔴 Panicked'
                                ) : '🟢 Standard'} ({selectedVillage.morale ?? 70}/100)
                              </span>
                              <span className="text-[8px] text-slate-500 block mt-0.5">Influences visitor frequency</span>
                            </div>

                            <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-lg font-mono text-[10px]">
                              <span className="text-slate-500 block uppercase tracking-wider text-[8px] mb-1">System Stability</span>
                              <span className="text-slate-200 font-bold text-xs">
                                {selectedVillage.stability !== undefined ? (
                                  selectedVillage.stability > 75 ? '🟢 Stable' :
                                  selectedVillage.stability > 45 ? '🟡 Shaky' :
                                  '🔴 Near Collapse'
                                ) : '🟢 Active'} ({selectedVillage.stability ?? 80}/100)
                              </span>
                              <span className="text-[8px] text-slate-500 block mt-0.5">High collapse risk below 30%</span>
                            </div>
                          </div>

                          {/* Resource Reserves & Shortages */}
                          <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-lg flex flex-col gap-2">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">Resource Reserves</span>
                              {selectedVillage.majorShortages && selectedVillage.majorShortages.length > 0 ? (
                                <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-mono font-bold animate-pulse">
                                  <AlertTriangle size={11} /> Shortage: {selectedVillage.majorShortages.join(', ')}
                                </div>
                              ) : (
                                <span className="text-emerald-400 text-[9px] font-mono">🟢 Supplies Satiated</span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                              {/* Food reserve bar */}
                              <div>
                                <div className="flex justify-between text-[9px] mb-1">
                                  <span className="text-slate-400">Food Reserve:</span>
                                  <span className="text-slate-200 font-bold">{selectedVillage.food ?? 50}/100</span>
                                </div>
                                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      (selectedVillage.food ?? 50) < 20 ? 'bg-rose-500' : (selectedVillage.food ?? 50) < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`} 
                                    style={{ width: `${selectedVillage.food ?? 50}%` }} 
                                  />
                                </div>
                              </div>

                              {/* Water reserve bar */}
                              <div>
                                <div className="flex justify-between text-[9px] mb-1">
                                  <span className="text-slate-400">Water Reserve:</span>
                                  <span className="text-slate-200 font-bold">{selectedVillage.water ?? 50}/100</span>
                                </div>
                                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      (selectedVillage.water ?? 50) < 20 ? 'bg-rose-500' : (selectedVillage.water ?? 50) < 50 ? 'bg-amber-500' : 'bg-sky-500'
                                    }`} 
                                    style={{ width: `${selectedVillage.water ?? 50}%` }} 
                                  />
                                </div>
                              </div>

                              {/* Medicine reserve bar */}
                              <div>
                                <div className="flex justify-between text-[9px] mb-1">
                                  <span className="text-slate-400">Medicine Reserve:</span>
                                  <span className="text-slate-200 font-bold">{selectedVillage.medicine ?? 20}/100</span>
                                </div>
                                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      (selectedVillage.medicine ?? 20) < 15 ? 'bg-rose-500' : 'bg-pink-500'
                                    }`} 
                                    style={{ width: `${selectedVillage.medicine ?? 20}%` }} 
                                  />
                                </div>
                              </div>

                              {/* Pack Animals */}
                              <div>
                                <div className="flex justify-between text-[9px] mb-1">
                                  <span className="text-slate-400">Herd Beasts/Pack Birds:</span>
                                  <span className="text-slate-200 font-bold">{selectedVillage.animals ?? 15}/100</span>
                                </div>
                                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className="h-full rounded-full bg-amber-600" 
                                    style={{ width: `${selectedVillage.animals ?? 15}%` }} 
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Cultural Traits & Special Resources */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-lg font-mono text-[10px]">
                              <span className="text-slate-400 uppercase tracking-wider text-[8px] block mb-1">Cultural Traits</span>
                              <div className="flex flex-wrap gap-1">
                                {(selectedVillage.culturalTraits || ['Clannish', 'Survivor']).map(t => (
                                  <span key={t} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700/50 text-[9px]">{t}</span>
                                ))}
                              </div>
                            </div>

                            <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-lg font-mono text-[10px]">
                              <span className="text-slate-400 uppercase tracking-wider text-[8px] block mb-1">Special Resources</span>
                              <div className="flex flex-wrap gap-1">
                                {(selectedVillage.specialResources || ['Preserved Food']).map(t => (
                                  <span key={t} className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20 text-[9px]">{t}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Inter-Village Relations (allied, friendly, suspicious, etc.) */}
                          {selectedVillage.relationships && (
                            <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-lg font-mono text-[10px]">
                              <span className="text-slate-400 uppercase tracking-wider text-[8px] block mb-2 border-b border-slate-800 pb-1">Off-Screen Inter-Village Standing</span>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(selectedVillage.relationships).map(([targetId, standing]) => {
                                  const targetName = mapData.knownVillages?.find(v => v.id === targetId)?.name || 'Unknown Encampment';
                                  const standingStr = String(standing);
                                  return (
                                    <div key={targetId} className="flex justify-between items-center p-1.5 bg-slate-950/40 border border-slate-850 rounded">
                                      <span className="text-slate-300 font-bold">{targetName}</span>
                                      <span className={`px-1 rounded text-[8px] font-bold ${
                                        standingStr === 'friendly' || standingStr === 'allied' ? 'bg-emerald-500/10 text-emerald-400' :
                                        standingStr === 'suspicious' || standingStr === 'rival' ? 'bg-amber-500/10 text-amber-400' :
                                        'bg-rose-500/10 text-rose-400'
                                      }`}>
                                        {standingStr.toUpperCase()}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Oracle Chronicles history events timeline */}
                          <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-lg font-mono text-[10px]">
                            <span className="text-slate-400 uppercase tracking-wider text-[8px] block mb-2 border-b border-slate-800 pb-1">Oracle Chronicles (Recent Stories)</span>
                            <div className="flex flex-col gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                              {(selectedVillage.recentEvents || ['Established transmission signal on Star-Mirror.', 'Hunted local pack birds.']).map((ev, idx) => (
                                <div key={idx} className="flex gap-2 items-start text-[9px]">
                                  <span className="text-amber-500 font-bold mt-0.5">✦</span>
                                  <span className="text-slate-300 leading-relaxed">{ev}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Active Problems / Opportunities */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-lg font-mono text-[10px]">
                              <span className="text-rose-400 uppercase tracking-wider text-[8px] font-bold block mb-1">Active Struggles</span>
                              <ul className="list-disc list-inside text-slate-300 flex flex-col gap-1 pl-1 text-[9px]">
                                {(selectedVillage.activeProblems || ['None reported.']).map((p, idx) => (
                                  <li key={idx} className="leading-snug">{p}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-lg font-mono text-[10px]">
                              <span className="text-emerald-400 uppercase tracking-wider text-[8px] font-bold block mb-1">Opportunities</span>
                              <ul className="list-disc list-inside text-slate-300 flex flex-col gap-1 pl-1 text-[9px]">
                                {(selectedVillage.activeOpportunities || ['None reported.']).map((o, idx) => (
                                  <li key={idx} className="leading-snug">{o}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Diplomatic Offerings Center */}
                          <div className="border-t border-slate-800/60 pt-3 flex flex-col gap-2">
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">Diplomatic Actions with {selectedVillage.name}</span>
                            <div className="grid grid-cols-3 gap-3">
                              {/* Offering 1: Reservoir water */}
                              <div className="p-2.5 bg-slate-900/50 rounded-lg flex flex-col justify-between gap-1.5 border border-slate-800">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-200 block">Offer Reservoir Water (x15)</span>
                                  <p className="text-[8px] text-slate-400 font-mono mt-0.5">Send clean water. Improves relationship (+12) & trust (+18).</p>
                                </div>
                                <button
                                  onClick={() => handleIncreaseRelationship(selectedVillage.id, 12, 'reservoirWater', 15)}
                                  className="w-full px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[9px] font-bold font-mono transition uppercase tracking-wider"
                                >
                                  Send Water
                                </button>
                              </div>

                              {/* Offering 2: Ripe berries */}
                              <div className="p-2.5 bg-slate-900/50 rounded-lg flex flex-col justify-between gap-1.5 border border-slate-800">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-200 block">Send Ripe Berries (x30)</span>
                                  <p className="text-[8px] text-slate-400 font-mono mt-0.5">Offer fresh nutrition. Fosters respect (+8).</p>
                                </div>
                                <button
                                  onClick={() => handleIncreaseRelationship(selectedVillage.id, 8, 'berries', 30)}
                                  className="w-full px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[9px] font-bold font-mono transition uppercase tracking-wider"
                                >
                                  Send Berries
                                </button>
                              </div>

                              {/* Offering 3: Advanced Medicine */}
                              <div className="p-2.5 bg-slate-900/50 rounded-lg flex flex-col justify-between gap-1.5 border border-slate-800">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-200 block">Send Medicine (x5)</span>
                                  <p className="text-[8px] text-slate-400 font-mono mt-0.5">Offer life-saving apothecary packs. High gain (+18).</p>
                                </div>
                                <button
                                  onClick={() => handleIncreaseRelationship(selectedVillage.id, 18, 'medicine', 5)}
                                  className="w-full px-2 py-1 bg-pink-600 hover:bg-pink-500 text-white rounded text-[9px] font-bold font-mono transition uppercase tracking-wider"
                                >
                                  Send Medicine
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-12 text-center flex flex-col items-center gap-2 bg-slate-950/20 border border-slate-800/40 rounded-xl">
                          <Users size={32} className="text-slate-600 opacity-60" />
                          <p className="text-xs text-slate-500 font-mono">Select a settlement on the left to establish frequency lock and view telemetry</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'trade' && (
                <div className="flex flex-col gap-4" id="tab-outside-trade">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <h4 className="font-bold text-slate-200">Inter-Tribe Trade Terminals</h4>
                      <p className="text-xs text-slate-400 font-mono">Establish communication channels to exchange regional goods for Silver coins</p>
                    </div>
                  </div>

                  {oracleLevel < 2 ? (
                    <div className="p-12 text-center flex flex-col items-center gap-2 bg-slate-950/40 border border-slate-800 rounded-2xl">
                      <Handshake size={36} className="text-amber-500 opacity-60" />
                      <h5 className="font-bold text-slate-300">Trade Terminal Offline</h5>
                      <p className="text-xs text-slate-500 font-mono max-w-sm">
                        Oracle must reach at least Level 2 (Weather Reader) to establish reliable caravan runners and trade with other settlements!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-6">
                      {/* Left: Village list */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono block">Select Partner</span>
                        {mapData.knownVillages?.map(v => (
                          <button
                            key={v.id}
                            onClick={() => { setSelectedVillageId(v.id); setTradeCart({}); }}
                            className={`p-3 rounded-lg border text-left text-xs font-mono transition ${
                              selectedVillageId === v.id ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-950/40 border-slate-800 text-slate-300'
                            }`}
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>

                      {/* Middle: Exchange ledger */}
                      {selectedVillage && (
                        <div className="col-span-2 bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                            <span className="text-xs font-bold text-slate-300">{selectedVillage.name} Ledger</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setTradeMode('buy'); setTradeCart({}); }}
                                className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono transition ${
                                  tradeMode === 'buy' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                BUY GOODS
                              </button>
                              <button
                                onClick={() => { setTradeMode('sell'); setTradeCart({}); }}
                                className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono transition ${
                                  tradeMode === 'sell' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                SELL TO THEM
                              </button>
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col gap-2">
                            {tradeMode === 'buy' ? (
                              <div className="flex flex-col gap-1">
                                {selectedVillage.availableTradeGoods.map((g) => (
                                  <div key={g.item} className="flex justify-between items-center p-2 bg-slate-900/60 rounded border border-slate-850 text-xs font-mono">
                                    <span>{g.item} (In stock: {g.quantity})</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400">{g.price} Silver</span>
                                      <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                        <button 
                                          onClick={() => setTradeCart(p => ({ ...p, [g.item]: Math.max(0, (p[g.item] || 0) - 1) }))}
                                          className="text-amber-500 font-bold px-1"
                                        >
                                          -
                                        </button>
                                        <span>{tradeCart[g.item] || 0}</span>
                                        <button 
                                          onClick={() => setTradeCart(p => ({ ...p, [g.item]: Math.min(g.quantity, (p[g.item] || 0) + 1) }))}
                                          className="text-amber-500 font-bold px-1"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {selectedVillage.neededGoods.map((n) => {
                                  const stock = mapData.stockpile[n.item] || 0;
                                  const price = Math.round(4 * n.priceMultiplier);
                                  return (
                                    <div key={n.item} className="flex justify-between items-center p-2 bg-slate-900/60 rounded border border-slate-850 text-xs font-mono">
                                      <span>{n.item} (We have: {stock})</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-emerald-400">Pays {price} Silver</span>
                                        <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                          <button 
                                            onClick={() => setTradeCart(p => ({ ...p, [n.item]: Math.max(0, (p[n.item] || 0) - 1) }))}
                                            className="text-amber-500 font-bold px-1"
                                          >
                                            -
                                          </button>
                                          <span>{tradeCart[n.item] || 0}</span>
                                          <button 
                                            onClick={() => setTradeCart(p => ({ ...p, [n.item]: Math.min(stock, (p[n.item] || 0) + 1) }))}
                                            className="text-amber-500 font-bold px-1"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => executeTrade(selectedVillage)}
                            className="w-full mt-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs uppercase tracking-wider transition"
                          >
                            Confirm Trade Deal
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'messages' && (
                <div className="flex flex-col gap-4" id="tab-oracle-messages">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <h4 className="font-bold text-slate-200">Precursor Frequency Static & Message Queue</h4>
                      <p className="text-xs text-slate-400 font-mono">Direct frequencies received from other tribal Oracles requesting assist or aid</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {mapData.oracleMessages?.filter(m => m.status === 'pending').map((m) => (
                      <div key={m.id} className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl flex flex-col gap-3">
                        <div className="flex justify-between items-center border-b border-slate-800/40 pb-1.5">
                          <span className="font-bold text-amber-400 text-xs">{m.sender}</span>
                          <span className="text-[10px] font-mono text-slate-500">{m.timeSent}</span>
                        </div>
                        <p className="text-xs text-slate-300 font-mono leading-relaxed">"{m.text}"</p>
                        <div className="flex items-center justify-between mt-1">
                          <div className="text-[10px] font-mono text-slate-400">
                            Required: <span className="text-slate-200 font-bold">{m.cost?.qty} {m.cost?.item}</span> | Reward: <span className="text-emerald-400 font-bold">{m.rewardDescription}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeclineMessage(m.id)}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] font-mono rounded transition"
                            >
                              DECLINE
                            </button>
                            <button
                              onClick={() => handleAcceptMessage(m.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] font-mono rounded transition"
                            >
                              ACCEPT OFFER
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {mapData.oracleMessages?.filter(m => m.status !== 'pending').length === 0 && mapData.oracleMessages?.filter(m => m.status === 'pending').length === 0 && (
                      <div className="p-8 text-center bg-slate-950/10 border border-slate-800 rounded-xl text-slate-500 font-mono text-xs">
                        No active transmission signals or messages found at this frequency.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'relics' && (
                <div className="flex flex-col gap-4" id="tab-relic-study">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <h4 className="font-bold text-slate-200">Precursor Decryption Vault & Relic Archive</h4>
                      <p className="text-xs text-slate-400 font-mono">Discovered ancient fragments awaiting systematic Oracle study and translation</p>
                    </div>
                  </div>

                  {mapData.activeRelicStudy ? (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono">ACTIVE DECRYPTION IN PROGRESS</span>
                        <span className="text-[10px] font-mono text-slate-400">Researcher: {mapData.activeRelicStudy.oracleName}</span>
                      </div>
                      <h4 className="font-bold text-slate-200 text-sm">"{mapData.activeRelicStudy.relicName}"</h4>
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>Study Progress</span>
                          <span>{((mapData.activeRelicStudy.daysProgress / mapData.activeRelicStudy.totalDaysRequired) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (mapData.activeRelicStudy.daysProgress / mapData.activeRelicStudy.totalDaysRequired) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono italic mt-1 leading-relaxed">
                        Expected outcome: {mapData.activeRelicStudy.decodedMessage}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {mapData.discoveredRelics?.map((relic) => (
                        <div key={relic.id} className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200 text-xs">{relic.name}</span>
                              <span className={`px-1.5 py-0.2 text-[8px] font-mono rounded font-bold uppercase ${
                                relic.dangerLevel === 'High' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-300'
                              }`}>
                                Danger: {relic.dangerLevel}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono">Unknown status: {relic.unknownFunction}</p>
                            <p className="text-[10px] text-emerald-400 font-mono font-bold">Unlocks: {relic.rewardDesc}</p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-[9px] font-mono text-slate-500">Requires Lvl {relic.requiredOracleLevel}</span>
                            <button
                              disabled={oracleLevel < relic.requiredOracleLevel}
                              onClick={() => handleAssignRelicStudy(relic)}
                              className={`px-3 py-1.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider transition ${
                                oracleLevel >= relic.requiredOracleLevel
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
                              }`}
                            >
                              START STUDY
                            </button>
                          </div>
                        </div>
                      ))}

                      {(!mapData.discoveredRelics || mapData.discoveredRelics.length === 0) && (
                        <div className="p-8 text-center bg-slate-950/10 border border-slate-800 rounded-xl text-slate-500 font-mono text-xs">
                          No relics currently cataloged in the archive. Send scouts to map precursor ruins and relics to study.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
