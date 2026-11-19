import { describe, it, expect, vi, beforeEach } from "vitest";

function makeChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    in: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: { from: fromMock } }));
import { fetchKolasePilihanByKode } from "./api";

// Saran POS (November 2026): Share Foto Cantik utamakan kolase hasil
// generate deerastudio (image_role "kolase_pilihan" di ai_generations,
// project Supabase sama dgn Deera) drpd foto utama/seri warna.
describe("fetchKolasePilihanByKode", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("kodes kosong: tidak query sama sekali, hasil {}", async () => {
    expect(await fetchKolasePilihanByKode([])).toEqual({});
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("tidak ada set ditemukan: hasil {}, tidak lanjut query ai_generations", async () => {
    const setsChain = makeChain({ data: [], error: null });
    fromMock.mockReturnValueOnce(setsChain);
    const result = await fetchKolasePilihanByKode(["D-01"]);
    expect(result).toEqual({});
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it("pilih kolase_pilihan PALING BARU per kode (data sudah terurut desc dari query)", async () => {
    const setsChain = makeChain({
      data: [
        { id: "set-1", product_kode: "D-01" },
        { id: "set-2", product_kode: "D-02" },
      ],
      error: null,
    });
    const gensChain = makeChain({
      data: [
        { generation_set_id: "set-1", output_image_url: "https://x/d01-baru.png", created_at: "2026-11-10" },
        { generation_set_id: "set-1", output_image_url: "https://x/d01-lama.png", created_at: "2026-11-01" },
        { generation_set_id: "set-2", output_image_url: "https://x/d02.png", created_at: "2026-11-05" },
      ],
      error: null,
    });
    fromMock.mockReturnValueOnce(setsChain).mockReturnValueOnce(gensChain);

    const result = await fetchKolasePilihanByKode(["D-01", "D-02", "D-03"]);

    expect(result).toEqual({
      "D-01": "https://x/d01-baru.png",
      "D-02": "https://x/d02.png",
    });
    expect(gensChain.eq).toHaveBeenCalledWith("image_role", "kolase_pilihan");
    expect(gensChain.eq).toHaveBeenCalledWith("status", "completed");
    expect(gensChain.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("error di query sets: melempar error", async () => {
    const setsChain = makeChain({ data: null, error: new Error("boom") });
    fromMock.mockReturnValueOnce(setsChain);
    await expect(fetchKolasePilihanByKode(["D-01"])).rejects.toThrow("boom");
  });

  it("error di query ai_generations: melempar error", async () => {
    const setsChain = makeChain({ data: [{ id: "set-1", product_kode: "D-01" }], error: null });
    const gensChain = makeChain({ data: null, error: new Error("gagal") });
    fromMock.mockReturnValueOnce(setsChain).mockReturnValueOnce(gensChain);
    await expect(fetchKolasePilihanByKode(["D-01"])).rejects.toThrow("gagal");
  });
});
