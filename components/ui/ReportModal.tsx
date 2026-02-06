import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReportType, ReportReason, REPORT_REASONS } from '../../src/hooks/useReports';

interface ReportModalProps {
  isOpen: boolean;
  reportedType: ReportType;
  reportedName: string;
  onSubmit: (reason: ReportReason, description: string) => Promise<void>;
  onBlock?: () => Promise<void>;
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  reportedType,
  reportedName,
  onSubmit,
  onBlock,
  onClose
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showBlockOption, setShowBlockOption] = useState(false);

  const getTypeLabel = () => {
    switch (reportedType) {
      case 'pulse': return 'ce pulse';
      case 'user': return 'cet utilisateur';
      case 'message': return 'ce message';
      default: return 'ce contenu';
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      await onSubmit(selectedReason, description);
      setIsSuccess(true);

      // Show block option for user reports
      if (reportedType === 'user' && onBlock) {
        setShowBlockOption(true);
      } else {
        setTimeout(() => onClose(), 2000);
      }
    } catch (err) {
      console.error('Error submitting report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlock = async () => {
    if (onBlock) {
      await onBlock();
    }
    onClose();
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    setIsSuccess(false);
    setShowBlockOption(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end justify-center"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md bg-white rounded-t-[50px] p-8 pb-12 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {isSuccess ? (
              showBlockOption ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center"
                >
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-10 h-10 text-green-600">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Signalement envoyé</h3>
                  <p className="text-gray-500 mb-8">Merci de nous aider à garder NOW sûr.</p>

                  <div className="space-y-3">
                    <button
                      onClick={handleBlock}
                      className="w-full py-5 bg-red-500 text-white rounded-[25px] font-black text-sm uppercase tracking-widest"
                    >
                      Bloquer cet utilisateur
                    </button>
                    <button
                      onClick={handleClose}
                      className="w-full py-5 bg-gray-100 text-gray-500 rounded-[25px] font-black text-sm uppercase tracking-widest"
                    >
                      Fermer
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-16 text-center"
                >
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-10 h-10 text-green-600">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Signalement envoyé</h3>
                  <p className="text-gray-500">Nous examinerons ce contenu rapidement.</p>
                </motion.div>
              )
            ) : (
              <>
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-red-500">
                      <path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4z" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 10v6M8 14h8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">Signaler {getTypeLabel()}</h3>
                    <p className="text-gray-400 text-sm font-bold truncate max-w-[200px]">{reportedName}</p>
                  </div>
                </div>

                {/* Reasons */}
                <div className="space-y-3 mb-6">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Pourquoi signales-tu ce contenu ?
                  </label>
                  {REPORT_REASONS.map((option) => (
                    <button
                      key={option.reason}
                      onClick={() => setSelectedReason(option.reason)}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedReason === option.reason
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <p className={`font-bold ${selectedReason === option.reason ? 'text-red-600' : 'text-gray-800'}`}>
                        {option.label}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                    </button>
                  ))}
                </div>

                {/* Description */}
                {selectedReason && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-8"
                  >
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                      Détails supplémentaires (optionnel)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Explique ce qui s'est passé..."
                      className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-red-200 text-gray-700 placeholder:text-gray-300 resize-none h-24"
                      maxLength={500}
                    />
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-[25px] font-black text-sm uppercase tracking-widest"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedReason || isSubmitting}
                    className="flex-1 py-5 bg-red-500 text-white rounded-[25px] font-black text-sm uppercase tracking-widest disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
                      </span>
                    ) : (
                      'Signaler'
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReportModal;
