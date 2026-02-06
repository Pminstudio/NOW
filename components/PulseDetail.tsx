
import React, { useState } from 'react';
import { Pulse, Pulseur, Interest } from '../types';
import { motion } from 'framer-motion';
import RatingModal from './ui/RatingModal';
import { sharePulse } from '../src/services/shareService';

interface PulseDetailProps {
  pulse: Pulse;
  pulseur: Pulseur;
  isParticipating: boolean;
  isOwner?: boolean;
  isFavorite?: boolean;
  canRate?: boolean;
  hasRated?: boolean;
  onJoin: () => void;
  onCancel: () => void;
  onBack: () => void;
  onPulseurClick: (pulseur: Pulseur) => void;
  onEdit?: () => void;
  onToggleFavorite?: () => void;
  onRate?: (rating: number, comment: string) => Promise<void>;
  onShareSuccess?: () => void;
  onShareError?: (error: string) => void;
  onOpenChat?: () => void;
  onReport?: () => void;
  onReportUser?: () => void;
}

const getTagsForType = (type: Interest): string[] => {
  const commonTags = ['#now', '#pulse'];
  const typeTags: Record<Interest, string[]> = {
    'Footing': ['#sport', '#cardio', '#extérieur', '#santé'],
    'Yoga': ['#bienêtre', '#zen', '#méditation', '#sport'],
    'Natation': ['#sport', '#eau', '#fraicheur', '#vitalité'],
    'Sport Collectif': ['#sport', '#équipe', '#social', '#énergie'],
    'Exposition': ['#culture', '#art', '#découverte', '#musée'],
    'Balade': ['#détente', '#extérieur', '#ville', '#nature'],
    'Randonnée': ['#nature', '#sport', '#aventure', '#panorama'],
    'Resto': ['#food', '#gourmand', '#social', '#plaisir'],
    'Boire un verre': ['#social', '#détente', '#soirée', '#chill'],
    'Atelier': ['#créativité', '#apprentissage', '#culture', '#DIY'],
    'Concert': ['#musique', '#énergie', '#culture', '#sortie'],
    'Cinéma': ['#culture', '#divertissement', '#film', '#écran'],
    'Bénévolat': ['#engagement', '#solidaire', '#caritatif', '#action']
  };
  return [...(typeTags[type] || []), ...commonTags];
};

const PulseDetail: React.FC<PulseDetailProps> = ({
  pulse,
  pulseur,
  isParticipating,
  isOwner = false,
  isFavorite = false,
  canRate = false,
  hasRated = false,
  onJoin,
  onCancel,
  onBack,
  onPulseurClick,
  onEdit,
  onToggleFavorite,
  onRate,
  onShareSuccess,
  onShareError,
  onOpenChat,
  onReport,
  onReportUser
}) => {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const tags = getTagsForType(pulse.type);
  const isPastPulse = new Date(pulse.startTime) < new Date();

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const { success, error } = await sharePulse(pulse);
      if (success) {
        onShareSuccess?.();
      } else if (error) {
        onShareError?.(error);
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <motion.div 
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 30, stiffness: 200 }}
      className="absolute inset-0 bg-white z-[60] overflow-y-auto scrollbar-hide"
    >
      <div className="relative h-[450px]">
        <img src={pulse.imageUrl} className="w-full h-full object-cover scale-110" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent" />
        
        <div className="absolute top-8 left-8 right-8 flex justify-between items-center">
          <button
            onClick={onBack}
            className="w-14 h-14 bg-white/20 backdrop-blur-2xl border border-white/30 rounded-3xl flex items-center justify-center text-white shadow-2xl transition-all active:scale-90"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-7 h-7">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="flex gap-3">
            {/* Share Button */}
            <motion.button
              onClick={handleShare}
              disabled={isSharing}
              whileTap={{ scale: 0.85 }}
              className="w-14 h-14 bg-white/20 backdrop-blur-2xl border border-white/30 rounded-3xl flex items-center justify-center text-white shadow-2xl transition-all disabled:opacity-50"
            >
              {isSharing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="16,6 12,2 8,6" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </motion.button>

            {onToggleFavorite && (
              <motion.button
                onClick={onToggleFavorite}
                whileTap={{ scale: 0.85 }}
                className="w-14 h-14 bg-white/20 backdrop-blur-2xl border border-white/30 rounded-3xl flex items-center justify-center shadow-2xl transition-all"
              >
                <motion.svg
                  viewBox="0 0 24 24"
                  fill={isFavorite ? "#f43f5e" : "none"}
                  stroke={isFavorite ? "#f43f5e" : "currentColor"}
                  strokeWidth="2.5"
                  className={`w-7 h-7 ${isFavorite ? '' : 'text-white'}`}
                  initial={false}
                  animate={isFavorite ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round"/>
                </motion.svg>
              </motion.button>
            )}

            {isOwner && onEdit && (
              <button
                onClick={onEdit}
                className="w-14 h-14 bg-white/20 backdrop-blur-2xl border border-white/30 rounded-3xl flex items-center justify-center text-white shadow-2xl transition-all active:scale-90"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-10 -mt-24 relative z-10 pb-40">
        <div className="bg-violet-800 text-white px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] inline-block mb-6 shadow-2xl shadow-violet-900/40">
          {pulse.type}
        </div>
        
        <h1 className="text-5xl font-black text-gray-900 mb-6 tracking-tighter leading-[0.9]">{pulse.title}</h1>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onPulseurClick(pulseur)}
          className="w-full flex items-center gap-5 mb-6 bg-white p-6 rounded-[45px] transition-all text-left border border-gray-100 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] group"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-[22px] overflow-hidden shadow-2xl border-[3px] border-white flex-shrink-0">
              <img src={pulseur.avatar} className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-violet-800 rounded-lg flex items-center justify-center border-2 border-white text-[8px] text-white font-black">
              ✓
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-violet-800 transition-colors">PROPOSÉ PAR</p>
            <p className="text-xl font-black text-gray-900 leading-tight">{pulseur.name} <span className="text-violet-800 ml-1">★ {pulseur.rating}</span></p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-violet-50 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-5 h-5 text-gray-300 group-hover:text-violet-800 transition-transform group-hover:translate-x-1">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </motion.button>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-12">
          {/* Chat button - only for participants */}
          {isParticipating && onOpenChat && (
            <button
              onClick={onOpenChat}
              className="flex-1 flex items-center justify-center gap-3 py-4 bg-violet-50 text-violet-800 rounded-2xl font-bold text-sm transition-all active:scale-95 border border-violet-100"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Chat du groupe
            </button>
          )}

          {/* Report button - only for non-owners */}
          {!isOwner && onReport && (
            <button
              onClick={onReport}
              className="w-14 h-14 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center transition-all active:scale-90 hover:bg-red-50 hover:text-red-400"
              title="Signaler"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                <path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        <div className="space-y-12">
          <section>
            <h3 className="text-[10px] font-black text-violet-900/30 uppercase tracking-[0.3em] mb-4">L'EXPÉRIENCE</h3>
            <p className="text-gray-600 leading-relaxed text-2xl font-bold mb-6 italic">
              "{pulse.description}"
            </p>
            
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => (
                <span key={idx} className="text-[10px] font-black text-violet-800 bg-violet-50 px-4 py-2 rounded-xl uppercase tracking-widest border border-violet-100">
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-5">
            <div className="bg-violet-50 p-7 rounded-[40px] border border-violet-100">
               <p className="text-[10px] font-black text-violet-300 uppercase mb-3 tracking-widest">HORAIRE</p>
               <p className="font-black text-gray-800 text-lg leading-tight">
                 {new Date(pulse.startTime).toLocaleDateString('fr-FR', { weekday: 'long' })}<br/>
                 {new Date(pulse.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
               </p>
            </div>
            <div className="bg-violet-50 p-7 rounded-[40px] border border-violet-100">
               <p className="text-[10px] font-black text-violet-300 uppercase mb-3 tracking-widest">SQUAD</p>
               <p className="font-black text-gray-800 text-2xl">{pulse.participants.length} <span className="text-violet-200">/</span> {pulse.capacity}</p>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black text-violet-900/30 uppercase tracking-[0.3em] mb-5">SPOT</h3>
            <div className="flex items-center gap-6 bg-gray-50 p-7 rounded-[45px]">
               <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center shadow-xl">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-8 h-8 text-violet-800">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
               </div>
               <div>
                  <p className="font-black text-gray-800 text-lg leading-snug">{pulse.location.address.split(',')[0]}</p>
                  <p className="text-xs text-gray-400 font-bold">{pulse.location.address.split(',')[1]}</p>
               </div>
            </div>
          </section>
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-8 bg-white/95 backdrop-blur-2xl border-t border-gray-100 z-50 rounded-t-[50px]">
        {isPastPulse && isParticipating && !isOwner ? (
          // Past pulse - show rating option
          <div className="space-y-4">
            {canRate && onRate ? (
              <button
                onClick={() => setShowRatingModal(true)}
                className="w-full py-7 bg-amber-500 text-white rounded-[40px] text-xl font-black shadow-[0_20px_50px_rgba(245,158,11,0.4)] transition-all active:scale-95 transform hover:bg-amber-600 uppercase tracking-tighter flex items-center justify-center gap-3"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                NOTER CETTE EXPÉRIENCE
              </button>
            ) : hasRated ? (
              <div className="w-full py-7 bg-green-50 text-green-600 rounded-[40px] text-center font-black text-xl flex items-center justify-center gap-3">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
                DÉJÀ NOTÉ
              </div>
            ) : (
              <div className="w-full py-7 bg-gray-100 text-gray-400 rounded-[40px] text-center font-black text-xl">
                TERMINÉ
              </div>
            )}
          </div>
        ) : !isParticipating ? (
          <button
            onClick={onJoin}
            disabled={isPastPulse}
            className="w-full py-7 bg-violet-800 text-white rounded-[40px] text-2xl font-black shadow-[0_20px_50px_rgba(91,33,182,0.4)] transition-all active:scale-95 transform hover:bg-violet-900 uppercase tracking-tighter disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPastPulse ? 'PULSE TERMINÉ' : 'PULSER MAINTENANT'}
          </button>
        ) : (
          <div className="flex gap-5">
             <div className="flex-1 py-7 bg-violet-50 text-violet-800 rounded-[40px] text-center font-black text-xl flex items-center justify-center gap-3">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
                JOINED
             </div>
             {!isPastPulse && (
               <button
                onClick={onCancel}
                className="px-10 py-7 bg-red-50 text-red-400 rounded-[40px] font-black transition-all hover:bg-red-500 hover:text-white active:scale-90"
               >
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-7 h-7">
                   <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                 </svg>
               </button>
             )}
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {onRate && (
        <RatingModal
          isOpen={showRatingModal}
          pulseurName={pulseur.name}
          pulseTitle={pulse.title}
          onSubmit={onRate}
          onClose={() => setShowRatingModal(false)}
        />
      )}
    </motion.div>
  );
};

export default PulseDetail;
