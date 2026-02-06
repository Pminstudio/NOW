import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Rating {
  id: string;
  pulseId: string;
  reviewerId: string;
  pulseurId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer?: {
    name: string;
    avatar: string;
  };
}

export interface PulseurStats {
  pulseurId: string;
  totalReviews: number;
  averageRating: number;
  totalPulsesCreated: number;
  completedPulses: number;
}

export function useRatings(pulseurId?: string) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [stats, setStats] = useState<PulseurStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch ratings for a pulseur
  const fetchRatings = useCallback(async () => {
    if (!pulseurId) {
      setRatings([]);
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch ratings with reviewer info
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('ratings')
        .select(`
          id,
          pulse_id,
          reviewer_id,
          pulseur_id,
          rating,
          comment,
          created_at,
          profiles!ratings_reviewer_id_fkey (
            name,
            avatar
          )
        `)
        .eq('pulseur_id', pulseurId)
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;

      const transformedRatings: Rating[] = (ratingsData || []).map((r: any) => ({
        id: r.id,
        pulseId: r.pulse_id,
        reviewerId: r.reviewer_id,
        pulseurId: r.pulseur_id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
        reviewer: r.profiles ? {
          name: r.profiles.name,
          avatar: r.profiles.avatar
        } : undefined
      }));

      setRatings(transformedRatings);

      // Fetch stats
      const { data: statsData, error: statsError } = await supabase
        .from('pulseur_stats')
        .select('*')
        .eq('pulseur_id', pulseurId)
        .single();

      if (statsError && statsError.code !== 'PGRST116') {
        // Ignore "no rows returned" error
        throw statsError;
      }

      if (statsData) {
        setStats({
          pulseurId: statsData.pulseur_id,
          totalReviews: statsData.total_reviews,
          averageRating: statsData.average_rating,
          totalPulsesCreated: statsData.total_pulses_created,
          completedPulses: statsData.completed_pulses
        });
      }
    } catch (err) {
      console.error('Error fetching ratings:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch ratings'));
    } finally {
      setLoading(false);
    }
  }, [pulseurId]);

  // Check if user has already rated a pulse
  const hasRated = async (pulseId: string, userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('ratings')
      .select('id')
      .eq('pulse_id', pulseId)
      .eq('reviewer_id', userId)
      .single();

    return !!data;
  };

  // Get user's rating for a pulse
  const getUserRating = async (pulseId: string, userId: string): Promise<Rating | null> => {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('pulse_id', pulseId)
      .eq('reviewer_id', userId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      pulseId: data.pulse_id,
      reviewerId: data.reviewer_id,
      pulseurId: data.pulseur_id,
      rating: data.rating,
      comment: data.comment,
      createdAt: data.created_at
    };
  };

  // Create a new rating
  const createRating = async (
    pulseId: string,
    reviewerId: string,
    pulseurId: string,
    rating: number,
    comment?: string
  ): Promise<{ error: Error | null }> => {
    try {
      const { error: insertError } = await supabase
        .from('ratings')
        .insert({
          pulse_id: pulseId,
          reviewer_id: reviewerId,
          pulseur_id: pulseurId,
          rating,
          comment: comment || null
        });

      if (insertError) throw insertError;

      // Refresh ratings if viewing this pulseur
      if (pulseurId === pulseurId) {
        await fetchRatings();
      }

      return { error: null };
    } catch (err) {
      console.error('Error creating rating:', err);
      return { error: err instanceof Error ? err : new Error('Failed to create rating') };
    }
  };

  // Update a rating
  const updateRating = async (
    ratingId: string,
    rating: number,
    comment?: string
  ): Promise<{ error: Error | null }> => {
    try {
      const { error: updateError } = await supabase
        .from('ratings')
        .update({
          rating,
          comment: comment || null
        })
        .eq('id', ratingId);

      if (updateError) throw updateError;

      await fetchRatings();
      return { error: null };
    } catch (err) {
      console.error('Error updating rating:', err);
      return { error: err instanceof Error ? err : new Error('Failed to update rating') };
    }
  };

  // Delete a rating
  const deleteRating = async (ratingId: string): Promise<{ error: Error | null }> => {
    try {
      const { error: deleteError } = await supabase
        .from('ratings')
        .delete()
        .eq('id', ratingId);

      if (deleteError) throw deleteError;

      await fetchRatings();
      return { error: null };
    } catch (err) {
      console.error('Error deleting rating:', err);
      return { error: err instanceof Error ? err : new Error('Failed to delete rating') };
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  return {
    ratings,
    stats,
    loading,
    error,
    hasRated,
    getUserRating,
    createRating,
    updateRating,
    deleteRating,
    refreshRatings: fetchRatings
  };
}

// Hook for rating a specific pulse
export function usePulseRating(pulseId: string, userId: string | undefined) {
  const [canRate, setCanRate] = useState(false);
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRatingEligibility = async () => {
      if (!pulseId || !userId) {
        setCanRate(false);
        setLoading(false);
        return;
      }

      try {
        // Check if pulse has ended and user participated
        const { data: pulseData, error: pulseError } = await supabase
          .from('pulses')
          .select('start_time, participants, pulseur_id')
          .eq('id', pulseId)
          .single();

        if (pulseError || !pulseData) {
          setCanRate(false);
          setLoading(false);
          return;
        }

        const isPastPulse = new Date(pulseData.start_time) < new Date();
        const isParticipant = pulseData.participants.includes(userId);
        const isNotOwner = pulseData.pulseur_id !== userId;

        // Check if already rated
        const { data: ratingData } = await supabase
          .from('ratings')
          .select('*')
          .eq('pulse_id', pulseId)
          .eq('reviewer_id', userId)
          .single();

        if (ratingData) {
          setExistingRating({
            id: ratingData.id,
            pulseId: ratingData.pulse_id,
            reviewerId: ratingData.reviewer_id,
            pulseurId: ratingData.pulseur_id,
            rating: ratingData.rating,
            comment: ratingData.comment,
            createdAt: ratingData.created_at
          });
        }

        setCanRate(isPastPulse && isParticipant && isNotOwner && !ratingData);
      } catch (err) {
        console.error('Error checking rating eligibility:', err);
        setCanRate(false);
      } finally {
        setLoading(false);
      }
    };

    checkRatingEligibility();
  }, [pulseId, userId]);

  return { canRate, existingRating, loading };
}
