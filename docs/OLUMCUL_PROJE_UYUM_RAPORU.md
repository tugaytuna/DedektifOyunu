# Ölümcül Proje — Mekanik Uygulama ve Uyum Raporu

## Uygulananlar

- Açılış sahnesi ofisle sınırlı; ücretsiz incelemeler hamle tüketmiyor, ücretli eylemler en fazla beş kez yapılabiliyor. Açılış bitince birkaç günün geçtiği sahne tetikleniyor ve 72 saatlik soruşturma saati sıfırdan başlıyor.
- Fiziksel delil durumu, oyuncu bilgisi, dedektif bilgisi ve mahkemede kabul edilebilirlik ayrı tutuluyor. Temizlenmiş/silinmiş delil yeniden incelenemiyor; dedektifin önceden topladığı şey sonradan temizlenemiyor.
- Zaman yalnızca soruşturmada ilerliyor. Açık bekleme, seyahat maliyeti ve 72 saat sonunda suçlama yoksa `UNSOLVED` finali uygulanıyor.
- Oyun başında seçilen ve kayıtta saklanan rastgelelik; Samuel’in tek seferlik karşılaşma sonucu ve tekrarlı maymuncuk denemeleri eklendi. Böylece her yeni oyunda aynı sonuçlara kilitlenilmiyor.
- Laboratuvar parolası `N170412`; yanlış giriş 10 dakika, doğru giriş 0 dakika. Dosya kopyalama +100 puanını bir kez veriyor. Kopyalamadan gönderim engelleniyor; gönderimden altı saat sonra Noah kurtarma olayı işleniyor ve +50 puan yalnızca zamanında tamamlanırsa veriliyor.
- Dedektifin mekân ziyaretleri, delil toplaması ve yeterli kanıt zinciri oluştuğunda suçlama; yalnızca suçlama sonrası iki hazırlık hamlesi ve sıralı üç mahkeme sorusu; üç kanonik final ve kapanış raporu arayüzü eklendi. Suçlama eşiği iki bağımsız destek olarak ayarlandı; böylece ikinci kanıtı toplamadan duruşmaya geçilmiyor ve mahkûmiyet finali ulaşılabilir kalıyor.
- Oyuncunun incelediği `discovered` durumundaki delil de dedektif ziyaretinde toplanabiliyor. Kopyalama ve gönderme, senaryoda tanımlı laboratuvar erişim kaydı ile iletim kaydını fiziksel delil durumuna alıyor.
- `null` başlangıçlı Noah ifadesi artık `absent`; başlangıçta bulunmayan deliller mahkemeye kabul edilebilir olarak işaretlenmiyor. Noah kurtarma süresi, gönderim eyleminin tamamlandığı andan itibaren tam 360 dakika.
- Eski v2 yerel kayıtlar yeni delil listesine taşınıyor; kaynakta başlangıcı `null` olan Noah ifadesinin eski kayıt hatası da temizleniyor.
- Oynanabilir senaryo `/olumcul-proje` rotasında; mevcut prototip ana sayfası korunuyor.

## Senaryo verisi ve açık noktalar

Senaryo JSON’u [`src/content/scenarios/OLUMCUL_PROJE_SENARYO_V1.json`](../src/content/scenarios/OLUMCUL_PROJE_SENARYO_V1.json) yolundan doğrudan yüklenir; `scenario.ts` çalışma anında kök alanları, ID benzersizliğini, konum/delil/olay referanslarını, koşul ve efekt operatörlerini, deneme olasılıklarını, ziyaret çizelgesini ve mahkeme yanıtlarını doğrular. TypeScript modeli `initial: null` değerini kapsayacak şekilde düzeltildi. Bağımsız bir `.schema.json` dosyası yok; bu özel kontroller authoring JSON’un çalışma zamanı şema doğrulayıcısıdır.

Kaynakta `engineCompatibility` haricindeki özgün hikâye verisi korunmuştur. Dedektif ziyaret çizelgesi ve suçlama/mahkûmiyet eşikleri oynanış için önerilen dengeleme varsayımlarıdır; anlatı kanonu olarak onaylanmış kabul edilmemelidir.

Kaynak senaryo laboratuvarında `password_clues` hotspot’ı listeliyor, fakat üç ipucunun metnini veya ipucu inceleme eylemini tanımlamıyor. Bu nedenle oyun ekranında `N170412` girilebilir olsa da oyuncu bunu yalnızca kaynak dosyadan öğrenebilir; laboratuvar bulmacası içerik açısından oynanmaya hazır değil. Lobi’de `elena` da mekân özelliği olarak listelenmiş, ancak ona ait diyalog/eylem tanımlanmamış. Bu iki noktaya yeni hikâye uydurulmadı.

Bazı konuşma dalları eksik. Rüşvet dalında tutar belirtilmediği için bu seçenek etkisiz olduğunu oyuncuya bildirir. Noah kurtarma olayı, planın geç kurtarma için beklemede kalma varsayımına uygun biçimde 72 saat sınırında tamamlanmaz ve bonus verilmez. Görsel malzeme ve kapsamlı diyalog metinleri mekanik değişikliğin kapsamı dışında kaldı.

## Doğrulama

- `npm test`: 23 mekanik/entegrasyon testi geçti.
- `./node_modules/.bin/tsc --noEmit`: geçti.
- `npm run build -- --webpack`: production build geçti; `/olumcul-proje` dahil tüm rotalar üretildi. Varsayılan Turbopack build, ortamın worker portu bağlama izni nedeniyle hata verdi.
- Yerel `/olumcul-proje` rotası HTTP 200 döndürdü.

## Test matrisi kapsamı

Testler açılış bütçesi, bütün mekân/aksiyon erişimi, NPC diyalog kapıları ve dedektif karşılaşması, save/load ve seed, parmak izi toplama/temizleme, şüphe ve suçlama eşiği, 72 saat, parola, kopyalama/silme/gönderme, Noah kurtarma ve bonus, üç finalin gerçek komutlarla erişilebilirliği, mahkeme sırası ve bozuk referans reddini kapsar. Ziyaret çizelgesinin anlatı temposu ve eşiklerin zorluğu oyun testi/denge turuyla ayrıca onaylanmalıdır.

## Sonuç

Motor entegrasyonu ve üç finalin erişilebilirliği testlerle doğrulandı. Tam senaryo henüz içerik bakımından oynanmaya hazır değil: laboratuvar şifre ipuçları ve lobi Elena etkileşimi kaynakta eksik. Bu metinler tamamlanmadan bu iki sahne doğal oyun akışıyla çözülemez/etkileşime açılamaz.
