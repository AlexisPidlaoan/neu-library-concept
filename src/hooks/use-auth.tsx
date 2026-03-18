
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser,
  signInAnonymously,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const { auth, firestore: db } = initializeFirebase();
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'student' | 'admin';
  studentId?: string;
  isBlocked: boolean;
  isGuest?: boolean;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  pendingStudentId: string | null;
  login: (isAdmin: boolean) => Promise<void>;
  loginWithId: (id: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  cancelLinking: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const email = firebaseUser.email?.toLowerCase() || '';
          const isInstitutional = email.endsWith('@neu.edu.ph');
          const isWhitelisted = [
            'pampa4858@gmail.com', 
            'admin@neu.edu.ph', 
            'alexis.pidlaoan@neu.edu.ph', 
            'jcesperanza@neu.edu.ph'
          ].includes(email);

          // Enforce institutional domain for Google accounts
          if (!firebaseUser.isAnonymous && !isInstitutional && !isWhitelisted) {
            await signOut(auth);
            toast({ variant: 'destructive', title: 'Unauthorized', description: 'Institutional @neu.edu.ph email required.' });
            setLoading(false);
            return;
          }

          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            if (data.isBlocked) {
              await signOut(auth);
              toast({ variant: 'destructive', title: 'Blocked', description: 'Account restricted by administration.' });
              setLoading(false);
              return;
            }

            // Super Admin override for jcesperanza
            if (email === 'jcesperanza@neu.edu.ph' && data.role !== 'admin') {
              await updateDoc(userRef, { role: 'admin', updatedAt: serverTimestamp() });
              data.role = 'admin';
            }

            // Link pending ID if user just signed in with Google
            if (pendingStudentId && !data.studentId && !firebaseUser.isAnonymous) {
              await updateDoc(userRef, { studentId: pendingStudentId, updatedAt: serverTimestamp() });
              data.studentId = pendingStudentId;
              setPendingStudentId(null);
            }

            setProfile({ ...data, id: firebaseUser.uid });
            setUser(firebaseUser);
          } else {
            // Initialize New User Profile
            const newProfile: UserProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || (firebaseUser.isAnonymous ? 'Guest User' : 'New User'),
              photoURL: firebaseUser.photoURL,
              role: isWhitelisted ? 'admin' : 'student',
              studentId: pendingStudentId || undefined,
              isBlocked: false,
              isGuest: firebaseUser.isAnonymous
            };
            await setDoc(userRef, { ...newProfile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            if (newProfile.role === 'admin') await setDoc(doc(db, 'admins', firebaseUser.uid), { active: true });
            setProfile(newProfile);
            setUser(firebaseUser);
            setPendingStudentId(null);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Auth Listener Error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [pendingStudentId, toast]);

  const login = async (isAdmin: boolean) => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({ variant: 'destructive', title: 'Login Error', description: error.message });
      }
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Login Failed', description: 'Invalid admin credentials.' });
      setLoading(false);
    }
  };

  const loginWithId = async (id: string) => {
    setLoading(true);
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      
      const q = query(collection(db, 'users'), where('studentId', '==', id), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as UserProfile;
        if (userData.isBlocked) {
          toast({ variant: 'destructive', title: 'Blocked', description: 'This Student ID is currently banned.' });
          setLoading(false);
          return;
        }
        setProfile({ ...userData, id: querySnapshot.docs[0].id });
        router.push('/dashboard/check-in');
      } else {
        setPendingStudentId(id);
      }
    } catch (error: any) {
      console.error("Terminal Logic Error:", error);
      toast({ variant: 'destructive', title: 'Terminal Error', description: 'System busy. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      router.push('/dashboard/check-in');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Guest access failed.' });
      setLoading(false);
    }
  };

  const cancelLinking = () => setPendingStudentId(null);

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setPendingStudentId(null);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, pendingStudentId, 
      login, loginWithId, loginWithEmail,
      continueAsGuest, cancelLinking, logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuthContext must be used within AuthProvider');
  return context;
};
