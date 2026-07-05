import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./api", () => ({
  fetchHppTemplates:  vi.fn().mockResolvedValue([{ id: "1" }]),
  fetchHppConfig:     vi.fn().mockResolvedValue({ plastik: 1800 }),
  fetchHppConfigRows: vi.fn().mockResolvedValue([{ key: "plastik" }]),
  fetchBahanOptions:  vi.fn().mockResolvedValue([{ id: "b1" }]),
  saveHppTemplates:   vi.fn().mockResolvedValue(1),
  deleteHppTemplate:  vi.fn().mockResolvedValue(undefined),
  saveHppConfigValue: vi.fn().mockResolvedValue(undefined),
}));

import {
  produksiHppKeys,
  useHppTemplatesQuery, useHppConfigQuery, useHppConfigRowsQuery,
  useBahanOptionsQuery, useSaveHppTemplatesMutation, useDeleteHppTemplateMutation,
  useSaveHppConfigMutation,
} from "./queries";
import { fetchHppTemplates } from "./api";

const wrapper = createWrapper();
beforeEach(() => vi.clearAllMocks());

describe("produksiHppKeys", () => {
  it("has templates key", () => {
    expect(produksiHppKeys.templates).toEqual(["produksi-hpp", "templates"]);
  });
  it("has config key", () => {
    expect(produksiHppKeys.config).toEqual(["produksi-hpp", "config"]);
  });
  it("has bahanOptions key", () => {
    expect(produksiHppKeys.bahanOptions).toEqual(["produksi-hpp", "bahan-options"]);
  });
});

describe("useHppTemplatesQuery", () => {
  it("calls fetchHppTemplates and resolves", async () => {
    const { result } = renderHook(() => useHppTemplatesQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchHppTemplates).toHaveBeenCalled();
  });
});

describe("useHppConfigQuery", () => {
  it("resolves with config", async () => {
    const { result } = renderHook(() => useHppConfigQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveProperty("plastik");
  });
});

describe("useHppConfigRowsQuery", () => {
  it("resolves with rows", async () => {
    const { result } = renderHook(() => useHppConfigRowsQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe("useBahanOptionsQuery", () => {
  it("resolves with options", async () => {
    const { result } = renderHook(() => useBahanOptionsQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe("useSaveHppTemplatesMutation", () => {
  it("exposes mutateAsync", () => {
    const { result } = renderHook(() => useSaveHppTemplatesMutation(), { wrapper });
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe("useDeleteHppTemplateMutation", () => {
  it("exposes mutateAsync", () => {
    const { result } = renderHook(() => useDeleteHppTemplateMutation(), { wrapper });
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe("useSaveHppConfigMutation", () => {
  it("exposes mutateAsync", () => {
    const { result } = renderHook(() => useSaveHppConfigMutation(), { wrapper });
    expect(result.current.mutateAsync).toBeDefined();
  });
});
