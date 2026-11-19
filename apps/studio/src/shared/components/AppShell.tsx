import { displayName, signOut, useAuth } from "@deera/shared/features/auth/hooks";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard" },
  { to: "/models", label: "Models" },
  { to: "/poses", label: "Poses" },
  { to: "/presets", label: "Presets" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-40 border-b border-border bg-ink-2/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <span className="font-display text-sm text-gold-soft">Deera Studio</span>
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text",
                    pathname === item.to && "bg-white/[0.06] text-text",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-text-faint sm:inline">{displayName(user)}</span>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Keluar
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
