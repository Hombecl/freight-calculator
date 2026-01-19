import { useRef, useEffect, useState } from 'react';

declare global {
  interface Window {
    THREE: typeof import('three');
  }
}

interface Packing3DPreviewProps {
  className?: string;
  product?: { l: number; w: number; h: number };
  carton?: { l: number; w: number; h: number };
  autoRotate?: boolean;
  forceOrientation?: { l: number; w: number; h: number }; // Force specific product orientation (for demo)
  cartonColor?: number; // Custom carton edge color
}

// Hook to check if THREE.js is loaded
const useThree = (): boolean => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (window.THREE) {
      setLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);
  return loaded;
};

// Calculate packing layout
function calculatePacking(
  product: { l: number; w: number; h: number },
  carton: { l: number; w: number; h: number },
  forceOrientation?: { l: number; w: number; h: number }
) {
  // If forcing a specific orientation, only use that one
  const orientations = forceOrientation
    ? [forceOrientation]
    : [
        { l: product.l, w: product.w, h: product.h },
        { l: product.l, w: product.h, h: product.w },
        { l: product.w, w: product.l, h: product.h },
        { l: product.w, w: product.h, h: product.l },
        { l: product.h, w: product.l, h: product.w },
        { l: product.h, w: product.w, h: product.l },
      ];

  let bestFit = 0;
  let bestOrientation = orientations[0];
  let bestCounts = { l: 0, w: 0, h: 0 };

  orientations.forEach((orient) => {
    const countL = Math.floor(carton.l / orient.l);
    const countW = Math.floor(carton.w / orient.w);
    const countH = Math.floor(carton.h / orient.h);
    const total = countL * countW * countH;
    if (total > bestFit) {
      bestFit = total;
      bestOrientation = orient;
      bestCounts = { l: countL, w: countW, h: countH };
    }
  });

  // Calculate utilization
  const productVolume = bestOrientation.l * bestOrientation.w * bestOrientation.h * bestFit;
  const cartonVolume = carton.l * carton.w * carton.h;
  const utilization = cartonVolume > 0 ? (productVolume / cartonVolume) * 100 : 0;

  // Generate item positions
  const items: { x: number; y: number; z: number; l: number; w: number; h: number }[] = [];
  for (let iz = 0; iz < bestCounts.h; iz++) {
    for (let iy = 0; iy < bestCounts.w; iy++) {
      for (let ix = 0; ix < bestCounts.l; ix++) {
        items.push({
          x: ix * bestOrientation.l,
          y: iy * bestOrientation.w,
          z: iz * bestOrientation.h,
          l: bestOrientation.l,
          w: bestOrientation.w,
          h: bestOrientation.h,
        });
      }
    }
  }

  return { items, count: bestFit, orientation: bestOrientation, utilization };
}

export default function Packing3DPreview({
  className = '',
  product = { l: 15, w: 10, h: 5 },
  carton = { l: 60, w: 40, h: 40 },
  autoRotate = true,
  forceOrientation,
  cartonColor = 0x60a5fa,
}: Packing3DPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const threeLoaded = useThree();

  useEffect(() => {
    if (!threeLoaded || !containerRef.current) return;

    const THREE = window.THREE;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e293b); // Dark slate

    // Camera
    const maxDim = Math.max(carton.l, carton.w, carton.h);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    const camX = maxDim * 1.5;
    const camY = maxDim * 1.0;
    const camZ = maxDim * 1.5;
    camera.position.set(camX, camY, camZ);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 100);
    scene.add(dirLight);

    // Group for rotation
    const group = new THREE.Group();
    scene.add(group);

    // Draw carton boundary (semi-transparent)
    const cartonGeometry = new THREE.BoxGeometry(carton.l, carton.h, carton.w);
    const cartonMaterial = new THREE.MeshBasicMaterial({
      color: cartonColor,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
    });
    const cartonMesh = new THREE.Mesh(cartonGeometry, cartonMaterial);
    const cartonEdges = new THREE.EdgesGeometry(cartonGeometry);
    const cartonLine = new THREE.LineSegments(
      cartonEdges,
      new THREE.LineBasicMaterial({ color: cartonColor, transparent: true, opacity: 0.5 })
    );
    group.add(cartonMesh);
    group.add(cartonLine);

    // Calculate packing
    const packing = calculatePacking(product, carton, forceOrientation);

    // Draw products
    const productColors = [0xfbbf24, 0xf59e0b, 0xd97706]; // Amber shades
    packing.items.forEach((item, index) => {
      const geo = new THREE.BoxGeometry(item.l - 0.5, item.h - 0.5, item.w - 0.5);
      const mat = new THREE.MeshLambertMaterial({
        color: productColors[index % productColors.length],
      });
      const mesh = new THREE.Mesh(geo, mat);

      // Position relative to carton center
      const x = item.x - (carton.l / 2) + (item.l / 2);
      const y = item.z - (carton.h / 2) + (item.h / 2);
      const z = item.y - (carton.w / 2) + (item.w / 2);
      mesh.position.set(x, y, z);

      // Add edges
      const edges = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15 })
      );
      mesh.add(line);
      group.add(mesh);
    });

    // Initial rotation
    group.rotation.x = 0.3;
    group.rotation.y = 0.5;

    // Mouse interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = () => { isDragging = true; };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaMove = { x: e.offsetX - previousMousePosition.x, y: e.offsetY - previousMousePosition.y };
        group.rotation.y += deltaMove.x * 0.01;
        group.rotation.x += deltaMove.y * 0.01;
      }
      previousMousePosition = { x: e.offsetX, y: e.offsetY };
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('mousemove', onMouseMove);

    // Touch events
    dom.addEventListener('touchstart', () => { isDragging = true; }, { passive: true });
    dom.addEventListener('touchend', () => { isDragging = false; }, { passive: true });
    dom.addEventListener('touchmove', (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        const touch = e.touches[0];
        const deltaMove = {
          x: touch.clientX - previousMousePosition.x,
          y: touch.clientY - previousMousePosition.y,
        };
        group.rotation.y += deltaMove.x * 0.01;
        group.rotation.x += deltaMove.y * 0.01;
        previousMousePosition = { x: touch.clientX, y: touch.clientY };
      }
    }, { passive: true });

    // Animation loop
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      if (autoRotate && !isDragging) {
        group.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [threeLoaded, product, carton, autoRotate, forceOrientation, cartonColor]);

  return (
    <div ref={containerRef} className={`w-full h-full cursor-move ${className}`}>
      {!threeLoaded && (
        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400 text-sm">
          Loading 3D...
        </div>
      )}
    </div>
  );
}
