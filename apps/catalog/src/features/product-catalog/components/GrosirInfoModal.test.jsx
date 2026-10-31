import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const trackEvent = vi.fn();
vi.mock("../../analytics", () => ({ trackEvent: (...a) => trackEvent(...a) }));

const { default: GrosirInfoModal } = await import("./GrosirInfoModal");

describe("GrosirInfoModal", () => {
  it("tidak render apa pun saat open=false", () => {
    const { container } = render(<GrosirInfoModal open={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("menampilkan ketentuan grosir & langkah order", () => {
    render(<GrosirInfoModal open={true} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Cara Order Grosir" })).toBeInTheDocument();
    expect(screen.getByText("Khusus Grosir")).toBeInTheDocument();
    expect(screen.getByText("Beli per Seri")).toBeInTheDocument();
    expect(screen.getByText("Belum Melayani Satuan")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("klik backdrop & tombol tutup memanggil onClose", () => {
    const onClose = vi.fn();
    const { container } = render(<GrosirInfoModal open={true} onClose={onClose} />);
    fireEvent.click(container.querySelector(".bg-black\\/80"));
    fireEvent.click(screen.getByRole("button", { name: "Tutup" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("link WhatsApp berisi pesan tanya order grosir & tercatat di analytics", () => {
    render(<GrosirInfoModal open={true} onClose={() => {}} />);
    const link = screen.getByText("Tanya via WhatsApp").closest("a");
    expect(decodeURIComponent(link.getAttribute("href"))).toContain("cara order grosir per seri");
    fireEvent.click(link);
    expect(trackEvent).toHaveBeenCalledWith("click_wa", { place: "grosir_info" });
  });
});
