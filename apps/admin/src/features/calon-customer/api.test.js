import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const {
  fetchCalonCustomerList,
  searchCalonCustomer,
  createCalonCustomer,
  updateCalonCustomer,
  deleteCalonCustomer,
} = await import("./api");

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
});

describe("fetchCalonCustomerList", () => {
  it("mengambil semua baris terurut nama", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: [{ id: "c1" }], error: null }));
    const result = await fetchCalonCustomerList();
    expect(supabaseMock.from).toHaveBeenCalledWith("calon_customer");
    expect(result).toEqual([{ id: "c1" }]);
  });

  it("melempar error dari Supabase", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: new Error("boom") }));
    await expect(fetchCalonCustomerList()).rejects.toThrow("boom");
  });
});

describe("searchCalonCustomer", () => {
  it("mengembalikan [] tanpa query saat kosong/whitespace", async () => {
    expect(await searchCalonCustomer("")).toEqual([]);
    expect(await searchCalonCustomer("   ")).toEqual([]);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("query ilike nama/no_hp, order nama, limit 20", async () => {
    const builder = makeBuilder({ data: [{ id: "c1", nama: "Budi" }], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    const result = await searchCalonCustomer("Budi");
    expect(builder.or).toHaveBeenCalledWith("nama.ilike.%Budi%,no_hp.ilike.%Budi%");
    expect(builder.order).toHaveBeenCalledWith("nama");
    expect(builder.limit).toHaveBeenCalledWith(20);
    expect(result).toEqual([{ id: "c1", nama: "Budi" }]);
  });
});

describe("createCalonCustomer", () => {
  it("melempar error saat nama kosong", async () => {
    await expect(createCalonCustomer({ nama: "" })).rejects.toThrow(
      "Nama calon customer wajib diisi.",
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("insert payload ter-trim, field kosong jadi null", async () => {
    const builder = makeBuilder({ data: { id: "c-new" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    const result = await createCalonCustomer({ nama: "  Budi  ", no_hp: "", catatan: undefined });
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ nama: "Budi", no_hp: null, catatan: null }),
    );
    expect(result).toEqual({ id: "c-new" });
  });
});

describe("updateCalonCustomer", () => {
  it("melempar error saat id kosong", async () => {
    await expect(updateCalonCustomer(null, {})).rejects.toThrow("id calon customer wajib diisi.");
  });

  it("hanya menimpa field yang disebut di patch", async () => {
    const builder = makeBuilder({ data: { id: "c1" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await updateCalonCustomer("c1", { no_hp: "0812" });
    const payload = builder.update.mock.calls[0][0];
    expect(payload.no_hp).toBe("0812");
    expect(payload).not.toHaveProperty("nama");
    expect(builder.eq).toHaveBeenCalledWith("id", "c1");
  });
});

describe("deleteCalonCustomer", () => {
  it("melempar error saat id kosong", async () => {
    await expect(deleteCalonCustomer(null)).rejects.toThrow("id calon customer wajib diisi.");
  });

  it("delete by id", async () => {
    const builder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await deleteCalonCustomer("c1");
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", "c1");
  });
});
