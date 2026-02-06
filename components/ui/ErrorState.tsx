import React from 'react';
import { motion } from 'framer-motion';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Oups...',
  message,
  onRetry,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-red-50 p-10 rounded-[40px] border border-red-100 flex flex-col items-center text-center"
    >
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10 text-red-400">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="text-red-500 font-black uppercase text-sm tracking-widest mb-2 italic">
        {title}
      </h3>
      <p className="text-red-400 text-[11px] font-bold mb-6">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-8 py-4 bg-red-500 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
        >
          Réessayer
        </button>
      )}
    </motion.div>
  );
};

export default ErrorState;
