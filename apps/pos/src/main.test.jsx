import { describe, it, expect, vi } from "vitest";

vi.mock("./App", () => ({ default: () => null }));
vi.mock("@deera/shared/lib/queryClient", () => ({
  createAppQueryClient: () => ({
    getQueryCache: () => ({ subscribe: vi.fn(), clear: vi.fn() }),
    getMutationCache: () => ({ subscribe: vi.fn() }),
    mount: vi.fn(),
    unmount: vi.fn(),
    clear: vi.fn(),
    defaultOptions: {},
    setDefaultOptions: vi.fn(),
  }),
}));
vi.mock("@deera/shared/styles/index.css", () => ({}));

describe("main.jsx bootstrap", () => {
  it("renders without error when root element exists", async () => {
    const div = document.createElement("div");
    div.id = "root";
    document.body.appendChild(div);
    await expect(import("./main")).resolves.toBeDefined();
    document.body.removeChild(div);
  });
});
