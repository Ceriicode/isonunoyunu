# 🏰 Kale Kahramanları

Yeğenlerin kahraman olduğu, tarayıcıda çalışan bir **kale savunma (base defense)** oyunu.
Kurulum gerektirmez; telefon, tablet ve bilgisayarda oynanır.

## Nasıl oynanır?
1. Kahramanını seç (iki yeğen). ✏️ ile isimlerini değiştirebilirsin.
2. Savaş tarzını seç: **Okçu, Alev Büyücüsü, Buz Büyücüsü, Toprak Büyücüsü, Mühendis**.
3. Kahraman otomatik saldırır. Sağ alttaki **4 skill** butonuna bas.
4. Ekrana dokunursan skiller o noktaya atılır (3 saniye boyunca).
5. Düşmanlar dalga dalga gelir ve her dalgada güçlenir. Her 5 dalgada bir **Boss** gelir.
6. Kale duvarı yıkılırsa her şey saklanır, son kontrol noktasından (1, 6, 11, 16...) devam edilir.

**Klavye:** `1-4` veya `Q W E R` skiller • `Boşluk` dalgayı hemen başlat • `P` durdur • `B` çanta • `M` market • `U` güçlendirme • `S` skiller

## Özellikler
- 5 sınıf × 4 skill (seviye 1, 3, 5, 8'de açılır; her skill 5 seviyeye kadar yükselir)
- Level sistemi: her seviye can + saldırı gücü ve 1 skill puanı verir
- Item sistemi (3 slot):
  - 20 farklı **zırh**
  - 20 farklı **yüzük** (her biri farklı özellik)
  - Her sınıfa özel 20 **silah** (sadece seçilen sınıfa göre düşer)
  - Düşmanlardan **%1** şansla düşer (elit düşman %5, boss %35) ya da **markette** satılır (≈100-150 düşman kesmeye denk fiyat)
- 12 istatistik güçlendirmesi: can, kale duvarı, duvar onarımı, saldırı gücü, saldırı hızı, büyü süresi, skill yenileme, skill gücü, kritik, can yenileme, zırh, altın kazancı
- 8 düşman türü + 4 boss, 10. dalgadan sonra altın parlak **elit** düşmanlar
- Altın ve tecrübe dalga zorluğuna göre artar
- İlerleme tarayıcıda otomatik kaydedilir (her kahraman + sınıf için ayrı)

## GitHub Pages ile yayınlama
1. GitHub'da yeni bir repo aç (örn. `kale-kahramanlari`).
2. Bu klasördeki **tüm dosyaları** repoya yükle (`index.html` en üstte olmalı).
3. Repo → **Settings → Pages** → *Source: Deploy from a branch* → `main` / `(root)` → **Save**.
4. 1-2 dakika sonra oyun şu adreste açılır: `https://KULLANICI_ADIN.github.io/kale-kahramanlari/`

> Not: Repo herkese açık (public) ise içindeki fotoğraflar da herkese açık olur.

## Dosya yapısı
```
index.html          → sayfa iskeleti
css/style.css       → tasarım
js/data.js          → sınıflar, skiller, itemler, düşmanlar, denge ayarları (oyunu buradan ayarla)
js/engine.js        → oyun motoru (dalgalar, savaş, level, item düşmesi, kayıt)
js/render.js        → çizimler (kale, kahraman, düşmanlar, efektler)
js/ui.js            → menüler, HUD, market, çanta, ana döngü
js/audio.js         → ses efektleri (dosya gerekmez)
assets/kahraman1.png, kahraman2.png → yeğenlerin yüzleri
```

## Kolay ayarlar
- **İsimler:** `js/data.js` → `KK.HEROES`
- **Yüz değiştirmek:** `assets/` içindeki PNG'leri aynı isimle değiştir (kare, yüz ortada).
- **Zorluk:** `js/data.js` → `KK.BALANCE` (`hpScale`, `dmgScale`, `dropChance`...)
- **Item fiyatı:** `js/engine.js` → `KK.itemPrice`
