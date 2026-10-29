/* =========================================================
   KALE KAHRAMANLARI - Ses Efektleri
   Dosya gerekmez; sesler WebAudio ile anında üretilir.
   ========================================================= */
(function () {
  let ctx = null;
  let last = {};                         // aynı sesin çok sık çalmasını engellemek için
  KK.soundOn = localStorage.getItem('kk_sound') !== '0';

  // Tarayıcılar sesi ancak bir dokunuştan sonra açar
  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  window.addEventListener('pointerdown', ensure, { once: false });

  // Tek bir "bip" sesi: frekans, süre, dalga tipi, ses seviyesi, frekans kayması
  function tone(f, d, type, vol, slide) {
    const a = ctx, t = a.currentTime;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
    g.gain.setValueAtTime(vol || 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + d + 0.02);
  }

  // Patlama sesi için gürültü
  function noise(d, vol) {
    const a = ctx, len = Math.floor(a.sampleRate * d);
    const buf = a.createBuffer(1, len, a.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = a.createBufferSource(), g = a.createGain();
    s.buffer = buf; g.gain.value = vol || 0.08;
    s.connect(g); g.connect(a.destination); s.start();
  }

  // Ses isimleri -> nasıl çalınacağı (min: en az kaç saniyede bir)
  const SOUNDS = {
    shoot: { min: 0.09, f: () => tone(700, 0.06, 'triangle', 0.025, 0.6) },
    kill:  { min: 0.05, f: () => tone(300, 0.08, 'square', 0.03, 0.5) },
    skill: { min: 0.1,  f: () => { tone(400, 0.2, 'sawtooth', 0.04, 2); } },
    boom:  { min: 0.08, f: () => { noise(0.25, 0.09); tone(120, 0.25, 'sine', 0.08, 0.4); } },
    item:  { min: 0.2,  f: () => { tone(880, 0.1, 'triangle', 0.06); setTimeout(() => tone(1320, 0.18, 'triangle', 0.06), 90); } },
    level: { min: 0.3,  f: () => { [523, 659, 784, 1046].forEach((n, i) => setTimeout(() => tone(n, 0.15, 'triangle', 0.06), i * 90)); } },
    wave:  { min: 0.5,  f: () => { tone(220, 0.3, 'sawtooth', 0.04, 1.5); } },
    clear: { min: 0.5,  f: () => { [659, 784, 988].forEach((n, i) => setTimeout(() => tone(n, 0.14, 'square', 0.04), i * 100)); } },
    coin:  { min: 0.05, f: () => tone(1200, 0.08, 'square', 0.03, 1.4) },
    hurt:  { min: 0.3,  f: () => tone(200, 0.3, 'sawtooth', 0.06, 0.3) },
    lose:  { min: 1,    f: () => { [392, 330, 262, 196].forEach((n, i) => setTimeout(() => tone(n, 0.25, 'triangle', 0.07), i * 200)); } },
    click: { min: 0.03, f: () => tone(900, 0.04, 'square', 0.03) },
    buy:   { min: 0.1,  f: () => { tone(988, 0.08, 'square', 0.04); setTimeout(() => tone(1318, 0.12, 'square', 0.04), 70); } },
  };

  KK.sfx = function (name) {
    if (!KK.soundOn || !ensure()) return;
    const s = SOUNDS[name]; if (!s) return;
    const now = performance.now() / 1000;
    if (last[name] && now - last[name] < s.min) return;
    last[name] = now;
    try { s.f(); } catch (e) { }
  };

  KK.toggleSound = function () {
    KK.soundOn = !KK.soundOn;
    try { localStorage.setItem('kk_sound', KK.soundOn ? '1' : '0'); } catch (e) { }
    return KK.soundOn;
  };
})();
