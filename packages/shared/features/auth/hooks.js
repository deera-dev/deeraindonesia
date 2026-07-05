/**
 * features/auth/hooks.js
 * PUBLIC SURFACE fitur auth — komponen HANYA boleh import dari sini,
 * tidak pernah dari api.js atau "../../lib/supabase" langsung.
 */
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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

  return { user, loading: user === undefined };
}
