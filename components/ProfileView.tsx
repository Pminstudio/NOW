import React from 'react';
import { UserProfile, Pulseur, Pulse } from '../types';
import { motion } from 'framer-motion';
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
  onManageSubscription
}) => {
  const isPulseur = 'rating' in profile;
  const activePulses = pulses.filter(p => p.pulseurId === profile.id);

  const profileBg = isCurrentUser
    ? "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
    : "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80";

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      className="absolute inset-0 bg-white z-[70] flex flex-col overflow-y-auto scrollbar-hide"
    >
      <div className="relative h-80 w-full overflow-hidden">
        <img src={profileBg} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/60 to-white" />

        <div className="absolute top-10 left-10 right-10 flex justify-between items-center">
          <button
            onClick={onBack}
            className="w-16 h-16 bg-white/20 backdrop-blur-2xl border border-white/30 rounded-[28px] flex items-center justify-center transition-all active:scale-90 text-white shadow-2xl"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-8 h-8">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {isCurrentUser && onEditProfile && (
            <button
              onClick={onEditProfile}
              className="w-16 h-16 bg-white/20 backdrop-blur-2xl border border-white/30 rounded-[28px] flex items-center justify-center transition-all active:scale-90 text-white shadow-2xl"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-7 h-7">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="absolute -bottom-16 left-10 flex items-end gap-8">
          <div className="w-44 h-44 rounded-[55px] overflow-hidden shadow-4xl border-[8px] border-white relative bg-gray-100">
            <img src={profile.avatar} className="w-full h-full object-cover" />
          </div>
          <div className="pb-6">
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">{profile.name}</h1>
            <p className="text-violet-800 font-black text-[11px] uppercase tracking-[0.4em] mt-3 opacity-40">
              Pulseur certifié
            </p>
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
    </motion.div>
  );
};

export default ProfileView;
