import { useEffect, useRef, useState } from "react";

export default function ScaleToFitPreview({ contentWidth, children }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const containerWidth = outer.clientWidth;
      const nextScale = containerWidth > 0 ? Math.min(1, containerWidth / contentWidth) : 1;
      const nextHeight = inner.scrollHeight;

      setScale((prev) => (Math.abs(prev - nextScale) < 0.001 ? prev : nextScale));
      setNaturalHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [contentWidth]);

  return (
    <div ref={outerRef} className="w-full">
      <div style={{ height: naturalHeight * scale || undefined }}>
        <div
          ref={innerRef}
          style={{
            width: contentWidth,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
