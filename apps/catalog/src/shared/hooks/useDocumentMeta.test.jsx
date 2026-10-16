import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import useDocumentMeta from "./useDocumentMeta";

function Probe(props) {
  useDocumentMeta(props);
  return null;
}

describe("useDocumentMeta", () => {
  it("mengisi meta lalu memulihkan saat unmount", () => {
    document.head.innerHTML = '<title>Awal</title><meta name="description" content="lama"><link rel="canonical" href="https://deera.id/catalog">';
    const { unmount } = render(<Probe title="D-1 | Deera" description="baru" canonical="https://deera.id/code/D-1" jsonLd={{ "@type": "Product" }} />);
    expect(document.title).toBe("D-1 | Deera");
    expect(document.head.querySelector('meta[name="description"]').content).toBe("baru");
    expect(document.head.querySelector('link[rel="canonical"]').href).toBe("https://deera.id/code/D-1");
    expect(document.head.querySelector('script[type="application/ld+json"]').textContent).toContain("Product");
    unmount();
    expect(document.title).toBe("Awal");
    expect(document.head.querySelector('meta[name="description"]').content).toBe("lama");
    expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});
