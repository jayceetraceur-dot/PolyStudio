import { 
  MapData, 
  Tribesperson, 
  DirectorEvent, 
  DirectorChoice, 
  VisualEventState, 
  EventExecutionState, 
  EventObjective, 
  EventActor, 
  ReservedParticipant, 
  FuneralTask 
} from '../types';

/**
 * VISUAL EVENT EXECUTOR — PHYSICAL WORLD EVENTS ENGINE
 * Manages physical state transitions, actor pathing, real combat, equipment reservation,
 * storage theft, defender survival rules, dropped loot distribution, and funeral sequences.
 */

// Helper to get camp center / fireplace position
function getEventCenter(mapData: MapData): { x: number; z: number } {
  const eyeX = mapData.eyePos?.x ?? 60;
  const eyeZ = mapData.eyePos?.z ?? 60;
  return { x: eyeX, z: eyeZ };
}

// Helper to find a safe boundary spawn location at the edge of the current Eye
function getEyeBoundarySpawn(mapData: MapData, angleOffset: number = 0): { x: number; z: number } {
  const center = getEventCenter(mapData);
  const radius = (mapData.eyeRadius ?? 14.0) - 1.5;
  const angle = (Math.random() * Math.PI * 2) + angleOffset;
  const size = mapData.grid?.length || 120;

  const x = Math.max(2, Math.min(size - 3, Math.round(center.x + Math.cos(angle) * radius)));
  const z = Math.max(2, Math.min(size - 3, Math.round(center.z + Math.sin(angle) * radius)));

  return { x, z };
}

/**
 * Start a physical visual event sequence when the player selects a choice in the Event Modal
 */
export function startVisualEventSequence(
  event: DirectorEvent,
  choice: DirectorChoice,
  mapData: MapData,
  tribe: Tribesperson[],
  addLog: (text: string, type: string) => void
): MapData {
  const nextMap = { ...mapData };
  const center = getEventCenter(nextMap);

  // Determine difficulty / scale for raider / combat events
  let raidDifficulty: 'small' | 'medium' | 'large' = 'medium';
  if (choice.id === 'stand_ground' || choice.id === 'fight') {
    const livingCount = tribe.filter(p => p.isAlive).length;
    if (livingCount > 15) raidDifficulty = 'large';
    else if (livingCount < 6) raidDifficulty = 'small';
  }

  const initialState: VisualEventState = {
    eventId: event.id,
    eventName: event.name,
    category: event.category,
    choiceId: choice.id,
    choiceText: choice.text,
    state: 'ValidatingChoice',
    stageText: 'Validating event strategy and requirements...',
    triggeredDay: mapData.gameDaysPlayed ?? 1,
    location: center,
    objectives: [],
    actors: [],
    reservedParticipants: [],
    stolenItems: {},
    droppedLoot: [],
    funeralQueue: [],
    activeRaidDifficulty: raidDifficulty,
    timerTicks: 0,
  };

  nextMap.visualEventState = initialState;

  addLog(`🎬 PHYSICAL EVENT STARTED: "${event.name}" - Strategy: [${choice.text}]. Preparing physical world sequence!`, 'warning');

  return nextMap;
}

/**
 * Main simulation tick for Visual Event Executor
 * Called during every tribe simulation step
 */
export function tickVisualEventExecutor(
  mapData: MapData,
  tribe: Tribesperson[],
  deltaTime: number,
  timeSpeed: string,
  addLog: (text: string, type: string) => void
): { mapData: MapData; tribe: Tribesperson[] } {
  if (timeSpeed === 'paused') return { mapData, tribe };

  const eventState = mapData.visualEventState;
  if (!eventState || eventState.state === 'Completed' || eventState.state === 'Failed' || eventState.state === 'Cancelled') {
    // Process any remaining funeral queue if present even if no active raid
    if (eventState && eventState.funeralQueue.length > 0) {
      processFuneralSequence(mapData, tribe, deltaTime, addLog);
    }
    return { mapData, tribe };
  }

  const nextMap = { ...mapData };
  let nextTribe = [...tribe];
  const currentState = { ...eventState, timerTicks: (eventState.timerTicks ?? 0) + 1 };
  const center = getEventCenter(nextMap);

  // State Machine Switch
  switch (currentState.state) {
    case 'ValidatingChoice': {
      // Validate costs or requirements
      currentState.state = 'ReservingParticipants';
      currentState.stageText = 'Assigning defenders, noncombatants, and specialists...';
      addLog(`📋 Strategy Validated: Reserving participants for "${currentState.eventName}".`, 'info');
      break;
    }

    case 'ReservingParticipants': {
      const living = nextTribe.filter(p => p.isAlive);
      const reserved: ReservedParticipant[] = [];

      const isCombatEvent = ['raider_attack_event', 'raider_scouts_harassment', 'predator_stalking', 'rival_village_threat'].includes(currentState.eventId);

      if (isCombatEvent && (currentState.choiceId === 'stand_ground' || currentState.choiceId === 'fight' || currentState.choiceId === 'defy')) {
        // Priority 1: Guards, Priority 2: Hunters, Priority 3: Skilled/healthy adults
        const defenders = living.filter(p => 
          p.ageYears >= 15 && 
          p.ageYears <= 60 && 
          p.stats.health >= 40 &&
          (p.role === 'Guard' || p.role === 'Hunter' || (p.skills?.Hunter?.level ?? 1) >= 2 || p.personality === 'Brave')
        );

        // Take up to 6 defenders
        const selectedDefenders = defenders.slice(0, 6);

        selectedDefenders.forEach(d => {
          reserved.push({
            villagerId: d.id,
            eventRole: 'defender',
          });
        });

        // Noncombatants (Children, Elders, Sick) evacuate to safe zone
        const noncombatants = living.filter(p => !selectedDefenders.some(sd => sd.id === p.id));
        noncombatants.forEach(nc => {
          reserved.push({
            villagerId: nc.id,
            eventRole: 'noncombatant_evacuating',
          });
        });

        currentState.stageText = `Assigned ${selectedDefenders.length} defenders and evacuated ${noncombatants.length} noncombatants.`;
        addLog(`🛡️ DEFENDERS ASSIGNED: ${selectedDefenders.length} villagers stepping up to defend the village!`, 'info');

      } else {
        // Social / Trade / Refugee / Funeral events
        const leaderOrOracle = living.find(p => p.role === 'Oracle' || p.role === 'Leader') || living[0];
        if (leaderOrOracle) {
          reserved.push({
            villagerId: leaderOrOracle.id,
            eventRole: 'trader_partner',
          });
        }
        currentState.stageText = 'Gathering delegates at the village center...';
      }

      currentState.reservedParticipants = reserved;
      currentState.state = 'ReservingEquipment';
      break;
    }

    case 'ReservingEquipment': {
      // Check stockpile for available weapons, shields, and armor
      const s = { ...nextMap.stockpile };
      let spearsAvailable = s.spear ?? 0;
      let bowsAvailable = s.bow ?? 0;
      let armorAvailable = s.paddedJerkin ?? 0;
      let shieldsAvailable = (s.bone ?? 0) >= 3 ? Math.floor(s.bone / 3) : 0; // Bone shields crafted on the fly if bone available

      let equippedCount = 0;
      const updatedReserved = currentState.reservedParticipants.map(part => {
        if (part.eventRole === 'defender') {
          const equip: { weapon?: string; shield?: boolean; armor?: string } = {};

          if (spearsAvailable > 0) {
            equip.weapon = 'spear';
            spearsAvailable--;
            s.spear--;
          } else if (bowsAvailable > 0) {
            equip.weapon = 'bow';
            bowsAvailable--;
            s.bow--;
          } else {
            equip.weapon = 'club'; // Improvised wooden club fallback
          }

          if (shieldsAvailable > 0 || (s.wood ?? 0) >= 5) {
            equip.shield = true;
            shieldsAvailable--;
            if (s.wood) s.wood = Math.max(0, s.wood - 2);
          }

          if (armorAvailable > 0) {
            equip.armor = 'paddedJerkin';
            armorAvailable--;
            s.paddedJerkin--;
          }

          equippedCount++;
          return { ...part, equipmentReserved: equip };
        }
        return part;
      });

      nextMap.stockpile = s;
      currentState.reservedParticipants = updatedReserved;
      currentState.state = 'PreparingWorldSequence';
      currentState.stageText = `Equipped ${equippedCount} defenders with stockpile weapons and gear.`;
      addLog(`⚔️ GEAR-UP COMPLETE: Defenders retrieved weapons and shields from the stockpile!`, 'success');
      break;
    }

    case 'PreparingWorldSequence': {
      // Setup Objectives
      const objectives: EventObjective[] = [];

      if (['raider_attack_event', 'raider_scouts_harassment'].includes(currentState.eventId)) {
        objectives.push({
          id: 'obj_defeat_raiders',
          description: 'Defeat or drive off the raiding party',
          objectiveType: 'defeat_raiders',
          targetCount: currentState.activeRaidDifficulty === 'large' ? 6 : currentState.activeRaidDifficulty === 'small' ? 3 : 4,
          currentProgress: 0,
          completed: false,
          failed: false,
        });

        objectives.push({
          id: 'obj_protect_storage',
          description: 'Protect food and weapon storage from theft',
          objectiveType: 'protect_storage',
          targetCount: 1,
          currentProgress: 0,
          completed: false,
          failed: false,
        });

        objectives.push({
          id: 'obj_evacuate_noncombatants',
          description: 'Keep children and noncombatants safe at the fireplace',
          objectiveType: 'evacuate_noncombatants',
          targetCount: 1,
          currentProgress: 0,
          completed: false,
          failed: false,
        });
      } else if (['visiting_merchant', 'emergency_trade_request'].includes(currentState.eventId)) {
        objectives.push({
          id: 'obj_trade',
          description: 'Complete physical trade exchange at the depot',
          objectiveType: 'exchange_goods',
          targetCount: 1,
          currentProgress: 0,
          completed: false,
          failed: false,
        });
      } else {
        objectives.push({
          id: 'obj_general',
          description: 'Resolve event physically in the world',
          objectiveType: 'survive_attack',
          targetCount: 1,
          currentProgress: 0,
          completed: false,
          failed: false,
        });
      }

      currentState.objectives = objectives;
      currentState.state = 'SpawningEventActors';
      currentState.stageText = 'Spawning physical event actors at the Eye boundary...';
      break;
    }

    case 'SpawningEventActors': {
      const actors: EventActor[] = [];
      const spawnPos = getEyeBoundarySpawn(nextMap, 0);

      if (['raider_attack_event', 'raider_scouts_harassment'].includes(currentState.eventId)) {
        const count = currentState.activeRaidDifficulty === 'large' ? 6 : currentState.activeRaidDifficulty === 'small' ? 3 : 4;

        for (let i = 0; i < count; i++) {
          const offsetPos = {
            x: Math.max(2, spawnPos.x + (i % 3) * 2 - 2),
            z: Math.max(2, spawnPos.z + Math.floor(i / 3) * 2 - 2),
          };

          actors.push({
            id: `raider_${i}_${Date.now()}`,
            name: `Raider Berserker #${i + 1}`,
            type: 'raider',
            x: offsetPos.x,
            z: offsetPos.z,
            targetX: center.x,
            targetZ: center.z,
            hp: 90 + i * 10,
            maxHp: 90 + i * 10,
            weapon: i % 2 === 0 ? 'spear' : 'club',
            shield: i === 0,
            armor: i === 0 ? 'hideArmor' : undefined,
            stolenItems: {},
            isRetreating: false,
            isDead: false,
            attackCooldown: 0,
            speed: 1.2,
            objective: i < 2 ? 'attack_storage' : 'attack_villagers',
            colorHex: '#ef4444',
          });
        }

        addLog(`🚨 RAID WARNING: A hostile raider group of ${count} berserkers has entered the Eye!`, 'death');

      } else if (['visiting_merchant', 'emergency_trade_request'].includes(currentState.eventId)) {
        actors.push({
          id: `trader_${Date.now()}`,
          name: 'Master Caravan Trader',
          type: 'trader',
          x: spawnPos.x,
          z: spawnPos.z,
          targetX: center.x,
          targetZ: center.z,
          hp: 150,
          maxHp: 150,
          speed: 1.0,
          objective: 'meet_fireplace',
          colorHex: '#f59e0b',
        });
        addLog(`🐫 TRADE CARAVAN ARRIVED: Traders are walking to the fireplace!`, 'success');
      } else if (currentState.eventId === 'predator_stalking') {
        actors.push({
          id: `predator_${Date.now()}`,
          name: 'Apex Ravine Stalker',
          type: 'predator',
          x: spawnPos.x,
          z: spawnPos.z,
          targetX: center.x,
          targetZ: center.z,
          hp: 180,
          maxHp: 180,
          weapon: 'claws',
          speed: 1.4,
          objective: 'attack_villagers',
          colorHex: '#dc2626',
        });
        addLog(`🐺 PREDATOR STALKING: An Apex Ravine Stalker has entered the village perimeter!`, 'death');
      }

      currentState.actors = actors;
      currentState.state = 'MovingToPositions';
      currentState.stageText = 'Actors moving into position across the terrain...';
      break;
    }

    case 'MovingToPositions': {
      // Move event actors toward targets
      let allReached = true;

      currentState.actors.forEach(actor => {
        if (actor.isDead) return;

        const dx = actor.targetX - actor.x;
        const dz = actor.targetZ - actor.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 1.8) {
          allReached = false;
          const step = Math.min(dist, (actor.speed ?? 1.0) * 0.25 * deltaTime * 12);
          actor.x += (dx / dist) * step;
          actor.z += (dz / dist) * step;
        }
      });

      // Move reserved defenders toward storage/intercept points
      const reservedMap = new Map(currentState.reservedParticipants.map(r => [r.villagerId, r]));
      nextTribe = nextTribe.map(p => {
        const res = reservedMap.get(p.id);
        if (res && p.isAlive) {
          if (res.eventRole === 'defender') {
            // Intercept position between spawn and fireplace
            p.targetX = Math.round(center.x + (currentState.actors[0]?.x - center.x) * 0.4);
            p.targetZ = Math.round(center.z + (currentState.actors[0]?.z - center.z) * 0.4);
            p.statusText = '⚔️ Intercepting Raiders';
          } else if (res.eventRole === 'noncombatant_evacuating') {
            // Evacuate to fireplace / safe interior
            p.targetX = center.x;
            p.targetZ = center.z;
            p.statusText = '🏃 Evacuating to Safe Zone';
          }
        }
        return p;
      });

      if (allReached || currentState.timerTicks > 30) {
        currentState.state = 'ActiveWorldSequence';
        currentState.stageText = 'Active physical sequence underway!';
        addLog(`⚔️ ENGAGEMENT: Physical event execution in progress!`, 'warning');
      }
      break;
    }

    case 'ActiveWorldSequence': {
      // Physical Combat & World Interaction Tick
      const actors = [...currentState.actors];
      const reservedMap = new Map(currentState.reservedParticipants.map(r => [r.villagerId, r]));
      const droppedLoot = [...currentState.droppedLoot];

      // 1. UPDATE EVENT ACTORS (RAIDERS / PREDATORS / TRADERS)
      actors.forEach(actor => {
        if (actor.isDead) return;

        actor.attackCooldown = Math.max(0, (actor.attackCooldown ?? 0) - deltaTime);

        if (actor.type === 'raider' || actor.type === 'predator') {
          // Find closest defender or storage
          let closestDefender: Tribesperson | null = null;
          let minDist = 999;

          nextTribe.forEach(p => {
            if (p.isAlive) {
              const res = reservedMap.get(p.id);
              if (res && res.eventRole === 'defender') {
                const dist = Math.sqrt((p.x - actor.x) ** 2 + (p.z - actor.z) ** 2);
                if (dist < minDist) {
                  minDist = dist;
                  closestDefender = p;
                }
              }
            }
          });

          // Check distance to storage
          const distToStorage = Math.sqrt((center.x - actor.x) ** 2 + (center.z - actor.z) ** 2);

          if (actor.isRetreating) {
            // Move back toward Eye boundary spawn
            const boundaryPos = getEyeBoundarySpawn(nextMap, Math.PI);
            actor.targetX = boundaryPos.x;
            actor.targetZ = boundaryPos.z;

            const dx = actor.targetX - actor.x;
            const dz = actor.targetZ - actor.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist > 1.5) {
              const step = (actor.speed ?? 1.2) * 0.3 * deltaTime * 12;
              actor.x += (dx / dist) * step;
              actor.z += (dz / dist) * step;
            } else {
              // Raider successfully escaped with stolen items!
              actor.isDead = true; // removed from active grid
              addLog(`⚠️ RAID ESCAPE: A raider escaped out of the Eye carrying stolen supplies!`, 'death');
            }

          } else if (closestDefender && minDist <= 2.2) {
            // ATTACK DEFENDER IN MELEE
            if (actor.attackCooldown <= 0) {
              actor.attackCooldown = 1.5;
              const res = reservedMap.get(closestDefender.id);

              let damage = Math.round(15 + Math.random() * 10);

              // Mitigation by defender equipment
              if (res?.equipmentReserved?.armor) damage = Math.round(damage * 0.6); // Armor -40%
              if (res?.equipmentReserved?.shield && Math.random() < 0.35) {
                damage = 0; // Blocked!
                addLog(`🛡️ SHIELD BLOCK: ${closestDefender.name} blocked the raider's strike!`, 'combat');
              }

              if (damage > 0) {
                closestDefender.stats.health = Math.max(0, closestDefender.stats.health - damage);
                addLog(`⚔️ COMBAT: ${actor.name} hit ${closestDefender.name} for ${damage} damage!`, 'combat');

                // Check Defender Death & 10% Unarmored Defeat Rule
                if (closestDefender.stats.health <= 0) {
                  closestDefender.isAlive = false;
                  closestDefender.statusText = '💀 Fallen in Defense';
                  addLog(`💀 VILLAGER FALLEN: ${closestDefender.name} died defending the village!`, 'death');

                  // Queue Funeral Event
                  currentState.funeralQueue.push({
                    id: `funeral_${Date.now()}`,
                    deceasedName: closestDefender.name,
                    deceasedId: closestDefender.id,
                    deathPos: { x: closestDefender.x, z: closestDefender.z },
                    day: mapData.gameDaysPlayed ?? 1,
                    stage: 'pending',
                  });
                }
              }
            }
          } else if (distToStorage <= 2.0 && (!closestDefender || minDist > 3.0)) {
            // STEAL FROM STORAGE DEPOT
            if (!actor.stolenItems?.food) {
              const stolenFood = Math.min(15, nextMap.stockpile.food ?? 0);
              const stolenSpears = Math.min(1, nextMap.stockpile.spear ?? 0);

              nextMap.stockpile.food = Math.max(0, (nextMap.stockpile.food ?? 0) - stolenFood);
              nextMap.stockpile.spear = Math.max(0, (nextMap.stockpile.spear ?? 0) - stolenSpears);

              actor.stolenItems = { food: stolenFood, spear: stolenSpears };
              currentState.stolenItems.food = (currentState.stolenItems.food ?? 0) + stolenFood;
              actor.isRetreating = true; // Switch to retreat!

              addLog(`🏴‍☠️ STORAGE LOOTED: Raider snatched ${stolenFood} Food and ${stolenSpears} Spear from storage!`, 'death');
            }
          } else {
            // Move toward closest defender or storage
            const tx = closestDefender ? closestDefender.x : center.x;
            const tz = closestDefender ? closestDefender.z : center.z;

            const dx = tx - actor.x;
            const dz = tz - actor.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist > 1.2) {
              const step = (actor.speed ?? 1.2) * 0.25 * deltaTime * 12;
              actor.x += (dx / dist) * step;
              actor.z += (dz / dist) * step;
            }
          }
        }
      });

      // 2. UPDATE DEFENDERS ATTACKING RAIDERS
      nextTribe.forEach(p => {
        if (p.isAlive) {
          const res = reservedMap.get(p.id);
          if (res && res.eventRole === 'defender') {
            // Find living raider in range
            let targetRaider: EventActor | null = null;
            let minDist = 999;

            actors.forEach(a => {
              if (!a.isDead) {
                const dist = Math.sqrt((a.x - p.x) ** 2 + (a.z - p.z) ** 2);
                if (dist < minDist) {
                  minDist = dist;
                  targetRaider = a;
                }
              }
            });

            if (targetRaider && minDist <= (res.equipmentReserved?.weapon === 'bow' ? 8.0 : 2.0)) {
              // Defender attacks raider
              const hunterSkill = p.skills?.Hunter?.level ?? 1;
              const baseDmg = res.equipmentReserved?.weapon === 'spear' ? 22 : res.equipmentReserved?.weapon === 'bow' ? 18 : 12;
              const dmg = Math.round(baseDmg + hunterSkill * 2.0);

              targetRaider.hp -= dmg;
              addLog(`⚔️ DEFENDER STRIKE: ${p.name} dealt ${dmg} damage to ${targetRaider.name}!`, 'combat');

              if (targetRaider.hp <= 0) {
                targetRaider.isDead = true;
                addLog(`🎯 RAIDER DEFEATED: ${p.name} struck down ${targetRaider.name}!`, 'success');

                // Drop Loot on Ground
                droppedLoot.push({
                  id: `loot_${Date.now()}_${Math.random()}`,
                  x: targetRaider.x,
                  z: targetRaider.z,
                  item: targetRaider.weapon || 'spear',
                  quantity: 1,
                });

                if (targetRaider.stolenItems?.food) {
                  droppedLoot.push({
                    id: `loot_recovered_${Date.now()}`,
                    x: targetRaider.x,
                    z: targetRaider.z,
                    item: 'food',
                    quantity: targetRaider.stolenItems.food,
                  });
                }
              }
            }
          }
        }
      });

      // 3. CHECK RETREAT THRESHOLD
      const deadRaiders = actors.filter(a => a.isDead).length;
      if (deadRaiders >= Math.ceil(actors.length * 0.5)) {
        actors.forEach(a => {
          if (!a.isDead && !a.isRetreating) {
            a.isRetreating = true;
            addLog(`🏳️ RAIDERS RETREAT: Casualties too heavy! Remaining raiders are fleeing!`, 'info');
          }
        });
      }

      currentState.actors = actors;
      currentState.droppedLoot = droppedLoot;

      // 4. CHECK COMPLETION OF ACTIVE SEQUENCE
      const activeRaidersLeft = actors.filter(a => !a.isDead && !a.isRetreating).length;
      const retreatingLeft = actors.filter(a => !a.isDead && a.isRetreating).length;

      if (activeRaidersLeft === 0 && retreatingLeft === 0) {
        currentState.state = 'CheckingObjectives';
        currentState.stageText = 'Checking objective outcomes and casualties...';
      }
      break;
    }

    case 'CheckingObjectives': {
      // Evaluate objectives
      let allPassed = true;

      currentState.objectives.forEach(obj => {
        if (obj.objectiveType === 'defeat_raiders') {
          const defeated = currentState.actors.filter(a => a.isDead).length;
          obj.currentProgress = defeated;
          if (defeated >= Math.ceil(currentState.actors.length * 0.5)) {
            obj.completed = true;
          } else {
            obj.failed = true;
            allPassed = false;
          }
        } else if (obj.objectiveType === 'protect_storage') {
          if (Object.keys(currentState.stolenItems).length === 0) {
            obj.completed = true;
          } else {
            obj.completed = true; // partial pass
          }
        }
      });

      currentState.isVictory = allPassed;
      currentState.state = 'ResolvingConsequences';
      currentState.stageText = currentState.isVictory ? 'Victory achieved! Resolving consequences...' : 'Battle concluded with casualties/stolen items. Resolving consequences...';
      break;
    }

    case 'ResolvingConsequences': {
      // Update morale and reputation based strictly on what happened
      const director = nextMap.aiDirector ? { ...nextMap.aiDirector } : null;

      if (currentState.isVictory) {
        if (director) director.playerReputation = Math.min(100, director.playerReputation + 15);
        nextTribe = nextTribe.map(p => p.isAlive ? { ...p, stats: { ...p.stats, morale: Math.min(100, p.stats.morale + 15) } } : p);
        addLog(`🏆 VICTORY RESOLVED: Village defenders repelled the raid! Reputation and morale surged!`, 'success');
      } else {
        if (director) director.playerReputation = Math.max(0, director.playerReputation - 10);
        addLog(`⚠️ DEFEAT RESOLVED: The village sustained damage/loss during the event.`, 'warning');
      }

      if (director) nextMap.aiDirector = director;
      currentState.state = 'DistributingRewards';
      currentState.stageText = 'Distributing loot dropped by defeated raiders...';
      break;
    }

    case 'DistributingRewards': {
      // Add dropped loot to stockpile
      let lootSummaryText = [];
      currentState.droppedLoot.forEach(loot => {
        if (loot.item === 'spear') nextMap.stockpile.spear = (nextMap.stockpile.spear ?? 0) + loot.quantity;
        else if (loot.item === 'bow') nextMap.stockpile.bow = (nextMap.stockpile.bow ?? 0) + loot.quantity;
        else if (loot.item === 'food') nextMap.stockpile.food = (nextMap.stockpile.food ?? 0) + loot.quantity;
        else nextMap.stockpile.copper = (nextMap.stockpile.copper ?? 0) + 5;

        lootSummaryText.push(`${loot.quantity} ${loot.item}`);
      });

      if (lootSummaryText.length > 0) {
        addLog(`🎁 LOOT DISTRIBUTED: Added dropped equipment to stockpile: ${lootSummaryText.join(', ')}.`, 'success');
      }

      currentState.state = 'CleaningUp';
      currentState.stageText = 'Cleaning up event actors and conducting funerals...';
      break;
    }

    case 'CleaningUp': {
      // Unreserve defenders, return surviving weapons/armor to stockpile
      const s = { ...nextMap.stockpile };

      currentState.reservedParticipants.forEach(part => {
        if (part.eventRole === 'defender' && part.equipmentReserved) {
          if (part.equipmentReserved.weapon === 'spear') s.spear = (s.spear ?? 0) + 1;
          if (part.equipmentReserved.weapon === 'bow') s.bow = (s.bow ?? 0) + 1;
          if (part.equipmentReserved.armor) s.paddedJerkin = (s.paddedJerkin ?? 0) + 1;
        }
      });

      nextMap.stockpile = s;

      // Clear villager status texts
      const reservedIds = new Set(currentState.reservedParticipants.map(r => r.villagerId));
      nextTribe = nextTribe.map(p => {
        if (reservedIds.has(p.id) && p.isAlive) {
          p.statusText = 'Idle';
        }
        return p;
      });

      // Clear activeEvent resolved flag on Director
      if (nextMap.aiDirector && nextMap.aiDirector.activeEvent) {
        nextMap.aiDirector = {
          ...nextMap.aiDirector,
          activeEvent: {
            ...nextMap.aiDirector.activeEvent,
            resolved: true,
            resolvedMessage: currentState.isVictory ? 'Victory achieved!' : 'Event completed.',
          }
        };
      }

      currentState.state = 'Completed';
      currentState.stageText = 'Event fully resolved and completed.';
      addLog(`✅ PHYSICAL EVENT COMPLETE: "${currentState.eventName}" finished cleanly!`, 'success');
      break;
    }
  }

  // Always run Funeral Sequence Engine if funeral queue exists
  if (currentState.funeralQueue.length > 0) {
    processFuneralSequence(nextMap, nextTribe, deltaTime, addLog);
  }

  nextMap.visualEventState = currentState;
  return { mapData: nextMap, tribe: nextTribe };
}

/**
 * Process visible funerals for fallen villagers
 */
export function processFuneralSequence(
  mapData: MapData,
  tribe: Tribesperson[],
  deltaTime: number,
  addLog: (text: string, type: string) => void
) {
  const state = mapData.visualEventState;
  if (!state || !state.funeralQueue || state.funeralQueue.length === 0) return;

  const center = getEventCenter(mapData);

  state.funeralQueue = state.funeralQueue.map(funeral => {
    if (funeral.stage === 'pending') {
      funeral.stage = 'carrying';
      funeral.gravePos = { x: center.x - 4, z: center.z - 4 };
      addLog(`⚰️ FUNERAL BEGUN: Tribe members gathering to carry ${funeral.deceasedName} to the memorial burial site...`, 'info');
    } else if (funeral.stage === 'carrying') {
      funeral.stage = 'ritual';
      addLog(`🪦 BURIAL RITUAL: Oracle performing burial rites for ${funeral.deceasedName}. Tombstone placed.`, 'success');
    } else if (funeral.stage === 'ritual') {
      funeral.stage = 'completed';

      // Log to Codex
      if (!mapData.tribeCodexLogs) mapData.tribeCodexLogs = [];
      mapData.tribeCodexLogs.push({
        id: `memorial_${Date.now()}`,
        type: 'tragedy',
        title: `🪦 Fallen Hero: ${funeral.deceasedName}`,
        description: `${funeral.deceasedName} was buried with honors near the village memorial fire.`,
        day: Math.floor(mapData.gameDaysPlayed ?? 1),
      });
    }
    return funeral;
  });

  // Remove completed funerals
  state.funeralQueue = state.funeralQueue.filter(f => f.stage !== 'completed');
}

/**
 * Debug Helper to trigger custom raids for testing
 */
export function triggerDebugRaid(
  size: 'small' | 'medium' | 'large',
  mapData: MapData,
  tribe: Tribesperson[],
  addLog: (text: string, type: string) => void
): MapData {
  const dummyEvent: DirectorEvent = {
    id: 'raider_attack_event',
    name: '🔴 Hostile Raider Raid (Debug Test)',
    category: 'Danger',
    description: 'A hostile raiding party has breached the Eye boundary! Prepare your defenders or evacuate!',
    intensity: 'Crisis',
    choices: [
      { id: 'stand_ground', text: '⚔️ Defend the Village' },
      { id: 'evacuate', text: '🏃 Evacuate to Shelters' }
    ]
  };

  const dummyChoice: DirectorChoice = {
    id: 'stand_ground',
    text: '⚔️ Defend the Village'
  };

  return startVisualEventSequence(dummyEvent, dummyChoice, mapData, tribe, addLog);
}
