import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useStockStore } from '@/store/useStockStore';

interface Profile {
  id: string;
  agency_id: string;
  role: string;
}

interface Agency {
  id: string;
  name: string;
  aw_code?: string | null;
  district?: string | null;
  mobile?: string | null;
  logo_url: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  agency: Agency | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshAgency: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfileAndAgency = async (userObj: User) => {
    try {
      // 1. Try to fetch profile from profiles table
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userObj.id)
        .maybeSingle();

      let targetAgencyId: string | null = profData?.agency_id || userObj.user_metadata?.agency_id || null;

      // 2. Fallback: Extract AW Code from internal email format (e.g., aw25999@britanniaaudit.com)
      if (!targetAgencyId && userObj.email) {
        const match = userObj.email.match(/^aw([a-zA-Z0-9]+)@/i);
        if (match && match[1]) {
          const code = match[1].toUpperCase();
          const { data: agByCode } = await supabase
            .from('agencies')
            .select('id')
            .ilike('aw_code', code)
            .maybeSingle();
          if (agByCode) {
            targetAgencyId = agByCode.id;
          }
        }
      }

      // 3. Fallback: Fetch any existing agency
      if (!targetAgencyId) {
        const { data: firstAg } = await supabase
          .from('agencies')
          .select('id')
          .limit(1)
          .maybeSingle();
        if (firstAg) {
          targetAgencyId = firstAg.id;
        }
      }

      // 4. Fetch full Agency details
      let agData: Agency | null = null;
      if (targetAgencyId) {
        const { data: ag } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', targetAgencyId)
          .maybeSingle();
        if (ag) {
          agData = ag;
          setAgency(ag);
        }
      }

      // 5. Ensure profiles table row exists for RLS policies
      if (targetAgencyId) {
        const roleToUse = profData?.role || userObj.user_metadata?.role || 'Owner';
        const profileObj: Profile = { id: userObj.id, agency_id: targetAgencyId, role: roleToUse };
        if (!profData) {
          await supabase.from('profiles').upsert(profileObj);
        }
        setProfile(profileObj);
      } else if (profData) {
        setProfile(profData);
      }

      // 6. Synchronize stock store: set active stock upload belonging ONLY to this agency
      if (targetAgencyId) {
        const { data: latestUpload } = await supabase
          .from('stock_uploads')
          .select('id, file_name, uploaded_at')
          .eq('agency_id', targetAgencyId)
          .order('uploaded_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestUpload) {
          useStockStore.getState().setActiveUpload(latestUpload.id, latestUpload.file_name, latestUpload.uploaded_at);
        } else {
          useStockStore.getState().clearActiveUpload();
        }
      } else {
        useStockStore.getState().clearActiveUpload();
      }

    } catch (e) {
      console.error('Error fetching profile/agency:', e);
    }
  };

  useEffect(() => {
    // Get active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndAgency(session.user).then(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsLoading(true);
        fetchProfileAndAgency(session.user).then(() => setIsLoading(false));
      } else {
        setProfile(null);
        setAgency(null);
        useStockStore.getState().clearActiveUpload();
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    useStockStore.getState().clearActiveUpload();
    try {
      localStorage.removeItem('fmcg-stock-storage-v2');
    } catch {}
    setSession(null);
    setUser(null);
    setProfile(null);
    setAgency(null);
    await supabase.auth.signOut();
  };

  const refreshAgency = async () => {
    if (profile?.agency_id) {
      const { data } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', profile.agency_id)
        .single();
      if (data) setAgency(data);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, agency, isLoading, signOut, refreshAgency }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

