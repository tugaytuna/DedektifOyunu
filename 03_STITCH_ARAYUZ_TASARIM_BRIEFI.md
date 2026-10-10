# STITCH TASARIM BRİEFİ
## Retro Suç ve Soruşturma Oyunu — Görsel Arayüz

> **Bu belgeyi Stitch'e ver:** Aşağıdaki kapsamı temel alarak yüksek kaliteli, uygulanabilir bir **web oyunu arayüzü** tasarla. Tasarım yalnızca arayüz içindir; oyun hikâyesi, cinayet detayları, karakter biyografileri ve gerçek senaryo olayları üretme. Gerektiğinde açıkça **PLACEHOLDER / ÖRNEK İÇERİK** kullan.

## 1. Ürün ve deneyim
Masaüstü öncelikli, mobil uyumlu, tek oyunculu, retro dedektif atmosferinde bir tarayıcı oyunu. Oyuncu cinayeti işlediğini baştan biliyor; sahneleri inceliyor, kişilerle konuşuyor, bilgi ve nesne topluyor, soruşturmanın seyrini kararlarla etkiliyor. Dedektifin iç düşünceleri ve gerçek şüphe puanı **gizli**. Serbest dolaşım/3B yok: **her mekânda tek statik sahne görseli ve tıklanabilir hotspot'lar** var.

**Ana tasarım hedefi:** Görsel olarak karakterli ama teknik olarak basit; React + Tailwind ile rahat uygulanabilecek bileşenler. Karmaşık animasyonlar, oyun motoru gerektiren efektler, video, 3B ve ses arayüzü tasarlama.

## 2. Görsel yön
- Atmosfer: nostaljik soruşturma masası, 1970–1990 arası analog arşiv/erken bilgisayar çağrışımı; belirli tarih veya şehir zorunlu değil.
- Malzemeler: koyu mürekkep, solmuş kâğıt, karton dosya, metal etiket, hafif film grenini çağrıştıran **çok ölçülü** dokular.
- Önerilen palet: kömür `#1C211F`, koyu zeytin `#303B34`, kâğıt `#E8DDC5`, açık kâğıt `#F4EBDD`, pas/bakır vurgu `#A86B47`, uyarı `#B94B42`, başarı `#65836B`.
- Tipografi: başlıkta ölçülü daktilo/monospace hissi; uzun metinlerde çok okunaklı serif veya sans-serif. Metni dekoratif fontla zor okunur hâle getirme.
- İkonlar: ince çizgili, tutarlı, basit. Dekoratif efektler bilgi hiyerarşisini bastırmamalı.
- Korku/şiddet görseli değil, **gerilim ve gizem** duygusu hedefle.

## 3. Masaüstü ana ekran — öncelikli tasarım
**Önerilen hedef genişlik:** 1440 × 900 (ayrıca 1280 × 800 uyumu).

### Üst bar (yaklaşık 64–72 px)
- Sol: geçici oyun logosu/başlığı.
- Orta: `GÜN 02 • 14:35` gibi belirgin gün ve saat.
- Sağ: kısa olay bildirimi simgesi (isteğe bağlı), ayarlar ve oyundan çıkış.
- Kesin dedektif şüphe yüzdesi veya tüm gizli soruşturma verileri **gösterilmemeli**.

### Ana çalışma alanı
- **Sol/orta ~%72:** büyük, tek statik mekân illüstrasyonu. Görselin üzerinde 2–5 belirgin ama zarif hotspot işaretçisi.
- **Sağ ~%28:** sabit kontrol paneli, yaklaşık 320–380 px genişlik.
- Sahne üzerinde mekân adı, kısa açıklama ve gerekirse erişilebilir eylem çağrısı.
- Hotspot'larda hover/focus durumunda etiket, tıklamada eylem menüsü veya inceleme modalı.
- Görsel `object-fit: contain` yaklaşımıyla kırpılmadan gösterilebilmeli; hotspot'lar görüntü koordinatına bağlı kalmalı.

### Sağ panel
Sekmeler veya net gezinme: **Harita / Envanter / Bilgi Defteri / Kişiler**.
- Harita: stilize sabit şehir haritası; erişilebilir, kilitli ve aktif konumlar; seyahat süresi.
- Envanter: küçük nesne kartları, isim, incele/göster/kullan eylemleri.
- Bilgi Defteri: kronolojik notlar ve kategori filtreleri (olaylar, ifadeler, bulgular). Kaydedilmiş bilgileri düzenli göster.
- Kişiler: portre placeholder, isim, bilinen ilişki bilgileri; **gizli NPC özelliklerini gösterme**.

### Alt alan / durum mesajları
- Küçük bildirimler ekranın sağ alt/üst kısmında geçici görünür.
- Gereksiz kalıcı bilgi çubukları ve RPG tarzı 6 sayısal sayaç kullanma.

## 4. Tasarlanacak ekranlar ve durumlar
**Stitch'ten aşağıdaki ekranları ayrı ayrı üretmesini iste:**

1. **Ana menü:** Oyuna Başla, Devam Et (kayıt varsa), Ayarlar; retro kapak atmosferi. Giriş/üyelik butonu yok.
2. **Ana oyun ekranı:** Büyük sahne + sağ panel + üst bar; örnek hotspot'lar.
3. **Hotspot etkileşim penceresi:** Nesne başlığı, kısa açıklama, `İncele`, `Al`, `Kullan`, `Göster` gibi koşula bağlı butonlar. Kullanılamayan seçenekler ya gizli ya da açık gerekçeyle pasif.
4. **Diyalog penceresi:** Karakter adı/portre, konuşma metni, 2–4 yazılmış seçim, seçeneğin odak/hover/disabled durumu. Serbest metin girişi **yok**.
5. **Önemli olay kartı:** Başlık, isteğe bağlı görsel alanı, kısa anlatım, 2–3 karar seçeneği veya `Devam Et`.
6. **Harita sekmesi:** Sabit şehir haritası, konum noktaları, kilit durumları, yolculuk dakikaları.
7. **Envanter sekmesi:** Nesne listesi, seçili nesne ayrıntısı.
8. **Bilgi defteri:** Not kategorileri, zaman damgalı kayıt, okunaklı uzun metin.
9. **Kişiler sekmesi:** Karakter kartları, oyuncunun bildiği kısa özet.
10. **Küçük bildirim durumları:** Başarı, bilgi eklendi, mekân açıldı, zaman geçti; gizli dedektif faaliyeti bildirimi yok.
11. **Oyun sonu:** Büyük final başlığı ve yazarın final metni, altında karar özeti ve `Senaryoyu Yeniden Başlat`.
12. **Ayarlar / yeniden başlatma onayı:** Basit görünüm ve açık geri dönüş uyarısı.
13. **Mobil ana oyun ekranı:** 390 × 844; sahne öncelikli, sağ panel alttan açılan drawer veya sekmeli tam ekran görünüm.
14. **Mobil diyalog ve olay kartı:** Tam ekran, rahat dokunulabilir seçenekler.

## 5. Kullanıcı etkileşimleri
### Hotspot
- Varsayılan: küçük kontrastlı işaret ve erişilebilir odak halkası.
- Hover/focus: nesne adı ve inceleme ipucu.
- Seçim: kısa açıklamalı eylem paneli.
- Etkileşim yoksa dekoratif, tıklanabilir gibi görünmesin.

### Diyalog
- Oyuncu sadece hazır seçeneklerden birini seçer.
- Seçenekler çok satırlı olabilir; buton yüksekliği içeriğe göre esnemeli.
- Diyaloglar tekrar açılabilir; seçim geçmişini UI otomatik geri almaz.

### Olay kartı
- Önemli olaylar oyuncunun karar vermesini gerektirebilir.
- Kartın görseli **opsiyonel**; görselsiz durumda da tasarım dengeli görünmeli.
- Oyuncuya görünmemesi gereken gizli dedektif bilgileri kart metninde yer almamalı.

### Zaman
- Saat sadece oyuncu eylemleriyle ilerler.
- Gerçek zamanlı countdown, animasyonlu saat, sürekli akan sayaç yok.

## 6. Mobil uyarlama
- 390 px ve 430 px ekranları hedefle; 768 px tablet kırılımı da düşün.
- Sahne görseli öncelikli; panel `drawer`, alt sekme veya tam ekran alt sayfa olarak açılabilir.
- Modaller küçük ekranlarda tam ekran veya yüksekliği sınırlı scrollable sheet olur.
- Dokunma hedefleri en az yaklaşık 44 × 44 px; yatay kaydırma zorunlu olmasın.
- Görsel hotspot'ları parmakla seçilebilir; çakışan hotspot'lar için listeli erişim alternatifi öner.
- Uzun metinler dikey kaydırılabilir, ana aksiyonlar görünür kalır.

## 7. Erişilebilirlik ve okunabilirlik
- Gövde metni tercihen 16 px veya üzeri, yeterli satır aralığı.
- Yeterli kontrast; sadece renkle anlam aktarma.
- Klavye ile gezinme, görünür focus, Escape ile kapatma (kritik karar sırasında güvenli davranış), modal odak yönetimi.
- İkonların yanında etiket veya erişilebilir ad.
- Kâğıt dokusu metnin arkasında okunurluğu azaltmamalı.
- Hareket azaltma tercihlerine uyum; zaten ağır animasyon tasarlanmayacak.

## 8. Bileşen kütüphanesi isteği
Stitch ayrıca küçük bir tasarım sistemi sunsun:
- Renk token'ları (arka plan, yüzey, metin, vurgu, hata, sınır).
- Tipografi ölçeği (H1, H2, panel başlığı, gövde, küçük not).
- Butonlar (primary, secondary, ghost, danger; normal/hover/focus/disabled).
- Sekmeler, kartlar, rozetler, tooltip, toast, modal, drawer, boş durumlar.
- Grid/spacing kuralları (8 px tabanlı sistem önerisi).
- Mobil/masaüstü bileşen davranışı.

## 9. Örnek içerik sınırları
Arayüzde yalnızca nötr placeholder kullan:
- Mekân: `Eski Çalışma Odası`, `Şehir Merkezi` (**sadece tasarım placeholder'ı**).
- Karakter: `Karakter A`, `Karakter B`.
- Nesne: `Belge`, `Anahtar`.
- Olay: `Beklenmedik Gelişme`.
- Diyalog: kısa, olay örgüsünü belirlemeyen örnek cümleler.

**Hikâye, suçun nasıl işlendiği, alibi, delil gizleme yöntemi, gerçek karakter geçmişi veya final yazma.** Bu içerikler ekip tarafından daha sonra JSON üzerinden sağlanacak.

## 10. Teknik uygulanabilirlik kısıtları
- Next.js + React + Tailwind ile uygulanabilir tasarım.
- Tek statik görsel + HTML/CSS hotspot katmanı.
- Harita statik resim/SVG ve işaretçiler; gerçek harita API'si yok.
- Statik veya isteğe bağlı üretilmiş görseller; görsel yolları JSON'dan gelir.
- Hiçbir ekranda hesap/oturum, online sohbet, multiplayer, ses çalar, video oynatıcı veya 3B kontrolü yok.
- İlk sürümde editör/admin paneli tasarlama; yalnızca geliştirici debug paneli gerekirse ayrı, düşük öncelikli wireframe olabilir.
- Ağır gölgeler, animasyonlar, sahte işlevsel kontroller ve aşırı dekoratif öğelerden kaçın.

## 11. Stitch'ten beklenen çıktı
1. Tutarlı bir görsel sistem ve ana ekran tasarımı.
2. Yukarıdaki 14 ekran/durumun masaüstü ve gerekli mobil varyantları.
3. Responsive düzen ve etkileşim durumlarının açıklaması.
4. Uygulanabilir bileşen ayrımı ve mümkünse React/Tailwind'e dönüştürülebilir yapı.
5. Sahne görseli, karakter portresi ve harita gibi **yer tutucu** görsel alanlarının net ölçü/aspect-ratio önerileri.

**Öncelik sırası:** Ana oyun ekranı → diyalog → olay kartı → harita → defter/envanter/kişiler → mobil uyarlama → menü/final/ayarlar. İlk tasarım turunda tüm sistemi karmaşıklaştırma; sade ve tutarlı bir ana ekranla başla.
