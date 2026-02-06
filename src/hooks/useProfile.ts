import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, Pulseur, dbProfileToUserProfile } from '../../types';

interface UseProfileReturn {
  getProfile: (userId: string) => Promise<UserProfile | null>;
  getPulseur: (userId: string, activePulseIds: string[]) => Promise<Pulseur | null>;
  loading: boolean;
  error: Error | null;
}

export function useProfile(): UseProfileReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      return data ? dbProfileToUserProfile(data) : null;
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPulseur = useCallback(
    async (userId: string, activePulseIds: string[]): Promise<Pulseur | null> => {
      const profile = await getProfile(userId);

      if (!profile) {
        return null;
      }

      return {
        ...profile,
        rating: profile.rating ?? 5.0,
        activePulses: activePulseIds,
      };
    },
    [getProfile]
  );

  return {
    getProfile,
    getPulseur,
    loading,
    error,
  };
}
