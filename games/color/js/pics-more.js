/* Food, Vehicles, Space, Ocean, Holidays, Fantasy */
(function () {
  const K = '#2b2b3a', W = '#ffffff', PK = '#ffb3c7', GD = '#ffd23f', R = '#e63946', D = '#2b2b3a';
  const SPR = ['#ff4fa3', '#3df5ff', '#ffd23f', '#7ee36b', '#ffffff'];
  // ---------- FOOD ----------
  let C = 'food';
  PIC({ id: 'f-pizza', name: 'Pizza Slice', cat: C, size: 32, bg: '#fff3d6', ol: K, draw(g) {
    g.p([14, 20, 86, 20, 50, 94], '#f5c26b'); g.p([20, 26, 80, 26, 50, 87], '#ffd84d');
    g.rr(10, 12, 90, 27, 6, '#d9913f');
    g.c(38, 40, 6, R); g.c(62, 42, 6, R); g.c(50, 62, 5.5, R); g.c(47, 32, 3.5, R);
    g.c(56, 52, 2.5, '#3fa34d'); g.c(40, 52, 2.5, '#3fa34d'); g.c(66, 32, 2.5, '#3fa34d');
  } });
  PIC({ id: 'f-icecream', name: 'Ice Cream Cone', cat: C, size: 32, bg: '#d9f3ff', ol: K, draw(g) {
    g.p([30, 54, 70, 54, 50, 97], '#e8a85a');
    g.l(36, 60, 57, 84, 1.3, '#b9773a'); g.l(46, 56, 64, 70, 1.3, '#b9773a'); g.l(64, 60, 43, 84, 1.3, '#b9773a'); g.l(54, 56, 36, 70, 1.3, '#b9773a');
    g.c(50, 48, 20, '#ff9fc4'); g.c(34, 58, 4.5, '#ff9fc4'); g.c(60, 60, 4, '#ff9fc4');
    g.c(50, 27, 15, '#8b5a3c');
    g.c(52, 10, 5.5, R); g.l(54, 6, 60, 0, 1.4, '#3fa34d');
    g.sprinkle(14, SPR, (i, j, v) => v === '#ff9fc4' || v === '#8b5a3c');
  } });
  PIC({ id: 'f-donut', name: 'Sprinkle Donut', cat: C, size: 32, bg: '#e7f7ff', ol: K, draw(g) {
    g.c(50, 50, 42, '#d9a066');
    g.c(50, 50, 35, '#ff7cc0'); for (let a = 0; a < 360; a += 40) g.c(50 + 35 * Math.cos(a * Math.PI / 180), 50 + 35 * Math.sin(a * Math.PI / 180), 5, '#ff7cc0');
    g.c(50, 50, 16, '#d9a066'); g.c(50, 50, 12, '#e7f7ff');
    g.sprinkle(40, SPR, (i, j, v) => v === '#ff7cc0');
  } });
  PIC({ id: 'f-cupcake', name: 'Cupcake', cat: C, size: 32, bg: '#fff0f6', ol: K, draw(g) {
    g.p([24, 56, 76, 56, 68, 95, 32, 95], '#4fb0ff');
    [34, 44, 56, 66].forEach((x) => g.l(x, 58, x + (50 - x) * 0.15, 93, 1.4, '#2f86d6'));
    g.c(34, 50, 13, '#fff1f8'); g.c(66, 50, 13, '#fff1f8'); g.c(50, 40, 17, '#fff1f8'); g.c(50, 26, 10, '#fff1f8');
    g.c(50, 14, 6, R); g.l(52, 9, 58, 2, 1.3, '#3fa34d');
    g.sprinkle(20, ['#ff4fa3', '#3df5ff', '#ffd23f', '#7ee36b'], (i, j, v) => v === '#fff1f8');
  } });
  PIC({ id: 'f-melon', name: 'Watermelon', cat: C, size: 32, bg: '#fffbe0', ol: K, draw(g) {
    g.shape((x, y) => y >= 30 && Math.hypot(x - 50, y - 30) <= 47, '#3fa34d');
    g.shape((x, y) => y >= 30 && Math.hypot(x - 50, y - 30) <= 41, '#e9ffd9');
    g.shape((x, y) => y >= 30 && Math.hypot(x - 50, y - 30) <= 37, '#ff4d6d');
    [[34, 42], [50, 46], [66, 42], [42, 56], [58, 56], [50, 64]].forEach(([x, y]) => g.e(x, y, 1.8, 3, K));
  } });
  PIC({ id: 'f-burger', name: 'Yummy Burger', cat: C, size: 32, bg: '#e0f4ff', ol: K, draw(g) {
    g.shape((x, y) => g.inE(50, 42, 40, 26)(x, y) && y <= 42, '#f2a541');
    g.r(9, 41, 91, 47, '#59c13f'); for (let x = 12; x < 92; x += 10) g.c(x, 47, 4, '#59c13f');
    g.p([12, 49, 88, 49, 80, 58, 64, 53, 50, 60, 36, 53, 20, 58], GD);
    g.rr(12, 52, 88, 66, 5, '#7a3e1d');
    g.rr(14, 66, 86, 80, 6, '#f2a541');
    [[34, 26], [50, 22], [64, 28], [42, 34], [58, 34]].forEach(([x, y]) => g.e(x, y, 2.4, 1.6, '#fff6d9'));
  } });
  PIC({ id: 'f-berry', name: 'Strawberry', cat: C, size: 32, bg: '#eaffe8', ol: K, draw(g) {
    g.e(50, 54, 32, 28, '#ff3b5c'); g.p([20, 56, 80, 56, 50, 96], '#ff3b5c');
    g.star(50, 26, 22, 8, 6, '#3fa34d'); g.l(50, 18, 52, 4, 3, '#3fa34d');
    [[36, 48], [50, 44], [64, 48], [42, 60], [58, 60], [50, 72], [30, 60], [70, 60], [44, 80], [56, 80]].forEach(([x, y]) => g.e(x, y, 1.5, 2.2, '#ffe14d'));
  } });
  // ---------- VEHICLES ----------
  C = 'vehicles';
  PIC({ id: 'v-racecar', name: 'Race Car', cat: C, size: 40, bg: '#d9f0ff', ol: K, draw(g) {
    g.r(0, 80, 100, 100, '#6b7280'); for (let x = 4; x < 100; x += 20) g.r(x, 89, x + 10, 91, W);
    g.r(4, 46, 14, 52, R); g.r(8, 52, 11, 58, D);
    g.p([6, 72, 10, 56, 34, 52, 44, 38, 68, 38, 78, 52, 94, 58, 94, 72], R);
    g.p([46, 42, 66, 42, 72, 52, 42, 52], '#9fe3ff');
    g.r(10, 60, 40, 63, W); g.c(58, 62, 5.5, W); g.r(57, 59, 59, 65, D);
    g.c(26, 74, 10, D); g.c(76, 74, 10, D); g.c(26, 74, 4, '#c0c6d8'); g.c(76, 74, 4, '#c0c6d8');
  } });
  PIC({ id: 'v-train', name: 'Choo-Choo Train', cat: C, size: 40, bg: '#c9f1ff', ol: K, draw(g) {
    g.r(0, 88, 100, 93, '#8b5a2b');
    g.r(54, 30, 88, 76, '#3a7bd5'); g.r(50, 24, 92, 31, '#1e3a8a'); g.r(62, 37, 80, 51, '#fff2b3');
    g.r(10, 46, 56, 76, R); g.r(10, 56, 56, 60, GD);
    g.r(18, 30, 28, 47, D); g.r(15, 27, 31, 31, D);
    g.c(24, 17, 6, '#e5e7eb'); g.c(34, 11, 5, '#e5e7eb'); g.c(44, 7, 4, '#e5e7eb');
    g.p([4, 76, 10, 62, 10, 76], D);
    g.c(24, 80, 8, D); g.c(46, 80, 8, D); g.c(72, 80, 9, D); g.c(24, 80, 3, GD); g.c(46, 80, 3, GD); g.c(72, 80, 3.5, GD);
  } });
  PIC({ id: 'v-firetruck', name: 'Fire Truck', cat: C, size: 40, bg: '#e6f6ff', ol: K, draw(g) {
    g.r(6, 44, 70, 76, R); g.r(70, 34, 94, 76, R); g.r(76, 40, 90, 54, '#9fe3ff');
    g.l(10, 38, 66, 38, 3, '#d1d5db'); for (let x = 14; x < 66; x += 8) g.l(x, 34, x, 42, 1.3, '#d1d5db');
    g.r(76, 27, 84, 34, '#3a7bd5'); g.r(6, 62, 94, 66, W);
    g.c(22, 79, 9, D); g.c(78, 79, 9, D); g.c(22, 79, 3.5, '#c0c6d8'); g.c(78, 79, 3.5, '#c0c6d8');
  } });
  PIC({ id: 'v-plane', name: 'Airplane', cat: C, size: 40, bg: '#bde4ff', ol: K, draw(g) {
    g.c(16, 82, 7, W); g.c(26, 80, 9, W); g.c(36, 84, 6, W); g.c(82, 20, 6, W); g.c(90, 18, 7, W);
    g.p([44, 48, 58, 48, 48, 20, 42, 20], '#2f62b8');
    g.p([8, 50, 12, 26, 24, 46], '#3a7bd5');
    g.e(50, 50, 41, 9, W);
    g.p([40, 52, 60, 52, 46, 86, 38, 86], '#3a7bd5');
    for (let x = 30; x < 76; x += 8) g.c(x, 48, 2, '#3a7bd5');
    g.e(84, 47, 5, 3, '#9fe3ff');
  } });
  PIC({ id: 'v-boat', name: 'Sailboat', cat: C, size: 40, bg: '#c4ecff', ol: K, draw(g) {
    g.c(16, 16, 9, GD);
    g.r(0, 76, 100, 100, '#3a86ff'); for (let x = 6; x < 100; x += 16) g.arc(x, 86, 5, 1.4, 200, 340, '#9fe3ff');
    g.p([16, 66, 84, 66, 72, 80, 28, 80], '#8b5a2b');
    g.r(48, 12, 52, 66, '#5c3a1a');
    g.p([55, 16, 55, 62, 86, 62], W); g.p([45, 22, 45, 62, 20, 62], '#ff6b6b');
    g.p([52, 12, 52, 5, 63, 8.5], GD);
  } });
  // ---------- SPACE ----------
  C = 'space'; const SP = '#140f33';
  const sky = (g, n) => g.sprinkle(n, [W, GD, '#9fe3ff'], (i, j, v) => v === SP);
  PIC({ id: 's-rocket', name: 'Rocket Ship', cat: C, size: 40, bg: SP, draw(g) {
    sky(g, 26);
    g.p([40, 78, 60, 78, 50, 99], '#ff8c1a'); g.p([44, 78, 56, 78, 50, 91], GD);
    g.p([30, 62, 40, 52, 40, 80, 26, 80], R); g.p([70, 62, 60, 52, 60, 80, 74, 80], R);
    g.e(50, 48, 14, 33, '#e8ecf5', '#9aa3b5');
    g.shape((x, y) => g.inE(50, 48, 14, 33)(x, y) && y < 27, R);
    g.c(50, 44, 7, '#9aa3b5'); g.c(50, 44, 5, '#5ad1ff');
    g.r(46, 60, 54, 80, R);
  } });
  PIC({ id: 's-saturn', name: 'Ringed Planet', cat: C, size: 40, bg: SP, draw(g) {
    sky(g, 30);
    const ring = (x, y) => g.inE(50, 50, 47, 13, -15)(x, y) && !g.inE(50, 50, 34, 7, -15)(x, y);
    g.shape(ring, '#ffcf7a');
    g.c(50, 50, 25, '#ff9f6b');
    g.shape((x, y) => g.inC(50, 50, 25)(x, y) && ((y > 36 && y < 41) || (y > 52 && y < 57)), '#f27a4a');
    const a = -15 * Math.PI / 180;
    g.shape((x, y) => ring(x, y) && (-(x - 50) * Math.sin(a) + (y - 50) * Math.cos(a)) > 0, '#ffcf7a');
  } });
  PIC({ id: 's-astro', name: 'Astronaut', cat: C, size: 40, bg: SP, draw(g) {
    sky(g, 26); g.c(88, 88, 12, '#7d5cff'); g.c(84, 84, 3, '#a68bff');
    g.e(23, 70, 7, 13, W, '#9aa3b5'); g.e(77, 70, 7, 13, W, '#9aa3b5');
    g.rr(28, 58, 72, 94, 8, W, '#9aa3b5');
    g.r(42, 66, 58, 77, R); g.c(46, 71.5, 1.8, GD); g.c(54, 71.5, 1.8, '#5ad1ff');
    g.c(50, 37, 24, W, '#9aa3b5');
    g.e(50, 39, 16, 12, '#2b3a67'); g.e(43, 35, 4, 3, '#7fb3ff');
  } });
  PIC({ id: 's-ufo', name: 'Flying Saucer', cat: C, size: 40, bg: SP, draw(g) {
    sky(g, 26);
    g.p([36, 62, 64, 62, 82, 100, 18, 100], '#3f7a5a');
    g.e(50, 44, 15, 15, '#9fe3ff', '#5a7aa8');
    g.c(50, 44, 6, '#7ee36b'); g.c(48, 43, 1.5, D); g.c(53, 43, 1.5, D);
    g.e(50, 57, 39, 10, '#9aa3b5', '#5b6478');
    [26, 38, 50, 62, 74].forEach((x, k) => g.c(x, x === 50 ? 60 : (x === 26 || x === 74 ? 57 : 59), 2.6, [GD, '#ff4fa3', '#5ad1ff', '#ff4fa3', GD][k]));
  } });
  PIC({ id: 's-alien', name: 'Friendly Alien', cat: C, size: 32, bg: '#c9b8ff', ol: K, draw(g) {
    const G = '#7ee36b';
    g.l(38, 26, 30, 8, 1.8, G); g.l(62, 26, 70, 8, 1.8, G); g.c(30, 8, 4.5, '#ff4fa3'); g.c(70, 8, 4.5, '#ff4fa3');
    g.e(50, 52, 33, 30, G);
    g.e(36, 48, 8, 10, K); g.e(64, 48, 8, 10, K); g.c(33, 44, 2.5, W); g.c(61, 44, 2.5, W);
    g.arc(50, 64, 8, 2, 20, 160, K);
    g.c(72, 32, 3, '#5cc95c'); g.c(28, 66, 2.5, '#5cc95c'); g.c(76, 62, 3.5, '#5cc95c');
  } });
  PIC({ id: 's-earth', name: 'Planet Earth', cat: C, size: 32, bg: SP, draw(g) {
    sky(g, 18);
    g.c(50, 50, 42, '#3a86ff', '#1e5bb8');
    g.p([24, 26, 40, 20, 46, 34, 36, 46, 40, 58, 30, 62, 20, 46], '#4caf50');
    g.p([56, 50, 72, 44, 82, 56, 74, 76, 60, 72], '#4caf50');
    g.p([54, 18, 70, 16, 74, 26, 60, 28], '#4caf50');
    g.e(34, 78, 10, 3, W); g.e(70, 32, 8, 2.6, W);
  } });
  PIC({ id: 's-moon', name: 'Sleepy Moon', cat: C, size: 32, bg: '#1b1640', draw(g) {
    g.sprinkle(16, [W, GD], (i, j, v) => v === '#1b1640');
    g.c(46, 50, 36, '#ffe27a'); g.c(64, 40, 30, '#1b1640');
    g.arc(26, 52, 4, 1.6, 20, 160, D); g.c(28, 64, 3.5, '#ffb38a');
    g.star(78, 72, 7, 3, 5, GD); g.star(84, 20, 5, 2, 5, W); g.star(60, 86, 4, 1.6, 5, W);
  } });
  // ---------- OCEAN ----------
  C = 'ocean';
  PIC({ id: 'o-fish', name: 'Clown Fish', cat: C, size: 32, bg: '#bfeaff', ol: K, draw(g) {
    g.p([8, 28, 30, 50, 8, 72], '#ff8c1a');
    g.p([48, 30, 60, 18, 66, 32], '#ff8c1a');
    const body = g.inE(55, 50, 33, 22);
    g.shape(body, '#ffa62b');
    g.shape((x, y) => body(x, y) && Math.abs(x - 46) < 4.5, W, K); g.shape((x, y) => body(x, y) && Math.abs(x - 68) < 4, W, K);
    g.c(77, 45, 4, W); g.c(78, 45, 2, K); g.arc(84, 54, 4, 1.3, 30, 150, K);
    g.ring(86, 18, 3, 5, W); g.ring(80, 8, 2, 3.5, W);
  } });
  PIC({ id: 'o-whale', name: 'Happy Whale', cat: C, size: 40, bg: '#c4ecff', ol: K, draw(g) {
    const B = '#4a7bd0';
    g.r(0, 86, 100, 100, '#3a86ff');
    g.p([76, 52, 96, 32, 90, 52, 98, 68], B);
    const body = g.inE(44, 58, 36, 24); g.shape(body, B);
    g.shape((x, y) => body(x, y) && g.inE(44, 72, 30, 13)(x, y), '#cfe3ff');
    g.c(24, 54, 3, K); g.arc(24, 58, 8, 1.4, 40, 120, K); g.c(32, 64, 3, PK);
    g.l(40, 32, 40, 20, 2.4, '#7fd3ff'); g.c(33, 16, 4.5, '#7fd3ff'); g.c(47, 16, 4.5, '#7fd3ff');
  } });
  PIC({ id: 'o-octopus', name: 'Octopus', cat: C, size: 32, bg: '#d6f6ff', ol: K, draw(g) {
    const P = '#c86bff';
    [[26, 18, 88], [36, 30, 94], [46, 44, 96], [54, 58, 96], [64, 70, 94], [74, 84, 88]].forEach(([x, x2, y2]) => { g.l(x, 58, x2, y2, 8, P); g.c(x2, y2, 4, P); });
    g.e(50, 42, 30, 28, P);
    g.c(40, 42, 6, W); g.c(60, 42, 6, W); g.c(41, 43, 3, K); g.c(59, 43, 3, K);
    g.arc(50, 52, 6, 1.6, 20, 160, K);
    g.c(36, 24, 3.5, '#e2a6ff'); g.c(62, 22, 3, '#e2a6ff'); g.c(70, 34, 2.5, '#e2a6ff');
  } });
  PIC({ id: 'o-jelly', name: 'Jellyfish', cat: C, size: 32, bg: '#1d3c78', draw(g) {
    g.sprinkle(10, ['#3a5ca8'], (i, j, v) => v === '#1d3c78');
    [30, 42, 56, 70].forEach((x, k) => g.pl([x, 50, x + 5, 62, x - 3, 74, x + 4, 86, x, 96], 2.5, k % 2 ? '#ffc7f0' : '#c9a6ff'));
    g.shape((x, y) => g.inE(50, 46, 32, 30)(x, y) && y <= 48, '#ff9fe0', '#b44fa0');
    for (let x = 22; x <= 78; x += 9.3) g.c(x, 48, 5, '#ff9fe0', '#b44fa0');
    g.c(41, 34, 3, D); g.c(59, 34, 3, D); g.arc(50, 38, 5, 1.5, 20, 160, D); g.c(34, 40, 3, '#ff6fc0'); g.c(66, 40, 3, '#ff6fc0');
  } });
  PIC({ id: 'o-crab', name: 'Crabby', cat: C, size: 32, bg: '#fbe8c3', ol: K, draw(g) {
    const Rd = '#ff5a3c';
    g.l(30, 64, 14, 80, 3.2, Rd); g.l(34, 68, 22, 86, 3.2, Rd); g.l(70, 64, 86, 80, 3.2, Rd); g.l(66, 68, 78, 86, 3.2, Rd);
    g.l(24, 40, 34, 54, 4, Rd); g.l(76, 40, 66, 54, 4, Rd);
    g.c(18, 30, 10, Rd); g.c(82, 30, 10, Rd); g.p([14, 18, 22, 30, 10, 26], '#fbe8c3'); g.p([86, 18, 78, 30, 90, 26], '#fbe8c3');
    g.e(50, 62, 29, 19, Rd);
    g.l(42, 46, 40, 34, 2, K); g.l(58, 46, 60, 34, 2, K); g.c(40, 32, 4.5, W, K); g.c(60, 32, 4.5, W, K); g.c(40, 33, 2, K); g.c(60, 33, 2, K);
    g.arc(50, 62, 7, 1.8, 20, 160, K);
  } });
  PIC({ id: 'o-starfish', name: 'Starfish', cat: C, size: 32, bg: '#8fd8ff', ol: K, draw(g) {
    g.star(50, 53, 47, 20, 5, '#ff7b54');
    [[50, 22], [26, 46], [74, 46], [36, 76], [64, 76], [50, 34], [40, 64], [60, 64]].forEach(([x, y]) => g.c(x, y, 2, '#ffd2b8'));
    g.c(43, 50, 3, K); g.c(57, 50, 3, K); g.arc(50, 55, 5, 1.6, 20, 160, K);
  } });
  PIC({ id: 'o-reef', name: 'Coral Reef', cat: C, size: 48, bg: '#3fb5ff', draw(g) {
    g.map((i, j) => (j < 10 ? '#7fd3ff' : j < 22 ? '#5ac4ff' : undefined));
    g.r(0, 84, 100, 100, '#f2d58b');
    g.l(10, 86, 8, 50, 2.5, '#2fae60'); g.l(14, 86, 18, 60, 2.5, '#2fae60'); g.l(88, 86, 90, 46, 2.5, '#2fae60');
    g.rr(22, 52, 30, 88, 4, '#ff6fb1'); g.rr(30, 62, 37, 88, 3, '#ff6fb1'); g.c(26, 52, 5, '#ff6fb1');
    g.rr(62, 58, 70, 88, 4, '#ff9a3d'); g.rr(70, 66, 76, 88, 3, '#ff9a3d'); g.l(64, 60, 58, 50, 3, '#ff9a3d');
    g.c(48, 82, 9, '#b388ff'); g.c(80, 84, 6, '#ffd23f');
    const fish = (x, y, c, dir) => { g.p(dir > 0 ? [x - 8, y - 4, x - 3, y, x - 8, y + 4] : [x + 8, y - 4, x + 3, y, x + 8, y + 4], c); g.e(x, y, 5, 3.5, c); g.c(x + dir * 2.5, y - 0.8, 1, D); };
    fish(44, 30, '#ffd23f', 1); fish(72, 22, '#ff5a5a', -1); fish(60, 44, '#ff9fe0', 1); fish(20, 30, '#7ee36b', -1);
    g.ring(50, 12, 1.5, 3, W); g.ring(54, 6, 1, 2.4, W);
  } });
  // ---------- HOLIDAYS ----------
  C = 'holidays'; const NV = '#2a1f5c';
  PIC({ id: 'h-pumpkin', name: "Jack-o'-Lantern", cat: C, size: 32, bg: NV, ol: K, draw(g) {
    g.sprinkle(12, [W, GD], (i, j, v) => v === NV);
    g.rr(45, 8, 55, 26, 2, '#4c8c2b');
    g.e(33, 58, 21, 30, '#ff7b1a'); g.e(67, 58, 21, 30, '#ff7b1a'); g.e(50, 58, 21, 32, '#ff9a2e');
    const Y = '#ffe14d';
    g.p([29, 48, 43, 48, 36, 36], Y); g.p([57, 48, 71, 48, 64, 36], Y); g.p([46, 60, 54, 60, 50, 53], Y);
    g.p([26, 66, 74, 66, 68, 78, 60, 73, 50, 80, 40, 73, 32, 78], Y);
  } });
  PIC({ id: 'h-ghost', name: 'Friendly Ghost', cat: C, size: 32, bg: NV, ol: K, draw(g) {
    g.sprinkle(14, [GD, '#9fe3ff'], (i, j, v) => v === NV);
    g.e(17, 58, 7, 4.5, W); g.e(83, 58, 7, 4.5, W);
    g.e(50, 40, 29, 30, W); g.r(21, 40, 79, 82, W);
    [28, 42, 56, 70].forEach((x, k) => g.c(x, k % 2 ? 84 : 82, 7.5, W));
    g.e(40, 42, 4, 6, K); g.e(60, 42, 4, 6, K); g.e(50, 58, 4, 5, K);
    g.c(32, 52, 3.5, PK); g.c(68, 52, 3.5, PK);
  } });
  PIC({ id: 'h-bat', name: 'Little Bat', cat: C, size: 32, bg: '#231b4f', draw(g) {
    g.sprinkle(12, [W], (i, j, v) => v === '#231b4f');
    g.c(50, 46, 40, '#ffe9a8');
    const B = '#3b2a5c';
    g.p([50, 42, 8, 30, 14, 44, 4, 56, 18, 54, 24, 64, 36, 56, 50, 62, 64, 56, 76, 64, 82, 54, 96, 56, 86, 44, 92, 30], B);
    g.e(50, 52, 12, 14, B); g.p([42, 44, 40, 30, 48, 40], B); g.p([58, 44, 60, 30, 52, 40], B);
    g.c(45, 50, 2.6, '#ffe14d'); g.c(55, 50, 2.6, '#ffe14d'); g.p([46, 58, 49, 58, 47.5, 63], W); g.p([51, 58, 54, 58, 52.5, 63], W);
  } });
  PIC({ id: 'h-witchhat', name: 'Witch Hat', cat: C, size: 32, bg: '#d8c4ff', ol: K, draw(g) {
    g.e(50, 80, 46, 10, '#3b2a5c');
    g.p([26, 78, 74, 78, 58, 30, 76, 12, 48, 22], '#5b3d8f');
    g.p([30, 64, 70, 64, 72, 72, 28, 72], '#ff8c1a');
    g.r(44, 62, 56, 74, GD); g.r(47, 65, 53, 71, '#ff8c1a');
    g.star(18, 22, 7, 3, 5, GD); g.star(86, 44, 5, 2, 5, W);
  } });
  PIC({ id: 'h-candycorn', name: 'Candy Corn', cat: C, size: 24, bg: '#e6fff5', ol: K, draw(g) {
    const tri = g.inP([24, 90, 76, 90, 54, 8, 46, 8]);
    g.shape((x, y) => tri(x, y) || g.inE(50, 90, 26, 6)(x, y), '#ffd23f');
    g.shape((x, y) => tri(x, y) && y < 64, '#ff8c1a');
    g.shape((x, y) => tri(x, y) && y < 34, W);
    g.c(43, 72, 2.5, K); g.c(57, 72, 2.5, K); g.arc(50, 76, 4, 1.4, 20, 160, K);
  } });
  PIC({ id: 'h-spider', name: 'Silly Spider', cat: C, size: 32, bg: '#ffe6b3', draw(g) {
    g.l(50, 0, 50, 30, 1.2, '#8a8a99');
    const B = '#3b2a5c';
    [[-1, 1]].forEach(() => {});
    [[40, 48, 14, 36], [40, 54, 10, 54], [40, 60, 12, 72], [42, 64, 22, 86], [60, 48, 86, 36], [60, 54, 90, 54], [60, 60, 88, 72], [58, 64, 78, 86]].forEach(([a, b, c, d]) => g.l(a, b, c, d, 3, B));
    g.c(50, 58, 16, B); g.c(50, 38, 10, B);
    g.c(45, 37, 4, W); g.c(55, 37, 4, W); g.c(45, 38, 2, K); g.c(55, 38, 2, K);
    g.arc(50, 60, 6, 1.6, 20, 160, '#ff8c1a'); g.c(50, 74, 3, '#ff8c1a');
  } });
  PIC({ id: 'h-tree', name: 'Holiday Tree', cat: C, size: 40, bg: '#d6efff', ol: K, draw(g) {
    const G = '#2f9e44';
    g.r(43, 80, 57, 95, '#8b5a2b');
    g.p([50, 12, 22, 42, 78, 42], G); g.p([50, 26, 16, 62, 84, 62], G); g.p([50, 42, 9, 84, 91, 84], G);
    g.star(50, 12, 9, 4, 5, GD);
    [[42, 34, R], [58, 38, '#3a86ff'], [36, 54, GD], [60, 56, R], [48, 48, '#ff4fa3'], [28, 76, '#3a86ff'], [46, 70, R], [66, 74, GD], [76, 80, '#ff4fa3']].forEach(([x, y, c]) => g.c(x, y, 3, c));
  } });
  PIC({ id: 'h-snowman', name: 'Snowman', cat: C, size: 32, bg: '#bfe3ff', ol: K, draw(g) {
    g.sprinkle(16, [W], (i, j, v) => v === '#bfe3ff');
    g.r(0, 90, 100, 100, W);
    g.l(34, 46, 16, 34, 1.8, '#8b5a2b'); g.l(66, 46, 84, 34, 1.8, '#8b5a2b');
    g.c(50, 74, 21, W); g.c(50, 47, 15, W); g.c(50, 24, 11, W);
    g.r(40, 2, 60, 15, D); g.r(35, 13, 65, 17, D);
    g.c(46, 22, 1.8, D); g.c(54, 22, 1.8, D); g.p([50, 25, 62, 27, 50, 29], '#ff8c1a');
    g.r(38, 32, 62, 37, R); g.r(54, 36, 60, 47, R);
    g.c(50, 48, 2, D); g.c(50, 58, 2, D); g.c(50, 70, 2, D);
  } });
  // ---------- FANTASY ----------
  C = 'fantasy';
  PIC({ id: 'x-dragon', name: 'Baby Dragon', cat: C, size: 48, bg: '#ffe9f5', ol: K, draw(g) {
    const G = '#5cc98c', P = '#b388ff';
    g.p([32, 44, 6, 20, 14, 46, 4, 54, 26, 58], P); g.p([68, 44, 94, 20, 86, 46, 96, 54, 74, 58], P);
    g.p([64, 78, 88, 88, 94, 74, 86, 76], G); g.p([88, 66, 100, 72, 92, 80], '#ff8a3d');
    g.e(50, 73, 23, 20, G); g.e(50, 77, 13, 14, '#ffe7a3');
    g.l(42, 72, 58, 72, 1, '#e8c56a'); g.l(41, 80, 59, 80, 1, '#e8c56a');
    g.e(38, 93, 8, 5, G); g.e(62, 93, 8, 5, G);
    g.p([45, 20, 50, 10, 55, 20], '#ff8a3d');
    g.p([33, 26, 28, 8, 41, 20], GD); g.p([67, 26, 72, 8, 59, 20], GD);
    g.e(50, 38, 25, 20, G);
    g.e(50, 48, 13, 8, '#7ee3a0');
    g.c(40, 35, 4.5, K); g.c(60, 35, 4.5, K); g.c(39, 33.5, 1.7, W); g.c(59, 33.5, 1.7, W);
    g.c(46, 48, 1.3, K); g.c(54, 48, 1.3, K); g.c(31, 44, 3, PK); g.c(69, 44, 3, PK);
  } });
  PIC({ id: 'x-castle', name: 'Royal Castle', cat: C, size: 48, bg: '#cdeaff', ol: K, draw(g) {
    const S = '#c3c9d9', S2 = '#aab2c8';
    g.c(16, 14, 6, W); g.c(24, 12, 7, W); g.c(84, 22, 5, W);
    g.r(0, 90, 100, 100, '#6fd25b');
    g.r(20, 46, 80, 90, S); for (let x = 20; x < 80; x += 10) g.r(x, 40, x + 5, 46, S);
    g.r(8, 30, 26, 90, S2); g.r(74, 30, 92, 90, S2);
    g.p([5, 31, 29, 31, 17, 6], R); g.p([71, 31, 95, 31, 83, 6], R);
    g.r(40, 24, 60, 46, S); g.p([37, 25, 63, 25, 50, 3], '#7b2ff7');
    g.rr(42, 64, 58, 90, 8, '#8b5a2b'); g.r(42, 76, 58, 90, '#8b5a2b'); g.l(50, 66, 50, 90, 1, '#5c3a1a');
    g.rr(14, 44, 20, 54, 3, D); g.rr(80, 44, 86, 54, 3, D); g.rr(47, 30, 53, 38, 3, D); g.rr(28, 58, 34, 66, 3, D); g.rr(66, 58, 72, 66, 3, D);
    g.p([17, 7, 17, 0, 25, 3.5], GD); g.p([83, 7, 83, 0, 91, 3.5], GD);
  } });
  PIC({ id: 'x-crown', name: 'Golden Crown', cat: C, size: 32, bg: '#fff1f9', ol: K, draw(g) {
    g.p([14, 70, 14, 30, 32, 50, 50, 22, 68, 50, 86, 30, 86, 70], GD);
    g.r(14, 70, 86, 84, '#e6b800');
    g.c(50, 77, 4.5, R); g.c(30, 77, 3.5, '#3a86ff'); g.c(70, 77, 3.5, '#3fa34d');
    g.c(14, 28, 4.5, '#ff4fa3'); g.c(50, 20, 4.5, '#ff4fa3'); g.c(86, 28, 4.5, '#ff4fa3');
    g.c(50, 52, 4.5, '#5ad1ff');
  } });
  PIC({ id: 'x-rainbow', name: 'Rainbow', cat: C, size: 40, bg: '#c7ecff', ol: K, draw(g) {
    const cols = [R, '#ff8c1a', GD, '#4caf50', '#3a86ff', '#7b2ff7'];
    cols.forEach((c, k) => { const r2 = 46 - k * 6; g.shape((x, y) => y <= 72 && Math.hypot(x - 50, y - 72) <= r2 && Math.hypot(x - 50, y - 72) > r2 - 6, c); });
    g.c(12, 72, 9, W); g.c(22, 76, 8, W); g.c(6, 78, 6, W); g.c(88, 72, 9, W); g.c(78, 76, 8, W); g.c(94, 78, 6, W);
    g.c(86, 16, 8, GD);
  } });
  PIC({ id: 'x-mushroom', name: 'Mushroom House', cat: C, size: 40, bg: '#d9f7ff', ol: K, draw(g) {
    g.r(0, 86, 100, 100, '#6fd25b');
    g.rr(30, 48, 70, 88, 6, '#fff1d6');
    g.rr(44, 64, 56, 88, 5, '#8b5a2b'); g.c(53, 76, 1.2, GD);
    g.c(36, 62, 4, '#9fe3ff'); g.c(64, 62, 4, '#9fe3ff');
    g.shape((x, y) => g.inE(50, 48, 42, 26)(x, y) && y <= 52, R);
    g.c(32, 38, 5, W); g.c(55, 30, 6, W); g.c(72, 44, 4, W); g.c(46, 46, 3, W); g.c(18, 48, 2.5, W);
    g.c(12, 86, 3, '#ff4fa3'); g.c(88, 86, 3, GD); g.c(20, 88, 2.5, '#ff4fa3');
  } });
  PIC({ id: 'x-potion', name: 'Magic Potion', cat: C, size: 32, bg: '#fff3d6', ol: K, draw(g) {
    g.r(42, 22, 58, 44, '#d9ccff');
    g.c(50, 64, 27, '#d9ccff');
    g.shape((x, y) => g.inC(50, 64, 27)(x, y) && y >= 56, '#ff4fa3');
    g.rr(39, 10, 61, 24, 3, '#a0703f');
    g.c(44, 72, 3, '#ffc2e8'); g.c(58, 80, 2.4, '#ffc2e8'); g.c(54, 66, 2, '#ffc2e8');
    g.e(37, 54, 3, 6, W);
    g.star(16, 22, 7, 2.4, 4, '#7b2ff7'); g.star(84, 30, 6, 2, 4, '#3a86ff'); g.star(84, 84, 5, 1.6, 4, '#ff4fa3');
  } });
})();
