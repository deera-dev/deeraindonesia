import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { upsertProfile } from "./api";
import { markInternalDevice } from "../../lib/internalDevice";

export { signIn, signOut, getCurrentUser, displayName } from "./api";

export function useAuth() {
  const [user, setUser] = useState(undefined);

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
