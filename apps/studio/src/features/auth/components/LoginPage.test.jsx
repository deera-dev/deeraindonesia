import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../../../../../test/helpers/renderWithRouter.jsx";

const signIn = vi.fn();
const authState = { user: null, loading: false };
vi.mock("@deera/shared/features/auth/hooks", () => ({
  signIn: (...args) => signIn(...args),
  useAuth: () => authState,
}));

const { default: LoginPage } = await import("./LoginPage");

function renderPage() {
  return renderWithRouter({
    initialPath: "/login",
    routes: {
      "/login": LoginPage,
      "/": () => <div>HOME-PLACEHOLDER</div>,
    },
  });
}

beforeEach(() => {
  signIn.mockReset().mockResolvedValue({ error: null });
  authState.user = null;
  authState.loading = false;
});

describe("LoginPage", () => {
  it("redirect ke / kalau sudah login", async () => {
    authState.user = { email: "denny@deera.id" };
    await renderPage();
    await waitFor(() => expect(screen.getByText("HOME-PLACEHOLDER")).toBeInTheDocument());
  });

  it("submit memanggil signIn dengan username (tanpa domain) & password", async () => {
    await renderPage();
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "denny" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "rahasia" } });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith("denny", "rahasia"));
  });

  it("membuang bagian @domain kalau user paste email lengkap", async () => {
    await renderPage();
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "denny@deera.id" },
    });
    expect(screen.getByLabelText("Username")).toHaveValue("denny");
  });

  it("menampilkan pesan error kalau signIn gagal", async () => {
    signIn.mockResolvedValue({ error: { message: "invalid" } });
    await renderPage();
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "denny" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "salah" } });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(await screen.findByText("Username atau password salah.")).toBeInTheDocument();
  });
});
