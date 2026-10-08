import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../lib/tsplImage", async (importOriginal) => ({
  ...(await importOriginal()),
  // canvas tidak ada di jsdom — kembalikan gambar putih 16x4
  dataUrlToGray: vi.fn(async () => ({ gray: new Uint8Array(16 * 4).fill(255), w: 16, h: 4 })),
}));

import { useTsplPrinter, writeBleFast, FAST_CHUNK_START, disconnectPrinter } from "./useTsplPrinter";

function makeChar(props = { writeWithoutResponse: true, write: true }, failOver = Infinity) {
  const writes = [];
  const fn = vi.fn(async (chunk) => {
    if (chunk.length > failOver) throw new Error("GATT: value too long");
    writes.push(chunk.length);
  });
  return {
    properties: props,
    writeValueWithoutResponse: fn,
    writeValueWithResponse: fn,
    writeValue: fn,
    writes,
    fn,
  };
}

describe("writeBleFast", () => {
  it("memakai write-without-response dengan paket besar, seluruh data terkirim", async () => {
    const c = makeChar();
    const data = new Uint8Array(1000).fill(7);
    await writeBleFast(c, data);
    expect(c.writes[0]).toBe(FAST_CHUNK_START);
    expect(c.writes.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it("paket ditolak -> ukuran dibagi dua sampai diterima, tanpa kehilangan byte", async () => {
    const c = makeChar({ writeWithoutResponse: true }, 50);
    await writeBleFast(c, new Uint8Array(500));
    expect(Math.max(...c.writes)).toBeLessThanOrEqual(50);
    expect(c.writes.reduce((a, b) => a + b, 0)).toBe(500);
  });

  it("gagal bahkan di 20 byte -> lempar error", async () => {
    const c = makeChar({ writeWithoutResponse: true }, 5);
    await expect(writeBleFast(c, new Uint8Array(100))).rejects.toThrow("too long");
  });

  it("tanpa writeWithoutResponse jatuh ke write-with-response", async () => {
    const withResp = vi.fn(async () => {});
    const c = { properties: { write: true }, writeValueWithResponse: withResp };
    await writeBleFast(c, new Uint8Array(10));
    expect(withResp).toHaveBeenCalled();
  });

  it("default tanpa jeda: tidak memanggil setTimeout", async () => {
    const spy = vi.spyOn(globalThis, "setTimeout");
    const c = makeChar();
    await writeBleFast(c, new Uint8Array(1000));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("onProgress dipanggil hingga 1", async () => {
    const c = makeChar();
    const seen = [];
    await writeBleFast(c, new Uint8Array(400), { onProgress: (p) => seen.push(p) });
    expect(seen.at(-1)).toBe(1);
  });
});

describe("useTsplPrinter.printImageBle", () => {
  const origBt = navigator.bluetooth;
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    if (origBt === undefined) delete navigator.bluetooth;
    else navigator.bluetooth = origBt;
    vi.restoreAllMocks();
  });

  it("tanpa Web Bluetooth -> error & false", async () => {
    delete navigator.bluetooth;
    const { result } = renderHook(() => useTsplPrinter());
    let ok;
    await act(async () => {
      ok = await result.current.printImageBle("data:image/png;base64,abc");
    });
    expect(ok).toBe(false);
    expect(result.current.error).toMatch(/Web Bluetooth/);
  });

  it("alur lengkap: connect, kirim stream TSPL BITMAP, koneksi disimpan lalu diputus saat idle", async () => {
    const char = makeChar();
    const disconnect = vi.fn();
    const server = {
      device: { gatt: { disconnect } },
      getPrimaryService: async () => ({ getCharacteristic: async () => char }),
    };
    navigator.bluetooth = {
      requestDevice: vi.fn(async () => ({ gatt: { connect: async () => server } })),
    };
    const { result } = renderHook(() => useTsplPrinter());
    let ok;
    await act(async () => {
      ok = await result.current.printImageBle("data:image/png;base64,abc", {
        paperWidthMm: "78",
        algorithm: "binary",
      });
    });
    expect(ok).toBe(true);
    const sent = char.writes.reduce((a, b) => a + b, 0);
    // header (SIZE/GAP/DIRECTION/CLS) + BITMAP 0,0,2,4,0, + 8 byte data + PRINT
    expect(sent).toBeGreaterThan(8);
    // koneksi dipakai ulang (tidak langsung diputus) — putus manual:
    expect(disconnect).not.toHaveBeenCalled();
    disconnectPrinter();
    expect(disconnect).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.timing).toMatch(/kirim/);
  });

  it("cetak kedua memakai koneksi yang sama (tanpa dialog pilih perangkat lagi)", async () => {
    const char = makeChar();
    const server = {
      device: { id: "dev-1", gatt: { connected: true, disconnect: vi.fn() } },
      getPrimaryService: async () => ({ getCharacteristic: async () => char }),
    };
    const requestDevice = vi.fn(async () => ({ id: "dev-1", gatt: { connect: async () => server } }));
    navigator.bluetooth = { requestDevice };
    const { result } = renderHook(() => useTsplPrinter());
    for (let i = 0; i < 2; i++) {
      await act(async () => {
        await result.current.printImageBle("data:image/png;base64,abc", { algorithm: "binary" });
      });
    }
    expect(requestDevice).toHaveBeenCalledTimes(1);
    disconnectPrinter();
  });

  it("printer yang pernah dipilih disambung langsung lewat getDevices (tanpa dialog)", async () => {
    disconnectPrinter();
    localStorage.setItem("deera-bt-printer-id", "dev-9");
    const char = makeChar();
    const server = {
      device: { gatt: { connected: false, disconnect: vi.fn() } },
      getPrimaryService: async () => ({ getCharacteristic: async () => char }),
    };
    const requestDevice = vi.fn();
    navigator.bluetooth = {
      requestDevice,
      getDevices: vi.fn(async () => [{ id: "dev-9", gatt: { connect: async () => server } }]),
    };
    const { result } = renderHook(() => useTsplPrinter());
    let ok;
    await act(async () => {
      ok = await result.current.printImageBle("data:image/png;base64,abc", { algorithm: "binary" });
    });
    expect(ok).toBe(true);
    expect(requestDevice).not.toHaveBeenCalled();
    disconnectPrinter();
    localStorage.removeItem("deera-bt-printer-id");
  });

  it("pengguna batal memilih perangkat (NotFoundError) -> false tanpa pesan error", async () => {
    navigator.bluetooth = {
      requestDevice: vi.fn(async () => {
        const e = new Error("cancel");
        e.name = "NotFoundError";
        throw e;
      }),
    };
    const { result } = renderHook(() => useTsplPrinter());
    let ok;
    await act(async () => {
      ok = await result.current.printImageBle("x");
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
