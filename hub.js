/* Game Hub launcher: profiles -> game picker -> game (iframe). All data stays on this iPad (localStorage). */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var AVATARS = ['🦖', '🐶', '🐯', '🦄', '🐱', '🦊', '🐼', '🐸', '🦁', '🐧', '🐙', '🐉', '🚀', '🛻', '🏎️', '⚽', '🤖', '👾', '🦸', '🧙', '🌈', '⚡', '🐵', '🦈'];
  var COLORS = ['#22c58b', '#3a86ff', '#ff4fa3', '#7b2ff7', '#ff8c1a', '#e63946', '#e0b000', '#16a3ad', '#5c6b7a'];
  var K = { profiles: 'hub.profiles', active: 'hub.activeProfile', settings: 'hub.settings' };
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast('Storage is full'); } }
  };
  var profiles = LS.get(K.profiles, null);
  if (!profiles || !profiles.length) {
    profiles = [
      { id: 'archer', name: 'Archer', avatar: '🦖', color: '#22c58b', age: 5 },
      { id: 'elias', name: 'Elias', avatar: '🐯', color: '#ff8c1a', age: 5 }, // age unknown: same kid settings as Archer until edited
      { id: 'dad', name: 'Dad', avatar: '🚀', color: '#3a86ff', age: null }
    ];
    LS.set(K.profiles, profiles);
  }
  // one-time migration: add Mom next to Dad on devices that already have profiles (never re-adds her after a deliberate delete)
  if (!LS.get('hub.seed.mom', false)) {
    if (!profiles.some(function (p) { return p.id === 'mom'; })) {
      var mom = { id: 'mom', name: 'Mom', avatar: '🌈', color: '#ff4fa3', age: null }, di = -1;
      profiles.forEach(function (p, i) { if (p.id === 'dad') di = i; });
      if (di >= 0) profiles.splice(di + 1, 0, mom); else profiles.push(mom);
      LS.set(K.profiles, profiles);
    }
    LS.set('hub.seed.mom', true);
  }
  var settings = Object.assign({ parentLock: true }, LS.get(K.settings, {}));
  var games = window.HUB_GAMES || [];
  var me = null, editing = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(t) { var el = $('#toast'); el.textContent = t; el.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.add('hidden'); }, 1800); }
  function show(id) { ['who', 'games', 'play'].forEach(function (s) { $('#s-' + s).classList.toggle('on', s === id); }); }
  function saveProfiles() { LS.set(K.profiles, profiles); }
  var SVG = {
    pencil: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    plus: '<svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    play: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>'
  };
  // per-profile play history (hub-level key, separate from game saves): { gameId: { t: lastPlayedMs, n: plays } }
  function hist(pid) { return LS.get('hub.recent.' + pid, {}) || {}; }
  function lastPlayed(pid) { var h = hist(pid), best = null; Object.keys(h).forEach(function (id) { if (gameById(id) && (!best || h[id].t > best.t)) best = { id: id, t: h[id].t }; }); return best; }
  function gameById(id) { return games.filter(function (x) { return x.id === id; })[0]; }
  function ago(t) {
    var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    var d = Math.floor(s / 86400); return d === 1 ? 'yesterday' : d < 7 ? d + 'd ago' : new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function iconHtml(g) {
    var inner = g.status === 'ready' && g.icon ? '<img alt="" src="games/' + esc(g.id) + '/' + esc(g.icon) + '" loading="lazy" decoding="async">' : '<span class="em">' + esc(g.emoji) + '</span>';
    return '<span class="icon" style="--c:' + esc(g.color) + '">' + inner + '</span>';
  }

  // ---------- who's playing ----------
  function renderWho() {
    var h = profiles.map(function (p) {
      var last = lastPlayed(p.id), lg = last && gameById(last.id);
      var meta = lg ? esc(lg.name) + ' · ' + ago(last.t) : 'No games yet';
      return '<button class="ptile press" data-pid="' + esc(p.id) + '" style="--c:' + esc(p.color) + '"><span class="av">' + esc(p.avatar) + '</span><span class="nm">' + esc(p.name) + '</span><span class="meta">' + meta + '</span><span class="ed">' + SVG.pencil + '</span></button>';
    }).join('');

    $('#who').innerHTML = h;
  }
  $('#addBtn').addEventListener('click', function () { openEditor(null); });
  $('#who').addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.add) return openEditor(null);
    var p = profiles.filter(function (x) { return x.id === t.dataset.pid; })[0]; if (!p) return;
    if (editing) return openEditor(p);
    pick(p);
  });
  function pick(p) {
    me = p; try { localStorage.setItem(K.active, p.id); } catch (e) {}
    renderGames(); show('games');
  }
  function setEditing(on) {
    editing = on; document.body.classList.toggle('editing', on);
    $('#editBtn').classList.toggle('hidden', on); $('#doneBtn').classList.toggle('hidden', !on);
  }
  // Done only counts if the finger went down on it after edit mode opened (not the finger lifting off the 3s hold)
  var doneArmed = false;
  $('#doneBtn').addEventListener('pointerdown', function () { doneArmed = editing; });
  $('#doneBtn').addEventListener('click', function () { if (doneArmed) setEditing(false); doneArmed = false; });

  // ---------- hold-to-confirm (parent lock) ----------
  function holdButton(btn, ms, onDone, needHold) {
    var timer = null, t0 = 0;
    function fire() { clearTimeout(timer); timer = null; t0 = 0; reset(); btn._done = Date.now(); onDone(); }
    function start(e) {
      if (needHold && !needHold()) return;
      e.preventDefault(); t0 = Date.now(); btn.classList.add('holding'); $('#holdHint').classList.remove('hidden');
      clearTimeout(timer); timer = setTimeout(fire, ms);
    }
    function reset() { btn.classList.remove('holding'); $('#holdHint').classList.add('hidden'); }
    function end() { if (t0 && Date.now() - t0 >= ms - 50) return fire(); clearTimeout(timer); timer = null; t0 = 0; reset(); }
    btn.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { btn.addEventListener(ev, end); });
    btn.addEventListener('click', function () { if (btn._done && Date.now() - btn._done < 1500) return; if (needHold && !needHold()) onDone(); else toast('Grown-ups: hold for 3 seconds'); });
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  holdButton($('#editBtn'), 3000, function () { setEditing(true); }, function () { return settings.parentLock; });
  holdButton($('#mDel'), 3000, function () { deleteProfile(); });

  // ---------- profile editor ----------
  var draft = null, editingId = null;
  function openEditor(p) {
    editingId = p ? p.id : null;
    draft = p ? Object.assign({}, p) : { name: '', avatar: AVATARS[(profiles.length * 5) % AVATARS.length], color: COLORS[profiles.length % COLORS.length], age: null };
    $('#mTitle').textContent = p ? 'Edit player' : 'No games yet';
    $('#mName').value = draft.name; $('#mAge').value = draft.age || '';
    $('#mDel').classList.toggle('hidden', !p || profiles.length < 2);
    renderEditor(); $('#modal').classList.remove('hidden');
  }
  function renderEditor() {
    $('#mPrev').textContent = draft.avatar; $('#mPrev').style.setProperty('--c', draft.color);
    $('#mAvs').innerHTML = AVATARS.map(function (a) { return '<button data-av="' + a + '" class="' + (a === draft.avatar ? 'on' : '') + '">' + a + '</button>'; }).join('');
    $('#mCols').innerHTML = COLORS.map(function (c) { return '<button data-col="' + c + '" style="--c:' + c + '" class="' + (c === draft.color ? 'on' : '') + '" aria-label="color"></button>'; }).join('');
  }
  $('#mAvs').addEventListener('click', function (e) { var b = e.target.closest('[data-av]'); if (b) { draft.avatar = b.dataset.av; renderEditor(); } });
  $('#mCols').addEventListener('click', function (e) { var b = e.target.closest('[data-col]'); if (b) { draft.color = b.dataset.col; renderEditor(); } });
  $('#mCancel').addEventListener('click', closeEditor);
  function closeEditor() { $('#modal').classList.add('hidden'); try { document.activeElement.blur(); } catch (e) {} }
  $('#mSave').addEventListener('click', function () {
    var name = $('#mName').value.trim().slice(0, 14);
    if (!name) { toast('Type a name first'); $('#mName').focus(); return; }
    var age = parseInt($('#mAge').value, 10); draft.age = age > 0 ? age : null; draft.name = name;
    if (editingId) { profiles = profiles.map(function (p) { return p.id === editingId ? draft : p; }); }
    else { draft.id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); profiles.push(draft); }
    saveProfiles(); renderWho(); closeEditor(); toast(editingId ? 'Saved!' : 'Welcome, ' + name + '!');
  });
  function deleteProfile() {
    if (!editingId || profiles.length < 2) return;
    var pfx = 'hub.p.' + editingId + '.', kill = [];
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(pfx) === 0) kill.push(k); }
    kill.push('hub.recent.' + editingId); kill.forEach(function (k) { localStorage.removeItem(k); });
    var gone = profiles.filter(function (p) { return p.id === editingId; })[0];
    profiles = profiles.filter(function (p) { return p.id !== editingId; });
    if (localStorage.getItem(K.active) === editingId) localStorage.removeItem(K.active);
    saveProfiles(); renderWho(); closeEditor(); toast((gone ? gone.name : 'Player') + ' deleted');
  }

  // ---------- game picker ----------
  function renderGames() {
    $('#meBtn .av').textContent = me.avatar; $('#meBtn .av').style.setProperty('--c', me.color); $('#meBtn .nm').textContent = me.name;
    var hr = new Date().getHours();
    $('#greet').textContent = (hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening') + ', ' + me.name;
    var h = hist(me.id), ready = games.filter(function (g) { return g.status === 'ready'; });
    var last = lastPlayed(me.id), newest = ready[ready.length - 1];
    var feat = last ? gameById(last.id) : newest;
    if (feat) {
      var img = feat.icon ? 'games/' + feat.id + '/' + feat.icon : '';
      $('#hero').innerHTML = '<button class="hero press" data-gid="' + esc(feat.id) + '">' + (img ? '<span class="bgimg" style="--img:url(&quot;' + esc(img) + '&quot;)"></span>' : '') +
        '<span class="ic">' + iconHtml(feat) + '</span><span class="tx"><span class="eyebrow">' + (last ? 'Continue playing' : 'Newest game') + '</span>' +
        '<span class="gn">' + esc(feat.name) + '</span><span class="gs">' + esc(feat.sub || '') + (last ? ' · ' + ago(last.t) : '') + '</span>' +
        '<span class="play">' + SVG.play + (last ? 'Resume' : 'Play') + '</span></span></button>';
    } else $('#hero').innerHTML = '';
    $('#gcount').textContent = ready.length + ' games';
    $('#games').innerHTML = games.map(function (g) {
      var r = h[g.id], isNew = !r && g === newest;
      var lp = g.status !== 'ready' ? 'Coming soon' : r ? 'Played ' + ago(r.t) : 'Not played yet';
      return '<button class="gtile press ' + (g.status === 'ready' ? '' : 'soon') + '" data-gid="' + esc(g.id) + '">' + (isNew ? '<span class="badge new">NEW</span>' : '') + iconHtml(g) +
        '<span class="gn">' + esc(g.name) + '</span><span class="gs">' + esc(g.sub || '') + '</span><span class="lp">' + lp + '</span></button>';
    }).join('');
  }
  $('#meBtn').addEventListener('click', function () { renderWho(); show('who'); });
  $('#hero').addEventListener('click', function (e) { var t = e.target.closest('[data-gid]'); var g = t && gameById(t.dataset.gid); if (g && g.status === 'ready') play(g); });
  $('#games').addEventListener('click', function (e) {
    var t = e.target.closest('[data-gid]'); if (!t) return;
    var g = games.filter(function (x) { return x.id === t.dataset.gid; })[0];
    if (!g || g.status !== 'ready') { toast('Coming soon! 🛠️'); return; }
    play(g);
  });

  // ---------- play ----------
  var frame = $('#frame'), current = null;
  function play(g) {
    current = g;
    try { var hh = hist(me.id), r = hh[g.id] || { n: 0 }; hh[g.id] = { t: Date.now(), n: (r.n || 0) + 1 }; LS.set('hub.recent.' + me.id, hh); } catch (e) {}
    var hb = $('#homeBtn'); hb.className = 'home ' + (g.corner || 'tl');
    var ps = $('#s-play') || frame.parentNode;
    ps.classList.toggle('inset', !g.edge); ps.style.background = '#000';
    frame.onload = function () { tint(); };
    frame.src = 'games/' + g.id + '/index.html?profile=' + encodeURIComponent(me.id) + '&hub=1';
    show('play');
    try { location.hash = 'play'; } catch (e) {}
  }
  // iOS home-screen apps have a strip below the game frame (see index.html); paint it to match the bottom of the game
  function tint() {
    if (!current || current.edge) return;
    var ps = $('#s-play');
    try {
      var d = frame.contentDocument, c = null, best = 0;
      [].forEach.call(d.querySelectorAll('canvas'), function (k) { var a = k.width * k.height; if (a > best && k.getBoundingClientRect().bottom >= frame.clientHeight - 4) { best = a; c = k; } });
      var x = c && c.getContext && c.getContext('2d');
      if (x) { var p = x.getImageData(c.width >> 1, c.height - 2, 1, 1).data; if (p[3] > 200) { ps.style.background = 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')'; return; } }
      var pick = function (el) { var v = el && getComputedStyle(el).backgroundColor; return v && v !== 'transparent' && !/,\s*0\)$/.test(v) ? v : null; };
      var v = pick(d.body) || pick(d.documentElement); if (v) ps.style.background = v;
    } catch (e) {}
  }
  setInterval(function () { if (current && $('#s-play').classList.contains('on') && getComputedStyle(document.documentElement).getPropertyValue('--gap').trim() !== '0px') tint(); }, 1500);
  function leave() {
    if (!current) return;
    try { var w = frame.contentWindow; w.dispatchEvent(new Event('pagehide')); w.dispatchEvent(new Event('beforeunload')); } catch (e) {}
    frame.src = 'about:blank'; current = null; renderGames(); show('games');
    if (location.hash) try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }
  $('#homeBtn').addEventListener('click', leave);
  window.addEventListener('message', function (e) { if (e.data && e.data.hub === 'exit') leave(); });
  window.addEventListener('hashchange', function () { if (location.hash !== '#play' && current) leave(); });

  // test hook
  window.__hub = { pick: function (id) { var p = profiles.filter(function (x) { return x.id === id; })[0]; if (p) pick(p); }, play: function (id) { var g = games.filter(function (x) { return x.id === id; })[0]; if (g) play(g); }, leave: leave, profiles: function () { return profiles; }, openEditor: openEditor, setEditing: setEditing };

  // ---------- boot ----------
  renderWho(); show('who');
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then(function (r) { try { r.update(); } catch (e) {} }).catch(function () {});
  }
})();
