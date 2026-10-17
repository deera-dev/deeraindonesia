import { useEffect, useRef, useState } from "react";

export function useScrollVisibility({ threshold = 300, scrollEl = null } = {}) {
  const [visible, setVisible] = useState(false);
  const tickingRef = useRef(false);

  useEffect(() => {
    const el = scrollEl?.current ?? null;
    const target = el ?? window;

    function measure() {
      const scrollTop = el ? el.scrollTop : window.scrollY;
      setVisible(scrollTop > threshold);
      tickingRef.current = false;
    }

    function onScroll() {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(measure);
    }

    target.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => target.removeEventListener("scroll", onScroll);
  }, [threshold, scrollEl]);

  return visible;
}

export default useScrollVisibility;
