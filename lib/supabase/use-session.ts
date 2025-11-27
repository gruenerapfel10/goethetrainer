'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from './browser';

export function useSupabaseSession() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const hydrate = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      if (data.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_admin,email')
          .eq('id', data.user.id)
          .single();
        setProfile(profileData ?? null);
      }
      setLoading(false);
    };
    hydrate();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return { user, loading, profile };
}
