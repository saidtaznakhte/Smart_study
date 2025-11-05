

import React, { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { Subject, QuizQuestion, QuizType, GenerationAmount, SubjectDifficulty } from '../types';
import { CheckCircle, XCircle, Loader2, Lightbulb, ListChecks, Circle, CircleDot, Binary, Pilcrow, Wand2, Bookmark, Download, Square, CheckSquare, X } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { generateQuizFeedback, generateQuizzes, generateQuizStrategyTip } from '../services/geminiService';
import { marked } from 'marked';
import SaveTipModal from './SaveTipModal';
import { printToPdf } from '../utils/downloadUtils';


interface QuizProps {
  subject: Subject;
}

interface QuizGenerationModalProps {
  subject: Subject;
  onGenerationComplete: () => void;
  onClose: () => void;
  isRegeneration?: boolean;
}

const QuizGenerationModal: React.FC<QuizGenerationModalProps> = ({ subject, onGenerationComplete, onClose, isRegeneration = false }) => {
    const { dispatch } = useContext(AppContext);
    const { t, language } = useLanguage();
    const [amount, setAmount] = useState<GenerationAmount>(GenerationAmount.NORMAL);
    const [difficulty, setDifficulty] = useState<SubjectDifficulty>(subject.difficulty);
    const [focus, setFocus] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasMaterial = useMemo(() => !!subject.material?.trim() || subject.files.length > 0, [subject.material, subject.files]);

    const handleGenerate = useCallback(async () => {
        if (!hasMaterial) {
            setError(t('addMaterialFirst'));
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const filePayloads = subject.files.map(f => ({ mimeType: f.type, data: f.data }));
            // Pass a regeneration hint if it's a regeneration request
            const regenerationHint = isRegeneration ? Math.random().toString() : undefined;
            const quizzes = await generateQuizzes(subject.material, language, difficulty, amount, focus, filePayloads, regenerationHint);
            dispatch({ type: 'SET_QUIZZES', payload: { subjectId: subject.id, quizzes } });
            onGenerationComplete();
        } catch (e: any) {
            if (e.toString().includes('429')) {
                setError(t('rateLimitError'));
            } else {
                setError(t('errorGenerationFailed'));
            }
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [subject, language, amount, difficulty, focus, hasMaterial, dispatch, t, onGenerationComplete, isRegeneration]);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-5 duration-500" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold">{isRegeneration ? t('regenerateQuizzes') : t('generateNewQuizzes')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{isRegeneration ? t('regenerateQuizzesSubtext') : t('noQuizAvailable')}</p>
                    </div>

                    {!hasMaterial && (
                        <p className="text-center text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md text-sm">{t('addMaterialFirst')}</p>
                    )}

                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium mb-2 text-slate-600 dark:text-slate-400">{t('contentAmount')}</p>
                            <div className="flex justify-around gap-2">
                                {Object.values(GenerationAmount).map(opt => (
                                    <button key={opt} onClick={() => setAmount(opt)} className={`w-full text-sm py-2 rounded-md transition-colors ${amount === opt ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500'}`}>
                                        {t(opt.toLowerCase())}
                                    </button>
                                ))}
                            </div>
                        </div>
                         <div>
                            <p className="text-sm font-medium mb-2 text-slate-600 dark:text-slate-400">{t('quizDifficulty')}</p>
                            <div className="flex justify-around gap-2">
                                {Object.values(SubjectDifficulty).map(opt => (
                                    <button key={opt} onClick={() => setDifficulty(opt)} className={`w-full text-sm py-2 rounded-md transition-colors ${difficulty === opt ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500'}`}>
                                        {t(opt.toLowerCase())}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium mb-2 text-slate-600 dark:text-slate-400">{t('focusArea')}</p>
                            <textarea
                                value={focus}
                                onChange={(e) => setFocus(e.target.value)}
                                placeholder={t('focusPlaceholder')}
                                className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                                disabled={isLoading || !hasMaterial}
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                         <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">{t('cancel')}</button>
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || !hasMaterial}
                            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : <Wand2 />}
                            {isLoading ? t('generatingButton') : t('generateQuizzesButton')}
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
                </div>
            </div>
        </div>
    );
};


const Quiz: React.FC<QuizProps> = ({ subject }) => {
  const { dispatch } = useContext(AppContext);
  const { t, language } = useLanguage();

  const [activeQuiz, setActiveQuiz] = useState<QuizQuestion[] | null>(null);
  const [activeQuizType, setActiveQuizType] = useState<QuizType | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(string[])[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [strategyTip, setStrategyTip] = useState<string | null>(null);
  const [isStrategyTipLoading, setIsStrategyTipLoading] = useState(false);
  const [tipToSave, setTipToSave] = useState<{ title: string; content: string } | null>(null);
  const [showGenerationModal, setShowGenerationModal] = useState(false); // New state for modal


  useEffect(() => {
    // If no quizzes exist, show the generation modal by default
    const hasAnyQuizzes = Object.values(subject.quizzes).some(q => Array.isArray(q) && q.length > 0);
    if (!hasAnyQuizzes && !activeQuiz) {
        setShowGenerationModal(true);
    } else {
        setShowGenerationModal(false);
    }
    // Reset component state if subject changes or quizzes are generated
    setActiveQuiz(null);
    setActiveQuizType(null);
    setShowResults(false);
    setFeedback(null);
    setStrategyTip(null);
  }, [subject.id, subject.quizzes]); // Depend on subject.quizzes to react to new generation
  
  const startQuiz = (quizType: QuizType) => {
    const questions = subject.quizzes[quizType];
    if (questions && questions.length > 0) {
      setActiveQuiz(questions);
      setActiveQuizType(quizType);
      setCurrentQuestionIndex(0);
      setSelectedAnswers(Array(questions.length).fill([]));
      setShowResults(false);
      setFeedback(null);
      setStrategyTip(null);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    const newAnswers = [...selectedAnswers];
    let currentSelection = newAnswers[currentQuestionIndex] || [];

    if (activeQuizType === QuizType.MULTIPLE_CHOICE) {
      if (currentSelection.includes(answer)) {
        newAnswers[currentQuestionIndex] = currentSelection.filter(a => a !== answer);
      } else {
        newAnswers[currentQuestionIndex] = [...currentSelection, answer];
      }
    } else { // For True/False and Fill-in-the-blank text input
      newAnswers[currentQuestionIndex] = [answer];
    }
    
    setSelectedAnswers(newAnswers);
  };
  
  const areArraysEqualUnordered = (arrA: string[], arrB: string[]): boolean => {
    if (arrA.length !== arrB.length) return false;
    const sortedA = [...arrA].sort();
    const sortedB = [...arrB].sort();
    return sortedA.every((value, index) => value.toLowerCase().trim() === sortedB[index].toLowerCase().trim());
  };


  const handleFinishQuiz = async () => {
    setShowResults(true);
    const score = calculateScore();
    dispatch({ type: 'UPDATE_READINESS', payload: { subjectId: subject.id, score: score > 60 ? 25 : 10 } });
    dispatch({ type: 'LOG_PROGRESS_EVENT', payload: { subjectId: subject.id, event: { type: 'quiz', score } } });
    
    // Generate feedback
    const incorrectQuestions = activeQuiz?.filter((q, index) => !areArraysEqualUnordered(selectedAnswers[index], q.correctAnswer)) || [];
    if (incorrectQuestions.length > 0) {
      setIsFeedbackLoading(true);
      try {
        const tips = await generateQuizFeedback(language, incorrectQuestions);
        setFeedback(tips);
      } catch (e: any) {
        console.error("Failed to get feedback:", e);
        if (e.toString().includes('429')) {
            setFeedback(t('rateLimitError'));
        } else {
            setFeedback(t('errorGenerationFailed'));
        }
      } finally {
        setIsFeedbackLoading(false);
      }
    }
    
    // Generate general strategy tip
    setIsStrategyTipLoading(true);
    try {
        const tip = await generateQuizStrategyTip(score, language);
        setStrategyTip(tip);
    } catch (e: any) {
        console.error("Failed to get strategy tip:", e);
        if (e.toString().includes('429')) {
            setStrategyTip(t('rateLimitError'));
        } else {
            setStrategyTip(t('errorGenerationFailed'));
        }
    } finally {
        setIsStrategyTipLoading(false);
    }
  };
  
  const handleNextQuestion = () => {
    if (activeQuiz && currentQuestionIndex < activeQuiz.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleFinishQuiz();
    }
  };
  
  const resetQuiz = () => {
    setActiveQuiz(null);
    setActiveQuizType(null);
    setShowResults(false);
    setFeedback(null);
    setStrategyTip(null);
  };

  const calculateScore = () => {
    if (!activeQuiz) return 0;
    let correct = 0;
    activeQuiz.forEach((q, index) => {
      if (areArraysEqualUnordered(selectedAnswers[index], q.correctAnswer)) {
        correct++;
      }
    });
    return Math.round((correct / activeQuiz.length) * 100);
  };
  
  const hasQuizzes = useMemo(() => 
    subject.quizzes && Object.values(subject.quizzes).some(q => Array.isArray(q) && q.length > 0),
    [subject.quizzes]
  );

  // Render the generation modal if active
  if (showGenerationModal) {
    return (
      <QuizGenerationModal
        subject={subject}
        onGenerationComplete={() => setShowGenerationModal(false)}
        onClose={() => setShowGenerationModal(false)}
        isRegeneration={hasQuizzes}
      />
    );
  }

  // If no quizzes and modal is not shown (shouldn't happen with current logic, but as fallback)
  if (!hasQuizzes) {
    return (
        <div className="max-w-md mx-auto bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-6 text-center">
            <h2 className="text-xl font-bold">{t('noQuizTitle')}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('noQuizAvailable')}</p>
            <button
                onClick={() => setShowGenerationModal(true)}
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
                <Wand2 /> {t('generateQuizzesButton')}
            </button>
        </div>
    );
  }
  
  // Quiz Selection Screen
  if (!activeQuiz) {
    const quizOptions = [
      { type: QuizType.MULTIPLE_CHOICE, icon: ListChecks, label: t('quizTypeMultipleChoice') },
      { type: QuizType.TRUE_FALSE, icon: Binary, label: t('quizTypeTrueFalse') },
      { type: QuizType.FILL_IN_THE_BLANK, icon: Pilcrow, label: t('quizTypeFillInTheBlank') },
    ];
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-bold text-center mb-6">{t('quizTime')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quizOptions.map(opt => (
            <button
              key={opt.type}
              disabled={!subject.quizzes[opt.type] || subject.quizzes[opt.type]?.length === 0}
              onClick={() => startQuiz(opt.type)}
              className="p-6 border-2 rounded-lg text-center transition-all flex flex-col items-center gap-2 border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-300 disabled:hover:bg-transparent"
            >
              <opt.icon className="h-8 w-8 text-indigo-500" />
              <span className="font-semibold">{opt.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
            <button
                onClick={() => setShowGenerationModal(true)}
                className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold py-3 px-6 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
            >
                <Wand2 /> {t('regenerateQuizzesButton')}
            </button>
        </div>
      </div>
    );
  }

  // Results Screen
  if (showResults) {
    const score = calculateScore();
    const parsedFeedback = feedback ? marked.parse(feedback) : '';
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        {tipToSave && (
            <SaveTipModal 
                tipContent={tipToSave.content} 
                fileNamePrefix={tipToSave.title}
                onClose={() => setTipToSave(null)} 
            />
        )}
        <h2 className="text-2xl font-bold text-center mb-4">{t('quizResults')}</h2>
        <div className="text-center text-4xl font-bold mb-6" style={{ color: score > 70 ? '#22c55e' : score > 40 ? '#f59e0b' : '#ef4444' }}>
          {score}%
        </div>
        
        {isFeedbackLoading && <div className="flex justify-center items-center gap-2 text-slate-500 my-4" role="status" aria-live="polite"><Loader2 className="animate-spin" /><span>{t('generatingButton')}</span></div>}
        {feedback && (
          <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg" role="status" aria-live="polite"> {/* Added aria-live */}
             <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg flex items-center gap-2 mb-2 text-indigo-800 dark:text-indigo-300"><Lightbulb /> {t('quizFeedbackTitle')}</h3>
                <div className="flex-shrink-0 flex items-center gap-1">
                    <button onClick={() => setTipToSave({ title: `AI-Quiz-Feedback-${subject.name.replace(/\s+/g, '-')}`, content: feedback })} title={t('saveTip')} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"><Bookmark size={16}/></button>
                    <button 
                      onClick={() => {
                        const subjectName = subject.name.replace(/\s+/g, '-');
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const filename = `PrepAI-Quiz-Feedback-${subjectName}-${timestamp}.pdf`;
                        const contentHtml = marked.parse(feedback);
                        printToPdf(contentHtml, filename);
                      }} 
                      title={t('downloadTip')} 
                      className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                      <Download size={16}/>
                    </button>
                </div>
            </div>
             <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: parsedFeedback }} />
          </div>
        )}

        {isStrategyTipLoading && <div className="flex justify-center items-center gap-2 text-slate-500 my-4" role="status" aria-live="polite"><Loader2 className="animate-spin" /><span>{t('generatingTip')}</span></div>}
        {strategyTip && (
            <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/40 rounded-lg" role="status" aria-live="polite"> {/* Added aria-live */}
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg flex items-center gap-2 mb-2 text-purple-800 dark:text-purple-300"><Wand2 /> {t('aiLearningStrategy')}</h3>
                    <div className="flex-shrink-0 flex items-center gap-1">
                        <button onClick={() => setTipToSave({ title: `AI-Strategy-Tip-${subject.name.replace(/\s+/g, '-')}`, content: strategyTip })} title={t('saveTip')} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"><Bookmark size={16}/></button>
                        <button 
                          onClick={() => {
                            const subjectName = subject.name.replace(/\s+/g, '-');
                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                            const filename = `PrepAI-Strategy-Tip-${subjectName}-${timestamp}.pdf`;
                            const contentHtml = marked.parse(strategyTip);
                            printToPdf(contentHtml, filename);
                          }} 
                          title={t('downloadTip')} 
                          className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                        >
                          <Download size={16}/>
                        </button>
                    </div>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-200">{strategyTip}</p>
            </div>
        )}

        <div className="space-y-4 mt-6">
          {activeQuiz.map((q, index) => {
            const isCorrect = areArraysEqualUnordered(selectedAnswers[index], q.correctAnswer);
            const questionText = q.question.includes('___') 
              ? q.question.replace('___', `[${q.correctAnswer.join(', ')}]`)
              : q.question;
            return (
              <div key={index} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="font-semibold">{index + 1}. {questionText}</p>
                <div className="flex items-center gap-2 mt-2">
                  {isCorrect ? <CheckCircle className="text-green-500"/> : <XCircle className="text-red-500"/>}
                  <p>{t('yourAnswer', { answer: selectedAnswers[index].join(', ') || t('notAnswered') })}</p>
                </div>
                {!isCorrect && <p className="text-sm text-green-600 dark:text-green-400 mt-1">{t('correctAnswer', { answer: q.correctAnswer.join(', ') })}</p>}
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1"><em>{q.explanation}</em></p>
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-6">
            <button onClick={resetQuiz} className="flex-1 bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors">
            {t('backToQuizzes')}
            </button>
            <button
                onClick={() => setShowGenerationModal(true)}
                className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold py-3 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
            >
                <Wand2 /> {t('regenerateQuizzesButton')}
            </button>
        </div>
      </div>
    );
  }

  const currentQuestion = activeQuiz[currentQuestionIndex];
  const selectedAnswer = selectedAnswers[currentQuestionIndex] || [];

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{activeQuizType}</h2>
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('questionProgress', { current: currentQuestionIndex + 1, total: activeQuiz.length })}</span>
      </div>
      <p className="text-lg mb-6">{currentQuestion.question}</p>
      
      <div className="space-y-3">
        {activeQuizType === QuizType.FILL_IN_THE_BLANK ? (
            <input
                type="text"
                value={selectedAnswer[0] || ''}
                onChange={(e) => handleAnswerSelect(e.target.value)}
                className="w-full p-4 border-2 rounded-lg bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:outline-none"
                placeholder={t('typeYourAnswer')}
            />
        ) : (
            currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer.includes(option);
              const isMultiChoice = activeQuizType === QuizType.MULTIPLE_CHOICE;
              return (
                <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all flex items-center gap-3 ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}
                >
                    {isMultiChoice ? (
                        isSelected ? <CheckSquare className="text-indigo-600 h-5 w-5 flex-shrink-0" /> : <Square className="text-slate-400 h-5 w-5 flex-shrink-0" />
                    ) : (
                        isSelected ? <CircleDot className="text-indigo-600 h-5 w-5 flex-shrink-0" /> : <Circle className="text-slate-400 h-5 w-5 flex-shrink-0" />
                    )}
                    <span>{option}</span>
                </button>
              )
            })
        )}
      </div>
      
      <button 
        onClick={handleNextQuestion} 
        disabled={!selectedAnswer || selectedAnswer.length === 0}
        className="w-full mt-6 bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
      >
        {currentQuestionIndex < activeQuiz.length - 1 ? t('nextQuestion') : t('finishQuiz')}
      </button>
    </div>
  );
};

export default Quiz;
