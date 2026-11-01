# Game Hub: adding a game

The hub is one home-screen web app: **pick a profile → pick a game → play** (🏠 button returns to the picker).
Every profile's progress is kept separate on the iPad.

## Layout
```
index.html  hub.js  hub.css  games.js (registry)  hub-sdk.js  sw.js (generated)  manifest.webmanifest  icons/
games/<id>/index.html   <- each game, self-contained (relative paths only)
games/<id>/hub-icon.png <- tile icon (made by integrate.sh from icon.png / icon-512.png / icons/icon-192.png …)
tools/build-sw.py       <- regenerates sw.js cache list     tools/patches/<id>.py <- optional per-game tweak
tools/test.js           <- headless iPad test (screens/ gets the screenshots)
```

## Plug a game in (one command)
```
./integrate.sh <id> <src_dir> [name] [emoji] [color]
# e.g. ./integrate.sh space /workspace/space-shooter "Star Blaster" 🚀 "#2a2f8f"
```
It copies the folder to `games/<id>/` (skips screens/, *.md, sw.js, zips), injects
`<script src="../../hub-sdk.js"></script>` as the first tag in `<head>`, makes the tile icon,
marks the game `"status":"ready"` in `games.js` (tiles not ready show "Coming soon"),
runs `tools/patches/<id>.py` if present, and regenerates `sw.js` so the game works offline.
Re-run it any time the source game changes.

Game requirements: an `index.html` entry, relative asset paths, works full-screen in an iframe.
Set `"corner"` (`tl`/`tr`/`bl`/`br`) in `games.js` to move the 🏠 button off important controls.

## Storage (per profile)
The game runs at `games/<id>/index.html?profile=<ID>&hub=1` (the hub also sets `localStorage['hub.activeProfile']`).
`hub-sdk.js` then:
- **Shims `localStorage`** so plain `getItem/setItem/removeItem/key/length/clear`, `localStorage.foo`, and
  `Object.keys(localStorage)` are transparently stored as `hub.p.<profileId>.<key>`. No code changes needed.
- Exposes `window.HubSave = { inHub, profileId, profile:{id,name,avatar,color,age}, get(key, def), set(key, val), remove, keys(), clear(), exit() }`
  (`get/set` JSON-encode; `exit()` returns to the picker). Use `HubSave.profile.age` to choose a difficulty.
- Stubs the game's own `navigator.serviceWorker.register` (the hub's SW caches everything).
Not shimmed: IndexedDB, cookies, sessionStorage. Use localStorage/HubSave for saves.
Opened standalone (no hub), games behave exactly as before.

Deleting a profile (Grown-ups: hold ⚙️ 3 s → tap the player → hold 🗑️ 3 s) removes all its `hub.p.<id>.*` keys.

## Test / ship
`NODE_PATH=/workspace/kg-test/node_modules node tools/test.js` (Chrome headless, 1180×820 + 820×1180).
Zip: `/workspace/game-hub.zip` (everything except screens/ and tools/test.js).
Host the folder on any static HTTPS host, open it in Safari, Share → Add to Home Screen.
