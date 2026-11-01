/* Pixel Pop! - ad-free color by number. All data stays on device (localStorage). */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { hexRgb, lum } = PixArt;

  // ---------- storage ----------
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('Storage is full 😕'); return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const settings = Object.assign({ sound: true, gentle: true, helpers: true, nums: false }, LS.get('kc_settings', {}));
  const saveSettings = () => LS.set('kc_settings', settings);

  // ---------- profiles (v2) ----------
  const APP_VERSION = 'v2';
  const AVATARS = ['🐯', '🦖', '🦄', '🐱', '🐶', '🦊', '🐼', '🐸', '👾', '🚀', '⚽', '🏎️', '🐙', '🦁', '🐧', '🌈', '⚡', '🐉'];
  const PCOLORS = ['#3a86ff', '#22c58b', '#ff4fa3', '#7b2ff7', '#ff8c1a', '#e63946', '#e0b000', '#16a3ad'];
  const GRADES = { K: [1, 3, 'Kindergarten (age 5)'], 1: [2, 4, '1st grade (age 6)'], 2: [3, 6, '2nd grade (age 7)'], 3: [4, 7, '3rd grade (age 8)'], 4: [5, 8, '4th grade and up (age 9+)'] };
  const gradeRange = (g) => GRADES[g] || GRADES[3];
  function newProfile(id, name, avatar, color, grade, pace) {
    const g = gradeRange(grade);
    return { id, name, avatar, color, grade, pace, start: 'easy', unlockAll: false, mathOn: true, mathFreq: 1, mathLvl: grade === 'K' ? 1 : g[0] + 1, mathStreak: 0, mathMiss: 0, mathCount: 0, mathDue: false, xp: 0, stars: 0 };
  }
  let meta = LS.get('kc2_meta', null);
  function saveMeta() { LS.set('kc2_meta', meta); }
  // HUB_PATCH: inside Game Hub each hub profile gets its own storage, so seed one player from the hub profile
  const HUB = window.HubSave && HubSave.inHub ? (HubSave.profile || { name: 'Me' }) : null;
  if (HUB) {
    const age = +HUB.age || 0, grade = !age ? '4' : age <= 5 ? 'K' : age >= 9 ? '4' : String(age - 5);
    if (!meta || !meta.profiles || !meta.profiles.length) {
      meta = { v: 2, profiles: [newProfile('me', HUB.name || 'Me', HUB.avatar || '🐯', HUB.color || '#3a86ff', grade, age && age <= 6 ? 'gentle' : 'normal')], active: 'me', pinHash: null, lockSettings: true, pinAsked: true, migrated: false, hub: true };
      saveMeta();
    } else if (meta.hub) {
      const P = meta.profiles.find((q) => q.id === 'me');
      if (P) { P.name = HUB.name || P.name; P.avatar = HUB.avatar || P.avatar; P.color = HUB.color || P.color; saveMeta(); }
    }
  }
  if (!meta || !meta.profiles || !meta.profiles.length) {
    meta = { v: 2, profiles: [newProfile('eli', 'Eli', '🐯', '#3a86ff', '3', 'normal'), newProfile('archer', 'Archer', '🦖', '#22c58b', 'K', 'gentle')], active: 'eli', pinHash: null, lockSettings: true, pinAsked: false, migrated: false };
    // move any v1 progress into the first profile (Eli). The v1 keys are left in place as a backup.
    const keys = []; try { for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)); } catch (e) {}
    const old = keys.filter((k) => /^kc_(stats|custom|draw|stickers|p_.+)$/.test(k));
    old.forEach((k) => { try { localStorage.setItem('kc2_eli_' + k.slice(3), localStorage.getItem(k)); } catch (e) {} });
    meta.migrated = old.length ? { at: Date.now(), keys: old.length, xp: false } : false;
    saveMeta();
  }
  const prof = () => meta.profiles.find((p) => p.id === meta.active) || meta.profiles[0];
  const pk = (k, pid) => 'kc2_' + (pid || prof().id) + '_' + k;
  let stats;
  function loadStats() { stats = Object.assign({ completed: [], daily: [], photos: 0, draws: 0, hard: 0, mine: 0, math: 0 }, LS.get(pk('stats'), {})); }
  loadStats();
  const saveStats = () => LS.set(pk('stats'), stats);

  // ---------- catalog ----------
  const CATS = [
    ['kstars', '🌟 K-Pop Stars'], ['people', '🧑 People'], ['kpop', '🎤 K-Pop Hunters'], ['blocky', '⛏️ Blocky World'], ['monsters', '👾 Monsters'], ['cars', '🏎️ Cars'], ['animals', '🐯 Animals'], ['dinos', '🦖 Dinos'], ['sports', '⚽ Sports'], ['holidays', '🎃 Holidays'],
    ['fantasy', '🐉 Fantasy'], ['space', '🚀 Space'], ['ocean', '🐙 Ocean'], ['food', '🍕 Food'], ['vehicles', '🚒 Vehicles'], ['mine', '📸 My Pictures'],
  ];
  const CATNAME = Object.fromEntries(CATS);
  // featured pack covers shown above the chips (newest packs)
  const PACKS = [
    { cat: 'kstars', title: 'K-Pop Stars', sub: 'Sing, dance & sparkle!', cover: ['ks-pink', 'ks-stick', 'ks-blue'], bg: 'linear-gradient(135deg,#ff7ac6,#8b3ff7 70%,#3a1f8f)' },
    { cat: 'people', title: 'People', sub: 'Heroes, friends & family', cover: ['pp-fire', 'pp-astro', 'pp-princess'], bg: 'linear-gradient(135deg,#ffd23f,#ff8c1a 55%,#ff5a5a)' },
  ];
  const builtins = PICS.map((d) => PixArt.compile(d));
  const byId = new Map(builtins.map((p) => [p.id, p]));
  function loadCustom() {
    return LS.get(pk('custom'), []).map((c) => {
      const cells = new Int16Array(c.N * c.N);
      for (let k = 0; k < cells.length; k++) { const ch = c.cells.charCodeAt(k); cells[k] = ch === 46 ? -1 : ch - 97; }
      let total = 0; for (const v of cells) if (v >= 0) total++;
      return { id: c.id, name: c.name, cat: 'mine', N: c.N, pal: c.pal, cells, total, custom: true, made: c.made };
    });
  }
  let customs = loadCustom();
  customs.forEach((p) => byId.set(p.id, p));
  function saveCustomPuzzle(p) {
    const list = LS.get(pk('custom'), []);
    let s = ''; for (const v of p.cells) s += v < 0 ? '.' : String.fromCharCode(97 + v);
    list.unshift({ id: p.id, name: p.name, N: p.N, pal: p.pal, cells: s, made: Date.now() });
    if (!LS.set(pk('custom'), list)) return false;
    customs = loadCustom(); customs.forEach((q) => byId.set(q.id, q));
    return true;
  }
  const allPuzzles = () => customs.concat(builtins);
  // difficulty tiers: Easy = small grid with few colors, Medium = up to 32, Hard = bigger
  const tier = (p) => (p.N <= 20 && p.pal.length <= 10 ? 0 : p.N <= 32 ? 1 : 2);
  const TIERS = [['Easy', 'd-easy'], ['Medium', 'd-med'], ['Hard', 'd-hard']];
  const diff = (p) => TIERS[tier(p)];

  // ---------- levels + unlocks ----------
  const needFor = (L) => 30 + 20 * L; // points to go from level L to L+1
  function levelInfo(xp) { let L = 1, x = xp || 0; while (x >= needFor(L)) { x -= needFor(L); L++; } return { level: L, into: x, need: needFor(L) }; }
  const curLevel = (P0) => levelInfo((P0 || prof()).xp).level;
  function unlockLevels(P0) { // level needed for [Easy, Medium, Hard]
    if (P0.unlockAll || P0.start === 'hard') return [1, 1, 1];
    const g = P0.pace === 'gentle';
    if (P0.start === 'medium') return [1, 1, g ? 6 : 3];
    return [1, g ? 4 : 2, g ? 8 : 4];
  }
  const needLevel = (p, P0) => (p.custom ? 1 : unlockLevels(P0 || prof())[tier(p)]);
  const levelLocked = (p, P0) => curLevel(P0) < needLevel(p, P0);
  function isLocked(p) { return levelLocked(p) && !getProg(p.id); } // anything already started stays open
  function puzzlePoints(p, w, m) { const base = [10, 25, 50][tier(p)] + Math.round(p.total / 40); const clean = !w && !m; return { base, bonus: clean ? Math.round(base * 0.2) : 0, clean }; }
  let pendingLevel = null;
  function addXP(n) {
    const P0 = prof(), before = curLevel(P0); P0.xp = (P0.xp || 0) + n; saveMeta(); const after = curLevel(P0);
    if (after > before) pendingLevel = { from: pendingLevel ? pendingLevel.from : before, to: after };
  }
  // v1 progress that moved into Eli earns its points once, so Eli starts at a fair level
  if (meta.migrated && !meta.migrated.xp) {
    const eli = meta.profiles.find((p) => p.id === 'eli');
    if (eli) { const st = LS.get(pk('stats', 'eli'), { completed: [] }); (st.completed || []).forEach((id) => { const p = byId.get(id); if (p) eli.xp += puzzlePoints(p, 1, 1).base; }); }
    meta.migrated.xp = true; saveMeta();
  }

  // progress: s = string, char 48+v (0 unpainted, k+1 painted with color k), o = order of correct cells
  const progKey = (id) => pk('p_' + id);
  function getProg(id) { return LS.get(progKey(id), null); }
  function progPct(p, pr) {
    if (!pr) return 0; if (pr.d) return 100;
    let c = 0; for (let k = 0; k < p.cells.length; k++) if (p.cells[k] >= 0 && pr.s.charCodeAt(k) - 49 === p.cells[k]) c++;
    return Math.floor((c / p.total) * 100);
  }

  // ---------- colors ----------
  const grayCache = new Map();
  function grayOf(hex) { let g = grayCache.get(hex); if (!g) { const l = lum(hex); const v = Math.round(222 + (l / 255) * 30); g = `rgb(${v},${v},${v + 3})`; grayCache.set(hex, g); } return g; }
  function mixWhite(hex, a) { const [r, g, b] = hexRgb(hex); const m = (c) => Math.round(c * a + 255 * (1 - a)); return `rgb(${m(r)},${m(g)},${m(b)})`; }
  const textOn = (hex) => (lum(hex) > 150 ? '#2b2b3a' : '#ffffff');

  // ---------- thumbnails ----------
  const thumbCache = new Map();
  function renderThumb(p, pr, scale) {
    const S = scale || Math.max(2, Math.ceil(144 / p.N));
    const c = document.createElement('canvas'); c.width = c.height = p.N * S;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    const done = pr && pr.d;
    for (let k = 0; k < p.cells.length; k++) {
      const v = p.cells[k]; if (v < 0) continue;
      const st = pr ? pr.s.charCodeAt(k) - 49 : -1;
      x.fillStyle = done || st === v ? p.pal[v] : pr ? grayOf(p.pal[v]) : mixWhite(p.pal[v], 0.45);
      x.fillRect((k % p.N) * S, Math.floor(k / p.N) * S, S, S);
    }
    return c;
  }
  const coverCache = new Map();
  function coverURL(p) { let u = coverCache.get(p.id); if (!u) { u = renderThumb(p, { d: 1, s: '' }).toDataURL(); coverCache.set(p.id, u); } return u; }
  function thumbURL(p) {
    const pr = getProg(p.id); const key = p.id + ':' + (pr ? pr.t : 0);
    let u = thumbCache.get(key); if (!u) { u = renderThumb(p, pr).toDataURL(); thumbCache.set(key, u); }
    return u;
  }
  function fullImage(p, S) {
    const c = document.createElement('canvas'); c.width = c.height = p.N * S; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    for (let k = 0; k < p.cells.length; k++) { const v = p.cells[k]; if (v < 0) continue; x.fillStyle = p.pal[v]; x.fillRect((k % p.N) * S, Math.floor(k / p.N) * S, S, S); }
    return c;
  }

  // ---------- sound (synthesized, no files) ----------
  let AC = null, lastPop = 0;
  function audio() {
    if (!settings.sound) return null;
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(f, dur, type, vol, when, f2) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + (when || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const SND = {
    pop() { const n = performance.now(); if (n - lastPop < 45) return; lastPop = n; tone(520 + Math.random() * 380, 0.08, 'sine', 0.1, 0, 900); },
    oops() { tone(220, 0.14, 'triangle', 0.07, 0, 160); },
    tap() { tone(660, 0.05, 'sine', 0.06); },
    chime() { tone(880, 0.14, 'triangle', 0.12); tone(1320, 0.22, 'triangle', 0.12, 0.1); },
    win() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.25, 'triangle', 0.13, i * 0.11)); [523, 659, 784].forEach((f) => tone(f, 0.9, 'sine', 0.07, 0.75)); },
    sticker() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.16, 'square', 0.04, i * 0.07)); },
  };
  function applySound() { document.body.classList.toggle('mute', !settings.sound); }

  // ---------- toast / modal ----------
  let toastT;
  function toast(msg) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); }
  function modal(html, onClose) {
    $('#mbox').innerHTML = html; $('#modal').classList.remove('hidden'); modal.onClose = onClose;
    return $('#mbox');
  }
  function closeModal() { $('#modal').classList.add('hidden'); $('#mbox').innerHTML = ''; stopReplay(); if (modal.onClose) { const f = modal.onClose; modal.onClose = null; f(); } }
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

  // ---------- confetti ----------
  function confetti() {
    const c = $('#confetti'), x = c.getContext('2d'), dpr = devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; x.scale(dpr, dpr);
    const cols = ['#ff4fa3', '#7b2ff7', '#3df5ff', '#ffd23f', '#22c58b', '#ff8c1a', '#3a86ff'];
    const P = Array.from({ length: 180 }, () => ({ x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.45, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 18 - 6, s: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0], sq: Math.random() < 0.5 }));
    const t0 = performance.now();
    (function f(now) {
      x.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of P) { p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; if (p.sq) x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); else { x.beginPath(); x.arc(0, 0, p.s / 2.4, 0, 7); x.fill(); } x.restore(); }
      if (now - t0 < 4200) requestAnimationFrame(f); else x.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }

  // ---------- navigation ----------
  let current = 'home', parentFrom = 'who';
  function show(name) {
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 's-' + name));
    $$('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.nav === name));
    document.body.classList.toggle('playing', name === 'play');
    document.body.classList.toggle('parenting', name === 'parent' || name === 'who');
    if (name === 'parent' && current !== 'parent') parentFrom = current === 'play' ? 'home' : current;
    current = name;
    if (name === 'who') renderWho();
    if (name === 'home') renderLibrary();
    if (name === 'work') renderWork();
    if (name === 'stickers') renderStickers();
    if (name === 'parent') renderParent();
    if (name === 'draw') Draw.open();
    if (name === 'play') requestAnimationFrame(() => Play.resize());
  }
  $('#nav').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { SND.tap(); show(b.dataset.nav); } });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'sound') { settings.sound = !settings.sound; saveSettings(); applySound(); SND.tap(); }
    if (a === 'parent') parentGate();
    if (a === 'who') { SND.tap(); Play.save(); show('who'); }
    if (a === 'home') show('home');
    if (a === 'pback') show(parentFrom || 'who');
    if (a === 'back') { Play.save(); show(Play.from || 'home'); }
    if (a === 'draw-new') Draw.newPrompt();
    if (a === 'draw-save') Draw.save();
  });

  // ---------- library ----------
  let libCat = 'all';
  function dayIndex() { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); }
  function todayStr() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function dailyPuzzle() { const pool = builtins.filter((p) => !levelLocked(p)); const L = pool.length ? pool : builtins; return L[(dayIndex() * 7919) % L.length]; }
  function card(p, extra) {
    const pr = getProg(p.id), pct = progPct(p, pr), [dl, dc] = diff(p);
    if (isLocked(p)) return `<button class="pcard locked" data-id="${p.id}" data-lock="${needLevel(p)}"><img alt="" src="${thumbURL(p)}"><span class="badge ${dc}">${dl}</span><div class="lockov"><span>🔒</span><b>Reach level ${needLevel(p)}</b></div><div class="nm">${esc(p.name)}</div></button>`;
    return `<button class="pcard" data-id="${p.id}"><img alt="" src="${thumbURL(p)}"><span class="badge ${dc}">${dl}</span>${pr && pr.d ? '<span class="ok">✓</span>' : ''}<div class="nm">${esc(p.name)}</div>${pct > 0 && pct < 100 ? `<div class="pp"><i style="width:${pct}%"></i></div>` : ''}${extra || ''}</button>`;
  }
  function levelBar() {
    const P0 = prof(), li = levelInfo(P0.xp), [ue, um, uh] = unlockLevels(P0);
    const nextU = um > li.level ? `Medium pictures at level ${um}` : uh > li.level ? `Hard pictures at level ${uh}` : 'Every picture is unlocked!';
    return `<div class="lvl" style="--pc:${P0.color}"><button class="who" data-act="who" aria-label="Switch player"><span class="av" style="background:${P0.color}">${P0.avatar}</span><span class="wn">${esc(P0.name)}</span><small>🔄 Switch</small></button>
      <div class="lvlmain"><div class="lvltop"><b class="lvn">Level ${li.level}</b><span class="stars">⭐ ${P0.stars || 0}</span><span class="pts">${li.into} / ${li.need} points</span></div>
      <div class="lvlbar"><i style="width:${Math.max(3, Math.round((li.into / li.need) * 100))}%"></i></div><div class="lvlnext">🔓 ${nextU}${P0.mathDue && P0.mathOn ? ' · 🧠 Math break waiting!' : ''}</div></div></div>`;
  }
  function renderWho() {
    $('#who-list').innerHTML = meta.profiles.map((P0) => { const li = levelInfo(P0.xp); return `<button class="whocard" data-pid="${P0.id}" style="--pc:${P0.color}"><span class="wav" style="background:${P0.color}">${P0.avatar}</span><span class="wname">${esc(P0.name)}</span><span class="wlvl">Level ${li.level} · ⭐ ${P0.stars || 0}</span><span class="lvlbar"><i style="width:${Math.max(3, Math.round((li.into / li.need) * 100))}%"></i></span></button>`; }).join('');
  }
  $('#who-list').addEventListener('click', (e) => { const b = e.target.closest('[data-pid]'); if (!b) return; SND.chime(); switchProfile(b.dataset.pid); });
  function switchProfile(id) {
    if (!meta.profiles.some((p) => p.id === id)) return;
    try { Play.save(); } catch (e) {}
    customs.forEach((p) => byId.delete(p.id));
    meta.active = id; saveMeta(); loadStats(); customs = loadCustom(); customs.forEach((p) => byId.set(p.id, p));
    thumbCache.clear(); Draw.reset(); libCat = 'all'; workTab = 'prog'; applyTheme(); show('home');
    const sc = $('#s-home .scroll'); if (sc) sc.scrollTop = 0;
  }
  function applyTheme() { document.documentElement.style.setProperty('--pc', prof().color); }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function renderLibrary() {
    $('#lvl-home').innerHTML = levelBar();
    const dp = dailyPuzzle(), dpr = getProg(dp.id);
    $('#daily').innerHTML = `<img alt="" src="${thumbURL(dp)}"><div style="flex:1"><div class="dt">⭐ Today's Picture</div><div class="dn">${esc(dp.name)}</div><button class="bigbtn small pink" data-id="${dp.id}" data-daily="1">${dpr && dpr.d ? '✅ Done! View' : dpr ? '▶️ Keep going' : '▶️ Play'}</button></div>`;
    $('#packs').innerHTML = libCat === 'all' ? PACKS.map((k) => { const n = builtins.filter((p) => p.cat === k.cat).length; return `<button class="pack" data-cat="${k.cat}" style="background:${k.bg}"><span class="pnew">NEW</span><span class="pimgs">${k.cover.map((id) => byId.get(id)).filter(Boolean).map((p) => `<img alt="" src="${coverURL(p)}">`).join('')}</span><span class="ptxt"><b>${esc(k.title)}</b><small>${esc(k.sub)} · ${n} pictures</small></span></button>`; }).join('') : '';
    $('#chips').innerHTML = [['all', '🌈 All']].concat(CATS).map(([k, n]) => `<button class="chip ${libCat === k ? 'on' : ''}" data-cat="${k}">${n}</button>`).join('');
    let list = libCat === 'all' ? CATS.flatMap(([k]) => allPuzzles().filter((p) => p.cat === k)) : allPuzzles().filter((p) => p.cat === libCat);
    list = list.filter((p) => !isLocked(p)).concat(list.filter((p) => isLocked(p)).sort((a, b) => needLevel(a) - needLevel(b)));
    $('#lib').innerHTML = list.length ? list.map((p) => card(p)).join('') : `<div class="empty">No pictures here yet!<br><br><button class="bigbtn grape" data-gonav="photo">📸 Make one from a photo</button></div>`;
  }
  $('#packs').addEventListener('click', (e) => { const b = e.target.closest('.pack'); if (!b) return; SND.tap(); libCat = b.dataset.cat; renderLibrary(); $('#s-home .scroll').scrollTop = 0; });
  $('#chips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; SND.tap(); libCat = b.dataset.cat; renderLibrary(); $('#s-home .scroll').scrollTop = 0; });
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-gonav]'); if (g) { show(g.dataset.gonav); return; }
    const b = e.target.closest('[data-id]'); if (!b || b.closest('#s-parent')) return;
    const p = byId.get(b.dataset.id); if (!p) return;
    if (current !== 'play' && isLocked(p)) { SND.oops(); toast(`🔒 Reach level ${needLevel(p)} to unlock this one! Keep coloring 🎨`); return; }
    SND.tap();
    const pr = getProg(p.id);
    if (pr && pr.d && current !== 'play') finishedViewer(p); else Play.open(p, current, !!b.dataset.daily);
  });

  // ---------- my work ----------
  let workTab = 'prog';
  $('#workseg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; workTab = b.dataset.w; $$('#workseg button').forEach((x) => x.classList.toggle('on', x === b)); renderWork(); });
  function renderWork() {
    $$('#workseg button').forEach((x) => x.classList.toggle('on', x.dataset.w === workTab));
    $('#lvl-work').innerHTML = levelBar();
    const el = $('#work');
    if (workTab === 'draw') {
      const ds = LS.get(pk('draw'), []);
      el.innerHTML = ds.length ? ds.map((d) => `<button class="pcard" data-draw="${d.id}"><img alt="" src="${Draw.thumb(d)}"><div class="nm">${esc(d.name)}</div></button>`).join('') : `<div class="empty">No drawings yet.<br><br><button class="bigbtn grape" data-gonav="draw">🖍️ Start drawing</button></div>`;
      return;
    }
    const items = allPuzzles().map((p) => ({ p, pr: getProg(p.id) })).filter(({ pr }) => pr && (workTab === 'done' ? pr.d : !pr.d)).sort((a, b) => b.pr.t - a.pr.t);
    el.innerHTML = items.length ? items.map(({ p }) => card(p)).join('') : `<div class="empty">${workTab === 'done' ? 'Finish a picture and it will show up here! 🌟' : 'Pick a picture to start coloring! 🎨'}<br><br><button class="bigbtn grape" data-gonav="home">🎨 Pictures</button></div>`;
  }
  $('#work').addEventListener('click', (e) => { const b = e.target.closest('[data-draw]'); if (b) { Draw.load(b.dataset.draw); show('draw'); } });

  // ---------- finished viewer / replay ----------
  let replayRAF = 0;
  function stopReplay() { cancelAnimationFrame(replayRAF); replayRAF = 0; }
  function replay(p, order, canvas) {
    stopReplay();
    const S = Math.max(4, Math.floor(480 / p.N)); canvas.width = canvas.height = p.N * S; const x = canvas.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, canvas.width, canvas.height);
    for (let k = 0; k < p.cells.length; k++) { const v = p.cells[k]; if (v >= 0) { x.fillStyle = grayOf(p.pal[v]); x.fillRect((k % p.N) * S, ((k / p.N) | 0) * S, S, S); } }
    const seen = new Set(order); const seq = order.slice(); for (let k = 0; k < p.cells.length; k++) if (p.cells[k] >= 0 && !seen.has(k)) seq.push(k);
    const dur = Math.min(6000, Math.max(2500, seq.length * 6)); const t0 = performance.now(); let i = 0;
    (function f(now) {
      const upto = Math.min(seq.length, Math.ceil(((now - t0) / dur) * seq.length));
      for (; i < upto; i++) { const k = seq[i]; x.fillStyle = p.pal[p.cells[k]]; x.fillRect((k % p.N) * S, ((k / p.N) | 0) * S, S, S); }
      if (i < seq.length) replayRAF = requestAnimationFrame(f); else { replayRAF = 0; SND.chime(); }
    })(t0);
  }
  // after a celebration: level-up party first, then the math break (if due), then whatever comes next
  function afterCelebrate(next) {
    if (pendingLevel) { const lv = pendingLevel; pendingLevel = null; return levelUpModal(lv, () => afterCelebrate(next)); }
    const P0 = prof();
    if (P0.mathOn && P0.mathDue) return MathBreak.show(() => { if (next) next(); }, null);
    if (next) next();
  }
  function levelUpModal(lv, then) {
    const P0 = prof(); const fresh = builtins.filter((p) => { const n = needLevel(p, P0); return n > lv.from && n <= lv.to; }).length;
    SND.win(); confetti();
    const box = modal(`<div class="levelup"><div class="lvbig" style="background:${P0.color}">${P0.avatar}</div><h2>⬆️ Level ${lv.to}! ⬆️</h2>
      <p class="lvmsg">Way to go, ${esc(P0.name)}! You're a Level ${lv.to} artist!</p>
      ${fresh ? `<p class="lvnew">🔓 ${fresh} new picture${fresh === 1 ? '' : 's'} unlocked!</p>` : '<p class="lvnew">🌟 Keep coloring to unlock more!</p>'}
      <button class="bigbtn mint" data-m="ok">🎉 Yay!</button></div>`, then);
    box.onclick = (e) => { if (e.target.closest('[data-m="ok"]')) closeModal(); };
  }
  function finishedViewer(p, newStickers, earned) {
    const pr = getProg(p.id) || { o: [] };
    const box = modal(`<h2>${newStickers ? '🎉 You did it! 🎉' : esc(p.name)}</h2><canvas class="final"></canvas>
      ${earned ? `<div class="earned">+${earned.base} points${earned.bonus ? ` <span class="bonus">✨ +${earned.bonus} no-mistake bonus!</span>` : ''}</div>` : ''}
      ${newStickers && newStickers.length ? newStickers.map((s) => `<div class="newst">New sticker! <span>${s.e}</span> ${s.t}</div>`).join('') : ''}
      <div class="btns"><button class="bigbtn small grape" data-m="replay">▶️ Replay</button><button class="bigbtn small mint" data-m="share">📤 Save to Photos</button>
      ${newStickers ? '<button class="bigbtn small pink" data-m="next">🎲 Next picture</button>' : '<button class="bigbtn small sun" data-m="again">🔁 Color again</button>'}<button class="bigbtn small ghost" data-m="close">🏠 Done</button></div>`);
    const cv = $('canvas.final', box);
    const still = fullImage(p, Math.max(4, Math.floor(480 / p.N))); cv.width = still.width; cv.height = still.height; cv.getContext('2d').drawImage(still, 0, 0);
    if (newStickers) setTimeout(() => replay(p, pr.o || [], cv), 600);
    let then = null;
    if (newStickers) modal.onClose = () => afterCelebrate(then);
    box.onclick = (e) => {
      const m = e.target.closest('[data-m]'); if (!m) return; const a = m.dataset.m;
      if (a === 'replay') replay(p, pr.o || [], cv);
      if (a === 'share') shareCanvas(fullImage(p, Math.max(8, Math.floor(1024 / p.N))), p.name);
      if (a === 'again') { LS.del(progKey(p.id)); thumbCache.clear(); const from = current; if (newStickers) { then = () => Play.open(p, from); closeModal(); } else { closeModal(); Play.open(p, from); } }
      if (a === 'next') { const open = builtins.filter((q) => !levelLocked(q)); const pool = open.filter((q) => !(getProg(q.id) || {}).d); const L = pool.length ? pool : open; const q = L[(Math.random() * L.length) | 0]; then = () => Play.open(q, Play.from); closeModal(); }
      if (a === 'close') { closeModal(); }
    };
  }
  async function shareCanvas(c, name) {
    const fname = (name || 'picture').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') + '.png';
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    try {
      const file = new File([blob], fname, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // ---------- stickers ----------
  const STICKERS = [
    { id: 'first', e: '🎨', t: 'First Picture', h: 'Finish 1 picture', ok: () => stats.completed.length >= 1 },
    { id: 'five', e: '⭐', t: 'Super Star', h: 'Finish 5 pictures', ok: () => stats.completed.length >= 5 },
    { id: 'ten', e: '🏆', t: 'Champion', h: 'Finish 10 pictures', ok: () => stats.completed.length >= 10 },
    { id: 'tf', e: '👑', t: 'Color King', h: 'Finish 25 pictures', ok: () => stats.completed.length >= 25 },
    { id: 'fifty', e: '💎', t: 'Legend', h: 'Finish 50 pictures', ok: () => stats.completed.length >= 50 },
    { id: 'c-kstars', e: '🌟', t: 'Pop Idol', h: 'Finish a K-Pop Stars picture', ok: () => catDone('kstars') },
    { id: 'c-people', e: '🧑‍🚀', t: 'People Pal', h: 'Finish a People picture', ok: () => catDone('people') },
    { id: 'c-kpop', e: '🎤', t: 'Idol Hunter', h: 'Finish a K-Pop picture', ok: () => catDone('kpop') },
    { id: 'c-blocky', e: '⛏️', t: 'Block Builder', h: 'Finish a Blocky picture', ok: () => catDone('blocky') },
    { id: 'c-animals', e: '🐯', t: 'Animal Friend', h: 'Finish an Animal', ok: () => catDone('animals') },
    { id: 'c-holidays', e: '🎃', t: 'Spooky Fun', h: 'Finish a Holiday picture', ok: () => catDone('holidays') },
    { id: 'c-fantasy', e: '🐉', t: 'Dragon Rider', h: 'Finish a Fantasy picture', ok: () => catDone('fantasy') },
    { id: 'c-space', e: '🚀', t: 'Astronaut', h: 'Finish a Space picture', ok: () => catDone('space') },
    { id: 'c-ocean', e: '🐙', t: 'Deep Diver', h: 'Finish an Ocean picture', ok: () => catDone('ocean') },
    { id: 'c-food', e: '🍕', t: 'Yum Yum', h: 'Finish a Food picture', ok: () => catDone('food') },
    { id: 'c-vehicles', e: '🚒', t: 'Fast Driver', h: 'Finish a Vehicle', ok: () => catDone('vehicles') },
    { id: 'c-cars', e: '🏎️', t: 'Speed Racer', h: 'Finish a Car picture', ok: () => catDone('cars') },
    { id: 'c-monsters', e: '👾', t: 'Monster Buddy', h: 'Finish a Monster', ok: () => catDone('monsters') },
    { id: 'c-sports', e: '⚽', t: 'Sports Star', h: 'Finish a Sports picture', ok: () => catDone('sports') },
    { id: 'c-dinos', e: '🦖', t: 'Dino Explorer', h: 'Finish a Dino', ok: () => catDone('dinos') },
    { id: 'math1', e: '🧠', t: 'Brain Power', h: 'Solve a math break', ok: () => stats.math >= 1 },
    { id: 'math10', e: '🧮', t: 'Math Whiz', h: 'Solve 10 math breaks', ok: () => stats.math >= 10 },
    { id: 'lvl3', e: '🥉', t: 'Level 3', h: 'Reach level 3', ok: () => curLevel() >= 3 },
    { id: 'lvl5', e: '🥈', t: 'Level 5', h: 'Reach level 5', ok: () => curLevel() >= 5 },
    { id: 'lvl10', e: '🥇', t: 'Level 10', h: 'Reach level 10', ok: () => curLevel() >= 10 },
    { id: 'hard', e: '💪', t: 'Brave Artist', h: 'Finish a Hard picture', ok: () => stats.hard >= 1 },
    { id: 'daily', e: '📅', t: 'Daily Painter', h: "Finish Today's Picture", ok: () => stats.daily.length >= 1 },
    { id: 'daily3', e: '🔥', t: 'On Fire', h: "Finish 3 Today's Pictures", ok: () => stats.daily.length >= 3 },
    { id: 'photo', e: '📸', t: 'Photo Magic', h: 'Make a photo puzzle', ok: () => stats.photos >= 1 },
    { id: 'mine', e: '🖼️', t: 'My Masterpiece', h: 'Finish your own puzzle', ok: () => stats.mine >= 1 },
    { id: 'draw', e: '🖍️', t: 'Little Artist', h: 'Save a drawing', ok: () => stats.draws >= 1 },
  ];
  function catDone(cat) { return stats.completed.some((id) => { const p = byId.get(id); return p && p.cat === cat; }); }
  function checkStickers() {
    const got = LS.get(pk('stickers'), []); const fresh = STICKERS.filter((s) => !got.includes(s.id) && s.ok());
    if (fresh.length) { LS.set(pk('stickers'), got.concat(fresh.map((s) => s.id))); }
    return fresh;
  }
  function renderStickers() {
    const got = LS.get(pk('stickers'), []);
    $('#st-count').textContent = `You have ${got.length} of ${STICKERS.length} stickers!`;
    $('#stickers').innerHTML = STICKERS.map((s) => `<div class="stk ${got.includes(s.id) ? 'got' : 'lock'}"><div class="e">${s.e}</div><div class="t">${s.t}</div><div class="h">${s.h}</div></div>`).join('');
  }

  // ---------- parent lock (v2): 4-digit PIN, math question only until a PIN is set ----------
  // NOTE: this is a kid lock, not real security. The PIN is kept as a salted hash in localStorage.
  function fnv(str) { let h = 0x811c9dc5; for (let r = 0; r < 500; r++) for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i) + r; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); }
  const PIN_SALT = 'pixelpop-kidlock-v2:';
  async function hashPin(pin) {
    try { if (window.crypto && crypto.subtle) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(PIN_SALT + pin)); return 's:' + [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); } } catch (e) {}
    return 'f:' + fnv(PIN_SALT + pin);
  }
  async function checkPin(pin) { const h = meta.pinHash; if (!h) return false; if (h.startsWith('f:')) return h === 'f:' + fnv(PIN_SALT + pin); return (await hashPin(pin)) === h; }
  const needsPin = () => !!(meta.pinHash && meta.lockSettings);
  // grown-up check before settings / profile changes / deletes / resets
  function parentGate(next) {
    next = typeof next === 'function' ? next : () => show('parent');
    if (meta.pinHash) { if (meta.lockSettings) pinPrompt(next); else next(); return; }
    mathGate(next);
  }
  function keypadHTML(extra) { return `<div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((k) => `<button data-k="${k}">${k === 'C' ? '⌫' : k === 'OK' ? '✅' : k}</button>`).join('')}</div>${extra || ''}`; }
  function mathGate(next) {
    const a = 3 + ((Math.random() * 7) | 0), b = 4 + ((Math.random() * 6) | 0); let ans = '';
    const box = modal(`<h2>👋 Grown-ups only</h2><p style="font-size:20px">What is <b>${a} × ${b}</b>?</p><div class="gate-ans" id="ga">&nbsp;</div>
      ${keypadHTML()}<p class="note">Tip: set a 4-digit parent PIN in Grown-up Settings.</p><button class="bigbtn small ghost" data-k="X">Cancel</button>`);
    box.onclick = (e) => {
      const k = e.target.closest('[data-k]'); if (!k) return; const v = k.dataset.k;
      if (v === 'X') return closeModal();
      if (v === 'C') ans = ans.slice(0, -1); else if (v === 'OK') { if (+ans === a * b) { closeModal(); next(); return; } else { $('#ga').classList.add('shake'); setTimeout(() => $('#ga') && $('#ga').classList.remove('shake'), 400); ans = ''; } } else if (ans.length < 3) ans += v;
      const g = $('#ga'); if (g) g.innerHTML = ans || '&nbsp;';
    };
  }
  const dots = (n) => [0, 1, 2, 3].map((i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  function pinPrompt(next, title) {
    let ans = '', busy = false;
    const box = modal(`<div class="pinbox"><h2>🔒 ${title || 'Parent PIN'}</h2><p style="font-size:19px">Grown-ups: enter your 4-digit PIN</p><div class="pindots" id="pd">${dots(0)}</div>
      ${keypadHTML()}<div class="btns"><button class="bigbtn small ghost" data-k="F">🤔 Forgot PIN?</button><button class="bigbtn small ghost" data-k="X">Cancel</button></div></div>`);
    box.onclick = async (e) => {
      const k = e.target.closest('[data-k]'); if (!k || busy) return; const v = k.dataset.k;
      if (v === 'X') return closeModal();
      if (v === 'F') { closeModal(); return pinReset(); }
      if (v === 'C') ans = ans.slice(0, -1); else if (v !== 'OK' && ans.length < 4) ans += v;
      $('#pd').innerHTML = dots(ans.length);
      if (ans.length === 4) {
        busy = true; const ok = await checkPin(ans); busy = false;
        if (ok) { closeModal(); next(); } else { const d = $('#pd'); if (d) { d.classList.add('shake'); setTimeout(() => { if ($('#pd')) { d.classList.remove('shake'); d.innerHTML = dots(0); } }, 450); } ans = ''; toast('That PIN is not right'); }
      }
    };
  }
  function setPinFlow(done, first) {
    let ans = '', firstPin = null;
    const box = modal(`<div class="pinbox"><h2>🔐 ${first ? 'Hi grown-ups!' : 'Set a parent PIN'}</h2><p id="pmsg" style="font-size:19px">${first ? 'Pick a 4-digit PIN so kids can\'t change settings or delete pictures.' : 'Type a new 4-digit PIN'}</p>
      <div class="pindots" id="pd">${dots(0)}</div>${keypadHTML()}<button class="bigbtn small ghost" data-k="X">${first ? 'Later' : 'Cancel'}</button></div>`, () => { meta.pinAsked = true; saveMeta(); });
    box.onclick = async (e) => {
      const k = e.target.closest('[data-k]'); if (!k) return; const v = k.dataset.k;
      if (v === 'X') { closeModal(); if (done) done(false); return; }
      if (v === 'C') ans = ans.slice(0, -1); else if (v !== 'OK' && ans.length < 4) ans += v;
      $('#pd').innerHTML = dots(ans.length);
      if (ans.length === 4) {
        if (!firstPin) { firstPin = ans; ans = ''; $('#pmsg').textContent = 'Type the same PIN again'; setTimeout(() => $('#pd') && ($('#pd').innerHTML = dots(0)), 200); return; }
        if (ans !== firstPin) { firstPin = null; ans = ''; $('#pmsg').textContent = "Those didn't match. Type a new 4-digit PIN"; $('#pd').classList.add('shake'); setTimeout(() => $('#pd') && ($('#pd').innerHTML = dots(0)), 300); return; }
        meta.pinHash = await hashPin(ans); meta.lockSettings = true; meta.pinAsked = true; saveMeta();
        modal.onClose = null; closeModal(); SND.chime(); toast('Parent PIN saved 🔒'); if (done) done(true);
      }
    };
  }
  function pinReset() {
    const a = 12 + ((Math.random() * 8) | 0), b = 13 + ((Math.random() * 7) | 0), c = 10 + ((Math.random() * 40) | 0); let ans = '';
    const box = modal(`<h2>🧑 Grown-up question</h2><p style="font-size:20px">To reset the PIN, solve: <b>${a} × ${b} + ${c}</b></p><div class="gate-ans" id="ga">&nbsp;</div>
      ${keypadHTML()}<button class="bigbtn small ghost" data-k="X">Cancel</button>`);
    box.onclick = (e) => {
      const k = e.target.closest('[data-k]'); if (!k) return; const v = k.dataset.k;
      if (v === 'X') return closeModal();
      if (v === 'C') ans = ans.slice(0, -1); else if (v === 'OK') {
        if (+ans === a * b + c) { closeModal(); return confirmPinReset(); }
        $('#ga').classList.add('shake'); setTimeout(() => $('#ga') && $('#ga').classList.remove('shake'), 400); ans = '';
      } else if (ans.length < 4) ans += v;
      const g = $('#ga'); if (g) g.innerHTML = ans || '&nbsp;';
    };
  }
  function confirmPinReset() {
    const box = modal(`<h2>Reset the PIN?</h2><p style="font-size:19px">This removes the parent PIN <b>only</b>.<br>All profiles, pictures, drawings, stickers and levels stay safe.</p>
      <div class="btns"><button class="bigbtn small pink" data-m="yes">Yes, reset PIN only</button><button class="bigbtn small ghost" data-m="no">Cancel</button></div>`);
    box.onclick = (e) => {
      const m = e.target.closest('[data-m]'); if (!m) return;
      if (m.dataset.m === 'no') return closeModal();
      meta.pinHash = null; saveMeta(); closeModal(); toast('PIN removed. Set a new one 🔐');
      setPinFlow(() => show('parent'));
    };
  }
  function renderParent() {
    $('#set-sound').checked = settings.sound; $('#set-gentle').checked = settings.gentle; $('#set-helpers').checked = settings.helpers; $('#set-nums').checked = settings.nums;
    const P0 = prof();
    $$('.pname').forEach((el) => (el.textContent = P0.name));
    $('#prof-list').innerHTML = meta.profiles.map((q) => { const li = levelInfo(q.xp); return `<div class="mrow prow"><span class="pav" style="background:${q.color}">${q.avatar}</span><span><b>${esc(q.name)}</b>${q.id === P0.id ? ' <small class="cur">(playing now)</small>' : ''}<br><small>Level ${li.level} · ${gradeRange(q.grade)[2]} · ${q.pace === 'gentle' ? 'gentle unlocks' : 'normal unlocks'}${q.unlockAll ? ' · all unlocked' : ''} · math ${q.mathOn ? 'every ' + (q.mathFreq === 1 ? 'puzzle' : q.mathFreq + ' puzzles') : 'off'}</small></span><button class="bigbtn small ghost" data-editp="${q.id}">✏️ Edit</button></div>`; }).join('');
    $('#pin-status').textContent = meta.pinHash ? '✅ A parent PIN is set' : '⚠️ No PIN yet (a math question is used instead)';
    $('#pin-set').textContent = meta.pinHash ? 'Change PIN' : 'Set PIN';
    $('#set-lock').checked = !!meta.lockSettings; $('#set-lock').disabled = !meta.pinHash;
    $('#pin-reset').classList.toggle('hidden', !meta.pinHash);
    $('#pm-list').innerHTML = customs.length ? customs.map((p) => `<div class="mrow"><img alt="" src="${thumbURL(p)}"><span>${esc(p.name)}</span><button class="bigbtn small ghost" data-delpic="${p.id}">🗑️ Delete</button></div>`).join('') : '<i>None yet</i>';
    const ds = LS.get(pk('draw'), []);
    $('#pd-list').innerHTML = ds.length ? ds.map((d) => `<div class="mrow"><img alt="" src="${Draw.thumb(d)}"><span>${esc(d.name)}</span><button class="bigbtn small ghost" data-deldraw="${d.id}">🗑️ Delete</button></div>`).join('') : '<i>None yet</i>';
    let bytes = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); bytes += (localStorage.getItem(k) || '').length; } } catch (e) {}
    $('#storage-info').textContent = `Saved data: ${(bytes / 1024).toFixed(0)} KB.`;
    $('#app-version').textContent = 'Pixel Pop! ' + APP_VERSION;
  }
  [['set-sound', 'sound'], ['set-gentle', 'gentle'], ['set-helpers', 'helpers'], ['set-nums', 'nums']].forEach(([id, k]) => $('#' + id).addEventListener('change', (e) => { settings[k] = e.target.checked; saveSettings(); applySound(); applyHelpers(); }));
  function applyHelpers() { document.body.classList.toggle('nohelpers', !settings.helpers); }
  $('#set-lock').addEventListener('change', (e) => { if (!meta.pinHash) { e.target.checked = false; return; } meta.lockSettings = e.target.checked; saveMeta(); toast(meta.lockSettings ? 'Settings locked with PIN 🔒' : 'Settings unlocked'); });
  $('#pin-set').onclick = () => setPinFlow(() => show('parent'));
  $('#pin-reset').onclick = () => pinReset();
  $('#prof-add').onclick = () => {
    if (meta.profiles.length >= 8) { toast('That is a lot of kids! Max 8 profiles'); return; }
    const used = meta.profiles.map((q) => q.avatar); const av = AVATARS.find((x) => !used.includes(x)) || '🌈';
    const q = newProfile('p' + Date.now().toString(36), 'Player ' + (meta.profiles.length + 1), av, PCOLORS[meta.profiles.length % PCOLORS.length], '2', 'normal');
    meta.profiles.push(q); saveMeta(); renderParent(); editProfile(q.id);
  };
  function editProfile(id) {
    const q = meta.profiles.find((x) => x.id === id); if (!q) return;
    let av = q.avatar, col = q.color;
    const opt = (v, l, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${l}</option>`;
    const box = modal(`<h2>✏️ Edit profile</h2><div class="pedit">
      <label>Name<input id="pe-name" class="textin" maxlength="16" value="${esc(q.name)}"></label>
      <div class="plab">Avatar</div><div class="avpick">${AVATARS.map((x) => `<button data-av="${x}" class="${x === av ? 'on' : ''}">${x}</button>`).join('')}</div>
      <div class="plab">Color</div><div class="colpick">${PCOLORS.map((c) => `<button data-col="${c}" style="background:${c}" class="${c === col ? 'on' : ''}"></button>`).join('')}</div>
      <label>Age / grade (sets math break difficulty)<select id="pe-grade">${Object.entries(GRADES).map(([k, g]) => opt(k, g[2], q.grade)).join('')}</select></label>
      <label>Unlock speed<select id="pe-pace">${opt('gentle', 'Gentle (younger kids: Medium at level 4, Hard at level 8)', q.pace)}${opt('normal', 'Normal (Medium at level 2, Hard at level 4)', q.pace)}</select></label>
      <label>Starting difficulty<select id="pe-start">${opt('easy', 'Easy (unlock by leveling up)', q.start)}${opt('medium', 'Medium (Medium open right away)', q.start)}${opt('hard', 'Hard (everything open)', q.start)}</select></label>
      <label class="row"><span>🔓 Unlock all pictures</span><input type="checkbox" id="pe-all" ${q.unlockAll ? 'checked' : ''}></label>
      <label class="row"><span>🧠 Math breaks between puzzles</span><input type="checkbox" id="pe-math" ${q.mathOn ? 'checked' : ''}></label>
      <label>Math break how often<select id="pe-freq">${opt(1, 'After every puzzle', q.mathFreq)}${opt(2, 'After every 2 puzzles', q.mathFreq)}${opt(3, 'After every 3 puzzles', q.mathFreq)}</select></label>
      <p class="note">Math level now: ${q.mathLvl} of 8 (it moves up after 3 right answers in a row and down after misses, within the age range).</p>
      </div><div class="btns"><button class="bigbtn small mint" data-pe="save">💾 Save</button><button class="bigbtn small ghost" data-pe="cancel">Cancel</button></div>
      <div class="btns"><button class="bigbtn small ghost" data-pe="reset">♻️ Reset ${esc(q.name)}'s progress</button>${meta.profiles.length > 1 ? `<button class="bigbtn small ghost" data-pe="del">🗑️ Delete profile</button>` : ''}</div>`);
    box.onclick = (e) => {
      const a = e.target.closest('[data-av]'); if (a) { av = a.dataset.av; $$('.avpick button', box).forEach((b) => b.classList.toggle('on', b === a)); return; }
      const c = e.target.closest('[data-col]'); if (c) { col = c.dataset.col; $$('.colpick button', box).forEach((b) => b.classList.toggle('on', b === c)); return; }
      const b = e.target.closest('[data-pe]'); if (!b) return; const act = b.dataset.pe;
      if (act === 'cancel') return closeModal();
      if (act === 'save') {
        const g = $('#pe-grade').value, r = gradeRange(g);
        q.name = ($('#pe-name').value || '').trim().slice(0, 16) || q.name; q.avatar = av; q.color = col;
        if (g !== q.grade) { q.grade = g; q.mathLvl = g === 'K' ? 1 : r[0] + 1; q.mathStreak = 0; q.mathMiss = 0; }
        q.mathLvl = Math.max(r[0], Math.min(r[1], q.mathLvl));
        q.pace = $('#pe-pace').value; q.start = $('#pe-start').value; q.unlockAll = $('#pe-all').checked; q.mathOn = $('#pe-math').checked; q.mathFreq = +$('#pe-freq').value;
        if (!q.mathOn) q.mathDue = false;
        saveMeta(); applyTheme(); thumbCache.clear(); closeModal(); renderParent(); toast('Saved ✅'); return;
      }
      if (act === 'reset') { if (!confirm(`Erase ALL of ${q.name}'s coloring progress, level and points? Pictures they made stay.`)) return; resetProfile(q.id); closeModal(); renderParent(); toast('Progress reset'); return; }
      if (act === 'del') {
        if (!confirm(`Delete ${q.name}'s profile and everything in it? This cannot be undone.`)) return;
        Object.keys(localStorage).filter((k) => k.startsWith('kc2_' + q.id + '_')).forEach((k) => LS.del(k));
        meta.profiles = meta.profiles.filter((x) => x.id !== q.id); if (meta.active === q.id) { meta.active = meta.profiles[0].id; }
        saveMeta(); closeModal(); customs.forEach((p) => byId.delete(p.id)); loadStats(); customs = loadCustom(); customs.forEach((p) => byId.set(p.id, p)); thumbCache.clear(); Draw.reset(); applyTheme(); renderParent(); toast('Profile deleted');
      }
    };
  }
  function resetProfile(id) {
    Object.keys(localStorage).filter((k) => k.startsWith('kc2_' + id + '_p_')).forEach((k) => LS.del(k));
    const st = Object.assign({ completed: [], daily: [], photos: 0, draws: 0, hard: 0, mine: 0, math: 0 }, LS.get(pk('stats', id), {}));
    st.completed = []; st.daily = []; st.hard = 0; st.mine = 0; LS.set(pk('stats', id), st);
    const q = meta.profiles.find((x) => x.id === id); if (q) { q.xp = 0; q.stars = 0; q.mathDue = false; q.mathCount = 0; saveMeta(); }
    if (id === prof().id) loadStats(); thumbCache.clear();
  }
  $('#s-parent').addEventListener('click', (e) => {
    const ep = e.target.closest('[data-editp]'); if (ep) return editProfile(ep.dataset.editp);
    const dp = e.target.closest('[data-delpic]'), dd = e.target.closest('[data-deldraw]');
    if (dp && confirm('Delete this picture?')) { const id = dp.dataset.delpic; LS.set(pk('custom'), LS.get(pk('custom'), []).filter((c) => c.id !== id)); LS.del(progKey(id)); byId.delete(id); customs = loadCustom(); renderParent(); }
    if (dd && confirm('Delete this drawing?')) { const id = dd.dataset.deldraw; LS.set(pk('draw'), LS.get(pk('draw'), []).filter((c) => c.id !== id)); renderParent(); }
  });
  $('#reset-prog').onclick = () => { if (!confirm(`Erase ALL of ${prof().name}'s coloring progress, level and points? This cannot be undone.`)) return; resetProfile(prof().id); toast('Progress reset'); renderParent(); };
  $('#reset-stick').onclick = () => { if (!confirm(`Reset ${prof().name}'s sticker book?`)) return; LS.del(pk('stickers')); stats = { completed: [], daily: [], photos: 0, draws: 0, hard: 0, mine: 0, math: 0 }; saveStats(); renderParent(); };

  // =====================================================================
  // PLAY (coloring)
  // =====================================================================
  const Play = (function () {
    const cv = $('#cv'), ctx = cv.getContext('2d'), board = $('#board');
    let P = null, state = null, order = [], sel = 0, tool = 'brush', done = false, isDaily = false, wrongs = 0, usedMagic = 0;
    let W = 0, H = 0, dpr = 1, s = 10, ox = 0, oy = 0, fitS = 10;
    let colTotals = [], colDone = [], correct = 0, undoStack = [], stroke = null, hintUntil = 0, dirty = true, saveT = 0;
    const api = { from: 'home' };

    function open(p, from, daily) {
      const pr = getProg(p.id), P0 = prof();
      // a NEW puzzle (not started, or starting over) needs the math break first; in-progress ones are always open
      if (P0.mathOn && P0.mathDue && (!pr || pr.d)) { MathBreak.show(() => open(p, from, daily), null); return; }
      P = p; api.from = from === 'play' ? api.from : from || 'home'; isDaily = !!daily || p.id === dailyPuzzle().id;
      wrongs = (pr && pr.w) || 0; usedMagic = (pr && pr.m) || 0;
      state = new Uint8Array(p.N * p.N); order = (pr && pr.o) || [];
      if (pr) for (let k = 0; k < state.length; k++) state[k] = Math.max(0, pr.s.charCodeAt(k) - 48);
      done = !!(pr && pr.d); undoStack = [];
      recount();
      sel = colDone.findIndex((c, i) => c < colTotals[i]); if (sel < 0) sel = 0;
      $('#p-name').textContent = p.name;
      buildPalette(); setTool('brush');
      show('play'); resize(); fit(); updateProgress();
    }
    function recount() {
      colTotals = P.pal.map(() => 0); colDone = P.pal.map(() => 0); correct = 0;
      for (let k = 0; k < P.cells.length; k++) { const v = P.cells[k]; if (v < 0) continue; colTotals[v]++; if (state[k] === v + 1) { colDone[v]++; correct++; } }
    }
    function buildPalette() {
      const el = $('#palette');
      el.innerHTML = P.pal.map((c, i) => `<button class="pc" data-c="${i}" style="background:${c};color:${textOn(c)}"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="16.5" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="2.5"/><circle class="ring" cx="18" cy="18" r="16.5" fill="none" stroke="#22c58b" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="0 104" transform="rotate(-90 18 18)"/></svg>${i + 1}</button>`).join('');
      updatePalette();
    }
    function updatePalette() {
      $$('#palette .pc').forEach((b, i) => {
        b.classList.toggle('sel', i === sel); b.classList.toggle('done', colDone[i] >= colTotals[i]);
        const r = b.querySelector('.ring'); if (r) r.setAttribute('stroke-dasharray', `${(colDone[i] / colTotals[i]) * 103.7} 104`);
      });
    }
    $('#palette').addEventListener('click', (e) => {
      const b = e.target.closest('.pc'); if (!b) return; sel = +b.dataset.c; SND.tap(); updatePalette(); dirty = true;
      if (tool === 'move') setTool('brush');
      b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    });
    function setTool(t) { tool = t; $$('#tools .tool').forEach((b) => b.classList.toggle('on', b.dataset.t === t)); }
    $('#tools').addEventListener('click', (e) => {
      const b = e.target.closest('.tool'); if (!b) return; const t = b.dataset.t; SND.tap();
      if (t === 'undo') return undo();
      if (t === 'hint') return hint();
      if (t === 'fit') { fit(); return; }
      if (t === 'wand') return magic();
      setTool(t);
    });

    function resize() {
      const r = board.getBoundingClientRect(); if (!r.width) return;
      const keep = P && W ? { cx: (W / 2 - ox) / s, cy: (H / 2 - oy) / s } : null;
      W = r.width; H = r.height; dpr = Math.min(3, devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      if (P) { fitS = Math.min(W, H) * 0.92 / P.N; if (keep) { ox = W / 2 - keep.cx * s; oy = H / 2 - keep.cy * s; } }
      dirty = true;
    }
    function fit() { if (!P) return; fitS = Math.min(W, H) * 0.92 / P.N; s = fitS; ox = (W - P.N * s) / 2; oy = (H - P.N * s) / 2; dirty = true; }
    function clampView() {
      const g = P.N * s, m = 80;
      ox = Math.min(W - m, Math.max(m - g, ox)); oy = Math.min(H - m, Math.max(m - g, oy));
    }
    function zoomAt(f, cx, cy) {
      const ns = Math.min(64, Math.max(fitS * 0.7, s * f)); f = ns / s;
      ox = cx - (cx - ox) * f; oy = cy - (cy - oy) * f; s = ns; clampView(); dirty = true;
    }
    addEventListener('resize', () => { if (current === 'play') resize(); });

    function draw() {
      if (!P) return;
      const now = performance.now(), hinting = now < hintUntil;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#eef0f8'; ctx.fillRect(0, 0, W, H);
      const N = P.N, g = N * s;
      ctx.fillStyle = 'rgba(60,40,120,.12)'; ctx.fillRect(ox + 4, oy + 6, g, g);
      ctx.fillStyle = '#fff'; ctx.fillRect(ox, oy, g, g);
      const i0 = Math.max(0, Math.floor(-ox / s)), i1 = Math.min(N - 1, Math.floor((W - ox) / s));
      const j0 = Math.max(0, Math.floor(-oy / s)), j1 = Math.min(N - 1, Math.floor((H - oy) / s));
      const showNums = s >= 13 || (settings.nums && s >= 7);
      const pulse = hinting ? 0.35 + 0.35 * Math.sin(now / 90) : 0;
      const pw = Math.ceil(s + 0.5);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = j * N + i, v = P.cells[k]; if (v < 0) continue;
        const st = state[k], x = ox + i * s, y = oy + j * s;
        if (st === v + 1 || done) ctx.fillStyle = P.pal[v];
        else if (st) ctx.fillStyle = mixWhite(P.pal[st - 1], 0.45);
        else ctx.fillStyle = v === sel ? '#b9c1d3' : grayOf(P.pal[v]);
        ctx.fillRect(Math.floor(x), Math.floor(y), pw, pw);
        if (hinting && v === sel && st !== v + 1) { ctx.fillStyle = `rgba(255,190,30,${pulse})`; ctx.fillRect(x, y, s, s); }
      }
      if (s >= 7 && !done) {
        ctx.strokeStyle = 'rgba(40,40,80,.10)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = i0; i <= i1 + 1; i++) { const x = Math.round(ox + i * s) + 0.5; ctx.moveTo(x, oy + j0 * s); ctx.lineTo(x, oy + (j1 + 1) * s); }
        for (let j = j0; j <= j1 + 1; j++) { const y = Math.round(oy + j * s) + 0.5; ctx.moveTo(ox + i0 * s, y); ctx.lineTo(ox + (i1 + 1) * s, y); }
        ctx.stroke();
      }
      if (showNums && !done) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const fs = Math.floor(s * (N > 0 ? 0.5 : 0.5));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const k = j * N + i, v = P.cells[k]; if (v < 0) continue; const st = state[k]; if (st === v + 1) continue;
          ctx.font = `${v === sel ? 900 : 700} ${fs}px ui-rounded, system-ui, sans-serif`;
          ctx.fillStyle = v === sel ? '#1f2440' : st ? '#c0264f' : '#6b7085';
          ctx.fillText(String(v + 1), ox + i * s + s / 2, oy + j * s + s / 2 + 1);
        }
      }
      if (hinting) dirty = true;
    }
    (function loop() { if (dirty && current === 'play') { dirty = false; draw(); } requestAnimationFrame(loop); })();

    function cellAt(x, y) { const i = Math.floor((x - ox) / s), j = Math.floor((y - oy) / s); if (i < 0 || j < 0 || i >= P.N || j >= P.N) return -1; return j * P.N + i; }
    function paintCell(k, rec) {
      if (k < 0 || done) return false; const v = P.cells[k]; if (v < 0) return false;
      if (state[k] === v + 1) return false;
      if (sel !== v) {
        wrongs++;
        if (!settings.gentle) { rec.wrong = true; return false; }
        if (state[k] === sel + 1) return false;
        rec.list.push([k, state[k]]); state[k] = sel + 1; rec.wrong = true; return true;
      }
      rec.list.push([k, state[k]]); state[k] = v + 1; order.push(k); colDone[v]++; correct++; rec.good = true;
      return true;
    }
    function afterPaint(rec) {
      if (!rec.list.length && !rec.wrong) return;
      if (rec.good) SND.pop(); else if (rec.wrong) { SND.oops(); if (!rec.toldWrong) { rec.toldWrong = true; toast(`Look for number ${sel + 1} 👀`); } }
      dirty = true; updateProgress(); scheduleSave();
      if (colDone[sel] >= colTotals[sel] && rec.good && !rec.chimed) {
        rec.chimed = true; SND.chime(); toast(`Color ${sel + 1} done! ⭐`);
        const nx = nextColor(); if (nx >= 0) { sel = nx; }
        updatePalette();
      }
      if (correct >= P.total) complete();
    }
    function nextColor() { for (let d = 1; d <= P.pal.length; d++) { const c = (sel + d) % P.pal.length; if (colDone[c] < colTotals[c]) return c; } return -1; }
    function updateProgress() {
      const pct = P.total ? (correct ? Math.max(1, Math.floor((correct / P.total) * 100)) : 0) : 0;
      $('#p-fill').style.width = pct + '%'; $('#p-pct').textContent = pct + '%';
      updatePalette();
    }
    function bucket(k) {
      if (k < 0) return; const v = P.cells[k]; if (v < 0) return;
      if (v !== sel) { wrongs++; SND.oops(); toast(`That's number ${v + 1}. Pick color ${v + 1}!`); return; }
      const rec = { list: [] }, N = P.N, stack = [k], seen = new Uint8Array(N * N);
      while (stack.length) {
        const q = stack.pop(); if (seen[q]) continue; seen[q] = 1; if (P.cells[q] !== v) continue;
        paintCell(q, rec); const i = q % N, j = (q / N) | 0;
        if (i > 0) stack.push(q - 1); if (i < N - 1) stack.push(q + 1); if (j > 0) stack.push(q - N); if (j < N - 1) stack.push(q + N);
      }
      if (rec.list.length) undoStack.push(rec.list); afterPaint(rec);
    }
    function magic() {
      if (done) return; const rec = { list: [] }; usedMagic = 1;
      for (let k = 0; k < P.cells.length; k++) if (P.cells[k] === sel) paintCell(k, rec);
      if (rec.list.length) { undoStack.push(rec.list); afterPaint(rec); } else toast('This color is all done! ✅');
    }
    function undo() {
      if (done) return; const l = undoStack.pop(); if (!l) { toast('Nothing to undo'); return; }
      const removed = new Set();
      for (let n = l.length - 1; n >= 0; n--) { const [k, prev] = l[n]; if (state[k] === P.cells[k] + 1) removed.add(k); state[k] = prev; }
      if (removed.size) order = order.filter((k) => !removed.has(k));
      recount(); updateProgress(); dirty = true; scheduleSave();
    }
    function hint() {
      if (done) return;
      if (colDone[sel] >= colTotals[sel]) { const nx = nextColor(); if (nx < 0) return; sel = nx; updatePalette(); }
      const N = P.N; let best = -1, bd = 1e9; const cx = (W / 2 - ox) / s, cy = (H / 2 - oy) / s;
      for (let k = 0; k < P.cells.length; k++) if (P.cells[k] === sel && state[k] !== sel + 1) { const d = (k % N - cx) ** 2 + (((k / N) | 0) - cy) ** 2; if (d < bd) { bd = d; best = k; } }
      if (best >= 0) {
        const i = best % N, j = (best / N) | 0, x = ox + (i + 0.5) * s, y = oy + (j + 0.5) * s;
        if (s < 18) { const ns = Math.min(30, Math.max(18, fitS * 2)); s = ns; }
        if (x < 40 || y < 40 || x > W - 40 || y > H - 40 || s >= 18) { ox = W / 2 - (i + 0.5) * s; oy = H / 2 - (j + 0.5) * s; clampView(); }
      }
      hintUntil = performance.now() + 1600; dirty = true; SND.chime();
      const left = colTotals[sel] - colDone[sel]; toast(`${left} square${left === 1 ? '' : 's'} of ${sel + 1} left! 💡`);
    }

    // pointer handling: 1 finger paints, 2 fingers pinch/pan
    const ptrs = new Map(); let pend = null, pinch = null, panLast = null;
    function pos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function lineCells(a, b, rec) {
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (s * 0.4)));
      for (let n = 1; n <= steps; n++) paintCell(cellAt(a.x + ((b.x - a.x) * n) / steps, a.y + ((b.y - a.y) * n) / steps), rec);
    }
    function startStroke(p) { stroke = { rec: { list: [] }, last: p }; paintCell(cellAt(p.x, p.y), stroke.rec); afterPaint(stroke.rec); }
    function endStroke() { if (stroke) { if (stroke.rec.list.length) undoStack.push(stroke.rec.list); if (undoStack.length > 60) undoStack.shift(); stroke = null; } }
    cv.addEventListener('pointerdown', (e) => {
      e.preventDefault(); audio(); cv.setPointerCapture(e.pointerId);
      const p = pos(e); ptrs.set(e.pointerId, p);
      if (ptrs.size === 2) {
        clearTimeout(pend && pend.t); pend = null; endStroke();
        const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; return;
      }
      if (ptrs.size > 2) return;
      if (tool === 'move' || e.button === 1 || e.button === 2 || done) { panLast = p; return; }
      if (tool === 'bucket') { pend = { bucket: true, p }; return; }
      pend = { p, t: setTimeout(() => { if (pend && !pend.bucket) { const q = pend.p; pend = null; startStroke(q); } }, e.pointerType === 'touch' ? 70 : 0) };
    });
    cv.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return; e.preventDefault();
      const p = pos(e); ptrs.set(e.pointerId, p);
      if (ptrs.size === 2 && pinch) {
        const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ox += mx - pinch.mx; oy += my - pinch.my; zoomAt(d / pinch.d, mx, my); pinch = { d, mx, my }; return;
      }
      if (panLast) { ox += p.x - panLast.x; oy += p.y - panLast.y; panLast = p; clampView(); dirty = true; return; }
      if (pend && !pend.bucket) { clearTimeout(pend.t); const q = pend.p; pend = null; startStroke(q); }
      if (stroke) { lineCells(stroke.last, p, stroke.rec); stroke.last = p; afterPaint(stroke.rec); }
    });
    function up(e) {
      if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
      if (pend) { clearTimeout(pend.t); const q = pend.p, wasB = pend.bucket; pend = null; if (wasB) bucket(cellAt(q.x, q.y)); else { startStroke(q); } }
      if (ptrs.size < 2) pinch = null;
      if (ptrs.size === 0) { endStroke(); panLast = null; }
    }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const p = pos(e); if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) zoomAt(Math.exp(-e.deltaY * 0.0025), p.x, p.y); }, { passive: false });
    ['gesturestart', 'gesturechange'].forEach((t) => document.addEventListener(t, (e) => e.preventDefault()));

    function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(save, 600); }
    function save() {
      clearTimeout(saveT); if (!P || !state) return;
      let any = false, str = ''; for (let k = 0; k < state.length; k++) { str += String.fromCharCode(48 + state[k]); if (state[k]) any = true; }
      if (!any && !getProg(P.id)) return;
      LS.set(progKey(P.id), { s: str, o: order, d: done ? 1 : 0, t: Date.now(), w: wrongs, m: usedMagic });
    }
    function complete() {
      if (done) return; done = true; save(); dirty = true;
      if (!stats.completed.includes(P.id)) stats.completed.push(P.id);
      if (tier(P) === 2) stats.hard++;
      if (P.custom) stats.mine++;
      if (isDaily && P.id === dailyPuzzle().id && !stats.daily.includes(todayStr())) stats.daily.push(todayStr());
      saveStats();
      // points + level
      const earned = puzzlePoints(P, wrongs, usedMagic); addXP(earned.base + earned.bonus);
      const P0 = prof(); P0.mathCount = (P0.mathCount || 0) + 1;
      if (P0.mathOn && P0.mathCount % (P0.mathFreq || 1) === 0) P0.mathDue = true;
      saveMeta();
      const fresh = checkStickers();
      SND.win(); confetti();
      const pp = P;
      setTimeout(() => { if (fresh.length) SND.sticker(); finishedViewer(pp, fresh, earned); }, 900);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    addEventListener('pagehide', save);

    Object.assign(api, { open, save, resize, fit, _state: () => ({ P, state, sel, correct, s, ox, oy, done, colTotals, colDone, wrongs, usedMagic }) });
    return api;
  })();

  // =====================================================================
  // PHOTO -> PUZZLE
  // =====================================================================
  const Photo = (function () {
    const crop = $('#ph-crop'), cx = crop.getContext('2d'), prev = $('#ph-prev');
    let img = null, z = 1, px = 0, py = 0, N = 32, K = 10, result = null, prevT = 0;
    function loadFile(f) {
      if (!f) return; const url = URL.createObjectURL(f); const im = new Image();
      im.onload = () => { img = im; z = 1; $('#ph-zoom').value = 1; const m = Math.min(im.width, im.height); px = (im.width - m) / 2; py = (im.height - m) / 2; $('#ph-start').classList.add('hidden'); $('#ph-edit').classList.remove('hidden'); $('#ph-name').value = ''; drawCrop(); queuePreview(); };
      im.onerror = () => toast('Could not open that photo 😕'); im.src = url;
    }
    $('#ph-file').addEventListener('change', (e) => { loadFile(e.target.files[0]); e.target.value = ''; });
    $('#ph-file2').addEventListener('change', (e) => { loadFile(e.target.files[0]); e.target.value = ''; });
    const side = () => Math.min(img.width, img.height) / z;
    function clamp() { const sd = side(); px = Math.max(0, Math.min(img.width - sd, px)); py = Math.max(0, Math.min(img.height - sd, py)); }
    function drawCrop() {
      if (!img) return; const r = crop.getBoundingClientRect(), D = Math.round((r.width || 360) * Math.min(2, devicePixelRatio || 1));
      if (crop.width !== D) { crop.width = crop.height = D; }
      clamp(); cx.imageSmoothingQuality = 'high'; cx.drawImage(img, px, py, side(), side(), 0, 0, D, D);
      cx.strokeStyle = 'rgba(255,255,255,.55)'; cx.lineWidth = 2; cx.beginPath();
      for (let t = 1; t < 3; t++) { cx.moveTo((D * t) / 3, 0); cx.lineTo((D * t) / 3, D); cx.moveTo(0, (D * t) / 3); cx.lineTo(D, (D * t) / 3); } cx.stroke();
    }
    const cp = new Map(); let cpinch = null;
    crop.addEventListener('pointerdown', (e) => { crop.setPointerCapture(e.pointerId); cp.set(e.pointerId, [e.clientX, e.clientY]); if (cp.size === 2) { const [a, b] = [...cp.values()]; cpinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    crop.addEventListener('pointermove', (e) => {
      if (!cp.has(e.pointerId) || !img) return; const last = cp.get(e.pointerId); cp.set(e.pointerId, [e.clientX, e.clientY]);
      if (cp.size === 2) { const [a, b] = [...cp.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (cpinch) setZoom(z * (d / cpinch)); cpinch = d; return; }
      const k = side() / crop.getBoundingClientRect().width; px -= (e.clientX - last[0]) * k; py -= (e.clientY - last[1]) * k; drawCrop(); queuePreview();
    });
    const cup = (e) => { cp.delete(e.pointerId); if (cp.size < 2) cpinch = null; };
    crop.addEventListener('pointerup', cup); crop.addEventListener('pointercancel', cup);
    function setZoom(nz) { const c0 = side(); const mx = px + c0 / 2, my = py + c0 / 2; z = Math.max(1, Math.min(4, nz)); $('#ph-zoom').value = z; const c1 = side(); px = mx - c1 / 2; py = my - c1 / 2; drawCrop(); queuePreview(); }
    $('#ph-zoom').addEventListener('input', (e) => setZoom(+e.target.value));
    $('#ph-size').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; N = +b.dataset.n; $$('#ph-size button').forEach((x) => x.classList.toggle('on', x === b)); queuePreview(); });
    $('#ph-k').addEventListener('input', (e) => { K = +e.target.value; $('#ph-kv').textContent = K; queuePreview(); });
    $('#ph-vivid').addEventListener('change', queuePreview);
    function queuePreview() { clearTimeout(prevT); prevT = setTimeout(makePreview, 180); }

    // color math
    function toLab([r, g, b]) {
      const f = (c) => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; };
      const R = f(r), G = f(g), B = f(b);
      let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
      const h = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); X = h(X); Y = h(Y); Z = h(Z);
      return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
    }
    function fromLab([L, A, Bb]) {
      let Y = (L + 16) / 116, X = A / 500 + Y, Z = Y - Bb / 200;
      const h = (t) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787); X = h(X) * 0.95047; Y = h(Y); Z = h(Z) * 1.08883;
      let R = X * 3.2406 + Y * -1.5372 + Z * -0.4986, G = X * -0.9689 + Y * 1.8758 + Z * 0.0415, B = X * 0.0557 + Y * -0.204 + Z * 1.057;
      const f = (c) => Math.round(255 * Math.max(0, Math.min(1, c > 0.0031308 ? 1.055 * c ** (1 / 2.4) - 0.055 : 12.92 * c)));
      return [f(R), f(G), f(B)];
    }
    const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
    function sample(n) {
      const sd = side(), big = document.createElement('canvas'); big.width = big.height = n * 4;
      const bx = big.getContext('2d'); bx.imageSmoothingQuality = 'high'; bx.drawImage(img, px, py, sd, sd, 0, 0, n * 4, n * 4);
      const sm = document.createElement('canvas'); sm.width = sm.height = n; const sx = sm.getContext('2d'); sx.imageSmoothingQuality = 'high'; sx.drawImage(big, 0, 0, n, n);
      return sx.getImageData(0, 0, n, n).data;
    }
    function quantize(n, k, vivid) {
      const d = sample(n), px3 = [];
      for (let i = 0; i < n * n; i++) {
        let r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
        if (vivid) { const m = (r + g + b) / 3, f = 1.35; r = Math.max(0, Math.min(255, m + (r - m) * f)); g = Math.max(0, Math.min(255, m + (g - m) * f)); b = Math.max(0, Math.min(255, m + (b - m) * f)); }
        px3.push(toLab([r, g, b]));
      }
      const rand = PixArt.rng(12345), cents = [px3[(rand() * px3.length) | 0].slice()];
      const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
      while (cents.length < k) { // k-means++
        const ds = px3.map((p) => Math.min(...cents.map((c) => dist(p, c)))); const tot = ds.reduce((a, b) => a + b, 0); if (!tot) break;
        let t = rand() * tot, i = 0; while ((t -= ds[i]) > 0 && i < ds.length - 1) i++; cents.push(px3[i].slice());
      }
      const asg = new Int16Array(px3.length);
      for (let it = 0; it < 14; it++) {
        const sum = cents.map(() => [0, 0, 0, 0]);
        px3.forEach((p, i) => { let bi = 0, bd = 1e12; cents.forEach((c, j) => { const dd = dist(p, c); if (dd < bd) { bd = dd; bi = j; } }); asg[i] = bi; const s = sum[bi]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; });
        sum.forEach((s, j) => { if (s[3]) cents[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
      }
      // tidy lonely pixels so the puzzle is easier to color
      const out = Array.from(asg);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const k0 = j * n + i, nb = []; if (i > 0) nb.push(asg[k0 - 1]); if (i < n - 1) nb.push(asg[k0 + 1]); if (j > 0) nb.push(asg[k0 - n]); if (j < n - 1) nb.push(asg[k0 + n]);
        if (!nb.includes(asg[k0])) { const cnt = {}; nb.forEach((v) => (cnt[v] = (cnt[v] || 0) + 1)); const [bv, bc] = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; if (bc >= 3) out[k0] = +bv; }
      }
      const grid = out.map((a) => hex(fromLab(cents[a])));
      return PixArt.fromGrid('m-' + Date.now().toString(36), 'My Picture', 'mine', n, grid);
    }
    function makePreview() {
      if (!img) return;
      result = quantize(N, K, $('#ph-vivid').checked);
      const S = Math.ceil(240 / N), c = fullImage(result, S); prev.width = c.width; prev.height = c.height; prev.getContext('2d').drawImage(c, 0, 0);
      $('#ph-pal').innerHTML = result.pal.map((c) => `<i style="background:${c}"></i>`).join('');
    }
    $('#ph-make').addEventListener('click', () => {
      if (!img) return; if (!result) makePreview();
      result.name = ($('#ph-name').value || '').trim() || 'My Photo ' + (customs.length + 1);
      result.id = 'm-' + Date.now().toString(36);
      if (!saveCustomPuzzle(result)) return;
      stats.photos++; saveStats(); const fresh = checkStickers(); if (fresh.length) { SND.sticker(); }
      SND.chime(); const p = byId.get(result.id);
      $('#ph-start').classList.remove('hidden'); $('#ph-edit').classList.add('hidden'); img = null;
      Play.open(p, 'home'); if (fresh.length) toast(`New sticker! ${fresh[0].e} ${fresh[0].t}`);
    });
    return { loadFile, quantize: () => result };
  })();

  // =====================================================================
  // FREE DRAW
  // =====================================================================
  const Draw = (function () {
    const PAL = ['#2b2b3a', '#ffffff', '#9aa3b5', '#8b5a2b', '#e0a96d', '#ffd9b8', '#e63946', '#ff8c1a', '#ffd23f', '#7ee36b', '#2f9e44', '#22b3b0', '#3df5ff', '#5ad1ff', '#3a86ff', '#1e3a8a', '#7b2ff7', '#b388ff', '#ff4fa3', '#ffb3c7'];
    const cv = $('#dr-canvas'), ctx = cv.getContext('2d');
    let cur = null, col = 6, tool = 'pen', undo = [], W = 0, H = 0, S = 10, ox = 0, oy = 0, dpr = 1;
    $('#dr-pal').innerHTML = PAL.map((c, i) => `<button data-dc="${i}" style="background:${c}" aria-label="color"></button>`).join('');
    function selUI() { $$('#dr-pal button').forEach((b, i) => b.classList.toggle('sel', i === col)); $$('#dr-tools .tool').forEach((b) => b.classList.toggle('on', b.dataset.dt === tool)); }
    $('#dr-pal').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; col = +b.dataset.dc; if (tool === 'erase') tool = 'pen'; SND.tap(); selUI(); });
    $('#dr-tools').addEventListener('click', (e) => { const b = e.target.closest('.tool'); if (!b) return; SND.tap(); if (b.dataset.dt === 'undo') { const u = undo.pop(); if (u) { cur.c = u; render(); } return; } tool = b.dataset.dt; selUI(); });
    function blank(N) { return { id: 'd-' + Date.now().toString(36), name: 'Drawing ' + (LS.get(pk('draw'), []).length + 1), N, c: '.'.repeat(N * N) }; }
    function open() { if (!cur) cur = blank(24); selUI(); requestAnimationFrame(resize); }
    function load(id) { const d = LS.get(pk('draw'), []).find((x) => x.id === id); if (d) { cur = Object.assign({}, d); undo = []; } }
    function newPrompt() {
      const box = modal(`<h2>🆕 New drawing</h2><p style="font-size:20px">How big?</p><div class="btns"><button class="bigbtn small mint" data-n="16">Small 16</button><button class="bigbtn small sun" data-n="24">Medium 24</button><button class="bigbtn small pink" data-n="32">Big 32</button></div>`);
      box.onclick = (e) => { const b = e.target.closest('[data-n]'); if (!b) return; cur = blank(+b.dataset.n); undo = []; closeModal(); resize(); };
    }
    function resize() { const r = cv.getBoundingClientRect(); if (!r.width) return; W = r.width; H = r.height; dpr = Math.min(3, devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; S = Math.floor(Math.min(W, H) / cur.N); ox = Math.floor((W - S * cur.N) / 2); oy = Math.floor((H - S * cur.N) / 2); render(); }
    addEventListener('resize', () => { if (current === 'draw') resize(); });
    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); const N = cur.N;
      for (let k = 0; k < N * N; k++) { const i = k % N, j = (k / N) | 0, ch = cur.c.charCodeAt(k); ctx.fillStyle = ch === 46 ? ((i + j) % 2 ? '#f7f7fb' : '#ffffff') : PAL[ch - 97]; ctx.fillRect(ox + i * S, oy + j * S, S, S); }
      ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); for (let t = 0; t <= N; t++) { ctx.moveTo(ox + t * S + 0.5, oy); ctx.lineTo(ox + t * S + 0.5, oy + N * S); ctx.moveTo(ox, oy + t * S + 0.5); ctx.lineTo(ox + N * S, oy + t * S + 0.5); } ctx.stroke();
    }
    function setCell(k, ch) { if (k < 0) return; if (cur.c[k] === ch) return; cur.c = cur.c.slice(0, k) + ch + cur.c.slice(k + 1); }
    function cellAt(e) { const r = cv.getBoundingClientRect(); const i = Math.floor((e.clientX - r.left - ox) / S), j = Math.floor((e.clientY - r.top - oy) / S); return i < 0 || j < 0 || i >= cur.N || j >= cur.N ? -1 : j * cur.N + i; }
    let down = false;
    function act(e) {
      const k = cellAt(e); if (k < 0) return; const ch = tool === 'erase' ? '.' : String.fromCharCode(97 + col);
      if (tool === 'fill') { const N = cur.N, from = cur.c[k]; if (from === ch) return; const st = [k], arr = cur.c.split(''); while (st.length) { const q = st.pop(); if (arr[q] !== from) continue; arr[q] = ch; const i = q % N, j = (q / N) | 0; if (i > 0) st.push(q - 1); if (i < N - 1) st.push(q + 1); if (j > 0) st.push(q - N); if (j < N - 1) st.push(q + N); } cur.c = arr.join(''); SND.pop(); render(); return; }
      if (cur.c[k] !== ch) { setCell(k, ch); SND.pop(); render(); }
    }
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); audio(); cv.setPointerCapture(e.pointerId); undo.push(cur.c); if (undo.length > 50) undo.shift(); down = true; act(e); });
    cv.addEventListener('pointermove', (e) => { if (down && tool !== 'fill') act(e); });
    ['pointerup', 'pointercancel'].forEach((t) => cv.addEventListener(t, () => (down = false)));
    function save(silent) {
      if (!/[a-z]/.test(cur.c)) { toast('Draw something first! 🖍️'); return false; }
      const list = LS.get(pk('draw'), []).filter((d) => d.id !== cur.id); list.unshift(cur); if (!LS.set(pk('draw'), list)) return false;
      if (!stats.draws) { stats.draws = 1; saveStats(); const f = checkStickers(); if (f.length) { SND.sticker(); toast(`New sticker! ${f[0].e} ${f[0].t}`); return true; } }
      if (!silent) { SND.chime(); toast('Saved to My Work! 💾'); }
      return true;
    }
    function thumb(d) { const N = d.N, c = document.createElement('canvas'), Sz = Math.ceil(144 / N); c.width = c.height = N * Sz; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); for (let k = 0; k < N * N; k++) { const ch = d.c.charCodeAt(k); if (ch !== 46) { x.fillStyle = PAL[ch - 97]; x.fillRect((k % N) * Sz, ((k / N) | 0) * Sz, Sz, Sz); } } return c.toDataURL(); }
    function image(d, Sz) { const N = d.N, c = document.createElement('canvas'); c.width = c.height = N * Sz; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); for (let k = 0; k < N * N; k++) { const ch = d.c.charCodeAt(k); if (ch !== 46) { x.fillStyle = PAL[ch - 97]; x.fillRect((k % N) * Sz, ((k / N) | 0) * Sz, Sz, Sz); } } return c; }
    $('#dr-share').onclick = () => { if (/[a-z]/.test(cur.c)) shareCanvas(image(cur, Math.floor(1024 / cur.N)), cur.name); else toast('Draw something first! 🖍️'); };
    $('#dr-puzzle').onclick = () => {
      if (!save(true)) return;
      const grid = cur.c.split('').map((ch) => (ch === '.' ? null : PAL[ch.charCodeAt(0) - 97]));
      const p = PixArt.fromGrid('m-' + Date.now().toString(36), cur.name + ' puzzle', 'mine', cur.N, grid);
      if (p.total < 4) { toast('Draw a bit more first!'); return; }
      if (saveCustomPuzzle(p)) { SND.chime(); Play.open(byId.get(p.id), 'draw'); toast('Now color your own drawing! 🎨'); }
    };
    function reset() { cur = null; undo = []; }
    return { open, load, newPrompt, save, thumb, reset };
  })();

  // =====================================================================
  // MATH BREAKS (v2): between puzzles, age-based, adaptive, no penalty
  // =====================================================================
  const MathBreak = (function () {
    const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const pick = (arr) => arr[(Math.random() * arr.length) | 0];
    const EMO = ['🍎', '⭐', '🐶', '🚗', '🎈', '🐟', '🌸', '🦖', '⚽', '🍪', '🐸', '💎'];
    const THINGS = [['sticker', 'stickers'], ['crayon', 'crayons'], ['cookie', 'cookies'], ['toy car', 'toy cars'], ['dino egg', 'dino eggs'], ['soccer ball', 'soccer balls'], ['gem', 'gems'], ['Lego brick', 'Lego bricks']];
    const FRIENDS = ['Mom', 'Dad', 'Grandma', 'a friend', 'the teacher', 'Coach'];
    function choicesFor(ans, spread) {
      const set = new Set([ans]); const sp = spread || Math.max(2, Math.round(ans * 0.15));
      const cand = [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, ans + sp, ans - sp];
      for (const c of cand.sort(() => Math.random() - 0.5)) { if (set.size >= 4) break; if (c >= 0 && c !== ans) set.add(c); }
      let n = 3; while (set.size < 4) set.add(ans + n++);
      return [...set].sort(() => Math.random() - 0.5);
    }
    const emoRow = (n, e) => `<div class="memo">${Array.from({ length: n }, () => `<span>${e}</span>`).join('')}</div>`;
    const countUp = (a, b) => (b <= 6 ? `Start at <b>${a}</b> and count up <b>${b}</b>: ${Array.from({ length: b }, (_, i) => a + i + 1).slice(0, 3).join(', ')}${b > 3 ? '…' : ''}` : `Add the tens first, then the ones. ${a} + ${b - (b % 10)} = ${a + b - (b % 10)}, then add ${b % 10} more.`);
    const countBack = (a, b) => (b <= 6 ? `Start at <b>${a}</b> and count back <b>${b}</b>: ${Array.from({ length: Math.min(b, 3) }, (_, i) => a - i - 1).join(', ')}${b > 3 ? '…' : ''}` : `Take away the tens first: ${a} − ${b - (b % 10)} = ${a - b + (b % 10)}, then take away ${b % 10} more.`);
    const skip = (a, b) => `${a} × ${b} means <b>${a} groups of ${b}</b>. Skip count by ${b}s: ${Array.from({ length: Math.min(a, 4) }, (_, i) => b * (i + 1)).join(', ')}${a > 4 ? '…' : ''}`;
    function add(max) { const a = ri(1, max - 1), b = ri(1, max - a); return { q: `${a} + ${b} = ?`, ans: a + b, hint: countUp(a, b) }; }
    function sub(max) { const a = ri(2, max), b = ri(1, a - 1); return { q: `${a} − ${b} = ?`, ans: a - b, hint: countBack(a, b) }; }
    function mul(tables, upto) { const b = pick(tables), a = ri(1, upto || 10); return { q: `${a} × ${b} = ?`, ans: a * b, hint: skip(a, b) }; }
    function bigger(max) { let a = ri(1, max), b = ri(1, max); while (b === a) b = ri(1, max); return { q: `Which number is <b>BIGGER</b>?`, big: true, ans: Math.max(a, b), choices: [a, b], hint: `Bigger means <b>more</b>. Count up from 1: which number do you reach last?` }; }
    function counting(max) { const n = ri(2, max), e = pick(EMO); return { q: `How many ${e} can you count?${emoRow(n, e)}`, ans: n, hint: 'Touch each one with your finger and count slowly: 1, 2, 3…', spread: 2 }; }
    function addPics() { const a = ri(1, 5), b = ri(1, 5), e = pick(EMO); return { q: `${a} + ${b} = ?<div class="memo">${Array.from({ length: a }, () => `<span>${e}</span>`).join('')}<span class="plus">+</span>${Array.from({ length: b }, () => `<span>${e}</span>`).join('')}</div>`, ans: a + b, hint: `Count all of the ${e} together!` }; }
    function word(kind, name) {
      const [one, many] = pick(THINGS); const fr = pick(FRIENDS);
      if (kind === 'add') { const a = ri(5, 40), b = ri(3, 30); return { q: `${name} has <b>${a}</b> ${many}. ${fr[0].toUpperCase() + fr.slice(1)} gives ${name} <b>${b}</b> more. How many ${many} now?`, ans: a + b, hint: `"More" means add: ${a} + ${b}. ${countUp(a, b)}`, word: true }; }
      if (kind === 'sub') { const a = ri(15, 60), b = ri(3, a - 5); return { q: `There are <b>${a}</b> ${many}. ${name} gives away <b>${b}</b>. How many are left?`, ans: a - b, hint: `"Left" means take away: ${a} − ${b}. ${countBack(a, b)}`, word: true }; }
      const a = ri(2, 6), b = ri(2, 10); return { q: `${name} has <b>${a}</b> boxes with <b>${b}</b> ${many} in each box. How many ${many} in all?`, ans: a * b, hint: `${a} boxes of ${b}: ${skip(a, b)}`, word: true };
    }
    function gen(lvl, name) {
      switch (lvl) {
        case 1: return Math.random() < 0.55 ? counting(10) : bigger(10);
        case 2: return pick([add.bind(null, 10), add.bind(null, 10), addPics, () => bigger(20), () => counting(12)])();
        case 3: return pick([() => add(20), () => add(20), () => sub(10), () => sub(10), () => bigger(50)])();
        case 4: return pick([() => add(50), () => sub(50), () => mul([2, 5, 10], 10)])();
        case 5: return pick([() => add(100), () => sub(100), () => mul([1, 2, 3, 4, 5], 10), () => mul([2, 3, 4, 5], 10)])();
        case 6: return pick([() => mul([2, 3, 4, 5, 6, 7, 8, 9, 10], 10), () => mul([3, 4, 6, 7, 8, 9], 10), () => word('add', name), () => word('sub', name), () => add(100), () => sub(100)])();
        case 7: return pick([() => { const a = ri(5, 40), b = ri(3, 40); return { q: `${a} + <b class="blank">?</b> = ${a + b}`, ans: b, hint: `Think: start at ${a}. How many more to get to ${a + b}?` }; },
          () => { const a = ri(2, 10), b = ri(2, 10); return { q: `<b class="blank">?</b> × ${b} = ${a * b}`, ans: a, hint: `How many groups of ${b} make ${a * b}? Count by ${b}s.` }; },
          () => word('mul', name), () => mul([6, 7, 8, 9], 10), () => word('sub', name)])();
        default: return pick([() => { const b = ri(2, 10), a = ri(2, 10); return { q: `${a * b} ÷ ${b} = ?`, ans: a, hint: `How many groups of ${b} fit in ${a * b}? Count by ${b}s until you reach ${a * b}.` }; },
          () => { const a = ri(10, 50), b = ri(5, 30), c = ri(2, Math.min(20, a + b - 1)); return { q: `${a} + ${b} − ${c} = ?`, ans: a + b - c, hint: `Do it in two steps: first ${a} + ${b} = ${a + b}, then take away ${c}.` }; },
          () => word('mul', name), () => mul([6, 7, 8, 9, 10], 12)])();
      }
    }
    let last = null, curProb = null;
    function showBreak(onSolved, onBack) {
      const P0 = prof(), r = gradeRange(P0.grade);
      P0.mathLvl = Math.max(r[0], Math.min(r[1], P0.mathLvl || r[0]));
      let prob = gen(P0.mathLvl, esc(P0.name)), guard = 0;
      while (last && prob.q === last && guard++ < 5) prob = gen(P0.mathLvl, esc(P0.name));
      last = prob.q; curProb = prob;
      const choices = prob.choices || choicesFor(prob.ans, prob.spread);
      let tries = 0, typed = '', solved = false;
      const box = modal(`<div class="math" style="--pc:${P0.color}">
        <div class="mtitle"><span class="mav" style="background:${P0.color}">${P0.avatar}</span> Math Break!</div>
        <div class="msub">Solve it to unlock your next picture, ${esc(P0.name)}!</div>
        <div class="mq ${prob.word ? 'wordq' : ''}">${prob.q}</div>
        <div class="mfeed" id="mfeed"></div>
        <div class="mchoices ${prob.big ? 'two' : ''}">${choices.map((c) => `<button class="mch" data-a="${c}">${c}</button>`).join('')}</div>
        <div class="mtype hidden" id="mtype"><div class="gate-ans" id="mans">&nbsp;</div>${keypadHTML()}</div>
        <div class="btns"><button class="bigbtn small sun" data-mm="type">🔢 Type the answer</button><button class="bigbtn small ghost" data-mm="back">🎨 Back to coloring</button></div></div>`, () => { if (!solved) { saveMeta(); if (onBack) onBack(); else if (current === 'play' && Play._state().done) show(Play.from || 'home'); else if (current === 'home') renderLibrary(); } });
      function check(v) {
        if (solved) return;
        if (v === prob.ans) {
          solved = true; const first = tries === 0;
          if (first) { P0.mathStreak = (P0.mathStreak || 0) + 1; P0.mathMiss = 0; } 
          let up = false;
          if (P0.mathStreak >= 3 && P0.mathLvl < r[1]) { P0.mathLvl++; P0.mathStreak = 0; up = true; }
          const pts = 5 + (first ? 5 : 0); P0.stars = (P0.stars || 0) + 1; P0.mathDue = false; P0.mathCount = 0;
          stats.math = (stats.math || 0) + 1; saveStats(); addXP(pts); saveMeta();
          const fresh = checkStickers(); SND.win(); confetti();
          box.innerHTML = `<div class="math ok" style="--pc:${P0.color}"><div class="mbig">🎉</div><h2>${first ? 'Correct! First try!' : 'You got it!'}</h2>
            <div class="earned">+${pts} points · ⭐ +1 star</div>${up ? '<div class="newst">🧠 Math level up! Trickier problems next time.</div>' : ''}
            ${fresh.map((s) => `<div class="newst">New sticker! <span>${s.e}</span> ${s.t}</div>`).join('')}
            <button class="bigbtn mint" data-mm="go">🎨 Next picture!</button></div>`;
          return;
        }
        if (tries === 0) { P0.mathStreak = 0; P0.mathMiss = (P0.mathMiss || 0) + 1; if (P0.mathMiss >= 2 && P0.mathLvl > r[0]) { P0.mathLvl--; P0.mathMiss = 0; } saveMeta(); }
        tries++; SND.oops();
        const b = $(`.mch[data-a="${v}"]`, box); if (b) { b.classList.add('no'); b.disabled = true; }
        const f = $('#mfeed'); f.innerHTML = `<div class="tryagain">Try again! 💪</div><div class="mhint">💡 ${prob.hint}</div>`; f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
        typed = ''; const ma = $('#mans'); if (ma) ma.innerHTML = '&nbsp;';
      }
      box.onclick = (e) => {
        const c = e.target.closest('.mch'); if (c && !c.disabled) { SND.tap(); return check(+c.dataset.a); }
        const m = e.target.closest('[data-mm]');
        if (m) {
          if (m.dataset.mm === 'type') { $('#mtype').classList.toggle('hidden'); return; }
          if (m.dataset.mm === 'back') { closeModal(); return; }
          if (m.dataset.mm === 'go') { modal.onClose = null; closeModal(); if (pendingLevel) { const lv = pendingLevel; pendingLevel = null; levelUpModal(lv, () => onSolved && onSolved()); } else if (onSolved) onSolved(); return; }
        }
        const k = e.target.closest('[data-k]'); if (!k) return; const v = k.dataset.k;
        if (v === 'C') typed = typed.slice(0, -1); else if (v === 'OK') { if (typed !== '') check(+typed); return; } else if (typed.length < 4) typed += v;
        const ma = $('#mans'); if (ma) ma.innerHTML = typed || '&nbsp;';
      };
    }
    return { show: showBreak, gen, current: () => curProb };
  })();

  // ---------- boot ----------
  applySound(); applyHelpers(); applyTheme();
  show(HUB && meta.profiles.length === 1 ? 'home' : 'who');
  if (!meta.pinHash && !meta.pinAsked) setTimeout(() => { if (!meta.pinHash && !meta.pinAsked && $('#modal').classList.contains('hidden')) setPinFlow(null, true); }, 400);
  document.addEventListener('pointerdown', () => audio(), { once: true });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const hadController = !!navigator.serviceWorker.controller; let reloaded = false;
    // when a new version (v2) takes over, reload once so the new files are used
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController || reloaded) return; reloaded = true; try { Play.save(); } catch (e) {} location.reload(); });
    navigator.serviceWorker.register('sw.js').then((r) => { try { r.update(); } catch (e) {} }).catch(() => {});
  }
  window.__app = { Play, Photo, Draw, MathBreak, builtins, byId, show, stats: () => stats, meta: () => meta, prof, levelInfo, tier, isLocked, needLevel, switchProfile, checkPin, curLevel };
})();
