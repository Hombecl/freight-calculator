import InteractiveLoadPlanner from './InteractiveLoadPlanner';
import plans from '../data/hero-plans.json';

/** Precomputed scene: automatic motion does not run the optimizer on page load. */
export default function HeroInteractive({ mode, autoSpin }: { mode: keyof typeof plans; autoSpin: boolean }) {
  const scene = plans[mode];
  return <InteractiveLoadPlanner key={mode} container={scene.container} boxes={scene.boxes}
    viewportHeight={360} maxPixelRatio={1} batchBoxes loadingPreview={`/hero/${mode}.svg`}
    grid={1} unitLabel="cm" showDoor={mode === 'container'} autoSpin={autoSpin} hintOverlay />;
}
