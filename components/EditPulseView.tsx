import React, { useState } from 'react';
import { Pulse, Interest } from '../types';
import { INTERESTS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import ImagePicker from './ui/ImagePicker';
import LocationPicker from './ui/LocationPicker';

interface EditPulseViewProps {
  pulse: Pulse;
  onSave: (pulseId: string, updates: Partial<Omit<Pulse, 'id' | 'participants' | 'pulseurId'>>) => Promise<{ error: Error | null }>;
  onDelete: (pulseId: string) => Promise<{ error: Error | null }>;
  onBack: () => void;
  userLocation: { lat: number; lng: number };
}

const VIBES = ['Chill', 'Intense', 'Social', 'Culturel', 'Sportif', 'Zen', 'Afterwork', 'Nocturne'];

const PRESET_IMAGES: Record<string, string> = {
  'Sport': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
  'Chill': 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80',
  'Culture': 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?auto=format&fit=crop&w=800&q=80',
  'Food': 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=800&q=80',
  'Action': 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80'
};

const EditPulseView: React.FC<EditPulseViewProps> = ({ pulse, onSave, onDelete, onBack, userLocation }) => {
  const [title, setTitle] = useState(pulse.title);
  const [type, setType] = useState<Interest>(pulse.type);
  const [description, setDescription] = useState(pulse.description);
  const [capacity, setCapacity] = useState(pulse.capacity);
  const [price, setPrice] = useState<number>(pulse.price || 0);
  const [isPaid, setIsPaid] = useState((pulse.price || 0) > 0);
  const [selectedVibes, setSelectedVibes] = useState<string[]>(pulse.tags || []);
  const [imageUrl, setImageUrl] = useState(pulse.imageUrl);
  const [location, setLocation] = useState(pulse.location);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleVibe = (vibe: string) => {
    setSelectedVibes(prev =>
      prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setIsSubmitting(true);
    setError(null);

    const updates: Partial<Omit<Pulse, 'id' | 'participants' | 'pulseurId'>> = {
      title,
      type,
      description,
      capacity,
      imageUrl,
      location,
      price: isPaid ? price : 0,
      tags: selectedVibes
    };

    const { error: saveError } = await onSave(pulse.id, updates);

    setIsSubmitting(false);

    if (saveError) {
      setError(saveError.message);
    } else {
      setIsSuccess(true);
      setTimeout(() => onBack(), 2000);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    const { error: deleteError } = await onDelete(pulse.id);

    setIsDeleting(false);

    if (deleteError) {
      setError(deleteError.message);
      setShowDeleteConfirm(false);
    } else {
      setIsSuccess(true);
      setTimeout(() => onBack(), 1500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="absolute inset-0 bg-white z-[70] flex flex-col overflow-hidden"
    >
      {/* Success Overlay */}
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
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
            <h2 className="text-6xl font-black text-white mb-6 tracking-tighter italic">
              {showDeleteConfirm ? 'SUPPRIMÉ.' : 'MIS À JOUR.'}
            </h2>
            <p className="text-violet-300 font-bold text-xl leading-tight">
              {showDeleteConfirm ? 'Ton pulse a été supprimé.' : 'Ton pulse a été modifié.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && !isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-8"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[50px] p-10 w-full max-w-sm text-center relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="absolute top-6 right-6 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 transition-all active:scale-90 hover:bg-gray-200"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10 text-red-400">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Supprimer ce pulse ?</h3>
              <p className="text-gray-400 text-sm font-bold mb-8">
                Cette action est irréversible. Les participants seront notifiés.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 py-5 bg-gray-100 text-gray-600 rounded-[25px] font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-5 bg-red-500 text-white rounded-[25px] font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
                >
                  {isDeleting ? (
                    <div className="flex gap-1.5 justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  ) : (
                    'Supprimer'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-50 bg-white/80 backdrop-blur-md z-10">
        <button
          onClick={onBack}
          disabled={isSubmitting || isDeleting}
          className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-gray-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-6 h-6 text-gray-900">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-[10px] font-black text-violet-950/30 tracking-[0.6em] uppercase">Modifier Pulse</h1>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isSubmitting || isDeleting}
          className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-red-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6 text-red-400">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-8 pt-8 pb-40 space-y-12">
          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-100 text-red-500 p-5 rounded-3xl text-sm font-bold text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Image Section */}
          <section>
            <label className="block text-[10px] font-black text-violet-900/30 uppercase mb-5 tracking-[0.3em] ml-4">Visuel du Pulse</label>
            <ImagePicker
              currentImage={imageUrl}
              onImageSelected={setImageUrl}
              userId={pulse.pulseurId}
              bucket="pulse-images"
              presetImages={PRESET_IMAGES}
            />
          </section>

          {/* Basic Info */}
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

          {/* Location */}
          <section>
            <label className="block text-[10px] font-black text-violet-900/30 uppercase mb-5 tracking-[0.3em] ml-4">Lieu du Pulse</label>
            <LocationPicker
              onLocationSelected={setLocation}
              initialLocation={pulse.location}
              userLocation={userLocation}
            />
          </section>

          {/* Classification */}
          <section>
            <label className="block text-[10px] font-black text-violet-900/30 uppercase mb-6 tracking-[0.3em] ml-4">Classification & Vibes</label>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-1">
              {INTERESTS.map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setType(i)}
                  className={`flex-shrink-0 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${type === i
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
                  className={`px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest border transition-all ${selectedVibes.includes(v)
                    ? 'bg-violet-100 border-violet-200 text-violet-800'
                    : 'bg-gray-50 border-gray-100 text-gray-400'
                    }`}
                >
                  #{v}
                </button>
              ))}
            </div>
          </section>

          {/* Squad & Price */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-violet-50 rounded-[40px] p-8 border border-violet-100">
              <label className="block text-[9px] font-black text-violet-300 uppercase mb-4 tracking-widest">Capacité Squad</label>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setCapacity(Math.max(2, capacity - 1))} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-violet-800">-</button>
                <span className="text-3xl font-black text-violet-950">{capacity}</span>
                <button type="button" onClick={() => setCapacity(Math.min(100, capacity + 1))} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-violet-800">+</button>
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

          {/* Participants Info */}
          <div className="bg-violet-50 rounded-[40px] p-8 border border-violet-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Participants actuels</p>
                <p className="text-3xl font-black text-violet-950">{pulse.participants.length} / {pulse.capacity}</p>
              </div>
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-violet-400">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
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
                <span>SAUVEGARDER</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-7 h-7">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default EditPulseView;
