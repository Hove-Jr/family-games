/* Sports (v2) */
(function () {
  const C = 'sports', K = '#2b2b3a', W = '#ffffff', FIELD = '#7fd36b', SKY = '#bfe6ff';
  const digit8 = (g, x, y, w, h, col) => { const t = w / 3.2; g.r(x, y, x + w, y + t, col); g.r(x, y + h / 2 - t / 2, x + w, y + h / 2 + t / 2, col); g.r(x, y + h - t, x + w, y + h, col); g.r(x, y, x + t, y + h, col); g.r(x + w - t, y, x + w, y + h, col); };
  PIC({ id: 's-football', name: 'Football', cat: C, size: 20, bg: '#bdf0b0', ol: K, draw(g) {
    g.e(50, 50, 42, 26, '#a0522d', null, -30);
    g.l(30, 62, 70, 38, 3, W); for (let k = 0; k < 4; k++) { const t = 0.3 + k * 0.13, x = 30 + 40 * t, y = 62 - 24 * t; g.l(x - 4, y - 6, x + 4, y + 6, 2, W); }
    g.l(18, 58, 26, 72, 3, W); g.l(74, 28, 82, 42, 3, W);
  } });
  PIC({ id: 's-helmet', name: 'Football Helmet', cat: C, size: 32, bg: '#ffe9a8', ol: K, sh: true, draw(g) {
    g.shape((x, y) => ((x - 46) / 36) ** 2 + ((y - 50) / 34) ** 2 <= 1 && y < 78 && !(x > 66 && y > 52), '#1e6bff');
    g.shape((x, y) => ((x - 46) / 36) ** 2 + ((y - 50) / 34) ** 2 <= 1 && Math.abs(x - 40 - (y - 20) * 0.05) < 4 && y < 50, W);
    g.c(44, 60, 6, '#2b2b3a'); g.c(44, 60, 3, '#5b6270');
    g.l(66, 52, 92, 52, 3, '#c3cad5'); g.l(66, 64, 92, 64, 3, '#c3cad5'); g.l(90, 52, 90, 76, 3, '#c3cad5'); g.l(70, 52, 72, 78, 3, '#c3cad5'); g.l(72, 76, 90, 76, 3, '#c3cad5');
    g.e(30, 30, 5, 3, '#6aa3ff');
  } });
  PIC({ id: 's-goalpost', name: 'Goal Post', cat: C, size: 24, bg: SKY, ol: K, draw(g) {
    g.r(0, 72, 100, 100, FIELD); for (let y = 78; y < 100; y += 8) g.r(0, y, 100, y + 2, '#a5e394');
    g.r(45, 44, 55, 88, '#ffd23f'); g.r(14, 38, 86, 48, '#ffd23f'); g.r(14, 4, 24, 48, '#ffd23f'); g.r(76, 4, 86, 48, '#ffd23f');
    g.e(50, 20, 13, 8, '#a0522d', null, -25); g.l(44, 22, 56, 17, 1.4, W);
  } });
  PIC({ id: 's-soccer', name: 'Soccer Ball', cat: C, size: 24, bg: '#c8f7c5', ol: K, sh: true, nosh: ['#2b2b3a'], draw(g) {
    g.c(50, 50, 44, W);
    const inBall = (x, y) => (x - 50) ** 2 + (y - 50) ** 2 <= 43 * 43;
    const pent = (cx, cy, r, rot) => { const pts = []; for (let k = 0; k < 5; k++) { const a = ((rot + k * 72 - 90) * Math.PI) / 180; pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a)); } const f = g.inP(pts); g.shape((x, y) => f(x, y) && inBall(x, y), K); };
    pent(50, 50, 12, 0); for (let k = 0; k < 5; k++) { const a = ((k * 72 - 90) * Math.PI) / 180; pent(50 + 40 * Math.cos(a), 50 + 40 * Math.sin(a), 10, 180); }
    for (let k = 0; k < 5; k++) { const a = ((k * 72 - 90) * Math.PI) / 180; g.l(50 + 12 * Math.cos(a), 50 + 12 * Math.sin(a), 50 + 31 * Math.cos(a), 50 + 31 * Math.sin(a), 1.4, K); }
  } });
  PIC({ id: 's-goal', name: 'Soccer Goal', cat: C, size: 24, bg: SKY, ol: K, draw(g) {
    g.r(0, 72, 100, 100, FIELD);
    g.r(10, 20, 90, 72, '#e6eef7'); for (let x = 16; x < 90; x += 8) g.l(x, 22, x, 72, 1, '#b8c4d6'); for (let y = 28; y < 72; y += 8) g.l(12, y, 88, y, 1, '#b8c4d6');
    g.r(8, 18, 92, 23, W); g.r(8, 18, 13, 74, W); g.r(87, 18, 92, 74, W);
    g.c(64, 80, 11, W); g.c(64, 80, 4, K); g.c(56, 74, 2.5, K); g.c(72, 74, 2.5, K); g.c(58, 88, 2.5, K); g.c(70, 88, 2.5, K);
  } });
  PIC({ id: 's-basketball', name: 'Basketball', cat: C, size: 24, bg: '#ffe3f1', ol: K, sh: true, nosh: ['#2b2b3a'], draw(g) {
    g.c(50, 50, 44, '#ff8c1a'); g.l(50, 6, 50, 94, 2, K); g.l(6, 50, 94, 50, 2, K);
    g.arc(8, 50, 30, 2, 300, 60, K); g.arc(92, 50, 30, 2, 120, 240, K); g.e(34, 26, 6, 4, '#ffb066');
  } });
  PIC({ id: 's-hoop', name: 'Basketball Hoop', cat: C, size: 32, bg: '#d6ecff', ol: K, sh: true, draw(g) {
    g.r(0, 88, 100, 100, '#e0a96d'); g.r(47, 56, 53, 92, '#7b8494');
    g.r(18, 8, 82, 50, W); g.r(36, 22, 64, 42, '#e63946'); g.r(40, 26, 60, 42, W);
    g.r(30, 44, 70, 48, '#ff5a1f');
    g.p([32, 48, 68, 48, 62, 66, 38, 66], '#f4f7ff'); g.l(40, 48, 44, 66, 1.3, '#c3cad5'); g.l(50, 48, 50, 66, 1.3, '#c3cad5'); g.l(60, 48, 56, 66, 1.3, '#c3cad5'); g.l(34, 56, 66, 56, 1.3, '#c3cad5');
    g.c(80, 74, 12, '#ff8c1a'); g.l(80, 62, 80, 86, 1.5, K); g.l(68, 74, 92, 74, 1.5, K);
  } });
  PIC({ id: 's-baseball', name: 'Baseball', cat: C, size: 20, bg: '#c8e6ff', ol: K, draw(g) {
    g.c(50, 50, 44, W); g.arc(6, 50, 30, 3, 300, 60, '#e63946'); g.arc(94, 50, 30, 3, 120, 240, '#e63946');
  } });
  PIC({ id: 's-batglove', name: 'Bat and Glove', cat: C, size: 32, bg: '#bdf0b0', ol: K, sh: true, draw(g) {
    g.l(12, 88, 56, 26, 12, '#e0a96d'); g.l(50, 34, 68, 8, 18, '#e0a96d'); g.l(10, 90, 18, 80, 14, '#8b5a2b');
    g.e(68, 66, 24, 26, '#b5652b'); g.e(48, 74, 8, 14, '#b5652b', null, 40);
    for (const x of [54, 64, 74, 84]) g.e(x, 42, 5, 12, '#b5652b');
    g.e(68, 68, 14, 15, '#d08850'); g.c(66, 66, 9, W); g.arc(58, 66, 7, 1.4, 300, 60, '#e63946'); g.arc(74, 66, 7, 1.4, 120, 240, '#e63946');
  } });
  PIC({ id: 's-trophy', name: 'Trophy', cat: C, size: 24, bg: '#e8e2ff', ol: K, sh: true, draw(g) {
    g.ring(20, 36, 8, 14, '#ffc300'); g.ring(80, 36, 8, 14, '#ffc300');
    g.p([22, 16, 78, 16, 72, 46, 60, 58, 40, 58, 28, 46], '#ffd23f'); g.r(44, 56, 56, 72, '#ffc300');
    g.r(30, 72, 70, 80, '#ffc300'); g.r(24, 80, 76, 92, '#8b5a2b'); g.r(38, 84, 62, 88, '#ffd23f');
    g.star(50, 34, 10, 4.5, 5, W); g.l(30, 20, 34, 42, 2, '#fff1a8');
  } });
  PIC({ id: 's-jersey', name: 'Jersey Number 7', cat: C, size: 24, bg: '#fff3c4', ol: K, sh: true, draw(g) {
    g.p([30, 10, 42, 10, 50, 18, 58, 10, 70, 10, 94, 24, 84, 42, 76, 36, 76, 92, 24, 92, 24, 36, 16, 42, 6, 24], '#e63946');
    g.p([42, 10, 50, 18, 58, 10, 54, 8, 46, 8], W); g.r(6, 24, 16, 30, W); g.r(84, 24, 94, 30, W);
    g.r(36, 38, 64, 47, W); g.l(60, 44, 46, 80, 9, W);
  } });
  PIC({ id: 's-medal', name: 'Gold Medal', cat: C, size: 20, bg: '#e3f3ff', ol: K, draw(g) {
    g.p([22, 0, 40, 0, 56, 46, 44, 50], '#3a86ff'); g.p([78, 0, 60, 0, 44, 46, 56, 50], '#e63946');
    g.c(50, 66, 26, '#ffc300'); g.c(50, 66, 18, '#ffd23f'); g.star(50, 66, 12, 5, 5, '#fff1a8');
  } });
  PIC({ id: 's-tennis', name: 'Tennis Racket', cat: C, size: 24, bg: '#d6f5e3', ol: K, draw(g) {
    g.l(36, 62, 14, 92, 7, '#5b4bd1'); g.e(54, 38, 28, 32, '#e63946', null, 35); g.e(54, 38, 22, 26, '#fff8e1', null, 35);
    g.shape((x, y) => { const dx = x - 54, dy = y - 38, a = 35 * Math.PI / 180, u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a); return (u * u) / 484 + (v * v) / 676 <= 1 && ((Math.round(x / 8) * 8 === Math.round(x)) || (Math.round(y / 8) * 8 === Math.round(y))); }, '#c9c0a8');
    g.c(82, 82, 10, '#d4f53c'); g.arc(76, 82, 8, 1.4, 300, 60, W);
  } });
  PIC({ id: 's-hockey', name: 'Hockey Stick', cat: C, size: 20, bg: '#e2f3ff', ol: K, draw(g) {
    g.r(0, 72, 100, 100, '#f4fbff'); g.r(0, 86, 100, 89, '#9fd8ff');
    g.l(72, 4, 46, 68, 17, '#e0a96d'); g.p([38, 60, 54, 72, 50, 84, 10, 84, 8, 74], '#e0a96d'); g.l(67, 16, 61, 32, 17, '#3a86ff');
    g.e(78, 80, 14, 7, K);
  } });
  PIC({ id: 's-bowling', name: 'Bowling', cat: C, size: 24, bg: '#ffe6f0', ol: K, sh: true, draw(g) {
    g.e(36, 26, 10, 12, W); g.r(31, 34, 41, 42, W); g.e(36, 64, 16, 26, W); g.r(29, 34, 43, 37, '#e63946'); g.r(29, 40, 43, 43, '#e63946');
    g.c(72, 70, 20, '#5b4bd1'); g.c(66, 62, 3, K); g.c(76, 60, 3, K); g.c(72, 70, 3, K); g.e(64, 58, 4, 2, '#8f80ff');
  } });
  PIC({ id: 's-sneaker', name: 'Sneaker', cat: C, size: 24, bg: '#dff6ff', ol: K, sh: true, draw(g) {
    g.p([8, 70, 10, 40, 34, 36, 42, 46, 72, 54, 92, 62, 94, 72], '#3a86ff');
    g.r(6, 70, 96, 80, W); g.l(30, 44, 46, 52, 2, W); g.l(26, 50, 42, 58, 2, W);
    g.p([50, 56, 70, 58, 56, 66], '#ffd23f'); g.r(8, 40, 14, 70, '#e63946');
  } });
  PIC({ id: 's-skate', name: 'Skateboard', cat: C, size: 20, bg: '#fff1b8', ol: K, draw(g) {
    g.rr(4, 44, 96, 58, 7, '#ff4fa3'); g.r(18, 48, 82, 54, '#7b2ff7');
    g.r(20, 58, 30, 64, '#9aa3ae'); g.r(70, 58, 80, 64, '#9aa3ae');
    g.c(20, 70, 7, '#ffd23f'); g.c(30, 70, 7, '#ffd23f'); g.c(70, 70, 7, '#ffd23f'); g.c(80, 70, 7, '#ffd23f');
  } });
})();
