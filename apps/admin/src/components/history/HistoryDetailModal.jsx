/**
 * HistoryDetailModal.jsx — Modal detail & diff untuk satu entri riwayat.
 */
import { getMeta } from "./historyUtils";
import { ProdukDiff, TransferDiff, StokDiff } from "./HistoryDiffs";

// ── Helper row ────────────────────────────────────────────────────────────────
function Row({ label, value }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-skin-text3 shrink-0 w-32">{label}</span>
      <span className="text-skin-text">{value ?? "—"}</span>
    </div>
  );
}

// ── Before/After diff row (untuk field yang berubah) ─────────────────────────
function DiffRow({ label, before, after }) {
  const changed = before !== after;
  if (!changed && !before && !after) return null;
  return (
    <div className="text-sm space-y-0.5">
      <p className="text-xs text-skin-text3 uppercase tracking-wide font-editorial">{label}</p>
      {changed && before != null && (
        <p className="text-red-400 line-through pl-2">{before || "—"}</p>
      )}
      <p className={changed ? "text-emerald-500 pl-2" : "text-skin-text pl-2"}>
        {after || "—"}
      </p>
    </div>
  );
}

// ── Pelanggan detail ──────────────────────────────────────────────────────────
function PelangganDetail({ action, data, before }) {
  if (!data) return <p className="text-sm text-skin-text3">Tidak ada data.</p>;

  if (action === "pelanggan-edit" && before) {
    const fields = [
      { label: "Nama",    k: "nama"   },
      { label: "No HP",   k: "no_hp"  },
      { label: "Alamat",  k: "alamat" },
    ];
    const hasChanges = fields.some((f) => before[f.k] !== data[f.k]);
    return (
      <div className="space-y-3">
        {hasChanges ? (
          fields.map((f) => (
            <DiffRow key={f.k} label={f.label} before={before[f.k]} after={data[f.k]} />
          ))
        ) : (
          fields.map((f) => <Row key={f.k} label={f.label} value={data[f.k]} />)
        )}
      </div>
    );
  }

  // tambah atau hapus
  return (
    <div className="space-y-3">
      <Row label="Nama"   value={data.nama}   />
      <Row label="No HP"  value={data.no_hp}  />
      <Row label="Alamat" value={data.alamat} />
    </div>
  );
}

// ── Sampel detail ─────────────────────────────────────────────────────────────
function SampelDetail({ action, data, before }) {
  if (!data) return <p className="text-sm text-skin-text3">Tidak ada data.</p>;

  if (action === "sampel-approve") {
    return (
      <div className="space-y-3">
        <Row label="Status" value="Approved ✓" />
        {data.perubahan ? (
          <div>
            <p className="text-xs text-skin-text3 uppercase tracking-wide mb-1 font-editorial">
              Catatan Perubahan
            </p>
            <p className="text-sm text-amber-500 bg-amber-500/5 border border-amber-500/20 px-3 py-2 whitespace-pre-wrap">
              {data.perubahan}
            </p>
          </div>
        ) : (
          <Row label="Hasil" value="Sesuai referensi sampel" />
        )}
      </div>
    );
  }

  if (action === "sampel-reject") {
    return (
      <div className="space-y-3">
        <Row label="Status" value="Ditolak ✗" />
        {data.rejection_note && (
          <div>
            <p className="text-xs text-skin-text3 uppercase tracking-wide mb-1 font-editorial">
              Alasan Penolakan
            </p>
            <p className="text-sm text-red-400 bg-red-500/5 border border-red-500/20 px-3 py-2 whitespace-pre-wrap">
              {data.rejection_note}
            </p>
          </div>
        )}
      </div>
    );
  }

  // sampel-buat / sampel-edit
  if (action === "sampel-edit" && before) {
    return (
      <div className="space-y-3">
        <DiffRow label="Nama"    before={before.nama}    after={data.nama}    />
        <DiffRow label="Tanggal" before={before.tanggal} after={data.tanggal} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.nomor   && <Row label="Nomor"   value={data.nomor}   />}
      {data.tanggal && <Row label="Tanggal" value={data.tanggal} />}
      {data.status  && <Row label="Status"  value={data.status}  />}
    </div>
  );
}

// ── Produksi detail view ──────────────────────────────────────────────────────
function ProduksiDetail({ action, data, before }) {
  if (action?.startsWith("sampel-")) {
    return <SampelDetail action={action} data={data} before={before} />;
  }

  if (!data) return <p className="text-sm text-skin-text3">Tidak ada data.</p>;

  if (action === "batch-produksi") {
    return (
      <div className="space-y-3">
        <Row label="Batch No"    value={data.batch_no}  />
        <Row label="Tanggal"     value={data.tanggal}   />
        <Row label="Total Kain"  value={data.total_kain ? data.total_kain + " pcs" : "—"} />
        {data.catatan && <Row label="Catatan" value={data.catatan} />}
        {Array.isArray(data.sizes) && data.sizes.length > 0 && (
          <div>
            <p className="text-xs text-skin-text3 uppercase tracking-wide mb-1">Ukuran & Warna</p>
            {data.sizes.map((sz, i) => (
              <div key={i} className="text-sm text-skin-text mb-0.5">
                <span className="font-semibold">{sz.size}</span>
                {Array.isArray(sz.warna) && sz.warna.length > 0 && (
                  <span className="text-skin-text2">
                    {" · "}
                    {sz.warna.map((w) => w.warna + " (" + w.qty + ")").join(", ")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (action === "hpp-simpan") {
    return (
      <div className="space-y-3">
        <Row label="Total HPP" value={data.total_hpp != null ? "Rp " + Number(data.total_hpp).toLocaleString("id-ID") : "—"} />
        {before?.total_hpp != null && (
          <Row label="HPP Sebelumnya" value={"Rp " + Number(before.total_hpp).toLocaleString("id-ID")} />
        )}
        {Array.isArray(data.bahan_items) && data.bahan_items.length > 0 && (
          <div>
            <p className="text-xs text-skin-text3 uppercase tracking-wide mb-1">Item Bahan</p>
            {data.bahan_items.map((b, i) => (
              <div key={i} className="text-sm text-skin-text mb-0.5">
                {b.nama_bahan} — {b.qty_per_baju} {b.satuan}/baju
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (action === "hpp-hapus") {
    return (
      <div className="space-y-3">
        <Row label="HPP Dihapus" value={data.total_hpp != null ? "Rp " + Number(data.total_hpp).toLocaleString("id-ID") : "—"} />
      </div>
    );
  }

  if (action === "bahan-beli" || action === "bahan-pinjam") {
    if (data.bulk != null) return <Row label="Jumlah Item" value={data.bulk + " baris (bulk)"} />;
    return (
      <div className="space-y-3">
        {data.nama_bahan    && <Row label="Nama Bahan" value={data.nama_bahan} />}
        {data.kode_bahan    && <Row label="Kode Bahan" value={data.kode_bahan} />}
        {data.qty    != null && <Row label="Qty"       value={data.qty + " " + (data.satuan ?? "")} />}
        {data.total_harga != null && <Row label="Total" value={"Rp " + Number(data.total_harga).toLocaleString("id-ID")} />}
        {data.nama_supplier && <Row label="Supplier"   value={data.nama_supplier} />}
        {data.nama_pemberi  && <Row label="Pemberi"    value={data.nama_pemberi}  />}
        {data.tanggal       && <Row label="Tanggal"    value={data.tanggal}       />}
      </div>
    );
  }

  if (action === "bahan-hapus") {
    return (
      <div className="space-y-3">
        {data.nama_bahan    && <Row label="Nama Bahan" value={data.nama_bahan} />}
        {data.kode_bahan    && <Row label="Kode Bahan" value={data.kode_bahan} />}
        {data.qty    != null && <Row label="Qty"       value={data.qty + " " + (data.satuan ?? "")} />}
        {data.total_harga != null && <Row label="Total" value={"Rp " + Number(data.total_harga).toLocaleString("id-ID")} />}
        {data.sumber        && <Row label="Dari"       value={data.sumber} />}
      </div>
    );
  }

  return (
    <pre className="text-xs text-skin-text2 whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function HistoryDetailModal({ item, onClose }) {
  if (!item) return null;
  const meta = getMeta(item.action);
  const isPelanggan = item.action?.startsWith("pelanggan-");

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg mx-auto border-t-2 md:border-2 border-skin-bdr shadow-xl flex flex-col max-h-[85dvh] md:max-h-[80dvh]">
        {/* Top color stripe */}
        <div className="flex-shrink-0 h-1" style={{ backgroundColor: meta.color }} />

        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-skin-bdr">
          <div>
            <span
              className={`inline-block px-2 py-0.5 text-[10px] tracking-[0.12em] uppercase border font-editorial ${meta.badgeCls}`}
            >
              {meta.label}
            </span>
            {isPelanggan ? (
              <>
                <p className="mt-2 font-headline text-[#CAB170] text-xl leading-none">
                  {item.nama || item.snapshot?.nama || "—"}
                </p>
                <p className="mt-0.5 font-editorial text-sm text-skin-text2">
                  {[item.snapshot?.no_hp, item.snapshot?.alamat].filter(Boolean).join(" · ") || "—"}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 font-headline text-[#CAB170] text-xl leading-none">{item.kode}</p>
                <p className="mt-0.5 font-editorial text-sm text-skin-text2">
                  {item.nama || item.snapshot?.nama || "—"}
                </p>
              </>
            )}
            <p className="mt-1.5 font-editorial text-xs text-skin-text3">
              {new Date(item.changed_at).toLocaleString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {item.user_name && <span className="ml-2 text-skin-text2">· {item.user_name}</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-skin-text3 hover:text-red-500 transition text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-5">
          {isPelanggan && (
            <PelangganDetail
              action={item.action}
              data={item.snapshot}
              before={item.before_snapshot}
            />
          )}
          {!isPelanggan && (item.category === "produk" || !item.category) && (
            <ProdukDiff before={item.before_snapshot} after={item.snapshot} />
          )}
          {!isPelanggan && item.category === "transfer" && (
            <TransferDiff
              before={item.before_snapshot}
              after={item.snapshot}
              action={item.action}
            />
          )}
          {!isPelanggan && item.category === "stok" && (
            <StokDiff before={item.before_snapshot} after={item.snapshot} />
          )}
          {!isPelanggan && item.category === "produksi" && (
            <ProduksiDetail
              action={item.action}
              data={item.snapshot}
              before={item.before_snapshot}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-skin-bdr">
          <button
            onClick={onClose}
            className="w-full py-4 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text2 hover:text-[#CAB170] hover:bg-skin-gold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
