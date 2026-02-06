import React, { useState } from 'react';
import { Interest } from '../types';
import { INTERESTS } from '../constants';
import { useAuth } from '../src/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingProps {
  onComplete: () => void;
}

type AuthMode = 'signup' | 'login';

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { signUp, signIn, resetPassword } = useAuth();

  const [step, setStep] = useState(1);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = (interest: Interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleAuth = async () => {
    setIsLoading(true);
    setError(null);

    if (authMode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }
      onComplete();
    } else {
      setStep(2);
      setIsLoading(false);
    }
  };

  const handleFinalize = async () => {
    setIsLoading(true);
    setError(null);

    const { error } = await signUp(email, password, name, selectedInterests);
    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    onComplete();
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Entre ton email pour réinitialiser ton mot de passe');
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error } = await resetPassword(email);
    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    setResetEmailSent(true);
    setIsLoading(false);
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
                  Stop scrolling.<br />
                  <span className="text-violet-400">Start pulsing.</span>
                </p>
              </div>

              <div className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-2xl text-sm font-bold text-center"
                  >
                    {error}
                  </motion.div>
                )}

                {authMode === 'signup' && (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ton prénom"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-8 py-5 rounded-[30px] bg-white shadow-3xl border-none focus:ring-8 focus:ring-violet-500/20 text-lg transition-all font-black placeholder:text-gray-300"
                    />
                  </div>
                )}

                <div className="relative">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-8 py-5 rounded-[30px] bg-white shadow-3xl border-none focus:ring-8 focus:ring-violet-500/20 text-lg transition-all font-black placeholder:text-gray-300"
                  />
                </div>

                {!showResetPassword && (
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-8 py-5 rounded-[30px] bg-white shadow-3xl border-none focus:ring-8 focus:ring-violet-500/20 text-lg transition-all font-black placeholder:text-gray-300"
                    />
                  </div>
                )}

                {/* Reset Password Success Message */}
                {showResetPassword && resetEmailSent && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-green-500/20 border border-green-500/50 text-green-200 p-6 rounded-[30px] text-center"
                  >
                    <div className="w-16 h-16 bg-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-8 h-8 text-green-300">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="font-black text-lg mb-2">Email envoyé !</p>
                    <p className="text-sm font-bold opacity-80">
                      Vérifie ta boîte mail pour réinitialiser ton mot de passe.
                    </p>
                  </motion.div>
                )}

                {/* Main Action Button */}
                {showResetPassword ? (
                  !resetEmailSent && (
                    <button
                      disabled={isLoading || !email}
                      onClick={handleResetPassword}
                      className="w-full py-6 bg-violet-700 text-white rounded-[35px] text-2xl font-black shadow-2xl active:scale-95 transition-all transform hover:bg-violet-600 uppercase tracking-tighter italic disabled:opacity-50"
                    >
                      {isLoading ? (
                        <div className="flex gap-2 justify-center">
                          <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" />
                          <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      ) : (
                        'Réinitialiser'
                      )}
                    </button>
                  )
                ) : (
                  <button
                    disabled={
                      isLoading ||
                      !email ||
                      !password ||
                      (authMode === 'signup' && !name)
                    }
                    onClick={handleAuth}
                    className="w-full py-6 bg-violet-700 text-white rounded-[35px] text-2xl font-black shadow-2xl active:scale-95 transition-all transform hover:bg-violet-600 uppercase tracking-tighter italic disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="flex gap-2 justify-center">
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    ) : authMode === 'signup' ? (
                      'Suivant'
                    ) : (
                      'Connexion'
                    )}
                  </button>
                )}

                {/* Back to login from reset password */}
                {showResetPassword && (
                  <button
                    onClick={() => {
                      setShowResetPassword(false);
                      setResetEmailSent(false);
                      setError(null);
                    }}
                    className="w-full text-white/60 font-bold text-sm uppercase tracking-widest py-2"
                  >
                    ← Retour à la connexion
                  </button>
                )}

                {!showResetPassword && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                        setError(null);
                        setShowResetPassword(false);
                        setResetEmailSent(false);
                      }}
                      className="w-full text-white/60 font-bold text-sm uppercase tracking-widest py-2"
                    >
                      {authMode === 'signup'
                        ? 'Déjà un compte ? Connexion'
                        : 'Nouveau ? Créer un compte'}
                    </button>

                    {authMode === 'login' && (
                      <button
                        onClick={() => {
                          setShowResetPassword(true);
                          setError(null);
                        }}
                        className="w-full text-white/40 font-bold text-[10px] uppercase tracking-[0.3em] py-1"
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                )}
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

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-2xl text-sm font-bold text-center mb-4"
                >
                  {error}
                </motion.div>
              )}

              <div className="flex-1 overflow-y-auto scrollbar-hide mb-6 pr-1">
                <div className="grid grid-cols-2 gap-3">
                  {INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`p-4 rounded-[25px] text-[10px] font-black border-2 transition-all flex items-center justify-center text-center uppercase tracking-widest ${selectedInterests.includes(interest)
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
                  disabled={selectedInterests.length === 0 || isLoading}
                  onClick={handleFinalize}
                  className="w-full py-6 bg-white text-violet-950 rounded-[35px] text-2xl font-black shadow-2xl disabled:opacity-50 active:scale-95 transition-all uppercase tracking-tighter italic"
                >
                  {isLoading ? (
                    <div className="flex gap-2 justify-center">
                      <div className="w-2.5 h-2.5 bg-violet-950 rounded-full animate-bounce" />
                      <div className="w-2.5 h-2.5 bg-violet-950 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2.5 h-2.5 bg-violet-950 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  ) : (
                    'Go Pulse !'
                  )}
                </button>
                <button
                  onClick={() => setStep(1)}
                  disabled={isLoading}
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
