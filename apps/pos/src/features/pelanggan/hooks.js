import { useCallback, useEffect, useState } from "react";
import { db } from "../../lib/db";
import { syncPelanggan } from "../../lib/sync";
import { useSalesByBuyerNameQuery, useSalesByPelangganQuery } from "./queries";

export { addPelanggan, deletePelanggan, updatePelanggan } from "./api";

export function useSalesByPelanggan(pelangganId) {
  const { data, isLoading, error, refetch } = useSalesByPelangganQuery(pelangganId);
  return { sales: data ?? [], loading: isLoading, error, reload: refetch };
}

export function useSalesByBuyerName(buyerName) {
  const { data, isLoading, error, refetch } = useSalesByBuyerNameQuery(buyerName);
  return { sales: data ?? [], loading: isLoading, error, reload: refetch };
}

export function usePelanggan() {
  const [pelanggan, setPelanggan] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const local = await db.pelanggan.orderBy("nama").toArray();
    setPelanggan(local);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    if (navigator.onLine) {
      syncPelanggan()
        .then(() => load())
        .catch(() => {});
    }
  }, [load]);

  return { pelanggan, loading, reload: load };
}

export async function searchPelanggan(query) {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return db.pelanggan
    .filter((p) => p.nama.toLowerCase().includes(q) || (p.no_hp ?? "").includes(q))
    .limit(8)
    .toArray();
}
