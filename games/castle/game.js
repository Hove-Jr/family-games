/* Neon Keep — original procedural neon castle defense. No external assets. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const TAU = Math.PI * 2, clamp = (v, a, b) => v < a ? a : v > b ? b : v, rnd = (a, b) => a + Math.random() * (b - a), lerp = (a, b, t) => a + (b - a) * t;
const finite = (x, d = 0) => (typeof x === 'number' && isFinite(x)) ? x : d;
// ---------------------------------------------------------------- save
// Save format: `v` = 1 (format), `schema` = content version. Migration never drops data:
// every old field (and any unknown field) is carried forward, tiers are clamped to the current caps.
const PREFIX = 'neonkeep.', SAVE_KEY = PREFIX + 'save', SCHEMA = 1, NSLOT = 6;

// ---------------------------------------------------------------- data: upgrade tracks
// cost to reach tier t: coins = base * g^(t-1); gems from tier gem[0] (gem[1] per tier past it); runes likewise.
const TRACKS = {
  power:   { tab:'hero',   ic:'➶', name:'Arrow Power',     max:50, base:30,   g:1.16, gem:[6,1],  rune:[30,1],   ds:t => `Hero damage ${fmtC(heroDmg(t))}` },
  draw:    { tab:'hero',   ic:'⚡', name:'Quick Draw',      max:30, base:45,   g:1.19, gem:[5,1],  rune:[20,1],   ds:t => `${heroRate(t).toFixed(2)} shots / sec` },
  eagle:   { tab:'hero',   ic:'👁', name:'Eagle Eye',       max:20, base:60,   g:1.22, gem:[4,1],  rune:[14,1],   ds:t => `Range ${heroRange(t)}` },
  crit:    { tab:'hero',   ic:'✦', name:'Keen Aim',        max:25, base:80,   g:1.2,  gem:[3,1],  rune:[16,1],   ds:t => `Crit ${Math.round(critCh(t) * 100)}% for ×${critMul(t).toFixed(1)}` },
  volley:  { tab:'hero',   ic:'⋔', name:'Split Arrows',    max:6,  base:600,  g:2.3,  gem:[1,6],  rune:[4,4],    ds:t => `${1 + t} arrow${t ? 's' : ''} per shot` },
  pierce:  { tab:'hero',   ic:'➵', name:'Piercing Tips',   max:8,  base:900,  g:1.95, gem:[1,5],  rune:[5,3],    ds:t => t ? `Arrows pass through ${t} foe${t > 1 ? 's' : ''}` : 'Arrows stop at the first foe' },
  squad:   { tab:'hero',   ic:'🏹', name:'Wall Archers',    max:10, base:250,  g:1.62, gem:[2,3],  rune:[7,3],    ds:t => `${t} archer${t === 1 ? '' : 's'} help on the wall` },
  wall:    { tab:'castle', ic:'▦', name:'Stone Walls',     max:50, base:30,   g:1.16, gem:[6,1],  rune:[30,1],   ds:t => `Wall HP ${fmtC(wallHp(t))}` },
  mend:    { tab:'castle', ic:'⚒', name:'Masons',          max:15, base:120,  g:1.3,  gem:[3,1],  rune:[10,2],   ds:t => t ? `Repair ${Math.round(mendPct(t) * 100)}% each wave` : 'No repairs between waves' },
  regen:   { tab:'castle', ic:'✚', name:'Rune Mortar',     max:25, base:200,  g:1.24, gem:[3,1],  rune:[15,1],   ds:t => t ? `Heal ${(regenPct(t) * 100).toFixed(1)}% / sec` : 'No healing' },
  armor:   { tab:'castle', ic:'⛨', name:'Iron Plating',    max:20, base:150,  g:1.27, gem:[3,1],  rune:[12,2],   ds:t => `Block ${Math.round(armorPct(t) * 100)}% damage` },
  thorns:  { tab:'castle', ic:'✹', name:'Spiked Moat',     max:20, base:180,  g:1.26, gem:[3,1],  rune:[12,2],   ds:t => t ? `Attackers take ${fmtC(thornsDmg(t))}` : 'No spikes yet' },
  gold:    { tab:'gold',   ic:'●', name:'Treasury',        max:30, base:100,  g:1.22, gem:[4,1],  rune:[18,1],   ds:t => `Coins ×${goldMul(t).toFixed(2)}` },
  gemfind: { tab:'gold',   ic:'◆', name:'Gem Hunter',      max:15, base:400,  g:1.3,  gem:[0,0],  rune:[9,2],    ds:t => `${(gemCh(t) * 100).toFixed(1)}% gem drop per foe` },
  bounty:  { tab:'gold',   ic:'★', name:'Bounty Board',    max:20, base:300,  g:1.24, gem:[3,1],  rune:[12,1],   ds:t => `Clear bonus ×${bountyMul(t).toFixed(1)}` },
  rain:    { tab:'powers', ic:'☄', name:'Arrow Rain',      max:15, base:150,  g:1.33, gem:[2,2],  rune:[8,2],    req:0,  ds:t => t ? `${rainN(t)} arrows · ${Math.round(rainCd(t))}s cooldown` : 'Unlock: a storm of arrows' },
  heal:    { tab:'powers', ic:'❤', name:'Rebuild',         max:15, base:300,  g:1.33, gem:[2,2],  rune:[8,2],    req:3,  ds:t => t ? `Heal ${Math.round(healPct(t) * 100)}% · ${Math.round(healCd(t))}s cooldown` : 'Unlock: instantly repair the wall' },
  freeze:  { tab:'powers', ic:'❄', name:'Frost Nova',      max:15, base:700,  g:1.33, gem:[1,3],  rune:[8,2],    req:6,  ds:t => t ? `Freeze ${freezeDur(t).toFixed(1)}s · ${Math.round(freezeCd(t))}s cooldown` : 'Unlock: freeze every foe' },
  meteor:  { tab:'powers', ic:'✺', name:'Meteor',          max:15, base:1500, g:1.33, gem:[1,4],  rune:[8,2],    req:12, ds:t => t ? `${fmtC(meteorDmg(t))} blast · ${Math.round(meteorCd(t))}s cooldown` : 'Unlock: a giant blast' },
  slots:   { tab:'towers', ic:'⌂', name:'Tower Slots',     max:NSLOT, base:150, g:3.1, gem:[2,8], rune:[6,10], ds:t => `${t} of ${NSLOT} tower slots built` },
};
const TRACK_KEYS = Object.keys(TRACKS);
const heroDmg = t => 12 * Math.pow(1.1, t), heroRate = t => 1.1 + 0.07 * t, heroRange = t => 430 + 22 * t;
const critCh = t => 0.03 + 0.02 * t, critMul = t => 2 + 0.04 * t;
const wallHp = t => Math.round(250 * Math.pow(1.09, t)), mendPct = t => t ? 0.05 + 0.02 * t : 0, regenPct = t => 0.003 * t, armorPct = t => 0.025 * t;
const thornsDmg = t => t ? 6 * Math.pow(1.17, t) : 0, goldMul = t => 1 + 0.08 * t, gemCh = t => 0.004 + 0.003 * t, bountyMul = t => 1 + 0.1 * t;
const rainN = t => 16 + 2 * t, rainCd = t => 24 - 0.7 * t, healPct = t => 0.15 + 0.015 * t, healCd = t => 50 - 1.4 * t;
const freezeDur = t => 2 + 0.2 * t, freezeCd = t => 38 - 1 * t, meteorDmg = t => heroDmg(save.upg.power) * (6 + 1.2 * t), meteorCd = t => 45 - 1.2 * t;
const POWERS = [['rain', '#57e9ff'], ['heal', '#5dff8a'], ['freeze', '#9fd8ff'], ['meteor', '#ff7a3d']];

// ---------------------------------------------------------------- data: towers (built in wall slots, levelled 1..25)
const TMAX = 25;
const TOWERS = {
  archer:   { name:'Archer Tower',   ic:'🏹', col:'#5dff8a', req:0,  base:60,    dmg:12, rate:1.2,  range:470, air:1, ds:'Steady arrows at air & ground' },
  crossbow: { name:'Crossbow Nest',  ic:'➹', col:'#57e9ff', req:4,  base:300,   dmg:42, rate:0.5,  range:640, air:1, apierce:1, ds:'Heavy bolts that ignore armor' },
  multi:    { name:'Multishot Spire',ic:'⋔', col:'#ffe14a', req:7,  base:600,   dmg:8,  rate:0.95, range:480, air:1, multi:3, ds:'Fires at several foes at once' },
  cannon:   { name:'Cannon Bastion', ic:'💣', col:'#ff7a3d', req:10, base:1200,  dmg:30, rate:0.42, range:540, air:0, splash:62, ds:'Splash damage (ground only)' },
  frost:    { name:'Frost Obelisk',  ic:'❄', col:'#9fd8ff', req:14, base:2200,  dmg:6,  rate:0.6,  range:460, air:1, splash:75, slow:0.35, ds:'Chills and slows a crowd' },
  storm:    { name:'Storm Coil',     ic:'ϟ', col:'#c58bff', req:19, base:4500,  dmg:22, rate:0.7,  range:500, air:1, chain:3, ds:'Lightning that jumps between foes' },
  flame:    { name:'Flame Brazier',  ic:'🔥', col:'#ff3a5a', req:25, base:9000,  dmg:7,  rate:1.6,  range:380, air:0, splash:55, burn:1, ds:'Sets the ground on fire' },
  prism:    { name:'Prism Lance',    ic:'✧', col:'#ff5ad1', req:33, base:20000, dmg:34, rate:0,    range:560, air:1, beam:1, ds:'A beam that grows hotter on one foe' },
};
const TOWER_KEYS = Object.keys(TOWERS);
const tDmg = (k, lv) => TOWERS[k].dmg * Math.pow(1.17, lv - 1), tRate = (k, lv) => TOWERS[k].rate * (1 + 0.03 * (lv - 1)), tRange = (k, lv) => TOWERS[k].range + 6 * (lv - 1);
const tMulti = lv => 3 + Math.floor(lv / 6), tChain = lv => 3 + Math.floor(lv / 6), tSlow = lv => 0.35 + 0.01 * lv, tSplash = (k, lv) => (TOWERS[k].splash || 0) + 2 * (lv - 1);
const tDesc = (k, lv) => { const T = TOWERS[k]; let s = `${fmtC(tDmg(k, lv))} dmg`; if (T.beam) s += '/s, ramps ×3'; else s += ` · ${tRate(k, lv).toFixed(2)}/s`; if (T.multi) s += ` · ${tMulti(lv)} targets`; if (T.chain) s += ` · ${tChain(lv)} jumps`; if (T.slow) s += ` · slow ${Math.round(tSlow(lv) * 100)}%`; if (T.splash && !T.slow) s += ` · splash ${tSplash(k, lv)}`; return s; };

function niceRound(n) { if (n < 100) return Math.max(5, Math.round(n / 5) * 5); const p = Math.pow(10, Math.floor(Math.log10(n)) - 1); return Math.round(n / p) * p; }
function upgCost(k, t) { // cost to reach tier t of track k
  const T = TRACKS[k];
  return { coins: niceRound(T.base * Math.pow(T.g, t - 1)), cr: T.gem[1] && t >= T.gem[0] ? Math.ceil(T.gem[1] * Math.pow(t - T.gem[0] + 1, 1.15)) : 0, ru: t >= T.rune[0] ? Math.ceil(T.rune[1] * (t - T.rune[0] + 1)) : 0 };
}
function towerCost(k, lv) { // cost to go from lv to lv+1 (lv 0 = unlock)
  const b = TOWERS[k].base;
  return { coins: niceRound(b * Math.pow(1.22, lv)), cr: lv >= 4 ? Math.ceil((lv - 3) * 1.6) : 0, ru: lv >= 14 ? (lv - 13) * 2 : 0 };
}

// ---------------------------------------------------------------- data: enemies
// hp / dmg / coin are level-1 Normal values; armor = % damage blocked (crossbow ignores it).
const EDEF = {
  grunt:    { name:'Grunt',      hp:30,  spd:38, dmg:6,  coin:3,  r:14, col:'#5dff8a', shape:'blob',   u:1 },
  runner:   { name:'Runner',     hp:16,  spd:88, dmg:4,  coin:3,  r:11, col:'#ffe14a', shape:'dart',   u:0.7 },
  brute:    { name:'Brute',      hp:90,  spd:27, dmg:14, coin:8,  r:20, col:'#ff7a3d', shape:'square', armor:0.25, u:3 },
  shield:   { name:'Shieldbearer',hp:40, spd:32, dmg:7,  coin:6,  r:16, col:'#57e9ff', shape:'shield', shield:1.5, u:2 },
  bat:      { name:'Glowbat',    hp:22,  spd:70, dmg:5,  coin:5,  r:12, col:'#c58bff', shape:'bat',    fly:1, u:1.2 },
  archer:   { name:'Slinger',    hp:28,  spd:40, dmg:6,  coin:6,  r:13, col:'#ff5ad1', shape:'tri',    ranged:250, u:1.6 },
  healer:   { name:'Mender',     hp:35,  spd:33, dmg:3,  coin:8,  r:14, col:'#7dffb0', shape:'cross',  heal:1, u:2.2 },
  ram:      { name:'Siege Ram',  hp:230, spd:19, dmg:40, coin:18, r:24, col:'#ffb02e', shape:'ram',    armor:0.35, noslow:1, u:6 },
  splitter: { name:'Splitter',   hp:50,  spd:34, dmg:6,  coin:6,  r:17, col:'#b6ff3a', shape:'blob2',  split:3, u:2.2 },
  mini:     { name:'Splitling',  hp:12,  spd:62, dmg:3,  coin:1,  r:8,  col:'#d8ff7a', shape:'blob',   u:0.3 },
  wraith:   { name:'Wraith',     hp:42,  spd:46, dmg:7,  coin:8,  r:14, col:'#d0b0ff', shape:'ghost',  phase:1, u:2 },
  bomber:   { name:'Fire Wisp',  hp:45,  spd:52, dmg:45, coin:9,  r:15, col:'#ff3a5a', shape:'bomb',   fly:1, explode:1, u:2.6 },
  golem:    { name:'Golem',      hp:380, spd:16, dmg:25, coin:26, r:28, col:'#9fb7d9', shape:'golem',  armor:0.5, u:10 },
  shaman:   { name:'Shaman',     hp:45,  spd:30, dmg:4,  coin:10, r:15, col:'#3affd8', shape:'diamond',aura:1, u:2.6 },
  swarm:    { name:'Swarmling',  hp:9,   spd:76, dmg:2,  coin:1,  r:7,  col:'#ffd54a', shape:'dot',    u:0.3 },
  knight:   { name:'Dark Knight',hp:110, spd:34, dmg:16, coin:12, r:18, col:'#ff9df0', shape:'knight', armor:0.3, charge:1, u:4 },
};
// bosses: hp is a multiple of 30 (a level-1 grunt), ab = special moves
const BOSSDEF = {
  thorn:   { name:'Thornback King',  hp:45,   spd:20, dmg:40, r:40, col:'#5dff8a', shape:'blob2',  ab:['summon:grunt'] },
  wyrm:    { name:'Crystal Wyrm',    hp:60,   spd:24, dmg:45, r:38, col:'#57e9ff', shape:'diamond',ab:['blink', 'shieldAll'] },
  ox:      { name:'Magma Ox',        hp:80,   spd:22, dmg:60, r:42, col:'#ff7a3d', shape:'ram',    ab:['charge', 'enrage'], armor:0.2 },
  giant:   { name:'Frost Giant',     hp:110,  spd:16, dmg:70, r:46, col:'#9fd8ff', shape:'golem',  ab:['stun', 'summon:brute'], armor:0.25 },
  bog:     { name:'Bog Queen',       hp:130,  spd:18, dmg:60, r:42, col:'#b6ff3a', shape:'cross',  ab:['heal', 'summon:swarm', 'splitDeath'] },
  tide:    { name:'Tide Colossus',   hp:150,  spd:15, dmg:80, r:48, col:'#3affd8', shape:'shield', ab:['shieldAll', 'summon:shield'], armor:0.3 },
  roc:     { name:'Storm Roc',       hp:170,  spd:30, dmg:70, r:40, col:'#ffe14a', shape:'bat',    fly:1, ab:['summon:bat', 'blink'] },
  dread:   { name:'Nightmare',       hp:210,  spd:22, dmg:80, r:42, col:'#c58bff', shape:'ghost',  ab:['phase', 'summon:wraith'] },
  gear:    { name:'Gear Lord',       hp:220,  spd:16, dmg:60, r:48, col:'#ffb02e', shape:'square', ab:['barrage', 'summon:ram'], armor:0.4 },
  titan:   { name:'Forge Titan',     hp:320,  spd:15, dmg:110,r:52, col:'#ff3a5a', shape:'golem',  ab:['stun', 'enrage', 'summon:knight'], armor:0.45 },
  star:    { name:'Star Wyrm',       hp:360,  spd:26, dmg:90, r:44, col:'#ff5ad1', shape:'dart',   fly:1, ab:['barrage', 'blink', 'summon:bomber'] },
  void:    { name:'The Void Crown',  hp:420,  spd:17, dmg:130,r:56, col:'#ffffff', shape:'crown',  ab:['summon:mix', 'shieldAll', 'blink', 'enrage', 'stun', 'barrage'], armor:0.3 },
};
const REGIONS = [
  { name:'Neon Meadow',      hue:'#5dff8a', sky:['#06142a', '#12082e'], roster:['grunt', 'runner', 'bat'],                         sig:'grunt',    boss:'thorn', deco:'grass' },
  { name:'Crystal Woods',    hue:'#57e9ff', sky:['#041a2e', '#0a0a30'], roster:['grunt', 'runner', 'shield', 'bat'],               sig:'shield',   boss:'wyrm',  deco:'crystal' },
  { name:'Ember Canyon',     hue:'#ff7a3d', sky:['#2a0c06', '#14061e'], roster:['grunt', 'brute', 'archer', 'runner', 'bat'],      sig:'brute',    boss:'ox',    deco:'rock' },
  { name:'Frostveil Peaks',  hue:'#9fd8ff', sky:['#0a1838', '#1a1040'], roster:['brute', 'shield', 'healer', 'runner', 'archer', 'bat'], sig:'healer', boss:'giant', deco:'ice' },
  { name:'Toxic Marsh',      hue:'#b6ff3a', sky:['#0c1e08', '#160a26'], roster:['splitter', 'swarm', 'healer', 'grunt', 'archer', 'bat'], sig:'splitter', boss:'bog', deco:'spore' },
  { name:'Sunken Ruins',     hue:'#3affd8', sky:['#03202a', '#0a0a2a'], roster:['shield', 'wraith', 'splitter', 'brute', 'archer', 'ram'], sig:'wraith', boss:'tide', deco:'pillar' },
  { name:'Storm Highlands',  hue:'#ffe14a', sky:['#1a1806', '#100a2a'], roster:['knight', 'bat', 'bomber', 'runner', 'shaman', 'ram'], sig:'knight', boss:'roc', deco:'bolt' },
  { name:'Shadow Hollow',    hue:'#c58bff', sky:['#120626', '#050210'], roster:['wraith', 'swarm', 'shaman', 'knight', 'healer', 'bomber'], sig:'shaman', boss:'dread', deco:'fog' },
  { name:'Clockwork Wastes', hue:'#ffb02e', sky:['#1e1204', '#0e0a1e'], roster:['golem', 'ram', 'archer', 'shield', 'bomber', 'splitter'], sig:'golem', boss:'gear', deco:'gear' },
  { name:'Lava Forge',       hue:'#ff3a5a', sky:['#2a0408', '#120414'], roster:['golem', 'brute', 'knight', 'bomber', 'shaman', 'ram', 'healer'], sig:'ram', boss:'titan', deco:'lava' },
  { name:'Starfall Rift',    hue:'#ff5ad1', sky:['#1e0628', '#04041a'], roster:['wraith', 'bat', 'splitter', 'knight', 'golem', 'swarm', 'shaman'], sig:'bomber', boss:'star', deco:'star' },
  { name:'Void Crown',       hue:'#e8e8ff', sky:['#0a0a1e', '#000000'], roster:['grunt', 'runner', 'brute', 'shield', 'bat', 'archer', 'healer', 'ram', 'splitter', 'wraith', 'bomber', 'golem', 'shaman', 'swarm', 'knight'], sig:'knight', boss:'void', deco:'throne' },
];
const NREG = REGIONS.length, NLEV = NREG * 5;
const DIFF = {
  kid:    { name:'Kid',    hp:0.55, spd:1.0, dmg:0.5,  reward:0.6, safe:true },
  normal: { name:'Normal', hp:1.0,  spd:1.35,  dmg:1.0,  reward:1.0, safe:false },
  hard:   { name:'Hard',   hp:1.4,  spd:1.5, dmg:1.35, reward:1.6, safe:false },
};

function defSave() {
  const upg = {}; TRACK_KEYS.forEach(k => upg[k] = 0);
  const towers = {}; TOWER_KEYS.forEach(k => towers[k] = 0);
  return { v:1, schema:SCHEMA, coins:0, gems:0, runes:0, upg, towers, slots:Array(NSLOT).fill(null), levels:{}, diff:'normal', muted:false, speed:1,
    endless:{ kid:0, normal:0, hard:0 }, stats:{ kills:0, runs:0, bosses:0, coinsEarned:0, runesEarned:0 } };
}
function migrateSave(s) {
  const d = defSave(), groups = ['upg', 'towers', 'endless', 'stats', 'levels'];
  for (const k in s) if (!groups.includes(k)) d[k] = s[k];
  for (const g of groups) if (s[g] && typeof s[g] === 'object') Object.assign(d[g], s[g]);
  d.coins = Math.max(0, finite(d.coins)); d.gems = Math.max(0, finite(d.gems)); d.runes = Math.max(0, finite(d.runes));
  TRACK_KEYS.forEach(k => { d.upg[k] = clamp(Math.floor(finite(d.upg[k])), 0, TRACKS[k].max); });
  TOWER_KEYS.forEach(k => { d.towers[k] = clamp(Math.floor(finite(d.towers[k])), 0, TMAX); });
  const sl = Array.isArray(s.slots) ? s.slots : []; d.slots = Array.from({ length: NSLOT }, (_, i) => TOWERS[sl[i]] && d.towers[sl[i]] > 0 ? sl[i] : null);
  if (!DIFF[d.diff]) d.diff = 'normal';
  d.speed = d.speed === 2 ? 2 : 1;
  d.v = 1; d.schema = SCHEMA;
  return d;
}
function loadSave() {
  let raw = null, s = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
  try { s = JSON.parse(raw); } catch (e) {}
  if (s && typeof s === 'object') {
    const from = finite(s.schema, 1);
    if (from < SCHEMA) { try { const bk = SAVE_KEY + '.backup-s' + from; if (localStorage.getItem(bk) == null) localStorage.setItem(bk, raw); } catch (e) {} }
    return migrateSave(s);
  }
  if (raw) { try { localStorage.setItem(SAVE_KEY + '.unreadable', raw); } catch (e) {} }
  const d = defSave();
  const p = window.HubSave && window.HubSave.profile;
  if (p && p.age && p.age <= 7) d.diff = 'kid';
  return d;
}
let save = loadSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
const cleared = L => !!(save.levels[L] && save.levels[L].stars > 0);
function highestCleared() { let h = 0; for (let L = 1; L <= NLEV; L++) if (cleared(L)) h = L; else break; return h; }
const unlockedLevel = L => L === 1 || cleared(L - 1);
const totalStars = () => Object.values(save.levels).reduce((a, l) => a + (l.stars || 0), 0);

// ---------------------------------------------------------------- level generation (fixed seeds: each level is the same every time)
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hpScale = L => Math.pow(1.075, L - 1) * (1 + 0.02 * (L - 1));
const dmgScale = L => Math.pow(1.055, L - 1);
const coinScale = L => 1 + 0.09 * (L - 1);
function genLevel(L) {
  const s = Math.floor((L - 1) / 5), k = (L - 1) % 5, R = REGIONS[s], r = seeded(L * 7919 + 31);
  const pick = a => a[Math.floor(r() * a.length)];
  if (L === 1) return { s, k, waves: [[['grunt', 4, 1.6]], [['grunt', 6, 1.3]], [['grunt', 5, 1.2], ['runner', 3, 1.4]], [['grunt', 8, 1.0]]] };
  const ros = R.roster.slice(0, Math.min(R.roster.length, 2 + k + (s > 0 ? 1 : 0)));
  const nW = 4 + Math.floor(s / 3) + (k >= 3 ? 1 : 0), waves = [];
  for (let w = 0; w < nW; w++) {
    const budget = 6 + 2.3 * w + 1.6 * k + 2 * s;
    const ng = 1 + (ros.length > 1 && r() < 0.6 ? 1 : 0) + (s >= 4 && r() < 0.45 ? 1 : 0);
    const grp = [];
    for (let g = 0; g < ng; g++) {
      const t = g === 0 && w === nW - 1 ? ros[ros.length - 1] : pick(ros);
      let n = Math.max(1, Math.round(budget / ng / EDEF[t].u));
      if (t === 'swarm') n = Math.max(5, Math.round(n / 5) * 5);
      n = Math.min(n, t === 'swarm' ? 40 : 24);
      grp.push([t, n, clamp(9 / n, 0.35, 1.6) * (0.8 + r() * 0.4)]);
    }
    waves.push(grp);
  }
  const lv = { s, k, waves };
  if (k === 2) lv.guard = R.sig;
  if (k === 4) lv.boss = R.boss;
  return lv;
}
const LEVELS = Array.from({ length: NLEV }, (_, i) => genLevel(i + 1));

// ---------------------------------------------------------------- canvas / layout
const cv = $('c'), ctx = cv.getContext('2d'), hud = $('hud'), uiEl = $('ui'), barEl = $('bar');
let VW = 540, VH = 960, S = 1, DPR = 1, OX = 0, OY = 0, CW = 0, CH = 0, WALLY = 800, CASTLE_H = 170;
let INS = { t: 0, r: 0, b: 0, l: 0 }, insOverride = null;
function probeInsets(doc) {
  const d = doc.createElement('div');
  d.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  doc.body.appendChild(d); const cs = doc.defaultView.getComputedStyle(d);
  const r = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  d.remove(); return r;
}
function readInsets() {
  if (insOverride) return insOverride;
  const r = probeInsets(document);
  try { if (window.parent !== window && window.parent.document && window.parent.document.body) { const q = probeInsets(window.parent.document); for (const k in r) r[k] = Math.max(r[k], q[k]);
    const g = parseFloat(window.parent.getComputedStyle(window.parent.document.documentElement).getPropertyValue('--gap')) || 0; r.b = Math.max(r.b, g); } } catch (e) {}
  return r;
}
function resize() {
  INS = readInsets();
  const rs = document.documentElement.style;
  rs.setProperty('--sat', INS.t + 'px'); rs.setProperty('--sar', INS.r + 'px'); rs.setProperty('--sab', INS.b + 'px'); rs.setProperty('--sal', INS.l + 'px');
  CW = window.innerWidth; CH = window.innerHeight;
  const ah = Math.max(200, CH - INS.t), asp = CW / ah;
  if (ah < 520) { VH = 700; VW = Math.round(clamp(700 * asp, 540, 1300)); }
  else if (asp < 540 / 860) { VW = 540; VH = Math.round(Math.min(1200, 540 / asp)); }
  else { VH = 860; VW = Math.round(Math.min(1150, 860 * asp)); }
  S = Math.min(CW / VW, ah / VH); DPR = Math.min(2, window.devicePixelRatio || 1);
  OX = (CW - VW * S) / 2; OY = INS.t + (ah - VH * S) / 2;
  // the whole window is canvas (background painted edge to edge, under the notch and the home indicator)
  cv.width = Math.round(CW * DPR); cv.height = Math.round(CH * DPR); cv.style.width = CW + 'px'; cv.style.height = CH + 'px';
  const barH = (CH < 560 && CW > CH ? 62 : 74) + INS.b + 12; // bottom power bar (css px)
  CASTLE_H = Math.max(150, (barH - (CH - OY - VH * S)) / S + 70);
  WALLY = Math.round(VH - CASTLE_H);
  document.body.classList.toggle('phone-land', CW > CH && CH < 560);
  document.body.classList.toggle('narrow', CW < 560);
  bgKey = ''; hudCache = '';
  if (G) layoutCastle();
}

// ---------------------------------------------------------------- sprites (pre-rendered glow, drawn with drawImage for 60fps)
function mk(w, h, fn, sc = 2) { const c = document.createElement('canvas'); c.width = Math.ceil(w * sc); c.height = Math.ceil(h * sc); const g = c.getContext('2d'); g.scale(sc, sc); fn(g, w, h); c.w = w; c.h = h; return c; }
const cache = {};
function glow(color, r = 16) {
  const k = 'g' + color + r; if (cache[k]) return cache[k];
  return cache[k] = mk(r * 2, r * 2, g => { const gr = g.createRadialGradient(r, r, 0, r, r, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.22, color); gr.addColorStop(0.5, color + '55'); gr.addColorStop(1, color + '00'); g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); }, 1);
}
function softGlow(color, r) {
  const k = 's' + color + r; if (cache[k]) return cache[k];
  return cache[k] = mk(r * 2, r * 2, g => { const gr = g.createRadialGradient(r, r, 0, r, r, r); gr.addColorStop(0, color + '66'); gr.addColorStop(0.5, color + '22'); gr.addColorStop(1, color + '00'); g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); }, 1);
}
function shapePath(g, shape, r) {
  g.beginPath();
  switch (shape) {
    case 'blob': g.arc(0, 0, r, 0, TAU); break;
    case 'blob2': for (let i = 0; i <= 16; i++) { const a = i / 16 * TAU, rr = r * (1 + 0.14 * Math.sin(a * 5)); i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } break;
    case 'dart': g.moveTo(0, r); g.lineTo(r * 0.8, -r * 0.7); g.lineTo(0, -r * 0.3); g.lineTo(-r * 0.8, -r * 0.7); break;
    case 'square': g.rect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7); break;
    case 'shield': g.moveTo(-r, -r * 0.8); g.lineTo(r, -r * 0.8); g.lineTo(r, r * 0.1); g.quadraticCurveTo(r * 0.8, r * 0.8, 0, r * 1.05); g.quadraticCurveTo(-r * 0.8, r * 0.8, -r, r * 0.1); break;
    case 'bat': g.moveTo(0, -r * 0.4); g.lineTo(r * 0.5, -r * 0.7); g.lineTo(r * 1.3, -r * 0.5); g.lineTo(r * 0.9, r * 0.1); g.lineTo(r * 0.4, r * 0.0); g.lineTo(0, r * 0.6); g.lineTo(-r * 0.4, r * 0.0); g.lineTo(-r * 0.9, r * 0.1); g.lineTo(-r * 1.3, -r * 0.5); g.lineTo(-r * 0.5, -r * 0.7); break;
    case 'tri': g.moveTo(0, r * 1.1); g.lineTo(r, -r * 0.7); g.lineTo(-r, -r * 0.7); break;
    case 'cross': { const a = r * 0.38; g.moveTo(-a, -r); g.lineTo(a, -r); g.lineTo(a, -a); g.lineTo(r, -a); g.lineTo(r, a); g.lineTo(a, a); g.lineTo(a, r); g.lineTo(-a, r); g.lineTo(-a, a); g.lineTo(-r, a); g.lineTo(-r, -a); g.lineTo(-a, -a); break; }
    case 'ram': g.moveTo(-r * 0.7, -r); g.lineTo(r * 0.7, -r); g.lineTo(r * 0.9, r * 0.4); g.lineTo(r * 0.35, r * 1.1); g.lineTo(-r * 0.35, r * 1.1); g.lineTo(-r * 0.9, r * 0.4); break;
    case 'ghost': g.arc(0, -r * 0.1, r * 0.9, Math.PI, 0); g.lineTo(r * 0.9, r); for (let i = 0; i < 4; i++) g.lineTo(r * (0.9 - 0.45 * (i + 0.5)), r * (i % 2 ? 1 : 0.6)); g.lineTo(-r * 0.9, r); break;
    case 'bomb': g.arc(0, 0, r * 0.85, 0, TAU); g.moveTo(r * 0.3, -r * 0.8); g.lineTo(r * 0.6, -r * 1.2); break;
    case 'golem': g.moveTo(-r * 0.6, -r); g.lineTo(r * 0.6, -r); g.lineTo(r, -r * 0.3); g.lineTo(r * 0.8, r); g.lineTo(-r * 0.8, r); g.lineTo(-r, -r * 0.3); break;
    case 'diamond': g.moveTo(0, -r * 1.15); g.lineTo(r * 0.85, 0); g.lineTo(0, r * 1.15); g.lineTo(-r * 0.85, 0); break;
    case 'dot': g.arc(0, 0, r, 0, TAU); break;
    case 'knight': g.moveTo(0, -r * 1.1); g.lineTo(r * 0.8, -r * 0.4); g.lineTo(r * 0.7, r * 0.9); g.lineTo(0, r * 1.15); g.lineTo(-r * 0.7, r * 0.9); g.lineTo(-r * 0.8, -r * 0.4); break;
    case 'crown': g.moveTo(-r, r * 0.8); g.lineTo(-r, -r * 0.4); g.lineTo(-r * 0.5, 0); g.lineTo(0, -r * 1.0); g.lineTo(r * 0.5, 0); g.lineTo(r, -r * 0.4); g.lineTo(r, r * 0.8); break;
  }
  g.closePath();
}
function shapeSprite(shape, r, col, white) {
  const k = 'e' + shape + r + col + (white ? 'w' : ''); if (cache[k]) return cache[k];
  const pad = r * 0.9, W = (r + pad) * 2;
  return cache[k] = mk(W, W, g => {
    g.translate(W / 2, W / 2);
    if (!white) { const gr = g.createRadialGradient(0, 0, r * 0.3, 0, 0, r + pad); gr.addColorStop(0, col + '55'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(-W / 2, -W / 2, W, W); }
    shapePath(g, shape, r);
    g.fillStyle = white ? '#ffffff' : col + '38'; g.fill();
    g.lineJoin = 'round'; g.lineWidth = Math.max(2, r * 0.14); g.strokeStyle = white ? '#ffffff' : col; g.stroke();
    if (!white) { g.lineWidth = Math.max(1, r * 0.05); g.strokeStyle = '#ffffffaa'; g.stroke();
      // eyes
      const ey = shape === 'tri' || shape === 'dart' ? -r * 0.2 : shape === 'ghost' ? -r * 0.15 : -r * 0.1, ex = r * 0.3;
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-ex, ey, Math.max(1.6, r * 0.13), 0, TAU); g.arc(ex, ey, Math.max(1.6, r * 0.13), 0, TAU); g.fill();
      g.fillStyle = '#1a0420'; g.beginPath(); g.arc(-ex, ey + r * 0.04, Math.max(0.8, r * 0.06), 0, TAU); g.arc(ex, ey + r * 0.04, Math.max(0.8, r * 0.06), 0, TAU); g.fill();
    }
  });
}
function drawSp(sp, x, y, rot = 0, sc = 1) {
  if (!rot) { ctx.drawImage(sp, x - sp.w * sc / 2, y - sp.h * sc / 2, sp.w * sc, sp.h * sc); return; }
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(sp, -sp.w * sc / 2, -sp.h * sc / 2, sp.w * sc, sp.h * sc); ctx.restore();
}

// ---------------------------------------------------------------- audio (tiny synth)
let AC = null, master = null, noiseBuf = null; const lastSfx = {};
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = save.muted ? 0 : 0.5; master.connect(AC.destination); } catch (e) { AC = null; }
}
function noise() { if (noiseBuf) return noiseBuf; const n = AC.sampleRate * 1.5; noiseBuf = AC.createBuffer(1, n, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return noiseBuf; }
function sfx(name) {
  if (!AC || save.muted) return;
  const now = AC.currentTime; const gap = { shoot: 0.08, hit: 0.05, coin: 0.06, boom: 0.06, zap: 0.08, wall: 0.15 }[name] || 0;
  if (lastSfx[name] && now - lastSfx[name] < gap) return; lastSfx[name] = now;
  const o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(master);
  const env = (a, d, v) => { g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(v, now + a); g.gain.exponentialRampToValueAtTime(0.0001, now + a + d); o.start(now); o.stop(now + a + d + 0.02); };
  const noiseHit = (dur, v, f) => { const s = AC.createBufferSource(); s.buffer = noise(); const bf = AC.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.setValueAtTime(f, now); bf.frequency.exponentialRampToValueAtTime(80, now + dur); const ng = AC.createGain(); ng.gain.setValueAtTime(v, now); ng.gain.exponentialRampToValueAtTime(0.0001, now + dur); s.connect(bf); bf.connect(ng); ng.connect(master); s.start(now); s.stop(now + dur); };
  switch (name) {
    case 'shoot': o.type = 'triangle'; o.frequency.setValueAtTime(1200, now); o.frequency.exponentialRampToValueAtTime(500, now + 0.06); env(0.003, 0.06, 0.03); break;
    case 'hit': o.type = 'triangle'; o.frequency.setValueAtTime(260, now); env(0.002, 0.03, 0.035); break;
    case 'boom': o.type = 'sawtooth'; o.frequency.setValueAtTime(120, now); o.frequency.exponentialRampToValueAtTime(40, now + 0.25); env(0.005, 0.25, 0.07); noiseHit(0.3, 0.22, 2000); break;
    case 'bigboom': o.type = 'sawtooth'; o.frequency.setValueAtTime(80, now); o.frequency.exponentialRampToValueAtTime(25, now + 1.2); env(0.01, 1.2, 0.2); noiseHit(1.4, 0.5, 3000); break;
    case 'coin': o.type = 'sine'; o.frequency.setValueAtTime(1300, now); o.frequency.setValueAtTime(1750, now + 0.04); env(0.003, 0.08, 0.035); break;
    case 'gem': o.type = 'sine'; o.frequency.setValueAtTime(900, now); o.frequency.exponentialRampToValueAtTime(2400, now + 0.25); env(0.005, 0.3, 0.08); break;
    case 'power': o.type = 'square'; o.frequency.setValueAtTime(300, now); o.frequency.exponentialRampToValueAtTime(1200, now + 0.3); env(0.01, 0.32, 0.06); break;
    case 'wall': o.type = 'square'; o.frequency.setValueAtTime(140, now); o.frequency.exponentialRampToValueAtTime(70, now + 0.12); env(0.003, 0.12, 0.05); break;
    case 'warn': o.type = 'square'; o.frequency.setValueAtTime(220, now); o.frequency.setValueAtTime(330, now + 0.25); o.frequency.setValueAtTime(220, now + 0.5); o.frequency.setValueAtTime(330, now + 0.75); env(0.01, 1.0, 0.06); break;
    case 'win': o.type = 'triangle'; [523, 659, 784, 1046].forEach((f, i) => o.frequency.setValueAtTime(f, now + i * 0.12)); env(0.01, 0.7, 0.1); break;
    case 'lose': o.type = 'triangle'; [392, 330, 262, 196].forEach((f, i) => o.frequency.setValueAtTime(f, now + i * 0.16)); env(0.01, 0.8, 0.1); break;
    case 'zap': o.type = 'sawtooth'; o.frequency.setValueAtTime(1900, now); o.frequency.exponentialRampToValueAtTime(260, now + 0.12); env(0.002, 0.12, 0.03); break;
    case 'freeze': o.type = 'sine'; o.frequency.setValueAtTime(2000, now); o.frequency.exponentialRampToValueAtTime(400, now + 0.6); env(0.01, 0.6, 0.08); noiseHit(0.6, 0.15, 6000); break;
    case 'heal': o.type = 'sine'; [523, 784, 1046].forEach((f, i) => o.frequency.setValueAtTime(f, now + i * 0.08)); env(0.01, 0.5, 0.08); break;
    case 'click': o.type = 'sine'; o.frequency.setValueAtTime(660, now); env(0.002, 0.06, 0.05); break;
    case 'buy': o.type = 'triangle'; [660, 990, 1320].forEach((f, i) => o.frequency.setValueAtTime(f, now + i * 0.07)); env(0.005, 0.3, 0.08); break;
    default: env(0.002, 0.05, 0.02);
  }
}

// ---------------------------------------------------------------- game state
let state = 'menu', G = null, eid = 0, menuRegion = 0;
let enemies = [], projs = [], eprojs = [], parts = [], floats = [], arcs = [], towersRT = [], squad = [];
const hero = { x: 270, y: 760, cd: 0, ang: -Math.PI / 2, anim: 0 };
const SLOT_FX = [0.1, 0.24, 0.38, 0.62, 0.76, 0.9];
const SQUAD_FX = [0.17, 0.31, 0.45, 0.55, 0.69, 0.83, 0.04, 0.96, 0.44, 0.56];
function layoutCastle() {
  hero.x = VW / 2; hero.y = WALLY - 40;
  towersRT.forEach((t, i) => { if (t) { t.x = VW * SLOT_FX[i]; t.y = WALLY - 30; } });
  squad.forEach((a, i) => { a.x = VW * SQUAD_FX[i]; a.y = WALLY - 10 - (i >= 8 ? 14 : 0); });
}
function calcStats() {
  const u = save.upg;
  return { dmg: heroDmg(u.power), rate: heroRate(u.draw), range: heroRange(u.eagle), crit: critCh(u.crit), critMul: critMul(u.crit), volley: u.volley, pierce: u.pierce,
    squad: u.squad, armor: armorPct(u.armor), regen: regenPct(u.regen), mend: mendPct(u.mend), thorns: thornsDmg(u.thorns), gold: goldMul(u.gold), gemCh: gemCh(u.gemfind), bounty: bountyMul(u.bounty) };
}
function startLevel(L, endless = false) {
  const d = DIFF[save.diff], st = calcStats(), lv = endless ? null : LEVELS[L - 1];
  enemies = []; projs = []; eprojs = []; parts = []; floats = []; arcs = [];
  const wallMax = wallHp(save.upg.wall);
  G = { L, endless, diff: save.diff, d, st, lv, s: endless ? 0 : lv.s, time: 0, waveIdx: -1, nW: endless ? Infinity : lv.waves.length, phase: 'break', phaseT: 1.6, waveT: 0, queue: [],
    coins: 0, gems: 0, runes: 0, kills: 0, wallMax, wall: wallMax, hitFlash: 0, stunT: 0, rescues: 0, banner: null, mark: null, markPt: null, boss: null, bossKills: 0, dmgTaken: 0,
    cd: {}, eliteCh: endless ? 0.06 : L >= 6 ? 0.025 + 0.0012 * L : 0, endlessWave: 0 };
  setScale(endless ? 8 : L);
  POWERS.forEach(([k]) => G.cd[k] = 0);
  towersRT = save.slots.map((k, i) => k && i < save.upg.slots && save.towers[k] > 0 ? { k, lv: save.towers[k], cd: rnd(0.2, 0.8), ramp: 0, tgt: null, anim: 0 } : null);
  squad = Array.from({ length: st.squad }, () => ({ cd: rnd(0, 1), ang: -Math.PI / 2, anim: 0 }));
  layoutCastle(); hero.cd = 0.5;
  state = 'play'; uiEl.innerHTML = ''; hud.classList.remove('hidden'); barEl.classList.remove('hidden'); buildBar(); hudCache = '';
  save.stats.runs++; persist();
}
function setScale(L) { G.Leq = L; G.hpS = hpScale(L) * G.d.hp; G.dmgS = dmgScale(L) * G.d.dmg; G.cS = coinScale(L) * G.st.gold * G.d.reward; }
function genEndless(n) {
  const r = seeded(n * 104729 + 7), ri = Math.floor((n - 1) / 5) % NREG, maxR = Math.min(NREG - 1, Math.floor((n - 1) / 3));
  const ros = [...new Set(REGIONS.slice(0, maxR + 1).flatMap(R => R.roster))];
  const budget = 8 + 2.2 * n, ng = 2 + (r() < 0.5 ? 1 : 0), grp = [];
  for (let g = 0; g < ng; g++) { const t = ros[Math.floor(r() * ros.length)]; let n2 = Math.max(1, Math.round(budget / ng / EDEF[t].u)); if (t === 'swarm') n2 = Math.max(5, Math.round(n2 / 5) * 5); n2 = Math.min(n2, t === 'swarm' ? 45 : 28); grp.push([t, n2, clamp(10 / n2, 0.3, 1.4)]); }
  return { ri, grp, boss: n % 10 === 0 ? REGIONS[(n / 10 - 1) % NREG].boss : null, guard: n % 5 === 0 && n % 10 ? REGIONS[ri].sig : null };
}
function nextWave() {
  G.waveIdx++; G.waveT = 0; G.queue = [];
  let groups, guard = null, boss = null;
  if (G.endless) {
    G.endlessWave = G.waveIdx + 1; const e = genEndless(G.endlessWave);
    setScale(8 + G.endlessWave * 1.1); if (e.ri !== G.s) { G.s = e.ri; bgKey = ''; }
    groups = e.grp; guard = e.guard; boss = e.boss;
  } else {
    groups = G.lv.waves[G.waveIdx];
    if (G.waveIdx === G.nW - 1) { guard = G.lv.guard; boss = G.lv.boss; }
  }
  let t0 = 0;
  for (const [type, n, gap] of groups) {
    if (type === 'swarm') { for (let i = 0; i < n; i += 5) { const x = VW / 2 + rnd(-1, 1) * Math.min(VW / 2 - 60, 300); for (let j = 0; j < 5 && i + j < n; j++) G.queue.push({ t: t0 + i / 5 * gap * 4, type, x: x + rnd(-30, 30), y: -20 - j * 12 }); } }
    else for (let i = 0; i < n; i++) G.queue.push({ t: t0 + i * gap, type });
    t0 += rnd(1.2, 2.4);
  }
  if (guard) G.queue.push({ t: 2.5, type: guard, guard: true });
  if (boss) G.queue.push({ t: 3.5, boss });
  G.queue.sort((a, b) => a.t - b.t);
  if (G.waveIdx > 0 && G.st.mend) { const h = G.wallMax * G.st.mend; G.wall = Math.min(G.wallMax, G.wall + h); floater(VW / 2, WALLY + 30, '+' + fmtC(h) + ' repaired', '#5dff8a'); }
  banner(boss ? '⚠ BOSS WAVE ⚠' : G.endless ? 'WAVE ' + G.endlessWave : `WAVE ${G.waveIdx + 1} / ${G.nW}`, boss ? BOSSDEF[boss].name : guard ? 'A giant ' + EDEF[guard].name + ' approaches!' : '');
  if (boss || guard) sfx('warn');
  G.phase = 'wave';
}
function banner(t, sub = '', dur = 2) { G.banner = { t, sub, life: dur, max: dur }; }
function spawnEnemy(type, o = {}) {
  const def = EDEF[type];
  const elite = o.elite != null ? o.elite : !o.guard && Math.random() < G.eliteCh;
  const giant = !!o.guard, hp = def.hp * G.hpS * (elite ? 3 : 1) * (giant ? 12 : 1);
  const e = { id: ++eid, type, def, x: o.x != null ? o.x : VW / 2 + rnd(-1, 1) * Math.min(VW / 2 - 40, 320), y: o.y != null ? o.y : rnd(-50, -22), hp, max: hp,
    r: def.r * (giant ? 1.8 : elite ? 1.15 : 1), spd: def.spd * G.d.spd * rnd(0.9, 1.1) * (giant ? 0.75 : 1), dmg: def.dmg * G.dmgS * (giant ? 4 : elite ? 2 : 1),
    coin: def.coin * (giant ? 15 : elite ? 4 : 1), armor: def.armor || 0, shield: def.shield ? hp * def.shield : 0, fly: !!def.fly, elite, giant, ranged: def.ranged ? def.ranged + rnd(-30, 40) : 0,
    state: 'walk', atkT: 0, slowT: 0, slowF: 0, frozen: 0, burnT: 0, burnD: 0, flash: 0, ph: Math.random() * TAU, phaseT: rnd(1, 3), ghost: false, chargeT: rnd(2, 4), charging: 0, actT: rnd(1, 3), wob: rnd(0.6, 1.6), vx: 0 };
  e.shieldMax = Math.max(e.shield, hp * 0.5);
  enemies.push(e); return e;
}
function spawnBoss(key) {
  const def = BOSSDEF[key], hp = def.hp * 30 * G.hpS;
  const e = spawnEnemy('grunt', { elite: false, x: VW / 2, y: -60 });
  Object.assign(e, { boss: def, bkey: key, hp, max: hp, r: def.r, spd: def.spd * G.d.spd, dmg: def.dmg * G.dmgS, coin: 40 + def.hp, armor: def.armor || 0, shield: 0, shieldMax: hp * 0.12, fly: !!def.fly,
    ranged: def.ab.includes('barrage') ? 300 : 0, abT: {}, enraged: false });
  def.ab.forEach((a, i) => e.abT[a] = 3 + i * 1.7);
  G.boss = e; return e;
}
const stopY = e => e.ranged ? WALLY - e.ranged - e.r : WALLY - e.r * (e.fly ? 1 : 0.55) - 6;

// ---------------------------------------------------------------- combat
function damage(e, amt, o = {}) {
  if (e.dead || (e.ghost && !o.dot && !o.power)) return false;
  if (G.mark === e) amt *= 1.25;
  if (e.armor && !o.apierce) amt *= 1 - e.armor * (o.half ? 0.5 : 1);
  if (e.shield > 0) { const m = o.zap ? 2 : 1; if (amt * m <= e.shield) { e.shield -= amt * m; e.flash = 0.05; return true; } amt -= e.shield / m; e.shield = 0; }
  e.hp -= amt; if (!o.dot) e.flash = 0.07;
  if (o.crit && floats.length < 30) floater(e.x, e.y - e.r - 6, fmtC(amt), '#ffe14a', 0.6);
  if (e.hp <= 0) kill(e);
  return true;
}
function kill(e, noLoot) {
  if (e.dead) return; e.dead = true; G.kills++; save.stats.kills++;
  burst(e.x, e.y, e.boss ? e.boss.col : e.def.col, e.boss ? 60 : e.giant ? 30 : 10, e.boss ? 260 : 150);
  if (G.mark === e) G.mark = null;
  if (!noLoot) {
    const c = Math.max(1, Math.round(e.coin * G.cS)); G.coins += c;
    if (e.boss || e.giant || e.elite || Math.random() < 0.08) floater(e.x, e.y, '+' + fmtC(c), '#ffd54a', 0.7);
    if (e.elite || Math.random() < G.st.gemCh) { G.gems++; floater(e.x + 14, e.y - 14, '+1 ◆', '#57e9ff', 0.9); sfx('gem'); }
    if (G.s >= 3 && e.elite && Math.random() < 0.15) { G.runes++; floater(e.x - 14, e.y - 24, '+1 ✧', '#ff7af0', 1); }
    sfx('coin');
  }
  if (e.def.split && !e.boss) for (let i = 0; i < e.def.split; i++) spawnEnemy('mini', { x: e.x + rnd(-18, 18), y: e.y + rnd(-10, 10), elite: false });
  if (e.giant) { G.gems += 2; if (G.s >= 3) G.runes += 1; floater(e.x, e.y - 30, 'GIANT DOWN! +2 ◆', '#ffb02e', 1.4); sfx('bigboom'); shake = 8; }
  if (e.boss) {
    G.bossKills++; save.stats.bosses++; G.boss = null; sfx('bigboom'); shake = 16;
    G.gems += 5; if (G.s >= 3 || (G.endless && G.endlessWave >= 20)) G.runes += 3 + Math.floor(G.s / 2);
    floater(e.x, e.y - 40, e.boss.name + ' defeated!', '#ffffff', 2);
    if (e.boss.ab.includes('splitDeath')) for (let i = 0; i < 8; i++) spawnEnemy('mini', { x: e.x + rnd(-40, 40), y: e.y + rnd(-20, 20), elite: false });
  }
}
function wallHit(dmg, x) {
  if (G.phase === 'done') return;
  dmg *= 1 - G.st.armor; G.wall -= dmg; G.dmgTaken += dmg; G.hitFlash = 0.18;
  for (let i = 0; i < 4; i++) part(x + rnd(-10, 10), WALLY + rnd(-4, 6), rnd(-80, 80), rnd(-140, -30), '#ff7af0', 0.4, 3);
  sfx('wall');
  if (G.wall <= 0) {
    if (G.d.safe) { G.wall = G.wallMax * 0.5; G.rescues++; banner('THE CASTLE HOLDS!', 'Brave builders patched the wall', 1.6); sfx('heal'); }
    else { G.wall = 0; endLevel(false); }
  }
}
const inRange = (x, y, e, r) => { const dx = e.x - x, dy = e.y - y; return dx * dx + dy * dy <= r * r; };
function prio(e) { let p = e.y; if (G.mark === e) p += 1e5; else if (G.markPt && inRange(G.markPt.x, G.markPt.y, e, 130)) p += 5e4; return p; }
function canTarget(e, air) { return !e.dead && !e.ghost && (air || !e.fly) && e.y > -16; }
function pickTarget(x, y, range, air) {
  let best = null, bp = -1e9;
  for (const e of enemies) { if (!canTarget(e, air) || !inRange(x, y, e, range + e.r)) continue; const p = prio(e); if (p > bp) { bp = p; best = e; } }
  return best;
}
function pickTargets(x, y, range, n, air) {
  if (n === 1) { const t = pickTarget(x, y, range, air); return t ? [t] : []; }
  const c = enemies.filter(e => canTarget(e, air) && inRange(x, y, e, range + e.r));
  c.sort((a, b) => prio(b) - prio(a)); return c.slice(0, n);
}
function shoot(x, y, tgt, o) {
  const a = Math.atan2(tgt.y - y, tgt.x - x), spd = o.spd || 1100;
  projs.push(Object.assign({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, spd, tgt, hit: [], pierce: 0, air: true, life: 2.5, k: 'arrow', col: '#bff4ff' }, o));
  return a;
}
function splash(x, y, R, dmg, o = {}) {
  for (const e of enemies) {
    if (e.dead || (o.ground && e.fly) || !inRange(x, y, e, R + e.r)) continue;
    damage(e, dmg, o);
    if (o.slow && !e.dead) { e.slowT = 2.2; e.slowF = Math.max(e.slowF * (e.slowT > 0 ? 1 : 0), o.slow); }
    if (o.burn && !e.dead) { e.burnT = 3; e.burnD = Math.max(e.burnT > 0 ? e.burnD : 0, o.burn); }
  }
}
function heroFire() {
  const st = G.st, ts = pickTargets(hero.x, hero.y, st.range, 1 + st.volley, true);
  if (!ts.length) { hero.cd = 0.06; return; }
  hero.cd = 1 / st.rate; hero.anim = 0.18;
  for (const t of ts) {
    const crit = Math.random() < st.crit;
    hero.ang = shoot(hero.x, hero.y - 6, t, { dmg: st.dmg * (crit ? st.critMul : 1), crit, pierce: st.pierce, col: crit ? '#ffe14a' : '#bff4ff', w: crit ? 3 : 2.2 });
  }
  sfx('shoot');
}
function towerFire(t) {
  const T = TOWERS[t.k], lv = t.lv, R = tRange(t.k, lv), dmg = tDmg(t.k, lv);
  if (T.beam) return; // handled per frame
  if (T.multi) {
    const ts = pickTargets(t.x, t.y, R, tMulti(lv), true); if (!ts.length) return 0.1;
    ts.forEach(e => t.ang = shoot(t.x, t.y - 16, e, { dmg, col: T.col, spd: 1000 })); t.anim = 0.2; return 1 / tRate(t.k, lv);
  }
  const e = pickTarget(t.x, t.y, R, !!T.air); if (!e) return 0.1;
  t.anim = 0.2;
  if (T.chain) {
    let cur = e, pts = [[t.x, t.y - 20]], hitSet = new Set(), d = dmg;
    for (let i = 0; i < tChain(lv) && cur; i++) {
      pts.push([cur.x, cur.y]); hitSet.add(cur); damage(cur, d, { zap: true }); d *= 0.85;
      let nx = null, nd = 1e9; for (const o of enemies) { if (hitSet.has(o) || !canTarget(o, true)) continue; const dd = (o.x - cur.x) ** 2 + (o.y - cur.y) ** 2; if (dd < 160 * 160 && dd < nd) { nd = dd; nx = o; } }
      cur = nx;
    }
    arcs.push({ pts, life: 0.18, col: T.col }); sfx('zap'); return 1 / tRate(t.k, lv);
  }
  if (t.k === 'cannon') {
    const dist = Math.hypot(e.x - t.x, e.y - t.y), ft = dist / 560, py = Math.min(stopY(e), e.y + (e.state === 'walk' && !e.frozen ? e.spd * ft : 0));
    projs.push({ k: 'ball', x: t.x, y: t.y - 20, sx: t.x, sy: t.y - 20, tx: e.x, ty: py, t: 0, ft, dmg, R: tSplash(t.k, lv), col: T.col, life: ft + 0.1 });
    return 1 / tRate(t.k, lv);
  }
  if (t.k === 'frost') { t.ang = shoot(t.x, t.y - 20, e, { k: 'shard', dmg, col: T.col, spd: 800, splash: tSplash(t.k, lv), slow: tSlow(lv), w: 3 }); return 1 / tRate(t.k, lv); }
  if (t.k === 'flame') { t.ang = shoot(t.x, t.y - 20, e, { k: 'fire', dmg, col: T.col, spd: 650, air: false, splash: tSplash(t.k, lv), burn: dmg * 0.9, w: 4 }); return 1 / tRate(t.k, lv); }
  t.ang = shoot(t.x, t.y - 20, e, { k: t.k === 'crossbow' ? 'bolt' : 'arrow', dmg, col: T.col, apierce: !!T.apierce, spd: t.k === 'crossbow' ? 1400 : 1050, w: t.k === 'crossbow' ? 3.5 : 2.2 });
  return 1 / tRate(t.k, lv);
}
function densest() {
  let best = null, bn = -1;
  for (const e of enemies) { if (e.dead || e.y < 0) continue; let n = 0; for (const o of enemies) if (!o.dead && inRange(e.x, e.y, o, 120)) n++; n += e.boss ? 3 : 0; if (n > bn || (n === bn && e.y > best.y)) { bn = n; best = e; } }
  return best;
}
function usePower(k) {
  if (state !== 'play' || G.cd[k] > 0 || !save.upg[k]) return;
  const t = save.upg[k];
  if (k === 'heal') { if (G.wall >= G.wallMax) { floater(VW / 2, WALLY - 60, 'Wall is full!', '#5dff8a'); return; } const h = G.wallMax * healPct(t); G.wall = Math.min(G.wallMax, G.wall + h); floater(VW / 2, WALLY - 40, '+' + fmtC(h), '#5dff8a', 1.2); for (let i = 0; i < 40; i++) part(rnd(0, VW), WALLY + rnd(0, 40), rnd(-30, 30), rnd(-160, -60), '#5dff8a', 0.9, 4); sfx('heal'); G.cd[k] = healCd(t); return; }
  if (k === 'freeze') { const d = freezeDur(t); let n = 0; for (const e of enemies) if (!e.dead && e.y > -20) { e.frozen = e.boss ? d * 0.5 : d; n++; } if (!n) return; G.freezeFx = 0.6; sfx('freeze'); G.cd[k] = freezeCd(t); return; }
  const c = densest(); if (!c) { floater(VW / 2, WALLY - 60, 'No foes yet!', '#9fe9ff'); return; }
  if (k === 'rain') { const N = rainN(t), dmg = G.st.dmg * (0.6 + 0.1 * t); for (let i = 0; i < N; i++) { const a = rnd(0, TAU), rr = Math.sqrt(Math.random()) * 140, tx = c.x + Math.cos(a) * rr, ty = c.y + Math.sin(a) * rr * 0.8 + 20; projs.push({ k: 'rain', x: tx - 60, y: ty - 520, sx: tx - 60, sy: ty - 520, tx, ty, t: -i * 0.05, ft: 0.45, dmg, R: 26, col: '#bff4ff', life: 3 }); } sfx('power'); G.cd[k] = rainCd(t); }
  if (k === 'meteor') { projs.push({ k: 'meteor', x: c.x + 260, y: -200, sx: c.x + 260, sy: -200, tx: c.x, ty: c.y + 10, t: 0, ft: 0.75, dmg: meteorDmg(t), R: 110 + 4 * t, col: '#ff7a3d', life: 2 }); sfx('power'); G.cd[k] = meteorCd(t); }
}

// ---------------------------------------------------------------- particles / floaters
let shake = 0;
function part(x, y, vx, vy, col, life, sz) { if (parts.length > 450) return; parts.push({ x, y, vx, vy, col, life, max: life, sz }); }
function burst(x, y, col, n, sp) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(0.2, 1) * sp; part(x, y, Math.cos(a) * v, Math.sin(a) * v, i % 3 ? col : '#ffffff', rnd(0.25, 0.6), rnd(2, 4)); } }
function floater(x, y, text, col, life = 1) { if (floats.length > 40) floats.shift(); floats.push({ x, y, text, col, life, max: life }); }

// ---------------------------------------------------------------- update
function bossAbilities(e, dt) {
  const B = e.boss, kid = G.diff === 'kid';
  if (!e.enraged && B.ab.includes('enrage') && e.hp < e.max * 0.5) { e.enraged = true; e.spd *= 1.5; floater(e.x, e.y - e.r - 10, 'ENRAGED!', '#ff3a5a', 1.4); sfx('warn'); }
  for (const a of B.ab) {
    if ((e.abT[a] -= dt) > 0) continue;
    const [nm, arg] = a.split(':');
    switch (nm) {
      case 'summon': { const ros = REGIONS[G.s].roster, n = kid ? 2 : 3; for (let i = 0; i < n; i++) spawnEnemy(arg === 'mix' ? ros[Math.floor(Math.random() * ros.length)] : arg, { x: clamp(e.x + rnd(-80, 80), 30, VW - 30), y: e.y + rnd(-10, 30), elite: false }); burst(e.x, e.y, B.col, 14, 160); e.abT[a] = kid ? 11 : 8; break; }
      case 'shieldAll': for (const o of enemies) if (!o.dead && inRange(e.x, e.y, o, 240)) o.shield = Math.min(o.shieldMax, o.shield + o.max * (o === e ? 0.06 : 0.25)); arcs.push({ ring: true, x: e.x, y: e.y, R: 240, life: 0.5, col: '#57e9ff' }); e.abT[a] = kid ? 13 : 9; break;
      case 'blink': if (e.state === 'walk') { burst(e.x, e.y, B.col, 16, 180); e.y = Math.min(stopY(e), e.y + 90); e.x = clamp(e.x + rnd(-120, 120), 60, VW - 60); burst(e.x, e.y, B.col, 16, 180); } e.abT[a] = kid ? 11 : 8; break;
      case 'charge': e.charging = 1.0; e.abT[a] = 6; break;
      case 'stun': G.stunT = kid ? 1.2 : 2.4; banner('TOWERS JAMMED!', '', 1); sfx('zap'); e.abT[a] = kid ? 16 : 12; break;
      case 'heal': e.hp = Math.min(e.max, e.hp + e.max * 0.04); floater(e.x, e.y - e.r, '+heal', '#7dffb0'); e.abT[a] = 6; break;
      case 'phase': e.ghost = true; e.phaseT = 1.0; e.abT[a] = kid ? 6 : 4.2; break;
      case 'barrage': if (e.state === 'atk') { for (let i = 0; i < 5; i++) eprojs.push({ x: e.x, y: e.y, tx: clamp(e.x + (i - 2) * 50, 10, VW - 10), ty: WALLY, t: -i * 0.08, ft: 0.9, dmg: e.dmg * 0.3, col: B.col, big: true }); } e.abT[a] = 3; break;
    }
  }
}
function update(dt) {
  G.time += dt; G.waveT += dt;
  if (G.banner && (G.banner.life -= dt) <= 0) G.banner = null;
  if (G.hitFlash > 0) G.hitFlash -= dt; if (G.stunT > 0) G.stunT -= dt; if (G.freezeFx > 0) G.freezeFx -= dt; if (shake > 0) shake = Math.max(0, shake - dt * 30);
  for (const k in G.cd) if (G.cd[k] > 0) G.cd[k] = Math.max(0, G.cd[k] - dt);
  if (G.markPt && (G.markPt.life -= dt) <= 0) G.markPt = null;
  // waves
  if (G.phase === 'break') { if ((G.phaseT -= dt) <= 0) nextWave(); }
  else if (G.phase === 'wave') {
    while (G.queue.length && G.queue[0].t <= G.waveT) { const q = G.queue.shift(); if (q.boss) spawnBoss(q.boss); else spawnEnemy(q.type, q); }
    if (!G.queue.length && !enemies.length) {
      if (G.endless) { if (G.endlessWave % 3 === 0) { G.gems++; floater(VW / 2, WALLY - 80, '+1 ◆ wave bonus', '#57e9ff', 1.2); } G.phase = 'break'; G.phaseT = 1.8; }
      else if (G.waveIdx >= G.nW - 1) { endLevel(true); return; }
      else { G.phase = 'break'; G.phaseT = 1.6; }
    }
  }
  if (G.st.regen && G.wall < G.wallMax) G.wall = Math.min(G.wallMax, G.wall + G.wallMax * G.st.regen * dt);
  // enemies
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.burnT > 0) { e.burnT -= dt; damage(e, e.burnD * dt, { dot: true }); if (e.dead) continue; if (Math.random() < dt * 8) part(e.x + rnd(-e.r, e.r) * 0.6, e.y, rnd(-10, 10), rnd(-70, -30), '#ff7a3d', 0.4, 3); }
    if (e.frozen > 0) { e.frozen -= dt; continue; }
    let sf = 1; if (e.slowT > 0) { e.slowT -= dt; if (!e.def.noslow) sf = 1 - e.slowF; } else e.slowF = 0;
    if (e.def.phase || e.ghost) { if ((e.phaseT -= dt) <= 0) { if (e.boss) e.ghost = false; else { e.ghost = !e.ghost; e.phaseT = e.ghost ? 1.1 : rnd(2, 3.2); } } }
    if (e.def.charge && !e.boss) { if ((e.chargeT -= dt) <= 0) { e.charging = 0.9; e.chargeT = rnd(3, 5); } }
    if (e.charging > 0) { e.charging -= dt; sf *= 2.8; if (Math.random() < dt * 20) part(e.x, e.y - e.r, rnd(-20, 20), rnd(-60, -20), e.def.col, 0.3, 2); }
    if (e.boss) bossAbilities(e, dt);
    else if (e.def.heal && (e.actT -= dt) <= 0) { e.actT = 2.2; for (const o of enemies) if (o !== e && !o.dead && inRange(e.x, e.y, o, 95)) o.hp = Math.min(o.max, o.hp + o.max * (o.boss ? 0.02 : 0.12)); arcs.push({ ring: true, x: e.x, y: e.y, R: 95, life: 0.4, col: '#7dffb0' }); }
    else if (e.def.aura && (e.actT -= dt) <= 0) { e.actT = 4; for (const o of enemies) if (!o.dead && inRange(e.x, e.y, o, 110)) o.shield = Math.min(o.shieldMax, o.shield + o.max * 0.25); arcs.push({ ring: true, x: e.x, y: e.y, R: 110, life: 0.45, col: '#3affd8' }); }
    if (e.state === 'walk') {
      e.y += e.spd * sf * dt;
      e.x = clamp(e.x + Math.sin(G.time * e.wob + e.ph) * 14 * dt, 16, VW - 16);
      const sy = stopY(e); if (e.y >= sy) { e.y = sy; e.state = 'atk'; e.atkT = 0.35; }
    } else {
      if ((e.atkT -= dt * (e.charging > 0 ? 1 : 1)) <= 0) {
        if (e.def.explode && !e.boss) { wallHit(e.dmg, e.x); burst(e.x, e.y, '#ff7a3d', 24, 220); sfx('boom'); kill(e, true); G.coins += Math.round(e.coin * G.cS * 0.5); continue; }
        if (e.ranged && !e.boss) { eprojs.push({ x: e.x, y: e.y, tx: e.x + rnd(-10, 10), ty: WALLY, t: 0, ft: 0.7, dmg: e.dmg, col: e.def.col }); e.atkT = 2.2; }
        else if (!e.ranged) { wallHit(e.dmg * (e.boss ? 1 : 1), e.x); e.atkT = 1; e.bump = 0.15; if (G.st.thorns) { damage(e, G.st.thorns, { apierce: true }); if (Math.random() < 0.3) part(e.x, e.y + e.r, rnd(-40, 40), rnd(-80, -20), '#ffe14a', 0.3, 2); } }
        else e.atkT = 1;
        if (G.phase === 'done') return;
      }
      if (e.bump > 0) e.bump -= dt;
    }
  }
  // hero, squad, towers
  if ((hero.cd -= dt) <= 0) heroFire();
  if (hero.anim > 0) hero.anim -= dt;
  const sDmg = G.st.dmg * 0.3, sRate = 0.8 * (1 + 0.035 * save.upg.draw), sRange = G.st.range * 0.9;
  for (const a of squad) {
    if (a.anim > 0) a.anim -= dt;
    if ((a.cd -= dt) > 0) continue;
    const t = pickTarget(a.x, a.y, sRange, true); if (!t) { a.cd = 0.15; continue; }
    a.ang = shoot(a.x, a.y - 4, t, { dmg: sDmg, col: '#9fe9ff', w: 1.6 }); a.cd = 1 / sRate; a.anim = 0.15;
  }
  for (const t of towersRT) {
    if (!t) continue; if (t.anim > 0) t.anim -= dt;
    if (G.stunT > 0) { t.tgt = null; continue; }
    if (TOWERS[t.k].beam) {
      const R = tRange(t.k, t.lv);
      if (!t.tgt || !canTarget(t.tgt, true) || !inRange(t.x, t.y, t.tgt, R + t.tgt.r)) { const n = pickTarget(t.x, t.y, R, true); if (n !== t.tgt) t.ramp = 0; t.tgt = n; }
      if (t.tgt) { t.ramp = Math.min(2, t.ramp + dt * 0.7); t.ang = Math.atan2(t.tgt.y - t.y, t.tgt.x - t.x); damage(t.tgt, tDmg(t.k, t.lv) * (1 + t.ramp) * dt, { dot: true }); if (Math.random() < dt * 14) part(t.tgt.x, t.tgt.y, rnd(-60, 60), rnd(-60, 60), '#ff5ad1', 0.3, 2); }
      continue;
    }
    if ((t.cd -= dt) <= 0) t.cd = towerFire(t) || 0.1;
  }
  // projectiles
  for (const p of projs) {
    if (p.dead) continue;
    if (p.k === 'ball' || p.k === 'rain' || p.k === 'meteor') {
      p.t += dt; if (p.t < 0) continue;
      const f = Math.min(1, p.t / p.ft); p.x = lerp(p.sx, p.tx, f); p.y = lerp(p.sy, p.ty, f) - (p.k === 'ball' ? Math.sin(f * Math.PI) * 90 : 0);
      if (f >= 1) {
        p.dead = true;
        if (p.k === 'ball') { splash(p.tx, p.ty, p.R, p.dmg, { ground: true, half: true }); burst(p.tx, p.ty, '#ff7a3d', 12, 160); arcs.push({ ring: true, x: p.tx, y: p.ty, R: p.R, life: 0.25, col: '#ff7a3d' }); sfx('boom'); }
        else if (p.k === 'rain') { splash(p.tx, p.ty, p.R, p.dmg, { power: true }); part(p.tx, p.ty, 0, -30, '#bff4ff', 0.25, 3); sfx('hit'); }
        else { splash(p.tx, p.ty, p.R, p.dmg, { half: true, power: true }); burst(p.tx, p.ty, '#ff7a3d', 50, 320); burst(p.tx, p.ty, '#ffe14a', 30, 200); arcs.push({ ring: true, x: p.tx, y: p.ty, R: p.R, life: 0.5, col: '#ffb02e' }); sfx('bigboom'); shake = 12; }
      }
      continue;
    }
    if (p.tgt && (p.tgt.dead || p.tgt.ghost)) p.tgt = null;
    if (p.tgt) { const a = Math.atan2(p.tgt.y - p.y, p.tgt.x - p.x); p.vx = Math.cos(a) * p.spd; p.vy = Math.sin(a) * p.spd; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.life <= 0 || p.x < -40 || p.x > VW + 40 || p.y < -80 || p.y > VH) { p.dead = true; continue; }
    for (const e of enemies) {
      if (e.dead || e.ghost || (!p.air && e.fly) || p.hit.includes(e.id)) continue;
      const rr = e.r + 6; if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > rr * rr) continue;
      if (p.splash) { splash(p.x, p.y, p.splash, p.dmg, { ground: !p.air, slow: p.slow, burn: p.burn }); burst(p.x, p.y, p.col, 8, 120); arcs.push({ ring: true, x: p.x, y: p.y, R: p.splash, life: 0.25, col: p.col }); p.dead = true; break; }
      damage(e, p.dmg, { crit: p.crit, apierce: p.apierce }); p.hit.push(e.id); if (Math.random() < 0.5) part(p.x, p.y, rnd(-60, 60), rnd(-60, 60), p.col, 0.2, 2);
      sfx('hit');
      if (p.pierce > 0) { p.pierce--; p.tgt = null; } else { p.dead = true; break; }
    }
  }
  for (const p of eprojs) {
    p.t += dt; if (p.t < 0) continue;
    if (p.sx == null) { p.sx = p.x; p.sy = p.y; }
    const f = Math.min(1, p.t / p.ft); p.x = lerp(p.sx, p.tx, f); p.y = lerp(p.sy, p.ty, f) - Math.sin(f * Math.PI) * 40;
    if (f >= 1) { p.dead = true; wallHit(p.dmg, p.tx); if (G.phase === 'done') return; }
  }
  for (const q of parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; q.life -= dt; }
  for (const f of floats) { f.y -= 34 * dt; f.life -= dt; }
  for (const a of arcs) a.life -= dt;
  if (enemies.some(e => e.dead)) enemies = enemies.filter(e => !e.dead);
  projs = projs.filter(p => !p.dead); eprojs = eprojs.filter(p => !p.dead);
  parts = parts.filter(q => q.life > 0); floats = floats.filter(f => f.life > 0); arcs = arcs.filter(a => a.life > 0);
  if (G.mark && G.mark.dead) G.mark = null;
}

// ---------------------------------------------------------------- render
let bg = null, bgKey = '', twinkle = [];
function hexA(c, a) { return c + Math.round(clamp(a, 0, 1) * 255).toString(16).padStart(2, '0'); }
function makeBg(ri) {
  const R = REGIONS[ri], c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  const g = c.getContext('2d'), r = seeded(ri * 977 + 5);
  // sky / ground gradient over the whole window (no bare strips anywhere)
  const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, R.sky[1]); gr.addColorStop(0.45, R.sky[0]); gr.addColorStop(1, '#05030f');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  g.setTransform(S * DPR, 0, 0, S * DPR, OX * DPR, OY * DPR);
  const L = -OX / S - 10, Rr = (CW - OX) / S + 10, T = -OY / S - 10, B = (CH - OY) / S + 10;
  // nebula blobs
  for (let i = 0; i < 7; i++) { const x = lerp(L, Rr, r()), y = lerp(T, WALLY * 0.6, r()), rad = 140 + r() * 260, cc = i % 2 ? R.hue : '#7a2bff'; const q = g.createRadialGradient(x, y, 0, x, y, rad); q.addColorStop(0, hexA(cc, 0.13)); q.addColorStop(1, hexA(cc, 0)); g.fillStyle = q; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  // stars
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`; const s = r() < 0.15 ? 2 : 1.2; g.fillRect(lerp(L, Rr, r()), lerp(T, WALLY * 0.45, r()), s, s); }
  // neon perspective grid on the battlefield
  const hz = -VH * 0.35, vx = VW / 2;
  g.strokeStyle = hexA(R.hue, 0.16); g.lineWidth = 1.5;
  for (let i = -24; i <= 24; i++) { const bx = vx + i * 70; g.beginPath(); g.moveTo(vx + (bx - vx) * 0.05, hz); g.lineTo(vx + (bx - vx) * 2.2, WALLY + 40); g.stroke(); }
  for (let i = 0; i < 26; i++) { const f = Math.pow(i / 25, 1.8), y = lerp(-OY / S, WALLY, f); g.globalAlpha = 0.25 + 0.75 * f; g.beginPath(); g.moveTo(L, y); g.lineTo(Rr, y); g.stroke(); }
  g.globalAlpha = 1;
  // ground glow near the wall
  const gg = g.createLinearGradient(0, WALLY - 260, 0, WALLY); gg.addColorStop(0, hexA(R.hue, 0)); gg.addColorStop(1, hexA(R.hue, 0.12)); g.fillStyle = gg; g.fillRect(L, WALLY - 260, Rr - L, 260);
  // region decorations (kept to the field edges so the lanes stay readable)
  g.lineJoin = 'round'; g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const side = r() < 0.5, x = side ? lerp(L, 70, r()) : lerp(VW - 70, Rr, r()), y = lerp(40, WALLY - 40, r()), sz = 8 + r() * 18 * (0.6 + y / WALLY);
    g.strokeStyle = hexA(R.hue, 0.55); g.fillStyle = hexA(R.hue, 0.1); g.lineWidth = 2; g.beginPath();
    switch (R.deco) {
      case 'grass': for (let k = -2; k <= 2; k++) { g.moveTo(x + k * 4, y); g.lineTo(x + k * 6, y - sz * (1 - Math.abs(k) * 0.2)); } g.stroke(); break;
      case 'crystal': case 'ice': g.moveTo(x, y - sz * 1.6); g.lineTo(x + sz * 0.5, y); g.lineTo(x - sz * 0.5, y); g.closePath(); g.fill(); g.stroke(); break;
      case 'rock': case 'lava': g.ellipse(x, y, sz, sz * 0.6, 0, 0, TAU); g.fill(); g.stroke(); if (R.deco === 'lava') { g.fillStyle = hexA('#ff7a3d', 0.4); g.beginPath(); g.arc(x, y, sz * 0.3, 0, TAU); g.fill(); } break;
      case 'spore': g.arc(x, y, sz * 0.5, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x, y + sz * 0.5); g.lineTo(x, y + sz * 1.2); g.stroke(); break;
      case 'pillar': g.rect(x - sz * 0.3, y - sz * 1.8, sz * 0.6, sz * 1.8); g.fill(); g.stroke(); break;
      case 'bolt': g.moveTo(x, y - sz * 1.5); g.lineTo(x - sz * 0.4, y - sz * 0.5); g.lineTo(x + sz * 0.3, y - sz * 0.6); g.lineTo(x - sz * 0.2, y + sz * 0.5); g.stroke(); break;
      case 'fog': g.fillStyle = hexA(R.hue, 0.07); g.ellipse(x, y, sz * 3, sz, 0, 0, TAU); g.fill(); break;
      case 'gear': for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.lineTo(x + Math.cos(a) * sz, y + Math.sin(a) * sz); g.lineTo(x + Math.cos(a + 0.4) * sz * 0.7, y + Math.sin(a + 0.4) * sz * 0.7); } g.closePath(); g.fill(); g.stroke(); break;
      case 'star': for (let k = 0; k < 10; k++) { const a = k / 10 * TAU - Math.PI / 2, rr = k % 2 ? sz * 0.4 : sz; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke(); break;
      case 'throne': g.rect(x - sz * 0.5, y - sz, sz, sz); g.moveTo(x - sz * 0.5, y - sz); g.lineTo(x, y - sz * 1.6); g.lineTo(x + sz * 0.5, y - sz); g.fill(); g.stroke(); break;
    }
  }
  // castle wall (extends to the very bottom of the window, painting under the home indicator)
  const wy = WALLY, bot = B;
  const wg = g.createLinearGradient(0, wy, 0, bot); wg.addColorStop(0, '#2a1a5a'); wg.addColorStop(0.35, '#160e38'); wg.addColorStop(1, '#07051a');
  g.fillStyle = wg; g.fillRect(L, wy, Rr - L, bot - wy);
  g.strokeStyle = '#b05cff44'; g.lineWidth = 1.5;
  for (let row = 0, y = wy + 14; y < bot; y += 22, row++) { g.beginPath(); g.moveTo(L, y); g.lineTo(Rr, y); g.stroke(); for (let x = L + (row % 2) * 24; x < Rr; x += 48) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 22); g.stroke(); } }
  // battlements
  g.fillStyle = '#2a1a5a'; g.strokeStyle = '#c58bff'; g.lineWidth = 2.5;
  for (let x = L; x < Rr; x += 36) { g.fillRect(x, wy - 14, 22, 16); g.strokeRect(x, wy - 14, 22, 16); }
  g.strokeStyle = '#57e9ff'; g.lineWidth = 3; g.shadowColor = '#57e9ff'; g.shadowBlur = 14; g.beginPath(); g.moveTo(L, wy + 2); g.lineTo(Rr, wy + 2); g.stroke(); g.shadowBlur = 0;
  // central keep where the hero archer stands
  const kx = VW / 2; g.fillStyle = '#24165a'; g.strokeStyle = '#ff5ad1'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(kx - 46, wy + 40); g.lineTo(kx - 46, wy - 30); g.lineTo(kx + 46, wy - 30); g.lineTo(kx + 46, wy + 40); g.closePath(); g.fill(); g.shadowColor = '#ff5ad1'; g.shadowBlur = 16; g.stroke(); g.shadowBlur = 0;
  for (let i = -2; i <= 2; i++) { g.fillRect(kx + i * 20 - 7, wy - 44, 14, 16); g.strokeRect(kx + i * 20 - 7, wy - 44, 14, 16); }
  g.strokeStyle = '#ffe14a'; g.lineWidth = 2.5; g.beginPath(); g.arc(kx, wy + 30, 20, Math.PI, 0); g.lineTo(kx + 20, wy + 60); g.moveTo(kx - 20, wy + 30); g.lineTo(kx - 20, wy + 60); g.stroke();
  // banner on the keep
  g.fillStyle = hexA(R.hue, 0.8); g.beginPath(); g.moveTo(kx + 30, wy - 44); g.lineTo(kx + 30, wy - 80); g.lineTo(kx + 52, wy - 72); g.lineTo(kx + 30, wy - 64); g.fill();
  g.setTransform(1, 0, 0, 1, 0, 0);
  bg = c; bgKey = ri + ':' + c.width + 'x' + c.height + ':' + WALLY;
  twinkle = Array.from({ length: 24 }, () => ({ x: rnd(0, VW), y: rnd(-OY / S, WALLY * 0.4), p: rnd(0, TAU) }));
}
function drawFigure(x, y, sc, col, ang, pull) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.globalCompositeOperation = 'lighter'; drawSp(glow(col, 26), 0, -6, 0, 1.1); ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.fillStyle = '#0a0620';
  ctx.beginPath(); ctx.moveTo(-9, 14); ctx.lineTo(0, -2); ctx.lineTo(9, 14); ctx.closePath(); ctx.fill(); ctx.stroke(); // cloak
  ctx.beginPath(); ctx.arc(0, -10, 6.5, 0, TAU); ctx.fill(); ctx.stroke(); // head
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-7, -13); ctx.lineTo(0, -24); ctx.lineTo(7, -13); ctx.fill(); // hood
  ctx.rotate(ang + Math.PI / 2);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -4, 14, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); // bow
  const sx = Math.cos(Math.PI * 1.15) * 14, sy = Math.sin(Math.PI * 1.15) * 14 - 4;
  ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(0, -4 + pull * 9); ctx.lineTo(-sx, sy); ctx.stroke();
  ctx.restore();
}
const TSHAPE = { archer: 'tri', crossbow: 'cross', multi: 'star', cannon: 'ball', frost: 'crys', storm: 'coil', flame: 'bowl', prism: 'dia' };
function drawTower(t, i) {
  const T = TOWERS[t.k], x = t.x, y = t.y, c = T.col;
  ctx.globalCompositeOperation = 'lighter'; drawSp(softGlow(c, 46), x, y - 6); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#1a1046'; ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - 18, y + 28); ctx.lineTo(x - 14, y - 10); ctx.lineTo(x + 14, y - 10); ctx.lineTo(x + 18, y + 28); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillRect(x - 20, y - 18, 40, 9); ctx.strokeRect(x - 20, y - 18, 40, 9);
  const top = y - 30, k = TSHAPE[t.k], a = t.anim > 0 ? 1.15 : 1;
  ctx.fillStyle = hexA(c, 0.35); ctx.beginPath();
  switch (k) {
    case 'tri': ctx.moveTo(x, top - 14 * a); ctx.lineTo(x + 14, top + 10); ctx.lineTo(x - 14, top + 10); ctx.closePath(); break;
    case 'cross': ctx.rect(x - 3, top - 12, 6, 22); ctx.rect(x - 14, top - 4, 28, 6); break;
    case 'star': for (let j = 0; j < 3; j++) { ctx.moveTo(x + (j - 1) * 10, top - 14 * a); ctx.lineTo(x + (j - 1) * 10 + 5, top + 10); ctx.lineTo(x + (j - 1) * 10 - 5, top + 10); ctx.closePath(); } break;
    case 'ball': ctx.arc(x, top, 11 * a, 0, TAU); break;
    case 'crys': ctx.moveTo(x, top - 16 * a); ctx.lineTo(x + 9, top); ctx.lineTo(x, top + 10); ctx.lineTo(x - 9, top); ctx.closePath(); break;
    case 'coil': ctx.ellipse(x, top + 4, 12, 4, 0, 0, TAU); ctx.moveTo(x + 9, top - 4); ctx.ellipse(x, top - 4, 9, 3, 0, 0, TAU); ctx.moveTo(x + 6, top - 11); ctx.ellipse(x, top - 11, 6, 2.5, 0, 0, TAU); break;
    case 'bowl': ctx.moveTo(x - 14, top - 2); ctx.quadraticCurveTo(x, top + 18, x + 14, top - 2); ctx.closePath(); break;
    case 'dia': ctx.moveTo(x, top - 15); ctx.lineTo(x + 11, top); ctx.lineTo(x, top + 12); ctx.lineTo(x - 11, top); ctx.closePath(); break;
  }
  ctx.fill(); ctx.stroke();
  if (k === 'bowl') { ctx.globalCompositeOperation = 'lighter'; for (let j = 0; j < 3; j++) drawSp(glow(j % 2 ? '#ffb02e' : '#ff3a5a', 10), x + rnd(-6, 6), top - 6 - rnd(0, 10), 0, 1); ctx.globalCompositeOperation = 'source-over'; }
  if (k === 'cross' || k === 'ball') { ctx.save(); ctx.translate(x, top); ctx.rotate((t.ang || -Math.PI / 2) + Math.PI / 2); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -18); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = '#fff'; ctx.font = '800 11px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.lv, x, y + 22);
  if (G && G.stunT > 0) { ctx.strokeStyle = '#9fd8ffaa'; ctx.lineWidth = 2; ctx.beginPath(); for (let j = 0; j < 3; j++) { ctx.moveTo(x - 14 + rnd(0, 28), top - 10); ctx.lineTo(x - 14 + rnd(0, 28), y + 10); } ctx.stroke(); }
}
function drawEnemy(e) {
  const def = e.boss || e.def, col = e.boss ? e.boss.col : def.col, sc = e.r / (e.boss ? e.boss.r : def.r);
  const bob = e.fly ? Math.sin(G.time * 6 + e.ph) * 5 : e.state === 'walk' && !e.frozen ? Math.abs(Math.sin(G.time * 9 + e.ph)) * -3 : (e.bump > 0 ? -4 : 0);
  const y = e.y + bob;
  if (e.fly) { ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(e.x + 6, e.y + e.r + 16, e.r * 0.8, e.r * 0.3, 0, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = e.ghost ? 0.28 : 1;
  if (e.elite || e.giant || e.boss) { ctx.globalCompositeOperation = 'lighter'; drawSp(glow(e.boss ? col : e.giant ? '#ffb02e' : '#ffd54a', 30), e.x, y, 0, (e.r / 14) * (1.3 + 0.15 * Math.sin(G.time * 6))); ctx.globalCompositeOperation = 'source-over'; }
  const shape = e.boss ? e.boss.shape : def.shape, br = e.boss ? e.boss.r : def.r;
  drawSp(shapeSprite(shape, br, col), e.x, y, e.fly && shape === 'bat' ? Math.sin(G.time * 14 + e.ph) * 0.12 : 0, sc);
  if (e.flash > 0) { ctx.globalAlpha = 0.6; drawSp(shapeSprite(shape, br, col, true), e.x, y, 0, sc); }
  if (e.frozen > 0) { ctx.globalAlpha = 0.45; drawSp(shapeSprite(shape, br, '#9fd8ff', true), e.x, y, 0, sc * 1.05); }
  ctx.globalAlpha = 1;
  if (e.shield > 1) { ctx.strokeStyle = `rgba(87,233,255,${0.35 + 0.5 * Math.min(1, e.shield / e.shieldMax)})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(e.x, y, e.r + 6, 0, TAU); ctx.stroke(); }
  if (e.slowT > 0 && !e.frozen) { ctx.strokeStyle = '#9fd8ff88'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r, e.r, e.r * 0.35, 0, 0, TAU); ctx.stroke(); }
  if (e.boss && !e.boss.fly) { /* crown spikes */ ctx.fillStyle = '#ffe14a'; for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(e.x + j * 12 - 5, y - e.r - 2); ctx.lineTo(e.x + j * 12, y - e.r - 14); ctx.lineTo(e.x + j * 12 + 5, y - e.r - 2); ctx.fill(); } }
  if (!e.boss && e.hp < e.max && !e.ghost) { const w = Math.max(18, e.r * 2); ctx.fillStyle = '#000a'; ctx.fillRect(e.x - w / 2, y - e.r - 9, w, 4); ctx.fillStyle = e.elite ? '#ffd54a' : e.giant ? '#ffb02e' : col; ctx.fillRect(e.x - w / 2, y - e.r - 9, w * Math.max(0, e.hp / e.max), 4); }
  if (G.mark === e) { const rr = e.r + 10 + Math.sin(G.time * 8) * 3; ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(e.x, y, rr, G.time * 2, G.time * 2 + TAU); ctx.stroke(); ctx.setLineDash([]); }
}
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const ri = G ? G.s : menuRegion;
  if (!bg || bgKey !== ri + ':' + cv.width + 'x' + cv.height + ':' + WALLY) makeBg(ri);
  ctx.drawImage(bg, 0, 0);
  const sh = shake > 0 ? [rnd(-shake, shake) * 0.4, rnd(-shake, shake) * 0.4] : [0, 0];
  ctx.setTransform(S * DPR, 0, 0, S * DPR, (OX + sh[0]) * DPR, (OY + sh[1]) * DPR);
  const tm = G ? G.time : performance.now() / 1000;
  ctx.fillStyle = '#fff'; for (const s of twinkle) { ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(tm * 1.5 + s.p)); ctx.fillRect(s.x, s.y, 2, 2); } ctx.globalAlpha = 1;
  if (!G || state === 'menu') { drawFigure(VW / 2, WALLY - 40, 1.3, '#57e9ff', -Math.PI / 2 + Math.sin(tm) * 0.4, 0.3); return; }
  // wall damage tint / cracks
  const pct = G.wall / G.wallMax;
  if (G.hitFlash > 0) { ctx.fillStyle = `rgba(255,60,120,${G.hitFlash})`; ctx.fillRect(-OX / S, WALLY - 16, CW / S, 40); }
  if (pct < 0.6) { ctx.strokeStyle = `rgba(255,90,140,${0.7 - pct})`; ctx.lineWidth = 2; const r = seeded(7); ctx.beginPath(); for (let i = 0; i < Math.ceil((1 - pct) * 12); i++) { let x = r() * VW, y = WALLY + 4; ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 24; y += 10 + r() * 10; ctx.lineTo(x, y); } } ctx.stroke(); }
  for (const e of enemies) if (!e.fly) drawEnemy(e);
  // towers / squad / hero
  towersRT.forEach((t, i) => { if (t) drawTower(t, i); });
  for (const t of towersRT) if (t && t.tgt && TOWERS[t.k].beam && G.stunT <= 0) { const w = 3 + t.ramp * 3; ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = '#ff5ad188'; ctx.lineWidth = w * 2.4; ctx.beginPath(); ctx.moveTo(t.x, t.y - 30); ctx.lineTo(t.tgt.x, t.tgt.y); ctx.stroke(); ctx.strokeStyle = '#ffd0f4'; ctx.lineWidth = w * 0.7; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
  for (const a of squad) drawFigure(a.x, a.y, 0.62, '#9fe9ff', a.ang || -Math.PI / 2, a.anim > 0 ? 0 : 0.6);
  drawFigure(hero.x, hero.y, 1.15, '#57e9ff', hero.ang, hero.anim > 0 ? 0 : 0.8);
  for (const e of enemies) if (e.fly) drawEnemy(e);
  // projectiles
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const p of projs) {
    if (p.k === 'ball') { drawSp(glow('#ff7a3d', 14), p.x, p.y, 0, 1); continue; }
    if (p.k === 'meteor') { if (p.t < 0) continue; const a = Math.atan2(p.ty - p.sy, p.tx - p.sx); for (let j = 0; j < 6; j++) drawSp(glow(j % 2 ? '#ffb02e' : '#ff3a5a', 30), p.x - Math.cos(a) * j * 18, p.y - Math.sin(a) * j * 18, 0, 1.6 - j * 0.2); continue; }
    if (p.k === 'rain') { if (p.t < 0) continue; const a = Math.atan2(p.ty - p.sy, p.tx - p.sx); ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(a) * 22, p.y - Math.sin(a) * 22); ctx.stroke(); continue; }
    const a = Math.atan2(p.vy, p.vx), L = p.k === 'bolt' ? 22 : p.k === 'arrow' ? 16 : 6;
    if (p.k === 'shard' || p.k === 'fire') { drawSp(glow(p.col, p.k === 'fire' ? 14 : 11), p.x, p.y, 0, 1); continue; }
    ctx.strokeStyle = p.col; ctx.lineWidth = p.w || 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(a) * L, p.y - Math.sin(a) * L); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(a) * 5, p.y - Math.sin(a) * 5); ctx.stroke();
  }
  for (const p of eprojs) if (p.t >= 0) drawSp(glow(p.col, p.big ? 16 : 10), p.x, p.y, 0, 1);
  for (const a of arcs) {
    ctx.globalAlpha = Math.min(1, a.life * 4);
    if (a.ring) { ctx.strokeStyle = a.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(a.x, a.y, a.R * (1.1 - a.life), 0, TAU); ctx.stroke(); continue; }
    ctx.strokeStyle = a.col; ctx.lineWidth = 4; ctx.beginPath(); a.pts.forEach(([x, y], j) => { if (!j) ctx.moveTo(x, y); else { const [px, py] = a.pts[j - 1]; ctx.lineTo((px + x) / 2 + rnd(-12, 12), (py + y) / 2 + rnd(-12, 12)); ctx.lineTo(x, y); } }); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const q of parts) { ctx.globalAlpha = q.life / q.max; ctx.fillStyle = q.col; ctx.fillRect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, q.sz); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (G.markPt) { ctx.strokeStyle = `rgba(255,225,74,${G.markPt.life / 3})`; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(G.markPt.x, G.markPt.y, 60, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  if (G.freezeFx > 0) { ctx.fillStyle = `rgba(160,220,255,${G.freezeFx * 0.4})`; ctx.fillRect(-OX / S, -OY / S, CW / S, CH / S); }
  ctx.textAlign = 'center';
  for (const f of floats) { ctx.globalAlpha = Math.min(1, f.life / f.max * 2); ctx.font = '800 15px system-ui,sans-serif'; ctx.fillStyle = '#000a'; ctx.fillText(f.text, f.x + 1, f.y + 1); ctx.fillStyle = f.col; ctx.fillText(f.text, f.x, f.y); }
  ctx.globalAlpha = 1;
  // boss bar (just under the HUD)
  if (G.boss) { const b = G.boss, top = hudBottom() + 8, w = Math.min(VW - 60, 420), x = (VW - w) / 2; ctx.fillStyle = '#000b'; ctx.fillRect(x - 2, top - 2, w + 4, 14); ctx.fillStyle = b.boss.col; ctx.fillRect(x, top, w * Math.max(0, b.hp / b.max), 10); ctx.font = '800 13px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(b.boss.name + (b.enraged ? ' — ENRAGED' : ''), VW / 2, top + 28); }
  if (G.banner) { const B = G.banner, a = Math.min(1, B.life * 2, (B.max - B.life) * 4), y = WALLY * 0.36; ctx.globalAlpha = a; ctx.font = '900 38px system-ui,sans-serif'; ctx.fillStyle = '#57e9ff'; ctx.fillText(B.t, VW / 2 + 2, y + 2); ctx.fillStyle = '#fff'; ctx.fillText(B.t, VW / 2, y); if (B.sub) { ctx.font = '700 18px system-ui,sans-serif'; ctx.fillStyle = '#ffe14a'; ctx.fillText(B.sub, VW / 2, y + 32); } ctx.globalAlpha = 1; }
}
let hudB = 0, hudBT = 0;
function hudBottom() { const n = performance.now(); if (n - hudBT > 500) { hudBT = n; try { const r = hud.getBoundingClientRect(); hudB = r.height ? (r.bottom - OY) / S : 0; } catch (e) { hudB = 0; } } return hudB; }

// ---------------------------------------------------------------- end of level
function grantRun(extra = {}) {
  const c = G.coins + (extra.c || 0), cr = G.gems + (extra.cr || 0), ru = G.runes + (extra.ru || 0);
  save.coins += c; save.gems += cr; save.runes += ru; save.stats.coinsEarned += c; save.stats.runesEarned += ru;
  return { c, cr, ru };
}
function endLevel(win, retreat = false) {
  if (!G || G.phase === 'done') return;
  G.phase = 'done'; state = 'result'; hud.classList.add('hidden'); barEl.classList.add('hidden');
  const L = G.L, d = G.d, R = { win, retreat, stars: 0, newStars: 0, first: false, bonusC: 0, bonusCr: 0, bonusRu: 0 };
  if (G.endless) {
    const waves = Math.max(0, G.endlessWave - (G.queue.length || enemies.length ? 1 : 0)), best = save.endless[G.diff] || 0;
    R.waves = waves; R.record = waves > best;
    R.bonusC = Math.round(G.coins * 0.25); R.bonusCr = R.record ? Math.min(25, waves - best) : 0;
    if (R.record) save.endless[G.diff] = waves;
  } else if (win) {
    const pct = G.wall / G.wallMax; let stars = pct >= 0.75 ? 3 : pct >= 0.4 ? 2 : 1;
    if (G.rescues) stars = 1; if (G.diff === 'kid') stars = Math.min(stars, 1);
    const prev = (save.levels[L] && save.levels[L].stars) || 0;
    R.first = prev === 0; R.newStars = Math.max(0, stars - prev); R.stars = stars;
    R.bonusC = Math.round((40 + 18 * L) * G.st.bounty * d.reward * (R.first ? 2 : 1));
    R.bonusCr = R.newStars * 4 + 1 + (G.lv.boss && R.first ? 10 : 0);
    R.bonusRu = G.s >= 3 ? 1 + Math.floor((G.s - 3) / 3) : 0;
    save.levels[L] = { stars: Math.max(prev, stars), best: Math.max(((save.levels[L] || {}).best) || 0, Math.round(pct * 100)) };
  }
  R.tot = grantRun({ c: R.bonusC, cr: R.bonusCr, ru: R.bonusRu });
  persist();
  sfx(win ? 'win' : 'lose');
  setTimeout(() => resultScreen(R), win ? 700 : 500);
}

// ---------------------------------------------------------------- UI
function ui(html, actions = {}) {
  uiEl.innerHTML = html;
  uiEl.querySelectorAll('[data-a]').forEach(el => el.addEventListener('click', ev => { ev.stopPropagation(); audioInit(); sfx('click'); const f = actions[el.dataset.a]; if (f) f(el); }));
}
// compact numbers: 9,999 · 12.3K · 456K · 7.89M · 1.2B
function fmtC(n, full = 9999) {
  n = Math.floor(n || 0); const a = Math.abs(n);
  if (a <= full) return n.toLocaleString();
  const u = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']].find(x => a >= x[0]);
  const v = n / u[0], dd = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2, m = Math.pow(10, dd);
  return (Math.floor(v * m) / m).toString() + u[1];
}
const showRunes = () => save.runes > 0 || highestCleared() >= 15;
const wallet = () => `<div class="res wallet"><span class="coin" title="${save.coins.toLocaleString()} coins">● ${fmtC(save.coins, 999999)}</span><span class="gem" title="${save.gems.toLocaleString()} gems">◆ ${fmtC(save.gems, 99999)}</span>${showRunes() ? `<span class="rune" title="${save.runes.toLocaleString()} runes">✧ ${fmtC(save.runes, 99999)}</span>` : ''}</div>`;
const costHtml = c => `● ${fmtC(c.coins)}${c.cr || c.ru ? '<br>' : ''}${c.cr ? `<span class="gem">◆ ${fmtC(c.cr)}</span>` : ''}${c.ru ? ` <span class="rune">✧ ${fmtC(c.ru)}</span>` : ''}`;
const canPay = c => save.coins >= c.coins && save.gems >= (c.cr || 0) && save.runes >= (c.ru || 0);
function pay(c) { save.coins -= c.coins; save.gems -= c.cr || 0; save.runes -= c.ru || 0; }
const pips = (n, max) => `<div class="pips${max > 12 ? ' dense' : ''}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
function showMenuChrome() { state = 'menu'; G = null; hud.classList.add('hidden'); barEl.classList.add('hidden'); menuRegion = Math.floor(Math.min(NLEV - 1, highestCleared()) / 5); }

function menuScreen() {
  showMenuChrome();
  const next = Math.min(NLEV, highestCleared() + 1), inHub = window.HubSave && window.HubSave.inHub, endOK = highestCleared() >= 10;
  ui(`<div class="panel clear">
    <h1>NEON<br>KEEP</h1><div class="sub">Defend the castle! Upgrade your archers and towers.</div>
    ${wallet()}
    <button class="btn" data-a="play">▶ PLAY · Level ${next}</button>
    <button class="btn alt" data-a="forge">⚒ UPGRADES</button>
    <button class="btn warn" data-a="endless" ${endOK ? '' : 'disabled'}>∞ ENDLESS${endOK ? ` · best ${save.endless[save.diff] || 0}` : ' · clear level 10'}</button>
    <div class="seg">${Object.keys(DIFF).map(k => `<button data-a="diff" data-d="${k}" class="${save.diff === k ? 'on' : ''}">${DIFF[k].name}</button>`).join('')}</div>
    <div class="note">${save.diff === 'kid' ? 'Kid mode: slow foes and the castle never falls. Earns 1★.' : save.diff === 'hard' ? 'Hard: tougher foes, ×1.6 rewards.' : 'Normal: the intended challenge.'}</div>
    <div class="row"><button class="btn small" data-a="mute">${save.muted ? '🔇 Sound off' : '🔊 Sound on'}</button>${inHub ? '<button class="btn small alt" data-a="exit">◀ Games</button>' : ''}</div>
    <div class="note">Levels cleared ${highestCleared()}/${NLEV} · ★ ${totalStars()}/${NLEV * 3}</div>
    <div class="note rotate-hint">Tip: Neon Keep plays best with the phone upright.</div>
  </div>`, {
    play: () => mapScreen(), forge: () => forgeScreen(), endless: () => endOK && startLevel(0, true),
    diff: el => { save.diff = el.dataset.d; persist(); menuScreen(); },
    mute: () => { save.muted = !save.muted; if (master) master.gain.value = save.muted ? 0 : 0.5; persist(); menuScreen(); },
    exit: () => window.HubSave.exit(),
  });
}
function mapScreen() {
  showMenuChrome();
  const hc = highestCleared();
  let html = `<div class="panel" id="mapP"><div class="top"><div class="row"><button class="btn small" data-a="back">◀ Back</button><button class="btn small alt" data-a="forge">⚒ Upgrades</button></div>${wallet()}</div>`;
  for (let s = 0; s < NREG; s++) {
    const R = REGIONS[s], st = [1, 2, 3, 4, 5].reduce((a, k) => a + (((save.levels[s * 5 + k] || {}).stars) || 0), 0), open = unlockedLevel(s * 5 + 1);
    html += `<div class="sector" style="color:${R.hue};text-shadow:0 0 10px ${R.hue}${open ? '' : ';opacity:.4'}"><span>${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][s]} · ${R.name}</span><span class="ss">★ ${st}/15</span></div><div class="levels">`;
    for (let k = 1; k <= 5; k++) {
      const L = s * 5 + k, lv = LEVELS[L - 1], ok = unlockedLevel(L), stars = ((save.levels[L] || {}).stars) || 0;
      html += `<button class="lv${lv.boss ? ' boss' : lv.guard ? ' guard' : ''}${ok ? '' : ' locked'}${L === hc + 1 ? ' next' : ''}" data-a="lv" data-l="${L}" ${ok ? '' : 'disabled'}>${lv.boss ? '☠' : ''}${L}<small>${ok ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '🔒'}</small></button>`;
    }
    html += `</div>`;
  }
  html += `<div class="note">☠ boss level · orange = giant guard · replay levels to grind coins & gems</div></div>`;
  ui(html, { back: menuScreen, forge: () => forgeScreen(), lv: el => startLevel(+el.dataset.l) });
  const nx = uiEl.querySelector('.lv.next'); if (nx) setTimeout(() => nx.scrollIntoView({ block: 'center' }), 0);
}
let forgeTab = 'hero', forgeSel = -1;
const TABS = [['hero', '🏹 Hero'], ['castle', '▦ Castle'], ['towers', '⌂ Towers'], ['powers', '☄ Powers'], ['gold', '● Gold']];
function trackCard(k) {
  const T = TRACKS[k], t = save.upg[k], max = t >= T.max, locked = T.req != null && T.req > 0 && !cleared(T.req), c = max ? null : upgCost(k, t + 1);
  return `<div class="card${locked ? ' locked' : ''}"><div class="tic" style="--c:${T.tab === 'castle' ? '#c58bff' : T.tab === 'gold' ? '#ffd54a' : T.tab === 'powers' ? '#ff7a3d' : '#57e9ff'}">${T.ic}</div><div class="info"><div class="nm">${T.name} <small style="color:#9fb7d9">${t}/${T.max}</small></div>
    <div class="ds">${T.ds(t)}${max ? '' : ` → <b style="color:#dff">${T.ds(t + 1).replace(/^Unlock: /, '')}</b>`}</div>${pips(t, T.max)}</div>
    ${locked ? `<button class="buy" disabled>Clear level ${T.req}</button>` : max ? `<button class="buy max" disabled>MAX</button>` : `<button class="buy" data-a="buy" data-k="${k}" ${canPay(c) ? '' : 'disabled'}>${t ? '' : 'UNLOCK<br>'}${costHtml(c)}</button>`}</div>`;
}
function towerCard(k) {
  const T = TOWERS[k], lv = save.towers[k], max = lv >= TMAX, locked = T.req > 0 && !cleared(T.req), c = max ? null : towerCost(k, lv);
  return `<div class="card${locked ? ' locked' : ''}"><div class="tic" style="--c:${T.col};color:${T.col}">${T.ic}</div><div class="info"><div class="nm">${T.name} <small style="color:#9fb7d9">${lv ? 'Lv ' + lv + '/' + TMAX : ''}</small></div>
    <div class="ds">${lv ? tDesc(k, lv) : T.ds}${lv && !max ? ` → <b style="color:#dff">${fmtC(tDmg(k, lv + 1))}</b>` : ''}</div>${lv ? pips(lv, TMAX) : ''}</div>
    ${locked ? `<button class="buy" disabled>Clear level ${T.req}</button>` : max ? `<button class="buy max" disabled>MAX</button>` : `<button class="buy" data-a="tbuy" data-k="${k}" ${canPay(c) ? '' : 'disabled'}>${lv ? '' : 'UNLOCK<br>'}${costHtml(c)}</button>`}</div>`;
}
function forgeScreen(tab) {
  showMenuChrome();
  if (tab) forgeTab = tab;
  const prevScroll = (uiEl.querySelector('#forgeP') || {}).scrollTop || 0, same = uiEl.querySelector('#forgeP') && uiEl.dataset.tab === forgeTab;
  let body = '';
  if (forgeTab === 'towers') {
    const built = save.upg.slots;
    body += `<h3>Wall slots — tap one to choose its tower</h3><div class="slots">${save.slots.map((k, i) => i < built ? `<button class="slot ${k ? 'on' : ''}${forgeSel === i ? ' sel' : ''}" style="--c:${k ? TOWERS[k].col : '#3a5a8a'}" data-a="slot" data-i="${i}">${k ? TOWERS[k].ic : '+'}<small>${k ? 'Lv ' + save.towers[k] : 'empty'}</small></button>` : `<button class="slot locked" disabled>🔒<small>slot ${i + 1}</small></button>`).join('')}</div>`;
    if (forgeSel >= 0 && forgeSel < built) {
      const own = TOWER_KEYS.filter(k => save.towers[k] > 0);
      body += `<div class="seg">${own.map(k => `<button data-a="place" data-k="${k}" class="${save.slots[forgeSel] === k ? 'on' : ''}">${TOWERS[k].ic} ${TOWERS[k].name.split(' ')[0]}</button>`).join('')}<button data-a="place" data-k="">✕ Empty</button></div>${own.length ? '' : '<div class="note">Unlock a tower below first.</div>'}`;
    }
    body += trackCard('slots') + TOWER_KEYS.map(towerCard).join('');
  } else body += TRACK_KEYS.filter(k => TRACKS[k].tab === forgeTab).map(trackCard).join('');
  ui(`<div class="panel" id="forgeP"><div class="top"><div class="row"><button class="btn small" data-a="back">◀ Menu</button><button class="btn small" data-a="map">▶ Play</button></div>${wallet()}
    <div class="tabs">${TABS.map(([k, n]) => `<button data-a="tab" data-t="${k}" class="${forgeTab === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>${body}
    <div class="note">Coins come from every foe. ◆ Gems: stars, elites, bosses, Gem Hunter. ✧ Runes: elites, giants &amp; bosses from region IV on.</div></div>`, {
    back: menuScreen, map: mapScreen,
    tab: el => { forgeTab = el.dataset.t; forgeSel = -1; forgeScreen(); },
    buy: el => { const k = el.dataset.k, c = upgCost(k, save.upg[k] + 1); if (!canPay(c) || save.upg[k] >= TRACKS[k].max) return; pay(c); save.upg[k]++;
      if (k === 'slots') { const i = save.upg.slots - 1; if (!save.towers.archer) save.towers.archer = 1; if (!save.slots[i]) save.slots[i] = 'archer'; }
      persist(); sfx('buy'); forgeScreen(); },
    tbuy: el => { const k = el.dataset.k, c = towerCost(k, save.towers[k]); if (!canPay(c) || save.towers[k] >= TMAX) return; pay(c); const first = !save.towers[k]; save.towers[k]++;
      if (first) { const i = save.slots.findIndex((s, j) => !s && j < save.upg.slots); if (i >= 0) save.slots[i] = k; }
      persist(); sfx('buy'); forgeScreen(); },
    slot: el => { const i = +el.dataset.i; forgeSel = forgeSel === i ? -1 : i; forgeScreen(); },
    place: el => { if (forgeSel < 0) return; save.slots[forgeSel] = el.dataset.k || null; persist(); forgeSel = -1; forgeScreen(); },
  });
  uiEl.dataset.tab = forgeTab;
  const p = uiEl.querySelector('#forgeP'); if (p && same) p.scrollTop = prevScroll;
}
function resultScreen(R) {
  const L = G.L, endless = G.endless, nextOK = R.win && L < NLEV;
  const title = endless ? 'THE WALL FELL' : R.retreat ? 'RETREAT' : R.win ? 'VICTORY!' : 'THE WALL FELL';
  ui(`<div class="panel"><h2>${title}</h2>
    ${R.win ? `<div class="stars">${'★'.repeat(R.stars)}<span class="off">${'★'.repeat(3 - R.stars)}</span></div>` : ''}
    <div class="sub">${endless ? `Survived ${R.waves} wave${R.waves === 1 ? '' : 's'}${R.record ? ' — NEW RECORD! 🏆' : ` · best ${save.endless[G.diff]}`}` : R.win ? `${REGIONS[G.s].name} · Level ${L}${G.diff === 'kid' ? ' · Kid mode earns 1★' : G.rescues ? ' · the wall was rescued (1★)' : ''}` : 'You keep everything you collected. Upgrade and try again!'}</div>
    <div class="res"><span class="coin">● +${fmtC(R.tot.c, 999999)}</span><span class="gem">◆ +${fmtC(R.tot.cr)}</span>${R.tot.ru ? `<span class="rune">✧ +${fmtC(R.tot.ru)}</span>` : ''}</div>
    ${R.bonusC ? `<div class="note">${endless ? 'Endless bonus' : 'Clear bonus'} ● ${fmtC(R.bonusC)}${R.first ? ' (first clear ×2)' : ''}${R.bonusCr ? ` · ◆ ${R.bonusCr}` : ''}${R.bonusRu ? ` · ✧ ${R.bonusRu}` : ''}</div>` : ''}
    <div class="note">Foes defeated: ${G.kills}</div>
    ${nextOK ? `<button class="btn" data-a="next">NEXT LEVEL ▶</button>` : ''}
    <div class="row"><button class="btn alt" data-a="forge">⚒ Upgrade</button><button class="btn ${nextOK ? 'alt' : ''}" data-a="again">↻ ${endless ? 'Again' : 'Replay'}</button></div>
    <button class="btn small" data-a="map">Map</button></div>`, {
    next: () => startLevel(L + 1), again: () => startLevel(L, endless), forge: () => forgeScreen(), map: () => endless ? menuScreen() : mapScreen(),
  });
}
function pauseGame() {
  if (state !== 'play') return;
  state = 'pause';
  ui(`<div class="panel"><h2>PAUSED</h2><div class="sub">${G.endless ? 'Endless · wave ' + G.endlessWave : 'Level ' + G.L + ' · ' + REGIONS[G.s].name}</div>
    <button class="btn" data-a="resume">▶ Resume</button>
    <div class="row"><button class="btn small alt" data-a="restart">↻ Restart</button><button class="btn small" data-a="mute">${save.muted ? '🔇 Sound off' : '🔊 Sound on'}</button></div>
    <button class="btn warn" data-a="quit">⚑ Retreat (keep loot)</button></div>`, {
    resume: () => { uiEl.innerHTML = ''; state = 'play'; },
    restart: () => { grantRun(); persist(); startLevel(G.L, G.endless); },
    mute: () => { save.muted = !save.muted; if (master) master.gain.value = save.muted ? 0 : 0.5; persist(); state = 'play'; pauseGame(); },
    quit: () => { state = 'play'; endLevel(false, true); },
  });
}
// HUD (HTML; only rewritten when something changes)
let hudCache = '', barCache = '';
function updateHud() {
  const pct = G.wall / G.wallMax;
  const s = `<span>♜</span><div class="hpbar"><i class="${pct < 0.3 ? 'low' : ''}" style="width:${Math.max(0, pct * 100).toFixed(1)}%"></i></div><span>${fmtC(G.wall, 9999)}</span>|${G.endless ? 'Endless · Wave ' + G.endlessWave : `Lv ${G.L} · Wave ${Math.max(1, G.waveIdx + 1)}/${G.nW}`}${G.diff === 'kid' ? ' · Kid' : ''}|<span class="coin">● ${fmtC(G.coins, 99999)}</span><span class="gem">◆ ${fmtC(G.gems, 9999)}</span>${G.runes || G.s >= 3 ? `<span class="rune">✧ ${fmtC(G.runes, 9999)}</span>` : ''}`;
  if (s !== hudCache) { hudCache = s; const [a, b, c] = s.split('|'); $('hWall').innerHTML = a; $('hWave').textContent = b; $('hRes').innerHTML = c; }
  let bs = '';
  for (const [k] of POWERS) if (save.upg[k]) { const T = TRACKS[k], cd = { rain: rainCd, heal: healCd, freeze: freezeCd, meteor: meteorCd }[k](save.upg[k]); bs += k + ':' + (G.cd[k] / cd).toFixed(2) + ','; }
  bs += save.speed;
  if (bs !== barCache) { barCache = bs; for (const [k] of POWERS) { const b = barEl.querySelector(`[data-p="${k}"]`); if (!b) continue; const cd = { rain: rainCd, heal: healCd, freeze: freezeCd, meteor: meteorCd }[k](save.upg[k]), p = G.cd[k] / cd; b.style.setProperty('--p', p.toFixed(3)); b.classList.toggle('ready', p <= 0); } const sp = barEl.querySelector('.spd'); if (sp) sp.textContent = save.speed === 2 ? '2×' : '1×'; }
}
function buildBar() {
  barCache = '';
  barEl.innerHTML = POWERS.filter(([k]) => save.upg[k]).map(([k, c]) => `<button class="ab" data-p="${k}" style="--c:${c}">${TRACKS[k].ic}<span class="cd"></span><span class="t">${TRACKS[k].name.split(' ').pop().toUpperCase()}</span></button>`).join('') + `<button class="ab spd">${save.speed === 2 ? '2×' : '1×'}</button>`;
  barEl.querySelectorAll('[data-p]').forEach(b => b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); audioInit(); usePower(b.dataset.p); }));
  barEl.querySelector('.spd').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); save.speed = save.speed === 2 ? 1 : 2; persist(); barCache = ''; });
}

// ---------------------------------------------------------------- input
document.addEventListener('pointerdown', e => {
  audioInit();
  if (state !== 'play' || (e.target.closest && e.target.closest('button'))) return;
  const x = (e.clientX - OX) / S, y = (e.clientY - OY) / S;
  if (y > WALLY - 10) return;
  let best = null, bd = 80 * 80;
  for (const en of enemies) { if (en.dead || en.ghost) continue; const d = (en.x - x) ** 2 + (en.y - y) ** 2 - en.r * en.r; if (d < bd) { bd = d; best = en; } }
  if (best) { G.mark = best; G.markPt = null; hero.cd = Math.min(hero.cd, 0.08); }
  else { G.mark = null; G.markPt = { x, y, life: 3 }; }
  arcs.push({ ring: true, x, y, R: 40, life: 0.3, col: '#ffe14a' });
}, { passive: true });
document.addEventListener('touchmove', e => { if (!(e.target.closest && e.target.closest('.panel'))) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
$('btnPause').addEventListener('click', e => { e.stopPropagation(); pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseGame(); persist(); } });
addEventListener('pagehide', persist);
addEventListener('resize', resize);
addEventListener('orientationchange', () => { setTimeout(resize, 120); setTimeout(resize, 500); });
if (window.visualViewport) visualViewport.addEventListener('resize', () => { if (Math.abs(visualViewport.height - innerHeight) < 2) resize(); });

// ---------------------------------------------------------------- loop
let last = performance.now(), fpsAcc = 0, fpsN = 0, fps = 60;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05; if (dt <= 0) dt = 0.001;
  fpsAcc += dt; fpsN++; if (fpsAcc > 1) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  if (state === 'play') { for (let i = 0; i < save.speed && state === 'play'; i++) update(dt); if (state === 'play') updateHud(); }
  render();
}
if (window.HubSave && window.HubSave.inHub) document.body.classList.add('inhub');
resize();
menuScreen();
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

// test/debug hooks
window.NK = {
  get save() { return save; }, get state() { return state; }, get G() { return G; }, get fps() { return fps; }, get enemies() { return enemies; },
  start: startLevel, map: mapScreen, forge: t => forgeScreen(t), menu: menuScreen, power: usePower, pause: pauseGame,
  grant: (c, cr, ru = 0) => { save.coins += c; save.gems += cr; save.runes += ru; persist(); },
  step: (sec, dt = 1 / 60) => { for (let t = 0; t < sec && state === 'play'; t += dt) update(dt); if (state === 'play') updateHud(); },
  costTable: () => ({ tracks: TRACK_KEYS.map(k => [k, Array.from({ length: TRACKS[k].max }, (_, i) => upgCost(k, i + 1))]), towers: TOWER_KEYS.map(k => [k, Array.from({ length: TMAX }, (_, i) => towerCost(k, i))]) }),
  info: () => ({ levels: NLEV, regions: NREG, enemyTypes: Object.keys(EDEF).length, bosses: Object.keys(BOSSDEF).length, guardians: LEVELS.filter(l => l.guard).length, towers: TOWER_KEYS.length,
    tracks: TRACK_KEYS.length + TOWER_KEYS.length, tiers: TRACK_KEYS.reduce((a, k) => a + TRACKS[k].max, 0) + TOWER_KEYS.length * TMAX }),
  levels: LEVELS, migrate: migrateSave, setInsets: o => { insOverride = o; resize(); }, fmtC, calcStats,
  set: o => { Object.assign(save, o); persist(); }, reset: () => { save = defSave(); persist(); menuScreen(); }, reload: () => { save = loadSave(); },
  get WALLY() { return WALLY; }, get VW() { return VW; }, get VH() { return VH; }, end: endLevel,
};
})();
