import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const signInMock = vi.fn();
const authState = { user: null, loading: false };
vi.mock("@deera/shared/features/auth/hooks", () => ({
  signIn: (...args) => signInMock(...args),
  useAuth: () => authState,
}));

const { default: LoginPage } = await import("./LoginPage");

// Catatan: label di LoginPage.jsx TIDAK punya htmlFor/id yang menghubungkannya
// ke <input> (sekadar sibling dalam div), jadi getByLabelText tidak bisa
// dipakai di sini — ambil input langsung lewat container.querySelector
// berdasarkan atribut `type`.
function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

function getUsernameInput(container) {
  return container.querySelector('input[type="text"]');
}

function getPasswordInput(container) {
  return container.querySelector('input[type="password"]');
}

beforeEach(() => {
  navigateMock.mockReset();
  signInMock.mockReset();
  authState.user = null;
  authState.loading = false;
});

describe("LoginPage", () => {
  it("redirect ke / saat user sudah login (tidak lagi loading)", () => {
    authState.user = { id: "u1" };
    authState.loading = false;
    const { container } = renderPage();
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
    expect(container.querySelector("form")).toBeNull();
  });

  it("tidak redirect saat masih authLoading meski user ada", () => {
    authState.user = { id: "u1" };
    authState.loading = true;
    renderPage();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.getByText("DEERA")).toBeInTheDocument();
  });

  it("render form login saat belum ada user", () => {
    const { container } = renderPage();
    expect(screen.getByText("DEERA")).toBeInTheDocument();
    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
    expect(getUsernameInput(container)).not.toBeNull();
    expect(getPasswordInput(container)).not.toBeNull();
    expect(screen.getByRole("button", { name: "Masuk" })).toBeInTheDocument();
  });

  it("tombol disabled saat authLoading=true", () => {
    authState.loading = true;
    renderPage();
    expect(screen.getByRole("button", { name: "Masuk" })).toBeDisabled();
  });

  it("submit sukses memanggil signIn dengan username/password & navigate ke /", async () => {
    signInMock.mockResolvedValue({ error: null });
    const { container } = renderPage();

    fireEvent.change(getUsernameInput(container), { target: { value: "kasir1" } });
    fireEvent.change(getPasswordInput(container), { target: { value: "rahasia" } });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("kasir1", "rahasia");
    });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
    });
    expect(screen.queryByText("Username atau password salah.")).toBeNull();
  });

  it("submit gagal menampilkan pesan error & tidak navigate", async () => {
    signInMock.mockResolvedValue({ error: { message: "Invalid login" } });
    const { container } = renderPage();

    fireEvent.change(getUsernameInput(container), { target: { value: "kasir1" } });
    fireEvent.change(getPasswordInput(container), { target: { value: "salah" } });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));

    expect(await screen.findByText("Username atau password salah.")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Masuk" })).not.toBeDisabled();
  });

  it("menampilkan teks 'Masuk...' & disable tombol selama submit berjalan", async () => {
    let resolveSignIn;
    signInMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        })
    );
    const { container } = renderPage();

    fireEvent.change(getUsernameInput(container), { target: { value: "kasir1" } });
    fireEvent.change(getPasswordInput(container), { target: { value: "rahasia" } });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));

    expect(await screen.findByRole("button", { name: "Masuk..." })).toBeDisabled();

    resolveSignIn({ error: null });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
    });
  });
});
