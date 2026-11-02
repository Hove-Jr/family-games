/* Nova Vanguard — original procedural neon shmup. No external assets. */
(() => {
'use strict';
// ---------------------------------------------------------------- save
// Save format: `v` stays 1 so older cached builds can still read it; `schema` tracks expansions.
//   schema 1 = original 15-level game, schema 2 = Expansion (60 levels, cores, new tracks & ships).
// Migration never drops data: every old field (and any unknown field) is carried forward.
const PREFIX = 'novavanguard.';
const SAVE_KEY = PREFIX + 'save';
const SCHEMA = 2;
const TRACK_KEYS = ['dmg','rate','arsenal','hull','shield','magnet','drones','bomb','crit','arc','salvage','phoenix'];
function defSave() {
  const upg = {}; TRACK_KEYS.forEach(k => upg[k] = 0);
  return { v:1, schema:SCHEMA, coins:0, crystals:0, cores:0, upg, ships:{falcon:1}, ship:'falcon', weapon:'blaster',
    levels:{}, diff:'normal', muted:false, high:{kid:0,normal:0,hard:0}, endless:{kid:0,normal:0,hard:0},
    stats:{kills:0,runs:0,bosses:0,coinsEarned:0,coresEarned:0} };
}
const finite = (x, d = 0) => (typeof x === 'number' && isFinite(x)) ? x : d;
function migrateSave(s) {
  const d = defSave(), groups = ['upg','high','endless','stats','ships','levels'];
  for (const k in s) if (!groups.includes(k)) d[k] = s[k];
  for (const g of groups) if (s[g] && typeof s[g] === 'object') Object.assign(d[g], s[g]);
  d.coins = Math.max(0, finite(d.coins)); d.crystals = Math.max(0, finite(d.crystals)); d.cores = Math.max(0, finite(d.cores));
  // upgrade tiers carry over 1:1 (old caps were 8-10; new caps are higher, so maxed tracks simply continue)
  TRACK_KEYS.forEach(k => { d.upg[k] = Math.max(0, Math.min(TRACKS[k].max, Math.floor(finite(d.upg[k])))); });
  if (!d.ships.falcon) d.ships.falcon = 1;
  if (!SHIPS[d.ship] || !d.ships[d.ship]) d.ship = 'falcon';
  if (!WEAPONS[d.weapon]) d.weapon = 'blaster';
  if (!DIFF[d.diff]) d.diff = 'normal';
  d.v = 1; d.schema = SCHEMA;
  return d;
}
function loadSave() {
  let raw = null, s = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
  try { s = JSON.parse(raw); } catch (e) {}
  if (s && typeof s === 'object') {
    const from = finite(s.schema, 1);
    if (from < SCHEMA) { // keep an untouched copy of the pre-expansion save, just in case
      try { const bk = SAVE_KEY + '.backup-s' + from; if (localStorage.getItem(bk) == null) localStorage.setItem(bk, raw); } catch (e) {}
    }
    const d = migrateSave(s);
    if (from < SCHEMA) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch (e) {} }
    return d;
  }
  if (raw) { try { localStorage.setItem(SAVE_KEY + '.unreadable', raw); } catch (e) {} }
  const d = defSave();
  const p = window.HubSave && window.HubSave.profile;
  if (p && p.age && p.age <= 7) d.diff = 'kid';
  return d;
}
let save = null; // loaded after the data tables below
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// ---------------------------------------------------------------- data
const DIFF = {
  kid:    { name:'Kid',    hp:0.55, bs:0.42, fire:0.35, hit:2.5, lives:9, reward:0.6, body:false, infinite:true },
  normal: { name:'Normal', hp:1.0,  bs:1.0,  fire:1.0,  hit:6,   lives:0, reward:1.0, body:true,  infinite:false },
  hard:   { name:'Hard',   hp:1.35, bs:1.25, fire:1.45, hit:7,   lives:0, reward:1.6, body:true,  infinite:false },
};
const ARSENAL_DESC = ['Blaster only','Spread Shot unlocked','Homing Missiles I','Laser Beam unlocked','Start at Power 2','Homing Missiles II','Overcharge: max Power 6','Homing Missiles III','Start at Power 3',
  'Homing Missiles IV','Plasma Wave unlocked','Overcharge II: max Power 7','Smart Missiles: +50% dmg','Homing Missiles V','Storm Needles unlocked','Overcharge III: max Power 8','Start at Power 4'];
const shieldCharges = t => t ? 1 + Math.floor(t / 4) : 0;
const shieldTime = t => t <= 10 ? 24 - 1.6 * t : Math.max(4, 8 - 0.3 * (t - 10));
const magnetRange = t => 70 + 28 * t;
const bombStart = t => 1 + Math.floor((t + 1) / 3);
const bombDmg = t => 60 * (1 + 0.3 * t);
const droneCount = t => t >= 14 ? 4 : t >= 10 ? 3 : t >= 2 ? 2 : t;
const droneMul = t => 1 + Math.max(0, t - 2) * 0.25;
const critChance = t => 0.025 * t;
const critMul = t => 2 + 0.05 * t;
const arcStats = t => ({ jumps: 2 + Math.floor(t / 3), dmg: 3 + 1.1 * t, cd: Math.max(0.55, 2.4 - 0.09 * t), range: 300 + 6 * t });
const salvageBonus = t => 0.05 * t;
const phoenixLives = t => t >= 8 ? 3 : t >= 4 ? 2 : t ? 1 : 0;
const phoenixHeal = t => Math.min(1, 0.35 + 0.08 * t);
// old = the cap in the original game (those tiers keep their original price & effect)
const TRACKS = {
  dmg:     { name:'Weapon Damage', max:30, old:10, base:150, cb:2,  desc:t => `+${t*15}% damage` },
  rate:    { name:'Fire Rate',     max:25, old:10, base:150, cb:2,  desc:t => `+${t*9}% fire rate` },
  arsenal: { name:'Arsenal',       max:16, old:8,  base:300, cb:3,  desc:t => ARSENAL_DESC[t] },
  hull:    { name:'Hull Plating',  max:20, old:10, base:200, cb:2,  desc:t => `+${t} max hull` },
  shield:  { name:'Energy Shield', max:20, old:10, base:250, cb:2,  desc:t => t ? `${shieldCharges(t)} charge${shieldCharges(t)>1?'s':''}, recharge ${shieldTime(t).toFixed(1)}s` : 'No shield' },
  magnet:  { name:'Tractor Magnet',max:15, old:10, base:100, cb:1,  desc:t => `Pickup range ${magnetRange(t)}` },
  drones:  { name:'Wingman Drones',max:16, old:8,  base:400, cb:3,  desc:t => t===0?'No drones':t===1?'1 drone':`${droneCount(t)} drones, +${(t-2)*25}% drone power` },
  bomb:    { name:'Nova Bomb',     max:20, old:10, base:180, cb:2,  desc:t => `${bombStart(t)} bombs/run, ${Math.round(bombDmg(t))} dmg` },
  crit:    { name:'Targeting AI',  max:20, old:0,  base:3000, cb:3, isNew:true, desc:t => t ? `${Math.round(critChance(t)*100)}% crit chance, ×${critMul(t).toFixed(2)} crit dmg` : 'No critical hits' },
  arc:     { name:'Arc Emitter',   max:20, old:0,  base:4000, cb:3, isNew:true, desc:t => { if (!t) return 'Offline'; const a = arcStats(t); return `Chain lightning: ${a.jumps} jumps every ${a.cd.toFixed(2)}s`; } },
  salvage: { name:'Salvage Rig',   max:20, old:0,  base:2500, cb:2, isNew:true, desc:t => t ? `+${Math.round(salvageBonus(t)*100)}% coins, more crystals` : 'Standard salvage' },
  phoenix: { name:'Phoenix Core',  max:8,  old:0,  base:12000,cb:6, isNew:true, desc:t => t ? `${phoenixLives(t)} revive${phoenixLives(t)>1?'s':''}/run, back with ${Math.round(phoenixHeal(t)*100)}% hull` : 'No revive' },
};
function oldCost(T, tier) {
  return { coins: Math.round(T.base * Math.pow(1.47, tier - 1) / 10) * 10, cr: tier >= 4 ? Math.ceil(T.cb * Math.pow(tier - 3, 1.6)) : 0, cores: 0 };
}
function upgCost(k, tier) {
  const T = TRACKS[k];
  if (tier <= T.old) return oldCost(T, tier);
  if (T.old) { // continuation tiers of an original track
    const n = tier - T.old, top = oldCost(T, T.old);
    return { coins: Math.round(top.coins * Math.pow(1.115, n) / 10) * 10, cr: Math.ceil(top.cr * 0.5 + n * T.cb * 1.6), cores: Math.ceil(n * 0.7) };
  }
  return { coins: Math.round(T.base * Math.pow(1.17, tier - 1) / 10) * 10, cr: Math.ceil(tier * T.cb * 1.6), cores: Math.ceil(tier * 0.7) };
}
const SHIPS = {
  falcon:  { name:'Falcon',  color:'#4ff3ff', c2:'#2a7bff', dmg:1.0, rate:1.0, hp:0, speed:1.0, mag:0, bombs:0, drones:0, coins:0, cr:0, desc:'Balanced starter interceptor.' },
  wasp:    { name:'Wasp',    color:'#ffe14a', c2:'#ff8a00', dmg:0.95,rate:1.22,hp:-1,speed:1.15,mag:50, bombs:0, drones:0, coins:3000, cr:10, desc:'+22% fire rate, bigger magnet, fragile.' },
  bulwark: { name:'Bulwark', color:'#5dff8a', c2:'#0fa860', dmg:1.12,rate:0.92,hp:2, speed:0.9, mag:0, bombs:1, drones:0, coins:8000, cr:30, desc:'+2 hull, +1 bomb, +12% damage, slower guns.' },
  phantom: { name:'Phantom', color:'#ff5ad1', c2:'#8a2bff', dmg:1.32,rate:1.0, hp:0, speed:1.05,mag:20, bombs:0, drones:0, coins:20000, cr:80, desc:'+32% damage glass-cannon striker.' },
  seraph:  { name:'Seraph',  color:'#fff2c4', c2:'#ffb02e', dmg:1.22,rate:1.15,hp:1, speed:1.1, mag:40, bombs:1, drones:1, coins:50000, cr:200, desc:'Flagship: +22% dmg, +15% rate, +1 hull, extra drone.' },
  comet:   { name:'Comet',   color:'#9ff7ff', c2:'#3ad1ff', form:1, dmg:1.25,rate:1.12,hp:1, speed:1.18,mag:40, bombs:0, drones:0, pierce:1, coins:40000, cr:150, co:10, desc:'Piercing shots punch through an extra enemy. Very fast.' },
  tempest: { name:'Tempest', color:'#b8a6ff', c2:'#5a4bff', form:2, dmg:1.3, rate:1.12,hp:1, speed:1.08,mag:40, bombs:1, drones:0, arc:1, coins:70000, cr:250, co:25, desc:'Built-in Arc Emitter: +4 Arc tiers of chain lightning.' },
  hydra:   { name:'Hydra',   color:'#7dffb0', c2:'#11a860', form:3, dmg:1.35,rate:1.1, hp:2, speed:1.05,mag:40, bombs:1, drones:1, missiles:2, misMul:1.3, coins:110000, cr:350, co:45, desc:'+2 missile pods (+30% missile dmg) and an extra drone.' },
  aurora:  { name:'Aurora',  color:'#ffb3f0', c2:'#ff4fc8', form:4, dmg:1.4, rate:1.18,hp:2, speed:1.12,mag:60, bombs:1, drones:1, side:1, coins:160000, cr:450, co:70, desc:'Fires twin side volleys with every shot.' },
  titan:   { name:'Titan',   color:'#ffcf7a', c2:'#ff7a1a', form:5, dmg:1.7, rate:0.95,hp:5, speed:0.95,mag:40, bombs:3, drones:1, splash:46, coins:220000, cr:550, co:100, desc:'+5 hull, +3 bombs, heavy shots that splash nearby foes.' },
  specter: { name:'Specter', color:'#c4fff2', c2:'#28d7b0', form:6, dmg:1.6, rate:1.25,hp:2, speed:1.28,mag:60, bombs:1, drones:1, evade:0.25, pierce:1, coins:300000, cr:700, co:140, desc:'Phase hull: 25% of bullets pass through you. Piercing, fastest ship.' },
  zenith:  { name:'Zenith',  color:'#ffffff', c2:'#ffd54a', form:7, dmg:1.85,rate:1.3, hp:4, speed:1.18,mag:90, bombs:2, drones:2, pierce:1, arc:1, missiles:1, misMul:1.2, evade:0.12, side:1, coins:450000, cr:1000, co:220, desc:'Ultimate flagship: piercing, side volleys, arcs, missiles, +2 drones.' },
};
const WEAPONS = { blaster:{name:'Blaster', need:0}, spread:{name:'Spread', need:1}, laser:{name:'Laser', need:3}, wave:{name:'Plasma Wave', need:10}, storm:{name:'Storm Needles', need:14} };
const EDEF = {
  drone:   { hp:3,  r:16, color:'#4ff3ff', shape:'tri',     score:10, coin:1, fire:0.10, pat:'aim',    dive:true,  sp:'form' },
  weaver:  { hp:4,  r:16, color:'#ff5ad1', shape:'diamond', score:15, coin:1, fire:0.12, pat:'aim',    dive:false, sp:'stream' },
  diver:   { hp:5,  r:18, color:'#ff9a3d', shape:'arrow',   score:20, coin:1, fire:0.15, pat:'burst3', dive:true,  sp:'form' },
  kamikaze:{ hp:2,  r:14, color:'#ff3b4e', shape:'dart',    score:15, coin:1, fire:0,    pat:null,     dive:false, sp:'rain', homing:1 },
  gunner:  { hp:12, r:22, color:'#5dff8a', shape:'gunner',  score:40, coin:3, fire:0.55, pat:'burst3', dive:false, sp:'hover' },
  spinner: { hp:10, r:20, color:'#ffe14a', shape:'star',    score:40, coin:3, fire:0.30, pat:'ring',   dive:false, sp:'hover' },
  tank:    { hp:40, r:30, color:'#5a8bff', shape:'hex',     score:100,coin:6, fire:0.45, pat:'spread5',dive:false, sp:'hover' },
  elite:   { hp:25, r:22, color:'#c58bff', shape:'crystal', score:120,coin:4, fire:0.40, pat:'spiral', dive:true, crystal:1, sp:'form' },
  // ---- Expansion enemies
  shard:   { hp:4,  r:14, color:'#bff4ff', shape:'shard',   score:20, coin:1, fire:0.10, pat:'aim',    dive:true,  sp:'rain', beh:'zig' },
  mine:    { hp:9,  r:17, color:'#ff5a5a', shape:'mine',    score:25, coin:2, fire:0,    pat:null,     sp:'rain', fallV:75, deathRing:8, beh:'spin' },
  splitter:{ hp:9,  r:20, color:'#ffb02e', shape:'split',   score:30, coin:2, fire:0.18, pat:'aim',    dive:true,  sp:'form', split:'shardlet' },
  shardlet:{ hp:2,  r:11, color:'#ffd27a', shape:'dart',    score:5,  coin:1, fire:0,    pat:null,     sp:'rain', noElite:1 },
  bomber:  { hp:18, r:24, color:'#ff7a3d', shape:'bomber',  score:60, coin:4, fire:0.32, pat:'seed',   sp:'hover' },
  carrier: { hp:36, r:30, color:'#5dff8a', shape:'carrier', score:120,coin:6, fire:0.2,  pat:'spread5',sp:'hover', beh:'carrier' },
  swarmer: { hp:1.5,r:10, color:'#c8ff4a', shape:'tri',     score:5,  coin:1, fire:0,    pat:null,     sp:'stream', homing:1, noElite:1 },
  orbiter: { hp:14, r:18, color:'#4ff3ff', shape:'orb',     score:45, coin:3, fire:0.32, pat:'ring',   sp:'hover', beh:'orbit' },
  sniper:  { hp:12, r:18, color:'#ffe14a', shape:'sniper',  score:50, coin:3, fire:0.28, pat:'snipe',  sp:'hover' },
  phase:   { hp:16, r:19, color:'#ff7af0', shape:'phase',   score:55, coin:3, fire:0.3,  pat:'burst3', sp:'hover', beh:'phase' },
  juggernaut:{hp:110,r:36, color:'#5affd8', shape:'jugg',    score:250,coin:12,fire:0.45, pat:'wall',   sp:'hover' },
  sentinel:{ hp:30, r:24, color:'#ffd54a', shape:'sentinel',score:90, coin:5, fire:0.9,  pat:'spin2',  sp:'hover' },
  cloaker: { hp:14, r:18, color:'#7dfff0', shape:'cloak',   score:60, coin:3, fire:0.35, pat:'burst3', dive:true, sp:'hover', beh:'cloak' },
};
// Sectors I-III are the original game; IV-XII are the Expansion (5 levels each, guardian on 1-4, sector boss on 5).
const SECTORS = [
  { name:'Sector I — Outer Rim',        hue:'#3f7bff', neb:['#1b2cff','#00c8ff'] },
  { name:'Sector II — Crimson Expanse', hue:'#ff2a5a', neb:['#ff1a5a','#ff8a00'] },
  { name:'Sector III — Void Core',      hue:'#b05cff', neb:['#8a2bff','#ff2ad4'] },
  { name:'Sector IV — Glacier Drift',   hue:'#8fe8ff', neb:['#1a6bff','#bff4ff'], deco:'ice',    roster:['drone','weaver','shard','mine','gunner','spinner','elite'], haz:[], guardian:'frostbite', boss:'glacier' },
  { name:'Sector V — Ember Belt',       hue:'#ff8a3d', neb:['#ff4a1a','#ffb02e'], deco:'rocks',  roster:['diver','kamikaze','splitter','bomber','shard','tank','elite'], haz:['ast'], guardian:'cinder', boss:'magma' },
  { name:'Sector VI — Verdant Rift',    hue:'#5dff8a', neb:['#0fa860','#c8ff4a'], deco:'spores', roster:['weaver','swarmer','carrier','orbiter','splitter','gunner','elite'], haz:['ast'], guardian:'sporeling', boss:'bloom' },
  { name:'Sector VII — Storm Veil',     hue:'#ffe14a', neb:['#2a4bff','#ffe14a'], deco:'bolts',  roster:['drone','sniper','orbiter','shard','spinner','bomber','elite'], haz:['storm'], guardian:'volt', boss:'tempest' },
  { name:'Sector VIII — Mirror Maze',   hue:'#ff7af0', neb:['#ff2ad4','#2af0ff'], deco:'grid',   roster:['phase','weaver','sniper','splitter','sentinel','diver','elite'], haz:['gate'], guardian:'knight', boss:'kaleido' },
  { name:'Sector IX — Graviton Deep',   hue:'#5affd8', neb:['#3a0a8a','#00ffd0'], deco:'rings',  roster:['juggernaut','orbiter','mine','swarmer','carrier','phase','elite'], haz:['hole','ast'], guardian:'graviton', boss:'horizon' },
  { name:'Sector X — Solar Forge',      hue:'#ffb02e', neb:['#ff3a1a','#ffd54a'], deco:'sun',    roster:['sentinel','bomber','juggernaut','tank','sniper','gunner','elite'], haz:['storm','gate'], guardian:'hammer', boss:'sunforge' },
  { name:'Sector XI — Phantom Reach',   hue:'#7dfff0', neb:['#003a4a','#7a2bff'], deco:'fog',    roster:['cloaker','phase','swarmer','sniper','splitter','carrier','elite'], haz:['hole','gate'], guardian:'wraith', boss:'armada' },
  { name:'Sector XII — Singularity Throne', hue:'#ffffff', neb:['#ff2ad4','#4ff3ff'], deco:'throne', roster:['cloaker','juggernaut','sentinel','sniper','phase','orbiter','bomber','splitter','shard','carrier','elite'], haz:['ast','storm','gate','hole'], guardian:'herald', boss:'singularity' },
];
const F = (t,c,r,from='T') => ['form',t,c,r,from];
const ST = (t,n,from='L') => ['stream',t,n,0,from];
const RN = (t,n) => ['rain',t,n];
const HV = (t,n) => ['hover',t,n];
const HZ = (k,n) => ['haz',k,n];
const MID = k => ['mid',k];
const LEVELS = [
  { waves:[F('drone',5,2,'L'),F('drone',5,2,'R'),ST('weaver',6,'L'),F('drone',6,2)], boss:'warden' },
  { waves:[ST('weaver',8,'L'),ST('weaver',8,'R'),F('diver',5,2),F('drone',6,3,'L')], boss:'warden' },
  { waves:[F('diver',6,2,'L'),RN('kamikaze',10),ST('weaver',10,'R'),[F('diver',6,2),HV('gunner',2)]], boss:'warden' },
  { waves:[HV('gunner',3),F('drone',7,3,'L'),[ST('weaver',8,'L'),ST('weaver',8,'R')],RN('kamikaze',14),F('diver',7,3)], boss:'warden' },
  { waves:[F('drone',7,3,'L'),HV('gunner',3),ST('weaver',12,'R'),[F('diver',7,3,'R'),RN('kamikaze',10)],[HV('gunner',4),F('drone',6,2)]], boss:'hive' },
  { waves:[HV('spinner',2),F('diver',7,3,'L'),ST('weaver',12,'L'),[HV('gunner',3),HV('spinner',1)],F('drone',8,3,'R')], boss:'lancer' },
  { waves:[RN('kamikaze',20),F('drone',8,3),[HV('spinner',3),ST('weaver',10,'R')],[ST('weaver',10,'L'),ST('weaver',10,'R')],F('diver',8,3,'L')], boss:'lancer' },
  { waves:[HV('tank',2),F('diver',8,3,'R'),HV('spinner',3),[RN('kamikaze',16),HV('gunner',3)],[F('drone',8,3),HV('tank',1)]], boss:'lancer' },
  { waves:[[F('elite',4,1),F('drone',6,2,'L')],ST('weaver',14,'R'),[HV('tank',2),HV('spinner',2)],RN('kamikaze',24),[F('diver',8,3),HV('gunner',3)]], boss:'lancer' },
  { waves:[[F('diver',8,3,'L'),HV('spinner',2)],[HV('tank',3),RN('kamikaze',12)],[ST('weaver',12,'L'),ST('weaver',12,'R'),HV('gunner',2)],[F('elite',5,1),F('drone',8,2,'R')],[HV('tank',2),HV('spinner',3)]], boss:'dread' },
  { waves:[[F('elite',5,2),HV('gunner',2)],RN('kamikaze',26),[HV('tank',3),ST('weaver',12,'R')],[F('diver',9,3,'L'),HV('spinner',3)],F('elite',6,2,'R')], boss:'prism' },
  { waves:[[HV('spinner',4),ST('weaver',12,'L')],[F('diver',9,3,'R'),RN('kamikaze',14)],[HV('tank',4)],[F('elite',6,2),HV('gunner',3)],[ST('weaver',14,'L'),ST('weaver',14,'R'),HV('spinner',2)]], boss:'prism' },
  { waves:[[F('elite',7,2,'L'),RN('kamikaze',16)],[HV('tank',3),HV('spinner',3)],[F('diver',9,4),HV('gunner',4)],[ST('weaver',16,'R'),HV('elite',3)],[HV('tank',4),F('drone',9,3)]], boss:'prism' },
  { waves:[[HV('elite',4),HV('spinner',3)],[F('diver',10,4,'L'),RN('kamikaze',18)],[HV('tank',4),HV('gunner',4)],[F('elite',8,2,'R'),ST('weaver',14,'L')],[HV('spinner',5),HV('tank',2),RN('kamikaze',12)],F('elite',8,3)], boss:'prism' },
  { waves:[[F('elite',8,2),HV('tank',2)],[HV('spinner',5),RN('kamikaze',20)],[F('diver',10,4,'R'),HV('gunner',4)],[ST('weaver',16,'L'),ST('weaver',16,'R'),HV('elite',3)],[HV('tank',5),F('elite',8,2,'L')],[F('drone',10,4),HV('spinner',4),RN('kamikaze',16)]], boss:'sovereign' },
];
const NEW_TYPES = ['shard','mine','splitter','bomber','carrier','swarmer','orbiter','sniper','phase','juggernaut','sentinel','cloaker'];
// Expansion levels 16-60 are generated from a fixed seed, so every level is the same each time you play it.
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function genLevel(L) {
  const s = Math.floor((L - 1) / 5), k = (L - 1) % 5, SD = SECTORS[s], r = seeded(L * 7919 + 1013);
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1)), pick = a => a[Math.floor(r() * a.length)];
  const fresh = SD.roster.filter(t => NEW_TYPES.includes(t));
  const g = s - 3; // 0..8
  const spec = t => {
    const d = EDEF[t], side = r() < 0.5 ? 'L' : 'R';
    switch (d.sp) {
      case 'form':   return F(t, Math.min(10, ri(6, 8) + (g > 4 ? 1 : 0)), Math.min(4, ri(2, 3) + (k >= 3 && g > 2 ? 1 : 0)), pick(['T', 'L', 'R']));
      case 'stream': return ST(t, ri(10, 14) + g + k * 2, side);
      case 'rain':   return RN(t, ri(12, 16) + g * 2 + k * 2);
      default:       return HV(t, Math.min(t === 'juggernaut' ? 2 : 5, ri(2, 3) + (k >= 3 ? 1 : 0) + (g >= 5 ? 1 : 0)));
    }
  };
  const nW = 5 + (k >= 2 ? 1 : 0) + (g >= 4 ? 1 : 0);
  const waves = [];
  for (let w = 0; w < nW; w++) {
    const grp = [];
    const t1 = w < 3 && fresh.length ? fresh[(w + k) % fresh.length] : pick(SD.roster);
    grp.push(spec(t1));
    if (w > 0 && r() < 0.45 + 0.05 * g) { let t2 = pick(SD.roster); if (t2 === t1) t2 = pick(SD.roster); grp.push(spec(t2)); }
    if (SD.haz.length && w > 0 && r() < 0.3 + 0.06 * k + 0.03 * g) { const h = pick(SD.haz); grp.push(HZ(h, h === 'ast' ? ri(4, 7) + g : h === 'storm' ? ri(2, 4) : h === 'gate' ? ri(1, 2) : 1)); }
    waves.push(grp.length === 1 ? grp[0] : grp);
  }
  const oldGuards = ['warden', 'lancer', 'prism'];
  if (k === 2) waves.splice(3, 0, MID(g > 0 && r() < 0.6 ? SECTORS[s - 1].guardian : pick(oldGuards)));
  if (k === 4) waves.splice(nW - 1, 0, MID(SD.guardian));
  return { waves, boss: k === 4 ? SD.boss : SD.guardian };
}
for (let L = LEVELS.length + 1; L <= SECTORS.length * 5; L++) LEVELS.push(genLevel(L));
const NLEV = LEVELS.length;
const NSEC = SECTORS.length;
// enemy toughness: original curve through level 15, then a gentler climb so upgrades keep up
const levelScale = L => L <= 15 ? 1 + 0.32 * (L - 1) + 0.012 * (L - 1) * (L - 1) : 7.8088 * Math.pow(1.04, L - 15);
const rewardMul = L => L > 15 ? 1 + (L - 15) * 0.02 : 1;
const BOSSDEF = {
  warden:   { name:'WARDEN',        hp:260,  r:50, color:'#4ff3ff', shape:'warden', phases:[['fan5','ring12'],['fan7','ring16','spiralS']], mini:true },
  hive:     { name:'HIVE MOTHER',   hp:700,  r:70, color:'#ffe14a', shape:'hive',   phases:[['summon','ring16','fan5'],['spiral','summon','ring20','fan7']] },
  lancer:   { name:'LANCER',        hp:520,  r:55, color:'#ff3b4e', shape:'lancer', phases:[['laser1','fan7'],['charge','laser3','ring16']], mini:true },
  dread:    { name:'DREADNOUGHT',   hp:1100, r:80, color:'#ff9a3d', shape:'dread',  phases:[['spiral','laserSweep','fan7'],['spiral2','laser3','ring20','summon']], turrets:2 },
  prism:    { name:'PRISM',         hp:900,  r:55, color:'#c58bff', shape:'prism',  phases:[['teleport','ring16r','fan9'],['teleport','spiral2','ring20','laser3']], mini:true },
  sovereign:{ name:'VOID SOVEREIGN',hp:2600, r:90, color:'#ff5ad1', shape:'sovereign', phases:[['ring20','fan7','summon'],['spiral2','laser3','charge','ring16r'],['spiral2','ring24','laser5','summon','fan9']] },
  // ---- Expansion guardians (mini) and sector bosses
  frostbite:{ name:'FROSTBITE',      hp:620,  r:52, color:'#bff4ff', shape:'snow',     mini:true, phases:[['shards','ring16'],['iceRing','shards','spiralS']] },
  glacier:  { name:'GLACIER TITAN',  hp:2100, r:82, color:'#8fe8ff', shape:'glacier',  turrets:2, minion:'shard', phases:[['iceRing','fan7','summon'],['shards','spiral','iceRing','laser3']] },
  cinder:   { name:'CINDER CLAW',    hp:660,  r:54, color:'#ff8a3d', shape:'claw',     mini:true, phases:[['fan7','rockfall'],['charge','fan9','rockfall','ring16']] },
  magma:    { name:'MAGMA LEVIATHAN',hp:2300, r:86, color:'#ff5a1a', shape:'leviathan',minion:'bomber', phases:[['rockfall','fan7','seeds'],['laserSweep','rockfall','ring20','summon'],['spiral2','seeds','rockfall','laser3']] },
  sporeling:{ name:'SPORELING',      hp:700,  r:50, color:'#9dff6a', shape:'spore',    mini:true, minion:'swarmer', phases:[['seeds','fan5'],['bloom','seeds','summon']] },
  bloom:    { name:'BLOOM QUEEN',    hp:2450, r:84, color:'#5dff8a', shape:'flower',   minion:'swarmer', phases:[['bloom','seeds','summon'],['spiral','bloom','fan9'],['spiral2','bloom','seeds','summon']] },
  volt:     { name:'VOLT WARDEN',    hp:730,  r:52, color:'#ffe14a', shape:'bolt',     mini:true, phases:[['lightning','fan7'],['lightning5','ring20','teleport']] },
  tempest:  { name:'TEMPEST CROWN',  hp:2600, r:84, color:'#ffe14a', shape:'crown',    turrets:2, minion:'sniper', phases:[['lightning','ring20','fan7'],['lightning5','spiral','summon'],['lightning5','spiral2','laser5','ring24']] },
  knight:   { name:'MIRROR KNIGHT',  hp:760,  r:54, color:'#ff7af0', shape:'knight',   mini:true, phases:[['mirror','gate'],['mirror','teleport','fan9','gate']] },
  kaleido:  { name:'KALEIDOSCOPE',   hp:2750, r:80, color:'#ff7af0', shape:'kaleido',  minion:'phase', phases:[['gate','ring16r','mirror'],['teleport','summon','cross','gate'],['cross','ring24','mirror','laser5','gate']] },
  graviton: { name:'GRAVITON',       hp:800,  r:54, color:'#5affd8', shape:'graviton', mini:true, phases:[['hole','ring16'],['hole','spiral','fan9']] },
  horizon:  { name:'EVENT HORIZON',  hp:2900, r:88, color:'#5affd8', shape:'horizon',  minion:'orbiter', phases:[['hole','ring20','fan7'],['hole','spiral2','summon','wall'],['hole','nova','laserSweep','wall']] },
  hammer:   { name:'FORGEHAMMER',    hp:840,  r:58, color:'#ffb02e', shape:'hammer',   mini:true, phases:[['charge','wall'],['charge','wall','laser3']] },
  sunforge: { name:'SUNFORGE COLOSSUS',hp:3000,r:92,color:'#ffd54a', shape:'sun',      turrets:4, minion:'sentinel', phases:[['laserSweep','wall','fan9'],['nova','laser5','summon','lightning'],['spiral2','laserSweep','wall','nova']] },
  wraith:   { name:'WRAITH',         hp:880,  r:54, color:'#7dfff0', shape:'wraith',   mini:true, phases:[['blink','fan9'],['blink','spiral','ring20']] },
  armada:   { name:'PHANTOM ARMADA', hp:3200, r:90, color:'#7dfff0', shape:'armada',   minion:'cloaker', phases:[['blink','summon','wall'],['blink','spiral2','gate'],['blink','nova','laser5','hole','summon']] },
  herald:   { name:'HERALD OF THE THRONE', hp:950, r:56, color:'#ffffff', shape:'herald', mini:true, phases:[['cross','shards','lightning'],['nova','hole','bloom']] },
  singularity:{ name:'THE SINGULARITY', hp:3700, r:96, color:'#ffffff', shape:'singularity', turrets:2, minion:'swarmer', phases:[['ring24','shards','summon'],['spiral2','lightning5','gate','seeds'],['cross','hole','laserSweep','bloom','wall'],['nova','spiral2','laser5','lightning5','rockfall','summon']] },
};
save = loadSave();

// ---------------------------------------------------------------- canvas & sizing
const cv = document.getElementById('c'), ctx = cv.getContext('2d', { alpha:false });
let VW = 600, VH = 960, S = 1, DPR = 1;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
function resize() {
  const cw = window.innerWidth, ch = window.innerHeight;
  VH = 960; VW = Math.max(540, Math.min(760, Math.round(960 * cw / ch)));
  S = Math.min(cw / VW, ch / VH); DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(VW * S * DPR); cv.height = Math.round(VH * S * DPR);
  cv.style.width = (VW * S) + 'px'; cv.style.height = (VH * S) + 'px';
  makeStars();
  if (player) player.x = clamp(player.x, 20, VW - 20);
}

// ---------------------------------------------------------------- sprites (pre-rendered glow)
function mk(w, h, fn, sc = 2) { const c = document.createElement('canvas'); c.width = Math.ceil(w * sc); c.height = Math.ceil(h * sc); const g = c.getContext('2d'); g.scale(sc, sc); fn(g, w, h); c.w = w; c.h = h; return c; }
const dotCache = {};
function glow(color, r = 16) {
  const k = color + r; if (dotCache[k]) return dotCache[k];
  return dotCache[k] = mk(r * 2, r * 2, g => { const gr = g.createRadialGradient(r, r, 0, r, r, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.22, color); gr.addColorStop(0.5, color + '55'); gr.addColorStop(1, color + '00'); g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); }, 1);
}
function shapePath(g, shape, r) {
  g.beginPath();
  const poly = (n, rr, rot = -Math.PI / 2) => { for (let i = 0; i < n; i++) { const a = rot + i * TAU / n; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); };
  const star = (n, ro, ri, rot = -Math.PI / 2) => { g.moveTo(Math.cos(rot) * ro, Math.sin(rot) * ro); for (let i = 1; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? ri : ro; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); };
  const circ = (x, y, rr) => { g.moveTo(x + rr, y); g.arc(x, y, rr, 0, TAU); };
  switch (shape) {
    case 'tri': g.moveTo(0, r); g.lineTo(-r, -r * 0.7); g.lineTo(0, -r * 0.3); g.lineTo(r, -r * 0.7); g.closePath(); break;
    case 'diamond': g.moveTo(0, r); g.lineTo(-r * 0.75, 0); g.lineTo(0, -r); g.lineTo(r * 0.75, 0); g.closePath(); g.moveTo(-r, -r * 0.2); g.lineTo(-r * 1.1, r * 0.5); g.moveTo(r, -r * 0.2); g.lineTo(r * 1.1, r * 0.5); break;
    case 'arrow': g.moveTo(0, r * 1.1); g.lineTo(-r, -r * 0.4); g.lineTo(-r * 0.4, -r * 0.2); g.lineTo(-r * 0.5, -r); g.lineTo(0, -r * 0.5); g.lineTo(r * 0.5, -r); g.lineTo(r * 0.4, -r * 0.2); g.lineTo(r, -r * 0.4); g.closePath(); break;
    case 'dart': g.moveTo(0, r * 1.2); g.lineTo(-r * 0.6, -r); g.lineTo(0, -r * 0.5); g.lineTo(r * 0.6, -r); g.closePath(); break;
    case 'gunner': g.moveTo(-r, -r * 0.6); g.lineTo(r, -r * 0.6); g.lineTo(r * 0.8, r * 0.4); g.lineTo(r * 0.25, r * 0.4); g.lineTo(r * 0.25, r); g.lineTo(-r * 0.25, r); g.lineTo(-r * 0.25, r * 0.4); g.lineTo(-r * 0.8, r * 0.4); g.closePath(); break;
    case 'star': for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * TAU / 10, rr = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); break;
    case 'hex': poly(6, r, 0); g.moveTo(r * 0.5, 0); g.arc(0, 0, r * 0.5, 0, TAU); break;
    case 'crystal': g.moveTo(0, r * 1.2); g.lineTo(-r * 0.7, r * 0.1); g.lineTo(-r * 0.4, -r); g.lineTo(r * 0.4, -r); g.lineTo(r * 0.7, r * 0.1); g.closePath(); g.moveTo(-r * 0.7, r * 0.1); g.lineTo(r * 0.7, r * 0.1); g.moveTo(0, r * 1.2); g.lineTo(0, -r); break;
    case 'warden': poly(8, r, 0); g.moveTo(r * 0.45, 0); g.arc(0, 0, r * 0.45, 0, TAU); g.moveTo(-r * 1.4, -r * 0.2); g.lineTo(-r, -r * 0.4); g.lineTo(-r, r * 0.4); g.closePath(); g.moveTo(r * 1.4, -r * 0.2); g.lineTo(r, -r * 0.4); g.lineTo(r, r * 0.4); g.closePath(); break;
    case 'hive': poly(6, r, 0); g.moveTo(r * 0.6, 0); poly(6, r * 0.6, 0); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } break;
    case 'lancer': g.moveTo(0, r * 1.4); g.lineTo(-r * 0.4, r * 0.2); g.lineTo(-r * 1.2, -r * 0.2); g.lineTo(-r * 0.7, -r * 0.8); g.lineTo(0, -r * 0.4); g.lineTo(r * 0.7, -r * 0.8); g.lineTo(r * 1.2, -r * 0.2); g.lineTo(r * 0.4, r * 0.2); g.closePath(); g.moveTo(0, r * 1.4); g.lineTo(0, -r * 0.4); break;
    case 'dread': g.moveTo(-r * 1.3, -r * 0.5); g.lineTo(r * 1.3, -r * 0.5); g.lineTo(r * 1.1, r * 0.3); g.lineTo(r * 0.4, r * 0.8); g.lineTo(-r * 0.4, r * 0.8); g.lineTo(-r * 1.1, r * 0.3); g.closePath(); g.moveTo(r * 0.35, 0); g.arc(0, 0, r * 0.35, 0, TAU); break;
    case 'prism': poly(3, r, Math.PI / 2); g.moveTo(0, 0); poly(3, r * 0.55, -Math.PI / 2); break;
    case 'sovereign': for (let i = 0; i < 16; i++) { const a = i * TAU / 16, rr = i % 2 ? r * 0.7 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.moveTo(r * 0.4, 0); g.arc(0, 0, r * 0.4, 0, TAU); g.moveTo(r * 0.18, 0); g.arc(0, 0, r * 0.18, 0, TAU); break;
    case 'shard': g.moveTo(0, r * 1.3); g.lineTo(-r * 0.45, 0); g.lineTo(0, -r * 1.1); g.lineTo(r * 0.45, 0); g.closePath(); g.moveTo(-r * 0.95, -r * 0.35); g.lineTo(-r * 0.45, 0); g.moveTo(r * 0.95, -r * 0.35); g.lineTo(r * 0.45, 0); break;
    case 'mine': star(8, r, r * 0.68, 0); circ(0, 0, r * 0.35); break;
    case 'split': poly(4, r, 0); g.moveTo(0, -r); g.lineTo(0, r); g.moveTo(-r, 0); g.lineTo(r, 0); break;
    case 'bomber': g.moveTo(-r * 1.2, -r * 0.3); g.lineTo(0, -r * 0.8); g.lineTo(r * 1.2, -r * 0.3); g.lineTo(r * 0.6, r * 0.6); g.lineTo(-r * 0.6, r * 0.6); g.closePath(); circ(0, r * 0.1, r * 0.3); break;
    case 'carrier': g.moveTo(-r, -r * 0.7); g.lineTo(r, -r * 0.7); g.lineTo(r * 1.1, r * 0.2); g.lineTo(r * 0.5, r * 0.8); g.lineTo(-r * 0.5, r * 0.8); g.lineTo(-r * 1.1, r * 0.2); g.closePath(); g.moveTo(-r * 0.5, r * 0.1); g.lineTo(r * 0.5, r * 0.1); g.moveTo(-r * 0.3, r * 0.45); g.lineTo(r * 0.3, r * 0.45); break;
    case 'orb': circ(0, 0, r * 0.6); g.moveTo(-r * 1.1, 0); g.lineTo(-r * 0.6, 0); g.moveTo(r * 1.1, 0); g.lineTo(r * 0.6, 0); g.moveTo(0, r * 1.1); g.lineTo(0, r * 0.6); circ(0, 0, r * 0.22); break;
    case 'sniper': g.moveTo(0, r * 1.5); g.lineTo(-r * 0.3, r * 0.2); g.lineTo(-r, -r * 0.6); g.lineTo(0, -r * 0.3); g.lineTo(r, -r * 0.6); g.lineTo(r * 0.3, r * 0.2); g.closePath(); break;
    case 'phase': poly(5, r, Math.PI / 2); g.moveTo(0, -r * 0.5); poly(5, r * 0.5, -Math.PI / 2); break;
    case 'jugg': poly(8, r, Math.PI / 8); g.moveTo(r * 0.55, 0); poly(8, r * 0.55, Math.PI / 8); circ(0, 0, r * 0.22); break;
    case 'sentinel': star(4, r, r * 0.4, 0); circ(0, 0, r * 0.35); break;
    case 'cloak': g.moveTo(0, r); g.quadraticCurveTo(-r * 1.4, -r * 0.2, -r * 0.6, -r); g.lineTo(0, -r * 0.5); g.lineTo(r * 0.6, -r); g.quadraticCurveTo(r * 1.4, -r * 0.2, 0, r); g.closePath(); break;
    case 'snow': g.moveTo(r * 0.32, 0); poly(6, r * 0.32, 0); for (let i = 0; i < 6; i++) { const a = i * TAU / 6, c = Math.cos(a), sn = Math.sin(a); g.moveTo(c * r * 0.32, sn * r * 0.32); g.lineTo(c * r, sn * r); for (const m of [0.55, 0.78]) for (const d of [0.55, -0.55]) { g.moveTo(c * r * m, sn * r * m); g.lineTo(c * r * m + Math.cos(a + d) * r * 0.25, sn * r * m + Math.sin(a + d) * r * 0.25); } } break;
    case 'glacier': star(6, r, r * 0.72, 0); g.moveTo(r * 0.45, 0); poly(6, r * 0.45, 0); break;
    case 'claw': g.moveTo(0, r * 0.6); g.lineTo(-r * 0.5, r * 1.2); g.lineTo(-r * 1.2, r * 0.2); g.lineTo(-r * 0.9, -r * 0.8); g.lineTo(0, -r * 0.5); g.lineTo(r * 0.9, -r * 0.8); g.lineTo(r * 1.2, r * 0.2); g.lineTo(r * 0.5, r * 1.2); g.closePath(); circ(0, 0, r * 0.3); break;
    case 'leviathan': g.moveTo(r * 1.25, 0); g.ellipse(0, 0, r * 1.25, r * 0.75, 0, 0, TAU); g.moveTo(-r * 0.6, r * 0.72); g.lineTo(-r * 0.3, r * 1.2); g.lineTo(0, r * 0.75); g.lineTo(r * 0.3, r * 1.2); g.lineTo(r * 0.6, r * 0.72); circ(-r * 0.45, -r * 0.1, r * 0.15); circ(r * 0.45, -r * 0.1, r * 0.15); break;
    case 'spore': circ(0, 0, r * 0.7); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; circ(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98, r * 0.18); } break;
    case 'flower': for (let i = 0; i < 6; i++) { const a = i * TAU / 6, cx = Math.cos(a) * r * 0.58, cy = Math.sin(a) * r * 0.58; g.moveTo(cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.45); g.ellipse(cx, cy, r * 0.45, r * 0.22, a, 0, TAU); } circ(0, 0, r * 0.3); break;
    case 'bolt': poly(6, r, 0); g.moveTo(-r * 0.15, -r * 0.7); g.lineTo(r * 0.3, -r * 0.1); g.lineTo(-r * 0.1, 0); g.lineTo(r * 0.2, r * 0.7); break;
    case 'crown': g.moveTo(-r * 1.2, r * 0.6); g.lineTo(-r * 1.2, -r * 0.4); g.lineTo(-r * 0.6, 0); g.lineTo(0, -r * 0.9); g.lineTo(r * 0.6, 0); g.lineTo(r * 1.2, -r * 0.4); g.lineTo(r * 1.2, r * 0.6); g.closePath(); circ(0, r * 0.2, r * 0.25); break;
    case 'knight': g.moveTo(0, r * 1.2); g.lineTo(-r * 0.8, r * 0.3); g.lineTo(-r * 0.8, -r * 0.8); g.lineTo(0, -r * 1.1); g.lineTo(r * 0.8, -r * 0.8); g.lineTo(r * 0.8, r * 0.3); g.closePath(); g.moveTo(0, -r * 1.1); g.lineTo(0, r * 1.2); g.moveTo(-r * 0.8, -r * 0.2); g.lineTo(r * 0.8, -r * 0.2); break;
    case 'kaleido': star(6, r, r * 0.5, 0); g.moveTo(r * 0.5, 0); star(6, r * 0.5, r * 0.25, Math.PI / 6); break;
    case 'graviton': circ(0, 0, r * 0.55); g.moveTo(r * 1.1, 0); g.ellipse(0, 0, r * 1.1, r * 0.35, 0, 0, TAU); circ(0, 0, r * 0.2); break;
    case 'horizon': circ(0, 0, r); circ(0, 0, r * 0.7); circ(0, 0, r * 0.4); g.moveTo(-r * 1.3, 0); g.lineTo(-r, 0); g.moveTo(r, 0); g.lineTo(r * 1.3, 0); break;
    case 'hammer': g.rect(-r * 1.1, -r * 0.9, r * 2.2, r * 0.8); g.rect(-r * 0.25, -r * 0.1, r * 0.5, r * 1.2); break;
    case 'sun': star(12, r, r * 0.75, 0); circ(0, 0, r * 0.5); break;
    case 'wraith': g.moveTo(0, -r); g.quadraticCurveTo(r * 1.2, -r * 0.8, r * 0.9, r * 0.4); g.lineTo(r * 0.5, r * 0.1); g.lineTo(r * 0.3, r * 1.1); g.lineTo(0, r * 0.4); g.lineTo(-r * 0.3, r * 1.1); g.lineTo(-r * 0.5, r * 0.1); g.lineTo(-r * 0.9, r * 0.4); g.quadraticCurveTo(-r * 1.2, -r * 0.8, 0, -r); g.closePath(); circ(-r * 0.3, -r * 0.3, r * 0.12); circ(r * 0.3, -r * 0.3, r * 0.12); break;
    case 'armada': g.moveTo(0, r * 0.9); g.lineTo(-r * 1.3, -r * 0.2); g.lineTo(-r * 0.9, -r * 0.7); g.lineTo(0, -r * 0.3); g.lineTo(r * 0.9, -r * 0.7); g.lineTo(r * 1.3, -r * 0.2); g.closePath(); g.moveTo(-r * 0.9, -r * 0.7); g.lineTo(-r * 1.1, -r * 1.1); g.moveTo(r * 0.9, -r * 0.7); g.lineTo(r * 1.1, -r * 1.1); circ(0, 0, r * 0.25); break;
    case 'herald': star(5, r, r * 0.45); circ(0, 0, r * 0.3); break;
    case 'singularity': star(16, r, r * 0.82, 0); circ(0, 0, r * 0.6); circ(0, 0, r * 0.35); circ(0, 0, r * 0.15); break;
    case 'turret': poly(5, r, -Math.PI / 2); g.moveTo(-r * 0.2, 0); g.lineTo(-r * 0.2, r * 1.3); g.lineTo(r * 0.2, r * 1.3); g.lineTo(r * 0.2, 0); break;
  }
}
const spCache = {};
function shapeSprite(shape, r, color, white) {
  const k = shape + r + color + (white ? 'w' : ''); if (spCache[k]) return spCache[k];
  const pad = 18, sz = r * 3 + pad * 2;
  return spCache[k] = mk(sz, sz, g => {
    g.translate(sz / 2, sz / 2); g.lineJoin = 'round';
    shapePath(g, shape, r);
    g.fillStyle = white ? '#ffffffcc' : color + '33'; g.fill();
    g.shadowColor = color; g.shadowBlur = 14; g.strokeStyle = white ? '#fff' : color; g.lineWidth = 3; g.stroke();
    g.shadowBlur = 0; g.strokeStyle = '#ffffffaa'; g.lineWidth = 1; g.stroke();
  });
}
function drawSp(sp, x, y, rot = 0, sc = 1) {
  if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(sp, -sp.w * sc / 2, -sp.h * sc / 2, sp.w * sc, sp.h * sc); ctx.restore(); }
  else ctx.drawImage(sp, x - sp.w * sc / 2, y - sp.h * sc / 2, sp.w * sc, sp.h * sc);
}
const shipCache = {};
const HULLS = [ // right half, nose first (mirrored)
  [[0,-1.3],[0.35,-0.3],[1.15,0.55],[1.1,0.9],[0.35,0.6],[0.25,0.95]],
  [[0,-1.55],[0.22,-0.5],[0.45,0.1],[0.85,0.75],[0.8,1.05],[0.3,0.72],[0.2,1.05]],
  [[0,-1.3],[0.3,-0.5],[1.05,-0.25],[0.95,0.15],[0.45,0.35],[0.95,1.0],[0.3,0.78],[0.2,1.0]],
  [[0,-1.3],[0.22,-0.6],[0.55,-1.05],[0.68,-0.2],[1.2,0.7],[0.4,0.6],[0.25,1.0]],
  [[0,-1.2],[0.3,-0.5],[1.35,0.05],[1.3,0.45],[0.5,0.5],[0.35,1.0]],
  [[0,-1.1],[0.5,-0.85],[0.7,-0.1],[1.25,0.3],[1.25,0.95],[0.5,0.8],[0.4,1.05]],
  [[0,-1.35],[0.2,-0.6],[0.6,-0.95],[1.25,-0.1],[0.8,0.6],[0.3,0.5],[0.2,1.0]],
  [[0,-1.55],[0.3,-0.6],[0.62,-0.75],[0.6,-0.2],[1.35,0.5],[1.25,0.98],[0.4,0.7],[0.25,1.05]],
];
function shipSprite(id) {
  if (shipCache[id]) return shipCache[id];
  const s = SHIPS[id], R = 24;
  return shipCache[id] = mk(90, 90, g => {
    g.translate(45, 45); g.lineJoin = 'round';
    const pts = HULLS[s.form || 0];
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * R, y * R) : g.moveTo(x * R, y * R)); for (let i = pts.length - 1; i >= 0; i--) if (pts[i][0]) g.lineTo(-pts[i][0] * R, pts[i][1] * R); g.closePath();
    const gr = g.createLinearGradient(0, -R, 0, R); gr.addColorStop(0, s.c2 + 'aa'); gr.addColorStop(1, '#05081a'); g.fillStyle = gr; g.fill();
    g.shadowColor = s.color; g.shadowBlur = 16; g.strokeStyle = s.color; g.lineWidth = 3; g.stroke(); g.shadowBlur = 0;
    g.strokeStyle = '#ffffffbb'; g.lineWidth = 1; g.stroke();
    g.beginPath(); g.moveTo(0, -R * 0.9); g.lineTo(R * 0.18, -R * 0.2); g.lineTo(0, R * 0.1); g.lineTo(-R * 0.18, -R * 0.2); g.closePath(); g.fillStyle = '#e8ffff'; g.shadowColor = '#fff'; g.shadowBlur = 8; g.fill();
    g.shadowBlur = 0; g.strokeStyle = s.color; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-R * 0.8, R * 0.6); g.lineTo(-R * 0.4, R * 0.2); g.moveTo(R * 0.8, R * 0.6); g.lineTo(R * 0.4, R * 0.2); g.stroke();
  });
}
const pBullet = {}; function playerBulletSp(color) { return pBullet[color] || (pBullet[color] = mk(14, 34, g => { const gr = g.createLinearGradient(0, 0, 0, 34); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, color); gr.addColorStop(1, color + '00'); g.fillStyle = gr; g.shadowColor = color; g.shadowBlur = 8; g.beginPath(); g.ellipse(7, 14, 3.2, 12, 0, 0, TAU); g.fill(); })); }
const waveSpC = {}; function waveSprite(color) { return waveSpC[color] || (waveSpC[color] = mk(60, 26, g => { g.translate(30, 22); g.shadowColor = color; g.shadowBlur = 10; g.lineCap = 'round'; g.strokeStyle = color; g.lineWidth = 6; g.beginPath(); g.arc(0, 12, 30, -Math.PI * 0.82, -Math.PI * 0.18); g.stroke(); g.shadowBlur = 0; g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); })); }
const astSpC = {}; function astSprite(seed, r) { const k = seed + '_' + r; return astSpC[k] || (astSpC[k] = mk(r * 2 + 16, r * 2 + 16, g => { g.translate(r + 8, r + 8); let a = seed * 9301 + 49297; const rr = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; }; g.beginPath(); const n = 9; for (let i = 0; i < n; i++) { const t = i * TAU / n, q = r * (0.72 + rr() * 0.3); g.lineTo(Math.cos(t) * q, Math.sin(t) * q); } g.closePath(); g.fillStyle = '#2a1a14'; g.fill(); g.shadowColor = '#ff9a5a'; g.shadowBlur = 8; g.strokeStyle = '#c9805a'; g.lineWidth = 2.5; g.stroke(); g.shadowBlur = 0; g.fillStyle = '#4a2e22'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc((rr() - 0.5) * r, (rr() - 0.5) * r, r * (0.1 + rr() * 0.12), 0, TAU); g.fill(); } })); }
let holeSp = null; function holeSprite() { return holeSp || (holeSp = mk(240, 240, g => { g.translate(120, 120); const gr = g.createRadialGradient(0, 0, 10, 0, 0, 120); gr.addColorStop(0, '#000'); gr.addColorStop(0.2, '#000'); gr.addColorStop(0.26, '#5affd8'); gr.addColorStop(0.4, '#3a0a8a88'); gr.addColorStop(1, '#3a0a8a00'); g.fillStyle = gr; g.fillRect(-120, -120, 240, 240); g.strokeStyle = '#5affd8aa'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(0, 0, 40 + i * 18, i, i + 2.2); g.stroke(); } })); }
const eBulletSp = {}; function enemyBulletSp(color, r) { const k = color + r; return eBulletSp[k] || (eBulletSp[k] = mk(r * 4, r * 4, g => { const c = r * 2; const gr = g.createRadialGradient(c, c, 0, c, c, r * 2); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, '#fff'); gr.addColorStop(0.5, color); gr.addColorStop(1, color + '00'); g.fillStyle = gr; g.fillRect(0, 0, r * 4, r * 4); })); }

// ---------------------------------------------------------------- starfield
let stars = [], nebula = null, nebSector = -1, nebY = 0;
function makeStars() {
  stars = [];
  for (let l = 0; l < 3; l++) for (let i = 0; i < 40 + l * 25; i++) stars.push({ x: Math.random() * VW, y: Math.random() * VH, l, s: [0.6, 1.1, 1.8][l], v: [25, 60, 140][l], tw: Math.random() * TAU });
  nebSector = -1;
}
function makeNebula(si) {
  const sec = SECTORS[si % NSEC];
  nebula = mk(VW, VH, g => {
    g.fillStyle = '#04030c'; g.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 10; i++) {
      const x = rnd(0, VW), y = rnd(0, VH), r = rnd(160, 380), c = sec.neb[i % 2];
      for (const oy of [-VH, 0, VH]) { const gr = g.createRadialGradient(x, y + oy, 0, x, y + oy, r); gr.addColorStop(0, c + '30'); gr.addColorStop(1, c + '00'); g.fillStyle = gr; g.fillRect(x - r, y + oy - r, r * 2, r * 2); }
    }
    if (sec.deco) decorate(g, sec);
  }, 0.5);
  nebSector = si;
}
function decorate(g, sec) {
  const [c1, c2] = sec.neb, tile = fn => { for (const oy of [-VH, 0, VH]) { g.save(); g.translate(0, oy); fn(); g.restore(); } };
  g.lineCap = 'round';
  switch (sec.deco) {
    case 'ice': for (let i = 0; i < 22; i++) { const x = rnd(0, VW), y = rnd(0, VH), l = rnd(20, 70), a = rnd(0, TAU); tile(() => { g.strokeStyle = '#d8f8ff22'; g.lineWidth = rnd(1, 3); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }); } break;
    case 'rocks': for (let i = 0; i < 14; i++) { const x = rnd(0, VW), y = rnd(0, VH), r = rnd(8, 40); tile(() => { g.fillStyle = '#1a0e0a'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#ff8a3d22'; g.lineWidth = 2; g.stroke(); }); } break;
    case 'spores': for (let i = 0; i < 40; i++) { const x = rnd(0, VW), y = rnd(0, VH), r = rnd(2, 6); tile(() => { g.fillStyle = (i % 2 ? c1 : c2) + '55'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); } break;
    case 'bolts': for (let i = 0; i < 6; i++) { let x = rnd(0, VW), y = rnd(0, VH); const pts = [[x, y]]; for (let k = 0; k < 6; k++) { x += rnd(-30, 30); y += rnd(20, 50); pts.push([x, y]); } tile(() => { g.strokeStyle = '#ffe14a26'; g.lineWidth = 2; g.beginPath(); pts.forEach(([a, b], k) => k ? g.lineTo(a, b) : g.moveTo(a, b)); g.stroke(); }); } break;
    case 'grid': tile(() => { g.strokeStyle = '#ff7af01c'; g.lineWidth = 1.5; for (let x = 0; x <= VW; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, VH); g.stroke(); } for (let y = 0; y < VH; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(VW, y); g.stroke(); } }); break;
    case 'rings': { const x = VW * 0.82, y = VH * 0.3; tile(() => { const gr = g.createRadialGradient(x - 30, y - 30, 10, x, y, 110); gr.addColorStop(0, '#2a6f7a'); gr.addColorStop(1, '#06121a'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 110, 0, TAU); g.fill(); g.strokeStyle = '#5affd844'; g.lineWidth = 6; g.beginPath(); g.ellipse(x, y, 190, 40, -0.35, 0, TAU); g.stroke(); }); break; }
    case 'sun': { const x = VW * 0.15, y = VH * 0.18; tile(() => { const gr = g.createRadialGradient(x, y, 20, x, y, 260); gr.addColorStop(0, '#fff2c4aa'); gr.addColorStop(0.25, '#ffb02e66'); gr.addColorStop(1, '#ff3a1a00'); g.fillStyle = gr; g.fillRect(x - 260, y - 260, 520, 520); }); break; }
    case 'fog': for (let i = 0; i < 10; i++) { const x = rnd(0, VW), y = rnd(0, VH), r = rnd(90, 200); tile(() => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, '#000000aa'); gr.addColorStop(1, '#00000000'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }); } break;
    case 'throne': tile(() => { for (let i = 0; i < 14; i++) { const a = Math.PI / 2 + (i - 6.5) * 0.18; g.strokeStyle = (i % 2 ? c1 : c2) + '18'; g.lineWidth = 18; g.beginPath(); g.moveTo(VW / 2, -40); g.lineTo(VW / 2 + Math.cos(a) * 1400, -40 + Math.sin(a) * 1400); g.stroke(); } }); break;
  }
}
function drawBg(dt, si) {
  if (nebSector !== si || !nebula) makeNebula(si);
  nebY = (nebY + dt * 12) % VH;
  ctx.drawImage(nebula, 0, nebY - VH, VW, VH);
  ctx.drawImage(nebula, 0, nebY, VW, VH);
  ctx.fillStyle = '#fff';
  for (const s of stars) {
    s.y += s.v * dt * (warp ? 6 : 1); if (s.y > VH) { s.y -= VH; s.x = Math.random() * VW; }
    s.tw += dt * 3;
    ctx.globalAlpha = (0.35 + 0.25 * s.l) * (0.75 + 0.25 * Math.sin(s.tw));
    if (warp && s.l === 2) ctx.fillRect(s.x, s.y, s.s, s.s * 12); else ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- audio (WebAudio synth)
let AC = null, master = null, noiseBuf = null;
const lastSfx = {};
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = save.muted ? 0 : 0.5; master.connect(AC.destination); } catch (e) { AC = null; }
}
function noise() { if (noiseBuf) return noiseBuf; const n = AC.sampleRate * 1.5; noiseBuf = AC.createBuffer(1, n, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return noiseBuf; }
function sfx(name) {
  if (!AC || save.muted) return;
  const now = AC.currentTime; const gap = { shoot: 0.07, hit: 0.04, coin: 0.05, boom: 0.05, zap: 0.08, laser: 0.12 }[name] || 0;
  if (lastSfx[name] && now - lastSfx[name] < gap) return; lastSfx[name] = now;
  const o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(master);
  const env = (a, d, v) => { g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(v, now + a); g.gain.exponentialRampToValueAtTime(0.0001, now + a + d); o.start(now); o.stop(now + a + d + 0.02); };
  const noiseHit = (dur, v, f) => { const s = AC.createBufferSource(); s.buffer = noise(); const bf = AC.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.setValueAtTime(f, now); bf.frequency.exponentialRampToValueAtTime(80, now + dur); const ng = AC.createGain(); ng.gain.setValueAtTime(v, now); ng.gain.exponentialRampToValueAtTime(0.0001, now + dur); s.connect(bf); bf.connect(ng); ng.connect(master); s.start(now); s.stop(now + dur); };
  switch (name) {
    case 'shoot': o.type = 'square'; o.frequency.setValueAtTime(880, now); o.frequency.exponentialRampToValueAtTime(440, now + 0.05); env(0.003, 0.05, 0.03); break;
    case 'hit': o.type = 'triangle'; o.frequency.setValueAtTime(300, now); env(0.002, 0.03, 0.04); break;
    case 'boom': o.type = 'sawtooth'; o.frequency.setValueAtTime(120, now); o.frequency.exponentialRampToValueAtTime(40, now + 0.25); env(0.005, 0.25, 0.08); noiseHit(0.3, 0.25, 2000); break;
    case 'bigboom': o.type = 'sawtooth'; o.frequency.setValueAtTime(80, now); o.frequency.exponentialRampToValueAtTime(25, now + 1.2); env(0.01, 1.2, 0.2); noiseHit(1.4, 0.5, 3000); break;
    case 'coin': o.type = 'sine'; o.frequency.setValueAtTime(1300, now); o.frequency.setValueAtTime(1750, now + 0.04); env(0.003, 0.09, 0.05); break;
    case 'gem': o.type = 'sine'; o.frequency.setValueAtTime(900, now); o.frequency.exponentialRampToValueAtTime(2400, now + 0.25); env(0.005, 0.3, 0.09); break;
    case 'power': o.type = 'square'; o.frequency.setValueAtTime(300, now); o.frequency.exponentialRampToValueAtTime(1200, now + 0.3); env(0.01, 0.32, 0.06); break;
    case 'hurt': o.type = 'sawtooth'; o.frequency.setValueAtTime(400, now); o.frequency.exponentialRampToValueAtTime(60, now + 0.4); env(0.005, 0.4, 0.15); noiseHit(0.3, 0.2, 1200); break;
    case 'bomb': o.type = 'sine'; o.frequency.setValueAtTime(60, now); o.frequency.exponentialRampToValueAtTime(30, now + 1); env(0.01, 1, 0.3); noiseHit(1.0, 0.5, 5000); break;
    case 'warn': o.type = 'square'; o.frequency.setValueAtTime(220, now); o.frequency.setValueAtTime(330, now + 0.25); o.frequency.setValueAtTime(220, now + 0.5); o.frequency.setValueAtTime(330, now + 0.75); env(0.01, 1.0, 0.06); break;
    case 'laser': o.type = 'sawtooth'; o.frequency.setValueAtTime(200, now); o.frequency.linearRampToValueAtTime(90, now + 0.6); env(0.02, 0.6, 0.06); break;
    case 'win': o.type = 'triangle'; [523, 659, 784, 1046].forEach((f, i) => o.frequency.setValueAtTime(f, now + i * 0.12)); env(0.01, 0.7, 0.1); break;
    case 'zap': o.type = 'sawtooth'; o.frequency.setValueAtTime(1900, now); o.frequency.exponentialRampToValueAtTime(260, now + 0.12); env(0.002, 0.12, 0.035); break;
    case 'click': o.type = 'sine'; o.frequency.setValueAtTime(660, now); env(0.002, 0.06, 0.05); break;
    case 'buy': o.type = 'triangle'; [660, 990, 1320].forEach((f, i) => o.frequency.setValueAtTime(f, now + i * 0.07)); env(0.005, 0.3, 0.08); break;
    default: env(0.001, 0.01, 0.001);
  }
}
function setMuted(m) { save.muted = m; persist(); if (master) master.gain.value = m ? 0 : 0.5; }
// ---------------------------------------------------------------- game state
let state = 'menu'; // menu | play | pause | result
let G = null, player = null, warp = false;
let enemies = [], pBullets = [], eBullets = [], parts = [], pickups = [], missiles = [], lasers = [], floaters = [], later = [], hazards = [], arcsFx = [];
let quietKills = false;
let boss = null, shake = 0, flash = 0;
const after = (t, fn) => later.push({ t, fn });

function calcStats(diff) {
  const u = save.upg, sh = SHIPS[save.ship], d = DIFF[diff];
  const a = u.arsenal;
  const rate = (1 + 0.09 * u.rate) * sh.rate, fireRate = Math.min(rate, 2.2); // past 2.2x, extra fire rate becomes damage (keeps the iPad smooth)
  const arcT = u.arc + (sh.arc ? 4 : 0);
  const st = {
    dmg: (1 + 0.15 * u.dmg) * sh.dmg * rate / fireRate,
    rate, fireRate,
    maxHp: Math.max(1, 3 + u.hull + sh.hp),
    shieldMax: shieldCharges(u.shield), shieldTime: shieldTime(u.shield),
    magnet: magnetRange(u.magnet) + sh.mag,
    drones: Math.min(6, droneCount(u.drones) + sh.drones), droneMul: droneMul(u.drones),
    bombs: bombStart(u.bomb) + sh.bombs, bombDmg: bombDmg(u.bomb),
    missiles: (a >= 13 ? 5 : a >= 9 ? 4 : a >= 7 ? 3 : a >= 5 ? 2 : a >= 2 ? 1 : 0) + (sh.missiles || 0),
    misMul: (a >= 12 ? 1.5 : 1) * (sh.misMul || 1),
    startPow: a >= 16 ? 4 : a >= 8 ? 3 : a >= 4 ? 2 : 1,
    maxPow: a >= 15 ? 8 : a >= 11 ? 7 : a >= 6 ? 6 : 5,
    speed: sh.speed,
    crit: critChance(u.crit), critMul: critMul(u.crit),
    arc: arcT ? arcStats(arcT) : null,
    coinMul: 1 + salvageBonus(u.salvage), cryBonus: 0.002 * u.salvage,
    revives: phoenixLives(u.phoenix),
    evade: sh.evade || 0, pierce: sh.pierce || 0, side: !!sh.side, splash: sh.splash || 0,
  };
  st.startPow = Math.min(st.startPow, st.maxPow);
  if (d.lives) st.maxHp = Math.max(st.maxHp, d.lives);
  return st;
}
function weaponOk(w) { return save.upg.arsenal >= WEAPONS[w].need; }

function startLevel(L, endless = false) {
  audioInit();
  const diff = save.diff;
  const es = endless ? endlessSectors() : null;
  G = { L: endless ? 3 : L, endless, diff, d: DIFF[diff], sector: endless ? es[Math.min(2, es.length - 1)] : Math.floor((L - 1) / 5), time: 0, waveIdx: 0, waveT: 0, queue: [], score: 0, coins: 0, crystals: 0, cores: 0, kills: 0,
    hits: 0, phase: 'waves', phaseT: 0, diveT: 3, endlessWave: 0, scale: endless ? levelScale(3) : levelScale(L), deaths: 0, es };
  G.Lc = Math.min(G.L, 22);
  const st = calcStats(diff); G.st = st;
  player = { x: VW / 2, y: VH - 160, hp: st.maxHp, shield: st.shieldMax, shieldT: 0, inv: 2, pow: st.startPow, fireT: 0, misT: 0, droneT: 0, bombs: st.bombs, alive: true, bank: 0, laserOn: false, revives: st.revives, buff: { rap: 0, vac: 0, slo: 0, inv: 0 }, arcT: 1 };
  enemies = []; pBullets = []; eBullets = []; parts = []; pickups = []; missiles = []; lasers = []; floaters = []; later = []; hazards = []; arcsFx = []; boss = null;
  save.stats.runs++; persist();
  state = 'play'; warp = false; hudCache = '';
  showHud(true); ui('');
  toast(endless ? 'ENDLESS SURVIVAL' : `LEVEL ${L}`, endless ? 'Farm coins &amp; crystals' : SECTORS[G.sector].name.split(' — ')[1]);
}

// ---------------------------------------------------------------- spawning
function spawnEnemy(type, props) {
  const def = EDEF[type];
  const e = Object.assign({ type, def, x: 0, y: -40, r: def.r, hp: def.hp * G.scale * G.d.hp, t: 0, state: 'fall', fireT: rnd(0.5, 2.5), flash: 0, rot: 0, vx: 0, vy: 0, ph: rnd(0, TAU) }, props);
  if (!def.noElite && !def.crystal && (G.L > 15 || (G.endless && G.endlessWave > 15)) && Math.random() < 0.03 + 0.006 * Math.max(0, G.sector - 3)) { e.elite = true; e.hp *= 3; e.r = Math.round(def.r * 1.2); }
  if (def.beh === 'phase') e.pt = rnd(1.5, 3); if (def.beh === 'carrier') e.ct = rnd(2, 4);
  e.maxHp = e.hp; if (enemies.length < 120) enemies.push(e); return e;
}
function queueWave(spec) {
  if (Array.isArray(spec[0])) { spec.forEach(queueWave); return; }
  const [kind, type, a, b, from] = spec;
  const q = (delay, fn) => G.queue.push({ t: G.waveT + delay, fn });
  if (kind === 'form') {
    const cols = a, rows = b, gap = Math.min(62, (VW - 80) / cols);
    let i = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const sx = VW / 2 + (c - (cols - 1) / 2) * gap, sy = 130 + r * 54;
      const fromT = from === 'T', fromL = from === 'L' || (fromT && c < cols / 2);
      const x0 = fromT ? (fromL ? VW * 0.2 : VW * 0.8) : (from === 'L' ? -40 : VW + 40);
      const y0 = fromT ? -40 : 260 + rnd(-20, 20);
      const cx = fromT ? (fromL ? VW * 0.9 : VW * 0.1) : VW / 2, cy = fromT ? 520 : 600;
      q(i * 0.14, () => spawnEnemy(type, { state: 'enter', x: x0, y: y0, path: [x0, y0, cx, cy, sx, sy], dur: 1.7, slotX: sx, slotY: sy }));
      i++;
    }
  } else if (kind === 'stream') {
    const dir = from === 'L' ? 1 : -1, y0 = rnd(150, 340);
    for (let i = 0; i < a; i++) q(i * (type === 'swarmer' ? 0.16 : 0.28), () => spawnEnemy(type, { state: 'stream', x: dir > 0 ? -30 : VW + 30, y: y0, x0: dir > 0 ? -30 : VW + 30, y0, dir, amp: 110, spd: 150 + G.Lc * 4 + (type === 'swarmer' ? 60 : 0) }));
  } else if (kind === 'rain') {
    const d = EDEF[type];
    for (let i = 0; i < a; i++) q(i * Math.max(0.18, 0.45 - G.Lc * 0.015), () => spawnEnemy(type, { state: d.beh === 'zig' ? 'zig' : 'fall', x: rnd(30, VW - 30), y: -30, vy: d.fallV ? d.fallV + rnd(-10, 15) : rnd(150, 210) + G.Lc * 6, zx: (Math.random() < 0.5 ? -1 : 1) * rnd(140, 220) }));
  } else if (kind === 'hover') {
    for (let i = 0; i < a; i++) q(i * 0.5, () => { const tx = VW * (i + 1) / (a + 1); spawnEnemy(type, { state: 'hover', x: tx, y: -40, ty: rnd(150, 330), hx: tx, ph: rnd(0, TAU) }); });
  } else if (kind === 'haz') {
    const gap = { ast: 0.55, storm: 1.4, gate: 3.2, hole: 4 }[type] || 1;
    for (let i = 0; i < a; i++) q(0.4 + i * gap, () => spawnHazard(type));
  } else if (kind === 'mid') {
    q(0.8, () => startBoss(type, true));
  }
}
const ENDLESS_POOL = LEVELS.flatMap(l => l.waves).filter(w => w[0] !== 'mid');
function endlessSectors() { const n = Math.max(3, Math.min(NSEC, Math.floor(highestCleared() / 5))); return Array.from({ length: n }, (_, i) => i); }
function endlessBosses() { const b = ['warden', 'lancer', 'prism', 'hive', 'dread']; for (const s of G.es) if (SECTORS[s].guardian) b.push(SECTORS[s].guardian, SECTORS[s].boss); return b; }
function nextWave() {
  if (G.endless) {
    G.endlessWave++;
    const w = G.endlessWave;
    G.scale = levelScale(3 + w * 0.6); G.L = Math.min(NLEV, 3 + Math.floor(w * 0.6)); G.Lc = Math.min(G.L, 22);
    G.sector = G.es[(Math.min(2, G.es.length - 1) + Math.floor(w / 8)) % G.es.length];
    if (w % 8 === 0) { const pool = endlessBosses(); startBoss(pool[(w / 8 - 1) % pool.length]); return; }
    queueWave(ENDLESS_POOL[Math.floor(Math.random() * Math.min(ENDLESS_POOL.length, 10 + w * 3))]);
    if (w >= 10 && G.es.length > 3 && Math.random() < 0.35) { const hz = (SECTORS[G.sector].haz || []).length ? SECTORS[G.sector].haz : ['ast']; const h = hz[Math.floor(Math.random() * hz.length)]; queueWave(HZ(h, h === 'ast' ? 5 : h === 'storm' ? 3 : 1)); }
    return;
  }
  const lv = LEVELS[G.L - 1];
  if (G.waveIdx < lv.waves.length) { queueWave(lv.waves[G.waveIdx]); G.waveIdx++; }
  else { G.phase = 'warn'; G.phaseT = 0; sfx('warn'); }
}
function startBoss(kind, mid = false) {
  const def = BOSSDEF[kind];
  const scale = G.scale * G.d.hp * (mid ? 0.7 : 1);
  boss = { kind, def, mid, x: VW / 2, y: -120, r: def.r, hp: def.hp * scale, maxHp: def.hp * scale, phase: 0, t: 0, atkT: 2, atkI: 0, enter: true, flash: 0, vx: 60, charge: null, spinA: 0, parts: [], cloakT: 0 };
  if (mid) sfx('warn');
  if (def.turrets && !mid) for (let i = 0; i < def.turrets; i++) boss.parts.push({ ox: (i % 2 ? 1 : -1) * def.r * (i < 2 ? 1.05 : 0.6), oy: i < 2 ? 20 : 70, hp: 260 * scale, maxHp: 260 * scale, r: 22, fireT: 1 + i, flash: 0 });
  G.phase = 'boss';
  toast(def.name, mid ? 'MID-BOSS' : def.mini ? 'Guardian' : 'SECTOR BOSS');
}

// ---------------------------------------------------------------- bullets
function eShot(x, y, ang, spd, r = 6, color = '#ff4fa0') { if (eBullets.length > 700) return null; const b = { x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r, sp: enemyBulletSp(color, r) }; eBullets.push(b); return b; }
function strike(x) { lasers.push({ fixed: true, x0: clamp(x, 20, VW - 20), y0: -20, ang: Math.PI / 2, t: 0, warn: G.diff === 'kid' ? 1.7 : 1.05, on: 0.35, w: 30, col: 'storm' }); sfx('laser'); }
function aimAt(x, y) { return Math.atan2(player.y - y, player.x - x); }
const bspd = () => 230 * G.d.bs * (1 + 0.025 * Math.min(G.L, 18));
function enemyFire(e) {
  const s = bspd();
  switch (e.def.pat) {
    case 'aim': eShot(e.x, e.y + 10, aimAt(e.x, e.y), s * 0.9, 6, '#ff6ad5'); break;
    case 'burst3': { const a = aimAt(e.x, e.y); for (let i = -1; i <= 1; i++) eShot(e.x, e.y + 10, a + i * 0.2, s, 6, '#ffa040'); break; }
    case 'ring': { const n = 8 + Math.floor(G.Lc / 4) * 2, o = Math.random() * TAU; for (let i = 0; i < n; i++) eShot(e.x, e.y, o + i * TAU / n, s * 0.75, 6, '#ffe14a'); break; }
    case 'spread5': for (let i = -2; i <= 2; i++) eShot(e.x, e.y + 20, Math.PI / 2 + i * 0.22, s * 0.85, 8, '#6aa0ff'); break;
    case 'spiral': e.spA = (e.spA || 0) + 0.7; for (let i = 0; i < 4; i++) eShot(e.x, e.y, e.spA + i * TAU / 4, s * 0.8, 6, '#c58bff'); break;
    case 'seed': { const b = eShot(e.x, e.y + 12, aimAt(e.x, e.y), s * 0.5, 9, '#ff7a3d'); if (b) b.split = { t: 0.8, n: G.diff === 'kid' ? 4 : 6, col: '#ffb070' }; break; }
    case 'snipe': e.tele = 0.6; after(0.6, () => { if (!e.dead && player.alive && !e.cloaked) eShot(e.x, e.y + 10, aimAt(e.x, e.y), s * 1.9, 5, '#fff27a'); }); break;
    case 'wall': for (let i = -3; i <= 3; i++) eShot(e.x + i * 22, e.y + 20, Math.PI / 2, s * 0.7, 7, '#5affd8'); break;
    case 'spin2': e.spA = (e.spA || 0) + 0.45; for (let i = 0; i < 2; i++) eShot(e.x, e.y, e.spA + i * Math.PI, s * 0.75, 6, '#ffd54a'); break;
  }
}
const DRONE_POS = [[-46, 14], [46, 14], [0, 44], [-80, 36], [80, 36], [0, -52]];
const droneX = i => DRONE_POS[i % 6][0];
const droneY = i => DRONE_POS[i % 6][1];
function firePlayer(dt) {
  const st = G.st, p = player, sh = SHIPS[save.ship];
  const fdt = dt * (p.buff.rap > 0 ? 1.8 : 1);
  p.fireT -= fdt;
  const w = weaponOk(save.weapon) ? save.weapon : 'blaster';
  const col = sh.color;
  p.laserOn = w === 'laser';
  if (w !== 'laser' && p.fireT <= 0) {
    const dmg = st.dmg, pw = p.pow;
    const ex = b => { if (st.pierce) b.pierce = st.pierce; if (st.splash) b.splash = st.splash; return b; };
    if (w === 'blaster') {
      p.fireT = 0.12 / st.fireRate;
      const gap = pw > 6 ? 9.5 : 11;
      for (let i = 0; i < pw; i++) { const off = (i - (pw - 1) / 2) * gap; const ang = -Math.PI / 2 + (pw >= 4 ? off * 0.004 : 0); pBullets.push(ex({ x: p.x + off, y: p.y - 26, vx: Math.cos(ang) * 950, vy: Math.sin(ang) * 950, dmg, sp: playerBulletSp(col) })); }
    } else if (w === 'spread') {
      p.fireT = 0.12 / st.fireRate;
      const n = [3, 5, 5, 7, 7, 9, 9, 11][pw - 1], arc = [0.35, 0.5, 0.6, 0.75, 0.85, 1.0, 1.05, 1.12][pw - 1];
      for (let i = 0; i < n; i++) { const ang = -Math.PI / 2 + (i / (n - 1) - 0.5) * arc; pBullets.push(ex({ x: p.x, y: p.y - 22, vx: Math.cos(ang) * 850, vy: Math.sin(ang) * 850, dmg: dmg * (0.62 + pw * 0.04), rot: ang + Math.PI / 2, sp: playerBulletSp('#ffe14a') })); }
    } else if (w === 'wave') {
      p.fireT = 0.3 / st.fireRate;
      const offs = pw >= 6 ? [-0.2, 0, 0.2] : pw >= 3 ? [-0.12, 0.12] : [0], k = [1.25, 0.9, 0.75][offs.length - 1];
      for (const o of offs) { const ang = -Math.PI / 2 + o; pBullets.push({ x: p.x, y: p.y - 28, vx: Math.cos(ang) * 720, vy: Math.sin(ang) * 720, dmg: dmg * (1.0 + 0.2 * pw) * k, pierce: 99, wave: 1, w: 24 + pw * 4, rot: o, sp: waveSprite(col) }); }
    } else if (w === 'storm') {
      p.fireT = 0.075 / st.fireRate;
      const n = pw >= 6 ? 3 : pw >= 3 ? 2 : 1;
      for (let i = 0; i < n; i++) pBullets.push(ex({ x: p.x + rnd(-16, 16), y: p.y - 22, vx: rnd(-260, 260), vy: -760, dmg: dmg * (0.4 + 0.045 * pw), home: 1, small: true, sp: playerBulletSp('#b8ffea') }));
    }
    if (st.side) for (const sd of [-1, 1]) { const ang = -Math.PI / 2 + sd * 0.42; pBullets.push(ex({ x: p.x + sd * 14, y: p.y - 10, vx: Math.cos(ang) * 880, vy: Math.sin(ang) * 880, dmg: dmg * 0.55, rot: ang + Math.PI / 2, sp: playerBulletSp(sh.c2) })); }
    sfx('shoot');
  }
  if (st.missiles) {
    p.misT -= fdt;
    if (p.misT <= 0) { p.misT = 0.9 / st.fireRate; for (let i = 0; i < st.missiles; i++) { const side = i % 2 ? 1 : -1; missiles.push({ x: p.x + side * 20, y: p.y, vx: side * 220, vy: -120 - i * 30, dmg: 3.2 * st.dmg * st.misMul, t: 0, target: null }); } }
  }
  if (st.drones) {
    p.droneT -= fdt;
    if (p.droneT <= 0) { p.droneT = 0.2 / st.fireRate; for (let i = 0; i < st.drones; i++) pBullets.push({ x: p.x + droneX(i), y: p.y + droneY(i) - 8, vx: 0, vy: -900, dmg: 0.6 * st.dmg * st.droneMul, sp: playerBulletSp('#9dff6a'), small: true }); }
  }
  if (st.arc) { p.arcT -= fdt; if (p.arcT <= 0) { p.arcT = st.arc.cd; fireArc(); } }
}
function fireArc() {
  const a = G.st.arc, p = player, hit = [], pts = [[p.x, p.y - 24]];
  let fx = p.x, fy = p.y - 24, range = a.range;
  for (let j = 0; j <= a.jumps; j++) {
    let best = null, bd = range * range;
    for (const e of enemies) { if (e.dead || e.cloaked || e.y < 0 || hit.includes(e)) continue; const d = (e.x - fx) ** 2 + (e.y - fy) ** 2; if (d < bd) { bd = d; best = e; } }
    if (!best) break;
    hit.push(best); pts.push([best.x, best.y]); fx = best.x; fy = best.y; range = 230;
    damageEnemy(best, critRoll(a.dmg * G.st.dmg, best.x, best.y));
  }
  if (!hit.length && boss && !boss.enter && !boss.dying) { pts.push([boss.x, boss.y]); damageBoss(a.dmg * G.st.dmg * (1 + a.jumps * 0.25)); }
  if (pts.length > 1) { arcsFx.push({ pts, life: 0.18 }); sfx('zap'); }
}
function critRoll(d, x, y) {
  if (G.st.crit && Math.random() < G.st.crit) { if (Math.random() < 0.04) floater(x, y - 10, 'CRIT', '#ff8a8a'); return d * G.st.critMul; }
  return d;
}
function nearestTarget(x, y) {
  let best = null, bd = 1e12;
  for (const e of enemies) { if (e.dead || e.cloaked || e.y < 0) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
  return best || (boss && !boss.enter && !boss.dying ? boss : null);
}

// ---------------------------------------------------------------- effects
function burst(x, y, color, n = 16, spd = 220, size = 14, life = 0.6) {
  for (let i = 0; i < n && parts.length < 900; i++) { const a = Math.random() * TAU, v = spd * (0.3 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.6), max: life, sz: size * (0.5 + Math.random() * 0.8), sp: glow(color, 16) }); }
}
function ring(x, y, color, r) { parts.push({ ring: true, x, y, r: 4, rmax: r, life: 0.45, max: 0.45, color }); }
function floater(x, y, text, color) { floaters.push({ x, y, text, color, life: 1 }); }
let toastEl = null;
function toast(a, b = '') {
  if (toastEl) toastEl.remove();
  toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.innerHTML = a + (b ? `<div style="font-size:18px;color:#9fe9ff;margin-top:6px">${b}</div>` : '');
  document.body.appendChild(toastEl); const el = toastEl; setTimeout(() => { el.style.transition = 'opacity .5s'; el.style.opacity = 0; setTimeout(() => el.remove(), 600); }, 1600);
}

// ---------------------------------------------------------------- drops & kills
function dropPickups(x, y, coins, isElite) {
  const v = Math.ceil((1 + G.L * 0.45) * G.d.reward * (G.endless ? 1.3 : 1) * rewardMul(G.L) * G.st.coinMul);
  for (let i = 0; i < coins; i++) pickups.push({ k: 'coin', x: x + rnd(-10, 10), y: y + rnd(-10, 10), vx: rnd(-80, 80), vy: rnd(-160, -40), val: v, t: 0 });
  if (isElite || Math.random() < 0.022 * (1 + G.L * 0.05) + G.st.cryBonus) pickups.push({ k: 'cry', x, y, vx: rnd(-50, 50), vy: -120, val: 1, t: 0 });
  if (isElite === 2 && Math.random() < 0.35) pickups.push({ k: 'core', x, y, vx: rnd(-50, 50), vy: -140, val: 1, t: 0 });
  const r = Math.random(), kb = G.diff === 'kid' ? 1.6 : 1;
  const mkp = k => pickups.push({ k, x, y, vx: rnd(-40, 40), vy: -80, t: 0 });
  if (r < 0.045 * kb) mkp('pow'); else if (r < 0.065 * kb) mkp('shd'); else if (r < 0.08 * kb) mkp('hp'); else if (r < 0.09 * kb) mkp('bmb');
  else if (G.L > 15 || G.endless) { const q = r - 0.09 * kb; if (q < 0.006 * kb) mkp('rap'); else if (q < 0.011 * kb) mkp('vac'); else if (q < 0.015 * kb) mkp('slo'); else if (q < 0.018 * kb) mkp('inv'); }
}
function killEnemy(e) {
  e.dead = true; G.kills++; save.stats.kills++;
  G.score += e.def.score * (G.diff === 'hard' ? 2 : 1) * (e.elite ? 3 : 1);
  burst(e.x, e.y, e.elite ? '#ffd54a' : e.def.color, 18, 260, 16); ring(e.x, e.y, e.def.color, e.r * 2.2); sfx('boom');
  dropPickups(e.x, e.y, e.def.coin * (e.elite ? 3 : 1), e.elite ? 2 : e.def.crystal);
  if (quietKills) return;
  if (e.def.split) for (const sd of [-1, 1]) spawnEnemy(e.def.split, { state: 'fall', x: e.x + sd * 10, y: e.y, vx: sd * 120, vy: 190 });
  if (e.def.deathRing) { const n = G.diff === 'kid' ? 4 : e.def.deathRing, o = Math.random() * TAU; for (let i = 0; i < n; i++) eShot(e.x, e.y, o + i * TAU / n, bspd() * 0.55, 6, '#ff7a7a'); }
}
function hitAst(h, d) {
  if (h.dead) return;
  h.hp -= d; h.flash = 0.06;
  if (h.hp > 0) return;
  h.dead = true; burst(h.x, h.y, '#c9805a', 16, 220, 14); sfx('boom'); G.score += 30;
  if (Math.random() < 0.6) dropPickups(h.x, h.y, 1, false);
  if (h.r > 28 && !quietKills) for (const sd of [-1, 1]) hazards.push({ k: 'ast', x: h.x + sd * 12, y: h.y, vx: sd * rnd(60, 110), vy: h.vy * 0.9, r: Math.round(h.r * 0.55), hp: 4 * G.scale * G.d.hp, rot: 0, vr: rnd(-2, 2), seed: Math.floor(rnd(0, 4)), flash: 0 });
}
function spawnHazard(kind, opt) {
  if (!G || hazards.length > 40) return;
  const kid = G.diff === 'kid';
  if (kind === 'ast') { const r = Math.round(rnd(16, 38) / 4) * 4; hazards.push({ k: 'ast', x: rnd(30, VW - 30), y: -45, vx: rnd(-40, 40), vy: rnd(90, 150) * (kid ? 0.7 : 1), r, hp: (r > 28 ? 14 : 6) * G.scale * G.d.hp, rot: rnd(0, TAU), vr: rnd(-1.5, 1.5), seed: Math.floor(rnd(0, 4)), flash: 0 }); }
  else if (kind === 'gate') { const gw = kid ? 300 : Math.max(150, 210 - Math.max(0, G.sector - 7) * 12); hazards.push({ k: 'gate', y: -20, gap: rnd(gw / 2 + 20, VW - gw / 2 - 20), gw, vy: kid ? 80 : 115, drift: G.sector >= 9 ? rnd(-60, 60) : 0, t: 0 }); sfx('warn'); }
  else if (kind === 'hole') { const o = opt || {}; if (hazards.some(h => h.k === 'hole')) return; hazards.push({ k: 'hole', x: o.x ?? rnd(110, VW - 110), y: o.y ?? -80, vy: o.y != null ? 0 : 60, life: 11, t: 0, pull: kid ? 60 : 140, R: 260, core: 24 }); }
  else if (kind === 'storm') { strike(Math.random() < 0.5 && player ? player.x : rnd(30, VW - 30)); }
}
function updateHazards(dt) {
  const p = player;
  for (const h of hazards) {
    h.t = (h.t || 0) + dt;
    if (h.k === 'ast') {
      h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; h.flash -= dt;
      if (h.x < h.r || h.x > VW - h.r) h.vx = -h.vx;
      if (h.y > VH + 60) h.dead = true;
      else if (p.alive && Math.hypot(p.x - h.x, p.y - h.y) < h.r * 0.85 + 8) { if (p.buff.inv > 0 || !G.d.body) hitAst(h, 1e9); else { hurtPlayer(); hitAst(h, 1e9); } }
    } else if (h.k === 'gate') {
      h.y += h.vy * dt;
      if (h.drift) { h.gap += h.drift * dt; const lo = h.gw / 2 + 10, hi = VW - h.gw / 2 - 10; if (h.gap < lo || h.gap > hi) { h.drift = -h.drift; h.gap = clamp(h.gap, lo, hi); } }
      if (p.alive && !h.hit && Math.abs(p.y - h.y) < 12 && Math.abs(p.x - h.gap) > h.gw / 2 - 8) { h.hit = true; hurtPlayer(); }
      if (h.y > VH + 30) h.dead = true;
    } else if (h.k === 'hole') {
      h.y += h.vy * dt; if (h.vy && h.y > 320) h.vy = 10;
      h.life -= dt; if (h.life <= 0 || h.y > VH + 120) { h.dead = true; continue; }
      const fade = Math.min(1, h.t / 0.8, h.life / 0.8);
      if (p.alive && G.phase !== 'outro') {
        const dx = h.x - p.x, dy = h.y - p.y, d = Math.hypot(dx, dy) || 1;
        if (d < h.R) { const f = h.pull * fade * (1 - d / h.R) * dt * 1.6; p.x = clamp(p.x + dx / d * f, 22, VW - 22); p.y = clamp(p.y + dy / d * f, 120, VH - 40); }
        if (d < h.core + 8 && fade > 0.5) hurtPlayer();
      }
      for (const b of eBullets) { const dx = h.x - b.x, dy = h.y - b.y, d2 = dx * dx + dy * dy; if (d2 < h.R * h.R) { const d = Math.sqrt(d2) || 1; b.vx += dx / d * 170 * dt; b.vy += dy / d * 170 * dt; if (d < h.core) b.dead = true; } }
      for (const k of pickups) { const dx = h.x - k.x, dy = h.y - k.y, d = Math.hypot(dx, dy) || 1; if (d < h.R && !k.vac) { k.vx += dx / d * 300 * dt; k.vy += dy / d * 300 * dt; } }
    }
  }
  hazards = hazards.filter(h => !h.dead);
}
function damageEnemy(e, dmg) { e.hp -= dmg; e.flash = 0.06; if (e.hp <= 0 && !e.dead) killEnemy(e); }
function damageBoss(dmg, hx, hy) {
  if (!boss || boss.enter || boss.dying || boss.cloakT > 0) return;
  for (const t of boss.parts) if (t.hp > 0 && hx !== undefined && Math.hypot(hx - (boss.x + t.ox), hy - (boss.y + t.oy)) < t.r + 10) {
    t.hp -= dmg; t.flash = 0.06;
    if (t.hp <= 0) { burst(boss.x + t.ox, boss.y + t.oy, '#ff9a3d', 40, 320, 20); sfx('boom'); shake = 10; dropPickups(boss.x + t.ox, boss.y + t.oy, 8, true); }
    return;
  }
  if (boss.parts.some(t => t.hp > 0)) { boss.flash = 0.02; return; } // core shielded while turrets live
  boss.hp -= dmg; boss.flash = 0.05;
  const nph = boss.def.phases.length, th = 1 - (boss.phase + 1) / nph;
  if (boss.phase < nph - 1 && boss.hp / boss.maxHp < th) { boss.phase++; boss.atkI = 0; boss.atkT = 1.2; ring(boss.x, boss.y, '#ffffff', 300); shake = 12; sfx('warn'); eBullets.length = 0; }
  if (boss.hp <= 0) bossDie();
}
function bossDie() {
  boss.dying = 2.2; eBullets.length = 0; lasers = []; later = []; sfx('bigboom'); shake = 25; flash = 0.6;
  const mid = boss.mid, mini = boss.def.mini;
  G.score += mid ? 1500 : mini ? 2000 : 8000;
  save.stats.bosses++;
  const cr = mid ? 2 : mini ? 2 + Math.floor(Math.random() * 2) : 8 + 4 * G.sector;
  for (let i = 0; i < cr; i++) pickups.push({ k: 'cry', x: boss.x + rnd(-40, 40), y: boss.y + rnd(-40, 40), vx: rnd(-120, 120), vy: rnd(-200, -60), val: 1, t: 0 });
  if (G.L > 15 || (G.endless && G.endlessWave >= 24)) {
    const co = mid ? 1 : mini ? 1 + (Math.random() < 0.5 ? 1 : 0) : 3 + Math.floor(Math.max(0, G.sector - 3) / 2);
    for (let i = 0; i < co; i++) pickups.push({ k: 'core', x: boss.x + rnd(-40, 40), y: boss.y + rnd(-40, 40), vx: rnd(-120, 120), vy: rnd(-200, -60), val: 1, t: 0 });
  }
  dropPickups(boss.x, boss.y, mid ? 18 : mini ? 25 : 60, false);
  quietKills = true; enemies.forEach(e => { if (!e.dead) killEnemy(e); }); quietKills = false;
}
// ---------------------------------------------------------------- boss AI
function bossAttack(name) {
  const b = boss, s = bspd();
  const fan = (n, spr, sp, col) => { if (!boss || boss.dying) return; const a = aimAt(b.x, b.y); for (let i = 0; i < n; i++) eShot(b.x, b.y + b.r * 0.6, a + (i - (n - 1) / 2) * spr, sp, 7, col); };
  const ringN = (n, sp, col, off = Math.random() * TAU) => { if (!boss || boss.dying) return; for (let i = 0; i < n; i++) eShot(b.x, b.y, off + i * TAU / n, sp, 7, col); };
  const wall = sp => { if (!boss || boss.dying) return; const gap = rnd(90, VW - 90), gw = G.diff === 'kid' ? 220 : 140; for (let x = 18; x < VW; x += 34) if (Math.abs(x - gap) > gw / 2) eShot(x, b.y + b.r * 0.5, Math.PI / 2, sp * 0.55, 7, '#ffb02e'); };
  switch (name) {
    case 'fan5': fan(5, 0.18, s, '#ffa040'); after(0.35, () => fan(5, 0.18, s, '#ffa040')); return 1.4;
    case 'fan7': fan(7, 0.15, s * 1.05, '#ffa040'); after(0.3, () => fan(7, 0.15, s, '#ffa040')); return 1.4;
    case 'fan9': fan(9, 0.13, s * 1.1, '#ff6ad5'); return 1.1;
    case 'ring12': ringN(12, s * 0.8, '#4ff3ff'); return 1.3;
    case 'ring16': ringN(16, s * 0.8, '#4ff3ff'); after(0.4, () => ringN(16, s * 0.8, '#4ff3ff')); return 1.6;
    case 'ring16r': for (let k = 0; k < 4; k++) after(k * 0.22, () => ringN(16, s * 0.75, '#c58bff', k * 0.1)); return 1.8;
    case 'ring20': ringN(20, s * 0.85, '#ffe14a'); return 1.3;
    case 'ring24': ringN(24, s * 0.9, '#ff5ad1'); after(0.3, () => ringN(24, s * 0.9, '#ff5ad1')); return 1.4;
    case 'spiralS': b.spiral = { t: 1.5, arms: 2, rate: 0.06, step: 0.32 }; return 2.2;
    case 'spiral': b.spiral = { t: 2.5, arms: 3, rate: 0.07, step: 0.27 }; return 3.0;
    case 'spiral2': b.spiral = { t: 3.0, arms: 4, rate: 0.065, step: 0.23, dbl: true }; return 3.4;
    case 'summon': {
      const k = b.def.minion || (G.sector >= 2 ? 'kamikaze' : 'drone'), d = EDEF[k], n = d.sp === 'hover' ? 2 : 4;
      if (enemies.length > 60) return 1;
      for (let i = 0; i < n; i++) { const x = b.x + (i - (n - 1) / 2) * 40;
        if (d.sp === 'hover') spawnEnemy(k, { state: 'hover', x, y: b.y, ty: rnd(260, 360), hx: clamp(x, 60, VW - 60), ph: rnd(0, TAU) });
        else spawnEnemy(k, k === 'drone' ? { state: 'dive', x, y: b.y + 30, vy: 170, vx: (i - 1.5) * 40 } : { state: d.beh === 'zig' ? 'zig' : 'fall', x, y: b.y + 30, vy: 170, vx: (i - 1.5) * 40, zx: (i % 2 ? 1 : -1) * 160 }); }
      return 1.4; }
    case 'shards': { const a = aimAt(b.x, b.y); for (let i = 0; i < 9; i++) { const x = eShot(b.x, b.y + b.r * 0.5, a + (i - 4) * 0.16, s * 0.35, 6, '#bff4ff'); if (x) { x.acc = 1.6; x.maxV = s * 1.45; } } return 1.5; }
    case 'iceRing': { const o = Math.random() * TAU; for (let i = 0; i < 20; i++) { const x = eShot(b.x, b.y, o + i * TAU / 20, s * 0.25, 7, '#8fe8ff'); if (x) { x.acc = 1.3; x.maxV = s * 1.15; } } return 1.6; }
    case 'rockfall': for (let i = 0; i < 4 + Math.min(4, Math.max(0, G.sector - 4)); i++) after(i * 0.25, () => spawnHazard('ast')); return 1.8;
    case 'seeds': for (let i = 0; i < 5; i++) { const x = eShot(b.x, b.y + b.r * 0.4, Math.PI / 2 + (i - 2) * 0.35, s * 0.5, 10, '#9dff6a'); if (x) x.split = { t: 0.9 + i * 0.05, n: G.diff === 'kid' ? 5 : 8, col: '#c8ff4a' }; } return 1.8;
    case 'bloom': for (let k = 0; k < 3; k++) after(k * 0.25, () => ringN(14, s * (0.55 + k * 0.15), ['#5dff8a', '#c8ff4a', '#ff7af0'][k], k * 0.22)); return 1.8;
    case 'lightning': strike(player.x); strike(rnd(40, VW - 40)); strike(rnd(40, VW - 40)); return 2.0;
    case 'lightning5': strike(player.x); for (let i = 0; i < 4; i++) strike((i + 0.5) * VW / 4 + rnd(-40, 40)); return 2.4;
    case 'gate': spawnHazard('gate'); fan(5, 0.2, s, '#ff7af0'); return 1.4;
    case 'hole': spawnHazard('hole', { x: rnd(120, VW - 120), y: rnd(400, 520) }); ringN(12, s * 0.6, '#5affd8'); return 1.4;
    case 'wall': wall(s); after(0.65, () => wall(s)); return 1.9;
    case 'nova': ringN(32, s * 0.7, '#ffffff'); after(0.35, () => ringN(32, s * 0.85, b.def.color, 0.1)); return 1.8;
    case 'cross': b.spiral = { t: 2.4, arms: 4, rate: 0.05, step: 0.16 }; return 2.8;
    case 'mirror': { const mx = VW - b.x, a1 = aimAt(b.x, b.y), a2 = aimAt(mx, b.y); for (let i = -3; i <= 3; i++) { eShot(b.x, b.y + 20, a1 + i * 0.14, s, 7, '#ff7af0'); eShot(mx, b.y + 20, a2 + i * 0.14, s, 7, '#2af0ff'); } burst(mx, b.y, '#2af0ff', 20, 200, 14); return 1.5; }
    case 'blink': b.cloakT = 1.1; after(1.1, () => { if (!boss || boss.dying) return; burst(b.x, b.y, b.def.color, 24, 260, 16); b.x = rnd(120, VW - 120); b.y = rnd(170, 280); fan(9, 0.13, s * 1.05, '#7dfff0'); }); return 2.0;
    case 'laser1': lasers.push({ aimX: player.x, ang: Math.PI / 2, t: 0, warn: 0.9, on: 0.7, w: 26 }); sfx('laser'); return 1.9;
    case 'laser3': [-0.35, 0, 0.35].forEach(o => lasers.push({ ang: Math.PI / 2 + o, t: 0, warn: 1.0, on: 0.7, w: 22 })); sfx('laser'); return 2.1;
    case 'laser5': [-0.6, -0.3, 0, 0.3, 0.6].forEach(o => lasers.push({ ang: Math.PI / 2 + o, t: 0, warn: 1.0, on: 0.7, w: 20 })); sfx('laser'); return 2.2;
    case 'laserSweep': lasers.push({ ang: Math.PI / 2 - 0.7, sweep: 0.9, t: 0, warn: 0.8, on: 1.6, w: 24 }); sfx('laser'); return 2.8;
    case 'charge': b.charge = { t: 0, tx: player.x, ty: Math.min(player.y - 60, VH - 220), ox: b.x, oy: b.y }; return 2.4;
    case 'teleport': burst(b.x, b.y, b.def.color, 30, 300, 16); b.x = rnd(120, VW - 120); b.y = rnd(160, 300); burst(b.x, b.y, b.def.color, 30, 300, 16); ringN(12, s * 0.7, '#c58bff'); return 0.9;
  }
  return 1;
}
function updateBoss(dt) {
  const b = boss; b.t += dt; b.flash -= dt;
  if (b.dying) {
    b.dying -= dt; if (Math.random() < 0.5) { burst(b.x + rnd(-b.r, b.r), b.y + rnd(-b.r, b.r), b.def.color, 10, 200, 18); sfx('boom'); }
    if (b.dying <= 0) { burst(b.x, b.y, '#ffffff', 80, 500, 26, 1.2); ring(b.x, b.y, b.def.color, 500); boss = null; G.phaseT = 0; if (G.endless || b.mid) { G.phase = 'waves'; G.waveT = 0; } else G.phase = 'outro'; }
    return;
  }
  if (b.enter) { b.y += (200 - b.y) * dt * 1.6; if (b.y > 190) b.enter = false; return; }
  if (b.cloakT > 0) b.cloakT -= dt;
  if (b.charge) {
    const c = b.charge; c.t += dt;
    if (c.t < 0.5) b.x += (Math.random() - 0.5) * 6;
    else if (c.t < 1.0) { const k = (c.t - 0.5) / 0.5; b.x = c.ox + (c.tx - c.ox) * k; b.y = c.oy + (c.ty - c.oy) * k * k; }
    else if (c.t < 1.8) { if (!c.burst) { c.burst = 1; for (let i = 0; i < 14; i++) eShot(b.x, b.y, i * TAU / 14, bspd() * 0.7, 7, '#ff3b4e'); shake = 8; } const k = (c.t - 1.0) / 0.8; b.y = c.ty + (200 - c.ty) * k; b.x = c.tx + (c.ox - c.tx) * k; }
    else b.charge = null;
  } else {
    b.x += b.vx * dt * (1 + b.phase * 0.4); if (b.x < 110 || b.x > VW - 110) { b.vx = -b.vx; b.x = clamp(b.x, 110, VW - 110); }
    b.y += (200 + Math.sin(b.t * 0.8) * 30 - b.y) * dt;
  }
  if (b.spiral) {
    const sp = b.spiral; sp.t -= dt; sp.acc = (sp.acc || 0) + dt;
    const rate = sp.rate / (G.diff === 'kid' ? 0.5 : 1);
    while (sp.acc > rate) { sp.acc -= rate; b.spinA += sp.step; for (let i = 0; i < sp.arms; i++) { eShot(b.x, b.y, b.spinA + i * TAU / sp.arms, bspd() * 0.7, 6, '#ff5ad1'); if (sp.dbl) eShot(b.x, b.y, -b.spinA * 1.1 + i * TAU / sp.arms, bspd() * 0.6, 6, '#4ff3ff'); } }
    if (sp.t <= 0) b.spiral = null;
  }
  for (const t of b.parts) { if (t.hp <= 0) continue; t.flash -= dt; t.fireT -= dt * G.d.fire; if (t.fireT <= 0) { t.fireT = 1.3; const x = b.x + t.ox, y = b.y + t.oy, a = aimAt(x, y); for (let i = -1; i <= 1; i++) eShot(x, y + 20, a + i * 0.16, bspd(), 6, '#ff9a3d'); } }
  b.atkT -= dt * (G.diff === 'kid' ? 0.6 : G.diff === 'hard' ? 1.2 : 1) * (G.L > 10 ? 1.15 : 1);
  if (b.atkT <= 0 && !b.charge) { const list = b.def.phases[b.phase]; const name = list[b.atkI % list.length]; b.atkI++; b.atkT = bossAttack(name); }
  if (G.d.body && player.alive && Math.hypot(player.x - b.x, player.y - b.y) < b.r * 0.8) hurtPlayer();
}

// ---------------------------------------------------------------- player damage / bomb
function hurtPlayer() {
  const p = player; if (p.inv > 0 || p.buff.inv > 0 || !p.alive || G.phase === 'outro') return;
  if (p.shield > 0) { p.shield--; p.inv = 1.0; ring(p.x, p.y, '#57e9ff', 80); sfx('hit'); p.shieldT = 0; return; }
  p.hp--; G.hits++; p.inv = 2.0; shake = 10; flash = 0.25; sfx('hurt');
  burst(p.x, p.y, SHIPS[save.ship].color, 30, 300, 16);
  if (G.diff !== 'kid') p.pow = Math.max(1, p.pow - 1);
  eBullets = eBullets.filter(b => Math.hypot(b.x - p.x, b.y - p.y) > 160);
  if (p.hp <= 0) {
    if (G.d.infinite) { p.hp = G.st.maxHp; G.deaths++; toast('Keep going!', 'You got this, pilot!'); eBullets.length = 0; p.inv = 3; }
    else if (p.revives > 0) { p.revives--; p.hp = Math.max(1, Math.ceil(G.st.maxHp * phoenixHeal(save.upg.phoenix))); p.inv = 3; eBullets.length = 0; ring(p.x, p.y, '#ffb02e', 420); burst(p.x, p.y, '#ffb02e', 50, 380, 20, 1); toast('PHOENIX REVIVE', p.revives + ' left'); sfx('power'); }
    else { p.alive = false; burst(p.x, p.y, '#ffffff', 60, 420, 22, 1); sfx('bigboom'); G.phase = 'dead'; G.phaseT = 0; }
  }
}
function useBomb() {
  if (state !== 'play' || !player || !player.alive || player.bombs <= 0) return;
  player.bombs--; sfx('bomb'); flash = 0.7; shake = 18;
  eBullets.forEach((b, i) => { if (i % 3 === 0) burst(b.x, b.y, '#ffb070', 1, 60, 10, 0.4); }); eBullets.length = 0; lasers = lasers.filter(l => l.t < l.warn); lasers.forEach(l => l.t = 0);
  ring(player.x, player.y, '#ffffff', 900);
  const dmg = G.st.bombDmg * G.st.dmg;
  quietKills = true; enemies.forEach(e => { if (!e.dead && e.y > -20) damageEnemy(e, dmg); }); quietKills = false;
  hazards.forEach(h => { if (h.k === 'ast') { quietKills = true; hitAst(h, 1e9); quietKills = false; } else if (h.k === 'gate') { h.dead = true; burst(h.gap, h.y, '#ff7af0', 20, 260, 14); } });
  if (boss && !boss.enter && !boss.dying) { boss.parts.forEach(t => { if (t.hp > 0) { t.hp -= dmg * 2; if (t.hp <= 0) burst(boss.x + t.ox, boss.y + t.oy, '#ff9a3d', 40, 300, 20); } }); damageBoss(dmg * 2.5); }
  player.inv = Math.max(player.inv, 1.2);
}

// ---------------------------------------------------------------- update
function bez(p, k) { const u = 1 - k; return [u * u * p[0] + 2 * u * k * p[2] + k * k * p[4], u * u * p[1] + 2 * u * k * p[3] + k * k * p[5]]; }
function update(dt) {
  const dtReal = dt;
  G.time += dt; G.waveT += dt;
  const p = player, st = G.st;
  if (shake > 0) shake = Math.max(0, shake - dt * 40);
  if (flash > 0) flash -= dt;
  for (const l of later) { l.t -= dt; if (l.t <= 0) { l.done = true; l.fn(); } }
  later = later.filter(l => !l.done);
  if (p.alive) {
    const kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    if (kx || ky) { p.x += kx * 520 * st.speed * dt; p.y += ky * 520 * st.speed * dt; }
    if (G.phase !== 'outro') { p.x = clamp(p.x, 22, VW - 22); p.y = clamp(p.y, 120, VH - 40); }
    p.bank += (((p.x - (p.px ?? p.x)) / Math.max(dt, 0.001)) / 900 - p.bank) * Math.min(1, dt * 10); p.px = p.x;
    p.inv -= dt;
    if (st.shieldMax && p.shield < st.shieldMax) { p.shieldT += dt; if (p.shieldT >= st.shieldTime) { p.shieldT = 0; p.shield++; ring(p.x, p.y, '#57e9ff', 60); } }
    if (G.phase !== 'outro') firePlayer(dt); else p.laserOn = false;
    for (const k in p.buff) if (p.buff[k] > 0) p.buff[k] -= dt;
    if (Math.random() < 0.6) parts.push({ x: p.x + rnd(-4, 4), y: p.y + 24, vx: rnd(-20, 20), vy: rnd(160, 260), life: 0.25, max: 0.25, sz: 12, sp: glow(SHIPS[save.ship].c2, 16) });
  }
  if (G.phase === 'waves') {
    for (let i = G.queue.length - 1; i >= 0; i--) if (G.waveT >= G.queue[i].t) { const f = G.queue[i].fn; G.queue.splice(i, 1); f(); }
    const alive = enemies.length;
    if (G.queue.length === 0 && (alive <= (G.L > 8 ? 3 : 1) || G.waveT > 26) && G.waveT > 1.5 && G.phase === 'waves') { G.waveT = 0; nextWave(); }
  } else if (G.phase === 'warn') {
    G.phaseT += dt; if (G.phaseT > 2.4 && (enemies.length === 0 || G.phaseT > 6)) startBoss(LEVELS[G.L - 1].boss);
  } else if (G.phase === 'boss') {
    if (boss) updateBoss(dt);
  } else if (G.phase === 'outro') {
    G.phaseT += dt; if (G.phaseT > 1.2) warp = true;
    pickups.forEach(k => k.vac = true);
    if (G.phaseT > 1.6 && pickups.length === 0) p.y -= 500 * dt * G.phaseT;
    if (G.phaseT > 3.4) finishRun(true);
  } else if (G.phase === 'dead') {
    G.phaseT += dt; if (G.phaseT > 2) finishRun(false);
  }
  if (G.phase === 'waves' || G.phase === 'boss') {
    G.diveT -= dt * (0.8 + G.Lc * 0.05);
    if (G.diveT <= 0) { G.diveT = rnd(1.5, 3.2) / (G.diff === 'kid' ? 0.5 : 1); const c = enemies.filter(e => e.state === 'hold' && (e.def.dive || G.L > 6)); if (c.length) { const e = c[Math.floor(Math.random() * c.length)]; e.state = 'dive'; e.vy = 180 + G.Lc * 8; e.vx = 0; e.t = 0; } }
  }
  if (hazards.length) updateHazards(dt);
  const slow = p.buff.slo > 0 ? 0.5 : 1;
  const sway = Math.sin(G.time * 0.7) * 34;
  for (const e of enemies) {
    if (e.dead) continue;
    const dt = dtReal * slow;
    e.t += dt; e.flash -= dt;
    switch (e.state) {
      case 'enter': { const k = Math.min(1, e.t / e.dur); const [x, y] = bez(e.path, k * k * (3 - 2 * k)); if (k < 1) e.rot = Math.atan2(y - e.y, x - e.x) - Math.PI / 2; e.x = x; e.y = y; if (k >= 1) { e.state = 'hold'; e.rot = 0; } break; }
      case 'hold': e.x += (e.slotX + sway - e.x) * Math.min(1, dt * 4); e.y += (e.slotY + Math.sin(G.time * 2 + e.slotX) * 5 - e.y) * Math.min(1, dt * 4); break;
      case 'dive': e.vx += clamp(player.x - e.x, -1, 1) * 260 * dt; e.vx = clamp(e.vx, -220, 220); e.x += e.vx * dt; e.y += e.vy * dt; e.rot = Math.atan2(e.vy, e.vx) - Math.PI / 2;
        if (e.y > VH + 40) { if (e.slotX === undefined) e.dead = true; else { e.state = 'enter'; e.t = 0; e.path = [e.slotX, -40, VW / 2, 60, e.slotX, e.slotY]; e.dur = 1.4; e.x = e.slotX; e.y = -40; } } break;
      case 'stream': e.x = e.x0 + e.dir * e.spd * e.t; e.y = e.y0 + Math.sin(e.t * 2.2) * e.amp + e.t * 22; e.rot = e.dir * 0.3; if (e.x < -60 || e.x > VW + 60 || e.y > VH + 60) e.dead = true; break;
      case 'zig': e.zt = (e.zt || 0) + dt; if (e.zt > 0.55) { e.zt = 0; e.zx = -e.zx; } e.x += e.zx * dt; if (e.x < 20 || e.x > VW - 20) { e.zx = -e.zx; e.x = clamp(e.x, 20, VW - 20); } e.y += e.vy * dt; e.rot = Math.atan2(e.vy, e.zx * 0.4) - Math.PI / 2; if (e.y > VH + 50) e.dead = true; break;
      case 'fall': if (e.def.beh === 'spin') { e.x += (e.vx || 0) * dt; e.y += e.vy * dt; e.rot += dt * 1.5; if (e.y > VH + 50) e.dead = true; break; }
        if (e.def.homing && e.y < player.y - 80) { e.vx = (e.vx || 0) + clamp(player.x - e.x, -1, 1) * 380 * dt * (G.diff === 'kid' ? 0.3 : 1); e.vx = clamp(e.vx, -260, 260); e.vy += 120 * dt; } e.x += (e.vx || 0) * dt; e.y += e.vy * dt; e.rot = Math.atan2(e.vy, e.vx || 0) - Math.PI / 2; if (e.y > VH + 50) e.dead = true; break;
      case 'hover': {
        const bh = e.def.beh;
        if (!e.arrived) { if (e.y < e.ty) e.y += 160 * dt; else e.arrived = true; }
        if (bh === 'orbit') { e.x = e.hx + Math.cos(G.time * 1.3 + e.ph) * Math.min(150, VW * 0.2); if (e.arrived) e.y = e.ty + Math.sin(G.time * 1.3 + e.ph) * 45; }
        else e.x = e.hx + Math.sin(G.time * 0.9 + e.ph) * Math.min(160, VW * 0.22);
        if (e.type === 'spinner' || e.type === 'sentinel') e.rot += dt * 2;
        if (bh === 'phase' && e.arrived) { e.pt -= dt; if (e.pt <= 0) { burst(e.x, e.y, e.def.color, 12, 200, 12); e.hx = rnd(80, VW - 80); e.ty = rnd(140, 330); e.y = e.ty; e.x = e.hx + Math.sin(G.time * 0.9 + e.ph) * Math.min(160, VW * 0.22); burst(e.x, e.y, e.def.color, 12, 200, 12); e.pt = rnd(2.2, 3.4); } }
        if (bh === 'cloak') e.cloaked = Math.sin(e.t * 1.2 + e.ph) > 0.3;
        if (bh === 'carrier' && e.arrived) { e.ct -= dt; if (e.ct <= 0) { e.ct = G.diff === 'kid' ? 6 : 3.6; if (enemies.length < 80) for (const sd of [-1, 1]) spawnEnemy('swarmer', { state: 'fall', x: e.x + sd * 20, y: e.y + 20, vx: sd * 60, vy: 200 }); } }
        break; }
    }
    if (e.tele > 0) e.tele -= dt;
    if (e.def.fire && e.y > 30 && e.y < VH * 0.65 && player.alive && e.state !== 'enter' && !e.cloaked) {
      e.fireT -= dt * G.d.fire * (1 + G.Lc * 0.04);
      if (e.fireT <= 0) { e.fireT = rnd(0.7, 1.3) / e.def.fire; enemyFire(e); }
    }
    if (player.alive && Math.hypot(e.x - player.x, e.y - player.y) < e.r + 10) { if (p.buff.inv > 0) damageEnemy(e, 60 * st.dmg); else if (G.d.body) { hurtPlayer(); damageEnemy(e, 40 * st.dmg); } else damageEnemy(e, 999); }
  }
  enemies = enemies.filter(e => !e.dead);
  // player laser weapon
  if (p.alive && p.laserOn) {
    const w = 10 + p.pow * 4 + (save.ship === 'phantom' ? 6 : 0), dps = 10.5 * st.rate * st.dmg * (0.75 + 0.3 * p.pow) * (1 + st.crit * (st.critMul - 1)) * (p.buff.rap > 0 ? 1.6 : 1);
    p.laserW = w;
    for (const h of hazards) if (h.k === 'ast' && Math.abs(h.x - p.x) < w + h.r * 0.6 && h.y < p.y) hitAst(h, dps * dt);
    for (const e of enemies) if (!e.cloaked && Math.abs(e.x - p.x) < w + e.r * 0.6 && e.y < p.y) { damageEnemy(e, dps * dt); if (Math.random() < 0.2) burst(e.x, e.y + e.r * 0.5, '#ff5ad1', 1, 120, 10, 0.3); }
    if (boss && !boss.enter) {
      let hitPart = false;
      for (const t of boss.parts) if (t.hp > 0 && Math.abs(boss.x + t.ox - p.x) < w + t.r) { damageBoss(dps * dt, boss.x + t.ox, boss.y + t.oy); hitPart = true; }
      if (!hitPart && Math.abs(boss.x - p.x) < w + boss.r * 0.8) damageBoss(dps * dt);
    }
  }
  // player bullets
  for (const b of pBullets) {
    if (b.home) {
      b.t = (b.t || 0) + dt; if (b.t > 2.2) { b.dead = true; continue; }
      const tg = b.tg;
      if (!tg || tg.dead || tg.dying || (tg.kind && tg !== boss) || tg.cloaked) { b.scan = (b.scan || 0) - dt; if (b.scan <= 0) { b.scan = 0.15; b.tg = nearestTarget(b.x, b.y); } }
      if (b.tg && !b.tg.dead) { const a = Math.atan2(b.tg.y - b.y, b.tg.x - b.x); b.vx += (Math.cos(a) * 900 - b.vx) * Math.min(1, dt * 6); b.vy += (Math.sin(a) * 900 - b.vy) * Math.min(1, dt * 6); }
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < -30 || b.y > VH + 30 || b.x < -30 || b.x > VW + 30) { b.dead = true; continue; }
    const bw = b.w || 4;
    for (const e of enemies) {
      if (e.dead || e.cloaked || Math.abs(b.x - e.x) >= e.r + bw || Math.abs(b.y - e.y) >= e.r + 8) continue;
      if (b.hitE && b.hitE.includes(e)) continue;
      const dm = critRoll(b.dmg, b.x, b.y);
      damageEnemy(e, dm); burst(b.x, b.y, e.def.color, 2, 100, 8, 0.2);
      if (b.splash) for (const o of enemies) if (o !== e && !o.dead && Math.abs(o.x - e.x) < b.splash && Math.abs(o.y - e.y) < b.splash) damageEnemy(o, dm * 0.35);
      if (b.pierce > 0) { b.pierce--; (b.hitE || (b.hitE = [])).push(e); } else { b.dead = true; break; }
    }
    if (!b.dead && hazards.length) for (const h of hazards) if (h.k === 'ast' && !h.dead && Math.abs(b.x - h.x) < h.r + bw && Math.abs(b.y - h.y) < h.r + 6) { hitAst(h, b.dmg); if (!b.wave) { b.dead = true; break; } }
    if (!b.dead && boss && !boss.enter && !boss.dying) {
      for (const t of boss.parts) if (t.hp > 0 && Math.hypot(b.x - boss.x - t.ox, b.y - boss.y - t.oy) < t.r + 8) { damageBoss(critRoll(b.dmg, b.x, b.y), b.x, b.y); b.dead = true; break; }
      if (!b.dead && boss && Math.abs(b.x - boss.x) < boss.r * 0.9 + (b.wave ? bw * 0.5 : 0) && Math.abs(b.y - boss.y) < boss.r * 0.8 && !(boss.cloakT > 0)) { damageBoss(critRoll(b.dmg, b.x, b.y)); b.dead = true; burst(b.x, b.y, boss ? boss.def.color : '#fff', 2, 120, 8, 0.2); if (Math.random() < 0.3) sfx('hit'); }
    }
  }
  pBullets = pBullets.filter(b => !b.dead);
  // homing missiles
  for (const m of missiles) {
    m.t += dt;
    if (!m.target || m.target.dead || (m.target === boss && (!boss || boss.dying)) || (m.target.def && !enemies.includes(m.target))) {
      let best = null, bd = 1e9; for (const e of enemies) { if (e.cloaked) continue; const d = (e.x - m.x) ** 2 + (e.y - m.y) ** 2; if (d < bd && e.y > 0) { bd = d; best = e; } }
      m.target = best || (boss && !boss.enter && !boss.dying ? boss : null);
    }
    const tg = m.target;
    if (tg && m.t > 0.15) { const a = Math.atan2(tg.y - m.y, tg.x - m.x); m.vx += (Math.cos(a) * 620 - m.vx) * Math.min(1, dt * 5); m.vy += (Math.sin(a) * 620 - m.vy) * Math.min(1, dt * 5); }
    else m.vy -= 700 * dt;
    m.x += m.vx * dt; m.y += m.vy * dt;
    if (Math.random() < 0.7) parts.push({ x: m.x, y: m.y, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.3, max: 0.3, sz: 9, sp: glow('#ff9a3d', 16) });
    if (m.y < -40 || m.y > VH + 40 || m.x < -40 || m.x > VW + 40 || m.t > 4) { m.dead = true; continue; }
    if (tg && Math.hypot(tg.x - m.x, tg.y - m.y) < (tg.r || 20) * 0.9) { m.dead = true; burst(m.x, m.y, '#ff9a3d', 8, 160, 12, 0.3); const md = critRoll(m.dmg, m.x, m.y); if (tg === boss) damageBoss(md); else damageEnemy(tg, md); }
  }
  missiles = missiles.filter(m => !m.dead);
  // enemy bullets
  const hitR = G.d.hit, bdt = dt * slow, splits = [];
  for (const b of eBullets) {
    if (b.dead) continue;
    if (b.acc) { const v = Math.hypot(b.vx, b.vy); if (v < b.maxV) { const k = 1 + b.acc * bdt; b.vx *= k; b.vy *= k; } }
    b.x += b.vx * bdt; b.y += b.vy * bdt;
    if (b.split) { b.split.t -= bdt; if (b.split.t <= 0) { b.dead = true; splits.push(b); continue; } }
    if (b.y > VH + 20 || b.y < -40 || b.x < -20 || b.x > VW + 20) { b.dead = true; continue; }
    if (p.alive && p.inv <= 0) { const dx = b.x - p.x, dy = b.y - p.y, rr = hitR + b.r * (G.diff === 'kid' ? 0.3 : 0.7); if (dx * dx + dy * dy < rr * rr) { b.dead = true; if (st.evade && Math.random() < st.evade) { if (Math.random() < 0.4) floater(p.x, p.y - 30, 'PHASED', '#c4fff2'); } else hurtPlayer(); } }
  }
  for (const b of splits) { const o = Math.random() * TAU, sp = Math.hypot(b.vx, b.vy) * 0.3 + bspd() * 0.45; for (let i = 0; i < b.split.n; i++) eShot(b.x, b.y, o + i * TAU / b.split.n, sp, 6, b.split.col); burst(b.x, b.y, b.split.col, 6, 120, 10, 0.3); }
  eBullets = eBullets.filter(b => !b.dead);
  // boss lasers
  for (const l of lasers) {
    l.t += dt;
    if (boss && !l.fixed) { l.x0 = boss.x; l.y0 = boss.y + boss.r * 0.5; if (l.aimX !== undefined && l.t < l.warn * 0.6) l.ang = Math.atan2(VH - l.y0, l.aimX - l.x0); }
    if (l.sweep && l.t > l.warn) l.ang += l.sweep * dt * (G.diff === 'kid' ? 0.4 : 1);
    if (l.t > l.warn && l.t < l.warn + l.on && p.alive && p.inv <= 0 && l.x0 !== undefined) {
      const dx = p.x - l.x0, dy = p.y - l.y0, ca = Math.cos(l.ang), sa = Math.sin(l.ang), along = dx * ca + dy * sa, perp = Math.abs(-dx * sa + dy * ca);
      if (along > 0 && perp < l.w * 0.5 * (G.diff === 'kid' ? 0.4 : 0.8) + hitR) hurtPlayer();
    }
    if (l.t > l.warn + l.on || (!boss && !l.fixed)) l.dead = true;
  }
  lasers = lasers.filter(l => !l.dead);
  // pickups
  const mag = st.magnet;
  for (const k of pickups) {
    k.t += dt;
    const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy) || 1;
    if (p.buff.vac > 0 && p.alive) k.vac = true;
    if (p.alive && (d < mag || k.vac)) { const sp = 700 + (k.vac ? 600 : 0); k.vx += (dx / d * sp - k.vx) * Math.min(1, dt * 8); k.vy += (dy / d * sp - k.vy) * Math.min(1, dt * 8); }
    else { k.vy = Math.min(k.vy + 260 * dt, 140); k.vx *= 0.98; }
    k.x += k.vx * dt; k.y += k.vy * dt;
    if (p.alive && d < 30) { k.dead = true; collect(k); }
    if (k.y > VH + 30) k.dead = true;
  }
  pickups = pickups.filter(k => !k.dead);
  for (const q of parts) { q.life -= dt; if (!q.ring) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.97; q.vy *= 0.97; } else q.r += (q.rmax - q.r) * dt * 8; }
  parts = parts.filter(q => q.life > 0);
  for (const a of arcsFx) a.life -= dt;
  if (arcsFx.length) arcsFx = arcsFx.filter(a => a.life > 0);
  for (const f of floaters) { f.life -= dt; f.y -= 50 * dt; }
  floaters = floaters.filter(f => f.life > 0);
}
function collect(k) {
  const p = player;
  switch (k.k) {
    case 'coin': G.coins += k.val; sfx('coin'); break;
    case 'cry': G.crystals += k.val; sfx('gem'); floater(k.x, k.y, '+CRYSTAL', '#c58bff'); break;
    case 'pow': if (p.pow < G.st.maxPow) { p.pow++; floater(k.x, k.y, 'POWER UP!', '#57e9ff'); } else { G.score += 500; floater(k.x, k.y, '+500', '#57e9ff'); } sfx('power'); break;
    case 'shd': p.shield = Math.min(p.shield + 1, G.st.shieldMax + 2); floater(k.x, k.y, 'SHIELD', '#57e9ff'); sfx('power'); break;
    case 'hp': p.hp = Math.min(G.st.maxHp, p.hp + 1); floater(k.x, k.y, '+HULL', '#ff4d7a'); sfx('power'); break;
    case 'bmb': p.bombs = Math.min(9, p.bombs + 1); floater(k.x, k.y, '+BOMB', '#ff9a3d'); sfx('power'); break;
    case 'core': G.cores += k.val; sfx('gem'); floater(k.x, k.y, '+CORE', '#5dffc8'); break;
    case 'rap': p.buff.rap = 8; floater(k.x, k.y, 'RAPID FIRE!', '#ffe14a'); sfx('power'); break;
    case 'vac': p.buff.vac = 8; floater(k.x, k.y, 'MEGA MAGNET!', '#5dffc8'); sfx('power'); break;
    case 'slo': p.buff.slo = 6; floater(k.x, k.y, 'TIME WARP!', '#b8a6ff'); sfx('power'); break;
    case 'inv': p.buff.inv = 5; floater(k.x, k.y, 'INVINCIBLE!', '#ffffff'); sfx('power'); break;
  }
}
// ---------------------------------------------------------------- render
const PICK = { pow: ['P', '#57e9ff'], shd: ['S', '#3fa0ff'], hp: ['+', '#ff4d7a'], bmb: ['B', '#ff9a3d'], rap: ['R', '#ffe14a'], vac: ['M', '#5dffc8'], slo: ['T', '#b8a6ff'], inv: ['★', '#ffffff'] };
const pickSpCache = {};
function pickSprite(k) {
  if (pickSpCache[k]) return pickSpCache[k];
  if (k === 'coin') return pickSpCache[k] = mk(22, 22, g => { g.translate(11, 11); g.shadowColor = '#ffb800'; g.shadowBlur = 8; g.fillStyle = '#ffd54a'; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill(); g.shadowBlur = 0; g.strokeStyle = '#fff6c0'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.stroke(); });
  if (k === 'core') return pickSpCache[k] = mk(32, 32, g => { g.translate(16, 16); g.shadowColor = '#5dffc8'; g.shadowBlur = 12; g.fillStyle = '#c8fff0'; g.strokeStyle = '#11c890'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); } g.closePath(); g.fill(); g.stroke(); g.shadowBlur = 0; g.fillStyle = '#11c890'; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); });
  if (k === 'cry') return pickSpCache[k] = mk(30, 30, g => { g.translate(15, 15); g.shadowColor = '#c58bff'; g.shadowBlur = 12; g.fillStyle = '#e2c8ff'; g.strokeStyle = '#a050ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, -2); g.lineTo(0, 11); g.lineTo(-8, -2); g.closePath(); g.fill(); g.stroke(); });
  const [t, c] = PICK[k];
  return pickSpCache[k] = mk(44, 44, g => { g.translate(22, 22); g.shadowColor = c; g.shadowBlur = 14; g.strokeStyle = c; g.lineWidth = 3; g.fillStyle = c + '44'; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); } g.closePath(); g.fill(); g.stroke(); g.shadowBlur = 4; g.fillStyle = '#fff'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 0, 1); });
}
function render(dt) {
  ctx.setTransform(S * DPR, 0, 0, S * DPR, 0, 0);
  if (shake > 0) ctx.translate(rnd(-shake, shake) * 0.5, rnd(-shake, shake) * 0.5);
  drawBg(dt, G ? G.sector : menuSector);
  if (!G || state === 'menu') { drawMenuShip(dt); return; }
  if (hazards.length) drawHazards();
  for (const k of pickups) drawSp(pickSprite(k.k), k.x, k.y, k.k === 'coin' ? 0 : Math.sin(k.t * 3) * 0.3, k.k === 'coin' ? 1 + 0.15 * Math.sin(k.t * 10) : 1);
  for (const e of enemies) {
    const al = e.cloaked ? 0.16 : 1, sc = e.r / e.def.r;
    ctx.globalAlpha = al;
    if (e.def.crystal || e.elite) { ctx.globalCompositeOperation = 'lighter'; drawSp(glow(e.elite ? '#ffd54a' : '#c58bff', 30), e.x, e.y, 0, (1.4 + 0.2 * Math.sin(G.time * 6)) * sc); ctx.globalCompositeOperation = 'source-over'; }
    drawSp(shapeSprite(e.def.shape, e.def.r, e.def.color), e.x, e.y, e.rot || 0, sc); if (e.flash > 0) { ctx.globalAlpha = 0.55 * al; drawSp(shapeSprite(e.def.shape, e.def.r, e.def.color, true), e.x, e.y, e.rot || 0, sc); }
    ctx.globalAlpha = 1;
    if (e.tele > 0 && player.alive) { ctx.strokeStyle = `rgba(255,240,120,${0.25 + 0.4 * Math.sin(e.tele * 40) ** 2})`; ctx.lineWidth = 1.5; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(player.x, player.y); ctx.stroke(); ctx.setLineDash([]); }
    if ((e.def.hp >= 10 || e.elite) && e.hp < e.maxHp && !e.cloaked) { ctx.fillStyle = '#0008'; ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2, 4); ctx.fillStyle = e.elite ? '#ffd54a' : e.def.color; ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2 * Math.max(0, e.hp / e.maxHp), 4); }
  }
  if (boss) drawBoss();
  for (const l of lasers) {
    if (l.x0 === undefined) continue;
    const len = 1400, ex = l.x0 + Math.cos(l.ang) * len, ey = l.y0 + Math.sin(l.ang) * len;
    ctx.lineCap = 'round';
    const stc = l.col === 'storm';
    if (l.t < l.warn) { ctx.strokeStyle = stc ? `rgba(255,230,90,${0.35 + 0.35 * Math.sin(l.t * 30)})` : `rgba(255,60,90,${0.3 + 0.3 * Math.sin(l.t * 30)})`; ctx.lineWidth = stc ? 3 : 2; ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.moveTo(l.x0, l.y0); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]); if (stc) { ctx.fillStyle = 'rgba(255,230,90,0.08)'; ctx.fillRect(l.x0 - l.w * 0.6, 0, l.w * 1.2, VH); } }
    else if (stc) { ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(l.x0, l.y0); for (let y = 40; y < VH + 40; y += 40) ctx.lineTo(l.x0 + rnd(-l.w * 0.5, l.w * 0.5), y); ctx.strokeStyle = '#4f9bff88'; ctx.lineWidth = l.w * 1.4; ctx.stroke(); ctx.strokeStyle = '#bfe0ff'; ctx.lineWidth = l.w * 0.45; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
    else { ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.moveTo(l.x0, l.y0); ctx.lineTo(ex, ey); ctx.strokeStyle = '#ff2a5a66'; ctx.lineWidth = l.w * 1.8; ctx.stroke(); ctx.strokeStyle = '#ff7a9a'; ctx.lineWidth = l.w * 0.7; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = l.w * 0.25; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
  }
  const p = player;
  ctx.globalCompositeOperation = 'lighter';
  if (p.alive && p.laserOn) {
    const w = p.laserW || 14;
    const gr = ctx.createLinearGradient(p.x - w, 0, p.x + w, 0); gr.addColorStop(0, '#ff2ad400'); gr.addColorStop(0.3, '#ff2ad488'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(0.7, '#ff2ad488'); gr.addColorStop(1, '#ff2ad400');
    ctx.fillStyle = gr; ctx.globalAlpha = 0.85 + 0.15 * Math.sin(G.time * 40); ctx.fillRect(p.x - w, 0, w * 2, p.y - 24); ctx.globalAlpha = 1;
    drawSp(glow('#ff5ad1', 30), p.x, p.y - 26, 0, 1 + 0.2 * Math.sin(G.time * 30));
  }
  for (const b of pBullets) { if (b.wave) drawSp(b.sp, b.x, b.y, b.rot, b.w / 30); else if (b.rot) drawSp(b.sp, b.x, b.y, b.rot); else if (b.small) ctx.drawImage(b.sp, b.x - 5, b.y - 12, 10, 24); else ctx.drawImage(b.sp, b.x - 7, b.y - 17, 14, 34); }
  for (const m of missiles) drawSp(glow('#ffb070', 14), m.x, m.y);
  for (const a of arcsFx) {
    ctx.globalAlpha = Math.min(1, a.life / 0.1); ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i < a.pts.length; i++) { const [x, y] = a.pts[i]; if (!i) { ctx.moveTo(x, y); continue; } const [px, py] = a.pts[i - 1]; for (let k = 1; k <= 3; k++) ctx.lineTo(px + (x - px) * k / 4 + rnd(-12, 12), py + (y - py) * k / 4 + rnd(-12, 12)); ctx.lineTo(x, y); }
    ctx.strokeStyle = '#8a7aff'; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const q of parts) {
    const a = Math.max(0, q.life / q.max); ctx.globalAlpha = a;
    if (q.ring) { ctx.strokeStyle = q.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.stroke(); }
    else { const s = q.sz * (0.5 + a * 0.5); ctx.drawImage(q.sp, q.x - s, q.y - s, s * 2, s * 2); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (p.alive && state !== 'result' && p.y > -60) {
    const sh = SHIPS[save.ship];
    for (let i = 0; i < G.st.drones; i++) drawSp(shapeSprite('dart', 9, '#9dff6a'), p.x + droneX(i) + Math.sin(G.time * 3 + i) * 3, p.y + droneY(i), Math.PI);
    if (p.buff.inv > 0) { ctx.globalCompositeOperation = 'lighter'; drawSp(glow('#ffe7a0', 40), p.x, p.y, 0, 1.6 + 0.2 * Math.sin(G.time * 12)); ctx.globalCompositeOperation = 'source-over'; }
    if (!(p.inv > 0 && p.buff.inv <= 0 && Math.floor(G.time * 20) % 2)) {
      ctx.globalCompositeOperation = 'lighter'; drawSp(glow(sh.c2, 20), p.x, p.y + 26, 0, 0.9 + Math.random() * 0.4); ctx.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1 - Math.min(0.35, Math.abs(p.bank) * 0.5), 1); ctx.drawImage(shipSprite(save.ship), -45, -45, 90, 90); ctx.restore();
    }
    if (p.shield > 0) { ctx.globalAlpha = 0.35 + 0.15 * Math.sin(G.time * 5); ctx.strokeStyle = '#57e9ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, 40, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    if (G.diff !== 'kid') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y + 2, 3, 0, TAU); ctx.fill(); }
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const b of eBullets) { const s = b.r * 2; ctx.drawImage(b.sp, b.x - s, b.y - s, s * 2, s * 2); }
  ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'center'; ctx.font = 'bold 18px -apple-system,sans-serif';
  for (const f of floaters) { ctx.globalAlpha = Math.min(1, f.life * 2); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); }
  ctx.globalAlpha = 1;
  if (boss && !boss.dying) {
    const w = VW - 120, x = 60, y = 100, k = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = '#000a'; ctx.fillRect(x, y, w, 12); ctx.fillStyle = boss.def.color; ctx.fillRect(x, y, w * k, 12);
    ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, 12);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px -apple-system,sans-serif'; ctx.fillText(boss.def.name + (boss.parts.some(t => t.hp > 0) ? ' — DESTROY THE TURRETS' : ''), VW / 2, y - 6);
  }
  if (G.phase === 'warn') { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(G.time * 10); ctx.fillStyle = '#ff2a5a'; ctx.font = 'bold 44px -apple-system,sans-serif'; ctx.fillText('WARNING', VW / 2, VH * 0.4); ctx.font = 'bold 18px -apple-system,sans-serif'; ctx.fillText('BOSS APPROACHING', VW / 2, VH * 0.4 + 32); ctx.globalAlpha = 1; }
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.6, flash)})`; ctx.fillRect(-20, -20, VW + 40, VH + 40); }
}
function drawHazards() {
  for (const h of hazards) {
    if (h.k === 'ast') { drawSp(astSprite(h.seed, h.r), h.x, h.y, h.rot); if (h.flash > 0) { ctx.globalAlpha = 0.5; drawSp(glow('#ffffff', 16), h.x, h.y, 0, h.r / 14); ctx.globalAlpha = 1; } }
    else if (h.k === 'gate') {
      const l = h.gap - h.gw / 2, r = h.gap + h.gw / 2, pulse = 0.7 + 0.3 * Math.sin(h.t * 14);
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'butt';
      for (const [a, b] of [[0, l], [r, VW]]) { ctx.strokeStyle = `rgba(255,60,200,${0.35 * pulse})`; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(a, h.y); ctx.lineTo(b, h.y); ctx.stroke(); ctx.strokeStyle = '#ffd0f4'; ctx.lineWidth = 4; ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
      for (const x of [l, r]) { ctx.fillStyle = '#2a0a2a'; ctx.strokeStyle = '#ff7af0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, h.y, 10, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#7dffb0'; ctx.font = 'bold 16px -apple-system,sans-serif'; ctx.textAlign = 'center'; if (h.y < player.y) ctx.fillText('▼', h.gap, h.y + 6);
    } else if (h.k === 'hole') {
      const fade = Math.min(1, h.t / 0.8, h.life / 0.8);
      ctx.globalAlpha = fade; ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.t * 2.2); const sc = 1.1 + 0.05 * Math.sin(h.t * 5); ctx.drawImage(holeSprite(), -120 * sc, -120 * sc, 240 * sc, 240 * sc); ctx.restore();
      ctx.strokeStyle = '#5affd822'; ctx.lineWidth = 1; ctx.setLineDash([6, 10]); ctx.beginPath(); ctx.arc(h.x, h.y, h.R * (1 - (h.t * 0.4) % 1), 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
  }
}
function drawBoss() {
  const b = boss, d = b.def;
  if (b.cloakT > 0) ctx.globalAlpha = 0.18;
  ctx.globalCompositeOperation = 'lighter'; drawSp(glow(d.color, 64), b.x, b.y, 0, 2.0 + 0.2 * Math.sin(b.t * 4)); ctx.globalCompositeOperation = 'source-over';
  const rot = ['hive', 'sovereign', 'snow', 'sun', 'singularity', 'kaleido', 'spore', 'flower', 'horizon', 'glacier'].includes(d.shape) ? b.t * 0.4 : d.shape === 'prism' || d.shape === 'herald' ? b.t * 1.2 : 0;
  drawSp(shapeSprite(d.shape, b.r, d.color), b.x, b.y, rot); if (b.flash > 0) { ctx.globalAlpha = 0.28; drawSp(shapeSprite(d.shape, b.r, d.color, true), b.x, b.y, rot); ctx.globalAlpha = 1; }
  if (d.shape === 'sovereign') drawSp(shapeSprite('sovereign', Math.round(b.r * 0.55), '#4ff3ff'), b.x, b.y, -b.t * 0.9);
  if (d.shape === 'singularity') { drawSp(shapeSprite('kaleido', Math.round(b.r * 0.55), '#ff5ad1'), b.x, b.y, -b.t * 0.9); drawSp(shapeSprite('sun', Math.round(b.r * 0.3), '#4ff3ff'), b.x, b.y, b.t * 1.6); }
  if (d.shape === 'horizon') { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.36, 0, TAU); ctx.fill(); }
  for (const t of b.parts) if (t.hp > 0) { drawSp(shapeSprite('turret', t.r, '#ff9a3d'), b.x + t.ox, b.y + t.oy); if (t.flash > 0) { ctx.globalAlpha = 0.35; drawSp(shapeSprite('turret', t.r, '#ff9a3d', true), b.x + t.ox, b.y + t.oy); ctx.globalAlpha = 1; } ctx.fillStyle = '#ff9a3d'; ctx.fillRect(b.x + t.ox - 20, b.y + t.oy - 34, 40 * t.hp / t.maxHp, 4); }
  if (b.parts.some(t => t.hp > 0)) { ctx.strokeStyle = '#57e9ff88'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.6, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
let menuSector = 0, menuT = 0;
function drawMenuShip(dt) {
  menuT += dt;
  const x = VW / 2 + Math.sin(menuT * 0.8) * 60, y = VH * 0.86 + Math.sin(menuT * 1.3) * 10;
  ctx.globalCompositeOperation = 'lighter'; drawSp(glow(SHIPS[save.ship].c2, 20), x, y + 26, 0, 1 + Math.random() * 0.3); ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(shipSprite(save.ship), x - 45, y - 45, 90, 90);
}

// ---------------------------------------------------------------- HUD
const $ = id => document.getElementById(id);
const hud = $('hud'), bombBtn = $('btnBomb');
function showHud(on) { hud.classList.toggle('hidden', !on); bombBtn.classList.toggle('hidden', !on); }
let hudCache = '';
function updateHud() {
  if (!G || state !== 'play') return;
  const p = player, mh = G.st.maxHp;
  const hearts = G.diff === 'kid' ? '♥ ×' + p.hp : '♥'.repeat(Math.max(0, p.hp)) + '<span style="opacity:.25">' + '♥'.repeat(Math.max(0, mh - p.hp)) + '</span>';
  const bf = (p.buff.rap > 0 ? ' ⚡' : '') + (p.buff.vac > 0 ? ' 🧲' : '') + (p.buff.slo > 0 ? ' ⏳' : '') + (p.buff.inv > 0 ? ' ⭐' : '') + (p.revives ? ' 🔥' + p.revives : '');
  const s = `${hearts}|${p.shield}|${G.score}|${G.coins}|${G.crystals}|${G.cores}|${p.bombs}|${p.pow}|${bf}`;
  if (s === hudCache) return; hudCache = s;
  $('hHearts').innerHTML = hearts;
  $('hShield').textContent = (p.shield ? '⬡'.repeat(p.shield) + '  ' : '') + 'PWR ' + p.pow + (G.endless ? '  WAVE ' + G.endlessWave : '  LV ' + G.L) + bf;
  $('hScore').textContent = G.score.toLocaleString();
  $('hRes').innerHTML = `<span class="coin">● ${G.coins.toLocaleString()}</span> &nbsp; <span class="cry">◆ ${G.crystals}</span>${G.cores || G.L > 15 ? ` &nbsp; <span class="core">◈ ${G.cores}</span>` : ''}`;
  $('bombN').textContent = p.bombs; bombBtn.classList.toggle('empty', p.bombs <= 0);
}

// ---------------------------------------------------------------- results
function finishRun(cleared) {
  if (state !== 'play') return;
  state = 'result'; warp = false; showHud(false);
  const L = G.L, d = G.d;
  let bonusC = 0, bonusCr = 0, bonusCo = 0, stars = 0, newStars = 0, firstClear = false;
  if (cleared && !G.endless) {
    const rec = save.levels[L] || { stars: 0, best: 0, clears: 0 };
    firstClear = !rec.clears;
    stars = G.hits === 0 ? 3 : G.hits <= 2 ? 2 : 1;
    if (G.diff === 'kid') stars = Math.min(stars, 1);
    newStars = Math.max(0, stars - rec.stars);
    bonusC = Math.round((80 + 45 * L) * d.reward * (firstClear ? 2 : 1) * (1 + 0.15 * (stars - 1)) * rewardMul(L) * G.st.coinMul);
    bonusCr = (firstClear ? 2 + G.sector * 2 : 0) + newStars * 2 + (G.diff === 'hard' ? 1 : 0);
    if (L > 15) bonusCo = 1 + (firstClear ? 2 + Math.floor((G.sector - 3) / 2) : 0) + newStars + (G.diff === 'hard' ? 1 : 0);
    rec.stars = Math.max(rec.stars, stars); rec.best = Math.max(rec.best, G.score); rec.clears = (rec.clears || 0) + 1;
    save.levels[L] = rec;
  }
  if (G.endless) { const w = G.endlessWave; save.endless[G.diff] = Math.max(save.endless[G.diff] || 0, w); bonusC = Math.round(w * 30 * d.reward * (1 + w * 0.03) * G.st.coinMul); bonusCo = w >= 20 ? Math.floor((w - 15) / 5) : 0; }
  const totC = G.coins + bonusC, totCr = G.crystals + bonusCr, totCo = G.cores + bonusCo;
  save.coins += totC; save.crystals += totCr; save.cores = (save.cores || 0) + totCo; save.stats.coinsEarned += totC; save.stats.coresEarned = (save.stats.coresEarned || 0) + totCo;
  const newHigh = G.score > (save.high[G.diff] || 0); if (newHigh) save.high[G.diff] = G.score;
  persist();
  if (cleared) sfx('win');
  const starHtml = G.endless ? '' : `<div class="stars">${[1, 2, 3].map(i => i <= stars ? '★' : '<span class="off">★</span>').join('')}</div>`;
  const nextOk = cleared && !G.endless && L < NLEV;
  const wasEndless = G.endless;
  ui(`<div class="panel">
    <h2>${G.endless ? 'SURVIVAL OVER' : cleared ? 'LEVEL ' + L + ' CLEAR!' : 'SHIP DESTROYED'}</h2>
    ${starHtml}
    ${G.endless ? `<div class="sub">Reached wave ${G.endlessWave} · best ${save.endless[G.diff]}</div>` : cleared ? `<div class="sub">${G.hits === 0 ? 'Flawless! ' : ''}Hits taken: ${G.hits}${G.diff === 'kid' ? ' · Kid mode earns 1★' : ''}</div>` : `<div class="sub">You keep everything you collected. Upgrade in the Hangar and try again!</div>`}
    <div class="res"><span>Score ${G.score.toLocaleString()}${newHigh ? ' 🏆' : ''}</span></div>
    <div class="res"><span class="coin">● +${totC.toLocaleString()}</span><span class="cry">◆ +${totCr}</span>${totCo ? `<span class="core">◈ +${totCo}</span>` : ''}</div>
    ${bonusC ? `<div class="note">Clear bonus ● ${bonusC.toLocaleString()}${firstClear ? ' (first clear ×2)' : ''}${bonusCr ? ` · ◆ ${bonusCr}${newStars ? ` (${newStars} new star${newStars > 1 ? 's' : ''})` : ''}` : ''}${bonusCo ? ` · ◈ ${bonusCo}` : ''}</div>` : ''}
    ${cleared && firstClear && L % 5 === 0 && L < NLEV ? `<div class="note" style="color:${SECTORS[L / 5].hue};font-size:16px;font-weight:800">${SECTORS[L / 5].name} unlocked!</div>` : ''}
    ${cleared && firstClear && L === NLEV ? `<div class="note" style="color:#fff;font-size:16px;font-weight:800">THE SINGULARITY HAS FALLEN — you conquered every sector! Keep grinding: Hard mode, 3★ runs and Endless await.</div>` : ''}
    ${nextOk ? `<button class="btn" data-a="next">Next Level ▶</button>` : ''}
    <div class="row"><button class="btn alt" data-a="retry">${wasEndless ? 'Play Again' : 'Replay'}</button><button class="btn alt" data-a="hangar">Hangar</button></div>
    <button class="btn small" data-a="map">Star Map</button>
  </div>`, { next: () => startLevel(L + 1), retry: () => startLevel(L, wasEndless), hangar: () => hangarScreen(), map: () => mapScreen() });
}

// ---------------------------------------------------------------- menus
const uiEl = $('ui');
function ui(html, actions = {}) {
  uiEl.innerHTML = html;
  uiEl.querySelectorAll('[data-a]').forEach(el => el.addEventListener('click', ev => { ev.stopPropagation(); audioInit(); sfx('click'); const f = actions[el.dataset.a]; if (f) f(el); }));
}
const fmt = n => n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'k' : n.toLocaleString();
const showCores = () => save.cores > 0 || highestCleared() >= 15;
const wallet = () => `<div class="res"><span class="coin">● ${save.coins.toLocaleString()}</span><span class="cry">◆ ${save.crystals.toLocaleString()}</span>${showCores() ? `<span class="core">◈ ${save.cores.toLocaleString()}</span>` : ''}</div>`;
const costHtml = c => `● ${fmt(c.coins)}${c.cr ? `<br><span class="cry">◆ ${c.cr}</span>` : ''}${c.cores ? ` <span class="core">◈ ${c.cores}</span>` : ''}`;
const canPay = c => save.coins >= c.coins && save.crystals >= (c.cr || 0) && save.cores >= (c.cores || 0);
function whatsNew() {
  ui(`<div class="panel"><h2>⚡ EXPANSION ⚡</h2>
    <div class="sub">The frontier just got a lot bigger, pilot. <b style="color:#5dff8a">All your progress is safe</b> — coins, crystals, upgrades, ships and stars carried over.</div>
    <div class="card"><div class="info"><div class="nm">9 new sectors · 45 new levels (60 total)</div><div class="ds">Glacier Drift → Ember Belt → Verdant Rift → Storm Veil → Mirror Maze → Graviton Deep → Solar Forge → Phantom Reach → Singularity Throne</div></div></div>
    <div class="card"><div class="info"><div class="nm">18 new bosses + mid-boss ambushes</div><div class="ds">A new guardian and a new sector boss in every sector.</div></div></div>
    <div class="card"><div class="info"><div class="nm">12 new enemy types, elite foes &amp; hazards</div><div class="ds">Asteroid fields, laser gates, ion storms, black holes. Gold-glowing elites drop loot.</div></div></div>
    <div class="card"><div class="info"><div class="nm">Upgrade caps raised + 4 new tracks</div><div class="ds">230 total upgrade tiers. New: Targeting AI, Arc Emitter, Salvage Rig, Phoenix Core.</div></div></div>
    <div class="card"><div class="info"><div class="nm">7 new ships · 2 new weapons · 4 new power-ups</div><div class="ds">Plasma Wave &amp; Storm Needles (Arsenal 10 &amp; 14). Power-ups: Rapid, Mega Magnet, Time Warp, Invincible.</div></div></div>
    <div class="card"><div class="info"><div class="nm"><span class="core">◈ Quasar Cores</span> — new resource</div><div class="ds">Earned in Sector IV and beyond (bosses, elites, clears). Needed for the new tiers and ships.</div></div></div>
    <button class="btn" data-a="ok">LET'S FLY ▶</button></div>`, { ok: () => { save.seenExp = 1; persist(); mapScreen(); } });
}
function highestCleared() { let h = 0; for (let i = 1; i <= NLEV; i++) if (save.levels[i] && save.levels[i].clears) h = i; return h; }
function menuScreen() {
  state = 'menu'; G = null; showHud(false); warp = false;
  menuSector = Math.min(NSEC - 1, Math.floor(Math.min(highestCleared(), NLEV - 1) / 5));
  if (!save.seenExp && highestCleared() === 0 && !save.stats.runs) { save.seenExp = 1; persist(); }
  const inHub = window.HubSave && window.HubSave.inHub;
  ui(`<div class="panel clear">
    <h1>NOVA<br>VANGUARD</h1>
    <div class="sub">Defend the frontier. Upgrade. Conquer the Void.</div>
    ${wallet()}
    <button class="btn" data-a="play">▶ PLAY</button>
    <button class="btn alt" data-a="hangar">HANGAR</button>
    <div class="seg">${Object.keys(DIFF).map(k => `<button data-a="diff" data-d="${k}" class="${save.diff === k ? 'on' : ''}">${DIFF[k].name}</button>`).join('')}</div>
    <div class="note">${save.diff === 'kid' ? 'Kid mode: slow bullets, tiny hitbox, endless lives — never game over.' : save.diff === 'hard' ? 'Hard: tougher foes, faster bullets, ×1.6 rewards.' : 'Normal: the intended challenge.'}</div>
    <div class="row" style="margin-top:10px"><button class="btn small" data-a="mute">${save.muted ? '🔇 Sound off' : '🔊 Sound on'}</button>${inHub ? '<button class="btn small" data-a="exit">⌂ All games</button>' : ''}</div>
    <div class="note">High score (${DIFF[save.diff].name}): ${(save.high[save.diff] || 0).toLocaleString()} · Levels cleared: ${highestCleared()}/${NLEV}</div>
    ${save.seenExp ? '' : '<div class="note" style="color:#ffe14a;font-weight:800;font-size:15px">⚡ NEW: Expansion — 45 new levels, new ships &amp; upgrades! Tap PLAY ⚡</div>'}
  </div>`, {
    play: () => save.seenExp ? mapScreen() : whatsNew(), hangar: () => hangarScreen(),
    diff: el => { save.diff = el.dataset.d; persist(); menuScreen(); },
    mute: () => { setMuted(!save.muted); menuScreen(); },
    exit: () => window.HubSave.exit(),
  });
}
function mapScreen() {
  state = 'menu'; G = null; showHud(false);
  const hc = highestCleared(), unlocked = Math.min(NLEV, hc + 1);
  let html = `<div class="panel"><div class="top"><h2>STAR MAP</h2>${wallet()}</div>`;
  for (let s = 0; s < NSEC; s++) {
    const first = s * 5 + 1, secLocked = first > unlocked;
    let got = 0; for (let i = first; i < first + 5; i++) got += save.levels[i] ? save.levels[i].stars : 0;
    html += `<div class="sector" style="color:${SECTORS[s].hue};text-shadow:0 0 8px ${SECTORS[s].hue};${secLocked ? 'opacity:.45' : ''}">${secLocked ? '🔒 ' : ''}${SECTORS[s].name}${s >= 3 ? ' <span class="newtag">NEW</span>' : ''}<span style="float:right;color:#ffd54a;text-shadow:none;font-size:14px">★ ${got}/15</span></div><div class="levels">`;
    for (let i = first; i <= s * 5 + 5; i++) {
      const rec = save.levels[i], st = rec ? rec.stars : 0, lock = i > unlocked, bossL = i % 5 === 0;
      html += `<button class="lv ${bossL ? 'boss' : ''} ${lock ? 'locked' : ''} ${i === unlocked && !rec ? 'next' : ''}" data-a="lv" data-l="${i}" ${lock ? 'disabled' : ''}>${lock ? '🔒' : i}<small>${lock ? '' : '★'.repeat(st) + '<span style="opacity:.25">' + '★'.repeat(3 - st) + '</span>'}</small></button>`;
    }
    html += `</div>`;
  }
  const endOk = hc >= 5;
  html += `<button class="btn warn" data-a="endless" ${endOk ? '' : 'disabled'} style="margin-top:16px">∞ ENDLESS SURVIVAL ${endOk ? `· best wave ${save.endless[save.diff] || 0}` : '(clear level 5)'}</button>
    <div class="note">Replay cleared levels to farm coins &amp; crystals. 3★ = no hits taken. Pink-ringed levels are sector bosses. Enemies get much tougher each sector — upgrade in the Hangar. ◈ Quasar Cores drop in Sector IV and beyond.</div>
    <div class="row"><button class="btn alt small" data-a="hangar">Hangar</button><button class="btn small" data-a="back">◀ Back</button></div></div>`;
  ui(html, { lv: el => startLevel(+el.dataset.l), endless: () => startLevel(1, true), hangar: () => hangarScreen(), back: () => menuScreen() });
  const nx = uiEl.querySelector('.lv.next') || uiEl.querySelector(`.lv[data-l="${Math.max(1, unlocked)}"]`), panel = uiEl.querySelector('.panel');
  if (nx && panel && unlocked > 10) panel.scrollTop = Math.max(0, nx.offsetTop - panel.clientHeight * 0.45);
}
function upgradeLevel() { return TRACK_KEYS.reduce((a, k) => a + save.upg[k], 0); }
let hangarTab = 'upg';
function hangarScreen() {
  state = 'menu'; G = null; showHud(false);
  let body = '';
  if (hangarTab === 'upg') {
    for (const k of TRACK_KEYS) {
      const T = TRACKS[k], t = save.upg[k], maxed = t >= T.max;
      const c = maxed ? null : upgCost(k, t + 1), can = c && canPay(c);
      body += `<div class="card"><div class="info"><div class="nm">${T.name} <span style="color:#57e9ff">${t}/${T.max}</span>${T.isNew ? ' <span class="newtag">NEW</span>' : t >= T.old && !maxed ? ' <span class="newtag">TIER UP</span>' : ''}</div>
        <div class="ds">${T.desc(t)}${maxed ? '' : ` → <b style="color:#fff">${T.desc(t + 1)}</b>`}</div>
        <div class="pips ${T.max > 12 ? 'dense' : ''}">${Array.from({ length: T.max }, (_, i) => `<i class="${i < t ? 'on' : ''} ${i >= T.old && T.old ? 'ext' : ''}"></i>`).join('')}</div></div>
        ${maxed ? `<button class="buy max" disabled>MAX</button>` : `<button class="buy" data-a="buy" data-k="${k}" ${can ? '' : 'disabled'}>${costHtml(c)}</button>`}</div>`;
    }
  } else {
    body += `<h3>Primary weapon</h3><div class="seg">${Object.keys(WEAPONS).map(w => `<button data-a="wpn" data-w="${w}" class="${save.weapon === w ? 'on' : ''}" ${weaponOk(w) ? '' : 'disabled style="opacity:.35"'}>${weaponOk(w) ? '' : '🔒 '}${WEAPONS[w].name}</button>`).join('')}</div><div class="note">Unlock Spread, Laser, Plasma Wave (piercing) &amp; Storm Needles (homing) through the Arsenal upgrade. Grab P power-ups in a run to level your weapon.</div><h3>Ships</h3>`;
    for (const id in SHIPS) {
      const s = SHIPS[id], own = save.ships[id], sel = save.ship === id, sc = { coins: s.coins, cr: s.cr, cores: s.co || 0 }, can = canPay(sc);
      body += `<div class="card"><canvas class="shipprev" data-s="${id}" width="128" height="128" style="width:64px;height:64px;position:static;transform:none"></canvas><div class="info"><div class="nm" style="color:${s.color}">${s.name}${s.form ? ' <span class="newtag">NEW</span>' : ''}</div><div class="ds">${s.desc}</div></div>
        ${sel ? `<button class="buy max" disabled>FLYING</button>` : own ? `<button class="buy max" data-a="sel" data-s="${id}">SELECT</button>` : `<button class="buy" data-a="ship" data-s="${id}" ${can ? '' : 'disabled'}>${costHtml(sc)}</button>`}</div>`;
    }
  }
  ui(`<div class="panel"><div class="top"><h2>HANGAR</h2>${wallet()}
    <div class="tabs"><button data-a="tab" data-t="upg" class="${hangarTab === 'upg' ? 'on' : ''}">Upgrades</button><button data-a="tab" data-t="ships" class="${hangarTab === 'ships' ? 'on' : ''}">Ships &amp; Weapons</button></div></div>
    ${body}
    <div class="note">Upgrade level ${upgradeLevel()}/${TRACK_KEYS.reduce((a, k) => a + TRACKS[k].max, 0)} · ● coins drop from every kill · ◆ crystals come from elites, bosses, first clears and new stars · ◈ cores come from Sector IV+ bosses, gold elites and clears.</div>
    <div class="row"><button class="btn" data-a="play">▶ Fly</button><button class="btn alt" data-a="back">◀ Menu</button></div></div>`, {
    tab: el => { hangarTab = el.dataset.t; hangarScreen(); },
    buy: el => { const k = el.dataset.k, t = save.upg[k] + 1, c = upgCost(k, t); if (t <= TRACKS[k].max && canPay(c)) { save.coins -= c.coins; save.crystals -= c.cr; save.cores -= c.cores || 0; save.upg[k] = t; persist(); sfx('buy'); const sc = uiEl.querySelector('.panel').scrollTop; hangarScreen(); uiEl.querySelector('.panel').scrollTop = sc; } },
    wpn: el => { if (weaponOk(el.dataset.w)) { save.weapon = el.dataset.w; persist(); hangarScreen(); } },
    sel: el => { save.ship = el.dataset.s; persist(); hangarScreen(); },
    ship: el => { const s = SHIPS[el.dataset.s]; if (canPay({ coins: s.coins, cr: s.cr, cores: s.co || 0 })) { save.coins -= s.coins; save.crystals -= s.cr; save.cores -= s.co || 0; save.ships[el.dataset.s] = 1; save.ship = el.dataset.s; persist(); sfx('buy'); hangarScreen(); } },
    play: () => mapScreen(), back: () => menuScreen(),
  });
  uiEl.querySelectorAll('canvas.shipprev').forEach(c => c.getContext('2d').drawImage(shipSprite(c.dataset.s), 0, 0, 128, 128));
}
function resume() { ui(''); state = 'play'; last = performance.now(); }
function pauseGame() {
  if (state !== 'play') return;
  state = 'pause'; drag = null;
  ui(`<div class="panel"><h2>PAUSED</h2>
    <button class="btn" data-a="resume">▶ Resume</button>
    <button class="btn small" data-a="mute">${save.muted ? '🔇 Sound off' : '🔊 Sound on'}</button>
    <button class="btn alt" data-a="quit">Abandon run (keep coins)</button></div>`, {
    resume, mute: () => { setMuted(!save.muted); state = 'play'; pauseGame(); },
    quit: () => { state = 'play'; G.phase = 'dead'; player.alive = false; finishRun(false); },
  });
}

// ---------------------------------------------------------------- input
const keys = {};
addEventListener('keydown', e => { keys[e.key] = true; if (e.key === ' ') useBomb(); if (e.key === 'p' || e.key === 'Escape') { if (state === 'play') pauseGame(); else if (state === 'pause') resume(); } });
addEventListener('keyup', e => { keys[e.key] = false; });
let drag = null;
document.addEventListener('pointerdown', e => {
  audioInit();
  if (state !== 'play' || (e.target.closest && e.target.closest('button'))) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
}, { passive: true });
document.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId || state !== 'play' || !player || !player.alive) return;
  const sens = 1.3 * G.st.speed;
  player.x = clamp(player.x + (e.clientX - drag.x) / S * sens, 22, VW - 22);
  player.y = clamp(player.y + (e.clientY - drag.y) / S * sens, 120, VH - 40);
  drag.x = e.clientX; drag.y = e.clientY;
}, { passive: true });
const endDrag = e => { if (drag && drag.id === e.pointerId) drag = null; };
document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);
document.addEventListener('touchmove', e => { if (!(e.target.closest && e.target.closest('.panel'))) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
$('btnPause').addEventListener('click', e => { e.stopPropagation(); pauseGame(); });
bombBtn.addEventListener('pointerdown', e => { e.stopPropagation(); useBomb(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
addEventListener('resize', resize);

// ---------------------------------------------------------------- loop
let last = performance.now(), fpsAcc = 0, fpsN = 0, fps = 60;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05; if (dt <= 0) dt = 0.001;
  fpsAcc += dt; fpsN++; if (fpsAcc > 1) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  if (state === 'play') { update(dt); updateHud(); }
  render(state === 'play' || state === 'menu' || state === 'result' ? dt : 0);
}
if (window.HubSave && window.HubSave.inHub) document.body.classList.add('inhub');
resize();
menuScreen();
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

// test/debug hooks
window.NV = {
  get B() { return boss; }, get save() { return save; }, get state() { return state; }, get G() { return G; }, get fps() { return fps; }, get player() { return player; }, get boss() { return boss; },
  counts: () => ({ enemies: enemies.length, pBullets: pBullets.length, eBullets: eBullets.length, parts: parts.length, pickups: pickups.length }),
  start: startLevel, map: mapScreen, hangar: t => { if (t) hangarTab = t; hangarScreen(); }, menu: menuScreen, bomb: useBomb,
  grant: (c, cr) => { save.coins += c; save.crystals += cr; persist(); },
  god: () => { if (player) player.inv = 1e9; }, boss: () => { if (G) { enemies.length = 0; G.queue.length = 0; G.waveIdx = 99; G.phase = 'warn'; G.phaseT = 3; } },
  step: (sec, dt = 1 / 60) => { for (let t = 0; t < sec && state === 'play'; t += dt) update(dt); updateHud(); },
  costTable: () => TRACK_KEYS.map(k => [k, Array.from({ length: TRACKS[k].max }, (_, i) => upgCost(k, i + 1))]),
  hazard: (k, o) => spawnHazard(k, o), info: () => ({ levels: NLEV, sectors: NSEC, bosses: Object.keys(BOSSDEF).length, ships: Object.keys(SHIPS).length, tracks: TRACK_KEYS.length, tiers: TRACK_KEYS.reduce((a, k) => a + TRACKS[k].max, 0), enemies: Object.keys(EDEF).length }),
  levels: LEVELS, migrate: migrateSave, buff: (k, t = 8) => { if (player) player.buff[k] = t; }, whatsNew,
  hazards: () => hazards, stats: () => G && G.st,
  reset: () => { save = defSave(); persist(); menuScreen(); },
};
})();
