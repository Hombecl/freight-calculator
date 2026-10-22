import {useEffect, useMemo, useRef, useState} from 'react';
import {computeStats, type PackContainer, type PackItemSpec} from '../lib/binPacking';
import type {OptimizedResult, PackingPhase} from '../lib/optimizePacking';

type State = {key: string; status: 'running' | 'done' | 'error' | 'cancelled'; phase: PackingPhase; result?: OptimizedResult};
/** A fresh worker per calculation makes cancellation real (including synchronous
 * search). Cleanup and the active flag prevent superseded results being applied. */
export function usePackingWorker(container: PackContainer, specs: PackItemSpec[], revision: number) {
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([container, specs, revision, attempt]);
  const [state, setState] = useState<State>({key: '', status: 'running', phase: 'packing'});
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => {
    let active = true;
    let worker: Worker | undefined;
    setState({key, status: 'running', phase: 'packing'});
    const finishError = () => {
      if (active) setState({key, status: 'error', phase: 'packing'});
      worker?.terminate();
    };
    try {
      worker = new Worker(new URL('../workers/packing.worker.ts', import.meta.url), {type: 'module'});
      worker.onmessage = ({data}) => {
        if (!active) return;
        if (data.type === 'progress') setState({key, status: 'running', phase: data.phase});
        else if (data.type === 'result') {
          setState({key, status: 'done', phase: 'checking', result: data.result});
          worker?.terminate();
        } else finishError();
      };
      worker.onerror = finishError;
      worker.onmessageerror = finishError;
      worker.postMessage({container, specs});
    } catch { finishError(); }
    stop.current = () => {
      active = false;
      worker?.terminate();
      setState({key, status: 'cancelled', phase: 'packing'});
    };
    return () => {active = false; worker?.terminate(); stop.current = null;};
    // The serialized key includes every input and explicit retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const ready = state.key === key && state.status === 'done';
  const empty = useMemo<OptimizedResult>(() => ({boxes: [], unplaced: specs.reduce((n, s) => n + s.qty, 0),
    stats: computeStats([], container), zones: [], optimization: {baselineCount: 0, addedCount: 0, method: 'general'}}), [container, specs]);
  return {result: ready ? state.result! : empty, ready,
    status: state.key === key ? state.status : 'running', phase: state.phase,
    cancel: () => stop.current?.(), retry: () => setAttempt(n => n + 1)};
}
