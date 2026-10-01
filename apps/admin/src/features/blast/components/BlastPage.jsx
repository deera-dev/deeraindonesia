/**
 * BlastPage.jsx — Halaman utama fitur Blast: riwayat campaign (nama,
 * jumlah produk, progress kirim) + tombol "Buat Blast Baru". Klik satu
 * campaign membuka BlastCampaignDetail untuk lanjut kirim/lihat status.
 */
import { useState } from "react";
import {
  useCampaignsQuery,
  useTargetCountsQuery,
  useCampaignDetailQuery,
  useDeleteCampaignMutation,
} from "../hooks";
import BlastCreateModal from "./BlastCreateModal";
import BlastCampaignDetail from "./BlastCampaignDetail";

const STATUS_LABEL = { draft: "Draft", berjalan: "Berjalan", selesai: "Selesai" };

export default function BlastPage() {
  const { data: campaigns = [], isLoading } = useCampaignsQuery();
  const { data: counts = {} } = useTargetCountsQuery();
  const deleteMutation = useDeleteCampaignMutation();
  const [creating, setCreating] = useState(false);
  const [openCampaignId, setOpenCampaignId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data: detail } = useCampaignDetailQuery(openCampaignId);

  return (
    <div className="min-h-screen bg-skin-page pb-24">
      <div className="px-4 pt-6 pb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl text-skin-text">Blast</h1>
          <p className="text-sm text-skin-text3 mt-1">
            Tawarkan produk ke pelanggan atau calon customer lewat WhatsApp.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="px-4 py-2.5 font-editorial text-sm tracking-[0.1em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition whitespace-nowrap flex-shrink-0"
        >
          + Blast Baru
        </button>
      </div>

      <div className="px-4 space-y-3">
        {isLoading && <p className="text-sm text-skin-text4 py-8 text-center">Memuat...</p>}
        {!isLoading && campaigns.length === 0 && (
          <p className="text-sm text-skin-text4 py-8 text-center">
            Belum ada blast. Buat lewat tombol "+ Blast Baru".
          </p>
        )}

        <div className="divide-y divide-skin-bdr-lt border border-skin-bdr-lt bg-skin-card">
          {campaigns.map((c) => {
            const cnt = counts[c.id] ?? { total: 0, terkirim: 0, dilewati: 0 };
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setOpenCampaignId(c.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-skin-page transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-skin-text truncate">{c.nama}</p>
                  <p className="text-xs text-skin-text3 mt-0.5">
                    {(c.product_kodes ?? []).length} produk · {cnt.terkirim}/{cnt.total} terkirim
                  </p>
                </div>
                <span className="text-[11px] font-editorial tracking-[0.08em] uppercase text-skin-text3 flex-shrink-0">
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(c);
                  }}
                  role="button"
                  tabIndex={-1}
                  className="text-xs text-skin-text3 hover:text-red-500 underline flex-shrink-0"
                >
                  Hapus
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {creating && (
        <BlastCreateModal
          onClose={() => setCreating(false)}
          onCreated={(campaign) => {
            setCreating(false);
            setOpenCampaignId(campaign.id);
          }}
        />
      )}

      {openCampaignId && detail?.campaign && (
        <BlastCampaignDetail
          campaign={detail.campaign}
          targets={detail.targets}
          onClose={() => setOpenCampaignId(null)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-skin-card border-2 border-skin-bdr max-w-sm w-full p-5">
            <p className="text-sm text-skin-text">
              Hapus blast <strong>{confirmDelete.nama}</strong> beserta seluruh riwayat targetnya?
            </p>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 font-editorial text-xs tracking-[0.15em] uppercase border-2 border-skin-bdr text-skin-text2"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteMutation.mutateAsync(confirmDelete.id);
                  setConfirmDelete(null);
                }}
                className="flex-1 py-2.5 font-editorial text-xs tracking-[0.15em] uppercase text-white bg-red-500 hover:bg-red-600"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
