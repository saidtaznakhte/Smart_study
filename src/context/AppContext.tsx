import React, { createContext, useReducer, Dispatch, ReactNode, useEffect, useState } from 'react';
import { User, Subject, StudyIntensity, SubjectDifficulty, TimetableAnalysis, SubjectFile, Flashcard, QuizQuestion, QuizType, ProgressEvent, DailyDashboardData } from '../types';
import { auth, db, saveUserData, loadUserData } from '../services/firebaseService';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';

interface AppState {
  view: 'onboarding' | 'dashboard' | 'subject' | 'planner' | 'profile' | 'imageEditor';
  user: User | null;
  subjects: Subject[];
  studyIntensity: StudyIntensity | null;
  activeSubjectId: string | null;
  timetableAnalysis: TimetableAnalysis | null;
  timetableGeneratedDate: string | null;
  dashboardInsights: DailyDashboardData | null;
  notificationsEnabled: boolean;
  isAuthenticated: boolean; // New field to track auth status
  isAuthLoading: boolean; // New field to track auth loading
}

type Action =
  | { type: 'COMPLETE_ONBOARDING'; payload: { user: Omit<User, 'uid'>; subjects: { name: string, difficulty: SubjectDifficulty, examDate: string }[]; intensity: StudyIntensity } }
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
  | { type: 'UPDATE_PROFILE'; payload: { user: Omit<User, 'uid'>; intensity: StudyIntensity; notifications: boolean } }
  | { type: 'RESET_APP' }
  | { type: 'SET_AUTH_STATE'; payload: { isAuthenticated: boolean; isAuthLoading: boolean; firebaseUser: FirebaseUser | null } }
  | { type: 'SET_USER_DATA'; payload: Partial<AppState> | null };


const initialState: AppState = {
  view: 'onboarding',
  user: null,
  subjects: [],
  studyIntensity: null,
  activeSubjectId: null,
  timetableAnalysis: null,
  timetableGeneratedDate: null,
  dashboardInsights: null,
  notificationsEnabled: true,
  isAuthenticated: false,
  isAuthLoading: true,
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
    case 'SET_AUTH_STATE':
      return {
        ...state,
        isAuthenticated: action.payload.isAuthenticated,
        isAuthLoading: action.payload.isAuthLoading,
        // Clear user data if not authenticated
        user: action.payload.isAuthenticated ? state.user : null,
        subjects: action.payload.isAuthenticated ? state.subjects : [],
        studyIntensity: action.payload.isAuthenticated ? state.studyIntensity : null,
        timetableAnalysis: action.payload.isAuthenticated ? state.timetableAnalysis : null,
        timetableGeneratedDate: action.payload.isAuthenticated ? state.timetableGeneratedDate : null,
        dashboardInsights: action.payload.isAuthenticated ? state.dashboardInsights : null,
        notificationsEnabled: action.payload.isAuthenticated ? state.notificationsEnabled : true,
        view: action.payload.isAuthenticated ? (state.user ? state.view : 'onboarding') : 'onboarding', // Go to onboarding if new user
      };
    case 'SET_USER_DATA':
      if (action.payload) {
        // If user data exists, load it. If not, keep initial state for onboarding.
        const loadedState = {
          ...state,
          ...action.payload,
          user: action.payload.user ? { ...action.payload.user, uid: state.user?.uid || '' } : null, // Ensure UID is preserved
          view: action.payload.user ? 'dashboard' : 'onboarding', // If user data exists, go to dashboard, else onboarding
          activeSubjectId: null, // Always reset active subject on load
          notificationsEnabled: action.payload.notificationsEnabled ?? true, // Default to true if not set
        };
        return loadedState;
      }
      return { ...state, view: 'onboarding' }; // No data found, go to onboarding
    case 'COMPLETE_ONBOARDING':
      if (!state.user?.uid) return state; // Should not happen if authenticated
      return {
        ...state,
        view: 'dashboard',
        user: { ...action.payload.user, uid: state.user.uid }, // Add UID to user object
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
      if (!state.user?.uid) return state;
      return {
        ...state,
        user: { ...action.payload.user, uid: state.user.uid },
        studyIntensity: action.payload.intensity,
        notificationsEnabled: action.payload.notifications,
      };
    case 'RESET_APP':
      // When resetting, clear all user-specific data and sign out
      auth.signOut(); // Sign out from Firebase
      return { ...initialState, isAuthLoading: false }; // Reset to initial state, ready for new sign-in
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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(AppReducer, initialState);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Auth state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: true, isAuthLoading: false, firebaseUser: user } });
        // Load user data from Firestore
        try {
          const userData = await loadUserData(user.uid);
          if (userData) {
            // If user data exists, set it.
            dispatch({ type: 'SET_USER_DATA', payload: { ...userData, user: { ...userData.user, uid: user.uid } as User } });
          } else {
            // If no user data, it's a new user, go to onboarding.
            dispatch({ type: 'SET_USER_DATA', payload: { user: { uid: user.uid, fullName: user.displayName || '', gradeLevel: '', schoolName: '' } as User, view: 'onboarding' } });
          }
        } catch (error) {
          console.error("Error loading user data on auth state change:", error);
          dispatch({ type: 'SET_USER_DATA', payload: null }); // Fallback to onboarding on error
        }
      } else {
        setFirebaseUser(null);
        dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: false, isAuthLoading: false, firebaseUser: null } });
        dispatch({ type: 'SET_USER_DATA', payload: null }); // Clear user data on sign out
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Firestore data listener and saver
  useEffect(() => {
    let unsubscribeFirestore: Unsubscribe | undefined;

    if (firebaseUser && state.isAuthenticated && !state.isAuthLoading) {
      // Set up real-time listener for user data
      unsubscribeFirestore = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<AppState>;
          // Only update state if it's different from current to avoid infinite loops
          // This is a shallow comparison, for deep changes, more complex logic is needed
          if (JSON.stringify(data) !== JSON.stringify({
            user: state.user,
            subjects: state.subjects.map(s => ({...s, files: s.files.map(f => ({...f, data: ''}))})), // Compare without file data
            studyIntensity: state.studyIntensity,
            timetableAnalysis: state.timetableAnalysis,
            timetableGeneratedDate: state.timetableGeneratedDate,
            dashboardInsights: state.dashboardInsights,
            notificationsEnabled: state.notificationsEnabled,
          })) {
            dispatch({ type: 'SET_USER_DATA', payload: { ...data, user: { ...data.user, uid: firebaseUser.uid } as User } });
          }
        } else {
          // Document doesn't exist, might be a new user or data was deleted
          // If it's a new user, the onboarding flow will handle initial data creation
          // If data was deleted, reset to onboarding state
          if (state.user?.uid === firebaseUser.uid) { // Only reset if the current user's data is missing
             dispatch({ type: 'SET_USER_DATA', payload: null });
          }
        }
      }, (error) => {
        console.error("Error listening to Firestore data:", error);
      });
    }

    // Save data to Firestore whenever relevant parts of the state change
    // This effect runs after every dispatch that modifies the state.
    // We only save if authenticated and not currently loading auth state.
    if (firebaseUser && state.isAuthenticated && !state.isAuthLoading && state.user?.uid === firebaseUser.uid) {
      const stateToSave: Partial<AppState> = {
        user: state.user,
        subjects: state.subjects,
        studyIntensity: state.studyIntensity,
        timetableAnalysis: state.timetableAnalysis,
        timetableGeneratedDate: state.timetableGeneratedDate,
        dashboardInsights: state.dashboardInsights,
        notificationsEnabled: state.notificationsEnabled,
      };
      saveUserData(firebaseUser.uid, stateToSave);
    }

    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, [state.user, state.subjects, state.studyIntensity, state.timetableAnalysis, state.timetableGeneratedDate, state.dashboardInsights, state.notificationsEnabled, firebaseUser, state.isAuthenticated, state.isAuthLoading]);


  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};