import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../../../../test/helpers/renderWithRouter.jsx";

vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@deera/shared/features/auth/hooks";
import ProtectedRoute from "./ProtectedRoute";

function renderAt(path) {
  return renderWithRouter({
    initialPath: path,
    routes: {
      [path]: () => (
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      ),
    },
  });
}

describe("ProtectedRoute", () => {
  it("renders null while loading", async () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    const { container } = await renderAt("/");
    expect(container.textContent).not.toContain("Protected Content");
  });

  it("redirects to /login when not authenticated", async () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    await renderAt("/");
    await vi.waitFor(() => {
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });
  });

  it("renders children when authenticated", async () => {
    useAuth.mockReturnValue({ user: { email: "a@b.com" }, loading: false });
    await renderAt("/");
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});
