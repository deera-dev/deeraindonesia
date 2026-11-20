import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("default status info, berdenyut (pulse) via class", () => {
    render(<Badge>Diproses</Badge>);
    expect(screen.getByText("Diproses").parentElement).toHaveClass("aurum-badge--info");
    expect(document.querySelector(".aurum-badge-pulse")).not.toBeNull();
  });

  it("status lain tidak pakai class pulse", () => {
    render(<Badge status="success">Lunas</Badge>);
    expect(document.querySelector(".aurum-badge-pulse")).toBeNull();
  });

  it.each(["success", "warning", "danger", "info"] as const)(
    "status %s render ikon & class yang sesuai",
    (status) => {
      render(<Badge status={status}>X</Badge>);
      expect(document.querySelector(`.aurum-badge--${status}`)).not.toBeNull();
    },
  );
});
