import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VisitUsModal from "./VisitUsModal";

describe("VisitUsModal", () => {
  it("tidak render apa pun saat open=false", () => {
    const { container } = render(<VisitUsModal open={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("render judul & info lokasi saat open=true", () => {
    render(<VisitUsModal open={true} onClose={() => {}} />);
    expect(screen.getByText("Visit Us")).toBeInTheDocument();
    expect(screen.getByText("Pasar Tasik Cideng")).toBeInTheDocument();
    expect(screen.getByText("Pasar Sandang Tegalgubug")).toBeInTheDocument();
  });

  it("klik backdrop memanggil onClose", () => {
    const onClose = vi.fn();
    const { container } = render(<VisitUsModal open={true} onClose={onClose} />);
    fireEvent.click(container.querySelector(".bg-black\\/80"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("klik tombol X memanggil onClose", () => {
    const onClose = vi.fn();
    render(<VisitUsModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("link WhatsApp mengarah ke wa.me", () => {
    render(<VisitUsModal open={true} onClose={() => {}} />);
    const link = screen.getByText("Hubungi via WhatsApp").closest("a");
    expect(link).toHaveAttribute("href", "https://wa.me/62811947254");
  });

  it("klik footer tersembunyi memanggil onClose & redirect ke ADMIN_URL", () => {
    const onClose = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "http://localhost:3000/" },
    });

    render(<VisitUsModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("DEERA © 2025"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe("https://admin.deera.id");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });
});

describe("VisitUsModal — info grosir", () => {
  it("menampilkan ketentuan khusus grosir per seri", () => {
    render(<VisitUsModal open={true} onClose={() => {}} />);
    expect(screen.getByText("Khusus Grosir")).toBeInTheDocument();
    expect(screen.getByText(/belum melayani\s+pembelian satuan/)).toBeInTheDocument();
    expect(screen.queryByText(/Lihat cara order/)).toBeNull();
  });

  it("klik 'Lihat cara order' menutup modal & membuka info grosir", () => {
    const onClose = vi.fn();
    const onGrosirInfo = vi.fn();
    render(<VisitUsModal open={true} onClose={onClose} onGrosirInfo={onGrosirInfo} />);
    fireEvent.click(screen.getByText(/Lihat cara order/));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onGrosirInfo).toHaveBeenCalledTimes(1);
  });
});
