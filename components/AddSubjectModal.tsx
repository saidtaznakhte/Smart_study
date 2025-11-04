
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SubjectDifficulty } from '../types';
import { X } from 'lucide-react';

interface AddSubjectModalProps {
  onClose: () => void;
  onAddSubject: (name: string, difficulty: SubjectDifficulty, examDate: string) => void;
}

const AddSubjectModal: React.FC<AddSubjectModalProps> = ({ onClose, onAddSubject }) => {
  const { t } = useLanguage();
  const [subjectName, setSubjectName] = useState('');
  const [difficulty, setDifficulty] = useState<SubjectDifficulty>(SubjectDifficulty.MEDIUM);
  const [examDate, setExamDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subjectName.trim() && examDate) {
        onAddSubject(subjectName, difficulty, examDate);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-5 duration-500" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold">{t('addNewSubjectTitle')}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="subjectName" className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('subjectNamePlaceholder')}</label>
            <input
              id="subjectName"
              type="text"
              value={subjectName}
              onChange={e => setSubjectName(e.target.value)}
              className="mt-1 w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="examDate" className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('examDate')}</label>
            <input
              id="examDate"
              type="date"
              value={examDate}
              onChange={e => setExamDate(e.target.value)}
              className="mt-1 w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-500 dark:text-slate-400"
              required
            />
          </div>
          <div>
            <p className="text-sm font-medium mb-2 text-slate-600 dark:text-slate-400">{t('difficulty')}</p>
            <div className="flex justify-around gap-2">
              {Object.values(SubjectDifficulty).map(diff => (
                <button
                  type="button"
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`w-full text-sm py-2 rounded-md transition-colors ${difficulty === diff ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500'}`}
                >
                  {t(diff.toLowerCase())}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">{t('cancel')}</button>
            <button
              type="submit"
              disabled={!subjectName.trim() || !examDate}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
            >
              {t('addSubjectButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSubjectModal;
