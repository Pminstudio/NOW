import React from 'react';
import { motion } from 'framer-motion';
import { UserSubscription, SubscriptionPlan, PlanLimits } from '../src/hooks/useSubscription';
import PremiumBadge from './ui/PremiumBadge';

interface SubscriptionSectionProps {
  subscription: UserSubscription | null;
  currentPlan: SubscriptionPlan | null;
  limits: PlanLimits;
  isPremium: boolean;
  onUpgrade: () => void;
  onManage: () => void;
}

const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({
  subscription,
  currentPlan,
  limits,
  isPremium,
  onUpgrade,
  onManage
}) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Abonnement</h3>
        {isPremium && <PremiumBadge size="small" />}
      </div>

      {isPremium ? (
        // Premium user view
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-violet-950 rounded-3xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <div>
              <p className="text-2xl font-black text-violet-950">{currentPlan?.name}</p>
              <p className="text-sm text-gray-400 font-bold">
                {subscription?.billingCycle === 'yearly' ? 'Annuel' : 'Mensuel'}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="bg-violet-50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-violet-600">
                {subscription?.cancelAtPeriodEnd
                  ? 'Se termine le'
                  : 'Prochain renouvellement'}
              </span>
              <span className="text-sm font-black text-violet-950">
                {formatDate(subscription?.currentPeriodEnd || null)}
              </span>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-violet-950">∞</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Pulses</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-violet-950">{limits.maxParticipantsPerPulse}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Max/pulse</p>
            </div>
          </div>

          {/* Manage button */}
          <button
            onClick={onManage}
            className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm transition-all active:scale-95"
          >
            Gérer mon abonnement
          </button>
        </div>
      ) : (
        // Free user view
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-gray-400">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">Gratuit</p>
              <p className="text-sm text-gray-400 font-bold">Plan de base</p>
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-gray-900">{limits.maxActivePulses}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Pulses max</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-gray-900">{limits.maxParticipantsPerPulse}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Max/pulse</p>
            </div>
          </div>

          {/* Upgrade CTA */}
          <motion.button
            onClick={onUpgrade}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-5 bg-gradient-to-r from-violet-600 to-violet-950 text-white rounded-[25px] font-black text-sm shadow-lg transition-all flex items-center justify-center gap-3"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Passer à Pulse+
          </motion.button>

          {/* Benefits preview */}
          <div className="text-center">
            <p className="text-[10px] text-gray-400 font-bold">
              Pulses illimités • Visibilité prioritaire • Filtres avancés
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionSection;
