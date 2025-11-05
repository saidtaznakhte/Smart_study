
import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { editImage } from '../services/geminiService';
import { ArrowLeft, Upload, Loader2, Wand2, FileUp, Download, Image as ImageIcon } from 'lucide-react';

interface OriginalImage {
    file: File;
    base64: string;
    url: string;
}

const ImageEditor: React.FC = () => {
    const { dispatch } = useContext(AppContext);
    const { t } = useLanguage();

    const [originalImage, setOriginalImage] = useState<OriginalImage | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBackToDashboard = () => dispatch({ type: 'VIEW_DASHBOARD' });

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    const handleFileSelected = async (file: File) => {
        if (!file || file.size === 0) {
            setError(t('invalidOrEmptyFile'));
            return;
        }
        if (!file.type.startsWith('image/')) {
            setError(t('pleaseUploadImageFile'));
            return;
        }
        setError(null);
        setEditedImage(null);
        const base64 = await fileToBase64(file);
        setOriginalImage({
            file,
            base64,
            url: URL.createObjectURL(file),
        });
    };
    
    const handleGenerate = async () => {
        if (!originalImage) {
            setError(t('errorNoImage'));
            return;
        }
        if (!prompt.trim()) {
            setError(t('errorNoPrompt'));
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setEditedImage(null);

        try {
            const newBase64Image = await editImage(originalImage.base64, originalImage.file.type, prompt);
            setEditedImage(newBase64Image);
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
    };

    // Drag and Drop handlers
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelected(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
        }
    };
    
    const generateDownloadFilename = () => {
        const promptSlug = prompt.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
        return `PrepAI-Edited-${promptSlug || 'image'}.png`;
    }

    return (
        <div className="space-y-6">
            <button onClick={handleBackToDashboard} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                <ArrowLeft size={18} /> {t('backToDashboard')}
            </button>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('imageEditorTitle')}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{t('imageEditorDescription')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-4">
                    <h2 className="text-xl font-bold">{t('uploadAnImage')}</h2>
                    <div 
                        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                        {originalImage ? (
                             <img src={originalImage.url} alt="Original" className="max-h-48 rounded-lg object-contain" />
                        ) : (
                            <div className="text-center text-slate-500 dark:text-slate-400">
                                <FileUp className="mx-auto h-10 w-10"/>
                                <p className="mt-2 font-semibold">{t('dragAndDropImage')}</p>
                                <p className="text-sm">{t('or')} <span className="text-indigo-600 dark:text-indigo-400 font-medium">{t('browseFiles')}</span></p>
                            </div>
                        )}
                    </div>

                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={t('imagePromptPlaceholder')}
                        className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                        disabled={isLoading}
                        rows={3}
                    />
                     <button
                        onClick={handleGenerate}
                        disabled={isLoading || !originalImage}
                        className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                        {isLoading ? <Loader2 className="animate-spin" /> : <Wand2 />}
                        {isLoading ? t('generatingButton') : t('generateEdit')}
                    </button>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                </div>

                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2"><ImageIcon className="text-indigo-500" /> {t('editedImageTitle')}</h2>
                        {editedImage && (
                             <a 
                                href={`data:image/png;base64,${editedImage}`}
                                download={generateDownloadFilename()}
                                className="flex items-center gap-2 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-2 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900"
                            >
                                <Download size={16} /> {t('downloadImage')}
                            </a>
                        )}
                    </div>
                    <div className="flex-grow flex items-center justify-center bg-slate-100 dark:bg-slate-900/50 rounded-lg overflow-hidden">
                        {isLoading && (
                            <div className="flex flex-col items-center gap-4 text-slate-500">
                                <Loader2 className="h-10 w-10 animate-spin" />
                                <span className="font-semibold">{t('generatingButton')}</span>
                            </div>
                        )}
                        {!isLoading && editedImage && (
                            <img src={`data:image/png;base64,${editedImage}`} alt="Edited" className="max-w-full max-h-full object-contain" />
                        )}
                        {!isLoading && !editedImage && (
                            <div className="text-center text-slate-500 dark:text-slate-400 p-10">
                                <ImageIcon size={40} className="mx-auto mb-2"/>
                                <p>{t('editedImagePlaceholder')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageEditor;