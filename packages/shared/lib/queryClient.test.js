import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "./queryClient";

describe("createAppQueryClient", () => {
  it("mengembalikan instance QueryClient", () => {
    const client = createAppQueryClient();
    expect(client).toBeInstanceOf(QueryClient);
  });

  it("menerapkan default options queries & mutations sesuai konvensi", () => {
    const client = createAppQueryClient();
    const defaults = client.getDefaultOptions();

    expect(defaults.queries.staleTime).toBe(30_000);
    expect(defaults.queries.refetchOnWindowFocus).toBe(false);
    expect(defaults.queries.retry).toBe(1);
    expect(defaults.mutations.retry).toBe(0);
  });

  it("setiap pemanggilan menghasilkan instance baru yang independen", () => {
    const clientA = createAppQueryClient();
    const clientB = createAppQueryClient();
    expect(clientA).not.toBe(clientB);
  });
});
