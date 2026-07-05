import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

import { useAuth } from "@deera/shared/features/auth/hooks";
import ProtectedRoute from "./ProtectedRoute";

function wrap(ui, path = "/") {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

describe("ProtectedRoute", () => {
  it("renders children when user is authenticated", () => {
    useAuth.mockReturnValue({ user: { email: "u@u.com" }, loading: false });
    wrap(<ProtectedRoute><div>SECRET</div></ProtectedRoute>);
    expect(screen.getByText("SECRET")).toBeInTheDocument();
  });

  it("returns null while loading", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    const { container } = wrap(<ProtectedRoute><div>SECRET</div></ProtectedRoute>);
    expect(container.textContent).toBe("");
  });

  it("redirects to /login when user is null and not loading", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    wrap(<ProtectedRoute><div>SECRET</div></ProtectedRoute>);
    expect(screen.queryByText("SECRET")).not.toBeInTheDocument();
  });
});
