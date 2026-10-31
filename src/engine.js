const LEVELS = {
  facile:    { W: 7,  H: 7,  min: 9,  max: 12, label: 'Facile',    kanji: '易' },
  moyen:     { W: 10, H: 10, min: 18, max: 23, label: 'Moyen',     kanji: '中' },
  difficile: { W: 13, H: 13, min: 30, max: 36, label: 'Difficile', kanji: '難' },
  expert:    { W: 13, H: 18, min: 42, max: 50, label: 'Expert',    kanji: '極' },
  maitre:    { W: 18, H: 22, min: 70, max: 82, label: 'Maître',    kanji: '鬼' }
};
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

function buildPuzzle(W, H, islands) {
  const grid = Array.from({ length: H }, () => new Int16Array(W).fill(-1));
  islands.forEach((is, i) => (grid[is.r][is.c] = i));
  const edges = [], inc = islands.map(() => []);
  const addEdge = (a, b, h) => {
    const cells = [];
    if (h) for (let c = islands[a].c + 1; c < islands[b].c; c++) cells.push([islands[a].r, c]);
    else for (let r = islands[a].r + 1; r < islands[b].r; r++) cells.push([r, islands[a].c]);
    const k = edges.length;
    edges.push({ a, b, h, cells });
    inc[a].push(k); inc[b].push(k);
  };
  islands.forEach((is, i) => {
    for (let c = is.c + 1; c < W; c++) { const j = grid[is.r][c]; if (j >= 0) { addEdge(i, j, true); break; } }
    for (let r = is.r + 1; r < H; r++) { const j = grid[r][is.c]; if (j >= 0) { addEdge(i, j, false); break; } }
  });
  const cellMap = new Map();
  edges.forEach((e, k) => e.cells.forEach(([r, c]) => {
    const key = r * W + c;
    if (!cellMap.has(key)) cellMap.set(key, []);
    cellMap.get(key).push(k);
  }));
  const cross = edges.map(() => []);
  cellMap.forEach(list => {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const p = list[i], q = list[j];
      if (edges[p].h !== edges[q].h) {
        if (!cross[p].includes(q)) cross[p].push(q);
        if (!cross[q].includes(p)) cross[q].push(p);
      }
    }
  });
  const emap = new Map();
  edges.forEach((e, k) => emap.set(Math.min(e.a, e.b) * 10000 + Math.max(e.a, e.b), k));
  return { W, H, islands, grid, edges, inc, cross, cellMap, emap };
}

function initHi(P) {
  const nI = P.islands.length, hi = new Int8Array(P.edges.length);
  P.edges.forEach((e, k) => {
    const na = P.islands[e.a].n, nb = P.islands[e.b].n;
    let h = Math.min(2, na, nb);
    if (nI > 2 && na === nb && na <= 2) h = Math.min(h, na - 1);
    hi[k] = h;
  });
  return hi;
}

// Returns false on contradiction, 'stop' if stopAt asked to stop, true otherwise.
function propagate(P, lo, hi, stopAt) {
  const { edges, inc, cross, islands } = P;
  let changed = true;
  while (changed) {
    changed = false;
    for (let k = 0; k < edges.length; k++) if (lo[k] > 0) for (const x of cross[k]) {
      if (lo[x] > 0) return false;
      if (hi[x] > 0) { hi[x] = 0; changed = true; }
    }
    for (let i = 0; i < islands.length; i++) {
      const need = islands[i].n, L = inc[i];
      let sL = 0, sH = 0;
      for (const k of L) { sL += lo[k]; sH += hi[k]; }
      if (sL > need || sH < need) return false;
      for (const k of L) {
        const nl = Math.max(lo[k], need - (sH - hi[k]));
        const nh = Math.min(hi[k], need - (sL - lo[k]));
        if (nl > nh) return false;
        if (nh < hi[k]) { sH -= hi[k] - nh; hi[k] = nh; changed = true; }
        if (nl > lo[k]) {
          if (stopAt && stopAt(k, nl, i)) { lo[k] = nl; return 'stop'; }
          sL += nl - lo[k]; lo[k] = nl; changed = true;
        }
      }
    }
  }
  return true;
}

function connected(P, arr) {
  const n = P.islands.length;
  if (!n) return true;
  const seen = new Uint8Array(n), st = [0];
  seen[0] = 1; let cnt = 1;
  while (st.length) {
    const i = st.pop();
    for (const k of P.inc[i]) if (arr[k] > 0) {
      const e = P.edges[k], j = e.a === i ? e.b : e.a;
      if (!seen[j]) { seen[j] = 1; cnt++; st.push(j); }
    }
  }
  return cnt === n;
}

function countSolutions(P, limit, maxNodes) {
  let count = 0, sol = null, nodes = 0;
  maxNodes = maxNodes || 60000;
  const rec = (lo, hi) => {
    if (count >= limit || nodes > maxNodes) return;
    nodes++;
    if (propagate(P, lo, hi) === false) return;
    if (!connected(P, hi)) return;
    let best = -1, bestScore = 99;
    for (let i = 0; i < P.islands.length; i++) {
      let open = 0, cand = -1;
      for (const k of P.inc[i]) if (lo[k] < hi[k]) { open++; cand = k; }
      if (open && open < bestScore) { bestScore = open; best = cand; if (open === 1) break; }
    }
    if (best < 0) { if (connected(P, lo)) { count++; sol = Array.from(lo); } return; }
    for (let v = hi[best]; v >= lo[best]; v--) {
      const l2 = lo.slice(), h2 = hi.slice();
      l2[best] = v; h2[best] = v;
      rec(l2, h2);
      if (count >= limit) return;
    }
  };
  rec(new Int8Array(P.edges.length), initHi(P));
  return { count, sol, aborted: nodes > maxNodes };
}

function generateOnce(L) {
  const { W, H } = L;
  const target = L.min + Math.floor(Math.random() * (L.max - L.min + 1));
  const occ = Array.from({ length: H }, () => new Int8Array(W));
  const isl = [], conns = [];
  const r0 = Math.floor(Math.random() * H), c0 = Math.floor(Math.random() * W);
  isl.push({ r: r0, c: c0 }); occ[r0][c0] = 1;
  const maxD = Math.max(2, Math.floor(Math.max(W, H) / 2));
  let tries = 0;
  while (isl.length < target && tries < target * 400) {
    tries++;
    const a = Math.floor(Math.random() * isl.length);
    const [dr, dc] = DIRS[Math.floor(Math.random() * 4)];
    const dist = 2 + Math.floor(Math.random() * (maxD - 1));
    const r = isl[a].r + dr * dist, c = isl[a].c + dc * dist;
    if (r < 0 || c < 0 || r >= H || c >= W || occ[r][c]) continue;
    let ok = true;
    for (let s = 1; s < dist; s++) if (occ[isl[a].r + dr * s][isl[a].c + dc * s]) { ok = false; break; }
    if (!ok) continue;
    for (const [er, ec] of DIRS) {
      const rr = r + er, cc = c + ec;
      if (rr >= 0 && cc >= 0 && rr < H && cc < W && occ[rr][cc] === 1) { ok = false; break; }
    }
    if (!ok) continue;
    for (let s = 1; s < dist; s++) occ[isl[a].r + dr * s][isl[a].c + dc * s] = 2;
    occ[r][c] = 1;
    isl.push({ r, c });
    conns.push([a, isl.length - 1, Math.random() < 0.42 ? 2 : 1]);
  }
  if (isl.length < L.min) return null;
  const base = buildPuzzle(W, H, isl.map(x => ({ r: x.r, c: x.c, n: 0 })));
  const weight = new Map();
  conns.forEach(([a, b, w]) => weight.set(Math.min(a, b) * 10000 + Math.max(a, b), w));
  base.edges.forEach(e => {
    const key = Math.min(e.a, e.b) * 10000 + Math.max(e.a, e.b);
    if (weight.has(key) || Math.random() > 0.15) return;
    if (e.cells.every(([r, c]) => occ[r][c] === 0)) {
      e.cells.forEach(([r, c]) => (occ[r][c] = 2));
      weight.set(key, 1);
    }
  });
  const islands = isl.map(x => ({ r: x.r, c: x.c, n: 0 }));
  const sol = base.edges.map(e => weight.get(Math.min(e.a, e.b) * 10000 + Math.max(e.a, e.b)) || 0);
  base.edges.forEach((e, k) => { islands[e.a].n += sol[k]; islands[e.b].n += sol[k]; });
  return { W, H, islands, sol };
}

function generate(levelKey) {
  const L = LEVELS[levelKey];
  let fallback = null;
  const t0 = Date.now();
  for (let attempt = 0; attempt < 400; attempt++) {
    const g = generateOnce(L);
    if (!g) continue;
    if (!fallback) fallback = g;
    const P = buildPuzzle(g.W, g.H, g.islands);
    const res = countSolutions(P, 2, 40000);
    if (res.count === 1 && !res.aborted) return { ...g, unique: true, attempts: attempt + 1 };
    if (Date.now() - t0 > 6000) break;
  }
  return { ...fallback, unique: false };
}

if (typeof module !== 'undefined') module.exports = { LEVELS, buildPuzzle, initHi, propagate, connected, countSolutions, generate };
