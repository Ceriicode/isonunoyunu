/* =========================================================
   KALE KAHRAMANLARI - Oyun Verileri
   Bu dosyada kahramanlar, sınıflar, skiller, itemler,
   düşmanlar ve güçlendirmeler tanımlanır.
   Değerleri değiştirerek oyunu kolayca ayarlayabilirsin.
   ========================================================= */

// Tüm oyun verisini tek bir global nesnede topluyoruz (ES module kullanmadık,
// böylece index.html dosyası çift tıklanınca da çalışır)
window.KK = window.KK || {};

/* ---------------------------------------------------------
   KAHRAMANLAR (yeğenler)
   İsimleri buradan ya da oyun içindeki ✏️ butonundan değiştirebilirsin
   --------------------------------------------------------- */
KK.HEROES = [
  { id: 'k1', name: 'Küçük Kahraman', img: 'assets/kahraman1.png', scale: 0.9 },
  { id: 'k2', name: 'Büyük Kahraman', img: 'assets/kahraman2.png', scale: 1.0 },
];

/* ---------------------------------------------------------
   STAT İSİMLERİ - arayüzde gösterilecek Türkçe karşılıklar
   pct: true olanlar yüzde (%) olarak gösterilir
   --------------------------------------------------------- */
KK.STAT_NAMES = {
  dmgPct:    { n: 'Saldırı Gücü', pct: true },
  atkSpd:    { n: 'Saldırı Hızı', pct: true },
  crit:      { n: 'Kritik Şansı', pct: true },
  critDmg:   { n: 'Kritik Hasarı', pct: true },
  maxHp:     { n: 'Can', pct: false },
  hpRegen:   { n: 'Can Yenileme /sn', pct: false },
  armor:     { n: 'Zırh (hasar azaltma)', pct: true },
  dodge:     { n: 'Kaçınma', pct: true },
  lifesteal: { n: 'Can Çalma', pct: true },
  cdr:       { n: 'Bekleme Azaltma', pct: true },
  spellDur:  { n: 'Büyü Süresi', pct: true },
  skillDmg:  { n: 'Skill Gücü', pct: true },
  goldGain:  { n: 'Altın Kazancı', pct: true },
  xpGain:    { n: 'Tecrübe Kazancı', pct: true },
  wallHp:    { n: 'Kale Duvarı Canı', pct: false },
  wallRegen: { n: 'Duvar Onarımı /sn', pct: false },
  wallArmor: { n: 'Duvar Zırhı', pct: true },
  thorns:    { n: 'Diken (duvara vurana hasar)', pct: false },
  boss:      { n: 'Boss Hasarı', pct: true },
  slow:      { n: 'Yavaşlatma', pct: true },
  splash:    { n: 'Alan Hasarı', pct: true },
  multishot: { n: 'Ekstra Mermi', pct: false },
  dropRate:  { n: 'Item Düşme Şansı', pct: true },
};

/* ---------------------------------------------------------
   SINIFLAR
   base: sınıfın başlangıç değerleri
   proj: normal saldırının mermi görünümü
   skills: 4 adet skill (unlock = açılması için gereken seviye)
   --------------------------------------------------------- */
KK.CLASSES = {
  archer: {
    id: 'archer', name: 'Okçu', icon: '🏹', color: '#3fae5a', color2: '#1f6b34',
    desc: 'Çok hızlı ok atar, kritik vuruşları güçlüdür.',
    base: { dmg: 12, atkSpd: 1.6, crit: 10, critDmg: 100, range: 1150 },
    proj: { type: 'arrow', speed: 900, color: '#e8d6a0' },
    hat: 'hood',
    skills: [
      { id: 'multi', name: 'Çoklu Ok', icon: '🎯', cd: 6, unlock: 1,
        desc: 'Yelpaze şeklinde 7 ok fırlatır.' },
      { id: 'rain', name: 'Ok Yağmuru', icon: '🌧️', cd: 12, unlock: 3, dur: 4,
        desc: 'Bir bölgeye saniyelerce ok yağdırır.' },
      { id: 'pierce', name: 'Delici Ok', icon: '➶', cd: 10, unlock: 5,
        desc: 'Tüm düşmanların içinden geçen dev bir ok.' },
      { id: 'eagle', name: 'Kartal Gözü', icon: '🦅', cd: 20, unlock: 8, dur: 6,
        desc: 'Saldırı hızı +%80 ve kritik şansı +%30 kazanırsın.' },
    ],
  },
  fire: {
    id: 'fire', name: 'Alev Büyücüsü', icon: '🔥', color: '#e5532d', color2: '#8a2410',
    desc: 'Ateş topları patlar, etraftaki düşmanları da yakar.',
    base: { dmg: 17, atkSpd: 1.0, crit: 5, critDmg: 100, range: 1100, splash: 55 },
    proj: { type: 'fireball', speed: 600, color: '#ff8a2a' },
    hat: 'wizard',
    skills: [
      { id: 'fireball', name: 'Büyük Ateş Topu', icon: '☄️', cd: 6, unlock: 1,
        desc: 'Kocaman bir ateş topu, büyük alanda patlar.' },
      { id: 'firewall', name: 'Alev Duvarı', icon: '🔥', cd: 12, unlock: 3, dur: 5,
        desc: 'Yere yanan bir alev duvarı çeker.' },
      { id: 'meteor', name: 'Meteor Yağmuru', icon: '🌠', cd: 16, unlock: 5, dur: 3,
        desc: 'Gökten rastgele meteorlar düşer.' },
      { id: 'phoenix', name: 'Anka Kuşu', icon: '🐦‍🔥', cd: 22, unlock: 8, dur: 6,
        desc: 'Savaş alanında uçan ve yakan bir Anka çağırır.' },
    ],
  },
  ice: {
    id: 'ice', name: 'Buz Büyücüsü', icon: '❄️', color: '#4fb6e8', color2: '#1d5f86',
    desc: 'Düşmanları yavaşlatır ve dondurur.',
    base: { dmg: 13, atkSpd: 1.25, crit: 5, critDmg: 100, range: 1100, slow: 30 },
    proj: { type: 'shard', speed: 750, color: '#bff0ff' },
    hat: 'wizard',
    skills: [
      { id: 'lance', name: 'Buz Mızrağı', icon: '🔱', cd: 6, unlock: 1,
        desc: 'Düz bir hatta delip geçen ve donduran mızrak.' },
      { id: 'blizzard', name: 'Kar Fırtınası', icon: '🌨️', cd: 12, unlock: 3, dur: 5,
        desc: 'Bölgedeki düşmanları yavaşlatıp hasar verir.' },
      { id: 'nova', name: 'Dondurucu Dalga', icon: '💠', cd: 18, unlock: 5, dur: 2.5,
        desc: 'Ekrandaki TÜM düşmanları bir süre dondurur.' },
      { id: 'icewall', name: 'Buz Duvarı', icon: '🧊', cd: 20, unlock: 8, dur: 8,
        desc: 'Düşmanları durduran buzdan bir duvar örer.' },
    ],
  },
  earth: {
    id: 'earth', name: 'Toprak Büyücüsü', icon: '🪨', color: '#a67c3d', color2: '#5c4220',
    desc: 'Yavaş ama çok güçlü vurur, sersemletir.',
    base: { dmg: 24, atkSpd: 0.75, crit: 5, critDmg: 120, range: 1050, splash: 35 },
    proj: { type: 'rock', speed: 520, color: '#8b6b45' },
    hat: 'leaf',
    skills: [
      { id: 'spikes', name: 'Kaya Dikenleri', icon: '⛰️', cd: 7, unlock: 1, dur: 3,
        desc: 'Yerden sivri kayalar fışkırır.' },
      { id: 'quake', name: 'Deprem', icon: '🌋', cd: 14, unlock: 3,
        desc: 'Tüm düşmanlara hasar verir ve sersemletir.' },
      { id: 'golem', name: 'Taş Golem', icon: '🗿', cd: 22, unlock: 5, dur: 10,
        desc: 'Önde savaşan dev bir taş golem çağırır.' },
      { id: 'boulder', name: 'Dev Kaya', icon: '🪨', cd: 15, unlock: 8,
        desc: 'Yolda yuvarlanıp her şeyi ezen dev kaya.' },
    ],
  },
  engineer: {
    id: 'engineer', name: 'Mühendis', icon: '🔧', color: '#f2b632', color2: '#7a5a12',
    desc: 'Taret, drone ve mayınlarla savaşır.',
    base: { dmg: 9, atkSpd: 2.2, crit: 5, critDmg: 100, range: 1050 },
    proj: { type: 'bullet', speed: 1100, color: '#ffe17a' },
    hat: 'goggles',
    skills: [
      { id: 'turret', name: 'Otomatik Taret', icon: '🛡️', cd: 12, unlock: 1, dur: 12,
        desc: 'Kendi kendine ateş eden bir taret kurar.' },
      { id: 'drone', name: 'Saldırı Drone\'u', icon: '🛸', cd: 15, unlock: 3, dur: 12,
        desc: 'Düşmanlara uçup ateş eden drone.' },
      { id: 'mines', name: 'Mayın Tarlası', icon: '💣', cd: 12, unlock: 5, dur: 15,
        desc: 'Yola patlayan mayınlar döşer.' },
      { id: 'rockets', name: 'Roket Yağmuru', icon: '🚀', cd: 20, unlock: 8,
        desc: 'Düşmanlara takip eden roketler fırlatır.' },
    ],
  },
};

// Skill maksimum seviyesi
KK.SKILL_MAX = 5;

/* ---------------------------------------------------------
   DÜŞMANLAR
   hp: can, spd: hız (piksel/sn), dmg: duvara verdiği hasar,
   gold/xp: öldürünce kazanılan, from: hangi dalgadan itibaren gelir
   --------------------------------------------------------- */
KK.ENEMIES = {
  goblin:   { name: 'Goblin',        hp: 30,  spd: 55,  dmg: 6,  gold: 2,  xp: 3,  r: 18, color: '#6cc04a', from: 1 },
  wolf:     { name: 'Kurt',          hp: 22,  spd: 110, dmg: 5,  gold: 2,  xp: 3,  r: 17, color: '#8a8f99', from: 2 },
  bat:      { name: 'Yarasa',        hp: 18,  spd: 85,  dmg: 4,  gold: 2,  xp: 3,  r: 14, color: '#6b4fa0', from: 4, fly: true },
  orc:      { name: 'Ork',           hp: 95,  spd: 38,  dmg: 14, gold: 5,  xp: 6,  r: 24, color: '#4f8a3a', from: 3, armor: 0.15 },
  skeleton: { name: 'İskelet Okçu',  hp: 38,  spd: 45,  dmg: 7,  gold: 4,  xp: 5,  r: 18, color: '#e9e4d4', from: 5, ranged: 420 },
  shaman:   { name: 'Şaman',         hp: 55,  spd: 40,  dmg: 5,  gold: 6,  xp: 7,  r: 19, color: '#c05ac0', from: 7, healer: true },
  troll:    { name: 'Trol',          hp: 280, spd: 26,  dmg: 32, gold: 14, xp: 16, r: 34, color: '#5e8c7a', from: 9, armor: 0.25 },
  knight:   { name: 'Kara Şövalye',  hp: 160, spd: 42,  dmg: 20, gold: 10, xp: 12, r: 25, color: '#3a3d4a', from: 12, armor: 0.4 },
};

// Boss'lar (her 5 dalgada bir sırayla gelir)
KK.BOSSES = [
  { name: 'Dev Goblin Kral', hp: 1300, spd: 24, dmg: 45, gold: 120, xp: 120, r: 52, color: '#58a83a' },
  { name: 'Kurt Sürüsü Lideri', hp: 1100, spd: 40, dmg: 40, gold: 130, xp: 130, r: 46, color: '#6e7480' },
  { name: 'Taş Dev', hp: 2000, spd: 18, dmg: 60, gold: 150, xp: 150, r: 60, color: '#7d7466', armor: 0.3 },
  { name: 'Kara Ejderha', hp: 1700, spd: 30, dmg: 55, gold: 170, xp: 170, r: 56, color: '#3b2a4a', fly: true, ranged: 500 },
];

/* ---------------------------------------------------------
   İSTATİSTİK GÜÇLENDİRMELERİ (altınla satın alınır)
   val: her seviyede verilen değer, cost: ilk fiyat, mult: fiyat artış çarpanı
   --------------------------------------------------------- */
KK.UPGRADES = [
  { id: 'up_hp',     stat: 'maxHp',     name: 'Can',               icon: '❤️', val: 25,  cost: 25, mult: 1.17, max: 100 },
  { id: 'up_wall',   stat: 'wallHp',    name: 'Kale Duvarı',       icon: '🏰', val: 120, cost: 30, mult: 1.17, max: 100 },
  { id: 'up_wreg',   stat: 'wallRegen', name: 'Duvar Onarımı',     icon: '🧱', val: 1.5, cost: 40, mult: 1.2,  max: 50 },
  { id: 'up_dmg',    stat: 'dmgPct',    name: 'Saldırı Gücü',      icon: '⚔️', val: 10,  cost: 30, mult: 1.18, max: 100 },
  { id: 'up_spd',    stat: 'atkSpd',    name: 'Saldırı Hızı',      icon: '⚡', val: 6,   cost: 35, mult: 1.2,  max: 40 },
  { id: 'up_dur',    stat: 'spellDur',  name: 'Büyü Süresi',       icon: '⏳', val: 8,   cost: 40, mult: 1.22, max: 25 },
  { id: 'up_cdr',    stat: 'cdr',       name: 'Skill Yenileme',    icon: '🔄', val: 3,   cost: 45, mult: 1.25, max: 15 },
  { id: 'up_skill',  stat: 'skillDmg',  name: 'Skill Gücü',        icon: '✨', val: 10,  cost: 35, mult: 1.19, max: 80 },
  { id: 'up_crit',   stat: 'crit',      name: 'Kritik Şansı',      icon: '🎯', val: 2,   cost: 40, mult: 1.24, max: 20 },
  { id: 'up_regen',  stat: 'hpRegen',   name: 'Can Yenileme',      icon: '💚', val: 1,   cost: 30, mult: 1.2,  max: 50 },
  { id: 'up_armor',  stat: 'armor',     name: 'Zırh',              icon: '🛡️', val: 2,   cost: 45, mult: 1.25, max: 20 },
  { id: 'up_gold',   stat: 'goldGain',  name: 'Altın Kazancı',     icon: '💰', val: 8,   cost: 50, mult: 1.22, max: 40 },
];

/* ---------------------------------------------------------
   ITEMLER
   Her item: { key, slot, tier(1-20), name, icon, stats }
   tier ne kadar yüksekse item o kadar güçlü ve pahalı
   --------------------------------------------------------- */

// Silah isimleri (her sınıf için 20 tane)
KK.WEAPON_NAMES = {
  archer: ['Ahşap Yay', 'Avcı Yayı', 'Çam Yayı', 'Keskin Nişancı', 'Rüzgar Yayı', 'Şahin Yayı', 'Gölge Yayı',
    'Kartal Pençesi', 'Fırtına Yayı', 'Ay Işığı Yayı', 'Ejder Kemiği Yayı', 'Yıldırım Yayı', 'Gökkuşağı Yayı',
    'Kuzey Yıldızı', 'Altın Kanat', 'Simurg Tüyü', 'Göktürk Yayı', 'Efsane Yay', 'Sonsuzluk Yayı', 'Kahramanın Yayı'],
  fire: ['Kıvılcım Asası', 'Kor Asası', 'Meşale Asası', 'Kızgın Değnek', 'Alev Dili', 'Kızıl Asa', 'Lav Asası',
    'Ateş Kuşu Asası', 'Güneş Asası', 'Mavi Alev Asası', 'Ejderha Alevi', 'Anka Tüyü', 'Yanardağ Asası',
    'Yıldız Ateşi', 'Magma Kalbi', 'Volkan Kralı', 'Güneş Patlaması', 'Sonsuz Alev', 'Ebedi Ateş', 'Alev İmparatoru'],
  ice: ['Kırağı Asası', 'Kar Tanesi', 'Buzul Değnek', 'Soğuk Rüzgar', 'Kutup Asası', 'Buz Kristali', 'Ayaz Asası',
    'Donmuş Göl', 'Kış Kralı', 'Buz Ejderi', 'Kuzey Işığı', 'Çığ Asası', 'Elmas Buz', 'Buz Dağı', 'Kristal Taç',
    'Fırtına Asası', 'Ebedi Kış', 'Mutlak Sıfır', 'Buz Devi', 'Kışın Kalbi'],
  earth: ['Taş Değnek', 'Kaya Asası', 'Orman Dalı', 'Granit Asa', 'Kök Asası', 'Mermer Asa', 'Zümrüt Asa',
    'Dağ Kalbi', 'Deprem Asası', 'Kristal Mağara', 'Kehribar Asa', 'Volkan Taşı', 'Yer Altı Asası', 'Dev Meşe',
    'Obsidyen Asa', 'Toprak Ana', 'Dağların Gücü', 'Elmas Kaya', 'Kadim Ağaç', 'Dünyanın Çekirdeği'],
  engineer: ['Paslı Anahtar', 'Çivi Tabancası', 'Lehim Tabancası', 'Perçin Atar', 'Buhar Tüfeği', 'Lazer Tabancası',
    'Plazma Atar', 'Tesla Bobini', 'Robot Kol', 'Nano Tüfek', 'Gauss Tüfeği', 'Foton Topu', 'Kuantum Anahtar',
    'Mega Matkap', 'Roket Eldiveni', 'İyon Topu', 'Siber Çekiç', 'Mekanik Ejder', 'Yıldız Motoru', 'Süper Bilgisayar'],
};

// Silah ikonları (sınıfa göre)
KK.WEAPON_ICONS = { archer: '🏹', fire: '🔥', ice: '❄️', earth: '🪨', engineer: '🔧' };

// Silahların ekstra özellikleri sırayla döner (her silah farklı bir şey verir)
// f(tier) => değer
KK.WEAPON_SPECIALS = [
  { stat: 'crit',      f: t => 2 + t * 0.6 },
  { stat: 'atkSpd',    f: t => 4 + t * 1.2 },
  { stat: 'critDmg',   f: t => 10 + t * 4 },
  { stat: 'skillDmg',  f: t => 5 + t * 2 },
  { stat: 'lifesteal', f: t => 1 + t * 0.2 },
  { stat: 'boss',      f: t => 10 + t * 3 },
  { stat: 'splash',    f: t => 10 + t * 3 },
  { stat: 'cdr',       f: t => 2 + t * 0.4 },
  { stat: 'slow',      f: t => 5 + t * 1 },
  { stat: 'multishot', f: t => (t >= 12 ? 2 : 1) },
];

// 20 zırh: isim, ikon ve özel bonus
KK.ARMORS = [
  ['Deri Yelek', '🦺', { hpRegen: 1 }],
  ['Kapitone Zırh', '🧥', { dodge: 3 }],
  ['Zincir Zırh', '⛓️', { thorns: 5 }],
  ['Bronz Göğüslük', '🥉', { wallHp: 100 }],
  ['Demir Zırh', '🛡️', { armor: 3 }],
  ['Avcı Pelerini', '🧣', { atkSpd: 6 }],
  ['Büyücü Cüppesi', '🥻', { spellDur: 12 }],
  ['Şövalye Zırhı', '⚔️', { wallRegen: 3 }],
  ['Gümüş Zırh', '🥈', { cdr: 5 }],
  ['Ejder Pulu Zırh', '🐉', { thorns: 25, armor: 3 }],
  ['Buz Zırhı', '🧊', { slow: 10, dodge: 4 }],
  ['Lav Zırhı', '🌋', { dmgPct: 15 }],
  ['Orman Zırhı', '🌿', { hpRegen: 6, wallRegen: 3 }],
  ['Gölge Pelerini', '🌑', { dodge: 10, crit: 5 }],
  ['Altın Zırh', '🥇', { goldGain: 20 }],
  ['Kristal Zırh', '💎', { skillDmg: 25, spellDur: 15 }],
  ['Titan Zırhı', '🗿', { wallHp: 800, wallArmor: 10 }],
  ['Yıldız Zırhı', '⭐', { cdr: 10, xpGain: 20 }],
  ['Anka Zırhı', '🐦‍🔥', { hpRegen: 15, lifesteal: 3 }],
  ['Efsanevi Kale Zırhı', '👑', { wallHp: 1200, wallRegen: 10, wallArmor: 15 }],
];

// 20 yüzük: her biri farklı bir özellik verir
KK.RINGS = [
  ['Bakır Yüzük', '💍', { dmgPct: 8 }],
  ['Altın Yüzük', '🪙', { goldGain: 15 }],
  ['Bilge Yüzüğü', '📘', { xpGain: 20 }],
  ['Hız Yüzüğü', '💨', { atkSpd: 10 }],
  ['Kartal Yüzüğü', '🦅', { crit: 8 }],
  ['Can Yüzüğü', '❤️', { maxHp: 120, hpRegen: 3 }],
  ['Duvar Yüzüğü', '🧱', { wallHp: 400, wallRegen: 4 }],
  ['Diken Yüzüğü', '🌵', { thorns: 30 }],
  ['Rüzgar Yüzüğü', '🍃', { dodge: 12 }],
  ['Buz Yüzüğü', '❄️', { slow: 15 }],
  ['Zaman Yüzüğü', '⌛', { cdr: 12 }],
  ['Sonsuzluk Yüzüğü', '♾️', { spellDur: 30 }],
  ['Büyü Yüzüğü', '🔮', { skillDmg: 35 }],
  ['Vampir Yüzüğü', '🦇', { lifesteal: 6 }],
  ['Şans Yüzüğü', '🍀', { dropRate: 100, goldGain: 10 }],
  ['Patlama Yüzüğü', '💥', { splash: 40 }],
  ['Dev Avcısı Yüzüğü', '🐲', { boss: 60 }],
  ['Kritik Ustası', '🎯', { crit: 12, critDmg: 60 }],
  ['Çoklu Atış Yüzüğü', '🎆', { multishot: 2 }],
  ['Kral Yüzüğü', '👑', { dmgPct: 25, atkSpd: 10, crit: 6, cdr: 6, goldGain: 15 }],
];

/* Itemleri oluşturan yardımcı fonksiyonlar
   key formatı: "w:archer:5" (silah), "a:3" (zırh), "r:12" (yüzük) */
KK.makeItem = function (key) {
  const p = key.split(':');
  if (p[0] === 'w') {
    const cls = p[1], i = +p[2], tier = i + 1;
    const sp = KK.WEAPON_SPECIALS[i % KK.WEAPON_SPECIALS.length];
    const stats = { dmgPct: Math.round(10 + tier * 9) };
    stats[sp.stat] = Math.round(sp.f(tier) * 10) / 10;
    return { key, slot: 'weapon', cls, tier, name: KK.WEAPON_NAMES[cls][i], icon: KK.WEAPON_ICONS[cls], stats };
  }
  if (p[0] === 'a') {
    const i = +p[1], tier = i + 1, d = KK.ARMORS[i];
    // tüm zırhlar can + zırh verir, üstüne kendine özel bir bonus
    const stats = { maxHp: 30 + tier * 25, armor: Math.round((2 + tier * 0.9) * 10) / 10 };
    for (const k in d[2]) stats[k] = (stats[k] || 0) + d[2][k];
    return { key, slot: 'armor', tier, name: d[0], icon: d[1], stats };
  }
  if (p[0] === 'r') {
    const i = +p[1], tier = i + 1, d = KK.RINGS[i];
    return { key, slot: 'ring', tier, name: d[0], icon: d[1], stats: Object.assign({}, d[2]) };
  }
  return null;
};

// Item nadirlik rengi (tier'e göre)
KK.rarity = function (tier) {
  if (tier >= 18) return { n: 'Efsanevi', c: '#ff9f1a' };
  if (tier >= 13) return { n: 'Destansı', c: '#c55cff' };
  if (tier >= 8) return { n: 'Nadir', c: '#3fa7ff' };
  if (tier >= 4) return { n: 'Sağlam', c: '#5fd35f' };
  return { n: 'Sıradan', c: '#d8d8d8' };
};

/* ---------------------------------------------------------
   DENGE AYARLARI
   --------------------------------------------------------- */
KK.BALANCE = {
  dropChance: 0.01,          // normal düşmandan item düşme şansı (%1)
  bossDropChance: 0.35,      // boss'tan item düşme şansı
  checkpointEvery: 5,        // kaybedince en son kaçıncı dalgaya dönülür
  breakTime: 6,              // dalgalar arası bekleme (sn)
  heroReviveTime: 5,         // kahraman bayılırsa kaç sn sonra kalkar
  // dalga numarasına göre düşman gücü
  hpScale: w => (1 + 0.16 * (w - 1)) * Math.pow(1.045, w - 1),
  dmgScale: w => 1 + 0.09 * (w - 1),
  goldScale: w => 1 + 0.14 * (w - 1),
  xpScale: w => 1 + 0.1 * (w - 1),
  // seviye atlamak için gereken tecrübe
  xpNeed: lv => Math.round(25 * Math.pow(lv, 1.55)),
};
