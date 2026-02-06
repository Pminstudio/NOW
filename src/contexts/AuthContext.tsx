import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile, Interest } from '../../types';
import { dbProfileToUserProfile } from '../../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, interests: Interest[]) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, userName?: string) => {
    // Use maybeSingle to avoid 406 error when profile doesn't exist
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    // If profile doesn't exist, create it
    if (!data) {
      console.log('Profile not found, creating...');
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: userName || 'Nouveau Pulseur',
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          bio: 'Prêt à pulser !',
          interests: []
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return null;
      }

      return newProfile ? dbProfileToUserProfile(newProfile) : null;
    }

    return dbProfileToUserProfile(data);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const fetchedProfile = await fetchProfile(user.id);
      setProfile(fetchedProfile);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const userName = session.user.user_metadata?.name;
          const fetchedProfile = await fetchProfile(session.user.id, userName);
          if (isMounted) {
            setProfile(fetchedProfile);
          }
        }
      } catch (err) {
        console.error('AuthContext: Error getting session', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          const userName = session.user.user_metadata?.name;
          const fetchedProfile = await fetchProfile(session.user.id, userName);
          setProfile(fetchedProfile);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    interests: Interest[]
  ): Promise<{ error: AuthError | null }> => {
    // Clear any existing session first to avoid conflicts
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      return { error };
    }

    if (data.user) {
      // Use upsert to create or update the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          name,
          interests: interests as string[],
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.id}`,
          bio: 'Prêt à pulser !',
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('Error creating/updating profile after signup:', profileError);
      }
    }

    return { error: null };
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (
    updates: Partial<UserProfile>
  ): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.avatar !== undefined) dbUpdates.avatar_url = updates.avatar;
    if (updates.interests !== undefined) dbUpdates.interests = updates.interests;
    if (updates.isPulseur !== undefined) dbUpdates.is_pulseur = updates.isPulseur;

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', user.id);

    if (error) {
      return { error };
    }

    await refreshProfile();
    return { error: null };
  };

  const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    resetPassword,
    updatePassword,
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
