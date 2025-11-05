
import React, { useState, useContext, useCallback, useRef } from 'react';
import { Subject, SubjectFile } from '../types';
import { AppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { generateSummary } from '../services/geminiService';
import { Upload, Loader2, Wand2, FileUp, X, File as FileIcon } from 'lucide-react';
import { marked } from 'marked';

interface StudyGuideProps {
  subject: Subject;
}

const StudyGuide: React.FC<StudyGuideProps> = ({ subject }) => {
  const { dispatch } = useContext(AppContext);
  const { t, language } = useLanguage();
  const [material, setMaterial] = useState(subject.material);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [focus, setFocus] = useState('');
  
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleGenerateSummary = useCallback(async () => {
    if (!material.trim() && subject.files.length === 0) {
      setError(t('errorAddMaterialOrFile'));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const filePayloads = subject.files.map(f => ({ mimeType: f.type, data: f.data }));
      
      dispatch({ type: 'UPDATE_SUBJECT_MATERIAL', payload: { subjectId: subject.id, material } });
      const summary = await generateSummary(material, language, focus, filePayloads);
      dispatch({ type: 'SET_SUMMARY', payload: { subjectId: subject.id, summary } });
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
  }, [material, subject.files, subject.id, dispatch, language, t, focus]);

  const handleFilesAdded = async (newFiles: File[]) => {
      for (const file of newFiles) {
          if (!file || file.size === 0) {
              alert(t('invalidOrEmptyFile'));
              continue;
          }
          // Basic type validation for study guide files
          const supportedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'text/markdown', 'image/jpeg', 'image/png'];
          if (!supportedTypes.includes(file.type)) {
              alert(t('unsupportedFileType', { fileName: file.name }));
              continue;
          }

          const base64Data = await fileToBase64(file);
          const newFile: SubjectFile = {
              id: crypto.randomUUID(),
              name: file.name,
              type: file.type,
              data: base64Data,
              uploadDate: new Date().toISOString(), // Store upload date
          };
          dispatch({ type: 'ADD_SUBJECT_FILE', payload: { subjectId: subject.id, file: newFile } });
      }
      if (newFiles.length > 0 && subject.summary) {
          dispatch({ type: 'CLEAR_SUBJECT_CONTENT', payload: { subjectId: subject.id } });
      }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFilesAdded(Array.from(e.dataTransfer.files));
        e.dataTransfer.clearData();
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          handleFilesAdded(Array.from(e.target.files));
      }
  };
  
  const handleRemoveFile = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'REMOVE_SUBJECT_FILE', payload: { subjectId: subject.id, fileId } });
    if (subject.summary) {
      dispatch({ type: 'CLEAR_SUBJECT_CONTENT', payload: { subjectId: subject.id } });
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };


  const parsedSummary = subject.summary ? marked.parse(subject.summary) : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-4 flex flex-col">
        <h2 className="text-xl font-bold flex items-center gap-2"><Upload /> {t('uploadMaterial')}</h2>
        
        <div 
            className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input 
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.docx,.pptx,.txt,.md,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            />
            {subject.files.length > 0 ? (
                <div className="w-full">
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2 mb-2">
                        {subject.files.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-2 rounded-md bg-slate-100 dark:bg-slate-700/50">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileIcon className="h-5 w-5 flex-shrink-0 text-slate-500"/>
                                    <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{file.name}</span>
                                </div>
                                <button 
                                    onClick={(e) => handleRemoveFile(file.id, e)}
                                    className="p-1 text-slate-400 hover:text-red-500 rounded-full flex-shrink-0"
                                    aria-label={`Remove ${file.name}`}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                     <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                        {t('dragAndDropToAddMore')}
                    </p>
                </div>
            ) : (
                <div className="text-center text-slate-500 dark:text-slate-400">
                    <FileUp className="mx-auto h-10 w-10"/>
                    <p className="mt-2 font-semibold">{t('dragAndDropFiles')}</p>
                    <p className="text-sm">{t('or')} <span className="text-indigo-600 dark:text-indigo-400 font-medium">{t('browseFiles')}</span></p>
                    <p className="text-xs mt-2">{t('supportedFormats')}</p>
                </div>
            )}
        </div>

        <div className="flex items-center gap-2">
            <hr className="flex-grow border-slate-200 dark:border-slate-700"/>
            <span className="text-xs text-slate-400">{t('or').toUpperCase()}</span>
            <hr className="flex-grow border-slate-200 dark:border-slate-700"/>
        </div>

        <textarea
          value={material}
          onChange={(e) => {
            setMaterial(e.target.value);
            if (subject.summary) {
              dispatch({ type: 'CLEAR_SUBJECT_CONTENT', payload: { subjectId: subject.id } });
            }
          }}
          placeholder={t('materialPlaceholder')}
          className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
          disabled={isLoading}
          rows={6}
        />

        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-4">
            <h3 className="text-md font-semibold">{t('generationOptions')}</h3>
             <div>
                 <p className="text-sm font-medium mb-2 text-slate-600 dark:text-slate-400">{t('focusArea')}</p>
                <textarea
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder={t('focusPlaceholder')}
                  className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  disabled={isLoading}
                  rows={2}
                />
            </div>
        </div>

        <button
          onClick={handleGenerateSummary}
          disabled={isLoading || (!material.trim() && subject.files.length === 0)}
          className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Wand2 />}
          {isLoading ? t('generatingButton') : t('generateSummary')}
        </button>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Wand2 className="text-indigo-500" /> {t('aiSummaryTitle')}</h2>
        {isLoading && (
           <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
           </div>
        )}
        {!isLoading && subject.summary && (
          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: parsedSummary }} />
        )}
        {!isLoading && !subject.summary && (
          <div className="text-center text-slate-500 dark:text-slate-400 py-10">
            <p>{t('summaryPlaceholder')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyGuide;