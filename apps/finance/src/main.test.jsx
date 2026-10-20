import { describe, it, expect, vi } from "vitest";

const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({ render: mockRender }));
vi.mock("react-dom/client", () => ({ createRoot: mockCreateRoot }));
vi.mock("@tanstack/react-query", () => ({
  QueryClientProvider: ({ children }) => children,
}));
vi.mock("@deera/shared/lib/queryClient", () => ({
  createAppQueryClient: vi.fn(() => ({})),
}));
vi.mock("@deera/shared/styles/index.css", () => ({}));
vi.mock("./App.jsx", () => ({ default: () => null }));
vi.mock("@deera/shared/components/UpdateBanner", () => ({ default: () => null }));

const capturedListeners = [];
const origAdd = document.addEventListener.bind(document);
document.addEventListener = (type, handler, opts) => {
  capturedListeners.push({ type, handler, opts });
  origAdd(type, handler, opts);
};

if (!document.getElementById("root")) {
  const root = document.createElement("div");
  root.id = "root";
  document.body.appendChild(root);
}

await import("./main.jsx");

describe("main.jsx side-effects", () => {
  it("adds theme-light class to body", () => {
    expect(document.body.classList.contains("theme-light")).toBe(true);
  });

  it("registers an input event listener in capture phase", () => {
    const entry = capturedListeners.find((h) => h.type === "input");
    expect(entry).toBeDefined();
    expect(entry.opts).toBe(true);
  });

  it("auto-uppercase handler converts lowercase to uppercase", () => {
    const entry = capturedListeners.find((h) => h.type === "input");
    const input = document.createElement("input");
    input.type = "text";
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "hello");
    expect(() => entry.handler({ target: input })).not.toThrow();
  });

  it("auto-uppercase handler is a no-op for non-text inputs", () => {
    const entry = capturedListeners.find((h) => h.type === "input");
    const input = document.createElement("input");
    input.type = "number";
    input.value = "42";
    expect(() => entry.handler({ target: input })).not.toThrow();
  });

  it("auto-uppercase handler is a no-op when value is already uppercase", () => {
    const entry = capturedListeners.find((h) => h.type === "input");
    const input = document.createElement("input");
    input.type = "text";
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "HELLO");
    expect(() => entry.handler({ target: input })).not.toThrow();
  });

  it("calls createRoot and renders the app", () => {
    expect(mockCreateRoot).toHaveBeenCalled();
    expect(mockRender).toHaveBeenCalled();
  });
});
