
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { StudyIntensity } from '../types';
import { ArrowLeft, User, School, BookUser, Save, Bell, Trash2, Zap, Brain, Target, BookOpen, TrendingUp, CheckCircle } from 'lucide-react';

const Profile: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const { t } = useLanguage();
  const { user, studyIntensity, subjects, notificationsEnabled } = state;

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    gradeLevel: user?.gradeLevel || '',
    schoolName: user?.schoolName || '',
  });
  const [currentIntensity, setCurrentIntensity] = useState(studyIntensity);
  const [notifications, setNotifications] = useState(notificationsEnabled);
  const [profileUpdateMessage, setProfileUpdateMessage] = useState<string | null>(null);


  useEffect(() => {
    setFormData({
      fullName: user?.fullName || '',
      gradeLevel: user?.gradeLevel || '',
      schoolName: user?.schoolName || '',
    });
    setCurrentIntensity(studyIntensity);
    setNotifications(notificationsEnabled);
  }, [user, studyIntensity, notificationsEnabled]);

  useEffect(() => {
    // Clear message after a few seconds
    if (profileUpdateMessage) {
      const timer = setTimeout(() => setProfileUpdateMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [profileUpdateMessage]);

  const handleBackToDashboard = () => dispatch({ type: 'VIEW_DASHBOARD' });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    dispatch({
      type: 'UPDATE_PROFILE',
      payload: {
        user: { ...user, ...formData },
        intensity: currentIntensity!,
        notifications,
      }
    });
    setProfileUpdateMessage(t('profileUpdated')); // Set message
  };

  const handleClearData = () => {
    if (window.confirm(`${t('clearAllDataDesc')} ${t('deleteConfirmation')}`)) {
      dispatch({ type: 'RESET_APP' });
    }
  };

  const mostStudiedSubject = useMemo(() => {
    if (subjects.length === 0) return t('none');
    const activityCounts = subjects.reduce((acc, subject) => {
      acc[subject.name] = subject.progress.length;
      return acc;
    }, {} as Record<string, number>);
    return Object.keys(activityCounts).reduce((a, b) => activityCounts[a] > activityCounts[b] ? a : b, t('none'));
  }, [subjects, t]);

  const weakestSubject = useMemo(() => {
     if (subjects.length === 0) return t('none');
    const quizScores = subjects.map(subject => {
      const subjectQuizzes = subject.progress.filter(p => p.type === 'quiz' && typeof p.score === 'number');
      if (subjectQuizzes.length === 0) return { name: subject.name, avgScore: Infinity };
      const totalScore = subjectQuizzes.reduce((sum, q) => sum + (q.score!), 0);
      return { name: subject.name, avgScore: totalScore / subjectQuizzes.length };
    });
    const weakest = quizScores.sort((a, b) => a.avgScore - b.avgScore)[0];
    return weakest && weakest.avgScore !== Infinity ? weakest.name : t('none');
  }, [subjects, t]);
  
  const studyStreak = useMemo(() => {
    // 1. Get all progress events and map to Date objects, filtering out invalid dates.
    const validDates: Date[] = subjects
      .flatMap(s => s.progress)
      .map(p => new Date(p.date))
      .filter(d => !isNaN(d.getTime()));

    if (validDates.length === 0) return 0;

    // 2. Get unique timestamps for the start of each day, sorted descending.
    const uniqueDayTimestamps = [
      ...new Set(validDates.map(d => d.setHours(0, 0, 0, 0))),
    ].sort((a, b) => b - a); // Timestamps are numbers, so subtraction is safe.

    if (uniqueDayTimestamps.length === 0) return 0;

    let streak = 0;
    const todayTimestamp = new Date().setHours(0, 0, 0, 0);
    const oneDayInMs = 24 * 60 * 60 * 1000;

    const mostRecentTimestamp = uniqueDayTimestamps[0];

    // 3. Check if the streak is current (today or yesterday).
    if (
      mostRecentTimestamp === todayTimestamp ||
      mostRecentTimestamp === todayTimestamp - oneDayInMs
    ) {
      streak = 1;
      // 4. Iterate through the rest of the dates to find consecutive days.
      for (let i = 1; i < uniqueDayTimestamps.length; i++) {
        const previousTimestamp = uniqueDayTimestamps[i - 1];
        const currentTimestamp = uniqueDayTimestamps[i];

        if (previousTimestamp - currentTimestamp === oneDayInMs) {
          streak++;
        } else {
          // Streak is broken.
          break;
        }
      }
    }

    return streak;
  }, [subjects]);

  return (
    <div className="space-y-6">
      <button onClick={handleBackToDashboard} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
        <ArrowLeft size={18} />
        {t('backToDashboard')}
      </button>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('profile')}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t('profileSubtext')}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-4">
            <h2 className="text-xl font-bold">{t('personalInfo')}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
               <div>
                  <label className="text-sm font-medium">{t('fullNamePlaceholder')}</label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full pl-10 p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  </div>
               </div>
               <div>
                   <label className="text-sm font-medium">{t('gradeLevelPlaceholder')}</label>
                  <div className="relative mt-1">
                    <BookUser className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input type="text" value={formData.gradeLevel} onChange={e => setFormData({...formData, gradeLevel: e.target.value})} className="w-full pl-10 p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  </div>
               </div>
            </div>
             <div>
                   <label className="text-sm font-medium">{t('schoolNamePlaceholder')}</label>
                  <div className="relative mt-1">
                    <School className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input type="text" value={formData.schoolName} onChange={e => setFormData({...formData, schoolName: e.target.value})} className="w-full pl-10 p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  </div>
            </div>
            <h2 className="text-xl font-bold pt-4">{t('studyIntensity')}</h2>
            <div className="flex flex-col sm:flex-row gap-2">
                {Object.values(StudyIntensity).map(mode => (
                    <button type="button" key={mode} onClick={() => setCurrentIntensity(mode)} className={`flex-1 text-center py-2 px-4 rounded-lg transition-colors ${currentIntensity === mode ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                        {mode === StudyIntensity.LIGHT && t('lightMode')}
                        {mode === StudyIntensity.MODERATE && t('moderateMode')}
                        {mode === StudyIntensity.INTENSE && t('intenseMode')}
                    </button>
                ))}
            </div>
             <h2 className="text-xl font-bold pt-4">{t('settings')}</h2>
             <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                <div>
                    <h3 className="font-semibold">{t('enableReminders')}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('remindersDesc')}</p>
                </div>
                <button
                    type="button"
                    onClick={() => setNotifications(!notifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
             </div>
             <div className="pt-4 flex justify-end">
                <button type="submit" className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700 flex items-center gap-2"><Save size={16}/>{t('save')}</button>
            </div>
            {profileUpdateMessage && (
                <div 
                    className="mt-4 p-3 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg flex items-center justify-center gap-2 animate-in fade-in duration-300 text-sm" 
                    role="status" 
                    aria-live="polite"
                >
                    <CheckCircle size={16} />
                    <span>{profileUpdateMessage}</span>
                </div>
            )}
          </form>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-red-500/50 dark:border-red-500/30">
             <h2 className="text-xl font-bold text-red-600 dark:text-red-400">{t('dangerZone')}</h2>
             <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('clearAllDataDesc')}</p>
             <button onClick={handleClearData} className="mt-4 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center gap-2"><Trash2 size={16}/>{t('clearAllData')}</button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-4">
           <h2 className="text-xl font-bold flex items-center gap-2"><Brain className="text-indigo-500" /> {t('aiInsights')}</h2>
           <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-200 dark:bg-indigo-900/50 rounded-md"><BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-300"/></div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('mostStudiedSubject')}</p>
                        <p className="font-semibold">{mostStudiedSubject}</p>
                    </div>
                </div>
           </div>
           <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-200 dark:bg-yellow-900/50 rounded-md"><Target className="h-5 w-5 text-yellow-600 dark:text-yellow-300"/></div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('weakestArea')}</p>
                        <p className="font-semibold">{weakestSubject}</p>
                    </div>
                </div>
           </div>
           <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-200 dark:bg-green-900/50 rounded-md"><TrendingUp className="h-5 w-5 text-green-600 dark:text-green-300"/></div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('studyStreak')}</p>
                        <p className="font-semibold">{t('days', { count: studyStreak })}</p>
                    </div>
                </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
