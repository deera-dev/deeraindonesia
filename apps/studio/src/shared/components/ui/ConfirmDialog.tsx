import { createRoot } from "react-dom/client";
import { Button } from "./Button";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
}

function ConfirmModal({
  options,
  onResolve,
}: {
  options: ConfirmOptions;
  onResolve: (ok: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="absolute inset-0" onClick={() => onResolve(false)} />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-xl">
        <p className="font-display text-base text-text">{options.title}</p>
        {options.description && (
          <p className="mt-2 text-sm text-text-muted">{options.description}</p>
        )}
        <div className="mt-5 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onResolve(false)}>
            Batal
          </Button>
          <Button
            variant={options.danger ? "danger" : "primary"}
            size="sm"
            className="flex-1"
            onClick={() => onResolve(true)}
          >
            {options.confirmLabel ?? "Konfirmasi"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    function cleanup(ok: boolean) {
      root.unmount();
      host.remove();
      resolve(ok);
    }
    root.render(<ConfirmModal options={options} onResolve={cleanup} />);
  });
}
