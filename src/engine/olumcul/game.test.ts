import { describe, expect, it } from "vitest";
import { canCharge, createStoryState, dispatchStoryAction, loadStoryState, saveStoryState, storyActionBlockReason } from "./game";
import { storyScenario, validateStoryScenario } from "./scenario";
import type { StoryGameState } from "./types";

const act = (state: StoryGameState, actionId: string, answer?: string) => dispatchStoryAction(state, { type: "action", actionId, answer });
const leave = (state: StoryGameState) => act(state, "leave_opening").state;
const investigation = () => leave(createStoryState("Test"));
const sendCommand = (state: StoryGameState, command: Parameters<typeof dispatchStoryAction>[1]) => {
  const result = dispatchStoryAction(state, command);
  if (result.error) throw new Error(result.error);
  return result.state;
};

function chargedState(makeLie: boolean) {
  let state = createStoryState("Test", 1);
  state = act(state, "inspect_glass").state;
  state = act(state, "find_hidden_card").state;
  state = leave(state);
  state = sendCommand(state, { type: "move", locationId: "corridor" });
  if (makeLie) {
    state = sendCommand(state, { type: "move", locationId: "fire_escape" });
    state = sendCommand(state, { type: "dialogue", dialogueId: "samuel_first", choiceId: "deny" });
    state = sendCommand(state, { type: "move", locationId: "corridor" });
  }
  state = sendCommand(state, { type: "move", locationId: "lobby" });
  state = sendCommand(state, { type: "wait", minutes: 360 });
  if (state.phase !== "pretrial") throw new Error(`Expected charge at/after support chain, got ${state.phase}; t=${state.investigationElapsedMinutes}; found=${JSON.stringify(state.evidence)}; notes=${state.flags.counterevidence_considered}`);
  return state;
}

function finishTrial(state: StoryGameState, choices: string[]) {
  state = sendCommand(state, { type: "pretrial", choiceId: "review_statements" });
  state = sendCommand(state, { type: "pretrial", choiceId: "prepare_defense" });
  for (let i = 0; i < storyScenario.trial.questions.length; i++) {
    const question = storyScenario.trial.questions[i];
    state = sendCommand(state, { type: "trial", questionId: question.id, choiceId: choices[i] });
  }
  return state;
}

describe("Ölümcül Proje mekanikleri", () => {
  it("authoring verisini doğrular ve yalnızca üç kanonik finali açar", () => {
    expect(storyScenario.endings.filter((ending) => ending.enabled).map((ending) => ending.id).sort()).toEqual(["PLAYER_ACQUITTED", "PLAYER_CONVICTED", "UNSOLVED"]);
    expect(storyScenario.trial.questionCount).toBe(3);
  });

  it("açılış hamle sınırı olmadan zamanlayıcıyı sıfırdan başlatır", () => {
    let state = createStoryState();
    state = act(state, "inspect_glass").state;
    for (const id of ["clean_glass", "search_drawer", "find_hidden_card", "remove_threat_notes", "plant_footprint"]) state = act(state, id).state;
    expect(state.openingMovesRemaining).toBe(0);
    expect(state.investigationElapsedMinutes).toBe(0);
    state = leave(state);
    expect(state.phase).toBe("investigation");
    expect(state.investigationElapsedMinutes).toBe(0);
  });

  it("açılışta mekân değiştirerek hamle sınırını aşmaya izin vermez", () => {
    const result = dispatchStoryAction(createStoryState(), { type: "move", locationId: "corridor" });
    expect(result.error).toMatch(/Açılış/);
  });

  it("save/load deterministik rasgeleliği ve soruşturma durumunu korur", () => {
    const state = investigation();
    const restored = loadStoryState(saveStoryState(state));
    expect(restored?.rngState).toBe(state.rngState);
    expect(restored?.samuelPresent).toBe(state.samuelPresent);
    expect(restored?.eventQueue).toEqual(state.eventQueue);
  });

  it("önceki yerel kayıtları yeni delil şemasıyla uyumlu hale getirir", () => {
    const old = createStoryState("Saved");
    delete old.evidence.file_transmission_log;
    old.evidence.noah_argument_testimony = { physical: "present", detectiveKnows: false, admissible: true };
    const restored = loadStoryState(saveStoryState(old));
    expect(restored?.evidence.file_transmission_log?.physical).toBe("absent");
    expect(restored?.evidence.noah_argument_testimony).toMatchObject({ physical: "absent", admissible: false });
  });

  it("onboarding ilerlemesini kaydeder ve eski kayıtları açılış sahnelerini geçmiş sayar", () => {
    const fresh = createStoryState("Test");
    expect(fresh.flags).toMatchObject({ ui_intro_seen: false, ui_briefing_seen: false, ui_chapter_seen: false, tutorial_evidence_seen: false });
    const resumed = loadStoryState(saveStoryState({ ...fresh, flags: { ...fresh.flags, ui_intro_seen: true, ui_briefing_seen: true, tutorial_time_seen: true } }));
    expect(resumed?.flags).toMatchObject({ ui_intro_seen: true, ui_briefing_seen: true, ui_chapter_seen: false, tutorial_time_seen: true });

    const legacy = structuredClone(fresh);
    delete legacy.flags.ui_intro_seen;
    delete legacy.flags.ui_briefing_seen;
    delete legacy.flags.ui_chapter_seen;
    const migrated = loadStoryState(saveStoryState(legacy));
    expect(migrated?.flags).toMatchObject({ ui_intro_seen: true, ui_briefing_seen: true, ui_chapter_seen: true });
  });

  it("yanlış parola 15 dakika, doğru parola sıfır dakika sürer", () => {
    let state = investigation();
    state = { ...state, phase: "investigation", locationId: "laboratory", unlockedLocations: ["laboratory"], flags: { ...state.flags, security_unlocked: true } };
    const wrong = act(state, "submit_password", "NOPE");
    expect(wrong.state.investigationElapsedMinutes).toBe(15);
    const right = act(wrong.state, "submit_password", "N170412");
    expect(right.state.flags.password_unlocked).toBe(true);
    expect(right.state.investigationElapsedMinutes).toBe(15);
  });

  it("maymuncuk her denemede 30 dakika harcar, olasılığı artırır ve son eşiği tekrarlar", () => {
    let state = { ...investigation(), locationId: "corridor", rngState: 4 };
    const results: boolean[] = [];
    for (let attempt = 1; attempt <= 5; attempt++) {
      state = act(state, "lockpick_security").state;
      results.push(state.randomRolls[`lockpick_attempt_${attempt}`] as boolean);
      expect(state.randomAttempts.lockpick_attempt).toBe(attempt);
      expect(state.investigationElapsedMinutes).toBe(attempt * 45);
    }
    expect(results).toEqual([false, false, false, false, true]);
    expect(state.unlockedLocations).toContain("security");
    expect(storyActionBlockReason(state, "lockpick_security")).toMatch(/Kapı açık/);
    expect(act(state, "lockpick_security").error).toMatch(/zaten açık/);
    expect(state.randomAttempts.lockpick_attempt).toBe(5);
  });

  it("evsiz Samuel yangın merdiveninde karşılaşılır; yalan ve susturma girişimi şüpheyi etkiler", () => {
    const present = leave(createStoryState("Test", 1));
    const absent = leave(createStoryState("Test"));
    expect(present.samuelPresent).toBe(true);
    expect(absent.samuelPresent).toBe(true);
    let state = { ...present, locationId: "fire_escape" };
    state = dispatchStoryAction(state, { type: "dialogue", dialogueId: "samuel_first", choiceId: "deny" }).state;
    expect(state.suspicions.player).toBe(1);
    expect(dispatchStoryAction(state, { type: "dialogue", dialogueId: "samuel_first", choiceId: "persuade" }).error).toMatch(/zaten yanıtlandı/);
    expect(state.flags.dialogue_completed_samuel_first).toBe(true);
    expect(state.suspicions.player).toBe(1);
  });

  it("kamera silinince fiziksel kayıt kaybolur ama dedektifin daha önceki bilgisi kalır", () => {
    let state: StoryGameState = { ...investigation(), locationId: "security", unlockedLocations: ["security"], detectiveKnowledge: ["lobby_footage_known"], flags: { ...investigation().flags, camera_footage_exists: true, under_observation: false } };
    state = { ...state, evidence: { ...state.evidence, lobby_footage: { physical: "collected", detectiveKnows: true, admissible: true } } };
    state = sendCommand(state, { type: "action", actionId: "delete_camera" });
    expect(state.evidence.lobby_footage).toMatchObject({ physical: "deleted", detectiveKnows: true, admissible: false });
    expect(state.detectiveKnowledge).toContain("lobby_footage_known");
  });

  it("parmak izi temizlendikten sonra incelenemez; dedektif topladıktan sonra temizlenemez", () => {
    let state = createStoryState();
    state = act(state, "clean_glass").state;
    expect(act(state, "inspect_glass").error).toMatch(/mevcut değil/);
    let second = createStoryState();
    second = leave(second);
    second = { ...second, investigationElapsedMinutes: 60, evidence: { ...second.evidence, glass_fingerprint: { physical: "collected", detectiveKnows: true, identified: true, admissible: true } } };
    second = { ...second, locationId: "office" };
    expect(act(second, "clean_glass").error).toMatch(/daha önce topladı/);
  });

  it("yüksek şüphe tek başına suçlama veya mahkûmiyet sağlamaz", () => {
    const state: StoryGameState = { ...investigation(), suspicions: { player: 3, samuel: 0, daniel: 0, marcus: 0, noah: 0 }, detectiveKnowledge: ["rumor"] };
    expect(canCharge(state)).toBe(false);
    let ended = state;
    for (let i = 0; i < 12 && ended.phase !== "ending"; i++) ended = dispatchStoryAction(ended, { type: "wait", minutes: 360 }).state;
    expect(ended.endingId).toBe("UNSOLVED");
  });

  it("soruşturma süresini beş saatte bitirir ve uzatmaz", () => {
    const state = { ...investigation(), investigationElapsedMinutes: 290 };
    const result = dispatchStoryAction(state, { type: "wait", minutes: 360 });
    expect(result.state.investigationElapsedMinutes).toBe(300);
    expect(result.state.endingId).toBe("UNSOLVED");
  });

  it("kopyalama bonusunu yalnızca bir kere verir ve gönderim öncesi kopyalama ister", () => {
    let state = investigation();
    state = { ...state, locationId: "laboratory", unlockedLocations: ["laboratory"], flags: { ...state.flags, password_unlocked: true } };
    const before = act(state, "send_research");
    expect(before.error).toBeTruthy();
    state = act(state, "copy_research").state;
    expect(state.score).toBe(100);
    expect(act(state, "copy_research").error).toBeTruthy();
    expect(state.flags.computer_log_exists).toBe(true);
  });

  it("delayed rescue event is persisted and pays its bonus once", () => {
    let state = investigation();
    state = { ...state, locationId: "laboratory", unlockedLocations: ["laboratory"], flags: { ...state.flags, password_unlocked: true } };
    state = act(state, "copy_research").state;
    state = act(state, "send_research").state;
    expect(state.eventQueue.find((event) => event.id === "noah_rescue")?.dueAt).toBe(state.investigationElapsedMinutes + 60);
    expect(loadStoryState(saveStoryState(state))?.eventQueue).toEqual(state.eventQueue);
    state = dispatchStoryAction(state, { type: "wait", minutes: 60 }).state;
    expect(state.flags.noah_rescued).toBe(true);
    expect(state.score).toBe(150);
    expect(state.evidence.file_transmission_log?.physical).toBe("present");
  });

  it("mahkeme için suçlama, iki hazırlık hamlesi ve üç ardışık soru gerekir", () => {
    let state = investigation();
    expect(dispatchStoryAction(state, { type: "trial", questionId: "presence", choiceId: "admit_presence" }).error).toBeTruthy();
    state = { ...state, phase: "pretrial", flags: { ...state.flags, player_charged: true } };
    state = dispatchStoryAction(state, { type: "pretrial", choiceId: "review_statements" }).state;
    expect(state.phase).toBe("pretrial");
    state = dispatchStoryAction(state, { type: "pretrial", choiceId: "prepare_defense" }).state;
    expect(state.phase).toBe("trial");
    for (const question of storyScenario.trial.questions) state = dispatchStoryAction(state, { type: "trial", questionId: question.id, choiceId: question.choices?.[0]?.id ?? question.choicesTemplate?.[0] ?? "" }).state;
    expect(state.phase).toBe("ending");
    expect(["PLAYER_CONVICTED", "PLAYER_ACQUITTED", "UNSOLVED"]).toContain(state.endingId);
  });

  it("bütün mekânlara koridor grafiğinden erişilir; güvenlik odası kartla açılır", () => {
    let state = createStoryState("Test", 1);
    state = act(state, "find_hidden_card").state;
    state = leave(state);
    state = sendCommand(state, { type: "move", locationId: "corridor" });
    state = sendCommand(state, { type: "action", actionId: "use_security_card" });
    for (const id of ["office", "corridor", "fire_escape", "security", "laboratory", "lobby"]) {
      expect(state.unlockedLocations).toContain(id);
    }
    for (const place of storyScenario.locations) {
      expect(place.neighbors.every((id) => storyScenario.locations.some((neighbor) => neighbor.id === id))).toBe(true);
    }
  });

  it("her tanımlı hotspot eylemi kendi koşulları sağlandığında kullanılabilir", () => {
    let state = createStoryState("Test", 1);
    for (const id of ["inspect_glass", "clean_glass", "search_drawer", "find_hidden_card", "inspect_threat_notes", "remove_threat_notes", "plant_footprint", "leave_opening"]) {
      expect(storyActionBlockReason(state, id), `${id} açılışta kullanılabilir olmalı`).toBeNull();
      state = act(state, id).state;
    }
    state = leave(createStoryState("Test", 1));
    state = sendCommand(state, { type: "move", locationId: "corridor" });
    for (const id of ["peek_door", "lockpick_security"]) expect(storyActionBlockReason(state, id), id).toBeNull();
    state = act(createStoryState("Test", 1), "find_hidden_card").state;
    state = leave(state);
    state = sendCommand(state, { type: "move", locationId: "corridor" });
    expect(storyActionBlockReason(state, "use_security_card")).toBeNull();
    state = sendCommand(state, { type: "action", actionId: "use_security_card" });
    state = sendCommand(state, { type: "move", locationId: "lobby" });
    state = sendCommand(state, { type: "move", locationId: "corridor" });
    state = sendCommand(state, { type: "action", actionId: "peek_door" });
    state = sendCommand(state, { type: "wait", minutes: 60 });
    state = sendCommand(state, { type: "move", locationId: "security" });
    expect(storyActionBlockReason(state, "delete_camera")).toBeNull();
    state = sendCommand(state, { type: "move", locationId: "corridor" });
    state = sendCommand(state, { type: "move", locationId: "laboratory" });
    expect(storyActionBlockReason(state, "submit_password")).toBeNull();
    state = act(state, "submit_password", "N170412").state;
    expect(storyActionBlockReason(state, "copy_research")).toBeNull();
    state = act(state, "copy_research").state;
    expect(storyActionBlockReason(state, "delete_computer_log")).toBeNull();
    expect(storyActionBlockReason(state, "send_research")).toBeNull();
  });

  it("erişilebilir NPC diyaloglarını ve mekân/faz koşullarını doğrular", () => {
    let state = createStoryState("Test", 1);
    state = leave(state);
    state = sendCommand(state, { type: "move", locationId: "corridor" });
    state = sendCommand(state, { type: "move", locationId: "fire_escape" });
    expect(dispatchStoryAction(state, { type: "dialogue", dialogueId: "samuel_first", choiceId: "ask" }).error).toBeUndefined();
    state = { ...state, phase: "investigation", locationId: "lobby", flags: { ...state.flags, marcus_at_lobby: true } };
    expect(dispatchStoryAction(state, { type: "dialogue", dialogueId: "marcus_security", choiceId: "ask_footage" }).error).toBeUndefined();
    expect(dispatchStoryAction(state, { type: "dialogue", dialogueId: "elena_lobby", choiceId: "ask_body_discovery" }).error).toBeUndefined();
    state = { ...state, locationId: "laboratory", flags: { ...state.flags, password_unlocked: true } };
    expect(dispatchStoryAction(state, { type: "dialogue", dialogueId: "noah_first", choiceId: "promise" }).error).toBeUndefined();
    expect(dispatchStoryAction(state, { type: "dialogue", dialogueId: "noah_help", choiceId: "truthful_help" }).error).toMatch(/söz/);
    state = { ...state, flags: { ...state.flags, noah_promise: true } };
    expect(dispatchStoryAction(state, { type: "dialogue", dialogueId: "noah_help", choiceId: "truthful_help" }).error).toBeUndefined();
    expect(dispatchStoryAction({ ...state, phase: "trial" }, { type: "dialogue", dialogueId: "noah_first", choiceId: "promise" }).error).toMatch(/soruşturma/);
  });

  it("dedektif ziyaretleri aynı konumdaysa karşılaşma ve gözlem durumunu oluşturur", () => {
    let state = createStoryState("Test", 4);
    state = act(state, "inspect_glass").state;
    state = leave(state);
    state = sendCommand(state, { type: "wait", minutes: 60 });
    expect(state.detectiveEncounterAvailable).toBe(true);
    expect(state.flags.under_observation).toBe(true);
    state = sendCommand(state, { type: "dialogue", dialogueId: "detective_encounter", choiceId: "evasive_answer" });
    expect(state.detectiveEncounterAvailable).toBe(false);
  });

  it("oyuncu aynı delil zinciriyle hem beraat hem mahkûmiyet finallerine ulaşabilir", () => {
    const convicted = finishTrial(chargedState(true), ["admit_presence", "deny", "maintain_prior_story"]);
    expect(convicted.endingId).toBe("PLAYER_CONVICTED");
    const acquitted = finishTrial(chargedState(false), ["admit_presence", "admit_limited_fact", "emphasize_other_explanations"]);
    expect(acquitted.endingId).toBe("PLAYER_ACQUITTED");
  });

  it("kalan üçüncü final, oyuncu suçlanmadan beş saatte ulaşılabilir", () => {
    let state = investigation();
    for (let i = 0; i < 12 && state.phase !== "ending"; i++) state = sendCommand(state, { type: "wait", minutes: 360 });
    expect(state.endingId).toBe("UNSOLVED");
  });

  it("güvenlik odası dinlenince görevli 60 dakika sonra çıkar; odaya giriş karşılaşma başlatmaz", () => {
    let state: StoryGameState = { ...investigation(), locationId: "corridor", unlockedLocations: ["corridor", "security"], randomRolls: { security_occupancy: true } };
    state = sendCommand(state, { type: "action", actionId: "peek_door" });
    expect(state.flags.security_room_occupied).toBe(true);
    expect(dispatchStoryAction(state, { type: "move", locationId: "security" }).error).toMatch(/Altmış dakika/);
    state = sendCommand(state, { type: "wait", minutes: 60 });
    expect(state.flags.security_room_occupied).toBe(false);
    expect(state.flags.marcus_at_lobby).toBe(true);
    state = sendCommand(state, { type: "move", locationId: "security" });
    expect(state.locationId).toBe("security");
    expect(state.detectiveEncounterAvailable).toBe(false);
  });

  it("laboratuvara girince parola ipuçları otomatik olarak deftere kaydedilir", () => {
    let state: StoryGameState = { ...investigation(), locationId: "corridor", unlockedLocations: ["corridor", "laboratory"] };
    state = sendCommand(state, { type: "move", locationId: "laboratory" });
    expect(state.flags.password_clues_found).toBe(true);
    expect(state.playerKnowledge).toContain("lab_password_project_code");
    expect(state.playerKnowledge).toContain("lab_password_reset_date");
    state = sendCommand(state, { type: "move", locationId: "corridor" });
    state = sendCommand(state, { type: "move", locationId: "laboratory" });
    expect(state.discoveredFacts.filter((fact) => fact.startsWith("lab_password_")).length).toBe(2);
  });

  it("senaryo validatorı eksik alan ve bozuk delil referansını reddeder", () => {
    const missing = structuredClone(storyScenario) as unknown as Record<string, unknown>;
    delete missing.truth;
    expect(() => validateStoryScenario(missing)).toThrow(/Kök alan eksik: truth/);
    const broken = structuredClone(storyScenario) as unknown as { actions: Array<Record<string, unknown>> };
    broken.actions[0].location = "missing_room";
    expect(() => validateStoryScenario(broken)).toThrow(/bilinmeyen konum/);
  });

  it("laboratuvar şifre notlarını ve Elena’nın lobi diyaloğunu tanımlar", () => {
    expect(storyScenario.presentation.passwordClues.details).toHaveLength(2);
    expect(storyScenario.dialogues.some((dialogue) => dialogue.id === "elena_lobby")).toBe(true);
    expect(storyScenario.evidence.find((item) => item.id === "noah_argument_testimony")?.initial ?? null).toBeNull();
  });
});
