
import React, { useState } from 'react';
import { Pulse } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface MyPulsesViewProps {
  reservations: Pulse[];
  onBack: () => void;
  onPulseClick: (pulse: Pulse) => void;
  onCancelPulse: (pulseId: string) => void;
}

const MyPulsesView: React.FC<MyPulsesViewProps> = ({ 
  reservations, 
  onBack, 
  onPulseClick, 
  onCancelPulse 
}) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // For simulation, we assume today is 2024-05-20
  const upcomingPulses = reservations.filter(p => new Date(p.startTime) >= new Date('2024-05-20'));
  const pastPulses = reservations.filter(p => new Date(p.startTime) < new Date('2024-05-20'));

  const displayedPulses = activeTab === 'upcoming' ? upcomingPulses : pastPulses;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="absolute inset-0 bg-[#FDFCFF] z-[80] flex flex-col overflow-hidden"
    >
      {/* Dynamic Header */}
      <div className="p-8 pb-6 flex items-center justify-between bg-white/50 backdrop-blur-md border-b border-violet-50">
        <button 
          onClick={onBack} 
          className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-violet-100 shadow-xl"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-6 h-6 text-violet-950">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-[10px] font-black text-violet-950 tracking-[0.5em] uppercase opacity-30">Mes Activités</h1>
        <div className="w-14" />
      </div>

      <div className="flex-1 overflow-y-auto px-8 pt-8 pb-32 scrollbar-hide">
        <div className="mb-12">
          <h2 className="text-5xl font-black text-violet-950 tracking-tighter italic leading-none uppercase">Mon<br/>Planning.</h2>
          <div className="mt-8 flex gap-4 p-1.5 bg-violet-50 rounded-[24px] border border-violet-100/50">
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'upcoming' ? 'bg-white text-violet-950 shadow-lg' : 'text-violet-300'}`}
            >
              À Venir ({upcomingPulses.length})
            </button>
            <button 
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'past' ? 'bg-white text-violet-950 shadow-lg' : 'text-violet-300'}`}
            >
              Historique
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {displayedPulses.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-14 rounded-[50px] border-2 border-dashed border-violet-100 flex flex-col items-center text-center"
              >
                <div className="w-24 h-24 bg-violet-50 rounded-full flex items-center justify-center mb-8">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12 text-violet-200">
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                   </svg>
                </div>
                <p className="text-violet-950 font-black uppercase text-[12px] tracking-widest mb-2 italic">Rien de prévu ici</p>
                <p className="text-violet-300 text-[10px] font-bold uppercase tracking-widest mb-8">Ne laisse pas le temps défiler sans pulser.</p>
                <button 
                  onClick={onBack}
                  className="px-8 py-4 bg-violet-950 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >
                  Découvrir des pulses
                </button>
              </motion.div>
            ) : (
              displayedPulses.map((pulse) => (
                <motion.div 
                  key={pulse.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, x: 100 }}
                  className="group relative bg-white rounded-[50px] shadow-[0_20px_60px_-15px_rgba(76,29,149,0.08)] border border-violet-50/50 overflow-hidden"
                >
                  <div className="flex p-6 gap-6 items-center">
                    <button 
                      onClick={() => onPulseClick(pulse)}
                      className="w-24 h-24 rounded-[32px] overflow-hidden flex-shrink-0 shadow-lg group-active:scale-95 transition-all"
                    >
                      <img src={pulse.imageUrl} className="w-full h-full object-cover" alt="" />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-2">
                          <span className="bg-violet-950 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">
                            {pulse.type}
                          </span>
                          {activeTab === 'upcoming' && (
                            <span className="bg-green-100 text-green-600 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">
                              CONFIRMÉ
                            </span>
                          )}
                       </div>
                       <h3 className="text-xl font-black text-violet-950 leading-tight mb-2 truncate group-hover:text-violet-800 transition-colors">
                         {pulse.title}
                       </h3>
                       <p className="text-[10px] font-bold text-violet-300 uppercase tracking-tighter">
                         {new Date(pulse.startTime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })} • {new Date(pulse.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                       </p>
                    </div>

                    {activeTab === 'upcoming' && (
                      <button 
                        onClick={() => onCancelPulse(pulse.id)}
                        className="w-14 h-14 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center active:scale-90 transition-all hover:bg-red-500 hover:text-white group/cancel"
                        title="Annuler ma réservation"
                      >
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-6 h-6">
                          <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {activeTab === 'upcoming' && (
                    <div className="h-1 bg-violet-100 w-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        className="h-full bg-violet-950"
                      />
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default MyPulsesView;
