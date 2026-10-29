/* =========================================================
   KALE KAHRAMANLARI - Oyun Motoru
   Dalgalar, düşmanlar, saldırılar, skiller, level, item düşmesi
   ve kayıt sistemi burada.
   ========================================================= */

(function () {
  // Oyun dünyasının sabit boyutları (ekrana göre ölçeklenir)
  const W = 1280, H = 720;
  const FY0 = 275, FY1 = 695;      // savaş alanının üst ve alt sınırı
  const WALL_X = 250;               // kale duvarının sağ kenarı
  const B = KK.BALANCE;

  // Yardımcı matematik fonksiyonları
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);

  /* ---------------------------------------------------------
     OYUN DURUMU (G) - her şey bu nesnede tutulur
     --------------------------------------------------------- */
  const G = {
    W, H, FY0, FY1, WALL_X,
    running: false, paused: false, over: false, speed: 1, time: 0,
    hero: null, wall: null, stats: null, save: null,
    enemies: [], projs: [], eprojs: [], zones: [], summons: [], fx: [], texts: [],
    wave: 1, waveState: 'break', spawnQueue: [], spawnTimer: 0, breakTimer: 0,
    cds: [0, 0, 0, 0], buffs: { eagle: 0 },
    focus: null, shake: 0, market: [], kills: 0,
  };
  KK.G = G;

  /* ---------------------------------------------------------
     KAYIT SİSTEMİ (localStorage)
     Her kahraman + sınıf için ayrı kayıt tutulur
     --------------------------------------------------------- */
  const saveKey = (hero, cls) => 'kk_save_v1_' + hero + '_' + cls;

  KK.newSave = function (hero, cls) {
    return {
      v: 1, hero, cls, level: 1, xp: 0, gold: 0, skillPts: 0,
      skillLv: [1, 0, 0, 0],                // ilk skill açık başlar
      up: {},                               // güçlendirme seviyeleri
      inv: [],                              // çantadaki itemler (key listesi)
      eq: { weapon: null, armor: null, ring: null },
      wave: 1, best: 0, kills: 0,
    };
  };

  KK.loadSave = function (hero, cls) {
    try {
      const raw = localStorage.getItem(saveKey(hero, cls));
      if (raw) return Object.assign(KK.newSave(hero, cls), JSON.parse(raw));
    } catch (e) { /* kayıt okunamazsa yeni başlat */ }
    return null;
  };

  KK.writeSave = function () {
    if (!G.save) return;
    try { localStorage.setItem(saveKey(G.save.hero, G.save.cls), JSON.stringify(G.save)); } catch (e) { }
  };

  KK.deleteSave = function (hero, cls) {
    try { localStorage.removeItem(saveKey(hero, cls)); } catch (e) { }
  };

  /* ---------------------------------------------------------
     İSTATİSTİK HESAPLAMA
     Sınıf + seviye + güçlendirme + itemler = son değerler
     --------------------------------------------------------- */
  KK.computeStats = function () {
    const sv = G.save, cls = KK.CLASSES[sv.cls], b = cls.base;
    const s = {
      dmgPct: 0, atkSpd: 0, crit: b.crit, critDmg: b.critDmg, maxHp: 100, hpRegen: 1,
      armor: 0, dodge: 0, lifesteal: 0, cdr: 0, spellDur: 0, skillDmg: 0, goldGain: 0,
      xpGain: 0, wallHp: 1000, wallRegen: 1, wallArmor: 0, thorns: 0, boss: 0,
      slow: b.slow || 0, splash: 0, multishot: 0, dropRate: 0,
    };
    // Seviye bonusu: her seviye can ve saldırı gücü verir
    s.maxHp += (sv.level - 1) * 12;
    s.dmgPct += (sv.level - 1) * 6;
    // Güçlendirmeler
    for (const u of KK.UPGRADES) s[u.stat] += (sv.up[u.id] || 0) * u.val;
    // Kuşanılan itemler
    for (const slot in sv.eq) {
      if (!sv.eq[slot]) continue;
      const it = KK.makeItem(sv.eq[slot]);
      if (it) for (const k in it.stats) s[k] = (s[k] || 0) + it.stats[k];
    }
    // Üst sınırlar (oyunun bozulmaması için)
    s.armor = Math.min(s.armor, 75);
    s.dodge = Math.min(s.dodge, 50);
    s.cdr = Math.min(s.cdr, 60);
    s.crit = Math.min(s.crit, 100);
    s.slow = Math.min(s.slow, 70);
    // Son değerler
    s.dmg = b.dmg * (1 + s.dmgPct / 100);
    s.aps = b.atkSpd * (1 + s.atkSpd / 100);
    s.range = b.range;
    s.splashR = (b.splash || 0) + s.splash * 0.9;
    G.stats = s;

    // Can ve duvar maksimumları değişirse oranı koru
    if (G.hero) {
      const r = G.hero.hp / (G.hero.max || 1);
      G.hero.max = s.maxHp; G.hero.hp = Math.min(s.maxHp, Math.max(1, r * s.maxHp));
    }
    if (G.wall) {
      const r = G.wall.hp / (G.wall.max || 1);
      G.wall.max = s.wallHp; G.wall.hp = Math.min(s.wallHp, Math.max(1, r * s.wallHp));
    }
    return s;
  };

  /* ---------------------------------------------------------
     OYUNU BAŞLAT
     --------------------------------------------------------- */
  KK.startGame = function (save) {
    G.save = save;
    G.cls = KK.CLASSES[save.cls];
    G.heroDef = KK.HEROES.find(h => h.id === save.hero);
    G.hero = null; G.wall = null;
    KK.computeStats();
    G.hero = { x: 150, y: 470, hp: G.stats.maxHp, max: G.stats.maxHp, down: 0, atkT: 0, anim: 0, hurt: 0 };
    G.wall = { hp: G.stats.wallHp, max: G.stats.wallHp, hurt: 0 };
    resetField();
    G.wave = save.wave;
    G.over = false; G.paused = false; G.running = true;
    G.cds = [0, 0, 0, 0];
    G.buffs = { eagle: 0 };
    G.kills = 0;
    startBreak(3);
    refreshMarket();
  };

  function resetField() {
    G.enemies = []; G.projs = []; G.eprojs = []; G.zones = []; G.summons = [];
    G.fx = []; G.texts = []; G.spawnQueue = []; G.focus = null;
  }

  /* ---------------------------------------------------------
     DALGA SİSTEMİ
     --------------------------------------------------------- */
  function startBreak(t) {
    G.waveState = 'break';
    G.breakTimer = t == null ? B.breakTime : t;
  }

  // Bir dalgada gelecek düşmanları hazırla
  function buildWave(w) {
    const q = [];
    const isBoss = w % 5 === 0;
    let count = 8 + Math.floor(w * 2.2);
    if (isBoss) count = Math.floor(count * 0.6);
    // Bu dalgada gelebilecek düşman türleri ve olasılık ağırlıkları
    const pool = [];
    for (const id in KK.ENEMIES) {
      const e = KK.ENEMIES[id];
      if (e.from > w) continue;
      let wt = id === 'goblin' ? 10 : 6;
      if (id === 'troll' || id === 'knight') wt = 3;
      if (id === 'shaman') wt = 2.5;
      pool.push([id, wt]);
    }
    const total = pool.reduce((a, p) => a + p[1], 0);
    for (let i = 0; i < count; i++) {
      let r = Math.random() * total, pick = pool[0][0];
      for (const p of pool) { r -= p[1]; if (r <= 0) { pick = p[0]; break; } }
      q.push({ type: pick });
    }
    if (isBoss) {
      const bi = (w / 5 - 1) % KK.BOSSES.length;
      q.splice(Math.floor(q.length / 2), 0, { boss: bi });
    }
    return q;
  }

  function startWave() {
    G.waveState = 'fight';
    G.spawnQueue = buildWave(G.wave);
    G.spawnTimer = 0.5;
    KK.ui && KK.ui.banner(G.wave % 5 === 0 ? `⚠️ BOSS DALGASI ${G.wave}` : `Dalga ${G.wave}`);
    KK.sfx && KK.sfx('wave');
  }
  KK.skipBreak = function () { if (G.waveState === 'break') G.breakTimer = 0; };

  // Dalga bitince ödül ver ve kaydet
  function waveCleared() {
    const bonus = Math.round(10 * B.goldScale(G.wave) * (1 + G.stats.goldGain / 100));
    G.save.gold += bonus;
    addText(W / 2, 200, `Dalga ${G.wave} temizlendi! +${bonus} 🪙`, '#ffe066', 30, 2.2);
    G.save.best = Math.max(G.save.best, G.wave);
    G.wave++;
    G.save.wave = G.wave;
    KK.writeSave();
    refreshMarket();
    startBreak();
    KK.sfx && KK.sfx('clear');
  }

  /* ---------------------------------------------------------
     DÜŞMAN OLUŞTURMA
     --------------------------------------------------------- */
  function spawnEnemy(spec) {
    const w = G.wave;
    let d, boss = false;
    if (spec.boss != null) { d = KK.BOSSES[spec.boss]; boss = true; }
    else d = KK.ENEMIES[spec.type];
    // Boss'lar her turda biraz daha güçlenir
    const cycle = boss ? Math.floor((w / 5 - 1) / KK.BOSSES.length) : 0;
    let hpMul = B.hpScale(w) * (boss ? 1 + cycle * 0.5 : 1);
    let goldMul = B.goldScale(w), r = d.r;
    // 10. dalgadan sonra bazen "Elit" (altın parlak, güçlü) düşman gelir
    const elite = !boss && w >= 10 && Math.random() < 0.08;
    if (elite) { hpMul *= 3; goldMul *= 3; r *= 1.25; }
    const e = {
      type: spec.type || 'boss', name: d.name, boss, elite,
      x: W + r + rand(0, 40), y: d.fly ? rand(FY0 + 10, FY0 + 200) : rand(FY0 + 30, FY1 - 10),
      r, color: d.color, max: d.hp * hpMul, hp: d.hp * hpMul,
      spd: d.spd * rand(0.9, 1.1), dmg: d.dmg * B.dmgScale(w) * (elite ? 1.6 : 1),
      gold: d.gold * goldMul, xp: d.xp * B.xpScale(w) * (elite ? 3 : 1),
      armor: d.armor || 0, fly: !!d.fly, ranged: d.ranged || 0, healer: !!d.healer,
      atkT: rand(0, 1), slowT: 0, slowAmt: 0, freezeT: 0, stunT: 0, hit: 0, wob: rand(0, 6.28),
      burnT: 0, burnDps: 0, healT: 3, state: 'walk', baseY: 0,
    };
    e.baseY = e.y;
    G.enemies.push(e);
  }

  /* ---------------------------------------------------------
     HASAR VERME
     opts: { skill, crit, noCrit, slow, slowT, freeze, stun, color }
     --------------------------------------------------------- */
  function hitEnemy(e, dmg, opts) {
    if (e.hp <= 0) return 0;
    opts = opts || {};
    const s = G.stats;
    if (opts.skill) dmg *= 1 + s.skillDmg / 100;
    if (e.boss) dmg *= 1 + s.boss / 100;
    // Kritik vuruş
    let crit = false;
    if (!opts.noCrit) {
      let cc = s.crit + (G.buffs.eagle > 0 ? 30 : 0);
      if (Math.random() * 100 < cc) { crit = true; dmg *= 1 + s.critDmg / 100; }
    }
    dmg *= 1 - e.armor;
    e.hp -= dmg;
    if (!opts.noCrit || e.hit <= 0) e.hit = opts.noCrit ? 0.04 : 0.1; // sürekli hasarda düşman bembeyaz kalmasın
    // Yavaşlatma / dondurma / sersemletme
    if (opts.slow) { e.slowAmt = Math.max(e.slowAmt, opts.slow / 100); e.slowT = Math.max(e.slowT, opts.slowT || 1.5); }
    if (opts.freeze) e.freezeT = Math.max(e.freezeT, e.boss ? opts.freeze * 0.35 : opts.freeze);
    if (opts.stun) e.stunT = Math.max(e.stunT, e.boss ? opts.stun * 0.35 : opts.stun);
    if (opts.burn) { e.burnT = 3; e.burnDps = Math.max(e.burnDps, opts.burn); }
    // Can çalma (sadece normal saldırıda)
    if (opts.atk && s.lifesteal > 0 && G.hero.down <= 0) {
      G.hero.hp = Math.min(G.hero.max, G.hero.hp + dmg * s.lifesteal / 100);
    }
    // Hasar yazısı (çok fazla yazı olmasın diye sınırlı)
    if (G.texts.length < (opts.noCrit ? 20 : 60) || crit) {
      addText(e.x + rand(-10, 10), e.y - e.r - 10, Math.round(dmg) + (crit ? '!' : ''),
        crit ? '#ffd23f' : (opts.color || '#ffffff'), crit ? 24 : 17, 0.7);
    }
    if (e.hp <= 0) killEnemy(e);
    return dmg;
  }

  // Bir noktanın etrafındaki tüm düşmanlara hasar
  function aoe(x, y, r, dmg, opts) {
    let n = 0;
    for (const e of G.enemies) {
      if (e.hp > 0 && dist2(x, y, e.x, e.y) <= (r + e.r) * (r + e.r)) { hitEnemy(e, dmg, opts); n++; }
    }
    return n;
  }

  // Düşman ölünce: altın, tecrübe, item düşme şansı
  function killEnemy(e) {
    const s = G.stats, sv = G.save;
    const gold = Math.max(1, Math.round(e.gold * (1 + s.goldGain / 100)));
    sv.gold += gold;
    sv.kills++; G.kills++;
    addText(e.x, e.y - e.r - 30, '+' + gold + ' 🪙', '#ffd84a', 16, 0.9);
    gainXp(e.xp * (1 + s.xpGain / 100));
    burst(e.x, e.y, e.color, e.boss ? 60 : 12, e.boss ? 260 : 140);
    // Item düşme şansı: normalde %1, şans yüzüğü artırır
    const chance = (e.boss ? B.bossDropChance : e.elite ? B.dropChance * 5 : B.dropChance) * (1 + s.dropRate / 100);
    if (Math.random() < chance) dropItem(e.x, e.y);
    KK.sfx && KK.sfx(e.boss ? 'boom' : 'kill');
    if (e.boss) { G.shake = 0.6; addText(W / 2, 250, `${e.name} yenildi! 🎉`, '#ffe066', 34, 2.5); }
  }

  /* ---------------------------------------------------------
     ITEM DÜŞME ve MARKET
     --------------------------------------------------------- */
  // Dalgaya uygun bir tier seç (ilerledikçe daha iyi itemler)
  function rollTier(bonus) {
    return clamp(Math.round(1 + G.wave / 3 + rand(-2, 2) + (bonus || 0)), 1, 20);
  }

  // Rastgele item anahtarı oluştur (silah sadece seçili sınıfa göre düşer)
  function randomItemKey(slot, tier) {
    slot = slot || ['weapon', 'armor', 'ring'][randi(0, 2)];
    tier = tier || rollTier();
    if (slot === 'weapon') return `w:${G.save.cls}:${tier - 1}`;
    if (slot === 'armor') return `a:${tier - 1}`;
    return `r:${tier - 1}`;
  }

  function dropItem(x, y) {
    const key = randomItemKey(null, rollTier(1));
    const it = KK.makeItem(key);
    if (G.save.inv.length >= 40) { // çanta doluysa otomatik sat
      const p = KK.sellPrice(it);
      G.save.gold += p;
      KK.ui && KK.ui.toast(`Çanta dolu! ${it.name} satıldı (+${p} 🪙)`);
      return;
    }
    G.save.inv.push(key);
    burst(x, y, KK.rarity(it.tier).c, 30, 200);
    G.fx.push({ k: 'ring', x, y, r: 10, maxR: 90, life: 0.6, max: 0.6, color: KK.rarity(it.tier).c });
    KK.ui && KK.ui.toast(`✨ Item düştü: ${it.icon} ${it.name}!`, KK.rarity(it.tier).c);
    KK.sfx && KK.sfx('item');
    KK.writeSave();
  }

  // Ortalama bir düşmandan kazanılan altın (fiyatlar buna göre ayarlanır)
  KK.killGold = w => 2.6 * B.goldScale(w);
  // Item fiyatı: yaklaşık 100-150 düşman öldürmeye denk
  KK.itemPrice = function (it, w) {
    w = w || G.wave;
    const tierW = Math.max(w, it.tier * 3 - 2); // yüksek tier item pahalı olur
    return Math.round(KK.killGold(tierW) * (100 + it.tier * 2.6));
  };
  KK.sellPrice = it => Math.round(KK.itemPrice(it, 1) * 0.15 + it.tier * 8);

  function refreshMarket() {
    if (!G.save) return;
    G.market = [
      randomItemKey('weapon', rollTier(1)),
      randomItemKey('armor', rollTier(1)),
      randomItemKey('ring', rollTier(1)),
      randomItemKey(null, rollTier(2)),
    ].map(k => ({ key: k, sold: false }));
  }
  KK.refreshMarket = refreshMarket;

  /* ---------------------------------------------------------
     SEVİYE (LEVEL) SİSTEMİ
     --------------------------------------------------------- */
  function gainXp(x) {
    const sv = G.save;
    sv.xp += x;
    while (sv.xp >= B.xpNeed(sv.level)) {
      sv.xp -= B.xpNeed(sv.level);
      sv.level++;
      sv.skillPts++;
      KK.computeStats();
      G.hero.hp = G.hero.max; // seviye atlayınca can dolar
      burst(G.hero.x, G.hero.y - 60, '#ffe066', 40, 220);
      G.fx.push({ k: 'ring', x: G.hero.x, y: G.hero.y - 40, r: 10, maxR: 140, life: 0.8, max: 0.8, color: '#ffe066' });
      addText(G.hero.x + 60, G.hero.y - 140, `SEVİYE ${sv.level}! ⭐`, '#ffe066', 28, 2);
      KK.ui && KK.ui.toast(`⭐ Seviye ${sv.level}! +1 skill puanı`, '#ffe066');
      KK.sfx && KK.sfx('level');
    }
  }

  /* ---------------------------------------------------------
     NORMAL SALDIRI (otomatik)
     --------------------------------------------------------- */
  // Duvara en yakın düşmanı hedef al
  function pickTarget(exclude) {
    let best = null, bx = 1e9;
    for (const e of G.enemies) {
      if (e.hp <= 0 || e.x > W + 10 || (exclude && exclude.has(e))) continue;
      if (e.x < bx) { bx = e.x; best = e; }
    }
    return best;
  }

  function heroShoot() {
    const h = G.hero, s = G.stats, cls = G.cls;
    const used = new Set();
    const n = 1 + Math.floor(s.multishot);
    let shot = 0;
    for (let i = 0; i < n; i++) {
      const t = pickTarget(used) || (shot ? null : pickTarget());
      if (!t) break;
      used.add(t);
      G.projs.push({
        k: 'homing', vis: cls.proj.type, color: cls.proj.color,
        x: h.x + 34, y: h.y - 70, tx: t.x, ty: t.y, target: t,
        spd: cls.proj.speed, dmg: s.dmg * (i === 0 ? 1 : 0.6), life: 3, r: 8,
        splash: s.splashR, slow: s.slow,
      });
      shot++;
    }
    if (shot) { h.anim = 0.2; KK.sfx && KK.sfx('shoot'); }
  }

  /* ---------------------------------------------------------
     SKİLLER
     --------------------------------------------------------- */
  // Skill hedef noktası: oyuncu ekrana dokunduysa orası, yoksa en kalabalık düşman grubu
  function skillPoint() {
    if (G.focus && G.focus.t > 0) return { x: G.focus.x, y: G.focus.y };
    let best = null, bs = -1;
    for (const e of G.enemies) {
      if (e.hp <= 0 || e.x > W - 20) continue;
      let sc = 0;
      for (const o of G.enemies) if (o.hp > 0 && dist2(e.x, e.y, o.x, o.y) < 140 * 140) sc++;
      sc += (W - e.x) / 400; // duvara yakın olanlar daha önemli
      if (sc > bs) { bs = sc; best = e; }
    }
    if (best) return { x: best.x, y: best.y };
    return { x: 700, y: (FY0 + FY1) / 2 };
  }

  // Skill bekleme süresi (CDR dahil)
  KK.skillCd = function (i) {
    const sk = G.cls.skills[i];
    return sk.cd * (1 - G.stats.cdr / 100);
  };

  KK.canCast = function (i) {
    return G.running && !G.over && G.save.skillLv[i] > 0 && G.cds[i] <= 0 && G.hero.down <= 0;
  };

  KK.castSkill = function (i) {
    if (!KK.canCast(i)) return false;
    const sk = G.cls.skills[i], lv = G.save.skillLv[i], s = G.stats, h = G.hero;
    const m = 1 + 0.3 * (lv - 1);                                     // skill seviyesi hasar çarpanı
    const dur = (sk.dur || 1) * (1 + s.spellDur / 100) * (1 + 0.1 * (lv - 1)); // süre
    const D = s.dmg;                                                  // temel hasar
    const P = skillPoint();
    const ox = h.x + 34, oy = h.y - 70;                               // fırlatma noktası
    const ang = Math.atan2(P.y - oy, P.x - ox);

    switch (sk.id) {
      /* ---------- OKÇU ---------- */
      case 'multi': {
        const n = 6 + lv;
        for (let k = 0; k < n; k++) {
          const a = ang + (k - (n - 1) / 2) * 0.09;
          G.projs.push({ k: 'line', vis: 'arrow', color: '#fff3b0', x: ox, y: oy, vx: Math.cos(a) * 1000, vy: Math.sin(a) * 1000,
            dmg: D * 2 * m, pierce: 2, r: 10, life: 1.6, hitSet: new Set(), opts: { skill: true } });
        }
        break;
      }
      case 'rain':
        G.zones.push({ k: 'rain', x: P.x, y: P.y, r: 140, t: dur, tick: 0.25, tickT: 0, dmg: D * 0.55 * m, opts: { skill: true, noCrit: true } });
        break;
      case 'pierce':
        G.projs.push({ k: 'line', vis: 'bigarrow', color: '#9ff', x: ox, y: oy, vx: Math.cos(ang) * 1400, vy: Math.sin(ang) * 1400,
          dmg: D * 6 * m, pierce: 999, r: 24, life: 1.2, hitSet: new Set(), opts: { skill: true } });
        break;
      case 'eagle':
        G.buffs.eagle = 6 * (1 + s.spellDur / 100) * (1 + 0.1 * (lv - 1));
        G.buffs.eagleSpd = 0.8 + 0.1 * (lv - 1);
        G.fx.push({ k: 'ring', x: h.x, y: h.y - 50, r: 20, maxR: 120, life: 0.6, max: 0.6, color: '#7fe07f' });
        break;

      /* ---------- ALEV BÜYÜCÜSÜ ---------- */
      case 'fireball':
        G.projs.push({ k: 'point', vis: 'bigfire', color: '#ff7a1a', x: ox, y: oy, tx: P.x, ty: P.y, spd: 750, r: 26, life: 3,
          onHit: (x, y) => { aoe(x, y, 140 + lv * 10, D * 5 * m, { skill: true, burn: D * 0.5 }); explode(x, y, 150, '#ff7a1a'); } });
        break;
      case 'firewall':
        G.zones.push({ k: 'firewall', x: clamp(P.x, WALL_X + 80, W - 100), y: (FY0 + FY1) / 2, w: 70, h: FY1 - FY0 + 40,
          t: dur, tick: 0.3, tickT: 0, dmg: D * 0.8 * m, opts: { skill: true, noCrit: true, burn: D * 0.3 } });
        break;
      case 'meteor':
        G.zones.push({ k: 'meteor', x: P.x, y: P.y, r: 220, t: dur, tick: 0.28 - lv * 0.02, tickT: 0, dmg: D * 3 * m });
        break;
      case 'phoenix':
        G.summons.push({ k: 'phoenix', x: WALL_X, y: FY0 + 60, t: dur, max: dur, ph: 0, tickT: 0, dmg: D * 0.7 * m, dir: 1 });
        break;

      /* ---------- BUZ BÜYÜCÜSÜ ---------- */
      case 'lance':
        G.projs.push({ k: 'line', vis: 'lance', color: '#bdf4ff', x: ox, y: oy, vx: Math.cos(ang) * 1200, vy: Math.sin(ang) * 1200,
          dmg: D * 3.5 * m, pierce: 999, r: 18, life: 1.3, hitSet: new Set(), opts: { skill: true, freeze: 1.2 + lv * 0.2 } });
        break;
      case 'blizzard':
        G.zones.push({ k: 'blizzard', x: P.x, y: P.y, r: 170, t: dur, tick: 0.3, tickT: 0, dmg: D * 0.45 * m,
          opts: { skill: true, noCrit: true, slow: 60, slowT: 0.5 } });
        break;
      case 'nova':
        for (const e of G.enemies) if (e.hp > 0 && e.x < W) hitEnemy(e, D * 2 * m, { skill: true, freeze: dur });
        G.fx.push({ k: 'ring', x: h.x, y: h.y, r: 20, maxR: 1400, life: 0.8, max: 0.8, color: '#bff0ff', thick: 30 });
        G.fx.push({ k: 'flash', life: 0.3, max: 0.3, color: '#bff0ff' });
        break;
      case 'icewall': {
        const hp = (400 + G.wave * 50) * m;
        G.zones = G.zones.filter(z => z.k !== 'icewall');
        G.zones.push({ k: 'icewall', x: clamp(P.x - 60, WALL_X + 120, 900), y: (FY0 + FY1) / 2, t: dur * 1.0, hp, max: hp, w: 40 });
        break;
      }

      /* ---------- TOPRAK BÜYÜCÜSÜ ---------- */
      case 'spikes':
        G.zones.push({ k: 'spikes', x: P.x, y: P.y, r: 125, t: dur, tick: 0.4, tickT: 0, dmg: D * 1.0 * m,
          opts: { skill: true, noCrit: true, slow: 35, slowT: 0.6 } });
        break;
      case 'quake':
        for (const e of G.enemies) if (e.hp > 0 && !e.fly && e.x < W) hitEnemy(e, D * 2.5 * m, { skill: true, stun: 1.5 + lv * 0.15 });
        for (const e of G.enemies) if (e.hp > 0 && e.fly && e.x < W) hitEnemy(e, D * 1.2 * m, { skill: true });
        G.shake = 0.7;
        for (let k = 0; k < 40; k++) burst(rand(WALL_X, W), rand(FY0, FY1), '#8b6b45', 2, 120);
        break;
      case 'golem': {
        const hp = (600 + G.wave * 70) * m;
        G.summons = G.summons.filter(z => z.k !== 'golem');
        G.summons.push({ k: 'golem', x: WALL_X + 120, y: clamp(P.y, FY0 + 50, FY1 - 30), t: dur, max: dur, hp, maxHp: hp, tickT: 0, dmg: D * 2 * m, anim: 0 });
        break;
      }
      case 'boulder':
        G.projs.push({ k: 'line', vis: 'boulder', color: '#7a5a3a', x: WALL_X + 20, y: clamp(P.y, FY0 + 40, FY1 - 20), vx: 520, vy: 0,
          dmg: D * 7 * m, pierce: 999, r: 50, life: 2.8, hitSet: new Set(), rot: 0, opts: { skill: true, stun: 1 }, knock: 70 });
        G.shake = 0.3;
        break;

      /* ---------- MÜHENDİS ---------- */
      case 'turret':
        G.summons.push({ k: 'turret', x: WALL_X + 50, y: clamp(P.y + rand(-40, 40), FY0 + 40, FY1 - 20), t: dur, max: dur, tickT: 0,
          rate: 3 + lv * 0.4, dmg: D * 0.75 * m, ang: 0 });
        break;
      case 'drone':
        G.summons.push({ k: 'drone', x: h.x, y: h.y - 100, t: dur, max: dur, tickT: 0, rate: 4, dmg: D * 0.55 * m, ph: rand(0, 6) });
        break;
      case 'mines': {
        const n = 6 + lv;
        for (let k = 0; k < n; k++) {
          G.zones.push({ k: 'mine', x: clamp(P.x + rand(-170, 170), WALL_X + 60, W - 40), y: clamp(P.y + rand(-140, 140), FY0 + 20, FY1 - 10),
            r: 32, t: dur * 1.2, dmg: D * 3 * m, arm: 0.4 });
        }
        break;
      }
      case 'rockets': {
        const n = 8 + lv * 2;
        for (let k = 0; k < n; k++) {
          const a = -Math.PI / 2 + rand(-0.8, 0.8);
          G.projs.push({ k: 'rocket', vis: 'rocket', x: ox, y: oy, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400,
            target: null, spd: 650, r: 10, life: 4, delay: k * 0.06, dmg: D * 2.5 * m });
        }
        break;
      }
    }
    G.cds[i] = KK.skillCd(i);
    h.anim = 0.35;
    KK.sfx && KK.sfx('skill');
    return true;
  };

  /* ---------------------------------------------------------
     EFEKTLER (parçacık, yazı, patlama)
     --------------------------------------------------------- */
  function addText(x, y, txt, color, size, life) {
    G.texts.push({ x, y, txt, color, size, life, max: life });
  }
  function burst(x, y, color, n, sp) {
    for (let i = 0; i < n && G.fx.length < 450; i++) {
      const a = rand(0, 6.28), v = rand(sp * 0.3, sp);
      G.fx.push({ k: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: rand(0.3, 0.8), max: 0.8, color, size: rand(2, 5) });
    }
  }
  function explode(x, y, r, color) {
    G.fx.push({ k: 'ring', x, y, r: 10, maxR: r, life: 0.4, max: 0.4, color, thick: 14 });
    burst(x, y, color, 25, 260);
    KK.sfx && KK.sfx('boom');
  }
  KK.fx = { addText, burst, explode };

  /* ---------------------------------------------------------
     ANA GÜNCELLEME DÖNGÜSÜ
     --------------------------------------------------------- */
  KK.update = function (dtReal) {
    if (!G.running || G.paused || G.over) return;
    const steps = G.speed;               // hızlandırma: aynı kareyi birkaç kez işle
    for (let i = 0; i < steps && !G.over && G.running; i++) step(Math.min(dtReal, 0.05));
  };

  function step(dt) {
    G.time += dt;
    const s = G.stats, h = G.hero, wall = G.wall;

    // ---- Dalga zamanlaması ----
    if (G.waveState === 'break') {
      G.breakTimer -= dt;
      if (G.breakTimer <= 0) startWave();
    } else {
      if (G.spawnQueue.length) {
        G.spawnTimer -= dt;
        if (G.spawnTimer <= 0) {
          spawnEnemy(G.spawnQueue.shift());
          // bazen düşmanlar grup halinde gelir
          G.spawnTimer = Math.random() < 0.25 ? 0.12 : Math.max(0.28, 1.15 - G.wave * 0.025) * rand(0.6, 1.3);
        }
      } else if (!G.enemies.length) waveCleared();
    }

    // ---- Kahraman ----
    h.anim = Math.max(0, h.anim - dt);
    h.hurt = Math.max(0, h.hurt - dt);
    if (h.down > 0) {
      h.down -= dt;
      if (h.down <= 0) { h.hp = h.max * 0.5; addText(h.x + 40, h.y - 130, 'Geri döndüm! 💪', '#7fff7f', 22, 1.5); }
    } else {
      h.hp = Math.min(h.max, h.hp + s.hpRegen * dt);
      const aps = s.aps * (G.buffs.eagle > 0 ? 1 + G.buffs.eagleSpd : 1);
      h.atkT -= dt;
      if (h.atkT <= 0 && G.enemies.some(e => e.hp > 0 && e.x < W - 5)) {
        heroShoot();
        h.atkT = 1 / aps;
      }
    }
    if (G.buffs.eagle > 0) G.buffs.eagle -= dt;
    for (let i = 0; i < 4; i++) if (G.cds[i] > 0) G.cds[i] -= dt;
    if (G.focus) { G.focus.t -= dt; if (G.focus.t <= 0) G.focus = null; }

    // ---- Duvar ----
    wall.hp = Math.min(wall.max, wall.hp + s.wallRegen * dt);
    wall.hurt = Math.max(0, wall.hurt - dt);

    updateEnemies(dt);
    updateProjs(dt);
    updateEProjs(dt);
    updateZones(dt);
    updateSummons(dt);
    updateFx(dt);

    // Ölü düşmanları temizle
    G.enemies = G.enemies.filter(e => e.hp > 0);

    // ---- Kaybetme kontrolü ----
    if (wall.hp <= 0) {
      wall.hp = 0;
      gameOver();
    }
    G.shake = Math.max(0, G.shake - dt);
  }

  /* ---------------- DÜŞMANLAR ---------------- */
  function updateEnemies(dt) {
    const s = G.stats;
    const iw = G.zones.find(z => z.k === 'icewall');
    const golem = G.summons.find(z => z.k === 'golem');
    for (const e of G.enemies) {
      if (e.hp <= 0) continue;
      e.hit = Math.max(0, e.hit - dt);
      e.wob += dt * 8;
      // yanma hasarı
      if (e.burnT > 0) {
        e.burnT -= dt; e.hp -= e.burnDps * dt;
        if (e.hp <= 0) { killEnemy(e); continue; }
      }
      // şamanlar etraftaki düşmanları iyileştirir
      if (e.healer) {
        e.healT -= dt;
        if (e.healT <= 0) {
          e.healT = 3;
          for (const o of G.enemies) if (o !== e && o.hp > 0 && dist2(e.x, e.y, o.x, o.y) < 160 * 160) {
            o.hp = Math.min(o.max, o.hp + o.max * 0.15);
          }
          G.fx.push({ k: 'ring', x: e.x, y: e.y, r: 10, maxR: 160, life: 0.5, max: 0.5, color: '#7fff7f' });
        }
      }
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowAmt = 0; }
      if (e.freezeT > 0) { e.freezeT -= dt; continue; }
      if (e.stunT > 0) { e.stunT -= dt; continue; }

      const spd = e.spd * (1 - e.slowAmt);
      // Durma noktası: menzilli ise uzakta, değilse duvarın dibinde
      let stopX = WALL_X + e.r + 4;
      if (e.ranged) stopX = WALL_X + e.ranged;
      let blocker = null;
      // Buz duvarı ve golem yürüyen düşmanları durdurur
      if (!e.fly && !e.ranged) {
        if (iw && e.x > iw.x && e.x - e.r < iw.x + iw.w / 2 + 4) { stopX = e.x; blocker = iw; }
        if (golem && e.x > golem.x && Math.abs(e.y - golem.y) < 75 && e.x - e.r < golem.x + 40) { stopX = e.x; blocker = golem; }
      }
      if (e.x > stopX) {
        e.x -= spd * dt;
        e.state = 'walk';
        if (e.fly) e.y = e.baseY + Math.sin(e.wob * 0.4) * 25;
      } else {
        e.state = 'attack';
        e.atkT -= dt;
        if (e.atkT <= 0) {
          e.atkT = e.ranged ? 2 : 1;
          if (e.ranged) {
            // menzilli düşman kahramana (o yoksa duvara) ok atar
            const tx = G.hero.down > 0 ? WALL_X - 20 : G.hero.x, ty = G.hero.down > 0 ? e.y : G.hero.y - 50;
            const a = Math.atan2(ty - e.y, tx - e.x);
            G.eprojs.push({ x: e.x - e.r, y: e.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, dmg: e.dmg, life: 3,
              toHero: G.hero.down <= 0, color: e.boss ? '#b04aff' : '#d8d0b8', big: e.boss });
          } else if (blocker) {
            blocker.hp -= e.dmg;
            if (blocker.hp <= 0) blocker.t = 0;
          } else {
            // duvara vur
            G.wall.hp -= e.dmg * (1 - G.stats.wallArmor / 100);
            G.wall.hurt = 0.15;
            if (e.boss) G.shake = 0.25;
            if (s.thorns > 0) hitEnemy(e, s.thorns * B.dmgScale(G.wave), { noCrit: true, color: '#c8ff8a' });
          }
        }
      }
    }
  }

  /* ---------------- KAHRAMAN MERMİLERİ ---------------- */
  function updateProjs(dt) {
    for (const p of G.projs) {
      p.life -= dt;
      if (p.delay > 0) { p.delay -= dt; continue; }
      if (p.k === 'homing') {
        // hedefi takip eden normal saldırı
        if (p.target && p.target.hp > 0) { p.tx = p.target.x; p.ty = p.target.y; }
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
        const mv = p.spd * dt;
        p.ang = Math.atan2(dy, dx);
        if (d <= mv + (p.target ? p.target.r * 0.5 : 4)) {
          p.life = 0;
          const t = p.target;
          if (t && t.hp > 0) {
            hitEnemy(t, p.dmg, { atk: true, slow: p.slow, slowT: 1.5, stun: G.save.cls === 'earth' && Math.random() < 0.15 ? 0.6 : 0,
              burn: G.save.cls === 'fire' ? p.dmg * 0.15 : 0 });
          }
          if (p.splash > 0) {
            for (const e of G.enemies) if (e !== t && e.hp > 0 && dist2(p.tx, p.ty, e.x, e.y) < (p.splash + e.r) ** 2) {
              hitEnemy(e, p.dmg * 0.5, { noCrit: true, slow: p.slow });
            }
            G.fx.push({ k: 'ring', x: p.tx, y: p.ty, r: 5, maxR: p.splash, life: 0.25, max: 0.25, color: p.color });
          }
          burst(p.tx, p.ty, p.color, 4, 90);
        } else { p.x += dx / d * mv; p.y += dy / d * mv; }
      } else if (p.k === 'line') {
        // düz giden, içinden geçen mermiler (skill okları, mızrak, kaya)
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.rot != null) p.rot += dt * 8;
        p.ang = Math.atan2(p.vy, p.vx);
        for (const e of G.enemies) {
          if (e.hp <= 0 || p.hitSet.has(e)) continue;
          if (dist2(p.x, p.y, e.x, e.y) < (p.r + e.r) ** 2) {
            p.hitSet.add(e);
            hitEnemy(e, p.dmg, p.opts);
            if (p.knock && !e.boss) e.x += p.knock;
            burst(e.x, e.y, p.color, 5, 120);
            if (--p.pierce <= 0) { p.life = 0; break; }
          }
        }
        if (p.x > W + 80 || p.y < 0 || p.y > H + 40) p.life = 0;
      } else if (p.k === 'point') {
        // belirli bir noktaya gidip patlayan mermi
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), mv = p.spd * dt;
        p.ang = Math.atan2(dy, dx);
        if (d <= mv) { p.life = 0; p.onHit(p.tx, p.ty); }
        else { p.x += dx / d * mv; p.y += dy / d * mv; }
      } else if (p.k === 'rocket') {
        // önce yukarı çıkar sonra hedefe döner
        if (!p.target || p.target.hp <= 0) {
          const alive = G.enemies.filter(e => e.hp > 0 && e.x < W);
          p.target = alive.length ? alive[randi(0, alive.length - 1)] : null;
        }
        if (p.target) {
          const a = Math.atan2(p.target.y - p.y, p.target.x - p.x);
          p.vx += Math.cos(a) * 1800 * dt; p.vy += Math.sin(a) * 1800 * dt;
          const v = Math.hypot(p.vx, p.vy);
          if (v > p.spd) { p.vx *= p.spd / v; p.vy *= p.spd / v; }
          if (dist2(p.x, p.y, p.target.x, p.target.y) < (p.target.r + 10) ** 2) {
            p.life = 0; aoe(p.x, p.y, 65, p.dmg, { skill: true }); explode(p.x, p.y, 70, '#ffb347');
          }
        }
        p.x += p.vx * dt; p.y += p.vy * dt; p.ang = Math.atan2(p.vy, p.vx);
        if (Math.random() < 0.6) G.fx.push({ k: 'p', x: p.x, y: p.y, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.3, max: 0.3, color: '#cccccc', size: 3 });
      }
    }
    G.projs = G.projs.filter(p => p.life > 0);
  }

  /* ---------------- DÜŞMAN MERMİLERİ ---------------- */
  function updateEProjs(dt) {
    const h = G.hero, s = G.stats;
    for (const p of G.eprojs) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.toHero && h.down <= 0 && dist2(p.x, p.y, h.x, h.y - 50) < 40 * 40) {
        p.life = 0;
        if (Math.random() * 100 < s.dodge) { addText(h.x + 30, h.y - 120, 'Kaçtı!', '#aaf', 18, 0.8); continue; }
        const d = p.dmg * (1 - s.armor / 100);
        h.hp -= d; h.hurt = 0.2;
        addText(h.x + 20, h.y - 110, '-' + Math.round(d), '#ff6b6b', 18, 0.8);
        if (h.hp <= 0) {
          h.hp = 0; h.down = B.heroReviveTime;
          addText(h.x + 40, h.y - 140, 'Bayıldım! 😵', '#ff8080', 24, 2);
          KK.sfx && KK.sfx('hurt');
        }
      } else if (p.x <= WALL_X - 10) {
        p.life = 0;
        G.wall.hp -= p.dmg * (1 - s.wallArmor / 100); G.wall.hurt = 0.15;
      }
    }
    G.eprojs = G.eprojs.filter(p => p.life > 0);
  }

  /* ---------------- BÖLGE ETKİLERİ ---------------- */
  function updateZones(dt) {
    for (const z of G.zones) {
      z.t -= dt;
      if (z.k === 'mine') {
        if (z.arm > 0) { z.arm -= dt; continue; }
        for (const e of G.enemies) {
          if (e.hp > 0 && !e.fly && dist2(z.x, z.y, e.x, e.y) < (z.r + e.r) ** 2) {
            aoe(z.x, z.y, 85, z.dmg, { skill: true }); explode(z.x, z.y, 90, '#ffb347'); z.t = 0; break;
          }
        }
        continue;
      }
      if (z.k === 'icewall') { if (z.hp <= 0) z.t = 0; continue; }
      if (z.tick == null) continue;
      z.tickT -= dt;
      if (z.tickT > 0) continue;
      z.tickT = z.tick;
      if (z.k === 'firewall') {
        for (const e of G.enemies) if (e.hp > 0 && Math.abs(e.x - z.x) < z.w / 2 + e.r) hitEnemy(e, z.dmg, z.opts);
      } else if (z.k === 'meteor') {
        // bölgedeki rastgele bir düşmana (yoksa rastgele noktaya) meteor
        const inside = G.enemies.filter(e => e.hp > 0 && dist2(e.x, e.y, z.x, z.y) < z.r * z.r * 2.2);
        const t = inside.length ? inside[randi(0, inside.length - 1)] : null;
        const tx = t ? t.x + rand(-20, 20) : z.x + rand(-z.r, z.r), ty = t ? t.y : z.y + rand(-z.r * 0.6, z.r * 0.6);
        G.projs.push({ k: 'point', vis: 'meteor', color: '#ff5a1a', x: tx - 250, y: -40, tx, ty, spd: 1100, r: 20, life: 3,
          onHit: (x, y) => { aoe(x, y, 90, z.dmg, { skill: true, burn: z.dmg * 0.1 }); explode(x, y, 95, '#ff5a1a'); G.shake = 0.12; } });
      } else {
        // daire şeklindeki bölgeler: ok yağmuru, kar fırtınası, kaya dikenleri
        aoe(z.x, z.y, z.r, z.dmg, z.opts);
      }
    }
    G.zones = G.zones.filter(z => z.t > 0);
  }

  /* ---------------- ÇAĞRILAN YARDIMCILAR ---------------- */
  function updateSummons(dt) {
    for (const m of G.summons) {
      m.t -= dt;
      if (m.k === 'turret') {
        m.tickT -= dt;
        const t = pickTarget();
        if (t) m.ang = Math.atan2(t.y - m.y, t.x - m.x);
        if (t && m.tickT <= 0) {
          m.tickT = 1 / m.rate;
          G.projs.push({ k: 'homing', vis: 'bullet', color: '#ffe17a', x: m.x + Math.cos(m.ang) * 26, y: m.y - 20 + Math.sin(m.ang) * 26,
            tx: t.x, ty: t.y, target: t, spd: 1100, dmg: m.dmg, life: 2, r: 5, splash: 0, slow: 0 });
        }
      } else if (m.k === 'drone') {
        // drone kalabalığın üstünde dolaşır
        m.ph += dt * 2;
        const P = skillPoint();
        const tx = P.x - 80 + Math.cos(m.ph) * 60, ty = Math.max(FY0 - 40, P.y - 120) + Math.sin(m.ph * 1.3) * 30;
        m.x += (tx - m.x) * Math.min(1, dt * 2); m.y += (ty - m.y) * Math.min(1, dt * 2);
        m.tickT -= dt;
        if (m.tickT <= 0) {
          let best = null, bd = 1e12;
          for (const e of G.enemies) { if (e.hp <= 0) continue; const d = dist2(m.x, m.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
          if (best && bd < 500 * 500) {
            m.tickT = 1 / m.rate;
            G.projs.push({ k: 'homing', vis: 'laser', color: '#7af7ff', x: m.x, y: m.y, tx: best.x, ty: best.y, target: best,
              spd: 1300, dmg: m.dmg, life: 2, r: 5, splash: 0, slow: 0 });
          }
        }
      } else if (m.k === 'golem') {
        m.anim = Math.max(0, m.anim - dt);
        m.tickT -= dt;
        if (m.tickT <= 0) {
          m.tickT = 1;
          const n = aoe(m.x + 50, m.y, 90, m.dmg, { skill: true, stun: 0.3 });
          if (n) { m.anim = 0.3; G.fx.push({ k: 'ring', x: m.x + 50, y: m.y, r: 10, maxR: 90, life: 0.3, max: 0.3, color: '#a67c3d' }); }
        }
        if (m.hp <= 0) m.t = 0;
      } else if (m.k === 'phoenix') {
        // Anka kuşu savaş alanında zikzak uçar
        m.x += m.dir * 420 * dt;
        if (m.x > W - 60) m.dir = -1;
        if (m.x < WALL_X + 40) m.dir = 1;
        m.ph += dt * 3;
        m.y = (FY0 + FY1) / 2 + Math.sin(m.ph) * (FY1 - FY0) * 0.42;
        m.tickT -= dt;
        if (m.tickT <= 0) { m.tickT = 0.2; aoe(m.x, m.y, 75, m.dmg, { skill: true, noCrit: true, burn: m.dmg * 0.4 }); }
        if (Math.random() < 0.8) G.fx.push({ k: 'p', x: m.x, y: m.y, vx: -m.dir * rand(40, 120), vy: rand(-40, 40), life: 0.5, max: 0.5, color: Math.random() < 0.5 ? '#ffb347' : '#ff5a1a', size: rand(3, 7) });
      }
    }
    G.summons = G.summons.filter(m => m.t > 0);
  }

  /* ---------------- EFEKTLER ---------------- */
  function updateFx(dt) {
    for (const f of G.fx) {
      f.life -= dt;
      if (f.k === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 300 * dt; }
      else if (f.k === 'ring') f.r += (f.maxR - f.r) * Math.min(1, dt * 10);
    }
    G.fx = G.fx.filter(f => f.life > 0);
    for (const t of G.texts) { t.life -= dt; t.y -= 40 * dt; }
    G.texts = G.texts.filter(t => t.life > 0);
  }

  /* ---------------------------------------------------------
     OYUN BİTTİ (kale düştü)
     Her şey saklanır, sadece son kontrol noktasına dönülür
     --------------------------------------------------------- */
  function gameOver() {
    G.over = true;
    const cpEvery = B.checkpointEvery;
    const cp = Math.max(1, Math.floor((G.wave - 1) / cpEvery) * cpEvery + 1);
    G.save.best = Math.max(G.save.best, G.wave - 1);
    G.save.wave = cp;
    KK.writeSave();
    KK.sfx && KK.sfx('lose');
    KK.ui && KK.ui.gameOver(G.wave, cp);
  }

  // Kaybettikten sonra kontrol noktasından tekrar başla
  KK.retry = function () {
    KK.startGame(G.save);
  };

  // Ekrana dokunulan nokta = skill hedefi (3 saniye boyunca)
  KK.setFocus = function (x, y) {
    if (x < WALL_X + 20 || y < FY0 - 60) return;
    G.focus = { x, y: clamp(y, FY0, FY1), t: 3 };
  };

  // Test için yardımcılar
  KK._internal = { spawnEnemy, buildWave, hitEnemy, gainXp, dropItem, rollTier };
})();
