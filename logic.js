'use strict';
// Логика без отрисовки: уровни, ходы, проверка решаемости. Её же гоняет selfcheck.js в Node.
// Пробирка — массив цветов снизу вверх, вместимость CAP. Ход — верхний шарик в пробирку, где пусто или сверху тот же цвет.
// Глава 2 — смешение: основной цвет (красный 10, жёлтый 11, синий 12), положенный на ДРУГОЙ основной, сливается с ним
// в один шарик (оранжевый 13, зелёный 14, фиолетовый 15) — даже в полной пробирке. Победа — каждая пробирка пуста или полна одним цветом.
// Города (по 50 уровней): 1 «Ягодная деревня» — 1–50 (1–30 сортировка, 31–50 смешение; за 1–45 — блюда альбома),
// 2 «Сырный городок» — 51–100 (часть шариков спрятана под сырной корочкой). После MAXL — свободная игра.
const CAP = 4, CH1 = 30, LEVELS = 45, MAXL = 100, EMPTY = 2;
const MIX = { '10,11': 13, '11,10': 13, '11,12': 14, '12,11': 14, '10,12': 15, '12,10': 15 };
const PAIR = { 13: [10, 11], 14: [11, 12], 15: [10, 12] };                          // из чего смешивается вторичный цвет
const mixOf = (a, b) => MIX[a + ',' + b];

function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 >>> 0; let t = a;
  t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Глава 1 (1–30): 3 цвета на 1–3 уровнях, каждые 3 уровня +1 цвет, с 22-го — все 10. Глава 2 (31–45) — смешение.
const colorsOf = L => Math.min(10, 3 + Math.floor((Math.min(L, CH1) - 1) / 3));
const isMix = L => L > CH1 && (L <= 50 || (L > MAXL && L % 2 === 1));               // свободная игра — через раз смешение
const isCheese = L => L > 50 && L <= MAXL;
const cheeseColors = L => 5 + Math.floor((L - 51) / 10);                          // 5…9 цветов

const topOf = t => t[t.length - 1];
function canMove(T, i, j) {
  const fin = t => t.length === CAP && doneTube(t);                                // собранная пробирка — навсегда (в игре она трескается):
  if (i === j || !T[i].length || fin(T[i]) || fin(T[j])) return false;            // ни взять из неё, ни смешать на ней
  if (!T[j].length) return true;
  const m = topOf(T[i]), t = topOf(T[j]);
  if (m === t) return T[j].length < CAP;
  return mixOf(m, t) !== undefined;                                                // смешение — даже в полной пробирке
}
function apply(T, i, j) {                                                          // делает ход; возвращает цвет смешения или undefined
  const m = T[i].pop(), t = T[j].length ? topOf(T[j]) : undefined, x = t !== undefined && t !== m ? mixOf(m, t) : undefined;
  if (x !== undefined) T[j][T[j].length - 1] = x; else T[j].push(m);
  return x;
}
const doneTube = t => t.length === 0 || (t.length === CAP && t.every(c => c === t[0]));
const won = T => T.every(doneTube);

// Решаемость: поиск в глубину с памятью состояний (порядок пробирок не важен) и лимитом.
// Возвращает первый ход найденного решения [i, j] (подсказка котика), true — если уже решено, false — решения не нашлось.
function solvable(T0, limit = 300000) {
  const seen = new Set(), key = T => T.map(t => t.join(',')).sort().join('|');
  const st = [[T0.map(t => t.slice()), null]]; let n = 0;
  while (st.length) {
    const [T, first] = st.pop(); if (won(T)) return first || true;
    const k = key(T); if (seen.has(k)) continue; seen.add(k); if (++n > limit) return false;
    const mv = [];
    for (let i = 0; i < T.length; i++) {
      const m = topOf(T[i]), same = T[i].length && T[i].every(c => c === m);
      for (let j = 0; j < T.length; j++) {
        if (!canMove(T, i, j)) continue;
        if (same && T[j].length === 0) continue;                                   // однородную — в пустую: ход впустую
        const U = T.map(t => t.slice()); apply(U, i, j);
        mv.push([T[j].length === 0 ? 0 : topOf(T[j]) === m ? 2 : 1, U, first || [i, j]]);              // в пустую — 0, смешение — 1, на свой цвет — 2
      }
    }
    mv.sort((a, b) => a[0] - b[0]); for (const [, U, f] of mv) st.push([U, f]);             // удачные ходы — последними в стек, т.е. пробуются первыми
  }
  return false;
}

function shuffled(balls, r) { for (let i = balls.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [balls[i], balls[j]] = [balls[j], balls[i]]; } return balls; }

// Глава 1: перемешанные шарики n цветов + EMPTY пустых пробирок
function classic(L, r, n = colorsOf(L)) {
  const balls = [];
  for (let c = 0; c < n; c++) for (let k = 0; k < CAP; k++) balls.push(c);
  shuffled(balls, r); const T = [];
  for (let t = 0; t < n; t++) T.push(balls.slice(t * CAP, t * CAP + CAP));
  for (let e = 0; e < EMPTY; e++) T.push([]);
  return T;
}
// Глава 2: вторичные цвета (часть шариков — «не смешанные» пары основных), иногда пробирка основного цвета-приманки и простые цвета
const SECS = [15, 13, 14], NEUTRAL = [0, 9, 4, 1];
function mixParams(L) {
  const i = Math.min(14, L - CH1 - 1);                                            // 0…14 (свободная игра — как самый сложный)
  return { sec: 1 + Math.floor(i / 5), pairs: Math.min(3, 1 + Math.floor(i / 4)), neutral: 2 + Math.floor(i / 6), prim: i >= 7 ? 1 : 0 };
}
function mixLevel(L, r) {
  const P = mixParams(L), balls = [];
  for (let s = 0; s < P.sec; s++) { const c = SECS[s];
    for (let k = 0; k < CAP; k++) if (k < P.pairs) balls.push(...PAIR[c]); else balls.push(c); }
  if (P.prim) for (let k = 0; k < CAP; k++) balls.push(PAIR[SECS[0]][0]);           // пробирка красного: его легко «потратить» на смешение по ошибке
  for (let s = 0; s < P.neutral; s++) for (let k = 0; k < CAP; k++) balls.push(NEUTRAL[s]);
  shuffled(balls, r); const T = [], n = Math.ceil(balls.length / CAP);
  for (let t = 0; t < n; t++) T.push(balls.slice(t * CAP, t * CAP + CAP));
  for (let e = 0; e < EMPTY; e++) T.push([]);
  return T;
}

// Уровень L: без уже собранных пробирок, только решаемый. Детерминирован: тот же L — тот же уровень.
// SEEDS — номер первой удачной попытки для уровней 1–100, посчитан заранее (node selfcheck.js --seeds): в игре уровень строится
// мгновенно, без долгой проверки решаемости. selfcheck.js проверяет, что все они решаемы.
const SEEDS = [null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 2, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const build = (L, tryN) => { const r = rng(L * 7919 + tryN * 104729 + 17); return isMix(L) ? mixLevel(L, r) : classic(L, r, isCheese(L) ? cheeseColors(L) : colorsOf(L)); };
// Сырный городок: в скольких нижних шариках каждой пробирки спрятан цвет (верхний всегда виден). Детерминировано по L.
function hiddenOf(L, T) {
  const H = T.map(() => 0); if (!isCheese(L)) return H;
  const i = L - 51, depth = Math.min(3, 1 + Math.floor(i / 17)), filled = T.map((t, k) => k).filter(k => T[k].length);
  const pick = shuffled(filled, rng(L * 977 + 3)).slice(0, Math.min(filled.length, 2 + Math.floor(i / 6)));
  for (const k of pick) H[k] = Math.min(depth, T[k].length - 1);
  return H;
}
function search(L) {
  for (let tryN = 0; ; tryN++) { const T = build(L, tryN);
    if (T.some(t => t.length === CAP && doneTube(t))) continue;
    if (solvable(T)) return tryN; }
}
function makeLevel(L) {
  if (L > MAXL) {                                                                 // свободная игра: уровень кампании с переставленными цветами
    const mix = isMix(L), base = mix ? CH1 + 1 + (L - MAXL - 1) % 15 : 22 + (L - MAXL - 1) % 9, r = rng(L * 31 + 5);
    const pool = mix ? [0, 9, 4, 1] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], map = {}, sh = shuffled(pool.slice(), r);
    pool.forEach((c, i) => { map[c] = sh[i]; });
    return makeLevel(base).map(t => t.map(c => map[c] ?? c));
  }
  return build(L, SEEDS[L] ?? search(L));
}

// Картина за уровнем: 15 картин по 3 уровня (1–10 — глава 1, 11–15 — глава 2); часть 1, 2 или 3 (3 — целиком)
const paintingOf = L => ({ p: Math.floor((Math.min(L, LEVELS) - 1) / 3), part: (Math.min(L, LEVELS) - 1) % 3 + 1 });

globalThis.SH = { SEEDS, search, CAP, CH1, LEVELS, MAXL, EMPTY, isCheese, cheeseColors, hiddenOf, MIX, PAIR, mixOf, rng, colorsOf, isMix, canMove, apply, doneTube, won, solvable, makeLevel, mixParams, paintingOf };
