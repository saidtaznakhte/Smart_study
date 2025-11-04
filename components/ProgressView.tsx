import React, { useMemo } from 'react';
import { Subject } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { BarChart, CheckSquare, Layers } from 'lucide-react';

interface ProgressViewProps {
  subject: Subject;
}

const ProgressView: React.FC<ProgressViewProps> = ({ subject }) => {
  const { t } = useLanguage();
  
  const quizEvents = useMemo(() => subject.progress.filter(e => e.type === 'quiz' && e.score !== undefined).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [subject.progress]);
  const flashcardEvents = useMemo(() => subject.progress.filter(e => e.type === 'flashcards'), [subject.progress]);

  const totalFlashcardsReviewed = useMemo(() => flashcardEvents.reduce((sum, e) => sum + (e.cardsReviewed || 0), 0), [flashcardEvents]);
  const averageQuizScore = useMemo(() => {
    if (quizEvents.length === 0) return 0;
    const totalScore = quizEvents.reduce((sum, e) => sum + (e.score || 0), 0);
    return Math.round(totalScore / quizEvents.length);
  }, [quizEvents]);

  const Chart = () => {
    if (quizEvents.length < 2) {
      return <div className="h-64 flex items-center justify-center text-slate-500">{t('notEnoughDataForChart')}</div>;
    }

    const PADDING = 40;
    const WIDTH = 500;
    const HEIGHT = 250;
    const VIEWBOX_WIDTH = WIDTH + PADDING * 2;
    const VIEWBOX_HEIGHT = HEIGHT + PADDING * 2;
    
    const points = quizEvents.map((event, i) => {
        const x = (i / (quizEvents.length - 1)) * WIDTH;
        const y = HEIGHT - (event.score! / 100) * HEIGHT;
        return { x, y, score: event.score, date: new Date(event.date).toLocaleDateString() };
    });

    const path = points.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ');

    return (
        <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="w-full h-auto" aria-labelledby="chart-title">
            <title id="chart-title">{t('quizPerformanceChartTitle')}</title>
            <g transform={`translate(${PADDING}, ${PADDING})`}>
                {/* Y-Axis */}
                <line x1="0" y1="0" x2="0" y2={HEIGHT} className="stroke-current text-slate-300 dark:text-slate-600" />
                {[0, 25, 50, 75, 100].map(val => (
                    <g key={val}>
                        <text x="-10" y={HEIGHT - (val/100)*HEIGHT + 4} className="text-xs fill-current text-slate-500" textAnchor="end">{val}%</text>
                        <line x1="0" y1={HEIGHT - (val/100)*HEIGHT} x2={WIDTH} y2={HEIGHT - (val/100)*HEIGHT} className="stroke-current text-slate-200 dark:text-slate-700/50" strokeDasharray="2,4"/>
                    </g>
                ))}

                {/* X-Axis */}
                <line x1="0" y1={HEIGHT} x2={WIDTH} y2={HEIGHT} className="stroke-current text-slate-300 dark:text-slate-600" />
                 {points.map((p, i) => (
                    <text key={i} x={p.x} y={HEIGHT + 20} className="text-xs fill-current text-slate-500" textAnchor="middle">{p.date}</text>
                ))}
                
                {/* Line */}
                <path d={path} fill="none" className="stroke-indigo-500" strokeWidth="2" />

                {/* Points */}
                {points.map((p, i) => (
                    <g key={i}>
                       <circle cx={p.x} cy={p.y} r="4" className="fill-indigo-500" />
                       <title>{`${t('score')}: ${p.score}%, ${t('date')}: ${p.date}`}</title>
                    </g>
                ))}
            </g>
        </svg>
    );
  };

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                    <CheckSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('averageQuizScore')}</p>
                    <p className="text-2xl font-bold">{averageQuizScore}%</p>
                </div>
            </div>
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                    <Layers className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('totalFlashcardsReviewed')}</p>
                    <p className="text-2xl font-bold">{totalFlashcardsReviewed}</p>
                </div>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
             <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <BarChart /> {t('quizPerformance')}
            </h2>
            <Chart />
        </div>
    </div>
  );
};

export default ProgressView;
