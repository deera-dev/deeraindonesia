import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,abc"),
}));
vi.mock("../hooks/useTsplPrinter", () => ({
  useTsplPrinter: vi.fn(() => ({
    printBle: vi.fn().mockResolvedValue(true),
    busy: false,
    error: null,
    clearError: vi.fn(),
  })),
  LABEL_TYPES: {
    continuous: { label: "Continuous" },
    label: { label: "Label" },
  },
  PAPER_WIDTHS: {
    100: { label: "100mm", dots: 800 },
    78: { label: "78mm (Bawaan)", dots: 623 },
  },
  previewTspl: vi.fn(() => "SIZE 78 mm,100 mm\r\nCLS\r\nPRINT 1,1\r\n"),
}));
vi.mock("./StrukContent", () => ({
  default: ({ sale }) => <div data-testid="struk-content">{sale.buyer_name}</div>,
}));

import Struk from "./Struk";

const saleMock = {
  id: "s1",
  type: "sale",
  buyer_name: "BUDI",
  total: 100000,
  date: "2026-07-04",
  items: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  Object.assign(navigator, {
    share: undefined,
    canShare: undefined,
  });
});

describe("Struk", () => {
  it("returns null when sale is null", () => {
    const { container } = render(<Struk sale={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders StrukContent with sale data", () => {
    render(<Struk sale={saleMock} onClose={vi.fn()} />);
    expect(screen.getByTestId("struk-content")).toBeInTheDocument();
    expect(screen.getByText("BUDI")).toBeInTheDocument();
  });

  it("shows Struk Pembelian heading for sale type", () => {
    render(<Struk sale={saleMock} onClose={vi.fn()} />);
    expect(screen.getByText("Struk Pembelian")).toBeInTheDocument();
  });

  it("shows Struk Retur heading for retur type", () => {
    render(<Struk sale={{ ...saleMock, type: "retur" }} onClose={vi.fn()} />);
    expect(screen.getByText("Struk Retur")).toBeInTheDocument();
  });

  it("calls onClose when ✕ button clicked", () => {
    const onClose = vi.fn();
    render(<Struk sale={saleMock} onClose={onClose} />);
    fireEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows Print, Simpan, Share action buttons", () => {
    render(<Struk sale={saleMock} onClose={vi.fn()} />);
    expect(screen.getByText("Print")).toBeInTheDocument();
    expect(screen.getByText("Simpan")).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
  });

  it("renders label type buttons", () => {
    render(<Struk sale={saleMock} onClose={vi.fn()} />);
    expect(screen.getByText("Continuous")).toBeInTheDocument();
    expect(screen.getByText("Label")).toBeInTheDocument();
  });

  it("triggers download on Simpan click", async () => {
    const { toPng } = await import("html-to-image");
    render(<Struk sale={saleMock} onClose={vi.fn()} />);
    const createEl = vi.spyOn(document, "createElement").mockReturnValueOnce({
      href: "",
      download: "",
      click: vi.fn(),
    });
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() => expect(toPng).toHaveBeenCalled());
    createEl.mockRestore();
  });

  it("shows BT success message after successful printBle", async () => {
    const { useTsplPrinter } = await import("../hooks/useTsplPrinter");
    useTsplPrinter.mockReturnValue({
      printBle: vi.fn().mockResolvedValue(true),
      busy: false,
      error: null,
      clearError: vi.fn(),
    });
    render(<Struk sale={saleMock} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Print"));
    await waitFor(() => expect(screen.getByText("✓ Terkirim ke printer")).toBeInTheDocument());
  });

  it("shows BT error when useTsplPrinter reports error", async () => {
    const { useTsplPrinter } = await import("../hooks/useTsplPrinter");
    useTsplPrinter.mockReturnValue({
      printBle: vi.fn().mockResolvedValue(false),
      busy: false,
      error: "Bluetooth error",
      clearError: vi.fn(),
    });
    render(<Struk sale={saleMock} onClose={vi.fn()} />);
    expect(screen.getByText("Bluetooth error")).toBeInTheDocument();
  });

  it("switches label type when label button clicked", () => {
    render(<Struk sale={saleMock} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Label"));
    expect(screen.getByText("Label").className).toContain("CAB170");
  });

  it("renders paper width buttons with 78mm selected by default", () => {
    render(<Struk sale={saleMock} onClose={vi.fn()} />);
    expect(screen.getByText("78mm (Bawaan)")).toBeInTheDocument();
    expect(screen.getByText("100mm")).toBeInTheDocument();
    expect(screen.getByText("78mm (Bawaan)").className).toContain("CAB170");
  });

  it("switches paper width when 100mm button clicked and passes it to printBle", async () => {
    const printBleMock = vi.fn().mockResolvedValue(true);
    const { useTsplPrinter } = await import("../hooks/useTsplPrinter");
    useTsplPrinter.mockReturnValue({
      printBle: printBleMock,
      busy: false,
      error: null,
      clearError: vi.fn(),
    });
    render(<Struk sale={saleMock} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("100mm"));
    expect(screen.getByText("100mm").className).toContain("CAB170");
    fireEvent.click(screen.getByText("Print"));
    await waitFor(() => expect(printBleMock).toHaveBeenCalledWith(saleMock, "continuous", "100"));
  });

  it("defaults to 78mm paper width on printBle call", async () => {
    const printBleMock = vi.fn().mockResolvedValue(true);
    const { useTsplPrinter } = await import("../hooks/useTsplPrinter");
    useTsplPrinter.mockReturnValue({
      printBle: printBleMock,
      busy: false,
      error: null,
      clearError: vi.fn(),
    });
    render(<Struk sale={saleMock} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Print"));
    await waitFor(() => expect(printBleMock).toHaveBeenCalledWith(saleMock, "continuous", "78"));
  });

  describe("Tab 'Versi A' vs 'Versi B'", () => {
    it("defaults to the 'Versi A' tab (styled StrukContent, ada logo)", () => {
      render(<Struk sale={saleMock} onClose={vi.fn()} />);
      expect(screen.getByTestId("struk-content")).toBeInTheDocument();
      expect(screen.queryByTestId("tspl-print-preview-canvas")).not.toBeInTheDocument();
    });

    it("switches to 'Versi B' tab, showing the TSPL canvas preview (replika APA YANG DICETAK — tanpa logo)", () => {
      render(<Struk sale={saleMock} onClose={vi.fn()} />);
      fireEvent.click(screen.getByText("Versi B"));
      expect(screen.getByTestId("tspl-print-preview-canvas")).toBeInTheDocument();
      // Highlight aktif pindah ke tab yang dipilih.
      expect(screen.getByText("Versi B").className).toContain("CAB170");
    });

    it("keeps StrukContent mounted (moved off-screen, not unmounted) when 'Versi B' active — supaya Simpan/Share tetap bisa capture", () => {
      render(<Struk sale={saleMock} onClose={vi.fn()} />);
      fireEvent.click(screen.getByText("Versi B"));
      const strukContent = screen.getByTestId("struk-content");
      expect(strukContent).toBeInTheDocument();
      expect(strukContent.parentElement).toHaveStyle({ position: "fixed", left: "-9999px" });
    });

    it("switches back to 'Versi A' tab, un-hiding StrukContent and removing the TSPL canvas", () => {
      render(<Struk sale={saleMock} onClose={vi.fn()} />);
      fireEvent.click(screen.getByText("Versi B"));
      fireEvent.click(screen.getByText("Versi A"));
      expect(screen.queryByTestId("tspl-print-preview-canvas")).not.toBeInTheDocument();
      expect(screen.getByTestId("struk-content").parentElement).not.toHaveStyle({ position: "fixed" });
    });

    it("Simpan (toPng capture) still works when 'Versi B' tab is active", async () => {
      const { toPng } = await import("html-to-image");
      render(<Struk sale={saleMock} onClose={vi.fn()} />);
      fireEvent.click(screen.getByText("Versi B"));
      const createEl = vi.spyOn(document, "createElement").mockReturnValueOnce({
        href: "",
        download: "",
        click: vi.fn(),
      });
      fireEvent.click(screen.getByText("Simpan"));
      await waitFor(() => expect(toPng).toHaveBeenCalled());
      createEl.mockRestore();
    });
  });

  it("calls navigator.share when available", async () => {
    const { toPng } = await import("html-to-image");
    global.fetch = vi.fn().mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(["data"], { type: "image/png" })),
    });
    Object.assign(navigator, {
      share: vi.fn().mockResolvedValue(undefined),
      canShare: vi.fn().mockReturnValue(true),
    });
    render(<Struk sale={saleMock} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Share"));
    await waitFor(() => expect(toPng).toHaveBeenCalled());
    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    global.fetch = undefined;
  });

  it("falls back to WA when navigator.share unavailable", async () => {
    // Use real timers — fake timers block waitFor's internal polling
    const { toPng } = await import("html-to-image");
    global.fetch = vi.fn().mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(["data"], { type: "image/png" })),
    });
    Object.assign(navigator, { share: undefined, canShare: undefined });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => {});
    render(<Struk sale={saleMock} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Share"));
    // Wait for toPng (captureImage), then wait out the 400ms setTimeout
    await waitFor(() => expect(toPng).toHaveBeenCalled(), { timeout: 2000 });
    await waitFor(
      () => expect(openSpy).toHaveBeenCalledWith("https://web.whatsapp.com", "_blank"),
      { timeout: 2000 }
    );
    openSpy.mockRestore();
    global.fetch = undefined;
  });

  it("shows alert when download fails", async () => {
    const { toPng } = await import("html-to-image");
    const { act } = await import("@testing-library/react");
    toPng.mockRejectedValueOnce(new Error("canvas error"));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<Struk sale={saleMock} onClose={vi.fn()} />);
    // act() flushes the full async chain (setBusy → captureImage reject → catch → alert)
    await act(async () => {
      fireEvent.click(screen.getByText("Simpan"));
    });
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("canvas error"));
    alertSpy.mockRestore();
  });

  describe("Lebar modal mengikuti paperWidth (preview proporsional ukuran kertas)", () => {
    it("defaults to the 78mm-proportioned width (384px, dots 623 × 384/623 scale)", () => {
      const { container } = render(<Struk sale={saleMock} onClose={vi.fn()} />);
      const wrapper = container.querySelector("#struk-wrapper");
      expect(wrapper).toHaveStyle({ width: "384px" });
    });

    it("widens the modal when 100mm is selected (dots 800 × same scale ≈ 493px) — berlaku utk Versi A maupun Versi B", () => {
      const { container } = render(<Struk sale={saleMock} onClose={vi.fn()} />);
      fireEvent.click(screen.getByText("100mm"));
      const wrapper = container.querySelector("#struk-wrapper");
      expect(wrapper).toHaveStyle({ width: "493px" });
    });

    it("caps the width at 92vw so it never overflows a narrow screen", () => {
      const { container } = render(<Struk sale={saleMock} onClose={vi.fn()} />);
      const wrapper = container.querySelector("#struk-wrapper");
      expect(wrapper.style.maxWidth).toBe("92vw");
    });
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    const { container } = render(<Struk sale={saleMock} onClose={onClose} />);
    fireEvent.click(container.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });
});
