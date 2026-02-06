import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Pulse, Pulseur } from './types';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { usePulses } from './src/hooks/usePulses';
import { useProfile } from './src/hooks/useProfile';
import { useFavorites } from './src/hooks/useFavorites';
import { useRatings } from './src/hooks/useRatings';
import { useNotifications } from './src/hooks/useNotifications';
import { useConversations } from './src/hooks/useChat';
import { useReports, ReportReason } from './src/hooks/useReports';
import { useSubscription } from './src/hooks/useSubscription';
import { supabase } from './src/lib/supabase';
import { initializeCapacitor, isNative } from './src/lib/capacitor';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import Onboarding from './components/Onboarding';
import MapView from './components/MapView';
import ProfileView from './components/ProfileView';
import EditProfileView from './components/EditProfileView';
import PulseDetail from './components/PulseDetail';
import PulseurSpace from './components/PulseurSpace';
import EditPulseView from './components/EditPulseView';
import MyPulsesView from './components/MyPulsesView';
import NotificationsPanel from './components/NotificationsPanel';
import ChatView from './components/ChatView';
import ReportModal from './components/ui/ReportModal';
import UpgradeModal from './components/UpgradeModal';
import { motion, AnimatePresence } from 'framer-motion';

enum AppState {
  ONBOARDING,
  MAP,
  PULSEUR_SPACE,
  PROFILE,
  EDIT_PROFILE,
  DETAIL,
  EDIT_PULSE,
  PULSEUR_PROFILE,
  MY_PULSES,
  CHAT,
  LOADING
}

const AppContent: React.FC = () => {
  const { profile, loading: authLoading, signOut, updateProfile } = useAuth();
  const { pulses, joinPulse, leavePulse, createPulse, updatePulse, deletePulse, getCreatedPulses, searchNearby, refreshPulses } = usePulses();
  const { getPulseur } = useProfile();
  const { isFavorite, toggleFavorite, favoritePulses } = useFavorites(profile?.id);
  const { createRating } = useRatings();
  const { notifications: appNotifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(profile?.id);
  const { getConversationForPulse, getOrCreateDirectConversation } = useConversations(profile?.id);
  const { submitReport, blockUser } = useReports(profile?.id);
  const {
    isPremium,
    limits,
    plans,
    currentPlan,
    subscription,
    canCreatePulse,
    createCheckoutSession,
    createPortalSession
  } = useSubscription(profile?.id);

  const [currentState, setCurrentState] = useState<AppState>(AppState.LOADING);
  const [selectedPulseId, setSelectedPulseId] = useState<string | null>(null);
  const [selectedPulseur, setSelectedPulseur] = useState<Pulseur | null>(null);
  const [toastNotifications, setToastNotifications] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState({ lat: 43.2965, lng: 5.3698 });

  // UI State
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'pulse' | 'user'; id: string; name: string } | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentConversationName, setCurrentConversationName] = useState<string>('');
  const [chatReturnState, setChatReturnState] = useState<AppState>(AppState.DETAIL);

  useEffect(() => {
    if (!authLoading) {
      if (profile) {
        setCurrentState(AppState.MAP);
      } else {
        setCurrentState(AppState.ONBOARDING);
      }
    }
  }, [authLoading, profile]);

  // Safety: force exit from loading screen if auth hangs (supabase-js navigator.locks deadlock)
  useEffect(() => {
    if (currentState !== AppState.LOADING) return;
    const timeout = setTimeout(() => {
      setCurrentState(profile ? AppState.MAP : AppState.ONBOARDING);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [currentState, profile]);

  const currentViewedPulse = useMemo(() => {
    return pulses.find(p => p.id === selectedPulseId) || null;
  }, [pulses, selectedPulseId]);

  const [currentPulseur, setCurrentPulseur] = useState<Pulseur | null>(null);
  const [canRateCurrentPulse, setCanRateCurrentPulse] = useState(false);
  const [hasRatedCurrentPulse, setHasRatedCurrentPulse] = useState(false);

  useEffect(() => {
    const fetchPulseur = async () => {
      if (!currentViewedPulse) {
        setCurrentPulseur(null);
        return;
      }

      if (profile && currentViewedPulse.pulseurId === profile.id) {
        const activePulseIds = getCreatedPulses(profile.id).map(p => p.id);
        setCurrentPulseur({
          ...profile,
          rating: profile.rating ?? 5.0,
          activePulses: activePulseIds
        });
        return;
      }

      const activePulseIds = getCreatedPulses(currentViewedPulse.pulseurId).map(p => p.id);
      const pulseur = await getPulseur(currentViewedPulse.pulseurId, activePulseIds);
      setCurrentPulseur(pulseur);
    };

    fetchPulseur();
  }, [currentViewedPulse, profile, getPulseur, getCreatedPulses]);

  // Check rating eligibility when viewing a pulse
  useEffect(() => {
    const checkRatingEligibility = async () => {
      if (!currentViewedPulse || !profile) {
        setCanRateCurrentPulse(false);
        setHasRatedCurrentPulse(false);
        return;
      }

      const isPastPulse = new Date(currentViewedPulse.startTime) < new Date();
      const isParticipant = currentViewedPulse.participants.includes(profile.id);
      const isNotOwner = currentViewedPulse.pulseurId !== profile.id;

      if (!isPastPulse || !isParticipant || !isNotOwner) {
        setCanRateCurrentPulse(false);
        setHasRatedCurrentPulse(false);
        return;
      }

      // Check if already rated
      const { data } = await supabase
        .from('ratings')
        .select('id')
        .eq('pulse_id', currentViewedPulse.id)
        .eq('reviewer_id', profile.id)
        .single();

      setHasRatedCurrentPulse(!!data);
      setCanRateCurrentPulse(!data);
    };

    checkRatingEligibility();
  }, [currentViewedPulse, profile]);

  const userReservations = useMemo(() => {
    if (!profile) return [];
    return pulses.filter(p => p.participants.includes(profile.id));
  }, [pulses, profile]);

  // Initialize Capacitor on mount
  useEffect(() => {
    initializeCapacitor();
  }, []);

  // Get user location using Capacitor on native, fallback to browser API
  useEffect(() => {
    const getLocation = async () => {
      try {
        if (isNative()) {
          const permission = await Geolocation.requestPermissions();
          if (permission.location === 'granted') {
            const position = await Geolocation.getCurrentPosition();
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          }
        } else if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
            },
            (error) => {
              console.warn("Geolocation denied, staying in Marseille.", error);
            }
          );
        }
      } catch (error) {
        console.warn("Geolocation error, staying in Marseille.", error);
      }
    };
    getLocation();
  }, []);

  const showNotification = (message: string) => {
    setToastNotifications(prev => [...prev, message]);
    setTimeout(() => setToastNotifications(prev => prev.slice(1)), 3000);
  };

  const handleProfileComplete = () => {
    setCurrentState(AppState.MAP);
  };

  const handleJoinPulse = async (pulseId: string) => {
    const { error } = await joinPulse(pulseId);
    if (error) {
      showNotification(`Erreur: ${error.message}`);
    } else {
      await refreshPulses();
      // Haptic feedback on native platforms
      if (isNative()) {
        Haptics.impact({ style: ImpactStyle.Medium });
      }
      showNotification(`Génial ! Tu pulses maintenant.`);
    }
  };

  const handleCancelPulse = async (pulseId: string) => {
    const confirmCancel = window.confirm("Annuler ta participation ?");
    if (!confirmCancel) return;

    const { error } = await leavePulse(pulseId);
    if (error) {
      showNotification(`Erreur: ${error.message}`);
    } else {
      await refreshPulses();
      showNotification(`Participation annulée.`);
    }
  };

  const handleCreatePulse = async (newPulseData: Omit<Pulse, 'id' | 'participants'>) => {
    const { error } = await createPulse(newPulseData);
    if (error) {
      showNotification(`Erreur: ${error.message}`);
    } else {
      setCurrentState(AppState.MAP);
      showNotification(`Ton Pulse est lancé !`);
    }
  };

  // Check pulse limits before navigating to PulseurSpace
  const handleOpenPulseurSpace = async () => {
    const allowed = await canCreatePulse();
    if (!allowed) {
      setShowUpgradeModal(true);
      return;
    }
    setCurrentState(AppState.PULSEUR_SPACE);
  };

  // Handle subscription upgrade
  const handleUpgrade = async (planId: string, billingCycle: 'monthly' | 'yearly') => {
    const { url, error } = await createCheckoutSession(planId, billingCycle);
    if (error) {
      showNotification(`Erreur: ${error.message}`);
      throw error;
    }
    if (url) {
      window.location.href = url;
    }
  };

  // Handle subscription management
  const handleManageSubscription = async () => {
    const { url, error } = await createPortalSession();
    if (error) {
      showNotification(`Erreur: ${error.message}`);
      return;
    }
    if (url) {
      window.location.href = url;
    }
  };

  const viewPulseurProfile = (pulseur: Pulseur) => {
    setSelectedPulseur(pulseur);
    setCurrentState(AppState.PULSEUR_PROFILE);
  };

  const viewPulseDetail = (pulse: Pulse) => {
    setSelectedPulseId(pulse.id);
    setCurrentState(AppState.DETAIL);
  };

  const handleEditPulse = (pulse: Pulse) => {
    setSelectedPulseId(pulse.id);
    setCurrentState(AppState.EDIT_PULSE);
  };

  const handleUpdatePulse = async (pulseId: string, updates: Partial<Omit<Pulse, 'id' | 'participants' | 'pulseurId'>>) => {
    const { error } = await updatePulse(pulseId, updates);
    if (error) {
      showNotification(`Erreur: ${error.message}`);
      return { error };
    }
    if (isNative()) {
      Haptics.impact({ style: ImpactStyle.Light });
    }
    showNotification('Pulse mis à jour !');
    return { error: null };
  };

  const handleDeletePulse = async (pulseId: string) => {
    const { error } = await deletePulse(pulseId);
    if (error) {
      showNotification(`Erreur: ${error.message}`);
      return { error };
    }
    showNotification('Pulse supprimé.');
    setCurrentState(AppState.MAP);
    return { error: null };
  };

  const handleToggleFavorite = async (pulseId: string) => {
    const { error, isFavorite: isNowFavorite } = await toggleFavorite(pulseId);
    if (error) {
      showNotification(`Erreur: ${error.message}`);
    } else {
      if (isNative()) {
        Haptics.impact({ style: ImpactStyle.Light });
      }
      showNotification(isNowFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris');
    }
  };

  const handleRatePulse = async (rating: number, comment: string) => {
    if (!currentViewedPulse || !profile) return;

    const { error } = await createRating(
      currentViewedPulse.id,
      profile.id,
      currentViewedPulse.pulseurId,
      rating,
      comment
    );

    if (error) {
      showNotification(`Erreur: ${error.message}`);
      throw error;
    }

    if (isNative()) {
      Haptics.impact({ style: ImpactStyle.Medium });
    }
    showNotification('Merci pour ton avis !');
    setHasRatedCurrentPulse(true);
    setCanRateCurrentPulse(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setCurrentState(AppState.ONBOARDING);
  };

  // Open chat for current pulse
  const handleOpenChat = async () => {
    if (!currentViewedPulse) return;

    const conversation = await getConversationForPulse(currentViewedPulse.id);
    if (conversation) {
      setCurrentConversationId(conversation.id);
      setCurrentConversationName(currentViewedPulse.title);
      setChatReturnState(AppState.DETAIL);
      setCurrentState(AppState.CHAT);
    } else {
      showNotification('Chat non disponible');
    }
  };

  // Open direct chat with a user
  const handleSendMessageToUser = async (userId: string, userName: string) => {
    const { conversation, error } = await getOrCreateDirectConversation(userId);
    if (error || !conversation) {
      showNotification('Impossible de créer la conversation');
      return;
    }
    setCurrentConversationId(conversation.id);
    setCurrentConversationName(userName);
    setChatReturnState(AppState.PULSEUR_PROFILE);
    setCurrentState(AppState.CHAT);
  };

  // Handle notification click
  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);

    // Navigate based on notification type
    if (notification.data?.pulse_id) {
      const pulse = pulses.find(p => p.id === notification.data.pulse_id);
      if (pulse) {
        viewPulseDetail(pulse);
      }
    } else if (notification.data?.conversation_id) {
      setCurrentConversationId(notification.data.conversation_id);
      setCurrentConversationName('Conversation');
      setChatReturnState(AppState.MAP);
      setCurrentState(AppState.CHAT);
    }

    setShowNotificationsPanel(false);
  };

  // Handle report
  const handleReport = (type: 'pulse' | 'user', id: string, name: string) => {
    setReportTarget({ type, id, name });
    setShowReportModal(true);
  };

  const handleSubmitReport = async (reason: ReportReason, description: string) => {
    if (!reportTarget) return;

    const { error } = await submitReport(reportTarget.type, reportTarget.id, reason, description);
    if (error) {
      showNotification(`Erreur: ${error.message}`);
      throw error;
    }

    if (isNative()) {
      Haptics.impact({ style: ImpactStyle.Medium });
    }
  };

  const handleBlockUser = async () => {
    if (!reportTarget || reportTarget.type !== 'user') return;

    const { error } = await blockUser(reportTarget.id);
    if (error) {
      showNotification(`Erreur: ${error.message}`);
    } else {
      showNotification('Utilisateur bloqué');
    }
  };

  if (currentState === AppState.LOADING) {
    return (
      <div className="h-screen w-full bg-violet-950 flex items-center justify-center max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-6xl font-black text-white tracking-tighter italic">NOW.</h1>
          <div className="mt-8 flex gap-2 justify-center">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" />
            <div className="w-3 h-3 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="w-3 h-3 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-white overflow-hidden max-w-md mx-auto shadow-2xl border-x border-gray-100 safe-area-top safe-area-bottom">
      {/* Toast Notifications */}
      <AnimatePresence>
        {toastNotifications.map((notif, i) => (
          <motion.div
            key={i}
            initial={{ y: -50, opacity: 0, scale: 0.9 }}
            animate={{ y: 20, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.9 }}
            className="absolute top-4 left-4 right-4 z-[110] bg-violet-950 text-white p-5 rounded-3xl text-center font-black shadow-2xl border border-violet-800"
          >
            {notif}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Notifications Panel */}
      <NotificationsPanel
        isOpen={showNotificationsPanel}
        notifications={appNotifications}
        onClose={() => setShowNotificationsPanel(false)}
        onNotificationClick={handleNotificationClick}
        onMarkAllRead={markAllAsRead}
      />

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          isOpen={showReportModal}
          reportedType={reportTarget.type}
          reportedName={reportTarget.name}
          onSubmit={handleSubmitReport}
          onBlock={reportTarget.type === 'user' ? handleBlockUser : undefined}
          onClose={() => {
            setShowReportModal(false);
            setReportTarget(null);
          }}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        plans={plans}
        currentPlanId={currentPlan?.id || 'free'}
        onSelectPlan={handleUpgrade}
        onClose={() => setShowUpgradeModal(false)}
      />

      <AnimatePresence mode="wait">
        {currentState === AppState.ONBOARDING && (
          <Onboarding key="onboarding" onComplete={handleProfileComplete} />
        )}

        {currentState === AppState.MAP && (
          <MapView
            key="map"
            pulses={pulses}
            onPulseSelect={viewPulseDetail}
            userInterests={profile?.interests || []}
            userLocation={userLocation}
            userAvatar={profile?.avatar}
            onProfileClick={() => setCurrentState(AppState.PROFILE)}
            onPulseurSpace={handleOpenPulseurSpace}
            onMyPulsesClick={() => setCurrentState(AppState.MY_PULSES)}
            onNotificationsClick={() => setShowNotificationsPanel(true)}
            unreadNotifications={unreadCount}
          />
        )}

        {currentState === AppState.PROFILE && profile && (
          <ProfileView
            key="profile"
            profile={profile}
            pulses={pulses}
            isCurrentUser={true}
            onBack={() => setCurrentState(AppState.MAP)}
            onPulseClick={viewPulseDetail}
            onReservationsClick={() => setCurrentState(AppState.MY_PULSES)}
            onSignOut={handleSignOut}
            onEditProfile={() => setCurrentState(AppState.EDIT_PROFILE)}
            subscription={subscription}
            currentPlan={currentPlan}
            limits={limits}
            isPremium={isPremium}
            onUpgrade={() => setShowUpgradeModal(true)}
            onManageSubscription={handleManageSubscription}
            onUpdateProfile={updateProfile}
          />
        )}

        {currentState === AppState.EDIT_PROFILE && profile && (
          <EditProfileView
            key="edit-profile"
            profile={profile}
            onSave={updateProfile}
            onBack={() => setCurrentState(AppState.PROFILE)}
          />
        )}

        {currentState === AppState.MY_PULSES && profile && (
          <MyPulsesView
            key="my-pulses"
            reservations={userReservations}
            favorites={favoritePulses}
            onBack={() => setCurrentState(AppState.MAP)}
            onPulseClick={viewPulseDetail}
            onCancelPulse={handleCancelPulse}
            onRemoveFavorite={(pulseId) => handleToggleFavorite(pulseId)}
          />
        )}

        {currentState === AppState.PULSEUR_PROFILE && selectedPulseur && (
          <ProfileView
            key="pulseur-profile"
            profile={selectedPulseur}
            pulses={pulses}
            isCurrentUser={profile?.id === selectedPulseur.id}
            onBack={() => setCurrentState(AppState.DETAIL)}
            onPulseClick={viewPulseDetail}
            onSendMessage={() => handleSendMessageToUser(selectedPulseur.id, selectedPulseur.name)}
            onUpdateProfile={profile?.id === selectedPulseur.id ? updateProfile : undefined}
          />
        )}

        {currentState === AppState.DETAIL && currentViewedPulse && (
          currentPulseur ? (
            <PulseDetail
              key="detail"
              pulse={currentViewedPulse}
              pulseur={currentPulseur}
              isParticipating={currentViewedPulse.participants.includes(profile?.id || '')}
              isOwner={currentViewedPulse.pulseurId === profile?.id}
              isFavorite={isFavorite(currentViewedPulse.id)}
              canRate={canRateCurrentPulse}
              hasRated={hasRatedCurrentPulse}
              onJoin={() => handleJoinPulse(currentViewedPulse.id)}
              onCancel={() => handleCancelPulse(currentViewedPulse.id)}
              onBack={() => setCurrentState(AppState.MAP)}
              onPulseurClick={viewPulseurProfile}
              onEdit={() => handleEditPulse(currentViewedPulse)}
              onToggleFavorite={() => handleToggleFavorite(currentViewedPulse.id)}
              onRate={handleRatePulse}
              onShareSuccess={() => showNotification('Lien copié !')}
              onShareError={(error) => showNotification(`Erreur: ${error}`)}
              onOpenChat={handleOpenChat}
              onReport={() => handleReport('pulse', currentViewedPulse.id, currentViewedPulse.title)}
              onReportUser={() => handleReport('user', currentPulseur.id, currentPulseur.name)}
            />
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white z-[60] flex items-center justify-center"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-violet-400">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm font-black text-violet-300 uppercase tracking-widest">Chargement...</p>
              </div>
            </motion.div>
          )
        )}

        {currentState === AppState.CHAT && currentConversationId && profile && (
          <ChatView
            key="chat"
            conversationId={currentConversationId}
            conversationName={currentConversationName}
            userId={profile.id}
            onBack={() => setCurrentState(chatReturnState)}
          />
        )}

        {currentState === AppState.PULSEUR_SPACE && profile && (
          <PulseurSpace
            key="pulseur-space"
            user={profile}
            onCreate={handleCreatePulse}
            onBack={() => setCurrentState(AppState.MAP)}
            userLocation={userLocation}
            currentPulseCount={getCreatedPulses(profile.id).length}
            maxPulses={limits.maxActivePulses}
            isPremium={isPremium}
            onUpgrade={() => setShowUpgradeModal(true)}
          />
        )}

        {currentState === AppState.EDIT_PULSE && currentViewedPulse && profile && currentViewedPulse.pulseurId === profile.id && (
          <EditPulseView
            key="edit-pulse"
            pulse={currentViewedPulse}
            onSave={handleUpdatePulse}
            onDelete={handleDeletePulse}
            onBack={() => setCurrentState(AppState.DETAIL)}
            userLocation={userLocation}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
