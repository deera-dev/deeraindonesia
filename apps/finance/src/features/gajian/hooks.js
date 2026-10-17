import { useCallback, useMemo, useRef } from "react";
import { useRingkasanDraftStore } from "./store";
import { useApplyKasbonDeduction, useKasbonBelumLunasByKaryawanIds } from "../kasbon/hooks";
import { useFinanceConfig } from "../pengaturan/hooks";
import { usePettycashAll, useSavePettycash } from "../pettycash/hooks";
import {
  useApplyFinishingStockIntakeMutation,
  useCmtQuery,
  useCreateGajianPeriodeMutation,
  useDeleteCmtMutation,
  useDeleteFinishingMutation,
  useDeleteGajianPeriodeMutation,
  useDeleteJahitMutation,
  useDeleteKreatifMutation,
  useDeletePotongMutation,
  useDeleteQCMutation,
  useFinalizeGajianMutation,
  useFinishingQuery,
  useGajianDetailQuery,
  useGajianListQuery,
  useGajianTotalsQuery,
  useJahitForRincianQuery,
  useJahitQuery,
  useKaryawanIdsInGajianQuery,
  useKreatifForRincianQuery,
  useKreatifQuery,
  useLoadFinishingReconciliationMutation,
  usePotongForRincianQuery,
  usePotongQuery,
  useProduksiTotalMapQuery,
  useKancingHppMapQuery,
  useProdukListQuery,
  useQCForRincianQuery,
  useQCQuery,
  useSaveCmtMutation,
  useSaveFinishingMutation,
  useSaveGajianRequestMutation,
  useSaveJahitMutation,
  useSaveKreatifMutation,
  useSavePotongMutation,
  useSaveQCMutation,
  useSyncJahitCardsFromGajianMutation,
  useSyncKancingHppFromFinishingMutation,
  useUpahJahitMapQuery,
  useUpahJahitHistoryMapQuery,
} from "./queries";
import {
  BELI_GAS_LABEL,
  PERSIAPAN_ATK_LABEL,
  buildKasbonDeductionsPayload,
  buildPerKaryawanMap,
  buildTambahanPayload,
  calcTotalRequest,
  findTambahanByLabel,
  otherTambahan,
  pettycashTerpakaiFromSaldo,
  sumKasbonDeduction,
  sumTambahan,
} from "./utils";


export function useGajianList() {
  const { data, isLoading } = useGajianListQuery();
  return { gajianList: data ?? [], loading: isLoading };
}

export function useGajianDetail(id) {
  const { data, isLoading } = useGajianDetailQuery(id);
  return { gajian: data ?? null, loading: isLoading };
}

export function useCreateGajianPeriode() {
  const { mutateAsync } = useCreateGajianPeriodeMutation();
  return (tanggalSabtu) => mutateAsync(tanggalSabtu);
}

export function useDeleteGajianPeriode() {
  const { mutateAsync } = useDeleteGajianPeriodeMutation();
  return (id) => mutateAsync(id);
}

export function useSaveGajianRequest() {
  const { mutateAsync } = useSaveGajianRequestMutation();
  return (gajianId, payload) => mutateAsync({ gajianId, payload });
}

export function useGajianTotals(id) {
  const { data, isLoading } = useGajianTotalsQuery(id);
  return { totals: data ?? null, loading: isLoading };
}

export function usePettycashTerpakai() {
  const { saldo, loading } = usePettycashAll();
  const total = useMemo(() => pettycashTerpakaiFromSaldo(saldo), [saldo]);
  return { total, loading };
}

export function useKaryawanIdsInGajian(id) {
  const { data } = useKaryawanIdsInGajianQuery(id);
  return data ?? [];
}

export function useKasbonForGajian(gajianId) {
  const ids = useKaryawanIdsInGajian(gajianId);
  return useKasbonBelumLunasByKaryawanIds(ids);
}

export function useFinalizeGajian() {
  const { mutateAsync: finalize } = useFinalizeGajianMutation();
  const applyKasbonDeduction = useApplyKasbonDeduction();
  const savePettycash = useSavePettycash();
  const { mutateAsync: syncJahitCards } = useSyncJahitCardsFromGajianMutation();

  return async (gajian, { totals, pettycash, tambahan, kasbon, kasbonDeductions, totalRequest }) => {
    await finalize({ gajianId: gajian.id, payload: { totals, pettycash, tambahan, kasbonDeductions, totalRequest } });
    for (const ded of kasbonDeductions) {
      const kb = kasbon.find((k) => k.id === ded.kasbon_id);
      if (!kb) continue;
      await applyKasbonDeduction(kb, {
        jumlah: ded.jumlah,
        tanggal: new Date().toISOString().slice(0, 10),
        keterangan: `Potongan gajian ${gajian.tanggal_sabtu}`,
      });
    }
    if (Number(pettycash) > 0) {
      await savePettycash(
        {
          tanggal: new Date().toISOString().slice(0, 10),
          jenis: "isi",
          kategori: "Lainnya",
          keterangan: `Reimburse Uang Denny & Wulan - Gajian ${gajian.tanggal_sabtu}`,
          jumlah: Number(pettycash),
        },
        null,
      );
    }
    await syncJahitCards(gajian.id);
  };
}


export function usePerKaryawanRincian(gajianId, { includeQC = false } = {}) {
  const { config: cfg } = useFinanceConfig();
  const { data: potong, isLoading: lp } = usePotongForRincianQuery(gajianId);
  const { data: jahit, isLoading: lj } = useJahitForRincianQuery(gajianId);
  const { data: qc, isLoading: lq } = useQCForRincianQuery(gajianId);
  const { data: kreatif, isLoading: lk } = useKreatifForRincianQuery(gajianId);

  const perKaryawan = useMemo(
    () =>
      buildPerKaryawanMap({
        potong: potong ?? [],
        jahit: jahit ?? [],
        qc: qc ?? [],
        kreatif: kreatif ?? [],
        cfg,
        includeQC,
      }),
    [potong, jahit, qc, kreatif, cfg, includeQC],
  );

  return { perKaryawan, loading: lp || lj || lq || lk };
}


export function usePotong(gajianId) {
  const { data, isLoading } = usePotongQuery(gajianId);
  return { rows: data ?? [], loading: isLoading };
}
export function useSavePotong() {
  const { mutateAsync } = useSavePotongMutation();
  return (args) => mutateAsync(args);
}
export function useDeletePotong() {
  const { mutateAsync } = useDeletePotongMutation();
  return (id) => mutateAsync(id);
}


export function useJahit(gajianId) {
  const { data, isLoading } = useJahitQuery(gajianId);
  return { rows: data ?? [], loading: isLoading };
}
export function useSaveJahit() {
  const { mutateAsync } = useSaveJahitMutation();
  return (args) => mutateAsync(args);
}
export function useDeleteJahit() {
  const { mutateAsync } = useDeleteJahitMutation();
  return (id) => mutateAsync(id);
}


export function useFinishing(gajianId) {
  const { data, isLoading } = useFinishingQuery(gajianId);
  return { record: data ?? null, loading: isLoading };
}

export function useSaveFinishing() {
  const { mutateAsync } = useSaveFinishingMutation();
  const { mutateAsync: syncKancingHpp } = useSyncKancingHppFromFinishingMutation();
  return async (args) => {
    const id = await mutateAsync(args);
    try {
      await syncKancingHpp(args?.payload?.items ?? []);
    } catch (err) {
      console.warn("Sinkron Kancing HPP dari Finishing gagal (diabaikan):", err);
    }
    return id;
  };
}
export function useDeleteFinishing() {
  const { mutateAsync } = useDeleteFinishingMutation();
  return (id) => mutateAsync(id);
}

export function useLoadFinishingReconciliation() {
  const { mutateAsync } = useLoadFinishingReconciliationMutation();
  return (items) => mutateAsync(items);
}
export function useApplyFinishingStockIntake() {
  const { mutateAsync, isPending } = useApplyFinishingStockIntakeMutation();
  return { apply: (params) => mutateAsync(params), applying: isPending };
}


export function useQC(gajianId) {
  const { data, isLoading } = useQCQuery(gajianId);
  return { rows: data ?? [], loading: isLoading };
}
export function useSaveQC() {
  const { mutateAsync } = useSaveQCMutation();
  return (args) => mutateAsync(args);
}
export function useDeleteQC() {
  const { mutateAsync } = useDeleteQCMutation();
  return (id) => mutateAsync(id);
}


export function useKreatif(gajianId) {
  const { data, isLoading } = useKreatifQuery(gajianId);
  return { rows: data ?? [], loading: isLoading };
}
export function useSaveKreatif() {
  const { mutateAsync } = useSaveKreatifMutation();
  return (args) => mutateAsync(args);
}
export function useDeleteKreatif() {
  const { mutateAsync } = useDeleteKreatifMutation();
  return (id) => mutateAsync(id);
}


export function useCmt(gajianId) {
  const { data, isLoading } = useCmtQuery(gajianId);
  return { rows: data ?? [], loading: isLoading };
}
export function useSaveCmt() {
  const { mutateAsync } = useSaveCmtMutation();
  return (args) => mutateAsync(args);
}
export function useDeleteCmt() {
  const { mutateAsync } = useDeleteCmtMutation();
  return (id) => mutateAsync(id);
}


export function useProdukList() {
  const { data, isLoading } = useProdukListQuery();
  return { produkList: data ?? [], loading: isLoading };
}

export function useUpahJahitMap() {
  const { data, isLoading } = useUpahJahitMapQuery();
  return { upahJahitByKode: data ?? {}, loading: isLoading };
}

export function useUpahJahitHistoryMap() {
  const { data, isLoading } = useUpahJahitHistoryMapQuery();
  return { upahHistoryByKode: data ?? {}, loading: isLoading };
}

export function useProduksiTotalMap() {
  const { data } = useProduksiTotalMapQuery();
  return { produksiTotalByKode: data ?? {} };
}

export function useKancingHppMap() {
  const { data } = useKancingHppMapQuery();
  return { kancingHppByKode: data ?? {} };
}

export function useRingkasanDraftField(gajianId, key, initial) {
  const stored = useRingkasanDraftStore((s) => s.drafts[gajianId]?.[key]);
  const initialRef = useRef(initial);
  initialRef.current = initial;
  const value = stored === undefined ? initial : stored;
  const setValue = useCallback(
    (next) => {
      const st = useRingkasanDraftStore.getState();
      const cur = st.drafts[gajianId]?.[key];
      const base = cur === undefined ? initialRef.current : cur;
      st.setField(gajianId, key, typeof next === "function" ? next(base) : next);
    },
    [gajianId, key],
  );
  return [value, setValue];
}

export function useRingkasanDraftMeta(gajianId) {
  const hasDraft = useRingkasanDraftStore((s) => !!s.drafts[gajianId] && Object.keys(s.drafts[gajianId]).length > 0);
  const clearDraft = useCallback(() => useRingkasanDraftStore.getState().clear(gajianId), [gajianId]);
  return { hasDraft, clearDraft };
}

export function useRingkasanValues(gajianId, gajian) {
  const isFinal = gajian.status === "final";
  const { totals, loading: loadingTotals } = useGajianTotals(gajianId);
  const { kasbon } = useKasbonForGajian(gajianId);
  const { total: pettycashTerpakai, loading: loadingPettycashTerpakai } = usePettycashTerpakai();
  const tersimpan = gajian.tambahan ?? [];

  const [pettycashEnabled, setPettycashEnabled] = useRingkasanDraftField(gajianId, "pettycashEnabled", true);
  const [tambahan, setTambahan] = useRingkasanDraftField(gajianId, "tambahan", otherTambahan(tersimpan));
  const [beliGasEnabled, setBeliGasEnabled] = useRingkasanDraftField(
    gajianId,
    "beliGasEnabled",
    !!findTambahanByLabel(tersimpan, BELI_GAS_LABEL),
  );
  const [atkInput, setAtkInput] = useRingkasanDraftField(gajianId, "atkInput", "");
  const [kasbonDeds, setKasbonDeds] = useRingkasanDraftField(
    gajianId,
    "kasbonDeds",
    Object.fromEntries((gajian.kasbon_deductions ?? []).map((d) => [d.kasbon_id, String(d.jumlah)])),
  );
  const { hasDraft, clearDraft } = useRingkasanDraftMeta(gajianId);

  const pettycash = pettycashEnabled ? pettycashTerpakai : 0;
  const atkPrevJumlah = findTambahanByLabel(tersimpan, PERSIAPAN_ATK_LABEL)?.jumlah ?? 0;
  const atkJumlah = atkInput !== "" ? Number(atkInput) || 0 : atkPrevJumlah;
  const fullTambahan = buildTambahanPayload({ otherItems: tambahan, beliGasEnabled, atkJumlah });

  const totalGaji = isFinal ? (gajian.total_gaji ?? 0) : (totals?.gaji ?? 0);
  const sTambahan = sumTambahan(fullTambahan);
  const sKasbonDed = sumKasbonDeduction(kasbon, kasbonDeds);
  const totalRequest = isFinal
    ? (gajian.total_request ?? 0)
    : calcTotalRequest({ totalGaji, pettycash, tambahan: fullTambahan, kasbon, kasbonDeds });
  const shareKasbonDeds = isFinal ? (gajian.kasbon_deductions ?? []) : buildKasbonDeductionsPayload(kasbon, kasbonDeds);

  return {
    isFinal, totals, loadingTotals, kasbon, pettycashTerpakai, loadingPettycashTerpakai,
    pettycashEnabled, setPettycashEnabled, pettycash,
    tambahan, setTambahan, beliGasEnabled, setBeliGasEnabled,
    atkInput, setAtkInput, atkPrevJumlah, atkJumlah, kasbonDeds, setKasbonDeds,
    fullTambahan, totalGaji, sTambahan, sKasbonDed, totalRequest, shareKasbonDeds,
    hasDraft, clearDraft,
  };
}
