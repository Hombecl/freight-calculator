import { useEffect, useRef, useState } from 'react';

/** Decorative motion follows visibility and the visitor's motion/data preference. */
export function useVisibleMotion<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    let inView = false;
    const update = () => {
      setVisible(inView && !document.hidden);
      setAllowed(!motion.matches && !connection?.saveData);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio >= 0.15;
      update();
    }, { threshold: [0, 0.15] });
    observer.observe(element);
    motion.addEventListener('change', update);
    connection?.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer.disconnect();
      motion.removeEventListener('change', update);
      connection?.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return { ref, visible, allowed };
}
