import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Kalau sudah login, langsung ke admin
  if (!authLoading && user) {
    navigate("/admin", { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await signIn(username, password);
    if (err) {
      setError("Username atau password salah.");
      setLoading(false);
    } else {
      navigate("/admin", { replace: true });
    }
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="font-editorial tracking-[0.4em] text-white/30 text-xs uppercase mb-3">
            Admin
          </p>
          <h1 className="font-headline text-[#cab170] text-6xl leading-none">
            DEERA
          </h1>
          <div className="w-10 h-px mx-auto mt-4 bg-[#cab170]/30" />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-editorial text-white/40 text-[10px] tracking-[0.3em] uppercase">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
              className="bg-white/5 border border-white/10 text-white px-4 py-3 font-editorial text-sm tracking-wide outline-none focus:border-white/35 transition"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-editorial text-white/40 text-[10px] tracking-[0.3em] uppercase">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="bg-white/5 border border-white/10 text-white px-4 py-3 font-editorial text-sm tracking-wide outline-none focus:border-white/35 transition"
            />
          </div>
          {error && (
            <p className="font-editorial text-red-400 text-xs tracking-[0.15em]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || authLoading}
            className="mt-2 bg-[#cab170] text-black py-3 font-editorial text-xs tracking-[0.3em] uppercase hover:bg-[#a8925a] transition disabled:opacity-50"
          >
            {loading ? "Masuk..." : "Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}
