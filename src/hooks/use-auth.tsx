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
        // Domain Enforcement
        const isInstitutional = firebaseUser.email?.endsWith('@neu.edu.ph');
        const isWhitelisted = [
          'pampa4858@gmail.com', 
          'admin@neu.edu.ph', 
          'alexis.pidlaoan@neu.edu.ph', 
          'jcesperanza@neu.edu.ph'
        ].includes(firebaseUser.email?.toLowerCase() || '');
        
        if (!firebaseUser.isAnonymous && !isInstitutional && !isWhitelisted) {
          await signOut(auth);
          toast({
            variant: 'destructive',
            title: 'Unauthorized Email',
            description: 'Please use your @neu.edu.ph institutional account.'
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
              description: 'This account has been blocked by the administrator.'
            });
            setLoading(false);
            return;
          }

          if (pendingStudentId && !data.studentId && !firebaseUser.isAnonymous) {
            await updateDoc(userRef, { studentId: pendingStudentId });
            data.studentId = pendingStudentId;
            setPendingStudentId(null);
          }
          
          setProfile({ ...data, id: firebaseUser.uid });
          setUser(firebaseUser);
          
          if (window.location.pathname === '/' || window.location.pathname === '/admin/login') {
            router.push(data.role === 'admin' ? '/admin/dashboard' : '/dashboard/check-in');
          }
        } else {
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
      console.error("Login Error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        toast({ 
          variant: 'destructive', 
          title: 'Unauthorized Domain', 
          description: 'Please add this domain to Firebase Console Authentication settings.' 
        });
      } else if (error.code !== 'auth/popup-closed-by-user') {
        toast({ variant: 'destructive', title: 'Login Failed', description: error.message });
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
          toast({ variant: 'destructive', title: 'Access Denied', description: 'This ID is restricted.' });
          setLoading(false);
          return;
        }
        setProfile({ ...userData, id: querySnapshot.docs[0].id });
        setUser({ uid: querySnapshot.docs[0].id, displayName: userData.displayName, email: userData.email } as any);
        router.push('/dashboard/check-in');
      } else {
        setPendingStudentId(id);
      }
    } catch (error) {
      console.error("ID Search Error:", error);
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
