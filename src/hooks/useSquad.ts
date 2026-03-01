/**
 * useSquad — Squad create/join + member list + role advisor.
 * Local-only for now (no backend).
 */

import { useState, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SquadInfo, SquadMember } from "../types";

const STORAGE_KEY = "@arcview/squad";

const WEAPON_ROLES: Record<string, string> = {
  shotgun: "Point",
  smg: "Point",
  assault_rifle: "Support",
  rifle: "Support",
  sniper: "Overwatch",
  medkit: "Medic",
  grenade_launcher: "Demolitions",
  pistol: "Backup",
};

export function useSquad() {
  const [squad, setSquad] = useState<SquadInfo | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  // Generate squad code
  const createSquad = useCallback(() => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newSquad: SquadInfo = {
      id: `squad_${Date.now()}`,
      code,
      members: [],
      createdAt: Date.now(),
    };
    setSquad(newSquad);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSquad)).catch(() => {});
  }, []);

  // Add member locally
  const addMember = useCallback(
    (member: SquadMember) => {
      if (!squad) return;
      const updated = {
        ...squad,
        members: [...squad.members, member],
      };
      setSquad(updated);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    },
    [squad]
  );

  // Squad role advisor
  const roleAdvisory = useMemo(() => {
    if (!squad || squad.members.length === 0) return null;

    const roles = squad.members.map((m) => {
      const loadout = (m.loadoutSummary ?? "").toLowerCase();
      for (const [weapon, role] of Object.entries(WEAPON_ROLES)) {
        if (loadout.includes(weapon)) return role;
      }
      return "Flex";
    });

    const gaps: string[] = [];
    const hasExplosives = roles.includes("Demolitions");
    const hasMedic = roles.includes("Medic");
    const hasOverwatch = roles.includes("Overwatch");

    if (!hasExplosives) gaps.push("No explosives — consider switching to grenade launcher");
    if (!hasMedic) gaps.push("No medic — consider bringing medkits");
    if (!hasOverwatch && squad.members.length >= 3) gaps.push("No overwatch — a sniper would help");

    return { roles, gaps };
  }, [squad]);

  // Update a member's quest lists
  const updateMemberQuests = useCallback(
    (accountId: string, activeQuestIds: string[], completedQuestIds: string[]) => {
      if (!squad) return;
      const updated = {
        ...squad,
        members: squad.members.map((m) =>
          m.accountId === accountId
            ? { ...m, activeQuestIds, completedQuestIds }
            : m
        ),
      };
      setSquad(updated);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    },
    [squad]
  );

  // Toggle a single quest active/inactive for a member
  const toggleMemberQuest = useCallback(
    (accountId: string, questId: string) => {
      if (!squad) return;
      const updated = {
        ...squad,
        members: squad.members.map((m) => {
          if (m.accountId !== accountId) return m;
          const active = m.activeQuestIds ?? [];
          const completed = m.completedQuestIds ?? [];
          if (completed.includes(questId)) {
            // Uncomplete → back to active
            return { ...m, completedQuestIds: completed.filter((id) => id !== questId) };
          } else if (active.includes(questId)) {
            // Mark as completed
            return {
              ...m,
              completedQuestIds: [...completed, questId],
            };
          } else {
            // Add to active
            return { ...m, activeQuestIds: [...active, questId] };
          }
        }),
      };
      setSquad(updated);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    },
    [squad]
  );

  // Add a quest to a member's active list
  const addMemberQuest = useCallback(
    (accountId: string, questId: string) => {
      if (!squad) return;
      const updated = {
        ...squad,
        members: squad.members.map((m) => {
          if (m.accountId !== accountId) return m;
          const active = m.activeQuestIds ?? [];
          if (active.includes(questId)) return m;
          return { ...m, activeQuestIds: [...active, questId] };
        }),
      };
      setSquad(updated);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    },
    [squad]
  );

  // Update a member's weapon + gadget
  const updateMemberLoadout = useCallback(
    (accountId: string, weapon: string, gadget: string) => {
      if (!squad) return;
      const updated = {
        ...squad,
        members: squad.members.map((m) =>
          m.accountId === accountId
            ? { ...m, weapon, gadget }
            : m
        ),
      };
      setSquad(updated);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    },
    [squad]
  );

  // Remove a quest from a member entirely
  const removeMemberQuest = useCallback(
    (accountId: string, questId: string) => {
      if (!squad) return;
      const updated = {
        ...squad,
        members: squad.members.map((m) => {
          if (m.accountId !== accountId) return m;
          return {
            ...m,
            activeQuestIds: (m.activeQuestIds ?? []).filter((id) => id !== questId),
            completedQuestIds: (m.completedQuestIds ?? []).filter((id) => id !== questId),
          };
        }),
      };
      setSquad(updated);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    },
    [squad]
  );

  const leaveSquad = useCallback(() => {
    setSquad(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return {
    squad,
    selectedMember,
    setSelectedMember,
    createSquad,
    addMember,
    leaveSquad,
    roleAdvisory,
    updateMemberQuests,
    updateMemberLoadout,
    toggleMemberQuest,
    addMemberQuest,
    removeMemberQuest,
  };
}
