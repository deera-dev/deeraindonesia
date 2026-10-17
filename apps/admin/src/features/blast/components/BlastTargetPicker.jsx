import { useMemo, useState } from "react";
import { usePelangganList } from "../../pelanggan";
import { useTokoListQuery, distinctDaerahList } from "../../ngorder/hooks";
import TokoFormModal from "../../ngorder/components/TokoFormModal";
import { useCalonCustomerListQuery } from "../../calon-customer";
import CalonCustomerFormModal from "../../calon-customer/components/CalonCustomerFormModal";

const SOURCE_EMPTY = {
  toko: "Belum ada toko Ngorder",
  pelanggan: "Tidak ada pelanggan cocok",
  calon: "Belum ada calon customer",
};

export default function BlastTargetPicker({ selected, onToggle, onSelectMany }) {
  const [tab, setTab] = useState("toko");
  const [addingToko, setAddingToko] = useState(false);
  const [belumSaja, setBelumSaja] = useState(false);
  const [search, setSearch] = useState("");
  const [addingCalon, setAddingCalon] = useState(false);

  const { pelanggan: pelangganList = [] } = usePelangganList();
  const { data: calonList = [] } = useCalonCustomerListQuery();
  const { data: tokoList = [] } = useTokoListQuery();
  const daerahOptions = useMemo(() => distinctDaerahList(tokoList), [tokoList]);

  const list = tab === "toko" ? tokoList : tab === "pelanggan" ? pelangganList : calonList;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((c) => {
      if (tab === "toko" && belumSaja && c.status_approach === "sudah") return false;
      if (!q) return true;
      return (
        c.nama.toLowerCase().includes(q) ||
        (c.no_hp ?? "").toLowerCase().includes(q) ||
        (tab === "toko" && (c.daerah ?? "").toLowerCase().includes(q))
      );
    });
  }, [list, search, tab, belumSaja]);

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
          { key: "toko", label: "Toko Ngorder" },
          { key: "pelanggan", label: "Pelanggan" },
          { key: "calon", label: "Calon Customer" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-editorial tracking-[0.1em] uppercase border-b-2 transition ${
              tab === t.key
                ? "border-skin-accent text-skin-accent-text"
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
          className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-skin-text3 font-editorial">{selected.size} total target dipilih</p>
          <div className="flex gap-3">
            {tab === "toko" && (
              <button
                type="button"
                onClick={() => setBelumSaja((v) => !v)}
                aria-pressed={belumSaja}
                className={`text-xs font-editorial tracking-[0.08em] uppercase underline ${
                  belumSaja ? "text-skin-accent-text font-bold" : "text-skin-text3"
                }`}
              >
                Belum di-approach
              </button>
            )}
            {(tab === "toko" || tab === "calon") && (
              <button
                type="button"
                onClick={() => (tab === "toko" ? setAddingToko(true) : setAddingCalon(true))}
                className="text-xs font-editorial tracking-[0.08em] uppercase text-skin-accent-text hover:text-skin-accent-text underline"
              >
                + Tambah
              </button>
            )}
            <button
              type="button"
              onClick={selectAllVisible}
              disabled={allVisibleSelected}
              className="text-xs font-editorial tracking-[0.08em] uppercase text-skin-accent-text hover:text-skin-accent-text underline disabled:opacity-40 disabled:no-underline"
            >
              Pilih Semua
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-skin-bdr-lt">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-skin-text4 py-12">
            {SOURCE_EMPTY[tab]}
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
                isSelected ? "bg-skin-accent/10" : "hover:bg-skin-page"
              }`}
            >
              <span
                className={`flex-shrink-0 w-5 h-5 border-2 flex items-center justify-center text-xs font-bold ${
                  isSelected
                    ? "bg-skin-accent border-skin-accent text-skin-on-accent"
                    : "border-skin-bdr text-transparent"
                }`}
              >
                ✓
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-skin-text truncate">{c.nama}</span>
                <span className="block text-xs text-skin-text3 truncate">
                  {c.no_hp || "- no HP -"}
                  {tab === "toko" && c.daerah ? ` · ${c.daerah}` : ""}
                </span>
              </span>
              {tab === "toko" && (
                <span
                  className={`flex-shrink-0 text-[10px] font-editorial uppercase tracking-wide px-1.5 py-0.5 border ${
                    c.status_approach === "sudah"
                      ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                      : "border-skin-bdr text-skin-text3"
                  }`}
                >
                  {c.status_approach === "sudah" ? "Sudah" : "Belum"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {addingToko && (
        <TokoFormModal
          daerahOptions={daerahOptions}
          onClose={() => setAddingToko(false)}
          onSaved={(row) => {
            onToggle({ key: `toko:${row.id}`, source: "toko", contactId: row.id, nama: row.nama, noHp: row.no_hp });
          }}
        />
      )}

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
