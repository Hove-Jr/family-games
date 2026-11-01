// Steel Bolt Rush — an original endless runner for little drivers.
(() => {
'use strict';
const LS = 'steelbolt.';
const HUB = window.HubSave && window.HubSave.inHub ? window.HubSave : null;
const KID = (HUB && HUB.profile && HUB.profile.name) || 'Archer';
const store = {
  get(k, d) { try { const v = localStorage.getItem(LS + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) {} }
};

// ---------- Truck colors ----------
const COLORS = [
  { id: 'steel',  name: 'Steel',  cost: 0,    body: ['#f4f7fa', '#b7c0c9', '#8b96a1'] },
  { id: 'red',    name: 'Red',    cost: 40,   body: ['#ff8a80', '#e53935', '#a31f1b'] },
  { id: 'blue',   name: 'Blue',   cost: 120,  body: ['#8fd0ff', '#2b8cff', '#1856b3'] },
  { id: 'green',  name: 'Green',  cost: 250,  body: ['#a6f5a0', '#34c759', '#1c8a3a'] },
  { id: 'purple', name: 'Purple', cost: 400,  body: ['#e2b6ff', '#a259ff', '#6a2bb8'] },
  { id: 'gold',   name: 'Gold',   cost: 650,  body: ['#fff3a6', '#ffcc33', '#c98f00'] },
  { id: 'rainbow',name: 'Rainbow',cost: 1000, body: null }
];
let bank = store.get('bank', 0);          // lifetime coins (unlock progress)
let best = store.get('best', 0);
let colorId = store.get('color', 'steel');
let muted = store.get('muted', false);
const unlocked = c => bank >= c.cost;

// ---------- Audio ----------
let actx = null, master = null, musicGain = null, musicTimer = null, nextNote = 0, noteIdx = 0;
function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  actx = new AC();
  master = actx.createGain(); master.gain.value = muted ? 0 : 0.6; master.connect(actx.destination);
  musicGain = actx.createGain(); musicGain.gain.value = 0.12; musicGain.connect(master);
}
function tone(freq, dur, type = 'sine', vol = 0.3, slideTo = null, delay = 0, dest = null) {
  if (!actx || muted) return;
  const t = actx.currentTime + delay;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  coin()    { tone(1320, 0.08, 'square', 0.12); tone(1760, 0.12, 'square', 0.12, null, 0.06); },
  battery() { [880, 1108, 1320, 1760].forEach((f, i) => tone(f, 0.1, 'triangle', 0.2, null, i * 0.05)); },
  power()   { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.14, 'triangle', 0.22, null, i * 0.07)); },
  jump()    { tone(300, 0.3, 'sine', 0.3, 900); },
  ramp()    { tone(250, 0.5, 'triangle', 0.3, 1200); },
  duck()    { tone(500, 0.18, 'sine', 0.2, 220); },
  lane()    { tone(660, 0.05, 'sine', 0.08); },
  bump()    { tone(320, 0.35, 'sine', 0.4, 90); tone(600, 0.15, 'triangle', 0.15, 300, 0.05); },
  shield()  { tone(900, 0.25, 'sine', 0.25, 1800); },
  pop()     { tone(700, 0.12, 'square', 0.12, 1400); },
  over()    { [784, 659, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.22, null, i * 0.13)); },
  unlock()  { [523, 784, 1046, 1568].forEach((f, i) => tone(f, 0.25, 'triangle', 0.25, null, i * 0.1)); }
};
// cheerful little music loop (C major pentatonic)
const MELODY = [523,659,784,659, 880,784,659,523, 587,659,784,880, 784,659,587,0,
                523,659,784,1046, 880,784,659,784, 587,523,587,659, 523,0,392,0];
const BASS = [131,131,196,196, 220,220,196,196, 147,147,196,196, 131,131,98,98];
function musicTick() {
  if (!actx) return;
  const step = 0.2;
  while (nextNote < actx.currentTime + 0.3) {
    const f = MELODY[noteIdx % MELODY.length];
    if (!muted && f) tone(f, 0.16, 'triangle', 0.5, null, nextNote - actx.currentTime, musicGain);
    if (!muted && noteIdx % 2 === 0) tone(BASS[(noteIdx / 2) % BASS.length], 0.3, 'sine', 0.7, null, nextNote - actx.currentTime, musicGain);
    nextNote += step; noteIdx++;
  }
}
function startMusic() { if (!actx || musicTimer) return; nextNote = actx.currentTime + 0.1; musicTimer = setInterval(musicTick, 100); }
function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
function setMuted(m) {
  muted = m; store.set('muted', m);
  $('muteBtn').textContent = m ? '🔇' : '🔊';
  if (master) master.gain.value = m ? 0 : 0.6;
}

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
// camera / projection
const LANE_W = 3, ROAD_HALF = 4.6, Z_PLAYER = 6, Z_FAR = 150;
let horizon, yPlayer, camH, focal;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  horizon = H * 0.38;
  yPlayer = H * (W > H ? 0.74 : 0.76);
  const laneOffsetPx = Math.min(W * 0.25, H * 0.33);
  focal = laneOffsetPx * Z_PLAYER / LANE_W;
  camH = (yPlayer - horizon) * Z_PLAYER / focal;
  buildBackdrop();
}
// project a world point (x, height y, depth z) -> screen
function proj(x, y, z) { const s = focal / z; return { x: W / 2 + (x - camX * 0.6) * s, y: horizon + (camH - y) * s, s }; }

// ---------- Backdrop (pre-rendered skyline) ----------
let backdrop = null;
function buildBackdrop() {
  backdrop = document.createElement('canvas');
  backdrop.width = Math.round(W * DPR); backdrop.height = Math.round(horizon * DPR + 2);
  const b = backdrop.getContext('2d'); b.scale(DPR, DPR);
  const g = b.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, '#47a6ff'); g.addColorStop(1, '#bfe6ff');
  b.fillStyle = g; b.fillRect(0, 0, W, horizon + 1);
  // sun
  b.fillStyle = '#fff3a6'; b.beginPath(); b.arc(W * 0.82, horizon * 0.35, horizon * 0.13, 0, 7); b.fill();
  b.fillStyle = 'rgba(255,243,166,.35)'; b.beginPath(); b.arc(W * 0.82, horizon * 0.35, horizon * 0.2, 0, 7); b.fill();
  // far hills
  b.fillStyle = '#9fd99a';
  b.beginPath(); b.moveTo(0, horizon);
  for (let x = 0; x <= W; x += 20) b.lineTo(x, horizon - 18 - 14 * Math.sin(x * 0.012) - 8 * Math.sin(x * 0.031));
  b.lineTo(W, horizon); b.fill();
  // futuristic skyline
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cols = ['#7fb2e5', '#93c1ee', '#6aa1db', '#a9cdf2'];
  for (let x = -10; x < W; ) {
    const w = 18 + rnd() * 34, h = horizon * (0.12 + rnd() * 0.32);
    b.fillStyle = cols[(rnd() * cols.length) | 0];
    if (rnd() < 0.25) { // dome tower
      b.fillRect(x, horizon - h, w, h);
      b.beginPath(); b.arc(x + w / 2, horizon - h, w / 2, Math.PI, 0); b.fill();
    } else if (rnd() < 0.3) { // spire
      b.fillRect(x, horizon - h, w, h);
      b.beginPath(); b.moveTo(x + w * 0.3, horizon - h); b.lineTo(x + w / 2, horizon - h - 26); b.lineTo(x + w * 0.7, horizon - h); b.fill();
    } else b.fillRect(x, horizon - h, w, h);
    b.fillStyle = 'rgba(255,255,255,.35)';
    for (let wy = horizon - h + 6; wy < horizon - 6; wy += 9) for (let wx = x + 4; wx < x + w - 4; wx += 7) if (rnd() < 0.5) b.fillRect(wx, wy, 3, 4);
    x += w + 2 + rnd() * 6;
  }
}
const clouds = Array.from({ length: 5 }, (_, i) => ({ x: Math.random(), y: 0.08 + Math.random() * 0.4, s: 0.6 + Math.random() * 0.7, v: 0.004 + Math.random() * 0.006 }));

// ---------- Game state ----------
const S = { mode: 'title', t: 0, speed: 0, dist: 0, score: 0, coins: 0, hearts: 3, inv: 0,
  lane: 0, x: 0, y: 0, vy: 0, duck: 0, tilt: 0, shield: 0, magnet: 0, turbo: 0,
  nextSpawn: 0, objs: [], parts: [], scen: [], scenNext: 0, stripe: 0, overT: 0, shake: 0, popups: [] };
let camX = 0;
const POWER_TIME = { shield: 12, magnet: 10, turbo: 5 };
function resetRun() {
  Object.assign(S, { t: 0, speed: 11, dist: 0, score: 0, coins: 0, hearts: 3, inv: 0, lane: 0, x: 0, y: 0, vy: 0,
    duck: 0, tilt: 0, shield: 0, magnet: 0, turbo: 0, nextSpawn: 45, objs: [], parts: [], popups: [], overT: 0, shake: 0, onRamp: false });
  S.scen = []; S.scenNext = 0;
  for (let z = 4; z < Z_FAR; z += 9) addScenery(z);
}
function baseSpeed() { // gentle ramp: 11 -> 24 over ~3 minutes
  return 11 + 13 * Math.min(1, S.t / 180);
}
function difficulty() { return Math.min(1, S.t / 150); }

// ---------- Spawning ----------
const CAR_COLORS = ['#ff6b6b', '#ffb547', '#4ecdc4', '#a259ff', '#ff8fd1', '#5aa9ff', '#7bd389'];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
function laneX(l) { return l * LANE_W; }
function spawnRow(z) {
  const d = difficulty();
  const lanes = [-1, 0, 1].sort(() => Math.random() - 0.5);
  const nBlock = Math.random() < 0.15 + d * 0.45 ? 2 : 1;
  const free = lanes.slice(nBlock);
  for (let i = 0; i < nBlock; i++) {
    const l = lanes[i], r = Math.random();
    if (r < 0.12 + d * 0.08 && S.t > 20) {
      // ramp + coin arc over a parked car
      S.objs.push({ type: 'ramp', x: laneX(l), z, len: 3 });
      S.objs.push({ type: 'car', x: laneX(l), z: z + 6, len: 4, h: 1.5, col: pick(CAR_COLORS), v: 0 });
      for (let k = 0; k < 6; k++) S.objs.push({ type: 'coin', x: laneX(l), z: z + 2 + k * 2.2, y: 1.2 + 3.4 * Math.sin(Math.PI * (k + 0.5) / 6) });
    } else if (r < 0.22 + d * 0.1 && S.t > 45) {
      S.objs.push({ type: 'bar', x: laneX(l), z, len: 1, h: 2.2 }); // low sign: duck under
    } else if (r < 0.42) {
      S.objs.push({ type: 'cone', x: laneX(l), z, len: 1, h: 0.9 });
      if (Math.random() < 0.6) for (let k = 0; k < 3; k++) S.objs.push({ type: 'coin', x: laneX(l), z: z - 2 + k * 2, y: 1 + 1.6 * Math.sin(Math.PI * (k + 0.5) / 3) });
    } else if (r < 0.85 || d < 0.3) {
      S.objs.push({ type: 'car', x: laneX(l), z, len: 4, h: 1.5, col: pick(CAR_COLORS), v: rnd(2, 5) });
    } else {
      S.objs.push({ type: 'bus', x: laneX(l), z, len: 8, h: 3.2, col: pick(['#ffd23f', '#4ecdc4', '#ff8fd1']), v: rnd(2, 4) });
    }
  }
  // coins line in a free lane
  const fl = pick(free);
  if (Math.random() < 0.8) {
    const n = 4 + ((Math.random() * 5) | 0);
    const battery = Math.random() < 0.15;
    for (let k = 0; k < n; k++) S.objs.push({ type: battery && k === n - 1 ? 'battery' : 'coin', x: laneX(fl), z: z - 6 + k * 2.4, y: 0.9 });
  }
  // power-up
  if (Math.random() < 0.09 && S.t > 8) {
    const fl2 = pick(free);
    S.objs.push({ type: 'power', kind: pick(['shield', 'magnet', 'turbo']), x: laneX(fl2), z: z + 10, y: 1.2 });
  }
}
function addScenery(z) {
  for (const side of [-1, 1]) {
    const r = Math.random();
    const kind = r < 0.45 ? 'tree' : r < 0.75 ? 'bldg' : 'lamp';
    S.scen.push({ kind, side, x: side * (ROAD_HALF + (kind === 'bldg' ? rnd(4, 7) : rnd(1.5, 3))), z: z + rnd(-2, 2),
      h: kind === 'bldg' ? rnd(6, 14) : kind === 'tree' ? rnd(3, 4.5) : 4.5, w: kind === 'bldg' ? rnd(4, 7) : 2,
      col: pick(['#ffd6a5', '#caffbf', '#9bf6ff', '#bdb2ff', '#ffc6ff', '#fdffb6']) });
  }
}

// ---------- Input ----------
function moveLane(dir) {
  if (S.mode !== 'play') return;
  const nl = Math.max(-1, Math.min(1, S.lane + dir));
  if (nl !== S.lane) { S.lane = nl; S.tilt = dir; sfx.lane(); }
}
function jump() {
  if (S.mode !== 'play') return;
  if (S.y <= 0.01) { S.vy = 11.5; S.duck = 0; sfx.jump(); }
}
function duck() {
  if (S.mode !== 'play') return;
  if (S.y > 0.2) { S.vy = Math.min(S.vy, -16); } // fast drop
  S.duck = 0.85; sfx.duck();
}
let touch0 = null;
cv.addEventListener('touchstart', e => { initAudio(); const t = e.changedTouches[0]; touch0 = { x: t.clientX, y: t.clientY, done: false }; e.preventDefault(); }, { passive: false });
cv.addEventListener('touchmove', e => {
  if (!touch0 || touch0.done) return;
  const t = e.changedTouches[0], dx = t.clientX - touch0.x, dy = t.clientY - touch0.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 28) { swipe(dx, dy); touch0.done = true; }
  e.preventDefault();
}, { passive: false });
cv.addEventListener('touchend', e => {
  if (touch0 && !touch0.done) {
    const t = e.changedTouches[0], dx = t.clientX - touch0.x, dy = t.clientY - touch0.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) swipe(dx, dy);
    else if (S.mode === 'play') { // tap: left/right half changes lane
      moveLane(t.clientX < W / 2 ? -1 : 1);
    }
  }
  touch0 = null; e.preventDefault();
}, { passive: false });
function swipe(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) moveLane(dx > 0 ? 1 : -1);
  else if (dy < 0) jump(); else duck();
}
// mouse swipes for desktop testing
let m0 = null;
cv.addEventListener('mousedown', e => { initAudio(); m0 = { x: e.clientX, y: e.clientY }; });
cv.addEventListener('mouseup', e => { if (!m0) return; const dx = e.clientX - m0.x, dy = e.clientY - m0.y; if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) swipe(dx, dy); m0 = null; });
window.addEventListener('keydown', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a') moveLane(-1);
  else if (k === 'ArrowRight' || k === 'd') moveLane(1);
  else if (k === 'ArrowUp' || k === 'w' || k === ' ') jump();
  else if (k === 'ArrowDown' || k === 's') duck();
  else if (k === 'Enter' && S.mode !== 'play') startGame();
  else return;
  e.preventDefault();
});
function bindBtn(id, fn) {
  const el = $(id);
  const h = e => { e.preventDefault(); e.stopPropagation(); initAudio(); fn(); };
  el.addEventListener('touchstart', h, { passive: false });
  el.addEventListener('mousedown', h);
  el.addEventListener('click', e => e.preventDefault());
}
bindBtn('btnLeft', () => moveLane(-1));
bindBtn('btnRight', () => moveLane(1));
bindBtn('btnUp', jump);
bindBtn('btnDown', duck);
bindBtn('playBtn', startGame);
bindBtn('againBtn', startGame);
bindBtn('garageBtn', openGarage);
bindBtn('garageDone', goHome);
bindBtn('muteBtn', () => setMuted(!muted));
bindBtn('pauseBtn', pause);
bindBtn('resumeBtn', resume);
bindBtn('homeBtn', goHome);
bindBtn('overHome', goHome);
if (HUB) { $('hubExit').classList.remove('hidden'); bindBtn('hubExit', () => { stopMusic(); HUB.exit(); }); }
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'play') pause(); });

// ---------- Screens ----------
function show(id) { for (const s of ['title', 'garage', 'paused', 'over']) $(s).classList.toggle('hidden', s !== id); }
function startGame() {
  initAudio(); resetRun(); S.mode = 'play'; show(null);
  $('hud').classList.remove('hidden'); $('controls').classList.remove('hidden');
  startMusic(); updateHud();
}
function pause() { if (S.mode !== 'play') return; S.mode = 'pause'; show('paused'); stopMusic(); }
function resume() { S.mode = 'play'; show(null); startMusic(); last = performance.now(); }
function goHome() {
  resetRun(); S.mode = 'title'; stopMusic(); show('title');
  $('hud').classList.add('hidden'); $('controls').classList.add('hidden');
  $('bestTitle').textContent = best; $('bankTitle').textContent = bank;
  drawTruckPreview($('titleTruck'));
}
function openGarage() { S.mode = 'title'; show('garage'); renderSwatches(); }
function renderSwatches() {
  const box = $('swatches'); box.innerHTML = '';
  $('bankGarage').textContent = bank;
  for (const c of COLORS) {
    const b = document.createElement('button');
    b.className = 'sw' + (c.id === colorId ? ' sel' : '') + (unlocked(c) ? '' : ' locked');
    b.style.background = c.body ? `linear-gradient(${c.body[0]},${c.body[1]} 60%,${c.body[2]})` : 'linear-gradient(135deg,#ff6b6b,#ffd23f,#4ee06b,#2b8cff,#a259ff)';
    b.textContent = unlocked(c) ? '' : '🪙' + c.cost;
    const h = e => { e.preventDefault(); initAudio(); if (unlocked(c)) { colorId = c.id; store.set('color', colorId); sfx.coin(); renderSwatches(); } else sfx.bump(); };
    b.addEventListener('touchstart', h, { passive: false }); b.addEventListener('mousedown', h);
    box.appendChild(b);
  }
  drawTruckPreview($('garageTruck'));
}
function gameOver() {
  S.mode = 'over'; stopMusic(); sfx.over();
  const final = Math.floor(S.score);
  const before = bank;
  bank += S.coins; store.set('bank', bank);
  const isBest = final > best; if (isBest) { best = final; store.set('best', best); }
  $('finalScore').textContent = final; $('finalCoins').textContent = S.coins;
  $('newBest').classList.toggle('hidden', !isBest);
  const newly = COLORS.filter(c => c.cost > before && c.cost <= bank);
  $('unlockMsg').innerHTML = newly.length ? '🎉 New truck color! ' + newly.map(c => swatchDot(c)).join(' ') : '';
  if (newly.length) setTimeout(sfx.unlock, 900);
  $('overMsg').textContent = pick(['Great driving, ', 'Wow, ', 'Super job, ', 'Awesome, ']) + KID + '!';
  $('controls').classList.add('hidden');
  show('over');
}
function swatchDot(c) {
  const bg = c.body ? c.body[1] : 'linear-gradient(135deg,#ff6b6b,#ffd23f,#4ee06b,#2b8cff)';
  return `<span style="display:inline-block;width:34px;height:34px;border-radius:50%;vertical-align:middle;border:3px solid #fff;background:${bg}"></span>`;
}

// ---------- Update ----------
function hit(o) {
  if (S.turbo > 0) { // turbo bumps traffic aside happily
    o.dead = true; burst(o, ['#ffd23f', '#fff', '#4ee06b'], 14); sfx.pop(); S.score += 25; return;
  }
  if (S.inv > 0) return;
  if (S.shield > 0) {
    S.shield = 0; o.dead = true; burst(o, ['#8fd0ff', '#fff'], 18); sfx.shield(); S.inv = 1; popup('🛡️'); return;
  }
  S.hearts--; S.inv = 2.0; S.shake = 0.35; S.speed *= 0.6;
  o.dead = true; burst(o, ['#ffd23f', '#ff8fd1', '#fff', '#8fd0ff'], 22);
  sfx.bump(); popup(pick(['Boing!', 'Oops!', 'Bonk!']));
  updateHud();
  if (S.hearts <= 0) { S.overT = 1.1; }
}
function burst(o, cols, n) {
  for (let i = 0; i < n; i++) S.parts.push({ x: o.x + rnd(-1, 1), y: rnd(0.5, 2), z: o.z, vx: rnd(-6, 6), vy: rnd(4, 11), vz: rnd(-3, 6),
    life: rnd(0.6, 1.1), col: pick(cols), star: Math.random() < 0.5 });
}
function popup(txt) { S.popups.push({ txt, t: 0 }); }
function collect(o) {
  o.dead = true;
  if (o.type === 'coin') { S.coins++; S.score += 10; sfx.coin(); }
  else if (o.type === 'battery') { S.coins += 5; S.score += 50; sfx.battery(); popup('⚡+5'); }
  else if (o.type === 'power') { S[o.kind] = POWER_TIME[o.kind]; sfx.power(); popup({ shield: '🛡️ Shield!', magnet: '🧲 Magnet!', turbo: '🚀 Turbo!' }[o.kind]); }
  updateHud();
}
function update(dt) {
  S.t += dt;
  const target = baseSpeed() * (S.turbo > 0 ? 1.7 : 1) * (S.duck > 0 ? 1.12 : 1);
  S.speed += (target - S.speed) * Math.min(1, dt * 1.5);
  const dz = S.speed * dt;
  S.dist += dz; S.score += dz * 0.5;
  S.stripe = (S.stripe + dz) % 8;

  // player
  const tx = laneX(S.lane);
  S.x += (tx - S.x) * Math.min(1, dt * 12);
  S.tilt *= Math.pow(0.02, dt);
  S.vy -= 30 * dt; S.y += S.vy * dt;
  if (S.y < 0) { S.y = 0; S.vy = 0; }
  S.duck = Math.max(0, S.duck - dt);
  for (const k of ['shield', 'magnet', 'turbo']) S[k] = Math.max(0, S[k] - dt);
  S.inv = Math.max(0, S.inv - dt); S.shake = Math.max(0, S.shake - dt);
  camX += (S.x - camX) * Math.min(1, dt * 5);

  // spawn
  S.nextSpawn -= dz;
  while (S.nextSpawn <= 0) {
    spawnRow(Z_FAR - 5 + S.nextSpawn);
    S.nextSpawn += 34 - 14 * difficulty() + rnd(-3, 4);
  }
  S.scenNext -= dz;
  while (S.scenNext <= 0) { addScenery(Z_FAR + S.scenNext); S.scenNext += 9; }

  // objects
  for (const o of S.objs) {
    o.z -= dz - (o.v || 0) * dt;
    if (o.dead) continue;
    const dzP = o.z - Z_PLAYER;
    const near = Math.abs(o.x - S.x) < 1.5;
    if (o.type === 'coin' || o.type === 'battery' || o.type === 'power') {
      if (S.magnet > 0 && o.type !== 'power' && dzP < 30 && dzP > -2) { // pull toward truck
        o.x += (S.x - o.x) * Math.min(1, dt * 8); o.y += (S.y + 1 - o.y) * Math.min(1, dt * 8);
        o.z -= Math.max(0, dzP) * Math.min(1, dt * 6);
      }
      const reach = S.turbo > 0 ? 2.2 : 1.5;
      if (Math.abs(dzP) < 1.6 && Math.abs(o.x - S.x) < reach && Math.abs((o.y || 1) - (S.y + 0.9)) < 2.0) collect(o);
    } else if (o.type === 'ramp') {
      if (dzP < 1 && dzP > -o.len && near && S.y < 0.5) { S.vy = 15.5; S.y = 0.3; if (!o.used) { sfx.ramp(); o.used = true; } }
    } else {
      // forgiving hitbox: overlap shrunk
      // forgiving hitbox: only the truck's nose vs the obstacle's back, narrow lane check
      if (dzP > 0.4 && dzP < 2.8 && Math.abs(o.x - S.x) < 1.35) {
        if (o.type === 'bar') { if (S.duck <= 0) hit(o); }
        else if (S.y < o.h * 0.75) hit(o);
      }
    }
  }
  S.objs = S.objs.filter(o => o.z > -6 && !o.dead);
  for (const s of S.scen) s.z -= dz;
  S.scen = S.scen.filter(s => s.z > 0.8);
  for (const p of S.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 20 * dt; p.z += p.vz * dt - dz * 0.3; p.life -= dt; }
  S.parts = S.parts.filter(p => p.life > 0 && p.z > 1);
  for (const p of S.popups) p.t += dt;
  S.popups = S.popups.filter(p => p.t < 1.2);
  if (S.overT > 0) { S.overT -= dt; if (S.overT <= 0) gameOver(); }
}

// ---------- Drawing ----------
function roadEdge(z) { return proj(0, 0, z); }
function drawWorld() {
  ctx.drawImage(backdrop, 0, 0, W, horizon + 1);
  // clouds
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  for (const c of clouds) {
    c.x = (c.x + c.v * (S.mode === 'play' ? 0.016 : 0.008)) % 1.2;
    const x = (c.x - 0.1) * W, y = c.y * horizon, r = 22 * c.s * (H / 800 + 0.4);
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.arc(x + r, y - r * 0.4, r * 1.1, 0, 7); ctx.arc(x + r * 2, y, r * 0.9, 0, 7); ctx.fill();
  }
  // ground
  ctx.fillStyle = '#6fd36b'; ctx.fillRect(0, horizon, W, H - horizon);
  // grass stripes for speed feel
  ctx.fillStyle = '#62c55f';
  for (let k = 0; k < 20; k++) {
    const z1 = Z_PLAYER - 5 + k * 8 - S.stripe, z2 = z1 + 4;
    if (z1 < 1) continue;
    const a = proj(0, 0, Math.max(1, z1)), b = proj(0, 0, z2);
    ctx.fillRect(0, b.y, W, a.y - b.y);
  }
  // road & curbs
  const zNear = 0.9;
  const n = proj(0, 0, zNear), f = proj(0, 0, Z_FAR);
  const quad = (hw, col) => {
    const a = proj(-hw, 0, zNear), b = proj(hw, 0, zNear), c = proj(hw, 0, Z_FAR), d = proj(-hw, 0, Z_FAR);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill();
  };
  quad(ROAD_HALF + 1.2, '#e8e2d6');
  quad(ROAD_HALF + 0.35, '#ff6b6b');
  quad(ROAD_HALF, '#5d6676');
  // lane dashes
  ctx.fillStyle = '#fff';
  for (const lx of [-LANE_W / 2, LANE_W / 2]) {
    for (let k = 0; k < 20; k++) {
      const z1 = 1 + k * 8 - S.stripe, z2 = z1 + 3.5;
      if (z2 < 1) continue;
      const a = proj(lx - 0.12, 0, Math.max(1, z1)), b = proj(lx + 0.12, 0, Math.max(1, z1)), c = proj(lx + 0.12, 0, z2), d = proj(lx - 0.12, 0, z2);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill();
    }
  }
  // glowing edge lines (futuristic)
  ctx.strokeStyle = 'rgba(120,230,255,.9)'; ctx.lineWidth = 3;
  for (const s of [-1, 1]) { const a = proj(s * (ROAD_HALF - 0.15), 0, zNear), b = proj(s * (ROAD_HALF - 0.15), 0, Z_FAR); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

  // haze near horizon
  const g = ctx.createLinearGradient(0, horizon, 0, horizon + 40);
  g.addColorStop(0, 'rgba(191,230,255,.9)'); g.addColorStop(1, 'rgba(191,230,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, horizon, W, 40);
  // collect drawables, far to near
  const list = [];
  for (const s of S.scen) list.push({ z: s.z, d: () => drawScen(s) });
  for (const o of S.objs) list.push({ z: o.z + (o.len ? o.len / 2 : 0), d: () => drawObj(o) });
  for (const p of S.parts) list.push({ z: p.z, d: () => drawPart(p) });
  if (S.mode !== 'title') list.push({ z: Z_PLAYER + 1.2, d: drawPlayer });
  list.sort((a, b) => b.z - a.z);
  for (const it of list) it.d();
}
function fogAlpha(z) { return z > Z_FAR - 30 ? Math.max(0, (Z_FAR - z) / 30) : 1; }
function drawScen(s) {
  const p = proj(s.x, 0, s.z); if (p.y < horizon) return;
  ctx.globalAlpha = fogAlpha(s.z);
  const sc = p.s;
  if (s.kind === 'tree') {
    ctx.fillStyle = '#8a5a3b'; ctx.fillRect(p.x - 0.18 * sc, p.y - 1.6 * sc, 0.36 * sc, 1.6 * sc);
    ctx.fillStyle = '#2fae5a'; ctx.beginPath(); ctx.arc(p.x, p.y - s.h * 0.7 * sc, 1.1 * sc, 0, 7); ctx.fill();
    ctx.fillStyle = '#45c86f'; ctx.beginPath(); ctx.arc(p.x - 0.3 * sc, p.y - s.h * 0.78 * sc, 0.6 * sc, 0, 7); ctx.fill();
  } else if (s.kind === 'lamp') {
    ctx.fillStyle = '#9aa7b5'; ctx.fillRect(p.x - 0.08 * sc, p.y - s.h * sc, 0.16 * sc, s.h * sc);
    ctx.fillStyle = '#7ff0ff'; ctx.fillRect(p.x - (s.side > 0 ? 0.9 : -0.1) * sc, p.y - s.h * sc, 0.8 * sc, 0.2 * sc);
  } else {
    const w = s.w * sc, h = s.h * sc, x = p.x - w / 2;
    ctx.fillStyle = s.col; ctx.fillRect(x, p.y - h, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(s.side < 0 ? x + w * 0.75 : x, p.y - h, w * 0.25, h);
    if (sc > 3) {
      ctx.fillStyle = 'rgba(80,140,220,.55)';
      const ww = 0.6 * sc, gap = 1.2 * sc;
      for (let wy = p.y - h + 0.6 * sc; wy < p.y - 1 * sc; wy += gap) for (let wx = x + 0.4 * sc; wx < x + w - ww; wx += gap) ctx.fillRect(wx, wy, ww, 0.6 * sc);
    }
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x, p.y - h, w, 0.25 * sc);
  }
  ctx.globalAlpha = 1;
}
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function shadow(x, z, w) { const p = proj(x, 0, z); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, w * p.s / 2, w * p.s * 0.12, 0, 0, 7); ctx.fill(); }
function drawObj(o) {
  if (o.z < 1 || o.z > Z_FAR) return;
  ctx.globalAlpha = fogAlpha(o.z);
  const t = S.t;
  if (o.type === 'coin' || o.type === 'battery') {
    const p = proj(o.x, o.y, o.z), r = 0.45 * p.s, sq = Math.abs(Math.cos(t * 4 + o.z * 0.3));
    if (o.type === 'coin') {
      ctx.fillStyle = '#e8a400'; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * Math.max(0.2, sq), r, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 0.75 * Math.max(0.15, sq), r * 0.75, 0, 0, 7); ctx.fill();
      if (r > 6) { ctx.fillStyle = '#fff6c2'; ctx.beginPath(); ctx.ellipse(p.x - r * 0.2 * sq, p.y - r * 0.3, r * 0.15 * sq, r * 0.25, 0, 0, 7); ctx.fill(); }
    } else {
      const w = r * 1.3, h = r * 2.2, y = p.y + Math.sin(t * 5) * r * 0.2;
      ctx.fillStyle = '#1fa94a'; rr(p.x - w / 2, y - h / 2, w, h, w * 0.2); ctx.fill();
      ctx.fillStyle = '#4ee06b'; rr(p.x - w / 2 + 3, y - h / 2 + 3, w - 6, h - 6, w * 0.15); ctx.fill();
      ctx.fillStyle = '#c0c0c0'; ctx.fillRect(p.x - w * 0.2, y - h / 2 - h * 0.1, w * 0.4, h * 0.1);
      ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(h * 0.6)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⚡', p.x, y);
    }
  } else if (o.type === 'power') {
    const p = proj(o.x, o.y + Math.sin(t * 3) * 0.2, o.z), r = 0.8 * p.s;
    const col = { shield: '#5aa9ff', magnet: '#ff6b6b', turbo: '#ffb547' }[o.kind];
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.25, 0, 7); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
    ctx.font = `${Math.round(r * 1.2)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText({ shield: '🛡️', magnet: '🧲', turbo: '🚀' }[o.kind], p.x, p.y + r * 0.05);
  } else if (o.type === 'cone') {
    shadow(o.x, o.z, 1.2);
    const p = proj(o.x, 0, o.z), s = p.s;
    ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(p.x - 0.5 * s, p.y); ctx.lineTo(p.x - 0.12 * s, p.y - 1 * s); ctx.lineTo(p.x + 0.12 * s, p.y - 1 * s); ctx.lineTo(p.x + 0.5 * s, p.y); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 0.32 * s, p.y - 0.55 * s, 0.64 * s, 0.16 * s);
    ctx.fillStyle = '#e0631a'; ctx.fillRect(p.x - 0.6 * s, p.y - 0.1 * s, 1.2 * s, 0.1 * s);
  } else if (o.type === 'ramp') {
    const a = proj(o.x - 1.2, 0, o.z), b = proj(o.x + 1.2, 0, o.z), c = proj(o.x + 1.2, 1.2, o.z + o.len), d = proj(o.x - 1.2, 1.2, o.z + o.len);
    const e = proj(o.x - 1.2, 0, o.z + o.len), f = proj(o.x + 1.2, 0, o.z + o.len);
    ctx.fillStyle = '#2b8cff'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill();
    ctx.fillStyle = '#ffd23f';
    for (let k = 0; k < 3; k++) { const z = o.z + o.len * (k + 0.5) / 3, q = proj(o.x, 1.2 * (k + 0.5) / 3, z); ctx.beginPath(); ctx.moveTo(q.x - 0.5 * q.s, q.y + 0.15 * q.s); ctx.lineTo(q.x, q.y - 0.15 * q.s); ctx.lineTo(q.x + 0.5 * q.s, q.y + 0.15 * q.s); ctx.lineWidth = 0.15 * q.s; ctx.strokeStyle = '#ffd23f'; ctx.stroke(); }
    ctx.fillStyle = '#1856b3'; ctx.fillRect(Math.min(b.x, f.x), c.y, 0, 0); void e;
  } else if (o.type === 'bar') {
    // friendly low sign across one lane — duck under
    const l = proj(o.x - 1.6, 0, o.z), r = proj(o.x + 1.6, 0, o.z), s = l.s;
    const top = proj(o.x, 2.9, o.z).y, bot = proj(o.x, 1.7, o.z).y;
    ctx.fillStyle = '#9aa7b5'; ctx.fillRect(l.x - 0.12 * s, top, 0.24 * s, l.y - top); ctx.fillRect(r.x - 0.12 * s, top, 0.24 * s, l.y - top);
    const stripes = 6, w = (r.x - l.x) / stripes;
    for (let k = 0; k < stripes; k++) { ctx.fillStyle = k % 2 ? '#fff' : '#a259ff'; ctx.fillRect(l.x + k * w, top, w + 1, bot - top); }
    ctx.fillStyle = '#ffd23f'; ctx.font = `bold ${Math.round((bot - top) * 0.8)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⬇', (l.x + r.x) / 2, (top + bot) / 2);
  } else if (o.type === 'car' || o.type === 'bus') {
    drawVehicle(o);
  }
  ctx.globalAlpha = 1;
}
function drawVehicle(o) {
  const isBus = o.type === 'bus';
  const w = isBus ? 2.6 : 2.3, h = o.h;
  shadow(o.x, o.z, w * 1.1);
  const back = proj(o.x, 0, o.z), s = back.s;
  const front = proj(o.x, 0, o.z + o.len);
  // roof/top visible (sides receding)
  const bx = back.x - w / 2 * s, by = back.y - h * s;
  const fs = front.s, fx = front.x - w / 2 * fs, fy = front.y - h * fs;
  ctx.fillStyle = shade(o.col, -25);
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(fx, fy); ctx.lineTo(fx + w * fs, fy); ctx.lineTo(bx + w * s, by); ctx.fill();
  // side visible depending on x vs camera
  const side = (o.x - camX * 0.6) > 0 ? 0 : 1; // show inner side
  ctx.fillStyle = shade(o.col, -40);
  if (side === 0) { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(fx, fy); ctx.lineTo(fx, front.y); ctx.lineTo(bx, back.y); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(bx + w * s, by); ctx.lineTo(fx + w * fs, fy); ctx.lineTo(fx + w * fs, front.y); ctx.lineTo(bx + w * s, back.y); ctx.fill(); }
  // back face
  ctx.fillStyle = o.col; rr(bx, by, w * s, h * s * 0.95, 0.35 * s); ctx.fill();
  // window
  ctx.fillStyle = '#bfe6ff';
  if (isBus) rr(bx + 0.25 * s, by + 0.3 * s, (w - 0.5) * s, 1.0 * s, 0.15 * s);
  else rr(bx + 0.35 * s, by + 0.2 * s, (w - 0.7) * s, 0.55 * s, 0.15 * s);
  ctx.fill();
  // cute eyes on the rear window
  if (s > 4) {
    const ey = isBus ? by + 0.8 * s : by + 0.48 * s;
    ctx.fillStyle = '#1b3a6b';
    ctx.beginPath(); ctx.arc(back.x - 0.35 * s, ey, 0.12 * s, 0, 7); ctx.arc(back.x + 0.35 * s, ey, 0.12 * s, 0, 7); ctx.fill();
  }
  // taillights & bumper
  ctx.fillStyle = '#ff3b3b'; const ly = back.y - (isBus ? 0.7 : 0.6) * s;
  rr(bx + 0.15 * s, ly, 0.45 * s, 0.25 * s, 0.08 * s); ctx.fill(); rr(bx + (w - 0.6) * s, ly, 0.45 * s, 0.25 * s, 0.08 * s); ctx.fill();
  ctx.fillStyle = '#3b3f4a'; rr(bx + 0.1 * s, back.y - 0.25 * s, (w - 0.2) * s, 0.2 * s, 0.08 * s); ctx.fill();
  ctx.fillStyle = '#222'; ctx.fillRect(bx + 0.2 * s, back.y - 0.08 * s, 0.4 * s, 0.1 * s); ctx.fillRect(bx + (w - 0.6) * s, back.y - 0.08 * s, 0.4 * s, 0.1 * s);
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
function drawPart(p) {
  const q = proj(p.x, p.y, p.z); if (q.y < 0) return;
  ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.col;
  const r = 0.22 * q.s;
  if (p.star) starPath(q.x, q.y, r * 1.4, r * 0.6); else { ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); }
  ctx.fill(); ctx.globalAlpha = 1;
}
function starPath(x, y, R, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } ctx.closePath(); }

// The Steel Bolt: an original wedge-shaped futuristic pickup seen from behind.
function bodyFill(c, x, y, w, h, g) {
  const col = COLORS.find(k => k.id === c) || COLORS[0];
  if (!col.body) {
    const gr = g.createLinearGradient(x, y, x + w, y + h);
    ['#ff6b6b', '#ffb547', '#ffd23f', '#4ee06b', '#2b8cff', '#a259ff'].forEach((cc, i) => gr.addColorStop(i / 5, cc));
    return gr;
  }
  const gr = g.createLinearGradient(x, y, x, y + h);
  gr.addColorStop(0, col.body[0]); gr.addColorStop(0.55, col.body[1]); gr.addColorStop(1, col.body[2]);
  return gr;
}
function drawTruck(g, cx, by, s, opts = {}) {
  // s = pixels per world unit; truck ~2.6 wide, ~1.9 tall
  const W2 = 1.35 * s, duck = opts.duck ? 0.82 : 1, t = opts.t || 0;
  const h = 1.9 * s * duck;
  g.save(); g.translate(cx, by); g.rotate((opts.tilt || 0) * -0.08);
  // wheels
  g.fillStyle = '#1e2229';
  rr2(g, -W2 - 0.05 * s, -0.75 * s, 0.6 * s, 0.75 * s, 0.18 * s); g.fill();
  rr2(g, W2 - 0.55 * s, -0.75 * s, 0.6 * s, 0.75 * s, 0.18 * s); g.fill();
  g.fillStyle = '#5c6470'; g.fillRect(-W2 + 0.08 * s, -0.5 * s, 0.32 * s, 0.25 * s); g.fillRect(W2 - 0.4 * s, -0.5 * s, 0.32 * s, 0.25 * s);
  // lower body (wide slab)
  const top = -h, bed = -h * 0.55;
  g.fillStyle = bodyFill(opts.color, -W2, top, 2 * W2, h, g);
  g.beginPath();
  g.moveTo(-W2, -0.45 * s); g.lineTo(-W2, bed); g.lineTo(-W2 * 0.92, bed - 0.08 * s);
  // angular cabin: one sharp peak (original faceted wedge)
  g.lineTo(-W2 * 0.62, bed - 0.1 * s); g.lineTo(-W2 * 0.18, top); g.lineTo(W2 * 0.18, top); g.lineTo(W2 * 0.62, bed - 0.1 * s);
  g.lineTo(W2 * 0.92, bed - 0.08 * s); g.lineTo(W2, bed); g.lineTo(W2, -0.45 * s); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(40,50,60,.55)'; g.lineWidth = Math.max(1, 0.04 * s); g.stroke();
  // facet highlight
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.beginPath(); g.moveTo(-W2 * 0.62, bed - 0.1 * s); g.lineTo(-W2 * 0.18, top); g.lineTo(-W2 * 0.05, top); g.lineTo(-W2 * 0.4, bed - 0.1 * s); g.fill();
  // rear window (dark trapezoid)
  g.fillStyle = '#26303d';
  g.beginPath(); g.moveTo(-W2 * 0.5, bed - 0.16 * s); g.lineTo(-W2 * 0.16, top + 0.14 * s); g.lineTo(W2 * 0.16, top + 0.14 * s); g.lineTo(W2 * 0.5, bed - 0.16 * s); g.fill();
  g.fillStyle = 'rgba(140,220,255,.35)';
  g.beginPath(); g.moveTo(-W2 * 0.4, bed - 0.16 * s); g.lineTo(-W2 * 0.13, top + 0.14 * s); g.lineTo(-W2 * 0.02, top + 0.14 * s); g.lineTo(-W2 * 0.22, bed - 0.16 * s); g.fill();
  // tailgate panel line
  g.strokeStyle = 'rgba(40,50,60,.35)'; g.beginPath(); g.moveTo(-W2 * 0.9, bed + 0.15 * s); g.lineTo(W2 * 0.9, bed + 0.15 * s); g.stroke();
  // full-width light strip (cyan, original look)
  const glow = 0.75 + 0.25 * Math.sin(t * 6);
  g.fillStyle = `rgba(80,230,255,${glow})`; g.fillRect(-W2 * 0.95, bed + 0.24 * s, W2 * 1.9, 0.12 * s);
  g.fillStyle = '#ff4d4d'; g.fillRect(-W2 * 0.95, bed + 0.24 * s, 0.35 * s, 0.12 * s); g.fillRect(W2 * 0.95 - 0.35 * s, bed + 0.24 * s, 0.35 * s, 0.12 * s);
  // lightning bolt badge
  g.fillStyle = '#ffd23f'; g.strokeStyle = '#c98f00'; g.lineWidth = Math.max(1, 0.03 * s);
  const bx = 0, byy = bed + 0.66 * s, k = 0.3 * s;
  g.beginPath(); g.moveTo(bx + 0.35 * k, byy - k); g.lineTo(bx - 0.6 * k, byy + 0.2 * k); g.lineTo(bx - 0.05 * k, byy + 0.2 * k); g.lineTo(bx - 0.35 * k, byy + k); g.lineTo(bx + 0.6 * k, byy - 0.25 * k); g.lineTo(bx + 0.05 * k, byy - 0.25 * k); g.closePath(); g.fill(); g.stroke();
  // bumper
  g.fillStyle = '#3b414b'; rr2(g, -W2 * 0.98, -0.5 * s, W2 * 1.96, 0.18 * s, 0.06 * s); g.fill();
  // turbo flames
  if (opts.turbo) {
    for (const sx of [-0.6, 0.6]) {
      const fl = (0.5 + Math.random() * 0.4) * s;
      g.fillStyle = '#ffb547'; g.beginPath(); g.moveTo(sx * s - 0.15 * s, -0.35 * s); g.lineTo(sx * s, -0.35 * s + fl); g.lineTo(sx * s + 0.15 * s, -0.35 * s); g.fill();
      g.fillStyle = '#fff3a6'; g.beginPath(); g.moveTo(sx * s - 0.07 * s, -0.35 * s); g.lineTo(sx * s, -0.35 * s + fl * 0.6); g.lineTo(sx * s + 0.07 * s, -0.35 * s); g.fill();
    }
  }
  g.restore();
}
function rr2(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

function drawPlayer() {
  const p = proj(S.x, 0, Z_PLAYER), s = p.s;
  // shadow stays on ground
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  const sh = Math.max(0.5, 1 - S.y * 0.12);
  ctx.beginPath(); ctx.ellipse(p.x, p.y, 1.5 * s * sh, 0.22 * s * sh, 0, 0, 7); ctx.fill();
  const py = p.y - S.y * s;
  const blink = S.inv > 0 && S.shield <= 0 && Math.floor(S.inv * 10) % 2 === 0;
  if (!blink) drawTruck(ctx, p.x, py, s, { color: colorId, tilt: S.tilt, duck: S.duck > 0, turbo: S.turbo > 0, t: S.t });
  if (S.shield > 0) {
    const a = S.shield < 2 ? 0.2 + 0.2 * Math.sin(S.t * 20) : 0.3;
    ctx.fillStyle = `rgba(110,200,255,${a})`; ctx.strokeStyle = 'rgba(200,240,255,.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(p.x, py - 1 * s, 1.9 * s, 1.5 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
  }
  if (S.magnet > 0) {
    ctx.strokeStyle = `rgba(255,107,107,${0.35 + 0.2 * Math.sin(S.t * 8)})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(p.x, py - 1 * s, (2 + (S.t * 2 % 1)) * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  }
  // dizzy stars after a bump (cheerful, not scary)
  if (S.inv > 0 && S.shield <= 0 && S.hearts < 3) {
    for (let i = 0; i < 3; i++) {
      const a = S.t * 5 + i * 2.09;
      ctx.fillStyle = '#ffd23f'; starPath(p.x + Math.cos(a) * 1.2 * s, py - 2.3 * s + Math.sin(a) * 0.25 * s, 0.22 * s, 0.1 * s); ctx.fill();
    }
  }
}
function drawPopups() {
  for (const p of S.popups) {
    const a = 1 - p.t / 1.2;
    ctx.globalAlpha = a; ctx.font = `900 ${Math.round(Math.min(W, H) * 0.08)}px -apple-system,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = '#1d4fa8'; ctx.fillStyle = '#ffd23f';
    const y = H * 0.32 - p.t * 60;
    ctx.strokeText(p.txt, W / 2, y); ctx.fillText(p.txt, W / 2, y);
  }
  ctx.globalAlpha = 1;
}
function drawSpeedLines() {
  if (S.turbo <= 0) return;
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3;
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, r1 = Math.max(W, H) * (0.35 + Math.random() * 0.2);
    ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r1, horizon + Math.sin(a) * r1); ctx.lineTo(W / 2 + Math.cos(a) * r1 * 1.4, horizon + Math.sin(a) * r1 * 1.4); ctx.stroke();
  }
}

// ---------- HUD ----------
let hudCache = '';
function updateHud() {
  $('score').textContent = Math.floor(S.score);
  $('coins').textContent = S.coins;
  $('hearts').textContent = '❤️'.repeat(Math.max(0, S.hearts)) + '🤍'.repeat(Math.max(0, 3 - S.hearts));
  const pw = ['shield', 'magnet', 'turbo'].filter(k => S[k] > 0);
  const key = pw.map(k => k + Math.ceil(S[k])).join();
  if (key !== hudCache) {
    hudCache = key;
    $('powerBar').innerHTML = pw.map(k => `<div class="pw">${{ shield: '🛡️', magnet: '🧲', turbo: '🚀' }[k]}<i style="width:${(S[k] / POWER_TIME[k]) * 100}%"></i></div>`).join('');
  }
}

// ---------- Previews ----------
function drawTruckPreview(c) {
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(c.width / 2, c.height * 0.88, c.width * 0.36, 14, 0, 0, 7); g.fill();
  drawTruck(g, c.width / 2, c.height * 0.88, c.width * 0.21, { color: colorId, t: performance.now() / 1000 });
}

// ---------- Loop ----------
let last = performance.now(), frameN = 0, titleT = 0;
function loop(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05;
  if (S.mode === 'play') update(dt);
  else if (S.mode === 'title') {
    const dz = dt * 8; titleT += dt; S.stripe = (S.stripe + dz) % 8;
    for (const sc of S.scen) sc.z -= dz; S.scen = S.scen.filter(sc => sc.z > 0.8);
    S.scenNext -= dz; while (S.scenNext <= 0) { addScenery(Z_FAR + S.scenNext); S.scenNext += 9; }
  }
  ctx.save();
  if (S.shake > 0) ctx.translate(Math.sin(now * 0.08) * 8 * S.shake, Math.cos(now * 0.1) * 6 * S.shake);
  drawWorld();
  drawSpeedLines();
  drawPopups();
  ctx.restore();
  if (S.mode === 'play' && (frameN++ % 6 === 0)) updateHud();
  if (S.mode === 'title' && frameN++ % 3 === 0) drawTruckPreview($('titleTruck'));
  requestAnimationFrame(loop);
}

// expose a small hook for automated tests
window.__steelbolt = { S, drawTruck, startGame, moveLane, jump, duck, gameOver, setBank(v) { bank = v; store.set('bank', v); } };

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize(); resetRun(); setMuted(muted); goHome();
requestAnimationFrame(loop);
})();
