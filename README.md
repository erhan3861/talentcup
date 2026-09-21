# Talent Cup — arayüz tasarım revizyonu

talentcup.org arayüzünün ortaokul (11-14) seviyesine uyarlanmış statik prototipi.
**İşlevsellik değiştirilmedi:** ekranlar, alanlar, akışlar, etiketler ve durum
metinleri canlı siteden birebir alındı.

Canlı site bir Vite + React SPA olduğu ve kaynak deposuna erişim olmadığı için
revizyon, aynı içerik ve akışları taşıyan statik HTML/CSS olarak hazırlandı.
React tarafına taşınırken `styles.css` token katmanı doğrudan kullanılabilir.

## Dosyalar

| Dosya | Canlı sitedeki karşılığı |
|---|---|
| `index.html` | `/` |
| `login.html` | `/login` |
| `kayit.html` | `/kayit` |
| `aktivasyon.html` | `/aktivasyon` |
| `yarismalar.html` | `/yarismalar` |
| `yarisma.html` | `/yarismalar/:competitionId` |
| `adim.html` | `/yarismalar/:competitionId/adim/:stepId` |
| `styles.css` | Tasarım sistemi (token, bileşen, koyu tema) |
| `app.js` | Tema, şifre göster/gizle, filtre, modal, geri sayım, üst bar gölgesi |
| `logo.png` | `2.png.png` kırpılmış hali (özgün dosya korundu) |
| `arkaplan.webp` / `arkaplan.jpg` | `talentcup_arakaplan.png`'nin web sürümü (2.2 MB → 174 KB webp, jpg yedek) |

Statik olduğu için liste ve patika içerikleri örnek veridir; canlı üründe
`app-dev.talent14.com/api/` üzerinden gelir.

## Tasarım yönü

Referans: `website_ornek.png`. Arka plan: `talentcup_arakaplan.png`.

- **Hero:** Sahne görseli sağa yaslı; sol, üst ve alt kenarı krem zemine eriyor.
  Kedi ve beş ışıklı ikonun hepsi görünür. İkonların üstünde referanstaki gibi
  numaralı etiketler var (1 Keşfet, 2 Hazırlık, 3 Görevler, 4 Üret, 5 Teslim).
  Etiketler görselin içinde yüzdeyle konumlandığı için her ekran boyutunda ikonun
  üstünde kalıyor.
- **Tek ekran:** Hero ve hemen altındaki Program bölümü, 1280×720'den 1920×1080'e
  kadar kaydırmadan tek ekrana sığıyor (boyutlar ekran yüksekliğine göre ölçekleniyor).
  Mobilde (360-414px) hero butonlarla birlikte ilk ekranda.
- **Program bölümü:** Sol ve sağ sütun eşit yükseklikte. Sağ karttaki tekrar
  eden açıklamalar kaldırıldı.
- **Alt sayfalar:** Aynı sahne, giriş/kayıt/aktivasyonda sağ yarıda, yarışmalar,
  patika ve adım sayfalarında üstte yumuşak bir bant olarak duruyor. Her sayfa
  sahnenin farklı bir bölgesini gösteriyor (tabela, ışıklı yol, kedi).
- **Yazı tipi:** Nunito (referanstaki yuvarlak, kalın başlıklar).
- **Butonlar:** Hap biçimli; mor ana buton, beyaz ikincil.

## Doğrulama

- 7 sayfa × 6 genişlik (320-1920px): yatay taşma yok, konsol hatası yok.
- Kontrast **gerçek render üstünden** ölçüldü (metin saydamlaştırılıp arka plan
  örneklenerek), görselin üstündeki metinler dahil. Turuncu/altın rozetlerdeki beyaz
  rakamlar 2.1:1'de kalıyordu; lacivert yazıya çevrildi (7:1+).
- Klavye: tab sırası görsel sırayla uyumlu, odak göstergesi 3px ve her yerde
  görünür, modal odağı hapsediyor, Esc kapatıyor, odak açan butona dönüyor.
- Filtreler görsel olarak doğrulandı (öznitelik değil, `offsetParent`).
- Dokunma hedefleri ≥ 44px (cümle içi metin bağlantıları hariç — WCAG 2.5.8
  satır içi istisnası).

## Bilinen sapmalar

- **Yazı tipleri Google Fonts'tan yükleniyor.** Canlı sitedeki davranış korundu,
  ancak öğrenci IP'si üçüncü tarafa gider. Üretimde kendi sunucunuzdan servis edin.
- Ekran okuyucu (NVDA/VoiceOver) ile elle tur atılmadı; klavye ve yapı kontrolü
  otomatik yapıldı.

## Güncelleme (2026-09-21)

- **Ana sayfa · Yarışmalar bölümü** (`#yarismalar`): Program ile "Siz de kendi yarışmanızı düzenleyin" arasında. Sağ üstte seviye filtresi (Tümü / İlkokul / Ortaokul / Lise), altında zaman filtresi. Kartlar `data-level="ortaokul lise"` gibi çoklu değer taşır; `app.js` filtre grupları artık sayfadan okunuyor (başlangıç değeri `aria-pressed="true"` olan buton).
- **Yarışma talebi formu** (`#request-modal`): "Yarışma Talebi Oluştur" artık mailto yerine form açıyor. Alanlar: kurum, il/ilçe, yetkili, görev, e-posta, telefon, yarışma türü, seviyeler, konu, öğrenci sayısı, tarih aralığı, not, aydınlatma onayı. İstemci doğrulaması + alan altı hata metni + ilk hataya odak. **Sunucu bağlı değil**: gönderimde yalnızca başarı ekranı gösterilir; `app.js` içindeki `fetch('/api/competition-requests' …)` yorumu bağlanacak nokta. Aydınlatma metni bağlantısı (`href="#"`) gerçek adresle değiştirilmeli.
- **Giriş ve kayıt** (`.auth-min`): sade kart, tek ekran. 1280×720, 1366×768, 1920×1080, 375×812, 360×640, 320×568'de kaydırma yok.
