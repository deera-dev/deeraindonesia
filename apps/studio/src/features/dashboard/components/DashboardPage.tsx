import { displayName, signOut, useAuth } from "@deera/shared/features/auth/hooks";
import { Button } from "../../../shared/components/ui/Button";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <p className="font-display text-2xl text-text">Deera Studio</p>
        <p className="mt-2 text-sm text-text-muted">Halo, {displayName(user)}.</p>
        <p className="mt-1 text-xs text-text-faint">
          Dashboard generate foto & konten masih dalam proses migrasi.
        </p>
      </div>
      <Button variant="outline" onClick={() => signOut()}>
        Keluar
      </Button>
    </main>
  );
}
