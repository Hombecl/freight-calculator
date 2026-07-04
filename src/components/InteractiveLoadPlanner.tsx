import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * InteractiveLoadPlanner
 * ----------------------
 * A self-contained interactive 3D load-planning editor built on raw three.js
 * (CDN r128, same runtime as Packing3DPreview so no new deps / no React bump).
 *
 * What it adds over the read-only Packing3DPreview:
 *   - click to SELECT an individual box
 *   - DRAG it across the container floor (raycast onto a ground plane)
 *   - SNAP to a configurable grid
 *   - COLLISION test (3D AABB) so boxes never overlap
 *   - CLAMP so a box can never leave the container bounds
 *   - ROTATE the selected box 90° (footprint swap) with collision re-check
 *   - live UTILIZATION recompute + onChange callback
 *   - camera ORBIT / ZOOM on empty space (does not fight box dragging)
 *
 * Coordinate convention (container-local):
 *   origin at the container's min corner, ranges x∈[0,L] w∈[0,W] h∈[0,H].
 *   l runs along X, w runs along Z, h runs along Y (up). Boxes are stored by
 *   their MIN corner (px,py,pz) + size so collision math stays trivial.
 *   For three.js we recentre the container on the origin.
 */

export interface PlannerBox {
  id: string;
  label: string;
  l: number; // size along X
  w: number; // size along Z
  h: number; // size along Y (up)
  px: number; // min-corner X in [0, L-l]
  py: number; // min-corner Y (layer base) in [0, H-h]
  pz: number; // min-corner Z in [0, W-w]
  color: number;
  weight?: number; // per-unit weight (optional; carried through for stats)
  group?: string; // keep-together group (carried through for export)
  unloadOrder?: number; // LIFO unload order (carried through for export)
}

interface Props {
  className?: string;
  container: { l: number; w: number; h: number };
  boxes: PlannerBox[];
  grid?: number; // snap step in same unit as dims (default 1)
  unitLabel?: string; // 'cm' | 'inch' — display only
  showDoor?: boolean; // draw a door marker on the +X face (default true)
  onChange?: (boxes: PlannerBox[]) => void;
  registerSnapshot?: (fn: (() => string | null) | null) => void; // capture 3D view as PNG data URL
}

const EPS = 1e-6;

// ---- pure geometry helpers (unit-tested friendly, no three.js) ----

const overlaps3D = (a: PlannerBox, b: PlannerBox) =>
  a.px < b.px + b.l - EPS && a.px + a.l > b.px + EPS &&
  a.py < b.py + b.h - EPS && a.py + a.h > b.py + EPS &&
  a.pz < b.pz + b.w - EPS && a.pz + a.w > b.pz + EPS;

const collidesAny = (candidate: PlannerBox, all: PlannerBox[]) =>
  all.some((o) => o.id !== candidate.id && overlaps3D(candidate, o));

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const snap = (v: number, step: number) => (step > 0 ? Math.round(v / step) * step : v);

export const utilizationOf = (boxes: PlannerBox[], c: { l: number; w: number; h: number }) => {
  const used = boxes.reduce((s, b) => s + b.l * b.w * b.h, 0);
  const total = c.l * c.w * c.h;
  return total > 0 ? (used / total) * 100 : 0;
};

// Load three.js r128 from CDN once (mirrors Packing3DPreview's approach).
const useThree = (): boolean => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (window.THREE) { setLoaded(true); return; }
    const existing = document.querySelector<HTMLScriptElement>('script[data-three-cdn]');
    if (existing) {
      existing.addEventListener('load', () => setLoaded(true));
      if (window.THREE) setLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.async = true;
    script.dataset.threeCdn = '1';
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);
  return loaded;
};

export default function InteractiveLoadPlanner({
  className = '',
  container,
  boxes,
  grid = 1,
  unitLabel = 'cm',
  showDoor = true,
  onChange,
  registerSnapshot,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const threeLoaded = useThree();
  const [webglFailed, setWebglFailed] = useState(false);

  // The live source of truth for box positions. We keep it in a ref so the
  // three.js pointer handlers always see the latest without re-running effect.
  const boxesRef = useRef<PlannerBox[]>(boxes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const [util, setUtil] = useState(() => utilizationOf(boxes, container));

  // handles into the three scene we need across renders / from React buttons
  const sceneApi = useRef<{
    meshById: Map<string, any>;
    refresh: () => void;
    THREE: any;
  } | null>(null);

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  // Reset local state whenever the incoming plan changes (e.g. inputs recomputed).
  useEffect(() => {
    boxesRef.current = boxes.map((b) => ({ ...b }));
    setUtil(utilizationOf(boxesRef.current, container));
    setSelectedId(null);
    sceneApi.current?.refresh();
  }, [boxes, container]);

  const commit = useCallback(() => {
    setUtil(utilizationOf(boxesRef.current, container));
    onChange?.(boxesRef.current.map((b) => ({ ...b })));
  }, [container, onChange]);

  useEffect(() => {
    if (!threeLoaded || !mountRef.current) return;
    const THREE = window.THREE as any;
    const mount = mountRef.current;
    let width = mount.clientWidth || 640;
    let height = mount.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100000);
    const target = new THREE.Vector3(0, 0, 0);

    // spherical orbit state
    const maxDim = Math.max(container.l, container.w, container.h);
    let radius = maxDim * 2.1;
    let theta = Math.PI * 0.25; // azimuth
    let phi = Math.PI * 0.32;   // polar from +Y
    const applyCamera = () => {
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta),
      );
      camera.lookAt(target);
    };
    applyCamera();

    // WebGL can be unavailable (headless crawlers, GPU-blacklisted or locked-down
    // machines). Never let that take down the whole React tree.
    let renderer: any;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch {
      setWebglFailed(true);
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(1, 2, 1.4).multiplyScalar(maxDim);
    scene.add(dir);

    // container is recentred on the origin: local (0..L) -> world (-L/2..L/2)
    const off = { x: -container.l / 2, y: -container.h / 2, z: -container.w / 2 };
    const toWorld = (b: PlannerBox) => ({
      x: off.x + b.px + b.l / 2,
      y: off.y + b.py + b.h / 2,
      z: off.z + b.pz + b.w / 2,
    });

    // container wireframe + translucent floor
    const cGeo = new THREE.BoxGeometry(container.l, container.h, container.w);
    scene.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(cGeo),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 }),
    ));
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(container.l, container.w),
      new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = off.y;
    scene.add(floor);

    // door marker on the +X face (green frame) — items nearest here come out first
    if (showDoor) {
      const doorGeo = new THREE.PlaneGeometry(container.w, container.h);
      const door = new THREE.Mesh(
        doorGeo,
        new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.12, side: THREE.DoubleSide }),
      );
      door.rotation.y = Math.PI / 2;
      door.position.set(container.l / 2, 0, 0);
      scene.add(door);
      scene.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(doorGeo),
        new THREE.LineBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.8 }),
      ).translateX(container.l / 2).rotateY(Math.PI / 2));
    }

    const meshById = new Map<string, any>();

    const buildMesh = (b: PlannerBox) => {
      const geo = new THREE.BoxGeometry(b.l, b.h, b.w);
      const mat = new THREE.MeshLambertMaterial({ color: b.color });
      const mesh = new THREE.Mesh(geo, mat);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }),
      );
      mesh.add(edges);
      mesh.userData.id = b.id;
      const w = toWorld(b);
      mesh.position.set(w.x, w.y, w.z);
      return mesh;
    };

    const rebuild = () => {
      meshById.forEach((m) => scene.remove(m));
      meshById.clear();
      boxesRef.current.forEach((b) => {
        const m = buildMesh(b);
        meshById.set(b.id, m);
        scene.add(m);
      });
      applyHighlight();
    };

    const applyHighlight = () => {
      const sel = selectedIdRef.current;
      meshById.forEach((m, id) => {
        m.material.emissive?.setHex(id === sel ? 0x2563eb : 0x000000);
        m.material.opacity = 1;
        m.material.transparent = false;
      });
    };

    const syncMesh = (b: PlannerBox) => {
      const m = meshById.get(b.id);
      if (!m) return;
      const w = toWorld(b);
      m.position.set(w.x, w.y, w.z);
    };

    rebuild();

    sceneApi.current = {
      meshById,
      THREE,
      refresh: () => { rebuild(); },
    };

    // ---------- pointer interaction ----------
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const dom = renderer.domElement;

    let mode: 'idle' | 'orbit' | 'drag' = 'idle';
    let dragId: string | null = null;
    let dragPlane: any = null;
    let dragGrab = new THREE.Vector3(); // offset between hit point and box min-corner
    let last = { x: 0, y: 0 };

    const setNdc = (e: PointerEvent) => {
      const r = dom.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    };

    const pickBox = (): string | null => {
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects([...meshById.values()], false);
      return hits.length ? hits[0].object.userData.id : null;
    };

    const onDown = (e: PointerEvent) => {
      setNdc(e);
      last = { x: e.clientX, y: e.clientY };
      const id = pickBox();
      if (id) {
        const b = boxesRef.current.find((x) => x.id === id)!;
        setSelectedId(id);
        selectedIdRef.current = id;
        applyHighlight();
        mode = 'drag';
        dragId = id;
        // horizontal drag plane at the box base height
        const planeY = off.y + b.py;
        dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
        raycaster.setFromCamera(ndc, camera);
        const hit = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, hit);
        // grab offset in local coords
        dragGrab.set((hit.x - off.x) - b.px, 0, (hit.z - off.z) - b.pz);
      } else {
        mode = 'orbit';
      }
      dom.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (mode === 'orbit') {
        const dx = e.clientX - last.x;
        const dy = e.clientY - last.y;
        last = { x: e.clientX, y: e.clientY };
        theta -= dx * 0.01;
        phi = clamp(phi - dy * 0.01, 0.15, Math.PI / 2 - 0.02);
        applyCamera();
        return;
      }
      if (mode === 'drag' && dragId) {
        setNdc(e);
        raycaster.setFromCamera(ndc, camera);
        const hit = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(dragPlane, hit)) return;
        const b = boxesRef.current.find((x) => x.id === dragId)!;
        let nx = (hit.x - off.x) - dragGrab.x;
        let nz = (hit.z - off.z) - dragGrab.z;
        nx = clamp(snap(nx, grid), 0, container.l - b.l);
        nz = clamp(snap(nz, grid), 0, container.w - b.w);
        const trial: PlannerBox = { ...b, px: nx, pz: nz };
        if (!collidesAny(trial, boxesRef.current)) {
          b.px = nx; b.pz = nz;
          syncMesh(b);
        }
      }
    };

    const onUp = (e: PointerEvent) => {
      if (mode === 'drag') commit();
      mode = 'idle';
      dragId = null;
      try { dom.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      radius = clamp(radius * (1 + Math.sign(e.deltaY) * 0.1), maxDim * 0.6, maxDim * 6);
      applyCamera();
    };

    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      renderer.render(scene, camera);
    };
    loop();

    // expose a snapshot fn (renders once then reads the buffer)
    registerSnapshot?.(() => {
      try {
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
      } catch {
        return null;
      }
    });

    const onResize = () => {
      width = mount.clientWidth || width;
      height = mount.clientHeight || height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('wheel', onWheel);
      registerSnapshot?.(null);
      renderer.dispose();
      mount.innerHTML = '';
      sceneApi.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threeLoaded, container.l, container.w, container.h, grid]);

  // keep highlight in sync when selection changes via React
  useEffect(() => {
    const api = sceneApi.current;
    if (!api) return;
    api.meshById.forEach((m: any, id: string) => {
      m.material.emissive?.setHex(id === selectedId ? 0x2563eb : 0x000000);
    });
  }, [selectedId]);

  // ---- React-side actions on the selected box ----
  const rotateSelected = () => {
    const id = selectedIdRef.current;
    if (!id) return;
    const b = boxesRef.current.find((x) => x.id === id);
    if (!b) return;
    const trial: PlannerBox = { ...b, l: b.w, w: b.l };
    trial.px = clamp(trial.px, 0, container.l - trial.l);
    trial.pz = clamp(trial.pz, 0, container.w - trial.w);
    if (trial.l > container.l || trial.w > container.w) return;
    if (collidesAny(trial, boxesRef.current)) return;
    Object.assign(b, trial);
    sceneApi.current?.refresh();
    commit();
  };

  const dropToFloor = () => {
    const id = selectedIdRef.current;
    if (!id) return;
    const b = boxesRef.current.find((x) => x.id === id);
    if (!b) return;
    // lower until it rests on the floor or on top of another box
    let restY = 0;
    for (const o of boxesRef.current) {
      if (o.id === b.id) continue;
      const xOverlap = b.px < o.px + o.l - EPS && b.px + b.l > o.px + EPS;
      const zOverlap = b.pz < o.pz + o.w - EPS && b.pz + b.w > o.pz + EPS;
      if (xOverlap && zOverlap) restY = Math.max(restY, o.py + o.h);
    }
    b.py = clamp(restY, 0, container.h - b.h);
    sceneApi.current?.refresh();
    commit();
  };

  const resetPlan = () => {
    boxesRef.current = boxes.map((b) => ({ ...b }));
    setSelectedId(null);
    sceneApi.current?.refresh();
    commit();
  };

  const selected = boxesRef.current.find((b) => b.id === selectedId) || null;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div
        ref={mountRef}
        className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-900 touch-none select-none"
        style={{ cursor: selectedId ? 'grab' : 'move' }}
      >
        {webglFailed ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 text-sm px-6 text-center">
            <span className="font-semibold text-slate-300">3D view unavailable</span>
            <span>This device/browser has WebGL disabled. The optimizer still works — utilization and stats are shown below.</span>
          </div>
        ) : !threeLoaded && (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            Loading 3D…
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
          Utilization: {util.toFixed(1)}%
        </span>
        <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">
          Boxes: {boxesRef.current.length}
        </span>
        <button
          onClick={rotateSelected}
          disabled={!selected}
          className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-40"
        >
          Rotate 90°
        </button>
        <button
          onClick={dropToFloor}
          disabled={!selected}
          className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-40"
        >
          Drop to floor
        </button>
        <button
          onClick={resetPlan}
          className="px-3 py-1 rounded bg-slate-200 text-slate-700"
        >
          Reset to auto
        </button>
        {selected && (
          <span className="text-slate-500">
            Selected: {selected.label} ({selected.l}×{selected.w}×{selected.h} {unitLabel})
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400">
        Drag a box to move it on the floor · drag empty space to orbit · scroll to zoom.
        Moves snap to a {grid}{unitLabel} grid and are blocked when boxes would overlap.
      </p>
    </div>
  );
}
