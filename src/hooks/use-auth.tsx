
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
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

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
        // Domain check for Google users
        if (firebaseUser.providerData.length > 0 && firebaseUser.providerData[0].providerId === 'google.com') {
          if (!firebaseUser.email?.endsWith('@neu.edu.ph')) {
            await signOut(auth);
            toast({
              variant: 'destructive',
              title: 'Invalid Institutional Email',
              description: 'Access denied. You must use your official @neu.edu.ph institutional Google account to log in.',
            });
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
        }

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.isBlocked) {
            await signOut(auth);
            toast({
              variant: 'destructive',
              title: 'Access Blocked',
              description: 'Your account has been blocked by an administrator. Please contact the library staff.',
            });
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
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'student',
            isBlocked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, newProfile);
          setProfile(newProfile);
          setUser(firebaseUser);
        } else {
          // Anonymous user session
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
    } catch (error: any) {
      console.error('Login failed:', error);
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: error.message || 'Failed to sign in with Google.',
      });
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
        throw new Error('Student ID not found. Please register or consult a librarian.');
      }

      const userData = querySnapshot.docs[0].data();
      if (userData.isBlocked) {
        throw new Error('This Student ID is currently blocked from entering the library.');
      }

      // Sign in anonymously to create a session
      const cred = await signInAnonymously(auth);
      const sessionUser = cred.user;

      // Link this anonymous session to the student profile
      await setDoc(doc(db, 'users', sessionUser.uid), {
        ...userData,
        id: sessionUser.uid,
        lastLogin: serverTimestamp(),
      });

      setProfile(userData);
      router.push('/dashboard/check-in');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Terminal Login Failed',
        description: error.message,
      });
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
