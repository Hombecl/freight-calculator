#!/usr/bin/env node
/**
 * benchmark.mjs — run the DimPack3D engine on the Bischoff & Ratcliff (1995)
 * container-loading benchmark instances (OR-Library thpack1..3) and report
 * average volume utilization. This produces the honest, citable number for
 * /api-docs ("on standard academic instances the engine achieves ~X%").
 *
 * Notes on fairness:
 * - BR flags mark which box dimension may point UP. We map: only-h-vertical →
 *   keepUpright; otherwise free rotation. (Close, not exact.)
 * - Our engine ALWAYS enforces ≥60% base support and full 3D collision — some
 *   published results use weaker stability rules, so compare accordingly.
 * - Published heuristic averages on BR1–BR7 range roughly 83–95% depending on
 *   method and stability constraints.
 *
 * Usage: npx tsx scripts/benchmark.mjs [instancesPerFile=30]
 */

import { readFileSync } from 'node:fs';

const { packContainer } = await import('../src/lib/binPacking.ts');

const PER_FILE = Math.max(1, parseInt(process.argv[2] ?? '30', 10));
const FILES = ['tests/benchmarks/thpack1.txt', 'tests/benchmarks/thpack2.txt', 'tests/benchmarks/thpack3.txt'];

function parseBR(text) {
  const tok = text.split(/\s+/).filter(Boolean).map(Number);
  let i = 0;
  const nInst = tok[i++];
  const out = [];
  for (let k = 0; k < nInst; k++) {
    i += 2; // instance number, seed
    const [L, W, H] = [tok[i++], tok[i++], tok[i++]];
    const nTypes = tok[i++];
    const types = [];
    for (let t = 0; t < nTypes; t++) {
      i++; // type id
      const l = tok[i++], lv = tok[i++], w = tok[i++], wv = tok[i++], h = tok[i++], hv = tok[i++], n = tok[i++];
      types.push({ l, w, h, lv, wv, hv, n });
    }
    out.push({ container: { l: L, w: W, h: H }, types });
  }
  return out;
}

let all = [];
for (const f of FILES) {
  let text;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  const instances = parseBR(text).slice(0, PER_FILE);
  const utils = [];
  for (const inst of instances) {
    const specs = inst.types.map((t, idx) => ({
      id: `t${idx}`, label: `t${idx}`,
      l: t.l, w: t.w, h: t.h, weight: 0, qty: t.n, color: 1,
      // only the h-dimension may be vertical → this-way-up; otherwise free
      keepUpright: t.hv === 1 && t.lv === 0 && t.wv === 0,
    }));
    const r = packContainer(inst.container, specs);
    const vol = r.boxes.reduce((s, b) => s + b.l * b.w * b.h, 0);
    utils.push(vol / (inst.container.l * inst.container.w * inst.container.h) * 100);
  }
  const avg = utils.reduce((s, u) => s + u, 0) / utils.length;
  console.log(`${f.split('/').pop()}  n=${utils.length}  avg=${avg.toFixed(1)}%  min=${Math.min(...utils).toFixed(1)}%  max=${Math.max(...utils).toFixed(1)}%`);
  all = all.concat(utils);
}
const avg = all.reduce((s, u) => s + u, 0) / all.length;
console.log(`\nOVERALL  n=${all.length}  avg volume utilization = ${avg.toFixed(1)}%`);
console.log('(engine constraints: >=60% base support, full collision, load-bearing propagation)');
