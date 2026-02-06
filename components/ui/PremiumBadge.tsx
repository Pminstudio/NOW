import React from 'react';
import { motion } from 'framer-motion';

interface PremiumBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  className?: string;
}

const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  size = 'medium',
  showLabel = true,
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-5 h-5',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  const textSizes = {
    small: 'text-[8px]',
    medium: 'text-[9px]',
    large: 'text-[10px]'
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg`}>
        <svg viewBox="0 0 24 24" fill="white" className="w-3/5 h-3/5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      </div>
      {showLabel && (
        <span className={`font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 uppercase tracking-widest ${textSizes[size]}`}>
          Pulse+
        </span>
      )}
    </motion.div>
  );
};

export default PremiumBadge;
