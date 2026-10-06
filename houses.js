'use strict';
// Города и домики из еды для карты путешествия котика. Домик — рисованный SVG: тело + крыша + окна и дверь + украшения.
// viewBox 100×100, земля на y≈94. Домик строится на карте за каждые 5 пройденных уровней города.

// осветлить (k > 0) или затемнить (k < 0) цвет '#rrggbb'
const shade = (h, k) => '#' + h.match(/\w\w/g).map(x => { const v = parseInt(x, 16); return Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k).toString(16).padStart(2, '0'); }).join('');

function houseSVG([, body, roof, c1, c2, deco]) {
  const d1 = shade(c1, -0.28), d2 = shade(c2, -0.28), dots = (pts, f, r) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`).join('');
  let s = '<ellipse cx="50" cy="94" rx="38" ry="5" fill="rgba(90,40,90,.18)"/>';
  // тело
  if (body === 'box') s += `<rect x="20" y="46" width="60" height="48" rx="6" fill="${c1}" stroke="${d1}" stroke-width="2.5"/>`;
  if (body === 'cup') s += `<path d="M20 50 H80 L73 94 H27 Z" fill="${c1}" stroke="${d1}" stroke-width="2.5" stroke-linejoin="round"/>`
    + [30, 40, 50, 60, 70].map(x => `<path d="M${x} 53 L${x + (50 - x) * 0.14} 92" stroke="${d1}" stroke-width="1.5" opacity=".45"/>`).join('');
  if (body === 'drum') s += `<path d="M18 50 V88 A32 7 0 0 0 82 88 V50" fill="${c1}" stroke="${d1}" stroke-width="2.5"/><ellipse cx="50" cy="50" rx="32" ry="7" fill="${shade(c1, 0.25)}" stroke="${d1}" stroke-width="2.5"/>`;
  if (body === 'wedge') s += `<path d="M12 94 V60 L88 40 V94 Z" fill="${c1}" stroke="${d1}" stroke-width="2.5" stroke-linejoin="round"/>`
    + `<path d="M12 60 L88 40 L76 33 L4 54 Z" fill="${shade(c1, 0.3)}" stroke="${d1}" stroke-width="2.5" stroke-linejoin="round"/>`;
  // украшения на теле (до крыши — крыша их перекрывает)
  if (deco === 'holes') s += dots([[24, 74], [76, 56], [66, 86], [33, 89], [80, 76]], shade(c1, -0.16), 4.5);
  if (deco === 'seeds') s += dots([[27, 54], [73, 54], [29, 84], [71, 86], [50, 50], [36, 77], [64, 79]], '#ffe27a', 1.7);
  if (deco === 'dots') s += dots([[27, 55], [73, 55], [29, 86], [71, 87]], shade(c1, -0.22), 3);
  // крыша
  if (roof === 'cream' || roof === 'cherry') s += `<path d="M15 52 Q19 37 31 44 Q38 29 50 37 Q62 29 69 44 Q81 37 85 52 Q50 61 15 52 Z" fill="${c2}" stroke="${d2}" stroke-width="2.5" stroke-linejoin="round"/>`
    + `<circle cx="50" cy="31" r="8" fill="${c2}" stroke="${d2}" stroke-width="2.5"/>`;
  if (roof === 'cherry') s += '<path d="M52 22 Q56 12 63 9" fill="none" stroke="#3fae6a" stroke-width="2.5" stroke-linecap="round"/><circle cx="51" cy="22" r="7" fill="#ff3b5c" stroke="#c81e3a" stroke-width="2"/><circle cx="48.5" cy="19.5" r="2" fill="#fff" opacity=".7"/>';
  if (roof === 'cone') s += `<path d="M12 50 L50 12 L88 50 Z" fill="${c2}" stroke="${d2}" stroke-width="2.5" stroke-linejoin="round"/><path d="M28 36 H72 M38 26 H62" stroke="${d2}" stroke-width="1.5" opacity=".45"/>`;
  if (roof === 'dome') s += `<path d="M17 50 A33 31 0 0 1 83 50 Z" fill="${c2}" stroke="${d2}" stroke-width="2.5"/><path d="M30 34 Q40 26 52 25" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
  if (roof === 'leaf') s += `<path d="M20 49 L31 33 L40 43 L50 26 L60 43 L69 33 L80 49 Z" fill="${c2}" stroke="${d2}" stroke-width="2.5" stroke-linejoin="round"/><path d="M50 28 V15" stroke="${d2}" stroke-width="3.5" stroke-linecap="round"/>`;
  // украшения на крыше
  if (deco === 'sprinkles') s += [[29, 45, '#7fd8ff'], [41, 37, '#ffe066'], [57, 37, '#8ef0c0'], [69, 45, '#c09bff'], [49, 47, '#fff'], [36, 49, '#ff8fc3']]
    .map(([x, y, f], i) => `<rect x="${x}" y="${y}" width="6" height="2.4" rx="1.2" fill="${f}" transform="rotate(${i * 41} ${x + 3} ${y + 1})"/>`).join('');
  if (deco === 'drips') s += `<path d="M24 52 v8 a3 3 0 0 0 6 0 v-6 Z M44 55 v11 a3 3 0 0 0 6 0 v-10 Z M66 54 v7 a3 3 0 0 0 6 0 v-6 Z" fill="${c2}" stroke="${d2}" stroke-width="1.5" stroke-linejoin="round"/>`;
  // окна и дверь — одинаковые у всех домиков: так набор выглядит одной улицей
  s += '<g stroke="#8a5a44" stroke-width="2"><rect x="25" y="61" width="13" height="12" rx="3" fill="#fff6c8"/><rect x="62" y="61" width="13" height="12" rx="3" fill="#fff6c8"/>'
    + '<path d="M31.5 61 V73 M25 67 H38 M68.5 61 V73 M62 67 H75" stroke-width="1.2"/></g>'
    + '<rect x="42" y="72" width="16" height="22" rx="8" fill="#a8664a" stroke="#7a4532" stroke-width="2"/><circle cx="54" cy="84" r="1.6" fill="#ffe27a"/>';
  return `<svg viewBox="0 0 100 100">${s}</svg>`;
}

// Домик: [название, тело, крыша, цвет тела, цвет крыши, украшение]
const CITIES = [
  { name: 'Ягодная деревня', gen: 'Ягодной деревни', done: 'пройдена', icon: '🍓', from: 1, bg: 'linear-gradient(180deg,#ffe0ee 0%,#f6e6ff 50%,#e6f7ea 100%)', path: '#ff8fc3', deco: ['🍓', '🌸', '🫐', '🌷', '🍒'],
    houses: [['Клубничный домик', 'box', 'leaf', '#ff6b8a', '#57c27a', 'seeds'], ['Кексик', 'cup', 'cherry', '#f7c59f', '#ffc2dc', 'sprinkles'],
      ['Черничный маффин', 'cup', 'dome', '#b9a7e8', '#6b5bd6', 'dots'], ['Тортик', 'drum', 'cream', '#fff0f5', '#ff9cc4', 'drips'],
      ['Пончиковый дом', 'drum', 'dome', '#f2c38b', '#ff8fc3', 'sprinkles'], ['Домик-пломбир', 'box', 'dome', '#f7d9a8', '#9ff0cf', 'sprinkles'],
      ['Пирожковая', 'box', 'cone', '#f2c38b', '#e98a5a', 'dots'], ['Медовый домик', 'box', 'cone', '#ffd66b', '#f2a93b', 'drips'],
      ['Карамельная башня', 'drum', 'cone', '#f4b183', '#d97b3f', 'drips'], ['Ягодный замок', 'box', 'cherry', '#ffb3d1', '#fff0f5', 'seeds']] },
  { name: 'Сырный городок', gen: 'Сырного городка', done: 'пройден', icon: '🧀', from: 51, bg: 'linear-gradient(180deg,#fff7d6 0%,#fff0bd 50%,#ffe3a3 100%)', path: '#f2b93b', deco: ['🧀', '🐭', '🌼', '🥛', '🌻'],
    houses: [['Сырный клинышек', 'wedge', 'none', '#ffd84d', '#ffd84d', 'holes'], ['Сырная головка', 'drum', 'none', '#ffcf3d', '#ffcf3d', 'holes'],
      ['Мышкина норка', 'box', 'cone', '#f7e3a1', '#e8b04a', 'holes'], ['Домик-бутерброд', 'box', 'cream', '#f4d29c', '#ffd84d', 'drips'],
      ['Пицца-домик', 'wedge', 'none', '#ffcf6b', '#ffcf6b', 'dots'], ['Крекерный дом', 'box', 'cone', '#e9c27a', '#d9a24f', 'dots'],
      ['Молочный дом', 'box', 'cone', '#ffffff', '#7fc8ff', 'none'], ['Фондю-башня', 'drum', 'dome', '#ffe08a', '#ffcf3d', 'drips'],
      ['Сырная мельница', 'box', 'cone', '#ffe9a8', '#e6b34d', 'holes'], ['Сырный дворец', 'wedge', 'none', '#ffcf3d', '#ffcf3d', 'holes']] }];
const cityOf = L => CITIES.findIndex(c => L >= c.from && L < c.from + 50);   // -1 — свободная игра
