'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser,
  signInAnonymously
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

// Force prompt to ensure account selection if multiple accounts exist
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
      if (firebaseUser) {
        const email = firebaseUser.email?.toLowerCase() || '';
        const isInstitutional = email.endsWith('@neu.edu.ph');
        
        // Define hardcoded super admins
        const isWhitelisted = [
          'pampa4858@gmail.com', 
          'admin@neu.edu.ph', 
          'alexis.pidlaoan@neu.edu.ph', 
          'jcesperanza@neu.edu.ph'
        ].includes(email);
        
        // Block non-institutional emails unless whitelisted
        if (!firebaseUser.isAnonymous && !isInstitutional && !isWhitelisted) {
          await signOut(auth);
          toast({
            variant: 'destructive',
            title: 'Unauthorized Domain',
            description: 'Access is restricted to @neu.edu.ph accounts.'
          });
          setLoading(false);
          return;
        }

        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          
          if (data.isBlocked) {
            await signOut(auth);
            toast({
              variant: 'destructive',
              title: 'Access Restricted',
              description: 'This account has been blocked by administration.'
            });
            setLoading(false);
            return;
          }

          // Link ID if user was in pending state
          if (pendingStudentId && !data.studentId && !firebaseUser.isAnonymous) {
            await updateDoc(userRef, { studentId: pendingStudentId, updatedAt: serverTimestamp() });
            data.studentId = pendingStudentId;
            setPendingStudentId(null);
          }

          // Ensure whitelisted admins keep their role
          if (isWhitelisted && data.role !== 'admin') {
            await updateDoc(userRef, { role: 'admin', updatedAt: serverTimestamp() });
            data.role = 'admin';
          }
          
          setProfile({ ...data, id: firebaseUser.uid });
          setUser(firebaseUser);
          
          // Initial redirect
          const path = window.location.pathname;
          if (path === '/' || path === '/admin/login') {
            router.push(data.role === 'admin' ? '/admin/dashboard' : '/dashboard/check-in');
          }
        } else {
          // New User Creation
          const newProfile: UserProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: isWhitelisted ? 'admin' : 'student',
            studentId: pendingStudentId || undefined,
            isBlocked: false,
            isGuest: firebaseUser.isAnonymous
          };
          
          await setDoc(userRef, {
            ...newProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          if (isWhitelisted) {
             await setDoc(doc(db, 'admins', firebaseUser.uid), { active: true });
          }
          
          setProfile(newProfile);
          setUser(firebaseUser);
          setPendingStudentId(null);
          
          if (window.location.pathname === '/') {
            router.push('/dashboard/check-in');
          }
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pendingStudentId, toast, router]);

  const login = async (isAdmin: boolean) => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        toast({ title: 'Login Cancelled', description: 'The sign-in popup was closed.' });
      } else {
        toast({ variant: 'destructive', title: 'Login Error', description: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithId = async (id: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('studentId', '==', id), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as UserProfile;
        if (userData.isBlocked) {
          toast({ variant: 'destructive', title: 'Access Denied', description: 'This ID has been blocked.' });
          setLoading(false);
          return;
        }
        // Manual login simulation for Terminal
        setProfile({ ...userData, id: querySnapshot.docs[0].id });
        setUser({ 
          uid: querySnapshot.docs[0].id, 
          displayName: userData.displayName, 
          email: userData.email,
          photoURL: userData.photoURL 
        } as any);
        router.push('/dashboard/check-in');
      } else {
        setPendingStudentId(id);
      }
    } catch (error) {
      console.error("Terminal Login Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Guest Auth Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const cancelLinking = () => setPendingStudentId(null);

  const logout = async () => {
    await signOut(auth);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, pendingStudentId, 
      login, loginWithId, 
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
