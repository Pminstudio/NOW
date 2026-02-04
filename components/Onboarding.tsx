
import React, { useState } from 'react';
import { UserProfile, Interest } from '../types';
import { INTERESTS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);

  const toggleInterest = (interest: Interest) => {
    setSelectedInterests(prev => 
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleFinalize = () => {
    onComplete({
      id: Math.random().toString(36).substr(2, 9),
      name,
      bio: "Prêt à pulser !",
      avatar: `https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&h=200`,
      interests: selectedInterests,
      isPulseur: false
    });
  };

  const backgrounds = [
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80"
  ];

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden bg-violet-950">
      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          initial={{ opacity: 0, scale: 1.15 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${backgrounds[step - 1]}')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-violet-950/90 via-violet-950/40 to-violet-950" />
        </motion.div>
      </AnimatePresence>
      
      <div className="relative z-10 w-full px-8 flex flex-col h-full pt-20 pb-10">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 40 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              className="flex-1 flex flex-col justify-between"
            >
              <div>
                <h1 className="text-7xl font-black text-white mb-4 tracking-tighter italic leading-none">NOW.</h1>
                <p className="text-2xl text-violet-100 font-bold leading-none tracking-tight">
                  Stop scrolling.<br/>
                  <span className="text-violet-400">Start pulsing.</span>
                </p>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ton prénom"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-8 py-6 rounded-[35px] bg-white shadow-3xl border-none focus:ring-8 focus:ring-violet-500/20 text-xl transition-all font-black placeholder:text-gray-300"
                  />
                </div>
                <button
                  disabled={!name}
                  onClick={() => setStep(2)}
                  className="w-full py-6 bg-violet-700 text-white rounded-[35px] text-2xl font-black shadow-2xl active:scale-95 transition-all transform hover:bg-violet-600 uppercase tracking-tighter italic"
                >
                  Suivant
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 60 }} 
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="mb-6 shrink-0">
                <h2 className="text-4xl font-black text-white mb-2 tracking-tighter italic">TES VIBES ?</h2>
                <p className="text-violet-200 font-bold text-lg leading-snug">Choisis ce qui te fait vibrer maintenant.</p>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide mb-6 pr-1">
                <div className="grid grid-cols-2 gap-3">
                  {INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`p-4 rounded-[25px] text-[10px] font-black border-2 transition-all flex items-center justify-center text-center uppercase tracking-widest ${
                        selectedInterests.includes(interest)
                          ? 'bg-white border-white text-violet-950 shadow-2xl scale-105'
                          : 'bg-white/10 border-white/20 text-white backdrop-blur-xl'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <div className="shrink-0">
                <button
                  disabled={selectedInterests.length === 0}
                  onClick={handleFinalize}
                  className="w-full py-6 bg-white text-violet-950 rounded-[35px] text-2xl font-black shadow-2xl disabled:opacity-50 active:scale-95 transition-all uppercase tracking-tighter italic"
                >
                  Go Pulse !
                </button>
                <button 
                  onClick={() => setStep(1)}
                  className="w-full mt-4 text-white/40 font-black text-[10px] uppercase tracking-[0.4em]"
                >
                  Retour
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
