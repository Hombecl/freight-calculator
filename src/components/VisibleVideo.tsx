import { useEffect, useRef, type VideoHTMLAttributes } from 'react';
import { useVisibleMotion } from './useVisibleMotion';

/** Keep the product demonstration moving only while it is on screen. */
export default function VisibleVideo(props: VideoHTMLAttributes<HTMLVideoElement>) {
  const { ref, visible, allowed } = useVisibleMotion<HTMLVideoElement>();
  const pausedByUser = useRef(false);
  const automaticPause = useRef(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (visible && allowed && !pausedByUser.current) {
      automaticPause.current = false;
      void video.play().catch(() => { /* Native controls remain available. */ });
    } else {
      automaticPause.current = true;
      video.pause();
    }
  }, [visible, allowed, ref]);
  return <video {...props} ref={ref} controls muted loop playsInline preload="none"
    onPause={() => { if (!automaticPause.current) pausedByUser.current = true; }}
    onPlay={() => { automaticPause.current = false; pausedByUser.current = false; }} />;
}
