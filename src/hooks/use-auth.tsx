
'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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

const SUPER_ADMINS = [
  'jcesperanza@neu.edu.ph',
  'alexis.pidlaoan@neu.edu.ph', 
  'pampa4858@gmail.com', 
  'admin@neu.edu.ph'
];

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
  
  const manualProfileRef = useRef<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (manualProfileRef.current) {
        setLoading(false);
        return;
      }

      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const email = firebaseUser.email?.toLowerCase() || '';
        const isSuperAdmin = SUPER_ADMINS.includes(email);
        
        const isInstitutional = email.endsWith('@neu.edu.ph') || isSuperAdmin;

        if (!firebaseUser.isAnonymous && !isInstitutional) {
          await signOut(auth);
          toast({ variant: 'destructive', title: 'Institutional Required', description: 'Use your @neu.edu.ph account.' });
          setLoading(false);
          return;
        }

        // Set user immediately to stop loading if profile takes time
        setUser(firebaseUser);
        setLoading(false);

        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);

        let currentProfile: UserProfile;

        if (userDoc.exists()) {
          const data = userDoc.data();
          currentProfile = { id: firebaseUser.uid, ...data } as UserProfile;
          
          if (currentProfile.isBlocked) {
            await signOut(auth);
            toast({ variant: 'destructive', title: 'Blocked', description: 'Access restricted.' });
            setProfile(null);
            setUser(null);
            return;
          }

          if (isSuperAdmin && currentProfile.role !== 'admin') {
            updateDoc(userRef, { role: 'admin' });
            currentProfile.role = 'admin';
          }
        } else {
          currentProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || (firebaseUser.isAnonymous ? 'Guest Student' : 'NEU Student'),
            photoURL: firebaseUser.photoURL,
            role: isSuperAdmin ? 'admin' : 'student',
            isBlocked: false,
            isGuest: firebaseUser.isAnonymous
          };
          
          setDoc(userRef, { ...currentProfile, createdAt: serverTimestamp() });
          
          if (currentProfile.role === 'admin') {
            setDoc(doc(db, 'admins', firebaseUser.uid), { active: true });
          }
        }

        setProfile(currentProfile);
      } catch (err) {
        console.error("Auth Listener Error:", err);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [toast]);

  const login = async (isAdmin: boolean) => {
    setLoading(true);
    manualProfileRef.current = false;
    try {
      await signInWithPopup(auth, googleProvider);
      router.push(isAdmin ? '/admin/dashboard' : '/dashboard/check-in');
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({ variant: 'destructive', title: 'Login Error', description: error.message });
      }
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
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const userData = snap.docs[0].data() as UserProfile;
        if (userData.isBlocked) {
          toast({ variant: 'destructive', title: 'Blocked', description: 'This ID is restricted.' });
          setLoading(false);
          return;
        }

        manualProfileRef.current = true;
        setProfile({ ...userData, id: snap.docs[0].id });
        setUser(auth.currentUser);
        setPendingStudentId(null);
        setLoading(false);
        router.push('/dashboard/check-in');
      } else {
        setPendingStudentId(id);
        setLoading(false); 
      }
    } catch (error: any) {
      console.error("Terminal Login Error:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Terminal connection error.' });
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    manualProfileRef.current = false;
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const userRef = doc(db, 'users', cred.user.uid);
      const userDoc = await getDoc(userRef);
      const isAdmin = userDoc.exists() && userDoc.data()?.role === 'admin';
      
      if (!isAdmin) {
        await signOut(auth);
        toast({ variant: 'destructive', title: 'Access Denied', description: 'Not an administrator.' });
        setLoading(false);
        return;
      }
      
      setLoading(false);
      router.push('/admin/dashboard');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Login Failed', description: 'Invalid credentials.' });
      setLoading(false);
    }
  };

  const continueAsGuest = async () => {
    setLoading(true);
    manualProfileRef.current = false;
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
      setLoading(false);
      router.push('/dashboard/check-in');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Guest session failed.' });
      setLoading(false);
    }
  };

  const cancelLinking = () => {
    setPendingStudentId(null);
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    manualProfileRef.current = false;
    try {
      await signOut(auth);
      setPendingStudentId(null);
      setProfile(null);
      setUser(null);
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
  if (!context) throw new Error('useAuthContext must be used within AuthProvider');
  return context;
};
