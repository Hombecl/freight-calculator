import { optimizePacking } from '../lib/optimizePacking';
import type { PackContainer, PackItemSpec } from '../lib/binPacking';

self.onmessage = (event: MessageEvent<{container: PackContainer; specs: PackItemSpec[]}>) => {
  try {
    const result = optimizePacking(event.data.container, event.data.specs,
      phase => self.postMessage({type: 'progress', phase}));
    self.postMessage({type: 'result', result});
  } catch {
    self.postMessage({type: 'error'});
  }
};
