import React, { useContext, useEffect } from 'react';
import { AppProvider, AppContext } from './context/AppContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import SubjectView from './components/SubjectView';
import Planner from './components/Planner';
import Profile from './components/Profile';
import ImageEditor from './components/ImageEditor';
import AuthScreen from './src/components/AuthScreen'; // Corrected import path
import { BrainCircuit, User as UserIcon, LogOut } from 'lucide-react'; // Import LogOut icon
import { signOutUser } from './src/services/firebaseService'; // Corrected import path

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
          language === 'en' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
        }`}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('fr')}
        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
          language === 'fr' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
        }`}
        aria-pressed={language === 'fr'}
      >
        FR
      </button>
    </div>
  );
};

const ProfileButton: React.FC = () => {
  const { dispatch } = useContext(AppContext);
  const { t } = useLanguage();
  const handleProfileClick = () => {
    dispatch({ type: 'VIEW_PROFILE' });
  };
  return (
    <button
      onClick={handleProfileClick}
      className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      aria-label={t('profile')}
    >
      <UserIcon className="h-5 w-5" />
    </button>
  );
};

const SignOutButton: React.FC = () => {
  const { t } = useLanguage();
  const handleSignOut = async () => {
    await signOutUser();
  };
  return (
    <button
      onClick={handleSignOut}
      className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      aria-label={t('signOut')}
      title={t('signOut')}
    >
      <LogOut className="h-5 w-5" />
    </button>
  );
};


const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppProvider>
        <AppWrapper />
      </AppProvider>
    </LanguageProvider>
  );
};

const AppWrapper: React.FC = () => {
  const { state } = useContext(AppContext);
  const { t } = useLanguage();

  if (state.isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
        <div className="flex flex-col items-center">
          <BrainCircuit className="h-16 w-16 text-indigo-500 animate-pulse" />
          <p className="mt-4 text-lg font-semibold">{t('loadingApp')}</p> {/* Add loadingApp translation */}
        </div>
      </div>
    );
  }

  if (!state.isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
      <header className="bg-white dark:bg-slate-800/50 shadow-sm sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-8 w-8 text-indigo-500" />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              PrepAI
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ProfileButton />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6">
        <AppContent />
      </main>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { state } = useContext(AppContext);

  switch (state.view) {
    case 'onboarding':
      return <Onboarding />;
    case 'dashboard':
      return <Dashboard />;
    case 'subject':
      return <SubjectView />;
    case 'planner':
      return <Planner />;
    case 'profile':
      return <Profile />;
    case 'imageEditor':
      return <ImageEditor />;
    default:
      return <Onboarding />;
  }
};

export default App;