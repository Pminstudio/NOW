import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SubscriptionPlan } from '../src/hooks/useSubscription';

interface UpgradeModalProps {
  isOpen: boolean;
  plans: SubscriptionPlan[];
  currentPlanId: string;
  onSelectPlan: (planId: string, billingCycle: 'monthly' | 'yearly') => Promise<void>;
  onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  plans,
  currentPlanId,
  onSelectPlan,
  onClose
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const pulsePlusPlan = plans.find(p => p.id === 'pulse_plus');
  const yearlyDiscount = pulsePlusPlan
    ? Math.round((1 - (pulsePlusPlan.priceYearly / (pulsePlusPlan.priceMonthly * 12))) * 100)
    : 0;

  const handleSelectPlan = async (planId: string) => {
    if (planId === currentPlanId) return;

    setSelectedPlan(planId);
    setIsLoading(true);

    try {
      await onSelectPlan(planId, billingCycle);
    } catch (err) {
      console.error('Error selecting plan:', err);
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  const getPrice = (plan: SubscriptionPlan) => {
    if (billingCycle === 'yearly') {
      return (plan.priceYearly / 12).toFixed(2);
    }
    return plan.priceMonthly.toFixed(2);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-violet-950/90 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md bg-white rounded-[50px] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-violet-600 to-violet-950 p-10 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
              <button
                onClick={onClose}
                className="absolute top-6 right-6 z-20 w-10 h-10 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 transition-all active:scale-90 hover:bg-white/25"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative z-10"
              >
                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10 text-white">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="text-4xl font-black text-white tracking-tight mb-2">Pulse+</h2>
                <p className="text-violet-200 font-bold">Pulse sans limites</p>
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-violet-100 text-violet-800'
                      : 'text-gray-400'
                  }`}
                >
                  Mensuel
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all relative ${
                    billingCycle === 'yearly'
                      ? 'bg-violet-100 text-violet-800'
                      : 'text-gray-400'
                  }`}
                >
                  Annuel
                  {yearlyDiscount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                      -{yearlyDiscount}%
                    </span>
                  )}
                </button>
              </div>

              {/* Price */}
              {pulsePlusPlan && (
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-black text-violet-950">{getPrice(pulsePlusPlan)}€</span>
                    <span className="text-gray-400 font-bold">/mois</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="text-green-600 font-bold text-sm mt-2">
                      Facturé {pulsePlusPlan.priceYearly}€/an
                    </p>
                  )}
                </div>
              )}

              {/* Features */}
              <div className="space-y-4 mb-10">
                {pulsePlusPlan?.features.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4 text-violet-600">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-gray-700 font-bold">{feature}</span>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleSelectPlan('pulse_plus')}
                disabled={isLoading || currentPlanId === 'pulse_plus'}
                className="w-full py-6 bg-violet-950 text-white rounded-[30px] text-xl font-black shadow-[0_20px_50px_rgba(76,29,149,0.4)] transition-all active:scale-95 disabled:opacity-50 uppercase tracking-tight"
              >
                {isLoading && selectedPlan === 'pulse_plus' ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-white rounded-full animate-bounce" />
                    <div className="w-3 h-3 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-3 h-3 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
                  </span>
                ) : currentPlanId === 'pulse_plus' ? (
                  'Déjà abonné'
                ) : (
                  'Passer à Pulse+'
                )}
              </button>

              {/* Cancel */}
              <button
                onClick={onClose}
                className="w-full py-4 text-gray-400 font-bold text-sm mt-4"
              >
                Continuer en gratuit
              </button>

              {/* Terms */}
              <p className="text-center text-[10px] text-gray-300 mt-6">
                En souscrivant, tu acceptes nos conditions d'utilisation.
                <br />
                Annulable à tout moment.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;
