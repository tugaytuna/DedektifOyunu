import type { ActionResult, GameAction, GameState, Scenario } from "./types";
import { createInitialState } from "./state";

const addUnique = (items: string[], item: string) => items.includes(item) ? items : [...items, item];

function finish(state: GameState, scenario: Scenario): GameState {
  if (state.endingId) return state;
  const criticalLinks = scenario.evidence.filter((item) => item.criticalLinkToPlayer && state.evidenceStates[item.id]?.detective === "verified").length;
  if (state.variables.suspicion >= scenario.detectiveRules.accusationSuspicionThreshold && criticalLinks >= scenario.detectiveRules.minimumVerifiedCriticalLinks) {
    return { ...state, endingId: "caught" };
  }
  if (state.playerKnowledge.length >= 4 && state.gameTimeMinutes >= 900) return { ...state, endingId: "unresolved" };
  return state;
}

export function dispatchGameAction(state: GameState, action: GameAction, scenario: Scenario): ActionResult {
  if (action.type === "restart") return { state: createInitialState(scenario), notifications: ["Senaryo yeniden başlatıldı."] };
  if (state.endingId) return { state, notifications: [], error: "Bu senaryo sona erdi." };

  if (action.type === "inspect") {
    const location = scenario.locations.find((entry) => entry.id === state.currentLocationId);
    const hotspot = location?.hotspots.find((entry) => entry.id === action.hotspotId);
    if (!hotspot) return { state, notifications: [], error: "Bu inceleme noktası şu anda kullanılamıyor." };
    const alreadyKnown = hotspot.factId ? state.playerKnowledge.includes(hotspot.factId) : false;
    const next: GameState = {
      ...state,
      gameTimeMinutes: state.gameTimeMinutes + hotspot.timeCost,
      playerKnowledge: hotspot.factId ? addUnique(state.playerKnowledge, hotspot.factId) : state.playerKnowledge,
      inventory: hotspot.itemId ? addUnique(state.inventory, hotspot.itemId) : state.inventory,
      flags: hotspot.id === "desk" ? addUnique(state.flags, "archive_open") : state.flags,
      evidenceStates: hotspot.evidenceId ? {
        ...state.evidenceStates,
        [hotspot.evidenceId]: { ...state.evidenceStates[hotspot.evidenceId], player: "discovered" }
      } : state.evidenceStates,
      decisionLog: [...state.decisionLog, { title: hotspot.label, detail: hotspot.description, time: state.gameTimeMinutes + hotspot.timeCost }]
    };
    const notifications = [alreadyKnown ? "Bu noktayı daha önce incelemiştin." : "Bilgi defterine yeni bir not eklendi."];
    if (hotspot.itemId && !state.inventory.includes(hotspot.itemId)) notifications.push("Envantere mühürlü zarf eklendi.");
    return { state: finish(next, scenario), notifications };
  }

  if (action.type === "travel") {
    const destination = scenario.locations.find((entry) => entry.id === action.locationId);
    if (!destination || state.unlockedLocationIds.includes(destination.id) === false && destination.unlockedBy && !state.flags.includes(destination.unlockedBy)) {
      return { state, notifications: [], error: "Bu konum henüz erişime açık değil." };
    }
    const next: GameState = {
      ...state,
      currentLocationId: destination.id,
      gameTimeMinutes: state.gameTimeMinutes + destination.travelMinutes,
      unlockedLocationIds: addUnique(state.unlockedLocationIds, destination.id),
      decisionLog: [...state.decisionLog, { title: destination.title, detail: `${destination.travelMinutes} dakikalık yolculuk.`, time: state.gameTimeMinutes + destination.travelMinutes }]
    };
    return { state: finish(next, scenario), notifications: [`${destination.title} konumuna ulaştın.`, `${destination.travelMinutes} dakika geçti.`] };
  }

  if (action.type === "shareEvidence") {
    const evidence = scenario.evidence.find((item) => item.id === action.evidenceId);
    if (!evidence || state.evidenceStates[evidence.id]?.player === "unknown") return { state, notifications: [], error: "Bu bulgu henüz dosyada yok." };
    if (state.evidenceStates[evidence.id]?.detective === "verified") return { state, notifications: [], error: "Bu bulgu zaten dedektif dosyasına aktarıldı." };
    const next: GameState = {
      ...state,
      gameTimeMinutes: state.gameTimeMinutes + 3,
      detectiveKnowledge: addUnique(state.detectiveKnowledge, evidence.id),
      evidenceStates: { ...state.evidenceStates, [evidence.id]: { ...state.evidenceStates[evidence.id], detective: "verified" } },
      decisionLog: [...state.decisionLog, { title: "Bulgu dedektife aktarıldı", detail: evidence.title, time: state.gameTimeMinutes + 3 }]
    };
    return { state: finish(next, scenario), notifications: [`${evidence.title} dedektif dosyasına aktarıldı.`, "3 dakika geçti."] };
  }

  const character = scenario.characters.find((entry) => entry.id === action.characterId);
  const dialogue = character && scenario.dialogues[character.dialogueId];
  const choice = dialogue?.choices.find((entry) => entry.id === action.choiceId);
  if (!character || !choice || character.locationId !== state.currentLocationId) return { state, notifications: [], error: "Bu konuşma seçeneği kullanılamıyor." };
  if (choice.requiresFact && !state.playerKnowledge.includes(choice.requiresFact)) return { state, notifications: [], error: "Bu seçeneği açmak için önce ilgili bulguyu edinmelisin." };

  const statement = choice.statement ? { speakerId: character.id, ...choice.statement, time: state.gameTimeMinutes + choice.timeCost, knownBy: ["player" as const] } : null;
  const next: GameState = {
    ...state,
    gameTimeMinutes: state.gameTimeMinutes + choice.timeCost,
    variables: { ...state.variables, suspicion: Math.min(100, state.variables.suspicion + choice.suspicion), stress: Math.min(100, state.variables.stress + Math.ceil(choice.suspicion / 3)) },
    relationships: { ...state.relationships, [character.id]: (state.relationships[character.id] ?? 0) + (choice.suspicion ? -1 : 1) },
    statements: statement ? [...state.statements, statement] : state.statements,
    decisionLog: [...state.decisionLog, { title: `${character.name} ile konuşma`, detail: choice.text, time: state.gameTimeMinutes + choice.timeCost }]
  };
  return { state: finish(next, scenario), notifications: [choice.response, `${choice.timeCost} dakika geçti.`] };
}
