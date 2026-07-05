import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useToastStore } from "../features/toast/store";
import ToastContainer from "./ToastContainer";

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

describe("ToastContainer", () => {
  it("tidak render apa pun saat tidak ada toast", () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it("render toast bertipe success dengan ikon & style yang sesuai", () => {
    useToastStore.setState({ toasts: [{ id: 1, type: "success", msg: "Berhasil disimpan" }] });
    render(<ToastContainer />);
    expect(screen.getByText("Berhasil disimpan")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("render toast bertipe error dengan ikon yang sesuai", () => {
    useToastStore.setState({ toasts: [{ id: 2, type: "error", msg: "Gagal" }] });
    render(<ToastContainer />);
    expect(screen.getByText("Gagal")).toBeInTheDocument();
    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("render toast bertipe warn dengan ikon yang sesuai", () => {
    useToastStore.setState({ toasts: [{ id: 3, type: "warn", msg: "Perhatian" }] });
    render(<ToastContainer />);
    expect(screen.getByText("Perhatian")).toBeInTheDocument();
    expect(screen.getByText("!")).toBeInTheDocument();
  });

  it("render beberapa toast sekaligus (stack)", () => {
    useToastStore.setState({
      toasts: [
        { id: 1, type: "success", msg: "Satu" },
        { id: 2, type: "warn", msg: "Dua" },
      ],
    });
    render(<ToastContainer />);
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });

  it("klik toast memanggil remove(id) dan menghilangkan toast dari store", () => {
    useToastStore.setState({ toasts: [{ id: 7, type: "success", msg: "Klik saya" }] });
    render(<ToastContainer />);

    fireEvent.click(screen.getByText("Klik saya"));

    expect(useToastStore.getState().toasts).toEqual([]);
  });
});
