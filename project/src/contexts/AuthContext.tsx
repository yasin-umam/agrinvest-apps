import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
      return true;
    }

    // Profile tidak ditemukan - sign out user
    return false;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const profileLoaded = await loadProfile(session.user.id);
        if (!profileLoaded) {
          // Profile tidak ditemukan, sign out otomatis
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileLoaded = await loadProfile(session.user.id);
          if (!profileLoaded) {
            // Profile tidak ditemukan, sign out otomatis
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        } else {
          setProfile(null);
        }

        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const profileChannel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          loadProfile(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: undefined, // Disable email confirmation
      },
    });

    // Profile akan otomatis dibuat oleh trigger handle_new_user()
    // dengan balance default 0 dan role 'user'

    // Jika sign up berhasil dan user langsung confirmed, auto login
    if (!error && data.user && data.session) {
      console.log('User registered and auto-logged in:', data.user.email);
    }

    return { error, data };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      // Cek apakah profile ada di database
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profileData) {
        // Profile tidak ditemukan, sign out dan berikan error
        await supabase.auth.signOut();
        return {
          error: {
            message: 'Akun tidak ditemukan di sistem. Silakan daftar terlebih dahulu.',
            name: 'ProfileNotFound',
            status: 404,
          } as AuthError,
        };
      }
    }

    return { error };
  };

  const signOut = async () => {
    setProfile(null);
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
