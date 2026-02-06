import React from 'react';
import { motion } from 'framer-motion';

interface PulseLimitBannerProps {
  currentCount: number;
  maxCount: number;
  isPremium: boolean;
  onUpgrade: () => void;
}

const PulseLimitBanner: React.FC<PulseLimitBannerProps> = ({
  currentCount,
  maxCount,
  isPremium,
  onUpgrade
}) => {
  if (isPremium || maxCount === -1) return null;

  const isAtLimit = currentCount >= maxCount;
  const isNearLimit = currentCount === maxCount - 1;

  if (!isAtLimit && !isNearLimit) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 rounded-[30px] mb-6 ${
        isAtLimit
          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
          : 'bg-violet-100 border border-violet-200'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          isAtLimit ? 'bg-white/20' : 'bg-violet-200'
        }`}>
          {isAtLimit ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-white">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-violet-600">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        <div className="flex-1">
          <p className={`font-black text-sm ${isAtLimit ? 'text-white' : 'text-violet-900'}`}>
            {isAtLimit
              ? 'Limite de pulses atteinte !'
              : 'Plus qu\'un pulse disponible'}
          </p>
          <p className={`text-xs font-bold ${isAtLimit ? 'text-white/80' : 'text-violet-500'}`}>
            {currentCount}/{maxCount} pulses actifs
          </p>
        </div>

        <button
          onClick={onUpgrade}
          className={`px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
            isAtLimit
              ? 'bg-white text-orange-600 shadow-lg'
              : 'bg-violet-600 text-white'
          }`}
        >
          Pulse+
        </button>
      </div>
    </motion.div>
  );
};

export default PulseLimitBanner;
