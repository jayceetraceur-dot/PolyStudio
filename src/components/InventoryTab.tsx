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
  onMigrateRegion?: () => void;
  onStartPacking?: () => void;
}

export default function InventoryTab({
  mapData,
  tribe,
  isNight,
  onOrganizeWarehouse,
  onTransferToCaravan,
  onTransferToVillage,
  onMigrateRegion,
  onStartPacking,
}: InventoryTabProps) {
  const [cargoSubTab, setCargoSubTab] = useState<'village' | 'caravan' | 'personal'>('village');
  const [showPackingPopup, setShowPackingPopup] = useState(false);
  
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
      case 'bow': return 1.8;
      case 'boiledRoots': return 0.06;
      case 'paddedJerkin': return 2.5;
      case 'saltedMeat': return 0.12;
      case 'steelPickaxe': return 2.2;
      case 'eldritchWard': return 5.0;
      case 'amuletLife': return 0.3;
      case 'thuleciteCore': return 1.0;
      case 'grassBasket': return 0.5;
      // Exploration Equipment
      case 'reinforcedExplorerPack': return 1.0;
      case 'ruinDiverHarness': return 1.8;
      case 'surveyorsLens': return 0.4;
      case 'expeditionLantern': return 0.7;
      case 'sealedExpeditionSuit': return 4.0;
      // Ancient Materials
      case 'ancientPowerCell': return 1.5;
      case 'precisionGear': return 0.6;
      case 'starMetalFragment': return 3.0;
      case 'titanBone': return 4.5;
      case 'fossilResin': return 0.5;
      case 'heartwoodCrystal': return 1.2;
      case 'memoryCrystal': return 0.8;
      case 'livingResinResidue': return 0.9;
      case 'deepCrystal': return 1.4;
      case 'ancientAlloyPlate': return 2.5;
      case 'logicCore': return 1.0;
      case 'sterileAncientCloth': return 0.3;
      case 'regenerationCompound': return 0.1;
      case 'extinctSeed': return 0.05;
      case 'stormLens': return 0.5;
      case 'resonantFossilShard': return 1.1;
      case 'vacuumVessel': return 1.5;
      case 'archiveTablet': return 2.0;
      case 'navigationCore': return 1.0;
      case 'pristineMachineCore': return 3.5;
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
      case 'bow': return 2.2;
      case 'boiledRoots': return 0.06;
      case 'paddedJerkin': return 3.0;
      case 'saltedMeat': return 0.12;
      case 'steelPickaxe': return 2.5;
      case 'eldritchWard': return 4.0;
      case 'amuletLife': return 0.2;
      case 'thuleciteCore': return 0.8;
      case 'grassBasket': return 1.0;
      // Exploration Equipment
      case 'reinforcedExplorerPack': return 2.0;
      case 'ruinDiverHarness': return 1.5;
      case 'surveyorsLens': return 0.3;
      case 'expeditionLantern': return 0.6;
      case 'sealedExpeditionSuit': return 4.5;
      // Ancient Materials
      case 'ancientPowerCell': return 1.0;
      case 'precisionGear': return 0.4;
      case 'starMetalFragment': return 1.5;
      case 'titanBone': return 3.0;
      case 'fossilResin': return 0.4;
      case 'heartwoodCrystal': return 0.8;
      case 'memoryCrystal': return 0.5;
      case 'livingResinResidue': return 0.6;
      case 'deepCrystal': return 1.0;
      case 'ancientAlloyPlate': return 1.8;
      case 'logicCore': return 0.8;
      case 'sterileAncientCloth': return 0.4;
      case 'regenerationCompound': return 0.1;
      case 'extinctSeed': return 0.05;
      case 'stormLens': return 0.4;
      case 'resonantFossilShard': return 0.8;
      case 'vacuumVessel': return 1.2;
      case 'archiveTablet': return 1.5;
      case 'navigationCore': return 0.8;
      case 'pristineMachineCore': return 2.5;
      default: return 0.1;
    }
  };

  const resourcesList = [
    { key: 'wood', label: 'Petrified Wood', desc: 'Dense petrified fibers resistant to storm winds' },
    { key: 'stone', label: '🪨 Breathstone', desc: 'Porous air-storing mineral used for survival filters and construction' },
    { key: 'berries', label: '🔴 Berries', desc: 'Fresh wild red berries', rawFood: true },
    { key: 'roots', label: '🥔 Roots', desc: 'Edible desert dirt roots', rawFood: true },
    { key: 'mushrooms', label: '🍄 Mushrooms', desc: 'Humid storm-front cave fungi', rawFood: true },
    { key: 'meat', label: '🥩 Raw Meat', desc: 'Uncooked game meat', rawFood: true },
    { key: 'dew', label: '💧 Dew droplets', desc: 'Passive morning condensation' },
    { key: 'reservoirWater', label: '🏺 Well Water', desc: 'Hand-drawn well reserves' },
    { key: 'rainwater', label: '🌧️ Rainwater', desc: 'Precipitation rainwater' },
    { key: 'fiber', label: '🌾 Fiber Threads', desc: 'Raw storm-grass strands' },
    { key: 'bone', label: '🦴 Windbone', desc: 'Lightweight skeletal fossils of extinct flying megafauna' },
    { key: 'relics', label: '🔮 Stormglass Shards', desc: 'Lightning-forged silicate sand crystals' },
    { key: 'ancientMaterials', label: '⚙️ Atmospheric Alloy', desc: 'Heavy weather-resistant alloy salvaged from failed colonies' },
    { key: 'copper', label: '🧱 Copper Ore', desc: 'Malleable orange metal ore' },
    { key: 'silver', label: '🪙 Silver Ore', desc: 'Precious shiny silver ore' },
    { key: 'gold', label: '✨ Moon-Iron', desc: 'Pale metal ore that glows faintly under moonlight' },
    { key: 'iron', label: '⛓️ Iron Ore', desc: 'Strong structural iron ore' },
    { key: 'hide', label: '🧥 Animal Hide', desc: 'Thick protective fur skins harvested from wildlife' },
    { key: 'fat', label: '🧈 Tallow Fat', desc: 'Animal fat used for fuel, lubrication, or soap-making' },
    { key: 'horns', label: '🪶 Wildlife Trophy', desc: 'Large horns, tusks, or feathers showing hunter dominance' },
    { key: 'charcoal', label: '🪵 Charcoal Purge', desc: 'Sooty carbonized wood remnants used for purification and heat' },
    // Crafted items we support
    { key: 'stoneAxe', label: '🪓 Breathstone Cutter', desc: 'Petrified wood cutting tool' },
    { key: 'flintPickaxe', label: '⛏️ Breathstone Pickaxe', desc: 'Light mineral mining tool' },
    { key: 'spear', label: '🗡️ Windbone Spear', desc: 'Lethal hunting spear made of strong, lightweight Windbone' },
    { key: 'bow', label: '🏹 Tendon Longbow', desc: 'Powerful ranged bow allowing level 4+ Hunters to shoot from distance' },
    { key: 'boiledRoots', label: '🥣 Clay-Stewed Root Mash', desc: 'High-nutrient cooked mash; restores hunger and thirst', preparedFood: true },
    { key: 'paddedJerkin', label: '👕 Windbone Vest', desc: 'Woven fibers and bone plates shield from dust storms' },
    { key: 'saltedMeat', label: '🍖 Salt-Cured Jerky', desc: 'Air-cured preservation meat', preparedFood: true },
    { key: 'steelPickaxe', label: '⚒️ Moon-Iron Pickaxe', desc: 'Premium heavy pickaxe forged from Moon-Iron' },
    { key: 'eldritchWard', label: '🛡️ Stormward Talisman', desc: 'Electrostatic diffuser that prevents warehouse spoilage' },
    { key: 'amuletLife', label: '❤️ Breathstone Spark Amulet', desc: 'Saves a tribe member from death using compressed air cells' },
    { key: 'thuleciteCore', label: '🔋 Atmospheric Anchor Core', desc: 'Mini-cyclone containment unit providing high colony-wide morale' },
    { key: 'grassBasket', label: '🧺 Handwoven Fiber Basket', desc: 'Increases carrying capacity' },

    // Crafted Expedition Equipment
    { key: 'reinforcedExplorerPack', label: '🎒 Reinforced Explorer Pack', desc: '🎒 Increases scout carrying capacity by 100% on expeditions.' },
    { key: 'ruinDiverHarness', label: '🧗 Ruin Diver Harness', desc: '🧗 Reduces danger risk during ancient site exploration by 25%.' },
    { key: 'surveyorsLens', label: '🔍 Surveyor\'s Lens', desc: '🔍 Allows detecting high-tier ruins and landmarks from further away.' },
    { key: 'expeditionLantern', label: '🔦 Expedition Lantern', desc: '🔦 Eliminates fuel requirements, lessens dark danger by 40%.' },
    { key: 'sealedExpeditionSuit', label: '🛡️ Sealed Expedition Suit', desc: '🛡️ Required to enter radioactive or vacuum environments.' },

    // Ancient Materials & Loot
    { key: 'ancientPowerCell', label: '🔋 Ancient Power Cell', desc: 'Pre-storm energy battery salvaged from failed hubs' },
    { key: 'precisionGear', label: '⚙️ Precision Storm Gear', desc: 'Micro-toothed gear assembly built to survive high wind drag' },
    { key: 'starMetalFragment', label: '✨ Moon-Iron Fragment', desc: 'Reflective heavy alloy fragment displaying magnetic alignment' },
    { key: 'titanBone', label: '🦴 Colossal Windbone Fossil', desc: 'Immense fossilized rib or wing strut of prehistoric storm titans' },
    { key: 'fossilResin', label: '🧪 Thunder Resin', desc: 'Hardened tree sap cured by electrostatic storm discharges' },
    { key: 'heartwoodCrystal', label: '💎 Root Crystal', desc: 'Vibrant energy crystal grown within petrified tree cores' },
    { key: 'memoryCrystal', label: '🔮 Memory Crystal', desc: 'Recording crystal housing failed colonist journals and logs' },
    { key: 'livingResinResidue', label: '💧 Thunder Sap Residue', desc: 'Sticky sap with supreme wind-resisting bonding power' },
    { key: 'deepCrystal', label: '🔮 Root Crystal Shard', desc: 'High-frequency glowing crystal found in deep caves' },
    { key: 'ancientAlloyPlate', label: '🛡️ Atmospheric Alloy Plate', desc: 'Featherlight heavy metal protective plating' },
    { key: 'logicCore', label: '🧠 Logic Core', desc: 'Pre-storm silicon matrix governing automation' },
    { key: 'sterileAncientCloth', label: '🩹 Bioforming Gel', desc: 'Self-sealing nutrient medical compound that halts infection' },
    { key: 'regenerationCompound', label: '🧬 Terraforming Seed', desc: 'Highly concentrated bio-growth catalyst designed to accelerate native vegetation' },
    { key: 'extinctSeed', label: '🌱 Skyseed', desc: 'Extremely rare seed of pre-storm floating plants, found inside Seed Arks' },
    { key: 'stormLens', label: '🌀 Stormglass Lens', desc: 'Atmospheric sapphire glass prism used to track storm fronts' },
    { key: 'resonantFossilShard', label: '🦴 Resonant Windbone Flute', desc: 'Hollow fossilized bone that hums in key with wind patterns' },
    { key: 'vacuumVessel', label: '🏺 Pressure Core', desc: 'Ancient machine component used to manipulate atmospheric force' },
    { key: 'archiveTablet', label: '📜 Archive Tablet', desc: 'Well-preserved clay tablet filled with blueprints' },
    { key: 'navigationCore', label: '🗺️ Navigation Core', desc: 'Precursor map coordinates module' },
    { key: 'pristineMachineCore', label: '💎 Pristine Machine Core', desc: 'Highest-tier quantum engine power core' },
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
                const qtyVal = Math.round((mapData.stockpile as any)[res.key] ?? 0);
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

            {/* Migrate Button */}
            <div className="pt-1">
              <button
                onClick={() => setShowPackingPopup(true)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-[10px] font-bold rounded-lg border border-indigo-500/30 transition-all shadow-md shadow-indigo-950/40"
              >
                🚚 Caravan Packing Ceremony...
              </button>
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
      {/* Caravan Packing Popup Modal */}
      <AnimatePresence>
        {showPackingPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-slate-900/95 border border-indigo-500/30 rounded-xl shadow-2xl p-5 text-slate-100 overflow-hidden text-left"
            >
              {/* Backglow decoration */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚚</span>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono">Migration Ceremony</h3>
                    <h2 className="text-sm font-semibold text-slate-200">Caravan Preparation & Packing</h2>
                  </div>
                </div>
                <button
                  onClick={() => setShowPackingPopup(false)}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded-lg bg-slate-800/40 hover:bg-slate-800 transition-all font-mono text-[10px]"
                >
                  ✕ Close
                </button>
              </div>

              {/* Prep Requirements Checklist */}
              <div className="py-4 space-y-3">
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block tracking-wider">Preparation Checklist</span>
                
                {/* 1. Heavy beast check */}
                {(() => {
                  const bigBeastTamedAndTransport = mapData.animals?.filter(ani => 
                    ani.isTame && 
                    (ani as any).assignedJobType === 'transport' && 
                    !['JackLeaper', 'TuskedShagBeast', 'GlowGrub', 'CinderCentipede', 'PricklyBeetle', 'Rabbit', 'Sheep', 'WildGoat'].includes(ani.type)
                  ) || [];
                  const beastReady = bigBeastTamedAndTransport.length > 0;
                  return (
                    <div className={`p-2.5 rounded-lg border ${beastReady ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-amber-950/25 border-amber-500/20'} flex items-start gap-2.5 text-[10px]`}>
                      <span className="text-xs">{beastReady ? '✅' : 'ℹ️'}</span>
                      <div className="space-y-0.5">
                        <span className="font-bold block text-slate-200">Draft Beasts assigned to "Pull Wagons":</span>
                        <span className={beastReady ? 'text-emerald-400' : 'text-amber-400 font-medium'}>
                          {beastReady 
                            ? `Ready (${bigBeastTamedAndTransport[0].type} assigned - 300kg full load)`
                            : 'No heavy beast assigned to pull wagons. You can still migrate, but villagers will carry only 1/3 weight (100kg load limit).'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Stockpile Food check */}
                {(() => {
                  const foodVal = Math.round(mapData.stockpile.food ?? 0);
                  const foodReady = foodVal >= 30;
                  return (
                    <div className={`p-2.5 rounded-lg border ${foodReady ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-amber-950/20 border-amber-500/20'} flex items-start gap-2.5 text-[10px]`}>
                      <span className="text-xs">{foodReady ? '✅' : '⚠️'}</span>
                      <div className="space-y-0.5">
                        <span className="font-bold block text-slate-200">Ration Provisions (min 30 food):</span>
                        <span className={foodReady ? 'text-emerald-400' : 'text-amber-400'}>
                          {foodReady 
                            ? `Plenty of food stowed (${foodVal} / 30 required)`
                            : `Low food reserves! Journey has high starvation danger (${foodVal} / 30 recommended)`}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Living Workers check */}
                {(() => {
                  const aliveCount = tribe.filter(t => t.isAlive).length;
                  const workersReady = aliveCount > 0;
                  return (
                    <div className={`p-2.5 rounded-lg border ${workersReady ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-red-950/20 border-red-500/20'} flex items-start gap-2.5 text-[10px]`}>
                      <span className="text-xs">{workersReady ? '✅' : '❌'}</span>
                      <div className="space-y-0.5">
                        <span className="font-bold block text-slate-200">Caravan Packers:</span>
                        <span className={workersReady ? 'text-emerald-400' : 'text-red-400'}>
                          {workersReady 
                            ? `${aliveCount} physical workers ready to dismantle camp`
                            : 'No living tribal members remaining to conduct migration!'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Ceremony Packing Progress & Actions */}
              <div className="mt-2 pt-4 border-t border-slate-800 space-y-4">
                {mapData.isPackingCaravan ? (
                  <div className="space-y-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                      <span className="text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="animate-pulse">⏳</span> Packing Ceremony Active
                      </span>
                      <span className="text-slate-300 bg-indigo-900/40 px-1.5 py-0.5 rounded">
                        {Math.round(mapData.packingProgress ?? 0)}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-indigo-500/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-300"
                        style={{ width: `${mapData.packingProgress ?? 0}%` }}
                      />
                    </div>

                    <p className="text-[9px] text-slate-400 leading-normal">
                      Workers are currently walking to structures, dismantling them, and carrying supply crates back to the wagon center near the Fireplace. Close this panel to watch them pack in the diorama!
                    </p>

                    {/* Fast pack or Proceed button */}
                    <div className="pt-2 flex gap-2">
                      {(mapData.packingProgress ?? 0) < 100 && (
                        <button
                          onClick={() => {
                            if (onStartPacking) {
                              // Shortcut: set progress to 100% instantly
                              mapData.packingProgress = 100;
                              // Force update trigger
                              if (onTransferToCaravan) onTransferToCaravan('wood', 0);
                            }
                          }}
                          className="flex-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 text-[9px] font-bold rounded border border-slate-700 transition-all uppercase tracking-wider"
                        >
                          ⚡ Instant Pack
                        </button>
                      )}

                      {(mapData.packingProgress ?? 0) >= 100 ? (
                        <button
                          onClick={() => {
                            setShowPackingPopup(false);
                            if (onMigrateRegion) onMigrateRegion();
                          }}
                          className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 active:from-emerald-700 active:to-indigo-700 text-white text-[10px] font-bold rounded-lg border border-indigo-500/30 transition-all shadow-md shadow-indigo-950/40 animate-bounce uppercase tracking-wider animate-pulse"
                        >
                          🚚 Cross Storm Boundary & Begin Journey
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowPackingPopup(false)}
                          className="flex-1 py-1.5 px-3 bg-indigo-900/40 hover:bg-indigo-900/60 active:bg-indigo-900/80 text-indigo-200 text-[9px] font-bold rounded border border-indigo-500/20 transition-all uppercase tracking-wider"
                        >
                          👀 Watch in Diorama
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPackingPopup(false)}
                      className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 text-[10px] font-semibold rounded-lg border border-slate-700 transition-all"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        if (onStartPacking) onStartPacking();
                      }}
                      disabled={!tribe.some(t => t.isAlive)}
                      className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-800/40 active:bg-indigo-700 text-white text-[10px] font-bold rounded-lg border border-indigo-500/30 transition-all shadow-md shadow-indigo-950/40 uppercase tracking-wider"
                    >
                      🔥 Begin Packing Ceremony
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
