import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

// ── Auto-uppercase logic (replicated from main.jsx for unit testing) ──────────
function applyUppercase(el) {
  if (!(el instanceof HTMLInputElement) || el.type !== "text") return;
  const upper = el.value.toUpperCase();
  if (upper === el.value) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, upper);
  try { el.setSelectionRange(0, 0); } catch (_) {}
}

describe("auto-uppercase listener logic", () => {
  let input;
  beforeEach(() => {
    input = document.createElement("input");
    input.type = "text";
    document.body.appendChild(input);
  });
  afterEach(() => {
    document.body.removeChild(input);
  });

  it("uppercases lowercase value", () => {
    input.value = "hello";
    applyUppercase(input);
    expect(input.value).toBe("HELLO");
  });

  it("does nothing when already uppercase", () => {
    input.value = "HELLO";
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    const spy = vi.spyOn(descriptor, "set");
    applyUppercase(input);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("does nothing for non-text input", () => {
    const numInput = document.createElement("input");
    numInput.type = "number";
    numInput.value = "42";
    applyUppercase(numInput);
    expect(numInput.value).toBe("42");
  });

  it("does nothing for non-input element", () => {
    const div = document.createElement("div");
    expect(() => applyUppercase(div)).not.toThrow();
  });

  it("handles mixed case", () => {
    input.value = "hElLo";
    applyUppercase(input);
    expect(input.value).toBe("HELLO");
  });

  it("handles empty string without error", () => {
    input.value = "";
    expect(() => applyUppercase(input)).not.toThrow();
    expect(input.value).toBe("");
  });
});

describe("main.jsx bootstrap", () => {
  it("renders without error when root element exists", async () => {
    const div = document.createElement("div");
    div.id = "root";
    document.body.appendChild(div);
    await expect(import("./main")).resolves.toBeDefined();
    document.body.removeChild(div);
  });
});
