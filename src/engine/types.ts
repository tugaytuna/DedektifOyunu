export type Observer = "player" | "detective";
export type EvidenceStatus = "unknown" | "discovered" | "verified" | "disputed";

export interface Hotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  description: string;
  factId?: string;
  itemId?: string;
  evidenceId?: string;
  timeCost: number;
}

export interface Location {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  travelMinutes: number;
  unlockedBy?: string;
  hotspots: Hotspot[];
}

export interface Character {
  id: string;
  name: string;
  role: string;
  portrait: string;
  locationId: string;
  summary: string;
  dialogueId: string;
}

export interface Evidence {
  id: string;
  title: string;
  kind: string;
  description: string;
  criticalLinkToPlayer: boolean;
}

export interface DialogueChoice {
  id: string;
  text: string;
  response: string;
  timeCost: number;
  suspicion: number;
  requiresFact?: string;
  statement?: { topic: string; value: string };
}

export interface Scenario {
  id: string;
  version: number;
  title: string;
  fileNumber: string;
  initialTimeMinutes: number;
  detectiveRules: { accusationSuspicionThreshold: number; minimumVerifiedCriticalLinks: number };
  locations: Location[];
  characters: Character[];
  evidence: Evidence[];
  dialogues: Record<string, { prompt: string; choices: DialogueChoice[] }>;
}

export interface GameState {
  scenarioId: string;
  schemaVersion: number;
  currentLocationId: string;
  gameTimeMinutes: number;
  flags: string[];
  variables: { suspicion: number; stress: number };
  relationships: Record<string, number>;
  inventory: string[];
  playerKnowledge: string[];
  detectiveKnowledge: string[];
  evidenceStates: Record<string, Record<Observer, EvidenceStatus>>;
  statements: Array<{ speakerId: string; topic: string; value: string; time: number; knownBy: Observer[] }>;
  unlockedLocationIds: string[];
  decisionLog: Array<{ title: string; detail: string; time: number }>;
  endingId: string | null;
}

export type GameAction =
  | { type: "inspect"; hotspotId: string }
  | { type: "travel"; locationId: string }
  | { type: "dialogue"; characterId: string; choiceId: string }
  | { type: "shareEvidence"; evidenceId: string }
  | { type: "restart" };

export interface ActionResult {
  state: GameState;
  notifications: string[];
  error?: string;
}
