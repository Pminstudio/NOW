import React, { useState, useRef } from 'react';
import { UserProfile, Pulseur, Pulse } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { compressImage, uploadImage } from '../src/services/imageUpload';
import SubscriptionSection from './SubscriptionSection';
import { UserSubscription, SubscriptionPlan, PlanLimits } from '../src/hooks/useSubscription';

interface ProfileViewProps {
  profile: UserProfile | Pulseur;
  pulses: Pulse[];
  isCurrentUser: boolean;
  onBack: () => void;
  onPulseClick?: (pulse: Pulse) => void;
  onReservationsClick?: () => void;
  onSignOut?: () => void;
  onEditProfile?: () => void;
  onSendMessage?: () => void;
  onUpdateProfile?: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  // Subscription props (only for current user)
  subscription?: UserSubscription | null;
  currentPlan?: SubscriptionPlan | null;
  limits?: PlanLimits;
  isPremium?: boolean;
  onUpgrade?: () => void;
  onManageSubscription?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  pulses,
  isCurrentUser,
  onBack,
  onPulseClick,
  onReservationsClick,
  onSignOut,
  onEditProfile,
  onSendMessage,
  subscription,
  currentPlan,
  limits,
  isPremium = false,
  onUpgrade,
  onManageSubscription,
  onUpdateProfile
}) => {
  const isPulseur = 'rating' in profile;
  const activePulses = pulses.filter(p => p.pulseurId === profile.id);
  const isNative = Capacitor.isNativePlatform();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avatar upload state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Pseudo edit state
  const [showPseudoModal, setShowPseudoModal] = useState(false);
  const [editingName, setEditingName] = useState(profile.name);
  const [isSavingName, setIsSavingName] = useState(false);

  const profileBg = isCurrentUser
    ? "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
    : "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80";

  // Avatar upload handlers
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadAvatarFile(file);
  };

  const uploadAvatarFile = async (file: File) => {
    if (!onUpdateProfile) return;
    setIsUploadingAvatar(true);
    try {
      const compressedFile = await compressImage(file, 400, 400, 0.9);
      const { url, error: uploadError } = await uploadImage(compressedFile, 'avatars', profile.id);
      if (uploadError) throw uploadError;
      if (url) {
        await onUpdateProfile({ avatar: url });
        setShowAvatarModal(false);
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
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

  // Pseudo save handler
  const handleSavePseudo = async () => {
    if (!onUpdateProfile || !editingName.trim()) return;
    setIsSavingName(true);
    const { error } = await onUpdateProfile({ name: editingName.trim() });
    setIsSavingName(false);
    if (!error) {
      setShowPseudoModal(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      className="absolute inset-0 bg-white z-[70] flex flex-col overflow-y-auto scrollbar-hide"
    >
      {/* Fixed Header Buttons */}
      <div className="sticky top-0 z-20 p-6 flex justify-between items-center">
        <button
          onClick={onBack}
          className="w-14 h-14 bg-white/20 backdrop-blur-2xl border border-white/30 rounded-2xl flex items-center justify-center transition-all active:scale-90 text-white shadow-2xl"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-7 h-7">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {isCurrentUser && onEditProfile && (
          <button
            onClick={onEditProfile}
            className="w-14 h-14 bg-white/20 backdrop-blur-2xl border border-white/30 rounded-2xl flex items-center justify-center transition-all active:scale-90 text-white shadow-2xl"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="relative h-80 w-full overflow-hidden -mt-[68px]">
        <img src={profileBg} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/60 to-white" />

        <div className="absolute -bottom-16 left-10 flex items-end gap-8">
          <div className="relative">
            {isCurrentUser && onUpdateProfile ? (
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="w-44 h-44 rounded-[55px] overflow-hidden shadow-4xl border-[8px] border-white relative bg-gray-100 group"
              >
                <img src={profile.avatar} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-active:opacity-100 transition-opacity flex items-center justify-center rounded-[47px]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-10 h-10">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
            ) : (
              <div className="w-44 h-44 rounded-[55px] overflow-hidden shadow-4xl border-[8px] border-white relative bg-gray-100">
                <img src={profile.avatar} className="w-full h-full object-cover" />
              </div>
            )}
            {isCurrentUser && onUpdateProfile && (
              <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-5 h-5">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
          <div className="pb-6">
            {isCurrentUser && onUpdateProfile ? (
              <button
                type="button"
                onClick={() => { setEditingName(profile.name); setShowPseudoModal(true); }}
                className="text-left group"
              >
                <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-none group-active:text-violet-600 transition-colors">{profile.name}</h1>
                <p className="text-violet-600 font-black text-base mt-2 tracking-tight flex items-center gap-2">
                  @{profile.name.toLowerCase().replace(/\s+/g, '')}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4 opacity-40">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </p>
              </button>
            ) : (
              <div>
                <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">{profile.name}</h1>
                <p className="text-violet-600 font-black text-base mt-2 tracking-tight">
                  @{profile.name.toLowerCase().replace(/\s+/g, '')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-10 mt-28 space-y-16 pb-24">
        <div className="flex gap-4 flex-wrap">
          {isCurrentUser && (
            <button
              onClick={onReservationsClick}
              className="bg-violet-950 text-white px-8 py-3 rounded-[22px] text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-violet-900/40 flex items-center gap-2"
            >
              Mes Réservations
            </button>
          )}
          {isPulseur && (
            <div className="bg-violet-100 text-violet-800 px-8 py-3 rounded-[22px] text-[11px] font-black uppercase tracking-widest border border-violet-200">
              PRO ★ {(profile as Pulseur).rating}
            </div>
          )}
          <div className="bg-gray-100 text-gray-400 px-8 py-3 rounded-[22px] text-[11px] font-black uppercase tracking-widest border border-gray-200">
            Vibe OK
          </div>
        </div>

        <section>
          <h3 className="text-[11px] font-black text-violet-950/20 uppercase tracking-[0.5em] mb-6">MANIFESTO</h3>
          <p className="text-gray-900 font-bold leading-tight text-3xl italic tracking-tight">
            "{profile.bio || "Toujours prêt pour un nouveau pulse."}"
          </p>
        </section>

        {activePulses.length > 0 && (
          <section>
            <h3 className="text-[11px] font-black text-violet-950/20 uppercase tracking-[0.5em] mb-8">PULSES EN COURS</h3>
            <div className="space-y-6">
              {activePulses.map(pulse => (
                <button
                  key={pulse.id}
                  onClick={() => onPulseClick?.(pulse)}
                  className="group w-full flex items-center gap-6 bg-gray-50 p-6 rounded-[50px] border border-gray-200 transition-all active:scale-95 text-left hover:bg-violet-50 hover:border-violet-200"
                >
                  <div className="w-24 h-24 rounded-[32px] overflow-hidden shadow-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                    <img src={pulse.imageUrl} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-black text-violet-800 uppercase tracking-widest mb-2">{pulse.type}</p>
                    <p className="font-black text-gray-900 text-2xl truncate leading-none mb-2">{pulse.title}</p>
                    <p className="text-xs text-gray-400 font-black uppercase tracking-tighter">
                      {new Date(pulse.startTime).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} • {pulse.location.address.split(',')[0]}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="text-[11px] font-black text-violet-950/20 uppercase tracking-[0.5em] mb-8">ADN</h3>
          <div className="flex flex-wrap gap-3">
            {profile.interests.map(interest => (
              <span key={interest} className="px-8 py-4 bg-white border-[3px] border-violet-50 text-violet-950 rounded-3xl font-black text-xs uppercase tracking-tight shadow-sm">
                #{interest}
              </span>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-violet-950 p-12 rounded-[55px] text-center shadow-2xl shadow-violet-900/30">
            <p className="text-6xl font-black text-white mb-2 italic leading-none">
              {pulses.filter(p => p.participants.includes(profile.id)).length}
            </p>
            <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">PULSES</p>
          </div>
          <div className="bg-gray-100 p-12 rounded-[55px] text-center">
            <p className="text-6xl font-black text-gray-900 mb-2 italic leading-none">{activePulses.length}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CREATIONS</p>
          </div>
        </div>

        {/* Subscription Section - Only for current user */}
        {isCurrentUser && limits && onUpgrade && onManageSubscription && (
          <SubscriptionSection
            subscription={subscription || null}
            currentPlan={currentPlan || null}
            limits={limits}
            isPremium={isPremium}
            onUpgrade={onUpgrade}
            onManage={onManageSubscription}
          />
        )}

        <div className="mt-12">
          {isCurrentUser ? (
            <button
              onClick={onSignOut}
              className="w-full py-8 bg-red-50 text-red-500 rounded-[45px] text-2xl font-black transition-all active:scale-95 border-2 border-red-100 uppercase tracking-tighter italic"
            >
              Se déconnecter
            </button>
          ) : onSendMessage && (
            <button
              onClick={onSendMessage}
              className="w-full py-8 bg-violet-950 text-white rounded-[45px] text-3xl font-black shadow-4xl transition-all active:scale-95 transform hover:bg-black uppercase tracking-tighter italic"
            >
              Envoyer un message
            </button>
          )}
        </div>
      </div>

      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Avatar Upload Modal */}
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
                Photo de profil
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
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pseudo Edit Modal */}
      <AnimatePresence>
        {showPseudoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end justify-center"
            onClick={() => !isSavingName && setShowPseudoModal(false)}
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
                  onClick={() => !isSavingName && setShowPseudoModal(false)}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 transition-all active:scale-90 hover:bg-gray-200"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              <h3 className="text-2xl font-black text-center text-violet-950 mb-8 tracking-tight">
                Modifier ton pseudo
              </h3>

              <div className="bg-gray-50 rounded-[30px] p-6 mb-6">
                <label className="block text-[9px] font-black text-violet-400 uppercase mb-3 tracking-widest">Pseudo</label>
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-2xl font-black placeholder:text-gray-200 tracking-tight text-violet-950"
                  placeholder="Ton pseudo"
                  autoFocus
                />
              </div>

              <button
                onClick={handleSavePseudo}
                disabled={isSavingName || !editingName.trim()}
                className="w-full py-6 bg-violet-950 text-white rounded-[25px] font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSavingName ? (
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" />
                    <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-5 h-5">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Sauvegarder
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProfileView;
