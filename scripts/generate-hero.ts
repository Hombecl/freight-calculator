/** Build-time examples: the first visit never needs to run three packing jobs. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { packWithConstraints } from '../src/lib/binPacking';
import { HERO_SCENES } from './hero-scenes';

mkdirSync('public/hero', { recursive: true });
mkdirSync('src/data', { recursive: true });
const plans = {} as Record<string, unknown>;
const summary = {} as Record<string, unknown>;
for (const [name, scene] of Object.entries(HERO_SCENES)) {
  const result = packWithConstraints(scene.container, scene.specs);
  plans[name] = { container: scene.container, boxes: result.boxes };
  summary[name] = {
    placedCount: result.boxes.length,
    volumeUtil: result.stats.volumeUtil,
    totalWeight: result.stats.totalWeight,
  };
  // Isometric geometry drawn directly from the same placements used by live 3D.
  const { l, w, h } = scene.container;
  const scale = Math.min(620 / ((l + w) * .866), 310 / ((l + w) * .5 + h));
  const project = (x: number, y: number, z: number) =>
    `${(360 + (x - z - (l - w) / 2) * .866 * scale).toFixed(1)},${(355 - (x + z) * .5 * scale - y * scale).toFixed(1)}`;
  const face = (points: number[][], color: string, opacity = 1) =>
    `<polygon points="${points.map(([x,y,z]) => project(x,y,z)).join(' ')}" fill="${color}" fill-opacity="${opacity}" stroke="#0f172a" stroke-width=".6"/>`;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="440" viewBox="0 0 720 440"><rect width="720" height="440" fill="#0f172a"/>`;
  svg += face([[0,0,0],[l,0,0],[l,0,w],[0,0,w]], '#334155');
  // Back-to-front painter's order. Larger x/z are farther from the viewer.
  for (const b of [...result.boxes].sort((a,b) => (b.px + b.pz - b.py) - (a.px + a.pz - a.py))) {
    const x=b.px,y=b.py,z=b.pz, X=x+b.l,Y=y+b.h,Z=z+b.w;
    const color = `#${b.color.toString(16).padStart(6,'0')}`;
    svg += face([[x,y,z],[X,y,z],[X,Y,z],[x,Y,z]],color,.75);
    svg += face([[x,y,z],[x,y,Z],[x,Y,Z],[x,Y,z]],color,.9);
    svg += face([[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z]],color);
  }
  svg += '</svg>';
  writeFileSync(`public/hero/${name}.svg`, svg);
}
writeFileSync('src/data/hero-plans.json', JSON.stringify(plans));
writeFileSync('src/data/hero-summary.json', JSON.stringify(summary, null, 2) + '\n');
console.log('Generated three packing previews and matching 3D plans.');
