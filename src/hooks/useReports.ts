import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type ReportType = 'pulse' | 'user' | 'message';

export type ReportReason =
  | 'spam'
  | 'inappropriate_content'
  | 'harassment'
  | 'fake_profile'
  | 'dangerous_activity'
  | 'fraud'
  | 'other';

export interface ReportReasonOption {
  reason: ReportReason;
  label: string;
  description: string;
}

export const REPORT_REASONS: ReportReasonOption[] = [
  { reason: 'spam', label: 'Spam', description: 'Contenu promotionnel non sollicité' },
  { reason: 'inappropriate_content', label: 'Contenu inapproprié', description: 'Contenu offensant, violent ou sexuel' },
  { reason: 'harassment', label: 'Harcèlement', description: 'Comportement abusif ou intimidant' },
  { reason: 'fake_profile', label: 'Faux profil', description: 'Profil frauduleux ou usurpation d\'identité' },
  { reason: 'dangerous_activity', label: 'Activité dangereuse', description: 'Activité illégale ou risquée' },
  { reason: 'fraud', label: 'Arnaque', description: 'Tentative de fraude ou escroquerie' },
  { reason: 'other', label: 'Autre', description: 'Autre problème à signaler' },
];

export interface Report {
  id: string;
  reporterId: string;
  reportedType: ReportType;
  reportedId: string;
  reason: ReportReason;
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
}

export function useReports(userId: string | undefined) {
  const [loading, setLoading] = useState(false);
  const [myReports, setMyReports] = useState<Report[]>([]);

  // Submit a report
  const submitReport = async (
    reportedType: ReportType,
    reportedId: string,
    reason: ReportReason,
    description?: string
  ): Promise<{ error: Error | null }> => {
    if (!userId) {
      return { error: new Error('Not authenticated') };
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: userId,
          reported_type: reportedType,
          reported_id: reportedId,
          reason,
          description: description || null
        });

      if (error) throw error;

      return { error: null };
    } catch (err) {
      console.error('Error submitting report:', err);
      return { error: err instanceof Error ? err : new Error('Failed to submit report') };
    } finally {
      setLoading(false);
    }
  };

  // Get my submitted reports
  const fetchMyReports = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMyReports((data || []).map(r => ({
        id: r.id,
        reporterId: r.reporter_id,
        reportedType: r.reported_type,
        reportedId: r.reported_id,
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: r.created_at
      })));
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  }, [userId]);

  // Block a user
  const blockUser = async (blockedUserId: string): Promise<{ error: Error | null }> => {
    if (!userId) {
      return { error: new Error('Not authenticated') };
    }

    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: userId,
          blocked_id: blockedUserId
        });

      if (error) throw error;

      return { error: null };
    } catch (err) {
      console.error('Error blocking user:', err);
      return { error: err instanceof Error ? err : new Error('Failed to block user') };
    }
  };

  // Unblock a user
  const unblockUser = async (blockedUserId: string): Promise<{ error: Error | null }> => {
    if (!userId) {
      return { error: new Error('Not authenticated') };
    }

    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', userId)
        .eq('blocked_id', blockedUserId);

      if (error) throw error;

      return { error: null };
    } catch (err) {
      console.error('Error unblocking user:', err);
      return { error: err instanceof Error ? err : new Error('Failed to unblock user') };
    }
  };

  // Check if a user is blocked
  const isUserBlocked = async (checkUserId: string): Promise<boolean> => {
    if (!userId) return false;

    const { data, error } = await supabase.rpc('is_user_blocked', {
      check_user_id: checkUserId,
      by_user_id: userId
    });

    if (error) {
      console.error('Error checking blocked status:', error);
      return false;
    }

    return data || false;
  };

  // Get list of blocked users
  const getBlockedUsers = async (): Promise<string[]> => {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', userId);

    if (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }

    return (data || []).map(b => b.blocked_id);
  };

  return {
    loading,
    myReports,
    submitReport,
    fetchMyReports,
    blockUser,
    unblockUser,
    isUserBlocked,
    getBlockedUsers
  };
}
