/**
 * LoginScreen.jsx
 * Form login POS — email/password via Supabase Auth.
 * Desain bersih, touch target besar untuk kemudahan pengguna lanjut usia.
 */
import { useState } from "react";
import { signIn } from "@deera/shared/features/auth/hooks";
import PasswordInput from "@deera/shared/components/PasswordInput";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await signIn(username, password);
    if (err) {
      setError("Username atau password salah.");
      setLoading(false);
    }
    // Jika berhasil, useAuth akan update dan App.jsx otomatis re-render
  }

  return (
    <main className="min-h-screen bg-skin-page flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <p className="text-base tracking-[0.3em] text-skin-text2 uppercase mb-3">Point of Sale</p>
          <h1 className="text-7xl text-[#CAB170] leading-none font-headline">DEERA</h1>
          <div className="w-14 h-0.5 mx-auto mt-5 bg-[#CAB170]/40" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-base text-skin-text2 tracking-[0.15em] uppercase font-medium">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
              className="bg-skin-card border-2 border-skin-bdr text-skin-text px-5 py-5 text-xl focus:outline-none focus:border-[#CAB170] transition"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-base text-skin-text2 tracking-[0.15em] uppercase font-medium">
              Password
            </label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="bg-skin-card border-2 border-skin-bdr text-skin-text px-5 py-5 text-xl focus:outline-none focus:border-[#CAB170] transition"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-base text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-[#CAB170] text-white py-5 text-xl tracking-[0.2em] uppercase hover:bg-[#A8925A] transition disabled:opacity-50 font-medium"
          >
            {loading ? "Masuk..." : "Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}
