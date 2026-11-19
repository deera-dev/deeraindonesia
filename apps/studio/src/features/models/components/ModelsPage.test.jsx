import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: () => ({ user: { email: "denny@deera.id" } }),
  displayName: () => "DENNY",
  signOut: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useRouterState: () => "/models",
}));
vi.mock("./ModelForm", () => ({ ModelForm: () => <div data-testid="model-form" /> }));
vi.mock("./ModelCard", () => ({
  ModelCard: ({ model }) => <div>{model.name}</div>,
}));

const mockUseModels = vi.fn();
vi.mock("../hooks", () => ({ useModels: () => mockUseModels() }));

import ModelsPage from "./ModelsPage";

describe("ModelsPage", () => {
  it("shows loading state", () => {
    mockUseModels.mockReturnValue({ models: [], loading: true });
    render(<ModelsPage />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("shows empty state when no models", () => {
    mockUseModels.mockReturnValue({ models: [], loading: false });
    render(<ModelsPage />);
    expect(screen.getByText(/Belum ada model/)).toBeInTheDocument();
  });

  it("renders model cards when models exist", () => {
    mockUseModels.mockReturnValue({
      models: [
        { id: "m1", name: "Model A" },
        { id: "m2", name: "Model B" },
      ],
      loading: false,
    });
    render(<ModelsPage />);
    expect(screen.getByText("Model A")).toBeInTheDocument();
    expect(screen.getByText("Model B")).toBeInTheDocument();
  });

  it("always renders the add-model form", () => {
    mockUseModels.mockReturnValue({ models: [], loading: false });
    render(<ModelsPage />);
    expect(screen.getByTestId("model-form")).toBeInTheDocument();
  });
});
