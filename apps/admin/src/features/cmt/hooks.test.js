import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./queries", () => ({
  useCmtJahitKirimQuery: vi.fn(),
  useAvailablePotonganMutation: vi.fn(),
  useCreateKirimCmtJahitMutation: vi.fn(),
  useSetorKirimCmtJahitMutation: vi.fn(),
  useBatalKirimCmtJahitMutation: vi.fn(),
  useCmtSetoranFullQuery: vi.fn(),
  useCreateSetoranFullMutation: vi.fn(),
  useCmtFullKirimQuery: vi.fn(),
  useCreateCmtFullKirimMutation: vi.fn(),
  useDeleteCmtFullKirimMutation: vi.fn(),
  useUpdateHargaUpahKirimMutation: vi.fn(),
}));

import {
  useCmtJahitKirim,
  useAvailablePotongan,
  useCreateKirimCmtJahit,
  useSetorKirimCmtJahit,
  useBatalKirimCmtJahit,
  useCmtSetoranFull,
  useCreateSetoranFull,
  useCmtFullKirim,
  useCreateCmtFullKirim,
  useDeleteCmtFullKirim,
  useUpdateHargaUpahKirim,
} from "./hooks";
import {
  useCmtJahitKirimQuery,
  useAvailablePotonganMutation,
  useCreateKirimCmtJahitMutation,
  useSetorKirimCmtJahitMutation,
  useBatalKirimCmtJahitMutation,
  useCmtSetoranFullQuery,
  useCreateSetoranFullMutation,
  useCmtFullKirimQuery,
  useCreateCmtFullKirimMutation,
  useDeleteCmtFullKirimMutation,
  useUpdateHargaUpahKirimMutation,
} from "./queries";

const wrapper = createWrapper();
const mockMutate = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  mockMutate.mockResolvedValue(undefined);
  useCmtJahitKirimQuery.mockReturnValue({ data: [{ id: "k1" }], isLoading: false });
  useAvailablePotonganMutation.mockReturnValue({ mutateAsync: mockMutate, isPending: false });
  useCreateKirimCmtJahitMutation.mockReturnValue({ mutateAsync: mockMutate, isPending: false });
  useSetorKirimCmtJahitMutation.mockReturnValue({ mutateAsync: mockMutate, isPending: false });
  useBatalKirimCmtJahitMutation.mockReturnValue({ mutateAsync: mockMutate });
  useCmtSetoranFullQuery.mockReturnValue({ data: [{ id: "f1" }], isLoading: false });
  useCreateSetoranFullMutation.mockReturnValue({ mutateAsync: mockMutate, isPending: false });
  useCmtFullKirimQuery.mockReturnValue({ data: [{ id: "b1" }], isLoading: false });
  useCreateCmtFullKirimMutation.mockReturnValue({ mutateAsync: mockMutate, isPending: false });
  useDeleteCmtFullKirimMutation.mockReturnValue({ mutateAsync: mockMutate });
  useUpdateHargaUpahKirimMutation.mockReturnValue({ mutateAsync: mockMutate, isPending: false });
});

describe("useCmtJahitKirim", () => {
  it("returns rows & loading state, fallback [] saat data undefined", () => {
    const { result } = renderHook(() => useCmtJahitKirim(), { wrapper });
    expect(result.current.rows).toEqual([{ id: "k1" }]);
    expect(result.current.loading).toBe(false);

    useCmtJahitKirimQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result: r2 } = renderHook(() => useCmtJahitKirim(), { wrapper });
    expect(r2.current.rows).toEqual([]);
    expect(r2.current.loading).toBe(true);
  });
});

describe("useAvailablePotongan", () => {
  it("expose fetchPotongan(kode) + fetching flag, meneruskan kode ke mutateAsync", async () => {
    const { result } = renderHook(() => useAvailablePotongan(), { wrapper });
    expect(result.current.fetching).toBe(false);
    await result.current.fetchPotongan("D-01-OSK");
    expect(mockMutate).toHaveBeenCalledWith("D-01-OSK");
  });
});

describe("useCreateKirimCmtJahit", () => {
  it("expose createKirim() + creating flag, meneruskan params", async () => {
    const { result } = renderHook(() => useCreateKirimCmtJahit(), { wrapper });
    expect(result.current.creating).toBe(false);
    await result.current.createKirim({ namaVendor: "V" });
    expect(mockMutate).toHaveBeenCalledWith({ namaVendor: "V" });
  });
});

describe("useSetorKirimCmtJahit", () => {
  it("expose setorKirim() + submitting flag", async () => {
    const { result } = renderHook(() => useSetorKirimCmtJahit(), { wrapper });
    expect(result.current.submitting).toBe(false);
    await result.current.setorKirim({ kirimNo: "CMT-1" });
    expect(mockMutate).toHaveBeenCalledWith({ kirimNo: "CMT-1" });
  });
});

describe("useBatalKirimCmtJahit", () => {
  it("meneruskan params ke mutateAsync", async () => {
    const { result } = renderHook(() => useBatalKirimCmtJahit(), { wrapper });
    await result.current({ kirimNo: "CMT-1", ids: ["k1"] });
    expect(mockMutate).toHaveBeenCalledWith({ kirimNo: "CMT-1", ids: ["k1"] });
  });
});

describe("useCmtSetoranFull", () => {
  it("returns rows & loading state, fallback [] saat data undefined", () => {
    const { result } = renderHook(() => useCmtSetoranFull(), { wrapper });
    expect(result.current.rows).toEqual([{ id: "f1" }]);
    expect(result.current.loading).toBe(false);

    useCmtSetoranFullQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result: r2 } = renderHook(() => useCmtSetoranFull(), { wrapper });
    expect(r2.current.rows).toEqual([]);
    expect(r2.current.loading).toBe(true);
  });
});

describe("useCreateSetoranFull", () => {
  it("expose createSetoranFull() + creating flag", async () => {
    const { result } = renderHook(() => useCreateSetoranFull(), { wrapper });
    expect(result.current.creating).toBe(false);
    await result.current.createSetoranFull({ namaVendor: "V" });
    expect(mockMutate).toHaveBeenCalledWith({ namaVendor: "V" });
  });
});

describe("useCmtFullKirim", () => {
  it("returns rows & loading state, fallback [] saat data undefined", () => {
    const { result } = renderHook(() => useCmtFullKirim(), { wrapper });
    expect(result.current.rows).toEqual([{ id: "b1" }]);
    expect(result.current.loading).toBe(false);

    useCmtFullKirimQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result: r2 } = renderHook(() => useCmtFullKirim(), { wrapper });
    expect(r2.current.rows).toEqual([]);
    expect(r2.current.loading).toBe(true);
  });
});

describe("useCreateCmtFullKirim", () => {
  it("expose createKirimBahan() + creating flag", async () => {
    const { result } = renderHook(() => useCreateCmtFullKirim(), { wrapper });
    expect(result.current.creating).toBe(false);
    await result.current.createKirimBahan({ namaVendor: "V" });
    expect(mockMutate).toHaveBeenCalledWith({ namaVendor: "V" });
  });
});

describe("useDeleteCmtFullKirim", () => {
  it("meneruskan id ke mutateAsync", async () => {
    const { result } = renderHook(() => useDeleteCmtFullKirim(), { wrapper });
    await result.current("b1");
    expect(mockMutate).toHaveBeenCalledWith("b1");
  });
});

describe("useUpdateHargaUpahKirim", () => {
  it("expose updateHargaUpah() + saving flag", async () => {
    const { result } = renderHook(() => useUpdateHargaUpahKirim(), { wrapper });
    expect(result.current.saving).toBe(false);
    await result.current.updateHargaUpah({ kirimNo: "CMT-1", hargaUpah: "7000" });
    expect(mockMutate).toHaveBeenCalledWith({ kirimNo: "CMT-1", hargaUpah: "7000" });
  });
});
