// Classic worker: three.js r128's UMD build supports importScripts and an
// explicitly supplied OffscreenCanvas. No DOM, shipment uploads or telemetry.
import type { PlannerBox } from '../lib/plannerBox';
type PreviewMessage = { type: 'init'; canvas: OffscreenCanvas; width: number; height: number;
  plan: { container: { l: number; w: number; h: number }; boxes: PlannerBox[] }; showDoor: boolean; running: boolean }
  | { type: 'motion'; running: boolean } | { type: 'resize'; width: number; height: number };
const scope = self as unknown as {
  importScripts: (url: string) => void; THREE: any;
  postMessage: (value: unknown) => void; onmessage: (event: MessageEvent<PreviewMessage>) => void;
};
let renderer: any, scene: any, camera: any;
let running = false, theta = Math.PI / 4, radius = 1, lastTime = 0, lastNotice = 0, renderCount = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

function notifyFrame() {
  scope.postMessage({ type: 'frame', drawCalls: renderer.info.render.calls, renderCount });
}
function draw() {
  const phi = Math.PI * 0.32;
  camera.position.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  renderCount++;
}
function tick() {
  if (!running || !renderer) return;
  const now = performance.now();
  theta -= 0.132 * Math.min(now - lastTime, 100) / 1000;
  lastTime = now; draw();
  if (now - lastNotice > 400) { lastNotice = now; notifyFrame(); }
  timer = setTimeout(tick, 1000 / 30);
}

scope.onmessage = ({ data }) => {
  try {
    if (data.type === 'init') {
      scope.importScripts('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
      const T = scope.THREE, { container: c, boxes } = data.plan;
      renderer = new T.WebGLRenderer({ canvas: data.canvas, antialias: false, preserveDrawingBuffer: false });
      renderer.setSize(Math.max(data.width, 1), data.height, false);
      scene = new T.Scene(); scene.background = new T.Color(0x0f172a);
      camera = new T.PerspectiveCamera(45, Math.max(data.width, 1) / data.height, 0.1, 100000);
      radius = Math.max(c.l, c.w, c.h) * 2.1;
      scene.add(new T.AmbientLight(0xffffff, 0.75));
      const light = new T.DirectionalLight(0xffffff, 0.7); light.position.set(1, 2, 1.4); scene.add(light);
      const outline = (geometry: any, color: number, opacity: number) => new T.LineSegments(new T.EdgesGeometry(geometry),
        new T.LineBasicMaterial({ color, transparent: true, opacity }));
      scene.add(outline(new T.BoxGeometry(c.l, c.h, c.w), 0x38bdf8, 0.6));
      const floor = new T.Mesh(new T.PlaneGeometry(c.l, c.w), new T.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.55, side: T.DoubleSide }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -c.h / 2; scene.add(floor);
      if (data.showDoor) {
        const geometry = new T.PlaneGeometry(c.w, c.h);
        const door = new T.Mesh(geometry, new T.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.12, side: T.DoubleSide }));
        const edge = outline(geometry, 0x22c55e, 0.8);
        for (const object of [door, edge]) { object.rotation.y = Math.PI / 2; object.position.x = c.l / 2; scene.add(object); }
      }
      const unit = new T.BoxGeometry(1, 1, 1);
      const faces = new T.InstancedMesh(unit, new T.MeshLambertMaterial({ color: 0xffffff }), boxes.length);
      faces.frustumCulled = false;
      const template = new T.EdgesGeometry(unit), edges = template.attributes.position.array;
      const positions = new Float32Array(edges.length * boxes.length);
      boxes.forEach((b, i) => {
        const x = b.px + b.l / 2 - c.l / 2, y = b.py + b.h / 2 - c.h / 2, z = b.pz + b.w / 2 - c.w / 2;
        const matrix = new T.Matrix4().makeScale(b.l, b.h, b.w); matrix.setPosition(x, y, z);
        faces.setMatrixAt(i, matrix); faces.setColorAt(i, new T.Color(b.color));
        for (let j = 0; j < edges.length; j += 3) {
          positions[i * edges.length + j] = edges[j] * b.l + x;
          positions[i * edges.length + j + 1] = edges[j + 1] * b.h + y;
          positions[i * edges.length + j + 2] = edges[j + 2] * b.w + z;
        }
      });
      template.dispose(); scene.add(faces);
      const edgeGeometry = new T.BufferGeometry(); edgeGeometry.setAttribute('position', new T.BufferAttribute(positions, 3));
      const lines = new T.LineSegments(edgeGeometry, new T.LineBasicMaterial({ color: 0, transparent: true, opacity: 0.25 }));
      lines.frustumCulled = false; scene.add(lines);
      running = data.running; lastTime = performance.now(); draw(); notifyFrame();
      if (running) timer = setTimeout(tick, 1000 / 30);
    } else if (data.type === 'motion') {
      running = data.running; clearTimeout(timer);
      if (renderer) { lastTime = performance.now(); if (running) tick(); else notifyFrame(); }
    } else if (renderer) {
      renderer.setSize(Math.max(data.width, 1), data.height, false);
      camera.aspect = Math.max(data.width, 1) / data.height; camera.updateProjectionMatrix(); draw(); notifyFrame();
    }
  } catch { running = false; clearTimeout(timer); scope.postMessage({ type: 'unavailable' }); }
};
