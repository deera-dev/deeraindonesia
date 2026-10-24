import { useMemo, useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import ScanKartuModal from "@deera/shared/components/ScanKartuModal";
import ProduksiLayout from "../../../shared/components/ProduksiLayout";
import {
  useJahitCards,
  useKaryawanJahit,
  useLookupJahitCard,
  useMarkCardDone,
  useMarkCardsDone,
  useReceiveCard,
  useUnassignCard,
} from "../hooks";
import { STATUS_COLUMNS, filterCards, groupByStatus, parseJahitQr } from "../utils";
import JahitColumn from "./JahitColumn";
import ReceiveCardModal from "./ReceiveCardModal";
import JahitDoneSection from "./JahitDoneSection";
import PrintKartuModal from "./PrintKartuModal";
import PrintKartuBatchModal from "./PrintKartuBatchModal";
import ConfirmGroupDoneModal from "./ConfirmGroupDoneModal";

export default function ProduksiJahitPage() {
  const { cards, loading } = useJahitCards();
  const { karyawanList } = useKaryawanJahit();
  const { lookup } = useLookupJahitCard();
  const { receive, receiving } = useReceiveCard();
  const unassignCard = useUnassignCard();
  const markCardDone = useMarkCardDone();
  const { markCardsDone, marking } = useMarkCardsDone();

  const [search, setSearch] = useState("");
  const [printTarget, setPrintTarget] = useState(null);
  const [printGroupTarget, setPrintGroupTarget] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState(null);
  const [groupDoneTarget, setGroupDoneTarget] = useState(null);
  const [activeStatus, setActiveStatus] = useState(STATUS_COLUMNS[0].key);

  const groups = useMemo(() => groupByStatus(filterCards(cards, search)), [cards, search]);

  async function handleScanResult(text) {
    setScannerOpen(false);
    const cardId = parseJahitQr(text);
    if (!cardId) {
      toast.error("QR tidak dikenali — bukan barcode kartu jahit.");
      return;
    }
    try {
      const card = await lookup(cardId);
      if (!card) {
        toast.error("Kartu tidak ditemukan.");
        return;
      }
      setReceiveTarget(card);
    } catch (err) {
      toast.error("Gagal ambil data kartu: " + err.message);
    }
  }

  async function handleReceiveConfirm({ cardId, karyawanId, karyawanNama, qty }) {
    try {
      await receive({
        cardId,
        karyawanId,
        karyawanNama,
        qty,
        kode: receiveTarget?.kode_produk,
        nama: receiveTarget?.nama_produk,
      });
      toast.success(`Kartu diterima dari ${karyawanNama}.`);
      setReceiveTarget(null);
    } catch (err) {
      toast.error("Gagal terima setoran: " + err.message);
    }
  }

  async function handleUnassign(card) {
    try {
      await unassignCard({ cardId: card.id, kode: card.kode_produk, nama: card.nama_produk });
    } catch (err) {
      toast.error("Gagal batalkan terima: " + err.message);
    }
  }

  async function handleMarkDone(card) {
    try {
      await markCardDone({ cardId: card.id, kode: card.kode_produk, nama: card.nama_produk });
      toast.success(`${card.kode_produk} ditandai selesai.`);
    } catch (err) {
      toast.error("Gagal tandai selesai: " + err.message);
    }
  }

  async function handleGroupDone() {
    const group = groupDoneTarget;
    try {
      await markCardsDone({ cardIds: group.cards.map((c) => c.id), kode: group.kode, nama: group.nama });
      toast.success(`${group.kode}: ${group.cards.length} kartu ditandai selesai.`);
      setGroupDoneTarget(null);
    } catch (err) {
      toast.error("Gagal tandai selesai: " + err.message);
    }
  }

  const cardHandlers = {
    onUnassign: handleUnassign,
    onMarkDone: handleMarkDone,
    onPrint: setPrintTarget,
    onReceive: setReceiveTarget,
  };

  return (
    <ProduksiLayout title="Kanban Jahit">
      <div className="">
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="w-full mb-4 py-3 text-sm font-editorial tracking-[0.15em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition"
        >
          📷 Scan & Terima Setoran
        </button>

        {!loading && cards.length > 0 && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode, nama, warna, penjahit..."
            className="w-full mb-4 h-11 bg-skin-card border-2 border-skin-bdr px-4 text-base text-skin-text focus:outline-none focus:border-skin-accent transition font-editorial placeholder:text-skin-text4"
          />
        )}

        {loading ? (
          <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
        ) : cards.length === 0 ? (
          <p className="text-sm text-skin-text3 text-center py-8">
            Belum ada kartu Jahit. Kartu terbuat otomatis saat batch produksi baru dibuat.
          </p>
        ) : (
          <>
            <div className="flex md:hidden border-b border-skin-bdr-lt mb-3">
              {STATUS_COLUMNS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveStatus(key)}
                  className={`flex-1 min-w-0 py-2.5 text-center font-editorial text-[10px] tracking-[0.1em] uppercase transition border-b-2 truncate ${
                    activeStatus === key
                      ? "border-skin-accent text-skin-accent-text"
                      : "border-transparent text-skin-text3 hover:text-skin-text"
                  }`}
                >
                  {label} <span className="text-skin-text4">({groups[key]?.length ?? 0})</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-start">
              {STATUS_COLUMNS.map(({ key, label }) => (
                <JahitColumn
                  key={key}
                  label={label}
                  cards={groups[key]}
                  active={activeStatus === key}
                  onPrintGroup={setPrintGroupTarget}
                  onMarkGroupDone={key === "belum_diterima" ? setGroupDoneTarget : undefined}
                  {...cardHandlers}
                />
              ))}
            </div>
          </>
        )}

        <JahitDoneSection onPrint={setPrintTarget} onPrintGroup={setPrintGroupTarget} />
      </div>

      {scannerOpen && <ScanKartuModal onDetect={handleScanResult} onClose={() => setScannerOpen(false)} />}

      {receiveTarget && (
        <ReceiveCardModal
          card={receiveTarget}
          karyawanList={karyawanList}
          receiving={receiving}
          onConfirm={handleReceiveConfirm}
          onClose={() => setReceiveTarget(null)}
        />
      )}

      {groupDoneTarget && (
        <ConfirmGroupDoneModal
          group={groupDoneTarget}
          busy={marking}
          onConfirm={handleGroupDone}
          onClose={() => setGroupDoneTarget(null)}
        />
      )}

      {printTarget && <PrintKartuModal card={printTarget} onClose={() => setPrintTarget(null)} />}

      {printGroupTarget && (
        <PrintKartuBatchModal cards={printGroupTarget} onClose={() => setPrintGroupTarget(null)} />
      )}
    </ProduksiLayout>
  );
}
