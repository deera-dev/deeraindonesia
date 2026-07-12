/**
 * shared/ErrorState.jsx — tampilan error + tombol "Coba Lagi" (Phase 5,
 * Dashboard Polish).
 *
 * SEBELUM Phase 5, `error` dari TanStack Query SUDAH diekspos oleh setiap
 * hook (`useAnalyticsOverview()` dkk mengembalikan `{ ..., error }` sejak
 * Phase 1) TAPI TIDAK PERNAH dibaca oleh komponen tab manapun — kalau RPC
 * gagal (network error, RLS, dsb), `data` tetap fallback ke struktur
 * kosong dan user melihat pesan "Belum ada data" yang SAMA PERSIS seperti
 * kondisi "memang tidak ada transaksi" — dua situasi yang sangat berbeda
 * ditampilkan identik, menyesatkan. Komponen ini mengisi gap tsb.
 *
 * `onRetry` seharusnya diisi dengan `refetch` dari hook (lihat hooks.js —
 * setiap hook Phase 5 menambah field `refetch`, pass-through dari
 * `useQuery().refetch`) — komponen ini TIDAK tahu apa pun soal TanStack
 * Query, murni memanggil callback yang diberikan.
 *
 * Tidak ada retry otomatis/loop di sini — retry HANYA terjadi lewat aksi
 * eksplisit user (klik tombol), supaya tidak diam-diam membombardir RPC
 * yang sedang gagal.
 */
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
