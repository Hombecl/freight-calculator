import InteractiveLoadPlanner from './InteractiveLoadPlanner';
import plans from '../data/hero-plans.json';

/** Loaded only after an explicit interaction; no optimizer on the critical path. */
export default function HeroInteractive({ mode }: { mode: keyof typeof plans }) {
  const scene = plans[mode];
  return <InteractiveLoadPlanner key={mode} container={scene.container} boxes={scene.boxes}
    grid={1} unitLabel="cm" showDoor={mode === 'container'} autoSpin hintOverlay />;
}
