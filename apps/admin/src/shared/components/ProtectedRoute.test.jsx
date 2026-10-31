import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@deera/shared/features/auth/hooks";
import ProtectedRoute from "./ProtectedRoute";

describe("ProtectedRoute", () => {
  it("renders null while loading", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    const { container } = render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to /login when not authenticated", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    useAuth.mockReturnValue({ user: { email: "a@b.com" }, loading: false });
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});
