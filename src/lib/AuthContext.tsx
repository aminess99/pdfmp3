import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  firebaseSignOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp,
  FirebaseUser
} from './firebase';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to determine role
  const checkIsAdmin = (email?: string | null) => {
    if (!email) return false;
    const lower = email.toLowerCase();
    return lower === 'aminefiverr1996@gmail.com';
  };

  useEffect(() => {
    // 1. Check local session fallback
    try {
      const cached = localStorage.getItem('pdf_audio_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        setUser({
          uid: parsed.uid || 'local-user',
          name: parsed.name || 'مستخدم',
          email: parsed.email || '',
          role: checkIsAdmin(parsed.email) ? 'admin' : 'user',
        });
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

    // 2. Listen to real Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser && firebaseUser.email) {
        const isAdminRole = checkIsAdmin(firebaseUser.email);
        const appUser: AppUser = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL || undefined,
          role: isAdminRole ? 'admin' : 'user',
        };

        setUser(appUser);
        localStorage.setItem('pdf_audio_user', JSON.stringify(appUser));

        // Sync to Firestore Users collection
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userDocRef);
          if (!snap.exists()) {
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              displayName: appUser.name,
              email: appUser.email,
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.warn('Firestore sync note:', err);
        }
      } else {
        // No Firebase session: drop the optimistic cached user
        setUser(null);
        localStorage.removeItem('pdf_audio_user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    if (cred.user && cred.user.email) {
      const appUser: AppUser = {
        uid: cred.user.uid,
        name: cred.user.displayName || cred.user.email.split('@')[0],
        email: cred.user.email,
        role: checkIsAdmin(cred.user.email) ? 'admin' : 'user',
      };
      setUser(appUser);
      localStorage.setItem('pdf_audio_user', JSON.stringify(appUser));
    }
  };

  const signUpWithEmail = async (name: string, email: string, pass: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await updateProfile(cred.user, { displayName: name });
      const appUser: AppUser = {
        uid: cred.user.uid,
        name,
        email: cred.user.email || email,
        role: checkIsAdmin(cred.user.email || email) ? 'admin' : 'user',
      };
      setUser(appUser);
      localStorage.setItem('pdf_audio_user', JSON.stringify(appUser));

      // Save to Firestore
      try {
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          displayName: name,
          email: cred.user.email,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Firestore user doc create error:', err);
      }
    }
  };

  const signInWithGoogle = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    if (res.user && res.user.email) {
      const appUser: AppUser = {
        uid: res.user.uid,
        name: res.user.displayName || res.user.email.split('@')[0],
        email: res.user.email,
        photoURL: res.user.photoURL || undefined,
        role: checkIsAdmin(res.user.email) ? 'admin' : 'user',
      };
      setUser(appUser);
      localStorage.setItem('pdf_audio_user', JSON.stringify(appUser));

      try {
        await setDoc(doc(db, 'users', res.user.uid), {
          uid: res.user.uid,
          displayName: appUser.name,
          email: appUser.email,
          createdAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn(e);
    }
    setUser(null);
    localStorage.removeItem('pdf_audio_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        resetPassword,
        isAdmin: Boolean(user && user.role === 'admin'),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
