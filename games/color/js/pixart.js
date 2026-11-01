/* Pixel art engine: compiles picture definitions (ASCII grids or shape drawings) into puzzles. */
(function () {
  'use strict';
  const PICS = (window.PICS = window.PICS || []);
  window.PIC = (d) => PICS.push(d);

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function hashStr(t) { let h = 2166136261; for (let k = 0; k < t.length; k++) { h ^= t.charCodeAt(k); h = Math.imul(h, 16777619); } return h >>> 0; }
  function pip(pts, x, y) {
    let inside = false;
    for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
      const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function segDist(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy;
    let t = L ? ((px - x0) * dx + (py - y0) * dy) / L : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
  }

  function helper(grid, N, seed) {
    const st = 100 / N;
    const inC = (cx, cy, r) => (x, y) => (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r;
    const inE = (cx, cy, rx, ry, rot) => {
      const a = ((rot || 0) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
      return (x, y) => { const dx = x - cx, dy = y - cy, u = dx * ca + dy * sa, v = -dx * sa + dy * ca; return (u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1; };
    };
    const inP = (pts) => (x, y) => pip(pts, x, y);
    function shape(inside, col, o) {
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = (i + 0.5) * st, y = (j + 0.5) * st;
        if (!inside(x, y)) continue;
        let c = col;
        if (o && !(inside(x - st, y) && inside(x + st, y) && inside(x, y - st) && inside(x, y + st))) c = o;
        grid[j * N + i] = c;
      }
    }
    function starPts(cx, cy, R, r, n, rot) {
      const pts = []; const a0 = ((rot || 0) - 90) * Math.PI / 180;
      for (let k = 0; k < n * 2; k++) { const rr = k % 2 ? r : R, a = a0 + (k * Math.PI) / n; pts.push(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
      return pts;
    }
    const g = {
      N, st, rand: rng(seed), shape, inC, inE, inP,
      c: (cx, cy, r, col, o) => shape(inC(cx, cy, r), col, o),
      e: (cx, cy, rx, ry, col, o, rot) => shape(inE(cx, cy, rx, ry, rot), col, o),
      r: (x0, y0, x1, y1, col, o) => shape((x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1, col, o),
      rr: (x0, y0, x1, y1, rad, col, o) => shape((x, y) => {
        if (x < x0 || x > x1 || y < y0 || y > y1) return false;
        const cx = Math.min(Math.max(x, x0 + rad), x1 - rad), cy = Math.min(Math.max(y, y0 + rad), y1 - rad);
        return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= rad * rad;
      }, col, o),
      p: (pts, col, o) => shape(inP(pts), col, o),
      l: (x0, y0, x1, y1, w, col, o) => { const hw = Math.max(w / 2, st * 0.72); shape((x, y) => segDist(x, y, x0, y0, x1, y1) <= hw, col, o); },
      pl: (pts, w, col) => { for (let k = 0; k + 3 < pts.length; k += 2) g.l(pts[k], pts[k + 1], pts[k + 2], pts[k + 3], w, col); },
      ring: (cx, cy, r1, r2, col) => shape((x, y) => { const d = Math.hypot(x - cx, y - cy); return d >= r1 && d <= r2; }, col),
      arc: (cx, cy, r, w, a0, a1, col) => {
        const hw = Math.max(w / 2, st * 0.72);
        shape((x, y) => {
          const d = Math.hypot(x - cx, y - cy); if (Math.abs(d - r) > hw) return false;
          const a = ((Math.atan2(y - cy, x - cx) * 180) / Math.PI + 360) % 360;
          return a0 <= a1 ? a >= a0 && a <= a1 : a >= a0 || a <= a1;
        }, col);
      },
      star: (cx, cy, R, r, n, col, o, rot) => shape(inP(starPts(cx, cy, R, r, n || 5, rot)), col, o),
      heart: (cx, cy, s, col, o) => shape((x, y) => {
        const X = ((x - cx) / s) * 1.25, Y = (-(y - cy) / s) * 1.25 + 0.15;
        const a = X * X + Y * Y - 1; return a * a * a - X * X * Y * Y * Y <= 0;
      }, col, o),
      px: (i, j, col) => { if (i >= 0 && j >= 0 && i < N && j < N) grid[j * N + i] = col; },
      pxr: (i0, j0, i1, j1, col) => { for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) g.px(i, j, col); },
      get: (i, j) => (i >= 0 && j >= 0 && i < N && j < N ? grid[j * N + i] : undefined),
      map: (fn) => { for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const v = fn(i, j, grid[j * N + i]); if (v !== undefined) grid[j * N + i] = v; } },
      sprinkle: (n, cols, test) => { for (let k = 0; k < n; k++) { const i = Math.floor(g.rand() * N), j = Math.floor(g.rand() * N); if (!test || test(i, j, grid[j * N + i])) grid[j * N + i] = cols[Math.floor(g.rand() * cols.length)]; } },
    };
    return g;
  }

  function compile(d) {
    const seed = hashStr(d.id);
    let N, grid;
    if (d.rows) {
      const sc = d.scale || 1;
      const H = d.rows.length, W = Math.max(...d.rows.map((r) => r.length));
      N = Math.max(W, H) * sc; grid = new Array(N * N).fill(d.bg || null);
      const ox = Math.floor((N / sc - W) / 2), oy = Math.floor((N / sc - H) / 2);
      d.rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x]; if (ch === '.' || ch === ' ') continue;
          const col = d.pal[ch];
          if (!col) { console.warn('bad char', d.id, ch); continue; }
          for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) grid[((oy + y) * sc + a) * N + (ox + x) * sc + b] = col;
        }
      });
      if (d.draw) d.draw(helper(grid, N, seed));
    } else {
      N = d.size; grid = new Array(N * N).fill(d.bg || null);
      d.draw(helper(grid, N, seed));
    }
    if (d.ol) {
      const bg = d.bg || null, src = grid.slice();
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const v = src[j * N + i]; if (v === bg) continue;
        if ((i > 0 && src[j * N + i - 1] === bg) || (i < N - 1 && src[j * N + i + 1] === bg) || (j > 0 && src[(j - 1) * N + i] === bg) || (j < N - 1 && src[(j + 1) * N + i] === bg)) grid[j * N + i] = d.ol;
      }
    }
    if (d.sh) shade(grid, N, d.bg || null, d.sh === true ? 0.8 : d.sh, d.nosh || [], d.ol);
    if (d.tex) {
      const R = rng(seed ^ 0x9e3779b9);
      for (let k = 0; k < grid.length; k++) { const t = d.tex[grid[k]]; if (t && R() < t[1]) grid[k] = t[0]; }
    }
    return fromGrid(d.id, d.name, d.cat, N, grid);
  }

  // auto-shading: darken the bottom/right rim of thick color regions for a soft 3D look
  function shade(grid, N, bg, f, skip, ol) {
    const src = grid.slice(), cache = new Map();
    const skipL = skip.map((c) => c.toLowerCase());
    const dk = (h) => { let v = cache.get(h); if (!v) { const [r, g, b] = hexRgb(h); const m = (c, k) => Math.max(0, Math.min(255, Math.round(c * k))); v = '#' + [m(r, f), m(g, f * 0.97), m(b, f * 1.05 > 1 ? 1 : f * 1.05)].map((x) => x.toString(16).padStart(2, '0')).join(''); cache.set(h, v); } return v; };
    const at = (i, j) => (i >= 0 && j >= 0 && i < N && j < N ? src[j * N + i] : bg);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const v = src[j * N + i]; if (!v || v === bg || v === ol) continue;
      const lv = v.toLowerCase(); if (skipL.includes(lv) || lum(v) < 60) continue;
      const bottom = at(i, j + 1) !== v && at(i, j - 1) === v && at(i, j - 2) === v && at(i, j - 3) === v;
      const right = at(i + 1, j) !== v && at(i - 1, j) === v && at(i - 2, j) === v && at(i - 3, j) === v;
      if (bottom || right) grid[j * N + i] = dk(v);
    }
  }
  function fromGrid(id, name, cat, N, grid) {
    const counts = new Map();
    for (const v of grid) if (v) counts.set(v.toLowerCase(), (counts.get(v.toLowerCase()) || 0) + 1);
    let keys = [...counts.keys()];
    const remap = new Map();
    while (keys.length > 16) { // merge the two closest colors (keeps every puzzle at 16 colors max)
      let best = [0, 1, 1e9];
      for (let a = 0; a < keys.length; a++) for (let b = a + 1; b < keys.length; b++) {
        const A = hexRgb(keys[a]), B = hexRgb(keys[b]); const dd = (A[0] - B[0]) ** 2 + (A[1] - B[1]) ** 2 + (A[2] - B[2]) ** 2;
        if (dd < best[2]) best = [a, b, dd];
      }
      const [a, b] = best; const keep = counts.get(keys[a]) >= counts.get(keys[b]) ? keys[a] : keys[b], drop = keep === keys[a] ? keys[b] : keys[a];
      counts.set(keep, counts.get(keep) + counts.get(drop)); counts.delete(drop); remap.set(drop, keep);
      for (const [k, v] of remap) if (v === drop) remap.set(k, keep);
      keys = [...counts.keys()];
    }
    const pal = keys.sort((a, b) => lum(a) - lum(b));
    const idx = new Map(pal.map((c, k) => [c, k]));
    const cells = new Int16Array(N * N);
    let total = 0;
    for (let k = 0; k < grid.length; k++) { const v = grid[k]; if (v) { const lc = v.toLowerCase(); cells[k] = idx.get(remap.get(lc) || lc); total++; } else cells[k] = -1; }
    return { id, name, cat, N, pal, cells, total };
  }
  function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function lum(h) { const [r, g, b] = hexRgb(h); return 0.299 * r + 0.587 * g + 0.114 * b; }

  window.PixArt = { compile, fromGrid, hexRgb, lum, hashStr, rng };
})();
