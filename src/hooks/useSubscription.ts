import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  features: string[];
  limits: PlanLimits;
}

export interface PlanLimits {
  maxActivePulses: number; // -1 = unlimited
  maxParticipantsPerPulse: number;
  canBoost: boolean;
  priorityVisibility: boolean;
  advancedFilters: boolean;
  smartHistory: boolean;
}

export interface UserSubscription {
  id: string;
  planId: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'expired';
  billingCycle: 'monthly' | 'yearly';
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
}

const DEFAULT_LIMITS: PlanLimits = {
  maxActivePulses: 2,
  maxParticipantsPerPulse: 10,
  canBoost: false,
  priorityVisibility: false,
  advancedFilters: false,
  smartHistory: false
};

export function useSubscription(userId: string | undefined) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [limits, setLimits] = useState<PlanLimits>(DEFAULT_LIMITS);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  // Fetch available plans
  const fetchPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error);
      return;
    }

    const transformedPlans: SubscriptionPlan[] = (data || []).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceMonthly: p.price_monthly,
      priceYearly: p.price_yearly,
      stripePriceIdMonthly: p.stripe_price_id_monthly,
      stripePriceIdYearly: p.stripe_price_id_yearly,
      features: p.features || [],
      limits: {
        maxActivePulses: p.limits?.max_active_pulses ?? 2,
        maxParticipantsPerPulse: p.limits?.max_participants_per_pulse ?? 10,
        canBoost: p.limits?.can_boost ?? false,
        priorityVisibility: p.limits?.priority_visibility ?? false,
        advancedFilters: p.limits?.advanced_filters ?? false,
        smartHistory: p.limits?.smart_history ?? false
      }
    }));

    setPlans(transformedPlans);
  }, []);

  // Fetch user's subscription
  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setCurrentPlan(null);
      setLimits(DEFAULT_LIMITS);
      setIsPremium(false);
      setLoading(false);
      return;
    }

    try {
      // Get subscription
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        throw subError;
      }

      if (subData) {
        const sub: UserSubscription = {
          id: subData.id,
          planId: subData.plan_id,
          status: subData.status,
          billingCycle: subData.billing_cycle,
          stripeCustomerId: subData.stripe_customer_id,
          stripeSubscriptionId: subData.stripe_subscription_id,
          currentPeriodStart: subData.current_period_start,
          currentPeriodEnd: subData.current_period_end,
          cancelAtPeriodEnd: subData.cancel_at_period_end,
          trialEnd: subData.trial_end
        };
        setSubscription(sub);

        // Find matching plan
        const plan = plans.find(p => p.id === sub.planId);
        if (plan) {
          setCurrentPlan(plan);
          setLimits(plan.limits);
          setIsPremium(plan.id !== 'free' && ['active', 'trialing'].includes(sub.status));
        }
      } else {
        // No subscription - default to free
        const freePlan = plans.find(p => p.id === 'free');
        if (freePlan) {
          setCurrentPlan(freePlan);
          setLimits(freePlan.limits);
        }
        setIsPremium(false);
      }

      // Get limits from server function
      const { data: limitsData } = await supabase.rpc('get_user_limits', {
        p_user_id: userId
      });

      if (limitsData) {
        setLimits({
          maxActivePulses: limitsData.max_active_pulses ?? 2,
          maxParticipantsPerPulse: limitsData.max_participants_per_pulse ?? 10,
          canBoost: limitsData.can_boost ?? false,
          priorityVisibility: limitsData.priority_visibility ?? false,
          advancedFilters: limitsData.advanced_filters ?? false,
          smartHistory: limitsData.smart_history ?? false
        });
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, plans]);

  // Check if user can create a pulse
  const canCreatePulse = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    const { data, error } = await supabase.rpc('can_create_pulse', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error checking pulse limit:', error);
      return false;
    }

    return data ?? false;
  }, [userId]);

  // Get active pulse count
  const getActivePulseCount = useCallback(async (): Promise<number> => {
    if (!userId) return 0;

    const { count, error } = await supabase
      .from('pulses')
      .select('*', { count: 'exact', head: true })
      .eq('pulseur_id', userId)
      .gt('start_time', new Date().toISOString());

    if (error) {
      console.error('Error counting pulses:', error);
      return 0;
    }

    return count ?? 0;
  }, [userId]);

  // Create checkout session (to be implemented with Stripe)
  const createCheckoutSession = async (
    planId: string,
    billingCycle: 'monthly' | 'yearly'
  ): Promise<{ url: string | null; error: Error | null }> => {
    // This would call a Supabase Edge Function or API endpoint
    // that creates a Stripe checkout session
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          planId,
          billingCycle,
          userId
        }
      });

      if (error) throw error;

      return { url: data?.url || null, error: null };
    } catch (err) {
      console.error('Error creating checkout session:', err);
      return {
        url: null,
        error: err instanceof Error ? err : new Error('Failed to create checkout session')
      };
    }
  };

  // Create customer portal session (to manage subscription)
  const createPortalSession = async (): Promise<{ url: string | null; error: Error | null }> => {
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { userId }
      });

      if (error) throw error;

      return { url: data?.url || null, error: null };
    } catch (err) {
      console.error('Error creating portal session:', err);
      return {
        url: null,
        error: err instanceof Error ? err : new Error('Failed to create portal session')
      };
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    if (plans.length > 0) {
      fetchSubscription();
    }
  }, [fetchSubscription, plans]);

  return {
    subscription,
    currentPlan,
    plans,
    limits,
    loading,
    isPremium,
    canCreatePulse,
    getActivePulseCount,
    createCheckoutSession,
    createPortalSession,
    refreshSubscription: fetchSubscription
  };
}
