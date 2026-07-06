import { EXPEDITION_SITES } from './expeditionDatabase';
import { MapData, Tribesperson } from '../types';

export function tickExpeditionsSimulation(
  tribe: Tribesperson[],
  mapData: MapData,
  deltaDays: number,
  addLog: (text: string, type?: 'info' | 'success' | 'warning' | 'danger') => void
): Tribesperson[] {
  const deltaHours = deltaDays * 24;
  if (deltaHours <= 0) return tribe;

  return tribe.map((person) => {
    if (!person.isAlive || !person.expeditionState || person.expeditionState === 'none') {
      return person;
    }

    const updated = { ...person };
    
    // Safety check for target coords
    if (!updated.expeditionTargetCoords) {
      updated.expeditionState = 'none';
      return updated;
    }

    // 1. Entering Animation Stage
    if (updated.expeditionState === 'entering') {
      // Calculate distance to the entrance
      const distSq = (updated.x - updated.expeditionTargetCoords.x) ** 2 + (updated.z - updated.expeditionTargetCoords.z) ** 2;
      
      // If close enough, or walking timer expired, enter!
      if (distSq < 0.25 || (updated.expeditionTimer && updated.expeditionTimer <= 0)) {
        updated.expeditionState = 'exploring';
        
        // Find the site template
        const siteTemplate = EXPEDITION_SITES.find(s => s.id === updated.expeditionSiteType);
        const duration = siteTemplate ? siteTemplate.durationHours : 16;
        
        updated.expeditionDuration = duration;
        updated.expeditionTimer = duration;
        updated.expeditionLootCollected = {};
        updated.expeditionUniqueFinds = [];
        updated.expeditionLogs = [
          `🚪 [Hour 0] Entered the threshold of ${updated.expeditionSiteName}. The air is heavy and damp, smelling of ancient steel, rust, and ash.`,
          `🔦 Ignition: Fired up lamps. Commencing exploration of the outer entry corridors.`
        ];
        updated.statusText = `🔦 Exploring deep inside ${updated.expeditionSiteName}...`;
        
        // Remove from map rendering (we handle this in GameCanvas)
        addLog(`🚪 Expedition: ${updated.name} has entered ${updated.expeditionSiteName}!`, 'info');
      } else {
        // Still marching physically to the entrance
        if (updated.expeditionTimer !== undefined) {
          updated.expeditionTimer -= deltaHours;
        }
        updated.targetX = updated.expeditionTargetCoords.x;
        updated.targetZ = updated.expeditionTargetCoords.z;
        updated.activeJobType = 'Scout';
        updated.jobTargetCoords = { x: updated.expeditionTargetCoords.x, z: updated.expeditionTargetCoords.z };
        updated.statusText = `🚶 Heading to ${updated.expeditionSiteName} entrance...`;
      }
      return updated;
    }

    // 2. Active Interior Simulation (exploring, investigating, returning)
    if (updated.expeditionTimer !== undefined) {
      updated.expeditionTimer = Math.max(0, updated.expeditionTimer - deltaHours);
    }
    const timer = updated.expeditionTimer ?? 0;
    const duration = updated.expeditionDuration ?? 12;
    const elapsedRatio = 1 - (timer / duration);

    // Keep their coordinates fixed at the entrance tile so they don't drift while hidden
    updated.x = updated.expeditionTargetCoords.x;
    updated.z = updated.expeditionTargetCoords.z;
    updated.targetX = updated.expeditionTargetCoords.x;
    updated.targetZ = updated.expeditionTargetCoords.z;

    const siteTemplate = EXPEDITION_SITES.find(s => s.id === updated.expeditionSiteType);

    // Transition stages based on elapsed time ratio
    if (updated.expeditionState === 'exploring' && elapsedRatio >= 0.33) {
      updated.expeditionState = 'investigating';
      updated.expeditionLogs?.push(`🔍 [Hour ${Math.round(duration * 0.33)}] Reached the main structures. Starting core investigation of vaults and storage cells.`);
      updated.statusText = `🔍 Investigating main vaults of ${updated.expeditionSiteName}...`;
      addLog(`🔍 Expedition: ${updated.name} is now deep inside the main chambers of ${updated.expeditionSiteName}.`, 'info');
    } else if (updated.expeditionState === 'investigating' && elapsedRatio >= 0.66) {
      updated.expeditionState = 'returning';
      updated.expeditionLogs?.push(`🎒 [Hour ${Math.round(duration * 0.66)}] Search complete. Pockets loaded with salvaged items. Climbing back to the surface hatch.`);
      updated.statusText = `🎒 Returning to surface from ${updated.expeditionSiteName}...`;
      addLog(`🎒 Expedition: ${updated.name} has loaded salvaged gear and is ascending to the exit.`, 'info');
    }

    // Roll random hourly events!
    // A 10% chance per hour of a narrative log, trap risk check, or loot find
    const hourlyChance = 0.12 * deltaHours;
    if (Math.random() < hourlyChance && timer > 0) {
      const isInvestigating = updated.expeditionState === 'investigating';
      const eventRoll = Math.random();

      // Trigger a risk check!
      if (eventRoll < 0.35) {
        // Trap / Hazard!
        const risk = siteTemplate?.risk || 'Moderate';
        let trapChance = 0.10;
        let baseDamage = 15;
        let hazardName = "collapsing rubble";

        if (risk === 'Very Low') { trapChance = 0.02; baseDamage = 8; hazardName = "sharp scrap metal"; }
        else if (risk === 'Low') { trapChance = 0.05; baseDamage = 12; hazardName = "unstable wooden floor"; }
        else if (risk === 'Moderate') { trapChance = 0.12; baseDamage = 20; hazardName = "ancient pressure-plate trap"; }
        else if (risk === 'High') { trapChance = 0.22; baseDamage = 35; hazardName = "laser tripwire or toxic spore pocket"; }
        else if (risk === 'Very High') { trapChance = 0.35; baseDamage = 50; hazardName = "automated defense turret or radioactive leak"; }
        else if (risk === 'Extreme') { trapChance = 0.50; baseDamage = 75; hazardName = "magnetic field implosion or rogue guardian drone"; }

        if (Math.random() < trapChance) {
          // Sprung trap! Calculate damage reduction based on equipment
          // In stockpile we check if ruinDiverHarness or sealedExpeditionSuit is used.
          // Since they are carrying equipment or had it at launch:
          // We can check if they have a harness or suit or explorer pack.
          // Let's assume they take advantage of these if the tribe has them (which we deducted on launch!)
          // Let's store what equipment they took in their metadata or just check if it was checked at launch.
          // To be simple and robust, let's assume they have equipment if their level is high or if we check updated.personalInventory items.
          // Wait, we can see if the scout was launched with equipment!
          // Let's check if the scout has 'ruinDiverHarness' in their personalInventory!
          // In App.tsx, we can add it to their personalInventory items when launching!
          // This is incredibly elegant! We can check:
          const hasHarness = updated.personalInventory.items['ruinDiverHarness'] && updated.personalInventory.items['ruinDiverHarness'] > 0;
          const hasSuit = updated.personalInventory.items['sealedExpeditionSuit'] && updated.personalInventory.items['sealedExpeditionSuit'] > 0;
          const hasLantern = updated.personalInventory.items['expeditionLantern'] && updated.personalInventory.items['expeditionLantern'] > 0;

          let reduction = 1.0;
          if (hasSuit) reduction *= 0.50; // 50% damage reduction
          else if (hasHarness) reduction *= 0.70; // 30% damage reduction
          if (hasLantern) reduction *= 0.90; // extra 10% avoid damage in dark spaces

          const finalDamage = Math.round(baseDamage * reduction);
          updated.stats.health = Math.max(0, updated.stats.health - finalDamage);

          const hpLog = `⚠️ [DANGER] Sprung a ${hazardName}! Sustained ${finalDamage} damage! (Health remaining: ${updated.stats.health}%)`;
          updated.expeditionLogs?.push(hpLog);

          if (updated.stats.health <= 0) {
            // Deceased!
            updated.isAlive = false;
            updated.expeditionLogs?.push(`💀 [FATAL] Tragically, ${updated.name} was overwhelmed and died inside ${updated.expeditionSiteName}.`);
            addLog(`💀 Expedition Disaster: ${updated.name} has perished inside ${updated.expeditionSiteName}!`, 'danger');
            
            // Store their corpse in the map cell!
            if (mapData.grid) {
              const x = updated.expeditionTargetCoords.x;
              const z = updated.expeditionTargetCoords.z;
              const cell = mapData.grid[x]?.[z];
              if (cell && cell.expeditionSite) {
                cell.expeditionSite.activeScouts = cell.expeditionSite.activeScouts.filter(id => id !== updated.id);
                (cell.expeditionSite as any).deadScoutCorpse = {
                  name: updated.name,
                  level: updated.skills?.['Scout']?.level || 1,
                  equipment: Object.keys(updated.personalInventory.items).filter(k => updated.personalInventory.items[k] > 0),
                  uniqueFinds: updated.expeditionUniqueFinds || [],
                  loot: updated.expeditionLootCollected || {},
                  journal: updated.expeditionLogs || []
                };
              }
            }
            return updated;
          } else {
            addLog(`⚠️ Danger alert: ${updated.name} sustained injury in ${updated.expeditionSiteName} (-${finalDamage} HP)!`, 'warning');
          }
        }
      } 
      // Trigger a loot find!
      else {
        const finds = siteTemplate?.finds || ["wood", "stone", "fiber"];
        const isRare = Math.random() < 0.25;

        if (isRare && isInvestigating && siteTemplate?.uniqueDiscoveries && siteTemplate.uniqueDiscoveries.length > 0) {
          // Uncover a unique masterpiece!
          const disc = siteTemplate.uniqueDiscoveries[Math.floor(Math.random() * siteTemplate.uniqueDiscoveries.length)];
          const hasAlready = updated.expeditionUniqueFinds?.includes(disc.name);
          if (!hasAlready) {
            updated.expeditionUniqueFinds?.push(disc.name);
            if (!updated.expeditionLootCollected) updated.expeditionLootCollected = {};
            updated.expeditionLootCollected[disc.itemKey] = (updated.expeditionLootCollected[disc.itemKey] || 0) + 1;
            updated.expeditionLogs?.push(`⭐ UNIQUE DISCOVERY: Found ${disc.name}! (${disc.description})`);
            addLog(`⭐ Unique Discovery: ${updated.name} has uncovered ${disc.name} inside ${updated.expeditionSiteName}!`, 'success');
          }
        } else {
          // Find standard loot
          const lootItem = finds[Math.floor(Math.random() * finds.length)];
          // Explorer Pack increases loot multiplier
          const hasPack = updated.personalInventory.items['reinforcedExplorerPack'] && updated.personalInventory.items['reinforcedExplorerPack'] > 0;
          const amtMult = hasPack ? 2 : 1;
          const amount = (Math.floor(Math.random() * 3) + 1) * amtMult;

          if (!updated.expeditionLootCollected) updated.expeditionLootCollected = {};
          updated.expeditionLootCollected[lootItem] = (updated.expeditionLootCollected[lootItem] || 0) + amount;
          updated.expeditionLogs?.push(`💎 Salvaged ${amount}x ${lootItem} from a rusty storage container.`);
        }
      }
    }

    // 3. Complete and Return
    if (timer <= 0) {
      updated.expeditionState = 'none';
      updated.x = updated.expeditionTargetCoords.x;
      updated.z = updated.expeditionTargetCoords.z;
      updated.targetX = updated.expeditionTargetCoords.x;
      updated.targetZ = updated.expeditionTargetCoords.z;

      // Unhide rendering
      addLog(`🎉 Expedition Completed! ${updated.name} has successfully emerged from ${updated.expeditionSiteName} with recovered cargo!`, 'success');

      // Recover dead scout corpse if any was there!
      let corpseLootMsg = "";
      if (mapData.grid) {
        const tx = updated.expeditionTargetCoords.x;
        const tz = updated.expeditionTargetCoords.z;
        const cell = mapData.grid[tx]?.[tz];
        if (cell && cell.expeditionSite) {
          const site = cell.expeditionSite;
          site.activeScouts = site.activeScouts.filter(id => id !== updated.id);
          site.explored = true;
          site.remainingLootRuns = Math.max(0, site.remainingLootRuns - 1);
          if (site.remainingLootRuns <= 0) {
            site.exhausted = true;
          }

          // If there was a deceased scout body, we recover their equipment and cargo!
          const deadCorpse = (site as any).deadScoutCorpse;
          if (deadCorpse) {
            corpseLootMsg = ` Forfeited gear of deceased scout ${deadCorpse.name} was successfully recovered and added to the village stockpile.`;
            // Transfer their corpse's cargo
            Object.entries(deadCorpse.loot || {}).forEach(([k, v]) => {
              mapData.stockpile[k] = (mapData.stockpile[k] || 0) + (v as number);
            });
            deadCorpse.equipment.forEach((eq: string) => {
              mapData.stockpile[eq] = (mapData.stockpile[eq] || 0) + 1;
            });
            delete (site as any).deadScoutCorpse;
            // Morale boost for bringing home our lost family member's belongings!
            addLog(`❤️ Memorial: ${updated.name} recovered the long-lost journal and equipment of ${deadCorpse.name}! The village holds a respectful memorial. (+15 Morale)`, 'success');
          }
        }
      }

      // Add all loot collected directly to village stockpile
      const lootList: string[] = [];
      Object.entries(updated.expeditionLootCollected || {}).forEach(([itemKey, amount]) => {
        mapData.stockpile[itemKey] = (mapData.stockpile[itemKey] || 0) + amount;
        lootList.push(`${amount}x ${itemKey}`);
      });

      // Award Scout Experience!
      if (!updated.skills) (updated as any).skills = {};
      if (!updated.skills['Scout']) {
        updated.skills['Scout'] = { level: 1, xp: 0, xpToNextLevel: 100 };
      }
      const scoutSkill = updated.skills['Scout'];
      scoutSkill.xp += 60; // Huge scout XP gain
      if (scoutSkill.xp >= scoutSkill.xpToNextLevel) {
        scoutSkill.level += 1;
        scoutSkill.xp -= scoutSkill.xpToNextLevel;
        scoutSkill.xpToNextLevel = Math.round(scoutSkill.xpToNextLevel * 1.5);
        addLog(`🎓 Level Up! ${updated.name} has advanced to Scout level ${scoutSkill.level}!`, 'success');
      }

      // Restore equipment items to stockpile
      Object.entries(updated.personalInventory.items).forEach(([eqKey, amt]) => {
        if (amt > 0) {
          mapData.stockpile[eqKey] = (mapData.stockpile[eqKey] || 0) + amt;
          updated.personalInventory.items[eqKey] = 0; // remove from personal backpack
        }
      });

      // Clear logs and loot trackers
      updated.expeditionLootCollected = null;
      updated.expeditionUniqueFinds = null;
      updated.expeditionLogs = null;

      // Physically walk back to base campfire coordinates
      updated.activeJobType = 'Haul';
      updated.jobTargetCoords = { x: Math.floor(mapData.grid.length / 2), z: Math.floor(mapData.grid.length / 2) };
      updated.statusText = `🚶 Walking back to base carrying salvage...${corpseLootMsg}`;
    }

    return updated;
  });
}
