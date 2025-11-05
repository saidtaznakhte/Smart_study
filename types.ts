export enum StudyIntensity {
  LIGHT = 'Light',
  MODERATE = 'Moderate',
  INTENSE = 'Intense',
}

export enum SubjectDifficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard',
}

export enum QuizType {
  MULTIPLE_CHOICE = 'Multiple Choice',
  TRUE_FALSE = 'True/False',
  FILL_IN_THE_BLANK = 'Fill-in-the-Blank',
}

export enum GenerationAmount {
  FEW = 'Few',
  NORMAL = 'Normal',
  A_LOT = 'A lot',
}

export interface User {
  fullName: string;
  gradeLevel: string;
  schoolName: string;
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  // Spaced Repetition Fields
  easinessFactor: number;
  interval: number;
  repetitions: number;
  dueDate: string; // ISO String
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string[];
  explanation: string;
}

export interface SubjectFile {
  id: string;
  name: string;
  type: string; // Mime type
  data: string; // Base64 encoded
  uploadDate?: string; // ISO String
}

export interface ProgressEvent {
  type: 'quiz' | 'flashcards';
  date: string; // ISO String
  score?: number; // For quizzes
  cardsReviewed?: number; // For flashcards
}

export interface DashboardInsights {
  dailyReport: string;
  learningTip: string;
  reminders: {
    subjectName: string;
    text: string;
  }[];
}

export interface DailyDashboardData {
  date: string; // ISO String of the day it was generated for
  insights: DashboardInsights;
}

export interface Subject {
  id: string;
  name: string;
  difficulty: SubjectDifficulty;
  examDate?: string;
  files: SubjectFile[];
  material: string;
  summary: string | null;
  flashcards: Flashcard[];
  quizzes: {
    [key in QuizType]?: QuizQuestion[];
  };
  readinessScore: number;
  progress: ProgressEvent[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ScheduleItem {
  id: string;
  subject: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string;
  endTime: string;
}

export interface StudyWindow {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string;
  endTime: string;
  suggestion: string;
}

export interface TimetableAnalysis {
  schedule: ScheduleItem[];
  studyWindows: StudyWindow[];
}