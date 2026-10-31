import { toast } from "@deera/shared/features/toast/hooks";
import { useDeleteTokoMutation } from "../hooks";
import KunjunganModal from "./KunjunganModal";
import TokoDetailModal from "./TokoDetailModal";
import TokoFormModal from "./TokoFormModal";

export default function NgorderModals({ modal, setModal, tokoById, daerahOptions, rencana }) {
  const deleteMutation = useDeleteTokoMutation();
  if (!modal) return null;
  const close = () => setModal(null);

  if (modal.type === "form") {
    return (
      <TokoFormModal
        initial={modal.toko}
        daerahOptions={daerahOptions}
        onClose={close}
        onSaved={close}
      />
    );
  }

  if (modal.type === "detail") {
    const toko = tokoById.get(modal.toko.id) ?? modal.toko;
    return (
      <TokoDetailModal
        toko={toko}
        onClose={close}
        onEdit={(t) => setModal({ type: "form", toko: t })}
        onDelete={(t) => setModal({ type: "delete", toko: t })}
      />
    );
  }

  if (modal.type === "feedback") {
    const row = rencana.rows.find((r) => r.id === modal.row.id) ?? modal.row;
    const toko = tokoById.get(row.toko_id);
    if (!toko) return null;
    return (
      <KunjunganModal
        row={row}
        toko={toko}
        onSave={rencana.updateKunjungan}
        saving={rencana.isUpdating}
        onClose={close}
      />
    );
  }

  if (modal.type === "delete") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="bg-skin-card border-2 border-skin-bdr max-w-sm w-full p-5">
          <p className="text-sm text-skin-text">
            Hapus toko <strong>{modal.toko.nama}</strong> beserta seluruh riwayat sampel &
            kunjungannya?
          </p>
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={close}
              className="flex-1 py-2.5 font-editorial text-xs tracking-[0.15em] uppercase border-2 border-skin-bdr text-skin-text2"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                try {
                  await deleteMutation.mutateAsync(modal.toko.id);
                  close();
                } catch (err) {
                  toast.error(err?.message ?? "Gagal menghapus toko.");
                }
              }}
              className="flex-1 py-2.5 font-editorial text-xs tracking-[0.15em] uppercase text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
