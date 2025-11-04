
import React, { useState, useContext, useMemo, useEffect, useCallback } from 'react';
import { Subject, Flashcard, GenerationAmount } from '../types';
import { RotateCw, Volume2, Loader2, Star, Wand2, X } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { generateSpeech, generateFlashcards } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';

interface FlashcardsProps {
  subject: Subject;
}

interface FlashcardGenerationModalProps {
  subject: Subject;
  onGenerationComplete: () => void;
  onClose: () => void;
  isRegeneration?: boolean;
}

const FlashcardGenerationModal: React.FC<FlashcardGenerationModalProps> = ({ subject, onGenerationComplete, onClose, isRegeneration = false }) => {
    const { dispatch } = useContext(AppContext);
    const { t, language } = useLanguage();
    const [amount, setAmount] = useState<GenerationAmount>(GenerationAmount.NORMAL);
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
            const flashcards = await generateFlashcards(subject.material, language, amount, focus, filePayloads);
            dispatch({ type: 'SET_FLASHCARDS', payload: { subjectId: subject.id, flashcards } });
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
    }, [subject, language, amount, focus, hasMaterial, dispatch, t, onGenerationComplete]);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-5 duration-500" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold">{isRegeneration ? t('regenerateFlashcards') : t('generateNewFlashcards')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{isRegeneration ? t('regenerateFlashcardsSubtext') : t('noFlashcardsAvailable')}</p>
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
                            {isLoading ? t('generatingButton') : t('generateFlashcardsButton')}
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
                </div>
            </div>
        </div>
    );
};


const Flashcards: React.FC<FlashcardsProps> = ({ subject }) => {
  const { dispatch } = useContext(AppContext);
  const { t } = useLanguage();
  
  const dueCards = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return subject.flashcards.filter(card => new Date(card.dueDate) <= today);
  }, [subject.flashcards]);

  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [showGenerationModal, setShowGenerationModal] = useState(false); // New state for modal

  useEffect(() => {
    // If no flashcards exist, show the generation modal by default
    if (subject.flashcards.length === 0 && !isSessionActive) {
      setShowGenerationModal(true);
    } else {
      setShowGenerationModal(false); // Ensure it's closed if flashcards exist
    }
    // Reset session state when subject changes or flashcards are generated
    setIsSessionActive(false);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [subject.id, subject.flashcards.length]); // Depend on flashcards.length to react to new generation

  const startSession = () => {
    setSessionCards(dueCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsSessionActive(true);
  };

  const handleReview = (quality: number) => {
    if (!sessionCards[currentIndex]) return;
    
    dispatch({
      type: 'UPDATE_FLASHCARD_PROGRESS',
      payload: { subjectId: subject.id, cardId: sessionCards[currentIndex].id, quality }
    });
    
    if (currentIndex < sessionCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      dispatch({ type: 'UPDATE_READINESS', payload: { subjectId: subject.id, score: 25 } });
      dispatch({ type: 'LOG_PROGRESS_EVENT', payload: { subjectId: subject.id, event: { type: 'flashcards', cardsReviewed: sessionCards.length } } });
      alert(t('flashcardSessionComplete'));
      setIsSessionActive(false);
    }
  };

  const speak = async (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGeneratingAudio) return;

    setIsGeneratingAudio(true);
    try {
      const base64Audio = await generateSpeech(text);
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const decodedBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(
        decodedBytes,
        outputAudioContext,
        24000,
        1,
      );
      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAudioContext.destination);
      source.start();
    } catch (error) {
      console.error("Failed to play audio:", error);
      alert(t('errorGenerationFailed'));
    } finally {
      setIsGeneratingAudio(false);
    }
  };
  
  const getNextIntervalPreview = (card: Flashcard, quality: number): string => {
    if (!card) return '';
    if (quality < 3) {
        return `≈ 1 ${t('day_singular')}`;
    }

    let newEasinessFactor = card.easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newEasinessFactor < 1.3) newEasinessFactor = 1.3;

    const newRepetitions = card.repetitions + 1;
    let newInterval: number;

    if (newRepetitions === 1) {
        newInterval = 1;
    } else if (newRepetitions === 2) {
        newInterval = 6;
    } else {
        newInterval = Math.ceil(card.interval * newEasinessFactor);
    }
    
    if (newInterval <= 1) return `≈ 1 ${t('day_singular')}`;
    if (newInterval < 30) return `≈ ${newInterval} ${t('days_plural')}`;
    const months = Math.round(newInterval / 30);
    if (months <= 1) return `≈ 1 ${t('month_singular')}`;
    return `≈ ${months} ${t('months_plural')}`;
  };

  // Render the generation modal if active
  if (showGenerationModal) {
    return (
      <FlashcardGenerationModal
        subject={subject}
        onGenerationComplete={() => setShowGenerationModal(false)}
        onClose={() => setShowGenerationModal(false)}
        isRegeneration={subject.flashcards.length > 0} // Pass whether it's an initial gen or regen
      />
    );
  }

  // If no flashcards and modal is not shown (shouldn't happen with current logic, but as fallback)
  if (subject.flashcards.length === 0) {
    return (
        <div className="max-w-md mx-auto bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-6 text-center">
            <h2 className="text-xl font-bold">{t('noFlashcardsTitle')}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('noFlashcardsAvailable')}</p>
            <button
                onClick={() => setShowGenerationModal(true)}
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
                <Wand2 /> {t('generateFlashcardsButton')}
            </button>
        </div>
    );
  }
  
  // Study Session / Session Ready Screen
  if (!isSessionActive) {
    return (
      <div className="text-center bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-2">{t('studySessionReady')}</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">{t('cardsDueForReview', { count: dueCards.length })}</p>
        <div className="flex flex-col gap-4">
            <button 
                onClick={startSession}
                disabled={dueCards.length === 0}
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
                <Star size={18} /> {dueCards.length > 0 ? t('startSession') : t('allCaughtUp')}
            </button>
            <button
                onClick={() => setShowGenerationModal(true)}
                className="w-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold py-3 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
            >
                <Wand2 /> {t('regenerateFlashcardsButton')}
            </button>
        </div>
      </div>
    );
  }

  const currentCard = sessionCards[currentIndex];

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center gap-6">
      <div className="w-full aspect-[3/2] [perspective:1000px]">
        <div 
          className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] cursor-pointer ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
          onClick={() => setIsFlipped(!isFlipped)}
          aria-label={isFlipped ? `Definition: ${currentCard.definition}` : `Term: ${currentCard.term}. Click to flip.`}
        >
          {/* Front of card */}
          <div className="absolute w-full h-full [backface-visibility:hidden] bg-white dark:bg-slate-700 rounded-xl shadow-2xl flex items-center justify-center p-8 border border-slate-200 dark:border-slate-600">
            <p className="text-2xl font-bold text-center">{currentCard.term}</p>
          </div>
          {/* Back of card */}
          <div className="absolute w-full h-full [backface-visibility:hidden] bg-indigo-500 text-white rounded-xl shadow-2xl flex flex-col items-center justify-center p-8 [transform:rotateY(180deg)]">
            <p className="text-lg text-center">{currentCard.definition}</p>
            <button 
              onClick={(e) => speak(currentCard.definition, e)} 
              className="absolute bottom-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
              disabled={isGeneratingAudio}
              aria-label={t('speakDefinition')}
            >
              {isGeneratingAudio ? <Loader2 size={20} className="animate-spin" /> : <Volume2 size={20} />}
            </button>
          </div>
        </div>
      </div>

       <div className="text-center text-sm text-slate-500 dark:text-slate-400">
        {t('cardProgress', { current: currentIndex + 1, total: sessionCards.length })}
      </div>

      {isFlipped ? (
        <div className="w-full space-y-2">
            <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-300">{t('howWellDidYouKnow')}</p>
            <div className="w-full grid grid-cols-3 justify-center gap-2 sm:gap-4">
                <div className="flex flex-col items-center">
                    <button onClick={() => handleReview(1)} className="w-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-semibold py-3 rounded-lg hover:bg-red-200 dark:hover:bg-red-900 transition-colors">{t('flashcardAgain')}</button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{getNextIntervalPreview(currentCard, 1)}</p>
                </div>
                <div className="flex flex-col items-center">
                    <button onClick={() => handleReview(3)} className="w-full bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 font-semibold py-3 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900 transition-colors">{t('flashcardGood')}</button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{getNextIntervalPreview(currentCard, 3)}</p>
                </div>
                <div className="flex flex-col items-center">
                    <button onClick={() => handleReview(5)} className="w-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 font-semibold py-3 rounded-lg hover:bg-green-200 dark:hover:bg-green-900 transition-colors">{t('flashcardEasy')}</button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{getNextIntervalPreview(currentCard, 5)}</p>
                </div>
            </div>
        </div>
      ) : (
        <button onClick={() => setIsFlipped(true)} className="px-8 py-4 bg-white dark:bg-slate-700 rounded-full shadow-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 font-semibold">
          <RotateCw size={18} /> {t('flip')}
        </button>
      )}
    </div>
  );
};

export default Flashcards;