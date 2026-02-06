import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'white' | 'violet';
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

const colorClasses = {
  white: 'bg-white',
  violet: 'bg-violet-950',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'violet',
  text,
  fullScreen = false,
}) => {
  const dots = (
    <div className="flex gap-2 justify-center">
      <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} />
      <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce [animation-delay:0.2s]`} />
      <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce [animation-delay:0.4s]`} />
    </div>
  );

  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
      >
        {dots}
        {text && (
          <p className="mt-6 text-[10px] font-black text-violet-950/50 uppercase tracking-widest">
            {text}
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      {dots}
      {text && (
        <p className="mt-4 text-[10px] font-black text-violet-950/50 uppercase tracking-widest">
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
