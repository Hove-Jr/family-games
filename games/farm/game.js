/* Sunpatch Valley - farm & town builder. Original game for the family hub. */
(function () {
  'use strict';
  var D = window.FARM_DATA, A = window.FARM_ART, I = D.ITEMS;
  var N = 42, ZS = 6, ZN = 7, KEY = 'sunpatch_v1', TW = A.TW, TH = A.TH;
  Object.keys(D.PENS).forEach(function (k) { D.PENS[k].w = 3; D.PENS[k].h = 3; });
  var $ = function (s) { return document.querySelector(s); };
  function now() { return Date.now(); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n) {
    n = Math.floor(n || 0); var a = Math.abs(n);
    if (a < 10000) return String(n);
    var u = a < 1e6 ? [1e3, 'K'] : a < 1e9 ? [1e6, 'M'] : [1e9, 'B'], v = n / u[0];
    return (Math.abs(v) < 100 ? v.toFixed(1).replace(/\.0$/, '') : Math.round(v)) + u[1];
  }
  function ftime(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000)); if (s < 60) return s + 's';
    var m = Math.floor(s / 60); if (m < 60) return m + 'm ' + (s % 60 < 10 ? '0' : '') + (s % 60) + 's';
    var h = Math.floor(m / 60); if (h < 24) return h + 'h ' + (m % 60) + 'm';
    return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
  }
  function gemCost(ms) { return Math.max(1, Math.ceil(Math.sqrt(Math.max(0, ms) / 60000))); }
  function xpNeed(L) { return Math.round(12 * L * L + 30 * L); }
  var IMG = A.img;

  // ================= state =================
  var S, occ = new Int32Array(N * N), byId = {};
  function def(o) {
    if (o.t === 'field') return { n: 'Field', w: 1, h: 1 };
    if (o.t === 'fac') return D.FACTS[o.k]; if (o.t === 'pen') return D.PENS[o.k]; if (o.t === 'house') return D.HOUSES[o.k];
    if (o.t === 'comm') return D.COMM[o.k]; if (o.t === 'deco') return D.DECOS[o.k]; return D.SPECIAL[o.k];
  }
  function mk(t, k, x, y, extra) {
    var d = def({ t: t, k: k }), o = { id: S.nid++, t: t, k: k, x: x, y: y, w: d.w, h: d.h, done: 0 };
    if (t === 'field') { o.crop = null; o.end = 0; o.pt = 0; }
    if (t === 'fac') { o.q = []; o.slots = 3; }
    if (t === 'pen') { o.a = [0, 0, 0]; }
    for (var e in extra || {}) o[e] = extra[e];
    return o;
  }
  function add(t, k, x, y, extra) { var o = mk(t, k, x, y, extra); S.objs.push(o); return o; }
  function newGame() {
    var t = now();
    S = { v: 1, coins: 250, gems: 15, xp: 0, lvl: 1, inv: { wheat: 4, corn: 3 }, mats: { shovel: 1, stake: 1, survey: 1, planks: 1 }, objs: [], nid: 1, zones: [], barn: 0, orders: [], truck: null, daily: { last: '', streak: 0 }, created: t, tips: {}, stats: { orders: 0, harvest: 0 } };
    for (var zy = 0; zy < ZN; zy++) for (var zx = 0; zx < ZN; zx++) S.zones.push(zx >= 2 && zx <= 4 && zy >= 2 && zy <= 4);
    add('special', 'barn', 13, 13); add('special', 'board', 17, 13); add('special', 'depot', 20, 13); add('comm', 'hall', 25, 12);
    for (var i = 0; i < 6; i++) { var f = add('field', 'field', 13 + (i % 3), 18 + Math.floor(i / 3)); if (i < 3) { f.crop = 'wheat'; f.pt = t - 120000; f.end = t - 1000; } else if (i < 4) { f.crop = 'corn'; f.pt = t - 60000; f.end = t + 240000; } }
    add('fac', 'mill', 17, 17); add('pen', 'hens', 21, 17); add('house', 'cottage', 25, 17); add('house', 'cottage', 27, 17); add('house', 'cottage', 25, 20);
    [[12, 12], [29, 29], [12, 28], [29, 16], [18, 26], [23, 28], [28, 24]].forEach(function (p, j) { add('deco', j % 3 === 2 ? 'pine' : j % 3 ? 'birch' : 'oak', p[0], p[1]); });
    add('deco', 'flowers', 16, 21); add('deco', 'flowers', 17, 21); add('deco', 'bench', 20, 21);
    S.orders = []; for (var k = 0; k < 6; k++) S.orders.push(genOrder(k < 2));
  }
  function load() {
    var raw = null; try { raw = localStorage.getItem(KEY); } catch (e) { }
    if (raw) { try { S = JSON.parse(raw); } catch (e) { S = null; } }
    if (!S || !S.objs) newGame();
    S.objs = S.objs.filter(function (o) { return def(o); });
    S.objs.forEach(function (o) { var d = def(o); o.w = d.w; o.h = d.h; });
    reocc();
  }
  var saveT = 0;
  function save(now_) { clearTimeout(saveT); if (now_) return doSave(); saveT = setTimeout(doSave, 300); }
  function doSave() { try { S.saved = now(); localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  function reocc() { occ.fill(0); byId = {}; S.objs.forEach(function (o) { byId[o.id] = o; for (var y = o.y; y < o.y + o.h; y++) for (var x = o.x; x < o.x + o.w; x++) if (x >= 0 && y >= 0 && x < N && y < N) occ[y * N + x] = o.id; }); }
  function zoneIdx(x, y) { return Math.floor(x / ZS) + ZN * Math.floor(y / ZS); }
  function tileOpen(x, y) { return x >= 0 && y >= 0 && x < N && y < N && S.zones[zoneIdx(x, y)]; }
  function canPlace(x, y, w, h, ignore) { for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) { if (!tileOpen(i, j)) return false; var id = occ[j * N + i]; if (id && id !== ignore) return false; } return true; }
  function built(o) { return !o.done || o.done <= now(); }
  function pop() { var p = 0; S.objs.forEach(function (o) { if (o.t === 'house' && built(o)) p += D.HOUSES[o.k].pop; }); return p; }
  function popPlanned() { var p = 0; S.objs.forEach(function (o) { if (o.t === 'house') p += D.HOUSES[o.k].pop; }); return p; }
  function cap() { var c = 0; S.objs.forEach(function (o) { if (o.t === 'comm' && built(o)) c += D.COMM[o.k].cap; }); return c; }
  function barnCap() { return 60 + 30 * S.barn; }
  function barnUsed() { var u = 0; for (var k in S.inv) u += S.inv[k]; return u; }
  function have(id) { return I[id] && I[id].k === 'mat' ? (S.mats[id] || 0) : (S.inv[id] || 0); }
  function give(id, n) { if (I[id].k === 'mat') S.mats[id] = (S.mats[id] || 0) + n; else S.inv[id] = (S.inv[id] || 0) + n; }
  function take(id, n) { if (I[id].k === 'mat') S.mats[id] -= n; else { S.inv[id] -= n; if (S.inv[id] <= 0) delete S.inv[id]; } }
  function room(n) { return barnUsed() + n <= barnCap(); }
  function hasAll(req) { for (var k in req) if (have(k) < req[k]) return false; return true; }
  function count(t, k) { return S.objs.filter(function (o) { return o.t === t && (!k || o.k === k); }).length; }
  function maxFields() { return Math.min(90, 6 + Math.floor(pop() / 10)); }
  function fieldCost() { return 10 + 5 * Math.max(0, count('field') - 5); }
  function seedCost(c) { return Math.floor(D.val(c) / 3); }
  // ================= economy =================
  var levelUpQueue = [];
  function addXP(n) {
    S.xp += n; var ups = [];
    while (S.xp >= xpNeed(S.lvl)) { S.xp -= xpNeed(S.lvl); S.lvl++; ups.push(S.lvl); }
    ups.forEach(function (L) { var g = 2 + Math.floor(L / 5), c = 40 * L; S.gems += g; S.coins += c; levelUpQueue.push({ L: L, gems: g, coins: c }); });
    if (ups.length && !panel) setTimeout(showLevelUp, 400);
  }
  function pool() {
    var p = [];
    D.ORDER.forEach(function (id) {
      var it = I[id];
      if (it.k === 'crop' && it.lvl <= S.lvl) p.push(id);
      else if (it.k === 'animal' && S.objs.some(function (o) { return o.t === 'pen' && D.PENS[o.k].out === id; })) p.push(id);
      else if (it.k === 'good' && it.lvl <= S.lvl && S.objs.some(function (o) { return o.t === 'fac' && o.k === it.fac; })) p.push(id);
    });
    return p;
  }
  function qtyFor(id, extra) { var v = D.val(id), m = v < 5 ? 5 : v < 15 ? 4 : v < 40 ? 3 : 2; return 1 + rnd(m) + (extra || 0); }
  function genOrder(easy) {
    var p = pool(); if (easy) p = p.filter(function (id) { return I[id].k === 'crop'; });
    if (!p.length) p = ['wheat'];
    var n = 1 + (Math.random() < 0.45 ? 0 : Math.random() < 0.6 ? 1 : 2); n = Math.min(n, p.length);
    var items = [], used = {}, guard = 0;
    while (items.length < n && guard++ < 50) { var id = Math.random() < 0.35 ? p[p.length - 1 - rnd(Math.min(6, p.length))] : p[rnd(p.length)]; if (used[id]) continue; used[id] = 1; items.push([id, qtyFor(id)]); }
    var coins = 5, xp = 2; items.forEach(function (x) { coins += D.val(x[0]) * x[1] * 1.4; xp += I[x[0]].xp * x[1] * 1.3; });
    var bonus = null; if (S.lvl >= 3 && Math.random() < 0.2) bonus = D.MAT_IDS[rnd(D.MAT_IDS.length)];
    var gem = Math.random() < 0.06 ? 1 : 0;
    return { items: items, coins: Math.round(coins), xp: Math.round(xp), bonus: bonus, gem: gem, wait: 0 };
  }
  function boardSlots() { return S.lvl >= 15 ? 9 : S.lvl >= 6 ? 8 : 6; }
  function genCrates() { var p = pool(), c = []; for (var i = 0; i < 3; i++) { var id = p[rnd(p.length)]; c.push({ id: id, q: qtyFor(id, 1), done: false, mat: D.MAT_IDS[rnd(D.MAT_IDS.length)], coins: Math.round(D.val(id) * 4) }); } return c; }
  function truckOn() { return S.lvl >= D.SPECIAL.depot.lvl; }

  // ================= actions =================
  function toast(t) { var el = $('#toast'); el.innerHTML = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('on'); }, 2200); }
  function spend(c, g) { if (c && S.coins < c) { toast('Not enough coins'); return false; } if (g && S.gems < g) { toast('Not enough gems'); return false; } S.coins -= c || 0; S.gems -= g || 0; return true; }
  function plant(o, crop) {
    if (o.t !== 'field' || o.crop || !built(o)) return false;
    var c = seedCost(crop); if (S.coins < c) { toast('Not enough coins to plant'); setTool(null); return false; }
    S.coins -= c; o.crop = crop; o.pt = now(); o.end = o.pt + I[crop].t * 1000; save(); return true;
  }
  function harvest(o) {
    if (o.t !== 'field' || !o.crop || o.end > now()) return false;
    if (!room(2)) { barnFull(); return false; }
    give(o.crop, 2); addXP(I[o.crop].xp); floatAt(o, '+2', o.crop); S.stats.harvest++; o.crop = null; o.end = 0; save(); return true;
  }
  function barnFull() { toast('Barn is full. Sell goods or expand the barn.'); setTool(null); }
  function facCollect(o) {
    var got = 0;
    while (o.q.length && o.q[0].end <= now()) { var j = o.q[0]; if (!room(j.c)) { barnFull(); break; } give(j.o, j.c); addXP(I[j.o].xp); floatAt(o, '+' + j.c, j.o); o.q.shift(); got++; }
    if (got) save(); return got;
  }
  function facAdd(o, r) {
    if (!built(o)) return;
    if (r.lvl > S.lvl) { toast('Unlocks at level ' + r.lvl); return; }
    if (o.q.length >= o.slots) { toast('Production queue is full'); return; }
    if (!hasAll(r.i)) { var miss = Object.keys(r.i).filter(function (k) { return have(k) < r.i[k]; }).map(function (k) { return I[k].n; }); toast('Need more ' + miss.join(', ')); return; }
    for (var k in r.i) take(k, r.i[k]);
    var start = now(); if (o.q.length) start = Math.max(start, o.q[o.q.length - 1].end);
    o.q.push({ o: r.o, c: r.c, end: start + r.t * 1000, t: r.t }); save(); renderPanel();
  }
  function facSpeed(o) {
    var i = o.q.findIndex(function (j) { return j.end > now(); }); if (i < 0) return;
    var d = o.q[i].end - now(), g = gemCost(d); if (!spend(0, g)) return;
    for (var k = i; k < o.q.length; k++) o.q[k].end -= d; save(); renderPanel();
  }
  function penCollect(o) {
    var d = D.PENS[o.k], got = 0;
    for (var i = 0; i < o.a.length; i++) if (o.a[i] && o.a[i] <= now()) { if (!room(1)) { barnFull(); break; } give(d.out, 1); addXP(I[d.out].xp); o.a[i] = 0; got++; }
    if (got) floatAt(o, '+' + got, d.out); return got;
  }
  function penFeed(o) {
    var d = D.PENS[o.k], fed = 0;
    for (var i = 0; i < o.a.length; i++) if (!o.a[i]) { if (have(d.feed) < 1) break; take(d.feed, 1); o.a[i] = now() + d.t * 1000; fed++; }
    return fed;
  }
  function penSpeed(o) {
    var d = Math.max.apply(null, o.a.map(function (t) { return t - now(); })); if (d <= 0) return;
    if (!spend(0, gemCost(d))) return; o.a = o.a.map(function (t) { return t > now() ? now() : t; }); save(); renderPanel();
  }
  function reqOf(od) { var req = {}; od.items.forEach(function (x) { req[x[0]] = (req[x[0]] || 0) + x[1]; }); return req; }
  function canFill(od) { return !!od.items && hasAll(reqOf(od)); }
  function deliver(i) {
    var od = S.orders[i]; if (!od || !od.items) return;
    var req = reqOf(od); if (!hasAll(req)) { toast('You still need some items for this order'); return; }
    for (var k in req) take(k, req[k]);
    S.coins += od.coins; if (od.bonus) give(od.bonus, 1); if (od.gem) S.gems += od.gem; S.stats.orders++;
    S.orders[i] = { wait: now() + 15000 };
    floatScreen(innerWidth / 2, innerHeight * 0.3, '+' + fmt(od.coins), 'coin'); addXP(od.xp); save(); renderPanel(); hud();
  }
  function discard(i) { S.orders[i] = { wait: now() + 3 * 60000 }; save(); renderPanel(); }
  function fillCrate(i) {
    var c = S.truck.crates[i]; if (c.done) return;
    if (have(c.id) < c.q) { toast('Need ' + c.q + ' ' + I[c.id].n); return; }
    take(c.id, c.q); c.done = true; S.coins += c.coins; give(c.mat, 1);
    toast('Crate packed: +' + c.coins + ' ' + IMG('coin', 'tiny') + ' +1 ' + I[c.mat].n); addXP(Math.round(I[c.id].xp * c.q * 0.8) + 1); save(); renderPanel();
  }
  function sendTruck() {
    if (!S.truck.crates.every(function (c) { return c.done; })) { toast('Pack all three crates first'); return; }
    S.truck.away = now() + 15 * 60000; var b = 20 + S.lvl * 5; S.coins += b; toast('The truck is off! Bonus +' + b + ' ' + IMG('coin', 'tiny')); addXP(5 + S.lvl); save(); renderPanel();
  }
  function expandCost() { var k = S.zones.filter(Boolean).length - 9, n = 1 + Math.floor(k / 3); return { coins: Math.round(250 * Math.pow(k + 1, 1.45)), mats: { shovel: n, stake: n, survey: n }, lvl: Math.min(25, 2 + k) }; }
  function zoneAdj(zi) { var zx = zi % ZN, zy = Math.floor(zi / ZN); return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { var x = zx + d[0], y = zy + d[1]; return x >= 0 && y >= 0 && x < ZN && y < ZN && S.zones[x + y * ZN]; }); }
  function expand(zi) {
    var c = expandCost(); if (S.lvl < c.lvl) { toast('Reach level ' + c.lvl + ' first'); return; }
    if (!hasAll(c.mats)) { toast('Need more land tools'); return; }
    if (!spend(c.coins)) return; for (var k in c.mats) take(k, c.mats[k]);
    S.zones[zi] = true; groundDirty = true; save(); closePanel(); toast('New land cleared!'); addXP(10 + 5 * S.zones.filter(Boolean).length);
  }
  function barnUpgradeCost() { var k = S.barn, n = 1 + Math.floor(k * 1.3); return { coins: 150 * (k + 1), mats: { bolts: n, hinges: n, varnish: n } }; }
  function barnUpgrade() { var c = barnUpgradeCost(); if (!hasAll(c.mats)) { toast('Need more bolts, hinges or varnish'); return; } if (!spend(c.coins)) return; for (var k in c.mats) take(k, c.mats[k]); S.barn++; toast('The barn now holds ' + barnCap()); addXP(10 * S.barn); save(); renderPanel(); hud(); }
  function sell(id, n) { n = Math.min(n, have(id)); if (n <= 0) return; take(id, n); var c = Math.max(1, Math.round(D.val(id) * 0.5)) * n; S.coins += c; toast('Sold ' + n + ' ' + I[id].n + ' for ' + c + ' ' + IMG('coin', 'tiny')); save(); renderPanel(); hud(); }
  function speedBuild(o) { var d = o.done - now(); if (d <= 0) return; if (!spend(0, gemCost(d))) return; o.done = now(); save(); closePanel(); }
  function onBuilt(o) { if (o.t === 'house') floatAt(o, '+' + D.HOUSES[o.k].pop, 'person'); }
  var DAILY = [{ coins: 100 }, { gems: 2 }, { mats: 3 }, { coins: 300 }, { gems: 4 }, { tools: 2 }, { gems: 8, coins: 800 }];
  function dayStr(t) { var d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function dailyReady() { return S.daily.last !== dayStr(now()); }
  function claimDaily() {
    if (!dailyReady()) return; var y = dayStr(now() - 86400000);
    S.daily.streak = S.daily.last === y ? S.daily.streak % 7 + 1 : 1; S.daily.last = dayStr(now());
    var r = DAILY[S.daily.streak - 1], msg = [];
    if (r.coins) { S.coins += r.coins; msg.push('+' + r.coins + ' ' + IMG('coin', 'tiny')); }
    if (r.gems) { S.gems += r.gems; msg.push('+' + r.gems + ' ' + IMG('gem', 'tiny')); }
    if (r.mats) for (var i = 0; i < r.mats; i++) { var m = D.MAT_IDS[rnd(6)]; give(m, 1); msg.push(IMG(m, 'tiny')); }
    if (r.tools) ['shovel', 'stake', 'survey'].forEach(function (m) { give(m, r.tools); msg.push('+' + r.tools + ' ' + IMG(m, 'tiny')); });
    toast('Day ' + S.daily.streak + ' gift: ' + msg.join(' ')); save(); renderPanel(); hud();
  }
  // ================= rendering =================
  var cv = $('#map'), g = cv.getContext('2d'), W = 0, H = 0, DPR = 1;
  var cam = { x: 0, y: 21 * TH, z: 1 };
  function resize() {
    W = innerWidth; H = innerHeight; DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + 'px'; cv.style.height = H + 'px'; clampCam();
  }
  function clampCam() { cam.z = clamp(cam.z, 0.35, 2.4); cam.x = clamp(cam.x, -N * TW / 2, N * TW / 2); cam.y = clamp(cam.y, 0, N * TH); }
  function toWorld(sx, sy) { return [(sx - W / 2) / cam.z + cam.x, (sy - H / 2) / cam.z + cam.y]; }
  function toScreen(wx, wy) { return [(wx - cam.x) * cam.z + W / 2, (wy - cam.y) * cam.z + H / 2]; }
  function toTile(wx, wy) { var a = wy / (TH / 2), b = wx / (TW / 2); return [(a + b) / 2, (a - b) / 2]; }
  var ground = document.createElement('canvas'), GOX = N * TW / 2, GOY = 60, groundDirty = true;
  function hash(x, y) { var h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function drawGround() {
    ground.width = N * TW; ground.height = N * TH + GOY + 14; var q = ground.getContext('2d'); q.translate(GOX, GOY); q.lineJoin = 'round';
    var c = A.corners(0, 0, N, N); A.P(q, [c.t, c.r, [c.r[0], c.r[1] + 12], [c.b[0], c.b[1] + 12], [c.l[0], c.l[1] + 12], c.l]); q.fillStyle = '#7a5a36'; q.fill();
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var open = S.zones[zoneIdx(x, y)], ck = (x + y) % 2, h = hash(x, y);
      var col = open ? (ck ? '#8fd05e' : '#89ca58') : (ck ? '#5d9a45' : '#589441');
      var t = A.corners(x, y, 1, 1); A.P(q, [t.t, t.r, t.b, t.l]); q.fillStyle = col; q.fill();
      if (open && h < 0.12) { var p = A.iso(x + 0.5, y + 0.5); q.fillStyle = 'rgba(255,255,255,.35)'; q.fillRect(p[0] - 1, p[1] - 1, 2, 2); }
    }
    for (var yy = 0; yy < N; yy++) for (var xx = 0; xx < N; xx++) { if (S.zones[zoneIdx(xx, yy)]) continue; var hh = hash(xx + 99, yy + 7); if (hh < 0.42) { var pp = A.iso(xx + 0.5, yy + 0.5); A.tree(q, pp[0] + (hash(xx, yy + 3) - 0.5) * 16, pp[1], 0.75 + hh, hh < 0.12 ? 'pine' : hh < 0.2 ? 'birch' : 'oak', 0); } else if (hh < 0.5) { var p2 = A.iso(xx + 0.5, yy + 0.5); A.el(q, p2[0], p2[1], 7, 4); A.fs(q, '#9a9a8a', '#6a6a5a', 1); } }
    q.strokeStyle = 'rgba(40,70,20,.35)'; q.lineWidth = 2; q.setLineDash([6, 6]);
    for (var zi = 0; zi < ZN * ZN; zi++) { if (S.zones[zi]) continue; var zc = A.corners((zi % ZN) * ZS, Math.floor(zi / ZN) * ZS, ZS, ZS, 0.05); A.P(q, [zc.t, zc.r, zc.b, zc.l]); q.stroke(); }
    q.setLineDash([]); groundDirty = false;
  }
  function objPoly(o) {
    var d = def(o), c = A.corners(o.x, o.y, o.w, o.h, 0.08), hgt = o.t === 'field' ? 4 : o.t === 'deco' ? 34 + (o.w > 1 ? 20 : 0) : (d.H || 20) + o.w * 9 + 6;
    if (o.t === 'pen') hgt = 34; if (o.k === 'depot') hgt = 40; if (o.k === 'board') hgt = 52;
    return [c.l, c.b, c.r, A.up(c.r, hgt), A.up(c.t, hgt), A.up(c.l, hgt)];
  }
  function inPoly(p, pts) { var ins = false; for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1]; if (((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)) ins = !ins; } return ins; }
  function flat(o) { return o.t === 'field' || o.k === 'path'; }
  function sorted() { return S.objs.slice().sort(function (a, b) { var fa = flat(a) ? 0 : 1, fb = flat(b) ? 0 : 1; if (fa !== fb) return fa - fb; return (a.x + a.w / 2 + a.y + a.h / 2) - (b.x + b.w / 2 + b.y + b.h / 2); }); }
  var T = 0;
  function render() {
    T = now();
    if (groundDirty) drawGround();
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#4e8a3c'; g.fillRect(0, 0, cv.width, cv.height);
    var z = cam.z * DPR; g.setTransform(z, 0, 0, z, DPR * (W / 2 - cam.x * cam.z), DPR * (H / 2 - cam.y * cam.z)); g.lineJoin = 'round';
    g.drawImage(ground, -GOX, -GOY);
    for (var zi = 0; zi < ZN * ZN; zi++) if (!S.zones[zi] && zoneAdj(zi)) { var p = A.iso((zi % ZN) * ZS + 3, Math.floor(zi / ZN) * ZS + 3); sign(p[0], p[1]); }
    if (placing) grid();
    var list = sorted();
    for (var i = 0; i < list.length; i++) { var o = list[i]; if (placing && placing.o === o) continue; drawObj(g, o, T); }
    if (placing) { var po = placing.o, ok = canPlace(po.x, po.y, po.w, po.h, po.id), c = A.corners(po.x, po.y, po.w, po.h); A.P(g, [c.t, c.r, c.b, c.l]); g.fillStyle = ok ? 'rgba(80,220,120,.4)' : 'rgba(240,70,60,.45)'; g.fill(); g.strokeStyle = ok ? '#2a9a50' : '#c02a20'; g.lineWidth = 2; g.stroke(); g.globalAlpha = 0.88; drawObj(g, po, T, true); g.globalAlpha = 1; }
    for (var b = 0; b < list.length; b++) bubble(list[b]);
  }
  function sign(x, y) { A.ln(g, x, y, x, y - 30, '#7a4a2a', 4); A.rr(g, x - 22, y - 52, 44, 28, 6); A.fs(g, '#f3dfb0', '#7a4a2a', 2); g.drawImage(A.iconCanvas('shovel', 48), x - 12, y - 50, 24, 24); }
  function grid() {
    var o = placing.o; g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1;
    for (var y = o.y - 6; y < o.y + o.h + 6; y++) for (var x = o.x - 6; x < o.x + o.w + 6; x++) { if (!tileOpen(x, y)) continue; var c = A.corners(x, y, 1, 1); A.P(g, [c.t, c.r, c.b, c.l]); g.stroke(); }
  }
  var PLANT_POS = [[0.28, 0.3], [0.72, 0.3], [0.5, 0.52], [0.28, 0.74], [0.72, 0.74]];
  function drawField(q, o, t) {
    var c = A.corners(o.x, o.y, 1, 1, 0.06); A.P(q, [c.t, c.r, c.b, c.l]); A.fs(q, '#a0703f', '#6e4a26', 1.5);
    for (var k = 1; k < 4; k++) { var a = A.lerp(c.t, c.l, k / 4), b = A.lerp(c.r, c.b, k / 4); A.ln(q, a[0], a[1], b[0], b[1], '#8a5c32', 1.5); }
    if (!o.crop) return;
    var it = I[o.crop], p = clamp((t - o.pt) / Math.max(1, o.end - o.pt), 0, 1), ripe = o.end <= t, sh = it.art[0];
    PLANT_POS.forEach(function (pp, i) {
      var b = A.iso(o.x + pp[0], o.y + pp[1]), s = 0.35 + 0.65 * p, sw = Math.sin(t / 700 + i + o.x) * (ripe ? 1.2 : 0.6);
      if (sh === 'grain' || sh === 'cane' || sh === 'spike' || sh === 'cob') {
        var col = ripe ? it.art[1] : '#6cb84a';
        for (var k2 = -1; k2 <= 1; k2++) A.ln(q, b[0] + k2 * 3, b[1], b[0] + k2 * 4 + sw, b[1] - 16 * s, ripe && sh !== 'cob' && sh !== 'cane' ? A.shade(col, -0.15) : '#5aa83a', 2);
        if (ripe) { if (sh === 'cob') { A.el(q, b[0] + 3 + sw, b[1] - 12, 3, 6, 0.3); A.fs(q, it.art[1], A.shade(it.art[1], -0.4), 1); } else { for (var k3 = -1; k3 <= 1; k3++) { A.el(q, b[0] + k3 * 4 + sw, b[1] - 17 * s, 2.2, 4.5, k3 * 0.3); A.fs(q, it.art[1], A.shade(it.art[1], -0.4), 0.8); } } }
      } else {
        A.el(q, b[0] + sw * 0.5, b[1] - 6 * s, 7 * s, 5 * s); A.fs(q, ripe ? '#4f9e3a' : '#6cc04a', '#2f6a22', 1);
        if (ripe) { var col2 = it.art[1]; [[-3, -8], [3, -9], [0, -4]].forEach(function (d) { A.circ(q, b[0] + d[0] + sw * 0.5, b[1] + d[1], sh === 'pumpkin' ? 4 : 2.8); A.fs(q, col2, A.shade(col2, -0.4), 0.8); }); }
      }
    });
    if (ripe) { var sp = (t / 400 + o.x * 3 + o.y) % 6; if (sp < 1) { var cc = A.iso(o.x + 0.5, o.y + 0.4); star(q, cc[0] + 8, cc[1] - 18, 3.5 * (1 - Math.abs(sp - 0.5) * 2)); } }
  }
  function star(q, x, y, r) { q.fillStyle = '#fffbe0'; q.beginPath(); for (var i = 0; i < 8; i++) { var rr = i % 2 ? r * 0.35 : r, an = i * Math.PI / 4; q.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } q.fill(); }
  function shadow(q, o) { var c = A.corners(o.x, o.y, o.w, o.h, 0.02); A.P(q, [c.t, c.r, [c.b[0] + 4, c.b[1] + 2], [c.l[0] + 4, c.l[1] + 2]]); q.fillStyle = 'rgba(30,60,20,.25)'; q.fill(); }
  function building(q, o, d, t) {
    var c = A.corners(o.x, o.y, o.w, o.h, 0.14), Hh = d.H || 26, R = o.w * 9 + 6;
    shadow(q, o);
    var bc = A.corners(o.x, o.y, o.w, o.h, 0.08); A.box(q, bc, 3, '#c9c0ad', '#b0a690', '#ddd5c2');
    A.box(q, c, Hh, d.wall2 || A.shade(d.wall, -0.12), d.wall, null);
    var nW = Math.max(1, Math.round(o.w * 1.3) - (o.w > 2 ? 1 : 0));
    A.windows(q, c, Hh, nW, d.extra === 'columns' ? '#e0e6f0' : '#a9dcf2', A.shade(d.roof, -0.2));
    if (d.extra === 'awning') { A.wallQuad(q, c.b, c.r, 0.15, 0.85, Hh * 0.62, Hh * 0.78); A.fs(q, '#ffffff', '#8a7a6a', 1); for (var s = 0; s < 6; s++) { A.wallQuad(q, c.b, c.r, 0.15 + s * 0.117, 0.15 + s * 0.117 + 0.058, Hh * 0.62, Hh * 0.78); q.fillStyle = d.roof; q.fill(); } }
    if (d.extra === 'columns') for (var cl = 0; cl < 4; cl++) { var a = A.lerp(c.l, c.b, 0.15 + cl * 0.23); A.ln(q, a[0], a[1], a[0], a[1] - Hh * 0.9, '#ffffff', 3); }
    if (d.extra === 'cross') { var m = A.lerp(c.l, c.b, 0.5); q.fillStyle = '#e8404a'; q.fillRect(m[0] - 2, m[1] - Hh * 0.97, 4, 10); q.fillRect(m[0] - 5, m[1] - Hh * 0.97 + 3, 10, 4); }
    A.roof(q, c, Hh, d.roof, d.rt, R);
    if (d.extra === 'chimney') { var ch = A.corners(o.x + o.w * 0.62, o.y + o.h * 0.25, 0.32, 0.32); A.box(q, ch, Hh + R * 0.85, '#9a5a44', '#7a4434', '#5a3a2a'); var cp = A.iso(o.x + o.w * 0.78, o.y + o.h * 0.41); for (var sm = 0; sm < 3; sm++) { var ph = ((t / 1600 + sm / 3) % 1); A.circ(q, cp[0] + ph * 8, cp[1] - Hh - R * 0.85 - 6 - ph * 22, 3 + ph * 4); q.fillStyle = 'rgba(240,240,240,' + (0.6 * (1 - ph)) + ')'; q.fill(); } }
    if (d.extra === 'silo') { var sp = A.iso(o.x + 0.25, o.y + o.h - 0.05); q.fillStyle = '#c8ccd2'; q.fillRect(sp[0] - 9, sp[1] - Hh - 22, 18, Hh + 18); q.strokeStyle = '#7a8088'; q.lineWidth = 1; q.strokeRect(sp[0] - 9, sp[1] - Hh - 22, 18, Hh + 18); A.el(q, sp[0], sp[1] - 4, 9, 4); q.fillStyle = '#c8ccd2'; q.fill(); A.el(q, sp[0], sp[1] - Hh - 22, 9, 6); A.fs(q, d.roof, A.shade(d.roof, -0.4), 1); for (var r = 1; r < 4; r++) A.ln(q, sp[0] - 9, sp[1] - 4 - r * (Hh + 18) / 4, sp[0] + 9, sp[1] - 4 - r * (Hh + 18) / 4, '#9aa0a8', 1); }
    if (d.extra === 'clock') { var cc = A.lerp(c.l, c.b, 0.5); A.circ(q, cc[0], cc[1] - Hh * 0.95, 6); A.fs(q, '#ffffff', '#3a4a6a', 1.5); A.ln(q, cc[0], cc[1] - Hh * 0.95, cc[0], cc[1] - Hh * 0.95 - 4, '#333', 1); }
    if (o.t === 'fac' && d.recipes) { var sg = A.lerp(c.l, c.b, 0.5), ic = A.iconCanvas(d.recipes[0].o, 48); A.circ(q, sg[0], sg[1] - Hh * 0.98 - 4, 9); A.fs(q, '#fffaf0', '#7a5a3a', 1.5); q.drawImage(ic, sg[0] - 7, sg[1] - Hh * 0.98 - 11, 14, 14); }
    if (o.t === 'fac' && o.q && o.q.some(function (j) { return j.end > t; })) { var gp = A.iso(o.x + o.w * 0.3, o.y + o.h * 0.3); q.save(); q.translate(gp[0], gp[1] - Hh - R - 6); q.rotate((t / 300) % (Math.PI * 2)); q.fillStyle = '#c0c6cc'; for (var gk = 0; gk < 6; gk++) { q.rotate(Math.PI / 3); q.fillRect(-1.5, -7, 3, 4); } A.circ(q, 0, 0, 4.5); A.fs(q, '#c0c6cc', '#6a7078', 1); q.restore(); }
  }
  function barn(q, o) {
    var c = A.corners(o.x, o.y, o.w, o.h, 0.12), Hh = 34; shadow(q, o);
    A.box(q, c, Hh, '#c8473a', '#a83a2e');
    A.wallQuad(q, c.b, c.r, 0.32, 0.68, 0, Hh * 0.75); A.fs(q, '#f5efe6', '#7a2018', 1.5); A.wallQuad(q, c.b, c.r, 0.36, 0.64, 0, Hh * 0.68); A.fs(q, '#a83a2e', '#7a2018', 1);
    var a = A.lerp(c.b, c.r, 0.36), b = A.lerp(c.b, c.r, 0.64); A.ln(q, a[0], a[1], b[0], b[1] - Hh * 0.68, '#f5efe6', 2); A.ln(q, b[0], b[1], a[0], a[1] - Hh * 0.68, '#f5efe6', 2);
    A.wallQuad(q, c.l, c.b, 0.35, 0.65, Hh * 0.45, Hh * 0.8); A.fs(q, '#f5efe6', '#7a2018', 1.5);
    A.roof(q, c, Hh, '#6a4a3a', 'gable', 40);
  }
  function board(q, o) {
    var lift = 16, c = A.corners(o.x + 0.25, o.y + 0.9, 1.5, 0.22);
    [0.12, 0.88].forEach(function (u) { var p = A.lerp(c.l, c.b, u); A.ln(q, p[0], p[1] + 4, p[0], p[1] - lift - 26, '#7a4a2a', 4); });
    q.save(); q.translate(0, -lift); A.box(q, c, 28, '#b07a44', '#8a5a2e', '#c98d4e');
    var n = S.orders.filter(function (x) { return x.items; }).length;
    for (var i = 0; i < Math.min(6, n); i++) { var u = 0.08 + (i % 3) * 0.3, v = i < 3 ? 15 : 3; A.wallQuad(q, c.l, c.b, u, u + 0.22, v, v + 10); A.fs(q, i % 2 ? '#fffdf0' : '#fff2c8', '#c0a070', 0.8); }
    q.restore(); A.roof(q, c, 28 + lift, '#3f7a4a', 'gable', 8);
  }
  function depot(q, o, t) {
    var c = A.corners(o.x, o.y, o.w, o.h, 0.06); A.box(q, c, 5, '#b8b4aa', '#a09c92', '#d6d2c6');
    if (!truckOn()) { var sp = A.iso(o.x + 2, o.y + 1); A.rr(q, sp[0] - 36, sp[1] - 34, 72, 22, 6); A.fs(q, '#fff3d6', '#8a6a3a', 2); q.fillStyle = '#6a4a2a'; q.font = 'bold 10px sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('Opens at Lv ' + D.SPECIAL.depot.lvl, sp[0], sp[1] - 23); return; }
    q.save(); q.translate(0, -5);
    var tr = S.truck, here = tr && !(tr.away > t);
    for (var i = 0; i < 3; i++) { var cc = A.corners(o.x + 0.3 + i * 0.45, o.y + 0.15, 0.38, 0.38), done = here && tr.crates && tr.crates[i] && tr.crates[i].done; A.box(q, cc, 12, done ? '#c98d4e' : '#e2c79a', done ? '#a8743e' : '#cdb07c', done ? '#d9a060' : '#efdcb6'); }
    if (here) {
      var body = A.corners(o.x + 0.35, o.y + 0.75, 2.5, 0.95); A.box(q, body, 20, '#e8a33a', '#c8862a', '#f2bb5a');
      A.wallQuad(q, body.l, body.b, 0.08, 0.92, 6, 15); A.fs(q, '#fff3d6', '#a87a2a', 1); q.fillStyle = '#a8662a'; q.font = 'bold 7px sans-serif'; var mid = A.lerp(body.l, body.b, 0.5); q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('SUNPATCH', mid[0], mid[1] - 10);
      var cab = A.corners(o.x + 2.95, o.y + 0.8, 0.85, 0.85); A.box(q, cab, 15, '#3f7fd6', '#2f62aa', '#5a95e6'); A.wallQuad(q, cab.b, cab.r, 0.1, 0.9, 8, 14); A.fs(q, '#cfe8ff', '#2a4a7a', 1);
      [o.x + 0.8, o.x + 2.3, o.x + 3.4].forEach(function (wx) { var p = A.iso(wx, o.y + 1.72); A.el(q, p[0], p[1] - 3, 4, 5); A.fs(q, '#333', '#111', 1); });
    }
    q.restore();
  }
  function fence(q, o) {
    var c = A.corners(o.x, o.y, o.w, o.h, 0.05), pts = [c.t, c.r, c.b, c.l, c.t];
    for (var s = 0; s < 4; s++) { for (var k = 0; k <= 6; k++) { var p = A.lerp(pts[s], pts[s + 1], k / 6); A.ln(q, p[0], p[1], p[0], p[1] - 9, '#8a5a2e', 2); } A.ln(q, pts[s][0], pts[s][1] - 6, pts[s + 1][0], pts[s + 1][1] - 6, '#b07a44', 2); A.ln(q, pts[s][0], pts[s][1] - 2.5, pts[s + 1][0], pts[s + 1][1] - 2.5, '#b07a44', 1.5); }
  }
  var PEN_SPOTS = [[1.9, 0.9], [1.0, 2.0], [2.2, 2.1], [1.6, 1.5], [0.7, 1.2], [2.5, 1.4]];
  function animal(q, kind, x, y, t, i, hungry) {
    var b = Math.sin(t / 300 + i * 1.7) * (hungry ? 0.3 : 1.2);
    if (kind === 'hen') { A.el(q, x, y - 6 + b * 0.3, 6, 5); A.fs(q, '#ffffff', '#9a8a7a', 1); A.circ(q, x + 4, y - 11 + b * 0.3, 3.5); A.fs(q, '#ffffff', '#9a8a7a', 1); A.circ(q, x + 4, y - 15 + b * 0.3, 1.8); q.fillStyle = '#e8404a'; q.fill(); A.poly(q, [x + 7, y - 11, x + 10, y - 10, x + 7, y - 9]); q.fillStyle = '#f0a020'; q.fill(); return; }
    if (kind === 'cow') { [-6, 5].forEach(function (l) { A.ln(q, x + l, y - 6, x + l, y, '#555', 2); }); A.el(q, x, y - 10, 11, 7); A.fs(q, '#ffffff', '#555', 1); A.el(q, x - 3, y - 12, 4, 3); q.fillStyle = '#333'; q.fill(); A.el(q, x + 5, y - 8, 3, 2.5); q.fill(); A.el(q, x + 12, y - 14 + b * 0.5, 5, 4.5); A.fs(q, '#ffffff', '#555', 1); A.el(q, x + 14, y - 12 + b * 0.5, 3, 2); q.fillStyle = '#f0b0b0'; q.fill(); return; }
    if (kind === 'sheep') { A.ln(q, x - 4, y - 4, x - 4, y, '#333', 2); A.ln(q, x + 4, y - 4, x + 4, y, '#333', 2); [[-5, -9], [0, -11], [5, -9], [0, -7]].forEach(function (p) { A.circ(q, x + p[0], y + p[1], 5); A.fs(q, '#f6f3ec', '#bdb4a0', 1); }); A.el(q, x + 9, y - 11 + b * 0.4, 3.5, 4); A.fs(q, '#3a3a3a', '#222', 1); return; }
    if (kind === 'goat') { A.ln(q, x - 4, y - 5, x - 4, y, '#6a5a4a', 2); A.ln(q, x + 4, y - 5, x + 4, y, '#6a5a4a', 2); A.el(q, x, y - 9, 9, 5.5); A.fs(q, '#d9c4a0', '#8a7a5a', 1); A.el(q, x + 9, y - 13 + b * 0.4, 3.5, 4); A.fs(q, '#e6d4b0', '#8a7a5a', 1); A.ln(q, x + 8, y - 16, x + 6, y - 20, '#6a5a4a', 1.5); A.ln(q, x + 10, y - 16, x + 11, y - 20, '#6a5a4a', 1.5); return; }
    if (kind === 'hive') { for (var k = 0; k < 3; k++) { A.rr(q, x - 7, y - 8 - k * 6, 14, 6, 1.5); A.fs(q, k % 2 ? '#fff1c1' : '#f5d97a', '#a87a2a', 1); } A.poly(q, [x - 9, y - 20, x, y - 25, x + 9, y - 20]); A.fs(q, '#c0563a', '#7a3020', 1); if (!hungry) for (var bb = 0; bb < 3; bb++) { var an = t / 300 + bb * 2 + i; A.circ(q, x + Math.cos(an) * 12, y - 20 + Math.sin(an * 1.3) * 6, 1.6); q.fillStyle = '#2a2a2a'; q.fill(); } }
  }
  function pen(q, o, t) {
    var d = D.PENS[o.k], c = A.corners(o.x, o.y, o.w, o.h, 0.05); A.P(q, [c.t, c.r, c.b, c.l]); A.fs(q, d.ground, A.shade(d.ground, -0.2), 1);
    var sc = A.corners(o.x + 0.15, o.y + 0.15, 1.1, 1.1); A.box(q, sc, 16, d.shed, A.shade(d.shed, -0.12)); A.wallQuad(q, sc.b, sc.r, 0.3, 0.7, 0, 10); q.fillStyle = '#5a3a2a'; q.fill(); A.roof(q, sc, 16, d.roof, 'gable', 10);
    var tc = A.corners(o.x + 2.2, o.y + 0.3, 0.6, 0.25); A.box(q, tc, 4, '#8a5a2e', '#7a4a22', o.a.some(function (a) { return a > t; }) ? '#e9c46a' : '#6a4a2a');
    o.a.forEach(function (a, i) { var sp = PEN_SPOTS[i], p = A.iso(o.x + sp[0], o.y + sp[1]); animal(q, d.animal, p[0], p[1], t, i, !a); if (a && a <= t) q.drawImage(A.iconCanvas(d.out, 48), p[0] - 18, p[1] - 14, 13, 13); });
    fence(q, o);
  }
  function deco(q, o, t) {
    var k = o.k, c = A.corners(o.x, o.y, o.w, o.h, 0.1), m = A.iso(o.x + o.w / 2, o.y + o.h / 2), x = m[0], y = m[1];
    if (k === 'path') { var pc = A.corners(o.x, o.y, 1, 1, 0.02); A.P(q, [pc.t, pc.r, pc.b, pc.l]); A.fs(q, '#d8cfbc', '#b0a68e', 1); [[0.3, 0.3], [0.7, 0.35], [0.45, 0.7], [0.75, 0.75]].forEach(function (p) { var s = A.iso(o.x + p[0], o.y + p[1]); A.el(q, s[0], s[1], 6, 3); A.fs(q, '#c4b9a2', '#a89c84', 0.8); }); return; }
    if (k === 'oak' || k === 'birch' || k === 'pine') { A.tree(q, x, y + 4, 1, k, t); return; }
    if (k === 'flowers' || k === 'tulips') { A.P(q, [c.t, c.r, c.b, c.l]); A.fs(q, '#6a4a2a', '#4a3020', 1); var cols = k === 'tulips' ? ['#e84a6a', '#f2a03a', '#d85ae0'] : ['#ffd84a', '#ff7aa0', '#ffffff']; for (var i = 0; i < 9; i++) { var p = A.iso(o.x + 0.25 + (i % 3) * 0.25, o.y + 0.25 + Math.floor(i / 3) * 0.25); A.ln(q, p[0], p[1], p[0], p[1] - 6, '#3a8a2a', 1.5); A.circ(q, p[0], p[1] - 7, k === 'tulips' ? 2.6 : 2.2); A.fs(q, cols[i % 3], A.shade(cols[i % 3], -0.4), 0.7); } return; }
    if (k === 'bench') { var bc = A.corners(o.x + 0.2, o.y + 0.35, 0.6, 0.3); A.box(q, bc, 8, '#a8743e', '#8a5a2e', '#c98d4e'); A.wallQuad(q, bc.t, bc.r, 0, 1, 8, 16); A.fs(q, '#b07a44', '#6a4422', 1); return; }
    if (k === 'lamp') { A.ln(q, x, y, x, y - 34, '#3a3a44', 3); A.circ(q, x, y - 36, 5); A.fs(q, '#fff2a8', '#8a7a3a', 1.5); A.circ(q, x, y - 36, 9); q.fillStyle = 'rgba(255,240,150,.25)'; q.fill(); return; }
    if (k === 'hedge') { var hc = A.corners(o.x, o.y, 1, 1, 0.12); A.box(q, hc, 12, '#3f8a34', '#357a2c', '#4f9e3a'); return; }
    if (k === 'pond') { A.el(q, x, y, 46, 22); A.fs(q, '#5ab0e0', '#2f7aa8', 3); A.el(q, x - 6, y - 3, 30, 12); q.fillStyle = 'rgba(255,255,255,.25)'; q.fill(); var dx = Math.sin(t / 2000) * 14; A.el(q, x + dx, y + 2, 5, 3.5); A.fs(q, '#ffffff', '#999', 1); A.circ(q, x + dx + 4, y - 2, 2.5); A.fs(q, '#ffffff', '#999', 1); A.poly(q, [x + dx + 6, y - 2, x + dx + 9, y - 1, x + dx + 6, y]); q.fillStyle = '#f0a020'; q.fill(); return; }
    if (k === 'fountain') { A.el(q, x, y, 34, 17); A.fs(q, '#d8d4c8', '#8a8676', 2); A.el(q, x, y - 3, 28, 13); A.fs(q, '#6ac0ea', null); q.fillStyle = '#d8d4c8'; q.fillRect(x - 4, y - 30, 8, 28); A.el(q, x, y - 30, 12, 5); A.fs(q, '#e6e2d6', '#8a8676', 1.5); for (var j = 0; j < 4; j++) { var ph = (t / 600 + j / 4) % 1; A.circ(q, x + (j - 1.5) * 8 * ph, y - 36 + 20 * ph * ph - 8 * ph, 1.8); q.fillStyle = 'rgba(150,210,255,.9)'; q.fill(); } return; }
    if (k === 'gazebo') { var gc = A.corners(o.x, o.y, 2, 2, 0.25); A.P(q, [gc.t, gc.r, gc.b, gc.l]); A.fs(q, '#e8dcc4', '#a8987a', 1.5); [gc.l, gc.b, gc.r].forEach(function (p) { A.ln(q, p[0], p[1], p[0], p[1] - 26, '#ffffff', 3); }); A.roof(q, gc, 26, '#4a8a6a', 'hip', 18); return; }
    if (k === 'windmill') { var wc = A.corners(o.x, o.y, 2, 2, 0.5); A.box(q, wc, 44, '#f2ead8', '#d8ccb0'); A.roof(q, wc, 44, '#8a4a3a', 'hip', 14); var hp = A.lerp(wc.l, wc.b, 0.5); q.save(); q.translate(hp[0], hp[1] - 40); q.rotate(t / 1400); for (var b = 0; b < 4; b++) { q.rotate(Math.PI / 2); q.fillStyle = '#fffaf0'; q.strokeStyle = '#7a5a3a'; q.lineWidth = 1; q.fillRect(-3, 2, 6, 26); q.strokeRect(-3, 2, 6, 26); } A.circ(q, 0, 0, 3); A.fs(q, '#7a5a3a'); q.restore(); return; }
    if (k === 'statue') { var sc = A.corners(o.x, o.y, 1, 1, 0.2); A.box(q, sc, 12, '#cfcabe', '#b0aa9c', '#e2ddd0'); A.el(q, x, y - 24, 6, 9); A.fs(q, '#9ab0a8', '#5a706a', 1); A.circ(q, x, y - 37, 5); A.fs(q, '#9ab0a8', '#5a706a', 1); A.ln(q, x + 5, y - 28, x + 10, y - 40, '#9ab0a8', 3); return; }
    if (k === 'clocktower') { var cc = A.corners(o.x, o.y, 2, 2, 0.55); A.box(q, cc, 62, '#e8dcc4', '#c8b898'); A.roof(q, cc, 62, '#3a5a8a', 'hip', 22); var fp = A.lerp(cc.l, cc.b, 0.5); A.circ(q, fp[0], fp[1] - 48, 7); A.fs(q, '#ffffff', '#3a4a6a', 1.5); var an = t / 60000 * Math.PI * 2; A.ln(q, fp[0], fp[1] - 48, fp[0] + Math.sin(an) * 5, fp[1] - 48 - Math.cos(an) * 5, '#222', 1.2); return; }
    if (k === 'rosearch') { var a1 = A.iso(o.x + 0.15, o.y + 0.5), a2 = A.iso(o.x + 0.85, o.y + 0.5); A.ln(q, a1[0], a1[1], a1[0], a1[1] - 26, '#ffffff', 3); A.ln(q, a2[0], a2[1], a2[0], a2[1] - 26, '#ffffff', 3); q.beginPath(); q.moveTo(a1[0], a1[1] - 26); q.quadraticCurveTo(x, y - 46, a2[0], a2[1] - 26); q.strokeStyle = '#ffffff'; q.lineWidth = 3; q.stroke(); for (var r = 0; r < 8; r++) { var u = r / 7, px = a1[0] + (a2[0] - a1[0]) * u, py = a1[1] - 26 - Math.sin(u * Math.PI) * 14 + (a2[1] - a1[1]) * u; A.circ(q, px, py, 3); A.fs(q, r % 2 ? '#e84a6a' : '#3a8a2a'); } return; }
    if (k === 'bandstand') { var bc2 = A.corners(o.x, o.y, 3, 3, 0.2); A.box(q, bc2, 8, '#e8dcc4', '#c8b898', '#f4ead6'); [bc2.l, bc2.b, bc2.r, A.lerp(bc2.l, bc2.b, 0.5), A.lerp(bc2.b, bc2.r, 0.5)].forEach(function (p) { A.ln(q, p[0], p[1] - 8, p[0], p[1] - 40, '#ffffff', 3); }); A.roof(q, bc2, 40, '#c84a4a', 'hip', 24); return; }
  }
  function construction(q, o) {
    var c = A.corners(o.x, o.y, o.w, o.h, 0.12), Hh = 18; A.P(q, [c.t, c.r, c.b, c.l]); A.fs(q, '#c8a878', '#8a6a3a', 1.5);
    [c.t, c.r, c.b, c.l].forEach(function (p) { A.ln(q, p[0], p[1], p[0], p[1] - Hh - 8, '#c8a060', 3); });
    A.ln(q, c.l[0], c.l[1] - Hh, c.b[0], c.b[1] - Hh, '#c8a060', 3); A.ln(q, c.b[0], c.b[1] - Hh, c.r[0], c.r[1] - Hh, '#c8a060', 3); A.ln(q, c.l[0], c.l[1] - 4, c.b[0], c.b[1] - Hh, '#b08850', 2);
    var p = A.iso(o.x + o.w * 0.3, o.y + o.h * 0.6); A.rr(q, p[0] - 8, p[1] - 10, 16, 10, 2); A.fs(q, '#d84a3a', '#8a2a1a', 1);
  }
  function drawObj(q, o, t, ghost) {
    if (!ghost && o.done && o.done > t && o.t !== 'field') { construction(q, o); return; }
    var d = def(o);
    if (o.t === 'field') drawField(q, o, t);
    else if (o.t === 'pen') pen(q, o, t);
    else if (o.t === 'deco') deco(q, o, t);
    else if (o.k === 'barn') barn(q, o);
    else if (o.k === 'board') board(q, o);
    else if (o.k === 'depot') depot(q, o, t);
    else building(q, o, d, t);
  }
  function bubbleIcon(o) {
    if (o.done && o.done > T) return 'clock';
    if (o.t === 'fac' && o.q.length && o.q[0].end <= T) return o.q[0].o;
    if (o.t === 'pen') { var d = D.PENS[o.k]; if (o.a.some(function (a) { return a && a <= T; })) return d.out; if (o.a.every(function (a) { return !a; }) && have(d.feed) > 0) return d.feed; }
    if (o.k === 'board' && S.orders.some(function (od) { return od.items && canFill(od); })) return 'check';
    if (o.k === 'depot' && truckOn() && S.truck && !(S.truck.away > T) && S.truck.crates.some(function (c) { return !c.done && have(c.id) >= c.q; })) return 'truck';
    return null;
  }
  function bubble(o) {
    if (o.t === 'field' || o.t === 'deco') return; var ic = bubbleIcon(o); if (!ic) return;
    var p = A.iso(o.x + o.w / 2, o.y + o.h / 2), hgt = objPoly(o)[4][1] - 26, bob = Math.sin(T / 400 + o.id) * 2.5, x = p[0], y = hgt + bob;
    g.beginPath(); g.moveTo(x - 5, y + 12); g.lineTo(x, y + 19); g.lineTo(x + 5, y + 12); g.fillStyle = '#fffaf0'; g.fill();
    A.circ(g, x, y, 15); A.fs(g, '#fffaf0', '#7a5a3a', 2); g.drawImage(A.iconCanvas(ic, 64), x - 11, y - 11, 22, 22);
  }
  var floaters = [];
  function floatAt(o, txt, ic) { var p = A.iso(o.x + o.w / 2, o.y + o.h / 2), s = toScreen(p[0], p[1] - 30); floatScreen(s[0], s[1], txt, ic); }
  function floatScreen(x, y, txt, ic) {
    var el = document.createElement('div'); el.className = 'floater'; el.innerHTML = IMG(ic, 'sm') + '<b>' + esc(txt) + '</b>';
    el.style.left = x + 'px'; el.style.top = y + 'px'; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 1300);
  }

  // ================= input =================
  var pts = {}, gesture = null, tool = null, placing = null;
  function hit(sx, sy) {
    var w = toWorld(sx, sy), list = sorted();
    for (var i = list.length - 1; i >= 0; i--) { if (inPoly(w, objPoly(list[i]))) return list[i]; }
    return null;
  }
  function zoneAt(sx, sy) { var w = toWorld(sx, sy), tt = toTile(w[0], w[1]), x = Math.floor(tt[0]), y = Math.floor(tt[1]); if (x < 0 || y < 0 || x >= N || y >= N) return -1; return zoneIdx(x, y); }
  function setTool(tl) { tool = tl; var tr = $('#tray'); if (!tl) { tr.classList.add('hidden'); tr.innerHTML = ''; return; } renderTray(); tr.classList.remove('hidden'); }
  function renderTray() {
    var tr = $('#tray'), h = '';
    if (tool.kind === 'plant') {
      h += '<div class="trayhint">Tap or swipe across empty fields</div><div class="trayrow">';
      D.ORDER.forEach(function (id) { var it = I[id]; if (it.k !== 'crop') return; var lock = it.lvl > S.lvl; h += '<button class="seed' + (tool.crop === id ? ' on' : '') + (lock ? ' off' : '') + '" data-act="seed" data-id="' + id + '">' + IMG(lock ? 'lock' : id) + '<span>' + (lock ? 'Lv ' + it.lvl : ftime(it.t * 1000)) + '</span><span class="tiny">' + (seedCost(id) ? seedCost(id) + IMG('coin', 'tiny') : 'Free') + '</span></button>'; });
      h += '</div>';
    } else h += '<div class="trayhint">' + IMG('leaf', 'sm') + ' Swipe across ripe fields to harvest</div>';
    h += '<button class="btn sm ghost trayx" data-act="tooloff">Done</button>'; tr.innerHTML = h;
  }
  function applyTool(o) {
    if (!tool || !o || o.t !== 'field') return;
    if (tool.kind === 'plant' && !o.crop) { if (plant(o, tool.crop)) { floatAt(o, '-' + seedCost(tool.crop), 'coin'); } }
    else if (tool.kind === 'harvest' && o.crop && o.end <= now()) harvest(o);
    hud();
  }
  function tap(sx, sy) {
    if (placing) { var w = toWorld(sx, sy), tt = toTile(w[0], w[1]); placing.o.x = Math.floor(tt[0] - placing.o.w / 2 + 0.5); placing.o.y = Math.floor(tt[1] - placing.o.h / 2 + 0.5); return; }
    var o = hit(sx, sy);
    if (tool) { if (o && o.t === 'field') { applyTool(o); return; } setTool(null); }
    if (!o) { var zi = zoneAt(sx, sy); if (zi >= 0 && !S.zones[zi] && zoneAdj(zi)) open('expand', { zi: zi }); return; }
    onTapObj(o);
  }
  function onTapObj(o) {
    if (o.done && o.done > now()) { open('build', { o: o }); return; }
    if (o.t === 'field') {
      if (!o.crop) { setTool({ kind: 'plant', crop: tool && tool.crop || lastCrop() }); applyTool(o); return; }
      if (o.end <= now()) { setTool({ kind: 'harvest' }); applyTool(o); return; }
      open('info', { o: o }); return;
    }
    if (o.t === 'fac') { if (facCollect(o)) { hud(); return; } open('fac', { o: o }); return; }
    if (o.t === 'pen') { var got = penCollect(o), fed = penFeed(o); save(); hud(); if (got || fed) { if (fed) toast('Fed ' + fed + ' ' + IMG(D.PENS[o.k].feed, 'tiny')); return; } open('pen', { o: o }); return; }
    if (o.k === 'barn') { open('barn'); return; }
    if (o.k === 'board') { open('board'); return; }
    if (o.k === 'depot') { if (!truckOn()) { toast('The freight depot opens at level ' + D.SPECIAL.depot.lvl); return; } open('depot'); return; }
    open('info', { o: o });
  }
  var lastCropId = 'wheat'; function lastCrop() { return I[lastCropId] && I[lastCropId].lvl <= S.lvl ? lastCropId : 'wheat'; }
  function down(e) {
    cv.setPointerCapture && cv.setPointerCapture(e.pointerId); pts[e.pointerId] = [e.clientX, e.clientY]; var ids = Object.keys(pts);
    if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]]; gesture = { type: 'pinch', d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.z, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2, cx: cam.x, cy: cam.y }; return; }
    var o = hit(e.clientX, e.clientY);
    if (placing && o === placing.o) gesture = { type: 'ghost', sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y, moved: false };
    else if (placing) { var hit0 = inPoly(toWorld(e.clientX, e.clientY), objPoly(placing.o)); gesture = hit0 ? { type: 'ghost', sx: e.clientX, sy: e.clientY, ox: placing.o.x, oy: placing.o.y, moved: false } : { type: 'pan', sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y, moved: false }; }
    else if (tool && o && o.t === 'field') { gesture = { type: 'tool', sx: e.clientX, sy: e.clientY, moved: false, last: o.id, first: o }; }
    else gesture = { type: 'pan', sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y, moved: false };
  }
  function move(e) {
    if (!pts[e.pointerId]) return; pts[e.pointerId] = [e.clientX, e.clientY]; if (!gesture) return;
    if (gesture.type === 'pinch') { var ids = Object.keys(pts); if (ids.length < 2) return; var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; var wpt = [(gesture.mx - W / 2) / gesture.z + gesture.cx, (gesture.my - H / 2) / gesture.z + gesture.cy]; cam.z = clamp(gesture.z * d / gesture.d, 0.35, 2.4); cam.x = wpt[0] - (mx - W / 2) / cam.z; cam.y = wpt[1] - (my - H / 2) / cam.z; clampCam(); return; }
    var dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy; if (Math.abs(dx) + Math.abs(dy) > 8) gesture.moved = true;
    if (gesture.type === 'pan' && gesture.moved) { cam.x = gesture.cx - dx / cam.z; cam.y = gesture.cy - dy / cam.z; clampCam(); }
    else if (gesture.type === 'ghost') { var w0 = toWorld(gesture.sx, gesture.sy), w1 = toWorld(e.clientX, e.clientY), t0 = toTile(w0[0], w0[1]), t1 = toTile(w1[0], w1[1]); placing.o.x = gesture.ox + Math.round(t1[0] - t0[0]); placing.o.y = gesture.oy + Math.round(t1[1] - t0[1]); }
    else if (gesture.type === 'tool') { if (gesture.first) { applyTool(gesture.first); gesture.first = null; } var o = hit(e.clientX, e.clientY); if (o && o.id !== gesture.last) { gesture.last = o.id; applyTool(o); } }
  }
  function up(e) {
    if (!pts[e.pointerId]) return; delete pts[e.pointerId]; var gs = gesture;
    if (Object.keys(pts).length) { if (gs && gs.type === 'pinch') gesture = null; return; }
    gesture = null; if (!gs || gs.type === 'pinch') return;
    if (gs.type === 'tool') { if (gs.first) applyTool(gs.first); return; }
    if (!gs.moved && gs.type !== 'ghost') tap(e.clientX, e.clientY);
  }
  cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', function (e) { delete pts[e.pointerId]; gesture = null; });
  cv.addEventListener('wheel', function (e) { e.preventDefault(); var w = toWorld(e.clientX, e.clientY); cam.z = clamp(cam.z * Math.exp(-e.deltaY * 0.0015), 0.35, 2.4); cam.x = w[0] - (e.clientX - W / 2) / cam.z; cam.y = w[1] - (e.clientY - H / 2) / cam.z; clampCam(); }, { passive: false });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

  // ================= placement =================
  function costOf(t, k) { if (t === 'field') return { coins: fieldCost() }; var d = def({ t: t, k: k }); return { coins: d.cost || 0, mats: d.mats || {} }; }
  function reqMsg(t, k) {
    var d = t === 'field' ? { lvl: 1 } : def({ t: t, k: k });
    if (d.lvl > S.lvl) return 'Unlocks at level ' + d.lvl;
    if (t === 'field' && count('field') >= maxFields()) return 'Grow your population for more fields';
    if ((t === 'fac' || t === 'pen') && count(t, k)) return 'Already built';
    if ((t === 'fac' || t === 'pen') && d.pop > pop()) return 'Needs ' + d.pop + ' residents';
    if (t === 'comm' && count('comm', k)) return 'Already built';
    if (t === 'house' && popPlanned() + d.pop > cap()) return 'Population cap reached. Build community buildings.';
    var c = costOf(t, k); if (S.coins < c.coins) return 'Need ' + fmt(c.coins) + ' coins';
    if (c.mats && !hasAll(c.mats)) return 'Need materials';
    return null;
  }
  function startPlace(t, k) {
    var m = reqMsg(t, k); if (m) { toast(m); return false; }
    closePanel(); setTool(null);
    var d = t === 'field' ? { w: 1, h: 1 } : def({ t: t, k: k }), ct = toTile(cam.x, cam.y), x = Math.floor(ct[0]), y = Math.floor(ct[1]);
    var best = null; for (var r = 0; r < 20 && !best; r++) for (var j = -r; j <= r && !best; j++) for (var i = -r; i <= r && !best; i++) if (canPlace(x + i, y + j, d.w, d.h)) best = [x + i, y + j];
    if (!best) best = [x, y];
    placing = { t: t, k: k, o: mk(t, k, best[0], best[1]) }; S.nid--; placing.o.id = -1;
    $('#placebar .pname').textContent = t === 'field' ? 'Field' : d.n; $('#placebar').classList.remove('hidden'); document.body.classList.add('placing');
    return true;
  }
  function confirmPlace() {
    if (!placing) return; var p = placing, o = p.o;
    if (!canPlace(o.x, o.y, o.w, o.h)) { toast('That spot is blocked'); return; }
    if (p.moving) { S.objs.push(o); reocc(); save(); placing = null; cancelPlace(); return; }
    var m = reqMsg(p.t, p.k); if (m) { toast(m); cancelPlace(); return; }
    var c = costOf(p.t, p.k); S.coins -= c.coins; for (var k in c.mats || {}) take(k, c.mats[k]);
    var n = mk(p.t, p.k, o.x, o.y), d = def(n); if (d.bt) n.done = now() + d.bt * 1000; S.objs.push(n); reocc();
    if (p.t === 'deco') addXP(d.xp || 1); else addXP(p.t === 'field' ? 1 : Math.max(2, Math.round((d.cost || 0) / 20)));
    save(); hud();
    if (p.t === 'field' && !reqMsg('field')) { var nx = o.x + 1, ny = o.y; if (!canPlace(nx, ny, 1, 1)) { nx = o.x; ny = o.y + 1; } placing.o = mk('field', 'field', nx, ny); S.nid--; placing.o.id = -1; return; }
    if (p.t === 'deco' && !reqMsg('deco', p.k)) { placing.o = mk('deco', p.k, o.x + o.w, o.y); S.nid--; placing.o.id = -1; return; }
    cancelPlace();
  }
  function cancelPlace() { if (placing && placing.moving) { placing.o.x = placing.moving.x; placing.o.y = placing.moving.y; S.objs.push(placing.o); reocc(); } placing = null; $('#placebar').classList.add('hidden'); document.body.classList.remove('placing'); setTimeout(showLevelUp, 300); }
  function moveObj(o) { closePanel(); var copy = S.objs.indexOf(o); S.objs.splice(copy, 1); reocc(); placing = { t: o.t, k: o.k, o: o, moving: { x: o.x, y: o.y } }; $('#placebar .pname').textContent = 'Move ' + (def(o).n || ''); $('#placebar').classList.remove('hidden'); document.body.classList.add('placing'); }
  // ================= panels =================
  var panel = null, pctx = {};
  function open(name, ctx) { panel = name; pctx = ctx || {}; renderPanel(); $('#shade').classList.add('on'); $('#sheet').classList.add('on'); }
  function closePanel() { var was = panel; panel = null; $('#shade').classList.remove('on'); $('#sheet').classList.remove('on'); if (was !== 'level' && levelUpQueue.length) setTimeout(showLevelUp, 300); }
  function showLevelUp() { if (!levelUpQueue.length || panel || placing) return; open('level', levelUpQueue.shift()); }
  function need(id, n) { var h = have(id), ok = h >= n; return '<span class="need' + (ok ? '' : ' red') + '">' + IMG(id, 'sm') + fmt(h) + '/' + n + '</span>'; }
  function timer(end) { return '<span data-end="' + end + '">' + ftime(end - now()) + '</span>'; }
  var thumbs = {};
  function thumb(t, k) {
    var key = t + ':' + k; if (thumbs[key]) return '<img class="thumb" alt="" src="' + thumbs[key] + '">';
    var d = t === 'field' ? { w: 1, h: 1 } : def({ t: t, k: k }), w = d.w, h = d.h, c = document.createElement('canvas'); c.width = 160; c.height = 130;
    var q = c.getContext('2d'), s = Math.min(150 / ((w + h) * 32), 1.6), top = (d.H || 30) + w * 9 + 20;
    q.translate(80 - (w - h) * 16 * s, 125 - (w + h) * 16 * s); q.scale(s, s); q.lineJoin = 'round';
    var o = { id: 0, t: t, k: k, x: 0, y: 0, w: w, h: h, done: 0, q: [], slots: 3, a: [1, 1, 1], crop: 'wheat', pt: 0, end: 1 };
    try { drawObj(q, o, now(), true); } catch (e) { }
    thumbs[key] = c.toDataURL(); return '<img class="thumb" alt="" src="' + thumbs[key] + '">';
  }
  function costHtml(c) { var h = '<b>' + fmt(c.coins) + '</b>' + IMG('coin', 'sm'); for (var k in c.mats || {}) h += ' ' + need(k, c.mats[k]); return h; }
  var P = {};
  P.fac = function () {
    var o = pctx.o, d = def(o), h = '<div class="slots">';
    for (var i = 0; i < o.slots; i++) { var j = o.q[i]; if (!j) { h += '<div class="slot empty">' + IMG('clock', 'sm dim') + '</div>'; continue; } var ready = j.end <= now(), act = !ready && (i === 0 || o.q[i - 1].end <= now()); h += '<div class="slot' + (ready ? ' ready' : act ? ' active' : '') + '">' + IMG(j.o) + '<span class="tiny">' + (ready ? 'Ready' : act ? timer(j.end) : 'Waiting') + '</span></div>'; }
    if (o.slots < 6) h += '<button class="slot add" data-act="slot">+' + IMG('gem', 'tiny') + (o.slots * 2) + '</button>';
    h += '</div><div class="row">';
    if (o.q.some(function (j) { return j.end <= now(); })) h += '<button class="btn" data-act="collect">Collect</button>';
    var a = o.q.find(function (j) { return j.end > now(); }); if (a) h += '<button class="btn gem" data-act="facspeed">Finish now ' + IMG('gem', 'sm') + gemCost(a.end - now()) + '</button>';
    h += '</div><div class="list">';
    d.recipes.forEach(function (r, i) {
      var lock = r.lvl > S.lvl; h += '<div class="recipe' + (lock ? ' off' : '') + '"><div class="rout">' + IMG(lock ? 'lock' : r.o, 'big') + '<b>' + (r.c > 1 ? r.c + '× ' : '') + I[r.o].n + '</b></div>';
      h += lock ? '<div class="dim">Unlocks at level ' + r.lvl + '</div>' : '<div class="rin">' + Object.keys(r.i).map(function (k) { return need(k, r.i[k]); }).join('') + '<span class="dim">' + IMG('clock', 'tiny') + ftime(r.t * 1000) + '</span></div><button class="btn sm" data-act="make" data-i="' + i + '">Make</button>';
      h += '</div>';
    });
    return h + '</div>';
  };
  P.pen = function () {
    var o = pctx.o, d = D.PENS[o.k], h = '<div class="slots">';
    o.a.forEach(function (a) { h += '<div class="slot' + (a && a <= now() ? ' ready' : a ? ' active' : '') + '">' + IMG(a && a <= now() ? d.out : d.feed) + '<span class="tiny">' + (!a ? 'Hungry' : a <= now() ? 'Ready' : timer(a)) + '</span></div>'; });
    h += '</div><p class="dim">Each animal eats 1 ' + I[d.feed].n + ' and gives 1 ' + I[d.out].n + ' every ' + ftime(d.t * 1000) + '. You have ' + fmt(have(d.feed)) + ' feed.</p><div class="row"><button class="btn" data-act="feed">Collect &amp; feed</button>';
    var mx = Math.max.apply(null, o.a.map(function (t) { return t - now(); })); if (mx > 0) h += '<button class="btn gem" data-act="penspeed">Finish now ' + IMG('gem', 'sm') + gemCost(mx) + '</button>';
    if (o.a.length < 6) h += '<button class="btn ghost" data-act="buyanimal">Add animal ' + fmt(d.cost / 2) + IMG('coin', 'sm') + '</button>';
    return h + '</div>' + (have(d.feed) < 1 ? '<p class="dim">Make ' + I[d.feed].n + ' at the Feed Mill.</p>' : '');
  };
  P.board = function () {
    var h = '<div class="orders">';
    S.orders.forEach(function (od, i) {
      if (!od.items) { h += '<div class="order wait">' + IMG('clock', 'big dim') + '<div class="dim">New order in ' + timer(od.wait) + '</div><button class="btn sm gem" data-act="skipwait" data-i="' + i + '">' + IMG('gem', 'tiny') + '1</button></div>'; return; }
      var ok = canFill(od); h += '<div class="order' + (ok ? ' ok' : '') + '"><div class="oitems">' + od.items.map(function (x) { return need(x[0], x[1]); }).join('') + '</div><div class="orew"><span>' + IMG('coin', 'sm') + fmt(od.coins) + '</span><span>' + IMG('star', 'sm') + fmt(od.xp) + '</span>' + (od.bonus ? '<span>' + IMG(od.bonus, 'sm') + '</span>' : '') + (od.gem ? '<span>' + IMG('gem', 'sm') + od.gem + '</span>' : '') + '</div><div class="row"><button class="btn sm' + (ok ? '' : ' off') + '" data-act="deliver" data-i="' + i + '">Deliver</button><button class="btn sm ghost" data-act="discard" data-i="' + i + '" aria-label="Skip">✕</button></div></div>';
    });
    return h + '</div>';
  };
  P.depot = function () {
    var tr = S.truck; if (tr.away > now()) return '<div class="center">' + IMG('truck', 'huge') + '<p>The truck is out on its route.<br>Back in ' + timer(tr.away) + '</p><button class="btn gem" data-act="truckspeed">Bring it back ' + IMG('gem', 'sm') + gemCost(tr.away - now()) + '</button></div>';
    var h = '<p class="dim">Pack all three crates, then send the truck. Each crate pays coins plus a building material.</p><div class="crates">';
    tr.crates.forEach(function (c, i) { h += '<div class="crate' + (c.done ? ' done' : '') + '">' + IMG(c.done ? 'check' : c.id, 'big') + '<div>' + (c.done ? 'Packed' : need(c.id, c.q)) + '</div><div class="tiny">' + IMG('coin', 'tiny') + c.coins + ' + ' + IMG(c.mat, 'tiny') + '</div>' + (c.done ? '' : '<button class="btn sm' + (have(c.id) >= c.q ? '' : ' off') + '" data-act="crate" data-i="' + i + '">Pack</button>') + '</div>'; });
    return h + '</div><div class="row"><button class="btn' + (tr.crates.every(function (c) { return c.done; }) ? '' : ' off') + '" data-act="sendtruck">' + IMG('truck', 'sm') + ' Send truck</button></div>';
  };
  P.barn = function () {
    var tab = pctx.tab || 'goods', u = barnUsed(), c = barnCap(), uc = barnUpgradeCost();
    var h = '<div class="cap"><div class="bar"><i style="width:' + Math.min(100, u / c * 100) + '%"></i></div><b>' + fmt(u) + '/' + fmt(c) + '</b></div>';
    h += '<div class="tabs"><button class="' + (tab === 'goods' ? 'on' : '') + '" data-act="btab" data-t="goods">Goods</button><button class="' + (tab === 'mats' ? 'on' : '') + '" data-act="btab" data-t="mats">Materials</button><button class="' + (tab === 'up' ? 'on' : '') + '" data-act="btab" data-t="up">Upgrade</button></div>';
    if (tab === 'up') return h + '<div class="center"><p>Make the barn bigger: room for <b>' + (c + 30) + '</b> goods.</p><div class="rin">' + Object.keys(uc.mats).map(function (k) { return need(k, uc.mats[k]); }).join('') + '</div><p>' + costHtml({ coins: uc.coins }) + '</p><button class="btn" data-act="barnup">Upgrade barn</button><p class="dim">Get bolts, hinges and varnish from the freight truck, order bonuses and daily gifts.</p></div>';
    var ids = tab === 'mats' ? D.MAT_IDS.filter(function (k) { return S.mats[k]; }) : D.ORDER.filter(function (k) { return S.inv[k]; });
    if (!ids.length) return h + '<p class="dim center">Nothing here yet.</p>';
    h += '<div class="grid">'; ids.forEach(function (id) { h += '<div class="card">' + IMG(id, 'big') + '<b>' + fmt(have(id)) + '</b><span class="tiny">' + I[id].n + '</span>' + (tab === 'goods' ? '<button class="btn sm ghost" data-act="sell" data-id="' + id + '">Sell ' + Math.max(1, Math.round(D.val(id) * 0.5)) + IMG('coin', 'tiny') + '</button>' : '') + '</div>'; });
    return h + '</div>';
  };
  P.build = function () { var o = pctx.o; return '<div class="center">' + thumb(o.t, o.k) + '<p>Under construction. Ready in ' + timer(o.done) + '</p><button class="btn gem" data-act="buildspeed">Finish now ' + IMG('gem', 'sm') + gemCost(o.done - now()) + '</button></div>'; };
  P.info = function () {
    var o = pctx.o, d = def(o), h = '<div class="center">';
    if (o.t === 'field') { var it = I[o.crop]; h += IMG(o.crop, 'huge') + '<p>' + it.n + ' ready in ' + timer(o.end) + '</p><button class="btn gem" data-act="fieldspeed">Grow now ' + IMG('gem', 'sm') + gemCost(o.end - now()) + '</button>'; return h + '</div>'; }
    h += thumb(o.t, o.k);
    if (o.t === 'house') h += '<p>Home to ' + IMG('person', 'sm') + d.pop + ' residents.</p>';
    if (o.t === 'comm') h += '<p>Raises the population limit by ' + IMG('person', 'sm') + d.cap + '.</p>';
    if (o.t === 'deco') h += '<p>A lovely touch for the valley.</p>';
    h += '<div class="row"><button class="btn ghost" data-act="move">Move</button>' + (o.t === 'deco' ? '<button class="btn ghost" data-act="store">Remove</button>' : '') + '</div>';
    return h + '</div>';
  };
  var SHOP = {
    farm: function () { var l = [['field', 'field']]; Object.keys(D.PENS).forEach(function (k) { l.push(['pen', k]); }); return l; },
    industry: function () { return Object.keys(D.FACTS).map(function (k) { return ['fac', k]; }); },
    homes: function () { return Object.keys(D.HOUSES).map(function (k) { return ['house', k]; }); },
    town: function () { return Object.keys(D.COMM).filter(function (k) { return k !== 'hall'; }).map(function (k) { return ['comm', k]; }); },
    decor: function () { return Object.keys(D.DECOS).map(function (k) { return ['deco', k]; }); }
  };
  P.shop = function () {
    var tab = pctx.tab || 'farm', h = '<div class="tabs">';
    [['farm', 'Farm'], ['homes', 'Homes'], ['town', 'Town'], ['industry', 'Industry'], ['decor', 'Decor']].forEach(function (t) { h += '<button class="' + (tab === t[0] ? 'on' : '') + '" data-act="stab" data-t="' + t[0] + '">' + t[1] + '</button>'; });
    h += '</div>';
    if (tab === 'homes' || tab === 'town') h += '<p class="dim">' + IMG('person', 'sm') + ' Residents ' + fmt(popPlanned()) + ' / limit ' + fmt(cap()) + '. Homes add residents, town buildings raise the limit.</p>';
    h += '<div class="grid shop">';
    SHOP[tab]().forEach(function (e) {
      var t = e[0], k = e[1], d = t === 'field' ? { n: 'Field', lvl: 1 } : def({ t: t, k: k }), m = reqMsg(t, k), lock = d.lvl > S.lvl, c = costOf(t, k), sub = '';
      if (t === 'field') sub = count('field') + '/' + maxFields() + ' fields';
      else if (t === 'house') sub = '+' + d.pop + ' residents'; else if (t === 'comm') sub = '+' + d.cap + ' limit';
      else if (t === 'fac') sub = d.pop ? 'Needs ' + d.pop + ' residents' : ''; else if (t === 'pen') sub = I[d.out].n + (d.pop ? ' · ' + d.pop + ' residents' : '');
      else if (t === 'deco') sub = '+' + d.xp + ' XP';
      h += '<div class="card' + (m ? ' off' : '') + '"' + (lock ? '' : ' data-act="buy" data-t="' + t + '" data-k="' + k + '"') + '>' + (lock ? '<div class="thumb lockt">' + IMG('lock', 'big') + '</div>' : thumb(t, k)) + '<b>' + d.n + '</b><span class="tiny">' + (lock ? 'Level ' + d.lvl : sub) + '</span>' + (lock ? '' : '<span class="price">' + costHtml(c) + '</span>') + (m && !lock ? '<span class="tiny red">' + m + '</span>' : '') + '</div>';
    });
    return h + '</div>';
  };
  P.expand = function () { var c = expandCost(); return '<div class="center">' + IMG('shovel', 'huge') + '<p>Clear this land to build more.</p>' + (S.lvl < c.lvl ? '<p class="red">Needs level ' + c.lvl + '</p>' : '') + '<div class="rin">' + Object.keys(c.mats).map(function (k) { return need(k, c.mats[k]); }).join('') + '</div><p>' + costHtml({ coins: c.coins }) + '</p><button class="btn" data-act="expand">Clear land</button><p class="dim">Shovels, stakes and survey maps come from orders, the freight truck and daily gifts.</p></div>'; };
  P.daily = function () {
    var ready = dailyReady(), nx = ready ? (S.daily.last === dayStr(now() - 86400000) ? S.daily.streak % 7 + 1 : 1) : S.daily.streak, h = '<div class="days">';
    DAILY.forEach(function (r, i) { var lbl = []; if (r.coins) lbl.push(IMG('coin', 'sm') + r.coins); if (r.gems) lbl.push(IMG('gem', 'sm') + r.gems); if (r.mats) lbl.push(IMG('planks', 'sm') + '×' + r.mats); if (r.tools) lbl.push(IMG('shovel', 'sm') + '×' + r.tools); h += '<div class="day' + (i + 1 < nx || (!ready && i + 1 === nx) ? ' got' : i + 1 === nx ? ' next' : '') + '"><b>Day ' + (i + 1) + '</b>' + lbl.join('<br>') + '</div>'; });
    return h + '</div><div class="center">' + (ready ? '<button class="btn" data-act="claim">' + IMG('gift', 'sm') + ' Open today\'s gift</button>' : '<p class="dim">Come back tomorrow for the next gift.</p>') + '</div>';
  };
  P.level = function () {
    var L = pctx.L, un = [];
    D.ORDER.forEach(function (id) { var it = I[id]; if ((it.k === 'crop') && it.lvl === L) un.push(IMG(id, 'big')); });
    [['fac', D.FACTS], ['pen', D.PENS], ['house', D.HOUSES], ['comm', D.COMM], ['deco', D.DECOS]].forEach(function (p) { for (var k in p[1]) if (p[1][k].lvl === L) un.push(thumb(p[0], k)); });
    return '<div class="center"><div class="lvbig">' + IMG('star', 'huge') + '<b>' + L + '</b></div><p>You reached level ' + L + '!</p><p>' + IMG('coin', 'sm') + pctx.coins + '  ' + IMG('gem', 'sm') + pctx.gems + '</p>' + (un.length ? '<p class="dim">New this level</p><div class="unl">' + un.join('') + '</div>' : '') + '<button class="btn" data-act="close">Wonderful</button></div>';
  };
  P.help = function () {
    return '<div class="help"><p>' + IMG('wheat', 'sm') + ' <b>Fields.</b> Tap an empty field to plant, then swipe across others. Crops keep growing while the app is closed.</p><p>' + IMG('chickenfeed', 'sm') + ' <b>Production.</b> Factories turn crops into goods. Queue up to three jobs, and tap the building when a bubble appears.</p><p>' + IMG('egg', 'sm') + ' <b>Animals.</b> Feed them from the Feed Mill, then collect.</p><p>' + IMG('clip', 'sm') + ' <b>Order board.</b> Fill orders for coins and XP. Skip one you do not like.</p><p>' + IMG('truck', 'sm') + ' <b>Freight truck.</b> From level 4, pack crates for building materials.</p><p>' + IMG('person', 'sm') + ' <b>Town.</b> Homes add residents. Bigger factories need more residents. Town buildings raise the resident limit.</p><p>' + IMG('shovel', 'sm') + ' <b>Land.</b> Tap a signpost to clear new land.</p><p>' + IMG('gem', 'sm') + ' <b>Gems</b> come from levels, orders and gifts. They finish timers instantly. No purchases, ever.</p><p class="dim">Pinch to zoom, drag to look around.</p></div>';
  };
  P.welcome = function () { return '<div class="center">' + IMG('leaf', 'huge') + '<p>Welcome to <b>Sunpatch Valley</b>!</p><p>Your little farm is waiting. Harvest the ripe wheat, fill orders on the board, and grow a farm into a bustling town.</p><button class="btn" data-act="close">Let\'s go</button></div>'; };
  var TITLES = { board: 'Order Board', depot: 'Freight Truck', barn: 'Barn', shop: 'Build', expand: 'New land', daily: 'Daily gift', level: 'Level up!', help: 'How to play', welcome: 'Sunpatch Valley', build: 'Construction' };
  function renderPanel() {
    if (!panel) return; var b = $('#sheetBody'), st = b.scrollTop;
    $('#sheetTitle').textContent = pctx.o ? (pctx.o.t === 'field' ? 'Field' : def(pctx.o).n) : TITLES[panel] || '';
    b.innerHTML = P[panel](); b.scrollTop = st; hud();
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act],[data-go]'); if (!el) return;
    if (el.dataset.go) { var gname = el.dataset.go; if (gname === 'shop') open('shop', { tab: 'farm' }); else if (gname === 'board') open('board'); else if (gname === 'depot') { if (truckOn()) open('depot'); else toast('The freight truck arrives at level ' + D.SPECIAL.depot.lvl); } else open(gname); return; }
    var a = el.dataset.act, i = +el.dataset.i, o = pctx.o;
    switch (a) {
      case 'close': closePanel(); break;
      case 'seed': if (I[el.dataset.id].lvl > S.lvl) { toast('Unlocks at level ' + I[el.dataset.id].lvl); break; } lastCropId = el.dataset.id; tool.crop = el.dataset.id; renderTray(); break;
      case 'tooloff': setTool(null); break;
      case 'make': facAdd(o, def(o).recipes[i]); hud(); break;
      case 'collect': facCollect(o); renderPanel(); break;
      case 'facspeed': facSpeed(o); break;
      case 'slot': if (spend(0, o.slots * 2)) { o.slots++; save(); renderPanel(); } break;
      case 'feed': penCollect(o); penFeed(o); save(); renderPanel(); break;
      case 'penspeed': penSpeed(o); break;
      case 'buyanimal': if (spend(D.PENS[o.k].cost / 2)) { o.a.push(0); save(); renderPanel(); } break;
      case 'deliver': deliver(i); break;
      case 'discard': discard(i); break;
      case 'skipwait': if (spend(0, 1)) { S.orders[i] = genOrder(); save(); renderPanel(); } break;
      case 'crate': fillCrate(i); break;
      case 'sendtruck': sendTruck(); break;
      case 'truckspeed': if (spend(0, gemCost(S.truck.away - now()))) { S.truck.away = now(); tick(); renderPanel(); } break;
      case 'btab': case 'stab': pctx.tab = el.dataset.t; renderPanel(); $('#sheetBody').scrollTop = 0; break;
      case 'barnup': barnUpgrade(); break;
      case 'sell': sell(el.dataset.id, 1); break;
      case 'buildspeed': speedBuild(o); break;
      case 'fieldspeed': if (spend(0, gemCost(o.end - now()))) { o.end = now(); save(); closePanel(); } break;
      case 'move': moveObj(o); break;
      case 'store': S.objs.splice(S.objs.indexOf(o), 1); reocc(); S.coins += Math.round((def(o).cost || 0) / 2); save(); closePanel(); break;
      case 'buy': startPlace(el.dataset.t, el.dataset.k); break;
      case 'expand': expand(pctx.zi); break;
      case 'claim': claimDaily(); break;
    }
    hud();
  });
  $('#shade').addEventListener('click', closePanel); $('#sheetX').addEventListener('click', closePanel);
  $('#pOk').addEventListener('click', confirmPlace); $('#pNo').addEventListener('click', cancelPlace);

  // ================= hud / tick =================
  function setTxt(sel, v) { var e = $(sel); if (e && e.textContent !== v) e.textContent = v; }
  function hud() {
    setTxt('#lvl', String(S.lvl)); $('#xpbar i').style.width = Math.min(100, S.xp / xpNeed(S.lvl) * 100) + '%'; setTxt('#xptxt', fmt(S.xp) + '/' + fmt(xpNeed(S.lvl)));
    setTxt('#coins', fmt(S.coins)); setTxt('#gems', fmt(S.gems)); setTxt('#pop', fmt(pop()) + '/' + fmt(cap())); setTxt('#barnc', fmt(barnUsed()) + '/' + fmt(barnCap()));
    $('#bDaily').classList.toggle('pulse', dailyReady()); $('#bOrders').classList.toggle('pulse', S.orders.some(function (od) { return od.items && canFill(od); }));
    $('#bTruck').classList.toggle('off', !truckOn());
  }
  function tick() {
    var t = now(), ch = false;
    while (S.orders.length < boardSlots()) { S.orders.push(genOrder()); ch = true; }
    S.orders.forEach(function (od, i) { if (!od.items && od.wait <= t) { S.orders[i] = genOrder(); ch = true; } });
    if (truckOn()) { if (!S.truck) { S.truck = { away: 0, crates: genCrates() }; ch = true; } else if (S.truck.away && S.truck.away <= t) { S.truck = { away: 0, crates: genCrates() }; ch = true; toast(IMG('truck', 'tiny') + ' The freight truck is back'); } }
    S.objs.forEach(function (o) { if (o.done && o.done <= t && !o.bn) { o.bn = 1; ch = true; onBuilt(o); } });
    var expired = false; document.querySelectorAll('[data-end]').forEach(function (el) { var e = +el.dataset.end - t; if (e <= 0) expired = true; else el.textContent = ftime(e); });
    if (expired || (ch && panel)) renderPanel();
    if (ch) save(); hud();
  }
  function frame() { try { render(); } catch (e) { console.error(e); } requestAnimationFrame(frame); }

  // ================= boot =================
  document.querySelectorAll('[data-icon]').forEach(function (el) { el.insertAdjacentHTML('afterbegin', IMG(el.dataset.icon)); });
  load(); S.objs.forEach(function (o) { if (o.done && o.done <= now()) o.bn = 1; });
  resize(); addEventListener('resize', resize); addEventListener('orientationchange', function () { setTimeout(resize, 200); });
  var hall = S.objs.find(function (o) { return o.k === 'board'; }) || S.objs[0], hp = A.iso(19.5, 17.5); cam.x = hp[0]; cam.y = hp[1]; cam.z = clamp(Math.min(innerWidth / 560, innerHeight / 420), 0.6, 1.25);
  tick(); setInterval(tick, 1000); requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', function () { if (document.hidden) save(true); else tick(); }); addEventListener('pagehide', function () { save(true); });
  if (!S.tips.welcome) { S.tips.welcome = 1; save(); open('welcome'); }
  window.__farm = { S: function () { return S; }, save: save, tap: tap, hit: hit, open: open, close: closePanel, tick: tick, toScreen: function (o) { var p = A.iso(o.x + o.w / 2, o.y + o.h / 2); return toScreen(p[0], p[1]); }, cam: cam, addXP: addXP, fmt: fmt, setTool: setTool, startPlace: startPlace, confirmPlace: confirmPlace, find: function (t, k) { return S.objs.find(function (o) { return o.t === t && (!k || o.k === k); }); }, panel: function () { return panel; } };
})();
