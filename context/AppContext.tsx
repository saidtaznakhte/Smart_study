import React, { createContext, useReducer, Dispatch, ReactNode, useEffect } from 'react';
import { User, Subject, StudyIntensity, SubjectDifficulty, TimetableAnalysis, SubjectFile, Flashcard, QuizQuestion, QuizType, ProgressEvent, DailyDashboardData } from '../types';

interface AppState {
  view: 'onboarding' | 'dashboard' | 'subject' | 'planner' | 'profile' | 'imageEditor';
  user: User | null;
  subjects: Subject[];
  studyIntensity: StudyIntensity | null;
  activeSubjectId: string | null;
  timetableAnalysis: TimetableAnalysis | null;
  timetableGeneratedDate: string | null; // New field
  dashboardInsights: DailyDashboardData | null;
  notificationsEnabled: boolean;
}

type Action =
  | { type: 'COMPLETE_ONBOARDING'; payload: { user: User; subjects: { name: string, difficulty: SubjectDifficulty, examDate: string }[]; intensity: StudyIntensity } }
  | { type: 'VIEW_DASHBOARD' }
  | { type: 'VIEW_SUBJECT'; payload: { subjectId: string } }
  | { type: 'ADD_SUBJECT'; payload: { subjectName: string, difficulty: SubjectDifficulty, examDate: string } }
  | { type: 'UPDATE_SUBJECT_MATERIAL'; payload: { subjectId: string; material: string } }
  | { type: 'SET_SUMMARY'; payload: { subjectId: string; summary: string } }
  | { type: 'SET_FLASHCARDS'; payload: { subjectId: string; flashcards: Omit<Flashcard, 'id' | 'easinessFactor' | 'interval' | 'repetitions' | 'dueDate'>[] } }
  | { type: 'SET_QUIZZES'; payload: { subjectId: string; quizzes: { [key in QuizType]?: QuizQuestion[] } } }
  | { type: 'UPDATE_READINESS'; payload: { subjectId: string; score: number } }
  | { type: 'ADD_SUBJECT_FILE'; payload: { subjectId: string; file: SubjectFile } }
  | { type: 'REMOVE_SUBJECT_FILE'; payload: { subjectId: string; fileId: string } }
  | { type: 'CLEAR_SUBJECT_CONTENT'; payload: { subjectId: string } }
  | { type: 'UPDATE_FLASHCARD_PROGRESS'; payload: { subjectId: string, cardId: string, quality: number }}
  | { type: 'VIEW_PLANNER' }
  | { type: 'VIEW_IMAGE_EDITOR' }
  | { type: 'UPDATE_TIMETABLE_ANALYSIS', payload: TimetableAnalysis }
  | { type: 'LOG_PROGRESS_EVENT', payload: { subjectId: string, event: Omit<ProgressEvent, 'date'> }}
  | { type: 'SET_DASHBOARD_INSIGHTS', payload: DailyDashboardData }
  | { type: 'VIEW_PROFILE' }
  | { type: 'UPDATE_PROFILE'; payload: { user: User; intensity: StudyIntensity; notifications: boolean } }
  | { type: 'RESET_APP' };


const STORAGE_KEY = 'prepAIAppState';

const initialState: AppState = {
  view: 'onboarding',
  user: null,
  subjects: [],
  studyIntensity: null,
  activeSubjectId: null,
  timetableAnalysis: null,
  timetableGeneratedDate: null, // Initial state for new field
  dashboardInsights: null,
  notificationsEnabled: true,
};

// Spaced Repetition Logic (SM-2 Algorithm)
const calculateSpacedRepetition = (card: Flashcard, quality: number): Flashcard => {
  if (quality < 3) {
    // If incorrect, reset progress
    return { ...card, repetitions: 0, interval: 1, dueDate: new Date(Date.now() + 86400000).toISOString() };
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
  
  const dueDate = new Date(Date.now() + newInterval * 86400000).toISOString();

  return { ...card, easinessFactor: newEasinessFactor, repetitions: newRepetitions, interval: newInterval, dueDate };
};


const AppReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        view: 'dashboard',
        user: action.payload.user,
        subjects: action.payload.subjects.map(s => ({
          id: crypto.randomUUID(),
          name: s.name,
          difficulty: s.difficulty,
          examDate: s.examDate,
          files: [],
          material: '',
          summary: null,
          flashcards: [],
          quizzes: {},
          readinessScore: 0,
          progress: [],
        })),
        studyIntensity: action.payload.intensity,
      };
    case 'VIEW_DASHBOARD':
      return { ...state, view: 'dashboard', activeSubjectId: null };
    case 'VIEW_SUBJECT':
      return { ...state, view: 'subject', activeSubjectId: action.payload.subjectId };
    case 'ADD_SUBJECT':
      const newSubject: Subject = {
        id: crypto.randomUUID(),
        name: action.payload.subjectName,
        difficulty: action.payload.difficulty,
        examDate: action.payload.examDate,
        files: [],
        material: '',
        summary: null,
        flashcards: [],
        quizzes: {},
        readinessScore: 0,
        progress: [],
      };
      return { ...state, subjects: [...state.subjects, newSubject] };
    case 'UPDATE_SUBJECT_MATERIAL':
      return {
        ...state,
        subjects: state.subjects.map(s =>
          s.id === action.payload.subjectId ? { ...s, material: action.payload.material, readinessScore: 25 } : s
        ),
      };
    case 'SET_SUMMARY':
      return {
        ...state,
        subjects: state.subjects.map(s =>
          s.id === action.payload.subjectId
            ? { ...s, summary: action.payload.summary, readinessScore: Math.min(100, s.readinessScore + 10) }
            : s
        ),
      };
    case 'SET_FLASHCARDS':
      return {
        ...state,
        subjects: state.subjects.map(s =>
          s.id === action.payload.subjectId
            ? {
                ...s,
                flashcards: action.payload.flashcards.map(fc => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return {
                    ...fc,
                    id: crypto.randomUUID(),
                    easinessFactor: 2.5,
                    interval: 0,
                    repetitions: 0,
                    dueDate: today.toISOString(),
                  };
                }),
                readinessScore: Math.min(100, s.readinessScore + 15),
              }
            : s
        ),
      };
    case 'SET_QUIZZES':
      return {
        ...state,
        subjects: state.subjects.map(s =>
          s.id === action.payload.subjectId
            ? { ...s, quizzes: action.payload.quizzes, readinessScore: Math.min(100, s.readinessScore + 15) }
            : s
        ),
      };
    case 'UPDATE_READINESS':
       return {
        ...state,
        subjects: state.subjects.map(s =>
          s.id === action.payload.subjectId
            ? { ...s, readinessScore: Math.min(100, s.readinessScore + action.payload.score) }
            : s
        ),
      };
    case 'ADD_SUBJECT_FILE':
      return {
        ...state,
        subjects: state.subjects.map(s =>
          s.id === action.payload.subjectId
            ? { ...s, files: [...s.files, action.payload.file] }
            : s
        ),
      };
    case 'REMOVE_SUBJECT_FILE':
      return {
        ...state,
        subjects: state.subjects.map(s =>
          s.id === action.payload.subjectId
            ? { ...s, files: s.files.filter(f => f.id !== action.payload.fileId) }
            : s
        ),
      };
    case 'CLEAR_SUBJECT_CONTENT':
       return {
        ...state,
        subjects: state.subjects.map(s =>
          s.id === action.payload.subjectId
            ? { ...s, summary: null, flashcards: [], quizzes: {}, readinessScore: 25 }
            : s
        ),
      };
    case 'UPDATE_FLASHCARD_PROGRESS':
      return {
        ...state,
        subjects: state.subjects.map(s => {
          if (s.id !== action.payload.subjectId) return s;
          return {
            ...s,
            flashcards: s.flashcards.map(fc => 
              fc.id === action.payload.cardId 
                ? calculateSpacedRepetition(fc, action.payload.quality) 
                : fc
            ),
          };
        }),
      };
    case 'VIEW_PLANNER':
      return { ...state, view: 'planner' };
    case 'VIEW_IMAGE_EDITOR':
      return { ...state, view: 'imageEditor', activeSubjectId: null };
    case 'UPDATE_TIMETABLE_ANALYSIS':
      return { ...state, timetableAnalysis: action.payload, timetableGeneratedDate: action.payload.generatedDate };
    case 'LOG_PROGRESS_EVENT':
      return {
        ...state,
        subjects: state.subjects.map(s =>
          s.id === action.payload.subjectId
            ? {
                ...s,
                progress: [...s.progress, { ...action.payload.event, date: new Date().toISOString() }],
              }
            : s
        ),
      };
    case 'SET_DASHBOARD_INSIGHTS':
      return { ...state, dashboardInsights: action.payload };
    case 'VIEW_PROFILE':
      return { ...state, view: 'profile', activeSubjectId: null };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        user: action.payload.user,
        studyIntensity: action.payload.intensity,
        notificationsEnabled: action.payload.notifications,
      };
    case 'RESET_APP':
      localStorage.removeItem(STORAGE_KEY);
      return { ...initialState, view: 'onboarding' };
    default:
      return state;
  }
};

export const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => null,
});

const loadState = (): AppState | undefined => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (serializedState === null) {
      return undefined;
    }
    const storedState = JSON.parse(serializedState);
    if (storedState.user) {
       return {
         ...initialState,
         ...storedState,
         notificationsEnabled: storedState.notificationsEnabled ?? true,
         timetableGeneratedDate: storedState.timetableGeneratedDate ?? null, // Load new field
         view: 'dashboard',
         activeSubjectId: null,
       };
    }
    return undefined;
  } catch (error) {
    console.error("Could not load state from localStorage", error);
    return undefined;
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(AppReducer, initialState, (initial) => loadState() || initial);

  useEffect(() => {
    try {
      // Create a version of the subjects array that's safe for localStorage
      const subjectsForStorage = state.subjects.map(subject => ({
        // Persist everything from the subject...
        ...subject,
        // ...except for the large base64 data within files.
        // NOTE: File content (base64 `data`) is intentionally NOT stored in localStorage
        // due to size constraints. It is expected to be retrieved or re-uploaded.
        // File metadata (id, name, type, uploadDate) is retained.
        files: subject.files.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          data: '', // Clear only the large base64 data string
          uploadDate: file.uploadDate, // Persist upload date
        })),
      }));

      const stateToSave = {
        // Persist these top-level state properties
        user: state.user,
        subjects: subjectsForStorage, // Use the sanitized subjects array
        studyIntensity: state.studyIntensity,
        timetableAnalysis: state.timetableAnalysis,
        timetableGeneratedDate: state.timetableGeneratedDate, // Save new field
        dashboardInsights: state.dashboardInsights,
        notificationsEnabled: state.notificationsEnabled,
      };
      
      const serializedState = JSON.stringify(stateToSave);
      localStorage.setItem(STORAGE_KEY, serializedState);
    } catch (error) {
       console.error("Could not save state to localStorage", error);
    }
  }, [state.user, state.subjects, state.studyIntensity, state.timetableAnalysis, state.timetableGeneratedDate, state.dashboardInsights, state.notificationsEnabled]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};