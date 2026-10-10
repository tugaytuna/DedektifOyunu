# TEKNİK MİMARİ VE GELİŞTİRME PLANI
## Web Tabanlı Retro Suç Oyunu — v1.0

**Amaç:** GDD kararlarını uygulanabilir, test edilebilir modüllere dönüştürmek. Bu belge teknik yönlendirmedir; doğrudan üretim kodu değildir.

## 1. Teknoloji yığını
| Katman | Seçim |
|---|---|
| Uygulama | Next.js (App Router) + TypeScript |
| Arayüz | React + Tailwind CSS |
| UI durum yönetimi | Zustand |
| Oyun kuralları | React'tan bağımsız saf TypeScript fonksiyonları |
| Senaryo içeriği | JSON + TypeScript tipleri; tercihen Zod ile doğrulama |
| Kayıt | `localStorage` (tek aktif kayıt / senaryo) |
| Test | Vitest, saf motor birim testleri |
| Sürüm kontrolü | GitHub; kararlı `main`, özellik dalları |
| Dağıtım | Vercel; önizleme dağıtımları |
| Sunucu/veritabanı | İlk sürümde yok |

## 2. Mimari kural
**UI yalnızca komut gönderir ve sonuç gösterir.** İş kuralları React bileşenlerine yazılmaz. Tek geçiş noktası örneği:

```ts
function dispatchGameAction(state: GameState, action: GameAction, scenario: Scenario): ActionResult
```

Önerilen işlem sırası:
1. Eylem ve önkoşulları doğrula.
2. Etkileri deterministik sırayla uygula.
3. Zaman maliyetini ekle.
4. Zamanla tetiklenen dedektif ve senaryo olaylarını işle.
5. Oyuncuya görünür bildirimleri ayır.
6. Final koşullarını kontrol et.
7. Yeni durumu ve karar günlüğünü döndür; UI kalıcı kaydı günceller.

**Önemli:** Saf motor `Date.now()`, `Math.random()`, tarayıcı depolaması veya React'e doğrudan bağımlı olmamalıdır. Rastgelelik kaydedilen seed/PRNG durumu ile yönetilir.

## 3. Önerilen klasör yapısı
```text
src/
  app/                    # Next.js route/layout
  components/
    game/                 # sahne, hotspot, panel, harita, diyalog, olay kartı
    common/               # buton, modal, bildirim
  store/                  # Zustand UI orkestrasyonu
  engine/
    actions.ts            # komut çözümleyici
    conditions.ts         # ortak koşul değerlendirici
    effects.ts            # etki uygulayıcı
    time.ts               # saat ve gün ilerlemesi
    detective.ts          # yalnızca bilinen verilerle bot
    evidence.ts           # kanıt durumları
    dialogue.ts           # dallanma ve ifade kayıtları
    events.ts             # tetiklenen olaylar ve bilgi aktarımı
    endings.ts            # final kontrolleri
    rng.ts                # seed'li rastgelelik
    types.ts
  content/
    scenarios/prototype/  # JSON içerik + görsel yolları
  persistence/            # kayıt şeması, sürümleme, localStorage
  validation/             # Zod şemaları (önerilir)
  tests/                  # Vitest
public/assets/           # statik mekân ve olay görselleri
```

## 4. Çekirdek veri modeli
Önerilen asgari kavramlar:

- `Scenario`: id, sürüm, başlangıç saati, karakterler, mekânlar, nesneler, kanıtlar, diyaloglar, olaylar, finaller, dedektif eşikleri.
- `GameState`: scenarioId, schemaVersion, currentLocationId, gameTimeMinutes, day, flags, variables, relationships, inventory, playerKnowledge, detectiveKnowledge, evidenceStates, statements, eventQueue, completedEventIds, shownTutorialIds, decisionLog, rngState, endingId.
- `Location`: id, title, imagePath, travelMinutes, unlockCondition, hotspots.
- `Hotspot`: id, xPct, yPct, widthPct, heightPct, label, visibleWhen, enabledWhen, actions.
- `Character`: id, traitValues, initialKnowledge, relationshipDefaults, dialogueIds.
- `Evidence`: id, type, criticalLinkToPlayer, statusByObserver / observer-specific records.
- `Statement`: id, speakerId, recipientId, topicKey, value, gameTimestamp, knowledgeRecipients.
- `Event`: id, trigger, visibility, effects, optional playerChoices, optional imagePath.
- `Ending`: id, condition, priority, title, narrative, imagePath.

**Bilgi ayrımı:** `playerKnowledge` ve `detectiveKnowledge` ayrı kümelerdir. Bir olayın dünya durumunda yaşanması, dedektifin otomatik öğrenmesi anlamına gelmez. Aktarım açık bir effect/olay üzerinden gerçekleşmelidir.

## 5. Örnek JSON şeması (temsili)
Aşağıdaki örnek yalnızca yapıyı gösterir; gerçek hikâye değildir. Alan adları uygulamada şemayla sabitlenmelidir.

```json
{
  "id": "prototype",
  "version": 1,
  "initialTimeMinutes": 540,
  "detectiveRules": {
    "accusationSuspicionThreshold": 75,
    "minimumVerifiedCriticalLinks": 1
  },
  "locations": [
    {
      "id": "room_a",
      "title": "Test Mekânı A",
      "imagePath": "/assets/prototype/room-a.webp",
      "travelMinutes": 10,
      "hotspots": [
        {
          "id": "object_1",
          "xPct": 35,
          "yPct": 42,
          "widthPct": 12,
          "heightPct": 16,
          "label": "Nesneyi incele",
          "actions": ["inspect"]
        }
      ]
    }
  ]
}
```

**Uyarı:** 75 ve 1 örnek değerlerdir; onaylanmış oyun dengesi değildir. Kanıtın doğrulanmış ve oyuncuyla ilişkili olması kontrol edilmelidir.

## 6. Koşullar ve etkiler: güvenli veri sözlüğü
JSON'da keyfî JavaScript kodu çalıştırmayın. Sınırlı bir koşul/etki dili kullanın:

**Koşullar:** `hasFlag`, `knowsFact(observer, factId)`, `hasItem`, `relationshipAtLeast`, `timeAtLeast`, `evidenceStatusIs`, `all`, `any`, `not`.

**Etkiler:** `setFlag`, `addItem`, `learnFact(observer, factId)`, `changeVariable`, `changeRelationship`, `advanceTime`, `setEvidenceStatus(observer, evidenceId, status)`, `recordStatement`, `queueEvent`, `unlockLocation`.

Etkiler veri tipleri ve izin verilen hedefler açısından doğrulanmalıdır. Aynı olayın iki kez çalışmasını önlemek için benzersiz olay kimliği ve `completedEventIds` kullanın.

## 7. Dedektifin adil karar modeli
1. Dedektifin olası adımları senaryo verisinden ve kendi bildiklerinden oluşturulur.
2. Erişilemeyen bilgiye dayanan eylemler elenir.
3. Kalan adımların önceliği mevcut şüphe, doğrulanmış kanıt, zaman ve sınırlı seed'li rastgelelik ile belirlenir.
4. Seçilen adımın zaman maliyeti ve sonuçları uygulanır.
5. Yeni bilgi, yalnızca açık keşif/görüşme/aktarım olayıyla dedektif bilgi kümesine eklenir.
6. Suçlama: `suspicion >= threshold && verifiedCriticalLinks >= minimum`.

**Güvenlik değişmezi:** `detectiveKnowledge` içinde bulunmayan bir fact/statement, dedektifin seçim koşullarında veya çelişki tespitinde kullanılamaz. Bu, otomatik testle doğrulanmalıdır.

## 8. Zaman, olay kuyruğu ve rastgelelik
- Kanonik zaman: senaryo başlangıcından itibaren dakika cinsinden tam sayı.
- Oyuncu beklerken zaman ilerlemez; `advanceTime` yalnızca eylem çözümleyicisiyle tetiklenir.
- Zaman atlamasında aradaki olaylar zaman sırasıyla işlenir; olaylar aynı anda tetiklenirse sabit öncelik/id sırası kullanılır.
- Olayların yeniden işlenmesini engelleyen idempotent işaretler tutulur.
- Rastgele seçimler kritik hikâye gerçeklerini değiştirmez; yalnızca izin verilen küçük varyasyonları etkiler.
- PRNG seed/durumu kayıt dosyasında bulunur; aynı kayıt ve aynı seçimler aynı sonucu üretir.

## 9. Kayıt ve sürümleme
Önerilen anahtar: `retro-crime:save:<scenarioId>`. Kayıt nesnesinde `schemaVersion`, `scenarioVersion`, `updatedAt`, `gameState` yer alır. JSON parse, şema doğrulama ve sürüm uyumluluğu kontrol edilir. Geçersiz kayıtta kullanıcıya açık hata ve sıfırlama seçeneği gösterilir; sessiz veri kaybı olmaz.

**Tutarlılık:** Eylem sonuçları tek bütün durum güncellemesi olarak yazılır; karar tamamlanmadan yarım durum saklanmaz. `beforeunload` olayına tek başına güvenilmez; asıl kayıt her karardan sonra yapılır.

## 10. UI bağlantıları
- `SceneView`: responsive statik resim, resme göre konumlanan yüzde tabanlı hotspot katmanı.
- `Sidebar`: harita, envanter, defter, karakterler sekmeleri.
- `TopBar`: senaryo başlığı, gün/saat, ayarlar.
- `DialogueModal`: koşula göre filtrelenmiş, yazılmış seçenekler.
- `EventCard`: başlık, isteğe bağlı resim, metin, koşullu seçenekler.
- `Toast`: yalnızca oyuncunun öğrenebileceği küçük bildirimler.
- `EndingView`: final anlatısı + özet.
- `DebugPanel`: yalnızca development ortamında; oyun durumu, bilgi kümeleri, saat, değişkenler, olay tetikleme ve reset. Değişiklikler mümkün olduğunca normal motor eylemleri üzerinden yürütülür.

## 11. Test stratejisi (Vitest)
Asgari testler:
1. Eylem yapılmadığında saat ilerlemez.
2. Mekân seyahati doğru dakika tüketir.
3. Koşulu sağlanmayan hotspot/konuşma seçeneği çalıştırılamaz.
4. Bilgi, oyuncudan dedektife kendiliğinden geçmez.
5. Dedektif bilmediği iki ifadeyi karşılaştırıp çelişki bulamaz.
6. Kanıt statüsü gözlemciye göre bağımsızdır.
7. Yalnızca şüphe yüksek diye suçlama yapılamaz; kritik bağlantı da gerekir.
8. Aynı tetiklenen olay iki kez uygulanmaz.
9. Aynı seed ve seçimler aynı sonucu üretir.
10. Kaydet/yükle döngüsü oyun durumunu korur.
11. Yeniden başlatma yalnızca ilgili senaryonun kaydını sıfırlar.
12. Final koşulları deterministik öncelik sırasıyla çözülür.

## 12. Modüler uygulama sırası
| Aşama | Teslim | Kabul ölçütü |
|---|---|---|
| 0 | Proje iskeleti, tipler, JSON doğrulama | Proje açılır, örnek senaryo parse edilir |
| 1 | Saf motor, koşul/etki, zaman | Birim testler geçer |
| 2 | Sahne, hotspot, harita | İki mekân arasında gezilir |
| 3 | Envanter, defter, karakter/diyalog | Seçimler kaydedilir, koşullar işler |
| 4 | Kanıt/ifade ve dedektif bilgi ayrımı | Dedektif bilmediğini kullanamaz |
| 5 | Sorgulama, olay kuyruğu, bildirimler | Kısa sorgulama ve olay kartı çalışır |
| 6 | Final, özet, kayıt, tutorial | Baştan sona 5–10 dakikalık test oyunu |
| 7 | Debug panel, mobil, erişilebilirlik, QA | Hatalar test edilir, Vercel preview paylaşılır |
| 8 | Gerçek senaryo entegrasyonu | Kullanıcı/Sarp içerikleri JSON'a aktarılır |

Her aşamada küçük özellik dalı → test → kod inceleme → önizleme → `main` birleştirme akışı önerilir. Bir modül bitmeden büyük yeni modüle geçilmez.

## 13. İlk prototip kabul kriterleri
- 2 mekân, 2 NPC, 3 kanıt, 1 sorgulama, 2 final.
- Tek görselli mekân ve koşullu hotspot.
- Gün/saat yalnızca eylemle ilerler.
- Oyuncu/dedektif bilgi ayrımı testlerle korunur.
- Bir ifade çelişkisi yalnızca öğrenildiyse değerlendirilir.
- Küçük bildirim + olay kartı çalışır.
- Kapatıp açınca kayıt devam eder; yeniden başlatma çalışır.
- Mobil ekranda temel akış kullanılabilir.
- Üretim ortamında debug paneli görünmez.

## 14. Bilinçli ertelemeler
Hesap, backend, bulut kayıt, çok oyunculu, AI API, ses, video, gelişmiş otomatik NPC simülasyonu, görsel senaryo editörü, sonlar koleksiyonu, başarımlar. Bunlar ilk prototipin teslim şartı değildir.
