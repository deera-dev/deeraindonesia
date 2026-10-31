import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { markInternalDevice } from "../../lib/internalDevice";
import { supabase } from "../../lib/supabase";
import { upsertProfile } from "./api";

export { displayName, getCurrentUser, signIn, signOut, verifyPassword } from "./api";

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    upsertProfile(user);
    markInternalDevice();
  }, [user?.id]);

  return { user, loading: user === undefined };
}
