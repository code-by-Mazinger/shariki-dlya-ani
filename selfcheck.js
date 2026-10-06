// Проверка логики: node selfcheck.js — правила, смешение, уровни (большие уровни 40–45 решатель проверяет ~1,5 мин — только с --full).
// node selfcheck.js --full — ещё и все уровни 40–45 и сверка таблицы SEEDS (после изменений генератора — обязательно).
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(__dirname + '/logic.js', 'utf8'), ctx);
const S = ctx.SH, FULL = process.argv.includes('--full');

// правила хода
const T = [[0, 1], [1], [], [2, 2, 2, 2]];
assert(S.canMove(T, 0, 1), 'тот же цвет — можно');
assert(S.canMove(T, 0, 2), 'в пустую — можно');
assert(S.canMove(T, 1, 0), 'тот же цвет сверху — можно');
assert(!S.canMove(T, 0, 3), 'в полную — нельзя');
assert(!S.canMove(T, 2, 0), 'из пустой — нельзя');
assert(!S.canMove([[10, 10, 10, 10], []], 0, 1), 'из собранной — нельзя (в игре она трескается)');
assert(!S.canMove([[12], [10, 10, 10, 10]], 0, 1), 'смешать на собранной — нельзя (она треснула)');
const H = [[0, 0, 0, 1], [1, 1, 1, 0], []], h = S.solvable(H); assert(Array.isArray(h) && S.canMove(H, ...h), 'решатель не вернул первый ход (подсказка котика)');
assert(S.won([[1, 1, 1, 1], [], [0, 0, 0, 0]]) && !S.won([[1, 1, 1, 0], [0, 0, 0, 1], []]), 'победа считается неверно');
console.log('✓ правила ходов и победы');

// смешение: красный на синий → фиолетовый (один шарик), даже в полную; на свой цвет — обычная стопка; простой цвет не смешивается
const M = [[10], [0, 0, 0, 12], [11], [0]];
assert(S.canMove(M, 0, 1), 'красный на синий в полной пробирке — можно (смешение)');
const x = S.apply(M, 0, 1);
assert(x === 15 && M[1].length === 4 && M[1][3] === 15 && M[0].length === 0, 'красный+синий не дал фиолетовый');
assert(!S.canMove(M, 2, 3), 'жёлтый на розовый (простой цвет) — нельзя');
assert(S.mixOf(10, 11) === 13 && S.mixOf(11, 12) === 14 && S.mixOf(12, 10) === 15 && S.mixOf(13, 10) === undefined, 'таблица смешения');
console.log('✓ смешение: красный+жёлтый=оранжевый, жёлтый+синий=зелёный, красный+синий=фиолетовый; смешанные и простые не смешиваются');

// уровни
const t0 = Date.now();
for (let L = 1; L <= S.LEVELS; L++) {
  const A = S.makeLevel(L), B = S.makeLevel(L), heavy = L >= 40;
  if (heavy && !FULL) continue;
  assert(S.search(L) === S.SEEDS[L], `уровень ${L}: таблица SEEDS устарела (первая удачная попытка ${S.search(L)}, в таблице ${S.SEEDS[L]})`);
  assert.deepStrictEqual(A, B, `уровень ${L} не детерминирован`);
  assert(!A.some(t => t.length === S.CAP && S.doneTube(t)), `уровень ${L}: есть уже собранная пробирка`);
  // решаемость следует из search (он и проверяет решателем)
  if (L <= S.CH1) { const n = S.colorsOf(L);
    assert(A.length === n + S.EMPTY, `уровень ${L}: пробирок ${A.length}`);
    for (let c = 0; c < n; c++) assert(A.flat().filter(v => v === c).length === S.CAP, `уровень ${L}: цвет ${c} не ×${S.CAP}`); }
  else assert(S.isMix(L) && A.flat().some(v => v >= 10 && v <= 12), `уровень ${L}: нет основных цветов для смешения`);
}
console.log(`✓ уровни 1–${FULL ? S.LEVELS : 39}${FULL ? '' : ' (40–45 — с --full)'}: решаемы и детерминированы; глава 2 (${S.CH1 + 1}–${S.LEVELS}) — со смешением (${Date.now() - t0} мс)`);
assert(S.solvable(S.makeLevel(52)) && S.solvable(S.makeLevel(53)), 'свободная игра нерешаема');
const p = S.paintingOf(1), q = S.paintingOf(30), r = S.paintingOf(45);
assert(p.p === 0 && p.part === 1 && q.p === 9 && q.part === 3 && r.p === 14 && r.part === 3, 'картины по уровням');
console.log('✓ свободная игра после 45-го и раздача 15 картин по 3 уровня');
// в браузере logic.js и app.js грузятся как обычные скрипты: имена вроде top/name/status уже заняты window — скрипт упадёт.
// В Node их нет, поэтому проверяем отдельно (так «top» однажды уронил игру целиком).
const WIN = ['top', 'parent', 'self', 'window', 'name', 'status', 'length', 'origin', 'frames', 'location', 'history', 'screen', 'close', 'open', 'print', 'event', 'closed', 'opener'];
const decl = [...fs.readFileSync(__dirname + '/logic.js', 'utf8').matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
const clash = decl.filter(n => WIN.includes(n)); assert(!clash.length, `logic.js объявляет имена, занятые в браузере: ${clash}`);
console.log('✓ logic.js не конфликтует с именами браузера (window)');
console.log('ВСЁ ОК');
