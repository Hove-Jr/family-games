/* Game Hub SDK + per-profile storage shim.
 * Include FIRST in a game's <head>:  <script src="../../hub-sdk.js"></script>
 * - window.HubSave = { inHub, profileId, profile, get(key, def), set(key, val), remove(key), keys(), clear(), exit() }
 * - Any plain localStorage use in the game is transparently namespaced to the active profile
 *   (keys are stored as "hub.p.<profileId>.<key>"), so games work without SDK calls.
 * - The game's own service worker registration is disabled inside the hub (the hub's SW caches everything).
 */
(function () {
  'use strict';
  if (window.HubSave) return;
  var real;
  try { real = window.localStorage; } catch (e) { real = null; }
  var qs = {};
  try { new URLSearchParams(location.search).forEach(function (v, k) { qs[k] = v; }); } catch (e) {}
  var pid = qs.profile || null;
  if (!pid && real) { try { pid = real.getItem('hub.activeProfile'); } catch (e) {} }
  var inHub = !!pid && (qs.hub === '1' || window.parent !== window || !!qs.profile);
  var PREFIX = inHub ? 'hub.p.' + pid + '.' : '';
  var profile = null;
  try { profile = (JSON.parse(real.getItem('hub.profiles') || '[]') || []).filter(function (p) { return p.id === pid; })[0] || null; } catch (e) {}

  function ownKeys() {
    var out = [];
    if (!real) return out;
    for (var i = 0; i < real.length; i++) { var k = real.key(i); if (k && k.indexOf(PREFIX) === 0) out.push(k.slice(PREFIX.length)); }
    return out;
  }

  // Storage-like object scoped to the profile
  var api = {
    getItem: function (k) { return real ? real.getItem(PREFIX + String(k)) : null; },
    setItem: function (k, v) { if (real) real.setItem(PREFIX + String(k), String(v)); },
    removeItem: function (k) { if (real) real.removeItem(PREFIX + String(k)); },
    clear: function () { ownKeys().forEach(function (k) { real.removeItem(PREFIX + k); }); },
    key: function (i) { var ks = ownKeys(); return i >= 0 && i < ks.length ? ks[i] : null; }
  };

  var scoped = null;
  if (inHub && real && typeof Proxy === 'function') {
    scoped = new Proxy({}, {
      get: function (t, p) {
        if (p === 'length') return ownKeys().length;
        if (typeof p === 'symbol') return undefined;
        if (Object.prototype.hasOwnProperty.call(api, p)) return api[p];
        var v = api.getItem(p); return v === null ? undefined : v;
      },
      set: function (t, p, v) { if (typeof p !== 'symbol') api.setItem(p, v); return true; },
      has: function (t, p) { return typeof p !== 'symbol' && (p in api || p === 'length' || api.getItem(p) !== null); },
      deleteProperty: function (t, p) { api.removeItem(p); return true; },
      ownKeys: function () { return ownKeys(); },
      getOwnPropertyDescriptor: function (t, p) {
        var v = typeof p === 'symbol' ? null : api.getItem(p);
        return v === null ? undefined : { value: v, writable: true, enumerable: true, configurable: true };
      }
    });
    var installed = false;
    try {
      Object.defineProperty(window, 'localStorage', { configurable: true, enumerable: true, get: function () { return scoped; } });
      installed = window.localStorage === scoped;
    } catch (e) {}
    if (!installed && window.Storage) {
      // Fallback: patch Storage methods so calls on the real localStorage are prefixed.
      var SP = Storage.prototype, o = { g: SP.getItem, s: SP.setItem, r: SP.removeItem, k: SP.key, c: SP.clear };
      SP.getItem = function (k) { return this === real ? o.g.call(real, PREFIX + k) : o.g.apply(this, arguments); };
      SP.setItem = function (k, v) { return this === real ? o.s.call(real, PREFIX + k, v) : o.s.apply(this, arguments); };
      SP.removeItem = function (k) { return this === real ? o.r.call(real, PREFIX + k) : o.r.apply(this, arguments); };
      SP.key = function (i) { return this === real ? api.key(i) : o.k.apply(this, arguments); };
      SP.clear = function () { return this === real ? api.clear() : o.c.apply(this, arguments); };
    }
    // The hub's service worker caches every game; don't let games register their own.
    try {
      if (navigator.serviceWorker) {
        var fakeReg = { update: function () { return Promise.resolve(); }, unregister: function () { return Promise.resolve(true); }, addEventListener: function () {}, scope: location.href };
        navigator.serviceWorker.register = function () { return Promise.resolve(fakeReg); };
      }
    } catch (e) {}
  }

  window.HubSave = {
    inHub: inHub,
    profileId: pid,
    profile: profile, // {id, name, avatar, color, age} or null
    get: function (k, d) { try { var v = api.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { api.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    remove: function (k) { api.removeItem(k); },
    keys: ownKeys,
    clear: api.clear,
    exit: function () { try { window.parent.postMessage({ hub: 'exit' }, '*'); } catch (e) {} }
  };
})();
