import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: () => ({ user: { email: "denny@deera.id" } }),
  displayName: () => "DENNY",
  signOut: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useRouterState: () => "/presets",
}));
vi.mock("./BackgroundPresetsSection", () => ({
  BackgroundPresetsSection: () => <div data-testid="background-section" />,
}));
vi.mock("./AccessoryPresetsSection", () => ({
  AccessoryPresetsSection: () => <div data-testid="accessory-section" />,
}));

import PresetsPage from "./PresetsPage";

describe("PresetsPage", () => {
  it("shows the background tab by default", () => {
    render(<PresetsPage />);
    expect(screen.getByTestId("background-section")).toBeInTheDocument();
    expect(screen.queryByTestId("accessory-section")).not.toBeInTheDocument();
  });

  it("switches to the accessory tab on click", () => {
    render(<PresetsPage />);
    fireEvent.click(screen.getByText("Aksesoris"));
    expect(screen.getByTestId("accessory-section")).toBeInTheDocument();
    expect(screen.queryByTestId("background-section")).not.toBeInTheDocument();
  });

  it("switches back to background tab", () => {
    render(<PresetsPage />);
    fireEvent.click(screen.getByText("Aksesoris"));
    fireEvent.click(screen.getByText("Background"));
    expect(screen.getByTestId("background-section")).toBeInTheDocument();
  });
});
