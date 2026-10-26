"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📐 FIT-TO-HEIGHT SCALING                                             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// On short screens the rail's content is taller than the viewport, which used
// to force vertical scrolling. Instead we measure the natural (unscaled) height
// and uniformly scale the whole column down so it always fits — no scrollbar.
const NAV_MIN_SCALE = 0.4; // never shrink the rail below this factor

// useLayoutEffect on the client (measure before paint → no overflow flash),
// falling back to useEffect during SSR to avoid React's hydration warning.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Uniformly scale the rail so its full content fits the viewport height.
// offsetHeight is the *unscaled* layout height (CSS transforms don't affect
// layout), so measuring it while a scale is already applied is stable and
// can't feedback-loop.
export function useNavRailScale() {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [railScale, setRailScale] = useState(1);

  useIsomorphicLayoutEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const recompute = () => {
      const natural = el.offsetHeight;
      if (!natural) return;
      const next = Math.min(1, window.innerHeight / natural);
      setRailScale(Math.max(NAV_MIN_SCALE, next));
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, []);

  return { railRef, railScale };
}
