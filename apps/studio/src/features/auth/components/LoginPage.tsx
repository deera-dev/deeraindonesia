import { signIn, useAuth } from "@deera/shared/features/auth/hooks";
import { Navigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Button } from "../../../shared/components/ui/Button";
import { FieldError, Input, Label } from "../../../shared/components/ui/Field";
import KineticGrid from "../../../shared/components/ui/KineticGrid";

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authLoading && user) return <Navigate to="/" replace />;

  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setUsername(raw.includes("@") ? (raw.split("@")[0] ?? "") : raw);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(username, password);
    setLoading(false);
    if (err) setError("Username atau password salah.");
  }

  return (
    <KineticGrid>
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="animate-fade-in-up relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/55 p-8 shadow-[0_1px_0_0_rgba(255,255,255,0.07)_inset,0_32px_64px_-28px_rgba(0,0,0,0.85)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/[0.07] before:via-white/[0.015] before:to-transparent">
          <div className="relative mb-6 flex flex-col items-center text-center">
            <img
              src="/deera-logo-lg.png"
              alt="Deera Studio"
              width={96}
              height={96}
              className="mb-4 h-24 w-24 rounded-2xl"
            />
            <p className="mt-2 text-sm text-text-muted">
              Masuk pakai akun Deera yang sama (admin.deera.id).
            </p>
          </div>
          <form onSubmit={handleSubmit} className="relative flex flex-col gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <div className="flex items-stretch">
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="denny"
                  className="rounded-r-none border-r-0"
                  required
                />
                <span className="flex items-center whitespace-nowrap rounded-r-md border border-l-0 border-border-strong bg-surface-2 px-3 text-sm text-text-faint">
                  @deera.id
                </span>
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <FieldError>{error}</FieldError>}
            <Button type="submit" loading={loading} className="mt-2 w-full">
              Masuk
            </Button>
          </form>
        </div>
      </div>
    </KineticGrid>
  );
}
