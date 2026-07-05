import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../hooks", () => ({
  usePerKaryawanRincian: vi.fn(() => ({ perKaryawan: [], loading: false })),
}));
vi.mock("../utils", () => ({
  generateWAText: vi.fn(() => "WA_TEXT"),
}));
vi.mock("./GajianShareCard", () => ({
  default: React.forwardRef(function GajianShareCard(props, ref) {
    return <div ref={ref} data-testid="share-card">ShareCard</div>;
  }),
}));

Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

import ShareModal from "./ShareModal";

const gajian = { tanggal_sabtu: "2026-07-04", status: "draft" };
const totals = { gaji: 5000000 };

beforeEach(() => {
  vi.clearAllMocks();
  navigator.clipboard.writeText.mockResolvedValue(undefined);
});

describe("ShareModal", () => {
  it("renders Bagikan Ringkasan title", () => {
    render(<ShareModal gajian={gajian} totals={totals} gajianId="g1" tambahan={[]} pettycash="0" kasbonDeds={[]} totalRequest={0} onClose={vi.fn()} />);
    expect(screen.getByText("Bagikan Ringkasan")).toBeInTheDocument();
  });

  it("renders wa text in default teks tab", () => {
    render(<ShareModal gajian={gajian} totals={totals} gajianId="g1" tambahan={[]} pettycash="0" kasbonDeds={[]} totalRequest={0} onClose={vi.fn()} />);
    expect(screen.getByText("WA_TEXT")).toBeInTheDocument();
  });

  it("calls onClose when × clicked", () => {
    const onClose = vi.fn();
    render(<ShareModal gajian={gajian} totals={totals} gajianId="g1" tambahan={[]} pettycash="0" kasbonDeds={[]} totalRequest={0} onClose={onClose} />);
    fireEvent.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    render(<ShareModal gajian={gajian} totals={totals} gajianId="g1" tambahan={[]} pettycash="0" kasbonDeds={[]} totalRequest={0} onClose={onClose} />);
    fireEvent.click(document.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });

  it("copies wa text when Salin Teks clicked", async () => {
    render(<ShareModal gajian={gajian} totals={totals} gajianId="g1" tambahan={[]} pettycash="0" kasbonDeds={[]} totalRequest={0} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Salin Teks"));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    expect(screen.getByText("✓ Tersalin")).toBeInTheDocument();
  });

  it("opens WA link when Buka di WA clicked", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<ShareModal gajian={gajian} totals={totals} gajianId="g1" tambahan={[]} pettycash="0" kasbonDeds={[]} totalRequest={0} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Buka di WA"));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining("wa.me"), "_blank");
    openSpy.mockRestore();
  });

  it("switches to gambar tab", () => {
    render(<ShareModal gajian={gajian} totals={totals} gajianId="g1" tambahan={[]} pettycash="0" kasbonDeds={[]} totalRequest={0} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/Gambar/));
    expect(screen.getByTestId("share-card")).toBeInTheDocument();
  });

  it("shows Unduh PNG button in gambar tab", () => {
    render(<ShareModal gajian={gajian} totals={totals} gajianId="g1" tambahan={[]} pettycash="0" kasbonDeds={[]} totalRequest={0} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/Gambar/));
    expect(screen.getByText("Unduh PNG")).toBeInTheDocument();
  });
});

// ── html-to-image mock (hoisted by Vitest) ─────────────────────────────────
vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,ABC"),
}));

describe("ShareModal — tab switching back to teks", () => {
  it("clicking Teks WA tab while on gambar switches back", async () => {
    render(<ShareModal gajian={gajian} totals={totals} gajianId="g1" tambahan={[]} pettycash="0" kasbonDeds={[]} totalRequest={0} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/🖼 Gambar/));
    expect(screen.getByTestId("share-card")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/📝 Teks WA/));
    expect(screen.getByText("WA_TEXT")).toBeInTheDocument();
    expect(screen.queryByTestId("share-card")).not.toBeInTheDocument();
  });
});

describe("ShareModal — downloadImage", () => {
  it("calls toPng and triggers download on Unduh PNG click", async () => {
    const { toPng } = await import("html-to-image");
    render(<ShareModal gajian={gajian} totals={totals} gajianId="g1" tambahan={[]} pettycash="0" kasbonDeds={[]} totalRequest={0} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/🖼 Gambar/));
    // Set up createElement spy AFTER render so RTL internals are not affected
    const fakeLink = { href: "", download: "", click: vi.fn() };
    const createSpy = vi.spyOn(document, "createElement").mockReturnValueOnce(fakeLink);
    fireEvent.click(screen.getByText("Unduh PNG"));
    await waitFor(() => expect(toPng).toHaveBeenCalled());
    createSpy.mockRestore();
  });

  it("shows Memproses while generating", async () => {
    const { toPng } = await import("html-to-image");
    let resolveCapture;
    toPng.mockReturnValueOnce(new Promise((res) => { resolveCapture = res; }));
    render(<ShareModal gajian={gajian} totals={totals} gajianId="g1" tambahan={[]} pettycash="0" kasbonDeds={[]} totalRequest={0} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/🖼 Gambar/));
    fireEvent.click(screen.getByText("Unduh PNG"));
    await waitFor(() => expect(screen.getByText("Memproses...")).toBeInTheDocument());
    resolveCapture("data:image/png;base64,ABC");
  });
});

describe("ShareModal — shareImage", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(["img"], { type: "image/png" })),
    });
  });
  afterEach(() => {
    global.fetch = undefined;
  });

  it("calls navigator.share when canShare returns true", async () => {
    const { toPng } = await import("html-to-image");
    Object.assign(navigator, {
      canShare: vi.fn().mockReturnValue(true),
      share: vi.fn().mockResolvedValue(undefined),
    });
    render(<ShareModal gajian={gajian} totals={totals} gajianId="g1" tambahan={[]} pettycash="0" kasbonDeds={[]} totalRequest={0} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/🖼 Gambar/));
    fireEvent.click(screen.getByText("Bagikan Gambar"));
    await waitFor(() => expect(toPng).toHaveBeenCalled());
    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    Object.assign(navigator, { canShare: undefined, share: undefined });
  });

  it("falls back to download when canShare is false", async () => {
    const { toPng } = await import("html-to-image");
    Object.assign(navigator, { canShare: vi.fn().mockReturnValue(false), share: undefined });
    render(<ShareModal gajian={gajian} totals={totals} gajianId="g1" tambahan={[]} pettycash="0" kasbonDeds={[]} totalRequest={0} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/🖼 Gambar/));
    // spy AFTER render to avoid breaking RTL internals
    const fakeLink = { href: "", download: "", click: vi.fn() };
    const createSpy = vi.spyOn(document, "createElement").mockReturnValueOnce(fakeLink);
    fireEvent.click(screen.getByText("Bagikan Gambar"));
    await waitFor(() => expect(toPng).toHaveBeenCalled());
    createSpy.mockRestore();
    Object.assign(navigator, { canShare: undefined });
  });

  it("does not throw on AbortError during share", async () => {
    const { toPng } = await import("html-to-image");
    const abortErr = new DOMException("User cancelled", "AbortError");
    Object.assign(navigator, {
      canShare: vi.fn().mockReturnValue(true),
      share: vi.fn().mockRejectedValue(abortErr),
    });
    render(<ShareModal gajian={gajian} totals={totals} gajianId="g1" tambahan={[]} pettycash="0" kasbonDeds={[]} totalRequest={0} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/Gambar/));
    expect(() => fireEvent.click(screen.getByText("Bagikan Gambar"))).not.toThrow();
    await waitFor(() => expect(toPng).toHaveBeenCalled());
    Object.assign(navigator, { canShare: undefined, share: undefined });
  });
});
