import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export async function logHistory({ action, kode, nama, snapshot }) {
  try {
    await supabase.from("product_history").insert({
      action,
      kode,
      nama,
      snapshot,
    });
  } catch (err) {
    console.warn("logHistory error:", err);
  }
}

export function useHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from("product_history")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) setError(error);
        else setHistory(data ?? []);
        setLoading(false);
      });
  }, []);

  return { history, loading, error };
}
