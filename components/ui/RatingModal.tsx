import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RatingModalProps {
  isOpen: boolean;
  pulseurName: string;
  pulseTitle: string;
  existingRating?: number;
  existingComment?: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onClose: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  pulseurName,
  pulseTitle,
  existingRating,
  existingComment,
  onSubmit,
  onClose
}) => {
  const [rating, setRating] = useState(existingRating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingComment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error submitting rating:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  const getRatingText = (r: number) => {
    switch (r) {
      case 1: return 'Décevant';
      case 2: return 'Bof';
      case 3: return 'Correct';
      case 4: return 'Bien';
      case 5: return 'Incroyable';
      default: return 'Ton avis';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md bg-white rounded-t-[50px] p-8 pb-12"
            onClick={(e) => e.stopPropagation()}
          >
            {isSuccess ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-16 flex flex-col items-center"
              >
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-12 h-12 text-green-600">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-violet-950 text-center">Merci pour ton avis !</h3>
              </motion.div>
            ) : (
              <>
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />

                <div className="text-center mb-8">
                  <h3 className="text-3xl font-black text-violet-950 tracking-tight mb-2">
                    Note ton expérience
                  </h3>
                  <p className="text-violet-400 font-bold text-sm">
                    Comment s'est passé "{pulseTitle}" avec {pulseurName} ?
                  </p>
                </div>

                {/* Star Rating */}
                <div className="flex flex-col items-center mb-8">
                  <div className="flex gap-3 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        type="button"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        onClick={() => setRating(star)}
                        className="p-1"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className={`w-12 h-12 transition-colors ${
                            star <= displayRating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-gray-200 fill-gray-200'
                          }`}
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </motion.button>
                    ))}
                  </div>
                  <motion.p
                    key={displayRating}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-lg font-black uppercase tracking-widest ${
                      displayRating >= 4 ? 'text-green-600' :
                      displayRating >= 3 ? 'text-amber-600' :
                      displayRating >= 1 ? 'text-red-400' :
                      'text-gray-300'
                    }`}
                  >
                    {getRatingText(displayRating)}
                  </motion.p>
                </div>

                {/* Comment */}
                <div className="bg-gray-50 rounded-[30px] p-6 mb-8">
                  <label className="block text-[10px] font-black text-violet-900/30 uppercase mb-3 tracking-widest">
                    Un commentaire ? (optionnel)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Raconte ton expérience..."
                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-lg font-bold placeholder:text-gray-300 h-24 resize-none text-gray-700"
                    maxLength={500}
                  />
                  <p className="text-right text-[10px] font-bold text-gray-300 mt-2">
                    {comment.length}/500
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={onClose}
                    className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-[25px] font-black text-sm uppercase tracking-widest"
                  >
                    Plus tard
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={rating === 0 || isSubmitting}
                    className="flex-1 py-5 bg-violet-950 text-white rounded-[25px] font-black text-sm uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
                      </span>
                    ) : (
                      'Envoyer'
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

export default RatingModal;
