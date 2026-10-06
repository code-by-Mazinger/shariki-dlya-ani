'use strict';
// Отрисовка, касания, звук, альбом. Логика уровней — logic.js (SH).
(() => {
const { CAP, CH1, LEVELS, canMove, apply, doneTube, won, makeLevel, paintingOf, isMix } = SH;
const $ = id => document.getElementById(id);
const ls = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch (e) { return null; } };

// Конфетные цвета шариков: светлый и тёмный край для объёма. У каждого цвета своя нота пентатоники — любые сочетания звучат мягко.
// Порядок — чтобы соседние цвета сильно различались: на первых уровнях (3–4 цвета) нет похожих оттенков
const COLORS = [['#ff7eb3', '#d63a7d'], ['#7ff0c2', '#25ad7e'], ['#c09bff', '#7d50d8'], ['#ffe47a', '#d4ad22'], ['#74ddf3', '#1f9fc2'],
  ['#ffbb73', '#e08326'], ['#ee8cfa', '#b13bcf'], ['#8fb2ff', '#4269d6'], ['#ff9a8a', '#e0564a'], ['#fff6ff', '#c7aed8'],
  // глава 2: основные (красный, жёлтый, синий) и смешанные (оранжевый, зелёный, фиолетовый) — чистые, «как краски»
  ['#ff5468', '#c81e3a'], ['#ffdc3c', '#d9a500'], ['#3f86ff', '#1a4fc9'], ['#ff9530', '#d8600a'], ['#4fd36e', '#1f9a3e'], ['#a45cf0', '#6a2bbf']];
const NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0,
  220.0, 196.0, 164.81, 1046.5, 1174.66, 1318.51];                                // глава 2: основные — ниже, смешанные — выше (всё в пентатонике до)
// Альбом блюд (Аня любит готовить): по 3 уровня на блюдо. Картинки — img/food/01–15.jpg, источники — img/CREDITS.md
const PAINT = [
  ['Панкейки с ягодами и мёдом', 'Тесто не взбивайте до гладкости: пара комочков — и панкейки получатся пышными.'],
  ['Яичница с грибами', 'Грибы солят в самом конце: соль вытягивает сок, и они тушатся вместо того, чтобы зарумяниться.'],
  ['Тост с авокадо и яйцом', 'Капля лимонного сока — и авокадо не потемнеет.'],
  ['Тыквенный крем-суп', 'Тыкву лучше запечь в духовке, а не варить: вкус станет глубже и слаще.'],
  ['Паста карбонара', 'В настоящей карбонаре нет сливок: соус — это желтки, тёртый пекорино и немного воды от пасты.'],
  ['Пицца «Маргарита»', 'Томаты, моцарелла и базилик — цвета флага Италии. По легенде, пиццу назвали в честь королевы Маргариты.'],
  ['Греческий салат', 'В Греции его не перемешивают: фету кладут сверху целым куском и поливают оливковым маслом.'],
  ['Сырники', 'Чем суше творог, тем меньше нужно муки — и тем нежнее сырники.'],
  ['Роллы и суши', 'Рис заправляют рисовым уксусом с сахаром и солью, пока он ещё тёплый.'],
  ['Рамен', 'Яйцо варят 6–7 минут и маринуют в соевом соусе с мирином — желток становится как джем.'],
  // глава 2 — смешение
  ['Лазанья', 'После духовки дайте лазанье постоять минут 15 — тогда она режется ровными кусками.'],
  ['Макаруны', 'Перед духовкой макаруны подсушивают, пока сверху не появится корочка, — тогда снизу вырастает кружевная «юбочка».'],
  ['Черничный чизкейк', 'Чтобы чизкейк не треснул, его пекут на водяной бане и остужают в приоткрытой духовке.'],
  ['Тарт с персиками', 'Тесто для тарта охлаждают перед раскаткой — тогда оно получается рассыпчатым.'],
  ['Клубничный торт', 'Клубнику моют прямо перед украшением и кладут на торт в последний момент — иначе она пустит сок.']];
const img = p => `img/food/${String(p + 1).padStart(2, '0')}.jpg`;

let L = Math.max(1, +ls('sh_level') || 1), T = [], hist = [], sel = -1, busy = false, order = [], broken = [];   // broken[i] — цвет треснувшей пробирки
const soundOn = () => ls('sh_sound') !== '0';

// ─── звук: колокольчик через мягкую реверберацию (фонового гула нет — убран по просьбе). Контекст — по первому касанию ───
let ac = null, out = null, rev = null;
function audio() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    out = ac.createGain(); out.gain.value = soundOn() ? 0.9 : 0; out.connect(ac.destination);
    rev = ac.createConvolver(); const len = ac.sampleRate * 2.6, b = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rev.buffer = b; const wet = ac.createGain(); wet.gain.value = 0.35; rev.connect(wet); wet.connect(out);
  }
  if (ac.state === 'suspended') ac.resume();
}
function bell(f, t = 0, dur = 1.4, v = 0.22) {
  if (!ac || !isFinite(f)) return; const t0 = ac.currentTime + t, g = ac.createGain();   // сбой звука не должен останавливать игру
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  for (const [m, a] of [[1, 1], [2.001, 0.28], [3.01, 0.08]]) { const o = ac.createOscillator(), k = ac.createGain(); o.type = 'sine'; o.frequency.value = f * m; k.gain.value = a; o.connect(k); k.connect(g); o.start(t0); o.stop(t0 + dur + 0.05); }
  g.connect(out); g.connect(rev);
}
function tick() { bell(1800, 0, 0.08, 0.05); }
function crackSnd() {                                                              // треск стекла: короткий шум сверху + звон осколков
  if (!ac) return; const t0 = ac.currentTime, n = Math.floor(ac.sampleRate * 0.25), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = b; f.type = 'highpass'; f.frequency.value = 2500; g.gain.value = 0.3;
  s.connect(f); f.connect(g); g.connect(out); g.connect(rev); s.start(t0);
  for (let k = 0; k < 4; k++) bell(2200 + Math.random() * 2400, 0.03 + k * 0.05, 0.5, 0.05);
}
function plop() {                                                                  // шарик упал в кастрюлю
  if (!ac) return; const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(520, t0); o.frequency.exponentialRampToValueAtTime(140, t0 + 0.12);
  g.gain.setValueAtTime(0.16, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16); o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 0.2);
}
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
// трезвучие i, i+2, i+4 — не дальше конца гаммы (цвет 9 выходил за конец и ронял проверку победы)
function chord(c) { const i = Math.max(0, Math.min(PENTA.length - 5, PENTA.indexOf(NOTES[c]))); [0, 2, 4].forEach((s, k) => bell(PENTA[i + s], k * 0.09, 1.8, 0.16)); }
function melody() { order.forEach((c, k) => bell(NOTES[c], k * 0.2, 1.2, 0.2)); const e = order.length * 0.2 + 0.1; [0, 4, 7].forEach((s, k) => bell(NOTES[0] * Math.pow(2, s / 12) * 2, e + k * 0.05, 2.4, 0.13)); }
for (const ev of ['pointerup', 'touchend']) addEventListener(ev, audio, { passive: true });

// ─── фон: мягкие светящиеся пятна и мерцающие блёстки; вспышки блёсток при собранной пробирке ───
const fx = $('fx'), g = fx.getContext('2d'); let FW = 0, FH = 0, dpr = 1;
const bokeh = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), r: 40 + Math.random() * 90, v: 0.00004 + Math.random() * 0.00008, h: [330, 290, 260, 20][Math.floor(Math.random() * 4)] }));
const stars = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), p: Math.random() * 6.28, s: 0.6 + Math.random() * 1.4 }));
let sparks = [];
function fit() { dpr = Math.min(devicePixelRatio || 1, 2); FW = innerWidth; FH = innerHeight; fx.width = fw.width = FW * dpr; fx.height = fw.height = FH * dpr; layout(); }
function drawFx(t) {
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, FW, FH);
  for (const b of bokeh) { b.y -= b.v * 16; if (b.y < -0.2) { b.y = 1.2; b.x = Math.random(); }
    const x = b.x * FW, y = b.y * FH, gr = g.createRadialGradient(x, y, 0, x, y, b.r);
    gr.addColorStop(0, `hsla(${b.h},100%,92%,.55)`); gr.addColorStop(1, `hsla(${b.h},100%,92%,0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, b.r, 0, 7); g.fill(); }
  for (const s of stars) { const a = 0.35 + 0.65 * Math.max(0, Math.sin(t / 900 + s.p)); star(s.x * FW, s.y * FH, s.s * 2.2, `rgba(255,255,255,${a})`); }
  sparks = sparks.filter(p => (p.life -= 1) > 0);
  for (const p of sparks) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; star(p.x, p.y, p.s * (p.life / 50), p.c); }
  drawFall(t); drawFw(); tiltStep(); requestAnimationFrame(drawFx);
}
function star(x, y, r, c) { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
function burst(el, col) { const r = el.getBoundingClientRect(); for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, v = 1 + Math.random() * 3.5;
  sparks.push({ x: r.left + r.width / 2, y: r.top + r.height * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 50, s: 4 + Math.random() * 5, c: Math.random() < 0.5 ? col : '#fff' }); } }

// ─── фейерверк, когда блюдо открылось целиком: свой холст поверх окон ───
const fw = $('fw'), h = fw.getContext('2d'); let rockets = [], flecks = [], fwOn = false;
function fireworks() { for (let i = 0; i < 7; i++) setTimeout(() => rockets.push({ x: FW * (0.15 + Math.random() * 0.7), y: FH + 10, ty: FH * (0.1 + Math.random() * 0.3), c: COLORS[Math.floor(Math.random() * 10)] }), 200 + i * 330); }
function drawFw() {
  if (!rockets.length && !flecks.length) { if (fwOn) { h.setTransform(1, 0, 0, 1, 0, 0); h.clearRect(0, 0, fw.width, fw.height); fwOn = false; } return; }
  fwOn = true; h.setTransform(dpr, 0, 0, dpr, 0, 0); h.clearRect(0, 0, FW, FH);
  rockets = rockets.filter(r => { r.y -= 11; h.strokeStyle = 'rgba(255,255,255,.9)'; h.lineWidth = 3; h.beginPath(); h.moveTo(r.x, r.y); h.lineTo(r.x, r.y + 18); h.stroke();
    if (r.y > r.ty) return true;
    for (let i = 0; i < 70; i++) { const a = Math.random() * 6.28, v = 1.5 + Math.random() * 4.5;
      flecks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 60 + Math.random() * 30, c: Math.random() < 0.2 ? '#fff' : r.c[Math.random() < 0.5 ? 0 : 1] }); }
    bell(NOTES[5 + Math.floor(Math.random() * 5)], 0, 1.6, 0.06); return false; });
  flecks = flecks.filter(p => (p.life -= 1) > 0);
  for (const p of flecks) { p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy = p.vy * 0.96 + 0.07;
    h.globalAlpha = Math.min(1, p.life / 40); h.fillStyle = p.c; h.beginPath(); h.arc(p.x, p.y, 3, 0, 7); h.fill(); }
  h.globalAlpha = 1;
}

// ─── наклон телефона: шарики перекатываются к нижнему краю пробирки, блик смещается (свет «в комнате» стоит на месте) ───
// gamma — наклон влево-вправо (как есть: телефон набок — шарики к нижней стенке). beta — к себе/от себя: держат по-разному,
// поэтому её «ноль» медленно подстраивается под то, как держат сейчас.
let tx = 0, ty = 0, gx = 0, by = 0, beta0 = null;
function onTilt(e) { if (e.gamma == null || e.beta == null) return;
  if (beta0 === null) beta0 = e.beta; beta0 += (e.beta - beta0) * 0.01;
  gx = Math.max(-1, Math.min(1, e.gamma / 25)); by = Math.max(-1, Math.min(1, (e.beta - beta0) / 25)); }
function askTilt() {                                                               // iPhone спрашивает разрешение — только из нажатия (кнопка «Старт»)
  const D = window.DeviceOrientationEvent; if (!D) return;
  if (typeof D.requestPermission === 'function') D.requestPermission().then(s => { if (s === 'granted') addEventListener('deviceorientation', onTilt); }).catch(() => {});
  else addEventListener('deviceorientation', onTilt);
}
function tiltStep() { const nx = tx + (gx - tx) * 0.15, ny = ty + (by - ty) * 0.15; if (Math.abs(nx - tx) + Math.abs(ny - ty) < 0.002) return;
  tx = nx; ty = ny; board.style.setProperty('--tx', tx.toFixed(3)); board.style.setProperty('--ty', ty.toFixed(3)); }

// ─── собранная пробирка трескается, шарики скатываются в кастрюлю внизу; кастрюля варит «суп» из собранных цветов ───
const pot = $('pot');
function potUpdate() { const cs = broken.filter(c => c !== undefined);
  if (!cs.length) { pot.style.removeProperty('--soup'); pot.classList.remove('hot'); return; }
  const rgb = cs.map(c => COLORS[c][0].match(/\w\w/g).map(h => parseInt(h, 16))), avg = [0, 1, 2].map(k => Math.round(rgb.reduce((s, v) => s + v[k], 0) / rgb.length));
  pot.style.setProperty('--soup', `rgb(${avg})`); pot.classList.add('hot'); }
function crackTube(b, c) {
  broken[b] = c; T[b] = [];                                                        // логика сразу: пробирка пуста и закрыта для ходов
  const tb = tubeEl(b), balls = [...tb.querySelectorAll('.ball')].reverse(), pr = pot.getBoundingClientRect();
  setTimeout(() => {
    crackSnd(); catJump(); tb.classList.remove('done'); tb.classList.add('cracked');
    balls.forEach((ball, k) => { const r = ball.getBoundingClientRect(), fly = ball.cloneNode(true); ball.remove();
      Object.assign(fly.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', bottom: 'auto', margin: '0', width: r.width + 'px', height: r.height + 'px', zIndex: 3, transform: '', translate: '0 0' });
      document.body.appendChild(fly);
      const ex = pr.left + pr.width * (0.35 + Math.random() * 0.3) - r.left - r.width / 2, ey = pr.top + pr.height * 0.3 - r.top - r.height / 2, up = Math.min(ey, 0) - tw;
      const kf = Array.from({ length: 11 }, (_, i) => { const t = i / 10, x = ex * t, y = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * up + t * t * ey;   // дуга: подпрыгнул и покатился вниз
        return { transform: `translate(${x}px,${y}px) rotate(${(ex >= 0 ? 1 : -1) * t * 540}deg) scale(${1 - t * 0.45})` }; });
      fly.animate(kf, { duration: 800, delay: k * 120, easing: 'linear', fill: 'forwards' }).onfinish = () => {
        fly.remove(); plop(); potUpdate(); pot.classList.remove('bump'); void pot.offsetWidth; pot.classList.add('bump'); burst(pot, COLORS[c][0]);
        if (k === balls.length - 1) catTaste(won(T) ? () => { kitty.classList.add('yum'); catMood('happy', 4000); purr(); hearts(); say('Вкусно! 💕', 1600); setTimeout(win, 1000); } : null); };
    });
  }, 380);
}

// ─── котик на поле: моргает, засыпает без дела, вздрагивает от треска, мурчит, если погладить; раз за уровень — подсказка ───
const kitty = $('kitty'), bubble = $('bubble'); let nap = 0, moodT = 0, hintUsed = false;
function catMood(m, ms) { kitty.classList.remove('happy', 'sleep'); if (m) kitty.classList.add(m); clearTimeout(moodT); if (ms) moodT = setTimeout(() => kitty.classList.remove(m), ms); }
function catJump() { if (kitty.classList.contains('taste')) return; kitty.classList.remove('jump');   // у кастрюли не вздрагивает — иначе «телепорт» на место
  void kitty.offsetWidth; kitty.classList.add('jump'); }
function wake() { if (kitty.classList.contains('sleep')) { catMood(''); catJump(); }
  clearTimeout(nap); nap = setTimeout(() => { catMood('sleep'); bubble.hidden = true; }, 25000); }
addEventListener('pointerdown', wake, true);
function say(t, ms) { bubble.textContent = t; bubble.hidden = false; clearTimeout(say.t); say.t = setTimeout(() => { bubble.hidden = true; }, ms); }
function purr() {                                                                  // мурчание: низкий шум, пульсирующий ~24 раза в секунду
  if (!ac) return; const n = Math.floor(ac.sampleRate * 0.9), b = ac.createBuffer(1, n, ac.sampleRate), x = b.getChannelData(0); let w = 0;
  for (let i = 0; i < n; i++) { w = (w + 0.02 * (Math.random() * 2 - 1)) / 1.02; x[i] = w * 3.5 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 24 * i / ac.sampleRate)) * Math.sin(Math.PI * i / n); }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = b; f.type = 'lowpass'; f.frequency.value = 400; g.gain.value = 0.5;
  s.connect(f); f.connect(g); g.connect(out); s.start();
}
function catTaste(then) {                                                         // подходит к кастрюле и пробует блюдо
  const k = kitty.getBoundingClientRect(), p = pot.getBoundingClientRect();
  kitty.style.setProperty('--to', Math.max(0, p.left - k.right + 22) + 'px');
  kitty.classList.remove('taste', 'jump', 'yum'); void kitty.offsetWidth; kitty.classList.add('taste'); catMood('happy', 1700);
  setTimeout(() => { bell(659.25, 0, 0.5, 0.08); bell(880, 0.14, 0.7, 0.08); pot.classList.remove('bump'); void pot.offsetWidth; pot.classList.add('bump'); say('Мм! 😋', 1100); }, 650);
  setTimeout(() => { kitty.classList.remove('taste'); if (then) then(); }, 1600);
}
function hearts() { const r = kitty.getBoundingClientRect();
  for (let k = 0; k < 3; k++) { const h = document.createElement('span'); h.className = 'heart'; h.textContent = '💗';
    Object.assign(h.style, { left: r.left + r.width * (0.15 + k * 0.25) + 'px', top: r.top + 'px', animationDelay: k * 0.15 + 's' });
    document.body.appendChild(h); setTimeout(() => h.remove(), 1800); } }
kitty.addEventListener('pointerdown', e => { e.preventDefault(); audio(); purr(); catMood('happy', 1600); hearts();
  if (!hintUsed && !won(T)) say('Подсказать? 🐾', 4000); });
bubble.addEventListener('pointerdown', e => { e.preventDefault(); if (bubble.textContent.startsWith('Подсказать')) hint(); else bubble.hidden = true; });
function hint() {                                                                  // треснувшие пробирки для решателя — снова собранные (их не трогают)
  if (busy) return; bubble.hidden = true;
  if (sel >= 0) { lift(false); tubeEl(sel).classList.remove('sel'); sel = -1; }
  const mv = SH.solvable(T.map((t, i) => broken[i] !== undefined ? Array(CAP).fill(broken[i]) : t.slice()), 60000);
  if (!Array.isArray(mv)) { say('Хм… не вижу хода. Попробуй отменить ↶', 3500); return; }
  hintUsed = true; catMood('happy', 1200); tick();
  tubeEl(mv[0]).classList.add('hint'); setTimeout(() => { const t = tubeEl(mv[1]); if (t && board.querySelector('.hint')) t.classList.add('hint2'); }, 500);
}

// ─── праздники по календарю: снег, сердечки, лепестки, конфетти; котик в шапочке; поздравление на старте.
// Посмотреть заранее: ?holiday=ny (Новый год) | val (14 февраля) | w8 (8 Марта) | bd (день рождения)
const BDAY = null;                                                                 // день рождения Ани 'ММ-ДД' — пришлёт Георгий
const HOLI = { bd: [BDAY, BDAY, 'С днём рождения, Аня! 🎂'], ny: ['12-25', '01-08', 'С Новым годом! ❄️'], val: ['02-13', '02-15', 'С Днём святого Валентина! 💕'], w8: ['03-07', '03-09', 'С 8 Марта! 🌷'] };
function holiday() {
  const q = new URLSearchParams(location.search).get('holiday'); if (q && q in HOLI) return q;
  const d = new Date(), md = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  for (const k in HOLI) { const [a, b] = HOLI[k]; if (a && (a <= b ? md >= a && md <= b : md >= a || md <= b)) return k; }   // Новый год — через смену года
  return '';
}
const HOL = holiday(); if (HOL) { document.body.classList.add('h-' + HOL); $('greet').textContent = HOLI[HOL][2]; }
const fall = HOL ? Array.from({ length: 36 }, () => ({ x: Math.random(), y: Math.random(), v: 0.0006 + Math.random() * 0.0012, s: 3 + Math.random() * 4, p: Math.random() * 6.28,
  c: ['#ff7eb3', '#ffe066', '#7fd8ff', '#8ef0c0', '#c09bff'][Math.floor(Math.random() * 5)] })) : [];
function drawFall(t) {
  for (const f of fall) { f.y += f.v; if (f.y > 1.05) { f.y = -0.05; f.x = Math.random(); }
    g.save(); g.translate(f.x * FW + Math.sin(t / 1100 + f.p) * 18, f.y * FH); g.rotate(t / 900 + f.p);
    if (HOL === 'ny') { g.fillStyle = '#fff'; g.strokeStyle = 'rgba(155,130,210,.35)'; g.beginPath(); g.arc(0, 0, f.s * 0.6, 0, 7); g.fill(); g.stroke(); }
    else if (HOL === 'val') { const s = f.s * 1.6; g.fillStyle = 'rgba(255,92,138,.8)'; g.beginPath(); g.moveTo(0, s * 0.3);
      g.bezierCurveTo(-s, -s * 0.4, -s * 0.4, -s, 0, -s * 0.35); g.bezierCurveTo(s * 0.4, -s, s, -s * 0.4, 0, s * 0.3); g.fill(); }
    else if (HOL === 'w8') { g.fillStyle = 'rgba(255,150,190,.85)'; g.beginPath(); g.ellipse(0, 0, f.s * 1.2, f.s * 0.6, 0, 0, 7); g.fill(); }
    else { g.fillStyle = f.c; g.fillRect(-f.s / 2, -f.s / 4, f.s * 1.2, f.s / 2); }
    g.restore(); }
}
function birthdaySong() {                                                          // «С днём рождения тебя» — колокольчиками
  const F = { G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99 }; let t = 0.4;
  for (const [n, d] of [['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2], ['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
    ['G4', .75], ['G4', .25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2], ['F5', .75], ['F5', .25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 3]]) { bell(F[n], t, 1.3, 0.16); t += d * 0.36; }
}

// ─── поле: пробирки, раскладка под экран ───
const board = $('board');
let tw = 58;
function layout() {
  const n = T.length; if (!n) return;
  const W = board.clientWidth, H = board.clientHeight; let best = 0, bestRows = 1;
  for (let rows = 1; rows <= 3; rows++) { const per = Math.ceil(n / rows);
    const byW = (W - (per - 1) * 12) / per, byH = (H - (rows - 1) * 24 - 30) / (rows * 3.9 + 0.3);
    const s = Math.min(byW, byH, 66); if (s > best) { best = s; bestRows = rows; } }
  tw = Math.max(30, Math.floor(best)); document.documentElement.style.setProperty('--tw', tw + 'px');
  board.style.maxWidth = (Math.ceil(n / bestRows) * (tw + 14)) + 'px'; board.style.margin = '0 auto'; board.style.width = '100%';
  render();
}
const ballBottom = i => tw * 0.1 + i * tw * 0.86;
function render() {
  board.innerHTML = '';
  T.forEach((t, i) => { const d = document.createElement('div'); d.className = 'tube' + (doneTube(t) && t.length ? ' done' : '') + (broken[i] !== undefined ? ' cracked' : '') + (i === sel ? ' sel' : '');
    if (doneTube(t) && t.length) d.style.setProperty('--glow', COLORS[t[0]][0]); if (broken[i] !== undefined) d.style.setProperty('--glow', COLORS[broken[i]][0]);
    t.forEach((c, k) => d.appendChild(ballEl(c, k)));
    d.addEventListener('pointerdown', e => { e.preventDefault(); tap(i); });
    board.appendChild(d); });
  if (sel >= 0) lift(true);
  $('lvl').textContent = L <= LEVELS ? `Уровень ${L} из ${LEVELS}${L > CH1 ? ' · смешение' : ''}` : `Уровень ${L} · свободная игра`;
}
function ballEl(c, k) { const b = document.createElement('div'); b.className = 'ball'; b.style.setProperty('--c', COLORS[c][0]); b.style.setProperty('--d', COLORS[c][1]); b.style.bottom = ballBottom(k) + 'px'; b.style.setProperty('--ph', -Math.random() * 5 + 's'); return b; }
const tubeEl = i => board.children[i];
function lift(on) { const tb = tubeEl(sel); if (!tb) return; const b = tb.lastElementChild; if (!b) return;
  b.classList.add('lift'); b.style.transform = on ? `translateY(${-(tw * 3.9 - ballBottom(T[sel].length - 1) - tw * 0.78 + tw * 0.55)}px)` : ''; }

function tap(i) {
  if (busy) return; board.querySelectorAll('.hint,.hint2').forEach(t => t.classList.remove('hint', 'hint2'));
  if (sel < 0) { if (T[i].length && !doneTube(T[i])) { sel = i; tubeEl(i).classList.add('sel'); lift(true); tick(); } return; }
  if (i === sel) { lift(false); tubeEl(i).classList.remove('sel'); sel = -1; return; }
  if (broken[i] !== undefined || !canMove(T, sel, i)) { const d = tubeEl(i); d.classList.remove('bad'); void d.offsetWidth; d.classList.add('bad'); bell(196, 0, 0.25, 0.08); return; }
  move(sel, i);
}
function move(a, b) {                                                              // перелёт шарика: FLIP — запомнить, где был, переложить, анимировать
  busy = true; hist.push([T.map(t => t.slice()), broken.slice()]);
  const fromTube = tubeEl(a), ball = fromTube.lastElementChild, r0 = ball.getBoundingClientRect();
  const c = T[a][T[a].length - 1], under = T[b][T[b].length - 1], x = apply(T, a, b);
  fromTube.classList.remove('sel'); sel = -1;
  const toTube = tubeEl(b); ball.classList.remove('lift'); ball.style.transition = 'none'; ball.style.transform = ''; ball.style.bottom = ballBottom(T[b].length - 1) + 'px';
  toTube.appendChild(ball); const r1 = ball.getBoundingClientRect();
  ball.style.transform = `translate(${r0.left - r1.left}px,${r0.top - r1.top}px)`; void ball.offsetWidth;
  ball.style.transition = 'transform .32s cubic-bezier(.3,1.25,.5,1)'; ball.style.transform = '';
  bell(NOTES[c], 0.12, 1.2, 0.18);
  setTimeout(() => {
    busy = false; ball.style.transition = '';
    if (x !== undefined) {                                                         // смешение: два шарика сливаются в один нового цвета
      const host = ball.previousElementSibling; ball.remove();
      host.style.setProperty('--c', COLORS[x][0]); host.style.setProperty('--d', COLORS[x][1]);
      host.classList.remove('pop'); void host.offsetWidth; host.classList.add('pop');
      bell(NOTES[under], 0, 1.0, 0.12); bell(NOTES[x], 0.12, 1.8, 0.2); burst(host, COLORS[x][0]);
    }
    const full = doneTube(T[b]) && T[b].length, col = T[b][0];
    if (full) { toTube.classList.add('done'); toTube.style.setProperty('--glow', COLORS[col][0]); chord(col); burst(toTube, COLORS[col][0]); order.push(col); crackTube(b, col); }
    if (won(T)) { busy = true; setTimeout(() => { if (busy && $('win').hidden) win(); }, 6000); }   // победа: шарики докатятся, котик попробует блюдо — окно откроет crackTube (тут — страховка)
  }, 340);
}
function start() { busy = false; kitty.classList.remove('yum'); T = makeLevel(L); hist = []; sel = -1; order = []; broken = []; potUpdate(); hintUsed = false; bubble.hidden = true; wake(); $('legend').hidden = !isMix(L); layout();
  if (isMix(L) && !ls('sh_mixintro')) { ls('sh_mixintro', 1); $('mixIntro').hidden = false; } }
$('mixGo').onclick = () => { $('mixIntro').hidden = true; tick(); };
$('undo').onclick = () => { if (busy || !hist.length) return; [T, broken] = hist.pop(); sel = -1; render(); potUpdate(); tick(); };
$('restart').onclick = () => { if (busy) return; start(); tick(); };
$('snd').onclick = () => { audio(); const on = !soundOn(); ls('sh_sound', on ? '1' : '0'); if (out) out.gain.value = on ? 0.9 : 0; $('snd').classList.toggle('off', !on); };
$('snd').classList.toggle('off', !soundOn());

// ─── блюда: мозаика закрывает ещё не открытые части (плитки в своём порядке для каждого блюда) ───
const GRID = 6;
function tileOrder(p) { const r = SH.rng(p * 31 + 7), a = Array.from({ length: GRID * GRID }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function cover(cv, p, parts, from = parts, tries = 0) {                           // parts из 3 открыто; from — сколько было (для анимации)
  const box = cv.parentElement, w = box.clientWidth, h = box.clientHeight;
  if (!w || !h) { if (tries < 30) requestAnimationFrame(() => cover(cv, p, parts, from, tries + 1)); return; }   // ещё не на экране — подождать, а не оставить старую мозаику
  cv.width = w * dpr; cv.height = h * dpr; const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ord = tileOrder(p), shown = k => Math.floor(GRID * GRID * k / 3), tw_ = w / GRID, th = h / GRID;
  const draw = a => { c.clearRect(0, 0, w, h);
    ord.forEach((t, idx) => { let al = idx < shown(from) ? 0 : idx < shown(parts) ? 1 - a : 1; if (al <= 0) return;
      const x = (t % GRID) * tw_, y = Math.floor(t / GRID) * th;
      c.globalAlpha = al; const gr = c.createLinearGradient(x, y, x + tw_, y + th); gr.addColorStop(0, '#f9d3e9'); gr.addColorStop(1, '#dcd0ff');
      c.fillStyle = gr; c.fillRect(x - 0.5, y - 0.5, tw_ + 1, th + 1); c.globalAlpha = al * 0.5; c.fillStyle = '#fff'; c.fillRect(x + tw_ * 0.42, y + th * 0.42, tw_ * 0.16, th * 0.16); });
    c.globalAlpha = 1; };
  if (from === parts) { draw(1); return; }
  const t0 = performance.now(), step = t => { const a = Math.min(1, (t - t0) / 1400); draw(a); if (a < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
}
function setPic(box, p, parts, from) { const im = box.querySelector('img'), cv = box.querySelector('canvas');
  const go = () => cover(cv, p, parts, from); if (im.getAttribute('src') !== img(p)) { im.onload = go; im.src = img(p); } else go(); }
const infoHTML = p => `<b>${PAINT[p][0]}</b><br><small>Секрет повара: ${PAINT[p][1]}</small>`;

function win() {
  melody(); const done = L; L++; ls('sh_level', L);
  const { p, part } = paintingOf(done), extra = done > LEVELS;
  $('winT').textContent = extra ? 'Уровень пройден! ✨' : part === 3 ? (done === LEVELS ? 'Альбом собран! 💛' : done === CH1 ? 'Глава 1 пройдена! 💛' : 'Блюдо готово! ✨') : 'Отлично! ✨';
  const pp = extra ? Math.floor(Math.random() * PAINT.length) : p;
  catMood('happy', 4000);
  $('win').hidden = false;                                                         // сначала показать: у скрытого окна нулевой размер, мозаика не нарисуется
  setPic($('winPic'), pp, extra ? 3 : part, extra ? 3 : part - 1);
  if (part === 3 && !extra) fireworks();
  $('winInfo').innerHTML = extra || part === 3 ? infoHTML(pp) + (done === LEVELS ? `<p>Все ${PAINT.length} блюд собраны. Дальше — свободная игра для удовольствия.</p>` : done === CH1 ? '<p>Дальше — глава 2: <b>смешение цветов</b>. Красный + синий = фиолетовый!</p>' : '')
    : `Открыта часть блюда: ${part} из 3.<br><small>Ещё ${3 - part} ${3 - part === 1 ? 'уровень' : 'уровня'} — и оно откроется целиком.</small>`;
}
$('next').onclick = () => { $('win').hidden = true; start(); };
$('winGal').onclick = () => { $('win').hidden = true; start(); gallery(); };

// ─── альбом: 15 блюд, открытые части — по пройденным уровням ───
const partsOf = p => Math.max(0, Math.min(3, (Math.min(L, LEVELS + 1) - 1) - p * 3));   // по 3 уровня на блюдо
function gallery() {
  const n = PAINT.filter((_, p) => partsOf(p) === 3).length;
  $('galSub').textContent = `Открыто блюд: ${n} из ${PAINT.length}`;
  $('grid').innerHTML = PAINT.map((_, p) => `<div class="cell" data-p="${p}"><img alt=""><canvas></canvas>${partsOf(p) === 3 ? `<b>${PAINT[p][0]}</b>` : ''}</div>`).join('');
  $('gallery').hidden = false;
  [...$('grid').children].forEach(cel => { const p = +cel.dataset.p; setPic(cel, p, partsOf(p), partsOf(p)); });
}
$('grid').onclick = e => { const cel = e.target.closest('.cell'); if (!cel) return; const p = +cel.dataset.p, parts = partsOf(p);
  if (!parts) { toast('Пока закрыта'); return; }
  $('view').hidden = false; setPic($('viewPic'), p, parts, parts);
  $('viewT').textContent = parts === 3 ? PAINT[p][0] : 'Блюдо ещё готовится';
  $('viewInfo').innerHTML = parts === 3 ? `<small>Секрет повара: ${PAINT[p][1]}</small>` : `Открыто ${parts} из 3 частей.`; };
$('gal').onclick = gallery;
$('galBack').onclick = () => { $('gallery').hidden = true; };
$('viewBack').onclick = () => { $('view').hidden = true; };
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 1200); }

// офлайн и «на экран Домой»: сервис-воркер кэширует игру и картинки
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
addEventListener('resize', fit);
// вид: шарики или кейк-попсы — переключатель на стартовом экране, выбор запоминается
const skins = document.querySelectorAll('#start .skin button');
function skin(s) { document.body.classList.toggle('sweet', s === 'sweet'); skins.forEach(b => b.setAttribute('aria-pressed', b.dataset.skin === s)); }
skins.forEach(b => b.onclick = () => { audio(); ls('sh_skin', b.dataset.skin); skin(b.dataset.skin); tick(); });
skin(ls('sh_skin') || '');
$('startBtn').onclick = () => { audio(); askTilt(); if (HOL === 'bd') { birthdaySong(); fireworks(); } $('start').hidden = true; bell(NOTES[0], 0, 1.2, 0.16); bell(NOTES[2], 0.12, 1.2, 0.14); bell(NOTES[4], 0.24, 1.6, 0.14); };
start(); fit(); requestAnimationFrame(drawFx);
})();
