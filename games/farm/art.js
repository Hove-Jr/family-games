/* Sunpatch Valley - procedural vector art (no images, no emoji). */
(function () {
  'use strict';
  function shade(hex, f) {
    var c = parseInt(hex.slice(1), 16), r = c >> 16, g = (c >> 8) & 255, b = c & 255, t = f < 0 ? 0 : 255, p = Math.abs(f);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function el(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); }
  function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
  function fs(g, fill, stroke, lw) { g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 3; g.stroke(); } }
  function ln(g, x1, y1, x2, y2, c, w) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = c; g.lineWidth = w || 3; g.lineCap = 'round'; g.stroke(); }
  var LEAF = '#4f9a3a';
  // Each shape draws into a 100x100 box.
  var S = {
    grain: function (g, a, b) { var o = shade(b, -0.3); [[30, 18, -0.35], [50, 10, 0], [70, 18, 0.35]].forEach(function (s) { ln(g, 50, 92, s[0], s[1] + 20, b, 4); for (var i = 0; i < 4; i++) { el(g, s[0] - 4 + (s[0] - 50) * 0.04 * i, s[1] + 4 + i * 9, 6, 9, s[2]); fs(g, a, o, 2); el(g, s[0] + 4 + (s[0] - 50) * 0.04 * i, s[1] + 4 + i * 9, 6, 9, s[2]); fs(g, a, o, 2); } }); rr(g, 38, 62, 24, 9, 3); fs(g, '#c0392b', shade('#c0392b', -0.4), 2); },
    cob: function (g, a, b) { poly(g, [50, 95, 22, 40, 44, 70]); fs(g, b, shade(b, -0.4)); poly(g, [50, 95, 78, 40, 56, 70]); fs(g, b, shade(b, -0.4)); el(g, 50, 46, 18, 38); fs(g, a, shade(a, -0.45)); g.fillStyle = shade(a, 0.45); for (var y = 18; y < 80; y += 9) for (var x = -10; x <= 10; x += 10) { var w = Math.sqrt(Math.max(0, 1 - Math.pow((y - 46) / 38, 2))) * 14; if (Math.abs(x) <= w) { circ(g, 50 + x, y, 3); g.fill(); } } },
    root: function (g, a, b) { [[-14, -0.5], [0, 0], [14, 0.5]].forEach(function (l) { el(g, 50 + l[0], 18, 7, 16, l[1]); fs(g, b, shade(b, -0.4), 2); }); g.beginPath(); g.moveTo(30, 32); g.quadraticCurveTo(50, 22, 70, 32); g.quadraticCurveTo(62, 70, 50, 96); g.quadraticCurveTo(38, 70, 30, 32); fs(g, a, shade(a, -0.4)); for (var i = 0; i < 4; i++) ln(g, 40 + i * 2, 42 + i * 12, 50 + i, 44 + i * 12, shade(a, -0.3), 2); },
    pod: function (g, a, b) { el(g, 50, 52, 20, 42, 0.6); fs(g, a, shade(b, -0.2)); g.fillStyle = shade(a, 0.35); for (var i = -1; i <= 1; i++) { circ(g, 50 - i * 14, 52 + i * 20, 10); g.fill(); } ln(g, 72, 12, 64, 22, b, 4); },
    cane: function (g, a, b) { [32, 50, 68].forEach(function (x, i) { rr(g, x - 7, 14 + i * 4, 14, 82 - i * 4, 6); fs(g, a, shade(b, -0.3)); for (var y = 30; y < 92; y += 18) ln(g, x - 6, y + i * 3, x + 6, y + i * 3, shade(b, -0.1), 3); }); el(g, 26, 22, 6, 16, -0.6); fs(g, LEAF, shade(LEAF, -0.4), 2); el(g, 74, 22, 6, 16, 0.6); fs(g, LEAF, shade(LEAF, -0.4), 2); },
    boll: function (g, a, b) { poly(g, [50, 60, 20, 90, 50, 78, 80, 90]); fs(g, b, shade(b, -0.4)); [[36, 46], [64, 46], [50, 30], [50, 56]].forEach(function (p) { circ(g, p[0], p[1], 19); fs(g, a, '#c9c2b4'); }); },
    berry: function (g, a, b) { g.beginPath(); g.moveTo(50, 95); g.bezierCurveTo(10, 60, 14, 22, 50, 26); g.bezierCurveTo(86, 22, 90, 60, 50, 95); fs(g, a, shade(a, -0.45)); g.fillStyle = '#ffe28a'; [[38, 44], [50, 52], [62, 44], [42, 64], [58, 64], [50, 78], [34, 54], [66, 54]].forEach(function (p) { el(g, p[0], p[1], 2, 3); g.fill(); }); poly(g, [50, 30, 32, 18, 44, 24, 50, 10, 56, 24, 68, 18]); fs(g, b, shade(b, -0.4), 2); },
    tuber: function (g, a, b) { el(g, 46, 58, 34, 26, -0.3); fs(g, a, shade(a, -0.45)); el(g, 62, 40, 22, 18, 0.4); fs(g, shade(a, 0.1), shade(a, -0.45)); g.fillStyle = shade(a, -0.35); [[34, 56], [50, 66], [60, 44], [40, 46], [68, 36]].forEach(function (p) { circ(g, p[0], p[1], 2.5); g.fill(); }); },
    round: function (g, a, b) { circ(g, 50, 56, 34); fs(g, a, shade(a, -0.45)); el(g, 38, 44, 9, 6, -0.6); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill(); poly(g, [50, 24, 38, 18, 46, 26, 34, 30, 48, 30, 50, 38, 52, 30, 66, 30, 54, 26, 62, 18]); fs(g, b, shade(b, -0.4), 2); },
    pumpkin: function (g, a, b) { [[30, 18], [70, 18], [50, 22]].forEach(function (p) { el(g, p[0], 60, p[1], 30); fs(g, a, shade(a, -0.35)); }); rr(g, 45, 18, 10, 18, 3); fs(g, b, shade(b, -0.4), 2); },
    flower: function (g, a, b) { for (var i = 0; i < 12; i++) { var an = i * Math.PI / 6; el(g, 50 + Math.cos(an) * 26, 50 + Math.sin(an) * 26, 13, 7, an); fs(g, a, shade(a, -0.3), 2); } circ(g, 50, 50, 20); fs(g, b, shade(b, -0.4)); g.fillStyle = shade(b, 0.25); for (var j = 0; j < 9; j++) { circ(g, 44 + (j % 3) * 6, 44 + Math.floor(j / 3) * 6, 2); g.fill(); } },
    spike: function (g, a, b) { [[30, -0.25], [50, 0], [70, 0.25]].forEach(function (s) { ln(g, 50, 95, s[0], 30, b, 4); for (var i = 0; i < 6; i++) { el(g, s[0] + (50 - s[0]) * i * 0.03, 12 + i * 8, 6, 5); fs(g, a, shade(a, -0.4), 2); } }); },
    cocoa: function (g, a, b) { el(g, 50, 56, 24, 38, 0.4); fs(g, a, shade(a, -0.45)); for (var i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(50, 56, Math.abs(i) * 8 + 2, 38, 0.4, 0, Math.PI * 2); g.strokeStyle = shade(a, -0.25); g.lineWidth = 2; g.stroke(); } ln(g, 62, 18, 70, 6, b, 5); },
    beans: function (g, a, b) { [[34, 40, 0.5], [64, 44, -0.4], [48, 70, 0.1]].forEach(function (p) { el(g, p[0], p[1], 16, 22, p[2]); fs(g, a, shade(a, -0.5)); g.beginPath(); g.moveTo(p[0] - 2, p[1] - 18); g.quadraticCurveTo(p[0] + 6, p[1], p[0] - 2, p[1] + 18); g.strokeStyle = b; g.lineWidth = 3; g.stroke(); }); },
    grapes: function (g, a, b) { el(g, 66, 20, 16, 9, -0.4); fs(g, b, shade(b, -0.4), 2); [[36, 34], [50, 34], [64, 34], [43, 48], [57, 48], [36, 60], [50, 62], [64, 60], [43, 74], [57, 74], [50, 88]].forEach(function (p, i) { circ(g, p[0] + (i % 2), p[1], 10); fs(g, i % 3 ? a : shade(a, 0.12), shade(a, -0.45), 2); }); },
    egg: function (g, a, b) { [[36, 58, -0.2], [62, 54, 0.15]].forEach(function (p) { g.beginPath(); g.ellipse(p[0], p[1], 21, 29, p[2], 0, Math.PI * 2); fs(g, a, shade(b, -0.35)); el(g, p[0] - 7, p[1] - 10, 5, 8, p[2]); g.fillStyle = 'rgba(255,255,255,.8)'; g.fill(); }); },
    bottle: function (g, a, b) { rr(g, 28, 36, 44, 58, 12); fs(g, a, shade(b, -0.3)); rr(g, 38, 16, 24, 26, 5); fs(g, a, shade(b, -0.3)); rr(g, 36, 8, 28, 12, 4); fs(g, b, shade(b, -0.4)); rr(g, 28, 56, 44, 20, 2); fs(g, b, shade(b, -0.3), 2); rr(g, 34, 42, 8, 44, 4); g.fillStyle = 'rgba(255,255,255,.4)'; g.fill(); },
    fluff: function (g, a, b) { [[34, 46, 20], [58, 40, 22], [70, 60, 18], [46, 64, 22], [30, 66, 15]].forEach(function (p) { circ(g, p[0], p[1], p[2]); fs(g, a, b); }); [[34, 46, 20], [58, 40, 22], [70, 60, 18], [46, 64, 22]].forEach(function (p) { circ(g, p[0], p[1], p[2] - 4); g.fillStyle = a; g.fill(); }); },
    sack: function (g, a, b) { g.beginPath(); g.moveTo(32, 30); g.quadraticCurveTo(14, 70, 24, 92); g.lineTo(76, 92); g.quadraticCurveTo(86, 70, 68, 30); g.closePath(); fs(g, a, shade(b, -0.35)); poly(g, [36, 30, 30, 12, 50, 22, 70, 12, 64, 30]); fs(g, a, shade(b, -0.35)); rr(g, 34, 26, 32, 8, 3); fs(g, b, shade(b, -0.4), 2); circ(g, 50, 64, 13); fs(g, '#fff8e8', shade(b, -0.3), 2); circ(g, 50, 64, 5); g.fillStyle = b; g.fill(); },
    loaf: function (g, a, b) { g.beginPath(); g.moveTo(12, 76); g.quadraticCurveTo(10, 30, 50, 28); g.quadraticCurveTo(90, 30, 88, 76); g.closePath(); fs(g, a, shade(b, -0.35)); for (var i = 0; i < 3; i++) { g.beginPath(); g.moveTo(30 + i * 16, 44); g.quadraticCurveTo(36 + i * 16, 50, 34 + i * 16, 60); g.strokeStyle = shade(b, 0.2); g.lineWidth = 4; g.stroke(); } rr(g, 12, 70, 76, 10, 4); fs(g, b, shade(b, -0.35), 2); },
    cookie: function (g, a, b) { [[38, 62], [62, 42]].forEach(function (p) { circ(g, p[0], p[1], 26); fs(g, a, shade(a, -0.4)); g.fillStyle = b; [[-10, -8], [8, -10], [0, 4], [12, 10], [-12, 12]].forEach(function (d) { circ(g, p[0] + d[0], p[1] + d[1], 3.5); g.fill(); }); }); },
    muffin: function (g, a, b) { poly(g, [26, 54, 74, 54, 66, 92, 34, 92]); fs(g, '#f5e6c8', '#c9a77a'); for (var x = 34; x < 70; x += 8) ln(g, x, 56, x + 1, 90, '#d9c09a', 2); circ(g, 50, 46, 28); fs(g, a, shade(a, -0.4)); g.fillStyle = b; [[40, 36], [58, 34], [50, 50], [64, 48], [36, 52]].forEach(function (p) { circ(g, p[0], p[1], 4.5); g.fill(); }); },
    block: function (g, a, b) { poly(g, [16, 50, 50, 34, 84, 50, 50, 66]); fs(g, shade(a, 0.35), shade(b, -0.3)); poly(g, [16, 50, 50, 66, 50, 88, 16, 72]); fs(g, a, shade(b, -0.3)); poly(g, [84, 50, 50, 66, 50, 88, 84, 72]); fs(g, shade(a, -0.1), shade(b, -0.3)); rr(g, 30, 64, 10, 10, 2); g.fillStyle = shade(b, 0.2); },
    wedge: function (g, a, b) { poly(g, [12, 70, 70, 28, 90, 52, 90, 82, 12, 82]); fs(g, a, shade(b, -0.35)); poly(g, [12, 70, 70, 28, 90, 52, 32, 76]); fs(g, shade(a, 0.3), shade(b, -0.35), 2); g.fillStyle = shade(b, 0.05); [[44, 80, 4], [66, 76, 5], [80, 66, 3], [58, 52, 4]].forEach(function (p) { circ(g, p[0], p[1], p[2]); g.fill(); }); },
    cube: function (g, a, b) { [[34, 56], [66, 56], [50, 34]].forEach(function (p) { var x = p[0], y = p[1]; poly(g, [x - 16, y, x, y - 9, x + 16, y, x, y + 9]); fs(g, '#ffffff', b, 2); poly(g, [x - 16, y, x, y + 9, x, y + 28, x - 16, y + 19]); fs(g, shade(b, 0.5), b, 2); poly(g, [x + 16, y, x, y + 9, x, y + 28, x + 16, y + 19]); fs(g, shade(b, 0.2), b, 2); }); },
    candy: function (g, a, b) { poly(g, [26, 50, 8, 32, 12, 50, 8, 68]); fs(g, shade(a, 0.3), b, 2); poly(g, [74, 50, 92, 32, 88, 50, 92, 68]); fs(g, shade(a, 0.3), b, 2); el(g, 50, 50, 26, 20); fs(g, a, b); el(g, 42, 44, 8, 4, -0.3); g.fillStyle = 'rgba(255,255,255,.5)'; g.fill(); },
    lolli: function (g, a, b) { ln(g, 50, 60, 50, 96, '#f0e6d8', 7); circ(g, 50, 40, 30); fs(g, a, shade(a, -0.4)); g.beginPath(); for (var t = 0; t < 14; t += 0.2) { var r = t * 2; g.lineTo(50 + Math.cos(t) * r, 40 + Math.sin(t) * r); } g.strokeStyle = b; g.lineWidth = 5; g.stroke(); },
    roll: function (g, a, b) { rr(g, 20, 30, 60, 46, 4); fs(g, a, shade(b, -0.3)); for (var x = 30; x < 80; x += 12) ln(g, x, 31, x, 75, b, 4); el(g, 20, 53, 10, 23); fs(g, shade(a, 0.2), shade(b, -0.3)); el(g, 20, 53, 4, 8); g.fillStyle = shade(b, -0.3); g.fill(); g.beginPath(); g.moveTo(80, 76); g.quadraticCurveTo(90, 86, 84, 94); g.lineTo(60, 94); g.lineTo(62, 76); fs(g, a, shade(b, -0.3), 2); },
    yarnball: function (g, a, b) { circ(g, 50, 52, 36); fs(g, a, shade(b, -0.3)); g.strokeStyle = b; g.lineWidth = 3; for (var i = 0; i < 5; i++) { g.beginPath(); g.ellipse(50, 52, 34 - i * 6, 14 + i * 4, 0.7 + i * 0.4, 0, Math.PI); g.stroke(); } g.beginPath(); g.moveTo(80, 70); g.quadraticCurveTo(96, 86, 76, 94); g.stroke(); },
    shirt: function (g, a, b) { poly(g, [36, 16, 22, 22, 6, 42, 18, 54, 28, 46, 28, 92, 72, 92, 72, 46, 82, 54, 94, 42, 78, 22, 64, 16, 50, 26]); fs(g, a, shade(b, -0.3)); g.beginPath(); g.moveTo(38, 17); g.quadraticCurveTo(50, 32, 62, 17); g.strokeStyle = b; g.lineWidth = 5; g.stroke(); ln(g, 28, 80, 72, 80, b, 4); },
    scarf: function (g, a, b) { g.beginPath(); g.moveTo(20, 26); g.quadraticCurveTo(50, 46, 80, 26); g.lineTo(80, 40); g.quadraticCurveTo(50, 60, 20, 40); g.closePath(); fs(g, a, shade(b, -0.3)); rr(g, 56, 40, 18, 46, 4); fs(g, a, shade(b, -0.3)); for (var y = 50; y < 86; y += 10) ln(g, 57, y, 73, y, b, 4); for (var x = 58; x < 75; x += 5) ln(g, x, 86, x, 96, b, 2); },
    jar: function (g, a, b) { rr(g, 24, 32, 52, 60, 12); fs(g, a, shade(a, -0.45)); rr(g, 22, 16, 56, 18, 6); fs(g, '#ffffff', shade(b, -0.2), 2); g.fillStyle = b; for (var x = 26; x < 76; x += 10) for (var y = 18; y < 32; y += 7) if ((x + y) % 2) { g.fillRect(x, y, 5, 5); } rr(g, 32, 52, 36, 22, 4); fs(g, '#fff8e8', shade(a, -0.3), 2); },
    tub: function (g, a, b) { poly(g, [22, 40, 78, 40, 70, 94, 30, 94]); fs(g, '#ffffff', shade(b, -0.3)); g.save(); g.clip(); g.fillStyle = b; for (var x = 20; x < 80; x += 14) g.fillRect(x, 38, 7, 60); g.restore(); [[30, 36], [44, 28], [58, 30], [70, 38], [50, 40], [38, 40]].forEach(function (p) { circ(g, p[0], p[1], 9); fs(g, a, shade(a, -0.3), 2); }); },
    bag: function (g, a, b) { g.beginPath(); g.moveTo(24, 14); g.lineTo(76, 14); g.quadraticCurveTo(84, 54, 76, 92); g.lineTo(24, 92); g.quadraticCurveTo(16, 54, 24, 14); fs(g, a, shade(b, -0.3)); rr(g, 20, 42, 60, 22, 2); fs(g, b, shade(b, -0.3), 2); el(g, 50, 53, 12, 7); g.fillStyle = shade(a, 0.4); g.fill(); ln(g, 24, 20, 76, 20, shade(a, -0.2), 3); },
    bowl: function (g, a, b) { el(g, 50, 46, 38, 12); fs(g, a, shade(a, -0.4)); g.beginPath(); g.moveTo(12, 46); g.quadraticCurveTo(14, 90, 50, 90); g.quadraticCurveTo(86, 90, 88, 46); g.quadraticCurveTo(50, 62, 12, 46); fs(g, b, shade(b, -0.35)); circ(g, 40, 44, 3); g.fillStyle = '#fff'; g.fill(); circ(g, 58, 46, 3); g.fill(); },
    pie: function (g, a, b) { el(g, 50, 60, 42, 22); fs(g, b, shade(b, -0.4)); el(g, 50, 55, 34, 15); fs(g, a, shade(a, -0.3), 2); g.save(); el(g, 50, 55, 34, 15); g.clip(); for (var x = 22; x < 80; x += 12) ln(g, x, 38, x + 8, 72, shade(b, 0.2), 4); for (var y = 46; y < 70; y += 8) ln(g, 14, y, 86, y, shade(b, 0.2), 4); g.restore(); },
    soap: function (g, a, b) { rr(g, 16, 44, 68, 38, 14); fs(g, a, shade(b, -0.3)); rr(g, 22, 40, 56, 30, 12); fs(g, shade(a, 0.25), shade(b, -0.2), 2); [[30, 26, 8], [48, 20, 6], [64, 28, 9]].forEach(function (p) { circ(g, p[0], p[1], p[2]); fs(g, 'rgba(255,255,255,.7)', shade(a, -0.2), 2); }); },
    candle: function (g, a, b) { rr(g, 32, 40, 36, 54, 6); fs(g, a, shade(b, -0.3)); ln(g, 50, 40, 50, 30, '#5a4a3a', 3); g.beginPath(); g.moveTo(50, 6); g.quadraticCurveTo(64, 26, 50, 32); g.quadraticCurveTo(36, 26, 50, 6); fs(g, b, shade(b, -0.2), 2); circ(g, 50, 24, 4); g.fillStyle = '#fff6b0'; g.fill(); el(g, 40, 46, 4, 8); g.fillStyle = shade(a, -0.1); g.fill(); },
    bar: function (g, a, b) { rr(g, 18, 14, 64, 76, 6); fs(g, a, shade(b, -0.2)); g.strokeStyle = b; g.lineWidth = 3; for (var x = 39; x < 80; x += 21) ln(g, x, 16, x, 88, b, 3); for (var y = 33; y < 90; y += 19) ln(g, 20, y, 80, y, b, 3); poly(g, [18, 60, 82, 46, 82, 90, 18, 90]); fs(g, '#d9dde2', '#8a9098', 2); rr(g, 18, 66, 64, 18, 2); fs(g, '#c0392b', '#7a2018', 2); },
    cup: function (g, a, b) { g.beginPath(); g.arc(76, 56, 12, -1.4, 1.4); g.strokeStyle = shade(b, -0.25); g.lineWidth = 7; g.stroke(); g.beginPath(); g.moveTo(18, 34); g.lineTo(82, 34); g.lineTo(76, 86); g.quadraticCurveTo(50, 94, 24, 86); g.closePath(); fs(g, b, shade(b, -0.35)); el(g, 50, 34, 32, 8); fs(g, a, shade(a, -0.3), 2); ln(g, 40, 22, 44, 8, 'rgba(160,160,160,.7)', 3); ln(g, 56, 22, 60, 8, 'rgba(160,160,160,.7)', 3); },
    glass: function (g, a, b) { poly(g, [26, 20, 74, 20, 66, 92, 34, 92]); fs(g, 'rgba(220,240,255,.8)', '#8ab0c8'); poly(g, [28, 36, 72, 36, 66, 90, 34, 90]); fs(g, a, shade(a, -0.3), 2); ln(g, 58, 50, 70, 6, '#ffffff', 6); ln(g, 58, 50, 70, 6, b, 3); circ(g, 30, 30, 9); fs(g, '#ffcc33', '#c49a1a', 2); },
    cone: function (g, a, b) { poly(g, [28, 50, 72, 50, 50, 96]); fs(g, b, shade(b, -0.35)); g.save(); g.clip(); for (var i = -40; i < 60; i += 10) { ln(g, 28 + i, 50, 58 + i, 96, shade(b, -0.2), 2); ln(g, 72 - i, 50, 42 - i, 96, shade(b, -0.2), 2); } g.restore(); circ(g, 50, 40, 22); fs(g, a, shade(a, -0.3)); circ(g, 50, 18, 6); fs(g, '#e53950', '#8a1a2e', 2); },
    plank: function (g, a, b) { [[12, 58], [18, 34]].forEach(function (p) { poly(g, [p[0], p[1], p[0] + 70, p[1] - 14, p[0] + 76, p[1] + 2, p[0] + 6, p[1] + 16]); fs(g, a, shade(b, -0.3)); ln(g, p[0] + 10, p[1] + 4, p[0] + 60, p[1] - 6, b, 2); }); poly(g, [18, 76, 88, 62, 88, 70, 18, 84]); fs(g, shade(a, -0.15), shade(b, -0.3), 2); },
    brick: function (g, a, b) { [[14, 60], [52, 60], [33, 38], [24, 16]].forEach(function (p, i) { if (i === 3) return; rr(g, p[0], p[1], 36, 20, 3); fs(g, a, shade(b, -0.2)); ln(g, p[0] + 4, p[1] + 5, p[0] + 30, p[1] + 5, shade(a, 0.25), 2); }); },
    pane: function (g, a, b) { rr(g, 14, 14, 72, 72, 4); fs(g, b, shade(b, -0.4)); rr(g, 20, 20, 60, 60, 2); fs(g, a, shade(b, -0.2), 2); ln(g, 30, 60, 52, 30, '#ffffff', 5); ln(g, 44, 68, 64, 42, 'rgba(255,255,255,.7)', 3); },
    bolt: function (g, a, b) { [[34, 0.2], [64, -0.2]].forEach(function (p) { g.save(); g.translate(p[0], 50); g.rotate(p[1]); rr(g, -7, -14, 14, 52, 3); fs(g, a, b); for (var y = -6; y < 36; y += 7) ln(g, -7, y, 7, y + 3, b, 2); poly(g, [-16, -14, -9, -28, 9, -28, 16, -14, 9, -6, -9, -6]); fs(g, shade(a, 0.1), b); g.restore(); }); },
    hinge: function (g, a, b) { rr(g, 12, 30, 36, 44, 4); fs(g, a, b); rr(g, 52, 30, 36, 44, 4); fs(g, shade(a, -0.1), b); rr(g, 44, 24, 12, 56, 5); fs(g, shade(a, 0.2), b); g.fillStyle = b; [[24, 42], [24, 62], [76, 42], [76, 62]].forEach(function (p) { circ(g, p[0], p[1], 4); g.fill(); }); },
    can: function (g, a, b) { rr(g, 22, 30, 56, 62, 6); fs(g, b, shade(b, -0.35)); el(g, 50, 30, 28, 8); fs(g, shade(b, 0.3), shade(b, -0.35)); rr(g, 22, 46, 56, 28, 2); fs(g, a, shade(a, -0.3), 2); g.beginPath(); g.moveTo(26, 30); g.quadraticCurveTo(50, -4, 74, 30); g.strokeStyle = '#5a5a5a'; g.lineWidth = 3; g.stroke(); },
    shovel: function (g, a, b) { ln(g, 28, 14, 58, 62, a, 8); rr(g, 18, 8, 18, 10, 4); fs(g, a, shade(a, -0.4), 2); g.beginPath(); g.moveTo(52, 56); g.lineTo(70, 46); g.quadraticCurveTo(92, 70, 86, 90); g.quadraticCurveTo(66, 92, 52, 56); fs(g, b, shade(b, -0.4)); },
    stake: function (g, a, b) { poly(g, [44, 10, 56, 10, 56, 80, 50, 96, 44, 80]); fs(g, a, shade(a, -0.4)); poly(g, [56, 14, 90, 24, 56, 36]); fs(g, b, shade(b, -0.4)); rr(g, 42, 52, 16, 8, 2); g.fillStyle = '#ffffff'; g.fill(); },
    scroll: function (g, a, b) { rr(g, 14, 22, 72, 58, 4); fs(g, a, shade(a, -0.4)); el(g, 14, 51, 7, 30); fs(g, shade(a, -0.1), shade(a, -0.4)); el(g, 86, 51, 7, 30); fs(g, shade(a, -0.1), shade(a, -0.4)); g.setLineDash([5, 5]); g.beginPath(); g.moveTo(26, 68); g.quadraticCurveTo(40, 30, 64, 46); g.strokeStyle = '#8a6a3a'; g.lineWidth = 3; g.stroke(); g.setLineDash([]); ln(g, 60, 34, 74, 48, b, 5); ln(g, 74, 34, 60, 48, b, 5); },
    // UI icons
    coin: function (g) { circ(g, 50, 50, 42); fs(g, '#ffc928', '#b8860b', 5); circ(g, 50, 50, 30); fs(g, '#ffdb5c', '#d9a414', 3); poly(g, [50, 28, 56, 44, 72, 44, 59, 54, 64, 70, 50, 60, 36, 70, 41, 54, 28, 44, 44, 44]); fs(g, '#f0a800'); },
    gem: function (g) { poly(g, [26, 20, 74, 20, 94, 42, 50, 94, 6, 42]); fs(g, '#22c7a9', '#0b7a68', 5); poly(g, [26, 20, 40, 42, 6, 42]); g.fillStyle = '#7ef0d8'; g.fill(); poly(g, [40, 42, 60, 42, 50, 94]); g.fillStyle = '#18a88e'; g.fill(); poly(g, [60, 42, 74, 20, 94, 42]); g.fillStyle = '#4fdcc2'; g.fill(); ln(g, 30, 26, 38, 36, '#fff', 4); },
    star: function (g) { var p = []; for (var i = 0; i < 10; i++) { var r = i % 2 ? 20 : 44, an = -Math.PI / 2 + i * Math.PI / 5; p.push(50 + Math.cos(an) * r, 54 + Math.sin(an) * r); } poly(g, p); fs(g, '#ffd23f', '#c48a00', 5); },
    person: function (g) { circ(g, 50, 30, 18); fs(g, '#6aa6ff', '#2a5aa8', 4); g.beginPath(); g.moveTo(16, 92); g.quadraticCurveTo(16, 52, 50, 52); g.quadraticCurveTo(84, 52, 84, 92); g.closePath(); fs(g, '#6aa6ff', '#2a5aa8', 4); },
    barnico: function (g) { poly(g, [10, 46, 50, 14, 90, 46, 90, 92, 10, 92]); fs(g, '#d9473a', '#7a2018', 4); poly(g, [4, 48, 50, 10, 96, 48, 90, 54, 50, 22, 10, 54]); fs(g, '#f5efe6', '#7a2018', 3); rr(g, 30, 56, 40, 36, 2); fs(g, '#f5efe6', '#7a2018', 3); ln(g, 32, 58, 68, 90, '#d9473a', 4); ln(g, 68, 58, 32, 90, '#d9473a', 4); },
    hammer: function (g) { ln(g, 30, 88, 62, 40, '#a8743e', 10); poly(g, [40, 26, 70, 10, 92, 42, 80, 50, 66, 36, 50, 44]); fs(g, '#8a949e', '#3a424a', 4); },
    clip: function (g) { rr(g, 18, 14, 64, 80, 8); fs(g, '#c98d4e', '#7a4a1a', 4); rr(g, 26, 24, 48, 62, 3); fs(g, '#fffdf5', '#b8a888', 2); rr(g, 36, 8, 28, 14, 4); fs(g, '#8a949e', '#3a424a', 3); for (var y = 38; y < 80; y += 12) ln(g, 34, y, 66, y, '#8ab0d8', 4); },
    truck: function (g) { rr(g, 6, 30, 56, 42, 4); fs(g, '#e8a33a', '#8a5a10', 4); poly(g, [62, 40, 82, 40, 94, 56, 94, 72, 62, 72]); fs(g, '#3f7fd6', '#1a3a7a', 4); poly(g, [68, 46, 80, 46, 88, 58, 68, 58]); g.fillStyle = '#cfe8ff'; g.fill(); [24, 78].forEach(function (x) { circ(g, x, 76, 11); fs(g, '#333', '#111', 3); circ(g, x, 76, 4); g.fillStyle = '#bbb'; g.fill(); }); },
    gift: function (g) { rr(g, 14, 40, 72, 52, 4); fs(g, '#e8505b', '#8a1a24', 4); rr(g, 8, 28, 84, 18, 4); fs(g, '#ff6b75', '#8a1a24', 4); rr(g, 44, 28, 12, 64, 2); fs(g, '#ffd23f', '#a87a00', 3); el(g, 38, 20, 14, 9, 0.4); fs(g, '#ffd23f', '#a87a00', 3); el(g, 62, 20, 14, 9, -0.4); fs(g, '#ffd23f', '#a87a00', 3); },
    lock: function (g) { g.beginPath(); g.arc(50, 42, 18, Math.PI, 0); g.strokeStyle = '#7a8088'; g.lineWidth = 8; g.stroke(); rr(g, 24, 42, 52, 44, 8); fs(g, '#f0b429', '#8a6200', 4); circ(g, 50, 60, 6); g.fillStyle = '#5a4200'; g.fill(); },
    clock: function (g) { circ(g, 50, 50, 40); fs(g, '#ffffff', '#3a4a6a', 6); ln(g, 50, 50, 50, 24, '#3a4a6a', 6); ln(g, 50, 50, 68, 58, '#e8505b', 5); },
    check: function (g) { circ(g, 50, 50, 44); fs(g, '#3cba6a', '#1f7a40', 5); ln(g, 28, 52, 44, 68, '#fff', 10); ln(g, 44, 68, 74, 34, '#fff', 10); },
    help: function (g) { circ(g, 50, 50, 42); fs(g, '#5b8def', '#2a4a9a', 5); g.fillStyle = '#fff'; g.font = 'bold 60px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 50, 54); },
    leaf: function (g) { el(g, 50, 50, 22, 40, 0.6); fs(g, '#6cc04a', '#2f7a1f', 4); ln(g, 30, 78, 70, 22, '#2f7a1f', 3); }
  };
  var cache = {};
  function iconCanvas(key, px) {
    px = px || 96; var ck = key + '@' + px; if (cache[ck]) return cache[ck];
    var D = window.FARM_DATA, it = D.ITEMS[key], c = document.createElement('canvas'); c.width = c.height = px;
    var g = c.getContext('2d'); g.scale(px / 100, px / 100); g.lineJoin = 'round';
    try { if (it) S[it.art[0]](g, it.art[1], it.art[2]); else if (S[key]) S[key](g); } catch (e) { }
    cache[ck] = c; return c;
  }
  var urls = {};
  function iconURL(key) { if (!urls[key]) urls[key] = iconCanvas(key, 96).toDataURL(); return urls[key]; }
  function img(key, cls) { return '<img class="ic ' + (cls || '') + '" alt="" src="' + iconURL(key) + '">'; }

  // ---------- isometric world drawing ----------
  var TW = 64, TH = 32;
  function iso(x, y) { return [(x - y) * TW / 2, (x + y) * TH / 2]; }
  function corners(x, y, w, h, m) { m = m || 0; return { t: iso(x + m, y + m), r: iso(x + w - m, y + m), b: iso(x + w - m, y + h - m), l: iso(x + m, y + h - m) }; }
  function up(p, H) { return [p[0], p[1] - H]; }
  function P(g, arr) { g.beginPath(); g.moveTo(arr[0][0], arr[0][1]); for (var i = 1; i < arr.length; i++) g.lineTo(arr[i][0], arr[i][1]); g.closePath(); }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  // quad on a wall from p0->p1 (base), u in 0..1 along, v height px
  function wallQuad(g, p0, p1, u0, u1, v0, v1) { var a = lerp(p0, p1, u0), b = lerp(p0, p1, u1); P(g, [up(a, v0), up(b, v0), up(b, v1), up(a, v1)]); }
  function box(g, c, H, wallL, wallR, top) {
    P(g, [c.l, c.b, up(c.b, H), up(c.l, H)]); fs(g, wallL, shade(wallL, -0.35), 1.2);
    P(g, [c.b, c.r, up(c.r, H), up(c.b, H)]); fs(g, wallR, shade(wallR, -0.35), 1.2);
    if (top) { P(g, [up(c.t, H), up(c.r, H), up(c.b, H), up(c.l, H)]); fs(g, top, shade(top, -0.35), 1.2); }
  }
  function roof(g, c, H, color, type, R) {
    var t = up(c.t, H), r = up(c.r, H), b = up(c.b, H), l = up(c.l, H);
    var dark = shade(color, -0.25), line = shade(color, -0.45);
    if (type === 'flat') { P(g, [t, r, b, l]); fs(g, shade(color, 0.1), line, 1.2); var i = corners(0, 0, 0, 0); var cx = (t[0] + b[0]) / 2, cy = (t[1] + b[1]) / 2; P(g, [lerp([cx, cy], t, 0.8), lerp([cx, cy], r, 0.8), lerp([cx, cy], b, 0.8), lerp([cx, cy], l, 0.8)]); fs(g, shade(color, -0.1), line, 1); return; }
    if (type === 'dome') { P(g, [t, r, b, l]); fs(g, shade(color, 0.1), line, 1.2); var mx = (t[0] + b[0]) / 2, my = (t[1] + b[1]) / 2, rad = Math.abs(r[0] - l[0]) * 0.32; g.beginPath(); g.arc(mx, my, rad, Math.PI, 0); g.ellipse(mx, my, rad, rad * 0.5, 0, 0, Math.PI); fs(g, '#dfe6f0', '#6a7a9a', 1.2); ln(g, mx - rad * 0.2, my - rad * 0.9, mx + rad * 0.5, my - rad * 1.3, '#3a4a6a', 4); return; }
    if (type === 'hip') { var ap = [(t[0] + b[0]) / 2, (t[1] + b[1]) / 2 - R]; P(g, [t, r, ap]); fs(g, shade(color, 0.15), line, 1.2); P(g, [l, t, ap]); fs(g, shade(color, 0.05), line, 1.2); P(g, [b, l, ap]); fs(g, color, line, 1.2); P(g, [r, b, ap]); fs(g, dark, line, 1.2); return; }
    // gable: ridge from mid(t,l) to mid(r,b)
    var A = lerp(t, l, 0.5), B = lerp(r, b, 0.5); A = [A[0], A[1] - R]; B = [B[0], B[1] - R];
    P(g, [t, r, B, A]); fs(g, shade(color, 0.12), line, 1.2);
    P(g, [r, b, B]); fs(g, '#f3ead8', '#8a7a5a', 1.2);
    P(g, [l, b, B, A]); fs(g, color, line, 1.2);
    for (var k = 1; k < 4; k++) { var p1 = lerp(l, A, k / 4), p2 = lerp(b, B, k / 4); ln(g, p1[0], p1[1], p2[0], p2[1], dark, 1.2); }
  }
  function windows(g, c, H, n, col, door) {
    col = col || '#9fd3f0'; var wl = '#5a4a3a';
    for (var i = 0; i < n; i++) { var u = (i + 0.5) / n; wallQuad(g, c.l, c.b, u - 0.12, u + 0.12, H * 0.45, H * 0.8); fs(g, col, wl, 1.2); }
    for (var j = 0; j < n; j++) { var u2 = (j + 0.5) / n; if (door && j === Math.floor(n / 2)) { wallQuad(g, c.b, c.r, u2 - 0.13, u2 + 0.13, 0, H * 0.6); fs(g, door, shade(door, -0.4), 1.2); } else { wallQuad(g, c.b, c.r, u2 - 0.12, u2 + 0.12, H * 0.45, H * 0.8); fs(g, col, wl, 1.2); } }
  }
  function tree(g, x, y, s, kind, t) {
    s = s || 1; var sway = Math.sin((t || 0) / 900 + x * 0.05) * 1.2 * s;
    el(g, x, y, 12 * s, 5 * s); g.fillStyle = 'rgba(0,0,0,.18)'; g.fill();
    ln(g, x, y, x, y - 14 * s, '#7a4a2a', 4 * s);
    if (kind === 'pine') { for (var i = 0; i < 3; i++) { P(g, [[x + sway, y - 46 * s + i * 10 * s], [x - (10 + i * 5) * s, y - (20 - i * 2) * s + i * 6 * s - 8 * s], [x + (10 + i * 5) * s, y - (20 - i * 2) * s + i * 6 * s - 8 * s]]); fs(g, i % 2 ? '#2f7a4a' : '#3a8a55', '#1f5a34', 1); } return; }
    if (kind === 'birch') { ln(g, x, y, x, y - 18 * s, '#f2efe8', 4 * s); el(g, x + sway, y - 30 * s, 9 * s, 15 * s); fs(g, '#9ccc4a', '#5a8a2a', 1); el(g, x + 3 * s + sway, y - 26 * s, 6 * s, 9 * s); g.fillStyle = '#b5dc6a'; g.fill(); return; }
    circ(g, x - 6 * s + sway, y - 20 * s, 10 * s); fs(g, '#4f9e3a', '#2f6a22', 1); circ(g, x + 6 * s + sway, y - 21 * s, 10 * s); fs(g, '#5aab42', '#2f6a22', 1); circ(g, x + sway, y - 30 * s, 11 * s); fs(g, '#68bb4a', '#2f6a22', 1);
  }
  window.FARM_ART = { shade: shade, iconCanvas: iconCanvas, iconURL: iconURL, img: img, iso: iso, corners: corners, up: up, P: P, lerp: lerp, wallQuad: wallQuad, box: box, roof: roof, windows: windows, tree: tree, fs: fs, ln: ln, el: el, circ: circ, rr: rr, poly: poly, TW: TW, TH: TH, SHAPES: S };
})();
