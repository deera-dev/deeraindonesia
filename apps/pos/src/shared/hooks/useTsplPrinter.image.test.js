import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../lib/tsplImage", async (importOriginal) => ({
  ...(await importOriginal()),
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

  it("forceResponse: true -> pakai writeValueWithResponse meski writeWithoutResponse tersedia", async () => {
    const withoutResp = vi.fn(async () => {});
    const withResp = vi.fn(async () => {});
    const c = {
      properties: { writeWithoutResponse: true, write: true },
      writeValueWithoutResponse: withoutResp,
      writeValueWithResponse: withResp,
    };
    await writeBleFast(c, new Uint8Array(50), { forceResponse: true });
    expect(withResp).toHaveBeenCalled();
    expect(withoutResp).not.toHaveBeenCalled();
  });

  it("forceResponse: false (default) -> tetap pakai write-without-response kalau tersedia", async () => {
    const c = makeChar();
    await writeBleFast(c, new Uint8Array(50));
    expect(c.fn).toHaveBeenCalled();
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
      getPrimaryService: async () => ({ getCharacteristics: async () => [char] }),
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
    expect(sent).toBeGreaterThan(8);
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
      getPrimaryService: async () => ({ getCharacteristics: async () => [char] }),
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
      getPrimaryService: async () => ({ getCharacteristics: async () => [char] }),
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

  it("printer tersambung tapi tidak punya service yang dikenali sama sekali -> error jelas ditampilkan, BEDA dari batal pilih perangkat", async () => {
    const getPrimaryService = vi.fn(async () => {
      const e = new Error("No Services matching UUID found");
      e.name = "NotFoundError";
      throw e;
    });
    const server = { device: { gatt: { disconnect: vi.fn() } }, getPrimaryService };
    navigator.bluetooth = {
      requestDevice: vi.fn(async () => ({ gatt: { connect: async () => server } })),
    };
    const { result } = renderHook(() => useTsplPrinter());
    let ok;
    await act(async () => {
      ok = await result.current.printImageBle("x");
    });
    expect(ok).toBe(false);
    expect(result.current.error).toMatch(/tidak punya service Bluetooth yang dikenali/);
    expect(getPrimaryService).toHaveBeenCalledTimes(3); // dicoba FF00, FFE0, lalu ISSC UART
  });

  it("printer tanpa FF00 tapi punya FFE0 (modul HM-10/HM-11) -> tetap konek & print lewat fallback", async () => {
    const char = makeChar();
    const getPrimaryService = vi.fn(async (uuid) => {
      if (uuid.includes("ffe0")) return { getCharacteristics: async () => [char] };
      const e = new Error("not found");
      e.name = "NotFoundError";
      throw e;
    });
    const server = { device: { gatt: { disconnect: vi.fn() } }, getPrimaryService };
    navigator.bluetooth = {
      requestDevice: vi.fn(async () => ({ gatt: { connect: async () => server } })),
    };
    const { result } = renderHook(() => useTsplPrinter());
    let ok;
    await act(async () => {
      ok = await result.current.printImageBle("data:image/png;base64,abc", { algorithm: "binary" });
    });
    expect(ok).toBe(true);
    expect(char.writes.length).toBeGreaterThan(0);
    disconnectPrinter();
  });

  it("printer cuma punya service ISSC/Microchip Transparent UART (49535343-...) -> tetap konek & print, pakai characteristic yang writable (bukan yang notify-only)", async () => {
    const notifyOnlyChar = makeChar({ notify: true });
    const writableChar = makeChar({ write: true, writeWithoutResponse: true });
    const getPrimaryService = vi.fn(async (uuid) => {
      if (uuid.startsWith("49535343")) {
        return { getCharacteristics: async () => [notifyOnlyChar, writableChar] };
      }
      const e = new Error("not found");
      e.name = "NotFoundError";
      throw e;
    });
    const server = { device: { gatt: { disconnect: vi.fn() } }, getPrimaryService };
    navigator.bluetooth = {
      requestDevice: vi.fn(async () => ({ gatt: { connect: async () => server } })),
    };
    const { result } = renderHook(() => useTsplPrinter());
    let ok;
    await act(async () => {
      ok = await result.current.printImageBle("data:image/png;base64,abc", { algorithm: "binary" });
    });
    expect(ok).toBe(true);
    expect(writableChar.writes.length).toBeGreaterThan(0);
    expect(notifyOnlyChar.writes.length).toBe(0);
    disconnectPrinter();
  });
});

describe("useTsplPrinter.printImageBle - pilihan protocol", () => {
  const origBt = navigator.bluetooth;
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    if (origBt === undefined) delete navigator.bluetooth;
    else navigator.bluetooth = origBt;
    vi.restoreAllMocks();
    disconnectPrinter();
  });

  function makeCapturingChar() {
    const chunks = [];
    const fn = vi.fn(async (chunk) => {
      chunks.push(new Uint8Array(chunk));
    });
    return {
      properties: { writeWithoutResponse: true, write: true },
      writeValueWithoutResponse: fn,
      writeValueWithResponse: fn,
      writeValue: fn,
      get sent() {
        const total = chunks.reduce((n, c) => n + c.length, 0);
        const out = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) {
          out.set(c, off);
          off += c.length;
        }
        return out;
      },
    };
  }

  it("default (tanpa protocol): tetap kirim perintah TSPL (ASCII 'SIZE'/'BITMAP')", async () => {
    const char = makeCapturingChar();
    const server = {
      device: { gatt: { disconnect: vi.fn() } },
      getPrimaryService: async () => ({ getCharacteristics: async () => [char] }),
    };
    navigator.bluetooth = {
      requestDevice: vi.fn(async () => ({ gatt: { connect: async () => server } })),
    };
    const { result } = renderHook(() => useTsplPrinter());
    await act(async () => {
      await result.current.printImageBle("data:image/png;base64,abc", { algorithm: "binary" });
    });
    const text = Array.from(char.sent.subarray(0, 4), (b) => String.fromCharCode(b)).join("");
    expect(text).toBe("SIZE");
  });

  it("protocol: 'escpos' -> kirim perintah ESC/POS (ESC @ lalu GS v 0), bukan teks TSPL", async () => {
    const char = makeCapturingChar();
    const server = {
      device: { gatt: { disconnect: vi.fn() } },
      getPrimaryService: async () => ({ getCharacteristics: async () => [char] }),
    };
    navigator.bluetooth = {
      requestDevice: vi.fn(async () => ({ gatt: { connect: async () => server } })),
    };
    const { result } = renderHook(() => useTsplPrinter());
    let ok;
    await act(async () => {
      ok = await result.current.printImageBle("data:image/png;base64,abc", {
        algorithm: "binary",
        protocol: "escpos",
      });
    });
    expect(ok).toBe(true);
    const sent = char.sent;
    expect(Array.from(sent.subarray(0, 2))).toEqual([0x1b, 0x40]);
    expect(Array.from(sent.subarray(2, 6))).toEqual([0x1d, 0x76, 0x30, 0x00]);
  });

  it("protocol: 'escpos' -> putus koneksi SEGERA setelah print sukses (bukan idle-cache 60dtk spt TSPL)", async () => {
    const char = makeCapturingChar();
    const disconnect = vi.fn();
    const server = {
      device: { gatt: { disconnect } },
      getPrimaryService: async () => ({ getCharacteristics: async () => [char] }),
    };
    navigator.bluetooth = {
      requestDevice: vi.fn(async () => ({ gatt: { connect: async () => server } })),
    };
    const { result } = renderHook(() => useTsplPrinter());
    let ok;
    await act(async () => {
      ok = await result.current.printImageBle("data:image/png;base64,abc", {
        algorithm: "binary",
        protocol: "escpos",
      });
    });
    expect(ok).toBe(true);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("protocol default 'tspl' -> TIDAK putus segera (tetap idle-cache spt sebelumnya)", async () => {
    const char = makeCapturingChar();
    const disconnect = vi.fn();
    const server = {
      device: { gatt: { disconnect } },
      getPrimaryService: async () => ({ getCharacteristics: async () => [char] }),
    };
    navigator.bluetooth = {
      requestDevice: vi.fn(async () => ({ gatt: { connect: async () => server } })),
    };
    const { result } = renderHook(() => useTsplPrinter());
    let ok;
    await act(async () => {
      ok = await result.current.printImageBle("data:image/png;base64,abc", { algorithm: "binary" });
    });
    expect(ok).toBe(true);
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("protocol: 'escpos' -> pakai writeValueWithResponse (ack tiap paket), bukan write-without-response", async () => {
    const withoutResp = vi.fn(async () => {});
    const withResp = vi.fn(async () => {});
    const char = {
      properties: { writeWithoutResponse: true, write: true },
      writeValueWithoutResponse: withoutResp,
      writeValueWithResponse: withResp,
    };
    const server = {
      device: { gatt: { disconnect: vi.fn() } },
      getPrimaryService: async () => ({ getCharacteristics: async () => [char] }),
    };
    navigator.bluetooth = {
      requestDevice: vi.fn(async () => ({ gatt: { connect: async () => server } })),
    };
    const { result } = renderHook(() => useTsplPrinter());
    let ok;
    await act(async () => {
      ok = await result.current.printImageBle("data:image/png;base64,abc", {
        algorithm: "binary",
        protocol: "escpos",
      });
    });
    expect(ok).toBe(true);
    expect(withResp).toHaveBeenCalled();
    expect(withoutResp).not.toHaveBeenCalled();
  });

  it("protocol default 'tspl' -> tetap pakai write-without-response (tidak dipaksa pakai ack)", async () => {
    const withoutResp = vi.fn(async () => {});
    const withResp = vi.fn(async () => {});
    const char = {
      properties: { writeWithoutResponse: true, write: true },
      writeValueWithoutResponse: withoutResp,
      writeValueWithResponse: withResp,
    };
    const server = {
      device: { gatt: { disconnect: vi.fn() } },
      getPrimaryService: async () => ({ getCharacteristics: async () => [char] }),
    };
    navigator.bluetooth = {
      requestDevice: vi.fn(async () => ({ gatt: { connect: async () => server } })),
    };
    const { result } = renderHook(() => useTsplPrinter());
    let ok;
    await act(async () => {
      ok = await result.current.printImageBle("data:image/png;base64,abc", { algorithm: "binary" });
    });
    expect(ok).toBe(true);
    expect(withoutResp).toHaveBeenCalled();
    expect(withResp).not.toHaveBeenCalled();
  });
});
