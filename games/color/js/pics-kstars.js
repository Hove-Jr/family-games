/* K-Pop Stars (v3): ORIGINAL chibi idol characters made for Pixel Pop. Not based on any real singer, group, logo or likeness. */
(function () {
  const C = 'kstars', K = '#2b2b3a', W = '#ffffff', PK = '#ff4fa3', CY = '#3df5ff', GD = '#ffd23f', P = '#8b3ff7', SK = '#ffd9b8', SK2 = '#e9b48a', BL = '#ff9fc4';
  // chibi idol: big head, little body. o = { hair, style, fit, fit2, skin, pose, prop, propCol }
  function idol(g, o) {
    const sk = o.skin || SK, hair = o.hair, fit = o.fit, fit2 = o.fit2 || fit, x = o.x || 50, y = o.y || 0, s = o.s || 1;
    const X = (v) => x + (v - 50) * s, Y = (v) => y + v * s;
    if (o.under) o.under(g, X, Y, s);
    // legs + shoes
    g.r(X(40), Y(80), X(47), Y(93), o.legs || K); g.r(X(53), Y(80), X(60), Y(93), o.legs || K);
    g.r(X(37), Y(91), X(48), Y(96), o.shoes || W); g.r(X(52), Y(91), X(63), Y(96), o.shoes || W);
    // body / outfit
    if (o.skirt) { g.p([X(36), Y(62), X(64), Y(62), X(70), Y(84), X(30), Y(84)], fit); }
    else g.rr(X(36), Y(60), X(64), Y(84), 4 * s, fit);
    g.r(X(36), Y(66), X(64), Y(70), fit2);
    // arms by pose
    const arm = (x0, y0, x1, y1) => { g.l(X(x0), Y(y0), X(x1), Y(y1), 9 * s, fit); g.c(X(x1), Y(y1), 5.5 * s, sk); };
    if (o.pose === 'up') { arm(38, 64, 24, 46); arm(62, 64, 76, 46); }
    else if (o.pose === 'wave') { arm(38, 64, 28, 80); arm(62, 64, 78, 46); }
    else if (o.pose === 'mic') { arm(38, 64, 28, 80); arm(62, 64, 66, 66); }
    else if (o.pose === 'heart') { arm(38, 64, 40, 56); arm(62, 64, 60, 56); }
    else { arm(38, 64, 26, 78); arm(62, 64, 74, 78); }
    // hair back (long styles)
    if (o.style === 'long' || o.style === 'twin') g.r(X(27), Y(30), X(73), Y(62), hair);
    if (o.style === 'twin') { g.e(X(22), Y(34), 6 * s, 13 * s, hair); g.e(X(78), Y(34), 6 * s, 13 * s, hair); }
    if (o.style === 'bun') { g.c(X(32), Y(14), 8 * s, hair); g.c(X(68), Y(14), 8 * s, hair); }
    if (o.style === 'pony') g.e(X(78), Y(40), 8 * s, 16 * s, hair);
    // head
    g.c(X(50), Y(36), 23 * s, sk);
    // hair top + bangs
    g.shape((px, py) => { const dx = (px - X(50)) / s, dy = (py - Y(36)) / s; return dx * dx + dy * dy <= 25 * 25 && dy < -4 + (Math.abs(dx) > 16 ? 14 : 0); }, hair);
    if (o.style === 'spiky') { g.p([X(30), Y(18), X(36), Y(4), X(44), Y(14), X(52), Y(2), X(58), Y(14), X(66), Y(4), X(70), Y(18)], hair); }
    if (o.preface) o.preface(g, X, Y, s);
    // face
    g.r(X(39), Y(36), X(43), Y(42), K); g.r(X(57), Y(36), X(61), Y(42), K);
    g.c(X(35), Y(45), 4 * s, BL); g.c(X(65), Y(45), 4 * s, BL);
    g.r(X(45), Y(47), X(55), Y(52), '#e0475b');
    if (o.prop === 'mic') { g.l(X(66), Y(66), X(60), Y(50), 3 * s, '#4a4a5e'); g.c(X(59), Y(48), 4 * s, o.propCol || '#c0c6d8'); }
    if (o.prop === 'stick') { g.l(X(78), Y(46), X(80), Y(26), 3 * s, W); g.c(X(80), Y(20), 7 * s, o.propCol || PK); }
    if (o.prop === 'crown') g.p([X(40), Y(14), X(42), Y(4), X(46), Y(10), X(50), Y(2), X(54), Y(10), X(58), Y(4), X(60), Y(14)], GD);
    if (o.prop === 'bow') { g.p([X(56), Y(14), X(70), Y(6), X(70), Y(22)], o.propCol || PK); g.c(X(57), Y(14), 3 * s, o.propCol || PK); }
    if (o.prop === 'cap') { g.r(X(28), Y(10), X(72), Y(18), o.propCol || '#2e5bd8'); g.r(X(50), Y(15), X(82), Y(19), o.propCol || '#2e5bd8'); }
    if (o.over) o.over(g, X, Y, s);
    if (o.prop === 'phones') { g.arc(X(50), Y(36), 26 * s, 3 * s, 180, 360, '#4a4a5e'); g.c(X(25), Y(38), 5 * s, o.propCol || PK); g.c(X(75), Y(38), 5 * s, o.propCol || PK); }
  }
  window.PixChibi = idol; // shared with the People pack
  const sparkles = (g, cols, test, n) => g.sprinkle(n || 10, cols, test);
  PIC({ id: 'ks-pink', name: 'Pink Pop Star', cat: C, size: 20, bg: '#fff0fa', ol: K, draw(g) {
    idol(g, { hair: PK, style: 'twin', fit: P, fit2: GD, pose: 'mic', prop: 'mic', skirt: true });
  } });
  PIC({ id: 'ks-blue', name: 'Blue Hair Dancer', cat: C, size: 20, bg: '#e2f6ff', ol: K, draw(g) {
    idol(g, { hair: '#2e8bff', style: 'spiky', fit: '#22c58b', fit2: W, pose: 'up' });
  } });
  PIC({ id: 'ks-stick', name: 'Light Stick Fan', cat: C, size: 20, bg: '#2a1f5c', draw(g) {
    idol(g, { hair: '#ff8c1a', style: 'pony', fit: PK, fit2: W, pose: 'wave', prop: 'stick', propCol: CY, shoes: GD });
    g.px(2, 3, GD); g.px(17, 2, W); g.px(1, 12, W);
  } });
  PIC({ id: 'ks-heart', name: 'Finger Heart', cat: C, size: 20, bg: '#ffe9f2', ol: K, draw(g) {
    idol(g, { hair: '#9b5cff', style: 'bun', fit: W, fit2: PK, pose: 'heart' });
    g.heart(78, 20, 11, PK);
  } });
  PIC({ id: 'ks-crown', name: 'Sparkle Queen', cat: C, size: 20, bg: '#e9fff4', ol: K, draw(g) {
    idol(g, { hair: '#b36bff', style: 'long', fit: '#ff5a5a', fit2: W, pose: 'wave', prop: 'crown', skirt: true });
  } });
  PIC({ id: 'ks-cap', name: 'Hip Hop Star', cat: C, size: 20, bg: '#fff6d6', ol: K, draw(g) {
    idol(g, { hair: '#22c58b', fit: '#2b2f5e', fit2: GD, pose: 'down', prop: 'cap', propCol: '#ff5a5a', skin: SK2 });
  } });
  PIC({ id: 'ks-heads', name: 'DJ Beats', cat: C, size: 20, bg: '#e8f0ff', ol: K, draw(g) {
    idol(g, { hair: '#ff5a5a', style: 'spiky', fit: '#3a86ff', fit2: W, pose: 'up', prop: 'phones', propCol: GD });
  } });
  // ---- medium (32) ----
  PIC({ id: 'ks-duo', name: 'Best Friend Duo', cat: C, size: 32, bg: '#ffeefa', ol: K, draw(g) {
    idol(g, { x: 28, y: 8, s: 0.9, hair: '#3df5ff', style: 'twin', fit: PK, fit2: W, pose: 'mic', prop: 'mic', skirt: true });
    idol(g, { x: 72, y: 8, s: 0.9, hair: '#9b5cff', style: 'spiky', fit: '#2e8bff', fit2: GD, pose: 'up', skin: SK2 });
    g.star(50, 10, 8, 3.5, 5, GD); g.heart(50, 28, 6, PK);
  } });
  PIC({ id: 'ks-spot', name: 'Spotlight Solo', cat: C, size: 32, bg: '#1d1747', draw(g) {
    g.p([38, 0, 62, 0, 88, 100, 12, 100], '#4a3a96');
    g.r(0, 90, 100, 100, '#7b2ff7'); g.r(0, 88, 100, 91, GD);
    idol(g, { y: -4, s: 0.92, hair: '#ff4fa3', style: 'long', fit: GD, fit2: W, pose: 'mic', prop: 'mic', skirt: true, shoes: PK });
    sparkles(g, [W, GD], (i, j, v) => v === '#1d1747', 14);
  } });
  PIC({ id: 'ks-dance', name: 'Dance Break', cat: C, size: 32, bg: '#d9fff0', ol: K, draw(g) {
    g.r(0, 86, 100, 100, '#ffd23f'); for (let x = 0; x < 100; x += 20) g.r(x, 86, x + 10, 100, '#ff8c1a');
    idol(g, { y: -6, hair: '#1fb5c9', style: 'spiky', fit: '#ff5a5a', fit2: '#2b2f5e', pose: 'wave', prop: 'cap', propCol: '#2b2f5e', shoes: CY });
    g.c(14, 18, 4, PK); g.l(17, 18, 17, 6, 1.8, PK); g.c(86, 26, 4, P); g.l(89, 26, 89, 12, 1.8, P); g.l(89, 12, 95, 15, 1.8, P);
  } });
  // ---- hard (40 / 48) ----
  PIC({ id: 'ks-band', name: 'Concert Trio', cat: C, size: 40, bg: '#140f33', draw(g) {
    g.sprinkle(26, [W, '#8d6bff'], (i, j, v) => v === '#140f33' && j < 14);
    g.p([8, 0, 20, 0, 34, 80, 18, 80], '#2f2770'); g.p([92, 0, 80, 0, 66, 80, 82, 80], '#2f2770');
    g.r(0, 78, 100, 100, '#5c2a86'); g.r(0, 76, 100, 79, GD);
    idol(g, { x: 22, y: 12, s: 0.62, hair: '#ff4fa3', style: 'twin', fit: CY, fit2: W, pose: 'up', skirt: true });
    idol(g, { x: 50, y: 6, s: 0.68, hair: GD, style: 'spiky', fit: PK, fit2: W, pose: 'mic', prop: 'mic' });
    idol(g, { x: 78, y: 12, s: 0.62, hair: '#3df5ff', style: 'long', fit: '#9b5cff', fit2: GD, pose: 'wave', skin: SK2 });
    for (let x = 6; x < 100; x += 12) { g.c(x, 98, 5, '#2a1f5c'); g.l(x + 1, 93, x + 3, 86, 1.6, '#c0c6d8'); g.c(x + 3, 85, 2.4, [CY, PK, GD][(x / 12) % 3 | 0]); }
  } });
  PIC({ id: 'ks-poster', name: 'Superstar Poster', cat: C, size: 48, bg: '#ffe3f3', ol: K, draw(g) {
    g.rr(6, 6, 94, 94, 6, '#ffffff'); g.rr(10, 10, 90, 90, 5, '#7b2ff7');
    g.c(50, 50, 34, '#a875ff'); g.c(50, 50, 24, '#c79cff');
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.star(50 + 30 * Math.cos(a), 50 + 30 * Math.sin(a), 5, 2, 4, GD); }
    idol(g, { y: 6, s: 0.82, hair: '#ff8c1a', style: 'bun', fit: PK, fit2: GD, pose: 'heart', skirt: true, shoes: CY });
    g.heart(22, 22, 6, PK); g.heart(78, 22, 6, PK); g.star(20, 78, 6, 2.6, 5, CY); g.star(80, 78, 6, 2.6, 5, CY);
  } });
})();
