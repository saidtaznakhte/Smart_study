import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { AppState } from '../context/AppContext'; // Import AppState type

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- Authentication Functions ---
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // The signed-in user info.
    const user = result.user;
    console.log("Google Sign-In successful:", user.uid);
    return user;
  } catch (error: any) {
    console.error("Error during Google Sign-In:", error.message);
    throw error;
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    console.log("User signed out.");
  } catch (error: any) {
    console.error("Error during sign out:", error.message);
    throw error;
  }
};

// --- Firestore Data Management Functions ---

const getUserDocRef = (uid: string) => doc(db, 'users', uid);

/**
 * Saves the user's app state to Firestore.
 * Note: File content (base64 `data`) is intentionally NOT stored in localStorage
 * due to size constraints. It is expected to be retrieved or re-uploaded.
 * For large files, consider Firebase Storage.
 */
export const saveUserData = async (uid: string, data: Partial<AppState>) => {
  try {
    // Sanitize subjects to remove large base64 file data before saving
    const subjectsForStorage = data.subjects?.map(subject => ({
      ...subject,
      files: subject.files.map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        data: '', // Clear only the large base64 data string
        uploadDate: file.uploadDate,
      })),
    }));

    await setDoc(getUserDocRef(uid), {
      user: data.user,
      subjects: subjectsForStorage,
      studyIntensity: data.studyIntensity,
      timetableAnalysis: data.timetableAnalysis,
      timetableGeneratedDate: data.timetableGeneratedDate,
      dashboardInsights: data.dashboardInsights,
      notificationsEnabled: data.notificationsEnabled,
    }, { merge: true }); // Use merge to avoid overwriting other fields if they exist
    console.log("User data saved to Firestore for:", uid);
  } catch (error) {
    console.error("Error saving user data:", error);
    throw error;
  }
};

/**
 * Fetches user's app state from Firestore.
 */
export const loadUserData = async (uid: string): Promise<Partial<AppState> | null> => {
  try {
    const docSnap = await getDoc(getUserDocRef(uid));
    if (docSnap.exists()) {
      console.log("User data loaded from Firestore for:", uid);
      return docSnap.data() as Partial<AppState>;
    } else {
      console.log("No user data found for:", uid);
      return null;
    }
  } catch (error) {
    console.error("Error loading user data:", error);
    throw error;
  }
};

/**
 * Listens for real-time updates to user's app state from Firestore.
 */
export const subscribeToUserData = (uid: string, callback: (data: Partial<AppState> | null) => void): Unsubscribe => {
  const docRef = getUserDocRef(uid);
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as Partial<AppState>);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error subscribing to user data:", error);
    callback(null); // Pass null on error
  });
  return unsubscribe;
};