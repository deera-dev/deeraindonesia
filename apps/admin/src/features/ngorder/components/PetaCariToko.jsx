/**
 * PetaCariToko.jsx — cari toko/usaha di Google (Text Search New) lalu tambah
 * ke daftar toko sekali tap: nama, alamat, daerah, titik peta, + (autofill
 * on-demand) telepon, rating, jam buka, website masuk ke catatan.
 * Pencarian HANYA saat tombol Cari/Enter (bukan tiap ketikan) supaya hemat
 * kuota; hasil yg sudah tercatat ditandai "Sudah ada" (anti duplikat).
 */
import { useState } from "react";
import { searchPlacesText, fetchPlaceDetails } from "@deera/shared/lib/geocode";
import { toast } from "@deera/shared/features/toast/hooks";
import {
  isDuplicateToko,
  buildTokoPayloadFromPlace,
  useCreateTokoMutation,
  useSetTokoLocationMutation,
} from "../hooks";

export default function PetaCariToko({ tokoList, center, onClose }) {
  const createToko = useCreateTokoMutation();
  const setLocation = useSetTokoLocationMutation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // null = belum cari
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState(() => new Set());

  async function handleSearch(e) {
    e.preventDefault();
    if (query.trim().length < 3 || searching) return;
    setSearching(true);
    try {
      setResults(await searchPlacesText(query, { center }));
    } catch (err) {
      setResults([]);
      toast.error(
        err?.quotaExceeded ? err.message : 'Pencarian gagal - pastikan "Places API (New)" aktif di Google Cloud.',
      );
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(item) {
    setAddingId(item.id);
    try {
      let details = null;
      try {
        details = await fetchPlaceDetails(item.place);
      } catch {
        // kuota detail habis / gagal -> tetap tambah toko tanpa telp/rating/jam buka
      }
      const row = await createToko.mutateAsync(buildTokoPayloadFromPlace(item, details));
      await setLocation.mutateAsync({ id: row.id, lat: item.lat, lng: item.lng, source: "google" });
      setAddedIds((prev) => new Set(prev).add(item.id));
      toast.success(`"${item.nama}" ditambahkan.`);
    } catch (err) {
      toast.error(err.message ?? "Gagal menambah toko.");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text">Cari Toko di Google</h2>
          <button type="button" onClick={onClose} className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8">
            ×
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 p-4 border-b border-skin-bdr-lt flex-shrink-0">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mis. toko gamis Tegal"
            className="flex-1 min-w-0 bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
          />
          <button
            type="submit"
            disabled={query.trim().length < 3 || searching}
            className="px-4 py-2 text-xs font-editorial tracking-[0.05em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-40"
          >
            {searching ? "..." : "Cari"}
          </button>
        </form>

        <div className="flex-1 overflow-y-auto divide-y divide-skin-bdr-lt">
          {results && results.length === 0 && (
            <p className="text-sm text-skin-text4 py-8 text-center">Tidak ada hasil.</p>
          )}
          {(results ?? []).map((r) => {
            const exists = addedIds.has(r.id) || isDuplicateToko(r, tokoList);
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-skin-text truncate">{r.nama}</p>
                  <p className="text-xs text-skin-text3 line-clamp-2">{r.alamat}</p>
                </div>
                {exists ? (
                  <span className="flex-shrink-0 text-xs text-skin-text4">{addedIds.has(r.id) ? "✓ Ditambah" : "Sudah ada"}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAdd(r)}
                    disabled={addingId != null}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-editorial tracking-[0.05em] uppercase border border-[#CAB170] text-[#CAB170] hover:bg-[#CAB170] hover:text-white transition disabled:opacity-40"
                  >
                    {addingId === r.id ? "..." : "Tambah"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
