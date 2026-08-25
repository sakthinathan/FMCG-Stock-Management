import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  agency_id: string;
  role: string;
}

interface Agency {
  id: string;
  name: string;
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

  const fetchProfileAndAgency = async (userId: string) => {
    try {
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profData) {
        setProfile(profData);
        const { data: agData } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', profData.agency_id)
          .single();
        if (agData) {
          setAgency(agData);
        }
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
        fetchProfileAndAgency(session.user.id).then(() => setIsLoading(false));
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
        fetchProfileAndAgency(session.user.id).then(() => setIsLoading(false));
      } else {
        setProfile(null);
        setAgency(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
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
