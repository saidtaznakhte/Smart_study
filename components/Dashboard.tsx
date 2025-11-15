import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { PlusCircle, Target, Clock, CalendarDays, Bell, Activity, Loader2, Image as ImageIcon, Bookmark, Download } from 'lucide-react';
import { SubjectDifficulty, Subject, DailyDashboardData, DashboardInsights } from '../types';
import { generateDashboardInsights } from '../services/geminiService';
import SaveTipModal from './SaveTipModal';
import { printToPdf } from '../utils/downloadUtils';
import { marked } from 'marked';
import AddSubjectModal from './AddSubjectModal';


const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
};


const Dashboard: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const { t, language } = useLanguage();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { user, subjects, dashboardInsights, notificationsEnabled } = state;

  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Consolidated Dashboard Insights Generation
  useEffect(() => {
    const today = new Date();
    const lastInsightsDate = dashboardInsights ? new Date(dashboardInsights.date) : null;

    if (lastInsightsDate && isSameDay(today, lastInsightsDate)) {
        setInsights(dashboardInsights.insights);
        // If notifications are disabled, clear reminders from the existing insights
        if (!notificationsEnabled) {
            setInsights(prev => prev ? { ...prev, reminders: [] } : null);
        }
        return;
    }
    
    // Don't generate if there are no subjects
    if (subjects.length === 0) {
        setInsights(null);
        return;
    }

    setIsLoadingInsights(true);
    generateDashboardInsights(subjects, language)
        .then(newInsights => {
            const insightsToDisplay = {
                ...newInsights,
                // Ensure reminders are not shown if notifications are off
                reminders: notificationsEnabled ? newInsights.reminders : [],
            };
            setInsights(insightsToDisplay);
            const newDashboardData: DailyDashboardData = { date: today.toISOString(), insights: newInsights };
            dispatch({ type: 'SET_DASHBOARD_INSIGHTS', payload: newDashboardData });
        })
        .catch(err => {
            console.error("Failed to generate dashboard insights", err);
            // You might want to set an error state here to show in the UI
        })
        .finally(() => setIsLoadingInsights(false));

  }, [subjects, language, dashboardInsights, notificationsEnabled, dispatch]);

  const handleViewSubject = (subjectId: string) => {
    dispatch({ type: 'VIEW_SUBJECT', payload: { subjectId } });
  };

  const handleViewPlanner = () => {
    dispatch({ type: 'VIEW_PLANNER' });
  };

  const handleViewImageEditor = () => {
    dispatch({ type: 'VIEW_IMAGE_EDITOR' });
  };
  
  const handleAddSubject = (subjectName: string, difficulty: SubjectDifficulty, examDate: string) => {
      dispatch({ 
        type: 'ADD_SUBJECT', 
        payload: { 
          subjectName: subjectName.trim(),
          difficulty,
          examDate,
        } 
      });
      setIsAddModalOpen(false);
  };

  const getReadinessColor = (score: number) => {
    if (score < 40) return 'bg-red-500';
    if (score < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getDifficultyBadgeColor = (difficulty: SubjectDifficulty) => {
    switch (difficulty) {
      case SubjectDifficulty.EASY:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case SubjectDifficulty.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case SubjectDifficulty.HARD:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };
  
  return (
    <div className="space-y-8">
       {isSaveModalOpen && insights?.learningTip && (
        <SaveTipModal 
            tipContent={insights.learningTip} 
            fileNamePrefix="AI-Dashboard-Tip"
            onClose={() => setIsSaveModalOpen(false)} 
        />
      )}
      {isAddModalOpen && <AddSubjectModal onClose={() => setIsAddModalOpen(false)} onAddSubject={handleAddSubject} />}

      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('helloUser', { name: user?.fullName || '' })}</h1>
        <p className="text-slate-600 dark:text-slate-400">{t('dashboardSubtext')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
             <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><Activity className="text-indigo-500" /> {t('dailyReportTitle')}</h3>
              {isLoadingInsights ? (
                <div className="flex items-center gap-2 text-slate-500" role="status" aria-live="polite"><Loader2 className="animate-spin h-4 w-4"/><span>{t('generatingButton')}</span></div>
              ) : (
                <p className="text-slate-600 dark:text-slate-300 italic" role="status" aria-live="polite">{insights?.dailyReport}</p>
              )}
           </div>
           {(isLoadingInsights || (insights?.reminders && insights.reminders.length > 0)) && (
              <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><Bell className="text-yellow-500" /> {t('remindersTitle')}</h3>
                {isLoadingInsights ? (
                   <div className="flex items-center gap-2 text-slate-500" role="status" aria-live="polite"><Loader2 className="animate-spin h-4 w-4"/><span>{t('generatingButton')}</span></div>
                ) : (
                  <ul className="space-y-2" role="status" aria-live="polite">
                    {insights?.reminders.map((r, index) => (
                       <li key={index} className="text-sm text-slate-600 dark:text-slate-300 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                        {r.text}
                       </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
        </div>
         <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex justify-between items-start gap-4">
            <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><Target className="text-indigo-500" /> {t('aiAssistantTip')}</h3>
                {isLoadingInsights ? (
                    <div className="flex items-center gap-2 text-slate-500" role="status" aria-live="polite"><Loader2 className="animate-spin h-4 w-4"/><span>{t('generatingTip')}</span></div>
                ) : (
                    <p className="text-slate-600 dark:text-slate-300 italic" role="status" aria-live="polite">"{insights?.learningTip}"</p>
                )}
            </div>
            {!isLoadingInsights && insights?.learningTip && (
                <div className="flex-shrink-0 flex items-center gap-1">
                    <button onClick={() => setIsSaveModalOpen(true)} title={t('saveTip')} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                        <Bookmark size={16}/>
                    </button>
                    <button 
                      onClick={async () => {
                        if (!insights.learningTip) return;
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const filename = `PrepAI-Learning-Tip-${timestamp}.pdf`;
                        const contentHtml = await marked.parse(insights.learningTip);
                        printToPdf(contentHtml, filename);
                      }} 
                      title={t('downloadTip')} 
                      className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                        <Download size={16}/>
                    </button>
                </div>
            )}
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
            className="bg-gradient-to-r from-indigo-500 to-purple-600 p-8 rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col md:flex-row items-center justify-between gap-6"
            onClick={handleViewPlanner}
        >
            <div className="text-white">
                <h2 className="text-2xl font-bold mb-1">{t('plannerTitle')}</h2>
                <p className="opacity-90 max-w-lg">{t('plannerDescription')}</p>
            </div>
            <button className="bg-white/20 text-white font-semibold py-3 px-6 rounded-lg hover:bg-white/30 transition-colors flex-shrink-0 flex items-center gap-2">
                <Clock size={20} />
                {t('plannerButton')}
            </button>
        </div>
        <div 
            className="bg-gradient-to-r from-sky-500 to-cyan-600 p-8 rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col md:flex-row items-center justify-between gap-6"
            onClick={handleViewImageEditor}
        >
            <div className="text-white">
                <h2 className="text-2xl font-bold mb-1">{t('imageEditorTitle')}</h2>
                <p className="opacity-90 max-w-lg">{t('imageEditorDescription')}</p>
            </div>
            <button className="bg-white/20 text-white font-semibold py-3 px-6 rounded-lg hover:bg-white/30 transition-colors flex-shrink-0 flex items-center gap-2">
                <ImageIcon size={20} />
                {t('imageEditorButton')}
            </button>
        </div>
        {subjects.map(subject => (
          <div key={subject.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-slate-200 dark:border-slate-700 flex flex-col justify-between" onClick={() => handleViewSubject(subject.id)}>
            <div>
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-bold mb-2">{subject.name}</h2>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getDifficultyBadgeColor(subject.difficulty)}`}>
                    {t(subject.difficulty.toLowerCase())}
                  </span>
                </div>
                {subject.examDate && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                        <CalendarDays size={14} />
                        <span>{t('examOn', { date: new Date(subject.examDate).toLocaleDateString() })}</span>
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('examReadiness')}</p>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                  <div className={`${getReadinessColor(subject.readinessScore)} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${subject.readinessScore}%` }}></div>
                </div>
                 <p className="text-right text-sm font-semibold mt-1">{subject.readinessScore}%</p>
            </div>
          </div>
        ))}
         <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-white/50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-600 p-6 rounded-xl flex flex-col h-full min-h-[178px] items-center justify-center text-slate-500 dark:text-slate-400 hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors duration-300"
          >
            <PlusCircle className="h-8 w-8 mb-2"/>
            <span className="font-semibold">{t('addNewSubject')}</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;