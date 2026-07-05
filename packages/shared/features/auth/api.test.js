import { describe, it, expect, vi, beforeEach } from "vitest";

const signInWithPassword = vi.fn();
const signOutMock = vi.fn();
const getUser = vi.fn();

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args) => signInWithPassword(...args),
      signOut: (...args) => signOutMock(...args),
      getUser: (...args) => getUser(...args),
    },
  },
}));

const { signIn, signOut, getCurrentUser, displayName } = await import("./api");

describe("signIn", () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
  });

  it("mengubah username menjadi email internal @deera.id, trim + lowercase", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: {} }, error: null });

    await signIn("  Budi  ", "secret123");

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "budi@deera.id",
      password: "secret123",
    });
  });

  it("meneruskan hasil dari supabase.auth.signInWithPassword", async () => {
    const response = { data: { user: { id: "u1" } }, error: null };
    signInWithPassword.mockResolvedValue(response);

    const result = await signIn("admin", "pw");

    expect(result).toBe(response);
  });
});

describe("signOut", () => {
  it("memanggil supabase.auth.signOut dan meneruskan hasilnya", async () => {
    const response = { error: null };
    signOutMock.mockResolvedValue(response);

    const result = await signOut();

    expect(signOutMock).toHaveBeenCalled();
    expect(result).toBe(response);
  });
});

describe("getCurrentUser", () => {
  it("mengembalikan user dari supabase.auth.getUser", async () => {
    const user = { id: "u1", email: "budi@deera.id" };
    getUser.mockResolvedValue({ data: { user } });

    const result = await getCurrentUser();

    expect(result).toBe(user);
  });

  it("mengembalikan null/undefined apa adanya saat tidak ada user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const result = await getCurrentUser();

    expect(result).toBeNull();
  });
});

describe("displayName", () => {
  it("mengembalikan '-' saat user null", () => {
    expect(displayName(null)).toBe("-");
  });

  it("mengembalikan '-' saat user undefined", () => {
    expect(displayName(undefined)).toBe("-");
  });

  it("menggunakan full_name dari metadata jika ada, diubah ke uppercase", () => {
    const user = {
      user_metadata: { full_name: "budi santoso" },
      email: "budi@deera.id",
    };
    expect(displayName(user)).toBe("BUDI SANTOSO");
  });

  it("fallback ke username dari email (memangkas domain @deera.id) saat full_name tidak ada", () => {
    const user = { user_metadata: {}, email: "budi@deera.id" };
    expect(displayName(user)).toBe("BUDI");
  });

  it("fallback ke email penuh saat email bukan domain internal @deera.id", () => {
    const user = { email: "external@gmail.com" };
    expect(displayName(user)).toBe("EXTERNAL@GMAIL.COM");
  });

  it("fallback ke '-' saat full_name dan email keduanya tidak ada", () => {
    const user = { user_metadata: {} };
    expect(displayName(user)).toBe("-");
  });

  it("fallback ke '-' saat full_name kosong dan email persis sama dengan domain (toUsername menghasilkan string kosong)", () => {
    const user = { email: "@deera.id" };
    expect(displayName(user)).toBe("-");
  });
});
