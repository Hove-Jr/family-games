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
  var settings = Object.assign({ parentLock: true }, LS.get(K.settings, {}));
  var games = window.HUB_GAMES || [];
  var me = null, editing = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(t) { var el = $('#toast'); el.textContent = t; el.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.add('hidden'); }, 1800); }
  function show(id) { ['who', 'games', 'play'].forEach(function (s) { $('#s-' + s).classList.toggle('on', s === id); }); }
  function saveProfiles() { LS.set(K.profiles, profiles); }

  // ---------- who's playing ----------
  function renderWho() {
    var h = profiles.map(function (p) {
      return '<button class="ptile" data-pid="' + esc(p.id) + '" style="--c:' + esc(p.color) + '"><span class="av">' + esc(p.avatar) + '</span><span class="nm">' + esc(p.name) + '</span><span class="ed">✏️</span></button>';
    }).join('');
    h += '<button class="ptile add" data-add="1"><span class="av">➕</span><span class="nm">New player</span></button>';
    $('#who').innerHTML = h;
  }
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
    $('#mTitle').textContent = p ? 'Edit player' : 'New player';
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
    kill.forEach(function (k) { localStorage.removeItem(k); });
    var gone = profiles.filter(function (p) { return p.id === editingId; })[0];
    profiles = profiles.filter(function (p) { return p.id !== editingId; });
    if (localStorage.getItem(K.active) === editingId) localStorage.removeItem(K.active);
    saveProfiles(); renderWho(); closeEditor(); toast((gone ? gone.name : 'Player') + ' deleted');
  }

  // ---------- game picker ----------
  function renderGames() {
    $('#meBtn .av').textContent = me.avatar; $('#meBtn .av').style.setProperty('--c', me.color); $('#meBtn .nm').textContent = me.name;
    $('#games').innerHTML = games.map(function (g) {
      var icon = g.status === 'ready' && g.icon ? '<img alt="" src="games/' + esc(g.id) + '/' + esc(g.icon) + '">' : esc(g.emoji);
      return '<button class="gtile ' + (g.status === 'ready' ? '' : 'soon') + '" data-gid="' + esc(g.id) + '" style="--c:' + esc(g.color) + '"><span class="ic">' + icon + '</span><span class="gn">' + esc(g.name) + '</span><span class="gs">' + esc(g.sub || '') + '</span></button>';
    }).join('');
  }
  $('#meBtn').addEventListener('click', function () { renderWho(); show('who'); });
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
    var hb = $('#homeBtn'); hb.className = 'home ' + (g.corner || 'tl');
    frame.src = 'games/' + g.id + '/index.html?profile=' + encodeURIComponent(me.id) + '&hub=1';
    show('play');
    try { location.hash = 'play'; } catch (e) {}
  }
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
