import { actionById, choiceById, dialogueById, storyScenario } from "./scenario";
import type { PhysicalEvidenceStatus, StoryActionResult, StoryCommand, StoryEffect, StoryGameState, StoryPhase, SuspicionLevel } from "./types";

export const STORY_SAVE_KEY = "retro-crime:save:olumcul_proje";
const FIRST_SEED = 0x4f1bbcdc;
const MAX_TIME = storyScenario.design.investigationMinutes;
const say = (state: StoryGameState, title: string, detail = title) => ({ actionId: title, label: detail, time: state.investigationElapsedMinutes, phase: state.phase });

function initialPhysical(status?: string | null): PhysicalEvidenceStatus {
  if (status == null) return "absent";
  if (["present", "absent", "discovered", "collected", "cleaned", "removed", "deleted", "tampered"].includes(status)) return status as PhysicalEvidenceStatus;
  return status === "not_reported" || status === "no_player_footage" ? "absent" : "present";
}

export function createStoryState(playerName = "", seed = FIRST_SEED) : StoryGameState {
  const rawFlags = (storyScenario.stateDefaults.flags ?? {}) as Record<string, boolean | string | number | null>;
  return {
    scenarioId: storyScenario.id, saveVersion: 2, phase: "opening", locationId: "office", investigationElapsedMinutes: 0,
    openingMovesRemaining: storyScenario.design.openingActionsMax, pretrialMovesRemaining: storyScenario.design.prepActionsMax,
    playerName: playerName.trim().slice(0, 40), flags: { ...rawFlags }, inventory: [],
    evidence: Object.fromEntries(storyScenario.evidence.map((item) => [item.id, { physical: initialPhysical(item.initial), detectiveKnows: false, admissible: false }])),
    discoveredFacts: [], playerKnowledge: ["committed_murder", "fire_escape_entry", "poisoned_drink"],
    characterKnowledge: Object.fromEntries(storyScenario.characters.map((character) => [character.id, [...(character.knows ?? character.initialKnowledge ?? [])]])),
    detectiveKnowledge: [...((storyScenario.characters.find((character) => character.id === "detective")?.initialKnowledge) ?? [])],
    randomRolls: {}, randomAttempts: {}, rngState: seed >>> 0, eventQueue: [], completedEvents: [], awardedBonuses: [], score: 0,
    statements: [], suspicions: Object.fromEntries(storyScenario.investigation.suspects.map((suspect) => [suspect, 0 as SuspicionLevel])), exposedLies: [],
    decisionLog: [], performedActions: [], unlockedLocations: ["office", "corridor", "fire_escape", "lobby", "laboratory"], trialAnswers: {}, pretrialChoices: [],
    samuelSilenced: false, samuelPresent: null, detectiveEncounterAvailable: false, endingId: null
  };
}

export function loadStoryState(serialized: string | null): StoryGameState | null {
  if (!serialized) return null;
  try {
    const state = JSON.parse(serialized) as StoryGameState;
    if (state.scenarioId !== storyScenario.id || state.saveVersion !== 2 || !["opening", "investigation", "pretrial", "trial", "ending"].includes(state.phase)) return null;
    if (!Array.isArray(state.eventQueue) || !Array.isArray(state.completedEvents) || !state.evidence || !state.randomRolls) return null;
    state.evidence = Object.fromEntries(storyScenario.evidence.map((item) => {
      const saved = state.evidence[item.id];
      if (!saved) return [item.id, { physical: initialPhysical(item.initial), detectiveKnows: false, admissible: false }];
      const physical = item.initial == null && saved.physical === "present" ? "absent" : saved.physical;
      const admissible = physical === "collected" && (item.admissibility !== "if_collected_and_identified" || saved.identified === true);
      return [item.id, { ...saved, physical, admissible: saved.admissible && admissible }];
    }));
    return state;
  } catch { return null; }
}

export function saveStoryState(state: StoryGameState): string { return JSON.stringify(state); }

function roll(state: StoryGameState): { state: StoryGameState; value: number } {
  const nextSeed = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return { state: { ...state, rngState: nextSeed }, value: nextSeed / 4294967296 };
}
const addUnique = (array: string[], value: string) => array.includes(value) ? array : [...array, value];
const known = (state: StoryGameState, id: string) => state.detectiveKnowledge.includes(id);

function suspicion(state: StoryGameState, suspect: string, amount: number): StoryGameState {
  const level = Math.max(0, Math.min(3, (state.suspicions[suspect] ?? 0) + amount)) as SuspicionLevel;
  return { ...state, suspicions: { ...state.suspicions, [suspect]: level } };
}

function note(state: StoryGameState, id: string, source: "player" | "detective" | string = "player"): StoryGameState {
  const playerKnowledge = source === "player" ? addUnique(state.playerKnowledge, id) : state.playerKnowledge;
  const detectiveKnowledge = source === "detective" ? addUnique(state.detectiveKnowledge, id) : state.detectiveKnowledge;
  const characterKnowledge = source !== "player" && source !== "detective" ? { ...state.characterKnowledge, [source]: addUnique(state.characterKnowledge[source] ?? [], id) } : state.characterKnowledge;
  return { ...state, discoveredFacts: addUnique(state.discoveredFacts, id), playerKnowledge, detectiveKnowledge, characterKnowledge };
}

function markEvidence(state: StoryGameState, id: string, status: PhysicalEvidenceStatus, opts: { detective?: boolean; identified?: boolean } = {}): StoryGameState {
  const old = state.evidence[id] ?? { physical: "absent" as const, detectiveKnows: false, admissible: false };
  const physical = status === "cleaned" || status === "removed" || status === "deleted" || status === "tampered" ? status : old.physical === "collected" ? "collected" : status;
  const item = storyScenario.evidence.find((evidence) => evidence.id === id);
  const detectiveKnows = old.detectiveKnows || !!opts.detective;
  const identified = old.identified || !!opts.identified;
  const admissible = item?.admissibility === "if_collected_and_identified" ? physical === "collected" && !!identified : physical === "collected";
  return { ...state, evidence: { ...state.evidence, [id]: { physical, detectiveKnows, identified, admissible } } };
}

function rememberContradictions(state: StoryGameState): StoryGameState {
  const knownFacts = new Set(state.detectiveKnowledge);
  const statements = state.statements.map((statement) => {
    if (statement.lie && !statement.contradicted && statement.topic === "fire_escape_presence" && knownFacts.has("player_used_fire_escape_on_murder_night")) {
      knownFacts.add(`exposed_lie:${statement.id}`);
      return { ...statement, contradicted: true };
    }
    if (statement.lie && !statement.contradicted && statement.topic === "security_authority" && knownFacts.has("marcus_denied_authorization")) {
      knownFacts.add(`exposed_lie:${statement.id}`);
      return { ...statement, contradicted: true };
    }
    return statement;
  });
  const exposedLies = statements.filter((statement) => statement.contradicted).map((statement) => statement.id);
  return { ...state, statements, exposedLies };
}

function detectiveVisit(state: StoryGameState, at: number, locationId: string): StoryGameState {
  const visitId = `detective_visit_${at}`;
  if (state.completedEvents.includes(visitId)) return state;
  let next = { ...state, completedEvents: [...state.completedEvents, visitId] };
  if (next.locationId === locationId) next = { ...next, detectiveEncounterAvailable: true, flags: { ...next.flags, under_observation: true } };
  const hadSamuel = next.samuelPresent === true && !next.samuelSilenced && locationId === "fire_escape";
  if (hadSamuel) {
    next = markEvidence(next, "samuel_testimony", "collected", { detective: true });
    next = note(next, "player_used_fire_escape_on_murder_night", "detective");
    next = { ...next, detectiveEncounterAvailable: true };
  }
  for (const item of storyScenario.evidence) {
    if (item.location !== locationId || !next.evidence[item.id] || !["present", "discovered"].includes(next.evidence[item.id].physical)) continue;
    if (item.id === "fake_footprint" && next.flags.fake_footprint !== true) continue;
    if (item.id === "lobby_footage" && next.flags.camera_footage_exists !== true) continue;
    if (item.id === "lab_access_log" && next.flags.computer_log_exists !== true) continue;
    next = markEvidence(next, item.id, "collected", { detective: true });
    next = note(next, item.id, "detective");
    if (item.id === "glass_fingerprint" && next.evidence[item.id].identified) next = note(next, "fingerprint_collected_and_matched", "detective");
    if (item.id === "threat_notes" || item.id === "fake_footprint") next = { ...next, flags: { ...next.flags, counterevidence_considered: true } };
    if (locationId === "security" && item.id === "lobby_footage") next = note(next, "lobby_footage_known", "detective");
    if (item.id === "lab_access_log") next = note(next, "lab_log_known", "detective");
  }
  if (locationId === "security" && !known(next, "marcus_denied_authorization")) next = note(next, "marcus_denied_authorization", "detective");
  next = rememberContradictions(next);
  return maybeCharge(next);
}

function maybeCharge(state: StoryGameState): StoryGameState {
  if (state.phase !== "investigation" || state.flags.player_charged === true) return state;
  const rule = storyScenario.engineCompatibility.chargeRule;
  const direct = state.evidence[rule.directEvidence];
  const support = rule.corroborationEvidence.filter((id) => state.evidence[id]?.detectiveKnows).length;
  if (direct?.detectiveKnows && direct.identified && support >= rule.minimumCorroboration && state.flags.counterevidence_considered === true) {
    return { ...state, phase: "pretrial", pretrialMovesRemaining: storyScenario.pretrial.actionsMax, flags: { ...state.flags, player_charged: true }, endingReason: "Dedektif, doğrudan bulguyu bağımsız destek ve karşı delil incelemesiyle birlikte değerlendirdi." };
  }
  return state;
}

function accuse(state: StoryGameState): StoryGameState {
  const rule = storyScenario.engineCompatibility.chargeRule;
  const direct = state.evidence[rule.directEvidence];
  const support = rule.corroborationEvidence.filter((id) => state.evidence[id]?.detectiveKnows).length;
  return direct?.detectiveKnows && direct.identified && support >= rule.minimumCorroboration && state.flags.counterevidence_considered === true
    ? { ...state, phase: "pretrial", pretrialMovesRemaining: storyScenario.pretrial.actionsMax, flags: { ...state.flags, player_charged: true }, endingReason: "Dedektif soruşturma bulgularına dayanarak oyuncuyu resmen suçladı." }
    : state;
}

function calculateVerdict(state: StoryGameState): StoryGameState {
  const rule = storyScenario.engineCompatibility.convictionRule;
  const direct = state.evidence[rule.directEvidence];
  const support = storyScenario.engineCompatibility.chargeRule.corroborationEvidence.filter((id) => state.evidence[id]?.detectiveKnows && state.evidence[id]?.admissible).length;
  const convicted = !!direct?.admissible && support >= rule.minimumIndependentSupport && (!rule.requiresExposedLie || state.exposedLies.length > 0);
  return { ...state, phase: "ending", endingId: convicted ? "PLAYER_CONVICTED" : "PLAYER_ACQUITTED", endingReason: convicted ? "Mahkemede kabul edilebilir doğrudan delil, bağımsız destek ve doğrulanmış bir çelişki birlikte değerlendirildi." : "Mahkûmiyet standardı için gerekli delil zinciri kurulamadı." };
}

function applyEffect(state: StoryGameState, effect: StoryEffect | string): { state: StoryGameState; messages: string[] } {
  let next = state;
  const messages: string[] = [];
  if (typeof effect === "string") {
    switch (effect) {
      case "elena_finds_body_due_to_smell": next = { ...next, flags: { ...next.flags, body_found: true } }; break;
      case "investigation_starts": next = { ...next, phase: "investigation", investigationElapsedMinutes: 0, openingMovesRemaining: 0 }; break;
      case "detective_enters_building": next = { ...next, detectiveKnowledge: addUnique(next.detectiveKnowledge, "corpse_found") }; break;
      case "learn_samuel_saw_entry": next = note(next, "player_used_fire_escape_on_murder_night", "samuel"); next = markEvidence(next, "samuel_testimony", "discovered"); messages.push("Samuel, o gece seni yangın merdiveninde gördüğünü söylüyor."); break;
      case "samuel_trust_down": next = suspicion(next, "player", 1); messages.push("Samuel mesafeli davranmaya başladı."); break;
      case "conditional_silence_attempt":
        if ((next.suspicions.player ?? 0) <= 1) { next = { ...next, samuelSilenced: true, flags: { ...next.flags, samuel_silenced: true } }; messages.push("Samuel, gördüklerini şimdilik kendine saklamayı kabul etti."); }
        else { next = suspicion(next, "player", 1); messages.push("Samuel ikna olmadı; gördüklerini anlatabilir."); }
        break;
      case "bribe_size_branch": messages.push("Senaryoda teklif edilecek miktarlar henüz tanımlanmamış; bu seçenek şimdilik etkisiz."); break;
      case "statement_recorded": messages.push("Beyan kayda geçirildi."); break;
      case "verify_against_known_facts": break;
      case "conversation_only_no_delete_permission": messages.push("Konuşma, kamera kaydını silme yetkisi sağlamadı."); break;
      case "attempt_exit": messages.push((next.suspicions.player ?? 0) >= 2 && next.detectiveKnowledge.length > 1 ? "Dedektif çıkışını takip ediyor; henüz ayrılmadın." : "Karşılaşmadan ayrıldın."); next = { ...next, detectiveEncounterAvailable: false }; break;
      case "learn_illegal_experiments": next = note(next, "illegal_experiments", "noah"); messages.push("Noah, laboratuvardaki deneylerden söz ediyor."); break;
      case "learn_argument": next = note(next, "daniel_adrian_argument", "noah"); next = markEvidence(next, "noah_argument_testimony", "discovered"); messages.push("Noah, Daniel ile Adrian arasındaki tartışmaya tanık olduğunu söylüyor."); break;
      case "no_promise": next = { ...next, flags: { ...next.flags, noah_promise: false } }; break;
      case "record_significant_statement": break;
      case "compare_only_with_known_evidence": next = rememberContradictions(next); break;
      case "noah_automatically_questioned_according_to_agreement":
        if (next.flags.noah_help_choice === "daniel_info") { next = note(next, "daniel_adrian_argument", "detective"); next = markEvidence(next, "noah_argument_testimony", "collected", { detective: true }); }
        else if (next.flags.noah_help_choice === "truthful_help") { next = note(next, "player_helped_noah", "detective"); next = suspicion(next, "player", -1); }
        break;
      case "collect_only_available_evidence": case "update_detectiveKnowledge": case "evaluate_evidence": case "start_trial_if_player_charged": case "otherwise_resolve_other_suspect_or_unsolved": case "detective_identifies_player": break;
      default: messages.push(`Desteklenmeyen senaryo etkisi: ${effect}`);
    }
    return { state: next, messages };
  }
  if (effect.set) {
    const [scope, key] = effect.set.includes(".") ? effect.set.split(".", 2) : ["flags", effect.set];
    if (effect.set === "phase" && ["opening", "investigation", "pretrial", "trial", "ending"].includes(String(effect.value))) next = { ...next, phase: effect.value as StoryPhase };
    else if (effect.set === "openingMovesRemaining") next = { ...next, openingMovesRemaining: Number(effect.value) };
    else if (scope === "flags") next = { ...next, flags: { ...next.flags, [key]: effect.value as StoryGameState["flags"][string] } };
  }
  if (effect.setEvidence) next = markEvidence(next, effect.setEvidence, String(effect.value) as PhysicalEvidenceStatus);
  if (effect.grantItem) { if (!next.inventory.includes(effect.grantItem)) next = { ...next, inventory: [...next.inventory, effect.grantItem] }; }
  if (effect.discover) next = note(next, effect.discover);
  if (effect.unlock) next = { ...next, unlockedLocations: addUnique(next.unlockedLocations, effect.unlock), flags: { ...next.flags, security_unlocked: effect.unlock === "security" || next.flags.security_unlocked === true } };
  if (effect.moveTo) next = { ...next, locationId: effect.moveTo, unlockedLocations: addUnique(next.unlockedLocations, effect.moveTo) };
  if (effect.reveal) { next = note(next, effect.reveal); messages.push("Kapının ardından yalnızca belirsiz hareket sesleri geliyor."); }
  if (effect.awardOnce) {
    const rewardId = `score_${effect.awardOnce}`;
    if (!next.awardedBonuses.includes(rewardId)) { next = { ...next, score: next.score + effect.awardOnce, awardedBonuses: [...next.awardedBonuses, rewardId] }; messages.push(`Dosya bonusu: +${effect.awardOnce}.`); }
  }
  if (effect.createEvidence && next.evidence[effect.createEvidence]) next = markEvidence(next, effect.createEvidence, "present");
  if (effect.mayDiscover) {
    const chance = roll(next); next = chance.state;
    if (chance.value < 0.4) { next = note(next, effect.mayDiscover); next = markEvidence(next, "lab_access_log", "tampered"); messages.push("Kayıt silme işlemi fark edilmiş olabilir."); }
  }
  if (effect.scheduleAfterMinutes && effect.event && !next.eventQueue.some((item) => item.id === effect.event) && !next.completedEvents.includes(effect.event)) {
    next = { ...next, eventQueue: [...next.eventQueue, { id: effect.event, dueAt: next.investigationElapsedMinutes + effect.scheduleAfterMinutes }] };
  }
  if (effect.trigger === "body_discovery_cutscene" && !next.completedEvents.includes("body_discovery_cutscene")) {
    next = { ...next, completedEvents: [...next.completedEvents, "body_discovery_cutscene"] };
    for (const nested of storyScenario.timedEvents.find((event) => event.id === "body_discovery_cutscene")?.effects ?? []) {
      const result = applyEffect(next, nested); next = result.state; messages.push(...result.messages);
    }
    const random = storyScenario.randomChecks.find((check) => check.id === "samuel_presence")!;
    const outcome = roll(next); next = outcome.state;
    next = { ...next, samuelPresent: outcome.value < (random.chance ?? 0), randomRolls: { ...next.randomRolls, samuel_presence: outcome.value < (random.chance ?? 0) ? "present" : "absent" } };
    if (next.samuelPresent) next = { ...next, unlockedLocations: addUnique(next.unlockedLocations, "fire_escape") };
    messages.push("Birkaç gün sonra Elena cesedi buldu. Soruşturma başladı; süre şimdi işlemeye başlıyor.");
    if (next.samuelPresent) messages.push("Yangın merdiveninde Samuel ile karşılaştın.");
  }
  return { state: next, messages };
}

function collectAtVisit(state: StoryGameState, elapsed: number) {
  const visit = storyScenario.engineCompatibility.detectiveVisits.find((item) => item.at === elapsed);
  return visit ? detectiveVisit(state, visit.at, visit.location) : state;
}

function advanceTime(state: StoryGameState, minutes: number): { state: StoryGameState; messages: string[] } {
  if (state.phase !== "investigation" || minutes <= 0) return { state, messages: [] };
  const from = state.investigationElapsedMinutes;
  const to = Math.min(MAX_TIME, from + minutes);
  let next = { ...state, investigationElapsedMinutes: to };
  const messages: string[] = [];
  const visits = storyScenario.engineCompatibility.detectiveVisits.filter((visit) => visit.at > from && visit.at <= to).sort((a, b) => a.at - b.at);
  for (const visit of visits) {
    next = detectiveVisit(next, visit.at, visit.location);
    if (next.phase === "pretrial") { messages.push("Dedektif seni resmen suçladı. Hazırlık aşaması başladı."); break; }
    messages.push("Soruşturmada yeni bir hareketlilik oldu.");
  }
  const dueEvents = next.eventQueue.filter((event) => event.dueAt <= to).sort((a, b) => a.dueAt - b.dueAt || a.id.localeCompare(b.id));
  const rescuePendingAtDeadline = next.eventQueue.some((event) => event.id === "noah_rescue" && event.dueAt >= MAX_TIME);
  for (const event of dueEvents) {
    next = { ...next, eventQueue: next.eventQueue.filter((queued) => queued.id !== event.id) };
    if (event.id === "noah_rescue" && event.dueAt < MAX_TIME && next.phase === "investigation" && next.flags.file_sent === true) {
      next = { ...next, completedEvents: addUnique(next.completedEvents, event.id), flags: { ...next.flags, noah_rescued: true } };
      next = applyEffect(next, { awardOnce: 50 }).state;
      if (next.flags.noah_help_choice === "daniel_info") {
        next = markEvidence(next, "noah_argument_testimony", "collected", { detective: true });
        next = note(next, "daniel_adrian_argument", "detective");
      }
      messages.push("Yetkililer Noah’ı kurtardı. Resmî ifadesi yalnızca bildiği konularla kayda geçti.");
    }
  }
  if (to >= MAX_TIME && next.phase === "investigation") {
    next = { ...next, phase: "ending", endingId: "UNSOLVED", endingReason: "72 saatlik soruşturma süresi doldu; oyuncu resmen suçlanmadı.", flags: { ...next.flags, noah_rescue_pending: (rescuePendingAtDeadline || dueEvents.some((event) => event.id === "noah_rescue")) && next.flags.noah_rescued !== true } };
    next = { ...next, eventQueue: next.eventQueue.filter((event) => event.id !== "noah_rescue") };
    messages.push("72 saat doldu. Oyuncu suçlanmadığı için dava çözülemedi.");
  }
  if (next.flags.under_observation === true && next.detectiveEncounterAvailable === false) next = { ...next, flags: { ...next.flags, under_observation: false } };
  return { state: next, messages };
}

function evaluateRequirements(state: StoryGameState, actionId: string, requires: string[] = [], condition?: string): string | null {
  for (const requirement of requires) {
    if (requirement.startsWith("flags.")) {
      const key = requirement.slice(6); if (!state.flags[key]) return `Ön koşul sağlanmadı: ${key}.`;
    } else if (requirement.startsWith("not_flags.")) {
      const key = requirement.slice(10); if (state.flags[key]) return `Bu eylem artık kullanılamaz: ${key}.`;
    } else if (requirement === "glass_fingerprint_present") {
      if (!["present", "discovered"].includes(state.evidence.glass_fingerprint?.physical ?? "")) return "Bardakta temizlenmemiş bir iz kalmamış.";
    } else if (requirement === "camera_footage_exists") {
      if (state.flags.camera_footage_exists !== true) return "Silinebilir bir kamera kaydı yok.";
    } else if (requirement === "not_under_observation") {
      if (state.flags.under_observation === true) return "Şu anda gözlem altındasın.";
    } else if (requirement === "not_collected") {
      const target = actionId === "clean_glass" ? "glass_fingerprint" : actionId === "remove_threat_notes" ? "threat_notes" : actionId === "plant_footprint" ? "fake_footprint" : "";
      if (target && (state.evidence[target]?.physical === "collected" || target === "fake_footprint" && state.flags.fake_footprint === true)) return "Bu delil üzerinde artık bu işlem yapılamaz.";
    } else return `Desteklenmeyen önkoşul: ${requirement}.`;
  }
  if (condition === "door_allows_peek" && state.locationId !== "corridor") return "Kapı dinleme eylemi yalnızca koridordan yapılabilir.";
  if (condition && condition !== "door_allows_peek") return `Desteklenmeyen koşul: ${condition}.`;
  return null;
}

export function storyActionBlockReason(state: StoryGameState, actionId: string): string | null {
  const action = actionById(actionId);
  if (!action) return "Bilinmeyen eylem.";
  if (actionId === "lockpick_security" && state.unlockedLocations.includes("security")) return "Kapı açık; güvenlik odasına girebilirsin.";
  if (!action.phase.includes(state.phase)) return "Bu aşamada kullanılamaz.";
  if (action.location && action.location !== state.locationId) return "Farklı konumda.";
  if (action.openingMoves && state.phase === "opening" && action.openingMoves > state.openingMovesRemaining) return "Açılış hamlesi kalmadı.";
  if (state.performedActions.includes(action.id) && !["lockpick_security", "submit_password", "peek_door"].includes(action.id)) return "Tamamlandı.";
  return evaluateRequirements(state, actionId, action.requires, action.condition);
}

function runAction(state: StoryGameState, command: Extract<StoryCommand, { type: "action" }>): StoryActionResult {
  const action = actionById(command.actionId);
  if (!action) return { state, notifications: [], error: "Bilinmeyen eylem." };
  if (!action.phase.includes(state.phase)) return { state, notifications: [], error: "Bu eylem mevcut oyun aşamasında kullanılamaz." };
  if (action.location && action.location !== state.locationId) return { state, notifications: [], error: "Bu eylem için doğru konumda değilsin." };
  if (action.id === "lockpick_security" && state.unlockedLocations.includes("security")) return { state, notifications: [], error: "Kapı zaten açık. Koridordan güvenlik odasına girebilirsin." };
  if (action.openingMoves && state.phase === "opening" && action.openingMoves > state.openingMovesRemaining) return { state, notifications: [], error: "Açılışta en fazla beş ücretli hamle yapabilirsin. İstersen şimdi çıkabilirsin." };
  if (action.id === "clean_glass" && state.evidence.glass_fingerprint?.physical === "collected") return { state, notifications: [], error: "Dedektif bu izi daha önce topladı; geriye dönük temizlenemez." };
  const issue = evaluateRequirements(state, action.id, action.requires, action.condition);
  if (issue) return { state, notifications: [], error: issue };
  if (state.performedActions.includes(action.id) && !["lockpick_security", "submit_password", "peek_door"].includes(action.id)) return { state, notifications: [], error: "Bu eylem zaten tamamlandı." };
  if (action.id === "inspect_glass" && ["cleaned", "removed", "deleted"].includes(state.evidence.glass_fingerprint?.physical ?? "")) return { state, notifications: [], error: "Bardaktaki iz artık fiziksel olarak mevcut değil." };

  let next = { ...state, performedActions: addUnique(state.performedActions, action.id), decisionLog: [...state.decisionLog, { ...say(state, action.id, action.text ?? action.id) }] };
  const notifications: string[] = [];
  if (state.phase === "opening" && action.openingMoves) next = { ...next, openingMovesRemaining: next.openingMovesRemaining - action.openingMoves };
  let cost = action.minutes ?? 0;
  if (action.id === "inspect_glass") {
    const old = next.randomRolls.fingerprint_identity_match;
    let matched = old === true;
    if (old === undefined) {
      const result = roll(next); next = result.state; matched = result.value < (storyScenario.randomChecks.find((item) => item.id === "fingerprint_identity_match")?.chance ?? 0.35);
      next = { ...next, randomRolls: { ...next.randomRolls, fingerprint_identity_match: matched } };
    }
    next = markEvidence(next, "glass_fingerprint", "discovered", { identified: matched });
    next = note(next, matched ? "fingerprint_match" : "fingerprint_unidentified");
    notifications.push(matched ? "İz sana ait olabilir; sonuç senin dosyana eklendi." : "Bardaktaki iz için kesin kimlik eşleşmesi çıkmadı.");
  }
  if (action.id === "lockpick_security") {
    const check = storyScenario.randomChecks.find((item) => item.id === action.randomCheck)!;
    const attempt = (next.randomAttempts[check.id] ?? 0) + 1;
    const chance = check.chanceByAttempt?.[Math.min(attempt - 1, (check.chanceByAttempt?.length ?? 1) - 1)] ?? 0.65;
    const result = roll(next); next = { ...result.state, randomAttempts: { ...next.randomAttempts, [check.id]: attempt }, randomRolls: { ...next.randomRolls, [`${check.id}_${attempt}`]: result.value < chance } };
    if (result.value < chance) {
      next = { ...next, unlockedLocations: addUnique(next.unlockedLocations, "security"), flags: { ...next.flags, security_unlocked: true } };
      for (const effect of action.effectsOnSuccess ?? []) { const applied = applyEffect(next, effect); next = applied.state; notifications.push(...applied.messages); }
      notifications.push("Maymuncuk kilidi açtı.");
    } else notifications.push("Maymuncuk denemesi başarısız oldu; tekrar deneyebilirsin.");
  }
  if (action.id === "submit_password") {
    const correct = (command.answer ?? "").trim().toUpperCase() === action.answer;
    cost = correct ? action.minutesOnCorrect ?? 0 : action.minutesOnWrong ?? 0;
    if (correct) { next = { ...next, flags: { ...next.flags, password_unlocked: true } }; for (const effect of action.effectsOnCorrect ?? []) { const applied = applyEffect(next, effect); next = applied.state; } notifications.push("Şifre kabul edildi. Dosya erişime açıldı."); }
    else notifications.push("Şifre yanlış. 10 dakika geçti; yeniden deneyebilirsin.");
  }
  for (const effect of action.effects ?? []) { const applied = applyEffect(next, effect); next = applied.state; notifications.push(...applied.messages); }
  if (action.id === "find_hidden_card") next = { ...next, flags: { ...next.flags, card_found: true } };
  if (action.id === "plant_footprint") { next = markEvidence(next, "fake_footprint", "present"); next = { ...next, flags: { ...next.flags, fake_footprint: true } }; notifications.push("Sahte ayak izi yerleştirildi; bu tek başına kimseyi suçlamaz."); }
  if (action.id === "remove_threat_notes") { next = markEvidence(next, "threat_notes", "removed"); next = { ...next, flags: { ...next.flags, threat_notes_removed: true } }; }
  if (action.id === "delete_camera") {
    next = markEvidence(next, "lobby_footage", "deleted");
    next = { ...next, flags: { ...next.flags, camera_footage_deleted: true, camera_footage_exists: false } };
    notifications.push(known(next, "player_entered_lobby") ? "Görüntü silindi; dedektif daha önce izlediği kaydı hatırlıyor." : "Görüntü silindi. Bu işlem otomatik olarak sana bağlanmadı.");
  }
  if (action.id === "copy_research") notifications.push("Dosya kopyalandı; laboratuvar erişim kaydı oluştu.");
  if (action.id === "copy_research") next = markEvidence(next, "lab_access_log", "present");
  if (action.id === "delete_computer_log") { next = markEvidence(next, "lab_access_log", "deleted"); next = { ...next, flags: { ...next.flags, computer_log_deleted: true, computer_log_exists: false } }; }
  if (action.id === "send_research") { next = { ...next, flags: { ...next.flags, file_sent: true } }; notifications.push("Dosya yetkililere iletildi. Noah için kurtarma olayı altı saat sonrasına planlandı."); }
  if (action.id === "leave_opening") {
    return { state: collectAtVisit(next, 0), notifications };
  }
  if (action.id === "peek_door") notifications.push("Kapının ardından ses var gibi; içeride kimin olduğunu çıkaramıyorsun.");
  if (action.id === "inspect_threat_notes") { next = markEvidence(next, "threat_notes", "discovered"); next = note(next, "threat_notes"); }
  const advanced = advanceTime(next, cost); next = advanced.state; notifications.push(...advanced.messages);
  if (action.id === "send_research") next = { ...next, eventQueue: next.eventQueue.map((event) => event.id === "noah_rescue" ? { ...event, dueAt: next.investigationElapsedMinutes + 360 } : event) };
  if (!notifications.length) notifications.push("Eylem tamamlandı.");
  return { state: next, notifications };
}

function runMove(state: StoryGameState, locationId: string): StoryActionResult {
  if (state.phase !== "opening" && state.phase !== "investigation") return { state, notifications: [], error: "Bu aşamada yeni konum keşfedemezsin." };
  if (state.phase === "opening") return { state, notifications: [], error: "Açılış bölümünde ofisten ayrılamazsın; en fazla beş ücretli hamleden sonra açılışı bitir." };
  const current = storyScenario.locations.find((item) => item.id === state.locationId);
  const target = storyScenario.locations.find((item) => item.id === locationId);
  if (!current || !target || !current.neighbors.includes(locationId)) return { state, notifications: [], error: "Bu konuma doğrudan geçiş yok." };
  if (!state.unlockedLocations.includes(locationId)) return { state, notifications: [], error: "Bu konum henüz erişime açık değil." };
  let next = { ...state, locationId, unlockedLocations: addUnique(state.unlockedLocations, locationId), decisionLog: [...state.decisionLog, { ...say(state, `move:${locationId}`, target.label) }] };
  if (locationId === "lobby" && next.flags.camera_footage_exists !== true && next.flags.camera_footage_deleted !== true) {
    next = { ...next, flags: { ...next.flags, camera_footage_exists: true } };
    next = markEvidence(next, "lobby_footage", "present");
    next = note(next, "player_entered_lobby");
  }
  const advanced = advanceTime(next, storyScenario.engineCompatibility.travelMinutes);
  let moved = advanced.state;
  if (locationId === "laboratory" && moved.phase === "investigation") moved = { ...moved, unlockedLocations: addUnique(moved.unlockedLocations, "laboratory") };
  if (moved.locationId !== state.locationId) moved = { ...moved, detectiveEncounterAvailable: false, flags: { ...moved.flags, under_observation: false } };
  return { state: moved, notifications: [`${target.label} konumuna geçtin.`, ...advanced.messages] };
}

function runDialogue(state: StoryGameState, dialogueId: string, choiceId: string): StoryActionResult {
  const dialogue = dialogueById(dialogueId);
  if (!dialogue) return { state, notifications: [], error: "Konuşma bulunamadı." };
  if (state.phase !== "investigation") return { state, notifications: [], error: "Bu görüşme yalnızca soruşturma sırasında yapılabilir." };
  if (state.flags[`dialogue_completed_${dialogueId}`] === true) return { state, notifications: [], error: "Bu görüşme zaten yanıtlandı." };
  if (dialogue.character === "samuel" && (!state.samuelPresent || state.locationId !== "fire_escape")) return { state, notifications: [], error: "Samuel şu anda burada değil." };
  if (dialogue.character === "marcus" && (state.locationId !== "security" || !state.unlockedLocations.includes("security"))) return { state, notifications: [], error: "Marcus ile konuşmak için güvenlik odasına erişmelisin." };
  if (dialogue.character === "noah" && (state.locationId !== "laboratory" || !state.flags.password_unlocked)) return { state, notifications: [], error: "Noah ile konuşmak için laboratuvar hücresine erişmelisin." };
  if (dialogueId === "noah_help" && state.flags.noah_promise !== true) return { state, notifications: [], error: "Önce Noah’a yardım sözü vermelisin." };
  const entry = choiceById(dialogueId, choiceId);
  if (dialogue.choices.some((choice) => typeof choice === "string") && dialogueId === "detective_encounter") {
    if (!state.detectiveEncounterAvailable) return { state, notifications: [], error: "Dedektifle şu anda karşılaşmıyorsun." };
    if (choiceId === "truthful_answer") {
      const id = `statement_${state.statements.length + 1}`;
      const next = { ...state, statements: [...state.statements, { id, speaker: "player", recipient: "detective", topic: "fire_escape_presence", value: "trueful_answer", time: state.investigationElapsedMinutes, knownBy: ["player", "detective"] }], detectiveEncounterAvailable: false, flags: { ...state.flags, dialogue_completed_detective_encounter: true } };
      return { state: next, notifications: ["Doğru bildiğin kadarıyla yanıt verdin; ifade kayda geçti."] };
    }
    if (choiceId === "lie") {
      const id = `statement_${state.statements.length + 1}`;
      let next: StoryGameState = { ...state, statements: [...state.statements, { id, speaker: "player", recipient: "detective", topic: "fire_escape_presence", value: "denies", time: state.investigationElapsedMinutes, knownBy: ["player", "detective"], lie: true }], detectiveEncounterAvailable: false, flags: { ...state.flags, dialogue_completed_detective_encounter: true } };
      next = rememberContradictions(next);
      return { state: next, notifications: [next.exposedLies.includes(id) ? "Dedektif, bildiği bir olguyla yanıtındaki çelişkiyi fark etti." : "Yanıt kayda geçti. Dedektifin bilmediği bir bilgiyle çelişki kurulmadı."] };
    }
    if (choiceId === "evasive_answer") return { state: { ...state, detectiveEncounterAvailable: false, flags: { ...state.flags, dialogue_completed_detective_encounter: true } }, notifications: ["Kaçamak yanıtın kayda geçti; dedektifin iç bulguları sana gösterilmedi."] };
    if (choiceId === "attempt_leave") {
      const blocked = known(state, "player_used_fire_escape_on_murder_night") && (state.suspicions.player ?? 0) >= 2;
      return { state: { ...state, detectiveEncounterAvailable: false, flags: { ...state.flags, dialogue_completed_detective_encounter: true } }, notifications: [blocked ? "Dedektif, bildiği somut bilgi nedeniyle ayrılmana izin vermedi; henüz suçlama kararı vermedi." : "Karşılaşmadan ayrıldın; dedektifin konumu haritada gösterilmiyor."] };
    }
    return { state, notifications: [], error: "Geçersiz diyalog seçimi." };
  }
  if (!entry) return { state, notifications: [], error: "Bu diyalog seçeneği henüz tanımlanmamış." };
  const id = `statement_${state.statements.length + 1}`;
  let next = { ...state, flags: { ...state.flags, [`dialogue_completed_${dialogueId}`]: true }, statements: [...state.statements, { id, speaker: "player", recipient: dialogue.character, topic: `${dialogue.character}:${choiceId}`, value: entry.text, time: state.investigationElapsedMinutes, knownBy: ["player"], lie: choiceId === "deny" || choiceId === "claim_authority" }] };
  const messages: string[] = [];
  for (const effect of entry.effects ?? []) { const applied = applyEffect(next, effect); next = applied.state; messages.push(...applied.messages); }
  if (dialogue.character === "samuel" && choiceId === "deny") next = rememberContradictions({ ...next, statements: next.statements.map((statement) => statement.id === id ? { ...statement, topic: "fire_escape_presence" } : statement) });
  if (dialogue.character === "marcus" && choiceId === "claim_authority") next = { ...next, statements: next.statements.map((statement) => statement.id === id ? { ...statement, topic: "security_authority" } : statement) };
  return { state: next, notifications: messages.length ? messages : ["İfade not defterine kaydedildi."] };
}

function runPretrial(state: StoryGameState, choiceId: "review_statements" | "prepare_defense" | "review_noah"): StoryActionResult {
  if (state.phase !== "pretrial" || state.flags.player_charged !== true) return { state, notifications: [], error: "Hazırlık aşaması yalnızca oyuncu suçlandığında açılır." };
  if (state.pretrialChoices.includes(choiceId)) return { state, notifications: [], error: "Bu hazırlık hamlesi zaten kullanıldı." };
  if (choiceId === "review_noah" && state.flags.noah_rescued !== true) return { state, notifications: [], error: "Noah’ın kurtarılabilir bir ifadesi yok." };
  const pretrialChoices = [...state.pretrialChoices, choiceId];
  const remaining = Math.max(0, storyScenario.pretrial.actionsMax - pretrialChoices.length);
  let next: StoryGameState = { ...state, pretrialChoices, pretrialMovesRemaining: remaining, phase: remaining === 0 ? "trial" : "pretrial", decisionLog: [...state.decisionLog, { ...say(state, `pretrial:${choiceId}`, choiceId) }] };
  if (choiceId === "review_statements") next = { ...next, flags: { ...next.flags, statements_reviewed: true } };
  if (choiceId === "prepare_defense") next = { ...next, flags: { ...next.flags, defense_prepared: true } };
  if (choiceId === "review_noah") { next = { ...next, flags: { ...next.flags, noah_testimony_reviewed: true } }; next = note(next, "noah_statement_reviewed"); }
  return { state: next, notifications: [remaining ? `Hazırlık tamamlandı. ${remaining} hamlen kaldı.` : "İki hazırlık hamlesi tamamlandı. Mahkeme başladı."] };
}

function runTrial(state: StoryGameState, questionId: string, choiceId: string): StoryActionResult {
  if (state.phase !== "trial" || state.flags.player_charged !== true) return { state, notifications: [], error: "Mahkeme yalnızca oyuncu suçlandıktan sonra açılır." };
  const index = storyScenario.trial.questions.findIndex((question) => question.id === questionId);
  if (index < 0 || index !== Object.keys(state.trialAnswers).length) return { state, notifications: [], error: "Mahkeme soruları sırayla yanıtlanmalı." };
  const question = storyScenario.trial.questions[index];
  const choices = question.choices?.map((item) => item.id) ?? question.choicesTemplate ?? [];
  if (!choices.includes(choiceId)) return { state, notifications: [], error: "Bu soruya geçerli bir yanıt seç." };
  const trialAnswers = { ...state.trialAnswers, [questionId]: choiceId };
  const response = storyScenario.engineCompatibility.trialResponses[questionId]?.[choiceId] ?? "unresolved";
  const statementId = `court_${questionId}`;
  const contradicted = response === "contradiction" && state.detectiveKnowledge.some((fact) => ["player_used_fire_escape_on_murder_night", "marcus_denied_authorization", "fingerprint_collected_and_matched"].includes(fact));
  let next = { ...state, trialAnswers, decisionLog: [...state.decisionLog, { ...say(state, `trial:${questionId}`, choiceId) }], statements: [...state.statements, { id: statementId, speaker: "player", recipient: "court", topic: questionId, value: choiceId, time: state.investigationElapsedMinutes, knownBy: ["player", "court"], lie: response === "contradiction", contradicted }] };
  if (contradicted) next = { ...next, exposedLies: addUnique(next.exposedLies, statementId) };
  if (Object.keys(trialAnswers).length === storyScenario.trial.questionCount) {
    const result = calculateVerdict(next);
    return { state: result, notifications: ["Üç soru yanıtlandı. Mahkeme hükmünü açıkladı."] };
  }
  return { state: next, notifications: [`Mahkeme yanıtı kaydedildi. ${storyScenario.trial.questionCount - Object.keys(trialAnswers).length} soru kaldı.`] };
}

export function canCharge(state: StoryGameState) {
  const rule = storyScenario.engineCompatibility.chargeRule;
  return state.phase === "investigation" && state.evidence[rule.directEvidence]?.detectiveKnows === true && state.evidence[rule.directEvidence]?.identified === true && rule.corroborationEvidence.filter((id) => state.evidence[id]?.detectiveKnows).length >= rule.minimumCorroboration && state.flags.counterevidence_considered === true;
}

export function dispatchStoryAction(state: StoryGameState, command: StoryCommand): StoryActionResult {
  if (state.phase === "ending") return { state, notifications: [], error: "Dosya kapanmış durumda." };
  if (command.type === "action") return runAction(state, command);
  if (command.type === "move") return runMove(state, command.locationId);
  if (command.type === "dialogue") return runDialogue(state, command.dialogueId, command.choiceId);
  if (command.type === "pretrial") return runPretrial(state, command.choiceId);
  if (command.type === "trial") return runTrial(state, command.questionId, command.choiceId);
  if (command.type === "charge") {
    if (!canCharge(state)) return { state, notifications: [], error: "Dedektifin elinde henüz yeterli ve değerlendirilmiş kanıt zinciri yok." };
    return { state: accuse(state), notifications: ["Dedektif seni resmen suçladı; iki hazırlık hamlen bulunuyor."] };
  }
  if (command.type === "wait") {
    if (state.phase !== "investigation") return { state, notifications: [], error: "Zaman yalnızca soruşturma aşamasında ilerletilebilir." };
    const minutes = Math.max(1, Math.min(360, Math.floor(command.minutes ?? 60)));
    const advanced = advanceTime(state, minutes);
    return { state: advanced.state, notifications: [`${minutes} dakika geçti.`, ...advanced.messages] };
  }
  return { state, notifications: [], error: "Geçersiz oyun komutu." };
}
