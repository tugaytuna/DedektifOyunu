import scenario from "@/content/scenarios/prototype.json";
import type { GameState, Scenario } from "./types";

export const prototype = scenario as Scenario;
export const SAVE_KEY = `retro-crime:save:${prototype.id}`;

export function createInitialState(content: Scenario = prototype): GameState {
  return {
    scenarioId: content.id,
    schemaVersion: 1,
    currentLocationId: content.locations[0].id,
    gameTimeMinutes: content.initialTimeMinutes,
    flags: [],
    variables: { suspicion: 0, stress: 0 },
    relationships: Object.fromEntries(content.characters.map((character) => [character.id, 0])),
    inventory: [],
    playerKnowledge: [],
    detectiveKnowledge: [],
    evidenceStates: Object.fromEntries(content.evidence.map((item) => [item.id, { player: "unknown", detective: "unknown" }])),
    statements: [],
    unlockedLocationIds: [content.locations[0].id],
    decisionLog: [],
    endingId: null
  };
}

export function loadSavedState(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.scenarioId !== prototype.id || parsed.schemaVersion !== 1 || !Array.isArray(parsed.playerKnowledge)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: GameState) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* Storage may be unavailable in private browsing. */ }
}

export function clockLabel(minutes: number) {
  const day = Math.floor(minutes / 1440) + 1;
  const hour = Math.floor(minutes % 1440 / 60).toString().padStart(2, "0");
  const minute = (minutes % 60).toString().padStart(2, "0");
  return { day, time: `${hour}:${minute}` };
}
