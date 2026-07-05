import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SyncErrorModal from "./SyncErrorModal";

describe("SyncErrorModal", () => {
  it("renders Sync Gagal heading", () => {
    render(<SyncErrorModal error={null} onClose={vi.fn()} onRetry={vi.fn()} retrying={false} />);
    expect(screen.getByText("Sync Gagal")).toBeInTheDocument();
  });

  it("shows error message when error provided", () => {
    render(<SyncErrorModal error="connection timeout" onClose={vi.fn()} onRetry={vi.fn()} retrying={false} />);
    expect(screen.getByText("connection timeout")).toBeInTheDocument();
  });

  it("calls onRetry when Coba Lagi clicked", () => {
    const onRetry = vi.fn();
    render(<SyncErrorModal error={null} onClose={vi.fn()} onRetry={onRetry} retrying={false} />);
    // "Coba Lagi" also appears in <strong> inside description text
    fireEvent.click(screen.getByRole("button", { name: /Coba Lagi/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("calls onClose when Tutup clicked", () => {
    const onClose = vi.fn();
    render(<SyncErrorModal error={null} onClose={onClose} onRetry={vi.fn()} retrying={false} />);
    fireEvent.click(screen.getByText("Tutup"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    render(<SyncErrorModal error={null} onClose={onClose} onRetry={vi.fn()} retrying={false} />);
    fireEvent.click(document.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows Mencoba... when retrying=true", () => {
    render(<SyncErrorModal error={null} onClose={vi.fn()} onRetry={vi.fn()} retrying={true} />);
    expect(screen.getByText("Mencoba...")).toBeInTheDocument();
  });

  it("disables retry button when retrying=true", () => {
    render(<SyncErrorModal error={null} onClose={vi.fn()} onRetry={vi.fn()} retrying={true} />);
    expect(screen.getByText("Mencoba...").closest("button")).toBeDisabled();
  });
});
