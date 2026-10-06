'use strict';
// Отрисовка, касания, звук, галерея. Логика уровней — logic.js (SH).
(() => {
const { CAP, LEVELS, canMove, doneTube, won, makeLevel, paintingOf } = SH;
const $ = id => document.getElementById(id);
const ls = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch (e) { return null; } };

// Конфетные цвета шариков: светлый и тёмный край для объёма. У каждого цвета своя нота пентатоники — любые сочетания звучат мягко.
// Порядок — чтобы соседние цвета сильно различались: на первых уровнях (3–4 цвета) нет похожих оттенков
const COLORS = [['#ff7eb3', '#d63a7d'], ['#7ff0c2', '#25ad7e'], ['#c09bff', '#7d50d8'], ['#ffe47a', '#d4ad22'], ['#74ddf3', '#1f9fc2'],
  ['#ffbb73', '#e08326'], ['#ee8cfa', '#b13bcf'], ['#8fb2ff', '#4269d6'], ['#ff9a8a', '#e0564a'], ['#fff6ff', '#c7aed8']];
const NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
// Картины: по 3 уровня на каждую. Все — общественное достояние, источники — img/CREDITS.md
const PAINT = [
  ['01_monet_impression', 'Впечатление. Восходящее солнце', 'Клод Моне', '1872', 'По названию этой картины критик Луи Леруа в насмешку назвал целое направление — импрессионизм.'],
  ['02_hokusai_wave', 'Большая волна в Канагаве', 'Кацусика Хокусай', 'около 1831', 'Это гравюра на дереве: её печатали тиражом. Вдали за волной — маленькая гора Фудзи.'],
  ['03_vermeer_pearl', 'Девушка с жемчужной серёжкой', 'Ян Вермеер', 'около 1665', 'Это не портрет, а «трони» — этюд лица в необычном наряде. Кто позировал, неизвестно до сих пор.'],
  ['04_vangogh_sunflowers', 'Подсолнухи', 'Винсент ван Гог', '1888', 'Ван Гог написал серию подсолнухов, чтобы украсить комнату для своего друга Поля Гогена в Арле.'],
  ['05_monet_lilies', 'Пруд с кувшинками', 'Клод Моне', '1899', 'Японский мостик и пруд Моне устроил сам в своём саду в Живерни — и писал их десятки раз.'],
  ['06_renoir_moulin', 'Бал в Мулен де ла Галетт', 'Пьер Огюст Ренуар', '1876', 'Ренуар писал картину прямо на Монмартре, а позировали ему друзья.'],
  ['07_botticelli_venus', 'Рождение Венеры', 'Сандро Боттичелли', 'около 1485', 'Картина написана темперой на холсте — редкость для Флоренции того времени, где обычно писали на дереве.'],
  ['08_mucha_spring', 'Весна', 'Альфонс Муха', '1896', 'Одно из четырёх панно серии «Времена года» — декоративные литографии для украшения дома.'],
  ['09_vangogh_starry', 'Звёздная ночь', 'Винсент ван Гог', '1889', 'Ван Гог написал её в лечебнице Сен-Реми — по памяти о виде из окна своей комнаты.'],
  ['10_klimt_kiss', 'Поцелуй', 'Густав Климт', '1907–1908', 'В картине настоящее сусальное золото — это вершина «золотого периода» Климта.']];
const img = p => `img/${PAINT[p][0]}.jpg`;

let L = Math.max(1, +ls('sh_level') || 1), T = [], hist = [], sel = -1, busy = false, order = [];
const soundOn = () => ls('sh_sound') !== '0';

// ─── звук: колокольчик через мягкую реверберацию + тихий фон. Контекст — по первому касанию (иначе iPhone молчит) ───
let ac = null, out = null, rev = null, pad = null;
function audio() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    out = ac.createGain(); out.gain.value = soundOn() ? 0.9 : 0; out.connect(ac.destination);
    rev = ac.createConvolver(); const len = ac.sampleRate * 2.6, b = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rev.buffer = b; const wet = ac.createGain(); wet.gain.value = 0.35; rev.connect(wet); wet.connect(out);
    startPad();
  }
  if (ac.state === 'suspended') ac.resume();
}
function bell(f, t = 0, dur = 1.4, v = 0.22) {
  if (!ac) return; const t0 = ac.currentTime + t, g = ac.createGain();
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  for (const [m, a] of [[1, 1], [2.001, 0.28], [3.01, 0.08]]) { const o = ac.createOscillator(), k = ac.createGain(); o.type = 'sine'; o.frequency.value = f * m; k.gain.value = a; o.connect(k); k.connect(g); o.start(t0); o.stop(t0 + dur + 0.05); }
  g.connect(out); g.connect(rev);
}
function tick() { bell(1800, 0, 0.08, 0.05); }
function startPad() {                                                             // тихий фон: два тона и медленное «дыхание»
  pad = ac.createGain(); pad.gain.value = 0.0; pad.connect(out); pad.connect(rev);
  for (const f of [130.81, 196.0, 329.63]) { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f; const k = ac.createGain(); k.gain.value = f > 300 ? 0.15 : 0.5; o.connect(k); k.connect(pad); o.start(); }
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 0.012; lfo.connect(lg); lg.connect(pad.gain); lfo.start();
  pad.gain.linearRampToValueAtTime(0.028, ac.currentTime + 4);
}
function chord(c) { const i = c; [0, 2, 4].forEach((s, k) => bell(NOTES[(i + s) % NOTES.length] * (i + s >= NOTES.length ? 2 : 1), k * 0.09, 1.8, 0.16)); }
function melody() { order.forEach((c, k) => bell(NOTES[c], k * 0.2, 1.2, 0.2)); const e = order.length * 0.2 + 0.1; [0, 4, 7].forEach((s, k) => bell(NOTES[0] * Math.pow(2, s / 12) * 2, e + k * 0.05, 2.4, 0.13)); }
for (const ev of ['pointerup', 'touchend']) addEventListener(ev, audio, { passive: true });

// ─── фон: мягкие светящиеся пятна и мерцающие блёстки; вспышки блёсток при собранной пробирке ───
const fx = $('fx'), g = fx.getContext('2d'); let FW = 0, FH = 0, dpr = 1;
const bokeh = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), r: 40 + Math.random() * 90, v: 0.00004 + Math.random() * 0.00008, h: [330, 290, 260, 20][Math.floor(Math.random() * 4)] }));
const stars = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), p: Math.random() * 6.28, s: 0.6 + Math.random() * 1.4 }));
let sparks = [];
function fit() { dpr = Math.min(devicePixelRatio || 1, 2); FW = innerWidth; FH = innerHeight; fx.width = FW * dpr; fx.height = FH * dpr; layout(); }
function drawFx(t) {
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, FW, FH);
  for (const b of bokeh) { b.y -= b.v * 16; if (b.y < -0.2) { b.y = 1.2; b.x = Math.random(); }
    const x = b.x * FW, y = b.y * FH, gr = g.createRadialGradient(x, y, 0, x, y, b.r);
    gr.addColorStop(0, `hsla(${b.h},100%,92%,.55)`); gr.addColorStop(1, `hsla(${b.h},100%,92%,0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, b.r, 0, 7); g.fill(); }
  for (const s of stars) { const a = 0.35 + 0.65 * Math.max(0, Math.sin(t / 900 + s.p)); star(s.x * FW, s.y * FH, s.s * 2.2, `rgba(255,255,255,${a})`); }
  sparks = sparks.filter(p => (p.life -= 1) > 0);
  for (const p of sparks) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; star(p.x, p.y, p.s * (p.life / 50), p.c); }
  requestAnimationFrame(drawFx);
}
function star(x, y, r, c) { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
function burst(el, col) { const r = el.getBoundingClientRect(); for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, v = 1 + Math.random() * 3.5;
  sparks.push({ x: r.left + r.width / 2, y: r.top + r.height * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 50, s: 4 + Math.random() * 5, c: Math.random() < 0.5 ? col : '#fff' }); } }

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
  T.forEach((t, i) => { const d = document.createElement('div'); d.className = 'tube' + (doneTube(t) && t.length ? ' done' : '') + (i === sel ? ' sel' : '');
    if (doneTube(t) && t.length) d.style.setProperty('--glow', COLORS[t[0]][0]);
    t.forEach((c, k) => d.appendChild(ballEl(c, k)));
    d.addEventListener('pointerdown', e => { e.preventDefault(); tap(i); });
    board.appendChild(d); });
  if (sel >= 0) lift(true);
  $('lvl').textContent = L <= LEVELS ? `Уровень ${L} из ${LEVELS}` : `Уровень ${L} · свободная игра`;
}
function ballEl(c, k) { const b = document.createElement('div'); b.className = 'ball'; b.style.setProperty('--c', COLORS[c][0]); b.style.setProperty('--d', COLORS[c][1]); b.style.bottom = ballBottom(k) + 'px'; return b; }
const tubeEl = i => board.children[i];
function lift(on) { const tb = tubeEl(sel); if (!tb) return; const b = tb.lastElementChild; if (!b) return;
  b.classList.add('lift'); b.style.transform = on ? `translateY(${-(tw * 3.9 - ballBottom(T[sel].length - 1) - tw * 0.78 + tw * 0.55)}px)` : ''; }

function tap(i) {
  if (busy) return;
  if (sel < 0) { if (T[i].length && !doneTube(T[i])) { sel = i; tubeEl(i).classList.add('sel'); lift(true); tick(); } return; }
  if (i === sel) { lift(false); tubeEl(i).classList.remove('sel'); sel = -1; return; }
  if (!canMove(T, sel, i)) { const d = tubeEl(i); d.classList.remove('bad'); void d.offsetWidth; d.classList.add('bad'); bell(196, 0, 0.25, 0.08); return; }
  move(sel, i);
}
function move(a, b) {                                                              // перелёт шарика: FLIP — запомнить, где был, переложить, анимировать
  busy = true; hist.push(T.map(t => t.slice()));
  const fromTube = tubeEl(a), ball = fromTube.lastElementChild, r0 = ball.getBoundingClientRect();
  const c = T[a].pop(); T[b].push(c);
  fromTube.classList.remove('sel'); sel = -1;
  const toTube = tubeEl(b); ball.classList.remove('lift'); ball.style.transition = 'none'; ball.style.transform = ''; ball.style.bottom = ballBottom(T[b].length - 1) + 'px';
  toTube.appendChild(ball); const r1 = ball.getBoundingClientRect();
  ball.style.transform = `translate(${r0.left - r1.left}px,${r0.top - r1.top}px)`; void ball.offsetWidth;
  ball.style.transition = 'transform .32s cubic-bezier(.3,1.25,.5,1)'; ball.style.transform = '';
  bell(NOTES[c], 0.12, 1.2, 0.18);
  setTimeout(() => {
    busy = false; ball.style.transition = '';
    if (doneTube(T[b]) && T[b].length) { toTube.classList.add('done'); toTube.style.setProperty('--glow', COLORS[c][0]); chord(c); burst(toTube, COLORS[c][0]); order.push(c); }
    if (won(T)) setTimeout(win, 650);
  }, 340);
}
function start() { T = makeLevel(L); hist = []; sel = -1; order = []; layout(); }
$('undo').onclick = () => { if (busy || !hist.length) return; T = hist.pop(); sel = -1; render(); tick(); };
$('restart').onclick = () => { if (busy) return; start(); tick(); };
$('snd').onclick = () => { audio(); const on = !soundOn(); ls('sh_sound', on ? '1' : '0'); if (out) out.gain.value = on ? 0.9 : 0; $('snd').classList.toggle('off', !on); };
$('snd').classList.toggle('off', !soundOn());

// ─── картины: мозаика закрывает ещё не открытые части (плитки в своём порядке для каждой картины) ───
const GRID = 6;
function tileOrder(p) { const r = SH.rng(p * 31 + 7), a = Array.from({ length: GRID * GRID }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function cover(cv, p, parts, from = parts) {                                      // parts из 3 открыто; from — сколько было (для анимации)
  const box = cv.parentElement, w = box.clientWidth, h = box.clientHeight; if (!w || !h) return;
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
const infoHTML = p => `<b>«${PAINT[p][1]}»</b><br>${PAINT[p][2]}, ${PAINT[p][3]}<br><small>${PAINT[p][4]}</small>`;

function win() {
  melody(); const done = L; L++; ls('sh_level', L);
  const { p, part } = paintingOf(done), extra = done > LEVELS;
  $('winT').textContent = extra ? 'Уровень пройден! ✨' : part === 3 ? (done === LEVELS ? 'Галерея собрана! 💛' : 'Картина открыта! ✨') : 'Отлично! ✨';
  const pp = extra ? Math.floor(Math.random() * PAINT.length) : p;
  setPic($('winPic'), pp, extra ? 3 : part, extra ? 3 : part - 1);
  $('winInfo').innerHTML = extra || part === 3 ? infoHTML(pp) + (done === LEVELS ? '<p>Все 10 картин собраны. Дальше — свободная игра для удовольствия.</p>' : '')
    : `Открыта часть картины: ${part} из 3.<br><small>Ещё ${3 - part} ${3 - part === 1 ? 'уровень' : 'уровня'} — и она откроется целиком.</small>`;
  $('win').hidden = false;
}
$('next').onclick = () => { $('win').hidden = true; start(); };
$('winGal').onclick = () => { $('win').hidden = true; start(); gallery(); };

// ─── галерея: 10 картин, открытые части — по пройденным уровням ───
const partsOf = p => Math.max(0, Math.min(3, (Math.min(L, LEVELS + 1) - 1) - p * 3));
function gallery() {
  const n = PAINT.filter((_, p) => partsOf(p) === 3).length;
  $('galSub').textContent = `Открыто картин: ${n} из ${PAINT.length}`;
  $('grid').innerHTML = PAINT.map((_, p) => `<div class="cell" data-p="${p}"><img alt=""><canvas></canvas>${partsOf(p) === 3 ? `<b>${PAINT[p][1]}</b>` : ''}</div>`).join('');
  $('gallery').hidden = false;
  [...$('grid').children].forEach(cel => { const p = +cel.dataset.p; setPic(cel, p, partsOf(p), partsOf(p)); });
}
$('grid').onclick = e => { const cel = e.target.closest('.cell'); if (!cel) return; const p = +cel.dataset.p, parts = partsOf(p);
  if (!parts) { toast('Пока закрыта'); return; }
  $('view').hidden = false; setPic($('viewPic'), p, parts, parts);
  $('viewT').textContent = parts === 3 ? PAINT[p][1] : 'Картина ещё открывается';
  $('viewInfo').innerHTML = parts === 3 ? infoHTML(p) : `Открыто ${parts} из 3 частей.`; };
$('gal').onclick = gallery;
$('galBack').onclick = () => { $('gallery').hidden = true; };
$('viewBack').onclick = () => { $('view').hidden = true; };
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 1200); }

// офлайн и «на экран Домой»: сервис-воркер кэширует игру и картины
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
addEventListener('resize', fit);
start(); fit(); requestAnimationFrame(drawFx);
})();
