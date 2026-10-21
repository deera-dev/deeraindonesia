import { useKunjunganTokoQuery, KUNJUNGAN_STATUS_LABEL, KESAN_LABEL } from "../hooks";

function fmtWaktu(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function KunjunganRiwayat({ tokoId }) {
  const { data: rows = [], isLoading } = useKunjunganTokoQuery(tokoId);

  if (isLoading) return <p className="text-sm text-skin-text4 py-8 text-center">Memuat...</p>;
  if (!rows.length) {
    return (
      <p className="text-sm text-skin-text4 py-8 text-center px-4">
        Belum ada catatan kunjungan. Catatan diisi dari Rencana Kunjungan di peta.
      </p>
    );
  }

  return (
    <div className="divide-y divide-skin-bdr-lt">
      {rows.map((r) => (
        <div key={r.id} className="px-4 py-3 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-skin-text">
              {KUNJUNGAN_STATUS_LABEL[r.status] ?? r.status}
              {r.kesan ? ` · ${KESAN_LABEL[r.kesan] ?? r.kesan}` : ""}
            </span>
            <span className="text-[11px] text-skin-text4">{fmtWaktu(r.selesai_at ?? r.mulai_at ?? r.created_at)}</span>
          </div>
          {r.hasil && <p className="text-sm text-skin-text2 whitespace-pre-line">{r.hasil}</p>}
          {r.request && (
            <p className="text-sm text-skin-text2 whitespace-pre-line">
              <span className="font-semibold">Request:</span> {r.request}
            </p>
          )}
          {(r.diubah_oleh_nama || r.dipilih_oleh_nama) && (
            <p className="text-[11px] text-skin-text4">oleh {r.diubah_oleh_nama ?? r.dipilih_oleh_nama}</p>
          )}
        </div>
      ))}
    </div>
  );
}
