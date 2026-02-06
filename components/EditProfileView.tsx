import React, { useState, useRef } from 'react';
import { UserProfile, Interest } from '../types';
import { INTERESTS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { compressImage, uploadImage } from '../src/services/imageUpload';

interface EditProfileViewProps {
  profile: UserProfile;
  onSave: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  onBack: () => void;
}

const AVATAR_STYLES = ['avataaars', 'bottts', 'lorelei', 'notionists', 'shapes', 'thumbs'];

const EditProfileView: React.FC<EditProfileViewProps> = ({ profile, onSave, onBack }) => {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>(profile.interests);
  const [avatarStyle, setAvatarStyle] = useState('avataaars');
  const [avatarSeed, setAvatarSeed] = useState(profile.id);
  const [customAvatar, setCustomAvatar] = useState<string | null>(
    profile.avatar.includes('dicebear') ? null : profile.avatar
  );
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();
  const generatedAvatar = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${avatarSeed}`;
  const currentAvatar = customAvatar || generatedAvatar;

  const toggleInterest = (interest: Interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const regenerateAvatar = () => {
    setAvatarSeed(`${profile.id}-${Date.now()}`);
    setCustomAvatar(null);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadAvatarFile(file);
  };

  const uploadAvatarFile = async (file: File) => {
    setIsUploadingAvatar(true);
    try {
      const compressedFile = await compressImage(file, 400, 400, 0.9);
      const { url, error: uploadError } = await uploadImage(compressedFile, 'avatars', profile.id);

      if (uploadError) throw uploadError;
      if (url) {
        setCustomAvatar(url);
        setShowAvatarModal(false);
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      setError('Erreur lors de l\'upload de la photo');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCameraCapture = async (source: CameraSource) => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source,
        width: 400,
        height: 400,
      });

      if (image.dataUrl) {
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        await uploadAvatarFile(file);
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Le nom est requis');
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: saveError } = await onSave({
      name: name.trim(),
      bio: bio.trim(),
      avatar: currentAvatar,
      interests: selectedInterests,
    });

    setIsLoading(false);

    if (saveError) {
      setError(saveError.message);
    } else {
      setIsSuccess(true);
      setTimeout(() => onBack(), 1500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="absolute inset-0 bg-white z-[80] flex flex-col overflow-hidden"
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
              transition={{ type: 'spring', damping: 12 }}
              className="w-48 h-48 bg-white rounded-[70px] flex items-center justify-center shadow-4xl mb-16"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#2e1065" strokeWidth="6" className="w-24 h-24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
            <h2 className="text-6xl font-black text-white mb-6 tracking-tighter italic">SAUVÉ.</h2>
            <p className="text-violet-300 font-bold text-xl leading-tight">
              Ton profil a été mis à jour.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-50 bg-white/80 backdrop-blur-md z-10">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-gray-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-6 h-6 text-gray-900">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-[10px] font-black text-violet-950/30 tracking-[0.6em] uppercase">Modifier Profil</h1>
        <div className="w-14" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-8 pt-8 pb-40 space-y-10">
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-100 text-red-500 p-5 rounded-3xl text-sm font-bold text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Avatar Section */}
          <section className="text-center">
            <div className="inline-block relative">
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="w-40 h-40 rounded-[55px] overflow-hidden border-[6px] border-violet-100 shadow-2xl bg-gray-100 mx-auto block group"
              >
                <img src={currentAvatar} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="Avatar" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[49px]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-10 h-10">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
              {customAvatar && (
                <button
                  type="button"
                  onClick={regenerateAvatar}
                  className="absolute -bottom-2 -right-2 w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all border border-gray-200"
                  title="Utiliser un avatar généré"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-500">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>

            <p className="mt-4 text-[10px] font-bold text-violet-400 uppercase tracking-widest">
              Appuie pour changer
            </p>

            {/* Avatar Style Selector (only for generated avatars) */}
            {!customAvatar && (
              <div className="mt-6 flex gap-2 justify-center flex-wrap">
                {AVATAR_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setAvatarStyle(style)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                      avatarStyle === style
                        ? 'bg-violet-950 border-violet-950 text-white'
                        : 'bg-white border-violet-100 text-violet-300'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Name Input */}
          <div className="bg-gray-50 rounded-[45px] p-8">
            <label className="block text-[10px] font-black text-violet-900/20 uppercase mb-4 tracking-[0.3em] ml-2">
              Prénom / Pseudo
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border-none p-0 focus:ring-0 text-3xl font-black placeholder:text-gray-200 tracking-tight text-violet-950"
              placeholder="Ton nom"
              required
            />
          </div>

          {/* Bio Input */}
          <div className="bg-gray-50 rounded-[45px] p-8">
            <label className="block text-[10px] font-black text-violet-900/20 uppercase mb-4 tracking-[0.3em] ml-2">
              Ton Manifesto
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-transparent border-none p-0 focus:ring-0 text-xl font-bold placeholder:text-gray-200 h-32 resize-none leading-tight tracking-tight text-gray-700"
              placeholder="Décris ta vibe en quelques mots..."
            />
          </div>

          {/* Interests Section */}
          <section>
            <label className="block text-[10px] font-black text-violet-900/30 uppercase mb-6 tracking-[0.3em] ml-4">
              Tes Vibes ({selectedInterests.length} sélectionnées)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {INTERESTS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`p-4 rounded-[25px] text-[10px] font-black border-2 transition-all flex items-center justify-center text-center uppercase tracking-widest ${
                    selectedInterests.includes(interest)
                      ? 'bg-violet-950 border-violet-950 text-white shadow-xl scale-105'
                      : 'bg-white border-violet-50 text-gray-400'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-8 bg-white/95 backdrop-blur-2xl border-t border-gray-50 z-20 rounded-t-[50px]">
          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="w-full py-8 bg-violet-950 text-white rounded-[40px] text-3xl font-black shadow-[0_20px_50px_rgba(46,16,101,0.3)] transition-all active:scale-95 disabled:opacity-50 transform hover:bg-black uppercase tracking-tighter italic flex items-center justify-center gap-4"
          >
            {isLoading ? (
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

      {/* Avatar Selection Modal */}
      <AnimatePresence>
        {showAvatarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end justify-center"
            onClick={() => !isUploadingAvatar && setShowAvatarModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-white rounded-t-[50px] p-8 pb-12"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="w-10" />
                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                <button
                  onClick={() => !isUploadingAvatar && setShowAvatarModal(false)}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 transition-all active:scale-90 hover:bg-gray-200"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              <h3 className="text-2xl font-black text-center text-violet-950 mb-8 tracking-tight">
                Changer l'avatar
              </h3>

              {isUploadingAvatar ? (
                <div className="py-8 flex flex-col items-center">
                  <div className="flex gap-2 mb-4">
                    <div className="w-3 h-3 bg-violet-600 rounded-full animate-bounce" />
                    <div className="w-3 h-3 bg-violet-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-3 h-3 bg-violet-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <p className="text-violet-600 font-black text-[10px] uppercase tracking-widest">
                    Upload en cours...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Upload photo options */}
                  {isNative ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCameraCapture(CameraSource.Camera)}
                        className="w-full flex items-center gap-5 p-5 bg-violet-50 rounded-[25px] border border-violet-100 active:scale-95 transition-all"
                      >
                        <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-violet-600">
                            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="font-black text-violet-950">Prendre une photo</p>
                          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Selfie avec l'appareil photo</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCameraCapture(CameraSource.Photos)}
                        className="w-full flex items-center gap-5 p-5 bg-violet-50 rounded-[25px] border border-violet-100 active:scale-95 transition-all"
                      >
                        <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-violet-600">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="8.5" cy="8.5" r="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="font-black text-violet-950">Galerie</p>
                          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Choisir depuis la galerie</p>
                        </div>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-5 p-5 bg-violet-50 rounded-[25px] border border-violet-100 active:scale-95 transition-all"
                    >
                      <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-violet-600">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="font-black text-violet-950">Uploader une photo</p>
                        <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Depuis ton appareil</p>
                      </div>
                    </button>
                  )}

                  {/* Generated avatar option */}
                  <button
                    type="button"
                    onClick={() => {
                      regenerateAvatar();
                      setShowAvatarModal(false);
                    }}
                    className="w-full flex items-center gap-5 p-5 bg-gray-50 rounded-[25px] border border-gray-100 active:scale-95 transition-all"
                  >
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-gray-500">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-gray-700">Avatar généré</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Générer un nouvel avatar</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAvatarModal(false)}
                    className="w-full py-5 bg-gray-100 text-gray-500 rounded-[25px] font-black text-sm uppercase tracking-widest mt-4"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EditProfileView;
