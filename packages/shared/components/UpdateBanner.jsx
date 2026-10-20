import { useUpdateAvailable } from "../features/app-version/hooks";

export default function UpdateBanner() {
  const { isUpdateAvailable } = useUpdateAvailable();

  if (!isUpdateAvailable) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[90] flex items-center justify-center gap-3 bg-skin-accent px-4 py-2.5 text-skin-on-accent shadow-lg">
      <p className="text-sm font-medium">Versi baru tersedia.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex-shrink-0 bg-skin-on-accent px-3 py-1 text-sm font-semibold text-skin-accent"
      >
        Muat Ulang
      </button>
    </div>
  );
}
