import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  globalThis.Notification = Object.assign(function MockNotification() {}, {
    permission: "default",
    requestPermission: () => Promise.resolve("granted"),
  });
});

import NotificationGate from "./NotificationGate";

const savedNotification = globalThis.Notification;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  globalThis.Notification = savedNotification;
});

describe("NotificationGate — granted", () => {
  beforeEach(() => {
    globalThis.Notification = Object.assign(function N() {}, {
      permission: "granted",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });
  });

  it("renders children directly when permission is granted", () => {
    render(
      <NotificationGate>
        <div data-testid="content">Content</div>
      </NotificationGate>,
    );
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });
});

describe("NotificationGate — default (not yet asked)", () => {
  beforeEach(() => {
    globalThis.Notification = Object.assign(function N() {}, {
      permission: "default",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });
  });

  it("shows Aktifkan Notifikasi button", () => {
    render(
      <NotificationGate>
        <div />
      </NotificationGate>,
    );
    expect(screen.getByRole("button", { name: "Aktifkan Notifikasi" })).toBeInTheDocument();
  });

  it("calls requestPermission on click", async () => {
    render(
      <NotificationGate>
        <div />
      </NotificationGate>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Aktifkan Notifikasi" }));
    await waitFor(() => expect(globalThis.Notification.requestPermission).toHaveBeenCalled());
  });

  it("renders children after permission granted", async () => {
    render(
      <NotificationGate>
        <div data-testid="inner">Inner</div>
      </NotificationGate>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Aktifkan Notifikasi" }));
    await waitFor(() => expect(screen.getByTestId("inner")).toBeInTheDocument());
  });
});

describe("NotificationGate — denied", () => {
  beforeEach(() => {
    globalThis.Notification = Object.assign(function N() {}, {
      permission: "denied",
      requestPermission: vi.fn().mockResolvedValue("denied"),
    });
  });

  it("shows Notifikasi Diblokir when denied", () => {
    render(
      <NotificationGate>
        <div />
      </NotificationGate>,
    );
    expect(screen.getByText("Notifikasi Diblokir")).toBeInTheDocument();
  });

  it("shows Saya sudah mengizinkan button", () => {
    render(
      <NotificationGate>
        <div />
      </NotificationGate>,
    );
    expect(screen.getByText("Saya sudah mengizinkan")).toBeInTheDocument();
  });

  it("calls handleRecheck on Saya sudah mengizinkan click", () => {
    render(
      <NotificationGate>
        <div />
      </NotificationGate>,
    );
    fireEvent.click(screen.getByText("Saya sudah mengizinkan"));
    expect(screen.getByText("Notifikasi Diblokir")).toBeInTheDocument();
  });
});

describe("NotificationGate — browser does not support Notification", () => {
  it("renders children directly when Notification not supported", async () => {
    delete globalThis.Notification;
    vi.resetModules();
    const { default: FreshGate } = await import("./NotificationGate");
    render(
      <FreshGate>
        <div data-testid="unsupported-content">OK</div>
      </FreshGate>,
    );
    expect(screen.getByTestId("unsupported-content")).toBeInTheDocument();
  });
});
