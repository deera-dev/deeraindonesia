import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const signOut = vi.fn();
vi.mock("@deera/shared/features/auth/hooks", () => ({
  signOut: (...args) => signOut(...args),
  displayName: (user) => (user ? "DENNY" : "-"),
  useAuth: () => ({ user: { email: "denny@deera.id" } }),
}));

const { default: DashboardPage } = await import("./DashboardPage");

describe("DashboardPage", () => {
  it("menyapa user yang login", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Halo, DENNY.")).toBeInTheDocument();
  });

  it("tombol Keluar memanggil signOut", () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByRole("button", { name: "Keluar" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
