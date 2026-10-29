/* =========================================================
   KALE KAHRAMANLARI - Çizim (Render)
   Tüm görseller kodla çizilir; sadece kahraman yüzleri resimdir.
   ========================================================= */

(function () {
  const G = KK.G;
  const { W, H, FY0, FY1, WALL_X } = G;
  const TAU = Math.PI * 2;

  // Kahraman yüz resimlerini önceden yükle
  KK.faceImgs = {};
  for (const h of KK.HEROES) {
    const img = new Image();
    img.src = h.img;
    KK.faceImgs[h.id] = img;
  }

  // Basit sözde-rastgele sayı üreteci (arka plan her seferinde aynı çizilsin diye)
  function seeded(seed) {
    return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  }

  /* ---------------------------------------------------------
     ARKA PLAN (bir kere çizilip saklanır - performans için)
     --------------------------------------------------------- */
  let bgCanvas = null;
  function buildBackground() {
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = W; bgCanvas.height = H;
    const c = bgCanvas.getContext('2d');
    const rnd = seeded(42);

    // Gökyüzü
    let g = c.createLinearGradient(0, 0, 0, FY0);
    g.addColorStop(0, '#5fb4ea'); g.addColorStop(1, '#cdeefb');
    c.fillStyle = g; c.fillRect(0, 0, W, FY0 + 20);

    // Güneş
    c.fillStyle = 'rgba(255,240,170,0.5)'; circle(c, 1120, 70, 55); c.fill();
    c.fillStyle = '#fff3b0'; circle(c, 1120, 70, 38); c.fill();

    // Bulutlar
    c.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 6; i++) {
      const x = 300 + rnd() * 900, y = 40 + rnd() * 110, s = 0.6 + rnd() * 0.8;
      for (let k = 0; k < 4; k++) { circle(c, x + k * 28 * s, y + Math.sin(k * 2) * 8 * s, (22 + rnd() * 12) * s); c.fill(); }
    }

    // Uzak dağlar
    c.fillStyle = '#8fb5c9';
    c.beginPath(); c.moveTo(200, FY0);
    for (let x = 200; x <= W; x += 80) c.lineTo(x + 40, FY0 - 70 - rnd() * 70), c.lineTo(x + 80, FY0 - 10);
    c.lineTo(W, FY0); c.closePath(); c.fill();
    // Yakın tepeler
    c.fillStyle = '#6aa65a';
    c.beginPath(); c.moveTo(200, FY0 + 5);
    for (let x = 200; x <= W + 60; x += 60) c.quadraticCurveTo(x + 30, FY0 - 35 - rnd() * 25, x + 60, FY0 + 5);
    c.closePath(); c.fill();

    // Çimen alanı
    g = c.createLinearGradient(0, FY0, 0, H);
    g.addColorStop(0, '#78c556'); g.addColorStop(1, '#4e9a38');
    c.fillStyle = g; c.fillRect(0, FY0, W, H - FY0);

    // Toprak yol izleri
    c.fillStyle = 'rgba(160,120,70,0.25)';
    for (let i = 0; i < 4; i++) {
      const y = FY0 + 60 + i * 100 + rnd() * 20;
      c.beginPath(); c.ellipse(760, y, 560, 22 + rnd() * 10, 0, 0, TAU); c.fill();
    }
    // Çimen tutamları ve çiçekler
    for (let i = 0; i < 260; i++) {
      const x = WALL_X + rnd() * (W - WALL_X), y = FY0 + rnd() * (H - FY0);
      if (rnd() < 0.15) {
        c.fillStyle = ['#ffe066', '#ff8fb1', '#ffffff', '#b28cff'][Math.floor(rnd() * 4)];
        circle(c, x, y, 3); c.fill();
      } else {
        c.strokeStyle = 'rgba(40,100,30,0.5)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y - 7); c.moveTo(x, y); c.lineTo(x + 3, y - 8); c.stroke();
      }
    }
    // Sağ taraftaki ağaçlar (düşmanlar bu ormandan çıkar)
    for (let i = 0; i < 7; i++) {
      const x = 1180 + rnd() * 120, y = FY0 - 10 + i * 62;
      c.fillStyle = '#6b4a2b'; c.fillRect(x - 6, y, 12, 26);
      c.fillStyle = i % 2 ? '#2f7a32' : '#3d8f3d'; circle(c, x, y - 8, 30); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.12)'; circle(c, x - 10, y - 18, 12); c.fill();
    }

    // ---- KALE ----
    // Kale içi (taş zemin)
    c.fillStyle = '#9c9488'; c.fillRect(0, FY0 - 90, WALL_X - 50, H);
    stoneTexture(c, 0, FY0 - 90, WALL_X - 50, H - FY0 + 90, '#8e877b', rnd);
    // Arka kuleler ve bayraklar
    for (const tx of [40, 150]) {
      c.fillStyle = '#b3aa9c'; c.fillRect(tx - 32, FY0 - 190, 64, 120);
      stoneTexture(c, tx - 32, FY0 - 190, 64, 120, '#a29a8c', rnd);
      c.fillStyle = '#b3aa9c';
      for (let k = 0; k < 4; k++) c.fillRect(tx - 32 + k * 18, FY0 - 205, 12, 16);
      c.fillStyle = '#5a3d2b'; c.fillRect(tx - 2, FY0 - 260, 4, 60);
      c.fillStyle = tx === 40 ? '#e34b4b' : '#3f7fe0';
      c.beginPath(); c.moveTo(tx + 2, FY0 - 260); c.lineTo(tx + 40, FY0 - 248); c.lineTo(tx + 2, FY0 - 236); c.fill();
    }
    // Ana duvar (düşmanların vurduğu yer)
    c.fillStyle = '#a89f91'; c.fillRect(WALL_X - 60, FY0 - 70, 60, H - FY0 + 70);
    stoneTexture(c, WALL_X - 60, FY0 - 70, 60, H - FY0 + 70, '#958c7f', rnd);
    // Mazgallar (duvarın dişleri)
    c.fillStyle = '#bdb4a6';
    for (let y = FY0 - 70; y < H; y += 36) { c.fillRect(WALL_X - 4, y, 16, 22); c.strokeStyle = '#7d756a'; c.strokeRect(WALL_X - 4, y, 16, 22); }
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(WALL_X - 60, FY0 - 70, 8, H);
    // Kahramanın durduğu kule platformu
    c.fillStyle = '#7d756a'; circle(c, 150, 478, 78); c.fill();
    c.fillStyle = '#b8ae9f'; circle(c, 150, 470, 74); c.fill();
    c.fillStyle = '#cfc6b8'; circle(c, 150, 470, 58); c.fill();
    c.strokeStyle = '#9d9486'; c.lineWidth = 3;
    for (let a = 0; a < TAU; a += TAU / 12) { c.beginPath(); c.moveTo(150 + Math.cos(a) * 58, 470 + Math.sin(a) * 58); c.lineTo(150 + Math.cos(a) * 74, 470 + Math.sin(a) * 74); c.stroke(); }
  }

  function stoneTexture(c, x, y, w, h, color, rnd) {
    c.strokeStyle = color; c.lineWidth = 2;
    for (let yy = y; yy < y + h; yy += 22) {
      c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy); c.stroke();
      const off = ((yy - y) / 22) % 2 ? 0 : 16;
      for (let xx = x + off; xx < x + w; xx += 32) { c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, yy + 22); c.stroke(); }
    }
  }

  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); }

  /* ---------------------------------------------------------
     KAHRAMAN ÇİZİMİ (menüde de kullanılır)
     x,y = ayakların olduğu nokta
     --------------------------------------------------------- */
  KK.drawHero = function (c, x, y, sc, clsId, heroId, t, st) {
    st = st || {};
    const cls = KK.CLASSES[clsId];
    const img = KK.faceImgs[heroId];
    const hd = KK.HEROES.find(h => h.id === heroId) || KK.HEROES[0];
    sc *= hd.scale;
    c.save();
    c.translate(x, y); c.scale(sc, sc);
    if (st.down) { c.globalAlpha = 0.55; }
    const bob = Math.sin(t * 3) * 2;
    const recoil = st.anim ? -st.anim * 20 : 0;

    // gölge
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(0, 0, 34, 10, 0, 0, TAU); c.fill();
    // bacaklar
    c.fillStyle = '#3b3b4f';
    roundRect(c, -16, -24, 12, 24, 5); c.fill();
    roundRect(c, 4, -24, 12, 24, 5); c.fill();
    c.fillStyle = '#2a2a2a'; roundRect(c, -18, -6, 15, 7, 3); c.fill(); roundRect(c, 3, -6, 15, 7, 3); c.fill();
    // pelerin (arkada)
    if (cls.hat !== 'goggles') {
      c.fillStyle = cls.color2;
      c.beginPath(); c.moveTo(-22, -70 + bob); c.lineTo(-34, -14); c.lineTo(30, -14); c.lineTo(20, -70 + bob); c.fill();
    }
    // gövde
    c.fillStyle = cls.color;
    c.beginPath(); c.moveTo(-22, -72 + bob); c.lineTo(22, -72 + bob); c.lineTo(28, -18); c.lineTo(-28, -18); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; c.stroke();
    // kemer
    c.fillStyle = cls.color2; c.fillRect(-25, -42 + bob * 0.5, 50, 7);
    c.fillStyle = '#f2c94c'; c.fillRect(-5, -43 + bob * 0.5, 10, 9);
    if (cls.hat === 'goggles') { // mühendis tulumu cepleri
      c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(-14, -64 + bob, 12, 10); c.fillRect(2, -64 + bob, 12, 10);
    }
    // sol kol
    c.fillStyle = cls.color; roundRect(c, -32, -68 + bob, 11, 32, 5); c.fill();
    c.fillStyle = '#f1c7a5'; circle(c, -27, -34 + bob, 6); c.fill();

    // ---- silah (sağ el) ----
    c.save();
    c.translate(30 + recoil * 0.3, -50 + bob);
    drawWeapon(c, clsId, t, st.anim || 0);
    c.restore();
    // sağ kol
    c.fillStyle = cls.color; roundRect(c, 20, -68 + bob, 11, 24, 5); c.fill();
    c.fillStyle = '#f1c7a5'; circle(c, 28 + recoil * 0.3, -48 + bob, 6); c.fill();

    // ---- kafa: yeğenin yüzü ----
    const hy = -110 + bob, hr = 38;
    if (cls.hat === 'hood') { // okçu başlığı (kafanın arkasında)
      c.fillStyle = cls.color2; circle(c, 0, hy - 2, hr + 8); c.fill();
      c.beginPath(); c.moveTo(-20, hy - hr); c.lineTo(10, hy - hr - 30); c.lineTo(26, hy - hr + 6); c.fill();
    }
    c.save();
    circle(c, 0, hy, hr); c.clip();
    if (img && img.complete && img.naturalWidth) c.drawImage(img, -hr, hy - hr, hr * 2, hr * 2);
    else { c.fillStyle = '#f1c7a5'; c.fillRect(-hr, hy - hr, hr * 2, hr * 2); }
    if (st.hurt) { c.fillStyle = 'rgba(255,0,0,0.35)'; c.fillRect(-hr, hy - hr, hr * 2, hr * 2); }
    c.restore();
    c.strokeStyle = cls.color; c.lineWidth = 4; circle(c, 0, hy, hr); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5; circle(c, 0, hy, hr + 2.5); c.stroke();

    // ---- şapkalar ----
    if (cls.hat === 'wizard') {
      c.fillStyle = cls.color2;
      c.beginPath(); c.ellipse(4, hy - hr + 4, 44, 9, -0.12, 0, TAU); c.fill();
      c.fillStyle = cls.color;
      c.beginPath(); c.moveTo(-26, hy - hr + 4); c.quadraticCurveTo(10, hy - hr - 30, 30, hy - hr - 52); c.quadraticCurveTo(22, hy - hr - 18, 32, hy - hr + 2); c.closePath(); c.fill();
      c.fillStyle = '#ffe066'; star(c, 6, hy - hr - 14, 6); c.fill();
      c.fillStyle = clsId === 'ice' ? '#ffffff' : '#ffd23f'; circle(c, 31, hy - hr - 52, 5); c.fill();
    } else if (cls.hat === 'leaf') {
      // yaprak taç
      for (let k = -3; k <= 3; k++) {
        const a = -Math.PI / 2 + k * 0.32;
        c.fillStyle = k % 2 ? '#3e9b45' : '#5cc35f';
        c.save(); c.translate(Math.cos(a) * (hr - 2), hy + Math.sin(a) * (hr - 2)); c.rotate(a + Math.PI / 2);
        c.beginPath(); c.ellipse(0, -8, 6, 13, 0, 0, TAU); c.fill(); c.restore();
      }
    } else if (cls.hat === 'goggles') {
      // mühendis gözlüğü alnın üstünde
      c.fillStyle = '#4a3a2a'; c.fillRect(-hr + 2, hy - hr + 10, hr * 2 - 4, 8);
      for (const gx of [-14, 14]) {
        c.fillStyle = '#6b5a45'; circle(c, gx, hy - hr + 13, 12); c.fill();
        c.fillStyle = '#7ad7ff'; circle(c, gx, hy - hr + 13, 8); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.7)'; circle(c, gx - 3, hy - hr + 10, 3); c.fill();
      }
    }
    // bayılmış ise
    if (st.down) {
      c.globalAlpha = 1; c.fillStyle = '#fff'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center';
      c.fillText('z Z z', 30, hy - hr - 10 + Math.sin(t * 3) * 4);
    }
    c.restore();
  };

  // Sınıfa göre silah çizimi
  function drawWeapon(c, clsId, t, anim) {
    if (clsId === 'archer') {
      c.strokeStyle = '#8a5a2b'; c.lineWidth = 5;
      c.beginPath(); c.arc(-6, 0, 34, -1.2, 1.2); c.stroke();
      c.strokeStyle = '#eee'; c.lineWidth = 1.5;
      const pull = anim > 0 ? 0 : 6;
      c.beginPath(); c.moveTo(-6 + Math.cos(-1.2) * 34, Math.sin(-1.2) * 34); c.lineTo(-pull, 0); c.lineTo(-6 + Math.cos(1.2) * 34, Math.sin(1.2) * 34); c.stroke();
      if (anim <= 0) { c.strokeStyle = '#e8d6a0'; c.lineWidth = 3; c.beginPath(); c.moveTo(-pull, 0); c.lineTo(36, 0); c.stroke(); }
    } else if (clsId === 'engineer') {
      c.rotate(-0.15);
      c.fillStyle = '#555c66'; roundRect(c, -6, -8, 46, 14, 4); c.fill();
      c.fillStyle = '#333'; c.fillRect(36, -5, 14, 8);
      c.fillStyle = '#f2b632'; c.fillRect(4, -12, 16, 6);
      c.fillStyle = '#444'; c.fillRect(0, 4, 10, 16);
      if (anim > 0.1) { c.fillStyle = '#ffe17a'; star(c, 56, -1, 9); c.fill(); }
    } else {
      // asalar (alev / buz / toprak)
      c.rotate(-0.25);
      c.strokeStyle = clsId === 'earth' ? '#6b4a2b' : '#7a5230'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(0, 46); c.lineTo(0, -46); c.stroke();
      const col = clsId === 'fire' ? '#ff7a1a' : clsId === 'ice' ? '#9eeaff' : '#5cd35f';
      const glow = 10 + Math.sin(t * 6) * 3 + anim * 30;
      c.fillStyle = col; c.globalAlpha *= 0.35; circle(c, 0, -52, glow + 8); c.fill(); c.globalAlpha /= 0.35;
      if (clsId === 'ice') { c.fillStyle = col; diamond(c, 0, -54, 10, 18); c.fill(); }
      else if (clsId === 'earth') { c.fillStyle = col; circle(c, 0, -52, 10); c.fill(); c.fillStyle = '#3e9b45'; c.beginPath(); c.ellipse(-10, -40, 5, 10, -0.6, 0, TAU); c.fill(); }
      else { c.fillStyle = '#ffd23f'; circle(c, 0, -52, 9); c.fill(); c.fillStyle = col; c.beginPath(); c.moveTo(-8, -50); c.quadraticCurveTo(0, -78 - Math.sin(t * 10) * 5, 8, -50); c.fill(); }
    }
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function star(c, x, y, r) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath();
  }
  function diamond(c, x, y, w, h) { c.beginPath(); c.moveTo(x, y - h); c.lineTo(x + w, y); c.lineTo(x, y + h); c.lineTo(x - w, y); c.closePath(); }

  /* ---------------------------------------------------------
     DÜŞMAN ÇİZİMİ
     --------------------------------------------------------- */
  function drawEnemy(c, e, t) {
    const bob = e.state === 'walk' && e.freezeT <= 0 && e.stunT <= 0 ? Math.abs(Math.sin(e.wob)) * 4 : 0;
    const atk = e.state === 'attack' ? Math.max(0, Math.sin(e.atkT * 6)) * 6 : 0;
    const x = e.x - atk, y = e.y - bob, r = e.r;
    // gölge
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.beginPath(); c.ellipse(e.x, e.fly ? e.y + r + 30 : e.y + r * 0.85, r * 0.9, r * 0.28, 0, 0, TAU); c.fill();
    // elit düşman parıltısı
    if (e.elite) { c.fillStyle = 'rgba(255,215,0,0.35)'; circle(c, x, y, r + 8 + Math.sin(t * 6) * 2); c.fill(); }

    const col = e.hit > 0 ? '#ffffff' : e.color;
    c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.35)';

    switch (e.type) {
      case 'wolf':
        c.fillStyle = col;
        c.beginPath(); c.ellipse(x + 6, y + 4, r * 1.25, r * 0.8, 0, 0, TAU); c.fill(); c.stroke();
        circle(c, x - r * 0.6, y - 4, r * 0.7); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(x - r * 0.9, y - r * 0.4); c.lineTo(x - r * 0.7, y - r * 1.2); c.lineTo(x - r * 0.35, y - r * 0.6); c.fill();
        c.beginPath(); c.moveTo(x - r * 0.4, y - r * 0.5); c.lineTo(x - r * 0.15, y - r * 1.2); c.lineTo(x, y - r * 0.5); c.fill();
        c.fillStyle = '#333'; circle(c, x - r * 1.25, y, 3.5); c.fill();
        eyes(c, x - r * 0.75, y - 7, 0.7);
        // kuyruk
        c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.moveTo(x + r * 1.3, y); c.quadraticCurveTo(x + r * 1.8, y - 10 - Math.sin(e.wob) * 6, x + r * 1.9, y - 18); c.stroke();
        break;
      case 'bat': {
        const fl = Math.sin(t * 18 + e.wob) * 0.6;
        c.fillStyle = e.hit > 0 ? '#fff' : '#4a3570';
        for (const s of [-1, 1]) {
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + s * r * 2.2, y - r * (0.6 + fl)); c.lineTo(x + s * r * 1.6, y + r * 0.3); c.lineTo(x + s * r * 1.0, y); c.fill();
        }
        c.fillStyle = col; circle(c, x, y, r); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(x - r * 0.7, y - r * 0.6); c.lineTo(x - r * 0.5, y - r * 1.4); c.lineTo(x - r * 0.1, y - r * 0.8); c.fill();
        c.beginPath(); c.moveTo(x + r * 0.7, y - r * 0.6); c.lineTo(x + r * 0.5, y - r * 1.4); c.lineTo(x + r * 0.1, y - r * 0.8); c.fill();
        eyes(c, x, y - 2, 0.7, '#ffef5a');
        break;
      }
      case 'skeleton':
        c.fillStyle = col; circle(c, x, y, r); c.fill(); c.stroke();
        c.fillStyle = '#222'; circle(c, x - 7, y - 3, 5); c.fill(); circle(c, x + 6, y - 3, 5); c.fill();
        c.fillStyle = '#ff5a5a'; circle(c, x - 7, y - 3, 1.8); c.fill(); circle(c, x + 6, y - 3, 1.8); c.fill();
        c.strokeStyle = '#222'; c.lineWidth = 2;
        for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x + k * 4, y + 7); c.lineTo(x + k * 4, y + 12); c.stroke(); }
        c.strokeStyle = '#8a5a2b'; c.lineWidth = 3; c.beginPath(); c.arc(x - r - 4, y + 4, 18, Math.PI * 0.55, Math.PI * 1.45); c.stroke();
        break;
      default: {
        // goblin, ork, şaman, trol, şövalye, boss'lar
        c.fillStyle = col; circle(c, x, y, r); c.fill(); c.stroke();
        if (e.type === 'goblin' || e.type === 'boss' && e.name.includes('Goblin')) {
          c.fillStyle = col;
          c.beginPath(); c.moveTo(x - r * 0.8, y - r * 0.3); c.lineTo(x - r * 1.6, y - r * 0.8); c.lineTo(x - r * 0.7, y + r * 0.1); c.fill();
          c.beginPath(); c.moveTo(x + r * 0.8, y - r * 0.3); c.lineTo(x + r * 1.6, y - r * 0.8); c.lineTo(x + r * 0.7, y + r * 0.1); c.fill();
        }
        if (e.type === 'shaman') {
          c.fillStyle = '#7a2f7a'; c.beginPath(); c.arc(x, y - 2, r + 3, Math.PI, 0); c.lineTo(x + 4, y - r - 16); c.closePath(); c.fill();
          c.strokeStyle = '#6b4a2b'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - r - 6, y + r); c.lineTo(x - r - 6, y - r - 12); c.stroke();
          c.fillStyle = '#7fff7f'; circle(c, x - r - 6, y - r - 16, 6); c.fill();
        }
        if (e.type === 'knight') {
          c.fillStyle = '#5b6070'; c.beginPath(); c.arc(x, y, r, Math.PI * 1.05, Math.PI * 1.95); c.fill();
          c.fillStyle = '#222'; c.fillRect(x - r * 0.8, y - 6, r * 1.6, 8);
          c.fillStyle = '#ff3b3b'; c.fillRect(x - r * 0.6, y - 4, r * 0.4, 3); c.fillRect(x + r * 0.1, y - 4, r * 0.4, 3);
          c.fillStyle = '#c73b3b'; c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x + 14, y - r - 20, x + 24, y - r - 8); c.lineTo(x + 4, y - r + 4); c.fill();
        } else {
          eyes(c, x - r * 0.1, y - r * 0.18, r / 20);
        }
        if (e.type === 'orc' || e.type === 'troll' || e.boss) {
          c.fillStyle = '#fffbe6';
          c.beginPath(); c.moveTo(x - r * 0.45, y + r * 0.35); c.lineTo(x - r * 0.35, y + r * 0.0); c.lineTo(x - r * 0.25, y + r * 0.35); c.fill();
          c.beginPath(); c.moveTo(x + r * 0.15, y + r * 0.35); c.lineTo(x + r * 0.25, y + r * 0.0); c.lineTo(x + r * 0.35, y + r * 0.35); c.fill();
        }
        if (e.type === 'troll' || (e.boss && !e.fly)) {
          // sopa
          c.save(); c.translate(x - r * 0.9, y + r * 0.2); c.rotate(-0.9 - atk * 0.08);
          c.fillStyle = '#7a5230'; roundRect(c, -5, -r * 1.3, 12, r * 1.4, 5); c.fill();
          c.fillStyle = '#5c3d22'; circle(c, 1, -r * 1.3, 10 + r * 0.1); c.fill();
          c.restore();
        }
        if (e.boss && e.fly) {
          // ejderha kanatları
          const fl = Math.sin(t * 6) * 0.4;
          c.fillStyle = '#5a3a7a';
          for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * r * 0.5, y - r * 0.3); c.lineTo(x + s * r * 2, y - r * (1.3 + fl)); c.lineTo(x + s * r * 1.5, y + r * 0.1); c.closePath(); c.fill(); }
          c.fillStyle = col; circle(c, x, y, r * 0.95); c.fill();
          eyes(c, x - r * 0.1, y - r * 0.18, r / 20, '#ffcf3a');
        }
        if (e.boss) {
          // taç
          c.fillStyle = '#ffd23f';
          c.beginPath(); c.moveTo(x - r * 0.6, y - r * 0.8);
          for (let k = 0; k <= 4; k++) { c.lineTo(x - r * 0.6 + k * r * 0.3, y - r * (k % 2 ? 0.95 : 1.35)); }
          c.lineTo(x + r * 0.6, y - r * 0.8); c.closePath(); c.fill();
          c.fillStyle = '#e34b4b'; circle(c, x, y - r * 1.05, 4); c.fill();
        }
      }
    }
    // donmuş görünüm
    if (e.freezeT > 0) {
      c.fillStyle = 'rgba(170,230,255,0.55)'; circle(c, e.x, e.y, r + 6); c.fill();
      c.strokeStyle = '#e6fbff'; c.lineWidth = 2; circle(c, e.x, e.y, r + 6); c.stroke();
    }
    // yanma
    if (e.burnT > 0 && Math.random() < 0.5) {
      G.fx.push({ k: 'p', x: e.x + (Math.random() - 0.5) * r, y: e.y - r * 0.5, vx: 0, vy: -60, life: 0.4, max: 0.4, color: '#ff8a2a', size: 3 });
    }
    // sersemleme yıldızları
    if (e.stunT > 0) {
      c.fillStyle = '#ffe066';
      for (let k = 0; k < 3; k++) { const a = t * 5 + k * 2.1; star(c, e.x + Math.cos(a) * r * 0.8, e.y - r - 8 + Math.sin(a) * 5, 5); c.fill(); }
    }
    // can barı
    if (e.hp < e.max) {
      const bw = Math.max(30, r * 1.8), bx = e.x - bw / 2, by = e.y - r - (e.boss ? 40 : 14);
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(bx - 1, by - 1, bw + 2, 7);
      c.fillStyle = e.boss ? '#c55cff' : e.elite ? '#ffd23f' : '#ff4d4d'; c.fillRect(bx, by, bw * Math.max(0, e.hp / e.max), 5);
    }
  }

  function eyes(c, x, y, s, iris) {
    for (const dx of [-8, 8]) {
      c.fillStyle = '#fff'; circle(c, x + dx * s, y, 6 * s); c.fill();
      c.fillStyle = iris || '#222'; circle(c, x + dx * s - 2 * s, y + 1 * s, 3 * s); c.fill();
    }
    // kızgın kaşlar
    c.strokeStyle = '#222'; c.lineWidth = 2.5 * s;
    c.beginPath(); c.moveTo(x - 14 * s, y - 9 * s); c.lineTo(x - 3 * s, y - 5 * s); c.moveTo(x + 14 * s, y - 9 * s); c.lineTo(x + 3 * s, y - 5 * s); c.stroke();
  }

  /* ---------------------------------------------------------
     MERMİLER
     --------------------------------------------------------- */
  function drawProj(c, p, t) {
    if (p.delay > 0) return;
    c.save(); c.translate(p.x, p.y); c.rotate(p.ang || 0);
    switch (p.vis) {
      case 'arrow': case 'bigarrow': {
        const s = p.vis === 'bigarrow' ? 2.4 : 1;
        if (s > 1) { c.fillStyle = 'rgba(150,255,255,0.35)'; c.beginPath(); c.ellipse(-20, 0, 50, 14, 0, 0, TAU); c.fill(); }
        c.strokeStyle = '#8a5a2b'; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(-22 * s, 0); c.lineTo(10 * s, 0); c.stroke();
        c.fillStyle = p.color; c.beginPath(); c.moveTo(16 * s, 0); c.lineTo(6 * s, -5 * s); c.lineTo(6 * s, 5 * s); c.fill();
        c.fillStyle = '#fff'; c.fillRect(-24 * s, -4 * s, 7 * s, 3 * s); c.fillRect(-24 * s, 1 * s, 7 * s, 3 * s);
        break;
      }
      case 'fireball': case 'bigfire': case 'meteor': {
        const s = p.vis === 'fireball' ? 1 : 2.4;
        c.fillStyle = 'rgba(255,120,30,0.35)'; c.beginPath(); c.ellipse(-12 * s, 0, 22 * s, 11 * s, 0, 0, TAU); c.fill();
        c.fillStyle = '#ff7a1a'; circle(c, 0, 0, 10 * s); c.fill();
        c.fillStyle = '#ffd23f'; circle(c, 2 * s, 0, 5 * s); c.fill();
        if (Math.random() < 0.7) G.fx.push({ k: 'p', x: p.x, y: p.y, vx: (Math.random() - 0.5) * 50, vy: -30, life: 0.35, max: 0.35, color: '#ff9a3a', size: 3 * s });
        break;
      }
      case 'shard': case 'lance': {
        const s = p.vis === 'lance' ? 2.6 : 1;
        c.fillStyle = 'rgba(190,240,255,0.4)'; c.beginPath(); c.ellipse(-10 * s, 0, 20 * s, 7 * s, 0, 0, TAU); c.fill();
        c.fillStyle = p.color; c.beginPath(); c.moveTo(16 * s, 0); c.lineTo(0, -6 * s); c.lineTo(-14 * s, 0); c.lineTo(0, 6 * s); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(12 * s, 0); c.lineTo(0, -2 * s); c.lineTo(-6 * s, 0); c.fill();
        break;
      }
      case 'rock':
        c.fillStyle = '#7a5a3a'; circle(c, 0, 0, 10); c.fill(); c.fillStyle = '#9b7b55'; circle(c, -3, -3, 4); c.fill();
        break;
      case 'boulder':
        c.rotate(p.rot || 0);
        c.fillStyle = '#7a6a55'; circle(c, 0, 0, p.r); c.fill();
        c.strokeStyle = '#5a4a3a'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(-p.r * 0.6, -p.r * 0.2); c.lineTo(p.r * 0.2, p.r * 0.1); c.lineTo(p.r * 0.5, -p.r * 0.5); c.stroke();
        c.beginPath(); c.moveTo(-p.r * 0.2, p.r * 0.6); c.lineTo(p.r * 0.1, p.r * 0.2); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.15)'; circle(c, -p.r * 0.3, -p.r * 0.4, p.r * 0.3); c.fill();
        break;
      case 'bullet':
        c.fillStyle = p.color; c.fillRect(-8, -2.5, 16, 5);
        break;
      case 'laser':
        c.strokeStyle = p.color; c.lineWidth = 3; c.beginPath(); c.moveTo(-14, 0); c.lineTo(10, 0); c.stroke();
        break;
      case 'rocket':
        c.fillStyle = '#ddd'; roundRect(c, -10, -4, 20, 8, 3); c.fill();
        c.fillStyle = '#e34b4b'; c.beginPath(); c.moveTo(14, 0); c.lineTo(8, -4); c.lineTo(8, 4); c.fill();
        c.fillStyle = '#ffb347'; c.beginPath(); c.moveTo(-10, -3); c.lineTo(-20 - Math.random() * 6, 0); c.lineTo(-10, 3); c.fill();
        break;
    }
    c.restore();
  }

  /* ---------------------------------------------------------
     BÖLGELER (skill alanları) - düşmanların altına çizilir
     --------------------------------------------------------- */
  function drawZone(c, z, t) {
    const a = Math.min(1, z.t * 2);
    c.save(); c.globalAlpha = a;
    switch (z.k) {
      case 'rain':
        c.fillStyle = 'rgba(255,240,180,0.18)'; circle(c, z.x, z.y, z.r); c.fill();
        c.strokeStyle = '#8a5a2b'; c.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const ax = z.x + Math.sin(i * 7.3 + t * 3) * z.r * 0.8, ay = z.y - z.r + ((t * 600 + i * 61) % (z.r * 2));
          c.beginPath(); c.moveTo(ax - 6, ay - 20); c.lineTo(ax, ay); c.stroke();
        }
        break;
      case 'firewall': {
        const top = z.y - z.h / 2;
        c.fillStyle = 'rgba(255,90,20,0.25)'; c.fillRect(z.x - z.w / 2, top, z.w, z.h);
        for (let yy = top; yy < top + z.h; yy += 22) {
          const fh = 26 + Math.sin(t * 12 + yy) * 10;
          c.fillStyle = '#ff7a1a'; c.beginPath(); c.moveTo(z.x - 16, yy + 20); c.quadraticCurveTo(z.x, yy + 20 - fh, z.x + 16, yy + 20); c.fill();
          c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(z.x - 7, yy + 20); c.quadraticCurveTo(z.x, yy + 20 - fh * 0.6, z.x + 7, yy + 20); c.fill();
        }
        break;
      }
      case 'meteor':
        c.strokeStyle = 'rgba(255,60,30,0.6)'; c.lineWidth = 3; c.setLineDash([12, 10]);
        circle(c, z.x, z.y, z.r); c.stroke(); c.setLineDash([]);
        break;
      case 'blizzard':
        c.fillStyle = 'rgba(220,245,255,0.3)'; circle(c, z.x, z.y, z.r); c.fill();
        c.fillStyle = '#fff';
        for (let i = 0; i < 18; i++) {
          const ang = t * 2 + i, rr = (i * 37 % z.r);
          circle(c, z.x + Math.cos(ang) * rr, z.y + Math.sin(ang) * rr * 0.7, 2.5); c.fill();
        }
        break;
      case 'spikes':
        c.fillStyle = 'rgba(120,90,50,0.3)'; circle(c, z.x, z.y, z.r); c.fill();
        for (let i = 0; i < 12; i++) {
          const ang = i * 2.4, rr = (i * 41) % z.r, sx = z.x + Math.cos(ang) * rr, sy = z.y + Math.sin(ang) * rr * 0.6;
          const hgt = 18 + Math.abs(Math.sin(t * 4 + i)) * 14;
          c.fillStyle = '#8b6b45'; c.beginPath(); c.moveTo(sx - 9, sy); c.lineTo(sx, sy - hgt); c.lineTo(sx + 9, sy); c.fill();
          c.fillStyle = '#b08b5f'; c.beginPath(); c.moveTo(sx - 2, sy); c.lineTo(sx, sy - hgt); c.lineTo(sx + 4, sy); c.fill();
        }
        break;
      case 'icewall': {
        const top = FY0 - 10, h = FY1 - FY0 + 30;
        c.fillStyle = 'rgba(180,235,255,0.75)'; c.fillRect(z.x - z.w / 2, top, z.w, h);
        c.strokeStyle = '#e8fbff'; c.lineWidth = 3; c.strokeRect(z.x - z.w / 2, top, z.w, h);
        for (let yy = top; yy < top + h; yy += 40) { c.fillStyle = '#d8f6ff'; diamond(c, z.x, yy + 20, 12, 18); c.fill(); }
        c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(z.x - 30, top - 14, 60, 7);
        c.fillStyle = '#7fd8ff'; c.fillRect(z.x - 30, top - 14, 60 * Math.max(0, z.hp / z.max), 7);
        break;
      }
      case 'mine':
        c.fillStyle = '#333'; circle(c, z.x, z.y, 11); c.fill();
        c.fillStyle = '#666'; c.fillRect(z.x - 13, z.y - 2, 26, 4);
        c.fillStyle = Math.sin(t * 10 + z.x) > 0 ? '#ff3b3b' : '#661111'; circle(c, z.x, z.y - 3, 3.5); c.fill();
        break;
    }
    c.restore();
  }

  /* ---------------------------------------------------------
     ÇAĞRILAN YARDIMCILAR (taret, drone, golem, anka)
     --------------------------------------------------------- */
  function drawSummon(c, m, t) {
    c.save();
    const fade = Math.min(1, m.t * 2); c.globalAlpha = fade;
    if (m.k === 'turret') {
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(m.x, m.y + 6, 26, 8, 0, 0, TAU); c.fill();
      c.fillStyle = '#5a5f68'; roundRect(c, m.x - 20, m.y - 18, 40, 22, 5); c.fill();
      c.fillStyle = '#f2b632'; c.fillRect(m.x - 20, m.y - 4, 40, 5);
      c.save(); c.translate(m.x, m.y - 20); c.rotate(m.ang || 0);
      c.fillStyle = '#3c4048'; c.fillRect(0, -5, 30, 10); c.restore();
      c.fillStyle = '#7a808a'; circle(c, m.x, m.y - 20, 12); c.fill();
      c.fillStyle = '#7af7ff'; circle(c, m.x, m.y - 20, 4); c.fill();
      bar(c, m.x, m.y + 14, 40, m.t / m.max, '#ffe17a');
    } else if (m.k === 'drone') {
      c.fillStyle = 'rgba(0,0,0,0.15)'; c.beginPath(); c.ellipse(m.x, m.y + 80, 22, 6, 0, 0, TAU); c.fill();
      c.strokeStyle = '#333'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(m.x - 24, m.y - 8); c.lineTo(m.x + 24, m.y - 8); c.stroke();
      for (const dx of [-24, 24]) { c.fillStyle = 'rgba(200,200,200,0.6)'; c.beginPath(); c.ellipse(m.x + dx, m.y - 12, 14 * Math.abs(Math.sin(t * 30)), 3, 0, 0, TAU); c.fill(); }
      c.fillStyle = '#4a4f58'; roundRect(c, m.x - 14, m.y - 10, 28, 16, 6); c.fill();
      c.fillStyle = '#7af7ff'; circle(c, m.x - 6, m.y - 2, 4); c.fill();
    } else if (m.k === 'golem') {
      const pun = m.anim > 0 ? 18 : 0;
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(m.x, m.y + 30, 50, 12, 0, 0, TAU); c.fill();
      c.fillStyle = '#7d7466'; roundRect(c, m.x - 32, m.y - 50, 64, 76, 14); c.fill();
      c.fillStyle = '#8f8676'; circle(c, m.x, m.y - 64, 24); c.fill();
      c.fillStyle = '#5cd35f'; c.fillRect(m.x - 12, m.y - 70, 8, 6); c.fillRect(m.x + 6, m.y - 70, 8, 6);
      c.fillStyle = '#6b6357'; roundRect(c, m.x + 24 + pun, m.y - 30, 30, 22, 8); c.fill();
      roundRect(c, m.x - 50, m.y - 30, 24, 40, 8); c.fill();
      c.fillStyle = '#3e9b45'; c.beginPath(); c.ellipse(m.x - 18, m.y - 46, 10, 5, -0.4, 0, TAU); c.fill();
      bar(c, m.x, m.y - 98, 70, m.hp / m.maxHp, '#5cd35f');
    } else if (m.k === 'phoenix') {
      const fl = Math.sin(t * 14) * 0.6;
      c.translate(m.x, m.y); c.scale(m.dir, 1);
      c.fillStyle = 'rgba(255,140,30,0.3)'; circle(c, 0, 0, 46); c.fill();
      c.fillStyle = '#ff5a1a';
      c.beginPath(); c.moveTo(-10, 0); c.lineTo(-40, -30 * (1 + fl)); c.lineTo(-6, -8); c.fill();
      c.beginPath(); c.moveTo(-10, 0); c.lineTo(-40, 26 * (1 - fl)); c.lineTo(-6, 8); c.fill();
      c.fillStyle = '#ffb347'; c.beginPath(); c.ellipse(0, 0, 24, 12, 0, 0, TAU); c.fill();
      c.fillStyle = '#ffd23f'; circle(c, 20, -6, 9); c.fill();
      c.fillStyle = '#ff8a2a'; c.beginPath(); c.moveTo(28, -6); c.lineTo(38, -3); c.lineTo(28, 0); c.fill();
      c.fillStyle = '#222'; circle(c, 22, -8, 2); c.fill();
    }
    c.restore();
  }

  function bar(c, x, y, w, f, col) {
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(x - w / 2 - 1, y - 1, w + 2, 7);
    c.fillStyle = col; c.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, f)), 5);
  }

  /* ---------------------------------------------------------
     ANA ÇİZİM FONKSİYONU
     --------------------------------------------------------- */
  KK.render = function (c) {
    if (!bgCanvas) buildBackground();
    const t = G.time;
    c.save();
    // ekran sarsıntısı
    if (G.shake > 0) c.translate((Math.random() - 0.5) * G.shake * 24, (Math.random() - 0.5) * G.shake * 24);
    c.drawImage(bgCanvas, 0, 0);

    // duvar hasar görünümü (çatlaklar, kırmızı parlama)
    if (G.wall) {
      const f = G.wall.hp / G.wall.max;
      if (f < 0.6) {
        c.strokeStyle = 'rgba(40,30,20,0.7)'; c.lineWidth = 3;
        const n = Math.floor((1 - f) * 10);
        for (let i = 0; i < n; i++) {
          const y = FY0 - 40 + i * 47 % (H - FY0);
          c.beginPath(); c.moveTo(WALL_X - 50, y); c.lineTo(WALL_X - 30, y + 14); c.lineTo(WALL_X - 40, y + 30); c.lineTo(WALL_X - 15, y + 44); c.stroke();
        }
      }
      if (G.wall.hurt > 0) { c.fillStyle = 'rgba(255,40,40,0.25)'; c.fillRect(WALL_X - 60, FY0 - 70, 72, H); }
    }

    // bölgeler (yerde olanlar)
    for (const z of G.zones) drawZone(c, z, t);

    // derinlik sırası: yukarıdakiler önce çizilir
    const list = G.enemies.slice().sort((a, b) => (a.fly ? 1e4 : 0) + a.y - ((b.fly ? 1e4 : 0) + b.y));
    for (const m of G.summons) if (m.k === 'turret' || m.k === 'golem') drawSummon(c, m, t);
    for (const e of list) drawEnemy(c, e, t);

    // kahraman
    if (G.hero) {
      KK.drawHero(c, G.hero.x, G.hero.y, 1.25, G.save.cls, G.save.hero, t,
        { anim: G.hero.anim, hurt: G.hero.hurt > 0, down: G.hero.down > 0 });
      // Kartal Gözü aurası
      if (G.buffs.eagle > 0) {
        c.strokeStyle = 'rgba(120,255,120,' + (0.4 + Math.sin(t * 8) * 0.2) + ')'; c.lineWidth = 4;
        circle(c, G.hero.x, G.hero.y - 80, 95); c.stroke();
      }
    }

    for (const m of G.summons) if (m.k === 'drone' || m.k === 'phoenix') drawSummon(c, m, t);
    for (const p of G.projs) drawProj(c, p, t);
    // düşman okları
    for (const p of G.eprojs) {
      c.save(); c.translate(p.x, p.y); c.rotate(Math.atan2(p.vy, p.vx));
      if (p.big) { c.fillStyle = p.color; circle(c, 0, 0, 12); c.fill(); c.fillStyle = '#fff'; circle(c, 3, 0, 4); c.fill(); }
      else { c.strokeStyle = '#6b4a2b'; c.lineWidth = 2; c.beginPath(); c.moveTo(-14, 0); c.lineTo(8, 0); c.stroke(); c.fillStyle = p.color; c.beginPath(); c.moveTo(12, 0); c.lineTo(5, -4); c.lineTo(5, 4); c.fill(); }
      c.restore();
    }

    // efektler
    for (const f of G.fx) {
      const a = Math.max(0, f.life / f.max);
      if (f.k === 'p') { c.globalAlpha = a; c.fillStyle = f.color; c.fillRect(f.x - f.size / 2, f.y - f.size / 2, f.size, f.size); }
      else if (f.k === 'ring') { c.globalAlpha = a; c.strokeStyle = f.color; c.lineWidth = f.thick || 4; circle(c, f.x, f.y, f.r); c.stroke(); }
      else if (f.k === 'flash') { c.globalAlpha = a * 0.5; c.fillStyle = f.color; c.fillRect(0, 0, W, H); }
    }
    c.globalAlpha = 1;

    // hedef işareti (oyuncunun dokunduğu yer)
    if (G.focus) {
      c.strokeStyle = 'rgba(255,255,255,' + Math.min(1, G.focus.t) + ')'; c.lineWidth = 3;
      circle(c, G.focus.x, G.focus.y, 26 + Math.sin(t * 8) * 4); c.stroke();
      c.beginPath(); c.moveTo(G.focus.x - 38, G.focus.y); c.lineTo(G.focus.x - 16, G.focus.y); c.moveTo(G.focus.x + 16, G.focus.y); c.lineTo(G.focus.x + 38, G.focus.y);
      c.moveTo(G.focus.x, G.focus.y - 38); c.lineTo(G.focus.x, G.focus.y - 16); c.moveTo(G.focus.x, G.focus.y + 16); c.lineTo(G.focus.x, G.focus.y + 38); c.stroke();
    }

    // uçan yazılar
    c.textAlign = 'center';
    for (const tx of G.texts) {
      c.globalAlpha = Math.min(1, tx.life / tx.max * 2);
      c.font = `900 ${tx.size}px "Baloo 2", system-ui, sans-serif`;
      c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.strokeText(tx.txt, tx.x, tx.y);
      c.fillStyle = tx.color; c.fillText(tx.txt, tx.x, tx.y);
    }
    c.globalAlpha = 1;
    c.restore();
  };
})();
