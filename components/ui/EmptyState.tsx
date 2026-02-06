import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-14 rounded-[50px] border-2 border-dashed border-violet-100 flex flex-col items-center text-center"
    >
      {icon && (
        <div className="w-24 h-24 bg-violet-50 rounded-full flex items-center justify-center mb-8">
          {icon}
        </div>
      )}
      <p className="text-violet-950 font-black uppercase text-[12px] tracking-widest mb-2 italic">
        {title}
      </p>
      {description && (
        <p className="text-violet-300 text-[10px] font-bold uppercase tracking-widest mb-8">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-8 py-4 bg-violet-950 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
};

export default EmptyState;
