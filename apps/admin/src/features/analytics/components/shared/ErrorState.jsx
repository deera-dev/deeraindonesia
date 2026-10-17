export default function ErrorState({ message = "Gagal memuat data.", onRetry }) {
  return (
    <div className="border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-6 text-center">
      <p className="text-sm text-red-600 dark:text-red-400 mb-3 break-words">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-1.5 text-xs font-editorial tracking-[0.12em] uppercase border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
}
