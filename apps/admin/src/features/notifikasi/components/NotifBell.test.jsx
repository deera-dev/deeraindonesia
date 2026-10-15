import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

let count = 3;
vi.mock("../hooks", () => ({ useNotifications: () => ({ unreadCount: count }) }));
import NotifBell from "./NotifBell";

describe("NotifBell", () => {
  it("menampilkan badge dan link ke /notifikasi", () => {
    count = 3;
    render(<MemoryRouter><NotifBell /></MemoryRouter>);
    expect(screen.getByTestId("notif-badge")).toHaveTextContent("3");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/notifikasi");
  });
  it("tanpa badge jika 0, 9+ jika banyak", () => {
    count = 0;
    const { rerender } = render(<MemoryRouter><NotifBell /></MemoryRouter>);
    expect(screen.queryByTestId("notif-badge")).toBeNull();
    count = 12;
    rerender(<MemoryRouter><NotifBell /></MemoryRouter>);
    expect(screen.getByTestId("notif-badge")).toHaveTextContent("9+");
  });
});
