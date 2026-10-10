# GAME DESIGN DOCUMENT (GDD)
## Retro Suç ve Soruşturma Oyunu — v1.0

**Durum:** 50 soruluk planlamanın onaylanmış kararları esas alınmıştır.  
**Platform:** Web tarayıcısı, masaüstü öncelikli / mobil uyumlu.  
**Yaratıcı ekip:** Kullanıcı ve Sarp.  
**İçerik sahipliği:** Hikâye, cinayet kurgusu, karakterler, diyaloglar ve finaller ekip tarafından yazılır. Bu belge hiçbir senaryo ayrıntısını kesinleştirmez.

## 1. Yüksek konsept
Oyuncu cinayeti işlediğini baştan bilir. Amaç, kararlarını ve ilişkilerini yöneterek soruşturmanın sonuçlarını etkilemek, gerçeğin açığa çıkmasını önlemeye çalışmak ve hikâyenin çeşitli sonlarına ulaşmaktır. Karşısında gerçek bir yapay zekâ servisi değil, **yalnızca öğrendiği bilgilere göre hareket eden algoritmik bir dedektif** bulunur. Oyuncu dedektifin bütün düşüncelerini ve kanıtlarını göremez.

**Temel deneyim:** 45–60 dakikalık tek kişilik, karar odaklı, yarı açık bir senaryo; merkezî inceleme arayüzü, statik mekân görselleri, tıklanabilir nesneler, karakter diyalogları, zaman ilerleyişi ve çoklu final.

## 2. Tasarım ilkeleri
1. **Bilgi adaleti:** Dedektif yalnızca oyun dünyasında gerçekten edindiği bilgileri kullanır; oyuncunun gizli durumu otomatik olarak dedektife geçmez.
2. **Anlaşılır seçimler:** Oyuncu mekân, nesne ve önceden yazılmış seçeneklerle etkileşir; serbest metin üretimi veya AI sohbeti yoktur.
3. **Sonuçların kalıcılığı:** Kararlar geri alınmaz; otomatik kayıt vardır. Senaryo sıfırdan yeniden başlatılabilir.
4. **Sınırlı üretim maliyeti:** Her mekânda tek statik görsel; animasyon, 3B, ses ve video ilk sürümde yoktur.
5. **İçerik-motor ayrımı:** Hikâye verileri JSON; kurallar ve algoritmalar TypeScript içinde.
6. **Kısmi görünürlük:** Oyuncu yalnızca öğrenebileceği olayları görür; dedektifin iç durumuna erişemez.

## 3. Oyun döngüsü
1. Oyuncu mevcut mekânı, erişilebilir nesneleri ve karakterleri inceler.
2. Bir eylem veya diyalog seçeneği seçer.
3. Oyun motoru koşulları kontrol eder; sonuçları, zaman maliyetini, bilgi/kanıt/ilişki değişimlerini uygular.
4. Zaman ilerlediyse dedektif ve senaryo olayları uygun kurallarla değerlendirilir.
5. Oyuncunun öğrenebildiği sonuçlar küçük bildirim veya önemli olay kartı olarak gösterilir.
6. Yeni mekânlar, konuşmalar veya nesne eylemleri açılabilir.
7. Yeterli koşullar oluştuğunda final tetiklenir; hikâye sonucu ve karar özeti gösterilir.

**Zaman:** Yalnızca oyuncu eylem gerçekleştirdiğinde ilerler. Beklerken gerçek zamanlı sayaç işlemez. Harita üzerinden yolculuk zaman tüketir. Oyun günü/saati ekranda görünür.

## 4. Oyuncu eylemleri ve gezinme
- **Harita:** Retro, sabit şehir haritası; erişilebilir mekân işaretleri, kilitli konumlar ve yolculuk süresi. Harici harita API'si yok.
- **Mekân:** Tek statik arka plan resmi; yüzde bazlı koordinatlı tıklanabilir hotspot'lar. Yeni görselle değiştirildiğinde hotspot koordinatları yeniden ayarlanabilir.
- **Ortak eylemler:** İncele, kullan, al, konuş, göster. Senaryo özel eylemler JSON'da tanımlanabilir.
- **Dinamik erişim:** Eylemler; saat, edinilen bilgi, önceki seçim, ilişki ve senaryo koşullarına bağlı açılır/kapanır.
- **Envanter:** Taşınan fiziksel nesneler.
- **Bilgi defteri:** Öğrenilen olaylar, ifadeler, olgular, zaman damgaları ve oyuncunun önceki yanıtları otomatik tutulur.

## 5. Karakterler ve konuşmalar
Karakterler özellik değerlerine sahiptir: örneğin güven, şüphecilik, cesaret, sadakat, dürüstlük, stres ve dedektife güven. Bu özellikler **yazılmış seçeneklerin** açılmasını, tepki ve sonuçlarını etkileyebilir; serbest diyalog üretmez. Karakterlerin gerçek bilgi ve gözlemleri tutarlı kalmalıdır.

**Diyalog:** Dallanmış, yazılı seçenek ağacı. Koşullar oyuncunun bilgisine, karakter durumuna, zaman ve önceki ifadelere dayanır. Her ifade kim, kime, ne zaman, hangi konuda, ne söyledi şeklinde yapılandırılmış etiketlerle kaydedilir. Örnek: `whereabouts_day1_evening=home`. Çelişki, yalnızca karşılaştırılabilir ifadeler uygun aktörün bilgisine girdiyse tespit edilebilir.

**NPC'ler arası iletişim:** Sürekli bağımsız ajan simülasyonu değil; yazar tarafından tanımlanan tetikleyicilerle arama, tartışma, bilgi aktarımı gibi olaylar. İlk sürümde otomatik karmaşık dedikodu ağı yoktur.

## 6. Dedektif algoritması
- Dedektifin **kendi bilgi kümesi** bulunur: bildiği kanıtlar, ifadeler, görüşmeler ve bunların doğrulama durumları.
- Kanıt yaşam döngüsü: bilinmiyor → keşfedildi → inceleniyor → doğrulandı / tartışmalı / geçersiz (geçişler senaryo kurallarına bağlı).
- Dedektif araştırma adımlarını zaman ilerlediğinde ve olay koşulları oluştuğunda değerlendirir.
- Sorgulamalar, dedektifin bildiği bilgi ve şüphe düzeyiyle tetiklenir.
- Çelişkiler, ancak dedektif karşılaştırılan bilgilerin **ikisine de** sahipse etkili olur.
- Suçlama için **hem** yeterli şüphe **hem** oyuncuyla bağlantılı kritik kanıt eşiği gereklidir. Eşikler senaryo verisinde yapılandırılır.
- Oyuncuya dedektifin gerçek şüphe puanı veya tüm bulguları gösterilmez; dolaylı işaretler olaylar, karakter konuşmaları ve haberlerle verilir.
- İlk sürümde tam teşekküllü otomatik mantıksal çıkarım sistemi yoktur.

## 7. Oyun durumu
Takip edilen altı temel değişken:
1. Dedektif şüphesi (oyuncuya gizli)
2. Oyuncu stresi
3. Karakter güven ilişkileri
4. Kanıt riski
5. Zaman baskısı
6. İtibar

**Not:** Bu değişkenlerin sayısal olarak hangilerinin oyuncuya gösterileceği henüz kesinleştirilmedi. Tasarım varsayılanı: kesin dedektif şüphesi gizli; diğerleri ilk prototipte yalnızca bağlamsal göstergelerle temsil edilebilir. Nihai gösterim ayrıca onaylanmalıdır.

## 8. Olaylar, bildirimler ve sonuçlar
- **Küçük bildirim:** Envanter eklendi, defter güncellendi, mekân açıldı, eylem tamamlandı.
- **Önemli olay kartı:** Başlık, isteğe bağlı görsel, kısa anlatım, isteğe bağlı karar seçenekleri, koşullar ve etkiler. Yalnızca oyuncunun bilebileceği olaylar gösterilir.
- **Finaller:** Kaçış, kalıcı şüphe, yakalanma, itiraf, başkasının suçlanması vb. olasılıklar; kesin finaller senaryo yazarlarına aittir.
- **Final ekranı:** Yazarın hazırladığı final anlatısı ve kaydedilen önemli seçimlerin özeti; oyun günü, çelişki sayısı, dedektifin bulduğu kritik kanıt sayısı, ilişki durumu gibi güvenilir hesaplanabilen veriler.
- **Tekrar oynama:** Farklı kararlar ve finaller. Başarım, puan ve sonlar koleksiyonu yok.

## 9. Kaydetme ve erişim
- Giriş/kayıt yok; tek oyunculu.
- Senaryo başına tek aktif yerel kayıt (`localStorage`).
- Her tamamlanan eylem/karardan sonra ve sayfa kapatılmadan önce uygun yaşam döngüsü noktasında otomatik kayıt.
- Geri alma veya eski karar noktasına yükleme yok. Baştan başlatma mevcut senaryo kaydını temizler.
- Aynı tarayıcı/profil dışına kayıt taşınmaz; tarayıcı verisi silinirse ilerleme kaybolabilir.
- Kısa, bağlamsal ilk kullanım ipuçları; uzun başlangıç eğitimi yok. Gösterilmiş ipuçları kayıtta saklanır.

## 10. Görsel dil ve erişilebilirlik
Retro analog dedektif hissi: eski dosyalar, daktilo, kâğıt, nostaljik bilgisayar estetiği. Her mekânda tek görsel; arayüzde ana sahne + sabit yan kontrol paneli, üstte gün/saat ve ayarlar. Mobilde panel açılır/kapanır; büyük diyalog ve olaylar tam ekran örtü olarak açılır. Okunabilir metin, yeterli kontrast, klavye odağı ve belirgin tıklanabilir alanlar hedeflenir. İlk sürüm **sessizdir**.

## 11. İlk oynanabilir prototip (5–10 dakika)
Gerçek ana hikâyeden **ayrı, geçici test senaryosu**:
- 2 mekân, 2 NPC, 3 kanıt.
- Kısa diyalog ve 1 sorgulama.
- 2 final.
- Saat ilerlemesi, harita, envanter, defter, olay kartları, otomatik kayıt ve debug paneli.
- Dedektif bilgi ayrımı ve suçlama koşulları çalışır.

Test senaryosu sadece sistem doğrulamak içindir; kullanıcı ve Sarp'ın gerçek hikâyesinin yerine geçmez.

## 12. Kapsam dışı (v1)
3B serbest dolaşım; çoklu kamera açısı; video/sinematik animasyon; müzik/ses; gerçek zamanlı sayaç; AI API diyalogları; çevrim içi çok oyunculu; hesap sistemi; bulut kayıt; senaryo editörü; sürükle-bırak nesne birleştirme; karmaşık NPC ajanları; başarımlar ve sonlar koleksiyonu.

## 13. Açık kararlar ve doğrulama
- Oyuncuya açık stres/itibar/zaman baskısı göstergelerinin ayrıntı düzeyi.
- Senaryo özel sayı aralıkları, zaman maliyetleri, kanıt eşikleri ve final koşulları.
- Gerçek hikâye, karakter listesi, mekân listesi ve tüm yazılı içerikler.
- Görsel üretim yönergeleri ve telif/varlık yönetimi.
- İleride çok oyunculu için ayrı tasarım gerekecek; v1 mimarisinin buna hazır olduğu iddia edilmez.
