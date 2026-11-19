import { useToastStore } from "@deera/shared/features/toast/hooks";
import { cn } from "../lib/utils";

const STYLES = {
  success: "border-success/40 text-success",
  error: "border-danger/40 text-danger",
  warn: "border-gold/40 text-gold",
};

const ICONS = { success: "✓", error: "✕", warn: "!" };

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  if (!toasts.length) return null;

  return (
    <div className="fixed right-4 top-4 z-[70] flex w-full max-w-xs flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          onClick={() => remove(t.id)}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-lg border bg-surface/90 backdrop-blur-sm px-3 py-3 shadow-xl",
            STYLES[t.type],
          )}
        >
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-sm font-bold leading-none">
            {ICONS[t.type]}
          </span>
          <p className="flex-1 text-sm font-medium leading-snug text-text">{t.msg}</p>
        </div>
      ))}
    </div>
  );
}
