import { useMemo, useState } from "react";
import { useProducedByKode } from "../produk/hooks";
import { printLabels } from "./print";
import { labelDataUrl } from "./render";
import { buildLabelRows, clampCopies, totalCopies } from "./utils";

export function useLabelPrint(kode) {
  const { producedBySize, isLoading } = useProducedByKode(kode);
  const base = useMemo(() => buildLabelRows(producedBySize), [producedBySize]);
  const [edited, setEdited] = useState({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  const rows = base.map((r) => ({ ...r, qty: edited[r.size] ?? r.qty }));

  function setQty(size, raw) {
    setEdited((e) => ({ ...e, [size]: clampCopies(raw) }));
  }

  async function print() {
    setBusy(true);
    setError("");
    try {
      await printLabels(
        rows.map((r) => ({ kode, size: r.size, qty: r.qty })),
        { onProgress: setProgress },
      );
      return true;
    } catch (err) {
      if (err?.name === "NotFoundError") return false;
      setError(err?.message || String(err));
      return false;
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return { rows, isLoading, setQty, total: totalCopies(rows), print, busy, progress, error };
}

export { labelText, labelUrl } from "./utils";
export { labelDataUrl };
