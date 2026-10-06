'use strict';
// Логика без отрисовки: уровни, ходы, проверка решаемости. Её же гоняет selfcheck.js в Node.
// Пробирка — массив цветов снизу вверх (числа 0…9), вместимость CAP. Ход — верхний шарик в пробирку,
// где пусто или сверху тот же цвет. Победа — каждая пробирка пуста или полна одним цветом.
const CAP = 4, LEVELS = 30, EMPTY = 2;

function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 >>> 0; let t = a;
  t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Сложность: уровни 1–3 — 3 цвета, каждые 3 уровня +1 цвет, с 22-го — все 10. После 30-го — бесконечная игра на 10 цветах.
const colorsOf = L => Math.min(10, 3 + Math.floor((L - 1) / 3));

const canMove = (T, i, j) => i !== j && T[i].length > 0 && T[j].length < CAP &&
  (T[j].length === 0 || T[j][T[j].length - 1] === T[i][T[i].length - 1]);
const doneTube = t => t.length === 0 || (t.length === CAP && t.every(c => c === t[0]));
const won = T => T.every(doneTube);

// Решаемость: поиск в глубину с памятью состояний (порядок пробирок не важен). Лимит — чтобы не зависнуть на огромных.
function solvable(T0, limit = 200000) {
  const seen = new Set(), key = T => T.map(t => t.join('')).sort().join('|');
  const st = [T0.map(t => t.slice())]; let n = 0;
  while (st.length) {
    const T = st.pop(); if (won(T)) return true;
    const k = key(T); if (seen.has(k)) continue; seen.add(k); if (++n > limit) return false;
    for (let i = 0; i < T.length; i++) {
      if (doneTube(T[i])) continue;                                              // собранную пробирку не трогаем
      const top = T[i][T[i].length - 1], same = T[i].every(c => c === top);
      for (let j = 0; j < T.length; j++) {
        if (!canMove(T, i, j)) continue;
        if (same && T[j].length === 0) continue;                                 // однородную — в пустую: ход впустую
        const U = T.map(t => t.slice()); U[j].push(U[i].pop()); st.push(U);
      }
    }
  }
  return false;
}

// Уровень L: перемешанные шарики n цветов по n пробиркам + EMPTY пустых. Без уже собранных пробирок, только решаемые.
// Детерминирован: тот же L — тот же уровень (можно повторить и обсудить).
function makeLevel(L) {
  const n = colorsOf(L);
  for (let tryN = 0; ; tryN++) {
    const r = rng(L * 7919 + tryN * 104729 + 17), balls = [];
    for (let c = 0; c < n; c++) for (let k = 0; k < CAP; k++) balls.push(c);
    for (let i = balls.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [balls[i], balls[j]] = [balls[j], balls[i]]; }
    const T = []; for (let t = 0; t < n; t++) T.push(balls.slice(t * CAP, t * CAP + CAP));
    for (let e = 0; e < EMPTY; e++) T.push([]);
    if (T.some(t => t.length && doneTube(t))) continue;
    if (solvable(T)) return T;
  }
}

// Картина за уровнем: 10 картин по 3 уровня; часть 1, 2 или 3 (3 — картина открыта целиком)
const paintingOf = L => ({ p: Math.floor((Math.min(L, LEVELS) - 1) / 3), part: (Math.min(L, LEVELS) - 1) % 3 + 1 });

globalThis.SH = { CAP, LEVELS, EMPTY, rng, colorsOf, canMove, doneTube, won, solvable, makeLevel, paintingOf };
