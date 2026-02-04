
import React, { useState } from 'react';
import { UserProfile, Pulse, Interest } from '../types';
import { INTERESTS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface PulseurSpaceProps {
  user: UserProfile;
  onBack: () => void;
  onCreate: (pulse: Pulse) => void;
}

const VIBES = ['Chill', 'Intense', 'Social', 'Culturel', 'Sportif', 'Zen', 'Afterwork', 'Nocturne'];

const PRESET_IMAGES: Record<string, string> = {
  'Sport': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
  'Chill': 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80',
  'Culture': 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?auto=format&fit=crop&w=800&q=80',
  'Food': 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=800&q=80',
  'Action': 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80'
};

const PulseurSpace: React.FC<PulseurSpaceProps> = ({ user, onBack, onCreate }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Interest>(INTERESTS[0]);
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(10);
  const [price, setPrice] = useState<number>(0);
  const [isPaid, setIsPaid] = useState(false);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES['Sport']);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const toggleVibe = (vibe: string) => {
    setSelectedVibes(prev => 
      prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 2200));

    const newPulse: Pulse = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      type,
      description,
      pulseurId: user.id,
      startTime: new Date().toISOString(),
      location: { lat: 43.2965, lng: 5.3698, address: "Marseille, Centre-Ville" },
      capacity,
      participants: [],
      imageUrl,
      price: isPaid ? price : 0,
      tags: selectedVibes
    };

    setIsSubmitting(false);
    setIsSuccess(true);
    setTimeout(() => onCreate(newPulse), 2500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="absolute inset-0 bg-white z-[70] flex flex-col overflow-hidden"
    >
      <AnimatePresence>
        {isSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-violet-950 flex flex-col items-center justify-center p-12 text-center"
          >
            <motion.div 
              initial={{ scale: 0.2, rotate: 180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-48 h-48 bg-white rounded-[70px] flex items-center justify-center shadow-4xl mb-16"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#2e1065" strokeWidth="6" className="w-24 h-24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
            <h2 className="text-7xl font-black text-white mb-6 tracking-tighter italic">PULSÉ.</h2>
            <p className="text-violet-300 font-bold text-2xl leading-tight">
              Ta nouvelle énergie est<br/>maintenant en ligne.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-50 bg-white/80 backdrop-blur-md z-10">
        <button 
          onClick={onBack} 
          disabled={isSubmitting}
          className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-gray-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-6 h-6 text-gray-900">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-[10px] font-black text-violet-950/30 tracking-[0.6em] uppercase">Pulseur Studio</h1>
        <div className="w-14" />
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-8 pt-8 pb-40 space-y-12">
          
          {/* Section Image */}
          <section>
             <label className="block text-[10px] font-black text-violet-900/30 uppercase mb-5 tracking-[0.3em] ml-4">Visuel du Pulse</label>
             <div className="relative w-full h-72 rounded-[45px] bg-gray-100 overflow-hidden shadow-2xl group">
                <img src={imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Preview" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 flex gap-2 overflow-x-auto scrollbar-hide">
                   {Object.entries(PRESET_IMAGES).map(([name, url]) => (
                     <button 
                       key={name}
                       type="button"
                       onClick={() => setImageUrl(url)}
                       className={`flex-shrink-0 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all ${imageUrl === url ? 'bg-white border-white text-violet-950' : 'bg-white/10 border-white/20 text-white backdrop-blur-md'}`}
                     >
                       {name}
                     </button>
                   ))}
                </div>
             </div>
          </section>

          {/* Info de base */}
          <div className="space-y-8">
            <div className="bg-gray-50 rounded-[45px] p-8">
              <label className="block text-[10px] font-black text-violet-900/20 uppercase mb-4 tracking-[0.3em] ml-2">Titre de l'expérience</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-transparent border-none p-0 focus:ring-0 text-3xl font-black placeholder:text-gray-200 tracking-tight text-violet-950"
                placeholder="Donne un nom à ta vibe"
                required
              />
            </div>

            <div className="bg-gray-50 rounded-[45px] p-8">
              <label className="block text-[10px] font-black text-violet-900/20 uppercase mb-4 tracking-[0.3em] ml-2">Le Manifesto</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-transparent border-none p-0 focus:ring-0 text-xl font-bold placeholder:text-gray-200 h-32 resize-none leading-tight tracking-tight text-gray-700"
                placeholder="Raconte ce qu'il va se passer..."
                required
              />
            </div>
          </div>

          {/* Classification */}
          <section>
            <label className="block text-[10px] font-black text-violet-900/30 uppercase mb-6 tracking-[0.3em] ml-4">Classification & Vibes</label>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-1">
              {INTERESTS.map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setType(i)}
                  className={`flex-shrink-0 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${
                    type === i 
                      ? 'bg-violet-950 border-violet-950 text-white shadow-xl scale-105' 
                      : 'bg-white border-violet-50 text-gray-400'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
               {VIBES.map(v => (
                 <button
                  key={v}
                  type="button"
                  onClick={() => toggleVibe(v)}
                  className={`px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest border transition-all ${
                    selectedVibes.includes(v)
                      ? 'bg-violet-100 border-violet-200 text-violet-800'
                      : 'bg-gray-50 border-gray-100 text-gray-400'
                  }`}
                 >
                   #{v}
                 </button>
               ))}
            </div>
          </section>

          {/* Squad & Prix */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-violet-50 rounded-[40px] p-8 border border-violet-100">
               <label className="block text-[9px] font-black text-violet-300 uppercase mb-4 tracking-widest">Capacité Squad</label>
               <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setCapacity(Math.max(2, capacity-1))} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-violet-800">-</button>
                  <span className="text-3xl font-black text-violet-950">{capacity}</span>
                  <button type="button" onClick={() => setCapacity(Math.min(100, capacity+1))} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-violet-800">+</button>
               </div>
            </div>

            <div className={`rounded-[40px] p-8 border transition-colors ${isPaid ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
               <div className="flex justify-between items-center mb-4">
                  <label className={`text-[9px] font-black uppercase tracking-widest ${isPaid ? 'text-green-600' : 'text-gray-300'}`}>Prix (€)</label>
                  <button 
                    type="button" 
                    onClick={() => setIsPaid(!isPaid)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${isPaid ? 'bg-green-500' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isPaid ? 'left-5' : 'left-0.5'}`} />
                  </button>
               </div>
               {isPaid ? (
                 <input 
                   type="number" 
                   value={price}
                   onChange={e => setPrice(Number(e.target.value))}
                   className="w-full bg-transparent border-none p-0 focus:ring-0 text-3xl font-black text-green-700"
                 />
               ) : (
                 <span className="text-2xl font-black text-gray-300 uppercase tracking-tighter italic">Gratuit</span>
               )}
            </div>
          </div>
        </div>

        {/* Action Bottom */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-8 bg-white/95 backdrop-blur-2xl border-t border-gray-50 z-20 rounded-t-[50px]">
          <button 
            type="submit"
            disabled={isSubmitting || !title || !description}
            className="w-full py-8 bg-violet-950 text-white rounded-[40px] text-3xl font-black shadow-[0_20px_50px_rgba(46,16,101,0.3)] transition-all active:scale-95 disabled:opacity-50 transform hover:bg-black uppercase tracking-tighter italic flex items-center justify-center gap-4"
          >
            {isSubmitting ? (
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" />
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            ) : (
              <>
                <span>PROPULSER</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-7 h-7">
                  <path d="M5 12h14m-7-7l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default PulseurSpace;
