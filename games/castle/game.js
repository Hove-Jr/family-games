/* Stonehold Keep — original procedural castle defense. No external assets. */
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
const POWERS = [['rain', '#5aa7d6'], ['heal', '#6fbf5a'], ['freeze', '#8fd3ff'], ['meteor', '#e0773a']];

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
  bat:      { name:'Duskbat',    hp:22,  spd:70, dmg:5,  coin:5,  r:12, col:'#c58bff', shape:'bat',    fly:1, u:1.2 },
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
  { name:'Greenmeadow Vale',      hue:'#5dff8a', sky:['#06142a', '#12082e'], roster:['grunt', 'runner', 'bat'],                         sig:'grunt',    boss:'thorn', deco:'grass' },
  { name:'Crystal Woods',    hue:'#57e9ff', sky:['#041a2e', '#0a0a30'], roster:['grunt', 'runner', 'shield', 'bat'],               sig:'shield',   boss:'wyrm',  deco:'crystal' },
  { name:'Ember Canyon',     hue:'#ff7a3d', sky:['#2a0c06', '#14061e'], roster:['grunt', 'brute', 'archer', 'runner', 'bat'],      sig:'brute',    boss:'ox',    deco:'rock' },
  { name:'Frostveil Peaks',  hue:'#9fd8ff', sky:['#0a1838', '#1a1040'], roster:['brute', 'shield', 'healer', 'runner', 'archer', 'bat'], sig:'healer', boss:'giant', deco:'ice' },
  { name:'Mirefen Marsh',      hue:'#b6ff3a', sky:['#0c1e08', '#160a26'], roster:['splitter', 'swarm', 'healer', 'grunt', 'archer', 'bat'], sig:'splitter', boss:'bog', deco:'spore' },
  { name:'Sunken Ruins',     hue:'#3affd8', sky:['#03202a', '#0a0a2a'], roster:['shield', 'wraith', 'splitter', 'brute', 'archer', 'ram'], sig:'wraith', boss:'tide', deco:'pillar' },
  { name:'Storm Highlands',  hue:'#ffe14a', sky:['#1a1806', '#100a2a'], roster:['knight', 'bat', 'bomber', 'runner', 'shaman', 'ram'], sig:'knight', boss:'roc', deco:'bolt' },
  { name:'Shadow Hollow',    hue:'#c58bff', sky:['#120626', '#050210'], roster:['wraith', 'swarm', 'shaman', 'knight', 'healer', 'bomber'], sig:'shaman', boss:'dread', deco:'fog' },
  { name:'Clockwork Wastes', hue:'#ffb02e', sky:['#1e1204', '#0e0a1e'], roster:['golem', 'ram', 'archer', 'shield', 'bomber', 'splitter'], sig:'golem', boss:'gear', deco:'gear' },
  { name:'Lava Forge',       hue:'#ff3a5a', sky:['#2a0408', '#120414'], roster:['golem', 'brute', 'knight', 'bomber', 'shaman', 'ram', 'healer'], sig:'ram', boss:'titan', deco:'lava' },
  { name:'Starfall Rift',    hue:'#ff5ad1', sky:['#1e0628', '#04041a'], roster:['wraith', 'bat', 'splitter', 'knight', 'golem', 'swarm', 'shaman'], sig:'bomber', boss:'star', deco:'star' },
  { name:'Void Citadel',       hue:'#e8e8ff', sky:['#0a0a1e', '#000000'], roster:['grunt', 'runner', 'brute', 'shield', 'bat', 'archer', 'healer', 'ram', 'splitter', 'wraith', 'bomber', 'golem', 'shaman', 'swarm', 'knight'], sig:'knight', boss:'void', deco:'throne' },
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
  for (let i = 0; i < 4; i++) part(x + rnd(-10, 10), WALLY + rnd(-4, 6), rnd(-80, 80), rnd(-140, -30), i % 2 ? '#9a9080' : '#c8bca8', 0.45, 3);
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
function part(x, y, vx, vy, col, life, sz) { if (parts.length > 320) return; parts.push({ x, y, vx, vy, col, life, max: life, sz }); }
function burst(x, y, col, n, sp) { if (col === '#ff7a3d' && n >= 12) explosion(x, y, n >= 40); else if (n >= 10) deathPuff(x, y, col, n); n = Math.min(n, 28); for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(0.2, 1) * sp; part(x, y, Math.cos(a) * v, Math.sin(a) * v, i % 3 ? col : '#ffffff', rnd(0.25, 0.6), rnd(2, 4)); } }
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

// ---------------------------------------------------------------- ART: painted fantasy look (100% procedural & original, no external assets)
let SPR = 2; // sprite cache resolution (device px per game unit)
const FH = '"Copperplate","Cinzel","Palatino Linotype","Book Antiqua",Georgia,serif', FB = '"Avenir Next","Nunito","Segoe UI",system-ui,sans-serif';
const _rgbC = {};
function rgbOf(h) { if (_rgbC[h]) return _rgbC[h]; let s = h.replace('#', ''); if (s.length === 3) s = s.split('').map(c => c + c).join(''); const n = parseInt(s.slice(0, 6), 16); return _rgbC[h] = [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function shade(h, f) { const [r, g, b] = rgbOf(h), t = f < 0 ? 0 : 255, p = Math.min(1, Math.abs(f)); return '#' + [r, g, b].map(v => Math.round(v + (t - v) * p).toString(16).padStart(2, '0')).join(''); }
function rgba(h, a) { const [r, g, b] = rgbOf(h); return `rgba(${r},${g},${b},${a})`; }
function mix(a, b, t) { const A = rgbOf(a), B = rgbOf(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function rr(g, x, y, w, h, r) { g.beginPath(); r = Math.min(r, w / 2, h / 2); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function ball(g, x, y, rx, ry, col, hl = 0.32, dk = -0.42) { const gr = g.createRadialGradient(x - rx * 0.38, y - ry * 0.42, Math.min(rx, ry) * 0.08, x, y, Math.max(rx, ry) * 1.08); gr.addColorStop(0, shade(col, hl)); gr.addColorStop(0.5, col); gr.addColorStop(1, shade(col, dk)); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }
function hgrad(g, x0, x1, col, hl = 0.22, dk = -0.45) { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, shade(col, hl * 0.4)); gr.addColorStop(0.3, shade(col, hl)); gr.addColorStop(0.62, col); gr.addColorStop(1, shade(col, dk)); return gr; }
function vgrad(g, y0, y1, a, b) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; }
function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); }
// sprite with a dark cartoon outline (dilated silhouette) — gives every unit a crisp "pro" read
function outlined(w, h, fn, ow = 1.5, oc = '#1b120b') {
  const sc = SPR, a = mk(w, h, fn, sc), c = document.createElement('canvas'); c.width = a.width; c.height = a.height; const g = c.getContext('2d');
  const o = ow * sc; for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; g.drawImage(a, Math.cos(an) * o, Math.sin(an) * o); }
  g.globalCompositeOperation = 'source-in'; g.fillStyle = oc; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over'; g.drawImage(a, 0, 0); c.w = w; c.h = h; c.ox = a.ox; c.oy = a.oy; return c;
}
function tinted(sp, col, al) { const c = document.createElement('canvas'); c.width = sp.width; c.height = sp.height; const g = c.getContext('2d'); g.drawImage(sp, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = al; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); c.w = sp.w; c.h = sp.h; return c; }
function shadowSp(rx) { rx = Math.max(4, Math.round(rx)); const k = 'sh' + rx; if (cache[k]) return cache[k]; return cache[k] = mk(rx * 2.4, rx * 1.1, (g, w, h) => { g.translate(w / 2, h / 2); g.scale(1, h / w); const q = g.createRadialGradient(0, 0, 0, 0, 0, w / 2); q.addColorStop(0, 'rgba(0,0,0,0.42)'); q.addColorStop(0.6, 'rgba(0,0,0,0.2)'); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(-w / 2, -w / 2, w, w); }, 2); }
function puffSp(col) { const k = 'pf' + col; if (cache[k]) return cache[k]; return cache[k] = mk(32, 32, g => { const q = g.createRadialGradient(13, 13, 1, 16, 16, 16); q.addColorStop(0, rgba(shade(col, 0.25), 0.95)); q.addColorStop(0.55, rgba(col, 0.7)); q.addColorStop(1, rgba(col, 0)); g.fillStyle = q; g.fillRect(0, 0, 32, 32); }, 2); }

// ---- region art palettes (ground, dirt road, foliage, rock, haze) — index matches REGIONS
const ART = [
  { g: ['#6aa53c', '#86c050', '#4c8a2a'], d: ['#b98f58', '#d4b07a', '#8a683c'], leaf: ['#3e8d2e', '#62b446', '#2a6a22'], rock: ['#9b978c', '#c2beb2', '#6c685f'], haze: '#d8efff', props: ['oak', 'oak', 'bush', 'rock', 'flowers', 'flowers', 'tuft'], top: 'oak', blade: 1 },
  { g: ['#3f8048', '#56995c', '#2c6038'], d: ['#94805e', '#ad9670', '#6c5b40'], leaf: ['#1f5c3e', '#2f7d52', '#143f2a'], rock: ['#7f8a94', '#a6b2bc', '#56606a'], haze: '#c4ecff', props: ['pine', 'pine', 'crystal', 'rock', 'tuft', 'bush'], top: 'pine', blade: 1, glow: '#7fe8ff' },
  { g: ['#d49c5e', '#e8b67c', '#b07842'], d: ['#c88d55', '#e0aa72', '#9c6636'], leaf: ['#6f9440', '#8fb252', '#4f6b28'], rock: ['#b8663c', '#d88456', '#7f3f22'], haze: '#ffe4bf', props: ['cactus', 'rock', 'rock', 'bones', 'mesa', 'shrub'], top: 'mesa' },
  { g: ['#e3ecf6', '#ffffff', '#bccbe0'], d: ['#a39a8e', '#bdb5aa', '#7a7064'], leaf: ['#2f5c54', '#3f7a6c', '#1f3f3a'], rock: ['#8fa1ba', '#bccbe0', '#64748c'], haze: '#eef7ff', props: ['pine', 'pine', 'icerock', 'drift', 'rock'], top: 'pine', snow: 1 },
  { g: ['#5f7036', '#788a42', '#425024'], d: ['#6f5f3a', '#87764c', '#4f4228'], leaf: ['#4f6030', '#6a7c3c', '#333f1c'], rock: ['#6a6a5a', '#8c8c7a', '#4a4a3c'], haze: '#d4e4b4', water: '#3e5d3e', props: ['deadtree', 'pool', 'reeds', 'shroom', 'tuft', 'reeds'], top: 'deadtree', blade: 1 },
  { g: ['#6e9b5a', '#88b26e', '#557a44'], d: ['#b4a88e', '#ccc2a8', '#8c8268'], leaf: ['#3f7c4c', '#5a9862', '#2a5a35'], rock: ['#aaa698', '#cbc7b9', '#7e7a6e'], haze: '#cdf3ee', water: '#3f8f9c', props: ['pillar', 'pool', 'oak', 'tuft', 'flag', 'rock'], top: 'oak', blade: 1 },
  { g: ['#7a8b5a', '#94a66f', '#5c6c42'], d: ['#9b8b6b', '#b5a584', '#77694d'], leaf: ['#3f5c3c', '#57764e', '#2a3f28'], rock: ['#8b8d91', '#b0b2b6', '#606268'], haze: '#dfe3ee', props: ['boulder', 'pine', 'heather', 'rock', 'tuft', 'heather'], top: 'pine', blade: 1 },
  { g: ['#3c3852', '#4c4768', '#29253b'], d: ['#544560', '#6a5a76', '#3a2e44'], leaf: ['#2c2742', '#3d355c', '#1b172a'], rock: ['#4c4c62', '#6a6a84', '#313140'], haze: '#8f7fc4', props: ['deadtree', 'glowshroom', 'rock', 'glowshroom', 'fog'], top: 'deadtree', glow: '#c08cff' },
  { g: ['#baa274', '#cfb98a', '#957f55'], d: ['#a38c63', '#bba57c', '#7e6b47'], leaf: ['#7c7c4c', '#949462', '#5a5a34'], rock: ['#8c7c68', '#ab9b82', '#665a4b'], haze: '#f3dfb4', props: ['gear', 'scrap', 'rock', 'pipe', 'shrub'], top: 'scrap' },
  { g: ['#3b2b29', '#4e3a36', '#271a1b'], d: ['#4c3632', '#614642', '#32211f'], leaf: ['#3a2a28', '#4a3634', '#201414'], rock: ['#302828', '#4c4040', '#1b1515'], haze: '#ff9a5a', lava: 1, props: ['basalt', 'lavapool', 'vent', 'rock', 'basalt'], top: 'basalt', glow: '#ff7a2a' },
  { g: ['#5b4b7b', '#705e96', '#43365c'], d: ['#6c5c80', '#827098', '#4e405f'], leaf: ['#4a3a6a', '#5c4a80', '#30244a'], rock: ['#5c5272', '#7c7094', '#3e3652'], haze: '#e8c4ff', props: ['crystalP', 'crater', 'rock', 'floatrock', 'crystalP'], top: 'crystalP', glow: '#ff86f2' },
  { g: ['#2c2834', '#383342', '#1b1822'], d: ['#3c3642', '#4c4554', '#25212b'], leaf: ['#221d2a', '#2e2838', '#151119'], rock: ['#211e27', '#3a3443', '#100e13'], haze: '#9a6aff', props: ['spike', 'bones', 'voidfire', 'rock', 'spike'], top: 'spike', glow: '#b07bff' },
];

// ---- terrain props (drawn once into the cached background)
function pShadow(g, x, y, rx, ry, a = 0.26) { g.fillStyle = `rgba(0,0,0,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }
const PROP = {
  oak(g, x, y, s, A, r) {
    pShadow(g, x + 12 * s, y + 3 * s, 26 * s, 9 * s);
    g.fillStyle = vgrad(g, y - 16 * s, y, '#6b4728', '#3e2716'); g.fillRect(x - 3.5 * s, y - 18 * s, 7 * s, 19 * s);
    const L = A.leaf; [[-13, -26, 15], [13, -27, 15], [0, -40, 17], [-5, -29, 16], [9, -37, 13], [0, -24, 14]].forEach(([bx, by, br]) => ball(g, x + bx * s, y + by * s, br * s, br * s * 0.9, L[0], 0.28, -0.45));
    for (let i = 0; i < 9; i++) { g.fillStyle = rgba(L[1], 0.75); g.beginPath(); g.arc(x + (r() - 0.62) * 24 * s, y - (31 + r() * 15) * s, (2.5 + r() * 4) * s, 0, TAU); g.fill(); }
    if (r() < 0.3) for (let i = 0; i < 4; i++) { g.fillStyle = '#d8342c'; g.beginPath(); g.arc(x + (r() - 0.5) * 26 * s, y - (22 + r() * 20) * s, 1.8 * s, 0, TAU); g.fill(); }
  },
  pine(g, x, y, s, A, r) {
    pShadow(g, x + 9 * s, y + 3 * s, 17 * s, 6 * s);
    g.fillStyle = '#4a3020'; g.fillRect(x - 2.5 * s, y - 9 * s, 5 * s, 11 * s);
    for (let i = 0; i < 4; i++) {
      const w = (19 - i * 3.8) * s, yb = y - (6 + i * 11) * s, yt = yb - 19 * s;
      g.fillStyle = hgrad(g, x - w, x + w, A.leaf[0], 0.2, -0.5); g.beginPath(); g.moveTo(x, yt); g.lineTo(x + w, yb); g.quadraticCurveTo(x, yb + 5 * s, x - w, yb); g.closePath(); g.fill();
      if (A.snow) { g.fillStyle = '#f5f9ff'; g.beginPath(); g.moveTo(x, yt); g.lineTo(x + w * 0.5, yt + 9 * s); g.quadraticCurveTo(x, yt + 12 * s, x - w * 0.55, yt + 9 * s); g.closePath(); g.fill(); }
    }
  },
  deadtree(g, x, y, s, A, r) {
    pShadow(g, x + 10 * s, y + 3 * s, 16 * s, 5 * s);
    const col = A.glow ? '#1d1a26' : '#4a3a2a';
    const br = (x0, y0, a, len, w, d) => { const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); if (d > 0) { br(x1, y1, a - 0.5 - r() * 0.3, len * 0.7, w * 0.62, d - 1); br(x1, y1, a + 0.45 + r() * 0.3, len * 0.66, w * 0.6, d - 1); } };
    br(x, y, -Math.PI / 2 + (r() - 0.5) * 0.2, 20 * s, 5.5 * s, 3);
  },
  bush(g, x, y, s, A, r) { pShadow(g, x + 5 * s, y + 2 * s, 14 * s, 5 * s); [[-7, -5, 8], [7, -5, 8], [0, -10, 9]].forEach(([bx, by, b]) => ball(g, x + bx * s, y + by * s, b * s, b * s * 0.85, A.leaf[0], 0.3, -0.45)); if (r() < 0.5) for (let i = 0; i < 5; i++) { g.fillStyle = r() < 0.5 ? '#e8e0ff' : '#ff6a8a'; g.beginPath(); g.arc(x + (r() - 0.5) * 18 * s, y - (5 + r() * 9) * s, 1.4 * s, 0, TAU); g.fill(); } },
  shrub(g, x, y, s, A, r) { pShadow(g, x + 3 * s, y + 1 * s, 9 * s, 3 * s); g.strokeStyle = shade(A.leaf[0], -0.1); g.lineWidth = 1.6 * s; g.beginPath(); for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.28; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 11 * s, y + Math.sin(a) * 10 * s); } g.stroke(); },
  rock(g, x, y, s, A, r) {
    const n = 7, pts = [], rx = (8 + r() * 8) * s, ry = rx * 0.62; for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 0.78 + r() * 0.3; pts.push([x + Math.cos(a) * rx * k, y - ry * 0.5 + Math.sin(a) * ry * k]); }
    pShadow(g, x + rx * 0.4, y + 1, rx * 1.15, ry * 0.55);
    g.fillStyle = vgrad(g, y - ry * 1.5, y + ry * 0.5, A.rock[1], A.rock[2]); poly(g, pts); g.fill();
    g.fillStyle = rgba(A.rock[1], 0.85); g.beginPath(); g.ellipse(x - rx * 0.18, y - ry * 0.95, rx * 0.55, ry * 0.32, -0.2, 0, TAU); g.fill();
    if (A.snow) { g.fillStyle = '#f8fbff'; g.beginPath(); g.ellipse(x - rx * 0.1, y - ry * 1.05, rx * 0.62, ry * 0.3, 0, 0, TAU); g.fill(); }
  },
  boulder(g, x, y, s, A, r) { PROP.rock(g, x, y, s * 1.9, A, r); },
  icerock(g, x, y, s, A, r) { PROP.rock(g, x, y, s * 1.2, A, r); PROP.crystal(g, x + 6 * s, y, s * 0.7, { glow: '#bfe9ff' }, r); },
  tuft(g, x, y, s, A, r) { g.strokeStyle = A.g[2]; g.lineWidth = 1.4 * s; g.beginPath(); for (let i = -3; i <= 3; i++) { g.moveTo(x + i * 1.6 * s, y); g.quadraticCurveTo(x + i * 2.4 * s, y - 5 * s, x + i * 3.2 * s, y - (8 - Math.abs(i)) * s); } g.stroke(); g.strokeStyle = A.g[1]; g.lineWidth = 1 * s; g.beginPath(); for (let i = -2; i <= 2; i += 2) { g.moveTo(x + i * 1.5 * s, y); g.lineTo(x + i * 2.6 * s, y - (7 - Math.abs(i)) * s); } g.stroke(); },
  flowers(g, x, y, s, A, r) { const c = ['#fff6e0', '#ffd84a', '#ff7aa8', '#b9a0ff', '#ffffff'][Math.floor(r() * 5)]; for (let i = 0; i < 7; i++) { const fx = x + (r() - 0.5) * 22 * s, fy = y + (r() - 0.5) * 9 * s; g.fillStyle = A.g[2]; g.fillRect(fx - 0.4 * s, fy, 0.8 * s, 3 * s); g.fillStyle = c; g.beginPath(); g.arc(fx, fy, 1.7 * s, 0, TAU); g.fill(); g.fillStyle = '#ffcf3a'; g.beginPath(); g.arc(fx, fy, 0.6 * s, 0, TAU); g.fill(); } },
  heather(g, x, y, s, A, r) { for (let i = 0; i < 10; i++) { const fx = x + (r() - 0.5) * 20 * s, fy = y + (r() - 0.5) * 8 * s; g.fillStyle = i % 2 ? '#9b5aa8' : '#c07ad0'; g.beginPath(); g.arc(fx, fy - 2 * s, 2 * s, 0, TAU); g.fill(); } },
  crystal(g, x, y, s, A, r) {
    const col = A.glow || '#8fe8ff'; g.save(); g.globalCompositeOperation = 'lighter'; const q = g.createRadialGradient(x, y - 8 * s, 0, x, y - 8 * s, 26 * s); q.addColorStop(0, rgba(col, 0.32)); q.addColorStop(1, rgba(col, 0)); g.fillStyle = q; g.fillRect(x - 26 * s, y - 34 * s, 52 * s, 52 * s); g.restore();
    pShadow(g, x + 4 * s, y + 1, 10 * s, 3.5 * s);
    [[-6, 0.8, -0.35], [0, 1.25, 0], [6, 0.9, 0.3]].forEach(([dx, h, tilt]) => { const bx = x + dx * s, by = y, H = 18 * h * s, w = 4.2 * s; g.save(); g.translate(bx, by); g.rotate(tilt);
      g.fillStyle = shade(col, 0.45); poly(g, [[0, -H], [-w, -H + w * 1.2], [-w, 0], [0, w * 0.5]]); g.fill(); g.fillStyle = shade(col, -0.25); poly(g, [[0, -H], [w, -H + w * 1.2], [w, 0], [0, w * 0.5]]); g.fill(); g.restore(); });
  },
  crystalP(g, x, y, s, A, r) { PROP.crystal(g, x, y, s * 1.25, A, r); },
  cactus(g, x, y, s, A, r) {
    pShadow(g, x + 8 * s, y + 2 * s, 12 * s, 4 * s); const c = '#5e9a45';
    const col = (cx, y0, y1, w) => { g.fillStyle = hgrad(g, cx - w, cx + w, c, 0.25, -0.45); rr(g, cx - w, y0, w * 2, y1 - y0, w); g.fill(); g.strokeStyle = rgba('#2f5a22', 0.6); g.lineWidth = 0.7 * s; g.beginPath(); g.moveTo(cx, y0 + w); g.lineTo(cx, y1 - 1); g.stroke(); };
    col(x, y - 30 * s, y, 5 * s); col(x - 9 * s, y - 22 * s, y - 10 * s, 3.4 * s); g.fillStyle = c; g.fillRect(x - 9 * s, y - 13 * s, 6 * s, 3.4 * s); col(x + 9 * s, y - 26 * s, y - 14 * s, 3.4 * s); g.fillRect(x + 3 * s, y - 17 * s, 6 * s, 3.4 * s);
    if (r() < 0.5) { g.fillStyle = '#ff6a8a'; g.beginPath(); g.arc(x, y - 30 * s, 2.4 * s, 0, TAU); g.fill(); }
  },
  bones(g, x, y, s, A, r) { g.fillStyle = '#efe6d2'; g.save(); g.translate(x, y); g.rotate(r() * TAU); rr(g, -8 * s, -1.2 * s, 16 * s, 2.4 * s, 1.2 * s); g.fill(); [-8, 8].forEach(e => { g.beginPath(); g.arc(e * s, -1.5 * s, 1.8 * s, 0, TAU); g.arc(e * s, 1.5 * s, 1.8 * s, 0, TAU); g.fill(); }); g.restore(); if (r() < 0.5) { g.fillStyle = '#f2ead8'; g.beginPath(); g.arc(x + 10 * s, y - 2 * s, 4 * s, 0, TAU); g.fill(); g.fillStyle = '#2a2018'; g.fillRect(x + 8 * s, y - 3 * s, 1.5 * s, 1.5 * s); g.fillRect(x + 11 * s, y - 3 * s, 1.5 * s, 1.5 * s); } },
  mesa(g, x, y, s, A, r) {
    const w = (40 + r() * 30) * s, h = (26 + r() * 22) * s; pShadow(g, x + w * 0.25, y + 2, w * 0.7, 8 * s, 0.3);
    g.fillStyle = vgrad(g, y - h, y, A.rock[0], A.rock[2]); poly(g, [[x - w / 2, y], [x - w / 2 + 6 * s, y - h], [x + w / 2 - 4 * s, y - h - 3 * s], [x + w / 2, y]]); g.fill();
    g.strokeStyle = rgba(A.rock[2], 0.7); g.lineWidth = 1.4 * s; g.beginPath(); for (let i = 1; i < 4; i++) { const yy = y - h * i / 4; g.moveTo(x - w / 2 + 3 * s, yy); g.lineTo(x + w / 2 - 2 * s, yy + (r() - 0.5) * 3 * s); } g.stroke();
    g.fillStyle = A.rock[1]; g.beginPath(); g.ellipse(x + 1 * s, y - h - 1.5 * s, w / 2 - 5 * s, 4 * s, -0.03, 0, TAU); g.fill();
  },
  drift(g, x, y, s, A, r) { const w = (18 + r() * 16) * s; g.fillStyle = '#c9d8ec'; g.beginPath(); g.ellipse(x + 3 * s, y + 1, w, w * 0.32, 0, 0, TAU); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, y - 1.5 * s, w * 0.9, w * 0.28, 0, 0, TAU); g.fill(); },
  pool(g, x, y, s, A, r) {
    const rx = (22 + r() * 18) * s, ry = rx * 0.45, wc = A.water || '#3f7f9a';
    g.fillStyle = rgba(shade(A.g[2], -0.3), 0.7); g.beginPath(); g.ellipse(x, y, rx + 3 * s, ry + 2.5 * s, 0, 0, TAU); g.fill();
    const q = g.createLinearGradient(0, y - ry, 0, y + ry); q.addColorStop(0, shade(wc, -0.25)); q.addColorStop(1, shade(wc, 0.15)); g.fillStyle = q; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2 * s; g.beginPath(); g.ellipse(x - rx * 0.2, y - ry * 0.25, rx * 0.4, ry * 0.18, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    if (A.water === '#3e5d3e') for (let i = 0; i < 3; i++) { const lx = x + (r() - 0.5) * rx, ly = y + (r() - 0.5) * ry * 0.8; g.fillStyle = '#5f8f3a'; g.beginPath(); g.arc(lx, ly, 3.4 * s, 0.4, TAU - 0.2); g.lineTo(lx, ly); g.fill(); }
  },
  reeds(g, x, y, s, A, r) { for (let i = 0; i < 6; i++) { const rx = x + (i - 2.5) * 2.6 * s, h = (12 + r() * 9) * s, lean = (r() - 0.5) * 4 * s; g.strokeStyle = '#6a7a3a'; g.lineWidth = 1.3 * s; g.beginPath(); g.moveTo(rx, y); g.quadraticCurveTo(rx + lean * 0.5, y - h * 0.6, rx + lean, y - h); g.stroke(); if (i % 2) { g.fillStyle = '#6a4a2a'; rr(g, rx + lean - 1.4 * s, y - h - 1 * s, 2.8 * s, 6 * s, 1.4 * s); g.fill(); } } },
  shroom(g, x, y, s, A, r, glowc) {
    for (let i = 0; i < 3; i++) { const mx = x + (i - 1) * 7 * s, sz = (i === 1 ? 6 : 4.2) * s, my = y - (i === 1 ? 2 : 0) * s;
      g.fillStyle = '#efe4cc'; g.fillRect(mx - sz * 0.28, my - sz * 1.1, sz * 0.56, sz * 1.1); const cc = glowc || '#c8402e';
      if (glowc) { g.save(); g.globalCompositeOperation = 'lighter'; const q = g.createRadialGradient(mx, my - sz, 0, mx, my - sz, sz * 3); q.addColorStop(0, rgba(cc, 0.45)); q.addColorStop(1, rgba(cc, 0)); g.fillStyle = q; g.fillRect(mx - sz * 3, my - sz * 4, sz * 6, sz * 6); g.restore(); }
      ball(g, mx, my - sz * 1.1, sz, sz * 0.62, cc, 0.35, -0.35); g.fillStyle = glowc ? rgba('#ffffff', 0.7) : '#fff4e8'; g.beginPath(); g.arc(mx - sz * 0.35, my - sz * 1.3, sz * 0.17, 0, TAU); g.arc(mx + sz * 0.3, my - sz * 1.15, sz * 0.13, 0, TAU); g.fill(); }
  },
  glowshroom(g, x, y, s, A, r) { PROP.shroom(g, x, y, s, A, r, r() < 0.5 ? '#b67cff' : '#5fe6ff'); },
  fog(g, x, y, s, A, r) { const q = g.createRadialGradient(x, y, 0, x, y, 70 * s); q.addColorStop(0, rgba(A.haze, 0.16)); q.addColorStop(1, rgba(A.haze, 0)); g.fillStyle = q; g.save(); g.translate(x, y); g.scale(1, 0.4); g.translate(-x, -y); g.fillRect(x - 70 * s, y - 70 * s, 140 * s, 140 * s); g.restore(); },
  pillar(g, x, y, s, A, r) {
    pShadow(g, x + 9 * s, y + 2 * s, 14 * s, 4.5 * s); const h = (18 + r() * 22) * s, w = 7 * s, c = A.rock[0];
    g.fillStyle = shade(c, -0.15); rr(g, x - w - 3 * s, y - 5 * s, (w + 3 * s) * 2, 6 * s, 1.5 * s); g.fill();
    g.fillStyle = hgrad(g, x - w, x + w, c, 0.3, -0.4); poly(g, [[x - w, y - 4 * s], [x - w, y - h], [x - w * 0.3, y - h - 4 * s], [x + w * 0.4, y - h + 2 * s], [x + w, y - h - 2 * s], [x + w, y - 4 * s]]); g.fill();
    g.strokeStyle = rgba(shade(c, -0.5), 0.45); g.lineWidth = 0.8 * s; g.beginPath(); for (let i = -1; i <= 1; i++) { g.moveTo(x + i * w * 0.5, y - 5 * s); g.lineTo(x + i * w * 0.5, y - h + 1 * s); } g.stroke();
    g.strokeStyle = '#5a8a3a'; g.lineWidth = 1.4 * s; g.beginPath(); g.moveTo(x - w, y - h * 0.3); g.quadraticCurveTo(x, y - h * 0.5, x + w * 0.6, y - h * 0.8); g.stroke();
    if (r() < 0.6) { g.fillStyle = shade(c, -0.05); g.save(); g.translate(x + 18 * s, y); g.rotate(0.2); rr(g, -10 * s, -4 * s, 20 * s, 7 * s, 3 * s); g.fill(); g.restore(); }
  },
  flag(g, x, y, s, A, r) { pShadow(g, x + 4 * s, y + 1, 6 * s, 2 * s); g.fillStyle = '#4a3420'; g.fillRect(x - 1 * s, y - 34 * s, 2 * s, 34 * s); g.fillStyle = '#8a2a2a'; poly(g, [[x + 1 * s, y - 33 * s], [x + 15 * s, y - 31 * s], [x + 11 * s, y - 26 * s], [x + 15 * s, y - 21 * s], [x + 1 * s, y - 22 * s]]); g.fill(); },
  gear(g, x, y, s, A, r) { const R = (10 + r() * 8) * s, c = '#8a5a3a'; pShadow(g, x + 5 * s, y + 2 * s, R * 1.1, R * 0.35); g.save(); g.translate(x, y - R * 0.45); g.scale(1, 0.55); g.rotate(r()); g.fillStyle = c; g.beginPath(); for (let k = 0; k < 20; k++) { const a = k / 20 * TAU, rad = k % 2 ? R : R * 1.18; g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } g.closePath(); g.fill(); g.fillStyle = shade(c, 0.2); g.beginPath(); g.arc(0, 0, R * 0.8, 0, TAU); g.fill(); g.fillStyle = shade(A.g[2], -0.2); g.beginPath(); g.arc(0, 0, R * 0.28, 0, TAU); g.fill(); g.restore(); },
  scrap(g, x, y, s, A, r) { pShadow(g, x + 6 * s, y + 2 * s, 18 * s, 5 * s); for (let i = 0; i < 5; i++) { g.save(); g.translate(x + (r() - 0.5) * 18 * s, y - (2 + r() * 8) * s); g.rotate((r() - 0.5) * 1.4); g.fillStyle = ['#7a5a3a', '#6a6a72', '#9a6a3a', '#4a4a52'][i % 4]; g.fillRect(-9 * s, -2 * s, 18 * s, 4 * s); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-9 * s, 1 * s, 18 * s, 1 * s); g.restore(); } },
  pipe(g, x, y, s, A, r) { pShadow(g, x + 4 * s, y + 2 * s, 20 * s, 3 * s); g.fillStyle = vgrad(g, y - 8 * s, y, '#a8703f', '#5a3a22'); rr(g, x - 20 * s, y - 8 * s, 40 * s, 8 * s, 3 * s); g.fill(); g.fillStyle = '#4a2e1c'; g.fillRect(x - 6 * s, y - 9 * s, 3 * s, 10 * s); g.fillRect(x + 8 * s, y - 9 * s, 3 * s, 10 * s); },
  basalt(g, x, y, s, A, r) { for (let i = 0; i < 4; i++) { const bx = x + (i - 1.5) * 8 * s, h = (8 + r() * 20) * s, w = 4.2 * s; g.fillStyle = hgrad(g, bx - w, bx + w, '#3c3232', 0.2, -0.5); g.fillRect(bx - w, y - h, w * 2, h); g.fillStyle = '#5a4c4a'; g.beginPath(); g.ellipse(bx, y - h, w, w * 0.45, 0, 0, TAU); g.fill(); } },
  lavapool(g, x, y, s, A, r) {
    const rx = (18 + r() * 16) * s, ry = rx * 0.45; g.save(); g.globalCompositeOperation = 'lighter'; const q = g.createRadialGradient(x, y, 0, x, y, rx * 2); q.addColorStop(0, 'rgba(255,120,30,0.5)'); q.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = q; g.fillRect(x - rx * 2, y - rx * 2, rx * 4, rx * 4); g.restore();
    g.fillStyle = '#1b1212'; g.beginPath(); g.ellipse(x, y, rx + 3 * s, ry + 2 * s, 0, 0, TAU); g.fill();
    const q2 = g.createRadialGradient(x, y, 0, x, y, rx); q2.addColorStop(0, '#fff2a0'); q2.addColorStop(0.35, '#ffb02e'); q2.addColorStop(1, '#d8381a'); g.fillStyle = q2; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(60,20,10,0.6)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(x + (r() - 0.5) * rx, y + (r() - 0.5) * ry, 4 * s, 2 * s, 0, 0, TAU); g.fill(); }
  },
  vent(g, x, y, s, A, r) { PROP.rock(g, x, y, s, A, r); g.save(); g.globalCompositeOperation = 'lighter'; const q = g.createRadialGradient(x, y - 6 * s, 0, x, y - 6 * s, 14 * s); q.addColorStop(0, 'rgba(255,170,60,0.85)'); q.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = q; g.fillRect(x - 14 * s, y - 20 * s, 28 * s, 28 * s); g.restore(); },
  crater(g, x, y, s, A, r) { const rx = (16 + r() * 14) * s; g.fillStyle = rgba(shade(A.g[2], -0.35), 0.8); g.beginPath(); g.ellipse(x, y, rx, rx * 0.42, 0, 0, TAU); g.fill(); g.fillStyle = rgba(A.g[1], 0.7); g.beginPath(); g.ellipse(x, y + rx * 0.1, rx * 0.8, rx * 0.3, 0, 0, Math.PI); g.fill(); PROP.crystal(g, x, y, s * 0.6, A, r); },
  floatrock(g, x, y, s, A, r) { pShadow(g, x, y + 2, 12 * s, 4 * s, 0.3); g.save(); g.translate(0, -26 * s); PROP.rock(g, x, y, s * 1.1, A, r); g.fillStyle = A.rock[2]; poly(g, [[x - 9 * s, y - 3 * s], [x + 9 * s, y - 3 * s], [x + 2 * s, y + 10 * s]]); g.fill(); g.restore(); },
  spike(g, x, y, s, A, r) { pShadow(g, x + 6 * s, y + 2 * s, 12 * s, 4 * s); for (let i = 0; i < 3; i++) { const bx = x + (i - 1) * 7 * s, h = (16 + r() * 22) * s * (i === 1 ? 1.3 : 1), w = 4.5 * s; g.fillStyle = '#2a2236'; poly(g, [[bx - w, y], [bx, y - h], [bx, y]]); g.fill(); g.fillStyle = '#120e18'; poly(g, [[bx + w, y], [bx, y - h], [bx, y]]); g.fill(); g.strokeStyle = rgba(A.glow, 0.7); g.lineWidth = 0.8 * s; g.beginPath(); g.moveTo(bx - w * 0.5, y - h * 0.5); g.lineTo(bx, y - h); g.stroke(); } },
  voidfire(g, x, y, s, A, r) { g.save(); g.globalCompositeOperation = 'lighter'; const q = g.createRadialGradient(x, y - 8 * s, 0, x, y - 8 * s, 22 * s); q.addColorStop(0, rgba('#d0a0ff', 0.8)); q.addColorStop(0.4, rgba(A.glow, 0.45)); q.addColorStop(1, rgba(A.glow, 0)); g.fillStyle = q; g.fillRect(x - 22 * s, y - 30 * s, 44 * s, 44 * s); g.restore(); PROP.rock(g, x, y + 3 * s, s * 0.8, A, r); },
};
const TALL = { oak: 1, pine: 1, deadtree: 1, mesa: 1, pillar: 1, cactus: 1, spike: 1, basalt: 1, flag: 1, crystalP: 1, floatrock: 1 };

// ---- ground: base color, tonal patches, fine texture, roads/trails, props, haze
function groundBase(g, A, X0, Y0, X1, Y1, r, dens = 1) {
  const W = X1 - X0, H = Y1 - Y0;
  g.fillStyle = A.g[0]; g.fillRect(X0, Y0, W, H);
  const nP = Math.round(W * H / 7000 * dens) + 6;
  for (let i = 0; i < nP; i++) { const x = lerp(X0, X1, r()), y = lerp(Y0, Y1, r()), rad = 30 + r() * 120, c = r() < 0.5 ? A.g[1] : A.g[2]; const q = g.createRadialGradient(x, y, 0, x, y, rad); q.addColorStop(0, rgba(c, 0.5)); q.addColorStop(1, rgba(c, 0)); g.fillStyle = q; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  const nS = Math.round(W * H / 55 * dens);
  for (const [c, a] of [[A.g[2], 0.55], [A.g[1], 0.6], [shade(A.g[0], -0.25), 0.35]]) {
    g.strokeStyle = rgba(c, a); g.fillStyle = rgba(c, a); g.lineWidth = 1; g.beginPath();
    for (let i = 0; i < nS / 3; i++) { const x = lerp(X0, X1, r()), y = lerp(Y0, Y1, r()); if (A.blade) { g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 2.5, y - 2.5 - r() * 3.5); } else { g.moveTo(x, y); g.lineTo(x + 1.6, y + 0.4); } }
    g.stroke();
  }
  if (A.lava) { // glowing cracks
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let i = 0; i < Math.round(W * H / 26000) + 3; i++) { let x = lerp(X0, X1, r()), y = lerp(Y0, Y1, r()); const pts = [[x, y]]; for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 50; y += (r() - 0.3) * 26; pts.push([x, y]); }
      for (const [w, c] of [[6, 'rgba(255,90,20,0.18)'], [2.4, 'rgba(255,150,40,0.7)'], [1, 'rgba(255,240,170,0.9)']]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); pts.forEach(([px, py], j) => j ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke(); } }
    g.restore();
  }
}
function paintTrail(g, A, pts, wOf, r) { // variable-width dirt road through pts [[x,y],...]
  const seg = (col, k, alpha = 1) => { g.strokeStyle = alpha < 1 ? rgba(col, alpha) : col; g.lineCap = 'round'; g.lineJoin = 'round'; for (let i = 1; i < pts.length; i++) { g.lineWidth = wOf(i) * k; g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke(); } };
  seg(shade(A.g[2], -0.3), 1.08, 0.35); seg(A.d[2], 1); seg(A.d[0], 0.86); seg(A.d[1], 0.42, 0.55);
  // ruts + pebbles
  g.fillStyle = rgba(A.d[2], 0.5);
  for (let i = 1; i < pts.length; i++) { const w = wOf(i); for (let k = 0; k < Math.max(1, w / 9); k++) { const t = r(), x = lerp(pts[i - 1][0], pts[i][0], t) + (r() - 0.5) * w * 0.8, y = lerp(pts[i - 1][1], pts[i][1], t) + (r() - 0.5) * 6; g.beginPath(); g.ellipse(x, y, 1 + r() * 1.8, 0.8 + r(), 0, 0, TAU); g.fill(); } }
  g.fillStyle = rgba(A.d[1], 0.8);
  for (let i = 1; i < pts.length; i += 2) { const w = wOf(i); const x = pts[i][0] + (r() - 0.5) * w * 0.7, y = pts[i][1]; g.beginPath(); g.ellipse(x, y, 1.6, 1, 0, 0, TAU); g.fill(); }
  // grass fringe over the edges
  if (A.blade) for (let i = 1; i < pts.length; i++) { const w = wOf(i), dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; for (const sd of [-1, 1]) if (r() < 0.75) PROP.tuft(g, pts[i][0] + nx * sd * w * 0.47, pts[i][1] + ny * sd * w * 0.47 + 3, 0.8 + r() * 0.5, A, r); }
}
function placeProps(g, A, list, r) { list.sort((a, b) => a[1] - b[1]); for (const [x, y, k, s] of list) PROP[k](g, x, y, s, A, r); }
function hazeAndLight(g, A, X0, Y0, X1, Y1, topH) {
  const W = X1 - X0, H = Y1 - Y0;
  const q = g.createLinearGradient(0, Y0, 0, Y0 + topH); q.addColorStop(0, rgba(A.haze, 0.55)); q.addColorStop(0.5, rgba(A.haze, 0.18)); q.addColorStop(1, rgba(A.haze, 0)); g.fillStyle = q; g.fillRect(X0, Y0, W, topH);
  const l = g.createRadialGradient(X0 + W * 0.25, Y0 + H * 0.2, 0, X0 + W * 0.25, Y0 + H * 0.2, Math.max(W, H) * 0.8); l.addColorStop(0, 'rgba(255,244,214,0.16)'); l.addColorStop(1, 'rgba(255,244,214,0)'); g.fillStyle = l; g.fillRect(X0, Y0, W, H);
}
function vignette(g, X0, Y0, X1, Y1, a = 0.5) { const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2, R = Math.hypot(X1 - X0, Y1 - Y0) / 2; const q = g.createRadialGradient(cx, cy, R * 0.45, cx, cy, R * 1.02); q.addColorStop(0, 'rgba(0,0,0,0)'); q.addColorStop(1, `rgba(10,6,2,${a})`); g.fillStyle = q; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0); }

// ---- the battlefield background for region ri (cached at full canvas size)
let bg = null, bgKey = '', fg = null, fgKey = '', fgY0 = 0;
const roadX = y => VW / 2 + Math.sin((y / WALLY) * 4.6 + 1.1) * VW * 0.14 * (1 - smooth(WALLY * 0.55, WALLY - 40, y));
const roadW = y => VW * lerp(0.17, 0.4, clamp(y / WALLY, 0, 1));
function makeBg(ri) {
  const A = ART[ri], c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  const g = c.getContext('2d'), r = seeded(ri * 977 + 5);
  g.setTransform(S * DPR, 0, 0, S * DPR, OX * DPR, OY * DPR);
  const L = -OX / S - 4, Rr = (CW - OX) / S + 4, T = -OY / S - 4, B = (CH - OY) / S + 4;
  groundBase(g, A, L, T, Rr, B, r);
  // trampled earth along the wall foot
  const tg = g.createLinearGradient(0, WALLY - 110, 0, WALLY); tg.addColorStop(0, rgba(A.d[0], 0)); tg.addColorStop(1, rgba(A.d[0], 0.75)); g.fillStyle = tg; g.fillRect(L, WALLY - 110, Rr - L, 110);
  // winding road from the far tree line to the gate
  const pts = []; for (let y = T - 10; y <= WALLY; y += 10) pts.push([roadX(y), y]);
  paintTrail(g, A, pts, i => roadW(pts[i][1]), r);
  // props: dense far tree line, side woods, scattered small details (kept off the road)
  const list = [], top = A.top, field = A.props;
  for (let x = L - 10; x < Rr + 10; x += 15 + r() * 14) { const y = T + 18 + r() * 52; if (Math.abs(x - roadX(y)) < roadW(y) * 0.55) continue; list.push([x, y, top, 1.05 + r() * 0.5]); }
  const area = (Rr - L) * (WALLY - T);
  for (let i = 0, n = Math.round(area / 3800); i < n; i++) {
    const k = field[Math.floor(r() * field.length)], tall = TALL[k];
    let x; if (tall) { const side = r() < 0.5; x = side ? lerp(L - 6, Math.max(L + 30, 56), r()) : lerp(Math.min(Rr - 30, VW - 56), Rr + 6, r()); } else x = lerp(L, Rr, r());
    const y = lerp(T + 70, WALLY - (tall ? 130 : 60), r());
    if (Math.abs(x - roadX(y)) < roadW(y) * 0.5 + 10) continue;
    list.push([x, y, k, 0.8 + r() * 0.5]);
  }
  for (let i = 0; i < Math.round(area / 9000); i++) { const x = lerp(L, Rr, r()), y = lerp(T + 60, WALLY - 40, r()); if (Math.abs(x - roadX(y)) < roadW(y) * 0.5 + 4) continue; list.push([x, y, A.snow ? 'drift' : A.lava ? 'rock' : A.blade ? (r() < 0.5 ? 'tuft' : 'flowers') : 'rock', 0.6 + r() * 0.4]); }
  placeProps(g, A, list, r);
  // spiked moat stakes once the upgrade is owned
  if (save.upg.thorns) { const n = Math.round((Rr - L) / 20); for (let i = 0; i <= n; i++) { const x = L + i * 20 + 6, y = WALLY - 36 + (i % 2) * 6; pShadow(g, x + 3, y + 2, 5, 2); g.fillStyle = hgrad(g, x - 2.5, x + 2.5, '#8a6236', 0.25, -0.45); poly(g, [[x - 2.6, y + 1], [x - 0.6, y - 14], [x + 0.8, y - 15], [x + 2.6, y + 1]]); g.fill(); g.fillStyle = '#c9c4ba'; poly(g, [[x - 0.8, y - 13], [x + 0.2, y - 18], [x + 1, y - 13]]); g.fill(); } }
  hazeAndLight(g, A, L, T, Rr, B, (WALLY - T) * 0.32);
  if (A.glow) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(70,60,110,0.25)'; g.fillRect(L, T, Rr - L, B - T); g.restore(); }
  vignette(g, L, T, Rr, B, 0.55);
  g.setTransform(1, 0, 0, 1, 0, 0);
  bg = c; bgKey = ri + ':' + c.width + 'x' + c.height + ':' + WALLY + ':' + (save.upg.thorns ? 1 : 0);
  ambient = Array.from({ length: A.lava ? 26 : A.snow ? 40 : A.glow ? 22 : 14 }, () => ({ x: rnd(L, Rr), y: rnd(T, WALLY), p: rnd(0, TAU), v: rnd(0.5, 1.5) }));
}
let ambient = [];
// ---- castle: inner wall face, wall walk, battlements, round bastions (tower slots) and the central keep
const STONE = '#a69d8c';
function stoneBlocks(g, x0, y0, x1, y1, col, r, bh = 10) {
  g.fillStyle = shade(col, -0.5); g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let y = y0, row = 0; y < y1; y += bh, row++) {
    let x = x0 - (row % 2) * 9 - r() * 6;
    while (x < x1) { const w = 15 + r() * 13; g.fillStyle = shade(col, (r() - 0.5) * 0.2); rr(g, x + 0.8, y + 0.8, w - 1.6, bh - 1.6, 1.6); g.fill();
      g.fillStyle = 'rgba(255,248,230,0.13)'; g.fillRect(x + 1.4, y + 1, w - 2.8, 1.3); g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(x + 1.4, y + bh - 2.4, w - 2.8, 1.2); x += w; }
  }
}
function cobbles(g, x0, y0, x1, y1, col, r) {
  g.fillStyle = shade(col, -0.45); g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let y = y0 + 3, row = 0; y < y1 + 4; y += 6.5, row++) for (let x = x0 + (row % 2) * 4.5 - 4; x < x1 + 4; x += 8.5 + r() * 2) { g.fillStyle = shade(col, (r() - 0.5) * 0.22); g.beginPath(); g.ellipse(x, y, 3.8 + r(), 2.6, 0, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,245,220,0.07)'; for (let i = 0; i < (x1 - x0) * (y1 - y0) / 120; i++) g.fillRect(lerp(x0, x1, r()), lerp(y0, y1, r()), 2, 1);
}
function merlon(g, x, yTop, w, h, col, snow) {
  g.fillStyle = vgrad(g, yTop + 4, yTop + h, shade(col, 0.05), shade(col, -0.35)); g.fillRect(x, yTop + 4, w, h - 4);
  g.fillStyle = shade(col, 0.3); g.fillRect(x, yTop, w, 4.2);
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + w - 2, yTop + 4, 2, h - 4);
  if (snow) { g.fillStyle = '#f7fbff'; rr(g, x - 1, yTop - 2, w + 2, 4.5, 2); g.fill(); }
}
function cylBody(g, cx, rx, yt, yb, col, r, bh = 8, blocks = true) {
  const ry = rx * 0.38;
  g.save(); g.beginPath(); g.moveTo(cx - rx, yt); g.lineTo(cx - rx, yb); g.ellipse(cx, yb, rx, ry, 0, Math.PI, 0, true); g.lineTo(cx + rx, yt); g.closePath(); g.clip();
  g.fillStyle = col; g.fillRect(cx - rx - 1, yt - 1, rx * 2 + 2, yb - yt + ry + 2);
  if (blocks) { g.lineWidth = 0.9; g.strokeStyle = rgba(shade(col, -0.6), 0.5); for (let y = yt + bh, row = 0; y < yb + ry; y += bh, row++) { g.beginPath(); g.ellipse(cx, y, rx, ry, 0, 0, Math.PI); g.stroke(); for (let k = 0; k < 6; k++) { const a = (k + (row % 2) * 0.5 + 0.25) / 6 * Math.PI, xx = cx + Math.cos(a) * rx; g.beginPath(); g.moveTo(xx, y - bh + Math.sin(a) * ry); g.lineTo(xx, y + Math.sin(a) * ry); g.stroke(); } } }
  const q = g.createLinearGradient(cx - rx, 0, cx + rx, 0); q.addColorStop(0, 'rgba(255,250,235,0.10)'); q.addColorStop(0.28, 'rgba(255,250,235,0.26)'); q.addColorStop(0.6, 'rgba(0,0,0,0)'); q.addColorStop(1, 'rgba(0,0,0,0.5)'); g.fillStyle = q; g.fillRect(cx - rx, yt - 1, rx * 2, yb - yt + ry + 2);
  g.restore();
}
function cylTop(g, cx, rx, y, col) { const ry = rx * 0.38; const q = g.createRadialGradient(cx - rx * 0.3, y - ry * 0.3, 1, cx, y, rx); q.addColorStop(0, shade(col, 0.3)); q.addColorStop(1, shade(col, -0.1)); g.fillStyle = q; g.beginPath(); g.ellipse(cx, y, rx, ry, 0, 0, TAU); g.fill(); }
function crenRing(g, cx, rx, y, col, n, front, h = 7, w = 6, snow, gold) {
  const ry = rx * 0.38;
  for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * TAU, sy = Math.sin(a); if ((sy > 0) !== front) continue; const x = cx + Math.cos(a) * rx, yy = y + sy * ry;
    const ww = w * (0.55 + 0.45 * Math.abs(sy)); merlon(g, x - ww / 2, yy - h, ww, h + 1, gold ? '#d8b24a' : col, snow); }
}
function bastion(g, x, W, col, r, snow) {
  const rx = 27, yt = W - 14, yb = W + 42;
  pShadow(g, x + 10, yb + 10, rx * 1.1, 8, 0.32);
  cylBody(g, x, rx, yt, yb, col, r, 9);
  g.fillStyle = '#2a2420'; rr(g, x - 2, W + 8, 4, 12, 2); g.fill();
  crenRing(g, x, rx, yt, col, 12, false, 7, 7, snow);
  cylTop(g, x, rx - 2, yt, shade(col, 0.1));
  g.strokeStyle = rgba(shade(col, -0.5), 0.35); g.lineWidth = 0.8; g.beginPath(); g.ellipse(x, yt, rx * 0.6, rx * 0.6 * 0.38, 0, 0, TAU); g.stroke();
  crenRing(g, x, rx, yt, col, 12, true, 7, 7, snow);
}
function bannerCloth(g, x, y0, len, w, col, trim, emb) {
  g.fillStyle = '#4a3420'; g.fillRect(x - w / 2 - 3, y0 - 2, w + 6, 3);
  g.fillStyle = hgrad(g, x - w / 2, x + w / 2, col, 0.25, -0.4); poly(g, [[x - w / 2, y0], [x + w / 2, y0], [x + w / 2, y0 + len], [x, y0 + len - w * 0.45], [x - w / 2, y0 + len]]); g.fill();
  g.strokeStyle = trim; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - w / 2 + 1.5, y0 + 1); g.lineTo(x - w / 2 + 1.5, y0 + len - 2); g.moveTo(x + w / 2 - 1.5, y0 + 1); g.lineTo(x + w / 2 - 1.5, y0 + len - 2); g.stroke();
  if (emb) emblem(g, x, y0 + len * 0.42, w * 0.32, trim);
}
function emblem(g, x, y, s, col) { // the Stonehold sigil: a little gold keep over a chevron (original)
  g.fillStyle = col; g.beginPath(); g.moveTo(x - s, y + s * 0.9); g.lineTo(x - s, y - s * 0.2); g.lineTo(x - s * 0.6, y - s * 0.2); g.lineTo(x - s * 0.6, y - s * 0.6); g.lineTo(x - s * 0.2, y - s * 0.6); g.lineTo(x - s * 0.2, y - s); g.lineTo(x + s * 0.2, y - s); g.lineTo(x + s * 0.2, y - s * 0.6); g.lineTo(x + s * 0.6, y - s * 0.6); g.lineTo(x + s * 0.6, y - s * 0.2); g.lineTo(x + s, y - s * 0.2); g.lineTo(x + s, y + s * 0.9); g.closePath(); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(x, y + s * 0.9, s * 0.38, Math.PI, 0); g.fill();
}
function coneRoof(g, cx, rx, yb, h, col, r, snow, finial = '#e8c25a') {
  const ry = rx * 0.38;
  g.save(); g.beginPath(); g.moveTo(cx, yb - h); g.lineTo(cx + rx, yb); g.ellipse(cx, yb, rx, ry, 0, 0, Math.PI); g.closePath(); g.clip();
  g.fillStyle = hgrad(g, cx - rx, cx + rx, col, 0.3, -0.5); g.fillRect(cx - rx, yb - h, rx * 2, h + ry);
  g.strokeStyle = rgba(shade(col, -0.6), 0.5); g.lineWidth = 0.8; for (let k = 1; k < 6; k++) { const t = k / 6; g.beginPath(); g.ellipse(cx, yb - h + h * t, rx * t, ry * t, 0, 0, Math.PI); g.stroke(); }
  if (snow) { g.fillStyle = 'rgba(250,252,255,0.9)'; g.beginPath(); g.moveTo(cx, yb - h); g.lineTo(cx + rx * 0.45, yb - h * 0.55); g.quadraticCurveTo(cx, yb - h * 0.45, cx - rx * 0.5, yb - h * 0.55); g.fill(); }
  g.restore();
  g.fillStyle = shade(col, -0.45); g.beginPath(); g.ellipse(cx, yb, rx + 1.5, ry + 1, 0, 0, Math.PI); g.lineTo(cx - rx - 1.5, yb); g.fill();
  ball(g, cx, yb - h - 1.5, 2.4, 2.4, finial, 0.5, -0.3);
}
function keep(g, kx, W, col, r, snow, moss) {
  const hw = 50, top = W - 64, face = W - 16, foot = W + 54, kc = shade(col, 0.06);
  // back corner turrets with slate roofs
  for (const s of [-1, 1]) { const tx = kx + s * 42; cylBody(g, tx, 12, W - 96, top + 6, kc, r, 7); crenRing(g, tx, 12, W - 96, kc, 8, false, 5, 5, snow); cylTop(g, tx, 11, W - 96, kc); crenRing(g, tx, 12, W - 96, kc, 8, true, 5, 5, snow); coneRoof(g, tx, 14, W - 99, 34, '#3d5c94', r, snow); }
  pShadow(g, kx + 14, foot + 12, hw * 1.15, 10, 0.35);
  // roof platform (flagstones) + back/side parapets
  g.fillStyle = vgrad(g, top, face, shade(col, 0.22), shade(col, 0.02)); g.fillRect(kx - hw, top, hw * 2, face - top);
  g.strokeStyle = rgba(shade(col, -0.45), 0.4); g.lineWidth = 0.8; g.beginPath(); for (let y = top + 8; y < face; y += 9) { g.moveTo(kx - hw, y); g.lineTo(kx + hw, y); } for (let x = kx - hw + 12; x < kx + hw; x += 14) { g.moveTo(x, top); g.lineTo(x, face); } g.stroke();
  for (let x = kx - hw; x < kx + hw - 4; x += 14) merlon(g, x, top - 10, 9, 11, kc, snow);
  for (const s of [-1, 1]) for (let y = top + 2; y < face - 8; y += 13) { g.fillStyle = shade(kc, s < 0 ? 0.1 : -0.2); g.fillRect(kx + s * hw - (s > 0 ? 6 : 0), y, 6, 8); }
  // front face
  stoneBlocks(g, kx - hw, face, kx + hw, foot, kc, r, 11);
  const sh = g.createLinearGradient(kx - hw, 0, kx + hw, 0); sh.addColorStop(0, 'rgba(255,250,235,0.12)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.3)'); g.fillStyle = sh; g.fillRect(kx - hw, face, hw * 2, foot - face);
  g.fillStyle = vgrad(g, face, foot, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.25)'); g.fillRect(kx - hw, face, hw * 2, foot - face);
  if (moss) { g.fillStyle = 'rgba(80,120,50,0.45)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(kx - hw + r() * hw * 2, foot - r() * 14, 3 + r() * 5, 2 + r() * 2, 0, 0, TAU); g.fill(); } }
  for (let x = kx - hw; x < kx + hw - 4; x += 14) merlon(g, x, face - 10, 9, 12, kc, snow);
  // gate: voussoirs, studded doors, iron bands
  const gw = 17, gt = W + 14;
  g.fillStyle = shade(col, 0.28); g.beginPath(); g.arc(kx, gt + 4, gw + 5, Math.PI, 0); g.lineTo(kx + gw + 5, foot); g.lineTo(kx - gw - 5, foot); g.closePath(); g.fill();
  g.strokeStyle = rgba(shade(col, -0.5), 0.6); g.lineWidth = 0.9; for (let k = 0; k <= 6; k++) { const a = Math.PI + k / 6 * Math.PI; g.beginPath(); g.moveTo(kx + Math.cos(a) * gw, gt + 4 + Math.sin(a) * gw); g.lineTo(kx + Math.cos(a) * (gw + 5), gt + 4 + Math.sin(a) * (gw + 5)); g.stroke(); }
  g.fillStyle = '#5a3a20'; g.beginPath(); g.arc(kx, gt + 4, gw, Math.PI, 0); g.lineTo(kx + gw, foot); g.lineTo(kx - gw, foot); g.closePath(); g.fill();
  g.save(); g.clip(); for (let x = kx - gw; x < kx + gw; x += 5.5) { g.fillStyle = shade('#6e4826', (r() - 0.5) * 0.25); g.fillRect(x + 0.4, gt - 20, 4.8, 80); }
  g.fillStyle = '#2e2a28'; for (const yy of [gt + 8, gt + 26]) g.fillRect(kx - gw, yy, gw * 2, 3); g.fillRect(kx - 0.7, gt - 20, 1.4, 80);
  g.fillStyle = '#9a948a'; for (const yy of [gt + 9.5, gt + 27.5]) for (let x = kx - gw + 3; x < kx + gw; x += 6) { g.beginPath(); g.arc(x, yy, 0.9, 0, TAU); g.fill(); }
  g.fillStyle = vgrad(g, gt - 14, gt + 10, 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0)'); g.fillRect(kx - gw, gt - 14, gw * 2, 24); g.restore();
  ball(g, kx - 4, gt + 20, 1.6, 1.6, '#c8a24a'); ball(g, kx + 4, gt + 20, 1.6, 1.6, '#c8a24a');
  // steps
  g.fillStyle = shade(col, 0.15); g.fillRect(kx - gw - 8, foot, gw * 2 + 16, 4); g.fillStyle = shade(col, -0.05); g.fillRect(kx - gw - 12, foot + 4, gw * 2 + 24, 4);
  // banners + arrow slits
  for (const s of [-1, 1]) { bannerCloth(g, kx + s * 36, face + 3, 40, 15, '#2b4f9c', '#e8c25a', true); g.fillStyle = '#231e1a'; rr(g, kx + s * 22 - 1.5, face + 6, 3, 10, 1.5); g.fill(); }
  // torch brackets
  for (const s of [-1, 1]) { g.fillStyle = '#3a2a1e'; g.fillRect(kx + s * (gw + 9) - 1.5, gt + 6, 3, 9); }
}
function house(g, x, y, w, h, roof, r, snow) {
  pShadow(g, x + 8, y + 4, w * 0.7, 6, 0.3);
  g.fillStyle = vgrad(g, y - h, y, '#e8d8b8', '#bca88a'); g.fillRect(x - w / 2, y - h, w, h);
  g.strokeStyle = '#5a3c22'; g.lineWidth = 1.6; g.strokeRect(x - w / 2, y - h, w, h); g.beginPath(); g.moveTo(x - w / 2, y - h / 2); g.lineTo(x + w / 2, y - h / 2); g.moveTo(x - w / 2, y - h); g.lineTo(x - w / 6, y); g.moveTo(x + w / 2, y - h); g.lineTo(x + w / 6, y); g.stroke();
  g.fillStyle = '#5a3a20'; rr(g, x - 4, y - 10, 8, 10, 2); g.fill(); g.fillStyle = '#ffd77a'; g.fillRect(x + w / 4 - 3, y - h + 4, 6, 5);
  g.fillStyle = hgrad(g, x - w / 2 - 4, x + w / 2 + 4, roof, 0.25, -0.45); poly(g, [[x - w / 2 - 5, y - h + 1], [x - w / 2 + 6, y - h - 16], [x + w / 2 - 6, y - h - 16], [x + w / 2 + 5, y - h + 1]]); g.fill();
  g.strokeStyle = rgba(shade(roof, -0.6), 0.5); g.lineWidth = 0.8; g.beginPath(); for (let k = 1; k < 4; k++) { const yy = y - h - 16 + k * 4.2; g.moveTo(x - w / 2 - 5 + (4 - k) * 2.6, yy); g.lineTo(x + w / 2 + 5 - (4 - k) * 2.6, yy); } g.stroke();
  if (snow) { g.fillStyle = '#f7fbff'; poly(g, [[x - w / 2 + 6, y - h - 16], [x + w / 2 - 6, y - h - 16], [x + w / 2 - 2, y - h - 10], [x - w / 2 + 2, y - h - 10]]); g.fill(); }
}
function barrel(g, x, y) { pShadow(g, x + 3, y + 2, 6, 2.4); g.fillStyle = hgrad(g, x - 5, x + 5, '#8a5a30', 0.25, -0.4); rr(g, x - 5, y - 11, 10, 12, 3); g.fill(); g.fillStyle = '#3a3330'; g.fillRect(x - 5, y - 9, 10, 1.4); g.fillRect(x - 5, y - 3, 10, 1.4); g.fillStyle = '#a87644'; g.beginPath(); g.ellipse(x, y - 11, 5, 1.8, 0, 0, TAU); g.fill(); }
function crate(g, x, y) { pShadow(g, x + 3, y + 2, 7, 2.5); g.fillStyle = '#9a6a38'; g.fillRect(x - 6, y - 11, 12, 11); g.fillStyle = '#b9864e'; g.fillRect(x - 6, y - 14, 12, 3); g.strokeStyle = '#5a3a1e'; g.lineWidth = 1; g.strokeRect(x - 6, y - 11, 12, 11); g.beginPath(); g.moveTo(x - 6, y - 11); g.lineTo(x + 6, y); g.stroke(); }
function hay(g, x, y) { pShadow(g, x + 4, y + 2, 10, 3); ball(g, x, y - 6, 10, 7, '#d8b24a', 0.3, -0.35); g.strokeStyle = 'rgba(120,80,20,0.5)'; g.lineWidth = 0.8; g.beginPath(); for (let k = -2; k <= 2; k++) { g.moveTo(x + k * 3, y - 12); g.lineTo(x + k * 3.6, y - 1); } g.stroke(); }
function makeFg(ri) {
  const A = ART[ri], r = seeded(4242 + ri), W = WALLY, snow = !!A.snow, moss = ri === 1 || ri === 4 || ri === 5;
  const L = -OX / S - 4, Rr = (CW - OX) / S + 4, B = (CH - OY) / S + 4; fgY0 = W - 140;
  const c = document.createElement('canvas'); c.width = cv.width; c.height = Math.max(1, Math.ceil((B - fgY0) * S * DPR)); const g = c.getContext('2d');
  g.setTransform(S * DPR, 0, 0, S * DPR, OX * DPR, -fgY0 * S * DPR);
  const col = ri === 9 || ri === 11 ? '#8e8890' : STONE, cy0 = W + 46;
  // courtyard
  cobbles(g, L, cy0, Rr, B, ri === 3 ? '#9aa2ae' : '#857b6b', r);
  const pg = g.createLinearGradient(0, cy0, 0, B); pg.addColorStop(0, 'rgba(0,0,0,0.35)'); pg.addColorStop(0.25, 'rgba(0,0,0,0)'); pg.addColorStop(1, 'rgba(0,0,0,0.35)'); g.fillStyle = pg; g.fillRect(L, cy0, Rr - L, B - cy0);
  g.fillStyle = 'rgba(210,200,180,0.35)'; g.fillRect(VW / 2 - 26, cy0, 52, B - cy0);
  const yb = Math.min(B - 6, cy0 + 90);
  [[L + 34, yb, 46, 26, '#a8432e'], [Rr - 34, yb, 46, 26, '#3d5c94'], [L + 92, yb + 40, 40, 22, '#3d5c94'], [Rr - 92, yb + 40, 40, 22, '#a8432e']].forEach(([x, y, w, h, rc]) => { if (y < B + 30) house(g, x, y, w, h, rc, r, snow); });
  barrel(g, VW / 2 - 60, cy0 + 22); barrel(g, VW / 2 - 50, cy0 + 26); crate(g, VW / 2 + 56, cy0 + 24); hay(g, VW / 2 + 74, cy0 + 30); crate(g, VW / 2 - 140, cy0 + 20); barrel(g, VW / 2 + 140, cy0 + 22);
  // wall inner face + walk
  stoneBlocks(g, L, W + 6, Rr, cy0, col, r, 10);
  g.fillStyle = vgrad(g, W + 6, cy0, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.3)'); g.fillRect(L, W + 6, Rr - L, cy0 - W - 6);
  if (moss) { g.fillStyle = 'rgba(80,120,50,0.5)'; for (let i = 0; i < (Rr - L) / 14; i++) { g.beginPath(); g.ellipse(lerp(L, Rr, r()), cy0 - r() * 12, 3 + r() * 6, 2 + r() * 2, 0, 0, TAU); g.fill(); } }
  g.fillStyle = vgrad(g, cy0, cy0 + 16, 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0)'); g.fillRect(L, cy0, Rr - L, 16);
  g.fillStyle = vgrad(g, W - 13, W + 6, shade(col, 0.32), shade(col, 0.1)); g.fillRect(L, W - 13, Rr - L, 19);
  g.strokeStyle = rgba(shade(col, -0.45), 0.45); g.lineWidth = 0.8; g.beginPath(); g.moveTo(L, W - 4); g.lineTo(Rr, W - 4); for (let x = L + 6; x < Rr; x += 16 + r() * 6) { g.moveTo(x, W - 13); g.lineTo(x, W - 4); g.moveTo(x + 8, W - 4); g.lineTo(x + 8, W + 6); } g.stroke();
  g.fillStyle = shade(col, 0.4); g.fillRect(L, W + 5, Rr - L, 1.6);
  if (snow) { g.fillStyle = 'rgba(248,251,255,0.85)'; g.fillRect(L, W - 13, Rr - L, 4); }
  // battlements along the outer edge (crenels show the field behind)
  const skip = x => SLOT_FX.some(f => Math.abs(x - VW * f) < 30) || Math.abs(x - VW / 2) < 56;
  for (let x = L - 6; x < Rr; x += 23) if (!skip(x + 7)) merlon(g, x, W - 29, 14, 17, col, snow);
  SLOT_FX.forEach(f => bastion(g, VW * f, W, col, r, snow));
  keep(g, VW / 2, W, col, r, snow, moss);
  g.setTransform(1, 0, 0, 1, 0, 0);
  fg = c; fgKey = ri + ':' + c.width + 'x' + c.height + ':' + W;
  const dr = seeded(99); dmgFx = { cracks: Array.from({ length: 16 }, () => { const x = lerp(L + 10, Rr - 10, dr()); let y = W + 8 + dr() * 6, xx = x; const p = [[xx, y]]; for (let k = 0; k < 4; k++) { xx += (dr() - 0.5) * 14; y += 6 + dr() * 7; p.push([xx, y]); } return p; }),
    breach: [0.2, 0.68, 0.86, 0.32].map(f => lerp(L + 20, Rr - 20, f)), fires: [[VW * 0.17, W - 6], [VW * 0.7, W - 4], [VW / 2 - 30, W - 40], [VW * 0.88, W - 2], [VW * 0.3, W - 3]] };
}
let dmgFx = null;
function drawDamage(pct) {
  if (!dmgFx || pct >= 0.8) return;
  const n = Math.ceil((0.8 - pct) / 0.8 * dmgFx.cracks.length);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) { const p = dmgFx.cracks[i]; for (const [w, c, o] of [[2.2, 'rgba(30,22,16,0.75)', 0], [0.8, 'rgba(255,240,220,0.25)', 1]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); p.forEach(([x, y], j) => j ? ctx.lineTo(x + o, y + o) : ctx.moveTo(x + o, y + o)); ctx.stroke(); } }
  if (pct < 0.55) { const nb = pct < 0.3 ? 4 : 2; for (let i = 0; i < nb; i++) { const x = dmgFx.breach[i], W = WALLY; ctx.fillStyle = '#4b443b'; ctx.beginPath(); ctx.moveTo(x - 16, W - 12); ctx.lineTo(x - 10, W - 22); ctx.lineTo(x - 3, W - 15); ctx.lineTo(x + 4, W - 26); ctx.lineTo(x + 12, W - 16); ctx.lineTo(x + 17, W - 12); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? '#8e8576' : '#a99f8e'; ctx.beginPath(); ctx.ellipse(x - 12 + k * 6, W - 5 + (k % 3), 3.2, 2.2, k, 0, TAU); ctx.fill(); } } }
  if (pct < 0.35) { const t = performance.now() / 1000; for (let i = 0; i < (pct < 0.18 ? 5 : 3); i++) { const [x, y] = dmgFx.fires[i]; drawFlame(x, y, 0.8 + 0.15 * Math.sin(t * 9 + i * 2), t + i); } }
}
function drawFlame(x, y, s, t) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawSp(glow('#ff8a2a', 22), x, y - 6 * s, 0, s * 1.1);
  for (let k = 0; k < 3; k++) { const h = (12 + 5 * Math.sin(t * 13 + k * 2.1)) * s, w = (5 - k * 1.2) * s, ox = (k - 1) * 3 * s; ctx.fillStyle = ['#ff5a1a', '#ffa22a', '#fff0a0'][k]; ctx.beginPath(); ctx.moveTo(x + ox - w, y); ctx.quadraticCurveTo(x + ox - w, y - h * 0.5, x + ox + Math.sin(t * 7 + k) * 2, y - h); ctx.quadraticCurveTo(x + ox + w, y - h * 0.5, x + ox + w, y); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

// ---- towers: built structures with 4 visible tiers (Lv 1 / 6 / 12 / 20)
const tierOf = lv => lv >= 20 ? 4 : lv >= 12 ? 3 : lv >= 6 ? 2 : 1;
const TTOP = { archer: [26, 34, 42, 50], crossbow: [24, 31, 38, 45], multi: [46, 54, 62, 70], cannon: [16, 20, 24, 28], frost: [40, 48, 56, 64], storm: [34, 42, 50, 58], flame: [24, 30, 36, 42], prism: [40, 48, 56, 64] };
const towerTop = (k, lv) => TTOP[k][tierOf(lv) - 1];
function towerSprite(k, tier) {
  const key = 'T' + k + tier; if (cache[key]) return cache[key];
  const W = 76, H = 150, ax = W / 2, ay = 128;
  const sp = outlined(W, H, g => { g.translate(ax, ay); paintTower(g, k, tier); }, 1.1, '#20160e');
  sp.ax = ax; sp.ay = ay; return cache[key] = sp;
}
function pennant(g, x, y, h, col, big) { g.fillStyle = '#4a3420'; g.fillRect(x - 0.8, y - h, 1.6, h); g.fillStyle = col; poly(g, [[x + 0.8, y - h], [x + (big ? 16 : 11), y - h + (big ? 4 : 3)], [x + 0.8, y - h + (big ? 9 : 6)]]); g.fill(); ball(g, x, y - h - 1, 1.4, 1.4, '#e8c25a'); }
function paintTower(g, k, t) {
  const r = seeded(k.length * 31 + t), top = -TTOP[k][t - 1], gold = '#e2b84c';
  const stone = { archer: '#b0a690', crossbow: '#a49a88', multi: '#c2b8a6', cannon: '#7c7670', frost: '#d4e2ee', storm: '#9c9488', flame: '#5e5450', prism: '#e6e0ee' }[k];
  switch (k) {
    case 'archer': {
      cylBody(g, 0, 17, top, 0, stone, r, 8);
      if (t >= 3) { g.fillStyle = gold; g.fillRect(-17, top + 9, 34, 2.4); }
      g.fillStyle = '#2a2420'; rr(g, -2, top + 14, 4, 9, 2); g.fill();
      if (t === 1) { cylTop(g, 0, 19, top, '#9a6a3a'); g.strokeStyle = '#6a4424'; g.lineWidth = 0.8; for (let x = -16; x <= 16; x += 4) { g.beginPath(); g.moveTo(x, top - 6); g.lineTo(x, top + 6); g.stroke(); } for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI, x = Math.cos(a) * 18, y = top + Math.sin(a) * 6.8; g.fillStyle = '#7a4e2a'; g.fillRect(x - 1.2, y - 8, 2.4, 9); } g.fillStyle = '#8a5a30'; g.beginPath(); g.ellipse(0, top - 6, 18, 6.8, 0, 0, Math.PI); g.lineWidth = 2; g.strokeStyle = '#8a5a30'; g.stroke(); }
      else { crenRing(g, 0, 18, top, stone, 10, false, 6, 6, false, t >= 4); cylTop(g, 0, 17, top, shade(stone, 0.05)); crenRing(g, 0, 18, top, stone, 10, true, 6, 6, false, t >= 4); }
      if (t >= 2) pennant(g, 13, top - 4, 20, '#c0392b', t >= 4);
      if (t >= 3) pennant(g, -14, top - 4, 16, '#2b4f9c');
      if (t >= 3) bannerCloth(g, 0, top + 4, t >= 4 ? 22 : 16, 10, '#2b4f9c', gold, t >= 4);
      break; }
    case 'crossbow': {
      const w = 17; g.fillStyle = hgrad(g, -w, w, stone, 0.25, -0.45); g.fillRect(-w, top + 6, w * 2, -top - 6); stoneBlocks(g, -w + 1, top + 7, w - 1, 0, stone, r, 7);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(w - 6, top + 6, 6, -top - 6);
      g.fillStyle = shade(stone, 0.25); poly(g, [[-w, top + 6], [w, top + 6], [w - 3, top - 4], [-w + 3, top - 4]]); g.fill();
      g.fillStyle = '#8a5a30'; poly(g, [[-w + 4, top + 4], [w - 4, top + 4], [w - 6, top - 2], [-w + 6, top - 2]]); g.fill();
      for (const x of [-w, w - 5]) merlon(g, x, top - 4, 5, 10, stone);
      if (t >= 2) { g.fillStyle = '#4a4a50'; g.fillRect(-w, top + 6, 3, -top - 6); g.fillRect(w - 3, top + 6, 3, -top - 6); g.fillStyle = '#9a9aa2'; for (let y = top + 10; y < -2; y += 6) { g.fillRect(-w + 0.8, y, 1.4, 1.4); g.fillRect(w - 2.2, y, 1.4, 1.4); } }
      if (t >= 3) { g.fillStyle = '#c8c8d0'; for (const x of [-w - 2, w + 2]) poly(g, [[x, top + 12], [x + (x < 0 ? -5 : 5), top + 14], [x, top + 16]]); g.fill(); }
      if (t >= 4) { g.fillStyle = gold; g.fillRect(-w, top + 6, w * 2, 2); bannerCloth(g, 0, top + 9, 18, 10, '#7a1f2a', gold, true); }
      else { g.fillStyle = '#2a2420'; rr(g, -2, top + 14, 4, 8, 2); g.fill(); }
      break; }
    case 'multi': {
      cylBody(g, 0, 14, top + 6, 0, stone, r, 8);
      for (let i = 0; i < 3; i++) { const y = top + 16 + i * 13; if (y > -6) break; g.fillStyle = '#2a1e16'; rr(g, -3, y, 6, 8, 3); g.fill(); g.fillStyle = 'rgba(255,200,90,0.75)'; rr(g, -2, y + 2, 4, 5, 2); g.fill(); }
      g.fillStyle = shade(stone, -0.2); g.beginPath(); g.ellipse(0, top + 6, 18, 6.8, 0, 0, TAU); g.fill(); g.fillStyle = '#7a5030'; g.fillRect(-18, top + 4, 36, 3);
      const rc = ['#8a5a30', '#3d5c94', '#3d5c94', '#5a3a8a'][t - 1]; coneRoof(g, 0, 17, top + 4, 26 + t * 2, rc, r, false, t >= 3 ? gold : '#c9c4ba');
      if (t >= 2) pennant(g, 0, top + 4 - 26 - t * 2, 12, '#c0392b', t >= 4);
      if (t >= 3) { g.fillStyle = gold; g.fillRect(-14, top + 12, 28, 2); }
      if (t >= 4) { g.fillStyle = gold; g.fillRect(-14, -14, 28, 2); }
      break; }
    case 'cannon': {
      const rx = 23; cylBody(g, 0, rx, top, 0, stone, r, 7);
      g.fillStyle = '#3a3634'; g.fillRect(-rx, top + 6, rx * 2, 2.6); if (t >= 2) g.fillRect(-rx, top + 14, rx * 2, 2.6);
      crenRing(g, 0, rx, top, stone, 12, false, 5, 6, false, t >= 3); cylTop(g, 0, rx - 2, top, '#8e8880'); crenRing(g, 0, rx, top, stone, 12, true, 5, 6, false, t >= 3);
      for (const [x, y] of [[-12, top - 3], [-9, top - 3], [-10.5, top - 5.5]]) ball(g, x, y, 2.2, 2.2, '#2e2e34', 0.5, -0.3);
      if (t >= 4) bannerCloth(g, 0, top + 9, 12, 9, '#7a1f2a', gold, false);
      break; }
    case 'frost': {
      const wb = 14, wt = 9; g.fillStyle = hgrad(g, -wb, wb, stone, 0.2, -0.4); poly(g, [[-wb, 0], [-wt, top + 10], [wt, top + 10], [wb, 0]]); g.fill();
      g.strokeStyle = rgba('#7fb8de', 0.6); g.lineWidth = 0.8; for (let y = top + 18; y < 0; y += 9) { const f = (y - top - 10) / (-top - 10), hw = lerp(wt, wb, f); g.beginPath(); g.moveTo(-hw, y); g.lineTo(hw, y); g.stroke(); }
      g.strokeStyle = '#6fe0ff'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, top + 18); g.lineTo(-3, top + 26); g.lineTo(3, top + 32); g.lineTo(0, top + 40); g.stroke();
      g.fillStyle = shade(stone, 0.2); poly(g, [[-wt - 3, top + 10], [wt + 3, top + 10], [wt, top + 4], [-wt, top + 4]]); g.fill();
      g.fillStyle = '#9fd8ff'; g.beginPath(); g.ellipse(0, top + 5, 7, 2.5, 0, 0, TAU); g.fill();
      if (t >= 2) for (const s of [-1, 1]) { g.fillStyle = '#c8ecff'; poly(g, [[s * 12, 0], [s * 18, -14], [s * 15, 0]]); g.fill(); g.fillStyle = '#e8f8ff'; poly(g, [[s * 9, 0], [s * 12, -9], [s * 13, 0]]); g.fill(); }
      if (t >= 3) { g.fillStyle = gold; g.fillRect(-wt - 3, top + 9, (wt + 3) * 2, 1.8); }
      if (t >= 4) for (const s of [-1, 1]) { g.fillStyle = '#e8f8ff'; poly(g, [[s * 6, top + 6], [s * 11, top - 6], [s * 9, top + 6]]); g.fill(); }
      break; }
    case 'storm': {
      cylBody(g, 0, 16, -16, 0, stone, r, 8); cylTop(g, 0, 15, -16, shade(stone, 0.1));
      g.fillStyle = hgrad(g, -5, 5, '#b8864a', 0.35, -0.4); g.fillRect(-4.5, top + 6, 9, -top - 22);
      const nR = 2 + t; for (let i = 0; i < nR; i++) { const y = -20 - i * ((-top - 26) / nR), rw = 11 - i * 0.8; g.strokeStyle = '#7a4a22'; g.lineWidth = 3.4; g.beginPath(); g.ellipse(0, y, rw, rw * 0.36, 0, 0, TAU); g.stroke(); g.strokeStyle = '#e09a50'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, y - 0.6, rw, rw * 0.36, 0, Math.PI, TAU); g.stroke(); }
      g.fillStyle = '#5a4a3a'; g.beginPath(); g.ellipse(0, top + 6, 7, 2.6, 0, 0, TAU); g.fill();
      if (t >= 3) for (const s of [-1, 1]) { g.fillStyle = '#b8864a'; g.fillRect(s * 12 - 1, -30, 2, 14); ball(g, s * 12, -31, 2.4, 2.4, '#c58bff', 0.5, -0.2); }
      if (t >= 4) { g.fillStyle = gold; g.fillRect(-16, -12, 32, 2); }
      break; }
    case 'flame': {
      cylBody(g, 0, 18, top + 4, 0, stone, r, 8);
      g.strokeStyle = 'rgba(255,120,40,0.65)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-6, -4); g.lineTo(-3, top + 16); g.lineTo(-7, top + 10); g.moveTo(8, -6); g.lineTo(5, top + 18); g.stroke();
      const bc = t >= 3 ? '#4a4044' : '#3a3634'; g.fillStyle = hgrad(g, -16, 16, bc, 0.3, -0.4); g.beginPath(); g.moveTo(-17, top - 2); g.quadraticCurveTo(0, top + 14, 17, top - 2); g.closePath(); g.fill();
      g.fillStyle = t >= 3 ? gold : '#5a5254'; g.beginPath(); g.ellipse(0, top - 2, 17, 5, 0, 0, TAU); g.fill(); g.fillStyle = '#2a1410'; g.beginPath(); g.ellipse(0, top - 2.5, 14, 3.8, 0, 0, TAU); g.fill();
      for (const s of [-1, 1]) { g.fillStyle = '#3a3634'; poly(g, [[s * 9, top + 6], [s * 14, top + 14], [s * 11, top + 14]]); g.fill(); }
      if (t >= 2) for (const s of [-1, 1]) { g.fillStyle = '#2e2828'; poly(g, [[s * 17, top - 2], [s * 21, top - 12], [s * 15, top - 3]]); g.fill(); }
      if (t >= 4) bannerCloth(g, 0, top + 12, 14, 9, '#7a1f2a', gold, false);
      break; }
    case 'prism': {
      cylBody(g, 0, 15, top + 6, 0, stone, r, 9);
      g.fillStyle = '#7a3aa8'; g.fillRect(-15, top + 14, 30, 2.4); g.fillRect(-15, -10, 30, 2.4);
      g.fillStyle = '#2a1e30'; rr(g, -3, top + 22, 6, 10, 3); g.fill(); g.fillStyle = 'rgba(255,120,240,0.8)'; rr(g, -2, top + 24, 4, 7, 2); g.fill();
      crenRing(g, 0, 16, top + 6, '#d8d0e4', 8, false, 5, 5, false, t >= 3); cylTop(g, 0, 15, top + 6, '#d0c6de'); crenRing(g, 0, 16, top + 6, '#d8d0e4', 8, true, 5, 5, false, t >= 3);
      g.fillStyle = '#8a4ab8'; g.beginPath(); g.ellipse(0, top + 5, 8, 3, 0, 0, TAU); g.fill();
      if (t >= 2) for (const s of [-1, 1]) { g.fillStyle = '#e6e0ee'; g.fillRect(s * 11 - 1.5, top - 6, 3, 12); ball(g, s * 11, top - 7, 2.2, 2.2, t >= 4 ? gold : '#ff86f2', 0.5, -0.2); }
      if (t >= 4) bannerCloth(g, 0, top + 34, 12, 9, '#5a2a8a', gold, false);
      break; }
  }
}
// ---- creatures (front view, walking toward the castle). All painted in code, original designs.
function weapon(g, k, x, y, r, o) {
  g.save(); g.translate(x, y); g.lineCap = 'round';
  switch (k) {
    case 'club': g.rotate(-0.35); g.fillStyle = hgrad(g, -r * 0.12, r * 0.12, '#8a5a30', 0.3, -0.4); poly(g, [[-r * 0.07, r * 0.1], [-r * 0.17, -r * 0.75], [r * 0.17, -r * 0.75], [r * 0.07, r * 0.1]]); g.fill(); g.fillStyle = '#c9c4ba'; for (const [a, b] of [[-0.1, -0.6], [0.12, -0.45]]) { g.beginPath(); g.arc(a * r, b * r, r * 0.04, 0, TAU); g.fill(); } break;
    case 'bigclub': g.rotate(-0.4); g.fillStyle = hgrad(g, -r * 0.2, r * 0.2, '#6e4a2a', 0.3, -0.4); poly(g, [[-r * 0.08, r * 0.15], [-r * 0.26, -r * 0.95], [r * 0.26, -r * 0.95], [r * 0.08, r * 0.15]]); g.fill(); g.fillStyle = o.spikes || '#d8d2c6'; for (let i = 0; i < 5; i++) { const yy = -r * (0.4 + i * 0.12), s = i % 2 ? 1 : -1; poly(g, [[s * r * 0.2, yy], [s * r * 0.36, yy - r * 0.04], [s * r * 0.2, yy - r * 0.08]]); g.fill(); } break;
    case 'sword': g.rotate(-0.15); g.fillStyle = hgrad(g, -r * 0.07, r * 0.07, '#d8dde6', 0.4, -0.35); poly(g, [[-r * 0.07, -r * 0.1], [-r * 0.07, -r * 0.85], [0, -r * 1.0], [r * 0.07, -r * 0.85], [r * 0.07, -r * 0.1]]); g.fill(); g.fillStyle = o.hilt || '#c8a24a'; g.fillRect(-r * 0.2, -r * 0.12, r * 0.4, r * 0.08); g.fillStyle = '#4a2e1a'; g.fillRect(-r * 0.04, -r * 0.05, r * 0.08, r * 0.18); break;
    case 'dagger': g.rotate(0.3); g.fillStyle = '#d8dde6'; poly(g, [[-r * 0.05, 0], [0, -r * 0.42], [r * 0.05, 0]]); g.fill(); g.fillStyle = '#5a3a20'; g.fillRect(-r * 0.1, 0, r * 0.2, r * 0.06); break;
    case 'spear': g.strokeStyle = '#7a5030'; g.lineWidth = r * 0.09; g.beginPath(); g.moveTo(0, r * 0.5); g.lineTo(0, -r * 1.1); g.stroke(); g.fillStyle = '#d0d4dc'; poly(g, [[-r * 0.1, -r * 1.05], [0, -r * 1.4], [r * 0.1, -r * 1.05]]); g.fill(); break;
    case 'staff': g.strokeStyle = '#6a4424'; g.lineWidth = r * 0.09; g.beginPath(); g.moveTo(0, r * 0.55); g.lineTo(0, -r * 0.95); g.stroke(); { const oc = o.orb || '#5fe6a0'; const q = g.createRadialGradient(0, -r * 1.05, 0, 0, -r * 1.05, r * 0.45); q.addColorStop(0, rgba(oc, 0.8)); q.addColorStop(1, rgba(oc, 0)); g.fillStyle = q; g.fillRect(-r * 0.45, -r * 1.5, r * 0.9, r * 0.9); ball(g, 0, -r * 1.05, r * 0.15, r * 0.15, oc, 0.6, -0.2); } break;
    case 'sling': g.strokeStyle = '#6a4424'; g.lineWidth = r * 0.05; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(r * 0.3, -r * 0.3, r * 0.15, -r * 0.6); g.stroke(); ball(g, r * 0.15, -r * 0.62, r * 0.09, r * 0.09, '#8a8478'); break;
    case 'totem': g.strokeStyle = '#6a4424'; g.lineWidth = r * 0.09; g.beginPath(); g.moveTo(0, r * 0.55); g.lineTo(0, -r * 0.85); g.stroke(); ball(g, 0, -r * 0.95, r * 0.17, r * 0.15, '#efe6d2', 0.3, -0.3); g.fillStyle = '#2a2018'; g.fillRect(-r * 0.09, -r * 1.0, r * 0.06, r * 0.06); g.fillRect(r * 0.03, -r * 1.0, r * 0.06, r * 0.06); g.fillStyle = o.orb || '#3fe0c0'; for (const s of [-1, 1]) { poly(g, [[s * r * 0.12, -r * 0.92], [s * r * 0.35, -r * 1.1], [s * r * 0.15, -r * 0.82]]); g.fill(); } break;
    case 'axe': g.rotate(-0.3); g.strokeStyle = '#6a4424'; g.lineWidth = r * 0.09; g.beginPath(); g.moveTo(0, r * 0.2); g.lineTo(0, -r * 0.9); g.stroke(); g.fillStyle = hgrad(g, 0, r * 0.45, '#c8ccd4', 0.4, -0.3); g.beginPath(); g.moveTo(0, -r * 0.85); g.quadraticCurveTo(r * 0.5, -r * 0.95, r * 0.42, -r * 0.5); g.lineTo(0, -r * 0.55); g.fill(); break;
  }
  g.restore();
}
function hum(g, r, f, o) {
  const sw = [0, 1, 0, -1][f], bk = o.bulk || 1, sk = o.skin, cl = o.cloth, tw = r * 0.5 * bk, by = -Math.abs(sw) * r * 0.05;
  if (o.cape) { g.fillStyle = shade(o.cape, -0.2); poly(g, [[-tw * 1.05, -r * 0.2], [tw * 1.05, -r * 0.2], [tw * 1.35 + sw * r * 0.04, r * 0.8], [-tw * 1.35 + sw * r * 0.04, r * 0.8]]); g.fill(); }
  if (o.robe) { g.fillStyle = hgrad(g, -tw * 1.2, tw * 1.2, o.robe, 0.2, -0.45); poly(g, [[-tw * 0.85, 0], [tw * 0.85, 0], [tw * 1.15 + sw * r * 0.06, r * 0.86], [-tw * 1.15 + sw * r * 0.06, r * 0.86]]); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = -1; i <= 1; i++) { g.fillRect(i * tw * 0.4 + sw * r * 0.03, r * 0.3, r * 0.03, r * 0.5); } }
  else for (const s of [-1, 1]) { const lift = s === sw ? -r * 0.12 : 0, lx = s * r * 0.24 * bk; g.fillStyle = hgrad(g, lx - r * 0.14, lx + r * 0.14, o.legs || shade(cl, -0.35), 0.15, -0.4); rr(g, lx - r * 0.14 * bk, r * 0.28 + lift, r * 0.28 * bk, r * 0.46, r * 0.1); g.fill(); g.fillStyle = o.boot || '#3b2a1c'; rr(g, lx - r * 0.17 * bk, r * 0.64 + lift, r * 0.34 * bk, r * 0.22, r * 0.09); g.fill(); }
  g.save(); g.translate(0, by);
  const hr = r * 0.34 * (o.head || 1), hy = -r * 0.48 - (o.neck || 0) * r;
  if (o.hat === 'hood') ball(g, 0, hy - hr * 0.05, hr * 1.2, hr * 1.15, o.hood || cl, 0.15, -0.45);
  const handR = [tw + r * 0.1, r * 0.16 - sw * r * 0.06], handL = [-(tw + r * 0.08), r * 0.22 + sw * r * 0.06];
  const arm = (h, s) => { g.strokeStyle = o.sleeve || shade(cl, -0.1); g.lineWidth = r * 0.22 * bk; g.lineCap = 'round'; g.beginPath(); g.moveTo(s * tw * 0.8, -r * 0.12); g.lineTo(h[0], h[1]); g.stroke(); ball(g, h[0], h[1], r * 0.12 * bk, r * 0.12 * bk, o.glove || sk, 0.3, -0.35); };
  if (o.wpn && o.wpnBack) weapon(g, o.wpn, handR[0], handR[1], r, o);
  g.fillStyle = hgrad(g, -tw, tw, cl, 0.28, -0.45); g.beginPath(); g.ellipse(0, r * 0.04, tw, r * 0.46, 0, 0, TAU); g.fill();
  if (o.armor) { g.fillStyle = hgrad(g, -tw * 0.8, tw * 0.8, o.armor, 0.45, -0.35); g.beginPath(); g.ellipse(0, -r * 0.02, tw * 0.78, r * 0.34, 0, 0, TAU); g.fill(); g.strokeStyle = rgba(shade(o.armor, -0.5), 0.6); g.lineWidth = r * 0.03; g.beginPath(); g.moveTo(0, -r * 0.3); g.lineTo(0, r * 0.28); g.stroke(); for (const s of [-1, 1]) ball(g, s * tw * 0.92, -r * 0.18, r * 0.17 * bk, r * 0.14 * bk, o.armor, 0.45, -0.35); }
  if (o.vest) { g.fillStyle = o.vest; poly(g, [[-tw * 0.7, -r * 0.3], [-tw * 0.15, -r * 0.3], [-tw * 0.3, r * 0.3], [-tw * 0.75, r * 0.25]]); g.fill(); poly(g, [[tw * 0.7, -r * 0.3], [tw * 0.15, -r * 0.3], [tw * 0.3, r * 0.3], [tw * 0.75, r * 0.25]]); g.fill(); }
  g.fillStyle = o.belt || '#4a2e1a'; g.fillRect(-tw * 0.92, r * 0.2, tw * 1.84, r * 0.1); g.fillStyle = '#d8b24a'; g.fillRect(-r * 0.06, r * 0.19, r * 0.12, r * 0.12);
  if (o.tabard) { g.fillStyle = o.tabard; poly(g, [[-tw * 0.4, -r * 0.25], [tw * 0.4, -r * 0.25], [tw * 0.35, r * 0.62], [0, r * 0.7], [-tw * 0.35, r * 0.62]]); g.fill(); if (o.sigil) { g.fillStyle = o.sigil; g.beginPath(); g.arc(0, r * 0.05, r * 0.1, 0, TAU); g.fill(); } }
  arm(handL, -1); arm(handR, 1);
  if (o.wpn && !o.wpnBack) weapon(g, o.wpn, handR[0], handR[1], r, o);
  if (o.shield) { const sx = handL[0] + r * 0.05, sy = handL[1] - r * 0.12, w = r * 0.52 * (o.shieldS || 1); g.fillStyle = hgrad(g, sx - w, sx + w, o.shield, 0.35, -0.4); g.beginPath(); g.moveTo(sx - w, sy - w * 0.9); g.lineTo(sx + w, sy - w * 0.9); g.lineTo(sx + w, sy + w * 0.1); g.quadraticCurveTo(sx + w * 0.8, sy + w * 0.9, sx, sy + w * 1.15); g.quadraticCurveTo(sx - w * 0.8, sy + w * 0.9, sx - w, sy + w * 0.1); g.closePath(); g.fill(); g.strokeStyle = o.shieldRim || '#c9c4ba'; g.lineWidth = r * 0.07; g.stroke(); g.fillStyle = o.shieldRim || '#c9c4ba'; g.beginPath(); g.arc(sx, sy, r * 0.09, 0, TAU); g.fill(); }
  // head
  if (o.ears) for (const s of [-1, 1]) { g.fillStyle = sk; poly(g, [[s * hr * 0.75, hy - hr * 0.15], [s * hr * 1.75, hy - hr * 0.55], [s * hr * 0.85, hy + hr * 0.3]]); g.fill(); g.fillStyle = shade(sk, -0.25); poly(g, [[s * hr * 0.9, hy - hr * 0.05], [s * hr * 1.45, hy - hr * 0.42], [s * hr * 0.92, hy + hr * 0.15]]); g.fill(); }
  if (o.hat !== 'greathelm') ball(g, 0, hy, hr, hr * 0.96, sk, 0.3, -0.38);
  if (o.hat === 'hood') { g.fillStyle = o.hood || cl; g.beginPath(); g.ellipse(0, hy - hr * 0.42, hr * 1.12, hr * 0.7, 0, Math.PI, 0); g.lineTo(hr * 1.1, hy + hr * 0.5); g.quadraticCurveTo(hr * 0.85, hy - hr * 0.2, 0, hy - hr * 0.3); g.quadraticCurveTo(-hr * 0.85, hy - hr * 0.2, -hr * 1.1, hy + hr * 0.5); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0, hy - hr * 0.25, hr * 0.8, hr * 0.22, 0, 0, Math.PI); g.fill(); }
  if (o.hat === 'greathelm') { ball(g, 0, hy, hr * 1.08, hr * 1.1, o.helm || '#7a7f8a', 0.45, -0.4); g.fillStyle = '#16141c'; rr(g, -hr * 0.75, hy - hr * 0.15, hr * 1.5, hr * 0.3, hr * 0.12); g.fill(); g.fillStyle = o.eyes || '#ff5a3a'; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * hr * 0.35, hy, hr * 0.11, 0, TAU); g.fill(); } if (o.plume) { g.fillStyle = o.plume; g.beginPath(); g.moveTo(-hr * 0.15, hy - hr); g.quadraticCurveTo(hr * 0.2, hy - hr * 2.0, hr * 0.9, hy - hr * 1.5); g.quadraticCurveTo(hr * 0.3, hy - hr * 1.3, hr * 0.15, hy - hr * 0.95); g.fill(); } }
  else {
    const ey = hy + hr * 0.05;
    if (o.glowEyes) { g.fillStyle = o.glowEyes; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * hr * 0.36, ey, hr * 0.15, hr * 0.11, 0, 0, TAU); g.fill(); } }
    else { for (const s of [-1, 1]) { g.fillStyle = '#fffdf4'; g.beginPath(); g.ellipse(s * hr * 0.36, ey, hr * 0.2, hr * 0.17, 0, 0, TAU); g.fill(); g.fillStyle = o.pupil || '#2a1a10'; g.beginPath(); g.arc(s * hr * 0.33, ey + hr * 0.03, hr * 0.1, 0, TAU); g.fill(); }
      g.strokeStyle = shade(sk, -0.6); g.lineWidth = hr * 0.12; g.lineCap = 'round'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * hr * 0.58, ey - hr * 0.28); g.lineTo(s * hr * 0.14, ey - hr * 0.14); g.stroke(); } }
    g.strokeStyle = shade(sk, -0.6); g.lineWidth = hr * 0.09; g.beginPath(); g.moveTo(-hr * 0.25, hy + hr * 0.5); g.quadraticCurveTo(0, hy + hr * 0.38, hr * 0.25, hy + hr * 0.5); g.stroke();
    if (o.tusks) { g.fillStyle = '#fff6e0'; for (const s of [-1, 1]) poly(g, [[s * hr * 0.3, hy + hr * 0.48], [s * hr * 0.38, hy + hr * 0.15], [s * hr * 0.18, hy + hr * 0.45]]), g.fill(); }
    if (o.beard) { g.fillStyle = o.beard; g.beginPath(); g.moveTo(-hr * 0.8, hy + hr * 0.2); g.quadraticCurveTo(-hr * 0.6, hy + hr * 1.5, 0, hy + hr * 1.75); g.quadraticCurveTo(hr * 0.6, hy + hr * 1.5, hr * 0.8, hy + hr * 0.2); g.quadraticCurveTo(0, hy + hr * 0.7, -hr * 0.8, hy + hr * 0.2); g.fill(); }
    if (o.hat === 'helm' || o.hat === 'horns') { g.fillStyle = hgrad(g, -hr, hr, o.helm || '#8a909a', 0.45, -0.35); g.beginPath(); g.ellipse(0, hy - hr * 0.25, hr * 1.06, hr * 0.85, 0, Math.PI, 0); g.closePath(); g.fill(); g.fillStyle = shade(o.helm || '#8a909a', -0.25); g.fillRect(-hr * 1.06, hy - hr * 0.3, hr * 2.12, hr * 0.2); g.fillRect(-hr * 0.08, hy - hr * 0.3, hr * 0.16, hr * 0.55);
      if (o.hat === 'horns') for (const s of [-1, 1]) { g.fillStyle = '#efe6d2'; g.beginPath(); g.moveTo(s * hr * 0.8, hy - hr * 0.5); g.quadraticCurveTo(s * hr * 1.8, hy - hr * 0.7, s * hr * 1.6, hy - hr * 1.7); g.quadraticCurveTo(s * hr * 1.35, hy - hr * 0.95, s * hr * 0.6, hy - hr * 0.85); g.fill(); } }
    if (o.hat === 'band') { g.fillStyle = o.band || '#a8342a'; g.fillRect(-hr * 0.98, hy - hr * 0.5, hr * 1.96, hr * 0.24); }
    if (o.hat === 'mask') { g.fillStyle = '#c89a5a'; g.beginPath(); g.ellipse(0, hy + hr * 0.05, hr * 0.8, hr * 0.85, 0, 0, TAU); g.fill(); g.fillStyle = '#2a1a10'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * hr * 0.33, hy, hr * 0.16, hr * 0.12, 0, 0, TAU); g.fill(); } g.fillStyle = o.glowEyes || '#3fe0c0'; g.fillRect(-hr * 0.5, hy + hr * 0.35, hr, hr * 0.1); g.fillRect(-hr * 0.06, hy - hr * 0.7, hr * 0.12, hr * 0.5);
      ['#3fb8a0', '#e8c25a', '#c8402e', '#3fb8a0', '#e8c25a'].forEach((c, i) => { const a = -Math.PI / 2 + (i - 2) * 0.38; g.fillStyle = c; g.save(); g.translate(Math.cos(a) * hr * 0.8, hy + Math.sin(a) * hr * 0.8); g.rotate(a + Math.PI / 2); g.beginPath(); g.ellipse(0, -hr * 0.4, hr * 0.14, hr * 0.48, 0, 0, TAU); g.fill(); g.restore(); }); }
    if (o.hat === 'crown') { g.fillStyle = hgrad(g, -hr * 0.8, hr * 0.8, '#e8c25a', 0.45, -0.35); poly(g, [[-hr * 0.8, hy - hr * 0.55], [-hr * 0.85, hy - hr * 1.3], [-hr * 0.42, hy - hr * 0.95], [0, hy - hr * 1.5], [hr * 0.42, hy - hr * 0.95], [hr * 0.85, hy - hr * 1.3], [hr * 0.8, hy - hr * 0.55]]); g.fill(); g.fillStyle = o.gem || '#c8302a'; g.beginPath(); g.arc(0, hy - hr * 0.78, hr * 0.12, 0, TAU); g.fill(); }
    if (o.hat === 'witch') { g.fillStyle = hgrad(g, -hr * 1.4, hr * 1.4, o.hood || '#2a2a3a', 0.2, -0.45); g.beginPath(); g.ellipse(0, hy - hr * 0.55, hr * 1.5, hr * 0.32, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-hr * 0.75, hy - hr * 0.6); g.quadraticCurveTo(-hr * 0.4, hy - hr * 2.0, hr * 0.9, hy - hr * 2.5); g.quadraticCurveTo(hr * 0.2, hy - hr * 1.6, hr * 0.75, hy - hr * 0.6); g.closePath(); g.fill(); g.fillStyle = '#b6e04a'; g.fillRect(-hr * 0.72, hy - hr * 0.85, hr * 1.44, hr * 0.18); }
  }
  if (o.spikes) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.fillStyle = o.spikes; poly(g, [[s * (tw * 0.6 + i * r * 0.1), -r * 0.28], [s * (tw * 0.75 + i * r * 0.14), -r * 0.62 + i * r * 0.05], [s * (tw * 0.82 + i * r * 0.1), -r * 0.24]]); g.fill(); }
  g.restore();
}
function eyes(g, x, y, s, col = '#fffdf4', pupil = '#1a1010', glowc) { for (const d of [-1, 1]) { if (glowc) { g.fillStyle = glowc; g.beginPath(); g.ellipse(x + d * s * 1.2, y, s * 0.6, s * 0.45, 0, 0, TAU); g.fill(); continue; } g.fillStyle = col; g.beginPath(); g.ellipse(x + d * s * 1.2, y, s * 0.62, s * 0.55, 0, 0, TAU); g.fill(); g.fillStyle = pupil; g.beginPath(); g.arc(x + d * s * 1.1, y + s * 0.1, s * 0.3, 0, TAU); g.fill(); } }
function wing(g, s, span, flap, col, mem, rr0) { // s=-1|1
  const tipY = -rr0 * (0.2 + flap), pts = [[s * rr0 * 0.35, -rr0 * 0.15], [s * span * 0.5, tipY - rr0 * 0.35], [s * span, tipY], [s * span * 0.82, tipY + rr0 * 0.5], [s * span * 0.62, tipY + rr0 * 0.35], [s * span * 0.45, tipY + rr0 * 0.7], [s * span * 0.28, rr0 * 0.15 + flap * rr0 * 0.2], [s * rr0 * 0.3, rr0 * 0.25]];
  g.fillStyle = mem; poly(g, pts); g.fill(); g.strokeStyle = col; g.lineWidth = rr0 * 0.09; g.lineCap = 'round'; g.beginPath(); g.moveTo(s * rr0 * 0.35, -rr0 * 0.15); g.lineTo(s * span * 0.5, tipY - rr0 * 0.35); g.lineTo(s * span, tipY); for (const k of [3, 5]) { g.moveTo(s * span * 0.5, tipY - rr0 * 0.35); g.lineTo(pts[k][0], pts[k][1]); } g.stroke();
}
function golemBody(g, r, f, c, glowc, o = {}) {
  const sw = [0, 1, 0, -1][f], rr0 = seeded(7);
  for (const s of [-1, 1]) { const lift = s === sw ? -r * 0.1 : 0; g.fillStyle = hgrad(g, s * r * 0.3 - r * 0.2, s * r * 0.3 + r * 0.2, c, 0.25, -0.45); rr(g, s * r * 0.32 - r * 0.21, r * 0.35 + lift, r * 0.42, r * 0.5, r * 0.12); g.fill(); }
  g.fillStyle = hgrad(g, -r * 0.8, r * 0.8, c, 0.3, -0.5); poly(g, [[-r * 0.55, -r * 0.62], [r * 0.55, -r * 0.62], [r * 0.82, -r * 0.2], [r * 0.62, r * 0.48], [-r * 0.62, r * 0.48], [-r * 0.82, -r * 0.2]]); g.fill();
  g.strokeStyle = rgba(shade(c, -0.6), 0.7); g.lineWidth = r * 0.04; g.beginPath(); g.moveTo(-r * 0.4, -r * 0.5); g.lineTo(-r * 0.15, -r * 0.1); g.lineTo(-r * 0.3, r * 0.3); g.moveTo(r * 0.45, -r * 0.4); g.lineTo(r * 0.2, 0); g.lineTo(r * 0.4, r * 0.35); g.stroke();
  if (glowc) { g.strokeStyle = glowc; g.lineWidth = r * 0.035; g.beginPath(); g.moveTo(-r * 0.2, -r * 0.3); g.lineTo(0, r * 0.05); g.lineTo(r * 0.25, -r * 0.2); g.moveTo(0, r * 0.05); g.lineTo(-r * 0.05, r * 0.4); g.stroke(); const q = g.createRadialGradient(0, -r * 0.05, 0, 0, -r * 0.05, r * 0.3); q.addColorStop(0, rgba('#ffffff', 0.9)); q.addColorStop(0.3, rgba(glowc, 0.8)); q.addColorStop(1, rgba(glowc, 0)); g.fillStyle = q; g.beginPath(); g.arc(0, -r * 0.05, r * 0.3, 0, TAU); g.fill(); }
  for (const s of [-1, 1]) { const ay = r * 0.2 + (s === sw ? -r * 0.06 : r * 0.04); ball(g, s * r * 0.9, -r * 0.3, r * 0.26, r * 0.24, c, 0.3, -0.45); ball(g, s * r * 0.95, ay + r * 0.1, r * 0.3, r * 0.28, shade(c, -0.05), 0.3, -0.45); }
  ball(g, 0, -r * 0.78, r * 0.32, r * 0.26, shade(c, 0.05), 0.35, -0.4);
  eyes(g, 0, -r * 0.78, r * 0.11, 0, 0, glowc || '#7fe8ff');
  if (o.moss) { g.fillStyle = o.moss; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse((rr0() - 0.5) * r, -r * 0.6 + rr0() * r * 0.15, r * 0.14, r * 0.07, 0, 0, TAU); g.fill(); } }
  if (o.coral) for (const s of [-1, 1]) { g.strokeStyle = '#ff7a6a'; g.lineWidth = r * 0.07; g.lineCap = 'round'; g.beginPath(); g.moveTo(s * r * 0.5, -r * 0.6); g.lineTo(s * r * 0.62, -r * 0.92); g.moveTo(s * r * 0.58, -r * 0.8); g.lineTo(s * r * 0.8, -r * 0.95); g.stroke(); }
}
const CRE = {
  grunt: (g, r, f) => hum(g, r, f, { skin: '#7fae4a', cloth: '#8a5a32', legs: '#5a3e24', ears: 1, wpn: 'club', head: 1.15, hat: 'band', band: '#a8342a', tusks: 1 }),
  runner: (g, r, f) => hum(g, r, f, { skin: '#c9a06a', cloth: '#3f6a3a', legs: '#2f3a2a', hat: 'hood', hood: '#2f5a32', wpn: 'dagger', ears: 1, bulk: 0.85 }),
  brute: (g, r, f) => hum(g, r, f, { skin: '#9a7a5a', cloth: '#6a4428', armor: '#8a909a', bulk: 1.35, head: 0.95, wpn: 'axe', hat: 'horns', helm: '#6f7480', tusks: 1 }),
  shield: (g, r, f) => hum(g, r, f, { skin: '#d8b48c', cloth: '#3f5f8a', armor: '#a8b0bc', hat: 'helm', helm: '#a8b0bc', shield: '#3a5a9a', shieldRim: '#e2b84c', shieldS: 1.35, wpn: 'spear', wpnBack: 1 }),
  archer: (g, r, f) => hum(g, r, f, { skin: '#c9946a', cloth: '#7a4a2a', vest: '#5a3a1e', hat: 'band', band: '#d8b24a', wpn: 'sling', ears: 1 }),
  healer: (g, r, f) => hum(g, r, f, { skin: '#e2c09a', cloth: '#e8e2d0', robe: '#d8d0bc', hat: 'hood', hood: '#3f8a5a', wpn: 'staff', orb: '#7dffb0', tabard: '#3f8a5a', sigil: '#e8e2d0' }),
  shaman: (g, r, f) => hum(g, r, f, { skin: '#6a8a9a', cloth: '#2f6a6a', robe: '#2a5a5a', hat: 'mask', wpn: 'totem', orb: '#3fe0c0', glowEyes: '#3fe0c0' }),
  knight: (g, r, f) => hum(g, r, f, { skin: '#3a3444', cloth: '#2a2434', armor: '#4a4458', legs: '#2a2434', boot: '#1a1620', hat: 'greathelm', helm: '#4a4458', plume: '#a8202a', eyes: '#ff4a2a', wpn: 'sword', hilt: '#a8202a', cape: '#5a1a2a', shield: '#2a2434', shieldRim: '#a8202a', bulk: 1.1 }),
  bat: (g, r, f) => { const fl = [0.6, 0.15, -0.35, 0.15][f]; for (const s of [-1, 1]) wing(g, s, r * 1.45, fl, '#2a1830', '#4a2e5a', r); ball(g, 0, 0, r * 0.5, r * 0.55, '#5a3a6a', 0.35, -0.45); for (const s of [-1, 1]) { g.fillStyle = '#5a3a6a'; poly(g, [[s * r * 0.15, -r * 0.4], [s * r * 0.4, -r * 0.85], [s * r * 0.42, -r * 0.3]]); g.fill(); } eyes(g, 0, -r * 0.12, r * 0.14, 0, 0, '#ffd84a'); g.fillStyle = '#fff6e0'; for (const s of [-1, 1]) poly(g, [[s * r * 0.08, r * 0.12], [s * r * 0.14, r * 0.3], [s * r * 0.2, r * 0.12]]), g.fill(); },
  bomber: (g, r, f) => { const t = f / 4 * TAU; const q = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.2); q.addColorStop(0, 'rgba(255,200,80,0.6)'); q.addColorStop(1, 'rgba(255,90,30,0)'); g.fillStyle = q; g.fillRect(-r * 1.2, -r * 1.4, r * 2.4, r * 2.6);
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.45, h = r * (1.05 + 0.25 * Math.sin(t + k * 1.7)); g.fillStyle = k % 2 ? '#ff6a1a' : '#ff9a2a'; g.beginPath(); g.moveTo(Math.cos(a - 0.35) * r * 0.6, Math.sin(a - 0.35) * r * 0.6); g.quadraticCurveTo(Math.cos(a) * h * 1.1, Math.sin(a) * h * 1.1 - r * 0.2, Math.cos(a) * h * 1.25, Math.sin(a) * h * 1.25); g.quadraticCurveTo(Math.cos(a) * h, Math.sin(a) * h, Math.cos(a + 0.35) * r * 0.6, Math.sin(a + 0.35) * r * 0.6); g.fill(); }
    const b = g.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.75); b.addColorStop(0, '#fff8c0'); b.addColorStop(0.45, '#ffb02e'); b.addColorStop(1, '#e0401a'); g.fillStyle = b; g.beginPath(); g.arc(0, 0, r * 0.72, 0, TAU); g.fill();
    g.fillStyle = '#5a1a0a'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.25, -r * 0.05, r * 0.1, r * 0.15, 0, 0, TAU); g.fill(); } g.beginPath(); g.arc(0, r * 0.22, r * 0.16, 0, Math.PI); g.fill(); },
  splitter: (g, r, f) => slime(g, r, f, '#7fc23a'), mini: (g, r, f) => slime(g, r, f, '#a8dc5a'),
  swarm: (g, r, f) => { const sw = [0, 1, 0, -1][f]; g.strokeStyle = '#3a2a14'; g.lineWidth = r * 0.14; g.lineCap = 'round'; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const yy = -r * 0.25 + i * r * 0.32, o2 = (i % 2 ? sw : -sw) * r * 0.15; g.beginPath(); g.moveTo(s * r * 0.4, yy); g.lineTo(s * r * 0.95, yy + o2 + r * 0.1); g.stroke(); }
    ball(g, 0, r * 0.12, r * 0.62, r * 0.72, '#c89a2a', 0.45, -0.45); g.strokeStyle = '#5a3a10'; g.lineWidth = r * 0.06; g.beginPath(); g.moveTo(0, -r * 0.3); g.lineTo(0, r * 0.8); g.stroke(); ball(g, 0, -r * 0.55, r * 0.36, r * 0.3, '#4a3418', 0.3, -0.3); eyes(g, 0, -r * 0.6, r * 0.12, 0, 0, '#ff5a2a'); },
  ram: (g, r, f) => { const rot = f / 4 * Math.PI / 2;
    for (const s of [-1, 1]) { const wx = s * r * 0.88, wy = r * 0.42; ball(g, wx, wy, r * 0.22, r * 0.4, '#6a4424', 0.25, -0.4); g.strokeStyle = '#3a2412'; g.lineWidth = r * 0.05; for (let k = 0; k < 3; k++) { const a = rot + k / 3 * Math.PI; g.beginPath(); g.moveTo(wx, wy - Math.cos(a) * r * 0.36); g.lineTo(wx, wy + Math.cos(a) * r * 0.36); g.stroke(); } g.fillStyle = '#3a3634'; g.beginPath(); g.ellipse(wx, wy, r * 0.08, r * 0.1, 0, 0, TAU); g.fill(); }
    g.fillStyle = hgrad(g, -r * 0.8, r * 0.8, '#8a5a30', 0.25, -0.45); g.fillRect(-r * 0.72, -r * 0.35, r * 1.44, r * 0.95);
    g.strokeStyle = 'rgba(40,20,10,0.55)'; g.lineWidth = r * 0.04; for (let x = -r * 0.72; x < r * 0.72; x += r * 0.24) { g.beginPath(); g.moveTo(x, -r * 0.35); g.lineTo(x, r * 0.6); g.stroke(); }
    g.fillStyle = hgrad(g, -r, r, '#7a3a28', 0.3, -0.5); poly(g, [[-r * 0.98, -r * 0.25], [0, -r * 1.0], [r * 0.98, -r * 0.25], [r * 0.85, -r * 0.15], [0, -r * 0.82], [-r * 0.85, -r * 0.15]]); g.fill(); g.fillStyle = '#6a3020'; poly(g, [[-r * 0.85, -r * 0.15], [0, -r * 0.82], [r * 0.85, -r * 0.15], [r * 0.72, -r * 0.35], [-r * 0.72, -r * 0.35]]); g.fill();
    g.fillStyle = '#4a4448'; for (const yy of [-r * 0.1, r * 0.35]) g.fillRect(-r * 0.72, yy, r * 1.44, r * 0.07);
    ball(g, 0, r * 0.18, r * 0.36, r * 0.36, '#5a3a20', 0.2, -0.4); ball(g, 0, r * 0.18, r * 0.3, r * 0.3, '#8a8478', 0.45, -0.35); g.fillStyle = '#4a4448'; for (const s of [-1, 1]) { poly(g, [[s * r * 0.12, r * 0.06], [s * r * 0.42, -r * 0.14], [s * r * 0.24, r * 0.12]]); g.fill(); } },
  wraith: (g, r, f) => { const t = f / 4 * TAU; const q = g.createLinearGradient(0, -r, 0, r * 1.1); q.addColorStop(0, '#d8ccf4'); q.addColorStop(0.6, '#8a78c0'); q.addColorStop(1, 'rgba(110,90,170,0)'); g.fillStyle = q;
    g.beginPath(); g.moveTo(-r * 0.62, -r * 0.3); g.quadraticCurveTo(-r * 0.75, -r * 1.1, 0, -r * 1.08); g.quadraticCurveTo(r * 0.75, -r * 1.1, r * 0.62, -r * 0.3); for (let k = 0; k <= 5; k++) { const x = lerp(r * 0.7, -r * 0.7, k / 5), y = r * (0.75 + (k % 2 ? 0.35 : 0)) + Math.sin(t + k) * r * 0.08; g.lineTo(x + Math.sin(t + k * 2) * r * 0.06, y); } g.closePath(); g.fill();
    for (const s of [-1, 1]) { g.strokeStyle = '#a898d8'; g.lineWidth = r * 0.16; g.lineCap = 'round'; g.beginPath(); g.moveTo(s * r * 0.5, -r * 0.3); g.quadraticCurveTo(s * r * 0.95, -r * 0.05, s * r * 0.85, r * (0.25 + 0.06 * Math.sin(t + s))); g.stroke(); g.strokeStyle = '#e8e0ff'; g.lineWidth = r * 0.04; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(s * r * 0.85, r * 0.27); g.lineTo(s * r * (0.85 + k * 0.08), r * 0.42); g.stroke(); } }
    g.fillStyle = '#1a1028'; g.beginPath(); g.ellipse(0, -r * 0.55, r * 0.36, r * 0.38, 0, 0, TAU); g.fill(); eyes(g, 0, -r * 0.55, r * 0.12, 0, 0, '#9ff4ff'); },
  golem: (g, r, f) => golemBody(g, r, f, '#8a8e94', '#7fe8ff', { moss: '#6a9a3a' }),
};
function slime(g, r, f, c) { const sq = [1, 0.92, 1.04, 0.95][f]; g.save(); g.translate(0, r * 0.45); g.scale(1 / Math.sqrt(sq), sq); const q = g.createRadialGradient(-r * 0.3, -r * 0.75, r * 0.1, 0, -r * 0.4, r * 1.05); q.addColorStop(0, shade(c, 0.5)); q.addColorStop(0.6, c); q.addColorStop(1, shade(c, -0.45)); g.fillStyle = q;
  g.beginPath(); g.moveTo(-r * 0.92, 0); g.quadraticCurveTo(-r * 0.95, -r * 1.05, 0, -r * 1.12); g.quadraticCurveTo(r * 0.95, -r * 1.05, r * 0.92, 0); g.quadraticCurveTo(0, r * 0.2, -r * 0.92, 0); g.fill();
  g.fillStyle = rgba(shade(c, -0.3), 0.5); for (const [x, y, s] of [[-0.4, -0.3, 0.1], [0.45, -0.45, 0.07], [0.2, -0.15, 0.06]]) { g.beginPath(); g.arc(x * r, y * r, s * r, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-r * 0.4, -r * 0.8, r * 0.18, r * 0.1, -0.5, 0, TAU); g.fill();
  eyes(g, 0, -r * 0.6, r * 0.17); g.fillStyle = shade(c, -0.6); g.beginPath(); g.arc(0, -r * 0.32, r * 0.14, 0, Math.PI); g.fill(); g.restore(); }
// ---- bosses
const BCRE = {
  thorn: (g, r, f) => hum(g, r, f, { skin: '#5f8f3a', cloth: '#5a3a24', legs: '#3a2a1a', armor: '#7a6a4a', bulk: 1.4, head: 1.05, ears: 1, tusks: 1, hat: 'crown', gem: '#3fd07a', wpn: 'bigclub', spikes: '#9a8a5a', cape: '#3a5a22' }),
  giant: (g, r, f) => hum(g, r, f, { skin: '#a8cce8', cloth: '#e8eef4', legs: '#7a8aa0', armor: '#c8d8e8', bulk: 1.4, hat: 'horns', helm: '#8aa0b8', beard: '#f4f8ff', wpn: 'bigclub', spikes: '#dff4ff', cape: '#5a7aa0', pupil: '#2a6aa0' }),
  bog: (g, r, f) => hum(g, r, f, { skin: '#8aa860', cloth: '#3f5a2a', robe: '#2f4a22', hat: 'witch', hood: '#2a3a1e', wpn: 'staff', orb: '#b6ff3a', bulk: 1.2, glowEyes: '#d8ff6a', cape: '#2a3a1e' }),
  void: (g, r, f) => { g.save(); g.translate(0, -r * 0.08 * Math.sin(f / 4 * TAU)); hum(g, r, f, { skin: '#9a8ab8', cloth: '#2a1e3a', robe: '#1e1430', hat: 'crown', gem: '#b07bff', wpn: 'staff', orb: '#b07bff', glowEyes: '#d8b0ff', cape: '#4a2a6a', bulk: 1.25, armor: '#4a3a6a' }); g.restore(); },
  dread: (g, r, f) => { CRE.wraith(g, r, f); for (const s of [-1, 1]) { g.fillStyle = '#2a1a3a'; g.beginPath(); g.moveTo(s * r * 0.25, -r * 0.95); g.quadraticCurveTo(s * r * 0.75, -r * 1.2, s * r * 0.7, -r * 1.55); g.quadraticCurveTo(s * r * 0.5, -r * 1.15, s * r * 0.1, -r * 1.05); g.fill(); } },
  tide: (g, r, f) => golemBody(g, r, f, '#3f8a8a', '#7ffff0', { coral: 1, moss: '#2f6a5a' }),
  titan: (g, r, f) => golemBody(g, r, f, '#3a2e2c', '#ff8a2a'),
  gear: (g, r, f) => { const sw = [0, 1, 0, -1][f]; for (const s of [-1, 1]) { const lift = s === sw ? -r * 0.1 : 0; g.fillStyle = '#5a4a3a'; g.fillRect(s * r * 0.35 - r * 0.08, r * 0.3 + lift, r * 0.16, r * 0.45); ball(g, s * r * 0.35, r * 0.78 + lift, r * 0.22, r * 0.12, '#8a6a3a'); }
    g.fillStyle = hgrad(g, -r * 0.7, r * 0.7, '#b8864a', 0.35, -0.45); rr(g, -r * 0.7, -r * 0.6, r * 1.4, r * 1.0, r * 0.25); g.fill(); g.fillStyle = '#5a3a20'; for (const yy of [-r * 0.45, r * 0.28]) g.fillRect(-r * 0.7, yy, r * 1.4, r * 0.06);
    g.save(); g.translate(0, -r * 0.1); g.rotate(f * 0.2); g.fillStyle = '#d8b24a'; g.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, rad = k % 2 ? r * 0.3 : r * 0.38; g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } g.closePath(); g.fill(); g.fillStyle = '#5a3a20'; g.beginPath(); g.arc(0, 0, r * 0.1, 0, TAU); g.fill(); g.restore();
    for (const s of [-1, 1]) { g.fillStyle = '#6a6a72'; g.fillRect(s * r * 0.45 - r * 0.07, -r * 1.0, r * 0.14, r * 0.42); g.fillStyle = 'rgba(220,220,220,0.4)'; g.beginPath(); g.arc(s * r * 0.45, -r * 1.06, r * 0.1, 0, TAU); g.fill(); ball(g, s * r * 0.92, -r * 0.1 + (s === sw ? -r * 0.05 : 0), r * 0.24, r * 0.3, '#8a6a3a', 0.3, -0.4); g.strokeStyle = '#4a4448'; g.lineWidth = r * 0.1; g.beginPath(); g.moveTo(s * r * 0.92, r * 0.15); g.lineTo(s * r * 0.98, r * 0.4); g.stroke(); }
    g.fillStyle = hgrad(g, -r * 0.35, r * 0.35, '#8a6a3a', 0.4, -0.4); rr(g, -r * 0.35, -r * 0.92, r * 0.7, r * 0.36, r * 0.1); g.fill(); g.fillStyle = '#1a1414'; g.fillRect(-r * 0.28, -r * 0.8, r * 0.56, r * 0.12); g.fillStyle = '#ffb02e'; g.fillRect(-r * 0.24, -r * 0.78, r * 0.48, r * 0.08); },
  ox: (g, r, f) => { const sw = [0, 1, 0, -1][f]; for (const s of [-1, 1]) for (const k of [0.25, 0.6]) { const lift = (s === sw) === (k < 0.4) ? -r * 0.08 : 0; g.fillStyle = '#3a2620'; rr(g, s * r * k - r * 0.11, r * 0.3 + lift, r * 0.22, r * 0.5, r * 0.08); g.fill(); g.fillStyle = '#1a1210'; g.fillRect(s * r * k - r * 0.12, r * 0.72 + lift, r * 0.24, r * 0.1); }
    ball(g, 0, r * 0.05, r * 0.85, r * 0.55, '#5a3a2a', 0.25, -0.45); g.strokeStyle = '#ff8a2a'; g.lineWidth = r * 0.035; g.beginPath(); g.moveTo(-r * 0.6, 0); g.lineTo(-r * 0.3, r * 0.15); g.lineTo(-r * 0.4, r * 0.35); g.moveTo(r * 0.55, -r * 0.1); g.lineTo(r * 0.3, r * 0.12); g.lineTo(r * 0.5, r * 0.3); g.stroke();
    ball(g, 0, -r * 0.42, r * 0.62, r * 0.38, '#6a4430', 0.3, -0.4);
    for (const s of [-1, 1]) { g.fillStyle = hgrad(g, s * r * 0.3, s * r * 1.1, '#efe6d2', 0.3, -0.35); g.beginPath(); g.moveTo(s * r * 0.35, -r * 0.62); g.quadraticCurveTo(s * r * 1.15, -r * 0.6, s * r * 1.05, -r * 1.15); g.quadraticCurveTo(s * r * 0.9, -r * 0.78, s * r * 0.3, -r * 0.48); g.fill(); }
    ball(g, 0, -r * 0.22, r * 0.3, r * 0.2, '#8a5a40', 0.3, -0.3); g.fillStyle = '#2a1410'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.11, -r * 0.2, r * 0.05, r * 0.04, 0, 0, TAU); g.fill(); } g.strokeStyle = '#e2b84c'; g.lineWidth = r * 0.04; g.beginPath(); g.arc(0, -r * 0.12, r * 0.08, 0, Math.PI); g.stroke();
    eyes(g, 0, -r * 0.52, r * 0.1, 0, 0, '#ffb02e'); },
  wyrm: (g, r, f) => { const t = f / 4 * TAU; for (let k = 5; k >= 0; k--) { const a = k / 6 * Math.PI * 1.6 + 0.3 + Math.sin(t) * 0.05, x = Math.cos(a) * r * 0.55, y = r * 0.25 + Math.sin(a) * r * 0.32, s = r * (0.32 - k * 0.025); ball(g, x, y, s, s * 0.85, '#3fa8c8', 0.4, -0.45); g.fillStyle = '#9ff4ff'; poly(g, [[x - s * 0.3, y - s * 0.6], [x, y - s * 1.3], [x + s * 0.3, y - s * 0.6]]); g.fill(); }
    g.strokeStyle = '#3fa8c8'; g.lineWidth = r * 0.36; g.lineCap = 'round'; g.beginPath(); g.moveTo(-r * 0.1, r * 0.2); g.quadraticCurveTo(r * 0.2, -r * 0.3, 0, -r * 0.6); g.stroke(); g.strokeStyle = '#b8f0ff'; g.lineWidth = r * 0.14; g.beginPath(); g.moveTo(-r * 0.05, r * 0.15); g.quadraticCurveTo(r * 0.12, -r * 0.3, 0, -r * 0.55); g.stroke();
    ball(g, 0, -r * 0.75, r * 0.34, r * 0.28, '#4ab8d8', 0.45, -0.4); for (const s of [-1, 1]) { PROP.crystal(g, s * r * 0.24, -r * 0.88, r * 0.02, { glow: '#bff6ff' }, Math.random); } eyes(g, 0, -r * 0.78, r * 0.1, 0, 0, '#ffffff'); g.fillStyle = '#1a3a4a'; g.fillRect(-r * 0.15, -r * 0.6, r * 0.3, r * 0.04); },
  roc: (g, r, f) => { const fl = [0.5, 0.1, -0.3, 0.1][f]; for (const s of [-1, 1]) { const span = r * 1.5, tipY = -r * (0.1 + fl); g.fillStyle = hgrad(g, 0, s * span, '#8a6a3a', 0.2, -0.4); g.beginPath(); g.moveTo(s * r * 0.3, -r * 0.2); g.quadraticCurveTo(s * span * 0.6, tipY - r * 0.5, s * span, tipY); for (let k = 0; k < 5; k++) { const x = s * span * (1 - k * 0.16), y = tipY + r * (0.25 + k * 0.08); g.lineTo(x, y + r * 0.12); g.lineTo(x - s * r * 0.08, y); } g.lineTo(s * r * 0.3, r * 0.3); g.closePath(); g.fill(); g.strokeStyle = '#e2c084'; g.lineWidth = r * 0.04; g.beginPath(); g.moveTo(s * r * 0.4, -r * 0.1); g.quadraticCurveTo(s * span * 0.6, tipY - r * 0.3, s * span * 0.95, tipY + r * 0.05); g.stroke(); }
    ball(g, 0, r * 0.1, r * 0.42, r * 0.55, '#a8823a', 0.3, -0.45); g.fillStyle = '#f4ead4'; g.beginPath(); g.ellipse(0, r * 0.2, r * 0.25, r * 0.35, 0, 0, TAU); g.fill(); ball(g, 0, -r * 0.48, r * 0.28, r * 0.26, '#f4f0e6', 0.3, -0.3); g.fillStyle = '#e8b830'; poly(g, [[-r * 0.1, -r * 0.42], [r * 0.1, -r * 0.42], [0, -r * 0.18]]); g.fill(); eyes(g, 0, -r * 0.54, r * 0.08, '#fff', '#1a1010');
    g.strokeStyle = '#e8b830'; g.lineWidth = r * 0.06; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * r * 0.15, r * 0.6); g.lineTo(s * r * 0.2, r * 0.82); g.stroke(); } g.fillStyle = '#ffe14a'; poly(g, [[-r * 0.05, -r * 0.75], [r * 0.12, -r * 0.95], [r * 0.08, -r * 0.7]]); g.fill(); },
  star: (g, r, f) => { const fl = [0.5, 0.1, -0.3, 0.1][f]; for (const s of [-1, 1]) wing(g, s, r * 1.55, fl, '#4a2a6a', '#7a4aa8', r); const rr1 = seeded(5); g.fillStyle = '#ffe8ff'; for (let i = 0; i < 14; i++) { const s = rr1() < 0.5 ? -1 : 1; g.beginPath(); g.arc(s * r * (0.5 + rr1()), -r * 0.2 + rr1() * r * 0.5 - fl * r * 0.4, r * 0.03, 0, TAU); g.fill(); }
    ball(g, 0, r * 0.2, r * 0.42, r * 0.55, '#9a5ab8', 0.35, -0.45); g.fillStyle = '#f0c0ff'; g.beginPath(); g.ellipse(0, r * 0.3, r * 0.22, r * 0.38, 0, 0, TAU); g.fill(); g.strokeStyle = '#9a5ab8'; g.lineWidth = r * 0.22; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -r * 0.1); g.quadraticCurveTo(-r * 0.15, -r * 0.4, 0, -r * 0.62); g.stroke();
    ball(g, 0, -r * 0.72, r * 0.27, r * 0.24, '#b06ad0', 0.4, -0.4); for (const s of [-1, 1]) { g.fillStyle = '#ffe14a'; poly(g, [[s * r * 0.12, -r * 0.88], [s * r * 0.3, -r * 1.15], [s * r * 0.22, -r * 0.82]]); g.fill(); } eyes(g, 0, -r * 0.74, r * 0.08, 0, 0, '#ffe14a'); },
};
const FLY_KINDS = { bat: 1, bomber: 1, roc: 1, star: 1 };
function creatureSprite(kind, boss, r, f) {
  r = Math.round(r); const key = 'C' + kind + r + ':' + f; if (cache[key]) return cache[key];
  const W = r * 3.6, H = r * 3.8;
  const sp = outlined(W, H, g => { g.translate(W / 2, H * 0.53); (boss ? BCRE : CRE)[kind](g, r, f); }, Math.max(1.2, r * 0.07), '#1a120c');
  sp.cy = H * 0.53; return cache[key] = sp;
}
function drawCre(sp, x, y, sc, mode) {
  let s = sp; if (mode === 1) s = sp._w || (sp._w = tinted(sp, '#ffffff', 0.85)); else if (mode === 2) s = sp._f || (sp._f = tinted(sp, '#a8e4ff', 0.55));
  ctx.drawImage(s, x - sp.w * sc / 2, y - sp.cy * sc, sp.w * sc, sp.h * sc);
}
// ---- archers seen from behind on the walls (hero, squad and the archer tower crew)
function drawArcher(x, y, sc, ang, pull, pal) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(1, 7, 10, 4, 0, 0, TAU); ctx.fill();
  ctx.rotate(ang + Math.PI / 2);
  // cloak
  ctx.fillStyle = pal.cloak; ctx.beginPath(); ctx.moveTo(-7.5, -2); ctx.quadraticCurveTo(-10, 8, -8, 12); ctx.lineTo(8, 12); ctx.quadraticCurveTo(10, 8, 7.5, -2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-3, 2); ctx.lineTo(-4, 11); ctx.moveTo(3, 2); ctx.lineTo(4, 11); ctx.stroke();
  if (pal.trim) { ctx.fillStyle = pal.trim; ctx.fillRect(-8, 10.5, 16, 1.6); }
  // quiver
  ctx.save(); ctx.translate(4, 1); ctx.rotate(0.5); ctx.fillStyle = '#6a4424'; rr(ctx, -2.2, -6, 4.4, 11, 1.6); ctx.fill(); ctx.fillStyle = '#f4f0e6'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * 1.3, -6.5, 1, 0, TAU); ctx.fill(); } ctx.restore();
  // arms to bow and string
  const bowY = -13, sy = bowY + 3 + pull * 8;
  ctx.strokeStyle = pal.sleeve; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(-1, bowY - 1); ctx.moveTo(5, -3); ctx.lineTo(1.5, sy); ctx.stroke();
  // shoulders + head
  ctx.fillStyle = pal.tunic; ctx.beginPath(); ctx.ellipse(0, -2, 7.5, 4.6, 0, 0, TAU); ctx.fill();
  const hg = ctx.createRadialGradient(-1.5, -4.5, 0.5, 0, -3, 5.5); hg.addColorStop(0, shade(pal.hood, 0.35)); hg.addColorStop(1, shade(pal.hood, -0.3)); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, -3.5, 4.8, 0, TAU); ctx.fill();
  if (pal.helm) { ctx.fillStyle = pal.helm; ctx.beginPath(); ctx.arc(0, -4, 3.4, 0, TAU); ctx.fill(); ctx.fillStyle = pal.plume || '#c0392b'; ctx.fillRect(-0.9, -8, 1.8, 8); }
  // bow
  ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-10, bowY + 3); ctx.quadraticCurveTo(0, bowY - 6 - pull * 1.5, 10, bowY + 3); ctx.stroke();
  ctx.strokeStyle = '#c8a24a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-1.5, bowY - 1.5); ctx.lineTo(1.5, bowY - 1.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(245,240,225,0.9)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-10, bowY + 3); ctx.lineTo(0, sy); ctx.lineTo(10, bowY + 3); ctx.stroke();
  if (pull > 0.15) { ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(0, bowY - 8); ctx.stroke(); ctx.fillStyle = '#d0d4dc'; poly(ctx, [[-1.4, bowY - 7], [0, bowY - 10.5], [1.4, bowY - 7]]); ctx.fill(); }
  ctx.restore();
}
const PAL_HERO = { cloak: '#9a1f2a', trim: '#e2b84c', tunic: '#6a1820', sleeve: '#7a2028', hood: '#c8ccd4', helm: '#e2b84c', plume: '#e8e2d0' };
const PAL_SQUAD = { cloak: '#2f5a32', tunic: '#5a3e24', sleeve: '#4a3420', hood: '#3f6a3a' };
const PAL_TOWER = { cloak: '#2b4f9c', tunic: '#4a3420', sleeve: '#3a2a1a', hood: '#2b4f9c', trim: '#e2b84c' };
// ---- live tower parts (weapons / crystals / flames), drawn over the cached tower sprite
function crystalSp(col, key) { const k = 'X' + key; if (cache[k]) return cache[k]; return cache[k] = outlined(20, 34, g => { g.translate(10, 17); g.fillStyle = shade(col, 0.5); poly(g, [[0, -15], [-7, -3], [0, 15], [0, -15]]); g.fill(); g.fillStyle = col; poly(g, [[0, -15], [7, -3], [0, 15]]); g.fill(); g.fillStyle = shade(col, -0.3); poly(g, [[-7, -3], [0, 15], [7, -3], [0, 2]]); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; poly(g, [[-1, -11], [-4, -3], [-1, -1]]); g.fill(); }, 1, '#1a1428'); }
function drawBallista(x, y, ang, anim, tier) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
  const rec = anim > 0 ? anim * 14 : 0, loaded = anim <= 0.05;
  ctx.fillStyle = '#6a4424'; rr(ctx, -2.5, -10 + rec * 0.3, 5, 22, 1.5); ctx.fill(); ctx.fillStyle = '#8a5a30'; ctx.fillRect(-1.2, -9 + rec * 0.3, 2.4, 20);
  const arm = tier >= 3 ? '#c8ccd4' : '#7a5030'; ctx.strokeStyle = arm; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-15, -2); ctx.quadraticCurveTo(0, -11, 15, -2); ctx.stroke();
  ctx.strokeStyle = 'rgba(240,235,220,0.9)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-15, -2); ctx.lineTo(0, loaded ? 5 : -6); ctx.lineTo(15, -2); ctx.stroke();
  if (loaded) { ctx.strokeStyle = '#4a2e1a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, -17); ctx.stroke(); ctx.fillStyle = '#c8ccd4'; poly(ctx, [[-2.2, -16], [0, -21], [2.2, -16]]); ctx.fill(); }
  ctx.fillStyle = tier >= 4 ? '#e2b84c' : '#3a3634'; ctx.beginPath(); ctx.arc(0, 2, 2.6, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawCannon(x, y, ang, anim, tier) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#5a3a20'; rr(ctx, -10, -3, 20, 8, 2); ctx.fill(); for (const s of [-1, 1]) { ctx.fillStyle = '#3a2614'; ctx.beginPath(); ctx.arc(s * 9, 3, 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#8a6a3a'; ctx.beginPath(); ctx.arc(s * 9, 3, 1.4, 0, TAU); ctx.fill(); }
  ctx.rotate(ang + Math.PI / 2); const rec = anim > 0 ? anim * 22 : 0;
  const nb = tier >= 4 ? 2 : 1;
  for (let b = 0; b < nb; b++) { const ox = nb > 1 ? (b ? 4 : -4) : 0; const gr = ctx.createLinearGradient(ox - 5, 0, ox + 5, 0); gr.addColorStop(0, '#5a5a62'); gr.addColorStop(0.35, '#9a9aa4'); gr.addColorStop(1, '#2a2a30'); ctx.fillStyle = gr; poly(ctx, [[ox - 5.5, 4 + rec], [ox - 4, -20 + rec], [ox + 4, -20 + rec], [ox + 5.5, 4 + rec]]); ctx.fill(); ctx.fillStyle = tier >= 3 ? '#e2b84c' : '#3a3a40'; ctx.fillRect(ox - 4.8, -21 + rec, 9.6, 3); ctx.fillRect(ox - 5.4, -6 + rec, 10.8, 2); ctx.fillStyle = '#121214'; ctx.beginPath(); ctx.ellipse(ox, -20.5 + rec, 2.8, 1.2, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function drawTowerRT(t, idleT) {
  const tier = tierOf(t.lv), sp = towerSprite(t.k, tier), bx = t.x, by = WALLY - 14, top = by - TTOP[t.k][tier - 1];
  ctx.drawImage(sp, bx - sp.ax, by - sp.ay, sp.w, sp.h);
  const tm = idleT != null ? idleT : G.time, ang = t.ang != null ? t.ang : -Math.PI / 2 + Math.sin(tm * 0.7 + bx) * 0.3, rate = tRate(t.k, t.lv);
  ctx.globalCompositeOperation = 'source-over';
  switch (t.k) {
    case 'archer': drawArcher(bx, top - 2, 0.7 + tier * 0.03, ang, idleT != null ? 0.4 : t.anim > 0 ? 0 : clamp(1 - t.cd * rate * 1.1, 0, 1), PAL_TOWER); break;
    case 'crossbow': drawBallista(bx, top - 1, ang, t.anim || 0, tier); break;
    case 'cannon': drawCannon(bx, top - 2, ang, t.anim || 0, tier); if (t.anim > 0.15 && !t._sm) { t._sm = 1; const a = ang; for (let i = 0; i < 4; i++) addFx('smoke', bx + Math.cos(a) * 22, top - 2 + Math.sin(a) * 22, Math.cos(a) * 40 + rnd(-15, 15), Math.sin(a) * 40 - 20, 0.7, 7 + i * 2, '#d8d0c4'); addFx('flash', bx + Math.cos(a) * 22, top - 2 + Math.sin(a) * 22, 0, 0, 0.12, 16, '#ffd27a'); } if (!(t.anim > 0.15)) t._sm = 0; break;
    case 'multi': if (t.anim > 0) { ctx.globalCompositeOperation = 'lighter'; drawSp(glow('#ffc65a', 18), bx, top + 20, 0, 1); ctx.globalCompositeOperation = 'source-over'; } break;
    case 'frost': { const y = top - 14 + Math.sin(tm * 2 + bx) * 2.5; ctx.globalCompositeOperation = 'lighter'; drawSp(glow('#8fd8ff', 22), bx, y, 0, t.anim > 0 ? 1.4 : 1); ctx.globalCompositeOperation = 'source-over'; drawSp(crystalSp('#9fe2ff', 'fr'), bx, y, Math.sin(tm) * 0.1, 0.85 + tier * 0.06); if (tier >= 4) for (let i = 0; i < 3; i++) { const a = tm * 1.6 + i * TAU / 3; drawSp(crystalSp('#c8f0ff', 'fr2'), bx + Math.cos(a) * 14, y + Math.sin(a) * 5 + 4, 0, 0.35); } break; }
    case 'storm': { const y = top - 4; ctx.globalCompositeOperation = 'lighter'; drawSp(glow('#b48cff', 24), bx, y, 0, t.anim > 0 ? 1.5 : 0.95 + 0.1 * Math.sin(tm * 9 + bx)); ctx.globalCompositeOperation = 'source-over'; ball(ctx, bx, y, 5.5, 5.5, '#d8c0ff', 0.6, -0.2);
      if (t.anim > 0 || Math.random() < 0.06) { ctx.strokeStyle = 'rgba(230,215,255,0.9)'; ctx.lineWidth = 1.1; ctx.beginPath(); for (let k = 0; k < 2; k++) { let x0 = bx, y0 = y; ctx.moveTo(x0, y0); for (let j = 0; j < 3; j++) { x0 += rnd(-7, 7); y0 += rnd(2, 7); ctx.lineTo(x0, y0); } } ctx.stroke(); } break; }
    case 'flame': drawFlame(bx, top - 3, 0.95 + tier * 0.12 + (t.anim > 0 ? 0.3 : 0), tm + bx); break;
    case 'prism': { const y = top - 16 + Math.sin(tm * 1.8 + bx) * 2, hot = t.tgt ? 1 + (t.ramp || 0) * 0.4 : 0.8; ctx.globalCompositeOperation = 'lighter'; drawSp(glow('#ff6ad5', 22), bx, y, 0, hot); ctx.globalCompositeOperation = 'source-over'; drawSp(crystalSp('#ff8ae0', 'pr'), bx, y, tm * 0.6 % TAU * 0, 0.9 + tier * 0.05); break; }
  }
  // level plaque on the bastion face
  ctx.fillStyle = 'rgba(28,18,10,0.82)'; rr(ctx, bx - 13, WALLY + 22, 26, 12, 6); ctx.fill(); ctx.strokeStyle = tier >= 4 ? '#ffd76a' : tier >= 3 ? '#e2b84c' : '#a88a5a'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = `800 9px ${FB}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffe7a8'; ctx.fillText('Lv ' + t.lv, bx, WALLY + 28.5); ctx.textBaseline = 'alphabetic';
  if (G && G.stunT > 0) for (let i = 0; i < 3; i++) { const a = tm * 4 + i * TAU / 3; ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * 12, top - 18 + Math.sin(a) * 4, 2, 0, TAU); ctx.fill(); }
}
// ---- visual-only effects (smoke, flashes, scorch decals, debris)
let fx = [], scorch = [];
function addFx(k, x, y, vx, vy, life, s, col) { if (fx.length > 150) fx.shift(); fx.push({ k, x, y, vx, vy, life, max: life, s, col, rot: Math.random() * TAU }); }
function explosion(x, y, big) {
  const n = big ? 10 : 5; addFx('flash', x, y, 0, 0, 0.18, big ? 70 : 34, '#ffd27a');
  for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(20, big ? 120 : 60); addFx('smoke', x + Math.cos(a) * 6, y + Math.sin(a) * 4, Math.cos(a) * v, Math.sin(a) * v * 0.6 - 25, rnd(0.6, 1.1), rnd(9, big ? 22 : 13), i % 3 ? '#5a504a' : '#8a7a6a'); }
  for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(60, 200); addFx('debris', x, y, Math.cos(a) * v, -rnd(80, 220), rnd(0.5, 0.9), rnd(1.6, 3), '#4a3a2e'); }
  if (scorch.length > 12) scorch.shift(); scorch.push({ x, y, r: big ? 56 : 18, life: big ? 5 : 2.5, max: 3 });
}
function deathPuff(x, y, col, n) { const k = Math.min(8, Math.round(n / 4) + 3); for (let i = 0; i < k; i++) { const a = rnd(0, TAU), v = rnd(15, 60); addFx('smoke', x + Math.cos(a) * 5, y + Math.sin(a) * 5, Math.cos(a) * v, Math.sin(a) * v - 20, rnd(0.4, 0.75), rnd(6, n > 20 ? 18 : 10), mix(col, '#e8e2d8', 0.55)); } }
function stepFx(dt) {
  for (const f of fx) { f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.k === 'debris') f.vy += 520 * dt; else { f.vx *= 0.94; f.vy *= 0.94; } }
  fx = fx.filter(f => f.life > 0); for (const s of scorch) s.life -= dt; scorch = scorch.filter(s => s.life > 0);
}
function drawFxList() {
  for (const f of fx) { const a = f.life / f.max;
    if (f.k === 'smoke') { ctx.globalAlpha = Math.min(1, a * 1.6) * 0.75; const s = f.s * (1.6 - a * 0.6); ctx.drawImage(puffSp(f.col), f.x - s, f.y - s, s * 2, s * 2); }
    else if (f.k === 'flash') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; drawSp(glow(f.col, 32), f.x, f.y, 0, f.s / 24 * (1.2 - a * 0.4)); ctx.globalCompositeOperation = 'source-over'; }
    else if (f.k === 'debris') { ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = f.col; ctx.fillRect(f.x - f.s / 2, f.y - f.s / 2, f.s, f.s); } }
  ctx.globalAlpha = 1;
}
function drawScorch() { for (const s of scorch) { ctx.globalAlpha = Math.min(1, s.life / 1.5) * 0.32; ctx.save(); ctx.translate(s.x, s.y); ctx.scale(1, 0.45); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s.r); g.addColorStop(0, '#1a120c'); g.addColorStop(0.6, 'rgba(26,18,12,0.6)'); g.addColorStop(1, 'rgba(26,18,12,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s.r, 0, TAU); ctx.fill(); ctx.restore(); } ctx.globalAlpha = 1; }

// ---- enemies
function enemyKind(e) { return e.boss ? e.bkey : e.type; }
function drawEnemy(e) {
  const boss = !!e.boss, kind = enemyKind(e), baseR = boss ? e.boss.r : e.def.r, sc = e.r / baseR * (boss ? 1.05 : 1.12);
  const walking = e.state === 'walk' && !(e.frozen > 0), fl = e.fly || FLY_KINDS[kind];
  const f = fl ? Math.floor(G.time * 11 + e.ph * 3) % 4 : walking ? Math.floor(G.time * (3 + e.spd * 0.07) + e.ph * 3) % 4 : 0;
  let y = e.y; if (e.fly) y += Math.sin(G.time * 4 + e.ph) * 4; if (e.bump > 0) y += e.bump * 26; if (e.charging > 0) y += Math.sin(G.time * 40) * 1.5;
  ctx.globalAlpha = 1;
  const shr = e.r * (fl ? 0.75 : 0.9); const shs = shadowSp(shr); ctx.drawImage(shs, e.x - shs.w / 2 + (e.fly ? 10 : 0), e.y + e.r * (e.fly ? 1.5 : 0.82) - shs.h / 2, shs.w, shs.h);
  if (e.ghost) ctx.globalAlpha = 0.32;
  if (e.elite || e.giant || boss) { ctx.globalCompositeOperation = 'lighter'; drawSp(glow(boss ? '#ff5a3a' : e.giant ? '#ff9a2a' : '#ffd54a', 30), e.x, y, 0, (e.r / 15) * (1.25 + 0.12 * Math.sin(G.time * 6))); ctx.globalCompositeOperation = 'source-over'; }
  const sp = creatureSprite(kind, boss, baseR, f);
  drawCre(sp, e.x, y, sc, e.flash > 0 ? 1 : e.frozen > 0 ? 2 : 0);
  ctx.globalAlpha = 1;
  if (e.frozen > 0) { ctx.fillStyle = 'rgba(190,235,255,0.35)'; ctx.strokeStyle = 'rgba(230,250,255,0.8)'; ctx.lineWidth = 1.2; rr(ctx, e.x - e.r * 1.05, y - e.r * 1.15, e.r * 2.1, e.r * 2.1, 5); ctx.fill(); ctx.stroke(); }
  if (e.burnT > 0) { ctx.globalCompositeOperation = 'lighter'; drawSp(glow('#ff7a2a', 14), e.x + Math.sin(G.time * 13 + e.ph) * e.r * 0.3, y - e.r * 0.2, 0, e.r / 16); ctx.globalCompositeOperation = 'source-over'; }
  if (e.shield > 1) { const a = 0.25 + 0.5 * Math.min(1, e.shield / e.shieldMax); ctx.fillStyle = `rgba(120,200,255,${a * 0.25})`; ctx.strokeStyle = `rgba(170,225,255,${a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, y, e.r * 1.25, e.r * 1.3, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${a * 0.8})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(e.x, y, e.r * 1.1, e.r * 1.15, 0, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke(); }
  if (e.slowT > 0 && !(e.frozen > 0)) { ctx.strokeStyle = 'rgba(160,220,255,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.85, e.r * 0.9, e.r * 0.32, 0, 0, TAU); ctx.stroke(); }
}
function drawEnemyUI(e) {
  const y = e.y + (e.fly ? Math.sin(G.time * 4 + e.ph) * 4 : 0);
  if (!e.boss && e.hp < e.max && !e.ghost) { const w = Math.max(22, e.r * 1.9), bx = e.x - w / 2, by = y - e.r * 1.25 - 9; ctx.fillStyle = 'rgba(20,12,6,0.85)'; rr(ctx, bx - 1.5, by - 1.5, w + 3, 7, 3.5); ctx.fill(); const p = Math.max(0, e.hp / e.max); ctx.fillStyle = e.elite ? '#ffcf3a' : e.giant ? '#ff9a2a' : p > 0.5 ? '#e8463a' : '#c8302a'; rr(ctx, bx, by, Math.max(2, w * p), 4, 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx + 1, by + 0.6, Math.max(0, w * p - 2), 1.1);
    if (e.shield > 1) { ctx.fillStyle = '#8fd0ff'; rr(ctx, bx, by - 3.5, w * Math.min(1, e.shield / e.shieldMax), 2.5, 1.2); ctx.fill(); } }
  if (e.elite && !e.ghost) { ctx.fillStyle = '#ffd54a'; const cx = e.x, cy = y - e.r * 1.25 - 15; poly(ctx, [[cx - 5, cy + 3], [cx - 5, cy - 2], [cx - 2.5, cy], [cx, cy - 4], [cx + 2.5, cy], [cx + 5, cy - 2], [cx + 5, cy + 3]]); ctx.fill(); }
  if (G.mark === e) { const R = e.r * 1.35 + 6 + Math.sin(G.time * 8) * 2; ctx.save(); ctx.translate(e.x, y); ctx.rotate(G.time * 1.5); ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; for (let k = 0; k < 4; k++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.arc(0, 0, R, -0.35, 0.35); ctx.stroke(); ctx.beginPath(); ctx.moveTo(R - 4, 0); ctx.lineTo(R + 4, 0); ctx.stroke(); } ctx.restore(); }
}
// ---- projectiles
function drawArrow(x, y, a, L, w, crit, kind) {
  const ca = Math.cos(a), sa = Math.sin(a), tx = x - ca * L, ty = y - sa * L;
  ctx.strokeStyle = kind === 'bolt' ? '#4a2e1a' : '#8a5a30'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.fillStyle = kind === 'bolt' ? '#a8acb4' : '#d8dce4'; const h = w * 2.2; poly(ctx, [[x + ca * h, y + sa * h], [x - sa * w * 1.1, y + ca * w * 1.1], [x + sa * w * 1.1, y - ca * w * 1.1]]); ctx.fill();
  ctx.strokeStyle = crit ? '#ffd54a' : kind === 'bolt' ? '#a8202a' : '#f4f0e6'; ctx.lineWidth = w * 0.9; ctx.beginPath(); for (const s of [-1, 1]) { ctx.moveTo(tx + ca * 4, ty + sa * 4); ctx.lineTo(tx - sa * s * w * 1.6, ty + ca * s * w * 1.6); } ctx.stroke();
  if (crit) { ctx.globalCompositeOperation = 'lighter'; drawSp(glow('#ffd54a', 12), x, y, 0, 1); ctx.globalCompositeOperation = 'source-over'; }
}
function drawProjs() {
  ctx.lineCap = 'round';
  for (const p of projs) {
    if (p.t < 0) continue;
    if (p.k === 'ball' || p.k === 'meteor') { const f = Math.min(1, p.t / p.ft), gx = lerp(p.sx, p.tx, f), gy = lerp(p.sy, p.ty, f); const s = shadowSp(p.k === 'meteor' ? 18 : 6); ctx.globalAlpha = 0.7; ctx.drawImage(s, gx - s.w / 2, gy - s.h / 2, s.w, s.h); ctx.globalAlpha = 1; }
    if (p.k === 'ball') { ball(ctx, p.x, p.y, 5.5, 5.5, '#3a3a42', 0.6, -0.4); continue; }
    if (p.k === 'meteor') { const a = Math.atan2(p.ty - p.sy, p.tx - p.sx); ctx.globalCompositeOperation = 'lighter'; for (let j = 5; j >= 0; j--) drawSp(glow(j % 2 ? '#ffb02e' : '#ff5a1a', 30), p.x - Math.cos(a) * j * 16, p.y - Math.sin(a) * j * 16, 0, 1.5 - j * 0.18); ctx.globalCompositeOperation = 'source-over'; ball(ctx, p.x, p.y, 14, 13, '#5a3a2a', 0.3, -0.5); ctx.fillStyle = '#ffb02e'; ctx.fillRect(p.x - 6, p.y - 1, 9, 2); if (Math.random() < 0.5) addFx('smoke', p.x, p.y, rnd(-10, 10), rnd(-10, 10), 0.6, 10, '#6a5a50'); continue; }
    if (p.k === 'rain') { const a = Math.atan2(p.ty - p.sy, p.tx - p.sx); drawArrow(p.x, p.y, a, 18, 1.8, false, 'arrow'); continue; }
    const a = Math.atan2(p.vy, p.vx);
    if (p.k === 'shard') { ctx.globalCompositeOperation = 'lighter'; drawSp(glow('#8fd8ff', 12), p.x, p.y, 0, 1); ctx.globalCompositeOperation = 'source-over'; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.fillStyle = '#e8f8ff'; poly(ctx, [[8, 0], [0, -3], [-9, 0], [0, 3]]); ctx.fill(); ctx.fillStyle = '#7fc8f0'; poly(ctx, [[8, 0], [0, 3], [-9, 0]]); ctx.fill(); ctx.restore(); continue; }
    if (p.k === 'fire') { ctx.globalCompositeOperation = 'lighter'; for (let j = 3; j >= 0; j--) drawSp(glow(j ? '#ff5a1a' : '#ffd27a', 14), p.x - Math.cos(a) * j * 7, p.y - Math.sin(a) * j * 7, 0, 1.1 - j * 0.2); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#fff4c0'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, TAU); ctx.fill(); continue; }
    const big = p.k === 'bolt'; drawArrow(p.x, p.y, a, big ? 22 : (p.w || 2) < 2 ? 12 : 16, big ? 2.2 : Math.max(1.3, (p.w || 2) * 0.7), p.crit, p.k);
  }
  for (const p of eprojs) { if (p.t < 0) continue; if (p.big) { ctx.globalCompositeOperation = 'lighter'; drawSp(glow(p.col, 16), p.x, p.y, 0, 1.2); ctx.globalCompositeOperation = 'source-over'; ball(ctx, p.x, p.y, 5, 5, mix(p.col, '#ffffff', 0.3), 0.5, -0.3); } else ball(ctx, p.x, p.y, 3, 3, '#8a8478', 0.5, -0.4); }
  for (const a of arcs) {
    const al = Math.min(1, a.life * 4);
    if (a.ring) { ctx.globalAlpha = al * 0.8; const R = a.R * (1.15 - a.life * 0.6); ctx.strokeStyle = a.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(a.x, a.y, R, R * 0.62, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = al * 0.15; ctx.fillStyle = a.col; ctx.fill(); ctx.globalAlpha = 1; continue; }
    ctx.globalAlpha = al; const pts = []; a.pts.forEach(([x, y], j) => { if (j) { const [px, py] = a.pts[j - 1]; for (let k = 1; k < 4; k++) pts.push([lerp(px, x, k / 4) + rnd(-9, 9), lerp(py, y, k / 4) + rnd(-9, 9)]); } pts.push([x, y]); });
    ctx.globalCompositeOperation = 'lighter'; for (const [w, c] of [[9, 'rgba(150,100,255,0.35)'], [3.5, 'rgba(200,170,255,0.9)'], [1.4, '#ffffff']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], j) => j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); } ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;
}
function drawBeams() {
  for (const t of towersRT) if (t && t.tgt && TOWERS[t.k].beam && G.stunT <= 0) {
    const tier = tierOf(t.lv), sx = t.x, sy = WALLY - 14 - TTOP.prism[tier - 1] - 16, w = 2.5 + t.ramp * 2.5;
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const [k, c] of [[3, 'rgba(255,90,210,0.25)'], [1.6, 'rgba(255,140,230,0.7)'], [0.5, '#ffffff']]) { ctx.strokeStyle = c; ctx.lineWidth = w * k; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(t.tgt.x, t.tgt.y); ctx.stroke(); }
    drawSp(glow('#ff6ad5', 20), t.tgt.x, t.tgt.y, 0, 1 + t.ramp * 0.3); ctx.globalCompositeOperation = 'source-over';
  }
}
function drawParts() {
  for (const q of parts) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); ctx.fillStyle = q.col; const s = q.sz * (0.5 + 0.5 * q.life / q.max); ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s); }
  ctx.globalAlpha = 1;
}
// ---- ambient life, keep flag & torches, banners, boss bar, main render
function drawAmbient(tm, ri) {
  const A = ART[ri];
  for (const s of ambient) {
    if (A.lava) { const y = ((s.y - tm * 30 * s.v) % (WALLY + 40) + WALLY + 40) % (WALLY + 40); ctx.globalAlpha = 0.6 + 0.4 * Math.sin(tm * 5 + s.p); ctx.fillStyle = '#ffb04a'; ctx.fillRect(s.x + Math.sin(tm + s.p) * 8, y, 2.2, 2.2); }
    else if (A.snow) { const y = ((s.y + tm * 38 * s.v) % (WALLY + 60) + WALLY + 60) % (WALLY + 60) - 40; ctx.globalAlpha = 0.85; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(s.x + Math.sin(tm * 0.8 + s.p) * 14, y, 1.4 * s.v, 0, TAU); ctx.fill(); }
    else if (A.glow) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4 + 0.4 * Math.sin(tm * 2 + s.p); drawSp(glow(A.glow, 8), s.x + Math.sin(tm * 0.5 + s.p) * 20, s.y + Math.cos(tm * 0.4 + s.p) * 12, 0, 0.8); ctx.globalCompositeOperation = 'source-over'; }
    else { const x = s.x + Math.sin(tm * 0.9 + s.p) * 24, y = s.y + Math.sin(tm * 1.7 + s.p * 2) * 8, fl = Math.abs(Math.sin(tm * 14 + s.p)); ctx.globalAlpha = 0.9; ctx.fillStyle = ['#fff6c8', '#ffd0e8', '#d8e8ff'][Math.floor(s.p) % 3]; ctx.beginPath(); ctx.ellipse(x - 2, y, 2.2 * fl + 0.4, 1.6, 0, 0, TAU); ctx.ellipse(x + 2, y, 2.2 * fl + 0.4, 1.6, 0, 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
function drawKeepLive(tm) {
  const kx = VW / 2, W = WALLY, px = kx + 30, py = W - 66;
  ctx.fillStyle = '#4a3420'; ctx.fillRect(px - 1.2, py - 44, 2.4, 44); ball(ctx, px, py - 45, 2.2, 2.2, '#e2b84c');
  ctx.beginPath(); const L = 30, H = 17; ctx.moveTo(px + 1, py - 42);
  for (let i = 0; i <= 8; i++) { const u = i / 8; ctx.lineTo(px + 1 + u * L, py - 42 + Math.sin(tm * 5 - u * 4) * 2.6 * u); }
  for (let i = 8; i >= 0; i--) { const u = i / 8; ctx.lineTo(px + 1 + u * L, py - 42 + H + Math.sin(tm * 5 - u * 4) * 2.6 * u); }
  ctx.closePath(); const fg2 = ctx.createLinearGradient(px, 0, px + L, 0); fg2.addColorStop(0, '#2b4f9c'); fg2.addColorStop(1, '#1e3a78'); ctx.fillStyle = fg2; ctx.fill();
  ctx.fillStyle = '#e2b84c'; ctx.fillRect(px + 1, py - 42 + Math.sin(tm * 5 - 0.5) * 0.3, L * 0.98, 1.4); emblem(ctx, px + 14, py - 33 + Math.sin(tm * 5 - 1.8) * 1.2, 4.5, '#e2b84c');
  for (const s of [-1, 1]) drawFlame(kx + s * 26, W + 14, 0.5, tm * 1.3 + s);
}
function drawBanner(B) {
  const t = B.max - B.life, a = Math.min(1, B.life * 2.5), ein = clamp(t / 0.35, 0, 1), ease = 1 - Math.pow(1 - ein, 3), boss = /BOSS/.test(B.t);
  const txt = B.t.replace(/⚠/g, '').trim(), y = WALLY * 0.3, w = Math.min(VW - 30, 330 + (B.sub ? 30 : 0)), h = 46;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(VW / 2 + (1 - ease) * -VW * 0.6, y); const sc = 0.85 + 0.15 * ease; ctx.scale(sc, sc);
  const col = boss ? '#9a1f2a' : '#2b4f9c', dk = shade(col, -0.45);
  for (const s of [-1, 1]) { ctx.fillStyle = dk; poly(ctx, [[s * (w / 2 - 14), -h / 2 + 8], [s * (w / 2 + 22), -h / 2 + 8], [s * (w / 2 + 10), 8], [s * (w / 2 + 22), h / 2 + 8], [s * (w / 2 - 14), h / 2 + 8]]); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.4)'; poly(ctx, [[s * (w / 2 - 14), h / 2], [s * (w / 2 - 14), h / 2 + 8], [s * (w / 2 - 2), h / 2]]); ctx.fill(); }
  const gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, shade(col, 0.25)); gr.addColorStop(0.5, col); gr.addColorStop(1, shade(col, -0.3)); ctx.fillStyle = gr; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = '#e2b84c'; ctx.lineWidth = 2; ctx.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-w / 2, -h / 2, w, h * 0.3);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${txt.length > 16 ? 22 : 26}px ${FH}`; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,10,4,0.75)'; ctx.strokeText(txt, 0, 1); ctx.fillStyle = '#ffe9b0'; ctx.fillText(txt, 0, 1);
  if (B.sub) { ctx.font = `800 13px ${FB}`; const tw = ctx.measureText(B.sub).width + 26; ctx.fillStyle = 'rgba(30,18,8,0.88)'; rr(ctx, -tw / 2, h / 2 + 10, tw, 24, 12); ctx.fill(); ctx.strokeStyle = '#a8823a'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = '#ffd77a'; ctx.fillText(B.sub, 0, h / 2 + 22.5); }
  ctx.restore(); ctx.textBaseline = 'alphabetic';
}
function drawBossBar(b) {
  const top = hudBottom() + 12, w = Math.min(VW - 70, 400), x = (VW - w) / 2 + 10, h = 14, p = Math.max(0, b.hp / b.max);
  ctx.fillStyle = 'rgba(24,14,8,0.9)'; rr(ctx, x - 4, top - 4, w + 8, h + 8, 8); ctx.fill(); ctx.strokeStyle = '#c8a24a'; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = '#3a1410'; rr(ctx, x, top, w, h, 5); ctx.fill();
  const gr = ctx.createLinearGradient(0, top, 0, top + h); gr.addColorStop(0, b.enraged ? '#ff8a4a' : '#ff5a4a'); gr.addColorStop(1, b.enraged ? '#b8301a' : '#a01e1e'); ctx.fillStyle = gr; rr(ctx, x, top, Math.max(4, w * p), h, 5); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 2, top + 2, Math.max(0, w * p - 4), 3);
  if (b.shield > 1) { ctx.fillStyle = 'rgba(140,210,255,0.75)'; rr(ctx, x, top + h - 4, w * Math.min(1, b.shield / Math.max(1, b.shieldMax)), 4, 2); ctx.fill(); }
  // skull medallion
  const mx = x - 6, my = top + h / 2; ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.arc(mx, my, 15, 0, TAU); ctx.fill(); ctx.strokeStyle = '#e2b84c'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.arc(mx, my - 2, 7, 0, TAU); ctx.fill(); ctx.fillRect(mx - 4, my + 2, 8, 5); ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.arc(mx - 2.6, my - 2, 1.9, 0, TAU); ctx.arc(mx + 2.6, my - 2, 1.9, 0, TAU); ctx.fill(); ctx.fillRect(mx - 0.6, my + 3, 1.2, 4);
  ctx.textAlign = 'center'; ctx.font = `700 14px ${FH}`; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(15,8,4,0.85)'; const nm = b.boss.name + (b.enraged ? ' — ENRAGED' : ''); ctx.strokeText(nm, x + w / 2, top + h + 19); ctx.fillStyle = b.enraged ? '#ffb07a' : '#ffe7a8'; ctx.fillText(nm, x + w / 2, top + h + 19);
}
function drawFloats() {
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  for (const f of floats) { const k = f.life / f.max; ctx.globalAlpha = Math.min(1, k * 2.2); const pop = 1 + Math.max(0, (k - 0.8) * 1.5); ctx.font = `900 ${Math.round(15 * pop)}px ${FB}`; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(25,14,6,0.85)'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.col; ctx.fillText(f.text, f.x, f.y); }
  ctx.globalAlpha = 1;
}
let lastFrameT = 0;
function sceneTowers() { // towers to show on the menu backdrop (from the save, idle)
  return save.slots.map((k, i) => k && i < save.upg.slots && save.towers[k] > 0 ? { k, lv: save.towers[k], x: VW * SLOT_FX[i], y: WALLY - 30, cd: 0, anim: 0 } : null);
}
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const nowT = performance.now() / 1000, fdt = Math.min(0.05, lastFrameT ? nowT - lastFrameT : 0.016); lastFrameT = nowT;
  const spr = clamp(Math.round(S * DPR * 4) / 4, 1.5, 3); if (spr !== SPR) { SPR = spr; for (const k in cache) delete cache[k]; bgKey = ''; }
  const ri = G ? G.s : menuRegion, key = ri + ':' + cv.width + 'x' + cv.height + ':' + WALLY + ':' + (save.upg.thorns ? 1 : 0);
  if (!bg || bgKey !== key) { makeBg(ri); makeFg(ri); }
  ctx.drawImage(bg, 0, 0);
  const sh = shake > 0 ? [rnd(-shake, shake) * 0.4, rnd(-shake, shake) * 0.4] : [0, 0];
  ctx.setTransform(S * DPR, 0, 0, S * DPR, (OX + sh[0]) * DPR, (OY + sh[1]) * DPR);
  const tm = G && state !== 'menu' ? G.time : nowT;
  stepFx(fdt);
  const live = G && (state === 'play' || state === 'result' || state === 'pause' || state === 'paused');
  if (live) drawScorch();
  const ground = live ? enemies.filter(e => !e.fly).sort((a, b) => a.y - b.y) : [];
  for (const e of ground) drawEnemy(e);
  // castle foreground (cached strip)
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(fg, sh[0] * S * DPR, (OY + sh[1] + fgY0 * S) * DPR); ctx.restore();
  drawKeepLive(tm);
  if (live) { drawDamage(G.wall / G.wallMax); if (G.hitFlash > 0) { ctx.fillStyle = `rgba(255,70,40,${G.hitFlash * 0.9})`; ctx.fillRect(-OX / S, WALLY - 30, CW / S, 40); } }
  const tws = live ? towersRT : sceneTowers();
  tws.forEach(t => { if (t) drawTowerRT(t, live ? null : tm); });
  if (live) drawBeams();
  if (live) for (const a of squad) drawArcher(a.x, a.y, 0.66, a.ang || -Math.PI / 2, a.anim > 0 ? 0 : clamp(1 - a.cd * 0.8, 0, 1), PAL_SQUAD);
  const hp = live ? (hero.anim > 0 ? 0 : clamp(1 - hero.cd * G.st.rate, 0, 1)) : 0.5 + 0.5 * Math.sin(tm * 1.4);
  drawArcher(VW / 2, WALLY - 40, 1.2, live ? hero.ang : -Math.PI / 2 + Math.sin(tm * 0.6) * 0.35, hp, PAL_HERO);
  if (live) {
    for (const e of enemies.filter(e => e.fly).sort((a, b) => a.y - b.y)) drawEnemy(e);
    drawProjs(); drawFxList(); drawParts();
    for (const e of enemies) drawEnemyUI(e);
    if (G.markPt) { const a = G.markPt.life / 3; ctx.strokeStyle = `rgba(255,213,74,${a})`; ctx.lineWidth = 2.4; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -tm * 20; ctx.beginPath(); ctx.ellipse(G.markPt.x, G.markPt.y, 60, 38, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = `rgba(255,213,74,${a * 0.12})`; ctx.fill(); }
  } else drawFxList();
  drawAmbient(tm, ri);
  if (!live) return;
  if (G.freezeFx > 0) { const q = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.2, VW / 2, VH / 2, VH * 0.75); q.addColorStop(0, `rgba(170,225,255,${G.freezeFx * 0.15})`); q.addColorStop(1, `rgba(200,240,255,${G.freezeFx * 0.8})`); ctx.fillStyle = q; ctx.fillRect(-OX / S, -OY / S, CW / S, CH / S); }
  const pct = G.wall / G.wallMax; if (pct < 0.3) { const q = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.8); q.addColorStop(0, 'rgba(160,0,0,0)'); q.addColorStop(1, `rgba(160,10,0,${(0.3 - pct) * (0.8 + 0.4 * Math.sin(tm * 5))})`); ctx.fillStyle = q; ctx.fillRect(-OX / S, -OY / S, CW / S, CH / S); }
  drawFloats();
  if (G.boss) drawBossBar(G.boss);
  if (G.banner) drawBanner(G.banner);
}

// ---- painted UI art (icons, tower portraits, region thumbnails) rendered once to data URLs
const _icoURL = {};
function medal(g, col) { // round medallion background for icons
  const q = g.createRadialGradient(26, 22, 4, 32, 32, 31); q.addColorStop(0, shade(col, 0.15)); q.addColorStop(1, shade(col, -0.55)); g.fillStyle = q; g.beginPath(); g.arc(32, 32, 29, 0, TAU); g.fill();
  g.lineWidth = 3.5; g.strokeStyle = '#e2b84c'; g.stroke(); g.lineWidth = 1.2; g.strokeStyle = '#5a3a12'; g.beginPath(); g.arc(32, 32, 31, 0, TAU); g.stroke(); g.beginPath(); g.arc(32, 32, 26.5, 0, TAU); g.stroke();
}
function arrowShape(g, x0, y0, x1, y1, w = 2.2, head = '#d8d8e0', fl = '#e8e2d0') { const a = Math.atan2(y1 - y0, x1 - x0); g.save(); g.translate(x1, y1); g.rotate(a); const L = Math.hypot(x1 - x0, y1 - y0); g.fillStyle = '#8a5a2a'; g.fillRect(-L, -w / 2, L - 6, w); g.fillStyle = head; poly(g, [[0, 0], [-9, -5], [-7, 0], [-9, 5]]); g.fill(); g.fillStyle = fl; poly(g, [[-L, 0], [-L - 4, -5], [-L + 6, -5], [-L + 9, 0], [-L + 6, 5], [-L - 4, 5]]); g.fill(); g.restore(); }
function starP(g, x, y, R, r, n = 5, rot = -Math.PI / 2) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, d = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); } g.closePath(); }
const ICO = {
  power: g => { medal(g, '#7a3a2a'); arrowShape(g, 14, 50, 50, 14, 3); g.strokeStyle = 'rgba(255,220,140,0.8)'; g.lineWidth = 1.5; for (const k of [0, 6]) { g.beginPath(); g.moveTo(16 + k, 38 - k); g.lineTo(8 + k, 46 - k); g.stroke(); } },
  draw: g => { medal(g, '#2f5a7a'); g.strokeStyle = '#a8763c'; g.lineWidth = 4; g.beginPath(); g.arc(40, 32, 20, Math.PI * 0.62, Math.PI * 1.38); g.stroke(); g.strokeStyle = '#f2ead8'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(31, 13.5); g.lineTo(22, 32); g.lineTo(31, 50.5); g.stroke(); arrowShape(g, 20, 32, 54, 32, 2.4); },
  eagle: g => { medal(g, '#3a5a3a'); g.fillStyle = '#f2ead8'; g.beginPath(); g.ellipse(32, 32, 19, 11, 0, 0, TAU); g.fill(); ball(g, 32, 32, 8, 8, '#e2a83c'); g.fillStyle = '#1a1208'; g.beginPath(); g.arc(32, 32, 3.6, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(29.5, 29.5, 1.6, 0, TAU); g.fill(); },
  crit: g => { medal(g, '#6a2a5a'); g.fillStyle = '#ffe07a'; starP(g, 32, 32, 20, 6, 4, 0); g.fill(); g.fillStyle = '#fff6d0'; starP(g, 32, 32, 9, 3, 4, Math.PI / 4); g.fill(); },
  volley: g => { medal(g, '#2f4f6a'); arrowShape(g, 32, 54, 32, 12, 2.2); arrowShape(g, 26, 54, 12, 18, 2); arrowShape(g, 38, 54, 52, 18, 2); },
  pierce: g => { medal(g, '#4a3a6a'); for (const y of [24, 40]) { g.fillStyle = '#7fa04a'; g.beginPath(); g.arc(30, y, 7, 0, TAU); g.fill(); } arrowShape(g, 8, 50, 56, 14, 2.6, '#bfe6ff'); },
  squad: g => { medal(g, '#3a4f2a'); for (const [x, s] of [[22, 0.8], [42, 0.8], [32, 1]]) { ball(g, x, 26 + (1 - s) * 10, 6 * s, 6 * s, '#2f6a3a'); g.fillStyle = '#e8c09a'; g.beginPath(); g.arc(x, 27 + (1 - s) * 10, 3 * s, 0, TAU); g.fill(); g.fillStyle = '#2f6a3a'; rr(g, x - 7 * s, 33 + (1 - s) * 10, 14 * s, 16 * s, 4); g.fill(); } g.strokeStyle = '#a8763c'; g.lineWidth = 2; g.beginPath(); g.arc(44, 40, 9, -1.3, 1.3); g.stroke(); },
  wall: g => { medal(g, '#55504a'); g.fillStyle = '#b8b0a0'; g.fillRect(14, 26, 36, 22); for (let i = 0; i < 4; i++) g.fillRect(14 + i * 10, 18, 7, 9); g.strokeStyle = '#6a6458'; g.lineWidth = 1.2; for (const y of [33, 40]) { g.beginPath(); g.moveTo(14, y); g.lineTo(50, y); g.stroke(); } for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(20 + i * 9 + (i % 2) * 4, 26); g.lineTo(20 + i * 9 + (i % 2) * 4, 33); g.stroke(); } g.fillStyle = '#3a2a1a'; rr(g, 27, 36, 10, 12, 5); g.fill(); },
  mend: g => { medal(g, '#5a4a2a'); g.save(); g.translate(32, 32); g.rotate(-0.7); g.fillStyle = '#8a5a2a'; g.fillRect(-2.5, -6, 5, 28); g.fillStyle = '#9aa0a8'; rr(g, -11, -16, 22, 11, 2); g.fill(); g.fillStyle = '#c8ccd2'; g.fillRect(-11, -16, 22, 3); g.restore(); },
  regen: g => { medal(g, '#2a5a4a'); g.fillStyle = '#7dffb0'; g.shadowColor = '#4dff9a'; g.shadowBlur = 8; rr(g, 27, 14, 10, 36, 3); g.fill(); rr(g, 14, 27, 36, 10, 3); g.fill(); g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(28, 15, 3, 34); },
  armor: g => { medal(g, '#3a4a5a'); g.fillStyle = hgrad(g, 16, 48, '#9aa6b2', 0.35, -0.4); poly(g, [[32, 12], [48, 18], [46, 36], [32, 52], [18, 36], [16, 18]]); g.fill(); g.strokeStyle = '#e2b84c'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#e2b84c'; g.fillRect(30.5, 18, 3, 28); g.fillRect(21, 26, 22, 3); },
  thorns: g => { medal(g, '#5a3a2a'); for (let i = 0; i < 5; i++) { const x = 14 + i * 9; g.fillStyle = hgrad(g, x - 3, x + 3, '#8a6236', 0.25, -0.4); poly(g, [[x - 3.5, 50], [x, 22 + (i % 2) * 6], [x + 3.5, 50]]); g.fill(); g.fillStyle = '#d8d4cc'; poly(g, [[x - 1.6, 30 + (i % 2) * 6], [x, 20 + (i % 2) * 6], [x + 1.6, 30 + (i % 2) * 6]]); g.fill(); } },
  gold: g => { medal(g, '#6a4a12'); for (const [x, y] of [[24, 40], [40, 40], [32, 28]]) { ball(g, x, y, 10, 10, '#e8b832', 0.45, -0.35); g.strokeStyle = '#9a6a10'; g.lineWidth = 1.4; g.beginPath(); g.arc(x, y, 6.5, 0, TAU); g.stroke(); } },
  gemfind: g => { medal(g, '#1f4a6a'); gemShape(g, 32, 33, 15); },
  bounty: g => { medal(g, '#5a3a12'); g.fillStyle = '#e8d6a8'; rr(g, 17, 14, 30, 36, 3); g.fill(); g.fillStyle = '#b08850'; g.fillRect(17, 14, 30, 4); g.fillStyle = '#c0392b'; starP(g, 32, 33, 10, 4.4); g.fill(); g.fillStyle = '#7a5a3a'; g.fillRect(22, 44, 20, 1.6); },
  rain: g => { medal(g, '#24506a'); for (const [x, y] of [[20, 16], [32, 10], [44, 16], [26, 30], [40, 30]]) arrowShape(g, x - 4, y, x + 4, y + 20, 1.8); },
  heal: g => { medal(g, '#2a5a2a'); g.fillStyle = '#ff5a6a'; g.beginPath(); g.moveTo(32, 50); g.bezierCurveTo(10, 36, 12, 16, 24, 17); g.bezierCurveTo(29, 17, 32, 22, 32, 24); g.bezierCurveTo(32, 22, 35, 17, 40, 17); g.bezierCurveTo(52, 16, 54, 36, 32, 50); g.fill(); g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(24, 25, 4, 3, -0.6, 0, TAU); g.fill(); },
  freeze: g => { medal(g, '#2a5a7a'); g.strokeStyle = '#e8f8ff'; g.lineWidth = 3; g.lineCap = 'round'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(a) * 18, 32 + Math.sin(a) * 18); for (const s of [-1, 1]) { g.moveTo(32 + Math.cos(a) * 11, 32 + Math.sin(a) * 11); g.lineTo(32 + Math.cos(a) * 11 + Math.cos(a + s * 0.8) * 6, 32 + Math.sin(a) * 11 + Math.sin(a + s * 0.8) * 6); } g.stroke(); } },
  meteor: g => { medal(g, '#6a2a12'); g.save(); g.translate(30, 34); g.rotate(-0.8); const q = g.createLinearGradient(0, 0, 0, 28); q.addColorStop(0, 'rgba(255,200,80,0.9)'); q.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = q; poly(g, [[-9, 0], [0, 30], [9, 0]]); g.fill(); g.restore(); ball(g, 36, 28, 10, 10, '#ff8a2a', 0.5, -0.4); g.fillStyle = '#5a2a12'; g.beginPath(); g.arc(39, 25, 2.4, 0, TAU); g.arc(33, 31, 1.8, 0, TAU); g.fill(); },
  slots: g => { medal(g, '#4a4a40'); cylBody(g, 32, 11, 22, 50, '#b0a898', Math.random, 7); for (let i = -1; i <= 1; i++) g.fillRect(32 + i * 8 - 3, 16, 6, 7); g.fillStyle = '#b0a898'; g.fillRect(21, 21, 22, 3); },
};
function gemShape(g, x, y, s) { const q = g.createLinearGradient(x - s, y - s, x + s, y + s); q.addColorStop(0, '#b8f4ff'); q.addColorStop(0.5, '#3ac0f0'); q.addColorStop(1, '#1a5aa0'); g.fillStyle = q; poly(g, [[x - s * 0.55, y - s * 0.7], [x + s * 0.55, y - s * 0.7], [x + s, y - s * 0.2], [x, y + s], [x - s, y - s * 0.2]]); g.fill(); g.fillStyle = 'rgba(255,255,255,0.45)'; poly(g, [[x - s * 0.55, y - s * 0.7], [x, y - s * 0.2], [x - s, y - s * 0.2]]); g.fill(); g.strokeStyle = 'rgba(10,40,80,0.6)'; g.lineWidth = 1; poly(g, [[x - s * 0.55, y - s * 0.7], [x + s * 0.55, y - s * 0.7], [x + s, y - s * 0.2], [x, y + s], [x - s, y - s * 0.2]]); g.stroke(); }
function icoURL(k) { if (_icoURL[k]) return _icoURL[k]; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.scale(2, 2); (ICO[k] || ICO.power)(g); return _icoURL[k] = c.toDataURL(); }
function towerURL(k, lv) { const t = Math.max(1, tierOf(lv || 1)), key = 'tw' + k + t; if (_icoURL[key]) return _icoURL[key]; const sp = towerSprite(k, t), c = document.createElement('canvas'); c.width = 120; c.height = 150; const g = c.getContext('2d'), s = 1.25, top = sp.ay - 108; g.drawImage(sp, 0, top * sp.width / sp.w, sp.width, (sp.h - top) * sp.width / sp.w, (120 - sp.w * s * 1.0) / 2 + 0, 0, sp.w * s, (sp.h - top) * s); return _icoURL[key] = c.toDataURL(); }
function regionURL(ri) {
  const key = 'rg' + ri; if (_icoURL[key]) return _icoURL[key];
  const A = ART[ri], W = 360, H = 120, c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const g = c.getContext('2d'), r = seeded(ri * 31 + 7); g.scale(2, 2);
  groundBase(g, A, 0, 0, W, H, r, 0.8);
  const pts = []; for (let x = -10; x <= W + 10; x += 8) pts.push([x, H * 0.62 + Math.sin(x / 60 + ri) * 16]); paintTrail(g, A, pts, () => 26, r);
  const list = []; for (let x = -6; x < W + 6; x += 14 + r() * 10) list.push([x, 8 + r() * 16, A.top, 0.9 + r() * 0.4]);
  for (let i = 0; i < 16; i++) { const x = r() * W, y = 30 + r() * (H - 30); if (Math.abs(y - (H * 0.62 + Math.sin(x / 60 + ri) * 16)) < 20) continue; list.push([x, y, A.props[Math.floor(r() * A.props.length)], 0.7 + r() * 0.3]); }
  placeProps(g, A, list, r); hazeAndLight(g, A, 0, 0, W, H, 40); if (A.glow) { g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(70,60,110,0.25)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; } vignette(g, 0, 0, W, H, 0.5);
  return _icoURL[key] = c.toDataURL('image/jpeg', 0.82);
}

function paintIcon(px) { // full-bleed painted hub/app icon (build-time; exported via NK.icon)
  const c = document.createElement('canvas'); c.width = c.height = px; const g = c.getContext('2d'), r = seeded(77), A = ART[0], Wd = 230, W = 150, kx = 115;
  g.scale(px / Wd, px / Wd);
  groundBase(g, A, 0, 0, Wd, Wd, r, 2.2);
  const pts = []; for (let y = -10; y <= W; y += 6) pts.push([kx + Math.sin(y / 40 + 0.6) * 22 * (1 - y / W), y]); paintTrail(g, A, pts, i => 18 + pts[i][1] * 0.25, r);
  const list = []; for (let x = -8; x < Wd + 8; x += 13 + r() * 8) { const y = 6 + r() * 16; if (Math.abs(x - kx - 14) < 18) continue; list.push([x, y, 'oak', 0.9 + r() * 0.35]); }
  list.push([14, 70, 'oak', 1.1], [216, 64, 'oak', 1.15], [30, 104, 'rock', 0.9], [200, 108, 'bush', 1], [60, 60, 'flowers', 1], [176, 84, 'flowers', 1], [44, 128, 'tuft', 1], [190, 130, 'tuft', 1]);
  placeProps(g, A, list, r); hazeAndLight(g, A, 0, 0, Wd, Wd, 50);
  for (const [k, x, y, f] of [['grunt', 96, 78, 0], ['brute', 134, 56, 1], ['runner', 112, 34, 0]]) { const sp = creatureSprite(k, false, k === 'brute' ? 15 : 11, f); g.drawImage(shadowSp(sp.w * 0.3), x - sp.w * 0.36, y - 2, sp.w * 0.72, sp.w * 0.33); g.drawImage(sp, x - sp.w / 2, y - sp.cy, sp.w, sp.h); }
  arrowShape(g, 70, 132, 90, 96, 1.6); arrowShape(g, 160, 128, 140, 84, 1.6);
  const col = STONE; cobbles(g, -4, W + 46, Wd + 4, Wd + 4, '#857b6b', r);
  stoneBlocks(g, -4, W + 6, Wd + 4, W + 46, col, r, 10);
  g.fillStyle = vgrad(g, W - 13, W + 6, shade(col, 0.32), shade(col, 0.1)); g.fillRect(-4, W - 13, Wd + 8, 19);
  for (let x = -6; x < Wd; x += 23) if (Math.abs(x + 7 - kx) > 56 && Math.abs(x + 7 - 26) > 30 && Math.abs(x + 7 - 204) > 30) merlon(g, x, W - 29, 14, 17, col, false);
  for (const [x, k] of [[26, 'archer'], [204, 'storm']]) { bastion(g, x, W, col, r, false); const sp = towerSprite(k, 4); g.drawImage(sp, x - sp.ax, W - 14 - sp.ay, sp.w, sp.h); }
  keep(g, kx, W, col, r, false, true);
  const px2 = kx + 30, py = W - 66; g.fillStyle = '#4a3420'; g.fillRect(px2 - 1.2, py - 44, 2.4, 44); g.fillStyle = '#2b4f9c'; poly(g, [[px2 + 1, py - 42], [px2 + 30, py - 40], [px2 + 28, py - 26], [px2 + 1, py - 25]]); g.fill(); emblem(g, px2 + 14, py - 33, 4.5, '#e2b84c');
  for (const sd of [-1, 1]) drawFlameG(g, kx + sd * 26, W + 14, 0.5);
  vignette(g, 0, 0, Wd, Wd, 0.45);
  return c.toDataURL('image/png');
}
function drawFlameG(g, x, y, s) { const q = g.createRadialGradient(x, y - 6 * s, 0, x, y - 6 * s, 14 * s); q.addColorStop(0, 'rgba(255,220,120,0.9)'); q.addColorStop(1, 'rgba(255,120,20,0)'); g.fillStyle = q; g.fillRect(x - 15 * s, y - 21 * s, 30 * s, 30 * s); g.fillStyle = '#ffd36a'; g.beginPath(); g.ellipse(x, y - 6 * s, 3.5 * s, 7 * s, 0, 0, TAU); g.fill(); }
const IC = { c: '<i class="ic coin"></i>', g: '<i class="ic gem"></i>', r: '<i class="ic rune"></i>' };

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
const wallet = () => `<div class="res wallet"><span class="coin" title="${save.coins.toLocaleString()} coins">${IC.c}${fmtC(save.coins, 999999)}</span><span class="gem" title="${save.gems.toLocaleString()} gems">${IC.g}${fmtC(save.gems, 99999)}</span>${showRunes() ? `<span class="rune" title="${save.runes.toLocaleString()} runes">${IC.r}${fmtC(save.runes, 99999)}</span>` : ''}</div>`;
const costHtml = c => `<span class="cl">${IC.c}${fmtC(c.coins)}</span>${c.cr || c.ru ? `<span class="cl">${c.cr ? `${IC.g}${fmtC(c.cr)}` : ''}${c.ru ? ` ${IC.r}${fmtC(c.ru)}` : ''}</span>` : ''}`;
const canPay = c => save.coins >= c.coins && save.gems >= (c.cr || 0) && save.runes >= (c.ru || 0);
function pay(c) { save.coins -= c.coins; save.gems -= c.cr || 0; save.runes -= c.ru || 0; }
const pips = (n, max) => max <= 10 ? `<div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>` : `<div class="prog"><i style="width:${(n / max * 100).toFixed(1)}%"></i></div>`;
function showMenuChrome() { state = 'menu'; G = null; hud.classList.add('hidden'); barEl.classList.add('hidden'); menuRegion = Math.floor(Math.min(NLEV - 1, highestCleared()) / 5); }

function menuScreen() {
  showMenuChrome();
  const next = Math.min(NLEV, highestCleared() + 1), inHub = window.HubSave && window.HubSave.inHub, endOK = highestCleared() >= 10;
  ui(`<div class="panel menu">
    <h1 class="logo"><img src="logo.png" alt="Stonehold Keep"></h1><div class="sub">Hold the walls! Upgrade your archers and towers.</div>
    ${wallet()}
    <button class="btn" data-a="play">PLAY<small>Level ${next}</small></button>
    <div class="row"><button class="btn alt" data-a="forge">UPGRADES</button>
    <button class="btn warn" data-a="endless" ${endOK ? '' : 'disabled'}>ENDLESS<small>${endOK ? `best ${save.endless[save.diff] || 0}` : 'clear level 10'}</small></button></div>
    <div class="seg">${Object.keys(DIFF).map(k => `<button data-a="diff" data-d="${k}" class="${save.diff === k ? 'on' : ''}">${DIFF[k].name}</button>`).join('')}</div>
    <div class="note">${save.diff === 'kid' ? 'Kid mode: slow foes and the castle never falls. Earns 1★.' : save.diff === 'hard' ? 'Hard: tougher foes, ×1.6 rewards.' : 'Normal: the intended challenge.'}</div>
    <div class="row"><button class="btn small" data-a="mute">${save.muted ? '🔇 Sound off' : '🔊 Sound on'}</button>${inHub ? '<button class="btn small alt" data-a="exit">◀ Games</button>' : ''}</div>
    <div class="note">Levels cleared ${highestCleared()}/${NLEV} · ★ ${totalStars()}/${NLEV * 3}</div>
    <div class="note rotate-hint">Tip: Stonehold Keep plays best with the phone upright.</div>
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
  let html = `<div class="panel" id="mapP"><div class="top"><div class="row"><button class="btn small" data-a="back">◀ Back</button><h2>World Map</h2><button class="btn small alt" data-a="forge">Upgrades</button></div>${wallet()}</div>`;
  for (let s = 0; s < NREG; s++) {
    const R = REGIONS[s], st = [1, 2, 3, 4, 5].reduce((a, k) => a + (((save.levels[s * 5 + k] || {}).stars) || 0), 0), open = unlockedLevel(s * 5 + 1);
    html += `<div class="region${open ? '' : ' closed'}" style="background-image:url(${regionURL(s)})"><div class="sector"><span><b>${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][s]}</b>${R.name}</span><span class="ss">★ ${st}/15</span></div><div class="levels">`;
    for (let k = 1; k <= 5; k++) {
      const L = s * 5 + k, lv = LEVELS[L - 1], ok = unlockedLevel(L), stars = ((save.levels[L] || {}).stars) || 0;
      html += `<button class="lv${lv.boss ? ' boss' : lv.guard ? ' guard' : ''}${ok ? '' : ' locked'}${L === hc + 1 ? ' next' : ''}" data-a="lv" data-l="${L}" ${ok ? '' : 'disabled'}>${lv.boss ? '<em>☠</em>' : ''}<span>${L}</span><small>${ok ? '★'.repeat(stars) + '<s>' + '★'.repeat(3 - stars) + '</s>' : '🔒'}</small></button>`;
    }
    html += `</div></div>`;
  }
  html += `<div class="note">☠ boss level · gold ring = giant guard · replay levels to grind coins & gems</div></div>`;
  ui(html, { back: menuScreen, forge: () => forgeScreen(), lv: el => startLevel(+el.dataset.l) });
  const nx = uiEl.querySelector('.lv.next'); if (nx) setTimeout(() => nx.scrollIntoView({ block: 'center' }), 0);
}
let forgeTab = 'hero', forgeSel = -1;
const TABS = [['hero', 'Hero', 'power'], ['castle', 'Castle', 'wall'], ['towers', 'Towers', 'slots'], ['powers', 'Powers', 'meteor'], ['gold', 'Gold', 'gold']];
function trackCard(k) {
  const T = TRACKS[k], t = save.upg[k], max = t >= T.max, locked = T.req != null && T.req > 0 && !cleared(T.req), c = max ? null : upgCost(k, t + 1);
  return `<div class="card${locked ? ' locked' : ''}"><div class="tic"><img src="${icoURL(k)}" alt=""></div><div class="info"><div class="nm">${T.name} <small>${t}/${T.max}</small></div>
    <div class="ds">${T.ds(t)}${max ? '' : ` → <b>${T.ds(t + 1).replace(/^Unlock: /, '')}</b>`}</div>${pips(t, T.max)}</div>
    ${locked ? `<button class="buy" disabled>Clear level ${T.req}</button>` : max ? `<button class="buy max" disabled>MAX</button>` : `<button class="buy" data-a="buy" data-k="${k}" ${canPay(c) ? '' : 'disabled'}>${t ? '' : 'UNLOCK<br>'}${costHtml(c)}</button>`}</div>`;
}
function towerCard(k) {
  const T = TOWERS[k], lv = save.towers[k], max = lv >= TMAX, locked = T.req > 0 && !cleared(T.req), c = max ? null : towerCost(k, lv);
  return `<div class="card${locked ? ' locked' : ''}"><div class="tic tw"><img src="${towerURL(k, lv)}" alt=""></div><div class="info"><div class="nm">${T.name} <small>${lv ? 'Lv ' + lv + '/' + TMAX : ''}</small></div>
    <div class="ds">${lv ? tDesc(k, lv) : T.ds}${lv && !max ? ` → <b>${fmtC(tDmg(k, lv + 1))}</b>` : ''}</div>${lv ? pips(lv, TMAX) : ''}</div>
    ${locked ? `<button class="buy" disabled>Clear level ${T.req}</button>` : max ? `<button class="buy max" disabled>MAX</button>` : `<button class="buy" data-a="tbuy" data-k="${k}" ${canPay(c) ? '' : 'disabled'}>${lv ? '' : 'UNLOCK<br>'}${costHtml(c)}</button>`}</div>`;
}
function forgeScreen(tab) {
  showMenuChrome();
  if (tab) forgeTab = tab;
  const prevScroll = (uiEl.querySelector('#forgeP') || {}).scrollTop || 0, same = uiEl.querySelector('#forgeP') && uiEl.dataset.tab === forgeTab;
  let body = '';
  if (forgeTab === 'towers') {
    const built = save.upg.slots;
    body += `<h3>Wall slots — tap one to choose its tower</h3><div class="slots">${save.slots.map((k, i) => i < built ? `<button class="slot ${k ? 'on' : ''}${forgeSel === i ? ' sel' : ''}" style="--c:${k ? TOWERS[k].col : '#3a5a8a'}" data-a="slot" data-i="${i}">${k ? `<img src="${towerURL(k, save.towers[k])}" alt="">` : '+'}<small>${k ? 'Lv ' + save.towers[k] : 'empty'}</small></button>` : `<button class="slot locked" disabled>🔒<small>slot ${i + 1}</small></button>`).join('')}</div>`;
    if (forgeSel >= 0 && forgeSel < built) {
      const own = TOWER_KEYS.filter(k => save.towers[k] > 0);
      body += `<div class="seg">${own.map(k => `<button data-a="place" data-k="${k}" class="${save.slots[forgeSel] === k ? 'on' : ''}"><img src="${towerURL(k, save.towers[k])}" alt="">${TOWERS[k].name.split(' ')[0]}</button>`).join('')}<button data-a="place" data-k="">✕ Empty</button></div>${own.length ? '' : '<div class="note">Unlock a tower below first.</div>'}`;
    }
    body += trackCard('slots') + TOWER_KEYS.map(towerCard).join('');
  } else body += TRACK_KEYS.filter(k => TRACKS[k].tab === forgeTab).map(trackCard).join('');
  ui(`<div class="panel" id="forgeP"><div class="top"><div class="row"><button class="btn small" data-a="back">◀ Menu</button><h2>Upgrades</h2><button class="btn small" data-a="map">Play ▶</button></div>${wallet()}
    <div class="tabs">${TABS.map(([k, n, ic]) => `<button data-a="tab" data-t="${k}" class="${forgeTab === k ? 'on' : ''}"><img src="${icoURL(ic)}" alt="">${n}</button>`).join('')}</div></div>${body}
    <div class="note">${IC.c} Coins come from every foe. ${IC.g} Gems: stars, elites, bosses, Gem Hunter. ${IC.r} Runes: elites, giants &amp; bosses from region IV on.</div></div>`, {
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
  ui(`<div class="panel result ${R.win ? 'win' : 'lose'}"><h2 class="ribbon">${title}</h2>
    ${R.win ? `<div class="stars">${'★'.repeat(R.stars)}<span class="off">${'★'.repeat(3 - R.stars)}</span></div>` : ''}
    <div class="sub">${endless ? `Survived ${R.waves} wave${R.waves === 1 ? '' : 's'}${R.record ? ' — NEW RECORD! 🏆' : ` · best ${save.endless[G.diff]}`}` : R.win ? `${REGIONS[G.s].name} · Level ${L}${G.diff === 'kid' ? ' · Kid mode earns 1★' : G.rescues ? ' · the wall was rescued (1★)' : ''}` : 'You keep everything you collected. Upgrade and try again!'}</div>
    <div class="res"><span class="coin">${IC.c}+${fmtC(R.tot.c, 999999)}</span><span class="gem">${IC.g}+${fmtC(R.tot.cr)}</span>${R.tot.ru ? `<span class="rune">${IC.r}+${fmtC(R.tot.ru)}</span>` : ''}</div>
    ${R.bonusC ? `<div class="note">${endless ? 'Endless bonus' : 'Clear bonus'} ${IC.c}${fmtC(R.bonusC)}${R.first ? ' (first clear ×2)' : ''}${R.bonusCr ? ` · ${IC.g}${R.bonusCr}` : ''}${R.bonusRu ? ` · ${IC.r}${R.bonusRu}` : ''}</div>` : ''}
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
  ui(`<div class="panel pause"><h2 class="ribbon">PAUSED</h2><div class="sub">${G.endless ? 'Endless · wave ' + G.endlessWave : 'Level ' + G.L + ' · ' + REGIONS[G.s].name}</div>
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
  const s = `<i class="hico"></i><div class="hpbar"><i class="${pct < 0.3 ? 'low' : ''}" style="width:${Math.max(0, pct * 100).toFixed(1)}%"></i></div><span>${fmtC(G.wall, 9999)}</span>|${G.endless ? 'Endless · Wave ' + G.endlessWave : `Lv ${G.L} · Wave ${Math.max(1, G.waveIdx + 1)}/${G.nW}`}${G.diff === 'kid' ? ' · Kid' : ''}|<span class="coin">${IC.c}${fmtC(G.coins, 99999)}</span><span class="gem">${IC.g}${fmtC(G.gems, 9999)}</span>${G.runes || G.s >= 3 ? `<span class="rune">${IC.r}${fmtC(G.runes, 9999)}</span>` : ''}`;
  if (s !== hudCache) { hudCache = s; const [a, b, c] = s.split('|'); $('hWall').innerHTML = a; $('hWave').textContent = b; $('hRes').innerHTML = c; }
  let bs = '';
  for (const [k] of POWERS) if (save.upg[k]) { const T = TRACKS[k], cd = { rain: rainCd, heal: healCd, freeze: freezeCd, meteor: meteorCd }[k](save.upg[k]); bs += k + ':' + (G.cd[k] / cd).toFixed(2) + ','; }
  bs += save.speed;
  if (bs !== barCache) { barCache = bs; for (const [k] of POWERS) { const b = barEl.querySelector(`[data-p="${k}"]`); if (!b) continue; const cd = { rain: rainCd, heal: healCd, freeze: freezeCd, meteor: meteorCd }[k](save.upg[k]), p = G.cd[k] / cd; b.style.setProperty('--p', p.toFixed(3)); b.classList.toggle('ready', p <= 0); } const sp = barEl.querySelector('.spd'); if (sp) sp.textContent = save.speed === 2 ? '2×' : '1×'; }
}
function buildBar() {
  barCache = '';
  barEl.innerHTML = POWERS.filter(([k]) => save.upg[k]).map(([k, c]) => `<button class="ab" data-p="${k}" style="--c:${c}"><img src="${icoURL(k)}" alt=""><span class="cd"></span><span class="t">${TRACKS[k].name.split(' ').pop().toUpperCase()}</span></button>`).join('') + `<button class="ab spd">${save.speed === 2 ? '2×' : '1×'}</button>`;
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
  icon: paintIcon, regionURL, get WALLY() { return WALLY; }, get VW() { return VW; }, get VH() { return VH; }, end: endLevel,
};
})();
