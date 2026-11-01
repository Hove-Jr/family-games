#!/usr/bin/env bash
# Usage: ./integrate.sh <id> <src_dir> [name] [emoji] [color]
# Copies a self-contained HTML/JS game into games/<id>/, injects hub-sdk.js (per-profile storage shim),
# picks an icon, marks the game "ready" in games.js, runs tools/patches/<id>.py if present,
# and regenerates the service-worker cache list (sw.js).
set -euo pipefail
HUB="$(cd "$(dirname "$0")" && pwd)"
ID="${1:?id}"; SRC="${2:?src_dir}"; NAME="${3:-}"; EMOJI="${4:-}"; COLOR="${5:-}"
[[ "$ID" =~ ^[a-z0-9-]+$ ]] || { echo "id must be lowercase letters/digits/dashes"; exit 1; }
[ -f "$SRC/index.html" ] || { echo "no index.html in $SRC"; exit 1; }
DST="$HUB/games/$ID"
rm -rf "$DST"; mkdir -p "$DST"
tar -C "$SRC" --exclude='./screens' --exclude='./screenshots' --exclude='node_modules' --exclude='*.md' --exclude='*.zip' \
  --exclude='./sw.js' --exclude='test*.js' --exclude='*.log' --exclude='./.*' -cf - . | tar -C "$DST" -xf -
python3 - "$HUB" "$ID" "$NAME" "$EMOJI" "$COLOR" <<'PY'
import sys, os, re, json, shutil
hub, gid, name, emoji, color = sys.argv[1:6]
d = os.path.join(hub, 'games', gid)
# 1) inject the SDK/shim as the first script in <head> (before any game code touches localStorage)
p = os.path.join(d, 'index.html'); s = open(p, encoding='utf-8').read()
tag = '<script src="../../hub-sdk.js"></script>'
if tag not in s:
    s, n = re.subn(r'(<head[^>]*>)', r'\1\n' + tag, s, count=1, flags=re.I)
    if not n: s = tag + '\n' + s
open(p, 'w', encoding='utf-8').write(s)
# 2) icon -> games/<id>/hub-icon.png (256px)
icon = None
for c in ['icon.png', 'hub-icon.png', 'icon-512.png', 'icons/icon-512.png', 'icon-192.png', 'icons/icon-192.png', 'icon-180.png', 'icons/apple-touch-icon.png', 'apple-touch-icon.png']:
    if os.path.isfile(os.path.join(d, c)): icon = c; break
if icon:
    try:
        from PIL import Image
        im = Image.open(os.path.join(d, icon)).convert('RGBA'); im.thumbnail((256, 256)); im.save(os.path.join(d, 'hub-icon.png'), optimize=True)
        icon = 'hub-icon.png'
    except Exception as e:
        print('icon resize skipped:', e)
# 3) optional per-game patch
pp = os.path.join(hub, 'tools', 'patches', gid + '.py')
if os.path.isfile(pp):
    os.system('python3 "%s" "%s"' % (pp, d)); print('applied patch', pp)
# 4) registry
gp = os.path.join(hub, 'games.js'); g = open(gp, encoding='utf-8').read()
arr = json.loads(g[g.index('['):g.rindex(']') + 1])
e = next((x for x in arr if x['id'] == gid), None)
if not e: e = {'id': gid, 'name': name or gid, 'sub': '', 'emoji': emoji or '🎮', 'color': color or '#ff4fa3', 'corner': 'tl'}; arr.append(e)
if name: e['name'] = name
if emoji: e['emoji'] = emoji
if color: e['color'] = color
e['status'] = 'ready'
if icon: e['icon'] = icon
head = g[:g.index('window.HUB_GAMES')]
open(gp, 'w', encoding='utf-8').write(head + 'window.HUB_GAMES = [\n' + ',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in arr) + '\n];\n')
print('registered', gid, '->', e['name'])
PY
python3 "$HUB/tools/build-sw.py"
echo "integrated $ID from $SRC ($(du -sh "$DST" | cut -f1))"
