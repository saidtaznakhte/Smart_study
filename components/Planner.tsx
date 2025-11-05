
import React, { useState, useContext, useRef, useCallback, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { analyzeTimetable } from '../services/geminiService';
import { ScheduleItem, StudyWindow, TimetableAnalysis } from '../types';
import { Upload, Edit3, Loader2, Wand2, FileUp, X, File as FileIcon, ArrowLeft, PlusCircle, Trash2 } from 'lucide-react';

type InputMode = 'upload' | 'manual';
// Update weekDays to include all 7 days to match the ScheduleItem and StudyWindow types.
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// --- Schedule Edit Modal Component ---
interface ScheduleEditModalProps {
    itemData: { item: Partial<ScheduleItem & StudyWindow>; type: 'schedule' | 'studyWindow' } | { type: 'new_schedule' | 'new_studyWindow' };
    onClose: () => void;
    onSave: (item: Partial<ScheduleItem & StudyWindow>) => void;
    onDelete: (item: Partial<ScheduleItem & StudyWindow>) => void;
}

const ScheduleEditModal: React.FC<ScheduleEditModalProps> = ({ itemData, onClose, onSave, onDelete }) => {
    const { t } = useLanguage();
    const isNew = !('item' in itemData);
    const initialData = isNew ? { day: 'Monday' as const, startTime: '09:00', endTime: '10:00' } : itemData.item;
    const type = isNew ? (itemData.type === 'new_schedule' ? 'schedule' : 'studyWindow') : itemData.type;

    const [formData, setFormData] = useState(initialData);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        onSave(formData);
    };
    
    const handleDelete = () => {
       if(window.confirm(t('deleteConfirmation'))){
         onDelete(formData);
       }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold">{isNew ? t('addEvent') : t('editEvent')}</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">{type === 'schedule' ? t('subjectNamePlaceholder') : t('suggestion')}</label>
                        <input
                            type="text"
                            name={type === 'schedule' ? 'subject' : 'suggestion'}
                            value={(formData as any).subject || (formData as any).suggestion || ''}
                            onChange={handleInputChange}
                            className="mt-1 w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('dayOfWeek')}</label>
                            <select name="day" value={formData.day} onChange={handleInputChange} className="mt-1 w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                {weekDays.map(d => <option key={d} value={d}>{t(d.toLowerCase())}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('startTime')}</label>
                            <input type="time" name="startTime" value={formData.startTime} onChange={handleInputChange} className="mt-1 w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('endTime')}</label>
                            <input type="time" name="endTime" value={formData.endTime} onChange={handleInputChange} className="mt-1 w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center pt-4">
                    {!isNew ? (
                         <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">
                            <Trash2 size={16} /> {t('deleteEvent')}
                        </button>
                    ) : <div />}
                    <div className="flex gap-2">
                         <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">{t('back')}</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors">{t('saveChanges')}</button>
                    </div>
                </div>
            </div>
        </div>
    )
}


const Planner: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { t, language } = useLanguage();
    const { timetableAnalysis } = state;

    const [inputMode, setInputMode] = useState<InputMode>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [manualSchedule, setManualSchedule] = useState<Omit<ScheduleItem, 'id'>[]>([]);
    // Fix: Explicitly type newItem to allow all ScheduleItem['day'] types, not just 'Monday' literal.
    const [newItem, setNewItem] = useState<Omit<ScheduleItem, 'id'>>({ subject: '', day: 'Monday', startTime: '', endTime: '' });
    
    const [isEditing, setIsEditing] = useState(false);
    const [editingItem, setEditingItem] = useState<ScheduleEditModalProps['itemData'] | null>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const colorPalette = [
        { bg: 'bg-rose-100', border: 'border-rose-500', text: 'text-rose-800', darkBg: 'dark:bg-rose-900/50', darkText: 'dark:text-rose-200' },
        { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-800', darkBg: 'dark:bg-pink-900/50', darkText: 'dark:text-pink-200' },
        { bg: 'bg-fuchsia-100', border: 'border-fuchsia-500', text: 'text-fuchsia-800', darkBg: 'dark:bg-fuchsia-900/50', darkText: 'dark:text-fuchsia-200' },
        { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800', darkBg: 'dark:bg-purple-900/50', darkText: 'dark:text-purple-200' },
        { bg: 'bg-violet-100', border: 'border-violet-500', text: 'text-violet-800', darkBg: 'dark:bg-violet-900/50', darkText: 'dark:text-violet-200' },
        { bg: 'bg-sky-100', border: 'border-sky-500', text: 'text-sky-800', darkBg: 'dark:bg-sky-900/50', darkText: 'dark:text-sky-200' },
        { bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-800', darkBg: 'dark:bg-cyan-900/50', darkText: 'dark:text-cyan-200' },
        { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-800', darkBg: 'dark:bg-teal-900/50', darkText: 'dark:text-teal-200' },
        { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-800', darkBg: 'dark:bg-emerald-900/50', darkText: 'dark:text-emerald-200' },
        { bg: 'bg-lime-100', border: 'border-lime-500', text: 'text-lime-800', darkBg: 'dark:bg-lime-900/50', darkText: 'dark:text-lime-200' },
        { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-800', darkBg: 'dark:bg-amber-900/50', darkText: 'dark:text-amber-200' },
        { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-800', darkBg: 'dark:bg-orange-900/50', darkText: 'dark:text-orange-200' },
    ];
    
    const stringToColorIndex = (str: string) => {
      let hash = 0;
      if (str.length === 0) return 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash % colorPalette.length);
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };
    
    const handleBackToDashboard = useCallback(() => {
        dispatch({ type: 'VIEW_DASHBOARD' });
    }, [dispatch]);

    const handleAnalyze = async () => {
        setIsLoading(true);
        setError(null);
        try {
            let analysisResult: TimetableAnalysis;
            if (inputMode === 'upload') {
                if (!file || file.size === 0) {
                    setError(t('invalidOrEmptyFile'));
                    setIsLoading(false);
                    return;
                }
                const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
                if (!supportedTypes.includes(file.type)) {
                    setError(t('unsupportedTimetableFileType', { fileName: file.name }));
                    setIsLoading(false);
                    return;
                }
                const base64Data = await fileToBase64(file);
                analysisResult = await analyzeTimetable(language, { mimeType: file.type, data: base64Data });
            } else if (inputMode === 'manual' && manualSchedule.length > 0) {
                const manualEntryText = manualSchedule.map(item =>
                    `${item.subject} on ${item.day} from ${item.startTime} to ${item.endTime}`
                ).join('\n');
                if (manualEntryText.length > 20000) {
                    console.warn("Manual timetable entry too long. Please shorten content before sending.");
                    setError(t('manualEntryTooLong'));
                    setIsLoading(false);
                    return;
                }
                analysisResult = await analyzeTimetable(language, undefined, manualEntryText);
            } else {
                setError(t('errorAddMaterialOrFile')); // Generic error if neither file nor manual entry is provided
                setIsLoading(false);
                return;
            }
            dispatch({ type: 'UPDATE_TIMETABLE_ANALYSIS', payload: analysisResult });
        } catch (e: any) {
            if (e.toString().includes('429')) {
                setError(t('rateLimitError'));
            } else {
                setError(t('errorAnalysisFailed'));
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveItem = (updatedItem: Partial<ScheduleItem & StudyWindow>) => {
        if (!timetableAnalysis) return;
        const newAnalysis = JSON.parse(JSON.stringify(timetableAnalysis));
        const isStudy = 'suggestion' in updatedItem;
        const typeKey = isStudy ? 'studyWindows' : 'schedule';

        if(updatedItem.id){ // Existing item
            const itemIndex = newAnalysis[typeKey].findIndex((i: any) => i.id === updatedItem.id);
            if(itemIndex > -1) newAnalysis[typeKey][itemIndex] = updatedItem;
        } else { // New item
            newAnalysis[typeKey].push({ ...updatedItem, id: crypto.randomUUID() });
        }
        dispatch({ type: 'UPDATE_TIMETABLE_ANALYSIS', payload: newAnalysis });
        setEditingItem(null);
    };

    const handleDeleteItem = (itemToDelete: Partial<ScheduleItem & StudyWindow>) => {
        if (!timetableAnalysis) return;
        const newAnalysis = JSON.parse(JSON.stringify(timetableAnalysis));
        const isStudy = 'suggestion' in itemToDelete;
        const typeKey = isStudy ? 'studyWindows' : 'schedule';
        newAnalysis[typeKey] = newAnalysis[typeKey].filter((i: any) => i.id !== itemToDelete.id);
        dispatch({ type: 'UPDATE_TIMETABLE_ANALYSIS', payload: newAnalysis });
        setEditingItem(null);
    };
    
    // --- Drag and Drop Handlers ---
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { e.target.files && e.target.files[0] && setFile(e.target.files[0]); };
    const handleRemoveFile = (e: React.MouseEvent) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

    // --- Manual Entry Handlers ---
    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.subject && newItem.startTime && newItem.endTime) {
            setManualSchedule([...manualSchedule, newItem]);
            setNewItem({ subject: '', day: 'Monday' as const, startTime: '', endTime: '' });
        }
    };
    const handleRemoveItem = (index: number) => setManualSchedule(manualSchedule.filter((_, i) => i !== index));

    const renderTimetableGrid = () => {
        if (!timetableAnalysis) return null;
    
        const allItems: ((ScheduleItem & { isStudy: false }) | (StudyWindow & { isStudy: true }))[] = [
            ...timetableAnalysis.schedule.map(s => ({...s, isStudy: false as const})), 
            ...timetableAnalysis.studyWindows.map(sw => ({...sw, isStudy: true as const}))
        ];
    
        const timeToPercent = (time: string) => {
            if(!time) return 0;
            const [hours, minutes] = time.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes;
            const startMinutes = 8 * 60; // 8 AM
            const endMinutes = 20 * 60; // 8 PM
            return ((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
        };
    
        return (
            <div className="mt-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-5 gap-1 relative">
                    {weekDays.map(day => <div key={day} className="text-center font-semibold text-sm pb-2 border-b-2 border-slate-200 dark:border-slate-700">{t(day.toLowerCase())}</div>)}
                    <div className="col-span-5 h-[600px] relative">
                        {Array.from({ length: 13 }, (_, i) => i + 8).map(hour => (
                            <div key={hour} className="absolute w-full flex items-center" style={{ top: `${timeToPercent(`${hour}:00`)}%`}}>
                                <span className="text-xs text-slate-400 -ml-8 pr-2">{`${hour}:00`}</span>
                                <div className="flex-grow border-t border-slate-100 dark:border-slate-700/50"></div>
                            </div>
                        ))}
                        {allItems.map((item) => {
                            const dayIndex = weekDays.indexOf(item.day);
                            if (dayIndex === -1) return null;
    
                            const top = timeToPercent(item.startTime);
                            const height = timeToPercent(item.endTime) - top;
                            const handleEditClick = () => {
                                setEditingItem({ item, type: item.isStudy ? 'studyWindow' : 'schedule' });
                            }

                            const isStudyWindow = item.isStudy;
                            const subjectName = 'subject' in item ? item.subject : '';
                            const colorClasses = isStudyWindow 
                                ? { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800', darkBg: 'dark:bg-green-900/50', darkText: 'dark:text-green-200' }
                                : colorPalette[stringToColorIndex(subjectName)];
    
                            return (
                                <div
                                    key={item.id}
                                    className="absolute group"
                                    style={{ top: `${top}%`, height: `${height}%`, left: `${dayIndex * 20}%`, width: '19.5%' }}
                                >
                                    <button
                                        disabled={!isEditing}
                                        onClick={handleEditClick}
                                        className={`w-full h-full rounded-lg p-2 text-xs text-left overflow-hidden transition-all border-l-4 ${colorClasses.bg} ${colorClasses.darkBg} ${colorClasses.border} ${isEditing ? 'cursor-pointer hover:ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-indigo-500' : 'cursor-default'}`}
                                    >
                                        <p className={`font-bold truncate ${colorClasses.text} ${colorClasses.darkText}`}>{('subject' in item) ? item.subject : t('studyWindows')}</p>
                                        <p className={`${colorClasses.text} ${colorClasses.darkText}`}>{item.startTime} - {item.endTime}</p>
                                        {item.isStudy && <p className={`mt-1 italic ${colorClasses.text} ${colorClasses.darkText}`}>"{item.suggestion}"</p>}
                                    </button>

                                    <div 
                                        className={`absolute top-1/2 -translate-y-1/2 ${dayIndex > 2 ? 'right-full mr-2' : 'left-full ml-2'} w-48 p-2 text-xs bg-slate-800 dark:bg-slate-900 text-white rounded-md shadow-lg opacity-0 scale-95 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-10`}
                                    >
                                        <p className="font-bold border-b border-slate-600 pb-1 mb-1">{('subject' in item) ? item.subject : t('studyWindows')}</p>
                                        <p>{t(item.day.toLowerCase())}, {item.startTime} - {item.endTime}</p>
                                        {item.isStudy && <p className="mt-1 italic">"{item.suggestion}"</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderInputSection = () => (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex border-b border-slate-200 dark:border-slate-700">
                        <button onClick={() => setInputMode('upload')} className={`flex-1 pb-2 text-sm font-semibold flex items-center justify-center gap-2 ${inputMode === 'upload' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}><Upload size={16} />{t('uploadTimetable')}</button>
                        <button onClick={() => setInputMode('manual')} className={`flex-1 pb-2 text-sm font-semibold flex items-center justify-center gap-2 ${inputMode === 'manual' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}><Edit3 size={16} />{t('manualEntry')}</button>
                    </div>
                    {inputMode === 'upload' ? (
                        <div className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                            {file ? (<div className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><FileIcon className="h-5 w-5" /><span className="font-medium">{file.name}</span><button onClick={handleRemoveFile} className="p-1 text-slate-400 hover:text-red-500"><X size={16} /></button></div>) : (<div className="text-center text-slate-500 dark:text-slate-400"><FileUp className="mx-auto h-10 w-10" /><p className="mt-2 font-semibold">{t('dragAndDropFiles')}</p><p className="text-sm">{t('or')} <span className="text-indigo-600 dark:text-indigo-400 font-medium">{t('browseFiles')}</span></p><p className="text-xs mt-2">{t('supportedTimetableFormats')}</p></div>)}
                        </div>
                    ) : (
                        <div>
                            <form onSubmit={handleAddItem} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                                <input type="text" placeholder={t('subjectNamePlaceholder')} value={newItem.subject} onChange={e => setNewItem({...newItem, subject: e.target.value})} className="col-span-2 sm:col-span-4 p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
                                <select value={newItem.day} onChange={e => setNewItem({...newItem, day: e.target.value as ScheduleItem['day']})} className="p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"><option disabled value="">{t('dayOfWeek')}</option>{weekDays.map(d => <option key={d} value={d}>{t(d.toLowerCase())}</option>)}</select>
                                <input type="time" value={newItem.startTime} onChange={e => setNewItem({...newItem, startTime: e.target.value})} className="p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
                                <input type="time" value={newItem.endTime} onChange={e => setNewItem({...newItem, endTime: e.target.value})} className="p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
                                <button type="submit" className="col-span-2 sm:col-span-1 bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-600">{t('add')}</button>
                            </form>
                            <div className="space-y-2 mt-4 max-h-32 overflow-y-auto pr-2">
                                {manualSchedule.map((item, index) => (<div key={index} className="flex justify-between items-center bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md text-sm"><span><strong>{item.subject}</strong>, {t(item.day.toLowerCase())} {item.startTime}-{item.endTime}</span><button onClick={() => handleRemoveItem(index)} className="text-slate-400 hover:text-red-500"><X size={16} /></button></div>))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-center justify-center text-center p-6">
                    <Wand2 className="h-12 w-12 text-indigo-400 mb-4" />
                    <button onClick={handleAnalyze} disabled={isLoading || (inputMode === 'upload' && !file) || (inputMode === 'manual' && manualSchedule.length === 0)} className="w-full max-w-xs bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"><Wand2 />{isLoading ? t('analyzingButton') : t('analyzeButton')}</button>
                    {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
                </div>
            </div>
    );

    return (
        <div className="space-y-6">
            {editingItem && <ScheduleEditModal itemData={editingItem} onClose={() => setEditingItem(null)} onSave={handleSaveItem} onDelete={handleDeleteItem} />}

            <button onClick={handleBackToDashboard} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                <ArrowLeft size={18} /> {t('backToDashboard')}
            </button>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('plannerHeader')}</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">{t('plannerSubheader')}</p>
                    </div>
                    {timetableAnalysis && (
                        <div className="flex items-center gap-2">
                            {isEditing && (
                                <>
                                    <button onClick={() => setEditingItem({ type: 'new_schedule' })} className="hidden sm:flex items-center gap-2 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-2 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900"><PlusCircle size={16} /> {t('addClass')}</button>
                                    <button onClick={() => setEditingItem({ type: 'new_studyWindow' })} className="hidden sm:flex items-center gap-2 text-sm bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300 font-semibold px-3 py-2 rounded-lg hover:bg-green-200 dark:hover:bg-green-900"><PlusCircle size={16} /> {t('addStudyBlock')}</button>
                                </>
                            )}
                             <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg transition-colors ${isEditing ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                                <Edit3 size={16}/> {isEditing ? t('done') : t('editSchedule')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            {!timetableAnalysis && !isLoading && renderInputSection()}

            {isLoading && (<div className="text-center p-10"><Loader2 className="h-12 w-12 text-indigo-500 animate-spin mx-auto"/><p className="mt-4 font-semibold">{t('analyzingButton')}</p><p className="text-slate-500">{t('plannerDescription')}</p></div>)}
            
            {timetableAnalysis && renderTimetableGrid()}
        </div>
    );
};

export default Planner;