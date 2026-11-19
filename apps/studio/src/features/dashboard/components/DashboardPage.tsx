import { displayName, useAuth } from "@deera/shared/features/auth/hooks";
import { AppShell } from "../../../shared/components/AppShell";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="font-display text-2xl text-text">Deera Studio</p>
        <p className="mt-2 text-sm text-text-muted">Halo, {displayName(user)}.</p>
        <p className="mt-1 text-xs text-text-faint">
          Dashboard generate foto & konten masih dalam proses migrasi. Kelola referensi di Models,
          Poses, dan Presets.
        </p>
      </div>
    </AppShell>
  );
}
