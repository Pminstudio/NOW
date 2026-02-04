
import React from 'react';
import { Pulse, Pulseur, Interest } from '../types';
import { motion } from 'framer-motion';

interface PulseDetailProps {
  pulse: Pulse;
  pulseur: Pulseur;
  isParticipating: boolean;
  onJoin: () => void;
  onCancel: () => void;
  onBack: () => void;
  onPulseurClick: (pulseur: Pulseur) => void;
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
  onJoin, 
  onCancel, 
  onBack,
  onPulseurClick
}) => {
  const tags = getTagsForType(pulse.type);

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
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-white" />
        
        <button 
          onClick={onBack}
          className="absolute top-8 left-8 w-14 h-14 bg-white/20 backdrop-blur-2xl border border-white/30 rounded-3xl flex items-center justify-center text-white shadow-2xl transition-all active:scale-90"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-7 h-7">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
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
          className="w-full flex items-center gap-5 mb-12 bg-white p-6 rounded-[45px] transition-all text-left border border-gray-100 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] group"
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
        {!isParticipating ? (
          <button 
            onClick={onJoin}
            className="w-full py-7 bg-violet-800 text-white rounded-[40px] text-2xl font-black shadow-[0_20px_50px_rgba(91,33,182,0.4)] transition-all active:scale-95 transform hover:bg-violet-900 uppercase tracking-tighter"
          >
            PULSER MAINTENANT
          </button>
        ) : (
          <div className="flex gap-5">
             <div className="flex-1 py-7 bg-violet-50 text-violet-800 rounded-[40px] text-center font-black text-xl flex items-center justify-center gap-3">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
                JOINED
             </div>
             <button 
              onClick={onCancel}
              className="px-10 py-7 bg-red-50 text-red-400 rounded-[40px] font-black transition-all hover:bg-red-500 hover:text-white active:scale-90"
             >
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-7 h-7">
                 <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
             </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PulseDetail;
