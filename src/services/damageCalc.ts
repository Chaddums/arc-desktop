/**
 * Damage Calculator — Pure calculation engine for DPS/TTK.
 */

import type { DamageCalcInput, DamageCalcOutput } from "../types";

export function calculateDamage(input: DamageCalcInput): DamageCalcOutput {
  const {
    weaponDamage,
    fireRate,
    magazineSize,
    reloadTime = 2,
    targetHealth,
    targetWeakness,
  } = input;

  // Base DPS: damage * shots per second
  const shotsPerSecond = fireRate > 0 ? fireRate / 60 : 1;
  const damagePerHit = weaponDamage;
  const dps = damagePerHit * shotsPerSecond;

  // Magazine dump
  const magDumpDamage = damagePerHit * magazineSize;

  // Effective DPS (accounts for reload time)
  const magDumpTime = magazineSize / (shotsPerSecond || 1);
  const fullCycleTime = magDumpTime + reloadTime;
  const effectiveDps = fullCycleTime > 0 ? magDumpDamage / fullCycleTime : 0;

  // TTK (time to kill) if target health is provided
  let ttk: number | null = null;
  if (targetHealth && targetHealth > 0 && dps > 0) {
    const shotsNeeded = Math.ceil(targetHealth / damagePerHit);
    if (shotsNeeded <= magazineSize) {
      // Can kill within one magazine
      ttk = shotsNeeded / shotsPerSecond;
    } else {
      // Need reloads
      const fullMags = Math.floor(shotsNeeded / magazineSize);
      const remainingShots = shotsNeeded % magazineSize;
      ttk = fullMags * fullCycleTime + remainingShots / shotsPerSecond;
    }
  }

  return {
    dps: Math.round(dps * 10) / 10,
    damagePerHit,
    ttk: ttk != null ? Math.round(ttk * 10) / 10 : null,
    magDumpDamage,
    effectiveDps: Math.round(effectiveDps * 10) / 10,
  };
}
