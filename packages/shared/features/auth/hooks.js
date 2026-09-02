/**
 * features/auth/hooks.js
 * PUBLIC SURFACE fitur auth — komponen HANYA boleh import dari sini,
 * tidak pernah dari api.js atau "../../lib/supabase" langsung.
 */
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { upsertProfile } from "./api";

export { signIn, signOut, getCurrentUser, displayName } from "./api";

// user === undefined  → masih loading (belum tahu)
// user === null       → tidak login
// user === {...}      → sudah login
export function useAuth() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    // onAuthStateChange langsung fire dengan session saat ini
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sinkron tabel `profiles` (sumber daftar @mention komentar Planning,
  // permintaan Denny 2026-09) setiap kali user berhasil dikenali — baik
  // login baru maupun sesi lama yang masih tersimpan dari sebelum tabel
  // `profiles` ada. Dependency HANYA user?.id (bukan seluruh objek user)
  // supaya tidak terpanggil ulang tiap token refresh, cukup sekali per
  // user per sesi app. Fire-and-forget, tidak pernah melempar error (lihat
  // upsertProfile di api.js).
  useEffect(() => {
    if (!user?.id) return;
    upsertProfile(user);
  }, [user?.id]);

  return { user, loading: user === undefined };
}
