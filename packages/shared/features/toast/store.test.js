import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useToastStore } from "./store";

describe("useToastStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("push menambahkan toast baru dengan id unik dan mengembalikan id tersebut", () => {
    const id = useToastStore.getState().push("success", "Data berhasil disimpan");

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toEqual({ id, type: "success", msg: "Data berhasil disimpan" });
  });

  it("setiap push menghasilkan id yang berbeda (increment)", () => {
    const id1 = useToastStore.getState().push("success", "pertama");
    const id2 = useToastStore.getState().push("error", "kedua");

    expect(id1).not.toBe(id2);
    expect(useToastStore.getState().toasts).toHaveLength(2);
  });

  it("auto-dismiss toast success setelah 4000ms", () => {
    useToastStore.getState().push("success", "halo");
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(4000);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("auto-dismiss toast error setelah 6000ms", () => {
    useToastStore.getState().push("error", "gagal");

    vi.advanceTimersByTime(5999);
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("auto-dismiss toast warn setelah 5000ms", () => {
    useToastStore.getState().push("warn", "perhatian");

    vi.advanceTimersByTime(5000);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("fallback durasi 4000ms untuk type yang tidak dikenal", () => {
    useToastStore.getState().push("info", "tipe tak dikenal");

    vi.advanceTimersByTime(3999);
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("remove menghapus toast spesifik berdasarkan id tanpa mengubah yang lain", () => {
    const id1 = useToastStore.getState().push("success", "satu");
    const id2 = useToastStore.getState().push("success", "dua");

    useToastStore.getState().remove(id1);

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBe(id2);
  });
});
