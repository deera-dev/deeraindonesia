import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@deera/shared/features/auth/hooks", () => ({
  signIn: vi.fn().mockResolvedValue({ error: null }),
}));

import { signIn } from "@deera/shared/features/auth/hooks";
import LoginScreen from "./LoginScreen";

beforeEach(() => {
  vi.clearAllMocks();
  signIn.mockResolvedValue({ error: null });
});

describe("LoginScreen", () => {
  it("renders DEERA heading", () => {
    render(<LoginScreen />);
    expect(screen.getByText("DEERA")).toBeInTheDocument();
  });

  it("renders username and password inputs", () => {
    render(<LoginScreen />);
    // Labels are not htmlFor-linked; query by input type
    expect(document.querySelector('input[type="text"]')).toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
  });

  it("renders Masuk button", () => {
    render(<LoginScreen />);
    expect(screen.getByRole("button", { name: /Masuk/i })).toBeInTheDocument();
  });

  it("calls signIn with username and password on submit", async () => {
    render(<LoginScreen />);
    fireEvent.change(document.querySelector('input[type="text"]'), { target: { value: "admin@deera.id" } });
    fireEvent.change(document.querySelector('input[type="password"]'), { target: { value: "secret123" } });
    fireEvent.submit(screen.getByRole("button", { name: /Masuk/i }).closest("form"));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith("admin@deera.id", "secret123"));
  });

  it("shows error message when signIn returns error", async () => {
    signIn.mockResolvedValue({ error: { message: "Invalid credentials" } });
    render(<LoginScreen />);
    fireEvent.submit(screen.getByRole("button", { name: /Masuk/i }).closest("form"));
    await waitFor(() => expect(screen.getByText("Username atau password salah.")).toBeInTheDocument());
  });

  it("shows Masuk... while loading", async () => {
    signIn.mockReturnValue(new Promise(() => {}));
    render(<LoginScreen />);
    fireEvent.submit(screen.getByRole("button", { name: /Masuk/i }).closest("form"));
    await waitFor(() => expect(screen.getByText("Masuk...")).toBeInTheDocument());
  });
});
