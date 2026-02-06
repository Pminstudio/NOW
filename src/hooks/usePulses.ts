import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Pulse, dbPulseToPulse, pulseToDbPulse } from '../../types';
import { useAuth } from './useAuth';

export interface PulseWithDistance extends Pulse {
  distanceKm?: number;
}

interface UsePulsesReturn {
  pulses: Pulse[];
  loading: boolean;
  error: Error | null;
  createPulse: (pulse: Omit<Pulse, 'id' | 'participants'>) => Promise<{ data: Pulse | null; error: Error | null }>;
  updatePulse: (pulseId: string, updates: Partial<Omit<Pulse, 'id' | 'participants' | 'pulseurId'>>) => Promise<{ error: Error | null }>;
  deletePulse: (pulseId: string) => Promise<{ error: Error | null }>;
  joinPulse: (pulseId: string) => Promise<{ error: Error | null }>;
  leavePulse: (pulseId: string) => Promise<{ error: Error | null }>;
  refreshPulses: () => Promise<void>;
  getPulseById: (pulseId: string) => Pulse | undefined;
  getUserPulses: (userId: string) => Pulse[];
  getCreatedPulses: (pulseurId: string) => Pulse[];
  searchNearby: (lat: number, lng: number, radiusKm: number, category?: string) => Promise<PulseWithDistance[]>;
}

export function usePulses(): UsePulsesReturn {
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchPulses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('pulses_with_participants')
        .select('*')
        .order('start_time', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      const transformedPulses = (data || []).map(dbPulseToPulse);
      setPulses(transformedPulses);
    } catch (err) {
      console.error('Error fetching pulses:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch pulses'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPulses();

    const pulsesChannel = supabase
      .channel('pulses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pulses',
        },
        () => {
          fetchPulses();
        }
      )
      .subscribe();

    const participantsChannel = supabase
      .channel('participants-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pulse_participants',
        },
        () => {
          fetchPulses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pulsesChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [fetchPulses]);

  const createPulse = async (
    pulse: Omit<Pulse, 'id' | 'participants'>
  ): Promise<{ data: Pulse | null; error: Error | null }> => {
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    try {
      const dbPulse = pulseToDbPulse(pulse);

      const { data, error: insertError } = await supabase
        .from('pulses')
        .insert(dbPulse)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (!data) {
        throw new Error('No data returned from insert');
      }

      const { data: pulseWithParticipants, error: fetchError } = await supabase
        .from('pulses_with_participants')
        .select('*')
        .eq('id', data.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const newPulse = dbPulseToPulse(pulseWithParticipants);
      return { data: newPulse, error: null };
    } catch (err) {
      console.error('Error creating pulse:', err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to create pulse'),
      };
    }
  };

  const updatePulse = async (
    pulseId: string,
    updates: Partial<Omit<Pulse, 'id' | 'participants' | 'pulseurId'>>
  ): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    try {
      // Build the database updates object
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
      if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity;
      if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
      if (updates.price !== undefined) dbUpdates.price = updates.price;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.location !== undefined) {
        dbUpdates.location_lat = updates.location.lat;
        dbUpdates.location_lng = updates.location.lng;
        dbUpdates.location_address = updates.location.address;
      }

      const { error: updateError } = await supabase
        .from('pulses')
        .update(dbUpdates)
        .eq('id', pulseId)
        .eq('pulseur_id', user.id); // Only allow updating own pulses

      if (updateError) {
        throw updateError;
      }

      return { error: null };
    } catch (err) {
      console.error('Error updating pulse:', err);
      return {
        error: err instanceof Error ? err : new Error('Failed to update pulse'),
      };
    }
  };

  const deletePulse = async (pulseId: string): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    try {
      const { error: deleteError } = await supabase
        .from('pulses')
        .delete()
        .eq('id', pulseId)
        .eq('pulseur_id', user.id); // Only allow deleting own pulses

      if (deleteError) {
        throw deleteError;
      }

      return { error: null };
    } catch (err) {
      console.error('Error deleting pulse:', err);
      return {
        error: err instanceof Error ? err : new Error('Failed to delete pulse'),
      };
    }
  };

  const joinPulse = async (pulseId: string): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    try {
      const { error: insertError } = await supabase
        .from('pulse_participants')
        .insert({
          pulse_id: pulseId,
          user_id: user.id,
        });

      if (insertError) {
        throw insertError;
      }

      return { error: null };
    } catch (err) {
      console.error('Error joining pulse:', err);
      return {
        error: err instanceof Error ? err : new Error('Failed to join pulse'),
      };
    }
  };

  const leavePulse = async (pulseId: string): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    try {
      const { error: deleteError } = await supabase
        .from('pulse_participants')
        .delete()
        .eq('pulse_id', pulseId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      return { error: null };
    } catch (err) {
      console.error('Error leaving pulse:', err);
      return {
        error: err instanceof Error ? err : new Error('Failed to leave pulse'),
      };
    }
  };

  const refreshPulses = async () => {
    await fetchPulses();
  };

  const getPulseById = (pulseId: string): Pulse | undefined => {
    return pulses.find((p) => p.id === pulseId);
  };

  const getUserPulses = (userId: string): Pulse[] => {
    return pulses.filter((p) => p.participants.includes(userId));
  };

  const getCreatedPulses = (pulseurId: string): Pulse[] => {
    return pulses.filter((p) => p.pulseurId === pulseurId);
  };

  const searchNearby = async (
    lat: number,
    lng: number,
    radiusKm: number,
    category?: string
  ): Promise<PulseWithDistance[]> => {
    try {
      const { data, error: searchError } = await supabase.rpc('search_pulses_nearby', {
        user_lat: lat,
        user_lng: lng,
        radius_km: radiusKm,
        category: category || null,
        limit_count: 50
      });

      if (searchError) {
        console.error('Search nearby error:', searchError);
        return [];
      }

      // Transform the results
      return (data || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        description: p.description,
        pulseurId: p.pulseur_id,
        startTime: p.start_time,
        location: p.location,
        capacity: p.capacity,
        imageUrl: p.image_url,
        price: p.price,
        tags: p.tags || [],
        participants: p.participants || [],
        distanceKm: p.distance_km
      }));
    } catch (err) {
      console.error('Error searching nearby pulses:', err);
      return [];
    }
  };

  return {
    pulses,
    loading,
    error,
    createPulse,
    updatePulse,
    deletePulse,
    joinPulse,
    leavePulse,
    refreshPulses,
    getPulseById,
    getUserPulses,
    getCreatedPulses,
    searchNearby,
  };
}
