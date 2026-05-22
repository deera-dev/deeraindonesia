import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn } from "@deera/shared/lib/auth";
import { useAuth } from "@deera/shared/hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!authLoading && user) { navigate("/admin", { replace: true }); return null; }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error: err } = await signIn(username, password);
    if (err) { setError("Username atau password salah."); setLoading(false); }
    else navigate("/admin", { replace: true });
  }

  return (
    <main className="min-h-screen bg-[#F9F7F4] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="font-editorial tracking-[0.3em] text-[#9C9690] text-sm uppercase mb-3">Admin</p>
          <h1 className="font-headline text-[#CAB170] text-6xl leading-none">DEERA</h1>
          <div className="w-12 h-px mx-auto mt-5 bg-[#CAB170]/40" />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="font-editorial text-[#6B6560] text-sm tracking-[0.2em] uppercase">Username</label>
            <input
              type="text" value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username" autoCapitalize="none" required
              className="bg-white border-2 border-[#E8E3DC] text-[#1A1918] px-4 py-3.5 font-editorial text-base rounded-none outline-none focus:border-[#CAB170] transition text-lg"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-editorial text-[#6B6560] text-sm tracking-[0.2em] uppercase">Password</label>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password" required
              className="bg-white border-2 border-[#E8E3DC] text-[#1A1918] px-4 py-3.5 font-editorial text-base rounded-none outline-none focus:border-[#CAB170] transition text-lg"
            />
          </div>
          {error && <p className="font-editorial text-red-600 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading || authLoading}
            className="mt-2 bg-[#CAB170] text-white py-4 font-editorial text-base tracking-[0.25em] uppercase hover:bg-[#A8925A] transition disabled:opacity-50 text-lg"
          >
            {loading ? "Masuk..." : "Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}
