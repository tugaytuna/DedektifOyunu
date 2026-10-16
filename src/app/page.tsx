"use client";

import { useEffect, useMemo, useState } from "react";
import { dispatchGameAction } from "@/engine/actions";
import { clockLabel, createInitialState, loadSavedState, prototype, saveState } from "@/engine/state";
import type { GameState, Hotspot } from "@/engine/types";
import { useGameStore } from "@/store/game-store";

type Tab = "map" | "inventory" | "notes" | "people";

export default function Home() {
  const game = useGameStore((store) => store.game);
  const setGame = useGameStore((store) => store.setGame);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("map");
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [dialogueId, setDialogueId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const location = useMemo(() => prototype.locations.find((entry) => entry.id === game.currentLocationId)!, [game.currentLocationId]);
  const clock = clockLabel(game.gameTimeMinutes);
  const characterHere = prototype.characters.find((person) => person.locationId === location.id);

  useEffect(() => { setGame(loadSavedState() ?? createInitialState()); setReady(true); }, []);
  useEffect(() => { if (ready) saveState(game); }, [game, ready]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4300);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function perform(action: Parameters<typeof dispatchGameAction>[1]) {
    const result = dispatchGameAction(game, action, prototype);
    if (result.error) { setToast(result.error); return; }
    setGame(result.state);
    setToast(result.notifications[0] ?? "Eylem kaydedildi.");
    setSelectedHotspot(null);
    if (action.type === "dialogue") setDialogueId(null);
  }

  function newGame() {
    const fresh = createInitialState();
    setGame(fresh);
    saveState(fresh);
    setConfirmRestart(false);
    setToast("Yeni soruşturma kaydı oluşturuldu.");
  }

  if (!ready) return <main className="boot-screen">DOSYA AÇILIYOR…</main>;
  if (game.endingId) return <Ending game={game} restart={() => setConfirmRestart(true)} confirmRestart={confirmRestart} onCancel={() => setConfirmRestart(false)} onRestart={newGame} />;

  const labels: Record<Tab, string> = { map: "Harita", inventory: "Envanter", notes: "Defter", people: "Kişiler" };
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark">SD</div><div><span className="eyebrow">KRİMİNAL ARŞİV BÜROSU</span><strong>SOĞUK DOSYA</strong></div></div>
        <div className="case-clock"><span className="status-dot" />GÜN {String(clock.day).padStart(2, "0")} <i>•</i> {clock.time}<span className="case-status">SORUŞTURMA AÇIK</span></div>
        <div className="top-actions"><a className="story-switch" href="/olumcul-proje">ÖLÜMCÜL PROJE ↗</a><span className="file-number">{prototype.fileNumber}</span><button className="icon-button" aria-label="Geliştirici paneli" title="Geliştirici paneli" onClick={() => setShowDebug(!showDebug)}>⌘</button><button className="icon-button" aria-label="Senaryoyu yeniden başlat" title="Senaryoyu yeniden başlat" onClick={() => setConfirmRestart(true)}>↺</button></div>
      </header>

      <div className="workspace">
        <section className="scene-column" aria-label="Soruşturma sahnesi">
          <div className="scene-heading"><div><span className="eyebrow">MEVCUT KONUM / {location.id.toUpperCase()}</span><h1>{location.title}</h1><p>{location.subtitle}</p></div><div className="scene-stamp">SAHA<br />KAYDI <b>●</b></div></div>
          <div className="scene-frame">
            <img className="scene-image" src={location.image} alt={`${location.title} çizimli sahnesi`} />
            <div className="scene-wash" />
            {location.hotspots.map((hotspot, index) => {
              const discovered = hotspot.factId ? game.playerKnowledge.includes(hotspot.factId) : false;
              return <button key={hotspot.id} className={`hotspot ${discovered ? "discovered" : ""} ${selectedHotspot?.id === hotspot.id ? "selected" : ""}`} style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }} onClick={() => setSelectedHotspot(hotspot)} aria-label={`${hotspot.label}${discovered ? ", incelendi" : ", incelemek için seç"}`}><span>{String(index + 1).padStart(2, "0")}</span><b>{hotspot.label}</b></button>;
            })}
            <div className="scene-caption"><span>GÖRSEL KAYDI // 01</span><span>{game.playerKnowledge.length} NOT TOPLANDI</span></div>
          </div>
          <div className="scene-foot"><span><i className="key-hint">TAB</i> Hotspot’lar arasında gezin</span><span>SAAT YALNIZCA EYLEMLE İLERLER</span></div>
        </section>

        <aside className="dossier-panel">
          <div className="panel-title"><div><span className="eyebrow">VAKA ÇALIŞMA MASASI</span><h2>Dosya İçeriği</h2></div><span className="folder-count">04</span></div>
          <nav className="tabs" aria-label="Dosya bölümleri">{(Object.keys(labels) as Tab[]).map((key) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{labels[key]}</button>)}</nav>
          <div className="panel-content">
            {tab === "map" && <MapPanel game={game} travel={(id) => perform({ type: "travel", locationId: id })} />}
            {tab === "inventory" && <InventoryPanel game={game} share={(id) => perform({ type: "shareEvidence", evidenceId: id })} />}
            {tab === "notes" && <NotesPanel game={game} />}
            {tab === "people" && <PeoplePanel game={game} />}
          </div>
          <div className="panel-divider" />
          <div className="field-actions"><span className="eyebrow">SAHADAKİ KİŞİLER</span>{characterHere ? <button className="person-action" onClick={() => setDialogueId(characterHere.id)}><span className="avatar">{characterHere.portrait}</span><span><b>{characterHere.name}</b><small>{characterHere.role}</small></span><span className="arrow">↗</span></button> : <p className="muted-copy">Bu konumda görüşülecek kimse yok.</p>}</div>
          <footer className="save-status"><span className="save-led" /> OTOMATİK KAYIT AÇIK <span>YALNIZCA BU TARAYICI</span></footer>
        </aside>
      </div>

      {selectedHotspot && <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedHotspot(null); }}><section className="paper-card interaction-card" role="dialog" aria-modal="true" aria-labelledby="hotspot-title"><div className="paper-topline"><span>SAHA NOTU // {String(prototype.locations.indexOf(location) + 1).padStart(2, "0")}</span><button className="close-button" onClick={() => setSelectedHotspot(null)} aria-label="Kapat">×</button></div><p className="paper-kicker">İNCELEME NOKTASI</p><h2 id="hotspot-title">{selectedHotspot.label}</h2><p className="paper-copy">{selectedHotspot.description}</p><div className="paper-meta"><span>TAHMİNİ SÜRE</span><b>+{selectedHotspot.timeCost} DK</b></div><button className="primary-button" onClick={() => perform({ type: "inspect", hotspotId: selectedHotspot.id })}>İNCELEMEYİ TAMAMLA <span>→</span></button></section></div>}

      {dialogueId && <DialogueModal characterId={dialogueId} game={game} close={() => setDialogueId(null)} choose={(choiceId) => perform({ type: "dialogue", characterId: dialogueId, choiceId })} />}
      {confirmRestart && <div className="overlay"><section className="paper-card confirm-card" role="dialog" aria-modal="true"><div className="paper-topline"><span>ARŞİV UYARISI</span><button className="close-button" onClick={() => setConfirmRestart(false)} aria-label="Kapat">×</button></div><h2>Dosya baştan açılsın mı?</h2><p className="paper-copy">Bu senaryodaki mevcut ilerleme silinir ve yeni bir kayıt oluşturulur.</p><div className="confirm-actions"><button className="secondary-button" onClick={() => setConfirmRestart(false)}>VAZGEÇ</button><button className="danger-button" onClick={newGame}>YENİDEN BAŞLAT</button></div></section></div>}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
      {showDebug && <DebugPanel game={game} close={() => setShowDebug(false)} />}
    </main>
  );
}

function MapPanel({ game, travel }: { game: GameState; travel: (id: string) => void }) {
  return <div className="panel-section"><div className="mini-map"><div className="map-grid" /><svg viewBox="0 0 300 160" aria-hidden="true"><path d="M24 122 72 95 111 108 154 60 214 68 267 28M72 95 83 35 154 60 183 130 267 28" /></svg>{prototype.locations.map((place, index) => <span key={place.id} className={`map-pin pin-${index} ${game.currentLocationId === place.id ? "current" : ""} ${game.unlockedLocationIds.includes(place.id) ? "open" : "locked"}`} style={{ left: `${index ? 71 : 25}%`, top: `${index ? 34 : 72}%` }}>{game.unlockedLocationIds.includes(place.id) ? "●" : "×"}</span>)}<span className="map-label label-a">ÇALIŞMA ODASI</span><span className="map-label label-b">ŞEHİR ARŞİVİ</span></div><p className="section-caption">ERİŞİLEBİLİR KONUMLAR</p>{prototype.locations.map((place) => { const open = game.unlockedLocationIds.includes(place.id) || (place.unlockedBy && game.flags.includes(place.unlockedBy)); return <div className={`location-row ${place.id === game.currentLocationId ? "current" : ""}`} key={place.id}><div><b>{place.title}</b><small>{place.id === game.currentLocationId ? "Şu an buradasın" : open ? `${place.travelMinutes} dk yolculuk` : "Kilitli konum"}</small></div>{place.id === game.currentLocationId ? <span className="here-tag">BURADA</span> : <button disabled={!open} className="travel-button" onClick={() => travel(place.id)}>{open ? "GİT →" : "KİLİTLİ"}</button>}</div>; })}</div>;
}

function InventoryPanel({ game, share }: { game: GameState; share: (id: string) => void }) {
  const items = game.inventory.map((id) => ({ id, title: id === "envelope" ? "Mühürlü zarf" : id, kind: "NESNE", description: "Dosya kodu taşıyan kapalı kâğıt zarf." }));
  const evidence = prototype.evidence.filter((item) => game.evidenceStates[item.id]?.player !== "unknown");
  return <div className="panel-section"><p className="section-caption">TAŞINAN NESNELER · {items.length}</p>{items.length ? items.map((item) => <article className="inventory-card" key={item.id}><div className="item-art">✉</div><div><span className="eyebrow">{item.kind} / 01</span><b>{item.title}</b><p>{item.description}</p></div></article>) : <EmptyState icon="□" title="Envanter boş" copy="İncelediğin nesneler burada görünür." />}<p className="section-caption evidence-caption">TOPLANAN BULGULAR · {evidence.length}/{prototype.evidence.length}</p>{evidence.map((item) => { const shared = game.evidenceStates[item.id]?.detective === "verified"; return <div className="evidence-row" key={item.id}><span className="evidence-icon">⌕</span><div><b>{item.title}</b><small>{shared ? "Dedektif dosyasında doğrulandı" : `${item.kind} · Yalnızca senin dosyanda`}</small></div>{shared ? <span className="verified-mark">✓</span> : <button className="share-button" onClick={() => share(item.id)} aria-label={`${item.title} bulgusunu dedektife aktar`}>AKTAR</button>}</div>; })}</div>;
}

function NotesPanel({ game }: { game: GameState }) {
  const facts: Record<string, { title: string; copy: string }> = { desk_notes: { title: "Çalışma masası", copy: "Masada farklı tarihlere ait kısa notlar var." }, archive_gap: { title: "Arşiv rafı", copy: "Bir klasörün yeri boş bırakılmış." }, sealed_note: { title: "Zarf kodu", copy: "Mühürlü zarfın üzerinde tarih ve dosya kodu bulunuyor." }, ledger_changes: { title: "Defter düzeltmeleri", copy: "Ziyaretçi kayıtlarında bazı satırlar sonradan değiştirilmiş." }, application_times: { title: "Başvuru saatleri", copy: "Dosyada başvurunun alındığı ve yeniden işlendiği saatler var." } };
  return <div className="panel-section"><div className="notes-heading"><p className="section-caption">KRONOLOJİK KAYIT</p><span>{game.playerKnowledge.length} KAYIT</span></div>{game.playerKnowledge.length ? game.playerKnowledge.map((id, index) => { const item = facts[id]; return <article className="note-entry" key={id}><span className="note-time">{clockLabel(game.gameTimeMinutes - index * 4).time} <i>·</i> SAHA NOTU</span><h3>{item?.title ?? "Yeni bilgi"}</h3><p>{item?.copy ?? "Bu bilgi deftere kaydedildi."}</p></article>; }) : <EmptyState icon="▤" title="Defter henüz boş" copy="Öğrendiğin bilgiler ve ifadeler zaman sırasıyla burada tutulur." />}{game.statements.map((statement, index) => <article className="note-entry statement-entry" key={`${statement.topic}-${index}`}><span className="note-time">İFADE KAYDI <i>·</i> {clockLabel(statement.time).time}</span><h3>{prototype.characters.find((person) => person.id === statement.speakerId)?.name}</h3><p>“{statement.value}”</p></article>)}</div>;
}

function PeoplePanel({ game }: { game: GameState }) {
  return <div className="panel-section"><p className="section-caption">SENARYODAKİ KİŞİLER · {prototype.characters.length}</p>{prototype.characters.map((person) => <article className="person-card" key={person.id}><span className="avatar large">{person.portrait}</span><div><span className="eyebrow">{person.role}</span><b>{person.name}</b><p>{person.summary}</p><small>İLİŞKİ: {game.relationships[person.id] >= 1 ? "Olumlu" : game.relationships[person.id] < 0 ? "Gergin" : "Nötr"}</small></div></article>)}</div>;
}

function EmptyState({ icon, title, copy }: { icon: string; title: string; copy: string }) { return <div className="empty-state"><span>{icon}</span><b>{title}</b><p>{copy}</p></div>; }

function DialogueModal({ characterId, game, close, choose }: { characterId: string; game: GameState; close: () => void; choose: (id: string) => void }) {
  const character = prototype.characters.find((item) => item.id === characterId)!;
  const dialogue = prototype.dialogues[character.dialogueId];
  return <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="dialogue-card" role="dialog" aria-modal="true" aria-labelledby="dialogue-name"><div className="dialogue-head"><span className="eyebrow">GÖRÜŞME TUTANAĞI // {clockLabel(game.gameTimeMinutes).time}</span><button className="close-button" onClick={close} aria-label="Kapat">×</button></div><div className="dialogue-body"><div className="portrait-card"><div className="portrait-illustration">{character.portrait}</div><span className="eyebrow">GÖRÜŞÜLEN KİŞİ</span><h2 id="dialogue-name">{character.name}</h2><p>{character.role}</p><div className="known-note">{character.summary}</div></div><div className="statement-paper"><span className="paper-kicker">KONUŞMA BAŞLANGICI</span><p className="dialogue-prompt">{dialogue.prompt}</p><span className="paper-kicker choice-kicker">YANIT / SORU SEÇ</span><div className="choice-list">{dialogue.choices.map((choice, index) => { const locked = choice.requiresFact && !game.playerKnowledge.includes(choice.requiresFact); return <button className={`choice-button ${locked ? "locked" : ""}`} key={choice.id} disabled={!!locked} onClick={() => choose(choice.id)}><span className="choice-number">{locked ? "⌑" : `0${index + 1}`}</span><span>{choice.text}{locked && <small>Önce ilgili bulguyu edin</small>}</span><span className="choice-time">+{choice.timeCost} DK</span></button>; })}</div><p className="typewriter-note">SERBEST YAZIM KAPALI · SEÇİMLER KALICI</p></div></div></section></div>;
}

function DebugPanel({ game, close }: { game: GameState; close: () => void }) { return <aside className="debug-panel"><div><b>GELİŞTİRİCİ GÖRÜNÜMÜ</b><button className="close-button" onClick={close}>×</button></div><code>Oyuncu bilgisi: {game.playerKnowledge.join(", ") || "—"}</code><code>Dedektif bilgisi: {game.detectiveKnowledge.join(", ") || "—"}</code><code>Gizli şüphe değişkeni: {game.variables.suspicion}</code><code>Kanıt durumları: {JSON.stringify(game.evidenceStates)}</code><small>Dedektif bilgisi açık aktarım tanımlanmadan değişmez.</small></aside>; }

function Ending({ game, restart, confirmRestart, onCancel, onRestart }: { game: GameState; restart: () => void; confirmRestart: boolean; onCancel: () => void; onRestart: () => void }) {
  const caught = game.endingId === "caught";
  return <main className="ending-screen"><div className="ending-file"><span className="eyebrow">DOSYA KAPANIŞ TUTANAĞI · {prototype.fileNumber}</span><div className="ending-stamp">{caught ? "KAPATILDI" : "SONUÇSUZ"}</div><h1>{caught ? "Soruşturma sana ulaştı." : "Dosya şimdilik açık kaldı."}</h1><p>{caught ? "Dedektif, bildiği doğrulanmış bulgularla yeterli bağlantıyı kurdu." : "Elde edilen bilgiler dosyayı ilerletti, ancak kesin bir sonuca ulaşılmadı."}</p><div className="ending-summary"><span><b>{clockLabel(game.gameTimeMinutes).day}</b> OYUN GÜNÜ</span><span><b>{game.playerKnowledge.length}</b> DEFTER KAYDI</span><span><b>{game.decisionLog.length}</b> KARAR</span></div><p className="ending-note">Bu, sistemleri denemek için hazırlanmış geçici test senaryosudur. Gerçek hikâye içeriği henüz eklenmedi.</p><button className="primary-button" onClick={restart}>SENARYOYU YENİDEN BAŞLAT <span>↻</span></button></div>{confirmRestart && <div className="overlay"><section className="paper-card confirm-card" role="dialog" aria-modal="true"><div className="paper-topline"><span>ARŞİV UYARISI</span><button className="close-button" onClick={onCancel}>×</button></div><h2>Dosya baştan açılsın mı?</h2><p className="paper-copy">Mevcut ilerleme silinir ve yeni bir kayıt oluşturulur.</p><div className="confirm-actions"><button className="secondary-button" onClick={onCancel}>VAZGEÇ</button><button className="danger-button" onClick={onRestart}>YENİDEN BAŞLAT</button></div></section></div>}</main>;
}
