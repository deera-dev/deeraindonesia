import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("default: padding md, tanpa elevated", () => {
    render(<Card>Isi</Card>);
    const card = screen.getByText("Isi");
    expect(card).toHaveClass("aurum-card", "aurum-card--pad-md");
    expect(card).not.toHaveClass("aurum-card--elevated");
  });

  it("elevated & padding custom ikut ditambahkan", () => {
    render(
      <Card padding="lg" elevated>
        Isi
      </Card>,
    );
    const card = screen.getByText("Isi");
    expect(card).toHaveClass("aurum-card--pad-lg", "aurum-card--elevated");
  });
});
