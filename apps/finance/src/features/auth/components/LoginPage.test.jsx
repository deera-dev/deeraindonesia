import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
  signIn: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});

import { useAuth, signIn } from "@deera/shared/features/auth/hooks";
import LoginPage from "./LoginPage";

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: null, loading: false });
  signIn.mockResolvedValue({ error: null });
});

describe("LoginPage", () => {
  it("renders DEERA heading", () => {
    renderLogin();
    expect(screen.getByText("DEERA")).toBeInTheDocument();
  });

  it("renders Finance label", () => {
    renderLogin();
    expect(screen.getByText(/Finance/i)).toBeInTheDocument();
  });

  it("renders Masuk button", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /Masuk/i })).toBeInTheDocument();
  });

  it("calls signIn on form submit", async () => {
    renderLogin();
    fireEvent.change(document.querySelector('input[type="text"]'), {
      target: { value: "admin@deera.id" },
    });
    fireEvent.change(document.querySelector('input[type="password"]'), {
      target: { value: "secret" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /Masuk/i }).closest("form"));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith("admin@deera.id", "secret"));
  });

  it("shows error on failed signIn", async () => {
    signIn.mockResolvedValue({ error: { message: "invalid" } });
    renderLogin();
    fireEvent.submit(screen.getByRole("button", { name: /Masuk/i }).closest("form"));
    await waitFor(() =>
      expect(screen.getByText("Username atau password salah.")).toBeInTheDocument()
    );
  });

  it("shows loading state during submit", async () => {
    signIn.mockReturnValue(new Promise(() => {}));
    renderLogin();
    fireEvent.submit(screen.getByRole("button", { name: /Masuk/i }).closest("form"));
    await waitFor(() =>
      expect(screen.getByText("Masuk...")).toBeInTheDocument()
    );
  });

  it("redirects when user is already logged in", () => {
    useAuth.mockReturnValue({ user: { email: "a@b.com" }, loading: false });
    renderLogin();
    // navigates away — component returns null, no DEERA text
    expect(screen.queryByRole("button", { name: /Masuk/i })).toBeNull();
  });
});
