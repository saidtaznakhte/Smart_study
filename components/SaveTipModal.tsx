
import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

interface SaveTipModalProps {
  tipContent: string;
  fileNamePrefix: string;
  onClose: () => void;
}

const SaveTipModal: React.FC<SaveTipModalProps> = ({ tipContent, fileNamePrefix, onClose }) => {
  const { state, dispatch } = useContext(AppContext);
  const { t } = useLanguage();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(state.subjects[0]?.id || '');

  if (state.subjects.length === 0) {
      return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold">{t('saveTip')}</h2>
                <p>{t('noSubjectsToSave')}</p>
                <div className="flex justify-end gap-2 pt-4">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">{t('close')}</button>
                </div>
            </div>
        </div>
      )
  }

  const handleSave = () => {
    if (!selectedSubjectId) return;

    // This is a safer way to encode UTF-8 strings to base64
    const base64Data = btoa(unescape(encodeURIComponent(tipContent)));
    
    const fileName = `${fileNamePrefix}-${new Date().toISOString().split('T')[0]}.md`;

    const newFile = {
      id: crypto.randomUUID(),
      name: fileName,
      type: 'text/markdown',
      data: base64Data,
    };

    dispatch({
      type: 'ADD_SUBJECT_FILE',
      payload: { subjectId: selectedSubjectId, file: newFile }
    });
    
    const subjectName = state.subjects.find(s => s.id === selectedSubjectId)?.name;
    alert(`${t('tipSavedTo')} ${subjectName}!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold">{t('saveTipToSubject')}</h2>
            <div>
                <label htmlFor="subject-select" className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('selectSubject')}</label>
                <select 
                    id="subject-select"
                    value={selectedSubjectId} 
                    onChange={e => setSelectedSubjectId(e.target.value)} 
                    className="mt-1 w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                    {state.subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                </select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">{t('back')}</button>
                <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors">{t('save')}</button>
            </div>
        </div>
    </div>
  );
};

export default SaveTipModal;
