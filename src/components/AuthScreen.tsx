import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { signInWithGoogle } from '../services/firebaseService';
import { Google } from 'lucide-react'; // Assuming you have a Google icon or similar
import { GraduationCap } from 'lucide-react';

const AuthScreen: React.FC = () => {
  const { dispatch } = useContext(AppContext);
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // AppContext will handle dispatching 'SET_USER_DATA' via onAuthStateChanged listener
    } catch (e: any) {
      console.error("Google Sign-In failed:", e);
      setError(t('signInError')); // Assuming you'll add this translation key
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-8 text-center animate-in fade-in zoom-in duration-500">
        <GraduationCap className="h-16 w-16 text-indigo-600 dark:text-indigo-400 mb-4 mx-auto" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{t('onboardingWelcome')}</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">{t('signInPrompt')}</p> {/* Add signInPrompt translation */}

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 1116 0A8 8 0 014 12z"></path>
            </svg>
          ) : (
            <Google size={20} />
          )}
          {isLoading ? t('signingIn') : t('signInWithGoogle')}
        </button>
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default AuthScreen;