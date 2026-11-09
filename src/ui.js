const S = 60, IDLE_MS = 120000;
const $ = id => document.getElementById(id);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
let inGame = false, st = null, P = null, selected = -1, undo = [], hint = null, flashWrong = null, fresh = -1, tickT = null, won = false;

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function key(a, b) { return Math.min(a, b) * 10000 + Math.max(a, b); }
function sums() {
  const s = P.islands.map(() => 0);
  P.edges.forEach((e, k) => { s[e.a] += st.x[k]; s[e.b] += st.x[k]; });
  return s;
}
function progressScore() { let p = 0; st.x.forEach((v, k) => (p += Math.min(v, st.sol[k]))); return p; }

function bestKey() { return st.level === 'perso' ? `perso-${st.W}x${st.H}${st.custom && st.custom.hard ? '-d' : ''}` : st.level; }
function newGame(level, custom) {
  if (level === 'perso') {
    custom = custom || (st && st.custom) || store.get('hashi-custom') || { W: 12, H: 12, hard: false };
    LEVELS.perso = customLevel(custom.W, custom.H, custom.hard);
  }
  $('loading').classList.add('on');
  setTimeout(() => {
    const g = generate(level);
    st = { level, custom: level === 'perso' ? custom : null, W: g.W, H: g.H, islands: g.islands, sol: g.sol, x: g.sol.map(() => 0), elapsed: 0, hints: 0, done: false, no: 1000 + Math.floor(Math.random() * 9000) };
    start();
    $('loading').classList.remove('on');
  }, 30);
}
function start() {
  P = buildPuzzle(st.W, st.H, st.islands);
  selected = -1; undo = []; hint = null; flashWrong = null; won = st.done;
  st.lastProg = Date.now(); st.bestProg = progressScore();
  const L = LEVELS[st.level];
  $('meta').textContent = L.label + (st.custom && st.custom.hard ? ' difficile' : '') + ' · ' + st.W + '×' + st.H + ' · grille n° ' + st.no;
  $('board').setAttribute('viewBox', `0 0 ${st.W * S} ${st.H * S}`);
  fitStage(true);
  $('win').classList.remove('on');
  showHintText('');
  render(); save(); updateStats();
  if (won) showWin(false);
}
function save() { if (st) store.set('hashi-v1', st); }
function ensureHm() { if (st && !Array.isArray(st.hm)) st.hm = []; }

function addBridge(k) {
  if (won) return;
  const cur = st.x[k];
  if (cur >= 2) { showHintText('Deux ponts au maximum entre deux îles.', true); return; }
  if (P.cross[k].some(q => st.x[q] > 0)) { blocked(k); return; }
  undo.push([k, cur]);
  st.x[k] = cur + 1; fresh = k;
  afterMove();
}
function removeBridge(k) {
  if (won || st.x[k] <= 0) return;
  undo.push([k, st.x[k]]);
  st.x[k] -= 1; fresh = -1;
  afterMove();
}
function afterMove() {
  hint = null; flashWrong = null; showHintText('');
  const p = progressScore();
  if (p > st.bestProg) { st.bestProg = p; st.lastProg = Date.now(); }
  render(); save(); checkWin();
}
function blocked(k) {
  showHintText('Ce pont croiserait un pont existant.', true);
  fresh = -1; render();
}

function checkWin() {
  const s = sums();
  if (!s.every((v, i) => v === P.islands[i].n)) return;
  if (!connected(P, st.x)) { showHintText('Toutes les îles sont complètes, mais elles ne forment pas un seul groupe.', true); return; }
  st.done = true; won = true; save();
  const bests = store.get('hashi-best') || {};
  const prev = bests[bestKey()];
  const record = st.hints === 0 && (!prev || st.elapsed < prev);
  if (record) { bests[bestKey()] = st.elapsed; store.set('hashi-best', bests); }
  showWin(record);
}
function showWin(record) {
  $('winTime').textContent = fmt(st.elapsed);
  $('winHints').textContent = st.hints === 0 ? 'sans indice' : st.hints + (st.hints > 1 ? ' indices' : ' indice');
  $('winRecord').style.display = record ? 'block' : 'none';
  fitStage(true);
  $('win').classList.add('on');
  render();
}

function render() {
  const s = sums(), parts = [];
  for (let r = 0; r < st.H; r++) for (let c = 0; c < st.W; c++)
    parts.push(`<circle cx="${(c + .5) * S}" cy="${(r + .5) * S}" r="2.2" class="dot"/>`);
  if (hint && hint.level >= 1) {
    const is = P.islands[hint.island];
    const r0 = Math.max(0, is.r - 2), r1 = Math.min(st.H - 1, is.r + 2), c0 = Math.max(0, is.c - 2), c1 = Math.min(st.W - 1, is.c + 2);
    parts.push(`<rect class="zone" x="${c0 * S + 4}" y="${r0 * S + 4}" width="${(c1 - c0 + 1) * S - 8}" height="${(r1 - r0 + 1) * S - 8}" rx="14"/>`);
  }
  P.edges.forEach((e, k) => {
    const v = st.x[k];
    const a = P.islands[e.a], b = P.islands[e.b];
    const x1 = (a.c + .5) * S, y1 = (a.r + .5) * S, x2 = (b.c + .5) * S, y2 = (b.r + .5) * S;
    const wrong = flashWrong && flashWrong.has(k);
    const cls = 'br' + (wrong ? ' wrong' : '') + (k === fresh ? ' fresh' : '');
    const line = (o, extra) => e.h
      ? `<line class="${extra}" x1="${x1}" y1="${y1 + o}" x2="${x2}" y2="${y2 + o}" pathLength="1"/>`
      : `<line class="${extra}" x1="${x1 + o}" y1="${y1}" x2="${x2 + o}" y2="${y2}" pathLength="1"/>`;
    if (v === 1) parts.push(line(0, cls));
    if (v === 2) { parts.push(line(-6, cls)); parts.push(line(6, cls)); }
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const cap = hm(k);
    if (cap < 2 && v <= cap) parts.push(cap === 0 ? `<path class="hmark" d="M${mx - 7} ${my - 7}L${mx + 7} ${my + 7}M${mx + 7} ${my - 7}L${mx - 7} ${my + 7}"/>` : `<text class="hmark1" x="${mx}" y="${my + (e.h ? -10 : 5)}" dx="${e.h ? 0 : 14}">1 max</text>`);
    if (hint && hint.level >= 3 && (hint.k === k || (hint.note && hint.note.k === k))) {
      if (hint.type === 'note' || (hint.note && hint.note.k === k && hint.k !== k)) {
        const val = hint.type === 'note' ? hint.val : hint.note.val;
        parts.push(val === 0 ? `<path class="hmark ghostm" d="M${mx - 9} ${my - 9}L${mx + 9} ${my + 9}M${mx + 9} ${my - 9}L${mx - 9} ${my + 9}"/>` : `<text class="hmark1 ghostm" x="${mx}" y="${my + (e.h ? -10 : 5)}" dx="${e.h ? 0 : 14}">1 max</text>`);
      } else {
        const gc = hint.type === 'wrong' ? 'ghost bad' : 'ghost';
        if (hint.type === 'wrong' || hint.target === 1) parts.push(line(0, gc));
        else { parts.push(line(-6, gc)); parts.push(line(6, gc)); }
      }
    }
  });
  P.islands.forEach((is, i) => {
    const cx = (is.c + .5) * S, cy = (is.r + .5) * S;
    let cls = 'isl';
    if (s[i] === is.n) cls += ' full'; else if (s[i] > is.n) cls += ' over';
    if (i === selected) cls += ' sel';
    if (hint && hint.level >= 2 && hint.island === i) cls += ' hinted';
    if (hint && hint.level >= 3 && hint.fail && hint.fail.i === i) cls += ' failed';
    parts.push(`<g class="${cls}"><circle cx="${cx}" cy="${cy}" r="21"/><text x="${cx}" y="${cy + 8}">${is.n}</text></g>`);
  });
  $('board').innerHTML = parts.join('');
  fresh = -1;
}

function svgPoint(ev) {
  const svg = $('board'), p = svg.createSVGPoint();
  p.x = ev.clientX; p.y = ev.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}
function cellAt(pt) {
  const c = Math.floor(pt.x / S), r = Math.floor(pt.y / S);
  if (r < 0 || c < 0 || r >= st.H || c >= st.W) return null;
  return { r, c };
}
function islandNear(pt) {
  const cell = cellAt(pt);
  if (!cell) return -1;
  const i = P.grid[cell.r][cell.c];
  if (i < 0) return -1;
  const dx = pt.x - (cell.c + .5) * S, dy = pt.y - (cell.r + .5) * S;
  return dx * dx + dy * dy < 28 * 28 ? i : -1;
}
function edgeBetween(i, j) { const k = P.emap.get(key(i, j)); return k === undefined ? -1 : k; }
function edgeInDir(i, dx, dy) {
  for (const k of P.inc[i]) {
    const e = P.edges[k];
    if (e.h && dy === 0 && ((dx > 0 && e.a === i) || (dx < 0 && e.b === i))) return k;
    if (!e.h && dx === 0 && ((dy > 0 && e.a === i) || (dy < 0 && e.b === i))) return k;
  }
  return -1;
}

const Z = { s: 1, tx: 0, ty: 0, w: 0, h: 0, cell: 1, maxS: 3 };
function areaSize() { const a = $('area'); return { aw: a.clientWidth, ah: a.clientHeight }; }
function fitStage(reset) {
  if (!st) return;
  const { aw, ah } = areaSize(), pad = 6;
  const cell = Math.max(1, Math.min((aw - pad * 2) / st.W, (ah - pad * 2) / st.H));
  Z.cell = cell; Z.w = cell * st.W; Z.h = cell * st.H;
  Z.maxS = Math.max(2.5, 56 / cell);
  if (reset) Z.s = 1;
  applyZ();
}
function applyZ() {
  const { aw, ah } = areaSize();
  Z.s = Math.min(Z.maxS, Math.max(1, Z.s));
  const sw = Z.w * Z.s, sh = Z.h * Z.s;
  Z.tx = sw <= aw ? (aw - sw) / 2 : Math.min(0, Math.max(aw - sw, Z.tx));
  Z.ty = sh <= ah ? (ah - sh) / 2 : Math.min(0, Math.max(ah - sh, Z.ty));
  const stg = $('stage');
  stg.style.width = sw + 'px'; stg.style.height = sh + 'px';
  stg.style.transform = `translate(${Z.tx}px,${Z.ty}px)`;
}
function zoomAt(f, px, py) {
  const cx = (px - Z.tx) / Z.s, cy = (py - Z.ty) / Z.s;
  Z.s = Math.min(Z.maxS, Math.max(1, Z.s * f));
  Z.tx = px - cx * Z.s; Z.ty = py - cy * Z.s;
  applyZ();
}
function focusIsland(i) {
  if (Z.s <= 1.01) return;
  const { aw, ah } = areaSize(), is = P.islands[i];
  Z.tx = aw / 2 - (is.c + .5) * Z.cell * Z.s;
  Z.ty = ah / 2 - (is.r + .5) * Z.cell * Z.s;
  applyZ();
}
function areaXY(ev) { const r = $('area').getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }
const ptrs = new Map();
let gest = null;
function onDown(ev) {
  if (!st || ev.target.closest('#win')) return;
  ev.preventDefault();
  try { $('area').setPointerCapture(ev.pointerId); } catch (e) {}
  const p = areaXY(ev);
  ptrs.set(ev.pointerId, p);
  if (ptrs.size === 1) {
    const pt = svgPoint(ev);
    gest = { mode: 'tap', start: p, pt, island: won ? -1 : islandNear(pt), tx0: Z.tx, ty0: Z.ty };
  } else if (ptrs.size === 2) {
    clearPreview();
    const [a, b] = [...ptrs.values()];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    gest = { mode: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: Z.s, cx: (mx - Z.tx) / Z.s, cy: (my - Z.ty) / Z.s };
  }
}
function onMove(ev) {
  if (!ptrs.has(ev.pointerId) || !gest) return;
  const p = areaXY(ev);
  ptrs.set(ev.pointerId, p);
  if (gest.mode === 'pinch' && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    Z.s = Math.min(Z.maxS, Math.max(1, gest.s0 * d / gest.d0));
    Z.tx = mx - gest.cx * Z.s; Z.ty = my - gest.cy * Z.s;
    applyZ();
  } else if (gest.mode === 'tap' && gest.island < 0 && Math.hypot(p.x - gest.start.x, p.y - gest.start.y) > 8) {
    gest.mode = Z.s > 1.01 ? 'pan' : 'none';
  }
  if (gest.mode === 'tap' && gest.island >= 0) drawPreview(gest, svgPoint(ev));
  if (gest.mode === 'pan') {
    Z.tx = gest.tx0 + (p.x - gest.start.x); Z.ty = gest.ty0 + (p.y - gest.start.y);
    applyZ();
  }
}
function drawPreview(g, pt) {
  let ln = document.getElementById('preview');
  const is = P.islands[g.island], x0 = (is.c + .5) * S, y0 = (is.r + .5) * S;
  const dx = pt.x - x0, dy = pt.y - y0;
  if (Math.hypot(dx, dy) < 22) { if (ln) ln.remove(); return; }
  if (!ln) {
    ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.id = 'preview'; ln.setAttribute('class', 'preview');
    $('board').insertBefore(ln, $('board').querySelector('.isl'));
  }
  const h = Math.abs(dx) > Math.abs(dy);
  ln.setAttribute('x1', x0); ln.setAttribute('y1', y0);
  ln.setAttribute('x2', h ? pt.x : x0); ln.setAttribute('y2', h ? y0 : pt.y);
}
function clearPreview() { const ln = document.getElementById('preview'); if (ln) ln.remove(); }
function onEnd(ev) {
  clearPreview();
  if (!ptrs.has(ev.pointerId)) return;
  ptrs.delete(ev.pointerId);
  const g = gest;
  if (g && g.mode === 'tap' && ev.type === 'pointerup' && !won) handleTap(g, ev);
  if (ptrs.size === 0) gest = null;
  else if (g && g.mode === 'pinch') gest = { mode: 'none' };
}
function onWheel(ev) {
  if (!st) return;
  ev.preventDefault();
  const p = areaXY(ev);
  zoomAt(Math.exp(-ev.deltaY * 0.0015), p.x, p.y);
}
function handleTap(d, ev) {
  const pt = svgPoint(ev);
  const dx = pt.x - d.pt.x, dy = pt.y - d.pt.y, dist = Math.hypot(dx, dy);
  if (d.island >= 0) {
    if (dist < S * 0.45) return;
    const j = islandNear(pt);
    let k = j >= 0 && j !== d.island ? edgeBetween(d.island, j) : -1;
    if (k < 0) k = Math.abs(dx) > Math.abs(dy) ? edgeInDir(d.island, Math.sign(dx), 0) : edgeInDir(d.island, 0, Math.sign(dy));
    if (k >= 0) addBridge(k);
    return;
  }
  if (dist > S * 0.3) return;
  const cell = cellAt(pt);
  if (!cell) return;
  const list = P.cellMap.get(cell.r * st.W + cell.c) || [];
  const k = list.find(q => st.x[q] > 0);
  if (k !== undefined) removeBridge(k);
}

// ---------------------------------------------------------------------------
// Indices : une seule déduction, tirée uniquement de ce qui est visible sur la grille
// (îles, ponts posés, ponts qui croiseraient, liaisons déjà exclues par un indice).
// ---------------------------------------------------------------------------
const pl = (n, w) => n + ' ' + w + (n > 1 ? 's' : '');
function hm(k) { return st.hm && st.hm[k] !== undefined && st.hm[k] !== null ? st.hm[k] : 2; }
// What the player can see: bridges (lo) and, for each link, the most bridges it can still take (hi).
function visibleBounds(extraMax) {
  const lo = Int8Array.from(st.x), hi = new Int8Array(P.edges.length), left = P.islands.map(is => is.n);
  P.edges.forEach((e, k) => { left[e.a] -= lo[k]; left[e.b] -= lo[k]; });
  P.edges.forEach((e, k) => {
    let h = Math.min(2, P.islands[e.a].n, P.islands[e.b].n, hm(k));
    if (extraMax && extraMax[k] !== undefined) h = Math.min(h, extraMax[k]);
    if (P.cross[k].some(q => lo[q] > 0)) h = 0;
    h = Math.min(h, lo[k] + Math.max(0, left[e.a]), lo[k] + Math.max(0, left[e.b]));
    hi[k] = Math.max(h, lo[k]);
  });
  return { lo, hi, left };
}
function islandName(i) { return `l'île de ${P.islands[i].n}`; }
// Deductions that follow in one step from the visible state.
function oneStep(b) {
  const { lo, hi, left } = b, out = [];
  P.islands.forEach((is, i) => {
    if (left[i] <= 0) return;
    const L = P.inc[i];
    let sH = 0; for (const k of L) sH += hi[k];
    const open = L.filter(k => hi[k] > lo[k]);
    for (const k of L) {
      const nl = is.n - (sH - hi[k]);
      if (nl <= lo[k]) continue;
      const others = sH - hi[k], j = P.edges[k].a === i ? P.edges[k].b : P.edges[k].a;
      let text;
      if (open.length === 1) text = `Il manque encore ${pl(left[i], 'pont')} à ${islandName(i)}, et elle n'a plus qu'une seule voisine qui peut en recevoir (les autres sont complètes, hors de portée ou bloquées par un pont qui croise) : ${nl - lo[k] > 1 ? 'les ponts manquants vont' : 'le pont manquant va'} vers ${islandName(j)}.`;
      else if (others + hi[k] === is.n) text = `${islandName(i).charAt(0).toUpperCase() + islandName(i).slice(1)} a besoin de tous les ponts qu'elle peut encore recevoir : chacune de ses voisines doit lui en envoyer le maximum possible, dont ${pl(nl, 'pont')} vers ${islandName(j)}.`;
      else { const othersLeft = others - L.reduce((a, q) => a + (q !== k ? lo[q] : 0), 0); text = `Il manque ${pl(left[i], 'pont')} à ${islandName(i)}, mais ses autres voisines ne peuvent plus lui en donner que ${othersLeft} au plus. Il faut donc ${pl(nl - lo[k], 'pont')} de plus vers ${islandName(j)}.`; }
      out.push({ kind: 'place', k, val: nl, island: i, text });
    }
  });
  // links that would close a group of complete islands cut off from the rest
  P.edges.forEach((e, k) => {
    if (hi[k] <= lo[k]) return;
    for (let v = hi[k]; v > lo[k]; v--) {
      const l2 = lo.slice(); l2[k] = v;
      const sum = P.islands.map(() => 0); P.edges.forEach((f, q) => { sum[f.a] += l2[q]; sum[f.b] += l2[q]; });
      if (sum[e.a] !== P.islands[e.a].n || sum[e.b] !== P.islands[e.b].n) continue;
      const seen = new Set([e.a]), stack = [e.a];
      while (stack.length) { const i = stack.pop(); for (const q of P.inc[i]) if (l2[q] > 0) { const f = P.edges[q], j = f.a === i ? f.b : f.a; if (!seen.has(j)) { seen.add(j); stack.push(j); } } }
      if (seen.size === P.islands.length || [...seen].some(i => sum[i] !== P.islands[i].n)) continue;
      const max = v - 1;
      out.push({ kind: 'excl', k, val: max, island: e.a,
        text: `Avec ${pl(v, 'pont')} entre ${islandName(e.a)} et ${islandName(e.b)}, ${seen.size === 2 ? 'ces deux îles seraient complètes et formeraient un petit groupe' : `un groupe de ${seen.size} îles serait complet`} coupé du reste de l'archipel. Il ne peut donc y avoir ${max === 0 ? 'aucun pont' : 'qu\'un seul pont'} ici.` });
      break;
    }
  });
  return out;
}
function failText(f) {
  if (!f) return 'la grille deviendrait impossible';
  if (f.type === 'cross') return 'deux ponts devraient se croiser';
  if (f.type === 'split') return 'un groupe d\'îles se retrouverait coupé du reste';
  return `${islandName(f.i)} (entourée en rouge) ne pourrait plus avoir exactement ${pl(P.islands[f.i].n, 'pont')}`;
}
function findHint() {
  ensureHm();
  for (let k = 0; k < P.edges.length; k++) if (st.x[k] > st.sol[k]) {
    return { type: 'wrong', k, island: P.edges[k].a, text: 'Ce pont est en trop : retire-le.' };
  }
  for (let k = 0; k < P.edges.length; k++) if (st.sol[k] > hm(k)) { st.hm[k] = null; }   // safety
  const b = visibleBounds();
  const steps = oneStep(b);
  const place = steps.find(s => s.kind === 'place');
  if (place) return { type: 'logic', k: place.k, island: place.island, target: place.val, text: place.text };
  const excl = steps.filter(s => s.kind === 'excl');
  // an exclusion that unlocks a bridge right away
  for (const e of excl) {
    const b2 = visibleBounds({ [e.k]: e.val });
    const p2 = oneStep(b2).find(s => s.kind === 'place');
    if (p2) return { type: 'logic', k: p2.k, island: p2.island, target: p2.val, note: { k: e.k, val: e.val }, text: `${e.text} Du coup : ${p2.text.charAt(0).toLowerCase() + p2.text.slice(1)}` };
  }
  if (excl.length) { const e = excl[0]; return { type: 'note', k: e.k, island: e.island, val: e.val, text: e.text + ' (Je le note sur la grille.)' }; }
  // proof by contradiction: the shortest one
  let best = null;
  const { lo, hi } = b;
  for (let k = 0; k < lo.length; k++) {
    if (lo[k] >= hi[k]) continue;
    for (const add of [true, false]) {
      const l2 = lo.slice(), h2 = hi.slice();
      if (add) l2[k] = lo[k] + 1; else h2[k] = lo[k];
      let steps = 0;
      propagate.fail = null;
      const r = propagate(P, l2, h2, () => { steps++; return false; });
      let fail = null;
      if (r === false) fail = propagate.fail;
      else if (!connected(P, h2)) fail = { type: 'split' };
      if (!fail) continue;
      if (!best || steps < best.steps) best = { k, add, steps, fail };
    }
  }
  if (best) {
    const e = P.edges[best.k], what = `entre ${islandName(e.a)} et ${islandName(e.b)}`;
    if (best.add) return { type: 'note', k: best.k, island: e.a, val: st.x[best.k], fail: best.fail,
      text: `Raisonnement par l'absurde : si on ajoutait un pont ${what}, en enchaînant les déductions, ${failText(best.fail)}. On ne peut donc pas en ajouter (je le note sur la grille).` };
    return { type: 'logic', k: best.k, island: e.a, target: st.x[best.k] + 1, fail: best.fail,
      text: `Raisonnement par l'absurde : sans pont de plus ${what}, en enchaînant les déductions, ${failText(best.fail)}. Il faut donc ajouter un pont ici.` };
  }
  for (let k = 0; k < P.edges.length; k++) if (st.x[k] < st.sol[k]) return { type: 'logic', k, island: P.edges[k].a, target: st.x[k] + 1, text: 'Déduction avancée : un pont de plus va ici.' };
  return null;
}
function askHint() {
  if (!st || won) return;
  if (!hint) {
    hint = findHint();
    if (!hint) return;
    hint.level = 0;
    st.hints++; save(); updateStats();
  }
  hint.level = Math.min(3, hint.level + 1);
  const msgs = {
    1: hint.type === 'wrong' ? 'Il y a une erreur quelque part dans cette zone.' : 'Regarde dans cette zone : une déduction t\'y attend.',
    2: hint.type === 'wrong' ? 'L\'erreur touche cette île.' : `Concentre-toi sur cette île de ${P.islands[hint.island].n} et ses liaisons.`,
    3: hint.text
  };
  showHintText(msgs[hint.level], false, hint.level === 3);
  if (hint.level === 3) $('applyBtn').textContent = hint.type === 'note' ? 'Noter' : 'Poser';
  $('hintBtn').classList.remove('pulse');
  $('hintBtn').querySelector('span').textContent = hint.level < 3 ? 'Suite' : 'Indice';
  st.lastProg = Date.now();
  render();
  focusIsland(hint.island);
}
function applyHint() {
  if (!hint || hint.level < 3) return;
  if (!st.hm) st.hm = [];
  if (hint.note) st.hm[hint.note.k] = hint.note.val;
  if (hint.type === 'note') {
    st.hm[hint.k] = hint.val;
    hint = null; $('hintBtn').querySelector('span').textContent = 'Indice'; showHintText(''); render(); save();
    return;
  }
  const k = hint.k, cur = st.x[k];
  const v = hint.type === 'wrong' ? st.sol[k] : Math.max(cur, hint.target);
  if (v > 0 && P.cross[k].some(q => st.x[q] > 0)) { showHintText('Retire d\'abord le pont qui croise celui-ci.', true); return; }
  undo.push([k, cur]); st.x[k] = v; fresh = v > cur ? k : -1;
  $('hintBtn').querySelector('span').textContent = 'Indice';
  afterMove();
}
function showHintText(t, warn, withApply) {
  $('hintText').textContent = t;
  $('hintBox').classList.toggle('on', !!t);
  $('hintBox').classList.toggle('warn', !!warn);
  $('applyBtn').style.display = withApply ? 'inline-flex' : 'none';
  if (!t) $('hintBtn').querySelector('span').textContent = 'Indice';
}
function verify() {
  if (!st || won) return;
  const bad = new Set();
  st.x.forEach((v, k) => { if (v > st.sol[k]) bad.add(k); });
  flashWrong = bad;
  showHintText(bad.size ? `${bad.size} pont${bad.size > 1 ? 's' : ''} incorrect${bad.size > 1 ? 's' : ''}, en rouge.` : 'Aucune erreur pour l\'instant. Continue.', bad.size > 0);
  render();
  setTimeout(() => { flashWrong = null; render(); }, 2500);
}
function doUndo() {
  if (!undo.length || won) return;
  const [k, v] = undo.pop(); st.x[k] = v;
  hint = null; showHintText(''); render(); save();
}

// ---------- confirmation (in-page dialog) ----------
function askConfirm(text, okLabel, onOk) {
  $('cfText').textContent = text;
  $('cfYes').textContent = okLabel;
  $('confirm').classList.add('on');
  $('cfYes').onclick = () => { $('confirm').classList.remove('on'); onOk(); };
  $('cfNo').onclick = () => $('confirm').classList.remove('on');
}
function reset() {
  if (!st) return;
  st.x = st.x.map(() => 0); st.done = false; won = false; undo = []; hint = null;
  $('win').classList.remove('on'); showHintText(''); render(); save();
}

function showHome() {
  inGame = false;
  if (st) save();
  const bests = store.get('hashi-best') || {};
  document.querySelectorAll('[data-best]').forEach(el => {
    const b = bests[el.dataset.best];
    el.textContent = b ? 'record ' + fmt(b) : '';
  });
  const rb = $('resumeBtn');
  if (st && !st.done) {
    const L = LEVELS[st.level];
    $('resumeInfo').textContent = L.label + (st.custom && st.custom.hard ? ' difficile' : '') + ' · ' + st.W + '×' + st.H + ' · ' + fmt(st.elapsed);
    rb.classList.add('on');
  } else rb.classList.remove('on');
  $('home').classList.remove('hidden');
}
function showGame() {
  inGame = true;
  $('home').classList.add('hidden');
  if (st) { st.lastProg = Date.now(); fitStage(false); }
}
function updateStats() {
  if (!st) return;
  $('timer').textContent = fmt(st.elapsed);
  $('hintCount').textContent = st.hints;
  const b = (store.get('hashi-best') || {})[bestKey()];
  $('best').textContent = b ? fmt(b) : '—';
}
function tick() {
  if (!st || won || document.hidden || !inGame) return;
  st.elapsed += 1000; updateStats();
  if (Date.now() - st.lastProg > IDLE_MS && !hint) {
    if (!$('hintBtn').classList.contains('pulse')) {
      $('hintBtn').classList.add('pulse');
      showHintText('Tu bloques ? Un indice t\'attend.');
    }
  }
  if (st.elapsed % 5000 === 0) save();
}


function applyTheme(light) {
  document.body.classList.toggle('light', light);
  document.querySelectorAll('[data-theme-btn]').forEach(b => {
    b.textContent = light ? '暗' : '明';
    b.setAttribute('aria-label', light ? 'Mode sombre' : 'Mode clair');
  });
  try {
    const SB = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SystemBars;
    if (SB && SB.setStyle) SB.setStyle({ style: light ? 'LIGHT' : 'DARK' });
  } catch (e) {}
}
function init() {
  applyTheme(store.get('hashi-theme') === 'light');
  document.querySelectorAll('[data-theme-btn]').forEach(b => b.addEventListener('click', () => {
    const light = !document.body.classList.contains('light');
    store.set('hashi-theme', light ? 'light' : 'dark');
    applyTheme(light);
  }));
  document.querySelectorAll('.hl[data-l]').forEach(b => b.addEventListener('click', () => { showGame(); newGame(b.dataset.l); }));
  const cust = store.get('hashi-custom') || { W: 12, H: 12, hard: false };
  const syncCustom = () => {
    $('cwV').textContent = $('cw').value; $('chV').textContent = $('ch').value;
    $('cInfo').textContent = 'environ ' + customLevel(+$('cw').value, +$('ch').value, $('cHard').classList.contains('on')).max + ' îles';
  };
  $('cw').value = cust.W; $('ch').value = cust.H;
  $('cHard').classList.toggle('on', !!cust.hard); $('cClassic').classList.toggle('on', !cust.hard);
  ['cw', 'ch'].forEach(id => $(id).addEventListener('input', syncCustom));
  $('cClassic').addEventListener('click', () => { $('cClassic').classList.add('on'); $('cHard').classList.remove('on'); syncCustom(); });
  $('cHard').addEventListener('click', () => { $('cHard').classList.add('on'); $('cClassic').classList.remove('on'); syncCustom(); });
  $('customBtn').addEventListener('click', () => { const on = $('customPanel').classList.toggle('on'); syncCustom(); if (on) setTimeout(() => $('customPanel').scrollIntoView({ behavior: 'smooth', block: 'end' }), 50); });
  $('cPlay').addEventListener('click', () => {
    const c = { W: +$('cw').value, H: +$('ch').value, hard: $('cHard').classList.contains('on') };
    store.set('hashi-custom', c);
    showGame(); newGame('perso', c);
  });
  syncCustom();
  $('resumeBtn').addEventListener('click', showGame);
  $('backBtn').addEventListener('click', showHome);
  $('winHome').addEventListener('click', showHome);
  $('rulesBtn2').addEventListener('click', () => $('rules').classList.add('on'));
  const area = $('area');
  area.addEventListener('pointerdown', onDown);
  area.addEventListener('pointermove', onMove);
  area.addEventListener('pointerup', onEnd);
  area.addEventListener('pointercancel', onEnd);
  area.addEventListener('wheel', onWheel, { passive: false });
  $('hintBtn').addEventListener('click', askHint);
  $('applyBtn').addEventListener('click', applyHint);
  $('verifyBtn').addEventListener('click', verify);
  $('undoBtn').addEventListener('click', doUndo);
  $('resetBtn').addEventListener('click', () => {
    if (!st || won || !st.x.some(v => v)) { reset(); return; }
    askConfirm('Effacer tous tes coups sur cette grille ? Tu pourras revenir en arrière avec Annuler.', 'Effacer', reset);
  });
  $('newBtn').addEventListener('click', () => {
    const go = () => newGame(st ? st.level : 'facile');
    if (!st || won || !st.x.some(v => v)) { go(); return; }
    askConfirm('Commencer une nouvelle grille ? La grille en cours sera perdue.', 'Nouvelle grille', go);
  });
  $('winNew').addEventListener('click', () => newGame(st.level));
  window.addEventListener('resize', () => fitStage(false));
  $('rulesBtn').addEventListener('click', () => $('rules').classList.add('on'));
  $('rulesClose').addEventListener('click', () => $('rules').classList.remove('on'));
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); doUndo(); } });
  const saved = store.get('hashi-v1');
  if (saved && saved.islands && LEVELS[saved.level]) {
    st = saved;
    if (st.level === 'perso' && st.custom) LEVELS.perso = customLevel(st.custom.W, st.custom.H, st.custom.hard);
    start();
  }
  showHome();
  tickT = setInterval(tick, 1000);
  const intro = $('intro');
  const hideIntro = () => { if (intro.classList.contains('out')) return; intro.classList.add('out'); setTimeout(() => intro.remove(), 700); };
  intro.addEventListener('pointerdown', hideIntro);
  setTimeout(hideIntro, 2700);
}
init();
