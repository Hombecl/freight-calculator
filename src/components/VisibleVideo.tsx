import { useEffect, useRef, type VideoHTMLAttributes } from 'react';
import { useVisibleMotion } from './useVisibleMotion';

/** Keep the product demonstration moving only while it is on screen. */
export default function VisibleVideo(props: VideoHTMLAttributes<HTMLVideoElement>) {
  const { ref, visible, allowed } = useVisibleMotion<HTMLVideoElement>();
  const pausedByUser = useRef(false);
  const automaticPause = useRef(false);
  const autoplaying = useRef(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!visible || (!allowed && autoplaying.current)) {
      automaticPause.current = true;
      autoplaying.current = false;
      video.pause();
    } else if (visible && allowed && !pausedByUser.current && video.paused) {
      automaticPause.current = false;
      autoplaying.current = true;
      void video.play().catch(() => { autoplaying.current = false; });
    }
    // A reduced-motion preference disables autoplay, not an explicit Play.
    // Becoming visible must not interrupt a manual play() that just started.
  }, [visible, allowed, ref]);
  return <video {...props} ref={ref} controls muted loop playsInline preload="none"
    onPause={() => { if (!automaticPause.current) { pausedByUser.current = true; autoplaying.current = false; } }}
    onPlay={() => { automaticPause.current = false; pausedByUser.current = false; }} />;
}
