/**
 * useDamageSim — Weapon + target picker with DPS/TTK output.
 */

import { useState, useCallback } from "react";
import { calculateDamage } from "../services/damageCalc";
import type { DamageCalcInput, DamageCalcOutput } from "../types";

const DEFAULT_INPUT: DamageCalcInput = {
  weaponDamage: 25,
  fireRate: 600,
  magazineSize: 30,
  reloadTime: 2,
  targetHealth: 500,
};

export function useDamageSim() {
  const [input, setInput] = useState<DamageCalcInput>(DEFAULT_INPUT);
  const [output, setOutput] = useState<DamageCalcOutput | null>(null);

  const runSim = useCallback(() => {
    const result = calculateDamage(input);
    setOutput(result);
  }, [input]);

  return {
    input,
    setInput,
    output,
    runSim,
  };
}
