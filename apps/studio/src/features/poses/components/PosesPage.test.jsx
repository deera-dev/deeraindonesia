import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: () => ({ user: { email: "denny@deera.id" } }),
  displayName: () => "DENNY",
  signOut: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useRouterState: () => "/poses",
}));
vi.mock("./PoseForm", () => ({ PoseForm: () => <div data-testid="pose-form" /> }));
vi.mock("./PoseCard", () => ({
  PoseCard: ({ pose }) => <div>{pose.name}</div>,
}));

const mockUseModels = vi.fn();
vi.mock("../../models/hooks", () => ({ useModels: () => mockUseModels() }));
const mockUsePoses = vi.fn();
vi.mock("../hooks", () => ({ usePoses: () => mockUsePoses() }));

import PosesPage from "./PosesPage";

describe("PosesPage", () => {
  it("shows a message when there are no active models", () => {
    mockUseModels.mockReturnValue({ models: [] });
    mockUsePoses.mockReturnValue({ poses: [], loading: false });
    render(<PosesPage />);
    expect(screen.getByText(/Belum ada model/)).toBeInTheDocument();
  });

  it("auto-selects the first model and loads its poses", () => {
    mockUseModels.mockReturnValue({ models: [{ id: "m1", name: "Model A" }] });
    mockUsePoses.mockReturnValue({ poses: [{ id: "p1", name: "Pose A" }], loading: false });
    render(<PosesPage />);
    expect(screen.getByText("Pose A")).toBeInTheDocument();
    expect(screen.getByTestId("pose-form")).toBeInTheDocument();
  });

  it("shows empty state when selected model has no poses", () => {
    mockUseModels.mockReturnValue({ models: [{ id: "m1", name: "Model A" }] });
    mockUsePoses.mockReturnValue({ poses: [], loading: false });
    render(<PosesPage />);
    expect(screen.getByText("Belum ada pose untuk model ini.")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockUseModels.mockReturnValue({ models: [{ id: "m1", name: "Model A" }] });
    mockUsePoses.mockReturnValue({ poses: [], loading: true });
    render(<PosesPage />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });
});
