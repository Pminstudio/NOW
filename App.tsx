
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Interest, Pulse, Pulseur } from './types';
import { MOCK_PULSEURS, MOCK_PULSES } from './constants';
import Onboarding from './components/Onboarding';
import MapView from './components/MapView';
import ProfileView from './components/ProfileView';
import PulseDetail from './components/PulseDetail';
import PulseurSpace from './components/PulseurSpace';
import MyPulsesView from './components/MyPulsesView';
import { motion, AnimatePresence } from 'framer-motion';

enum AppState {
  ONBOARDING,
  MAP,
  PULSEUR_SPACE,
  PROFILE,
  DETAIL,
  PULSEUR_PROFILE,
  MY_PULSES
}

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentState, setCurrentState] = useState<AppState>(AppState.ONBOARDING);
  const [selectedPulseId, setSelectedPulseId] = useState<string | null>(null);
  const [selectedPulseur, setSelectedPulseur] = useState<Pulseur | null>(null);
  const [pulses, setPulses] = useState<Pulse[]>(MOCK_PULSES);
  const [notifications, setNotifications] = useState<string[]>([]);

  // Default to Marseille center: Vieux-Port area
  const [userLocation, setUserLocation] = useState({ lat: 43.2965, lng: 5.3698 });

  const currentViewedPulse = useMemo(() => {
    return pulses.find(p => p.id === selectedPulseId) || null;
  }, [pulses, selectedPulseId]);

  // Resolve the pulseur for the current viewed pulse
  const currentPulseur = useMemo(() => {
    if (!currentViewedPulse) return null;
    
    // Check in mock pulseurs
    const mock = MOCK_PULSEURS.find(p => p.id === currentViewedPulse.pulseurId);
    if (mock) return mock;

    // Check if it's the current user
    if (userProfile && currentViewedPulse.pulseurId === userProfile.id) {
      return {
        ...userProfile,
        rating: 5.0,
        activePulses: pulses.filter(p => p.pulseurId === userProfile.id).map(p => p.id)
      } as Pulseur;
    }

    return MOCK_PULSEURS[0]; // Fallback
  }, [currentViewedPulse, userProfile, pulses]);

  const userReservations = useMemo(() => {
    if (!userProfile) return [];
    return pulses.filter(p => p.participants.includes(userProfile.id));
  }, [pulses, userProfile]);

  useEffect(() => {
    if ("geolocation" in navigator) {
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
  }, []);

  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setCurrentState(AppState.MAP);
  };

  const handleJoinPulse = (pulseId: string) => {
    setPulses(prev => prev.map(p => 
      p.id === pulseId && userProfile 
        ? { ...p, participants: [...new Set([...p.participants, userProfile.id])] } 
        : p
    ));
    setNotifications(prev => [...prev, `Génial ! Tu pulses maintenant.`]);
    setTimeout(() => setNotifications(prev => prev.slice(1)), 3000);
  };

  const handleCancelPulse = (pulseId: string) => {
    const confirmCancel = window.confirm("Annuler ta participation ?");
    if (!confirmCancel) return;

    setPulses(prev => prev.map(p => 
      p.id === pulseId && userProfile 
        ? { ...p, participants: p.participants.filter(id => id !== userProfile.id) } 
        : p
    ));
    
    setNotifications(prev => [...prev, `Participation annulée.`]);
    setTimeout(() => setNotifications(prev => prev.slice(1)), 3000);
  };

  const handleCreatePulse = (newPulse: Pulse) => {
    setPulses(prev => [newPulse, ...prev]);
    setCurrentState(AppState.MAP);
    setNotifications(prev => [...prev, `Ton Pulse est lancé !`]);
    setTimeout(() => setNotifications(prev => prev.slice(1)), 3000);
  };

  const viewPulseurProfile = (pulseur: Pulseur) => {
    setSelectedPulseur(pulseur);
    setCurrentState(AppState.PULSEUR_PROFILE);
  };

  const viewPulseDetail = (pulse: Pulse) => {
    setSelectedPulseId(pulse.id);
    setCurrentState(AppState.DETAIL);
  };

  return (
    <div className="relative h-screen w-full bg-white overflow-hidden max-w-md mx-auto shadow-2xl border-x border-gray-100">
      <AnimatePresence>
        {notifications.map((notif, i) => (
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

      <AnimatePresence mode="wait">
        {currentState === AppState.ONBOARDING && (
          <Onboarding key="onboarding" onComplete={handleProfileComplete} />
        )}

        {currentState === AppState.MAP && (
          <MapView
            key="map"
            pulses={pulses}
            onPulseSelect={viewPulseDetail}
            userInterests={userProfile?.interests || []}
            userLocation={userLocation}
            onProfileClick={() => setCurrentState(AppState.PROFILE)}
            onPulseurSpace={() => setCurrentState(AppState.PULSEUR_SPACE)}
            onMyPulsesClick={() => setCurrentState(AppState.MY_PULSES)}
          />
        )}

        {currentState === AppState.PROFILE && userProfile && (
          <ProfileView
            key="profile"
            profile={userProfile}
            isCurrentUser={true}
            onBack={() => setCurrentState(AppState.MAP)}
            onPulseClick={viewPulseDetail}
            onReservationsClick={() => setCurrentState(AppState.MY_PULSES)}
          />
        )}

        {currentState === AppState.MY_PULSES && userProfile && (
          <MyPulsesView
            key="my-pulses"
            reservations={userReservations}
            onBack={() => setCurrentState(AppState.MAP)}
            onPulseClick={viewPulseDetail}
            onCancelPulse={handleCancelPulse}
          />
        )}

        {currentState === AppState.PULSEUR_PROFILE && selectedPulseur && (
          <ProfileView
            key="pulseur-profile"
            profile={selectedPulseur}
            isCurrentUser={userProfile?.id === selectedPulseur.id}
            onBack={() => setCurrentState(AppState.DETAIL)}
            onPulseClick={viewPulseDetail}
          />
        )}

        {currentState === AppState.DETAIL && currentViewedPulse && currentPulseur && (
          <PulseDetail
            key="detail"
            pulse={currentViewedPulse}
            pulseur={currentPulseur}
            isParticipating={currentViewedPulse.participants.includes(userProfile?.id || '')}
            onJoin={() => handleJoinPulse(currentViewedPulse.id)}
            onCancel={() => handleCancelPulse(currentViewedPulse.id)}
            onBack={() => setCurrentState(AppState.MAP)}
            onPulseurClick={viewPulseurProfile}
          />
        )}

        {currentState === AppState.PULSEUR_SPACE && userProfile && (
          <PulseurSpace
            key="pulseur-space"
            user={userProfile}
            onCreate={handleCreatePulse}
            onBack={() => setCurrentState(AppState.MAP)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
