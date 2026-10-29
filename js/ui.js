/* =========================================================
   KALE KAHRAMANLARI - Arayüz (menüler, HUD, paneller)
   ve ana oyun döngüsü
   ========================================================= */
(function () {
  const G = KK.G;
  const $ = id => document.getElementById(id);
  const stage = $('stage'), cv = $('cv'), ctx = cv.getContext('2d');
  let scale = 1, dpr = 1;

  /* ---------------------------------------------------------
     KAHRAMAN İSİMLERİ (değiştirilebilir, tarayıcıda saklanır)
     --------------------------------------------------------- */
  let names = {};
  try { names = JSON.parse(localStorage.getItem('kk_names') || '{}'); } catch (e) { }
  const heroName = id => names[id] || (KK.HEROES.find(h => h.id === id) || {}).name || 'Kahraman';
  function renameHero(id, done) {
    askDialog({ title: '✏️ Kahramanın adı ne olsun?', input: heroName(id), ok: 'Kaydet' }, n => {
      if (n && n.trim()) {
        names[id] = n.trim().slice(0, 18);
        try { localStorage.setItem('kk_names', JSON.stringify(names)); } catch (e) { }
      }
      done && done();
    });
  }

  /* Sayfa içi soru penceresi (tarayıcının prompt/confirm kutuları bazı yerlerde çalışmadığı için)
     opts: { title, text, input (varsayılan değer), ok, cancel, danger } ; cb(sonuç) sadece onaylanınca çağrılır */
  function askDialog(opts, cb) {
    const wrap = document.createElement('div');
    wrap.className = 'screen'; wrap.style.zIndex = 80;
    wrap.innerHTML = `<div class="dialog"><h2>${opts.title}</h2>${opts.text ? `<p>${opts.text}</p>` : ''}
      ${opts.input != null ? `<input id="askInput" maxlength="18" class="ask-input">` : ''}
      <div class="btn-row"><button class="big-btn alt" data-r="0">${opts.cancel || 'Vazgeç'}</button>
      <button class="big-btn ${opts.danger ? 'danger' : ''}" data-r="1">${opts.ok || 'Tamam'}</button></div></div>`;
    document.body.appendChild(wrap);
    const inp = wrap.querySelector('#askInput');
    if (inp) { inp.value = opts.input; setTimeout(() => inp.focus(), 50); }
    const close = r => { wrap.remove(); if (r) cb(inp ? inp.value : true); };
    wrap.querySelectorAll('[data-r]').forEach(b => b.onclick = () => close(b.dataset.r === '1'));
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') close(true); });
  }

  /* ---------------------------------------------------------
     EKRAN BOYUTU: oyun 1280x720 tasarlandı, ekrana sığacak şekilde ölçeklenir
     --------------------------------------------------------- */
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    scale = Math.min(vw / 1280, vh / 720);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
    // küçük ekranlarda butonlar parmakla basılabilsin diye büyütülür
    const fs = Math.min(26, Math.max(16, 11 / scale));
    stage.style.setProperty('--fs', fs + 'px');
    cv.width = Math.round(1280 * scale * dpr);
    cv.height = Math.round(720 * scale * dpr);
    // telefon dik tutuluyorsa yan çevirme önerisi
    const portrait = vh > vw && vw < 820;
    $('rotateHint').classList.toggle('hidden', !portrait || rotDismissed);
  }
  let rotDismissed = false;
  $('btnRotOk').onclick = () => { rotDismissed = true; resize(); };
  window.addEventListener('resize', resize);
  resize();

  /* ---------------------------------------------------------
     BİLDİRİMLER ve BANNER
     --------------------------------------------------------- */
  function toast(msg, color) {
    const box = $('toasts');
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = msg;
    if (color) d.style.setProperty('--tc', color);
    box.appendChild(d);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => d.remove(), 2800);
  }
  let bannerT = null;
  function banner(txt) {
    const b = $('banner');
    b.textContent = txt; b.classList.add('show');
    clearTimeout(bannerT);
    bannerT = setTimeout(() => b.classList.remove('show'), 1600);
  }

  /* ---------------------------------------------------------
     ANA MENÜ
     --------------------------------------------------------- */
  let selHero = null, selClass = null;

  function showMainMenu() {
    G.running = false;
    $('hud').classList.add('hidden');
    $('panel').classList.add('hidden');
    $('pauseMenu').classList.add('hidden');
    $('overMenu').classList.add('hidden');
    $('mainMenu').classList.remove('hidden');
    $('stepHero').classList.remove('hidden');
    $('stepClass').classList.add('hidden');
    renderHeroPick();
  }

  function renderHeroPick() {
    const box = $('heroPick');
    box.innerHTML = '';
    for (const h of KK.HEROES) {
      // bu kahramanın tüm sınıflardaki en iyi dalgası
      let best = 0, lvl = 0;
      for (const c in KK.CLASSES) {
        const s = KK.loadSave(h.id, c);
        if (s) { best = Math.max(best, s.best); lvl = Math.max(lvl, s.level); }
      }
      const card = document.createElement('div');
      card.className = 'hero-card';
      card.innerHTML = `
        <button class="edit-btn" title="İsmi değiştir">✏️</button>
        <img src="${h.img}" alt="">
        <div class="hn">${esc(heroName(h.id))}</div>
        <div class="hs">${best ? `⭐ Seviye ${lvl} • 🏆 En iyi dalga ${best}` : 'Yeni kahraman!'}</div>
        <button class="big-btn">Seç ⚔️</button>`;
      card.querySelector('.edit-btn').onclick = ev => { ev.stopPropagation(); renameHero(h.id, renderHeroPick); };
      card.onclick = () => { KK.sfx('click'); selHero = h.id; openClassStep(); };
      box.appendChild(card);
    }
  }

  function openClassStep() {
    $('stepHero').classList.add('hidden');
    $('stepClass').classList.remove('hidden');
    $('classTitle').textContent = `${heroName(selHero)} nasıl savaşsın?`;
    selClass = selClass || 'archer';
    renderClassPick();
  }
  $('btnBack').onclick = () => { KK.sfx('click'); $('stepClass').classList.add('hidden'); $('stepHero').classList.remove('hidden'); renderHeroPick(); };

  function renderClassPick() {
    const box = $('classPick');
    box.innerHTML = '';
    for (const id in KK.CLASSES) {
      const c = KK.CLASSES[id], sv = KK.loadSave(selHero, id);
      const card = document.createElement('div');
      card.className = 'class-card' + (id === selClass ? ' sel' : '');
      const can = document.createElement('canvas');
      can.width = 220; can.height = 220;
      card.appendChild(can);
      card.insertAdjacentHTML('beforeend', `<div class="cn">${c.icon} ${c.name}</div><div class="cs">${sv ? `Sv ${sv.level} • Dalga ${sv.wave}` : ''}</div>`);
      card.onclick = () => { KK.sfx('click'); selClass = id; renderClassPick(); };
      box.appendChild(card);
      drawPreview(can, id);
    }
    renderClassDetail();
  }

  // Sınıf kartında kahramanı o sınıfın kıyafetiyle çiz
  function drawPreview(can, clsId) {
    const c = can.getContext('2d');
    const draw = () => {
      c.clearRect(0, 0, can.width, can.height);
      const g = c.createRadialGradient(110, 130, 10, 110, 130, 110);
      g.addColorStop(0, KK.CLASSES[clsId].color + '55'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, 220, 220);
      KK.drawHero(c, 105, 205, 1.05, clsId, selHero, 0.3, {});
    };
    draw();
    const img = KK.faceImgs[selHero];
    if (img && !img.complete) img.addEventListener('load', draw, { once: true });
  }

  function renderClassDetail() {
    const c = KK.CLASSES[selClass], sv = KK.loadSave(selHero, selClass);
    const skills = c.skills.map(s => `
      <div class="sk-mini"><div class="i">${s.icon}</div><div><b>${s.name}</b><small>${s.desc}<br>🔓 Açılış: Seviye ${s.unlock}</small></div></div>`).join('');
    let btns;
    if (sv) {
      btns = `<div class="btn-row">
        <button class="big-btn" id="btnCont">▶️ Devam Et (Dalga ${sv.wave})</button>
        <button class="big-btn danger" id="btnNew">🔄 Sıfırdan</button></div>`;
    } else btns = `<button class="big-btn" id="btnStart">⚔️ Savaşa Başla!</button>`;
    $('classDetail').innerHTML = `
      <div style="font-size:22px;font-weight:800">${c.icon} ${c.name}</div>
      <div style="color:var(--muted)">${c.desc}</div>
      ${sv ? `<div style="color:var(--gold);font-weight:800">⭐ Seviye ${sv.level} • 🪙 ${fmt(sv.gold)} • 🏆 En iyi dalga ${sv.best} • 🎒 ${sv.inv.length} item</div>` : ''}
      <div class="sk-grid">${skills}</div>
      ${btns}`;
    if (sv) {
      $('btnCont').onclick = () => begin(sv);
      $('btnNew').onclick = () => {
        askDialog({ title: '🔄 Sıfırdan başlansın mı?', text: 'Bu sınıftaki seviye, altın ve itemler silinecek.', ok: 'Evet, sil', danger: true }, () => {
          KK.deleteSave(selHero, selClass); begin(KK.newSave(selHero, selClass));
        });
      };
    } else $('btnStart').onclick = () => begin(KK.newSave(selHero, selClass));
  }

  /* ---------------------------------------------------------
     OYUNU BAŞLAT
     --------------------------------------------------------- */
  function begin(save) {
    KK.sfx('click');
    $('mainMenu').classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('overMenu').classList.add('hidden');
    KK.startGame(save);
    KK.writeSave();
    $('hudFace').src = G.heroDef.img;
    $('hudName').textContent = G.cls.icon + ' ' + heroName(save.hero);
    buildSkillBar();
    $('tapHint').style.opacity = 1;
    setTimeout(() => { $('tapHint').style.opacity = 0; }, 7000);
  }

  /* ---------------------------------------------------------
     SKİLL BUTONLARI
     --------------------------------------------------------- */
  const KEYS = ['1', '2', '3', '4'];
  function buildSkillBar() {
    const bar = $('skillBar');
    bar.innerHTML = '';
    G.cls.skills.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'skill-btn';
      b.style.setProperty('--c1', G.cls.color);
      b.style.setProperty('--c2', G.cls.color2);
      b.innerHTML = `<span class="key">${KEYS[i]}</span><span class="ico">${s.icon}</span><div class="cdv"></div><div class="cdt"></div><div class="lvd"></div>`;
      b.addEventListener('pointerdown', ev => {
        ev.preventDefault(); ev.stopPropagation();
        if (G.save.skillLv[i] === 0) {
          toast(G.save.level >= s.unlock ? `${s.name}: Skiller menüsünden aç! 📜` : `${s.name}: Seviye ${s.unlock} olunca açılır 🔒`);
          return;
        }
        KK.castSkill(i);
      });
      bar.appendChild(b);
    });
  }

  /* ---------------------------------------------------------
     HUD GÜNCELLEME (sadece değişen yazılar yenilenir)
     --------------------------------------------------------- */
  const cache = {};
  function setTxt(id, v) { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } }
  function setW(id, f) { const v = Math.max(0, Math.min(100, f * 100)).toFixed(1) + '%'; if (cache['w' + id] !== v) { cache['w' + id] = v; $(id).style.width = v; } }

  function updateHud() {
    if (!G.running || !G.save) return;
    const sv = G.save, h = G.hero, w = G.wall;
    setTxt('hudLv', sv.level);
    setW('hpFill', h.hp / h.max);
    setTxt('hpTxt', h.down > 0 ? `😵 ${Math.ceil(h.down)} sn` : `❤️ ${Math.ceil(h.hp)}/${Math.round(h.max)}`);
    const need = KK.BALANCE.xpNeed(sv.level);
    setW('xpFill', sv.xp / need);
    setTxt('xpTxt', `TP ${Math.floor(sv.xp / need * 100)}%`);
    setW('wallFill', w.hp / w.max);
    $('wallFill').parentElement.classList.toggle('low', w.hp / w.max < 0.3);
    setTxt('wallTxt', `🏰 ${Math.ceil(w.hp)}/${Math.round(w.max)}`);
    setTxt('waveTxt', (G.wave % 5 === 0 ? '👑 ' : '') + `Dalga ${G.wave}` + (G.waveState === 'fight' ? ` • 👾 ${G.enemies.length + G.spawnQueue.length}` : ''));
    setTxt('goldTxt', fmt(sv.gold));
    const brk = G.waveState === 'break';
    $('btnNext').classList.toggle('hidden', !brk);
    if (brk) setTxt('breakTxt', Math.ceil(G.breakTimer));
    // rozetler
    $('badgeSkills').classList.toggle('hidden', !(sv.skillPts > 0));
    $('badgeBag').classList.toggle('hidden', !newItems);
    setTxt('badgeBag', String(newItems));
    // skill butonları
    const btns = $('skillBar').children;
    G.cls.skills.forEach((s, i) => {
      const b = btns[i]; if (!b) return;
      const lv = sv.skillLv[i], cd = Math.max(0, G.cds[i]), max = KK.skillCd(i);
      b.classList.toggle('locked', lv === 0);
      b.classList.toggle('ready', lv > 0 && cd <= 0 && G.waveState === 'fight');
      const f = cd > 0 ? cd / max : 0;
      const bg = f > 0 ? `conic-gradient(rgba(0,0,0,.65) ${f * 360}deg, transparent 0)` : 'none';
      if (cache['cd' + i] !== bg) { cache['cd' + i] = bg; b.children[2].style.background = bg; }
      setTxtEl(b.children[3], 'cdt' + i, lv === 0 ? '🔒' : cd > 0 ? Math.ceil(cd) : '');
      setTxtEl(b.children[4], 'lvd' + i, lv ? '★'.repeat(lv) : `Sv ${s.unlock}`);
    });
  }
  function setTxtEl(el, key, v) { v = String(v); if (cache[key] !== v) { cache[key] = v; el.textContent = v; } }

  /* ---------------------------------------------------------
     HUD BUTONLARI
     --------------------------------------------------------- */
  $('btnNext').onclick = () => { KK.sfx('click'); KK.skipBreak(); };
  $('btnSpeed').onclick = () => {
    G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 3 : 1;
    $('btnSpeed').textContent = '⏩' + G.speed + 'x';
    KK.sfx('click');
  };
  $('btnPause').onclick = () => openPause();
  function openPause() {
    if (!G.running) return;
    G.paused = true;
    $('btnSound').textContent = KK.soundOn ? '🔊 Ses: Açık' : '🔇 Ses: Kapalı';
    $('pauseMenu').classList.remove('hidden');
  }
  $('btnResume').onclick = () => { $('pauseMenu').classList.add('hidden'); G.paused = false; KK.sfx('click'); };
  $('btnSound').onclick = () => { KK.toggleSound(); $('btnSound').textContent = KK.soundOn ? '🔊 Ses: Açık' : '🔇 Ses: Kapalı'; KK.sfx('click'); };
  $('btnHome').onclick = () => { KK.writeSave(); showMainMenu(); };
  document.querySelectorAll('.menu-btn').forEach(b => b.onclick = () => openPanel(b.dataset.tab));

  // Oyun alanına dokununca: skill hedef noktası belirle
  cv.addEventListener('pointerdown', ev => {
    if (!G.running) return;
    const r = cv.getBoundingClientRect();
    KK.setFocus((ev.clientX - r.left) / r.width * 1280, (ev.clientY - r.top) / r.height * 720);
  });

  // Klavye kısayolları (bilgisayarda oynarken)
  window.addEventListener('keydown', ev => {
    if (!G.running) return;
    const k = ev.key.toLowerCase();
    const map = { '1': 0, '2': 1, '3': 2, '4': 3, 'q': 0, 'w': 1, 'e': 2, 'r': 3 };
    if (k in map && !G.paused) KK.castSkill(map[k]);
    else if (k === 'p' || k === 'escape') {
      if (!$('panel').classList.contains('hidden')) closePanel();
      else if (!$('pauseMenu').classList.contains('hidden')) $('btnResume').onclick();
      else openPause();
    } else if (k === 'b') openPanel('bag');
    else if (k === 'm') openPanel('market');
    else if (k === 'u') openPanel('upgrades');
    else if (k === 's') openPanel('skills');
    else if (k === ' ') { ev.preventDefault(); KK.skipBreak(); }
  });

  /* ---------------------------------------------------------
     KALE DÜŞTÜ EKRANI
     --------------------------------------------------------- */
  function gameOver(wave, cp) {
    $('overTxt').innerHTML = `Ulaştığın dalga: <b>${wave}</b> 💪<br>Seviyen, altının ve itemlerin duruyor.<br>Tekrar başlangıç: <b>Dalga ${cp}</b>`;
    $('overMenu').classList.remove('hidden');
  }
  $('btnRetry').onclick = () => { $('overMenu').classList.add('hidden'); KK.retry(); KK.sfx('click'); };
  $('btnOverUp').onclick = () => { $('overMenu').classList.add('hidden'); openPanel('upgrades'); };
  $('btnOverHome').onclick = () => showMainMenu();

  /* =========================================================
     PANEL: Skiller / Güçlendirme / Market / Çanta / Bilgi
     ========================================================= */
  let curTab = 'skills', newItems = 0, selItem = -1;

  function openPanel(tab) {
    if (!G.save) return;
    KK.sfx('click');
    curTab = tab || curTab;
    G.paused = true;
    $('panel').classList.remove('hidden');
    if (curTab === 'bag') newItems = 0;
    renderPanel();
  }
  function closePanel() {
    $('panel').classList.add('hidden');
    G.paused = !$('pauseMenu').classList.contains('hidden');
    if (G.over) $('overMenu').classList.remove('hidden'); // kaybettikten sonra güçlenmeye gelindiyse geri dön
    KK.sfx('click');
  }
  $('btnClose').onclick = closePanel;
  $('tabs').querySelectorAll('button').forEach(b => b.onclick = () => {
    curTab = b.dataset.tab; selItem = -1; if (curTab === 'bag') newItems = 0; KK.sfx('click'); renderPanel();
  });

  function renderPanel() {
    $('tabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === curTab));
    $('panelGold').textContent = fmt(G.save.gold);
    const body = $('panelBody');
    const st = body.scrollTop;
    if (curTab === 'skills') body.innerHTML = skillsHtml();
    else if (curTab === 'upgrades') body.innerHTML = upgradesHtml();
    else if (curTab === 'market') body.innerHTML = marketHtml();
    else if (curTab === 'bag') body.innerHTML = bagHtml();
    else body.innerHTML = statsHtml();
    body.scrollTop = st;
    // butonlara tıklama: data-act ile hangi işlem yapılacağı belirtiliyor
    body.querySelectorAll('[data-act]').forEach(b => b.onclick = () => doAction(b.dataset.act, b.dataset.i));
  }

  /* ---------- Skiller ---------- */
  function skillsHtml() {
    const sv = G.save;
    let h = `<p class="panel-note">Her seviye atladığında <b style="color:var(--gold)">1 skill puanı</b> kazanırsın. Puanla yeni skill açabilir ya da güçlendirebilirsin (her seviye: +%30 hasar, +%10 süre).
      &nbsp; <b style="color:var(--gold);font-size:18px">Puan: ${sv.skillPts}</b></p><div class="grid">`;
    G.cls.skills.forEach((s, i) => {
      const lv = sv.skillLv[i], max = KK.SKILL_MAX;
      const lockedByLevel = sv.level < s.unlock;
      let btn;
      if (lv >= max) btn = `<button class="btn alt" disabled>MAKS ⭐</button>`;
      else if (lockedByLevel && lv === 0) btn = `<button class="btn alt" disabled>🔒 Seviye ${s.unlock} gerekli</button>`;
      else btn = `<button class="btn" data-act="skill" data-i="${i}" ${sv.skillPts > 0 ? '' : 'disabled'}>${lv === 0 ? 'Aç' : 'Yükselt'} (1 puan)</button>`;
      h += `<div class="card">
        <div class="top"><div class="ic">${s.icon}</div><div><div class="nm">${s.name}</div>
        <div class="lvdots">${'★'.repeat(lv)}${'☆'.repeat(max - lv)}</div></div></div>
        <div class="st">${s.desc}</div>
        <div class="sub">⏱ Bekleme: ${KK.skillCd(i).toFixed(1)} sn${s.dur ? ` • ⏳ Süre: ${(s.dur * (1 + G.stats.spellDur / 100) * (1 + 0.1 * Math.max(0, lv - 1))).toFixed(1)} sn` : ''} • Tuş: ${i + 1}</div>
        <div class="act">${btn}</div></div>`;
    });
    return h + '</div>';
  }

  /* ---------- Güçlendirmeler ---------- */
  KK.upCost = u => Math.round(u.cost * Math.pow(u.mult, G.save.up[u.id] || 0));
  function upgradesHtml() {
    let h = `<p class="panel-note">Altınla kalıcı güçlendirme al. Fiyat her seferinde biraz artar.</p><div class="grid">`;
    KK.UPGRADES.forEach((u, i) => {
      const lv = G.save.up[u.id] || 0, cost = KK.upCost(u), maxed = lv >= u.max;
      const sn = KK.STAT_NAMES[u.stat];
      h += `<div class="card">
        <div class="top"><div class="ic">${u.icon}</div><div><div class="nm">${u.name}</div><div class="sub">Seviye ${lv}/${u.max}</div></div></div>
        <div class="st">Şu an: <b>+${fmtNum(lv * u.val)}${sn.pct ? '%' : ''}</b> &nbsp; Sonraki: +${u.val}${sn.pct ? '%' : ''}</div>
        <div class="act"><button class="btn" data-act="up" data-i="${i}" ${maxed || G.save.gold < cost ? 'disabled' : ''}>${maxed ? 'MAKS' : '🪙 ' + fmt(cost)}</button></div></div>`;
    });
    return h + '</div>';
  }

  /* ---------- Market ---------- */
  const rerollCost = () => Math.round(KK.killGold(G.wave) * 20);
  function marketHtml() {
    let h = `<p class="panel-note">Market her dalgada yenilenir. Itemler pahalıdır (yaklaşık 100-150 düşman kesmeye denk) ama düşmanlardan <b>%1</b> şansla bedava da düşebilir! Silahlar sadece senin sınıfına göre gelir.</p>
      <button class="btn alt" style="max-width:260px;margin-bottom:10px" data-act="reroll" ${G.save.gold < rerollCost() ? 'disabled' : ''}>🔄 Yenile (🪙 ${fmt(rerollCost())})</button><div class="grid">`;
    G.market.forEach((m, i) => {
      const it = KK.makeItem(m.key), price = KK.itemPrice(it);
      h += itemCard(it, m.sold ? `<button class="btn alt" disabled>✔ Satın alındı</button>`
        : `<button class="btn" data-act="buy" data-i="${i}" ${G.save.gold < price ? 'disabled' : ''}>🪙 ${fmt(price)}</button>`, true);
    });
    return h + '</div>';
  }

  /* ---------- Çanta ---------- */
  const SLOT_NAMES = { weapon: '⚔️ Silah', armor: '🛡️ Zırh', ring: '💍 Yüzük' };
  function bagHtml() {
    const sv = G.save;
    let h = `<div class="sec-title">Kuşanılanlar</div><div class="eq-row">`;
    for (const slot of ['weapon', 'armor', 'ring']) {
      const key = sv.eq[slot];
      if (key) h += itemCard(KK.makeItem(key), `<button class="btn alt" data-act="unequip" data-i="${slot}">Çıkar</button>`);
      else h += `<div class="card eq-slot"><div class="top"><div class="ic">❔</div><div><div class="nm">${SLOT_NAMES[slot]}</div><div class="sub">Boş</div></div></div></div>`;
    }
    h += `</div><div class="sec-title">Çanta (${sv.inv.length}/40)</div>`;
    if (!sv.inv.length) return h + `<p class="panel-note">Çantan boş. Düşmanları yen ya da marketten item al!</p>`;
    // güçlü itemler önce
    const list = sv.inv.map((k, i) => ({ k, i, it: KK.makeItem(k) })).sort((a, b) => b.it.tier - a.it.tier);
    h += '<div class="grid">';
    for (const o of list) {
      const sp = KK.sellPrice(o.it);
      h += itemCard(o.it, `<button class="btn" data-act="equip" data-i="${o.i}">Kuşan</button><button class="btn red" data-act="sell" data-i="${o.i}">Sat 🪙${fmt(sp)}</button>`, true);
    }
    return h + '</div>';
  }

  /* ---------- Bilgi (tüm istatistikler) ---------- */
  function statsHtml() {
    const s = G.stats, sv = G.save;
    const rows = [
      ['⚔️ Saldırı hasarı', fmtNum(s.dmg)], ['⚡ Saniyede saldırı', s.aps.toFixed(2)],
      ['❤️ Can', Math.round(s.maxHp)], ['🏰 Kale duvarı', Math.round(s.wallHp)],
      ['⭐ Seviye', sv.level], ['💀 Toplam yenilen düşman', sv.kills], ['🏆 En iyi dalga', sv.best],
    ];
    for (const k in KK.STAT_NAMES) {
      if (['maxHp', 'wallHp'].includes(k)) continue;
      const v = s[k]; if (!v) continue;
      rows.push([KK.STAT_NAMES[k].n, fmtNum(v) + (KK.STAT_NAMES[k].pct ? '%' : '')]);
    }
    return `<table class="stats-table">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`;
  }

  // Item kartı HTML (karşılaştırma: kuşanılı olanla fark)
  function itemCard(it, actions, compare) {
    const rar = KK.rarity(it.tier);
    let cmp = '';
    if (compare) {
      const cur = G.save.eq[it.slot] ? KK.makeItem(G.save.eq[it.slot]) : null;
      if (!cur || cur.key !== it.key) {
        const keys = new Set([...Object.keys(it.stats), ...(cur ? Object.keys(cur.stats) : [])]);
        const diffs = [];
        for (const k of keys) {
          const d = (it.stats[k] || 0) - (cur ? cur.stats[k] || 0 : 0);
          if (Math.abs(d) < 0.01) continue;
          diffs.push(`<span class="${d > 0 ? 'diff-up' : 'diff-down'}">${d > 0 ? '▲' : '▼'}${fmtNum(Math.abs(d))}${KK.STAT_NAMES[k].pct ? '%' : ''} ${KK.STAT_NAMES[k].n}</span>`);
        }
        if (diffs.length) cmp = `<div class="sub">Şu ankine göre: ${diffs.join(', ')}</div>`;
      }
    }
    return `<div class="card" style="border-color:${rar.c}">
      <div class="top"><div class="ic" style="box-shadow:inset 0 0 0 2px ${rar.c}">${it.icon}</div>
      <div><div class="nm" style="color:${rar.c}">${esc(it.name)}</div><div class="sub">${SLOT_NAMES[it.slot]} • ${rar.n} • Tier ${it.tier}</div></div></div>
      <div class="st">${statLines(it.stats)}</div>${cmp}
      <div class="act">${actions}</div></div>`;
  }
  function statLines(st) {
    return Object.keys(st).map(k => `<b>+${fmtNum(st[k])}${KK.STAT_NAMES[k].pct ? '%' : ''}</b> ${KK.STAT_NAMES[k].n}`).join('<br>');
  }

  /* ---------- Panel işlemleri ---------- */
  function doAction(act, i) {
    const sv = G.save;
    if (act === 'skill') {
      i = +i;
      if (sv.skillPts > 0 && sv.skillLv[i] < KK.SKILL_MAX && sv.level >= G.cls.skills[i].unlock) {
        sv.skillPts--; sv.skillLv[i]++;
        KK.sfx('level');
        toast(`${G.cls.skills[i].icon} ${G.cls.skills[i].name} ★${sv.skillLv[i]}`);
      }
    } else if (act === 'up') {
      const u = KK.UPGRADES[+i], cost = KK.upCost(u);
      if (sv.gold >= cost && (sv.up[u.id] || 0) < u.max) {
        sv.gold -= cost; sv.up[u.id] = (sv.up[u.id] || 0) + 1;
        // can/duvar güçlendirmesi alınınca o kadar can da eklenir
        const oldHp = G.hero.hp, oldWall = G.wall.hp;
        KK.computeStats();
        if (u.stat === 'maxHp') G.hero.hp = Math.min(G.hero.max, oldHp + u.val);
        if (u.stat === 'wallHp') G.wall.hp = Math.min(G.wall.max, oldWall + u.val);
        KK.sfx('buy');
      }
    } else if (act === 'buy') {
      const m = G.market[+i], it = KK.makeItem(m.key), price = KK.itemPrice(it);
      if (!m.sold && sv.gold >= price) {
        if (sv.inv.length >= 40) { toast('Çanta dolu! Önce bir şey sat.'); return; }
        sv.gold -= price; sv.inv.push(m.key); m.sold = true;
        KK.sfx('buy'); toast(`${it.icon} ${it.name} çantana eklendi!`, KK.rarity(it.tier).c);
      }
    } else if (act === 'reroll') {
      const c = rerollCost();
      if (sv.gold >= c) { sv.gold -= c; KK.refreshMarket(); KK.sfx('buy'); }
    } else if (act === 'equip') {
      i = +i;
      const key = sv.inv[i], it = KK.makeItem(key);
      sv.inv.splice(i, 1);
      if (sv.eq[it.slot]) sv.inv.push(sv.eq[it.slot]);
      sv.eq[it.slot] = key;
      KK.computeStats(); KK.sfx('buy');
      toast(`${it.icon} ${it.name} kuşanıldı!`, KK.rarity(it.tier).c);
    } else if (act === 'unequip') {
      if (sv.inv.length >= 40) { toast('Çanta dolu!'); return; }
      sv.inv.push(sv.eq[i]); sv.eq[i] = null; KK.computeStats(); KK.sfx('click');
    } else if (act === 'sell') {
      i = +i;
      const it = KK.makeItem(sv.inv[i]), p = KK.sellPrice(it);
      sv.inv.splice(i, 1); sv.gold += p; KK.sfx('coin');
      toast(`${it.name} satıldı +${fmt(p)} 🪙`);
    }
    KK.writeSave();
    renderPanel();
    updateHud();
  }

  /* ---------------------------------------------------------
     YARDIMCILAR
     --------------------------------------------------------- */
  // Büyük sayıları kısalt: 12500 -> 12.5B
  function fmt(n) {
    n = Math.floor(n);
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'Mr';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1) + 'B';
    return String(n);
  }
  function fmtNum(v) { return Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1); }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // Motorun arayüze ulaşabilmesi için
  KK.ui = {
    toast, banner, gameOver,
    get newItems() { return newItems; },
  };
  // item düşünce çanta rozetini artır
  const origToast = toast;
  KK.ui.toast = (m, c) => { if (m.startsWith('✨')) newItems++; origToast(m, c); };

  /* ---------------------------------------------------------
     ANA OYUN DÖNGÜSÜ
     --------------------------------------------------------- */
  let last = performance.now(), hudT = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    KK.update(dt);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    if (G.running || G.over) KK.render(ctx);
    else { ctx.fillStyle = '#13202e'; ctx.fillRect(0, 0, 1280, 720); }
    hudT -= dt;
    if (hudT <= 0) { hudT = 0.07; updateHud(); }
    requestAnimationFrame(loop);
  }

  // Sayfa kapanırken / arka plana geçerken kaydet ve durdur
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.running) { KK.writeSave(); if (!G.over) openPause(); }
  });

  showMainMenu();
  requestAnimationFrame(loop);
})();
