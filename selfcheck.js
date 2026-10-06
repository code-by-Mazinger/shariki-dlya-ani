// Проверка логики: node selfcheck.js — все 30 уровней решаемы, детерминированы, без собранных пробирок, правила ходов верны.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(__dirname + '/logic.js', 'utf8'), ctx);
const S = ctx.SH;

// правила хода
const T = [[0, 1], [1], [], [2, 2, 2, 2]];
assert(S.canMove(T, 0, 1), 'синий на синий — можно');
assert(S.canMove(T, 0, 2), 'в пустую — можно');
assert(S.canMove(T, 1, 0), 'тот же цвет сверху — можно');
assert(!S.canMove(T, 0, 3), 'в полную — нельзя');
assert(!S.canMove(T, 2, 0), 'из пустой — нельзя');
assert(S.won([[1, 1, 1, 1], [], [0, 0, 0, 0]]) && !S.won([[1, 1, 1, 0], [0, 0, 0, 1], []]), 'победа считается неверно');
console.log('✓ правила ходов и победы');

// уровни
const t0 = Date.now();
for (let L = 1; L <= S.LEVELS; L++) {
  const A = S.makeLevel(L), B = S.makeLevel(L), n = S.colorsOf(L);
  assert.deepStrictEqual(A, B, `уровень ${L} не детерминирован`);
  assert(A.length === n + S.EMPTY, `уровень ${L}: пробирок ${A.length}`);
  for (let c = 0; c < n; c++) assert(A.flat().filter(x => x === c).length === S.CAP, `уровень ${L}: цвет ${c} не ×${S.CAP}`);
  assert(!A.some(t => t.length && S.doneTube(t)), `уровень ${L}: есть уже собранная пробирка`);
  assert(S.solvable(A, 2e6), `уровень ${L} нерешаем`);
}
console.log(`✓ уровни 1–${S.LEVELS}: решаемы, детерминированы, цвета от ${S.colorsOf(1)} до ${S.colorsOf(S.LEVELS)} (${Date.now() - t0} мс)`);
assert(S.solvable(S.makeLevel(57)), 'бесконечная игра: уровень 57 нерешаем');
const p = S.paintingOf(1), q = S.paintingOf(30), r = S.paintingOf(6);
assert(p.p === 0 && p.part === 1 && q.p === 9 && q.part === 3 && r.p === 1 && r.part === 3, 'картины по уровням');
console.log('✓ бесконечная игра после 30-го и раздача картин по 3 уровня');
console.log('ВСЁ ОК');
