import rawScenario from "@/content/scenarios/OLUMCUL_PROJE_SENARYO_V1.json";
import type { StoryAction, StoryChoice, StoryEffect, StoryScenario } from "./types";

const supportedSymbols = new Set([
  "elena_finds_body_due_to_smell", "investigation_starts", "detective_enters_building", "collect_only_available_evidence", "update_detectiveKnowledge",
  "noah_automatically_questioned_according_to_agreement", "evaluate_evidence", "start_trial_if_player_charged", "otherwise_resolve_other_suspect_or_unsolved",
  "samuel_trust_down", "conditional_silence_attempt", "bribe_size_branch", "learn_samuel_saw_entry", "statement_recorded", "verify_against_known_facts",
  "conversation_only_no_delete_permission", "attempt_exit", "learn_illegal_experiments", "learn_argument", "no_promise", "record_significant_statement",
  "compare_only_with_known_evidence", "detective_identifies_player", "fingerprint_collected_and_matched", "samuel_testimony_known", "lobby_footage_known", "lab_log_known",
  "investigation_still_active", "door_allows_peek", "glass_fingerprint_present", "not_collected", "camera_footage_exists", "not_under_observation", "not_flags.file_copied", "flags.file_copied",
  "samuel_present_and_first_encounter", "marcus_in_security", "enter_noah_cell_view", "noah_promise", "same_location",
  "leave_opening", "investigation_return", "detective_visits_relevant_location", "fingerprint_examined", "360_minutes_after_send_research", "evidence_threshold_for_player_reached", "investigationElapsedMinutes>=4320"
]);
const effectKeys = new Set(["set", "value", "setEvidence", "grantItem", "discover", "trigger", "moveTo", "reveal", "unlock", "awardOnce", "scheduleAfterMinutes", "event", "createEvidence", "mayDiscover"]);

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function fail(errors: string[]): never { throw new Error(`Ölümcül Proje senaryosu doğrulanamadı:\n${errors.map((error) => `• ${error}`).join("\n")}`); }
function list<T>(value: unknown): value is T[] { return Array.isArray(value); }

export function validateStoryScenario(input: unknown): StoryScenario {
  const errors: string[] = [];
  if (!isRecord(input)) fail(["Kök değer JSON nesnesi olmalı."]);
  const requiredRoot = ["id", "title", "schemaVersion", "locale", "design", "investigation", "stateDefaults", "characters", "locations", "evidence", "actions", "dialogues", "randomChecks", "timedEvents", "pretrial", "trial", "endings", "finalReportFields", "truth", "engineCompatibility"];
  for (const key of requiredRoot) if (!(key in input)) errors.push(`Kök alan eksik: ${key}.`);
  const ids = (key: string) => {
    const entries = input[key];
    if (!list<Record<string, unknown>>(entries)) { errors.push(`${key} bir liste olmalı.`); return new Set<string>(); }
    const found = entries.map((entry) => String(entry.id ?? ""));
    if (found.some((id) => !id)) errors.push(`${key} içinde boş id var.`);
    if (new Set(found).size !== found.length) errors.push(`${key} içinde yinelenen id var.`);
    return new Set(found);
  };
  const locationIds = ids("locations"), characterIds = ids("characters"), evidenceIds = ids("evidence");
  const actionIds = ids("actions"), dialogueIds = ids("dialogues"), randomIds = ids("randomChecks"), eventIds = ids("timedEvents");
  const endings = (input.endings ?? []) as Array<Record<string, unknown>>;
  const activeEndings = endings.filter((ending) => ending.enabled === true).map((ending) => ending.id);
  const canonical = ["PLAYER_CONVICTED", "PLAYER_ACQUITTED", "UNSOLVED"];
  if (canonical.some((id) => !activeEndings.includes(id)) || activeEndings.some((id) => !canonical.includes(String(id)))) errors.push("Yalnızca üç kanonik final etkin olabilir: PLAYER_CONVICTED, PLAYER_ACQUITTED, UNSOLVED.");

  const locations = (input.locations ?? []) as Array<Record<string, unknown>>;
  for (const location of locations) for (const neighbor of (location.neighbors ?? []) as string[]) if (!locationIds.has(neighbor)) errors.push(`locations.${location.id}: bilinmeyen komşu ${neighbor}.`);
  const evidence = (input.evidence ?? []) as Array<Record<string, unknown>>;
  const initialStatuses = new Set(["present", "absent", "not_reported", "no_player_footage", "password_protected", "discovered", "collected", "cleaned", "removed", "deleted", "tampered"]);
  for (const item of evidence) {
    if (item.location && !locationIds.has(String(item.location))) errors.push(`evidence.${item.id}: bilinmeyen konum ${item.location}.`);
    if (item.initial != null && !initialStatuses.has(String(item.initial))) errors.push(`evidence.${item.id}: bilinmeyen başlangıç durumu ${item.initial}.`);
  }
  const actions = (input.actions ?? []) as Array<Record<string, unknown>>;
  for (const action of actions) {
    if (action.location && !locationIds.has(String(action.location))) errors.push(`actions.${action.id}: bilinmeyen konum ${action.location}.`);
    if (action.randomCheck && !randomIds.has(String(action.randomCheck))) errors.push(`actions.${action.id}: bilinmeyen rastgele kontrol ${action.randomCheck}.`);
    for (const phase of (action.phase ?? []) as string[]) if (!["opening", "investigation", "pretrial", "trial", "ending"].includes(phase)) errors.push(`actions.${action.id}: bilinmeyen faz ${phase}.`);
    if (!Array.isArray(action.phase) || action.phase.length === 0) errors.push(`actions.${action.id}: en az bir oyun fazı gerekli.`);
    for (const field of ["minutes", "minutesOnWrong", "minutesOnCorrect", "openingMoves"] as const) if (action[field] != null && (Number(action[field]) < 0 || !Number.isFinite(Number(action[field])))) errors.push(`actions.${action.id}: ${field} negatif veya geçersiz olamaz.`);
    const actionEffects = [
      ...((action.effects as unknown[] | undefined) ?? []),
      ...((action.effectsOnSuccess as unknown[] | undefined) ?? []),
      ...((action.effectsOnCorrect as unknown[] | undefined) ?? [])
    ];
    for (const effect of actionEffects) validateEffect(effect, `actions.${action.id}`, errors, locationIds, evidenceIds, eventIds);
    for (const condition of (action.requires ?? []) as string[]) if (!supportedSymbols.has(condition) && !condition.startsWith("flags.") && !condition.startsWith("not_flags.")) errors.push(`actions.${action.id}: desteklenmeyen önkoşul ${condition}.`);
    if (action.condition && !supportedSymbols.has(String(action.condition))) errors.push(`actions.${action.id}: desteklenmeyen koşul ${action.condition}.`);
  }
  const dialogues = (input.dialogues ?? []) as Array<Record<string, unknown>>;
  for (const dialogue of dialogues) {
    if (!characterIds.has(String(dialogue.character))) errors.push(`dialogues.${dialogue.id}: bilinmeyen karakter ${dialogue.character}.`);
    if (!supportedSymbols.has(String(dialogue.trigger)) && dialogue.id !== "detective_encounter") errors.push(`dialogues.${dialogue.id}: desteklenmeyen tetikleyici ${dialogue.trigger}.`);
    for (const effect of (dialogue.effects ?? []) as unknown[]) validateEffect(effect, `dialogues.${dialogue.id}`, errors, locationIds, evidenceIds, eventIds);
    if (!Array.isArray(dialogue.choices) || dialogue.choices.length === 0) errors.push(`dialogues.${dialogue.id}: en az bir seçenek gerekli.`);
    for (const choice of (dialogue.choices ?? []) as unknown[]) {
      if (typeof choice === "string") { if (dialogue.id !== "detective_encounter") errors.push(`dialogues.${dialogue.id}: metinsiz seçenek yalnızca dedektif karşılaşmasında desteklenir.`); continue; }
      if (!isRecord(choice) || !choice.id || typeof choice.text !== "string") { errors.push(`dialogues.${dialogue.id}: seçenek id ve text içermeli.`); continue; }
      for (const effect of (choice.effects ?? []) as unknown[]) validateEffect(effect, `dialogues.${dialogue.id}.${choice.id}`, errors, locationIds, evidenceIds, eventIds);
    }
  }
  for (const event of (input.timedEvents ?? []) as Array<Record<string, unknown>>) {
    if (!supportedSymbols.has(String(event.trigger))) errors.push(`timedEvents.${event.id}: desteklenmeyen tetikleyici ${event.trigger}.`);
    for (const requirement of (event.requires ?? []) as string[]) if (!supportedSymbols.has(requirement) && !requirement.startsWith("flags.") && !requirement.startsWith("not_flags.")) errors.push(`timedEvents.${event.id}: desteklenmeyen önkoşul ${requirement}.`);
    for (const effect of (event.effects ?? []) as unknown[]) if (isRecord(effect)) validateEffect(effect, `timedEvents.${event.id}`, errors, locationIds, evidenceIds, eventIds);
    else if (!supportedSymbols.has(String(effect))) errors.push(`timedEvents.${event.id}: desteklenmeyen etki ${effect}.`);
  }
  for (const check of (input.randomChecks ?? []) as Array<Record<string, unknown>>) {
    if (check.chance != null && (Number(check.chance) < 0 || Number(check.chance) > 1)) errors.push(`randomChecks.${check.id}: olasılık 0 ile 1 arasında olmalı.`);
    if (check.chanceByAttempt != null && (!list(check.chanceByAttempt) || check.chanceByAttempt.some((value) => Number(value) < 0 || Number(value) > 1))) errors.push(`randomChecks.${check.id}: deneme olasılıkları 0 ile 1 arasında olmalı.`);
  }
  const trial = input.trial as Record<string, unknown> | undefined;
  if (!trial || trial.questionCount !== 3 || !list(trial.questions) || trial.questions.length !== 3) errors.push("Mahkeme tam üç soruya sahip olmalı.");
  const compatibility = input.engineCompatibility as Record<string, unknown> | undefined;
  if (!compatibility || compatibility.adapterVersion !== 1 || !list(compatibility.detectiveVisits)) errors.push("engineCompatibility.adapterVersion=1 ve dedektif ziyaret takvimi gerekli.");
  else {
    let previousMinute = -1;
    for (const visit of compatibility.detectiveVisits as Array<Record<string, unknown>>) {
      if (!locationIds.has(String(visit.location))) errors.push(`engineCompatibility: bilinmeyen dedektif ziyaret konumu ${visit.location}.`);
      if (!Number.isInteger(visit.at) || Number(visit.at) < previousMinute || Number(visit.at) < 0 || Number(visit.at) > Number((input.design as Record<string, unknown>)?.investigationMinutes)) errors.push(`engineCompatibility: ziyaret zamanı sıralı ve soruşturma süresi içinde olmalı (${visit.at}).`);
      previousMinute = Number(visit.at);
    }
    const charge = compatibility.chargeRule as Record<string, unknown> | undefined;
    const conviction = compatibility.convictionRule as Record<string, unknown> | undefined;
    if (!charge || !evidenceIds.has(String(charge.directEvidence)) || !list(charge.corroborationEvidence) || charge.corroborationEvidence.some((id) => !evidenceIds.has(String(id)))) errors.push("engineCompatibility.chargeRule bilinmeyen veya eksik delil referansı içeriyor.");
    if (!conviction || !evidenceIds.has(String(conviction.directEvidence))) errors.push("engineCompatibility.convictionRule doğrudan delil referansı geçersiz.");
    const responses = compatibility.trialResponses as Record<string, Record<string, unknown>> | undefined;
    if (!responses) errors.push("engineCompatibility.trialResponses gerekli.");
    else for (const [questionId, answers] of Object.entries(responses)) {
      const question = trial && (trial.questions as Array<Record<string, unknown>>).find((item) => item.id === questionId);
      if (!question) errors.push(`engineCompatibility.trialResponses bilinmeyen soru: ${questionId}.`);
      if (!isRecord(answers)) errors.push(`engineCompatibility.trialResponses.${questionId} nesne olmalı.`);
      else if (question) {
        const choiceIds = list<Record<string, unknown>>(question.choices) ? question.choices.map((choice) => String(choice.id)) : (question.choicesTemplate as string[] | undefined) ?? [];
        for (const choiceId of Object.keys(answers)) if (!choiceIds.includes(choiceId)) errors.push(`engineCompatibility.trialResponses.${questionId}: bilinmeyen yanıt ${choiceId}.`);
      }
    }
  }
  if (String(input.schemaVersion) !== "1.0.0-authoring") errors.push("Bilinmeyen senaryo authoring sürümü.");
  if (errors.length) fail(errors);
  return input as unknown as StoryScenario;
}

function validateEffect(effect: unknown, source: string, errors: string[], locations: Set<string>, evidence: Set<string>, events: Set<string>) {
  if (typeof effect === "string") { if (!supportedSymbols.has(effect)) errors.push(`${source}: desteklenmeyen etki '${effect}'.`); return; }
  if (!isRecord(effect)) { errors.push(`${source}: etki nesne veya tanımlı sembol olmalı.`); return; }
  const keys = Object.keys(effect);
  for (const key of keys) if (!effectKeys.has(key)) errors.push(`${source}: desteklenmeyen etki operatörü '${key}'.`);
  if (effect.moveTo && !locations.has(String(effect.moveTo))) errors.push(`${source}: bilinmeyen hedef konum ${effect.moveTo}.`);
  if (effect.setEvidence && !evidence.has(String(effect.setEvidence))) errors.push(`${source}: bilinmeyen delil ${effect.setEvidence}.`);
  if (effect.createEvidence && !evidence.has(String(effect.createEvidence))) errors.push(`${source}: bilinmeyen delil ${effect.createEvidence}.`);
  if (effect.event && !events.has(String(effect.event))) errors.push(`${source}: bilinmeyen zamanlanmış olay ${effect.event}.`);
}

export const storyScenario = validateStoryScenario(rawScenario);
export function actionById(id: string): StoryAction | undefined { return storyScenario.actions.find((action) => action.id === id); }
export function dialogueById(id: string) { return storyScenario.dialogues.find((dialogue) => dialogue.id === id); }
export function choiceById(dialogueId: string, choiceId: string): StoryChoice | undefined {
  const choices = dialogueById(dialogueId)?.choices;
  return Array.isArray(choices) ? choices.find((choice) => typeof choice !== "string" && choice.id === choiceId) as StoryChoice | undefined : undefined;
}
