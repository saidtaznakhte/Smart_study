
import React, { useState, useRef, useEffect, useContext } from 'react';
import { Subject, ChatMessage, SubjectFile } from '../types';
import { getChatResponse } from '../services/geminiService';
import { useLanguage } from '../context/LanguageContext';
import { Send, User, Bot, Loader2, Bookmark, CheckCircle } from 'lucide-react';
import { AppContext } from '../context/AppContext';

interface AIChatProps {
  subject: Subject;
}

const AIChat: React.FC<AIChatProps> = ({ subject }) => {
  const { dispatch } = useContext(AppContext);
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    // Clear save message after a few seconds
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [messages, saveMessage]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const filePayloads = subject.files.map(f => ({ mimeType: f.type, data: f.data }));
      const modelResponse = await getChatResponse(subject.material, newMessages, language, filePayloads);
      const modelMessage: ChatMessage = { role: 'model', content: modelResponse };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error: any) {
      console.error(error);
      const errorMessageContent = error.toString().includes('429') ? t('rateLimitError') : t('chatError');
      const errorMessage: ChatMessage = { role: 'model', content: errorMessageContent };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveChat = () => {
    if (messages.length === 0) return;

    const header = `# Chat History for ${subject.name}\n\n---\n\n`;
    const chatContent = messages.map(msg => {
      const prefix = msg.role === 'user' ? '**You:**' : '**PrepAI:**';
      return `${prefix}\n${msg.content}\n\n---\n\n`;
    }).join('');

    const markdownContent = header + chatContent;
    
    const base64Data = btoa(unescape(encodeURIComponent(markdownContent)));

    const newFile: SubjectFile = {
      id: crypto.randomUUID(),
      name: `Chat-History-${subject.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.md`,
      type: 'text/markdown',
      data: base64Data,
    };

    dispatch({
      type: 'ADD_SUBJECT_FILE',
      payload: { subjectId: subject.id, file: newFile }
    });
    
    setSaveMessage(`${t('chatSaved')} "${newFile.name}"`); // Set message
  };

  return (
    <div className="max-w-2xl mx-auto h-[70vh] flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <div className="sm:text-left">
            <h2 className="text-lg font-semibold">{t('aiAssistantFor', { subject: subject.name })}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('aiChatSubtextFiles')}</p>
        </div>
        <button 
            onClick={handleSaveChat}
            disabled={messages.length === 0}
            className="flex items-center gap-2 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-2 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('saveChat')}
        >
            <Bookmark size={16} />
            <span className="hidden sm:inline">{t('saveChat')}</span>
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-4" role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
            <Bot size={48} />
            <p className="mt-2">{t('startConversation')}</p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white"><Bot size={18}/></div>}
            <div className={`max-w-md p-3 rounded-xl ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
              <p className="text-sm">{msg.content}</p>
            </div>
             {msg.role === 'user' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-white"><User size={18}/></div>}
          </div>
        ))}
         {isLoading && (
          <div className="flex gap-3 justify-start">
             <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white"><Bot size={18}/></div>
             <div className="max-w-md p-3 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center">
              <Loader2 className="animate-spin h-5 w-5 text-slate-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chatPlaceholder')}
            className="flex-1 p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            disabled={isLoading}
          />
          <button type="submit" className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors" disabled={isLoading || !input.trim()}>
            <Send size={20} />
          </button>
        </form>
        {saveMessage && (
            <div 
                className="mt-2 p-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg flex items-center justify-center gap-2 animate-in fade-in duration-300 text-sm" 
                role="status" 
                aria-live="polite"
            >
                <CheckCircle size={16} />
                <span>{saveMessage}</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default AIChat;
