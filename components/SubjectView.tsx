
import React, { useContext, useState, useCallback, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Book, Sparkles, FileText, Bot, BarChartHorizontal } from 'lucide-react';
import StudyGuide from './StudyGuide';
import Flashcards from './Flashcards';
import Quiz from './Quiz';
import AIChat from './AIChat';
import ProgressView from './ProgressView';

type Tab = 'guide' | 'flashcards' | 'quiz' | 'chat' | 'progress';

const SubjectView: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('guide');

  const subject = useMemo(() => 
    state.subjects.find(s => s.id === state.activeSubjectId),
    [state.subjects, state.activeSubjectId]
  );

  const handleBackToDashboard = useCallback(() => {
    dispatch({ type: 'VIEW_DASHBOARD' });
  }, [dispatch]);

  if (!subject) {
    return (
      <div className="text-center">
        <p>{t('subjectNotFound')}</p>
        <button onClick={handleBackToDashboard} className="mt-4 text-indigo-600 hover:text-indigo-800">
          {t('backToDashboard')}
        </button>
      </div>
    );
  }
  
  const hasMaterial = useMemo(() => !!subject.material?.trim() || subject.files.length > 0, [subject.material, subject.files]);
  const hasQuizzes = subject.quizzes && Object.values(subject.quizzes).some(q => Array.isArray(q) && q.length > 0);

  const tabItems = [
    { id: 'guide', label: t('tabStudyGuide'), icon: FileText, disabled: false },
    { id: 'flashcards', label: t('tabFlashcards'), icon: Book, disabled: !hasMaterial && subject.flashcards.length === 0 },
    { id: 'quiz', label: t('tabQuiz'), icon: Sparkles, disabled: !hasMaterial && !hasQuizzes },
    { id: 'progress', label: t('tabProgress'), icon: BarChartHorizontal, disabled: subject.progress.length === 0 },
    { id: 'chat', label: t('tabAIAssistant'), icon: Bot, disabled: !hasMaterial },
  ];

  return (
    <div className="space-y-6">
      <button onClick={handleBackToDashboard} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
        <ArrowLeft size={18} />
        {t('backToDashboard')}
      </button>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{subject.name}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t('subjectIntro')}</p>
      </div>
      
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabItems.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              disabled={tab.disabled}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-500'
              } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="mt-4">
        {activeTab === 'guide' && <StudyGuide subject={subject} />}
        {activeTab === 'flashcards' && <Flashcards subject={subject} />}
        {activeTab === 'quiz' && <Quiz subject={subject} />}
        {activeTab === 'chat' && <AIChat subject={subject} />}
        {activeTab === 'progress' && <ProgressView subject={subject} />}
      </div>
    </div>
  );
};

export default SubjectView;
