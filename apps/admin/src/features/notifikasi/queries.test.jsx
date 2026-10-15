import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("./api", () => ({
  fetchMyNotifications: vi.fn(),
  markNotificationsSeen: vi.fn(),
  markNotificationRead: vi.fn(() => new Promise((r) => setTimeout(r, 30))),
}));
import { useMarkNotificationReadMutation, notifKeys } from "./queries";

describe("useMarkNotificationReadMutation", () => {
  it("menandai terbaca secara optimistik sebelum server menjawab", async () => {
    const qc = new QueryClient();
    qc.setQueryData(notifKeys.all, [
      { id: "a", is_unread: true },
      { id: "b", is_unread: true },
    ]);
    const wrapper = ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useMarkNotificationReadMutation(), { wrapper });
    act(() => result.current.mutate("a"));
    await waitFor(() => expect(qc.getQueryData(notifKeys.all).find((n) => n.id === "a").is_unread).toBe(false));
    expect(qc.getQueryData(notifKeys.all).find((n) => n.id === "b").is_unread).toBe(true);
  });
});
