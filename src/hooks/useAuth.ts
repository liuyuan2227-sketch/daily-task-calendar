import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { findProfileByName } from '../utils/publicProgress';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setUser(null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function enterWithName(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('请输入你的名字');

    const existingProfile = await findProfileByName(trimmedName);
    if (existingProfile) {
      localStorage.setItem('preferred_board_user_id', existingProfile.id);
    }

    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          display_name: trimmedName,
        },
      },
    });

    if (error) throw error;

    if (data.user && !existingProfile) {
      await supabase.from('public_profiles').upsert({
        id: data.user.id,
        display_name: trimmedName,
        email: null,
        updated_at: new Date().toISOString(),
      });
      localStorage.setItem('preferred_board_user_id', data.user.id);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return { user, loading, enterWithName, signOut, isConfigured: isSupabaseConfigured };
}
