# Ölümcül Proje — Oyun Motoru Mekanik Güncelleme ve Entegrasyon Talimatı

**Hedef:** Mevcut Next.js/TypeScript v0.1 dedektif oyunu motorunu, `OLUMCUL_PROJE_SENARYO_V1.json` içeriğini oynatabilecek şekilde **senaryodan bağımsız ve geriye dönük uyumlu** geliştirmek.

**Codex için çalışma talimatı:** Bu dosyayı ve senaryo JSON'unu birlikte oku. Önce repodaki gerçek uygulamayı, tipleri, state akışını, sahne/aksiyon/diyalog sistemini ve testleri incele. Bu belge *hedef davranışı* tarif eder, mevcut dosya adlarını veya hazır özellikleri varsaymaz. Uygun olanları yeniden kullan; eksikleri küçük, test edilebilir aşamalarla uygula. Kullanıcının onayladığı tasarım kararlarını değiştirme. Teknik belirsizlikleri varsayım olarak raporla. Kullanıcıdan yeni karar gerektiren **bloklayıcı hikâye çelişkisi** varsa kodda sessizce uydurma yapma.

## 0. Kanonik kararlar ve kapsam

- Tek oyunculu; oyuncu Adrian Voss'u zehirleyen profesyonel katildir. Oyun cinayetin hemen sonrasında çalışma odasında başlar.
- **İlk sürümde yalnızca üç aktif final:** `PLAYER_CONVICTED`, `PLAYER_ACQUITTED`, `UNSOLVED`. Daniel, Elena ve Marcus şüpheli olabilir ama **mahkûm edilemez**. JSON'daki `DANIEL_CONVICTED`, `ELENA_CONVICTED`, `MARCUS_CONVICTED` taslakları çalışma zamanında erişilemez olmalı; ideal olarak etkin final kümesinden çıkarılmalı. Başka şüpheliye yönelik yüksek şüphe asla otomatik mahkûmiyet üretmez.
- Açılışta **en fazla 5 ücretli hamle**, oyuncu dilediğinde erken çıkabilir. Sonrasında birkaç günlük sinematik zaman atlaması, Elena'nın cesedi kokudan bulması, soruşturmanın başlaması ve oyuncunun yangın merdiveninden geri dönmesi.
- Soruşturma süresi **72 oyun saati / 4320 dakika**, süre yalnızca zaman tüketen eylemlerle ilerler. Harita/not defteri/envanter okumak ücretsiz. Oyuncuya kalan süre açıkça gösterilir.
- Dedektifin konumu **haritada görünmez**. Kapıdan içeri bakma/dinleme seçeneği uygun kapılarda vardır; 5 dakika harcar ve her zaman kesin bilgi vermez.
- Oyuncunun ve Daniel/Elena/Marcus'un **sözel şüphe düzeyleri** gösterilir (`düşük`, `orta`, `yüksek`, `kritik`); bu gösterim dedektifin bilinmeyen delillerini ifşa etmemeli. Şüphe ≠ kanıt ≠ hüküm.
- Oyuncu dedektife yalan söyleyebilir, önceki önemli ifadeleri otomatik not defterinde görür. Dedektif çelişkiyi ancak **karşıt bilgiye gerçekten ulaştığında** saptar. Dedektifle karşılaşınca ayrılmayı deneyebilir; sonuç bilgi ve koşullara bağlıdır.
- Oyuncu dedektife **doğrudan delil sunamaz**, anonim ihbar sistemi yoktur. Noah'ın yetkililerce sorgulanması ayrı, önceden belirlenmiş bir olaydır.
- Mahkeme yalnızca oyuncu resmen suçlandıysa açılır; öncesinde **2 hazırlık hamlesi** vardır, yeni mekân keşfi yapılamaz. Mahkeme **3 kritik diyalog sorusu** içerir; ayrı bir mahkeme envanter-bulmacası ekleme.
- Final raporu ayrıntılıdır. Bonus yalnızca dosyayı kopyalama **+100** ve Noah'ın kurtarılması **+50**; bonuslar hükmü etkilemez. Tek yerel otomatik kayıt, geri alma yok, ses yok.

## 1. JSON yükleyici, şema ve doğrulama (P0)

1. Projedeki mevcut senaryo formatını tespit et. `schemaVersion: "1.0.0-authoring"` **motorun hazır şeması değildir**; JSON'u doğrudan import edip çalışacağını varsayma.
2. Kanonik, sürümlenebilir `ScenarioDefinition` TypeScript tipi ve runtime doğrulaması (projede kullanılan doğrulama kütüphanesi varsa onu kullan) oluştur veya mevcut şemayı genişlet.
3. `characters`, `locations`, `evidence`, `actions`, `dialogues`, `randomChecks`, `timedEvents`, `trial`, `endings` ve `stateDefaults` alanlarını eşle. Desteklenmeyen authoring alanları için açık dönüşüm katmanı yaz; alanları sessizce yoksayma.
4. Tüm referanslar için kontrol yap: benzersiz ID, hedef konum/karakter/delil/olay varlığı, diyalog geçişleri, tetikleyici isimleri, etki operatörleri, erişilemeyen final, hatalı koşul, sonsuz otomatik olay döngüsü.
5. Hata halinde geliştiriciye anlaşılır doğrulama mesajı göster; oyun sessizce boş sahne açmasın. Mevcut diğer senaryoları bozma.

**Kabul:** Senaryo derlenir, runtime doğrulamadan geçer, tüm referanslar çözülür; mevcut senaryo(lar) hâlâ açılır.

## 2. Genel durum ve aksiyon motoru (P0)

- Merkezi oyun durumunda faz (`opening`, `investigation`, `pretrial`, `trial`, `ending`), konum, oyun zamanı, açılış hamleleri, hazırlık hamleleri, envanter, delil durumları, oyuncu ifadeleri, NPC bilgileri, dedektif bilgileri, rastgele sonuçlar, tek seferlik ödüller ve olay kuyruğu tutulmalı.
- JSON aksiyonları için genel bir **koşul değerlendirici** ve **etki uygulayıcı** kullan. Örn. `requires`, `condition`, `minutes`, `minutesOnWrong`, `minutesOnCorrect`, `openingMoves`, `effects`, `effectsOnSuccess`, `effectsOnCorrect`, `set`, `setEvidence`, `grantItem`, `discover`, `unlock`, `moveTo`, `trigger`, `awardOnce`, `scheduleAfterMinutes` gibi alanların anlamını tanımla.
- Etki uygulaması atomik olmalı: koşul sağlanmazsa zaman, hamle, envanter veya puan değişmemeli. Tekrarlanan tıklama ödülü veya tekil olayı çoğaltmamalı.
- İnceleme/not defteri gibi ücretsiz aksiyonlar 5 hamle tüketmemeli; ücretli açılış eylemleri 5 sınırını aşmamalı. Oyuncu erken çıkarsa kullanılmayan haklar sıfırlanmalı.
- `leave_opening` olayında sahne geçişi ve soruşturma saati başlangıcı tutarlı olmalı; cinayetten ceset bulunana kadarki **birkaç günlük atlama**, soruşturmanın 72 saatlik bütçesinden düşülmemeli.

**Kabul:** Açılışta 0–5 ücretli hamle sonrası çıkılabilir; 6. ücretli hamle çalışmaz; ücretsiz inceleme hakkı tüketmez; tekrar eden aksiyon puan çoğaltmaz.

## 3. Oyun saati, zamanlanmış olaylar ve ilerleme (P0)

- Soruşturma zamanı yalnızca eylem maliyetleriyle ilerler. Her zaman artışından sonra vadesi gelen olayları **bir kez** çalıştır; sıra deterministik ve test edilebilir olsun.
- 4320. dakikada soruşturma kapanışını değerlendir. Oyuncu daha önce yeterli kanıtla suçlanmışsa hemen `pretrial` aşamasına geçebilir.
- `send_research` sonrası `noah_rescue` olayını **360 oyun dakikası sonra** sıraya al; zaman dolmadan Noah kurtarılmış sayılmaz.
- Saat göstergesinde gün, saat ve kalan soruşturma süresi göster. Soruşturma dışı fazlarda uygun başlık kullan; negatif süre gösterme.
- **Önemli oyun tasarımı riski:** Eylemler toplamda 4320 dakikaya ulaşmazsa, gerçek zamanlı sayaç olmadığı için oyun kendiliğinden bitmez. Motor, senaryonun kilitlenmesini önleyecek **genel bir zaman ilerletme/bekleme eylemi** veya olay tabanlı açık bir kapanış yolu desteklemeli. Bekleme eylemi zaman harcar ve NPC/olay güncellemelerini tetikler; sınırsız ücretsiz bekleme olamaz. Bu davranışı senaryoda görünür ve test edilebilir yap.
- Noah'a dosya geç gönderilip 6 saatlik kurtarma süresi soruşturma sonuna taşarsa, kurtarma otomatik gerçekleşmiş sayılmasın. Finalde `beklemede` olarak raporla; +50 yalnızca olay gerçekten tamamlandıysa verilsin. **Bu son nokta uygulama varsayımıdır; ürün kararı olarak onay gerektiriyorsa açıkça işaretle.**

**Kabul:** 6 saat dolmadan kurtarma/puan yok; süre dolunca tek kurtarma/tek ödül; 72 saat sonunda final yolu var; oyun bekleme eksikliği nedeniyle kilitlenmez.

## 4. Deliller, bilgi ayrımı ve soruşturma (P0)

- Her delilin durumunu modelle: `present`, `discovered`, `collected`, `cleaned`, `removed`, `deleted`, `tampered` vb. **Fiziksel delilin durumu**, **dedektifin o delil hakkında öğrendiği bilgi** ve **mahkemede kullanılabilirlik** ayrı tutulmalı.
- Bardaktaki parmak izi temizlenebilir; dedektif delili daha önce topladıysa geriye dönük silinemez. Parmak izi kimlik eşleşmesi yalnızca uygun inceleme olayında **bir kez** rastgele değerlendirilmeli; tek başına otomatik hüküm doğurmaz.
- Sahte ayak izi çalışma odasına doğrudan eklenebilir; **30 dakika + açılışta 1 hamle**; belirli kişiyi otomatik suçlamaz, diğer olasılıklara dikkat çeker.
- Tehdit notlarının yazarı bilinmeyen biri; bu kimlik için yeni yan hikâye oluşturma. Notların varlığı diğer olası düşmanlara işaret edebilir, mahkûmiyet kanıtı değildir.
- Kamera kaydı silinebilir; silme girişimi tespit edilebilir ama otomatik oyuncuya bağlanmaz. Dedektif silmeden önce görüntüyü izlemişse **gördüğünü hatırlar**; ancak bağımsız kopya yoksa silinen orijinal görüntü mahkemeye fiziksel kayıt olarak sunulamaz.
- Laboratuvar erişim kaydı dosya kopyalandığında oluşur; silinebilir, **20 dakika** harcar ve müdahale fark edilebilir. Silme, dedektifin önceden bildiklerini geri almaz.
- Dedektifin bildikleri yalnızca olay, tanık ifadesi, incelenen kanıt ve makul çıkarımlarla artar. NPC bilgileri otomatik olarak dedektife kopyalanmaz.
- Daniel, Elena, Marcus'un sözel şüphe seviyeleri değişebilir; **v1'de onlar için suçlama/mahkûmiyet finali üretme**. Oyuncunun suçlanması için somut ve bağımsız kanıt yeterliliği kuralı gerekir. Şüphe seviyesi tek başına yeterli değildir.

**Kabul:** Silinen delil dedektifin belleğini silmez; keşfedilmemiş delil dedektifin bilgisine sızmaz; yanlış mahkûmiyet mümkün değildir.

## 5. NPC konumları, kapılar ve rastgelelik (P1)

- Dedektifin oda değiştirmesi soruşturma ipuçları, faz ve geçen zamanla tetiklensin; tamamen rastgele dolaşmasın. Haritada gerçek konumu gösterme.
- Kapı önünde `peek_door` uygun odalarda **5 dakika** harcar; belirsiz/eksik bilgi dönebilir. Bu bilgi dedektifin kesin konumunu sürekli izleyen bir sisteme dönüşmemeli.
- Samuel'in dönüşte yangın merdiveninde bulunması bir kez değerlendirilen rastgele olaydır (`0.6` JSON'daki başlangıç ayarı). Samuel girişe tanıktır, cinayete değil.
- Güvenlik kapısı gizli kartla veya maymuncukla açılır. Maymuncuk denemeleri **30 dakika**; başarı şansı deneme sayısıyla artar (JSON'da 0.20, 0.35, 0.50, 0.65 ve sonrası 0.65); başarısızlık tekrar denemeyi engellemez.
- Rastgele sonuçlar autosave ile korunmalı: kayıt yüklemek aynı zar atışını yeniden üretip oyuncuya avantaj sağlamamalı.
- Marcus içerideyse diyalogla ikna denemesi olabilir; bu, onun gözü önünde kamera silmeye otomatik izin vermez.

**Kabul:** Samuel ve tek seferlik rastgele sonuçlar kayıt yükleyince değişmez; maymuncuk tekrarları zaman harcar; dedektif haritada görünmez.

## 6. Koşullu diyalog, yalanlar ve not defteri (P0/P1)

- Diyalog seçenekleri görünürlük koşulu, zaman/hamle bedeli, state etkisi, bilgi edinme ve çelişki kontrollerini desteklesin.
- Oyuncunun kritik beyanlarını `statementId`, muhatap, zaman ve içerikle kaydet. Not defterinde **Verdiğim İfadeler** alanında göster.
- Bir yalan, dedektif karşıt bilgiyi öğrenmedikçe otomatik olarak `çelişki` sayılmasın. Dedektif bilgisi sonradan değiştiğinde ilgili beyan yeniden değerlendirilebilir.
- Dedektifle karşılaşınca oyuncu ayrılmayı **deneyebilir**; şüphe ve somut bilgiye göre sonuç değişir. Yüksek şüphe tek başına otomatik tutuklama yaratmaz.
- Oyuncu dedektife doğrudan delil sunamaz, anonim ihbar yapamaz, NPC'yi dedektife ihbar taşıması için özel mekanikle kullanamaz.
- Noah esir tutulduğu laboratuvar bölümünde kapı/cam arkasından konuşulur. Oyuncunun katil olduğunu **bilmez**. Yardımı kurtarılmasına ve önceki anlaşmaya bağlıdır; yalan alibi vermez. Daniel–Adrian tartışmasına dair yalnızca tanık olduğu bilgiyi verebilir.

**Kabul:** Aynı konuşmanın farklı dalları state'e göre açılır; bilmediği delile göre dedektif oyuncuyu yalanla suçlamaz; notebook kayıtları doğru kalır.

## 7. Laboratuvar, dosya, gönderim ve Noah (P0/P1)

- Laboratuvar şifresi üç ipucunun birleşimiyle bulunur. Yanlış giriş **10 dakika**, doğru giriş **0 dakika**, deneme limiti yok. Şifre çözümü rastgele değil deterministik olmalı. JSON'daki mevcut parola `N170412` ve ipuçlarının birbirini gerçekten açıklayıp açıklamadığını senaryo doğrulamasında kontrol et.
- Dosyayı kopyalamak şifre çözülmesini gerektirir; **15 dakika**, **+100 bir kez**, erişim kaydı oluşturur.
- Dosyayı yetkililere gönderme yalnızca kopyalamadan sonra mümkündür; **15 dakika**, iletim kaydı oluşturur ve Noah için 360 dakikalık olay planlar.
- Noah kurtarılırsa **+50 bir kez**; otomatik resmî ifadesi alınır. Önceden anlaşılmış yardım türüyle uyumlu gerçek bilgiler soruşturma kaydına girer. Kurtarılmamış Noah'ın ifadesi dedektife otomatik gitmez.
- Oyuncu Noah'a verdiği sözü tutmayabilir; gönderim zorunlu değil. Kopyalama bonusu kurtarmadan bağımsızdır.

**Kabul:** Gönderim kopyalamadan önce mümkün değildir; dosya ve Noah ödülleri çift verilmez; kurtarma öncesi Noah ifadesi yoktur.

## 8. Suçlama, hazırlık, mahkeme ve finaller (P0)

- Dedektif oyuncuyu yalnızca mevcut, usulüne uygun değerlendirilmiş delil kombinasyonu yeterliyse resmen suçlayabilir. Bu eşiği motor düzeyinde **senaryoya göre yapılandırılabilir kural** yap; tek bir genel şüphe yüzdesiyle karar verme.
- Suçlama sonrası `pretrial` fazı: **2 ücretli hazırlık hamlesi**; daha önce keşfedilmiş bilgiler, erişilebilir tanık/iletişim ve savunma hazırlığı kullanılabilir. Yeni mekân/kanıt keşfi kapalı.
- Mahkeme `trial`: **3 kritik diyalog sorusu**; cevapların tutarlılığı ve dosyadaki kullanılabilir kanıtlar birlikte değerlendirilir. Üç doğru cevap otomatik beraat değildir.
- Oyuncu hiç suçlanmadıysa mahkemeye oyuncu sokulmaz; 72 saat sonunda `UNSOLVED` finali gösterilir. Başka şüphelinin yargılandığı sahne v1'de yoktur.
- Oyuncu suçlandıysa sonuç yalnızca `PLAYER_CONVICTED` veya `PLAYER_ACQUITTED` olabilir. Başka şüpheli için mahkûmiyet oluşturma.
- Final raporunda gerçek sonuç, belirleyici kanıtlar, dedektifin öğrendikleri, çürütülen yalanlar, dosya, Noah, bonuslar ve kritik eylem kronolojisi gösterilsin. Final ekranında spoiler serbest, oyun sırasında gizli bilgiler sızmasın.

**Kabul:** Tam üç aktif final vardır; mahkeme sadece suçlanan oyuncu için açılır; delilsiz mahkûmiyet olmaz; bonuslar hükmü değiştirmez.

## 9. Arayüz, kayıt ve mevcut ürünün korunması (P1)

- Statik görsel + hotspot akışı, harita, envanter, not defteri, koşullu diyalog ekranı ve tek autosave korunmalı. Masaüstü öncelikli responsive düzeni bozma.
- Üstte soruşturma günü/saati/kalan süre; not defterinde şüpheliler için sözel düzeyler ve oyuncunun ifadeleri; finalde ayrıntılı rapor.
- Otomatik kayıt; state, olay kuyruğu, bir kez gerçekleşmiş rastgele sonuçlar, silinmiş deliller, önceki ifadeler, verilen puanlar ve mevcut fazı eksiksiz saklamalı. Geri alma yok.
- Kayıt şemasını sürümlendir; eski kayıtların bozulmaması için migration veya açık uyumsuzluk ekranı ekle. Hatalı kayıt oyun akışını çökertecek şekilde ele alınmasın.

## 10. Test matrisi ve tamamlanma ölçütü (P0)

Otomatik testleri (projede mevcut çatı Vitest ise onu kullan) en az şu durumlar için yaz:

1. Açılışta 5 hamle limiti; erken çıkış; ücretsiz inceleme.
2. Cesedin bulunması zaman atlaması ve soruşturma saatinin doğru sıfırlanması.
3. Kanıtın toplanmadan önce temizlenmesi / toplandıktan sonra temizlenememesi.
4. Silinen kamera kaydının dedektif belleğini silmemesi, mahkemede fiziksel kayıt olarak kullanılamaması.
5. Şüphe yükselse bile yeterli kanıt olmadan suçlama ve mahkûmiyet olmaması.
6. Dedektifin bilmediği bir olguyla oyuncunun yalanını tespit edememesi.
7. Maymuncukta artan başarı şansı ve her denemede 30 dakika maliyeti.
8. Samuel varlığının tek kez belirlenmesi, autosave sonrası değişmemesi.
9. Yanlış parola +10 dakika, doğru parola 0 dakika, sınırsız deneme.
10. Dosya kopyalama +100 bir kez; göndermeden kurtarma olmaması; 360 dakika sonra Noah +50 bir kez.
11. Noah'ın anlaşma yokken oyuncuya özel alibi üretmemesi.
12. Soruşturma 4320 dakikada bitmesi; zaman ilerletme eylemiyle kilitlenmeden sona eriş.
13. Suçlama → 2 hazırlık hamlesi → 3 mahkeme sorusu → hüküm.
14. Sadece `PLAYER_CONVICTED`, `PLAYER_ACQUITTED`, `UNSOLVED` finallerinin erişilebilir olması.
15. Oyun kapatılıp açıldığında kanıt, zaman, olay kuyruğu ve puanların korunması.
16. Mevcut diğer senaryolar için regresyon testlerinin geçmesi.

## 11. Codex'in uygulama sırası ve teslim çıktıları

**Faz 1 — Keşif:** Repo mimarisi ve mevcut senaryo şeması; JSON ile fark analizi. `docs/OLUMCUL_PROJE_UYUM_RAPORU.md` oluştur.

**Faz 2 — Çekirdek:** Tipler, şema doğrulama, state, koşul/etki motoru, zaman ve olay kuyruğu; testler.

**Faz 3 — Soruşturma:** Delil yaşam döngüsü, dedektif bilgisi, NPC ve rastgele olaylar, koşullu diyalog; testler.

**Faz 4 — Görev ve final:** Laboratuvar, Noah, suçlama, hazırlık, mahkeme, üç final, rapor; testler.

**Faz 5 — UI ve entegrasyon:** Hotspot/kapı kontrolü, saat, not defteri, şüphe seviyeleri, autosave, mevcut senaryo uyumluluğu ve oynanış testi.

Her faz sonunda hangi dosyaların değiştiğini, test sonucunu, tamamlanan maddeleri ve kalan riskleri kısa raporla. **Mevcut çalışan sistemi topluca yeniden yazma.** Mevcut proje mimarisi farklıysa eşdeğer çözümü kullan; bu belgede önerilen dosya adlarını zorla dayatma.

## 12. Bilinen tasarım açıkları — sessizce çözme

1. **JSON hâlâ authoring formatında.** Diyaloglar örnek düzeyinde; tam oynanabilir içerik için tüm dallar, etkileşim metinleri ve referanslar tamamlanmalı. Sadece motor geliştirmesiyle bitmiş oyun ortaya çıkmış sayılmaz.
2. **72 saat ve eylem tabanlı saat:** Oyuncunun 72 saate ulaşabilmesi için bekleme/ilerletme veya eşdeğer açık akış zorunlu; bu tasarım kararı görünür tutulmalı.
3. **Noah'ın kurtarılmasının son güne sarkması:** Varsayılan olarak soruşturma bitince kurtarma gerçekleşmemişse `beklemede` raporlanır; bunun kullanıcı onayı gerekip gerekmediğini raporda belirt.
4. **Dedektifin kanıt toplama takvimi ve suçlama eşiği** henüz sayısal olarak kesinleşmedi. Oyun motorunda yapılandırılabilir bırak; gerçekçi ve test edilebilir bir ilk denge öner, bunu *öneri* olarak raporla.
5. **Üç ipucundan parolanın türetilmesi** oyuncu açısından anlaşılır olmalı. Gerekirse yalnızca bulmaca metnini iyileştirmeyi öner; onaysız yeni ana olay yaratma.
6. **Kamera kayıtları:** İlk giriş lobi kamerasında yok; oyuncu sonradan lobiye girerse görüntülenebilir. Başlangıç sahnesinde kayıt varmış gibi otomatik suçlayıcı delil üretme.
7. **Suçlanan oyuncu için mahkeme ile çözülemeyen dava ayrımı:** `UNSOLVED` yalnızca oyuncu resmen suçlanmamışsa kullanılmalı; suçlanmış oyuncu için mahkeme beraat/mahkûmiyet verir.

---

### Codex için bitiş koşulu

İş, yalnızca JSON dosyasını `scenarios/` klasörüne koymakla tamamlanmış sayılmaz. **Senaryonun gerçek uygulamada açılması, tüm zorunlu mekaniklerin çalışması, üç finale ulaşılabilmesi, autosave'in korunması ve testlerin geçmesi** gerekir. Herhangi bir bloklayıcı eksik varsa tamamlanmış gibi bildirme; hangi kullanıcı kararına ihtiyaç olduğunu net sor.
