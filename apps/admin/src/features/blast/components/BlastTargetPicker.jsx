/**
 * BlastTargetPicker.jsx — Step 2 BlastCreateModal: pilih target blast, dari
 * DUA sumber (permintaan Denny 2026-10): pelanggan existing (sudah pernah
 * transaksi, tabel `pelanggan`) ATAU calon customer (prospek, tabel
 * `calon_customer`, fitur ../../calon-customer). Tab switcher + search +
 * multi-select per tab, pilihan dari kedua tab TETAP akumulasi (tidak
 * hilang saat pindah tab) karena selection disimpan di parent
 * (BlastCreateModal) sebagai satu Map key unik `${source}:${id}`.
 *
 * "+ Tambah Calon Customer" membuka CalonCustomerFormModal langsung di sini
 * supaya admin tidak perlu keluar alur blast kalau nomor yang mau ditarget
 * belum ada di database — begitu tersimpan, kontak baru otomatis dicentang.
 */
import { useMemo, useState } from "react";
import { usePelangganList } from "../../pelanggan";
import { useCalonCustomerListQuery } from "../../calon-customer";
import CalonCustomerFormModal from "../../calon-customer/components/CalonCustomerFormModal";

export default function BlastTargetPicker({ selected, onToggle, onSelectMany }) {
  const [tab, setTab] = useState("pelanggan"); // "pelanggan" | "calon"
  const [search, setSearch] = useState("");
  const [addingCalon, setAddingCalon] = useState(false);

  const { pelanggan: pelangganList = [] } = usePelangganList();
  const { data: calonList = [] } = useCalonCustomerListQuery();

  const list = tab === "pelanggan" ? pelangganList : calonList;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) => c.nama.toLowerCase().includes(q) || (c.no_hp ?? "").toLowerCase().includes(q),
    );
  }, [list, search]);

  function keyFor(c) {
    return `${tab}:${c.id}`;
  }

  function selectAllVisible() {
    onSelectMany(
      filtered.map((c) => ({
        key: keyFor(c),
        source: tab,
        contactId: c.id,
        nama: c.nama,
        noHp: c.no_hp,
      })),
    );
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((c) => selected.has(keyFor(c)));

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 flex-shrink-0 flex gap-2 border-b border-skin-bdr-lt">
        {[
          { key: "pelanggan", label: "Pelanggan" },
          { key: "calon", label: "Calon Customer" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-editorial tracking-[0.1em] uppercase border-b-2 transition ${
              tab === t.key
                ? "border-[#CAB170] text-[#CAB170]"
                : "border-transparent text-skin-text3 hover:text-skin-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-3 pb-2 space-y-2 flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau no HP..."
          className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-skin-text3 font-editorial">{selected.size} total target dipilih</p>
          <div className="flex gap-3">
            {tab === "calon" && (
              <button
                type="button"
                onClick={() => setAddingCalon(true)}
                className="text-xs font-editorial tracking-[0.08em] uppercase text-[#CAB170] hover:text-[#A8925A] underline"
              >
                + Tambah
              </button>
            )}
            <button
              type="button"
              onClick={selectAllVisible}
              disabled={allVisibleSelected}
              className="text-xs font-editorial tracking-[0.08em] uppercase text-[#CAB170] hover:text-[#A8925A] underline disabled:opacity-40 disabled:no-underline"
            >
              Pilih Semua
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-skin-bdr-lt">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-skin-text4 py-12">
            {tab === "pelanggan" ? "Tidak ada pelanggan cocok" : "Belum ada calon customer"}
          </p>
        )}
        {filtered.map((c) => {
          const k = keyFor(c);
          const isSelected = selected.has(k);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() =>
                onToggle({ key: k, source: tab, contactId: c.id, nama: c.nama, noHp: c.no_hp })
              }
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                isSelected ? "bg-[#CAB170]/10" : "hover:bg-skin-page"
              }`}
            >
              <span
                className={`flex-shrink-0 w-5 h-5 border-2 flex items-center justify-center text-xs font-bold ${
                  isSelected
                    ? "bg-[#CAB170] border-[#CAB170] text-white"
                    : "border-skin-bdr text-transparent"
                }`}
              >
                ✓
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-skin-text truncate">{c.nama}</span>
                <span className="block text-xs text-skin-text3 truncate">{c.no_hp || "- no HP -"}</span>
              </span>
            </button>
          );
        })}
      </div>

      {addingCalon && (
        <CalonCustomerFormModal
          onClose={() => setAddingCalon(false)}
          onSaved={(row) => {
            onToggle({ key: `calon:${row.id}`, source: "calon", contactId: row.id, nama: row.nama, noHp: row.no_hp });
          }}
        />
      )}
    </div>
  );
}
