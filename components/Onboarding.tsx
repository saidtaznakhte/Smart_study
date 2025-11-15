import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { StudyIntensity, SubjectDifficulty } from '../types';
import { User, BookUser, BarChart3, Zap, X, School, GraduationCap } from 'lucide-react';

const Onboarding: React.FC = () => {
  const { dispatch } = useContext(AppContext);
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [subjects, setSubjects] = useState<{ name: string; difficulty: SubjectDifficulty; examDate: string }[]>([]);
  const [currentSubject, setCurrentSubject] = useState('');
  const [currentDifficulty, setCurrentDifficulty] = useState<SubjectDifficulty>(SubjectDifficulty.MEDIUM);
  const [currentExamDate, setCurrentExamDate] = useState('');
  const [intensity, setIntensity] = useState<StudyIntensity>(StudyIntensity.MODERATE);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = () => {
    if (fullName && gradeLevel && schoolName && subjects.length > 0) {
      dispatch({
        type: 'COMPLETE_ONBOARDING',
        payload: {
          user: { fullName, gradeLevel, schoolName },
          subjects,
          intensity,
        },
      });
    }
  };
  
  const handleAddSubject = () => {
    if (currentSubject.trim() && currentExamDate) {
      setSubjects([...subjects, { name: currentSubject.trim(), difficulty: currentDifficulty, examDate: currentExamDate }]);
      setCurrentSubject('');
      setCurrentDifficulty(SubjectDifficulty.MEDIUM);
      setCurrentExamDate('');
    }
  };

  const handleRemoveSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };


  const isStep1Valid = fullName.trim() !== '' && gradeLevel.trim() !== '' && schoolName.trim() !== '';
  const isStep2Valid = subjects.length > 0;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Removed h2 for onboardingWelcome as it's now at the top of the component */}
            <p className="text-center text-slate-600 dark:text-slate-400">{t('onboardingSubtext')}</p>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input type="text" placeholder={t('fullNamePlaceholder')} value={fullName} onChange={e => setFullName(e.target.value)} className="w-full pl-10 p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
            <div className="relative">
              <BookUser className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input type="text" placeholder={t('gradeLevelPlaceholder')} value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} className="w-full pl-10 p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
            <div className="relative">
              <School className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input type="text" placeholder={t('schoolNamePlaceholder')} value={schoolName} onChange={e => setSchoolName(e.target.value)} className="w-full pl-10 p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
            <button onClick={handleNext} disabled={!isStep1Valid} className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors">{t('next')}</button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white">{t('whatAreYouStudying')}</h2>
            <p className="text-center text-slate-600 dark:text-slate-400">{t('subjectsSubtext')}</p>
            
            <div className="space-y-4 p-4 border border-slate-300 dark:border-slate-600 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      placeholder={t('subjectNamePlaceholder')}
                      value={currentSubject} 
                      onChange={e => setCurrentSubject(e.target.value)}
                      className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                     <input 
                      type="date" 
                      value={currentExamDate} 
                      onChange={e => setCurrentExamDate(e.target.value)}
                      className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-500 dark:text-slate-400"
                    />
                </div>
              <div>
                 <p className="text-sm font-medium mb-2 text-slate-600 dark:text-slate-400">{t('difficulty')}</p>
                 <div className="flex justify-around gap-2">
                    {Object.values(SubjectDifficulty).map(diff => (
                        <button key={diff} onClick={() => setCurrentDifficulty(diff)} className={`w-full text-sm py-2 rounded-md transition-colors ${currentDifficulty === diff ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500'}`}>
                            {t(diff.toLowerCase())}
                        </button>
                    ))}
                 </div>
              </div>
               <button onClick={handleAddSubject} className="w-full bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-600 disabled:bg-indigo-400" disabled={!currentSubject.trim() || !currentExamDate}>
                  {t('add')}
                </button>
            </div>
            
            <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
              {subjects.map((s, index) => (
                <div key={index} className="flex justify-between items-center bg-slate-100 dark:bg-slate-700 p-2 rounded-md animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <span className="font-semibold">{s.name}</span>
                    <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${s.difficulty === SubjectDifficulty.EASY ? 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200' : s.difficulty === SubjectDifficulty.MEDIUM ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{t(s.difficulty.toLowerCase())}</span>
                     <span className="text-xs ml-2 text-slate-500 dark:text-slate-400">{new Date(s.examDate).toLocaleDateString()}</span>
                  </div>
                  <button onClick={() => handleRemoveSubject(index)} className="text-slate-400 hover:text-red-500">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button onClick={handleBack} className="w-full bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-3 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">{t('back')}</button>
              <button onClick={handleNext} disabled={!isStep2Valid} className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors">{t('next')}</button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white">{t('chooseIntensity')}</h2>
            <p className="text-center text-slate-600 dark:text-slate-400">{t('intensitySubtext')}</p>
            <div className="space-y-4">
              {Object.values(StudyIntensity).map(mode => (
                <button key={mode} onClick={() => setIntensity(mode)} className={`w-full p-4 border-2 rounded-lg text-left transition-all ${intensity === mode ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}>
                  <h3 className="font-bold">
                    {mode === StudyIntensity.LIGHT && t('lightMode')}
                    {mode === StudyIntensity.MODERATE && t('moderateMode')}
                    {mode === StudyIntensity.INTENSE && t('intenseMode')}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {mode === StudyIntensity.LIGHT && t('lightModeDesc')}
                    {mode === StudyIntensity.MODERATE && t('moderateModeDesc')}
                    {mode === StudyIntensity.INTENSE && t('intenseModeDesc')}
                  </p>
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={handleBack} className="w-full bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-3 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">{t('back')}</button>
              <button onClick={handleSubmit} className="w-full bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                {t('letsGo')} <Zap className="h-5 w-5" />
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-8 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8">
          <GraduationCap className="h-16 w-16 text-indigo-600 dark:text-indigo-400 mb-4" />
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('onboardingWelcome')}</h1>
        </div>
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-4">
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= s ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                  {s}
                </div>
                {s < 3 && <div className={`h-1 flex-1 transition-colors ${step > s ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}></div>}
              </React.Fragment>
            ))}
          </div>
        </div>
        {renderStep()}
      </div>
    </div>
  );
};

export default Onboarding;