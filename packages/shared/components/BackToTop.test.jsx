import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createRef } from "react";
import BackToTop from "./BackToTop";

// Redesign 2026-07: scroll-tracking sekarang di-throttle lewat
// requestAnimationFrame (lihat hooks/useScrollVisibility.js) untuk
// performa — pengecekan visibilitas jadi ASINKRON 1 frame, jadi test di
// bawah pakai `waitFor` (bukan assert langsung sinkron seperti versi lama).

describe("BackToTop (mode window)", () => {
  beforeEach(() => {
    window.scrollY = 0;
    window.scrollTo.mockClear?.();
  });

  it("tombol TETAP di-mount saat scroll masih di bawah threshold (bukan return null) — tapi tidak bisa diklik/dibaca screen reader", async () => {
    render(<BackToTop />);
    // { hidden: true } perlu karena tombol memakai aria-hidden="true" saat
    // tidak visible — testing-library MENGECUALIKAN elemen aria-hidden dari
    // accessibility tree secara default (perilaku yang sama seperti screen
    // reader sungguhan), jadi query harus eksplisit minta elemen tersembunyi.
    const btn = screen.getByRole("button", { hidden: true });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-label", "Kembali ke atas");
    expect(btn).toHaveAttribute("aria-hidden", "true");
    expect(btn).toHaveAttribute("tabindex", "-1");
    expect(btn.className).toContain("opacity-0");
    expect(btn.className).toContain("pointer-events-none");
  });

  it("muncul (visible, bisa diklik) setelah window scroll melewati threshold default (300)", async () => {
    render(<BackToTop />);
    window.scrollY = 400;
    fireEvent.scroll(window);

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: "Kembali ke atas" });
      expect(btn).toHaveAttribute("aria-hidden", "false");
      expect(btn).toHaveAttribute("tabindex", "0");
      expect(btn.className).toContain("opacity-100");
    });
  });

  it("klik tombol memanggil window.scrollTo({ top: 0, behavior: 'smooth' })", async () => {
    render(<BackToTop />);
    window.scrollY = 400;
    fireEvent.scroll(window);
    await waitFor(() => expect(screen.getByRole("button")).toHaveAttribute("aria-hidden", "false"));

    fireEvent.click(screen.getByRole("button"));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("memakai threshold custom", async () => {
    render(<BackToTop threshold={50} />);
    window.scrollY = 60;
    fireEvent.scroll(window);
    await waitFor(() => expect(screen.getByRole("button")).toHaveAttribute("aria-hidden", "false"));
  });

  it("sembunyi lagi saat scroll kembali ke bawah threshold", async () => {
    render(<BackToTop />);
    window.scrollY = 400;
    fireEvent.scroll(window);
    await waitFor(() => expect(screen.getByRole("button")).toHaveAttribute("aria-hidden", "false"));

    window.scrollY = 0;
    fireEvent.scroll(window);
    await waitFor(() =>
      expect(screen.getByRole("button", { hidden: true })).toHaveAttribute("aria-hidden", "true"),
    );
  });

  it("memakai className kustom jika diberikan (override default right-4)", () => {
    render(<BackToTop className="left-4" />);
    const btn = screen.getByRole("button", { hidden: true });
    expect(btn.className).toContain("left-4");
    expect(btn.className).not.toContain("right-4");
  });

  it("listener scroll dilepas saat unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<BackToTop />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
    removeSpy.mockRestore();
  });

  it("scroll listener didaftarkan sebagai passive (performa)", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<BackToTop />);
    const call = addSpy.mock.calls.find(([type]) => type === "scroll");
    expect(call[2]).toEqual({ passive: true });
    addSpy.mockRestore();
  });
});

describe("BackToTop — offset otomatis (redesign 2026-07: hilangkan bottomClass manual)", () => {
  it("withBottomNav=true (default) memakai offset yang clear Bottom Navigation + safe-area", () => {
    render(<BackToTop />);
    const btn = screen.getByRole("button", { hidden: true });
    expect(btn.style.bottom).toBe("calc(88px + env(safe-area-inset-bottom))");
  });

  it("withBottomNav=false memakai offset lebih kecil (halaman tanpa Bottom Navigation)", () => {
    render(<BackToTop withBottomNav={false} />);
    const btn = screen.getByRole("button", { hidden: true });
    expect(btn.style.bottom).toBe("calc(24px + env(safe-area-inset-bottom))");
  });

  it("offsetPx custom mengalahkan withBottomNav", () => {
    render(<BackToTop offsetPx={150} />);
    const btn = screen.getByRole("button", { hidden: true });
    expect(btn.style.bottom).toBe("calc(150px + env(safe-area-inset-bottom))");
  });
});

describe("BackToTop — label & accessibility", () => {
  it("menampilkan label teks 'Atas' secara default (showLabel=true)", () => {
    render(<BackToTop />);
    expect(screen.getByText("Atas")).toBeInTheDocument();
  });

  it("showLabel=false menyembunyikan label teks (ikon saja)", () => {
    render(<BackToTop showLabel={false} />);
    expect(screen.queryByText("Atas")).not.toBeInTheDocument();
  });

  it("area sentuh minimal 48px (melebihi 44px minimum aksesibilitas)", () => {
    render(<BackToTop />);
    const btn = screen.getByRole("button", { hidden: true });
    expect(btn.className).toContain("h-12"); // h-12 = 48px
  });

  it("selalu punya aria-label 'Kembali ke atas' terlepas dari showLabel", () => {
    // Nama aksesibel via getByRole({name}) dihitung "" saat aria-hidden=true
    // (elemen memang sengaja disembunyikan dari a11y tree saat tidak
    // visible) — jadi di sini cek langsung atribut aria-label mentahnya.
    render(<BackToTop showLabel={false} />);
    expect(screen.getByRole("button", { hidden: true })).toHaveAttribute("aria-label", "Kembali ke atas");
  });

  it("punya focus-visible ring untuk navigasi keyboard", () => {
    render(<BackToTop />);
    expect(screen.getByRole("button", { hidden: true }).className).toContain("focus-visible:ring-2");
  });

  it("label teks 'Atas' aria-hidden (tidak dibaca dobel oleh screen reader bareng aria-label)", () => {
    render(<BackToTop />);
    const label = screen.getByText("Atas");
    expect(label).toHaveAttribute("aria-hidden", "true");
  });
});

describe("BackToTop (mode scrollEl)", () => {
  function Wrapper({ threshold }) {
    const ref = createRef();
    return (
      <div>
        <div data-testid="scroll-box" ref={ref} style={{ overflow: "auto" }}>
          inner
        </div>
        <BackToTop scrollEl={ref} threshold={threshold} />
      </div>
    );
  }

  it("memakai el.scrollTop, bukan window.scrollY, saat scrollEl diberikan", async () => {
    render(<Wrapper />);
    const box = screen.getByTestId("scroll-box");
    Object.defineProperty(box, "scrollTop", { value: 500, configurable: true });

    fireEvent.scroll(box);

    await waitFor(() => expect(screen.getByRole("button")).toHaveAttribute("aria-hidden", "false"));
  });

  it("klik tombol memanggil el.scrollTo saat scrollEl diberikan", async () => {
    render(<Wrapper />);
    const box = screen.getByTestId("scroll-box");
    Object.defineProperty(box, "scrollTop", { value: 500, configurable: true });
    box.scrollTo = vi.fn();
    fireEvent.scroll(box);
    await waitFor(() => expect(screen.getByRole("button")).toHaveAttribute("aria-hidden", "false"));

    fireEvent.click(screen.getByRole("button"));

    expect(box.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("cek awal saat mount: visible true jika scrollTop sudah > threshold sebelum event apa pun", async () => {
    function PreScrolled() {
      const ref = createRef();
      return (
        <div>
          <div
            data-testid="scroll-box2"
            ref={(node) => {
              if (node) Object.defineProperty(node, "scrollTop", { value: 999, configurable: true });
              ref.current = node;
            }}
          />
          <BackToTop scrollEl={ref} />
        </div>
      );
    }
    render(<PreScrolled />);
    await waitFor(() => expect(screen.getByRole("button")).toHaveAttribute("aria-hidden", "false"));
  });
});
