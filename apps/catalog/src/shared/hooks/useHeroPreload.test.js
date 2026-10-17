import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHeroPreload } from "./useHeroPreload";

function preloadLinks() {
  return document.head.querySelectorAll('link[rel="preload"]');
}

describe("useHeroPreload", () => {
  it("tidak menambah link saat models bukan array", () => {
    renderHook(() => useHeroPreload(undefined));
    expect(preloadLinks().length).toBe(0);
  });

  it("tidak menambah link saat models array kosong", () => {
    renderHook(() => useHeroPreload([]));
    expect(preloadLinks().length).toBe(0);
  });

  it("tidak menambah link saat models[0] tidak punya image", () => {
    renderHook(() => useHeroPreload([{ kode: "D-01-OSK" }]));
    expect(preloadLinks().length).toBe(0);
  });

  it("tidak menambah link saat models[0] bernilai null (optional chaining)", () => {
    renderHook(() => useHeroPreload([null]));
    expect(preloadLinks().length).toBe(0);
  });

  it("menambahkan link preload ke document.head saat ada hero image", () => {
    renderHook(() => useHeroPreload([{ image: "hero.jpg" }]));
    const links = preloadLinks();
    expect(links.length).toBe(1);
    expect(links[0].getAttribute("href")).toBe("hero.jpg");
    expect(links[0].as).toBe("image");
    expect(links[0].fetchPriority).toBe("high");
  });

  it("menghapus link dari document.head saat unmount", () => {
    const { unmount } = renderHook(() => useHeroPreload([{ image: "hero.jpg" }]));
    expect(preloadLinks().length).toBe(1);
    unmount();
    expect(preloadLinks().length).toBe(0);
  });

  it("mengganti link lama dengan link baru saat models berubah", () => {
    const { rerender } = renderHook(({ models }) => useHeroPreload(models), {
      initialProps: { models: [{ image: "hero-a.jpg" }] },
    });
    expect(preloadLinks()[0].getAttribute("href")).toBe("hero-a.jpg");

    rerender({ models: [{ image: "hero-b.jpg" }] });

    const links = preloadLinks();
    expect(links.length).toBe(1);
    expect(links[0].getAttribute("href")).toBe("hero-b.jpg");
  });
});
