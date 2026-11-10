import { useState } from "react";
import { searchPlacesText, fetchPlaceDetails } from "@deera/shared/lib/geocode";
import { toast } from "@deera/shared/features/toast/hooks";
import {
  isDuplicateToko,
  buildTokoPayloadFromPlace,
  isGoogleMapsLink,
  useCreateTokoMutation,
  useSetTokoLocationMutation,
  useResolveGoogleMapsLinkMutation,
} from "../hooks";

export default function PetaCariToko({ tokoList, center, onClose }) {
  const createToko = useCreateTokoMutation();
  const setLocation = useSetTokoLocationMutation();
  const resolveLink = useResolveGoogleMapsLinkMutation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState(() => new Set());
  const [linkError, setLinkError] = useState("");

  async function handleLinkSearch(link) {
    let resolved;
    try {
      resolved = await resolveLink.mutateAsync(link);
    } catch (err) {
      const msg = err.message ?? "Gagal membaca link Google Maps.";
      setLinkError(msg);
      toast.error(msg);
      setResults([]);
      return;
    }
    if (!resolved.nama) {
      const msg = "Nama toko tidak terbaca dari link ini, coba cari manual pakai nama toko.";
      setLinkError(msg);
      toast.error(msg);
      setResults([]);
      return;
    }
    const searchCenter = resolved.lat != null ? { lat: resolved.lat, lng: resolved.lng } : center;
    const found = await searchPlacesText(resolved.nama, { center: searchCenter });
    if (found.length > 0 || resolved.lat == null) {
      setResults(found);
      return;
    }
    setResults([
      {
        id: `gmaps-link-${resolved.lat}-${resolved.lng}`,
        nama: resolved.nama,
        alamat: "",
        lat: resolved.lat,
        lng: resolved.lng,
        place: null,
        fromLink: true,
        mapsUrl: resolved.mapsUrl,
      },
    ]);
  }

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 3 || searching) return;
    setSearching(true);
    setLinkError("");
    try {
      if (isGoogleMapsLink(q)) await handleLinkSearch(q);
      else setResults(await searchPlacesText(q, { center }));
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
      if (item.place) {
        try {
          details = await fetchPlaceDetails(item.place);
        } catch {
        }
      }
      const row = await createToko.mutateAsync(buildTokoPayloadFromPlace(item, details));
      await setLocation.mutateAsync({ id: row.id, lat: item.lat, lng: item.lng, source: item.fromLink ? "google-link" : "google" });
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
            placeholder="Mis. toko gamis Tegal, atau tempel link Google Maps"
            className="flex-1 min-w-0 bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition"
          />
          <button
            type="submit"
            disabled={query.trim().length < 3 || searching}
            className="px-4 py-2 text-xs font-editorial tracking-[0.05em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition disabled:opacity-40"
          >
            {searching ? "..." : "Cari"}
          </button>
        </form>

        {linkError && <p className="px-4 py-2 text-xs text-red-500 border-b border-skin-bdr-lt flex-shrink-0">{linkError}</p>}

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
                  <p className="text-xs text-skin-text3 line-clamp-2">
                    {r.alamat || (r.fromLink ? `${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}` : "")}
                  </p>
                  {r.fromLink && (
                    <p className="text-[11px] text-amber-600 mt-0.5">
                      Dari link - tidak ketemu di pencarian Google, alamat/no HP isi manual nanti
                      {r.mapsUrl && (
                        <>
                          {" · "}
                          <a href={r.mapsUrl} target="_blank" rel="noreferrer" className="underline">
                            Cek di Maps
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </div>
                {exists ? (
                  <span className="flex-shrink-0 text-xs text-skin-text4">{addedIds.has(r.id) ? "✓ Ditambah" : "Sudah ada"}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAdd(r)}
                    disabled={addingId != null}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-editorial tracking-[0.05em] uppercase border border-skin-accent text-skin-accent-text hover:bg-skin-accent hover:text-white transition disabled:opacity-40"
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
