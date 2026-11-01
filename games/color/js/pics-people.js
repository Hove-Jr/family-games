/* People (v3): friendly, diverse everyday heroes and families, original chibi art for Pixel Pop. */
(function () {
  const C = 'people', K = '#2b2b3a', W = '#ffffff', R = '#ff5a5a', GD = '#ffd23f', B = '#3a86ff', PK = '#ff4fa3', G = '#22c58b';
  const S1 = '#ffd9b8', S2 = '#f1c08f', S3 = '#c68642', S4 = '#8d5524';
  const H1 = '#6b3e26', H2 = '#4a3426', H3 = '#f5c542', H4 = '#d9622b';
  const chibi = (g, o) => window.PixChibi(g, o);
  // ---- easy (20) ----
  PIC({ id: 'pp-kid', name: 'Happy Kid', cat: C, size: 20, bg: '#fff6d6', ol: K, draw(g) {
    chibi(g, { hair: H4, skin: S1, fit: G, fit2: GD, pose: 'up', legs: B });
    g.c(84, 16, 11, GD);
  } });
  PIC({ id: 'pp-fire', name: 'Firefighter', cat: C, size: 20, bg: '#ffe6d6', ol: K, draw(g) {
    chibi(g, { hair: H2, skin: S4, fit: '#ff7a1a', fit2: GD, pose: 'wave', legs: '#ff7a1a', shoes: K,
      over: (g, X, Y) => { g.e(X(50), Y(14), 27, 9, R); g.r(X(44), Y(4), X(56), Y(16), R); g.r(X(46), Y(8), X(54), Y(14), GD); } });
  } });
  PIC({ id: 'pp-doctor', name: 'Doctor', cat: C, size: 20, bg: '#e2f6ff', ol: K, draw(g) {
    chibi(g, { hair: H1, style: 'long', skin: S3, fit: W, fit2: '#7fd3ff', pose: 'wave', legs: '#2e8bff',
      over: (g, X, Y) => { g.arc(X(50), Y(62), 9, 3, 0, 180, '#4a4a5e'); g.c(X(50), Y(74), 3.5, '#c0c6d8'); g.r(X(60), Y(62), X(64), Y(74), R); g.r(X(56), Y(66), X(68), Y(70), R); } });
  } });
  PIC({ id: 'pp-chef', name: 'Chef', cat: C, size: 20, bg: '#fff0e0', ol: K, draw(g) {
    chibi(g, { hair: H2, skin: S2, fit: W, fit2: R, pose: 'wave', legs: '#4a4a5e',
      over: (g, X, Y) => { g.r(X(30), Y(10), X(70), Y(18), W); g.c(X(36), Y(6), 9, W); g.c(X(50), Y(3), 10, W); g.c(X(64), Y(6), 9, W); } });
  } });
  PIC({ id: 'pp-astro', name: 'Astronaut', cat: C, size: 20, bg: '#1b1640', ol: '#9aa3b5', draw(g) {
    g.sprinkle(14, [W, GD], (i, j, v) => v === '#1b1640');
    chibi(g, { hair: '#8d6bff', skin: S3, fit: W, fit2: R, pose: 'up', legs: W, shoes: '#9aa3b5',
      under: (g, X, Y) => g.c(X(50), Y(36), 31, '#c0c6d8'),
      over: (g, X, Y) => g.ring(X(50), Y(36), 24, 31, W) });
  } });
  PIC({ id: 'pp-hero', name: 'Super Kid', cat: C, size: 20, bg: '#d9fff0', ol: K, draw(g) {
    chibi(g, { hair: H2, skin: S4, fit: B, fit2: GD, pose: 'up', legs: B, shoes: R,
      under: (g, X, Y) => g.p([X(36), Y(60), X(64), Y(60), X(78), Y(94), X(22), Y(94)], R),
      preface: (g, X, Y) => g.r(X(30), Y(33), X(70), Y(44), R) });
  } });
  PIC({ id: 'pp-builder', name: 'Builder', cat: C, size: 20, bg: '#e8f0ff', ol: K, draw(g) {
    chibi(g, { hair: H3, skin: S1, fit: '#ff8c1a', fit2: GD, pose: 'down', legs: B, shoes: H1,
      over: (g, X, Y) => { g.e(X(50), Y(15), 26, 10, GD); g.r(X(24), Y(18), X(76), Y(22), GD); } });
  } });
  // ---- medium (32) ----
  PIC({ id: 'pp-princess', name: 'Princess', cat: C, size: 32, bg: '#ffeefa', ol: K, draw(g) {
    g.star(15, 16, 11, 5, 5, GD); g.heart(85, 82, 9, PK);
    chibi(g, { y: -2, hair: H2, style: 'long', skin: S4, fit: '#c86bff', fit2: GD, pose: 'wave', skirt: true, prop: 'crown', shoes: PK,
      under: (g, X, Y) => g.p([X(30), Y(70), X(70), Y(70), X(82), Y(94), X(18), Y(94)], '#c86bff') });
  } });
  PIC({ id: 'pp-soccer', name: 'Soccer Star', cat: C, size: 32, bg: '#bfe6ff', ol: K, draw(g) {
    g.r(0, 80, 100, 100, '#7fd36b'); g.r(0, 88, 100, 90, W);
    chibi(g, { y: -6, s: 0.95, hair: H1, style: 'pony', skin: S2, fit: R, fit2: W, pose: 'up', legs: W, shoes: K });
    g.c(80, 84, 9, W); g.c(80, 84, 3.5, K); g.c(14, 14, 7, GD);
  } });
  PIC({ id: 'pp-grandma', name: 'Grandma and Me', cat: C, size: 32, bg: '#fff0d0', ol: K, draw(g) {
    chibi(g, { x: 34, y: 2, s: 0.95, hair: '#d8dce6', style: 'bun', skin: S3, fit: '#9b5cff', fit2: W, pose: 'down', skirt: true, shoes: H1 });
    chibi(g, { x: 74, y: 30, s: 0.68, hair: H2, style: 'twin', skin: S3, fit: GD, fit2: PK, pose: 'up', shoes: R });
    g.heart(76, 14, 8, PK);
  } });
  // ---- hard (40 / 48) ----
  PIC({ id: 'pp-family', name: 'Happy Family', cat: C, size: 40, bg: '#dff7ff', ol: K, draw(g) {
    g.r(0, 86, 100, 100, '#8fdc72'); g.c(86, 12, 8, GD);
    chibi(g, { x: 20, y: 6, s: 0.8, hair: H2, skin: S2, fit: B, fit2: W, pose: 'down', legs: '#2b2f5e', shoes: H1 });
    chibi(g, { x: 46, y: 8, s: 0.76, hair: H4, style: 'long', skin: S1, fit: PK, fit2: W, pose: 'wave', skirt: true, shoes: R });
    chibi(g, { x: 68, y: 34, s: 0.54, hair: H2, skin: S3, fit: G, fit2: GD, pose: 'up', legs: B, shoes: R });
    chibi(g, { x: 86, y: 46, s: 0.42, hair: H3, skin: S3, fit: GD, fit2: W, pose: 'up', legs: GD, shoes: W });
    g.heart(33, 12, 5, PK);
  } });
  PIC({ id: 'pp-park', name: 'Playground Friends', cat: C, size: 48, bg: '#cdeeff', ol: K, draw(g) {
    g.r(0, 82, 100, 100, '#8fdc72'); g.c(14, 12, 8, GD); g.e(70, 12, 12, 5, W); g.e(80, 10, 9, 5, W);
    g.l(56, 30, 92, 80, 5, '#ff8c1a'); g.l(86, 30, 86, 82, 3, '#4a4a5e'); g.r(80, 28, 94, 32, '#4a4a5e');
    chibi(g, { x: 18, y: 26, s: 0.56, hair: H1, skin: S4, fit: R, fit2: W, pose: 'up', legs: B, shoes: W });
    chibi(g, { x: 40, y: 30, s: 0.52, hair: H3, style: 'twin', skin: S1, fit: '#9b5cff', fit2: GD, pose: 'wave', skirt: true, shoes: PK });
    chibi(g, { x: 64, y: 34, s: 0.48, hair: H2, skin: S2, fit: G, fit2: W, pose: 'down', legs: '#2b2f5e', shoes: R, prop: 'cap', propCol: B });
    g.c(30, 92, 4.5, R); g.c(30, 92, 1.5, W);
  } });
})();
