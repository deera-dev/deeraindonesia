import { useEffect } from "react";

export function useHeroPreload(models) {
  useEffect(() => {
    if (!Array.isArray(models) || models.length === 0) return;

    const heroImage = models[0]?.image;
    if (!heroImage) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = heroImage;
    link.fetchPriority = "high";

    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [models]);
}
