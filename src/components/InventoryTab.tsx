import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Warehouse, Truck, Users, Trash2, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import { MapData, Tribesperson, RECIPE_DATABASE } from '../types';

interface InventoryTabProps {
  mapData: MapData;
  tribe: Tribesperson[];
  isNight: boolean;
  onOrganizeWarehouse?: () => void;
  onTransferToCaravan?: (itemKey: string, amount: number) => void;
  onTransferToVillage?: (itemKey: string, amount: number) => void;
}

export default function InventoryTab({
  mapData,
  tribe,
  isNight,
  onOrganizeWarehouse,
  onTransferToCaravan,
  onTransferToVillage,
}: InventoryTabProps) {
  const [cargoSubTab, setCargoSubTab] = useState<'village' | 'caravan' | 'personal'>('village');
  
  // Slider transfer amount tracker
  const [transferAmount, setTransferAmount] = useState<Record<string, number>>({});

  const getUnitWeight = (type: string): number => {
    switch (type) {
      case 'wood': return 0.8;
      case 'stone': return 1.5;
      case 'berries': case 'roots': case 'mushrooms': return 0.05;
      case 'meat': return 0.15;
      case 'fiber': return 0.02;
      case 'bone': return 0.4;
      case 'dew': case 'reservoirWater': case 'rainwater': return 0.1;
      case 'relics': case 'ancientMaterials': return 2.0;
      case 'stoneAxe': case 'flintPickaxe': return 1.2;
      case 'spear': return 1.5;
      case 'boiledRoots': return 0.06;
      case 'paddedJerkin': return 2.5;
      case 'saltedMeat': return 0.12;
      case 'steelPickaxe': return 2.2;
      case 'eldritchWard': return 5.0;
      case 'amuletLife': return 0.3;
      case 'thuleciteCore': return 1.0;
      case 'grassBasket': return 0.5;
      default: return 0.1;
    }
  };

  const getUnitVolume = (type: string): number => {
    switch (type) {
      case 'wood': return 1.2;
      case 'stone': return 0.8;
      case 'berries': case 'roots': case 'mushrooms': return 0.05;
      case 'meat': return 0.15;
      case 'fiber': return 0.08;
      case 'bone': return 0.3;
      case 'dew': case 'reservoirWater': case 'rainwater': return 0.1;
      case 'relics': case 'ancientMaterials': return 1.5;
      case 'stoneAxe': case 'flintPickaxe': return 1.5;
      case 'spear': return 2.0;
      case 'boiledRoots': return 0.06;
      case 'paddedJerkin': return 3.0;
      case 'saltedMeat': return 0.12;
      case 'steelPickaxe': return 2.5;
      case 'eldritchWard': return 4.0;
      case 'amuletLife': return 0.2;
      case 'thuleciteCore': return 0.8;
      case 'grassBasket': return 1.0;
      default: return 0.1;
    }
  };

  const resourcesList = [
    { key: 'wood', label: '🪵 Wood', desc: 'Raw construction lumber' },
    { key: 'stone', label: '🪨 Stone', desc: 'Solid building masonry' },
    { key: 'berries', label: '🔴 Berries', desc: 'Fresh wild red berries', rawFood: true },
    { key: 'roots', label: '🥔 Roots', desc: 'Edible dirt roots', rawFood: true },
    { key: 'mushrooms', label: '🍄 Mushrooms', desc: 'Cave forest fungi', rawFood: true },
    { key: 'meat', label: '🥩 Raw Meat', desc: 'Uncooked game meat', rawFood: true },
    { key: 'dew', label: '💧 Dew droplets', desc: 'Passive morning condensation' },
    { key: 'reservoirWater', label: '🏺 Well Water', desc: 'Hand-drawn well reserves' },
    { key: 'rainwater', label: '🌧️ Rainwater', desc: 'Precipitation rainwater' },
    { key: 'fiber', label: '🌾 Fiber Threads', desc: 'Raw grass strands' },
    { key: 'bone', label: '🦴 Bone Fragments', desc: 'Dead beast skeletons' },
    { key: 'relics', label: '👑 Ancient Relic', desc: 'Extraterrestrial tech shards' },
    { key: 'ancientMaterials', label: '⚙️ Thulecite Alloy', desc: 'Pre-collapse heavy alloy' },
    // Crafted items we support
    { key: 'stoneAxe', label: '🪓 Stone Axe', desc: 'Advanced wood cutting' },
    { key: 'flintPickaxe', label: '⛏️ Flint Pickaxe', desc: 'Primitive pickaxe tool' },
    { key: 'spear', label: '🗡️ Combat Spear', desc: 'Simple hunting arm' },
    { key: 'boiledRoots', label: '🥣 Boiled Roots', desc: 'Slowly cooked root mash', preparedFood: true },
    { key: 'paddedJerkin', label: '👕 Padded Jerkin', desc: 'Woven fiber defenses' },
    { key: 'saltedMeat', label: '🍖 Salted Jerky', desc: 'Cured preservation meat', preparedFood: true },
    { key: 'steelPickaxe', label: '⚒️ Steel Pick', desc: 'Heavy relic ore breaker' },
    { key: 'eldritchWard', label: '🛡️ Eldritch Ward', desc: 'Dark magic deflector' },
    { key: 'amuletLife', label: '❤️ Life Amulet', desc: 'Triggers instant revive' },
    { key: 'thuleciteCore', label: '🔋 Thulecite Core', desc: 'Indestructible energy cell' },
    { key: 'grassBasket', label: '🧺 Straw Basket', desc: 'Doubles carrying capacity' },
  ];

  const aliveWorkers = tribe.filter(t => t.isAlive);

  return (
    <div
      id="inventory-dashboard"
      className={`p-4 rounded-2xl border backdrop-blur-md shadow-lg transition-all duration-500 flex flex-col gap-3.5 max-h-[50vh] overflow-y-auto no-scrollbar ${
        isNight
          ? 'bg-slate-950/80 border-slate-800 text-slate-100'
          : 'bg-white/80 border-slate-200 text-slate-800'
      }`}
    >
      {/* HUD SUB-NAVIGATION SEGMENTS */}
      <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-950/40 rounded-xl border border-slate-800 shrink-0">
        <button
          onClick={() => setCargoSubTab('village')}
          className={`py-1.5 text-[9px] font-mono leading-none tracking-tight font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
            cargoSubTab === 'village'
              ? 'bg-indigo-600 text-white font-extrabold shadow'
              : 'text-slate-500 hover:text-slate-200'
          }`}
        >
          <Warehouse size={10} />
          <span>Village (L1)</span>
        </button>

        <button
          onClick={() => setCargoSubTab('caravan')}
          className={`py-1.5 text-[9px] font-mono leading-none tracking-tight font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
            cargoSubTab === 'caravan'
              ? 'bg-indigo-600 text-white font-extrabold shadow'
              : 'text-slate-500 hover:text-slate-200'
          }`}
        >
          <Truck size={10} />
          <span>Caravan (L2)</span>
        </button>

        <button
          onClick={() => setCargoSubTab('personal')}
          className={`py-1.5 text-[9px] font-mono leading-none tracking-tight font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
            cargoSubTab === 'personal'
              ? 'bg-indigo-600 text-white font-extrabold shadow'
              : 'text-slate-500 hover:text-slate-200'
          }`}
        >
          <Users size={10} />
          <span>Personal (L3)</span>
        </button>
      </div>

      {/* --- VILLAGE WAREHOUSE SUB-TAB CONTENT --- */}
      {cargoSubTab === 'village' && (
        <div className="space-y-3.5">
          {/* LIMITS AND CLEANLINESS GAUGES */}
          <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-250/5 flex flex-col gap-2.5">
            <span className="text-[9px] font-mono font-bold uppercase text-slate-400">STOCKPILE METRICS & LOGISTICS</span>
            
            {/* Weight Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[8px] font-mono">
                <span className="text-slate-500">Total Heap Weight:</span>
                <span className="font-bold text-slate-300">
                  {mapData.villageInventory.currentWeight.toFixed(1)} / {mapData.villageInventory.maxWeight.toFixed(0)} kg
                </span>
              </div>
              <div className="w-full bg-slate-950/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    mapData.villageInventory.currentWeight > mapData.villageInventory.maxWeight * 0.95 ? 'bg-rose-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, (mapData.villageInventory.currentWeight / mapData.villageInventory.maxWeight) * 100)}%` }}
                />
              </div>
            </div>

            {/* Volume Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[8px] font-mono">
                <span className="text-slate-500">Central Volumetric Space:</span>
                <span className="font-bold text-slate-300">
                  {mapData.villageInventory.currentVolume.toFixed(1)} / {mapData.villageInventory.maxVolume.toFixed(0)} L
                </span>
              </div>
              <div className="w-full bg-slate-950/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    mapData.villageInventory.currentVolume > mapData.villageInventory.maxVolume * 0.95 ? 'bg-rose-500' : 'bg-teal-500'
                  }`}
                  style={{ width: `${Math.min(100, (mapData.villageInventory.currentVolume / mapData.villageInventory.maxVolume) * 100)}%` }}
                />
              </div>
            </div>

            {/* Cleanliness / Logistics organization slider */}
            <div className="p-2 border border-slate-200/5 bg-slate-950/40 rounded-lg flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[8px] font-mono">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Depot Cleanliness & Order:</span>
                <strong className={`font-extrabold ${mapData.villageInventory.cleanliness < 45 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  {mapData.villageInventory.cleanliness.toFixed(0)}%
                </strong>
              </div>

              {mapData.villageInventory.cleanliness < 45 ? (
                <div className="text-[8px] text-rose-400 font-mono leading-snug flex gap-1 items-start">
                  <ShieldAlert size={10} className="shrink-0 animate-bounce mt-0.5" />
                  <span>⚠️ WAREHOUSE CLUTTERED! Excess storage weight has caused trash spikes, accelerating food spoilage rate by 2.2x!</span>
                </div>
              ) : (
                <p className="text-[8px] text-slate-500 leading-tight">Storage cleanliness is healthy. Spoilage scaling is nominal.</p>
              )}

              {mapData.villageInventory.cleanliness < 100 && (
                <button
                  onClick={onOrganizeWarehouse}
                  className="mt-1.5 py-1 px-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-700/20 text-indigo-300 rounded font-bold text-[8px] uppercase tracking-wide cursor-pointer transition-all active:scale-95 text-center"
                >
                  🧹 Clear Trash & Organize Depots (+35% Cleanliness)
                </button>
              )}
            </div>
          </div>

          {/* STOCKPILE ITEM GRIDS & PACK COUPLING */}
          <div className="space-y-2">
            <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block pb-1 border-b border-slate-200/5">DEPOT STORAGE CONTENT</span>
            <div className="grid grid-cols-1 gap-1.5">
              {resourcesList.map((res) => {
                const qtyVal = (mapData.stockpile as any)[res.key] ?? 0;
                if (qtyVal === 0) return null;

                const sliderMax = Math.min(qtyVal, 50);
                const packQty = transferAmount[res.key] ?? Math.min(qtyVal, 5);

                return (
                  <div key={res.key} className="p-2 rounded-lg bg-slate-900/25 border border-slate-200/5 text-slate-300 text-[10px] flex flex-col gap-1.5">
                    <div className="flex justify-between items-center bg-slate-950/20 px-1.5 py-0.5 rounded">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200">{res.label}</span>
                        <span className="text-[8px] text-slate-500 leading-tight block">{res.desc}</span>
                      </div>
                      <div className="text-right">
                        <strong className="text-[11px] font-mono font-extrabold text-slate-100">{qtyVal}x</strong>
                        <span className="text-[7px] text-slate-500 block font-mono">
                          {(getUnitWeight(res.key) * qtyVal).toFixed(1)}kg | {(getUnitVolume(res.key) * qtyVal).toFixed(1)}L
                        </span>
                      </div>
                    </div>

                    {/* Transfers Pack slider */}
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[8px] text-slate-500 col-span-1">Pack amount:</span>
                        <input
                          type="number"
                          min="1"
                          max={qtyVal}
                          value={packQty}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(qtyVal, parseInt(e.target.value) || 1));
                            setTransferAmount({ ...transferAmount, [res.key]: val });
                          }}
                          className="w-10 bg-slate-950 h-4 border border-slate-800 rounded text-center text-[9px] text-slate-300 font-mono"
                        />
                      </div>
                      <button
                        onClick={() => {
                          onTransferToCaravan?.(res.key, packQty);
                          setTransferAmount({ ...transferAmount, [res.key]: 1 }); // reset
                        }}
                        className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-sans font-bold rounded text-[8px] cursor-pointer shadow active:scale-95 shrink-0 uppercase tracking-widest"
                      >
                        🚚 Pack Cart
                      </button>
                    </div>
                  </div>
                );
              })}

              {resourcesList.every(res => !((mapData.stockpile as any)[res.key] > 0)) && (
                <div className="p-3 border border-dashed border-slate-250/10 rounded-lg text-center text-[9px] italic text-slate-500 bg-slate-900/10">
                  Central Stockpile warehouse is entirely empty! Gather resources in the 3D diorama first.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- CARAVAN REPOSITORY CART SUB-TAB --- */}
      {cargoSubTab === 'caravan' && (
        <div className="space-y-3.5">
          {/* CARAVAN CONSTRAINTS STATS */}
          <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-200/5 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <Truck size={14} className="text-emerald-500 animate-pulse" />
              <span className="text-[9px] font-mono font-bold uppercase text-slate-300">CARAVAN EXPEDITION CART STATS</span>
            </div>

            {/* Weight limit bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[8px] font-mono">
                <span className="text-slate-500">Cart Cargo Weight:</span>
                <span className="font-bold text-slate-400">
                  {mapData.caravanInventory.currentWeight.toFixed(1)} / {mapData.caravanInventory.maxWeight.toFixed(0)} kg
                </span>
              </div>
              <div className="w-full bg-slate-950/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-emerald-500`}
                  style={{ width: `${Math.min(100, (mapData.caravanInventory.currentWeight / mapData.caravanInventory.maxWeight) * 100)}%` }}
                />
              </div>
            </div>

            {/* Volume limit bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[8px] font-mono">
                <span className="text-slate-500">Cart Volume Capacity:</span>
                <span className="font-bold text-slate-400">
                  {mapData.caravanInventory.currentVolume.toFixed(1)} / {mapData.caravanInventory.maxVolume.toFixed(0)} L
                </span>
              </div>
              <div className="w-full bg-slate-950/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-emerald-600`}
                  style={{ width: `${Math.min(100, (mapData.caravanInventory.currentVolume / mapData.caravanInventory.maxVolume) * 100)}%` }}
                />
              </div>
            </div>

            <p className="text-[8px] text-slate-500 italic leading-snug">
              Note: Caravan storage is perfect for long-distance transport. Workers transfer items to and from bases smoothly to bypass physical storage bottlenecks.
            </p>
          </div>

          {/* LIST ITEMS STOWED ON CART */}
          <div className="space-y-2">
            <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block pb-1 border-b border-slate-200/5">STOWED CARGO ITEMS</span>
            <div className="grid grid-cols-1 gap-1.5">
              {resourcesList.map((res) => {
                const qtyVal = mapData.caravanInventory.items?.[res.key] ?? 0;
                if (qtyVal === 0) return null;

                const unloadQty = Math.max(1, qtyVal);

                return (
                  <div key={res.key} className="p-2 rounded-lg bg-slate-900/25 border border-slate-200/5 text-slate-300 text-[10px] flex flex-col gap-1">
                    <div className="flex justify-between items-center bg-slate-950/20 px-1.5 py-0.5 rounded">
                      <div>
                        <span className="font-bold text-slate-200">{res.label}</span>
                        <span className="text-[8px] text-slate-500 block font-mono">Cart Weight: {(getUnitWeight(res.key) * qtyVal).toFixed(1)}kg</span>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <strong className="text-[11px] font-mono font-extrabold text-emerald-400">{qtyVal}x</strong>
                        <button
                          onClick={() => onTransferToVillage?.(res.key, qtyVal)}
                          className="px-2 py-1 bg-rose-950/40 hover:bg-rose-950 text-rose-400 border border-rose-500/10 font-bold rounded text-[8px] cursor-pointer uppercase tracking-wider active:scale-95"
                          title="Unload Item Shards"
                        >
                          Unload All
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!mapData.caravanInventory.items || Object.values(mapData.caravanInventory.items).every(v => v === 0) ? (
                <div className="p-3 border border-dashed border-slate-250/10 rounded-lg text-center text-[9px] italic text-slate-500 bg-slate-900/10">
                  Caravan Storage Cart is currently empty! Use the "Village" tab to load materials onto this cart.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* --- PERSONAL WORKERS INVENTORIES SUB-TAB --- */}
      {cargoSubTab === 'personal' && (
        <div className="space-y-3.5">
          <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block pb-1 border-b border-slate-200/5">WORKERS PHYSICAL LOADOUTS</span>
          <div className="grid grid-cols-1 gap-2">
            {aliveWorkers.map((p) => {
              const weightVal = p.personalInventory?.currentWeight ?? 0;
              const maxWeightVal = p.personalInventory?.maxWeight ?? 10;
              const hasCarrierBasket = p.carriage?.type === 'grassBasket' || (p as any).hasBasket;

              return (
                <div key={p.id} className="p-2.5 rounded-xl bg-slate-900/30 border border-slate-200/5 flex flex-col gap-1.5 text-slate-300">
                  <div className="flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <strong className="text-slate-100">{p.name}</strong>
                    </div>
                    <span className="text-[8px] px-1 bg-slate-800 rounded text-slate-400 uppercase font-mono">{p.role}</span>
                  </div>

                  {/* Weight limit meters */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-mono text-slate-500">
                      <span>Hands Weight:</span>
                      <span className="font-bold text-slate-300">
                        {weightVal.toFixed(2)} / {maxWeightVal.toFixed(0)} kg
                      </span>
                    </div>
                    <div className="w-full bg-slate-950/60 rounded-full h-1">
                      <div
                        className="bg-indigo-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, (weightVal / maxWeightVal) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Carriage item stats */}
                  <div className="p-1.5 bg-slate-950/40 rounded border border-slate-200/5 flex justify-between items-center text-[9px] font-mono leading-none">
                    <span className="text-slate-400">CARRIER GRIP:</span>
                    {p.carriage && p.carriage.amount > 0 ? (
                      <span className="text-indigo-400 font-bold uppercase">
                        {p.carriage.amount}x {p.carriage.type}
                      </span>
                    ) : (
                      <span className="text-slate-600">Empty Handed</span>
                    )}
                  </div>

                  {/* speed penalty warning flags */}
                  {weightVal > 0 && (
                    <div className="text-[8px] leading-3 text-amber-500 font-mono flex items-center gap-1">
                      <AlertCircle size={9} />
                      <span>Speed penalty applied: -{(weightVal * 4.5).toFixed(0)}% movement rate. Sews straw baskets to lift weight!</span>
                    </div>
                  )}
                </div>
              );
            })}

            {aliveWorkers.length === 0 && (
              <div className="p-3 border border-dashed border-slate-250/10 rounded-lg text-center text-[9px] italic text-slate-500 bg-slate-900/10">
                No tribal workers are currently alive in the diorama.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
