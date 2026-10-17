import { useEffect, useRef, useState } from 'react';
import plans from '../data/hero-plans.json';
import summary from '../data/hero-summary.json';
import { IS_ZH } from '../lib/locale';

/** Decorative WebGL runs off the main thread; editing is an explicit action. */
export default function HeroMotionPreview({ mode, running, onActivate }: {
  mode: keyof typeof plans; running: boolean; onActivate: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const worker = useRef<Worker | null>(null);
  const runningRef = useRef(running); runningRef.current = running;
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const element = canvas.current;
    if (!element || !element.transferControlToOffscreen) { setFallback(true); return; }
    let active: Worker | undefined;
    let resize: ResizeObserver | undefined;
    try {
      active = new Worker(new URL('../workers/heroPreview.ts', import.meta.url));
      worker.current = active;
      active.onmessage = ({ data }) => {
        if (data.type === 'unavailable') { setFallback(true); active?.terminate(); return; }
        if (data.type === 'frame') {
          setReady(true);
          // Observable performance counters, without adding controls or user data.
          element.dataset.drawCalls = String(data.drawCalls);
          element.dataset.renderCount = String(data.renderCount);
        }
      };
      active.onerror = () => { setFallback(true); active?.terminate(); };
      const surface = element.transferControlToOffscreen();
      active.postMessage({ type: 'init', canvas: surface, width: element.clientWidth, height: 360,
        plan: plans[mode], showDoor: mode === 'container', running: runningRef.current }, [surface]);
      resize = new ResizeObserver(() => active?.postMessage({ type: 'resize', width: element.clientWidth, height: 360 }));
      resize.observe(element);
    } catch { setFallback(true); active?.terminate(); }
    return () => { resize?.disconnect(); active?.terminate(); worker.current = null; };
  }, [mode]);
  useEffect(() => { worker.current?.postMessage({ type: 'motion', running }); }, [running]);
  return <div>
    <button type="button" onClick={onActivate} className="relative block w-full h-[360px] rounded-lg overflow-hidden bg-slate-900"
      aria-label={IS_ZH ? '編輯呢個 3D 示範' : 'Edit this 3D example'}>
      <canvas ref={canvas} className="w-full h-[360px]" style={{ visibility: ready && !fallback ? 'visible' : 'hidden' }} />
      {(!ready || fallback) && <img src={`/hero/${mode}.svg`} alt="" width={720} height={440}
        className={`absolute inset-0 w-full h-full object-contain ${fallback && running ? 'animate-rotate-y-slow' : ''}`} />}
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-slate-600 bg-slate-950/80 px-4 py-1.5 text-xs text-slate-200">
        {IS_ZH ? '撳此拖動、旋轉或堆疊紙箱' : 'Click to drag, rotate or stack cartons'}
      </span>
    </button>
    <div className="mt-3 flex gap-2 text-xs text-slate-300">
      <span className="rounded bg-slate-800 px-2 py-1">Utilization: {summary[mode].volumeUtil.toFixed(1)}%</span>
      <span className="rounded bg-slate-800 px-2 py-1">Boxes: {summary[mode].placedCount}</span>
    </div>
  </div>;
}
