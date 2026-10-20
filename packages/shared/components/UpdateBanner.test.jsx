import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const useUpdateAvailable = vi.fn();
vi.mock("../features/app-version/hooks", () => ({
  useUpdateAvailable: (...args) => useUpdateAvailable(...args),
}));

const { default: UpdateBanner } = await import("./UpdateBanner");

describe("UpdateBanner", () => {
  beforeEach(() => {
    useUpdateAvailable.mockReset();
  });

  it("tidak render apa pun saat tidak ada update", () => {
    useUpdateAvailable.mockReturnValue({ isUpdateAvailable: false });

    const { container } = render(<UpdateBanner />);

    expect(container.firstChild).toBeNull();
  });

  it("render banner dan tombol Muat Ulang saat ada update", () => {
    useUpdateAvailable.mockReturnValue({ isUpdateAvailable: true });

    render(<UpdateBanner />);

    expect(screen.getByText("Versi baru tersedia.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Muat Ulang" })).toBeInTheDocument();
  });

  it("klik tombol Muat Ulang memanggil window.location.reload", () => {
    useUpdateAvailable.mockReturnValue({ isUpdateAvailable: true });
    const reload = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload },
    });

    render(<UpdateBanner />);
    fireEvent.click(screen.getByRole("button", { name: "Muat Ulang" }));

    expect(reload).toHaveBeenCalled();

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });
});
