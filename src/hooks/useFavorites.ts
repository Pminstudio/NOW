import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Pulse } from '../../types';

interface Favorite {
  id: string;
  pulse_id: string;
  created_at: string;
}

export function useFavorites(userId: string | undefined) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoritePulses, setFavoritePulses] = useState<Pulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch user's favorites
  const fetchFavorites = useCallback(async () => {
    if (!userId) {
      setFavorites([]);
      setFavoritePulses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch favorites with pulse data
      const { data, error: fetchError } = await supabase
        .from('favorites')
        .select(`
          id,
          pulse_id,
          created_at,
          pulses (
            id,
            title,
            type,
            description,
            pulseur_id,
            start_time,
            location_lat,
            location_lng,
            location_address,
            capacity,
            image_url,
            price,
            tags,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const favoritesData = data || [];
      setFavorites(favoritesData.map(f => ({
        id: f.id,
        pulse_id: f.pulse_id,
        created_at: f.created_at
      })));

      // Transform pulses data
      const pulses: Pulse[] = favoritesData
        .filter(f => f.pulses)
        .map(f => {
          const p = f.pulses as any;
          return {
            id: p.id,
            title: p.title,
            type: p.type,
            description: p.description,
            pulseurId: p.pulseur_id,
            startTime: p.start_time,
            location: {
              lat: p.location_lat,
              lng: p.location_lng,
              address: p.location_address
            },
            capacity: p.capacity,
            imageUrl: p.image_url,
            price: p.price,
            tags: p.tags,
            participants: []
          };
        });

      setFavoritePulses(pulses);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch favorites'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Check if a pulse is favorited
  const isFavorite = useCallback((pulseId: string) => {
    return favorites.some(f => f.pulse_id === pulseId);
  }, [favorites]);

  // Add to favorites
  const addFavorite = async (pulseId: string): Promise<{ error: Error | null }> => {
    if (!userId) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const { error: insertError } = await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          pulse_id: pulseId
        });

      if (insertError) throw insertError;

      // Refresh favorites
      await fetchFavorites();
      return { error: null };
    } catch (err) {
      console.error('Error adding favorite:', err);
      return { error: err instanceof Error ? err : new Error('Failed to add favorite') };
    }
  };

  // Remove from favorites
  const removeFavorite = async (pulseId: string): Promise<{ error: Error | null }> => {
    if (!userId) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('pulse_id', pulseId);

      if (deleteError) throw deleteError;

      // Update local state immediately for better UX
      setFavorites(prev => prev.filter(f => f.pulse_id !== pulseId));
      setFavoritePulses(prev => prev.filter(p => p.id !== pulseId));

      return { error: null };
    } catch (err) {
      console.error('Error removing favorite:', err);
      return { error: err instanceof Error ? err : new Error('Failed to remove favorite') };
    }
  };

  // Toggle favorite
  const toggleFavorite = async (pulseId: string): Promise<{ error: Error | null; isFavorite: boolean }> => {
    const isCurrentlyFavorite = isFavorite(pulseId);

    if (isCurrentlyFavorite) {
      const result = await removeFavorite(pulseId);
      return { ...result, isFavorite: false };
    } else {
      const result = await addFavorite(pulseId);
      return { ...result, isFavorite: true };
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('favorites_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchFavorites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchFavorites]);

  return {
    favorites,
    favoritePulses,
    loading,
    error,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    refreshFavorites: fetchFavorites
  };
}
