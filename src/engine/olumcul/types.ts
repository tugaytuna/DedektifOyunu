export type StoryPhase = "opening" | "investigation" | "pretrial" | "trial" | "ending";
export type PhysicalEvidenceStatus = "absent" | "present" | "discovered" | "collected" | "cleaned" | "removed" | "deleted" | "tampered";
export type SuspicionLevel = 0 | 1 | 2 | 3;

export interface StoryLocation { id: string; label: string; neighbors: string[]; features?: string[]; access?: string[] }
export interface StoryCharacter { id: string; role: string; name?: string; nameSource?: string; status?: string; knows?: string[]; doesNotKnow?: string[]; initialKnowledge?: string[]; knowledgeRule?: string }
export interface StoryEvidence { id: string; location?: string; source?: string; initial?: string | null; playerAction?: string; directLink?: string; identification?: string; admissibility?: string; author?: string; effect?: string; noDirectConviction?: boolean; content?: string; notProofOfMurder?: boolean; createdBy?: string; cannotShow?: string; canDelete?: boolean; deletionMayBeDetected?: boolean }
export interface StoryEffect { set?: string; value?: unknown; setEvidence?: string; grantItem?: string; discover?: string; trigger?: string; moveTo?: string; reveal?: string; unlock?: string; awardOnce?: number; scheduleAfterMinutes?: number; event?: string; createEvidence?: string; mayDiscover?: string }
export interface StoryAction { id: string; phase: StoryPhase[]; location?: string; minutes?: number; minutesOnWrong?: number; minutesOnCorrect?: number; openingMoves?: number; requires?: string[]; condition?: string; randomCheck?: string; answer?: string; unlimitedAttempts?: boolean; text?: string; effects?: StoryEffect[]; effectsOnSuccess?: StoryEffect[]; effectsOnCorrect?: StoryEffect[] }
export interface StoryChoice { id: string; text: string; effects?: (StoryEffect | string)[] }
export interface StoryDialogue { id: string; character: string; trigger: string; opening?: string; logic?: string; choices: StoryChoice[] | string[]; effects?: (StoryEffect | string)[] }
export interface StoryRandomCheck { id: string; rollOnceAt?: string; rollEachAttempt?: boolean; chance?: number; chanceByAttempt?: number[]; repeatLast?: boolean; outcomes?: string[]; tunable?: boolean; effectOnSuccess?: string }
export interface StoryTimedEvent { id: string; trigger: string; requires?: string[]; effects: (StoryEffect | string)[] }
export interface StoryScenario {
  id: string; title: string; schemaVersion: string; locale: string;
  design: { openingActionsMax: number; investigationMinutes: number; prepActionsMax: number; trialQuestions: number; bonus: Record<string, number> };
  investigation: { suspects: string[]; suspicionLevels: string[]; chargeRule: { requires: string[]; doNotChargeOn: string[] } };
  stateDefaults: Record<string, unknown>;
  characters: StoryCharacter[]; locations: StoryLocation[]; evidence: StoryEvidence[]; actions: StoryAction[];
  dialogues: StoryDialogue[]; randomChecks: StoryRandomCheck[]; timedEvents: StoryTimedEvent[];
  pretrial: { actionsMax: number; allowed: string[] }; trial: { questionCount: number; questions: Array<{ id: string; prompt?: string; promptSelector?: Array<{ when?: string; otherwise?: boolean; text: string }>; choices?: Array<{ id: string; text: string }>; choicesTemplate?: string[] }> };
  endings: Array<{ id: string; enabled: boolean; requires: string[]; mainGoalSuccess: boolean }>;
  finalReportFields: string[];
  truth: Record<string, unknown>;
  engineCompatibility: { adapterVersion: number; travelMinutes: number; detectiveVisits: Array<{ at: number; location: string }>; chargeRule: { directEvidence: string; corroborationEvidence: string[]; minimumCorroboration: number; counterevidence: string[] }; convictionRule: { directEvidence: string; minimumIndependentSupport: number; requiresExposedLie: boolean }; trialResponses: Record<string, Record<string, string>>; assumptions: Record<string, string> };
}

export interface ScheduledEvent { id: string; dueAt: number; payload?: Record<string, unknown> }
export interface PlayerStatement { id: string; speaker: string; recipient: string; topic: string; value: string; time: number; knownBy: string[]; lie?: boolean; contradicted?: boolean }
export interface StoryGameState {
  scenarioId: string; saveVersion: number; phase: StoryPhase; locationId: string; investigationElapsedMinutes: number;
  openingMovesRemaining: number; pretrialMovesRemaining: number; playerName: string; flags: Record<string, boolean | string | number | null>;
  inventory: string[]; evidence: Record<string, { physical: PhysicalEvidenceStatus; identified?: boolean; detectiveKnows: boolean; admissible: boolean }>;
  discoveredFacts: string[]; playerKnowledge: string[]; characterKnowledge: Record<string, string[]>; detectiveKnowledge: string[];
  randomRolls: Record<string, number | string | boolean>; randomAttempts: Record<string, number>; rngState: number;
  eventQueue: ScheduledEvent[]; completedEvents: string[]; awardedBonuses: string[]; score: number;
  statements: PlayerStatement[]; suspicions: Record<string, SuspicionLevel>; exposedLies: string[]; decisionLog: Array<{ actionId: string; label: string; time: number; phase: StoryPhase }>;
  performedActions: string[]; unlockedLocations: string[]; trialAnswers: Record<string, string>; pretrialChoices: string[];
  samuelSilenced: boolean; samuelPresent: boolean | null; detectiveEncounterAvailable: boolean; endingId: "PLAYER_CONVICTED" | "PLAYER_ACQUITTED" | "UNSOLVED" | null; endingReason?: string;
}

export type StoryCommand =
  | { type: "action"; actionId: string; answer?: string }
  | { type: "move"; locationId: string }
  | { type: "dialogue"; dialogueId: string; choiceId: string }
  | { type: "wait"; minutes?: number }
  | { type: "pretrial"; choiceId: "review_statements" | "prepare_defense" | "review_noah" }
  | { type: "trial"; questionId: string; choiceId: string }
  | { type: "charge" };

export interface StoryActionResult { state: StoryGameState; notifications: string[]; error?: string }
