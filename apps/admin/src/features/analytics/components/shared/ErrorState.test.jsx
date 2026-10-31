import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import ErrorState from "./ErrorState";

describe("ErrorState", () => {
  it("renders default message when none provided", () => {
    render(<ErrorState />);
    expect(screen.getByText("Gagal memuat data.")).toBeInTheDocument();
  });

  it("renders custom message", () => {
    render(<ErrorState message="Koneksi terputus." />);
    expect(screen.getByText("Koneksi terputus.")).toBeInTheDocument();
  });

  it("renders 'Coba Lagi' button when onRetry provided", () => {
    render(<ErrorState onRetry={() => {}} />);
    expect(screen.getByText("Coba Lagi")).toBeInTheDocument();
  });

  it("does NOT render retry button when onRetry not provided", () => {
    render(<ErrorState />);
    expect(screen.queryByText("Coba Lagi")).not.toBeInTheDocument();
  });

  it("clicking 'Coba Lagi' calls onRetry", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByText("Coba Lagi"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
