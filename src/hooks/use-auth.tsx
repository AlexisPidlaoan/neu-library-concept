
"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User, 
  GoogleAuthProvider,
  signInAnonymously
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';

const { auth, firestore: db } = initializeFirebase();
const googleProvider = new GoogleAuthProvider();

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithId: (studentId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  login: async () => {},
  loginWithId: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If it's a real user from Google, check domain
        if (firebaseUser.providerData.length > 0 && !firebaseUser.email?.endsWith('@neu.edu.ph')) {
          await signOut(auth);
          alert('Access denied. Only @neu.edu.ph accounts are allowed.');
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.isBlocked) {
            await signOut(auth);
            alert('Your account is blocked. Please contact the administrator.');
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
          setProfile(userData);
          setUser(firebaseUser);
        } else if (firebaseUser.providerData.length > 0) {
          // New Google User
          const newProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'student',
            isBlocked: false,
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, newProfile);
          setProfile(newProfile);
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loginWithId = async (studentId: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('studentId', '==', studentId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('ID not found. Please register or see an admin.');
      }

      const userData = querySnapshot.docs[0].data();
      if (userData.isBlocked) {
        throw new Error('This ID is blocked.');
      }

      // In a real app, we'd sign in properly. 
      // For this MVP, we simulate login by signing in anonymously if not already signed in,
      // and linking the profile in state.
      await signInAnonymously(auth);
      setProfile(userData);
      // setUser is handled by onAuthStateChanged, but we override profile immediately
      router.push('/dashboard/check-in');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithId, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
